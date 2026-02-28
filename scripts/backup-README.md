# WorkOS-Lite SQLite Automated Backups

## Components
- `backup-db.sh`: Performs a safe SQLite backup of the database via `sqlite3`, maintaining the last 30 backups in `data/backups`.
- `restore-db.sh`: Safe restoration command that will safely backup the current living DB file before overwriting it.
- `com.workoslite.backup.plist`: Launchd plist to instruct macOS to execute the backup at 03:30 daily.

## Setup Instructions

Make sure the scripts are executable:
```bash
chmod +x scripts/backup-db.sh
chmod +x scripts/restore-db.sh
```

Install the schedule via Launchd:
```bash
mkdir -p ~/Library/LaunchAgents
cp scripts/com.workoslite.backup.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.workoslite.backup.plist
```

To remove the scheduled backup command:
```bash
launchctl unload ~/Library/LaunchAgents/com.workoslite.backup.plist
```

## How to Check Status

Verify Launchd loaded the service:
```bash
launchctl list | grep workoslite
```

View backup logs:
```bash
tail -n 50 data/backups/backup.log
```

## Manual Backup Trigger

```bash
bash scripts/backup-db.sh
```

## Restore from Backup

```bash
bash scripts/restore-db.sh data/backups/workos_<TIMESTAMP>.db
```

*Note: Database credentials like `.env.local` remain inside `.gitignore` safely, keeping secret information outside the repo.*
