# ==============================================================================
# Claude Code Hook: Prompt Resume (Windows PowerShell Version)
# ==============================================================================
# Triggered by PostToolUse events after a tool completes execution.
#
# EDGE CASE 2 FIX (continued): When Claude was paused waiting for permission
# and the user grants it, this hook fires after the tool executes. We use this
# to detect that the pause has ended and calculate the idle time.
#
# Input: JSON via stdin with session_id, tool_name, tool_response, etc.
# Output: None (updates temp file with accumulated idle time)
# ==============================================================================

param()

$ErrorActionPreference = "SilentlyContinue"

# Config locations
$TempDir = "$env:USERPROFILE\.claude\prompt-tracking"
$LogFile = "$TempDir\hook-debug.log"

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

# Log hook invocation (only tool name to keep log manageable)
$ToolNameLog = "unknown"
try {
    $TempInput = $StdinContent | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($TempInput.tool_name) {
        $ToolNameLog = $TempInput.tool_name
    }
} catch {
    # Ignore
}

$LogTimestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
Add-Content -Path $LogFile -Value "[$LogTimestamp] prompt-resume.ps1 invoked (tool: $ToolNameLog)" -ErrorAction SilentlyContinue

if ([string]::IsNullOrWhiteSpace($StdinContent)) {
    exit 0
}

$InputData = $null
try {
    $InputData = $StdinContent | ConvertFrom-Json
} catch {
    exit 0
}

if ($null -eq $InputData) {
    exit 0
}

# Extract session_id from input
$SessionId = $InputData.session_id

if ([string]::IsNullOrWhiteSpace($SessionId)) {
    # No session ID - ignore
    exit 0
}

# Check for matching start file
$StartFile = "$TempDir\$SessionId.json"
if (-not (Test-Path $StartFile)) {
    # No active prompt tracking - ignore
    exit 0
}

# Read current start data
try {
    $StartData = Get-Content $StartFile -Raw | ConvertFrom-Json
} catch {
    exit 0
}

# Check if we're in a paused state
$PauseStart = $StartData.pause_start
$PauseEpoch = $StartData.pause_epoch

if ([string]::IsNullOrWhiteSpace($PauseStart) -or $PauseStart -eq "null") {
    # Not paused - nothing to do
    exit 0
}

# Calculate idle time
$PstTimeZone = [TimeZoneInfo]::FindSystemTimeZoneById("Pacific Standard Time")
$UtcNow = [DateTime]::UtcNow
$PstTime = [TimeZoneInfo]::ConvertTimeFromUtc($UtcNow, $PstTimeZone)
# Calculate Unix epoch directly from UTC (epoch is always UTC-based)
$ResumeEpoch = [int64]($UtcNow - [DateTime]::new(1970, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)).TotalSeconds

$IdleTime = 0
if ($PauseEpoch -and $PauseEpoch -ne "null") {
    $IdleTime = $ResumeEpoch - [int]$PauseEpoch
    # Sanity check - cap at 4 hours (14400 seconds) to prevent outliers
    if ($IdleTime -gt 14400) {
        $IdleTime = 14400
    }
    if ($IdleTime -lt 0) {
        $IdleTime = 0
    }
}

# Get current idle_seconds and add the new idle time
$CurrentIdle = $StartData.idle_seconds
if ($null -eq $CurrentIdle -or $CurrentIdle -eq "null") {
    $CurrentIdle = 0
} else {
    $CurrentIdle = [int]$CurrentIdle
}
$NewIdle = $CurrentIdle + $IdleTime

# Update start file - clear pause and update idle_seconds
# Convert to hashtable for modification
$UpdatedData = @{}
$StartData.PSObject.Properties | ForEach-Object {
    $UpdatedData[$_.Name] = $_.Value
}
$UpdatedData["idle_seconds"] = $NewIdle
$UpdatedData["pause_start"] = $null
$UpdatedData["pause_epoch"] = $null

$UpdatedData | ConvertTo-Json -Depth 10 | Set-Content -Path $StartFile -Encoding UTF8

# Log for debugging
if ($env:DEBUG -eq "true") {
    $ResumeTimestamp = $PstTime.ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "[prompt-resume] Session: $SessionId resumed at $ResumeTimestamp (idle: ${IdleTime}s, total idle: ${NewIdle}s)" -ForegroundColor Green
}

exit 0
