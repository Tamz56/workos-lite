// scripts/h2-smoke-client.cjs
// Shared H2 bootstrap for QA smoke tooling (P1E.2 / R1-I2).
// Performs a REAL /api/human-auth/login and returns a session cookie + the
// trusted Origin used. Never prints the password or the session cookie.
// Fails clearly (no unauthenticated fallback) when credentials are missing.

const http = require('http');

function defaultBaseUrl() {
    return process.env.WORKOS_SMOKE_BASE_URL || 'http://localhost:3000';
}

function defaultOrigin() {
    return process.env.WORKOS_SMOKE_ORIGIN || defaultBaseUrl();
}

function requireHumanPassword() {
    const password = process.env.WORKOS_HUMAN_PASSWORD;
    if (!password) {
        throw new Error(
            'WORKOS_HUMAN_PASSWORD is required. Bootstrap an H2 operator via scripts/human-init.ts ' +
            'and set WORKOS_HUMAN_PASSWORD (plus WORKOS_TRUSTED_ORIGINS on the server). ' +
            'Refusing to run unauthenticated.'
        );
    }
    return password;
}

function defaultRequestImpl(url, options) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, { method: options.method || 'GET', headers: options.headers || {} }, (res) => {
            const chunks = [];
            res.on('data', (d) => chunks.push(d));
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    text: Buffer.concat(chunks).toString('utf8'),
                });
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function loginHuman(opts = {}) {
    const baseUrl = opts.baseUrl || defaultBaseUrl();
    const origin = opts.origin || defaultOrigin();
    const password = opts.password || requireHumanPassword();
    const requestImpl = opts.requestImpl || defaultRequestImpl;

    const url = new URL('/api/human-auth/login', baseUrl);
    const res = await requestImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin },
        body: JSON.stringify({ password }),
    });

    if (res.statusCode !== 200) {
        let message = 'H2 login failed';
        try {
            const parsed = JSON.parse(res.text);
            message = parsed?.error?.message || message;
        } catch {
            if (res.text) message = res.text.slice(0, 200);
        }
        throw new Error(`H2 login failed (${res.statusCode}): ${message}`);
    }

    const setCookie = Array.isArray(res.headers['set-cookie'])
        ? res.headers['set-cookie'][0]
        : res.headers['set-cookie'];
    if (!setCookie) {
        throw new Error('H2 login succeeded but no session cookie was returned');
    }

    return { baseUrl, origin, cookie: setCookie.split(';')[0] };
}

function h2Headers(ctx) {
    return { cookie: ctx.cookie, origin: ctx.origin };
}

async function logoutHuman(ctx, opts = {}) {
    const requestImpl = opts.requestImpl || defaultRequestImpl;
    try {
        const url = new URL('/api/human-auth/logout', ctx.baseUrl);
        await requestImpl(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...h2Headers(ctx) },
            body: '{}',
        });
    } catch {
        // Logout cleanup failure is non-fatal for smoke tooling.
    }
}

module.exports = {
    defaultBaseUrl,
    defaultOrigin,
    requireHumanPassword,
    loginHuman,
    logoutHuman,
    h2Headers,
};
