#!/bin/bash
# ==============================================================================
# Sync Pending Prompts
# ==============================================================================
# Retries syncing any prompts that failed to upload (e.g., due to being offline).
#
# Usage:
#   ./sync-pending.sh
#
# ==============================================================================

USER_CONFIG_DIR="$HOME/.config/claude-time-hook"
CONFIG_FILE="$USER_CONFIG_DIR/config.json"
LOCAL_STORE="$USER_CONFIG_DIR/local-store.json"

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

# Check if local store exists
if [ ! -f "$LOCAL_STORE" ]; then
    echo "No local store found. Nothing to sync."
    exit 0
fi

# Load config
API_URL=$(jq -r '.api_url // empty' "$CONFIG_FILE")
API_TOKEN=$(jq -r '.api_token // empty' "$CONFIG_FILE")

if [ -z "$API_URL" ] || [ -z "$API_TOKEN" ]; then
    echo "Error: API URL or token not configured"
    exit 1
fi

# Get pending prompts
PENDING_COUNT=$(jq '[.prompts[] | select(.synced == false)] | length' "$LOCAL_STORE")

if [ "$PENDING_COUNT" = "0" ]; then
    echo "✓ All prompts are synced. Nothing to do."
    exit 0
fi

echo "Found $PENDING_COUNT pending prompt(s) to sync..."
echo ""

# Sync each pending prompt
SUCCESS_COUNT=0
FAIL_COUNT=0

jq -c '.prompts[] | select(.synced == false)' "$LOCAL_STORE" | while read -r PROMPT; do
    SESSION_UUID=$(echo "$PROMPT" | jq -r '.session_uuid')

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$PROMPT" \
        --connect-timeout 5 \
        --max-time 10)

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        echo "  ✓ Synced: $SESSION_UUID"
        # Mark as synced
        jq --arg uuid "$SESSION_UUID" '(.prompts[] | select(.session_uuid == $uuid)).synced = true' "$LOCAL_STORE" > "$LOCAL_STORE.tmp" && mv "$LOCAL_STORE.tmp" "$LOCAL_STORE"
        ((SUCCESS_COUNT++))
    else
        echo "  ✗ Failed: $SESSION_UUID (HTTP $HTTP_CODE)"
        ((FAIL_COUNT++))
    fi
done

echo ""
echo "Sync complete."
echo "  Synced: $SUCCESS_COUNT"
echo "  Failed: $FAIL_COUNT"
