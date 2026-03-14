import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
    try {
        const db = getDb();
        const slug = params.slug;

        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug);
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Cascade logic to find related items
        // 1. Lists
        const lists = db.prepare("SELECT id FROM lists WHERE slug LIKE ?").all(`${slug}-%`);
        const listIds = lists.map((l: any) => l.id);

        // 2. Tasks
        const taskResult = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE list_id LIKE ?").get(`${slug}-%`) as { count: number };
        const taskCount = taskResult.count;

        // 3. Docs (linked via doc_id on tasks)
        const docResult = db.prepare(`
            SELECT COUNT(DISTINCT doc_id) as count 
            FROM tasks 
            WHERE list_id LIKE ? 
            AND doc_id IS NOT NULL 
            AND doc_id != ''
        `).get(`${slug}-%`) as { count: number };
        const docCount = docResult.count;

        return NextResponse.json({
            project: 1,
            lists: lists.length,
            tasks: taskCount,
            docs: docCount,
            is_seed: (project as any).is_seed === 1
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
