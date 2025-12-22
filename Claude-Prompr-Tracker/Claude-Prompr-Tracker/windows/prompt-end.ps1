# ==============================================================================
# Claude Code Hook: Prompt End (Windows PowerShell Version)
# ==============================================================================
# Triggered by Stop event when Claude finishes responding.
# Retrieves start timestamp, calculates duration, and logs to Project Tracker API.
# ==============================================================================

param()

$ErrorActionPreference = "SilentlyContinue"

# Config locations
$UserConfigDir = "$env:USERPROFILE\.config\claude-time-hook"
$ConfigFile = "$UserConfigDir\config.json"
$LocalStore = "$UserConfigDir\local-store.json"
$TempDir = "$env:USERPROFILE\.claude\prompt-tracking"

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

if ([string]::IsNullOrWhiteSpace($SessionId)) {
    Write-Error "Error: No session_id in input"
    exit 1
}

# Check for matching start file
$StartFile = "$TempDir\$SessionId.json"
if (-not (Test-Path $StartFile)) {
    Write-Warning "Warning: No start file found for session $SessionId"
    exit 0
}

# Read start data
try {
    $StartData = Get-Content $StartFile -Raw | ConvertFrom-Json
} catch {
    Write-Error "Error: Could not read start file"
    exit 1
}

$PromptStart = $StartData.prompt_start
$PromptStartIso = $StartData.prompt_start_iso
$PromptContext = $StartData.prompt_context
$TaskId = $StartData.task_id

# Get end timestamp in PST
$PstTimeZone = [TimeZoneInfo]::FindSystemTimeZoneById("Pacific Standard Time")
$PstTime = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $PstTimeZone)
$PromptEnd = $PstTime.ToString("yyyy-MM-dd HH:mm:ss")
$PromptEndIso = $PstTime.ToString("yyyy-MM-ddTHH:mm:sszzz")

# Calculate duration in seconds
try {
    $StartDateTime = [DateTime]::ParseExact($PromptStart, "yyyy-MM-dd HH:mm:ss", $null)
    $EndDateTime = $PstTime
    $DurationSeconds = [int]($EndDateTime - $StartDateTime).TotalSeconds
    if ($DurationSeconds -lt 0) { $DurationSeconds = 0 }
} catch {
    $DurationSeconds = 0
}

# Generate UUID for deduplication
$SessionUuid = [guid]::NewGuid().ToString()

# Load config
if (-not (Test-Path $ConfigFile)) {
    Write-Error "Error: Config file not found at $ConfigFile. Run setup.ps1 first."
    Remove-Item -Path $StartFile -Force -ErrorAction SilentlyContinue
    exit 1
}

try {
    $Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
} catch {
    Write-Error "Error: Could not read config file"
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
    prompt_context = $PromptContext
}

$PayloadJson = $Payload | ConvertTo-Json -Compress

# Save to local store (backup)
if ($LocalBackup) {
    # Initialize local store if it doesn't exist
    if (-not (Test-Path $LocalStore)) {
        @{ prompts = @() } | ConvertTo-Json | Set-Content -Path $LocalStore -Encoding UTF8
    }

    try {
        $Store = Get-Content $LocalStore -Raw | ConvertFrom-Json

        # Add prompt to local store with pending status
        $StoreEntry = $Payload.Clone()
        $StoreEntry["synced"] = $false
        $StoreEntry["created_at"] = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

        # Handle the prompts array properly
        if ($null -eq $Store.prompts) {
            $Store.prompts = @()
        }
        $Store.prompts = @($Store.prompts) + $StoreEntry

        $Store | ConvertTo-Json -Depth 10 | Set-Content -Path $LocalStore -Encoding UTF8
    } catch {
        Write-Warning "Warning: Could not save to local store: $_"
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
            Write-Warning "Warning: API sync failed (HTTP $($Response.StatusCode))"
        }
    } catch {
        Write-Warning "Warning: API sync failed: $_"
    }
}

# Cleanup start file
Remove-Item -Path $StartFile -Force -ErrorAction SilentlyContinue

# Debug logging
if ($env:DEBUG -eq "true") {
    Write-Host "[prompt-end] Session: $SessionId, Duration: ${DurationSeconds}s, Synced: $SyncSuccess" -ForegroundColor Cyan
}

exit 0
