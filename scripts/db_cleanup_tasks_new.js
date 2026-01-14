// scripts/db_cleanup_tasks_new.js
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
    return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

(function main() {
    if (!fs.existsSync(dbPath)) {
        console.error("DB not found:", dbPath);
        process.exit(1);
    }

    // backup ก่อนเสมอ
    const backupPath = path.join(process.cwd(), "data", `workos.backup.${ts()}.db`);
    fs.copyFileSync(dbPath, backupPath);
    console.log("Backup created:", backupPath);

    const db = new Database(dbPath);

    try {
        db.exec("BEGIN;");

        // ลบทิ้งตารางชั่วคราวที่ค้างจาก migration รอบก่อน
        if (tableExists(db, "tasks_new")) {
            console.log("Dropping leftover table: tasks_new");
            db.exec("DROP TABLE tasks_new;");
        }

        // ซ่อม timestamp กัน NOT NULL fail รอบหน้า
        if (tableExists(db, "tasks")) {
            const r1 = db
                .prepare(
                    `
          UPDATE tasks
          SET created_at = COALESCE(NULLIF(created_at,''), datetime('now'))
          WHERE created_at IS NULL OR created_at = '';
        `
                )
                .run();

            const r2 = db
                .prepare(
                    `
          UPDATE tasks
          SET updated_at = COALESCE(NULLIF(updated_at,''), NULLIF(created_at,''), datetime('now'))
          WHERE updated_at IS NULL OR updated_at = '';
        `
                )
                .run();

            console.log("created_at fixed rows:", r1.changes);
            console.log("updated_at fixed rows:", r2.changes);
        }

        db.exec("COMMIT;");
        console.log("Cleanup complete.");
    } catch (e) {
        db.exec("ROLLBACK;");
        console.error("Cleanup failed:", e);
        process.exit(1);
    } finally {
        db.close();
    }
})();
