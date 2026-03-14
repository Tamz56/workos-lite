const { db } = require("./src/db/db");

try {
    const tables = ["tasks", "projects", "lists", "docs"];
    for (const table of tables) {
        const info = db.prepare(`PRAGMA table_info(${table})`).all();
        const hasIsSeed = info.some(c => c.name === "is_seed");
        console.log(`Table ${table}: has is_seed? ${hasIsSeed}`);
    }
} catch (e) {
    console.error("Verification failed:", e);
}
process.exit(0);
