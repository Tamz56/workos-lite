// P1E.2 / R1-L2 — test-time route/scanner utilities (no production dependency).

import fs from "node:fs";
import path from "node:path";

const FUNCTION_STYLE = /export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)\s*\(/g;
const CONST_STYLE = /export\s+const\s+(POST|PUT|PATCH|DELETE)\s*=\s*(?:async\s*)?\(/g;

export function mutationMethodsInSource(source: string): string[] {
    const methods: string[] = [];
    let match: RegExpExecArray | null;
    FUNCTION_STYLE.lastIndex = 0;
    while ((match = FUNCTION_STYLE.exec(source)) !== null) methods.push(match[1]);
    CONST_STYLE.lastIndex = 0;
    while ((match = CONST_STYLE.exec(source)) !== null) methods.push(match[1]);
    return methods;
}

export function scanRouteFiles(apiRoot: string): Map<string, string[]> {
    const out = new Map<string, string[]>();
    const walk = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.name === "route.ts") {
                const relDir = path.relative(apiRoot, path.dirname(full)).split(path.sep).join("/");
                out.set(relDir, mutationMethodsInSource(fs.readFileSync(full, "utf8")));
            }
        }
    };
    walk(apiRoot);
    return out;
}

export function findServerActionFiles(srcRoot: string): string[] {
    const found: string[] = [];
    const walk = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
                const source = fs.readFileSync(full, "utf8");
                if (source.includes('"use server"') || source.includes("'use server'")) {
                    found.push(full);
                }
            }
        }
    };
    walk(srcRoot);
    return found;
}
