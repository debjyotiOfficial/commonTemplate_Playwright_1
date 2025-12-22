# Claude Time Hook - Portable Package

Automatically track time spent on Claude Code prompts in Project Tracker.

## Platform Support

| Platform | Folder | Scripts |
|----------|--------|---------|
| **Linux/macOS** | Root folder | `.sh` files |
| **Windows** | `windows/` folder | `.ps1` files |

---

## Quick Start - Linux/macOS

```bash
# 1. Extract this folder anywhere on your machine
# 2. Run the setup script
./setup.sh

# 3. Restart Claude Code
# 4. Start working - prompts are tracked automatically!
```

## Quick Start - Windows

```powershell
# 1. Extract this folder anywhere on your machine
# 2. Navigate to the windows/ subfolder
# 3. Double-click setup.bat OR run in PowerShell:
powershell -ExecutionPolicy Bypass -File setup.ps1

# 4. Restart Claude Code
# 5. Start working - prompts are tracked automatically!
```

---

## Prerequisites

### Linux/macOS

Install `jq` (JSON processor):

```bash
# RHEL/CentOS/Fedora
sudo dnf install jq

# Debian/Ubuntu
sudo apt-get install jq

# macOS
brew install jq
```

### Windows

No additional prerequisites! PowerShell 5.1+ is included with Windows 10/11.

## Setup Steps

### Step 1: Get an API Token

1. Log into Project Tracker at:
   https://staging-dealerpro.matrackinc.com/project-tracker-v2.21-dev
2. Go to **Profile** (click your name in sidebar)
3. Navigate to **API Tokens** tab
4. Click **Generate New Token**
5. Copy the token (starts with `pt_`)

### Step 2: Run Setup

```bash
./setup.sh
```

The script will:
- Ask for your API token
- Ask for a device name (optional)
- Create your config at `~/.config/claude-time-hook/config.json`
- Register hooks in `~/.claude/settings.json`

### Step 3: Restart Claude Code

**Important!** You must restart Claude Code for the hooks to take effect.

## Usage

### Option 1: Via Project Tracker UI (Recommended)

1. Go to **Work Map** in Project Tracker
2. Select a task from the **Claude Session** dropdown
3. Click **Start** to begin tracking
4. Use Claude Code normally - all prompts are logged!

### Option 2: Via CLI

```bash
# Set task #123 as active (prompts will be associated with it)
./set-task.sh 123

# Clear active task (prompts will be unassigned)
./set-task.sh
```

## Where Prompts Appear

When a task is active, your prompts show up in:

- **Claude Notes** - On the task's Claude Notes section
- **Work Map** - As work sessions on the timeline
- **AI Time Widget** - Click the purple robot card for analytics

## Files

| File | Description |
|------|-------------|
| `setup.sh` | One-time setup script |
| `prompt-start.sh` | Hook: captures prompt start time |
| `prompt-end.sh` | Hook: captures end time, sends to API |
| `set-task.sh` | Set/clear active task |
| `sync-pending.sh` | Retry failed syncs |

## Configuration

Your config is stored at: `~/.config/claude-time-hook/config.json`

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

### "jq is not installed"
Install jq using the commands in Prerequisites section.

### "Config not found"
Run `./setup.sh` first to create your configuration.

### Prompts not being logged
1. Restart Claude Code after running setup
2. Check `~/.claude/settings.json` has the hooks configured
3. Run with debug: `DEBUG=true ./prompt-end.sh`

### Authentication failed
- Check your API token is correct
- Generate a new token in Project Tracker if needed

### Sync failed
- Check your internet connection
- Run `./sync-pending.sh` to retry failed syncs

## Important Notes

- **Keep this folder** - The hooks reference scripts in this location
- **Don't move after setup** - Or re-run setup.sh (or setup.ps1 on Windows) to update paths
- Prompts are backed up locally in case sync fails

## Windows Users

See `windows/README.md` for Windows-specific documentation, including:
- PowerShell execution policy settings
- Windows-specific troubleshooting
- Differences from the Linux version

## Support

For issues or questions, contact your Project Tracker administrator.
