#!/usr/bin/env bash

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$DIR")"

# Change to project root to ensure paths like data/workos.db and Excel files are correct
cd "$PROJECT_ROOT"

if ! command -v python3 &> /dev/null; then
    echo "python3 is not installed or not in PATH."
    exit 1
fi

if ! python3 -c "import openpyxl" &> /dev/null; then
    echo "Installing openpyxl..."
    pip3 install openpyxl
fi

python3 scripts/import_avaone_q1.py
