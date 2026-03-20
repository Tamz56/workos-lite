const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'data/workos.db');
const filesToRemove = [
    dbPath,
    `${dbPath}-shm`,
    `${dbPath}-wal`
];

console.log('--- WorkOS-Lite Clean Start Utility ---');

let removedCount = 0;
filesToRemove.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            fs.unlinkSync(file);
            console.log(`[CLEANED] Deleted: ${path.basename(file)}`);
            removedCount++;
        } catch (err) {
            console.error(`[ERROR] Failed to delete ${path.basename(file)}: ${err.message}`);
        }
    }
});

if (removedCount === 0) {
    console.log('[INFO] No database files found to clean.');
} else {
    console.log(`[SUCCESS] Cleaned ${removedCount} database file(s).`);
}

console.log('\n--- Next Steps ---');
console.log('To start with a truly empty workspace, run:');
console.log('\x1b[32m%s\x1b[0m', 'SKIP_SEED=true npm run dev');
console.log('\n(Note: If you run WITHOUT the flag, seed data will be re-populated.)');
