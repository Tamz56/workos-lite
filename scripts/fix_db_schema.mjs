import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "data/workos.db");
const db = new Database(dbPath);

console.log("Dropping table 'docs'...");
try {
    db.exec("DROP TABLE IF EXISTS docs");
    console.log("✅ Dropped 'docs'. It will be recreated on next API call.");
} catch (e) {
    console.error("❌ Failed to drop docs:", e);
}
