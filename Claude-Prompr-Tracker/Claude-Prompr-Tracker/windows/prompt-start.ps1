# ==============================================================================
# Claude Code Hook: Prompt Start (Windows PowerShell Version)
# ==============================================================================
# Triggered by UserPromptSubmit event when user submits a prompt.
# Captures the start timestamp and stores it for matching with the end event.
# ==============================================================================

param()

$ErrorActionPreference = "SilentlyContinue"

# Config locations
$UserConfigDir = "$env:USERPROFILE\.config\claude-time-hook"
$ConfigFile = "$UserConfigDir\config.json"
$TempDir = "$env:USERPROFILE\.claude\prompt-tracking"

# Create temp directory if it doesn't exist
if (-not (Test-Path $TempDir)) {
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
}

# Read JSON input from stdin
$Input = [Console]::In.ReadToEnd()

if ([string]::IsNullOrWhiteSpace($Input)) {
    Write-Error "Error: No input received"
    exit 1
}

try {
    $InputData = $Input | ConvertFrom-Json
} catch {
    Write-Error "Error: Invalid JSON input"
    exit 1
}

# Extract session_id from input
$SessionId = $InputData.session_id
$PromptText = if ($InputData.prompt) { $InputData.prompt.Substring(0, [Math]::Min(200, $InputData.prompt.Length)) } else { "" }
$Cwd = $InputData.cwd

if ([string]::IsNullOrWhiteSpace($SessionId)) {
    Write-Error "Error: No session_id in input"
    exit 1
}

# Get current timestamp in PST
$PstTimeZone = [TimeZoneInfo]::FindSystemTimeZoneById("Pacific Standard Time")
$PstTime = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $PstTimeZone)
$Timestamp = $PstTime.ToString("yyyy-MM-dd HH:mm:ss")
$TimestampIso = $PstTime.ToString("yyyy-MM-ddTHH:mm:sszzz")

# Load config to get active task
$ActiveTaskId = $null
if (Test-Path $ConfigFile) {
    try {
        $Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        if ($Config.active_task_id -and $Config.active_task_id -ne "null") {
            $ActiveTaskId = $Config.active_task_id
        }
    } catch {
        # Config read failed, continue without active task
    }
}

# Store start data in temp file
$StartData = @{
    session_id = $SessionId
    prompt_start = $Timestamp
    prompt_start_iso = $TimestampIso
    prompt_context = $PromptText
    cwd = $Cwd
    task_id = $ActiveTaskId
}

$StartData | ConvertTo-Json | Set-Content -Path "$TempDir\$SessionId.json" -Encoding UTF8

# Debug logging
if ($env:DEBUG -eq "true") {
    Write-Host "[prompt-start] Session: $SessionId, Time: $Timestamp" -ForegroundColor Cyan
}

exit 0
