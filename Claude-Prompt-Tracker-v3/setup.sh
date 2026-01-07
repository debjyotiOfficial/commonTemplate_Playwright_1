#!/bin/bash
# ==============================================================================
# Claude Time Hook - Portable Setup
# ==============================================================================
# One-time setup for Claude Code time tracking with Project Tracker.
# This portable version can be used from any directory on any machine.
#
# Prerequisites:
#   1. Have a Project Tracker account
#   2. Generate an API token in Project Tracker (Profile > API Tokens)
#   3. Install jq: sudo dnf install jq (or apt-get install jq)
#
# Usage:
#   ./setup.sh
#
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_CONFIG_DIR="$HOME/.config/claude-time-hook"
USER_CONFIG_FILE="$USER_CONFIG_DIR/config.json"
CLAUDE_SETTINGS_DIR="$HOME/.claude"
CLAUDE_SETTINGS_FILE="$CLAUDE_SETTINGS_DIR/settings.json"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Claude Time Hook - Setup                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is required but not installed."
    echo ""
    echo "Install it with:"
    echo "  RHEL/CentOS:   sudo dnf install jq"
    echo "  Debian/Ubuntu: sudo apt-get install jq"
    echo "  macOS:         brew install jq"
    exit 1
fi
echo "✓ jq installed"

# Check for curl
if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl is required but not installed."
    exit 1
fi
echo "✓ curl installed"
echo ""

# Make scripts executable
chmod +x "$SCRIPT_DIR/prompt-start.sh" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/prompt-end.sh" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/session-end.sh" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/set-task.sh" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/sync-pending.sh" 2>/dev/null || true
echo "✓ Scripts made executable"
echo ""

# Check if already configured
if [ -f "$USER_CONFIG_FILE" ]; then
    echo "You already have a configuration at: $USER_CONFIG_FILE"
    echo ""
    read -p "Do you want to reconfigure? (y/N): " RECONFIGURE
    if [ "$RECONFIGURE" != "y" ] && [ "$RECONFIGURE" != "Y" ]; then
        echo "Setup cancelled. Your existing config is unchanged."
        exit 0
    fi
    echo ""
fi

echo "Before continuing, you need an API token from Project Tracker:"
echo ""
echo "  1. Log into Project Tracker"
echo "     https://staging-dealerpro.matrackinc.com/project-tracker-v2.21-dev"
echo ""
echo "  2. Go to your Profile section (click your name in sidebar)"
echo ""
echo "  3. Navigate to 'API Tokens' tab"
echo ""
echo "  4. Click 'Generate New Token'"
echo ""
echo "  5. Copy the generated token (starts with 'pt_')"
echo ""
read -p "Press Enter when you have your API token ready..."
echo ""

