import { NextRequest, NextResponse } from "next/server";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import {
    validatePayload,
    buildPreview,
    generateSlug,
    buildNoteContent,
    SUPPORTED_SCHEMA_VERSION,
    SCHEMA_UPDATE_VERSION
} from "@/lib/arborInboxSchema";
import {
    readImportLogs,
    appendImportLog,
    ImportLog
} from "@/lib/arborInboxStore";
import { normalizeWorkspace } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

// Deep merge helper for nested notes objects
function deepMerge(target: any, source: any) {
    if (!source) return target;
    if (!target || typeof target !== "object") return source;
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key], source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}

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
    const authGuard = humanMutationGuard(req);
    if (authGuard instanceof NextResponse) return authGuard;
    let payload: any = null;
    try {
        const body = await req.json();
        const { action } = body;
        payload = body.payload;

        if (!action || !["validate", "import", "apply_update"].includes(action)) {
            return NextResponse.json({ error: "Invalid action. Allowed values: validate, import, apply_update" }, { status: 400 });
        }

        if (!payload) {
            return NextResponse.json({ error: "Missing payload parameter" }, { status: 400 });
        }

        const db = getDb();
        const existingProjects = db.prepare("SELECT name, slug FROM projects").all() as { name: string; slug: string }[];
        const version = payload.schemaVersion;

        // 1. VALIDATE ACTION
        if (action === "validate") {
            if (version === SCHEMA_UPDATE_VERSION) {
                // Fetch target project details for comparison preview
                let targetRow: any = null;
                if (payload.target?.projectId) {
                    targetRow = db.prepare("SELECT * FROM gf_writing_projects WHERE id = ?").get(payload.target.projectId);
                }
                if (!targetRow && payload.target?.projectSlug) {
                    targetRow = db.prepare("SELECT * FROM gf_writing_projects WHERE slug = ?").get(payload.target.projectSlug);
                }

                const errors: string[] = [];
                const warnings: string[] = [];

                if (!targetRow) {
                    errors.push(`Target project "${payload.target?.projectId || payload.target?.projectSlug}" not found in database`);
                }

                const validationResult = validatePayload(payload, existingProjects);
                validationResult.errors.push(...errors);

                const previewGroups: any = {};
                let fieldsUpdatedCount = 0;

                if (targetRow && payload.fields) {
                    let parsedNotes: any = {};
                    if (targetRow.notes) {
                        try {
                            parsedNotes = JSON.parse(targetRow.notes);
                        } catch {
                            parsedNotes = { legacyNotesText: targetRow.notes };
                        }
                    }

                    if (payload.fields.performanceFeedback) {
                        const pfPayload = payload.fields.performanceFeedback;
                        const pfExisting = parsedNotes.performanceFeedback || {};

                        if (pfPayload.facebookSnapshots) {
                            const existingFB = pfExisting.facebookSnapshots || {};
                            for (const win of Object.keys(pfPayload.facebookSnapshots)) {
                                if (existingFB[win] && Object.keys(existingFB[win]).length > 0) {
                                    validationResult.warnings.push(`ตรวจพบข้อมูล Facebook Snapshot สำหรับช่วงเวลา "${win}" อยู่แล้วในระบบ หากยืนยันบันทึกจะเขียนทับข้อมูลเดิม`);
                                }
                            }
                        }

                        if (pfPayload.ga4Snapshots) {
                            const existingGA4 = pfExisting.ga4Snapshots || {};
                            for (const win of Object.keys(pfPayload.ga4Snapshots)) {
                                if (existingGA4[win] && Object.keys(existingGA4[win]).length > 0) {
                                    validationResult.warnings.push(`ตรวจพบข้อมูล GA4 Snapshot สำหรับช่วงเวลา "${win}" อยู่แล้วในระบบ หากยืนยันบันทึกจะเขียนทับข้อมูลเดิม`);
                                }
                            }
                        }
                    }

                    const compareFields = (groupKey: string, mappings: Record<string, { type: "column" | "notes" | "pf" | "arborReview", path?: string }>) => {
                        const fieldsInPayload = payload.fields[groupKey];
                        if (!fieldsInPayload) return;

                        previewGroups[groupKey] = [];
                        for (const key of Object.keys(fieldsInPayload)) {
                            fieldsUpdatedCount++;
                            const mapping = mappings[key];
                            let prevVal: any = undefined;
                            const newVal = fieldsInPayload[key];

                            if (mapping) {
                                if (mapping.type === "column") {
                                    prevVal = targetRow[key];
                                } else if (mapping.type === "notes") {
                                    prevVal = parsedNotes[mapping.path || key];
                                } else if (mapping.type === "pf") {
                                    const pf = parsedNotes.performanceFeedback || {};
                                    if (mapping.path) {
                                        const parts = mapping.path.split(".");
                                        let curr = pf;
                                        for (const p of parts) {
                                            curr = curr ? curr[p] : undefined;
                                        }
                                        prevVal = curr;
                                    }
                                } else if (mapping.type === "arborReview") {
                                    const pf = parsedNotes.performanceFeedback || {};
                                    const review = pf.arborReview || {};
                                    prevVal = review[key];
                                }
                            }

                            let impact = "empty_to_filled";
                            const prevStr = prevVal !== undefined && prevVal !== null ? String(prevVal) : "";
                            const newStr = newVal !== undefined && newVal !== null ? String(newVal) : "";

                            if (prevStr === newStr) {
                                impact = "unchanged";
                            } else if (prevStr) {
                                impact = "overwrite_warning";
                                validationResult.warnings.push(`ฟิลด์ "${key}" ในกลุ่ม "${groupKey}" มีข้อมูลเดิมอยู่แล้วและจะถูกเขียนทับ`);
                            }

                            previewGroups[groupKey].push({
                                key,
                                prev: prevStr,
                                new: newStr,
                                impact
                            });
                        }
                    };

                    const seoMappings: any = {};
                    const seoCols = [
                        "title", "slug", "meta_title", "meta_description", "keywords", "excerpt",
                        "narrative_title", "narrative_slug", "narrative_hero_subtitle", "narrative_featured_image_url",
                        "narrative_short_summary", "narrative_meta_title", "narrative_meta_description", "narrative_keywords",
                        "narrative_schema_jsonld", "narrative_status", "narrative_editors_pick", "narrative_related_knowledge_article", "narrative_journey_stage",
                        "knowledge_title", "knowledge_slug", "knowledge_hero_subtitle", "knowledge_featured_image_url",
                        "knowledge_short_summary", "knowledge_meta_title", "knowledge_meta_description", "knowledge_keywords",
                        "knowledge_schema_jsonld", "knowledge_status", "knowledge_editors_pick", "knowledge_related_narrative_article",
                        "knowledge_primary_keyword", "knowledge_secondary_keywords", "knowledge_category",
                        "references_notes", "narrative_body", "knowledge_body"
                    ];
                    for (const col of seoCols) {
                        seoMappings[col] = { type: "column" };
                    }

                    const socialMappings: any = {};
                    const socialCols = ["group_post_markdown", "page_post_markdown", "personal_post_markdown", "social_caption", "hashtags"];
                    for (const col of socialCols) {
                        socialMappings[col] = { type: "column" };
                    }

                    const utmMappings = {
                        publishedUrl: { type: "notes", path: "published_url" },
                        campaignName: { type: "notes", path: "campaign_name" },
                        publishStatus: { type: "pf", path: "publishingRecord.publishStatus" },
                        publishedDate: { type: "pf", path: "publishingRecord.publishedDate" },
                        facebookGroupUrl: { type: "pf", path: "publishingRecord.facebookGroupUrl" },
                        facebookPageUrl: { type: "pf", path: "publishingRecord.facebookPageUrl" },
                        personalPostUrl: { type: "pf", path: "publishingRecord.personalPostUrl" },
                        utmCampaign: { type: "pf", path: "publishingRecord.utmCampaign" }
                    } as const;

                    const arborReviewMappings = {
                        summary: { type: "arborReview" },
                        next_step: { type: "arborReview" },
                        strengths: { type: "arborReview" },
                        revisions: { type: "arborReview" },
                        risks: { type: "arborReview" }
                    } as const;

                    const perfMappings = {
                        snapshots: { type: "notes", path: "performanceFeedback.snapshots" },
                        facebookSnapshots: { type: "notes", path: "performanceFeedback.facebookSnapshots" },
                        ga4Snapshots: { type: "notes", path: "performanceFeedback.ga4Snapshots" },
                        combinedAnalysis: { type: "notes", path: "performanceFeedback.combinedAnalysis" },
                        notableFeedback: { type: "notes", path: "performanceFeedback.notableFeedback" },
                        arborInsight: { type: "notes", path: "performanceFeedback.arborInsight" },
                        nextDecision: { type: "notes", path: "performanceFeedback.nextDecision" },
                        sourceMetadata: { type: "notes", path: "performanceFeedback.sourceMetadata" }
                    } as const;

                    compareFields("seo", seoMappings);
                    compareFields("socialDrafts", socialMappings);
                    compareFields("utmPublish", utmMappings);
                    compareFields("arborReview", arborReviewMappings);
                    compareFields("performanceFeedback", perfMappings);
                }

                return NextResponse.json({
                    valid: validationResult.valid,
                    errors: validationResult.errors,
                    warnings: validationResult.warnings,
                    preview: {
                        schemaType: "writing_lab_update",
                        targetProject: targetRow ? { id: targetRow.id, title: targetRow.title, slug: targetRow.slug } : null,
                        groups: previewGroups,
                        fieldsUpdatedCount
                    }
                });
            }

            // Old version validation path
            const validationResult = validatePayload(payload, existingProjects);
            const preview = buildPreview(payload, existingProjects);
            return NextResponse.json({
                valid: validationResult.valid,
                errors: validationResult.errors,
                warnings: validationResult.warnings,
                preview
            });
        }

        // 2. APPLY UPDATE ACTION
        if (action === "apply_update") {
            if (version !== SCHEMA_UPDATE_VERSION) {
                return NextResponse.json({ error: "Invalid action for old schema version" }, { status: 400 });
            }

            let targetRow: any = null;
            if (payload.target?.projectId) {
                targetRow = db.prepare("SELECT * FROM gf_writing_projects WHERE id = ?").get(payload.target.projectId);
            }
            if (!targetRow && payload.target?.projectSlug) {
                targetRow = db.prepare("SELECT * FROM gf_writing_projects WHERE slug = ?").get(payload.target.projectSlug);
            }

            if (!targetRow) {
                return NextResponse.json({ error: "ไม่พบโปรเจกต์เป้าหมายสำหรับเขียนร่าง" }, { status: 400 });
            }

            let parsedNotes: any = {};
            if (targetRow.notes) {
                try {
                    parsedNotes = JSON.parse(targetRow.notes);
                } catch {
                    parsedNotes = { legacyNotesText: targetRow.notes };
                }
            }

            const updates: string[] = [];
            const values: any[] = [];

            // Map columns from seo and socialDrafts
            const allowedCols = [
                "title", "slug", "meta_title", "meta_description", "keywords", "excerpt",
                "narrative_title", "narrative_slug", "narrative_hero_subtitle", "narrative_featured_image_url",
                "narrative_short_summary", "narrative_meta_title", "narrative_meta_description", "narrative_keywords",
                "narrative_schema_jsonld", "narrative_status", "narrative_editors_pick", "narrative_related_knowledge_article", "narrative_journey_stage",
                "knowledge_title", "knowledge_slug", "knowledge_hero_subtitle", "knowledge_featured_image_url",
                "knowledge_short_summary", "knowledge_meta_title", "knowledge_meta_description", "knowledge_keywords",
                "knowledge_schema_jsonld", "knowledge_status", "knowledge_editors_pick", "knowledge_related_narrative_article",
                "knowledge_primary_keyword", "knowledge_secondary_keywords", "knowledge_category",
                "group_post_markdown", "page_post_markdown", "personal_post_markdown", "social_caption", "hashtags",
                "references_notes", "narrative_body", "knowledge_body"
            ];

            if (payload.fields.seo) {
                for (const col of allowedCols) {
                    if (payload.fields.seo[col] !== undefined) {
                        updates.push(`${col} = ?`);
                        values.push(payload.fields.seo[col]);
                    }
                }
            }
            if (payload.fields.socialDrafts) {
                for (const col of allowedCols) {
                    if (payload.fields.socialDrafts[col] !== undefined) {
                        updates.push(`${col} = ?`);
                        values.push(payload.fields.socialDrafts[col]);
                    }
                }
            }

            // Map notes updates defensively
            if (!parsedNotes.performanceFeedback) {
                parsedNotes.performanceFeedback = {};
            }

            if (payload.fields.utmPublish) {
                const utm = payload.fields.utmPublish;
                if (utm.publishedUrl !== undefined) {
                    parsedNotes.published_url = utm.publishedUrl;
                }
                if (utm.campaignName !== undefined) {
                    parsedNotes.campaign_name = utm.campaignName;
                }

                if (!parsedNotes.performanceFeedback.publishingRecord) {
                    parsedNotes.performanceFeedback.publishingRecord = {};
                }
                const pr = parsedNotes.performanceFeedback.publishingRecord;
                if (utm.publishedUrl !== undefined) pr.publishedUrl = utm.publishedUrl;
                if (utm.publishedDate !== undefined) pr.publishedDate = utm.publishedDate;
                if (utm.facebookGroupUrl !== undefined) pr.facebookGroupUrl = utm.facebookGroupUrl;
                if (utm.facebookPageUrl !== undefined) pr.facebookPageUrl = utm.facebookPageUrl;
                if (utm.personalPostUrl !== undefined) pr.personalPostUrl = utm.personalPostUrl;
                if (utm.utmCampaign !== undefined) pr.utmCampaign = utm.utmCampaign;
                if (utm.publishStatus !== undefined) pr.publishStatus = utm.publishStatus;
            }

            if (payload.fields.arborReview) {
                parsedNotes.performanceFeedback.arborReview = {
                    ...parsedNotes.performanceFeedback.arborReview,
                    ...payload.fields.arborReview
                };
            }

            if (payload.fields.performanceFeedback) {
                const pf = payload.fields.performanceFeedback;
                if (pf.snapshots) {
                    parsedNotes.performanceFeedback.snapshots = deepMerge(
                        parsedNotes.performanceFeedback.snapshots,
                        pf.snapshots
                    );
                }
                if (pf.facebookSnapshots) {
                    parsedNotes.performanceFeedback.facebookSnapshots = deepMerge(
                        parsedNotes.performanceFeedback.facebookSnapshots,
                        pf.facebookSnapshots
                    );
                }
                if (pf.ga4Snapshots) {
                    parsedNotes.performanceFeedback.ga4Snapshots = deepMerge(
                        parsedNotes.performanceFeedback.ga4Snapshots,
                        pf.ga4Snapshots
                    );
                }
                if (pf.combinedAnalysis) {
                    parsedNotes.performanceFeedback.combinedAnalysis = deepMerge(
                        parsedNotes.performanceFeedback.combinedAnalysis,
                        pf.combinedAnalysis
                    );
                }
                if (pf.notableFeedback) {
                    parsedNotes.performanceFeedback.notableFeedback = deepMerge(
                        parsedNotes.performanceFeedback.notableFeedback,
                        pf.notableFeedback
                    );
                }
                if (pf.arborInsight) {
                    parsedNotes.performanceFeedback.arborInsight = deepMerge(
                        parsedNotes.performanceFeedback.arborInsight,
                        pf.arborInsight
                    );
                }
                if (pf.nextDecision) {
                    parsedNotes.performanceFeedback.nextDecision = deepMerge(
                        parsedNotes.performanceFeedback.nextDecision,
                        pf.nextDecision
                    );
                }
                if (pf.sourceMetadata) {
                    parsedNotes.performanceFeedback.sourceMetadata = deepMerge(
                        parsedNotes.performanceFeedback.sourceMetadata,
                        pf.sourceMetadata
                    );
                }

                // Sync new facebook/ga4 snapshots into legacy snapshots for backward compatibility
                const legSnaps = parsedNotes.performanceFeedback.snapshots || {};
                const fbSnaps = parsedNotes.performanceFeedback.facebookSnapshots || {};
                const ga4Snaps = parsedNotes.performanceFeedback.ga4Snapshots || {};

                const syncLeg = (w: string) => {
                    const leg = legSnaps[w] || {};
                    const fb = fbSnaps[w] || {};
                    const ga4 = ga4Snaps[w] || {};
                    return {
                        snapshotDate: ga4.snapshotDate || fb.snapshotDate || leg.snapshotDate || "",
                        views: ga4.views !== undefined ? ga4.views : leg.views || "",
                        users: ga4.activeUsers !== undefined ? ga4.activeUsers : leg.users || "",
                        events: ga4.events !== undefined ? ga4.events : leg.events || "",
                        engagementTime: ga4.averageEngagementTime !== undefined ? ga4.averageEngagementTime : leg.engagementTime || "",
                        sourceMedium: ga4.sourceMedium || leg.sourceMedium || "",
                        fbReach: fb.reach !== undefined ? fb.reach : leg.fbReach || "",
                        fbReactions: fb.reactions !== undefined ? fb.reactions : leg.fbReactions || "",
                        fbComments: fb.comments !== undefined ? fb.comments : leg.fbComments || "",
                        fbShares: fb.shares !== undefined ? fb.shares : leg.fbShares || "",
                        fbClicks: fb.linkClicks !== undefined ? fb.linkClicks : leg.fbClicks || "",
                        notes: ga4.notes || fb.notes || leg.notes || ""
                    };
                };
                parsedNotes.performanceFeedback.snapshots = {
                    snap24h: syncLeg("snap24h"),
                    snap7d: syncLeg("snap7d"),
                    snap30d: syncLeg("snap30d")
                };
            }

            updates.push("notes = ?");
            values.push(JSON.stringify(parsedNotes));
            updates.push("updated_at = datetime('now')");

            const sql = `UPDATE gf_writing_projects SET ${updates.join(", ")} WHERE id = ?`;
            values.push(targetRow.id);

            db.transaction(() => {
                db.prepare(sql).run(...values);
            })();

            // Write success log
            const logEntry: ImportLog = {
                id: nanoid(),
                importBatchTitle: payload.importBatchTitle,
                source: payload.source,
                schemaVersion: payload.schemaVersion,
                createdAt: new Date().toISOString(),
                status: "success",
                summary: {
                    projectsCreated: 0,
                    notesCreated: 0,
                    tasksCreated: 0,
                    articleNotesCreated: 0,
                    skipped: 0,
                    errors: [],
                    ...({
                        fieldsUpdated: Object.keys(payload.fields).reduce((acc, k) => acc + Object.keys(payload.fields[k]).length, 0),
                        targetProject: targetRow.title
                    } as any)
                }
            };

            await appendImportLog(logEntry);
            return NextResponse.json({ success: true, log: logEntry });
        }

        // 3. OLD VERSION IMPORT ACTION
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
                const projectMap = new Map<string, string>();
                const currentProjects = db.prepare("SELECT id, name, slug FROM projects").all() as { id: string, name: string, slug: string }[];
                for (const p of currentProjects) {
                    projectMap.set(p.name.trim().toLowerCase(), p.id);
                    projectMap.set(p.slug.trim().toLowerCase(), p.id);
                }

                const projectsToCreate = payload.items.filter((item: any) => item.type === "project");
                const otherItems = payload.items.filter((item: any) => item.type !== "project");

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
            return NextResponse.json({
                success: true,
                warning: `นำเข้าข้อมูลสำเร็จ แต่ไม่สามารถบันทึกประวัติการนำเข้าได้: ${logErr.message}`,
                log: logEntry
            });
        }

        return NextResponse.json({ success: true, log: logEntry });

    } catch (err: any) {
        console.error("Import processing error", err);

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
