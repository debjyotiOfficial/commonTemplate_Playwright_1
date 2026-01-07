# ==============================================================================
# Claude Code Hook: Prompt Pause (Windows PowerShell Version)
# ==============================================================================
# Triggered by PermissionRequest event when Claude asks for permission.
#
# EDGE CASE 2 FIX: Tracks when Claude is idle waiting for user response.
# This time is subtracted from the total prompt duration to accurately reflect
# only the time Claude was actively working.
#
# Input: JSON via stdin with session_id, tool_name, tool_input, etc.
# Output: None (updates temp file with pause timestamp)
# ==============================================================================

param()

$ErrorActionPreference = "SilentlyContinue"

# Config locations
$TempDir = "$env:USERPROFILE\.claude\prompt-tracking"
$LogFile = "$TempDir\hook-debug.log"

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

# Log hook invocation for debugging
$LogTimestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
Add-Content -Path $LogFile -Value "[$LogTimestamp] prompt-pause.ps1 invoked" -ErrorAction SilentlyContinue
Add-Content -Path $LogFile -Value "INPUT: $StdinContent" -ErrorAction SilentlyContinue

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

# Extract session_id and tool info from input (PermissionRequest format)
$SessionId = $InputData.session_id
$ToolName = $InputData.tool_name

Add-Content -Path $LogFile -Value "SESSION_ID: $SessionId, TOOL_NAME: $ToolName" -ErrorAction SilentlyContinue

if ([string]::IsNullOrWhiteSpace($SessionId)) {
    exit 1
}

# Check for matching start file
$StartFile = "$TempDir\$SessionId.json"
if (-not (Test-Path $StartFile)) {
    # No active prompt tracking - ignore
    if ($env:DEBUG -eq "true") {
        Write-Host "[prompt-pause] No start file found, ignoring" -ForegroundColor Yellow
    }
    exit 0
}

# Read current start data
try {
    $StartData = Get-Content $StartFile -Raw | ConvertFrom-Json
} catch {
    exit 0
}

# Check if already paused
$ExistingPause = $StartData.pause_start
if (-not [string]::IsNullOrWhiteSpace($ExistingPause) -and $ExistingPause -ne "null") {
    # Already in paused state - don't overwrite
    if ($env:DEBUG -eq "true") {
        Write-Host "[prompt-pause] Already paused, ignoring" -ForegroundColor Yellow
    }
    exit 0
}

# Get current timestamp in PST
$PstTimeZone = [TimeZoneInfo]::FindSystemTimeZoneById("Pacific Standard Time")
$UtcNow = [DateTime]::UtcNow
$PstTime = [TimeZoneInfo]::ConvertTimeFromUtc($UtcNow, $PstTimeZone)
$PauseTimestamp = $PstTime.ToString("yyyy-MM-dd HH:mm:ss")
# Calculate Unix epoch directly from UTC (epoch is always UTC-based)
$PauseEpoch = [int64]($UtcNow - [DateTime]::new(1970, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)).TotalSeconds

# Update start file with pause timestamp
# Convert to hashtable for modification
$UpdatedData = @{}
$StartData.PSObject.Properties | ForEach-Object {
    $UpdatedData[$_.Name] = $_.Value
}
$UpdatedData["pause_start"] = $PauseTimestamp
$UpdatedData["pause_epoch"] = $PauseEpoch

$UpdatedData | ConvertTo-Json -Depth 10 | Set-Content -Path $StartFile -Encoding UTF8

# Log for debugging
if ($env:DEBUG -eq "true") {
    Write-Host "[prompt-pause] Session: $SessionId paused at $PauseTimestamp" -ForegroundColor Cyan
}

exit 0
