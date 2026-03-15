import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();

        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug);
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Count tasks in lists belonging to this project
        const tasksCount = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE list_id LIKE ?").get(`${slug}-%`) as { count: number };
        
        // Count lists
        const listsCount = db.prepare("SELECT COUNT(*) as count FROM lists WHERE slug LIKE ?").get(`${slug}-%`) as { count: number };

        // Count docs (if they are linked to the project or tasks)
        // For now, let's just count lists and tasks as primary impact
        
        return NextResponse.json({
            slug,
            name: (project as any).name,
            is_seed: (project as any).is_seed === 1,
            impact: {
                tasks: tasksCount.count,
                lists: listsCount.count,
                docs: 0 // Placeholder until docs are linked to projects
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
