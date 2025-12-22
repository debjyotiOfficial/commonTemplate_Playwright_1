# ==============================================================================
# Claude Time Hook - Windows Setup
# ==============================================================================
# One-time setup for Claude Code time tracking with Project Tracker.
# This PowerShell version works on Windows systems.
#
# Prerequisites:
#   1. Have a Project Tracker account
#   2. Generate an API token in Project Tracker (Profile > API Tokens)
#   3. PowerShell 5.1 or later (included in Windows 10/11)
#
# Usage:
#   Right-click and "Run with PowerShell" or:
#   powershell -ExecutionPolicy Bypass -File setup.ps1
#
# ==============================================================================

param()

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$UserConfigDir = "$env:USERPROFILE\.config\claude-time-hook"
$UserConfigFile = "$UserConfigDir\config.json"
$ClaudeSettingsDir = "$env:USERPROFILE\.claude"
$ClaudeSettingsFile = "$ClaudeSettingsDir\settings.json"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Claude Time Hook - Windows Setup     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check PowerShell version
if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Host "Error: PowerShell 5.0 or later is required." -ForegroundColor Red
    Write-Host "Current version: $($PSVersionTable.PSVersion)"
    exit 1
}
Write-Host "`u{2713} PowerShell $($PSVersionTable.PSVersion) detected" -ForegroundColor Green

# Check if already configured
if (Test-Path $UserConfigFile) {
    Write-Host ""
    Write-Host "You already have a configuration at: $UserConfigFile" -ForegroundColor Yellow
    Write-Host ""
    $Reconfigure = Read-Host "Do you want to reconfigure? (y/N)"
    if ($Reconfigure -ne "y" -and $Reconfigure -ne "Y") {
        Write-Host "Setup cancelled. Your existing config is unchanged."
        exit 0
    }
    Write-Host ""
}

Write-Host "Before continuing, you need an API token from Project Tracker:" -ForegroundColor White
Write-Host ""
Write-Host "  1. Log into Project Tracker" -ForegroundColor Gray
Write-Host "     https://staging-dealerpro.matrackinc.com/project-tracker-v2.21-dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Go to your Profile section (click your name in sidebar)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Navigate to 'API Tokens' tab" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Click 'Generate New Token'" -ForegroundColor Gray
Write-Host ""
Write-Host "  5. Copy the generated token (starts with 'pt_')" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter when you have your API token ready..."
Write-Host ""

# Get API token
while ($true) {
    $ApiToken = Read-Host "Enter your API token (starts with pt_)"

    if (-not $ApiToken.StartsWith("pt_")) {
        Write-Host "Error: Token should start with 'pt_'. Please try again." -ForegroundColor Red
        continue
    }

    if ($ApiToken.Length -lt 20) {
        Write-Host "Error: Token seems too short. Please enter the full token." -ForegroundColor Red
        continue
    }

    break
}

# Get device identifier
Write-Host ""
$Hostname = $env:COMPUTERNAME
$DeviceId = Read-Host "Enter a device name for this machine [$Hostname]"
if ([string]::IsNullOrWhiteSpace($DeviceId)) {
    $DeviceId = $Hostname
}

# API URL
$ApiUrl = "https://staging-dealerpro.matrackinc.com/project-tracker-v2.21-dev/api/ai-prompt-logs.php"

# Create config directory
if (-not (Test-Path $UserConfigDir)) {
    New-Item -ItemType Directory -Path $UserConfigDir -Force | Out-Null
}

# Create config file
$Config = @{
    api_url = $ApiUrl
    api_token = $ApiToken
    device_id = $DeviceId
    active_task_id = $null
    sync_enabled = $true
    local_backup = $true
    capture_context = $true
    context_chars = 200
}

$Config | ConvertTo-Json -Depth 10 | Set-Content -Path $UserConfigFile -Encoding UTF8

Write-Host ""
Write-Host "`u{2713} Configuration saved to: $UserConfigFile" -ForegroundColor Green

# Create local store for backup
$LocalStore = "$UserConfigDir\local-store.json"
if (-not (Test-Path $LocalStore)) {
    @{ prompts = @() } | ConvertTo-Json | Set-Content -Path $LocalStore -Encoding UTF8
    Write-Host "`u{2713} Local backup store initialized" -ForegroundColor Green
}

# Create prompt tracking directory
$PromptTrackingDir = "$env:USERPROFILE\.claude\prompt-tracking"
if (-not (Test-Path $PromptTrackingDir)) {
    New-Item -ItemType Directory -Path $PromptTrackingDir -Force | Out-Null
}
Write-Host "`u{2713} Prompt tracking directory created" -ForegroundColor Green
Write-Host ""

# Test the token
Write-Host "Testing your API token..."
try {
    $Headers = @{
        "Authorization" = "Bearer $ApiToken"
    }
    $Response = Invoke-WebRequest -Uri $ApiUrl -Headers $Headers -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop

    if ($Response.StatusCode -eq 200) {
        Write-Host "`u{2713} Token validated successfully!" -ForegroundColor Green
    }
} catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__
    if ($StatusCode -eq 401) {
        Write-Host "`u{2717} Authentication failed. Check your API token." -ForegroundColor Red
        Write-Host "   You can still complete setup and fix the token later." -ForegroundColor Yellow
    } else {
        Write-Host "`u{26A0} Could not validate token (HTTP $StatusCode)" -ForegroundColor Yellow
        Write-Host "   Setup will continue - you can test later." -ForegroundColor Gray
    }
}

Write-Host ""

# Configure Claude Code hooks
Write-Host "Configuring Claude Code hooks..."

