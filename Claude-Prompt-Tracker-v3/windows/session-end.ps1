# ==============================================================================
# Claude Code Hook: Session End (Windows PowerShell Version)
# ==============================================================================
# Triggered by SessionEnd event when the Claude Code session terminates.
# This handles the edge case where a user interrupts a prompt (Escape key)
# and then exits the session without submitting another prompt.
#
# The Stop hook does NOT fire on user interrupts, so orphaned temp files
# would remain. This script cleans them up and logs interrupted prompts.
#
# Input: JSON via stdin with session_id, reason (exit, clear, logout, etc.)
# Output: None (logs orphaned prompts to API)
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

$InputData = $null
if (-not [string]::IsNullOrWhiteSpace($StdinContent)) {
    try {
        $InputData = $StdinContent | ConvertFrom-Json
    } catch {
        # Ignore parse errors
    }
}

# Extract session info from input
$SessionId = if ($InputData) { $InputData.session_id } else { "" }
$EndReason = if ($InputData -and $InputData.reason) { $InputData.reason } else { "unknown" }

if ($env:DEBUG -eq "true") {
    Write-Host "[session-end] Session: $SessionId, Reason: $EndReason" -ForegroundColor Cyan
}

# Check if temp directory exists
if (-not (Test-Path $TempDir)) {
    exit 0
}

# Load config
$ApiUrl = ""
$ApiToken = ""
$DeviceId = ""
$SyncEnabled = $true
$LocalBackup = $true

if (Test-Path $ConfigFile) {
    try {
        $Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        $ApiUrl = $Config.api_url
        $ApiToken = $Config.api_token
        $DeviceId = $Config.device_id
        if ($null -ne $Config.sync_enabled) { $SyncEnabled = $Config.sync_enabled }
        if ($null -ne $Config.local_backup) { $LocalBackup = $Config.local_backup }
    } catch {
        # Config read failed, continue with defaults
    }
}

# ==============================================================================
# Cleanup stale claim files (.processing and .orphan)
# ==============================================================================
# These files are created during atomic file claiming and should be deleted
# after processing. If they remain, it means a script crashed before cleanup.
# ==============================================================================
$StaleFiles = Get-ChildItem -Path $TempDir -Filter "*.processing" -ErrorAction SilentlyContinue
$StaleFiles += Get-ChildItem -Path $TempDir -Filter "*.orphan" -ErrorAction SilentlyContinue
foreach ($StaleFile in $StaleFiles) {
    if ($StaleFile) {
        Remove-Item -Path $StaleFile.FullName -Force -ErrorAction SilentlyContinue
        if ($env:DEBUG -eq "true") {
            Write-Host "[session-end] Cleaned up stale file: $($StaleFile.Name)" -ForegroundColor Yellow
        }
    }
}

# ==============================================================================
# Process orphaned temp files (interrupted prompts)
# ==============================================================================
# Find all .json files in temp directory - these are prompts that were started
# but never completed (user interrupted with Escape and then exited)
# ==============================================================================

$OrphanCount = 0
$JsonFiles = Get-ChildItem -Path $TempDir -Filter "*.json" -ErrorAction SilentlyContinue

