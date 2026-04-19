import { getDb } from "./src/db/db.js";

try {
    console.log("Connecting to DB...");
    const db = getDb();
    console.log("Checking tasks count...");
    const count = db.prepare("SELECT COUNT(*) as count FROM tasks").get();
    console.log("Tasks count:", count);
} catch (e) {
    console.error("DB Error:", e);
}
