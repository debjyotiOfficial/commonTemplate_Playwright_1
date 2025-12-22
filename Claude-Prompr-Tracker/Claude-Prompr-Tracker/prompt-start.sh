#!/bin/bash
# ==============================================================================
# Claude Code Hook: Prompt Start (Portable Version)
# ==============================================================================
# Triggered by UserPromptSubmit event when user submits a prompt.
# Captures the start timestamp and stores it for matching with the end event.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Config location - always use user config directory
USER_CONFIG_DIR="$HOME/.config/claude-time-hook"
CONFIG_FILE="$USER_CONFIG_DIR/config.json"

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
PROMPT_TEXT=$(echo "$INPUT" | jq -r '.prompt // empty' | head -c 200)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

if [ -z "$SESSION_ID" ]; then
    echo "Error: No session_id in input" >&2
    exit 1
fi

# Get current timestamp in ISO format (PST)
TIMESTAMP=$(TZ='America/Los_Angeles' date '+%Y-%m-%d %H:%M:%S')
TIMESTAMP_ISO=$(TZ='America/Los_Angeles' date -Iseconds)

# Load config to get active task (CLI method)
ACTIVE_TASK_ID=""
if [ -f "$CONFIG_FILE" ]; then
    ACTIVE_TASK_ID=$(jq -r '.active_task_id // empty' "$CONFIG_FILE" 2>/dev/null)
    if [ "$ACTIVE_TASK_ID" = "null" ]; then
        ACTIVE_TASK_ID=""
    fi
fi

# Store start data in temp file
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
        task_id: (if $task_id == "" then null else ($task_id | tonumber) end)
    }')

echo "$START_DATA" > "$TEMP_DIR/$SESSION_ID.json"

# Log for debugging (optional)
if [ "${DEBUG:-false}" = "true" ]; then
    echo "[prompt-start] Session: $SESSION_ID, Time: $TIMESTAMP" >&2
fi

exit 0
