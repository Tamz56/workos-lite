#!/bin/bash
set -euo pipefail

# Configuration
PROJECT_ROOT="/Users/tamz/projects/workos-lite"
DB_PATH="${PROJECT_ROOT}/data/workos.db"

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <backupfile>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file '${BACKUP_FILE}' does not exist."
    exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_OF_CURRENT="${PROJECT_ROOT}/data/workos.db.bak_${TIMESTAMP}"

echo "Safety: Moving current DB to ${BACKUP_OF_CURRENT} before restore..."
if [ -f "${DB_PATH}" ]; then
    mv "${DB_PATH}" "${BACKUP_OF_CURRENT}"
fi

echo "Restoring database from ${BACKUP_FILE}..."
cp "${BACKUP_FILE}" "${DB_PATH}"

echo "SUCCESS: Database restored."
