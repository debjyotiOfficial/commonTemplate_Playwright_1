#!/bin/bash
# ==============================================================================
# Claude Code Hook: Session End
# ==============================================================================
# Triggered by SessionEnd event when the Claude Code session terminates.
# This handles the edge case where a user interrupts a prompt (Escape key)
# and then exits the session without submitting another prompt.
#
# The Stop hook does NOT fire on user interrupts, so orphaned temp files
# would remain. This script cleans them up and logs interrupted prompts.
#
# Input: JSON via stdin with session_id, reason (exit, clear, logout, etc.)
# Output: None (logs orphaned prompts to API)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# User-specific config takes priority over project config
USER_CONFIG_DIR="$HOME/.config/claude-time-hook"
USER_CONFIG_FILE="$USER_CONFIG_DIR/config.json"
PROJECT_CONFIG_FILE="$SCRIPT_DIR/config.json"

# Use user config if exists, otherwise fall back to project config
if [ -f "$USER_CONFIG_FILE" ]; then
    CONFIG_FILE="$USER_CONFIG_FILE"
    LOCAL_STORE="$USER_CONFIG_DIR/local-store.json"
else
    CONFIG_FILE="$PROJECT_CONFIG_FILE"
    LOCAL_STORE="$SCRIPT_DIR/local-store.json"
fi

TEMP_DIR="$HOME/.claude/prompt-tracking"

# Read JSON input from stdin
INPUT=$(cat)

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed" >&2
    exit 1
fi

# Extract session info from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
END_REASON=$(echo "$INPUT" | jq -r '.reason // "unknown"')

if [ "${DEBUG:-false}" = "true" ]; then
    echo "[session-end] Session: $SESSION_ID, Reason: $END_REASON" >&2
fi

# Check if temp directory exists
if [ ! -d "$TEMP_DIR" ]; then
    exit 0
fi

# Load config
API_URL=""
API_TOKEN=""
DEVICE_ID=""
SYNC_ENABLED="true"
LOCAL_BACKUP="true"

if [ -f "$CONFIG_FILE" ]; then
    API_URL=$(jq -r '.api_url // empty' "$CONFIG_FILE" 2>/dev/null)
    API_TOKEN=$(jq -r '.api_token // empty' "$CONFIG_FILE" 2>/dev/null)
    DEVICE_ID=$(jq -r '.device_id // empty' "$CONFIG_FILE" 2>/dev/null)
    SYNC_ENABLED=$(jq -r '.sync_enabled // true' "$CONFIG_FILE" 2>/dev/null)
    LOCAL_BACKUP=$(jq -r '.local_backup // true' "$CONFIG_FILE" 2>/dev/null)
fi

