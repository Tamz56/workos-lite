import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LEGACY_AVA_WORKSPACES = ["avacrm", "ops"];
const LEGACY_AVA_PROJECT_SLUGS = [
    "avaone-q1",
    "avaone-q1-sales",
    "avaone-homeforest-q1",
    "avafarm888-fb-content-q1",
    "avaone-fb-content-q1",
    "avaone-tiktok-q1"
];
const LEGACY_DEMO_LIST_SLUGS = ["nanagarden-q1", "sku-ads"];

function placeholders(values: string[]) {
    return values.map(() => "?").join(", ");
}

export async function POST(req: Request) {
    try {
        const { mode, dry_run } = await req.json();
        const isDev = process.env.NODE_ENV === "development";
        const { getDb } = await import("@/db/db");
        const db = getDb();

        if (mode === "clean_start" && !isDev) {
            return NextResponse.json({ error: "clean_start is only available in development mode" }, { status: 403 });
        }

        const stats = {
            tasks: 0,
            projects: 0,
            lists: 0,
            docs: 0,
            events: 0,
        };

        const getStats = () => {
            if (mode === "clear_demo") {
                stats.tasks = (db.prepare(`
                    SELECT COUNT(*) as count
                    FROM tasks
                    WHERE is_seed = 1
                       OR workspace IN (${placeholders(LEGACY_AVA_WORKSPACES)})
                       OR ${LEGACY_AVA_PROJECT_SLUGS.map(() => "lower(COALESCE(notes, '')) LIKE ?").join(" OR ")}
                `).get(...LEGACY_AVA_WORKSPACES, ...LEGACY_AVA_PROJECT_SLUGS.map((slug) => `%project:${slug}%`)) as any).count;
                stats.projects = (db.prepare(`
                    SELECT COUNT(*) as count
                    FROM projects
                    WHERE is_seed = 1
                       OR slug IN (${placeholders(LEGACY_AVA_PROJECT_SLUGS)})
                       OR lower(slug) LIKE 'avaone-%'
                       OR lower(slug) LIKE 'avafarm%'
                       OR lower(name) LIKE '%avaone%'
                       OR lower(name) LIKE '%avafarm%'
                       OR lower(name) LIKE '%avacrm%'
                       OR lower(name) LIKE '%avaops%'
                `).get(...LEGACY_AVA_PROJECT_SLUGS) as any).count;
                stats.lists = (db.prepare(`
                    SELECT COUNT(*) as count
                    FROM lists
                    WHERE is_seed = 1
                       OR workspace IN (${placeholders(LEGACY_AVA_WORKSPACES)})
                       OR slug IN (${placeholders(LEGACY_DEMO_LIST_SLUGS)})
                `).get(...LEGACY_AVA_WORKSPACES, ...LEGACY_DEMO_LIST_SLUGS) as any).count;
                stats.docs = (db.prepare("SELECT COUNT(*) as count FROM docs WHERE is_seed = 1").get() as any).count;
            } else if (mode === "clean_start") {
                stats.tasks = (db.prepare("SELECT COUNT(*) as count FROM tasks").get() as any).count;
                stats.projects = (db.prepare("SELECT COUNT(*) as count FROM projects").get() as any).count;
                stats.lists = (db.prepare("SELECT COUNT(*) as count FROM lists").get() as any).count;
                stats.docs = (db.prepare("SELECT COUNT(*) as count FROM docs").get() as any).count;
                stats.events = (db.prepare("SELECT COUNT(*) as count FROM events").get() as any).count;
            }
        };

        if (dry_run) {
            getStats();
            return NextResponse.json({ stats });
        }

        // Perform actual reset in a transaction
        const resetTx = db.transaction(() => {
            if (mode === "clear_demo") {
                // Delete seed/demo data and legacy AVA test records.
                db.prepare("DELETE FROM tasks WHERE is_seed = 1").run();
                db.prepare(`DELETE FROM tasks WHERE workspace IN (${placeholders(LEGACY_AVA_WORKSPACES)})`).run(...LEGACY_AVA_WORKSPACES);
                for (const slug of LEGACY_AVA_PROJECT_SLUGS) {
                    db.prepare(`
                        DELETE FROM tasks
                        WHERE lower(COALESCE(notes, '')) LIKE ?
                           OR lower(COALESCE(title, '')) LIKE ?
                    `).run(`%project:${slug}%`, `%${slug}%`);
                }
                db.prepare("DELETE FROM projects WHERE is_seed = 1").run();
                db.prepare(`
                    DELETE FROM projects
                    WHERE slug IN (${placeholders(LEGACY_AVA_PROJECT_SLUGS)})
                       OR lower(slug) LIKE 'avaone-%'
                       OR lower(slug) LIKE 'avafarm%'
                       OR lower(name) LIKE '%avaone%'
                       OR lower(name) LIKE '%avafarm%'
                       OR lower(name) LIKE '%avacrm%'
                       OR lower(name) LIKE '%avaops%'
                `).run(...LEGACY_AVA_PROJECT_SLUGS);
                db.prepare("DELETE FROM lists WHERE is_seed = 1").run();
                db.prepare(`DELETE FROM lists WHERE workspace IN (${placeholders(LEGACY_AVA_WORKSPACES)})`).run(...LEGACY_AVA_WORKSPACES);
                db.prepare(`DELETE FROM lists WHERE slug IN (${placeholders(LEGACY_DEMO_LIST_SLUGS)})`).run(...LEGACY_DEMO_LIST_SLUGS);
                db.prepare("DELETE FROM docs WHERE is_seed = 1").run();
                db.prepare(`DELETE FROM events WHERE workspace IN (${placeholders(LEGACY_AVA_WORKSPACES)})`).run(...LEGACY_AVA_WORKSPACES);
            } else if (mode === "clean_start") {
                db.prepare("DELETE FROM sprint_items").run();
                db.prepare("DELETE FROM sprints").run();
                db.prepare("DELETE FROM project_items").run();
                db.prepare("DELETE FROM projects").run();
                db.prepare("DELETE FROM tasks").run();
                db.prepare("DELETE FROM lists").run();
                db.prepare("DELETE FROM docs").run();
                db.prepare("DELETE FROM events").run();
                db.prepare("DELETE FROM attachments").run();
                // Keep agent tables for now as they are system stuff
            }
        });

        getStats(); // Get stats before deletion for response
        resetTx();

        return NextResponse.json({ success: true, stats });
    } catch (error: any) {
        console.error("Reset error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
