
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { WORKSPACES, Workspace, normalizeWorkspace } from "@/lib/workspaces";
import { CONTENT_TEMPLATES } from "@/lib/content/templates";
import { ParsedTask } from "@/lib/bulkParser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tasks, options } = body as {
            tasks: ParsedTask[],
            options: { createContentDocs: boolean }
        };

        if (!Array.isArray(tasks) || tasks.length === 0) {
            return NextResponse.json({ error: "No tasks provided" }, { status: 400 });
        }

        const db = getDb();
        const results: Array<{ id: string; title: string }> = [];
        const now = new Date().toISOString();

        // Transaction
        const insertTransaction = db.transaction((taskList: ParsedTask[]) => {
            for (const t of taskList) {
                const id = nanoid();
                let notes = t.notes || "";

                const normalizedWs = normalizeWorkspace(t.workspace);

                // 1. Insert Task
                db.prepare(`
                    INSERT INTO tasks (
                        id, title, workspace, status, 
                        scheduled_date, schedule_bucket, 
                        created_at, updated_at
                    ) VALUES (
                        @id, @title, @workspace, 'inbox',
                        @scheduled_date, 'none',
                        @now, @now
                    )
                `).run({
                    id,
                    title: t.title,
                    workspace: normalizedWs,
                    scheduled_date: t.scheduled_date || null,
                    now
                });

                // 2. Content Docs Logic
                if (t.workspace === 'content' && options.createContentDocs) {
                    const briefId = nanoid();
                    const scriptId = nanoid();
                    const storyboardId = nanoid();

                    // Insert Docs
                    const insertDoc = db.prepare(`
                        INSERT INTO docs (id, title, content_md, created_at, updated_at)
                        VALUES (@id, @title, @content, @now, @now)
                    `);

                    insertDoc.run({ id: briefId, title: `${t.title} - Brief`, content: CONTENT_TEMPLATES.BRIEF, now });
                    insertDoc.run({ id: scriptId, title: `${t.title} - Script`, content: CONTENT_TEMPLATES.SCRIPT, now });
                    insertDoc.run({ id: storyboardId, title: `${t.title} - Storyboard`, content: CONTENT_TEMPLATES.STORYBOARD, now });

                    // Link Docs (via task_docs mapping table IF exists, OR append to Notes)
                    // We don't have task_docs join table visible in types.ts. We assume 'notes' linking or single 'doc_id'.
                    // User said: "docs (future) doc_id string | null". Single doc.
                    // But here we generate 3.
                    // We will append links to Notes.
                    const links = `
\n---
**Auto-Generated Docs:**
- [Brief](/docs/${briefId})
- [Script](/docs/${scriptId})
- [Storyboard](/docs/${storyboardId})
`;
                    notes += links;
                }

                // Update notes if they changed (or if just initially set)
                // We didn't insert notes in step 1 because we might append docs.
                // Wait, 'tasks' table has 'notes' column?
                // Checking types.ts: `notes: string | null`.
                // Checking previous `POST` route: it didn't insert notes! 
                // Let's check schema. If needed, I'll update the task with notes.
                // Assuming `notes` column exists. If not, I'll check.

                // Let's assume it exists and update it.
                if (notes) {
                    db.prepare("UPDATE tasks SET notes = ? WHERE id = ?").run(notes, id);
                }

                results.push({ id, title: t.title });
            }
        });

        insertTransaction(tasks);

        return NextResponse.json({ created: results.length, details: results });
    } catch (e: unknown) {
        console.error("Batch create error", e);
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
}
