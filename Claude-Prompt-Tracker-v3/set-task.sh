#!/bin/bash
# ==============================================================================
# Set Active Task for Claude Time Tracking
# ==============================================================================
# Sets or clears the active task ID. When set, all Claude prompts will be
# associated with this task.
#
# Usage:
#   ./set-task.sh 123      # Set task #123 as active
#   ./set-task.sh          # Clear active task (prompts will be unassigned)
#
# ==============================================================================

USER_CONFIG_DIR="$HOME/.config/claude-time-hook"
CONFIG_FILE="$USER_CONFIG_DIR/config.json"

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config not found at $CONFIG_FILE"
    echo "Run setup.sh first to configure the hook."
    exit 1
fi

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed" >&2
    exit 1
fi

TASK_ID="$1"

if [ -z "$TASK_ID" ]; then
    # Clear active task
    jq '.active_task_id = null' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    echo "✓ Active task cleared"
    echo "  Prompts will not be assigned to any task."
else
    # Validate task ID is a number
    if ! [[ "$TASK_ID" =~ ^[0-9]+$ ]]; then
        echo "Error: Task ID must be a number"
        exit 1
    fi

    # Set active task
    jq --argjson task_id "$TASK_ID" '.active_task_id = $task_id' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    echo "✓ Active task set to #$TASK_ID"
    echo "  All prompts will be associated with this task."
fi

echo ""
echo "Tip: You can also set the active task in Project Tracker:"
echo "     Work Map > Claude Session dropdown > Select task > Start"
