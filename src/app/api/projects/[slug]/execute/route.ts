import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();

        // 1. Protection Check
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug);
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        
        if ((project as any).is_seed === 1) {
            return NextResponse.json({ 
                error: "Cannot delete seed/demo project from UI." 
            }, { status: 403 });
        }

        // 2. Cascade Delete in Transaction
        const transaction = db.transaction(() => {
            // A. Delete tasks in lists belonging to this project
            db.prepare("DELETE FROM tasks WHERE list_id LIKE ?").run(`${slug}-%`);

            // B. Delete lists
            db.prepare("DELETE FROM lists WHERE slug LIKE ?").run(`${slug}-%`);

            // C. Delete project
            db.prepare("DELETE FROM projects WHERE slug = ?").run(slug);
        });

        transaction();

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
