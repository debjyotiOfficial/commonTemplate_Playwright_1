# ==============================================================================
# Claude Code Hook: Prompt Start (Windows PowerShell Version)
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

param()

$ErrorActionPreference = "SilentlyContinue"

# Config locations
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$UserConfigDir = "$env:USERPROFILE\.config\claude-time-hook"
$UserConfigFile = "$UserConfigDir\config.json"
$ProjectConfigFile = Join-Path (Split-Path -Parent $ScriptDir) "config.json"

# Use user config if exists, otherwise fall back to project config
if (Test-Path $UserConfigFile) {
    $ConfigFile = $UserConfigFile
    $LocalStore = "$UserConfigDir\local-store.json"
} else {
    $ConfigFile = $ProjectConfigFile
    $LocalStore = Join-Path (Split-Path -Parent $ScriptDir) "local-store.json"
}

$TempDir = "$env:USERPROFILE\.claude\prompt-tracking"

# Create temp directory if it doesn't exist
if (-not (Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
}

# Read JSON input from stdin (using multiple methods for compatibility)
$StdinContent = ""

# Method 1: Try reading from $input automatic variable (works with piped input)
try {
    $inputLines = @($input)
    if ($inputLines.Count -gt 0) {
        $StdinContent = $inputLines -join "`n"
    }
} catch {
    # Silently continue to next method
}

# Method 2: Try Console.In if method 1 failed
if ([string]::IsNullOrWhiteSpace($StdinContent)) {
    try {
        if ([Console]::IsInputRedirected) {
            $StdinContent = [Console]::In.ReadToEnd()
        }
    } catch {
        # Silently continue
    }
}

# Method 3: Try reading from stdin stream directly
if ([string]::IsNullOrWhiteSpace($StdinContent)) {
    try {
        $reader = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
        $StdinContent = $reader.ReadToEnd()
        $reader.Close()
    } catch {
        # Silently continue
    }
}

if ([string]::IsNullOrWhiteSpace($StdinContent)) {
    exit 0
}

$InputData = $null
try {
    $InputData = $StdinContent | ConvertFrom-Json
} catch {
    exit 1
}

if ($null -eq $InputData) {
    exit 1
}

# Extract session_id from input
$SessionId = $InputData.session_id
$Cwd = $InputData.cwd

if ([string]::IsNullOrWhiteSpace($SessionId)) {
    exit 1
}

# Load config
$ApiUrl = ""
$ApiToken = ""
$DeviceId = ""
$SyncEnabled = $true
$LocalBackup = $true
$ContextChars = 65000

if (Test-Path $ConfigFile) {
    try {
        $Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        $ApiUrl = $Config.api_url
        $ApiToken = $Config.api_token
        $DeviceId = $Config.device_id
        if ($null -ne $Config.sync_enabled) { $SyncEnabled = $Config.sync_enabled }
        if ($null -ne $Config.local_backup) { $LocalBackup = $Config.local_backup }
        if ($Config.context_chars -and $Config.context_chars -gt 0) {
            $ContextChars = [int]$Config.context_chars
        }
    } catch {
        # Config read failed, continue with defaults
    }
}

# ==============================================================================
# EDGE CASE 1 FIX: Log previous prompt if start file exists AND not already logged
# ==============================================================================
# This handles the case where user submits a new prompt before Stop fires
# (e.g., Escape interrupt). We log the previous prompt with duration calculated
# from its start time to now.
#
# ATOMIC FILE CLAIMING: Use Move-Item to atomically claim orphaned files.
# Only one script can successfully rename the file - this eliminates races.
# ==============================================================================
$StartFile = "$TempDir\$SessionId.json"
$OrphanFile = "$TempDir\$SessionId.orphan"

# Try to atomically claim any orphaned start file
$ClaimedOrphan = $false
try {
    Move-Item -Path $StartFile -Destination $OrphanFile -Force -ErrorAction Stop
    $ClaimedOrphan = $true
} catch {
    # File doesn't exist or was already claimed by prompt-end.ps1 - that's fine
    if ($env:DEBUG -eq "true") {
        Write-Host "[prompt-start] No orphaned file to process (claimed by prompt-end or doesn't exist)" -ForegroundColor Yellow
    }
}

if ($ClaimedOrphan) {
    # We successfully claimed the orphaned file - log it as intermediate
    try {
        $PrevStartData = Get-Content $OrphanFile -Raw | ConvertFrom-Json
        $PrevPromptStart = $PrevStartData.prompt_start
        $PrevPromptContext = $PrevStartData.prompt_context
        $PrevTaskId = $PrevStartData.task_id

        if (-not [string]::IsNullOrWhiteSpace($PrevPromptStart)) {
            # Calculate duration from previous start to now
            $PstTimeZone = [TimeZoneInfo]::FindSystemTimeZoneById("Pacific Standard Time")
            $UtcNow = [DateTime]::UtcNow
            $PstTime = [TimeZoneInfo]::ConvertTimeFromUtc($UtcNow, $PstTimeZone)
            $PrevEnd = $PstTime.ToString("yyyy-MM-dd HH:mm:ss")

            # Parse start time and calculate duration
            try {
                $PrevStartDateTime = [DateTime]::ParseExact($PrevPromptStart, "yyyy-MM-dd HH:mm:ss", $null)
                $PrevDuration = [int]($PstTime - $PrevStartDateTime).TotalSeconds

                # Subtract any accumulated idle time from the previous prompt
                $PrevIdleSeconds = $PrevStartData.idle_seconds
                if ($PrevIdleSeconds -and $PrevIdleSeconds -gt 0) {
                    $PrevDuration = $PrevDuration - [int]$PrevIdleSeconds
                    if ($PrevDuration -lt 0) { $PrevDuration = 0 }
                }

                # Only log if duration is reasonable (at least 1 second, less than 2 hours)
                if ($PrevDuration -ge 1 -and $PrevDuration -lt 7200) {
                    $PrevUuid = [guid]::NewGuid().ToString()

                    # Build payload for previous prompt
                    $PrevPayload = @{
                        prompt_start = $PrevPromptStart
                        prompt_end = $PrevEnd
                        duration_seconds = $PrevDuration
                        task_id = if ($PrevTaskId -and $PrevTaskId -ne "" -and $PrevTaskId -ne "null") { [int]$PrevTaskId } else { $null }
                        device_id = $DeviceId
                        session_uuid = $PrevUuid
                        claude_session_id = $SessionId
                        prompt_context = $PrevPromptContext
                        is_intermediate = $true
                    }

                    $PrevPayloadJson = $PrevPayload | ConvertTo-Json -Compress -Depth 10

                    # Save to local store (backup)
                    if ($LocalBackup) {
                        if (-not (Test-Path $LocalStore)) {
                            @{ prompts = @() } | ConvertTo-Json | Set-Content -Path $LocalStore -Encoding UTF8
                        }

                        try {
                            $Store = Get-Content $LocalStore -Raw | ConvertFrom-Json
                            $StoreEntry = @{
                                prompt_start = $PrevPayload.prompt_start
                                prompt_end = $PrevPayload.prompt_end
                                duration_seconds = $PrevPayload.duration_seconds
                                task_id = $PrevPayload.task_id
                                device_id = $PrevPayload.device_id
                                session_uuid = $PrevPayload.session_uuid
                                claude_session_id = $PrevPayload.claude_session_id
                                prompt_context = $PrevPayload.prompt_context
                                is_intermediate = $PrevPayload.is_intermediate
                                synced = $false
                                created_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                            }

                            if ($null -eq $Store.prompts) { $Store.prompts = @() }
                            $Store.prompts = @($Store.prompts) + $StoreEntry
                            $Store | ConvertTo-Json -Depth 10 | Set-Content -Path $LocalStore -Encoding UTF8
                        } catch {
                            # Ignore errors
                        }
                    }

                    # Sync to API (fire and forget - don't block new prompt)
                    if ($SyncEnabled -and $ApiUrl -and $ApiToken) {
                        try {
                            $Headers = @{
                                "Authorization" = "Bearer $ApiToken"
                                "Content-Type" = "application/json"
                            }
                            # Use Start-Job for async execution (non-blocking)
                            $null = Start-Job -ScriptBlock {
                                param($Uri, $Headers, $Body)
                                try {
                                    Invoke-WebRequest -Uri $Uri -Method POST -Headers $Headers -Body $Body -TimeoutSec 10 -UseBasicParsing | Out-Null
                                } catch { }
                            } -ArgumentList $ApiUrl, $Headers, $PrevPayloadJson

                            if ($env:DEBUG -eq "true") {
                                Write-Host "[prompt-start] Logged previous prompt: $PrevUuid (${PrevDuration}s)" -ForegroundColor Green
                            }
                        } catch {
                            # Ignore API errors
                        }
                    }
                }
            } catch {
                # Date parsing failed, skip logging previous prompt
            }
        }
    } catch {
        # Failed to read previous start data, continue
    }

    # Clean up the orphan file we processed
    Remove-Item -Path $OrphanFile -Force -ErrorAction SilentlyContinue
}

# Get current timestamp in PST
$PstTimeZone = [TimeZoneInfo]::FindSystemTimeZoneById("Pacific Standard Time")
$UtcNow = [DateTime]::UtcNow
$PstTime = [TimeZoneInfo]::ConvertTimeFromUtc($UtcNow, $PstTimeZone)
$Timestamp = $PstTime.ToString("yyyy-MM-dd HH:mm:ss")
$TimestampIso = $PstTime.ToString("yyyy-MM-ddTHH:mm:sszzz")

# Load config to get active task (CLI method)
$ActiveTaskId = $null
if (Test-Path $ConfigFile) {
    try {
        $Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        if ($Config.active_task_id -and $Config.active_task_id -ne "null") {
            $ActiveTaskId = $Config.active_task_id
        }
    } catch {
        # Config read failed, continue with defaults
    }
}

# Extract prompt text with configurable length limit
$PromptText = if ($InputData.prompt) {
    $InputData.prompt.Substring(0, [Math]::Min($ContextChars, $InputData.prompt.Length))
} else {
    ""
}

# Store start data in temp file
# Include idle_seconds field for tracking permission/clarification pauses
$StartData = @{
    session_id = $SessionId
    prompt_start = $Timestamp
    prompt_start_iso = $TimestampIso
    prompt_context = $PromptText
    cwd = $Cwd
    task_id = if ($ActiveTaskId) { [int]$ActiveTaskId } else { $null }
    idle_seconds = 0
    pause_start = $null
    pause_epoch = $null
}

$StartData | ConvertTo-Json -Depth 10 | Set-Content -Path "$TempDir\$SessionId.json" -Encoding UTF8

# Debug logging
if ($env:DEBUG -eq "true") {
    Write-Host "[prompt-start] Session: $SessionId, Time: $Timestamp" -ForegroundColor Cyan
}

exit 0
