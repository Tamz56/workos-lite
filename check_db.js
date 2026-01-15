const Database = require('better-sqlite3');
const db = new Database('data/workos.db');

const rows = db.prepare(`
    SELECT id, title, workspace, status, scheduled_date, schedule_bucket, created_at 
    FROM tasks 
    ORDER BY created_at DESC 
    LIMIT 5
`).all();

console.table(rows);
