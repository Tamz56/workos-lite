#!/usr/bin/env python3
"""Remove worksheet protection from the WorkOS Project Field Sheet v1 template.

The committed template was generated with openpyxl, which by default locks every
cell and enables sheet protection without a password. Users in Excel could not
enter workbook metadata or edit the sample data row, so this script removes the
sheetProtection elements while preserving all values, styles, validations,
named ranges, filters, freeze panes, merges, and formatting.

Usage:
    python3 scripts/fix_workos_field_sheet_template_editability.py
"""

from __future__ import annotations

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

TEMPLATE_PATH = Path("docs/project-import/templates/workos-project-field-sheet-v1.xlsx")
SHEET_NAMES = {
    "00_Metadata",
    "01_Project_Documentation",
    "02_Backlog",
}


def remove_sheet_protection() -> None:
    if not TEMPLATE_PATH.exists():
        raise SystemExit(f"Template not found: {TEMPLATE_PATH}")

    rewritten: list[tuple[str, bytes]] = []
    changed = 0
    with ZipFile(TEMPLATE_PATH, "r") as source:
        for item in source.infolist():
            data = source.read(item.filename)
            if item.filename.startswith("xl/worksheets/sheet") and item.filename.endswith(".xml"):
                text = data.decode("utf-8")
                if "<sheetProtection " in text:
                    start = text.index("<sheetProtection ")
                    end = text.index("/>", start) + 2
                    data = (text[:start] + text[end:]).encode("utf-8")
                    changed += 1
            rewritten.append((item.filename, data))

    with ZipFile(TEMPLATE_PATH, "w", ZIP_DEFLATED) as target:
        for name, data in rewritten:
            target.writestr(name, data)

    print(f"Removed sheetProtection from {changed} worksheet XML file(s).")
    if changed != 3:
        raise SystemExit(f"Expected 3 protected sheets, found {changed}. Aborting.")


if __name__ == "__main__":
    remove_sheet_protection()
