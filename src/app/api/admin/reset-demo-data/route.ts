import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
                stats.tasks = (db.prepare("SELECT COUNT(*) as count FROM tasks WHERE is_seed = 1").get() as any).count;
                stats.projects = (db.prepare("SELECT COUNT(*) as count FROM projects WHERE is_seed = 1").get() as any).count;
                stats.lists = (db.prepare("SELECT COUNT(*) as count FROM lists WHERE is_seed = 1").get() as any).count;
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
                // Delete tasks associated with seed lists or projects
                db.prepare("DELETE FROM tasks WHERE is_seed = 1").run();
                db.prepare("DELETE FROM projects WHERE is_seed = 1").run();
                db.prepare("DELETE FROM lists WHERE is_seed = 1").run();
                db.prepare("DELETE FROM docs WHERE is_seed = 1").run();
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
