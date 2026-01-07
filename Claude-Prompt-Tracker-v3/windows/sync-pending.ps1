# ==============================================================================
# Sync Pending Prompts (Windows PowerShell Version)
# ==============================================================================
# Retries syncing any prompts that failed to upload (e.g., due to being offline).
#
# Usage:
#   .\sync-pending.ps1
#
# ==============================================================================

param()

$UserConfigDir = "$env:USERPROFILE\.config\claude-time-hook"
$ConfigFile = "$UserConfigDir\config.json"
$LocalStore = "$UserConfigDir\local-store.json"

# Check if config exists
if (-not (Test-Path $ConfigFile)) {
    Write-Host "Error: Config not found at $ConfigFile" -ForegroundColor Red
    Write-Host "Run setup.ps1 first to configure the hook."
    exit 1
}

# Check if local store exists
if (-not (Test-Path $LocalStore)) {
    Write-Host "No local store found. Nothing to sync."
    exit 0
}

# Load config
try {
    $Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
} catch {
    Write-Host "Error: Could not read config file" -ForegroundColor Red
    exit 1
}

$ApiUrl = $Config.api_url
$ApiToken = $Config.api_token

if ([string]::IsNullOrWhiteSpace($ApiUrl) -or [string]::IsNullOrWhiteSpace($ApiToken)) {
    Write-Host "Error: API URL or token not configured" -ForegroundColor Red
    exit 1
}

# Load local store
try {
    $Store = Get-Content $LocalStore -Raw | ConvertFrom-Json
} catch {
    Write-Host "Error: Could not read local store" -ForegroundColor Red
    exit 1
}

# Get pending prompts
$PendingPrompts = @($Store.prompts | Where-Object { $_.synced -eq $false })
$PendingCount = $PendingPrompts.Count

if ($PendingCount -eq 0) {
    Write-Host "`u{2713} All prompts are synced. Nothing to do." -ForegroundColor Green
    exit 0
}

Write-Host "Found $PendingCount pending prompt(s) to sync..."
Write-Host ""

$SuccessCount = 0
$FailCount = 0

$Headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type" = "application/json"
}

foreach ($Prompt in $PendingPrompts) {
    $SessionUuid = $Prompt.session_uuid
    $PayloadJson = $Prompt | ConvertTo-Json -Compress

    try {
        $Response = Invoke-WebRequest -Uri $ApiUrl -Method POST -Headers $Headers -Body $PayloadJson -TimeoutSec 10 -UseBasicParsing

        if ($Response.StatusCode -eq 200 -or $Response.StatusCode -eq 201) {
            Write-Host "  `u{2713} Synced: $SessionUuid" -ForegroundColor Green

            # Mark as synced in the store
            foreach ($p in $Store.prompts) {
                if ($p.session_uuid -eq $SessionUuid) {
                    $p.synced = $true
                }
            }
            $SuccessCount++
        } else {
            Write-Host "  `u{2717} Failed: $SessionUuid (HTTP $($Response.StatusCode))" -ForegroundColor Red
            $FailCount++
        }
    } catch {
        Write-Host "  `u{2717} Failed: $SessionUuid ($_)" -ForegroundColor Red
        $FailCount++
    }
}

# Save updated store
$Store | ConvertTo-Json -Depth 10 | Set-Content -Path $LocalStore -Encoding UTF8

Write-Host ""
Write-Host "Sync complete."
Write-Host "  Synced: $SuccessCount" -ForegroundColor Green
Write-Host "  Failed: $FailCount" -ForegroundColor $(if ($FailCount -gt 0) { "Red" } else { "White" })
