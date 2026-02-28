import os
import sys
import sqlite3
import json
from datetime import datetime
from openpyxl import load_workbook

# Mode description: If TOP15_ONLY=1 is set in the environment, the script will only import
# rows where the "Tier" column contains "Hero" or "Signature" (case-insensitive).
# This provides a deterministic rule for importing only the top priority SKUs.

EXCEL_FILE = "AVAONE_Strategic_Master_Sheet_Q1_UPDATED.xlsx"
SHEET_NAME = "03_NanaGarden_SKU"
DB_PATH = "data/workos.db"
OUT_DIR = "scripts/out"
OUT_FILE = os.path.join(OUT_DIR, "avaone_q1_payload.json")

def main():
    top15_only = os.environ.get("TOP15_ONLY") == "1"
    
    # 1. Connect to DB to get existing task titles
    existing_titles = set()
    if os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT title FROM tasks")
            for row in c.fetchall():
                existing_titles.add(row[0])
            conn.close()
        except sqlite3.OperationalError:
            pass # Table might not exist yet
    
    # 2. Open Excel
    if not os.path.exists(EXCEL_FILE):
        print(f"Error: {EXCEL_FILE} not found.", file=sys.stderr)
        sys.exit(1)

    wb = load_workbook(EXCEL_FILE, data_only=True)
    if SHEET_NAME not in wb.sheetnames:
        print(f"Error: Sheet '{SHEET_NAME}' not found.", file=sys.stderr)
        sys.exit(1)
        
    ws = wb[SHEET_NAME]
    
    # Find column indexes
    headers = {}
    for cell in ws[1]:
        if cell.value is not None:
            headers[str(cell.value).strip().lower()] = cell.column - 1
            
    def get_val(row, col_name_keywords):
        for h, idx in headers.items():
            if any(k.lower() in h for k in col_name_keywords):
                val = row[idx]
                return str(val).strip() if val is not None else ""
        return ""

    actions = []
    created_count = 0
    skipped_count = 0
    
    for row in ws.iter_rows(min_row=2, values_only=True):
        species = get_val(row, ["species"])
        if not species:
            continue
            
        tier = get_val(row, ["tier"])
        
        if top15_only:
            t_lower = tier.lower()
            if "hero" not in t_lower and "signature" not in t_lower:
                continue
                
        title = f"NanaGarden SKU: {species} [Tier:{tier}]"
        
        if title in existing_titles:
            skipped_count += 1
            continue
            
        size = get_val(row, ["size", "inch"])
        price = get_val(row, ["price", "thb"])
        photos = get_val(row, ["photos ready"])
        title_ready = get_val(row, ["title ready"])
        copy = get_val(row, ["copy ready"])
        url = get_val(row, ["url", "listing"])
        cta = get_val(row, ["cta"])
        status = get_val(row, ["status"])
        notes_val = get_val(row, ["notes"])
        
        # Build notes content
        notes_text = f"""Tier: {tier}
Size (inch): {size}
Est price range (THB): {price}

Photos ready: {photos}
Title ready: {title_ready}
Copy ready: {copy}

Listing URL: {url}
CTA: {cta}
Status: {status}
Notes: {notes_val}

- [ ] Photos ready
- [ ] Title ready
- [ ] Copy ready
- [ ] Listing URL
- [ ] Status updated"""
        
        actions.append({
            "type": "task.create",
            "data": {
                "title": title,
                "workspace": "content",
                "status": "inbox",
                "schedule_bucket": "none",
                "priority": 2,
                "notes": notes_text
            }
        })
        created_count += 1
        
    doc_content = f"""# AVAONE Q1 Import Summary
**Import Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Mode:** {'TOP15 (Hero/Signature Only)' if top15_only else 'ALL'}

- Tasks created: {created_count}
- Tasks skipped (duplicate): {skipped_count}
"""

    actions.insert(0, {
        "type": "doc.create",
        "saveAs": "import_summary_doc",
        "data": {
            "title": f"AVAONE Q1 — Control Panel",
            "content_md": doc_content
        }
    })

    payload = {"actions": actions}
    
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        
    # Print JSON payload to stdout
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    
    # Print summary to stderr
    print(f"\\n--- Import Stats ---", file=sys.stderr)
    print(f"Created: {created_count}", file=sys.stderr)
    print(f"Skipped: {skipped_count}", file=sys.stderr)
    print(f"Payload written to {OUT_FILE}", file=sys.stderr)

if __name__ == "__main__":
    main()
