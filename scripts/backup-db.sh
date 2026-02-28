#!/bin/bash
set -euo pipefail

# Paths
PROJECT_ROOT="/Users/tamz/projects/workos-lite"
DB_PATH="${PROJECT_ROOT}/data/workos.db"
BACKUP_DIR="${PROJECT_ROOT}/data/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M")
BACKUP_FILENAME="${BACKUP_DIR}/workos_${TIMESTAMP}.db"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Ensure sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
    echo "[${TIMESTAMP}] ERROR: sqlite3 could not be found." >> "${LOG_FILE}"
    exit 1
fi

# Run safe backup via sqlite3
if sqlite3 "${DB_PATH}" ".backup '${BACKUP_FILENAME}'"; then
    # Verify backup file size is greater than 0
    if [ -s "${BACKUP_FILENAME}" ]; then
        echo "[${TIMESTAMP}] SUCCESS: Backup created at ${BACKUP_FILENAME}" >> "${LOG_FILE}"
    else
        echo "[${TIMESTAMP}] ERROR: Backup file is empty!" >> "${LOG_FILE}"
        rm -f "${BACKUP_FILENAME}"
        exit 1
    fi
else
    echo "[${TIMESTAMP}] ERROR: sqlite3 backup command failed!" >> "${LOG_FILE}"
    exit 1
fi

# Retention policy: keep last 30 backups, delete older ones
ls -t "${BACKUP_DIR}"/workos_*.db 2>/dev/null | tail -n +31 | xargs -I {} rm -- {} 2>/dev/null || true
