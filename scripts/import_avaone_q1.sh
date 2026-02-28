#!/usr/bin/env bash

set -e

MODE="${1:-create}"
if [[ "$MODE" != "create" && "$MODE" != "sync" ]]; then
    echo "Usage: $0 [create|sync] [path/to/excel.xlsx]"
    exit 1
fi

export MODE

EXCEL_FILE="${2:-AVAONE_Strategic_Master_Sheet_Q1_UPDATED.xlsx}"
if command -v python3 &> /dev/null; then
    EXCEL_FILE="$(python3 -c 'import os,sys; print(os.path.abspath(sys.argv[1]))' "$EXCEL_FILE")"
fi
export EXCEL_FILE

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$DIR")"

# Change to project root to ensure paths like data/workos.db and Excel files are correct
cd "$PROJECT_ROOT"

if [ ! -f "$EXCEL_FILE" ]; then
    echo "Error: $EXCEL_FILE not found."
    if [ -z "$2" ]; then
        echo "Please place the Excel file at $PROJECT_ROOT/$EXCEL_FILE or pass its path as the second argument."
    fi
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "python3 is not installed or not in PATH."
    exit 1
fi

if ! python3 -c "import openpyxl" &> /dev/null; then
    echo "Installing openpyxl..."
    pip3 install openpyxl
fi

echo "[Importer] MODE=$MODE EXCEL_FILE=$EXCEL_FILE"
python3 scripts/import_avaone_q1.py
