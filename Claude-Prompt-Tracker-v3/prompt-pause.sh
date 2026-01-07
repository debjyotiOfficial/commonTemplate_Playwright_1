#!/bin/bash
# ==============================================================================
# Claude Code Hook: Prompt Pause
# ==============================================================================
# Triggered by PermissionRequest event when Claude asks for permission.
#
# EDGE CASE 2 FIX: Tracks when Claude is idle waiting for user response.
# This time is subtracted from the total prompt duration to accurately reflect
# only the time Claude was actively working.
#
# Input: JSON via stdin with session_id, tool_name, tool_input, etc.
# Output: None (updates temp file with pause timestamp)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR="$HOME/.claude/prompt-tracking"
LOG_FILE="$TEMP_DIR/hook-debug.log"

# Read JSON input from stdin
INPUT=$(cat)

# Always log hook invocation for debugging
echo "[$(date '+%Y-%m-%d %H:%M:%S')] prompt-pause.sh invoked" >> "$LOG_FILE"
echo "INPUT: $INPUT" >> "$LOG_FILE"

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed" >&2
    exit 1
fi

# Extract session_id and tool info from input (PermissionRequest format)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
echo "SESSION_ID: $SESSION_ID, TOOL_NAME: $TOOL_NAME" >> "$LOG_FILE"

if [ -z "$SESSION_ID" ]; then
    echo "Error: No session_id in input" >&2
    exit 1
fi

# Check for matching start file
START_FILE="$TEMP_DIR/$SESSION_ID.json"
if [ ! -f "$START_FILE" ]; then
    # No active prompt tracking - ignore
    if [ "${DEBUG:-false}" = "true" ]; then
        echo "[prompt-pause] No start file found, ignoring" >&2
    fi
    exit 0
fi

# Read current start data
START_DATA=$(cat "$START_FILE")

# Check if already paused
EXISTING_PAUSE=$(echo "$START_DATA" | jq -r '.pause_start // empty')
if [ -n "$EXISTING_PAUSE" ] && [ "$EXISTING_PAUSE" != "null" ]; then
    # Already in paused state - don't overwrite
    if [ "${DEBUG:-false}" = "true" ]; then
        echo "[prompt-pause] Already paused, ignoring" >&2
    fi
    exit 0
fi

# Get current timestamp (PST)
PAUSE_TIMESTAMP=$(TZ='America/Los_Angeles' date '+%Y-%m-%d %H:%M:%S')
PAUSE_EPOCH=$(TZ='America/Los_Angeles' date +%s)

# Update start file with pause timestamp
UPDATED_DATA=$(echo "$START_DATA" | jq --arg pause "$PAUSE_TIMESTAMP" --argjson pause_epoch "$PAUSE_EPOCH" '.pause_start = $pause | .pause_epoch = $pause_epoch')
echo "$UPDATED_DATA" > "$START_FILE"

# Log for debugging
if [ "${DEBUG:-false}" = "true" ]; then
    echo "[prompt-pause] Session: $SESSION_ID paused at $PAUSE_TIMESTAMP (type: $NOTIFICATION_TYPE)" >&2
fi

exit 0