# Create .claude directory if it doesn't exist
if (-not (Test-Path $ClaudeSettingsDir)) {
    New-Item -ItemType Directory -Path $ClaudeSettingsDir -Force | Out-Null
}

# Define hook commands - use PowerShell to run the scripts
$StartCmd = "powershell -ExecutionPolicy Bypass -File `"$ScriptDir\prompt-start.ps1`""
$EndCmd = "powershell -ExecutionPolicy Bypass -File `"$ScriptDir\prompt-end.ps1`""

# Check if settings.json exists
if (Test-Path $ClaudeSettingsFile) {
    Write-Host "Found existing Claude settings at $ClaudeSettingsFile" -ForegroundColor Gray

    try {
        $Settings = Get-Content $ClaudeSettingsFile -Raw | ConvertFrom-Json
    } catch {
        $Settings = @{}
    }

    # Check if hooks are already configured
    if ($Settings.hooks) {
        $ExistingStart = $null
        try {
            $ExistingStart = $Settings.hooks.UserPromptSubmit[0].hooks[0].command
        } catch {}

        if ($ExistingStart -and $ExistingStart -like "*prompt-start*") {
            Write-Host "`u{26A0} Time tracking hooks are already configured." -ForegroundColor Yellow
            Write-Host "   Current: $ExistingStart" -ForegroundColor Gray
            $UpdateHooks = Read-Host "Update to use this directory's scripts? (y/N)"

            if ($UpdateHooks -eq "y" -or $UpdateHooks -eq "Y") {
                $Settings.hooks.UserPromptSubmit = @(@{
                    hooks = @(@{
                        type = "command"
                        command = $StartCmd
                        timeout = 5
                    })
                })
                $Settings.hooks.Stop = @(@{
                    hooks = @(@{
                        type = "command"
                        command = $EndCmd
                        timeout = 10
                    })
                })
                $Settings | ConvertTo-Json -Depth 10 | Set-Content -Path $ClaudeSettingsFile -Encoding UTF8
                Write-Host "`u{2713} Claude Code hooks updated" -ForegroundColor Green
            } else {
                Write-Host "Keeping existing hooks configuration."
            }
        } else {
            Write-Host "`u{26A0} Different hooks are already configured." -ForegroundColor Yellow
            $AddHooks = Read-Host "Add Project Tracker time tracking hooks? (y/N)"

            if ($AddHooks -eq "y" -or $AddHooks -eq "Y") {
                $Settings.hooks.UserPromptSubmit = @(@{
                    hooks = @(@{
                        type = "command"
                        command = $StartCmd
                        timeout = 5
                    })
                })
                $Settings.hooks.Stop = @(@{
                    hooks = @(@{
                        type = "command"
                        command = $EndCmd
                        timeout = 10
                    })
                })
                $Settings | ConvertTo-Json -Depth 10 | Set-Content -Path $ClaudeSettingsFile -Encoding UTF8
                Write-Host "`u{2713} Claude Code hooks updated" -ForegroundColor Green
            } else {
                Write-Host "Skipping hooks. Your existing hooks are unchanged."
            }
        }
    } else {
        # Add hooks to existing settings
        $Settings | Add-Member -NotePropertyName "hooks" -NotePropertyValue @{
            UserPromptSubmit = @(@{
                hooks = @(@{
                    type = "command"
                    command = $StartCmd
                    timeout = 5
                })
            })
            Stop = @(@{
                hooks = @(@{
                    type = "command"
                    command = $EndCmd
                    timeout = 10
                })
            })
        } -Force
        $Settings | ConvertTo-Json -Depth 10 | Set-Content -Path $ClaudeSettingsFile -Encoding UTF8
        Write-Host "`u{2713} Claude Code hooks added" -ForegroundColor Green
    }
} else {
    # Create new settings file
    $NewSettings = @{
        hooks = @{
            UserPromptSubmit = @(@{
                hooks = @(@{
                    type = "command"
                    command = $StartCmd
                    timeout = 5
                })
            })
            Stop = @(@{
                hooks = @(@{
                    type = "command"
                    command = $EndCmd
                    timeout = 10
                })
            })
        }
    }
    $NewSettings | ConvertTo-Json -Depth 10 | Set-Content -Path $ClaudeSettingsFile -Encoding UTF8
    Write-Host "`u{2713} Claude Code settings created" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "        Setup Complete!                " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your Claude Code prompts will now be automatically tracked!"
Write-Host ""
Write-Host "IMPORTANT: Keep this folder at:" -ForegroundColor Yellow
Write-Host "           $ScriptDir" -ForegroundColor Cyan
Write-Host "           The hooks reference scripts in this location."
Write-Host ""
Write-Host "How to use:"
Write-Host ""
Write-Host "  Option 1 - Via Project Tracker UI (Recommended):" -ForegroundColor White
Write-Host "    1. Go to Work Map in Project Tracker"
Write-Host "    2. Select a task from the 'Claude Session' dropdown"
Write-Host "    3. Click 'Start' to begin tracking"
Write-Host "    4. Use Claude Code - prompts are automatically logged!"
Write-Host ""
Write-Host "  Option 2 - Via PowerShell:" -ForegroundColor White
Write-Host "    .\set-task.ps1 <task_id>"
Write-Host ""
Write-Host "Your prompts will appear in:"
Write-Host "  - Claude Notes (on the task you're working on)"
Write-Host "  - Work Map timeline (as work sessions)"
Write-Host "  - AI Time widget (click the purple robot card)"
Write-Host ""
Write-Host "IMPORTANT: Restart Claude Code for hooks to take effect!" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to close..."
