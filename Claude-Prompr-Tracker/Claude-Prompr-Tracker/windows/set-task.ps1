# ==============================================================================
# Set Active Task for Claude Time Tracking (Windows PowerShell Version)
# ==============================================================================
# Sets or clears the active task ID. When set, all Claude prompts will be
# associated with this task.
#
# Usage:
#   .\set-task.ps1 123      # Set task #123 as active
#   .\set-task.ps1          # Clear active task (prompts will be unassigned)
#
# ==============================================================================

param(
    [Parameter(Position = 0)]
    [string]$TaskId
)

$UserConfigDir = "$env:USERPROFILE\.config\claude-time-hook"
$ConfigFile = "$UserConfigDir\config.json"

# Check if config exists
if (-not (Test-Path $ConfigFile)) {
    Write-Host "Error: Config not found at $ConfigFile" -ForegroundColor Red
    Write-Host "Run setup.ps1 first to configure the hook."
    exit 1
}

try {
    $Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
} catch {
    Write-Host "Error: Could not read config file" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($TaskId)) {
    # Clear active task
    $Config.active_task_id = $null
    $Config | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigFile -Encoding UTF8

    Write-Host "`u{2713} Active task cleared" -ForegroundColor Green
    Write-Host "  Prompts will not be assigned to any task."
} else {
    # Validate task ID is a number
    if ($TaskId -notmatch '^\d+$') {
        Write-Host "Error: Task ID must be a number" -ForegroundColor Red
        exit 1
    }

    # Set active task
    $Config.active_task_id = [int]$TaskId
    $Config | ConvertTo-Json -Depth 10 | Set-Content -Path $ConfigFile -Encoding UTF8

    Write-Host "`u{2713} Active task set to #$TaskId" -ForegroundColor Green
    Write-Host "  All prompts will be associated with this task."
}

Write-Host ""
Write-Host "Tip: You can also set the active task in Project Tracker:"
Write-Host "     Work Map > Claude Session dropdown > Select task > Start"