# Get API token
while true; do
    read -p "Enter your API token (starts with pt_): " API_TOKEN

    if [[ ! "$API_TOKEN" =~ ^pt_ ]]; then
        echo "Error: Token should start with 'pt_'. Please try again."
        continue
    fi

    if [ ${#API_TOKEN} -lt 20 ]; then
        echo "Error: Token seems too short. Please enter the full token."
        continue
    fi

    break
done

# Get device identifier
echo ""
HOSTNAME=$(hostname)
read -p "Enter a device name for this machine [$HOSTNAME]: " DEVICE_ID
DEVICE_ID=${DEVICE_ID:-$HOSTNAME}

# API URL
API_URL="https://staging-dealerpro.matrackinc.com/project-tracker-v2.21-dev/api/ai-prompt-logs.php"

# Create config directory
mkdir -p "$USER_CONFIG_DIR"

# Create config file
cat > "$USER_CONFIG_FILE" << EOF
{
  "api_url": "$API_URL",
  "api_token": "$API_TOKEN",
  "device_id": "$DEVICE_ID",
  "active_task_id": null,
  "sync_enabled": true,
  "local_backup": true,
  "capture_context": true,
  "context_chars": 65000
}
EOF

chmod 600 "$USER_CONFIG_FILE"
echo ""
echo "✓ Configuration saved to: $USER_CONFIG_FILE"

# Create local store for backup
LOCAL_STORE="$USER_CONFIG_DIR/local-store.json"
if [ ! -f "$LOCAL_STORE" ]; then
    echo '{"prompts":[]}' > "$LOCAL_STORE"
    echo "✓ Local backup store initialized"
fi

# Create prompt tracking directory
mkdir -p "$HOME/.claude/prompt-tracking"
echo "✓ Prompt tracking directory created"
echo ""

# Test the token
echo "Testing your API token..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $API_TOKEN" \
    "$API_URL" \
    --connect-timeout 5 \
    --max-time 10 2>/dev/null || echo -e "\n000")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Token validated successfully!"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ Authentication failed. Check your API token."
    echo "   You can still complete setup and fix the token later."
else
    echo "⚠️  Could not validate token (HTTP $HTTP_CODE)"
    echo "   Setup will continue - you can test later."
fi

echo ""

# Configure Claude Code hooks
echo "Configuring Claude Code hooks..."

# Create .claude directory if it doesn't exist
mkdir -p "$CLAUDE_SETTINGS_DIR"

# Define hook commands - use absolute paths to THIS directory
START_CMD="$SCRIPT_DIR/prompt-start.sh"
END_CMD="$SCRIPT_DIR/prompt-end.sh"
SESSION_END_CMD="$SCRIPT_DIR/session-end.sh"

# Check if settings.json exists
if [ -f "$CLAUDE_SETTINGS_FILE" ]; then
    echo "Found existing Claude settings at $CLAUDE_SETTINGS_FILE"

    # Check if hooks are already configured
    EXISTING_HOOKS=$(jq -r '.hooks // empty' "$CLAUDE_SETTINGS_FILE" 2>/dev/null)

    if [ -n "$EXISTING_HOOKS" ] && [ "$EXISTING_HOOKS" != "null" ]; then
        # Check if our hooks are already there
        EXISTING_START=$(jq -r '.hooks.UserPromptSubmit[0].hooks[0].command // empty' "$CLAUDE_SETTINGS_FILE" 2>/dev/null)

        if [[ "$EXISTING_START" == *"prompt-start.sh" ]]; then
            echo "⚠️  Time tracking hooks are already configured."
            echo "   Current: $EXISTING_START"
            read -p "Update to use this directory's scripts? (y/N): " UPDATE_HOOKS

            if [[ "$UPDATE_HOOKS" =~ ^[Yy]$ ]]; then
                jq --arg start_cmd "$START_CMD" \
                   --arg end_cmd "$END_CMD" \
                   --arg session_end_cmd "$SESSION_END_CMD" \
                   '.hooks.UserPromptSubmit = [{"hooks": [{"type": "command", "command": $start_cmd, "timeout": 5}]}] |
                    .hooks.Stop = [{"hooks": [{"type": "command", "command": $end_cmd, "timeout": 10}]}] |
                    .hooks.SessionEnd = [{"hooks": [{"type": "command", "command": $session_end_cmd, "timeout": 10}]}]' \
                   "$CLAUDE_SETTINGS_FILE" > "$CLAUDE_SETTINGS_FILE.tmp" && \
                   mv "$CLAUDE_SETTINGS_FILE.tmp" "$CLAUDE_SETTINGS_FILE"
                echo "✓ Claude Code hooks updated"
            else
                echo "Keeping existing hooks configuration."
            fi
        else
            echo "⚠️  Different hooks are already configured."
            read -p "Add Project Tracker time tracking hooks? (y/N): " ADD_HOOKS

            if [[ "$ADD_HOOKS" =~ ^[Yy]$ ]]; then
                jq --arg start_cmd "$START_CMD" \
                   --arg end_cmd "$END_CMD" \
                   --arg session_end_cmd "$SESSION_END_CMD" \
                   '.hooks.UserPromptSubmit = [{"hooks": [{"type": "command", "command": $start_cmd, "timeout": 5}]}] |
                    .hooks.Stop = [{"hooks": [{"type": "command", "command": $end_cmd, "timeout": 10}]}] |
                    .hooks.SessionEnd = [{"hooks": [{"type": "command", "command": $session_end_cmd, "timeout": 10}]}]' \
                   "$CLAUDE_SETTINGS_FILE" > "$CLAUDE_SETTINGS_FILE.tmp" && \
                   mv "$CLAUDE_SETTINGS_FILE.tmp" "$CLAUDE_SETTINGS_FILE"
                echo "✓ Claude Code hooks updated"
            else
                echo "Skipping hooks. Your existing hooks are unchanged."
            fi
        fi
    else
        # Add hooks to existing settings
        jq --arg start_cmd "$START_CMD" \
           --arg end_cmd "$END_CMD" \
           --arg session_end_cmd "$SESSION_END_CMD" \
           '. + {hooks: {
               UserPromptSubmit: [{"hooks": [{"type": "command", "command": $start_cmd, "timeout": 5}]}],
               Stop: [{"hooks": [{"type": "command", "command": $end_cmd, "timeout": 10}]}],
               SessionEnd: [{"hooks": [{"type": "command", "command": $session_end_cmd, "timeout": 10}]}]
           }}' \
           "$CLAUDE_SETTINGS_FILE" > "$CLAUDE_SETTINGS_FILE.tmp" && \
           mv "$CLAUDE_SETTINGS_FILE.tmp" "$CLAUDE_SETTINGS_FILE"
        echo "✓ Claude Code hooks added"
    fi
else
    # Create new settings file
    cat > "$CLAUDE_SETTINGS_FILE" << SETTINGS
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$START_CMD",
            "timeout": 5
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$END_CMD",
            "timeout": 10
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$SESSION_END_CMD",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
SETTINGS
    echo "✓ Claude Code settings created"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Setup Complete!                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Your Claude Code prompts will now be automatically tracked!"
echo ""
echo "IMPORTANT: Keep this folder at: $SCRIPT_DIR"
echo "           The hooks reference scripts in this location."
echo ""
echo "How to use:"
echo ""
echo "  Option 1 - Via Project Tracker UI (Recommended):"
echo "    1. Go to Work Map in Project Tracker"
echo "    2. Select a task from the 'Claude Session' dropdown"
echo "    3. Click 'Start' to begin tracking"
echo "    4. Use Claude Code - prompts are automatically logged!"
echo ""
echo "  Option 2 - Via CLI:"
echo "    $SCRIPT_DIR/set-task.sh <task_id>"
echo ""
echo "Your prompts will appear in:"
echo "  • Claude Notes (on the task you're working on)"
echo "  • Work Map timeline (as work sessions)"
echo "  • AI Time widget (click the purple robot card)"
echo ""
echo "IMPORTANT: Restart Claude Code for hooks to take effect!"
echo ""
