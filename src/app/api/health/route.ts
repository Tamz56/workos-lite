import { NextResponse } from "next/server";
import { getDb } from "@/db/db";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

type HealthResponse = {
    ok: boolean;
    db_ok: boolean;
    migrations_ok: boolean;
    schema_version: number | null;
    last_migration: string | null;
    app_version: string | null;
    db_path: string | null;
    timestamp: string;
    warnings: string[];
    errors: string[];
};

export async function GET() {
    const warnings: string[] = [];
    const errors: string[] = [];
    let db_ok = false;
    let migrations_ok = false;
    let schema_version: number | null = null;
    let last_migration: string | null = null;
    let app_version: string | null = null;
    const db_path = path.resolve(process.cwd(), "data/workos.db");

    // Check app version
    try {
        const pkgPath = path.resolve(process.cwd(), "package.json");
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
            app_version = pkg.version || null;
        }
    } catch (e) {
        warnings.push(`Failed to read package.json: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Check DB connection
    try {
        const db = getDb();

        // Simple connection check
        const result = db.prepare("SELECT 1 as ok").get() as { ok: number } | undefined;
        db_ok = result?.ok === 1;

        if (!db_ok) {
            errors.push("DB connection check failed: SELECT 1 did not return expected result");
        }
    } catch (e) {
        errors.push(`DB connection failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Check migrations / schema version
    if (db_ok) {
        try {
            const db = getDb();

            // Check PRAGMA user_version for schema version
            const versionRow = db.prepare("PRAGMA user_version").get() as { user_version: number } | undefined;
            schema_version = versionRow?.user_version ?? null;

            // Check required tables exist
            const tables = db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name IN ('tasks', 'events', 'docs', 'attachments')
            `).all() as { name: string }[];

            const requiredTables = ["tasks", "events", "docs", "attachments"];
            const existingTables = tables.map(t => t.name);
            const missingTables = requiredTables.filter(t => !existingTables.includes(t));

            if (missingTables.length > 0) {
                errors.push(`Missing tables: ${missingTables.join(", ")}`);
                migrations_ok = false;
            } else {
                migrations_ok = true;
            }

            // Get last migration info (based on table creation or other signals)
            // Just returning a summary for now
            const taskInfo = db.prepare("SELECT COUNT(*) as c FROM tasks").get() as { c: number };
            last_migration = `tables_ok (tasks=${taskInfo.c} records)`;

        } catch (e) {
            errors.push(`Migration check failed: ${e instanceof Error ? e.message : String(e)}`);
            migrations_ok = false;
        }
    }

    const ok = db_ok && migrations_ok && errors.length === 0;

    const response: HealthResponse = {
        ok,
        db_ok,
        migrations_ok,
        schema_version,
        last_migration,
        app_version,
        db_path: db_ok ? db_path : null, // Only show if OK to avoid leaking info on weird errors? Actually probably safe for admin.
        timestamp: new Date().toISOString(),
        warnings,
        errors,
    };

    return NextResponse.json(response, { status: ok ? 200 : 503 });
}
