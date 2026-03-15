import { db } from "@/db/db";
import { NextResponse } from "next/server";
import { TEMPLATES } from "@/lib/templates";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const { projectName, templateId } = await req.json();
        const template = TEMPLATES.find(t => t.id === templateId);

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        const projectSlug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).substring(2, 5);
        const projectId = crypto.randomUUID();

        const createProjectTx = db.transaction(() => {
            // 1. Create Project
            db.prepare(`
                INSERT INTO projects (id, slug, name, status, created_at, updated_at)
                VALUES (?, ?, ?, 'planned', datetime('now'), datetime('now'))
            `).run(projectId, projectSlug, projectName);

            // 2. Create Lists and Tasks for each template list
            for (const listTemplate of template.lists) {
                const listId = crypto.randomUUID();

                // lists table requires: id, workspace, slug, title
                db.prepare(`
                    INSERT INTO lists (id, workspace, slug, title, created_at, updated_at)
                    VALUES (?, 'inbox', ?, ?, datetime('now'), datetime('now'))
                `).run(listId, `${projectSlug}-${listTemplate.slug}`, listTemplate.title);

                for (const taskTitle of listTemplate.tasks) {
                    const taskId = crypto.randomUUID();
                    // tasks table has no 'tags' column — is_seed=0 marks as user-created content
                    db.prepare(`
                        INSERT INTO tasks (id, title, workspace, list_id, status, is_seed, created_at, updated_at)
                        VALUES (?, ?, 'inbox', ?, 'inbox', 0, datetime('now'), datetime('now'))
                    `).run(taskId, taskTitle, listId);
                }
            }
        });

        createProjectTx();

        return NextResponse.json({ success: true, projectSlug });
    } catch (error: any) {
        console.error("Project creation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
