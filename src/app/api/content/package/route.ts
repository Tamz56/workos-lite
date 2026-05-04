export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { AGENT_TEMPLATES } from "@/lib/agent/templates";
import { toErrorMessage } from "@/lib/error";
import {
  ArticleStudioPackage,
  formatArticlePackageMarkdown,
  normalizeArticleStudioPackage,
  validateArticleStudioPackage,
} from "@/lib/content/articleStudio";
import {
  findContentSlugConflict,
  findExistingTopicDoc,
  findExistingTopicStageTask,
  normalizeContentTopicId,
  resolveContentListForTopic,
} from "@/lib/content/topicLists";

function buildArticleTaskNotes(params: {
  pkg: ArticleStudioPackage;
  stage: string;
  docId: string;
  checklist: string[];
}) {
  return `---
topic_id: ${params.pkg.topic_id}
topic_title: ${params.pkg.title}
template_key: article
stage: ${params.stage}
doc_ref: ${params.docId}
status_label: ${params.pkg.status || "Needs Review"}
---

${params.checklist.map((item) => `- [ ] ${item}`).join("\n")}`;
}

function readStageFromNotes(notes: string | null | undefined) {
  const match = notes?.match(/(?:^|\n)stage:\s*(.+)/);
  return match?.[1]?.trim() || null;
}

