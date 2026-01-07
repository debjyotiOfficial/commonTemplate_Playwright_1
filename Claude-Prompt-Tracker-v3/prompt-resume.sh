#!/bin/bash
# ==============================================================================
# Claude Code Hook: Prompt Resume
# ==============================================================================
# Triggered by PostToolUse events after a tool completes execution.
#
# EDGE CASE 2 FIX (continued): When Claude was paused waiting for permission
# and the user grants it, this hook fires after the tool executes. We use this
# to detect that the pause has ended and calculate the idle time.
#
# Input: JSON via stdin with session_id, tool_name, tool_response, etc.
# Output: None (updates temp file with accumulated idle time)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR="$HOME/.claude/prompt-tracking"
LOG_FILE="$TEMP_DIR/hook-debug.log"

# Read JSON input from stdin
INPUT=$(cat)

# Log hook invocation (only tool name to keep log manageable)
TOOL_NAME_LOG=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] prompt-resume.sh invoked (tool: $TOOL_NAME_LOG)" >> "$LOG_FILE"

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed" >&2
    exit 1
fi

# Extract session_id from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

if [ -z "$SESSION_ID" ]; then
    # No session ID - ignore
    exit 0
fi

# Check for matching start file
START_FILE="$TEMP_DIR/$SESSION_ID.json"
if [ ! -f "$START_FILE" ]; then
    # No active prompt tracking - ignore
    exit 0
fi

# Read current start data
START_DATA=$(cat "$START_FILE")

# Check if we're in a paused state
PAUSE_START=$(echo "$START_DATA" | jq -r '.pause_start // empty')
PAUSE_EPOCH=$(echo "$START_DATA" | jq -r '.pause_epoch // empty')

if [ -z "$PAUSE_START" ] || [ "$PAUSE_START" = "null" ]; then
    # Not paused - nothing to do
    exit 0
fi

# Calculate idle time
RESUME_EPOCH=$(TZ='America/Los_Angeles' date +%s)
IDLE_TIME=0

if [ -n "$PAUSE_EPOCH" ] && [ "$PAUSE_EPOCH" != "null" ]; then
    IDLE_TIME=$((RESUME_EPOCH - PAUSE_EPOCH))
    # Sanity check - cap at 4 hours (14400 seconds) to prevent outliers
    if [ "$IDLE_TIME" -gt 14400 ]; then
        IDLE_TIME=14400
    fi
    if [ "$IDLE_TIME" -lt 0 ]; then
        IDLE_TIME=0
    fi
fi

# Get current idle_seconds and add the new idle time
CURRENT_IDLE=$(echo "$START_DATA" | jq -r '.idle_seconds // 0')
if [ "$CURRENT_IDLE" = "null" ]; then
    CURRENT_IDLE=0
fi
NEW_IDLE=$((CURRENT_IDLE + IDLE_TIME))

# Update start file - clear pause and update idle_seconds
UPDATED_DATA=$(echo "$START_DATA" | jq \
    --argjson idle "$NEW_IDLE" \
    '.idle_seconds = $idle | .pause_start = null | .pause_epoch = null')
echo "$UPDATED_DATA" > "$START_FILE"

# Log for debugging
if [ "${DEBUG:-false}" = "true" ]; then
    RESUME_TIMESTAMP=$(TZ='America/Los_Angeles' date '+%Y-%m-%d %H:%M:%S')
    echo "[prompt-resume] Session: $SESSION_ID resumed at $RESUME_TIMESTAMP (idle: ${IDLE_TIME}s, total idle: ${NEW_IDLE}s)" >&2
fi

exit 0
