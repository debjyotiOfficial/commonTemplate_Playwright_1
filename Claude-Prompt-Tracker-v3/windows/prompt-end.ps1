# ==============================================================================
# Claude Code Hook: Prompt End (Windows PowerShell Version)
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

if ([string]::IsNullOrWhiteSpace($SessionId)) {
    exit 1
}

# Check for matching start file
$StartFile = "$TempDir\$SessionId.json"
$ProcessingFile = "$TempDir\$SessionId.processing"

# ==============================================================================
# ATOMIC FILE CLAIMING: Use Move-Item to atomically claim the file
# ==============================================================================
# Only one script can successfully rename the file. This eliminates race
# conditions between prompt-start and prompt-end.
# ==============================================================================
try {
    Move-Item -Path $StartFile -Destination $ProcessingFile -Force -ErrorAction Stop
} catch {
    # File doesn't exist or was already claimed by prompt-start.ps1
    if ($env:DEBUG -eq "true") {
        Write-Host "[prompt-end] Could not claim start file (already processed or doesn't exist)" -ForegroundColor Yellow
    }
    exit 0
}

# We successfully claimed the file - read from the processing file
$StartData = $null
try {
    $StartData = Get-Content $ProcessingFile -Raw | ConvertFrom-Json
} catch {
    Remove-Item -Path $ProcessingFile -Force -ErrorAction SilentlyContinue
    exit 0
}

$PromptStart = $StartData.prompt_start
$PromptStartIso = $StartData.prompt_start_iso
$PromptContext = $StartData.prompt_context
$TaskId = $StartData.task_id

if ([string]::IsNullOrWhiteSpace($PromptStart)) {
    # Invalid file - clean up
    Remove-Item -Path $ProcessingFile -Force -ErrorAction SilentlyContinue
    exit 0
}

# Get end timestamp in PST
$PstTimeZone = [TimeZoneInfo]::FindSystemTimeZoneById("Pacific Standard Time")
$UtcNow = [DateTime]::UtcNow
$PstTime = [TimeZoneInfo]::ConvertTimeFromUtc($UtcNow, $PstTimeZone)
$PromptEnd = $PstTime.ToString("yyyy-MM-dd HH:mm:ss")
$PromptEndIso = $PstTime.ToString("yyyy-MM-ddTHH:mm:sszzz")

# Calculate duration in seconds
$DurationSeconds = 0
try {
    $StartDateTime = [DateTime]::ParseExact($PromptStart, "yyyy-MM-dd HH:mm:ss", $null)
    $EndDateTime = $PstTime
    $DurationSeconds = [int]($EndDateTime - $StartDateTime).TotalSeconds
    if ($DurationSeconds -lt 0) { $DurationSeconds = 0 }
} catch {
    $DurationSeconds = 0
}

# ==============================================================================
# EDGE CASE 2 FIX: Subtract idle time from duration
# ==============================================================================
# If there's accumulated idle time (from permission prompts, clarifications, etc.),
# subtract it from the total duration. Also check if we're currently paused and
# calculate any remaining idle time.
# ==============================================================================
$IdleSeconds = $StartData.idle_seconds
if ($null -eq $IdleSeconds -or $IdleSeconds -eq "null") {
    $IdleSeconds = 0
} else {
    $IdleSeconds = [int]$IdleSeconds
}

# Check if we're currently paused (Stop fired while waiting for user input)
$PauseEpoch = $StartData.pause_epoch
if ($PauseEpoch -and $PauseEpoch -ne "null") {
    # Calculate remaining idle time from pause to now
    $CurrentEpoch = [int64]($UtcNow - [DateTime]::new(1970, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)).TotalSeconds
    $RemainingIdle = $CurrentEpoch - [int64]$PauseEpoch
    # Sanity check - cap at 4 hours
    if ($RemainingIdle -gt 14400) { $RemainingIdle = 14400 }
    if ($RemainingIdle -lt 0) { $RemainingIdle = 0 }
    $IdleSeconds = $IdleSeconds + $RemainingIdle
}

# Subtract idle time from duration
if ($IdleSeconds -gt 0) {
    $DurationSeconds = $DurationSeconds - $IdleSeconds
    if ($DurationSeconds -lt 0) { $DurationSeconds = 0 }

    if ($env:DEBUG -eq "true") {
        Write-Host "[prompt-end] Subtracted ${IdleSeconds}s idle time from duration" -ForegroundColor Yellow
    }
}

# Generate UUID for deduplication
$SessionUuid = [guid]::NewGuid().ToString()

# Load config
if (-not (Test-Path $ConfigFile)) {
    Remove-Item -Path $StartFile -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $DoneMarker -Force -ErrorAction SilentlyContinue
    exit 1
}

$Config = $null
try {
    $Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
} catch {
    exit 1
}

$ApiUrl = $Config.api_url
$ApiToken = $Config.api_token
$DeviceId = $Config.device_id
$SyncEnabled = if ($null -eq $Config.sync_enabled) { $true } else { $Config.sync_enabled }
$LocalBackup = if ($null -eq $Config.local_backup) { $true } else { $Config.local_backup }

# Build payload
$Payload = @{
    prompt_start = $PromptStart
    prompt_end = $PromptEnd
    duration_seconds = $DurationSeconds
    task_id = if ($TaskId -and $TaskId -ne "null" -and $TaskId -ne "") { [int]$TaskId } else { $null }
    device_id = $DeviceId
    session_uuid = $SessionUuid
    claude_session_id = $SessionId
    prompt_context = $PromptContext
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
        # Ignore errors
    }
}

# Sync to API
$SyncSuccess = $false
if ($SyncEnabled -and $ApiUrl -and $ApiToken) {
    try {
        $Headers = @{
            "Authorization" = "Bearer $ApiToken"
            "Content-Type" = "application/json"
        }

        $Response = Invoke-WebRequest -Uri $ApiUrl -Method POST -Headers $Headers -Body $PayloadJson -TimeoutSec 10 -UseBasicParsing

        if ($Response.StatusCode -eq 200 -or $Response.StatusCode -eq 201) {
            $SyncSuccess = $true

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
                Write-Host "[prompt-end] Synced: $SessionUuid ($DurationSeconds seconds)" -ForegroundColor Green
            }
        } else {
            if ($env:DEBUG -eq "true") {
                Write-Host "[prompt-end] API sync failed (HTTP $($Response.StatusCode))" -ForegroundColor Red
            }
        }
    } catch {
        if ($env:DEBUG -eq "true") {
            Write-Host "[prompt-end] API sync failed: $_" -ForegroundColor Red
        }
    }
}

# Cleanup - delete the processing file we claimed
Remove-Item -Path $ProcessingFile -Force -ErrorAction SilentlyContinue

# Debug logging
if ($env:DEBUG -eq "true") {
    Write-Host "[prompt-end] Session: $SessionId, Duration: ${DurationSeconds}s, Synced: $SyncSuccess" -ForegroundColor Cyan
}

exit 0