# ==============================================================================
# Cleanup stale claim files (.processing and .orphan)
# ==============================================================================
# These files are created during atomic file claiming and should be deleted
# after processing. If they remain, it means a script crashed before cleanup.
# ==============================================================================
for STALE_FILE in "$TEMP_DIR"/*.processing "$TEMP_DIR"/*.orphan; do
    [ -e "$STALE_FILE" ] || continue
    rm -f "$STALE_FILE"
    if [ "${DEBUG:-false}" = "true" ]; then
        echo "[session-end] Cleaned up stale file: $STALE_FILE" >&2
    fi
done

# ==============================================================================
# Process orphaned temp files (interrupted prompts)
# ==============================================================================
# Find all .json files in temp directory - these are prompts that were started
# but never completed (user interrupted with Escape and then exited)
# ==============================================================================

ORPHAN_COUNT=0
for START_FILE in "$TEMP_DIR"/*.json; do
    # Check if any files exist (glob might not match)
    [ -e "$START_FILE" ] || continue

    # Read the orphaned start data
    START_DATA=$(cat "$START_FILE" 2>/dev/null)
    if [ -z "$START_DATA" ]; then
        rm -f "$START_FILE"
        continue
    fi

    ORPHAN_SESSION_ID=$(echo "$START_DATA" | jq -r '.session_id // empty')
    PROMPT_START=$(echo "$START_DATA" | jq -r '.prompt_start // empty')
    PROMPT_CONTEXT=$(echo "$START_DATA" | jq -r '.prompt_context // empty')
    TASK_ID=$(echo "$START_DATA" | jq -r '.task_id // empty')

    if [ -z "$PROMPT_START" ]; then
        rm -f "$START_FILE"
        continue
    fi

    # Calculate duration from start to now
    PROMPT_END=$(TZ='America/Los_Angeles' date '+%Y-%m-%d %H:%M:%S')
    START_EPOCH=$(TZ='America/Los_Angeles' date -d "$PROMPT_START" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$PROMPT_START" +%s 2>/dev/null)
    END_EPOCH=$(TZ='America/Los_Angeles' date +%s)

    if [ -z "$START_EPOCH" ] || [ -z "$END_EPOCH" ]; then
        rm -f "$START_FILE"
        continue
    fi

    DURATION_SECONDS=$((END_EPOCH - START_EPOCH))

    # Subtract any accumulated idle time
    IDLE_SECONDS=$(echo "$START_DATA" | jq -r '.idle_seconds // 0')
    if [ "$IDLE_SECONDS" = "null" ]; then
        IDLE_SECONDS=0
    fi

    # Check if we were paused when interrupted
    PAUSE_EPOCH=$(echo "$START_DATA" | jq -r '.pause_epoch // empty')
    if [ -n "$PAUSE_EPOCH" ] && [ "$PAUSE_EPOCH" != "null" ]; then
        REMAINING_IDLE=$((END_EPOCH - PAUSE_EPOCH))
        # Cap at 4 hours
        if [ "$REMAINING_IDLE" -gt 14400 ]; then
            REMAINING_IDLE=14400
        fi
        if [ "$REMAINING_IDLE" -lt 0 ]; then
            REMAINING_IDLE=0
        fi
        IDLE_SECONDS=$((IDLE_SECONDS + REMAINING_IDLE))
    fi

    # Subtract idle time
    if [ "$IDLE_SECONDS" -gt 0 ]; then
        DURATION_SECONDS=$((DURATION_SECONDS - IDLE_SECONDS))
        if [ "$DURATION_SECONDS" -lt 0 ]; then
            DURATION_SECONDS=0
        fi
    fi

    # Only log if duration is reasonable (at least 1 second, less than 4 hours)
    # Interrupted prompts might have very short durations, that's OK
    if [ "$DURATION_SECONDS" -lt 1 ] || [ "$DURATION_SECONDS" -gt 14400 ]; then
        rm -f "$START_FILE"
        continue
    fi

    # Generate UUID for this interrupted prompt
    SESSION_UUID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "$ORPHAN_SESSION_ID-interrupted-$(date +%s)")

    # Build payload with was_interrupted flag
    CONTEXT_TEMP=$(mktemp)
    trap "rm -f $CONTEXT_TEMP" EXIT
    echo -n "$PROMPT_CONTEXT" > "$CONTEXT_TEMP"

    PAYLOAD=$(jq -n \
        --arg prompt_start "$PROMPT_START" \
        --arg prompt_end "$PROMPT_END" \
        --argjson duration_seconds "$DURATION_SECONDS" \
        --arg task_id "$TASK_ID" \
        --arg device_id "$DEVICE_ID" \
        --arg session_uuid "$SESSION_UUID" \
        --arg claude_session_id "$ORPHAN_SESSION_ID" \
        --arg end_reason "$END_REASON" \
        --rawfile prompt_context "$CONTEXT_TEMP" \
        '{
            prompt_start: $prompt_start,
            prompt_end: $prompt_end,
            duration_seconds: $duration_seconds,
            task_id: (if $task_id == "" or $task_id == "null" then null else ($task_id | tonumber) end),
            device_id: $device_id,
            session_uuid: $session_uuid,
            claude_session_id: $claude_session_id,
            prompt_context: ($prompt_context | rtrimstr("\n")),
            was_interrupted: true,
            interrupt_reason: $end_reason
        }')

    rm -f "$CONTEXT_TEMP"

    # Save to local store (backup)
    if [ "$LOCAL_BACKUP" = "true" ]; then
        if [ ! -f "$LOCAL_STORE" ]; then
            echo '{"prompts":[]}' > "$LOCAL_STORE"
        fi
        STORE_ENTRY=$(echo "$PAYLOAD" | jq '. + {synced: false, created_at: now | strftime("%Y-%m-%d %H:%M:%S")}')
        jq --argjson entry "$STORE_ENTRY" '.prompts += [$entry]' "$LOCAL_STORE" > "$LOCAL_STORE.tmp" && mv "$LOCAL_STORE.tmp" "$LOCAL_STORE"
    fi

    # Sync to API
    if [ "$SYNC_ENABLED" = "true" ] && [ -n "$API_URL" ] && [ -n "$API_TOKEN" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
            -H "Authorization: Bearer $API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD" \
            --connect-timeout 5 \
            --max-time 10)

        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
            # Mark as synced in local store
            if [ "$LOCAL_BACKUP" = "true" ]; then
                jq --arg uuid "$SESSION_UUID" '(.prompts[] | select(.session_uuid == $uuid)).synced = true' "$LOCAL_STORE" > "$LOCAL_STORE.tmp" && mv "$LOCAL_STORE.tmp" "$LOCAL_STORE"
            fi

            if [ "${DEBUG:-false}" = "true" ]; then
                echo "[session-end] Logged interrupted prompt: $SESSION_UUID (${DURATION_SECONDS}s)" >&2
            fi
        else
            if [ "${DEBUG:-false}" = "true" ]; then
                echo "[session-end] Failed to sync interrupted prompt (HTTP $HTTP_CODE)" >&2
            fi
        fi
    fi

    # Clean up the orphaned temp file
    rm -f "$START_FILE"
    ORPHAN_COUNT=$((ORPHAN_COUNT + 1))
done

if [ "${DEBUG:-false}" = "true" ] && [ "$ORPHAN_COUNT" -gt 0 ]; then
    echo "[session-end] Processed $ORPHAN_COUNT interrupted prompt(s)" >&2
fi

exit 0
