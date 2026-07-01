import { NextResponse } from "next/server";
import { db } from "@/db/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const action = body.action || "preview"; // "preview" or "apply"

        const projects = db.prepare(`SELECT id, title, notes FROM gf_writing_projects`).all() as any[];
        const prefixRegex = /^(\d+)\s*—\s*/;
        const changes: any[] = [];

        for (const project of projects) {
            const match = project.title.match(prefixRegex);
            if (match) {
                const legacyId = match[1];
                const cleanTitle = project.title.replace(prefixRegex, "");

                let parsedNotes: any = {};
                if (project.notes) {
                    try {
                        parsedNotes = JSON.parse(project.notes);
                    } catch (e) {
                        parsedNotes = { legacyNotesText: project.notes };
                    }
                }

                const updatedNotes = {
                    ...parsedNotes,
                    legacyId: parsedNotes.legacyId || legacyId,
                    originalTitle: parsedNotes.originalTitle || project.title
                };

                changes.push({
                    projectId: project.id,
                    oldTitle: project.title,
                    newTitle: cleanTitle,
                    legacyId,
                    updatedNotes
                });
            }
        }

        if (action === "apply") {
            const updateStmt = db.prepare(`
                UPDATE gf_writing_projects
                SET title = ?, notes = ?, updated_at = datetime('now')
                WHERE id = ?
            `);

            const tx = db.transaction(() => {
                for (const change of changes) {
                    updateStmt.run(change.newTitle, JSON.stringify(change.updatedNotes), change.projectId);
                }
            });
            tx();

            return NextResponse.json({
                success: true,
                message: `ทำความสะอาดและจัดระเบียบชื่อตอนสำเร็จทั้งหมด ${changes.length} รายการ`,
                updatedCount: changes.length
            });
        }

        // Default: preview
        return NextResponse.json({
            success: true,
            proposedChanges: changes
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
