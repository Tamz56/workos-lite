// scripts/smoke_seed_attachment.js
// Seed a test attachment for smoke testing
// Run with: node scripts/smoke_seed_attachment.js

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const dbPath = path.resolve(process.cwd(), "data/workos.db");
const attachmentsDir = path.resolve(process.cwd(), ".workos-lite/attachments");

function main() {
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // 1. Get a task ID to attach to
    const task = db.prepare("SELECT id, title FROM tasks LIMIT 1").get();
    if (!task) {
        console.error("No tasks found. Create a task first.");
        db.close();
        return;
    }
    console.log("Using task:", task.id, "-", task.title);

    // 2. Create attachments directory if needed
    if (!fs.existsSync(attachmentsDir)) {
        fs.mkdirSync(attachmentsDir, { recursive: true });
    }

    // 3. Create a test file
    const fileName = "smoke-test.txt";
    const storagePath = `attachments/${fileName}`;
    const fullPath = path.join(attachmentsDir, fileName);

    fs.writeFileSync(fullPath, "Hello from smoke test attachment!\nGenerated at: " + new Date().toISOString());
    console.log("Created file:", fullPath);

    // 4. Insert attachment row
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    try {
        db.prepare(`
            INSERT INTO attachments (id, task_id, file_name, mime_type, size_bytes, storage_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, task.id, fileName, "text/plain", fs.statSync(fullPath).size, storagePath, now);

        console.log("Inserted attachment:", id);
        console.log("storage_path:", storagePath);
    } catch (e) {
        console.error("Insert failed:", e.message);
    }

    // 5. Verify
    const count = db.prepare("SELECT COUNT(*) as c FROM attachments").get();
    console.log("Total attachments in DB:", count.c);

    db.close();
    console.log("\n✅ Smoke attachment seeded! Now export ZIP and restore to test.");
}

main();
