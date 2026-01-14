// scripts/smoke_base.js
// Base helper for smoke tests

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);

        const reqOpts = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = http.request(url, reqOpts, (res) => {
            const chunks = [];
            res.on('data', (d) => chunks.push(d));
            res.on('end', () => {
                const body = Buffer.concat(chunks).toString();
                let json;
                try {
                    json = JSON.parse(body);
                } catch (e) {
                    json = body;
                }

                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: json,
                    ok: res.statusCode >= 200 && res.statusCode < 300
                });
            });
        });

        req.on('error', (e) => {
            reject(new Error(`Request failed: ${e.message}`));
        });

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

function logPass(name) {
    console.log(`✅ [PASS] ${name}`);
}

function logFail(name, err) {
    console.error(`❌ [FAIL] ${name}`);
    if (err) console.error(err);
    process.exit(1);
}

module.exports = { request, logPass, logFail };
