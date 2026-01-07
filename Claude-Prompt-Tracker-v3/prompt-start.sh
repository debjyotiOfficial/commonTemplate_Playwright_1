#!/bin/bash
# ==============================================================================
# Claude Code Hook: Prompt Start
# ==============================================================================
# Triggered by UserPromptSubmit event when user submits a prompt.
# Captures the start timestamp and stores it for matching with the end event.
#
# EDGE CASE FIX: When a new prompt starts and there's an existing start file
# (e.g., user rejected a plan and submitted a new prompt), we log the previous
# prompt first before creating the new start file. This ensures all prompts
# in plan mode are logged, not just the final one.
#
# Input: JSON via stdin with session_id, prompt, cwd, etc.
# Output: None (writes to temp file for later correlation)
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

# Create temp directory if it doesn't exist
mkdir -p "$TEMP_DIR"

# Read JSON input from stdin
INPUT=$(cat)

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed" >&2
    exit 1
fi

# Extract session_id from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

if [ -z "$SESSION_ID" ]; then
    echo "Error: No session_id in input" >&2
    exit 1
fi

# Load config
API_URL=""
API_TOKEN=""
DEVICE_ID=""
SYNC_ENABLED="true"
LOCAL_BACKUP="true"
CONTEXT_CHARS=65000

if [ -f "$CONFIG_FILE" ]; then
    API_URL=$(jq -r '.api_url // empty' "$CONFIG_FILE" 2>/dev/null)
    API_TOKEN=$(jq -r '.api_token // empty' "$CONFIG_FILE" 2>/dev/null)
    DEVICE_ID=$(jq -r '.device_id // empty' "$CONFIG_FILE" 2>/dev/null)
    SYNC_ENABLED=$(jq -r '.sync_enabled // true' "$CONFIG_FILE" 2>/dev/null)
    LOCAL_BACKUP=$(jq -r '.local_backup // true' "$CONFIG_FILE" 2>/dev/null)
    CONFIG_CHARS=$(jq -r '.context_chars // 65000' "$CONFIG_FILE" 2>/dev/null)
    if [ -n "$CONFIG_CHARS" ] && [ "$CONFIG_CHARS" != "null" ]; then
        CONTEXT_CHARS=$CONFIG_CHARS
    fi
fi

# ==============================================================================
# EDGE CASE 1 FIX: Log previous prompt if start file exists AND not already logged
# ==============================================================================
# This handles the case where user submits a new prompt before Stop fires
# (e.g., Escape interrupt). We log the previous prompt with duration calculated
# from its start time to now.
#
# ATOMIC FILE CLAIMING: Use mv (rename) to atomically claim orphaned files.
# Only one script can successfully rename the file - this eliminates races.
# ==============================================================================
START_FILE="$TEMP_DIR/$SESSION_ID.json"
ORPHAN_FILE="$TEMP_DIR/$SESSION_ID.orphan"

