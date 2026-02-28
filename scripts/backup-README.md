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

## Excel Importer Usage

The repository includes an Excel importer script `scripts/import_avaone_q1.sh` to import Project tasks from an Excel file into the WorkOS DB.

**Usage:**
```bash
./scripts/import_avaone_q1.sh create   # Generates payload for ALL rows as new
./scripts/import_avaone_q1.sh create "/path/to/Custom Avaone.xlsx" # Use quotes for paths with spaces
./scripts/import_avaone_q1.sh sync     # Generates payload updating existing rows and creating new ones
```

Optional Env variables:
- `TOP15_ONLY=1 ./scripts/...` : (Specifically for NanaGarden) Process only Hero/Signature tiers.
- `SYNC_TIMELINE=1 ./scripts/...` : Extract scheduled dates from Excel and generate "planned" tasks.

**Output:**
The JSON file is written to `scripts/out/avaone_q1_payload.json`.
A manifest file `scripts/out/avaone_q1_manifest.json` will be created to track sync IDs.
You can then preview or execute the payload using the Agent API (`/agent` in the web UI).
