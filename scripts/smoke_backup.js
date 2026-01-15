// scripts/smoke_backup.js
const { request, logPass, logFail } = require('./smoke_base');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function download(urlPath, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        const url = new URL(urlPath, process.env.BASE_URL || 'http://localhost:3000');

        http.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Download failed with status ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => { });
            reject(err);
        });
    });
}

async function main() {
    try {
        console.log('Running Smoke Test: Backup API');

        const testDir = path.resolve(process.cwd(), '.smoke_tmp');
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

        const zipPath = path.join(testDir, 'backup.zip');

        // 1. Export ZIP
        console.log('Exporting ZIP...');
        await download('/api/export-zip', zipPath);

        const stats = fs.statSync(zipPath);
        if (stats.size < 100) throw new Error(`ZIP too small: ${stats.size} bytes`);
        logPass('Export ZIP');

        // 2. Validate ZIP (Using restore API dry-run if possible or just assuming export worked)
        // Since we don't have a pure "validate" endpoint without sending the file,
        // and sending multipart/form-data via pure node http is tedious without libs,
        // we'll primarily rely on the export capability for the basic smoke test.
        // If we strictly need validation, we'd need to construct a multipart request.

        // For this smoke script, we'll verify it's a valid zip signature
        const fd = fs.openSync(zipPath, 'r');
        const buffer = Buffer.alloc(4);
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);

        // PK\x03\x04
        if (buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
            throw new Error('Invalid ZIP signature');
        }
        logPass('Validate ZIP signature');

        // Clean up
        fs.rmSync(testDir, { recursive: true, force: true });

    } catch (e) {
        logFail('Backup Smoke Test', e);
    }
}

main();