# Try to atomically claim any orphaned start file
if mv "$START_FILE" "$ORPHAN_FILE" 2>/dev/null; then
    # We successfully claimed the orphaned file - log it as intermediate
    PREV_START_DATA=$(cat "$ORPHAN_FILE")
    PREV_PROMPT_START=$(echo "$PREV_START_DATA" | jq -r '.prompt_start // empty')
    PREV_PROMPT_CONTEXT=$(echo "$PREV_START_DATA" | jq -r '.prompt_context // empty')
    PREV_TASK_ID=$(echo "$PREV_START_DATA" | jq -r '.task_id // empty')

    if [ -n "$PREV_PROMPT_START" ]; then
        # Calculate duration from previous start to now
        PREV_END=$(TZ='America/Los_Angeles' date '+%Y-%m-%d %H:%M:%S')
        PREV_START_EPOCH=$(TZ='America/Los_Angeles' date -d "$PREV_PROMPT_START" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$PREV_PROMPT_START" +%s 2>/dev/null)
        PREV_END_EPOCH=$(TZ='America/Los_Angeles' date +%s)

        if [ -n "$PREV_START_EPOCH" ] && [ -n "$PREV_END_EPOCH" ]; then
            PREV_DURATION=$((PREV_END_EPOCH - PREV_START_EPOCH))

            # Subtract any accumulated idle time from the previous prompt
            PREV_IDLE_SECONDS=$(echo "$PREV_START_DATA" | jq -r '.idle_seconds // 0')
            if [ -n "$PREV_IDLE_SECONDS" ] && [ "$PREV_IDLE_SECONDS" != "null" ] && [ "$PREV_IDLE_SECONDS" -gt 0 ]; then
                PREV_DURATION=$((PREV_DURATION - PREV_IDLE_SECONDS))
                if [ "$PREV_DURATION" -lt 0 ]; then
                    PREV_DURATION=0
                fi
            fi

            # Only log if duration is reasonable (at least 1 second, less than 2 hours)
            if [ "$PREV_DURATION" -ge 1 ] && [ "$PREV_DURATION" -lt 7200 ]; then
                PREV_UUID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "$SESSION_ID-prev-$(date +%s)")

                # Build payload for previous prompt
                PREV_CONTEXT_TEMP=$(mktemp)
                echo -n "$PREV_PROMPT_CONTEXT" > "$PREV_CONTEXT_TEMP"

                PREV_PAYLOAD=$(jq -n \
                    --arg prompt_start "$PREV_PROMPT_START" \
                    --arg prompt_end "$PREV_END" \
                    --argjson duration_seconds "$PREV_DURATION" \
                    --arg task_id "$PREV_TASK_ID" \
                    --arg device_id "$DEVICE_ID" \
                    --arg session_uuid "$PREV_UUID" \
                    --arg claude_session_id "$SESSION_ID" \
                    --rawfile prompt_context "$PREV_CONTEXT_TEMP" \
                    '{
                        prompt_start: $prompt_start,
                        prompt_end: $prompt_end,
                        duration_seconds: $duration_seconds,
                        task_id: (if $task_id == "" or $task_id == "null" then null else ($task_id | tonumber) end),
                        device_id: $device_id,
                        session_uuid: $session_uuid,
                        claude_session_id: $claude_session_id,
                        prompt_context: ($prompt_context | rtrimstr("\n")),
                        is_intermediate: true
                    }')

                rm -f "$PREV_CONTEXT_TEMP"

                # Save to local store (backup)
                if [ "$LOCAL_BACKUP" = "true" ]; then
                    if [ ! -f "$LOCAL_STORE" ]; then
                        echo '{"prompts":[]}' > "$LOCAL_STORE"
                    fi
                    STORE_ENTRY=$(echo "$PREV_PAYLOAD" | jq '. + {synced: false, created_at: now | strftime("%Y-%m-%d %H:%M:%S")}')
                    jq --argjson entry "$STORE_ENTRY" '.prompts += [$entry]' "$LOCAL_STORE" > "$LOCAL_STORE.tmp" && mv "$LOCAL_STORE.tmp" "$LOCAL_STORE"
                fi

                # Sync to API (async - don't block the new prompt)
                if [ "$SYNC_ENABLED" = "true" ] && [ -n "$API_URL" ] && [ -n "$API_TOKEN" ]; then
                    (curl -s -X POST "$API_URL" \
                        -H "Authorization: Bearer $API_TOKEN" \
                        -H "Content-Type: application/json" \
                        -d "$PREV_PAYLOAD" \
                        --connect-timeout 5 \
                        --max-time 10 > /dev/null 2>&1 &)

                    if [ "${DEBUG:-false}" = "true" ]; then
                        echo "[prompt-start] Logged previous prompt: $PREV_UUID (${PREV_DURATION}s)" >&2
                    fi
                fi
            fi
        fi
    fi

    # Clean up the orphan file we processed
    rm -f "$ORPHAN_FILE"
else
    # File doesn't exist or was already claimed by prompt-end.sh - that's fine
    if [ "${DEBUG:-false}" = "true" ]; then
        echo "[prompt-start] No orphaned file to process (claimed by prompt-end or doesn't exist)" >&2
    fi
fi

# Extract prompt text with configurable length limit
# Use temp file to handle large prompts properly
PROMPT_TEMP=$(mktemp)
trap "rm -f $PROMPT_TEMP" EXIT
echo "$INPUT" | jq -r '.prompt // empty' | head -c "$CONTEXT_CHARS" > "$PROMPT_TEMP"
PROMPT_TEXT=$(cat "$PROMPT_TEMP")

# Get current timestamp in ISO format (PST)
TIMESTAMP=$(TZ='America/Los_Angeles' date '+%Y-%m-%d %H:%M:%S')
TIMESTAMP_ISO=$(TZ='America/Los_Angeles' date -Iseconds)

# Load config to get active task (CLI method)
# Note: If active_task_id is null/empty, the API will check for UI-selected task
ACTIVE_TASK_ID=""
if [ -f "$CONFIG_FILE" ]; then
    ACTIVE_TASK_ID=$(jq -r '.active_task_id // empty' "$CONFIG_FILE" 2>/dev/null)
    # Handle JSON null value
    if [ "$ACTIVE_TASK_ID" = "null" ]; then
        ACTIVE_TASK_ID=""
    fi
fi

# Store start data in temp file
# Include idle_seconds and pause fields for tracking permission/clarification pauses
START_DATA=$(jq -n \
    --arg session_id "$SESSION_ID" \
    --arg timestamp "$TIMESTAMP" \
    --arg timestamp_iso "$TIMESTAMP_ISO" \
    --arg prompt "$PROMPT_TEXT" \
    --arg cwd "$CWD" \
    --arg task_id "$ACTIVE_TASK_ID" \
    '{
        session_id: $session_id,
        prompt_start: $timestamp,
        prompt_start_iso: $timestamp_iso,
        prompt_context: $prompt,
        cwd: $cwd,
        task_id: (if $task_id == "" then null else ($task_id | tonumber) end),
        idle_seconds: 0,
        pause_start: null,
        pause_epoch: null
    }')

echo "$START_DATA" > "$TEMP_DIR/$SESSION_ID.json"

# Log for debugging (optional)
if [ "${DEBUG:-false}" = "true" ]; then
    echo "[prompt-start] Session: $SESSION_ID, Time: $TIMESTAMP" >&2
fi

exit 0
