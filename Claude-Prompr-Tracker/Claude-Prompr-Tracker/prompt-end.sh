#!/bin/bash
# ==============================================================================
# Claude Code Hook: Prompt End (Portable Version)
# ==============================================================================
# Triggered by Stop event when Claude finishes responding.
# Retrieves start timestamp, calculates duration, and logs to Project Tracker API.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Config location - always use user config directory
USER_CONFIG_DIR="$HOME/.config/claude-time-hook"
CONFIG_FILE="$USER_CONFIG_DIR/config.json"
LOCAL_STORE="$USER_CONFIG_DIR/local-store.json"

TEMP_DIR="$HOME/.claude/prompt-tracking"

# Read JSON input from stdin
INPUT=$(cat)

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed" >&2
    exit 1
fi

# Extract session_id from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

if [ -z "$SESSION_ID" ]; then
    echo "Error: No session_id in input" >&2
    exit 1
fi

# Check for matching start file
START_FILE="$TEMP_DIR/$SESSION_ID.json"
if [ ! -f "$START_FILE" ]; then
    echo "Warning: No start file found for session $SESSION_ID" >&2
    exit 0
fi

# Read start data
START_DATA=$(cat "$START_FILE")
PROMPT_START=$(echo "$START_DATA" | jq -r '.prompt_start // empty')
PROMPT_START_ISO=$(echo "$START_DATA" | jq -r '.prompt_start_iso // empty')
PROMPT_CONTEXT=$(echo "$START_DATA" | jq -r '.prompt_context // empty')
TASK_ID=$(echo "$START_DATA" | jq -r '.task_id // empty')

# Get end timestamp
PROMPT_END=$(TZ='America/Los_Angeles' date '+%Y-%m-%d %H:%M:%S')
PROMPT_END_ISO=$(TZ='America/Los_Angeles' date -Iseconds)

# Calculate duration in seconds
START_EPOCH=$(TZ='America/Los_Angeles' date -d "$PROMPT_START" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$PROMPT_START" +%s 2>/dev/null)
END_EPOCH=$(TZ='America/Los_Angeles' date +%s)

if [ -n "$START_EPOCH" ] && [ -n "$END_EPOCH" ]; then
    DURATION_SECONDS=$((END_EPOCH - START_EPOCH))
else
    DURATION_SECONDS=0
fi

# Generate UUID for deduplication
SESSION_UUID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "$SESSION_ID-$(date +%s)")

# Load config
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config file not found at $CONFIG_FILE. Run setup.sh first." >&2
    rm -f "$START_FILE"
    exit 1
fi

API_URL=$(jq -r '.api_url // empty' "$CONFIG_FILE")
API_TOKEN=$(jq -r '.api_token // empty' "$CONFIG_FILE")
DEVICE_ID=$(jq -r '.device_id // empty' "$CONFIG_FILE")
SYNC_ENABLED=$(jq -r '.sync_enabled // true' "$CONFIG_FILE")
LOCAL_BACKUP=$(jq -r '.local_backup // true' "$CONFIG_FILE")

# Build payload
PAYLOAD=$(jq -n \
    --arg prompt_start "$PROMPT_START" \
    --arg prompt_end "$PROMPT_END" \
    --argjson duration_seconds "$DURATION_SECONDS" \
    --arg task_id "$TASK_ID" \
    --arg device_id "$DEVICE_ID" \
    --arg session_uuid "$SESSION_UUID" \
    --arg prompt_context "$PROMPT_CONTEXT" \
    '{
        prompt_start: $prompt_start,
        prompt_end: $prompt_end,
        duration_seconds: $duration_seconds,
        task_id: (if $task_id == "" or $task_id == "null" then null else ($task_id | tonumber) end),
        device_id: $device_id,
        session_uuid: $session_uuid,
        prompt_context: $prompt_context
    }')

# Save to local store (backup)
if [ "$LOCAL_BACKUP" = "true" ]; then
    # Initialize local store if it doesn't exist
    if [ ! -f "$LOCAL_STORE" ]; then
        echo '{"prompts":[]}' > "$LOCAL_STORE"
    fi

    # Add prompt to local store with pending status
    STORE_ENTRY=$(echo "$PAYLOAD" | jq '. + {synced: false, created_at: now | strftime("%Y-%m-%d %H:%M:%S")}')
    jq --argjson entry "$STORE_ENTRY" '.prompts += [$entry]' "$LOCAL_STORE" > "$LOCAL_STORE.tmp" && mv "$LOCAL_STORE.tmp" "$LOCAL_STORE"
fi

# Sync to API
SYNC_SUCCESS=false
if [ "$SYNC_ENABLED" = "true" ] && [ -n "$API_URL" ] && [ -n "$API_TOKEN" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" \
        --connect-timeout 5 \
        --max-time 10)

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        SYNC_SUCCESS=true

        # Mark as synced in local store
        if [ "$LOCAL_BACKUP" = "true" ]; then
            jq --arg uuid "$SESSION_UUID" '(.prompts[] | select(.session_uuid == $uuid)).synced = true' "$LOCAL_STORE" > "$LOCAL_STORE.tmp" && mv "$LOCAL_STORE.tmp" "$LOCAL_STORE"
        fi

        if [ "${DEBUG:-false}" = "true" ]; then
            echo "[prompt-end] Synced: $SESSION_UUID ($DURATION_SECONDS seconds)" >&2
        fi
    else
        echo "Warning: API sync failed (HTTP $HTTP_CODE): $BODY" >&2
    fi
fi

# Cleanup start file
rm -f "$START_FILE"

# Log for debugging
if [ "${DEBUG:-false}" = "true" ]; then
    echo "[prompt-end] Session: $SESSION_ID, Duration: ${DURATION_SECONDS}s, Synced: $SYNC_SUCCESS" >&2
fi

exit 0
