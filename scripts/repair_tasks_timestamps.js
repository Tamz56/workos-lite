// scripts/repair_tasks_timestamps.js
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(process.cwd(), "data", "workos.db");

function ts() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function tableExists(db, name) {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
    return !!row;
}

function colExists(db, table, col) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    return cols.some((c) => c.name === col);
}

(function main() {
    if (!fs.existsSync(dbPath)) {
        console.error("DB not found:", dbPath);
        process.exit(1);
    }

    // 1) Backup
    const backupPath = path.join(process.cwd(), "data", `workos.backup.${ts()}.db`);
    fs.copyFileSync(dbPath, backupPath);
    console.log("Backup created:", backupPath);

    const db = new Database(dbPath);

    // 2) Cleanup half-baked migration tables (safe)
    if (tableExists(db, "tasks_new")) {
        console.log("Dropping leftover table: tasks_new");
        db.exec("DROP TABLE tasks_new;");
    }

    if (!tableExists(db, "tasks")) {
        console.error("Table 'tasks' not found.");
        process.exit(1);
    }

    const hasCreatedAt = colExists(db, "tasks", "created_at");
    const hasUpdatedAt = colExists(db, "tasks", "updated_at");

    console.log("tasks.created_at exists:", hasCreatedAt);
    console.log("tasks.updated_at exists:", hasUpdatedAt);

    db.exec("BEGIN;");

    try {
        if (hasCreatedAt) {
            // เติม created_at ให้ไม่เป็น NULL/ว่าง
            const r1 = db
                .prepare(
                    `
          UPDATE tasks
          SET created_at = COALESCE(NULLIF(created_at,''), datetime('now'))
          WHERE created_at IS NULL OR created_at = '';
        `
                )
                .run();
            console.log("created_at fixed rows:", r1.changes);
        }

        if (hasUpdatedAt) {
            // เติม updated_at ให้ไม่เป็น NULL/ว่าง (fallback ไป created_at)
            const r2 = db
                .prepare(
                    `
          UPDATE tasks
          SET updated_at = COALESCE(NULLIF(updated_at,''), NULLIF(created_at,''), datetime('now'))
          WHERE updated_at IS NULL OR updated_at = '';
        `
                )
                .run();
            console.log("updated_at fixed rows:", r2.changes);
        }

        db.exec("COMMIT;");
        console.log("Repair complete.");
    } catch (e) {
        db.exec("ROLLBACK;");
        console.error("Repair failed:", e);
        process.exit(1);
    } finally {
        db.close();
    }
})();
