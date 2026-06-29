import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { 
    validatePayload, 
    buildPreview, 
    generateSlug, 
    buildNoteContent,
    SUPPORTED_SCHEMA_VERSION 
} from "@/lib/arborInboxSchema";
import { 
    readImportLogs, 
    appendImportLog, 
    ImportLog 
} from "@/lib/arborInboxStore";
import { normalizeWorkspace } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const logs = await readImportLogs();
        return NextResponse.json(logs);
    } catch (err: any) {
        return NextResponse.json(
            { error: `ไม่สามารถดึงข้อมูลประวัติการนำเข้าได้: ${err.message}` },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    let payload: any = null;
    try {
        const body = await req.json();
        const { action } = body;
        payload = body.payload;

        if (!action || !["validate", "import"].includes(action)) {
            return NextResponse.json({ error: "Invalid action. Allowed values: validate, import" }, { status: 400 });
        }

        if (!payload) {
            return NextResponse.json({ error: "Missing payload parameter" }, { status: 400 });
        }

        const db = getDb();
        const existingProjects = db.prepare("SELECT name, slug FROM projects").all() as { name: string; slug: string }[];

        if (action === "validate") {
            const validationResult = validatePayload(payload, existingProjects);
            const preview = buildPreview(payload, existingProjects);
            return NextResponse.json({
                valid: validationResult.valid,
                errors: validationResult.errors,
                warnings: validationResult.warnings,
                preview
            });
        }

        // Action: import
        // Re-validate to ensure data safety before executing transaction
        const validationResult = validatePayload(payload, existingProjects);
        if (!validationResult.valid) {
            return NextResponse.json({ 
                error: "ไม่สามารถนำเข้าข้อมูลได้เนื่องจากข้อมูลไม่ผ่านการตรวจสอบ (Validation failed)", 
                details: validationResult.errors 
            }, { status: 400 });
        }

        let projectsCreated = 0;
        let notesCreated = 0;
        let tasksCreated = 0;
        let articleNotesCreated = 0;
        let skipped = 0;
        const importErrors: string[] = [];

        try {
            db.transaction(() => {
                // Load projects again inside transaction to prevent race conditions
                const projectMap = new Map<string, string>();
                const currentProjects = db.prepare("SELECT id, name, slug FROM projects").all() as { id: string, name: string, slug: string }[];
                for (const p of currentProjects) {
                    projectMap.set(p.name.trim().toLowerCase(), p.id);
                    projectMap.set(p.slug.trim().toLowerCase(), p.id);
                }

                const projectsToCreate = payload.items.filter((item: any) => item.type === "project");
                const otherItems = payload.items.filter((item: any) => item.type !== "project");

                // 1. Create Projects
                for (const item of projectsToCreate) {
                    const titleLower = item.title.trim().toLowerCase();
                    const slug = generateSlug(item.title);

                    if (projectMap.has(titleLower) || projectMap.has(slug)) {
                        skipped++;
                        continue;
                    }

                    const projectId = nanoid();
                    const now = new Date().toISOString();
                    
                    db.prepare(`
                        INSERT INTO projects (id, slug, name, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `).run(projectId, slug, item.title, item.status, now, now);

                    projectMap.set(titleLower, projectId);
                    projectMap.set(slug, projectId);
                    projectsCreated++;
                }

                // 2. Create other items
                for (const item of otherItems) {
                    const targetKey = item.targetProject.trim().toLowerCase();
                    let projectId = projectMap.get(targetKey);
                    
                    if (!projectId) {
                        const targetSlug = generateSlug(item.targetProject);
                        projectId = projectMap.get(targetSlug);
                    }

                    if (!projectId) {
                        throw new Error(`ไม่พบโครงการเป้าหมาย (targetProject) "${item.targetProject}" สำหรับไอเทม "${item.title}"`);
                    }

                    const now = new Date().toISOString();

                    if (item.type === "note") {
                        const noteId = nanoid();
                        let finalTitle = item.title;
                        const existingNote = db.prepare("SELECT id FROM notes WHERE project_id = ? AND title = ?").get(projectId, item.title);
                        if (existingNote) {
                            const suffix = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                            finalTitle = `${item.title} (${suffix})`;
                        }

                        const { content_html, content_json } = buildNoteContent(item.content);
                        db.prepare(`
                            INSERT INTO notes (id, title, content_json, content_html, plain_text, project_id, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `).run(noteId, finalTitle, content_json, content_html, item.content, projectId, now, now);
                        notesCreated++;

                    } else if (item.type === "task") {
                        const taskId = nanoid();
                        const projectRow = db.prepare("SELECT slug FROM projects WHERE id = ?").get(projectId) as { slug: string } | undefined;
                        const projectSlug = projectRow?.slug || generateSlug(item.targetProject);

                        const finalTitle = `project:${projectSlug} ${item.title}`;
                        const workspace = normalizeWorkspace(item.workspace);

                        db.prepare(`
                            INSERT INTO tasks (id, title, workspace, status, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `).run(taskId, finalTitle, workspace, item.status, now, now);
                        tasksCreated++;

                    } else if (item.type === "article_note") {
                        const noteId = nanoid();
                        let finalTitle = item.title;
                        const existingNote = db.prepare("SELECT id FROM notes WHERE project_id = ? AND title = ?").get(projectId, item.title);
                        if (existingNote) {
                            const suffix = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
                            finalTitle = `${item.title} (${suffix})`;
                        }

                        let combinedContent = item.content + "\n\n---\n";
                        combinedContent += `Status: ${item.status}\n`;
                        if (item.metadata && Object.keys(item.metadata).length > 0) {
                            combinedContent += `Metadata:\n`;
                            for (const [k, v] of Object.entries(item.metadata)) {
                                combinedContent += `- ${k}: ${JSON.stringify(v)}\n`;
                            }
                        }
                        if (item.nextActions && item.nextActions.length > 0) {
                            combinedContent += `Next Actions:\n`;
                            for (const action of item.nextActions) {
                                combinedContent += `- [ ] ${action}\n`;
                            }
                        }

                        const { content_html, content_json } = buildNoteContent(combinedContent);
                        db.prepare(`
                            INSERT INTO notes (id, title, content_json, content_html, plain_text, project_id, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `).run(noteId, finalTitle, content_json, content_html, combinedContent, projectId, now, now);
                        articleNotesCreated++;
                    }
                }
            })();
        } catch (txErr: any) {
            importErrors.push(txErr.message || "เกิดข้อผิดพลาดในการประมวลผลฐานข้อมูล");
            throw txErr;
        }

        // Save success log
        const logEntry: ImportLog = {
            id: nanoid(),
            importBatchTitle: payload.importBatchTitle,
            source: payload.source,
            schemaVersion: payload.schemaVersion,
            createdAt: new Date().toISOString(),
            status: "success",
            summary: {
                projectsCreated,
                notesCreated,
                tasksCreated,
                articleNotesCreated,
                skipped,
                errors: []
            }
        };

        try {
            await appendImportLog(logEntry);
        } catch (logErr: any) {
            // Log writing failed, but db transaction completed successfully
            return NextResponse.json({ 
                success: true, 
                warning: `นำเข้าข้อมูลสำเร็จ แต่ไม่สามารถบันทึกประวัติการนำเข้าได้: ${logErr.message}`,
                log: logEntry 
            });
        }

        return NextResponse.json({ success: true, log: logEntry });

    } catch (err: any) {
        console.error("Import processing error", err);
        
        // Save failed log
        const logEntry: ImportLog = {
            id: nanoid(),
            importBatchTitle: payload?.importBatchTitle || "Untitled Batch",
            source: payload?.source || "Unknown",
            schemaVersion: payload?.schemaVersion || SUPPORTED_SCHEMA_VERSION,
            createdAt: new Date().toISOString(),
            status: "failed",
            summary: {
                projectsCreated: 0,
                notesCreated: 0,
                tasksCreated: 0,
                articleNotesCreated: 0,
                skipped: 0,
                errors: [err.message || "Unknown error during transaction"]
            }
        };

        try {
            await appendImportLog(logEntry);
        } catch {}

        return NextResponse.json({ 
            error: `การนำเข้าข้อมูลล้มเหลว: ${err.message || "Unknown error"}`, 
            details: [err.message]
        }, { status: 500 });
    }
}
