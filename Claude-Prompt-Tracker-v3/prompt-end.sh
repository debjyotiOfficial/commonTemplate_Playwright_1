#!/bin/bash
# ==============================================================================
# Claude Code Hook: Prompt End
# ==============================================================================
# Triggered by Stop event when Claude finishes responding.
# Retrieves start timestamp, calculates duration, and logs to Project Tracker API.
#
# EDGE CASE 2 FIX: Subtracts idle time (user delays during permission prompts,
# clarification questions, etc.) from the total duration to accurately reflect
# only the time Claude was actively working.
#
# Input: JSON via stdin with session_id, stop_hook_active, etc.
# Output: None (sends data to API)
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

# Extract session_id from input
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

if [ -z "$SESSION_ID" ]; then
    echo "Error: No session_id in input" >&2
    exit 1
fi

# Check for matching start file
START_FILE="$TEMP_DIR/$SESSION_ID.json"
PROCESSING_FILE="$TEMP_DIR/$SESSION_ID.processing"

# ==============================================================================
# ATOMIC FILE CLAIMING: Use mv (rename) to atomically claim the file
# ==============================================================================
# The mv command is atomic on POSIX filesystems. Only one script can successfully
# rename the file. This eliminates race conditions between prompt-start and prompt-end.
# ==============================================================================
if ! mv "$START_FILE" "$PROCESSING_FILE" 2>/dev/null; then
    # File doesn't exist or was already claimed by prompt-start.sh
    if [ "${DEBUG:-false}" = "true" ]; then
        echo "[prompt-end] Could not claim start file (already processed or doesn't exist)" >&2
    fi
    exit 0
fi

# We successfully claimed the file - read from the processing file
START_DATA=$(cat "$PROCESSING_FILE")
PROMPT_START=$(echo "$START_DATA" | jq -r '.prompt_start // empty')
PROMPT_START_ISO=$(echo "$START_DATA" | jq -r '.prompt_start_iso // empty')
PROMPT_CONTEXT=$(echo "$START_DATA" | jq -r '.prompt_context // empty')
TASK_ID=$(echo "$START_DATA" | jq -r '.task_id // empty')

if [ -z "$PROMPT_START" ]; then
    # Invalid file - clean up
    rm -f "$PROCESSING_FILE"
    exit 0
fi

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

# ==============================================================================
# EDGE CASE 2 FIX: Subtract idle time from duration
# ==============================================================================
# If there's accumulated idle time (from permission prompts, clarifications, etc.),
# subtract it from the total duration. Also check if we're currently paused and
# calculate any remaining idle time.
# ==============================================================================
IDLE_SECONDS=$(echo "$START_DATA" | jq -r '.idle_seconds // 0')
if [ "$IDLE_SECONDS" = "null" ]; then
    IDLE_SECONDS=0
fi

# Check if we're currently paused (Stop fired while waiting for user input)
PAUSE_EPOCH=$(echo "$START_DATA" | jq -r '.pause_epoch // empty')
if [ -n "$PAUSE_EPOCH" ] && [ "$PAUSE_EPOCH" != "null" ]; then
    # Calculate remaining idle time from pause to now
    REMAINING_IDLE=$((END_EPOCH - PAUSE_EPOCH))
    # Sanity check - cap at 4 hours
    if [ "$REMAINING_IDLE" -gt 14400 ]; then
        REMAINING_IDLE=14400
    fi
    if [ "$REMAINING_IDLE" -lt 0 ]; then
        REMAINING_IDLE=0
    fi
    IDLE_SECONDS=$((IDLE_SECONDS + REMAINING_IDLE))
fi

# Subtract idle time from duration
if [ "$IDLE_SECONDS" -gt 0 ]; then
    DURATION_SECONDS=$((DURATION_SECONDS - IDLE_SECONDS))
    if [ "$DURATION_SECONDS" -lt 0 ]; then
        DURATION_SECONDS=0
    fi

    if [ "${DEBUG:-false}" = "true" ]; then
        echo "[prompt-end] Subtracted ${IDLE_SECONDS}s idle time from duration" >&2
    fi
fi

# Generate UUID for deduplication
SESSION_UUID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "$SESSION_ID-$(date +%s)")