const STEP_ROLE_MAP: Record<string, string> = {
  research_raw: "Research Raw — NotebookLM",
  research_direction: "Research Direction — Arbor Questions",
  brief: "Brief",
  script_caption: "Script & Caption",
  outline_web_article: "Outline web article",
  assets_canva: "Visual Package",
  seo_schema: "SEO & Schema",
  publish: "Review / Publish",
  general: "Draft",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topicId, topicTitle, templateKey, publishDate, listId } = body;

    if (body.articlePackage) {
      const pkg = normalizeArticleStudioPackage(body.articlePackage);
      const validation = validateArticleStudioPackage(pkg);

      if (validation.missingFields.length > 0) {
        return NextResponse.json(
          {
            error: "Article Package ยังไม่พร้อมสร้าง",
            details: validation.validationMessages,
          },
          { status: 400 }
        );
      }

      const db = getDb();
      const now = new Date().toISOString();
      const warnings: string[] = [];
      const taskIds: string[] = [];
      let resolvedListId = "";
      let docId = "";
      let reusedList = false;
      let reusedDoc = false;

      const slugConflict = findContentSlugConflict(db, pkg.slug || "", pkg.topic_id);
      if (slugConflict) {
        warnings.push(
          `พบ slug "${slugConflict.list.slug}" อยู่ใน list "${slugConflict.list.title}" แต่ topic_id ไม่ตรงกัน (${slugConflict.topicIds.join(", ") || "ไม่พบ topic_id"})`
        );
      }

      const tx = db.transaction(() => {
        const listResolution = resolveContentListForTopic(db, {
          topicId: pkg.topic_id,
          topicTitle: pkg.title,
          createIfMissing: true,
          now,
        });
        resolvedListId = listResolution.list.id;
        reusedList = !listResolution.created;
        warnings.push(...listResolution.warnings);

        if (pkg.mode === "partial") {
          const stepRole = pkg.detectedStepRole || "general";
          const stageTitle = STEP_ROLE_MAP[stepRole] || "Draft";
          
          const existingTask = findExistingTopicStageTask(db, pkg.topic_id, stageTitle);
          
          const markerStart = `<!-- ARTICLE_STUDIO_PARTIAL:${stepRole}:${pkg.topic_id}:start -->`;
          const markerEnd = `<!-- ARTICLE_STUDIO_PARTIAL:${stepRole}:${pkg.topic_id}:end -->`;
          const markedBlock = `${markerStart}\n${pkg.article_markdown}\n${markerEnd}`;
          
          if (existingTask) {
             taskIds.push(existingTask.id);
             let newNotes = existingTask.notes || "";
             if (newNotes.includes(markerStart) && newNotes.includes(markerEnd)) {
                 const regex = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`);
                 newNotes = newNotes.replace(regex, markedBlock);
             } else {
                 newNotes = newNotes ? `${newNotes}\n\n${markedBlock}` : markedBlock;
             }
             
             db.prepare(`
                UPDATE tasks
                SET list_id = @list_id,
                    notes = @notes,
                    updated_at = @updated_at
                WHERE id = @id
              `).run({
                id: existingTask.id,
                list_id: resolvedListId,
                notes: newNotes,
                updated_at: now,
              });
          } else {
             const taskId = nanoid();
             taskIds.push(taskId);
             const notes = `---
topic_id: ${pkg.topic_id}
topic_title: ${pkg.title}
template_key: article
stage: ${stageTitle}
status_label: ${pkg.status || "Needs Review"}
---\n\n${markedBlock}`;
             
             db.prepare(`
                INSERT INTO tasks (
                  id, title, workspace, list_id, status, notes, doc_id,
                  sort_order, review_status, created_at, updated_at
                ) VALUES (
                  @id, @title, 'content', @list_id, 'review', @notes, NULL,
                  @sort_order, 'in_review', @created_at, @updated_at
                )
              `).run({
                id: taskId,
                title: `[${pkg.topic_id}] ${stageTitle} — ${pkg.title}`,
                list_id: resolvedListId,
                notes,
                sort_order: 1,
                created_at: now,
                updated_at: now,
              });
          }
        } else {
            // Full Package mode: Create/update all 5 tasks and shared doc
            const docTitle = `[${pkg.topic_id}] Article Hub — ${pkg.title}`;
            const docMarkdown = formatArticlePackageMarkdown(pkg);

            const stages = [
              {
                title: "Research Direction",
                checklist: [
                  "Confirm learning intent and target reader",
                  "Review prerequisite and related links",
                  "Check source direction before drafting",
                ],
              },
              {
                title: "Draft",
                checklist: [
                  "Review article body for clarity and Thai-first flow",
                  "Check claims and examples",
                  "Prepare revision notes",
                ],
              },
              {
                title: "SEO & Schema",
                checklist: [
                  "Review slug, meta title, and meta description",
                  "Validate internal links",
                  "Review FAQ and Article schema",
                ],
              },
              {
                title: "Visual Package",
                checklist: [
                  "Prepare cover or hero image direction",
                  "Prepare supporting visual assets",
                  "Match visuals with article promise",
                ],
              },
              {
                title: "Review / Publish",
                checklist: [
                  "Final editorial review",
                  "Publish article",
                  "Post group and page distribution copy",
                ],
              },
            ];

            const existingDoc = findExistingTopicDoc(db, pkg.topic_id);
            if (existingDoc) {
              docId = existingDoc.id;
              reusedDoc = true;
            } else {
              docId = nanoid();
    
              db.prepare(`
                INSERT INTO docs (id, title, content_md, workspace, created_at, updated_at)
                VALUES (@id, @title, @content_md, 'content', @created_at, @updated_at)
              `).run({
                id: docId,
                title: docTitle,
                content_md: docMarkdown,
                created_at: now,
                updated_at: now,
              });
            }

            stages.forEach((stage, index) => {
              const existingTask = findExistingTopicStageTask(db, pkg.topic_id, stage.title);
              if (existingTask) {
                taskIds.push(existingTask.id);
                if (existingTask.list_id !== resolvedListId) {
                  db.prepare(`
                    UPDATE tasks
                    SET list_id = @list_id,
                        doc_id = COALESCE(doc_id, @doc_id),
                        updated_at = @updated_at
                    WHERE id = @id
                  `).run({
                    id: existingTask.id,
                    list_id: resolvedListId,
                    doc_id: docId,
                    updated_at: now,
                  });
                }
                return;
              }

              const taskId = nanoid();
              taskIds.push(taskId);

              db.prepare(`
                INSERT INTO tasks (
                  id, title, workspace, list_id, status, notes, doc_id,
                  sort_order, review_status, created_at, updated_at
                ) VALUES (
                  @id, @title, 'content', @list_id, 'review', @notes, @doc_id,
                  @sort_order, 'in_review', @created_at, @updated_at
                )
              `).run({
                id: taskId,
                title: `[${pkg.topic_id}] ${stage.title} — ${pkg.title}`,
                list_id: resolvedListId,
                notes: buildArticleTaskNotes({ pkg, stage: stage.title, docId, checklist: stage.checklist }),
                doc_id: docId,
                sort_order: index + 1,
                created_at: now,
                updated_at: now,
              });
            });
        }
      });

      tx();

      return NextResponse.json({
        ok: true,
        mode: "article_studio",
        topicId: pkg.topic_id,
        topicTitle: pkg.title,
        listId: resolvedListId,
        noteId: docId,
        taskIds,
        reusedList,
        reusedDoc,
        warnings,
      });
    }

    if (!topicId || !topicTitle) {
      return NextResponse.json({ error: "Missing topicId or topicTitle" }, { status: 400 });
    }

    // 1. Get the template payload (Reuse RC14/RC17 logic)
    const builder = AGENT_TEMPLATES["Content Hybrid Package"];
    if (!builder) throw new Error("Template 'Content Hybrid Package' not found");
    
    const payload = builder({ topicId, topicTitle, templateKey, publishDate });
    const db = getDb();
    const now = new Date().toISOString();

    const results: Array<{ type: "doc" | "task"; id: string; title: string; reused?: boolean }> = [];
    const refMap = new Map<string, string>(); // saveAs -> id
    const topicIdNormalized = normalizeContentTopicId(topicId);
    const warnings: string[] = [];
    let resolvedListId = "";
    let reusedList = false;

    // 2. Execute actions in a transaction
    const executeTx = db.transaction(() => {
      const listResolution = resolveContentListForTopic(db, {
        topicId: topicIdNormalized,
        topicTitle,
        preferredListId: typeof listId === "string" ? listId : null,
        createIfMissing: true,
        now,
      });
      resolvedListId = listResolution.list.id;
      reusedList = !listResolution.created;
      warnings.push(...listResolution.warnings);

      for (const action of payload.actions) {
        if (action.type === "doc.create") {
          const d = action.data;
          const existingDoc = findExistingTopicDoc(db, topicIdNormalized);
          const id = existingDoc?.id ?? nanoid();
          
          if (!existingDoc) {
            db.prepare(`
              INSERT INTO docs (id, title, content_md, workspace, created_at, updated_at)
              VALUES (@id, @title, @content_md, 'content', @created_at, @updated_at)
            `).run({
              id,
              title: d.title,
              content_md: d.content_md ?? "",
              created_at: now,
              updated_at: now,
            });
          }

          if (action.saveAs) refMap.set(action.saveAs, id);
          results.push({ type: "doc", id, title: existingDoc?.title ?? d.title, reused: !!existingDoc });
        }

        if (action.type === "task.create") {
          const t = action.data;
          const stage = readStageFromNotes(t.notes);

          // Resolve doc reference like the agent/execute route
          const docIdResolved = t.doc_id_ref
            ? (refMap.get(t.doc_id_ref) ?? null)
            : (t.doc_id ? (refMap.get(t.doc_id) ?? t.doc_id) : null);

          const existingTask = stage ? findExistingTopicStageTask(db, topicIdNormalized, stage) : null;
          if (existingTask) {
            db.prepare(`
              UPDATE tasks
              SET list_id = @list_id,
                  doc_id = COALESCE(doc_id, @doc_id),
                  updated_at = @updated_at
              WHERE id = @id
            `).run({
              id: existingTask.id,
              list_id: resolvedListId,
              doc_id: docIdResolved,
              updated_at: now,
            });
            results.push({ type: "task", id: existingTask.id, title: existingTask.title, reused: true });
            continue;
          }

          const id = nanoid();

          db.prepare(`
            INSERT INTO tasks (
              id, title, workspace, list_id, status, 
              notes, doc_id, scheduled_date, created_at, updated_at
            ) VALUES (
              @id, @title, @workspace, @list_id, @status,
              @notes, @doc_id, @scheduled_date, @created_at, @updated_at
            )
          `).run({
            id: id,
            title: t.title,
            workspace: t.workspace,
            list_id: resolvedListId,
            status: t.status,
            notes: t.notes ?? null,
            doc_id: docIdResolved,
            scheduled_date: t.scheduled_date ?? null,
            created_at: now,
            updated_at: now,
          });

          results.push({ type: "task", id: id, title: t.title });
        }
      }
    });

    executeTx();

    // Find the note among results
    const noteId = results.find(r => r.type === "doc")?.id;
    const taskIds = results.filter(r => r.type === "task").map(r => r.id);

    return NextResponse.json({
      ok: true,
      topicId,
      topicTitle,
      listId: resolvedListId,
      noteId,
      taskIds,
      reusedList,
      warnings,
    });

  } catch (e: unknown) {
    console.error("Content package creation failed:", e);
    return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
  }
}
