# Claude Time Hook - Windows Version

Automatically track time spent on Claude Code prompts in Project Tracker.

## Quick Start

```powershell
# 1. Extract this folder anywhere on your Windows machine
# 2. Right-click setup.ps1 and select "Run with PowerShell"
#    OR open PowerShell and run:
powershell -ExecutionPolicy Bypass -File setup.ps1

# 3. Restart Claude Code
# 4. Start working - prompts are tracked automatically!
```

## Prerequisites

- **Windows 10/11** with PowerShell 5.1+ (pre-installed)
- **Claude Code** installed and working
- **Project Tracker** account with API token

No additional software installation required!

## Setup Steps

### Step 1: Get an API Token

1. Log into Project Tracker at:
   https://staging-dealerpro.matrackinc.com/project-tracker-v2.21-dev
2. Go to **Profile** (click your name in sidebar)
3. Navigate to **API Tokens** tab
4. Click **Generate New Token**
5. Copy the token (starts with `pt_`)

### Step 2: Run Setup

**Option A - Right-click method:**
1. Right-click `setup.ps1`
2. Select "Run with PowerShell"

**Option B - Command line:**
```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

The script will:
- Ask for your API token
- Ask for a device name (optional)
- Create your config at `%USERPROFILE%\.config\claude-time-hook\config.json`
- Register hooks in `%USERPROFILE%\.claude\settings.json`

### Step 3: Restart Claude Code

**Important!** You must restart Claude Code for the hooks to take effect.

## Usage

### Option 1: Via Project Tracker UI (Recommended)

1. Go to **Work Map** in Project Tracker
2. Select a task from the **Claude Session** dropdown
3. Click **Start** to begin tracking
4. Use Claude Code normally - all prompts are logged!

### Option 2: Via PowerShell

```powershell
# Set task #123 as active (prompts will be associated with it)
.\set-task.ps1 123

# Clear active task (prompts will be unassigned)
.\set-task.ps1
```

## Where Prompts Appear

When a task is active, your prompts show up in:

- **Claude Notes** - On the task's Claude Notes section
- **Work Map** - As work sessions on the timeline
- **AI Time Widget** - Click the purple robot card for analytics

## Files

| File | Description |
|------|-------------|
| `setup.ps1` | One-time setup script |
| `prompt-start.ps1` | Hook: captures prompt start time |
| `prompt-end.ps1` | Hook: captures end time, sends to API |
| `set-task.ps1` | Set/clear active task |
| `sync-pending.ps1` | Retry failed syncs |

## Configuration

Your config is stored at: `%USERPROFILE%\.config\claude-time-hook\config.json`

```json
{
  "api_url": "https://..../api/ai-prompt-logs.php",
  "api_token": "pt_your_token_here",
  "device_id": "Your-Device-Name",
  "active_task_id": null,
  "sync_enabled": true,
  "local_backup": true
}
```

## Troubleshooting

### "Execution Policy" error
Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Or use the bypass flag:
```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

### "Config not found"
Run `setup.ps1` first to create your configuration.

### Prompts not being logged
1. Restart Claude Code after running setup
2. Check `%USERPROFILE%\.claude\settings.json` has the hooks configured
3. Run with debug: `$env:DEBUG="true"; .\prompt-end.ps1`

### Authentication failed
- Check your API token is correct
- Generate a new token in Project Tracker if needed

### Sync failed
- Check your internet connection
- Run `.\sync-pending.ps1` to retry failed syncs

## Important Notes

- **Keep this folder** - The hooks reference scripts in this location
- **Don't move after setup** - Or re-run setup.ps1 to update paths
- Prompts are backed up locally in case sync fails
- Works with both PowerShell 5.1 and PowerShell 7+

## Differences from Linux Version

| Feature | Linux | Windows |
|---------|-------|---------|
| Shell | Bash | PowerShell |
| JSON parsing | jq (external) | Built-in ConvertFrom-Json |
| UUID generation | /proc/sys/kernel/random/uuid | [guid]::NewGuid() |
| Config location | ~/.config/ | %USERPROFILE%\.config\ |
| Script extension | .sh | .ps1 |

## Support

For issues or questions, contact your Project Tracker administrator.