# Load config
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config file not found. Run install.sh first." >&2
    rm -f "$START_FILE"
    exit 1
fi

API_URL=$(jq -r '.api_url // empty' "$CONFIG_FILE")
API_TOKEN=$(jq -r '.api_token // empty' "$CONFIG_FILE")
DEVICE_ID=$(jq -r '.device_id // empty' "$CONFIG_FILE")
SYNC_ENABLED=$(jq -r '.sync_enabled // true' "$CONFIG_FILE")
LOCAL_BACKUP=$(jq -r '.local_backup // true' "$CONFIG_FILE")

# Extract transcript_path from hook input for response extraction
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')

# ==============================================================================
# RESPONSE LOGGING: Check if enabled and extract response from transcript
# ==============================================================================
RESPONSE_TEXT=""
if [ -n "$API_URL" ] && [ -n "$API_TOKEN" ] && [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    # Derive the session mappings API URL from the prompt logs API URL
    SESSION_API_URL=$(echo "$API_URL" | sed 's/ai-prompt-logs\.php/claude-session-mappings.php/')

    # Check if log_responses is enabled for this session
    CHECK_RESPONSE=$(curl -s -X GET "${SESSION_API_URL}?action=check_log_responses&session_id=${SESSION_ID}" \
        -H "Authorization: Bearer $API_TOKEN" \
        --connect-timeout 3 \
        --max-time 5 2>/dev/null)

    LOG_RESPONSES=$(echo "$CHECK_RESPONSE" | jq -r '.log_responses // false' 2>/dev/null)

    if [ "$LOG_RESPONSES" = "true" ]; then
        # Extract response from transcript
        # Get all assistant messages with text content since prompt_start
        # Filter by timestamp and extract text blocks only (not thinking or tool_use)

        PROMPT_START_TS=$(TZ='America/Los_Angeles' date -d "$PROMPT_START" '+%Y-%m-%dT%H:%M:%S' 2>/dev/null || echo "")

        if [ -n "$PROMPT_START_TS" ]; then
            # Find the line number of the last ACTUAL human prompt
            # Key insight: Actual human prompts have "type":"user" but do NOT have "toolUseResult"
            # Tool result messages (system returning output) have both "type":"user" AND "toolUseResult"
            LAST_USER_LINE=$(grep -n '"type":"user"' "$TRANSCRIPT_PATH" 2>/dev/null | grep -v '"toolUseResult"' | tail -1 | cut -d: -f1)

            if [ -n "$LAST_USER_LINE" ]; then
                # Extract content in ORIGINAL ORDER (interleaved text and tool calls)
                # This preserves the natural flow: text -> tool -> text -> tool
                RESPONSE_TEXT=$(tail -n +"$LAST_USER_LINE" "$TRANSCRIPT_PATH" 2>/dev/null | \
                    grep '"role":"assistant"' | \
                    jq -r 'select(.message.content != null) |
                           .message.content[] |
                           if .type == "text" then
                               .text
                           elif .type == "tool_use" then
                               "\n---\n### 🔧 " + .name + "\n" +
                               (if .name == "Edit" then
                                   "**File:** `" + (.input.file_path // "unknown") + "`\n" +
                                   "**Old:** `" + ((.input.old_string // "") | .[0:150] | gsub("\n"; "↵")) + (if ((.input.old_string // "") | length) > 150 then "..." else "" end) + "`\n" +
                                   "**New:** `" + ((.input.new_string // "") | .[0:150] | gsub("\n"; "↵")) + (if ((.input.new_string // "") | length) > 150 then "..." else "" end) + "`"
                               elif .name == "Write" then
                                   "**File:** `" + (.input.file_path // "unknown") + "`\n" +
                                   "**Content:** " + ((.input.content // "") | .[0:150] | gsub("\n"; "↵")) + (if ((.input.content // "") | length) > 150 then "..." else "" end)
                               elif .name == "Bash" then
                                   "**Command:** `" + ((.input.command // "") | .[0:200] | gsub("\n"; "↵")) + (if ((.input.command // "") | length) > 200 then "..." else "" end) + "`" +
                                   (if .input.description then "\n**Description:** " + .input.description else "" end)
                               elif .name == "Read" then
                                   "**File:** `" + (.input.file_path // "unknown") + "`" +
                                   (if .input.offset then " (offset: " + (.input.offset | tostring) + ")" else "" end) +
                                   (if .input.limit then " (limit: " + (.input.limit | tostring) + ")" else "" end)
                               elif .name == "Grep" then
                                   "**Pattern:** `" + (.input.pattern // "unknown") + "`" +
                                   (if .input.path then "\n**Path:** `" + .input.path + "`" else "" end) +
                                   (if .input.glob then "\n**Glob:** `" + .input.glob + "`" else "" end)
                               elif .name == "Glob" then
                                   "**Pattern:** `" + (.input.pattern // "unknown") + "`" +
                                   (if .input.path then "\n**Path:** `" + .input.path + "`" else "" end)
                               elif .name == "Task" then
                                   "**Agent:** " + (.input.subagent_type // "unknown") + "\n" +
                                   "**Task:** " + (.input.description // "")
                               else
                                   "```\n" + ((.input | tostring) | .[0:200]) + (if ((.input | tostring) | length) > 200 then "..." else "" end) + "\n```"
                               end) + "\n---\n"
                           else
                               empty
                           end' 2>/dev/null | \
                    grep -v '^$' | \
                    head -c 120000)

                # Capture tool usage summary for quick reference
                TOOL_SUMMARY=$(tail -n +"$LAST_USER_LINE" "$TRANSCRIPT_PATH" 2>/dev/null | \
                    grep '"role":"assistant"' | \
                    jq -r 'select(.message.content != null) |
                           [.message.content[] | select(.type == "tool_use") | .name] | .[]' 2>/dev/null | \
                    sort | uniq -c | awk '{print $2 " (" $1 ")"}' | tr '\n' ', ' | sed 's/, $//')
            fi

            # Append tool summary at the end
            if [ -n "$TOOL_SUMMARY" ]; then
                RESPONSE_TEXT="${RESPONSE_TEXT}

---
**Tools Used:** ${TOOL_SUMMARY}"
            fi
        fi

        if [ "${DEBUG:-false}" = "true" ]; then
            RESPONSE_LEN=${#RESPONSE_TEXT}
            echo "[prompt-end] Response logging enabled, extracted ${RESPONSE_LEN} chars" >&2
        fi
    fi
fi

# Build payload - use temp files for large content to avoid command line limits
CONTEXT_TEMP=$(mktemp)
RESPONSE_TEMP=$(mktemp)
trap "rm -f $CONTEXT_TEMP $RESPONSE_TEMP" EXIT
echo -n "$PROMPT_CONTEXT" > "$CONTEXT_TEMP"
echo -n "$RESPONSE_TEXT" > "$RESPONSE_TEMP"

PAYLOAD=$(jq -n \
    --arg prompt_start "$PROMPT_START" \
    --arg prompt_end "$PROMPT_END" \
    --argjson duration_seconds "$DURATION_SECONDS" \
    --arg task_id "$TASK_ID" \
    --arg device_id "$DEVICE_ID" \
    --arg session_uuid "$SESSION_UUID" \
    --arg claude_session_id "$SESSION_ID" \
    --rawfile prompt_context "$CONTEXT_TEMP" \
    --rawfile response_text "$RESPONSE_TEMP" \
    '{
        prompt_start: $prompt_start,
        prompt_end: $prompt_end,
        duration_seconds: $duration_seconds,
        task_id: (if $task_id == "" or $task_id == "null" then null else ($task_id | tonumber) end),
        device_id: $device_id,
        session_uuid: $session_uuid,
        claude_session_id: $claude_session_id,
        prompt_context: ($prompt_context | rtrimstr("\n")),
        response_text: (if $response_text == "" then null else ($response_text | rtrimstr("\n")) end)
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

# Cleanup - delete the processing file we claimed
rm -f "$PROCESSING_FILE"

# Log for debugging
if [ "${DEBUG:-false}" = "true" ]; then
    echo "[prompt-end] Session: $SESSION_ID, Duration: ${DURATION_SECONDS}s, Synced: $SYNC_SUCCESS" >&2
fi

exit 0
