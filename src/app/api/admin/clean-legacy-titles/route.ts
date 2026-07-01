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
            let parsedNotes: any = {};
            if (project.notes) {
                try {
                    parsedNotes = JSON.parse(project.notes);
                } catch (e) {
                    parsedNotes = { legacyNotesText: project.notes };
                }
            }

            const titleMatch = project.title.match(prefixRegex);
            const origTitleMatch = typeof parsedNotes.originalTitle === "string" ? parsedNotes.originalTitle.match(prefixRegex) : null;
            const dispTitleMatch = typeof parsedNotes.displayTitle === "string" ? parsedNotes.displayTitle.match(prefixRegex) : null;
            const canonTitleMatch = typeof parsedNotes.canonicalTitle === "string" ? parsedNotes.canonicalTitle.match(prefixRegex) : null;
            const epCodeMatch = typeof parsedNotes.episodeCode === "string" ? parsedNotes.episodeCode.match(prefixRegex) : null;

            const hasPrefix = titleMatch || origTitleMatch || dispTitleMatch || canonTitleMatch || epCodeMatch;

            if (hasPrefix) {
                const legacyId = (titleMatch || origTitleMatch || dispTitleMatch || canonTitleMatch || epCodeMatch)![1];
                const cleanTitle = project.title.replace(prefixRegex, "");

                const updatedNotes = {
                    ...parsedNotes,
                    legacyId: parsedNotes.legacyId || legacyId,
                    originalTitle: typeof parsedNotes.originalTitle === "string" ? parsedNotes.originalTitle.replace(prefixRegex, "") : undefined,
                    displayTitle: typeof parsedNotes.displayTitle === "string" ? parsedNotes.displayTitle.replace(prefixRegex, "") : undefined,
                    canonicalTitle: typeof parsedNotes.canonicalTitle === "string" ? parsedNotes.canonicalTitle.replace(prefixRegex, "") : undefined,
                    episodeCode: typeof parsedNotes.episodeCode === "string" ? parsedNotes.episodeCode.replace(prefixRegex, "") : undefined,
                };

                if (updatedNotes.originalTitle === undefined) delete updatedNotes.originalTitle;
                if (updatedNotes.displayTitle === undefined) delete updatedNotes.displayTitle;
                if (updatedNotes.canonicalTitle === undefined) delete updatedNotes.canonicalTitle;
                if (updatedNotes.episodeCode === undefined) delete updatedNotes.episodeCode;

                if (!updatedNotes.originalTitle) {
                    updatedNotes.originalTitle = project.title;
                }

                changes.push({
                    projectId: project.id,
                    oldTitle: project.title,
                    newTitle: cleanTitle,
                    legacyId,
                    updatedNotes,
                    isTitlePrefixed: !!titleMatch
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