foreach ($StartFile in $JsonFiles) {
    # Read the orphaned start data
    $StartData = $null
    try {
        $StartData = Get-Content $StartFile.FullName -Raw | ConvertFrom-Json
    } catch {
        Remove-Item -Path $StartFile.FullName -Force -ErrorAction SilentlyContinue
        continue
    }

    if ($null -eq $StartData) {
        Remove-Item -Path $StartFile.FullName -Force -ErrorAction SilentlyContinue
        continue
    }

    $OrphanSessionId = $StartData.session_id
    $PromptStart = $StartData.prompt_start
    $PromptContext = $StartData.prompt_context
    $TaskId = $StartData.task_id

    if ([string]::IsNullOrWhiteSpace($PromptStart)) {
        Remove-Item -Path $StartFile.FullName -Force -ErrorAction SilentlyContinue
        continue
    }

    # Calculate duration from start to now
    $PstTimeZone = [TimeZoneInfo]::FindSystemTimeZoneById("Pacific Standard Time")
    $PstTime = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $PstTimeZone)
    $PromptEnd = $PstTime.ToString("yyyy-MM-dd HH:mm:ss")

    # Parse start time and calculate duration using DateTime arithmetic
    $StartDateTime = $null
    $EndDateTime = $PstTime

    try {
        $StartDateTime = [DateTime]::ParseExact($PromptStart, "yyyy-MM-dd HH:mm:ss", $null)
    } catch {
        Remove-Item -Path $StartFile.FullName -Force -ErrorAction SilentlyContinue
        continue
    }

    if ($null -eq $StartDateTime) {
        Remove-Item -Path $StartFile.FullName -Force -ErrorAction SilentlyContinue
        continue
    }

    $DurationSeconds = [int]($EndDateTime - $StartDateTime).TotalSeconds

    # Subtract any accumulated idle time
    $IdleSeconds = $StartData.idle_seconds
    if ($null -eq $IdleSeconds -or $IdleSeconds -eq "null") {
        $IdleSeconds = 0
    } else {
        $IdleSeconds = [int]$IdleSeconds
    }

    # Check if we were paused when interrupted
    $PauseEpoch = $StartData.pause_epoch
    if ($PauseEpoch -and $PauseEpoch -ne "null") {
        # Calculate current epoch directly from UTC (epoch is always UTC-based)
        $CurrentEpoch = [int64]([DateTime]::UtcNow - [DateTime]::new(1970, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)).TotalSeconds
        $RemainingIdle = $CurrentEpoch - [int64]$PauseEpoch
        # Cap at 4 hours
        if ($RemainingIdle -gt 14400) {
            $RemainingIdle = 14400
        }
        if ($RemainingIdle -lt 0) {
            $RemainingIdle = 0
        }
        $IdleSeconds = $IdleSeconds + $RemainingIdle
    }

    # Subtract idle time
    if ($IdleSeconds -gt 0) {
        $DurationSeconds = $DurationSeconds - $IdleSeconds
        if ($DurationSeconds -lt 0) {
            $DurationSeconds = 0
        }
    }

    # Only log if duration is reasonable (at least 1 second, less than 4 hours)
    # Interrupted prompts might have very short durations, that's OK
    if ($DurationSeconds -lt 1 -or $DurationSeconds -gt 14400) {
        Remove-Item -Path $StartFile.FullName -Force -ErrorAction SilentlyContinue
        continue
    }

    # Generate UUID for this interrupted prompt
    $SessionUuid = [guid]::NewGuid().ToString()

    # Build payload with was_interrupted flag
    $Payload = @{
        prompt_start = $PromptStart
        prompt_end = $PromptEnd
        duration_seconds = $DurationSeconds
        task_id = if ($TaskId -and $TaskId -ne "" -and $TaskId -ne "null") { [int]$TaskId } else { $null }
        device_id = $DeviceId
        session_uuid = $SessionUuid
        claude_session_id = $OrphanSessionId
        prompt_context = $PromptContext
        was_interrupted = $true
        interrupt_reason = $EndReason
    }

    $PayloadJson = $Payload | ConvertTo-Json -Compress -Depth 10

    # Save to local store (backup)
    if ($LocalBackup) {
        # Initialize local store if it doesn't exist
        if (-not (Test-Path $LocalStore)) {
            @{ prompts = @() } | ConvertTo-Json | Set-Content -Path $LocalStore -Encoding UTF8
        }

        try {
            $Store = Get-Content $LocalStore -Raw | ConvertFrom-Json

            # Add prompt to local store with pending status
            $StoreEntry = @{
                prompt_start = $Payload.prompt_start
                prompt_end = $Payload.prompt_end
                duration_seconds = $Payload.duration_seconds
                task_id = $Payload.task_id
                device_id = $Payload.device_id
                session_uuid = $Payload.session_uuid
                claude_session_id = $Payload.claude_session_id
                prompt_context = $Payload.prompt_context
                was_interrupted = $Payload.was_interrupted
                interrupt_reason = $Payload.interrupt_reason
                synced = $false
                created_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }

            # Handle the prompts array properly
            if ($null -eq $Store.prompts) {
                $Store.prompts = @()
            }
            $Store.prompts = @($Store.prompts) + $StoreEntry

            $Store | ConvertTo-Json -Depth 10 | Set-Content -Path $LocalStore -Encoding UTF8
        } catch {
            # Ignore errors updating local store
        }
    }

    # Sync to API
    if ($SyncEnabled -and $ApiUrl -and $ApiToken) {
        try {
            $Headers = @{
                "Authorization" = "Bearer $ApiToken"
                "Content-Type" = "application/json"
            }

            $Response = Invoke-WebRequest -Uri $ApiUrl -Method POST -Headers $Headers -Body $PayloadJson -TimeoutSec 10 -UseBasicParsing

            if ($Response.StatusCode -eq 200 -or $Response.StatusCode -eq 201) {
                # Mark as synced in local store
                if ($LocalBackup -and (Test-Path $LocalStore)) {
                    try {
                        $Store = Get-Content $LocalStore -Raw | ConvertFrom-Json
                        foreach ($prompt in $Store.prompts) {
                            if ($prompt.session_uuid -eq $SessionUuid) {
                                $prompt.synced = $true
                            }
                        }
                        $Store | ConvertTo-Json -Depth 10 | Set-Content -Path $LocalStore -Encoding UTF8
                    } catch {
                        # Ignore errors updating local store
                    }
                }

                if ($env:DEBUG -eq "true") {
                    Write-Host "[session-end] Logged interrupted prompt: $SessionUuid (${DurationSeconds}s)" -ForegroundColor Green
                }
            } else {
                if ($env:DEBUG -eq "true") {
                    Write-Host "[session-end] Failed to sync interrupted prompt (HTTP $($Response.StatusCode))" -ForegroundColor Red
                }
            }
        } catch {
            if ($env:DEBUG -eq "true") {
                Write-Host "[session-end] Failed to sync interrupted prompt: $_" -ForegroundColor Red
            }
        }
    }

    # Clean up the orphaned temp file
    Remove-Item -Path $StartFile.FullName -Force -ErrorAction SilentlyContinue
    $OrphanCount++
}

if ($env:DEBUG -eq "true" -and $OrphanCount -gt 0) {
    Write-Host "[session-end] Processed $OrphanCount interrupted prompt(s)" -ForegroundColor Cyan
}

exit 0
