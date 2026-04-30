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
  slugify,
  validateArticleStudioPackage,
} from "@/lib/content/articleStudio";

function uniqueListSlug(db: ReturnType<typeof getDb>, base: string) {
  const cleanBase = slugify(base).replace(/[^a-z0-9-]/g, "") || `article-${nanoid(6).toLowerCase()}`;
  let candidate = cleanBase;
  let idx = 2;

  while (db.prepare("SELECT id FROM lists WHERE workspace = 'content' AND slug = ?").get(candidate)) {
    candidate = `${cleanBase}-${idx}`;
    idx += 1;
  }

  return candidate;
}

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

function findDuplicateArticlePackage(db: ReturnType<typeof getDb>, pkg: ArticleStudioPackage) {
  const topicPattern = `%topic_id: ${pkg.topic_id}%`;
  const titlePattern = `%[${pkg.topic_id}]%`;
  const listSlug = slugify(pkg.slug || pkg.topic_id).replace(/[^a-z0-9-]/g, "");
  const matches: { type: "task" | "doc" | "list"; id: string; title: string }[] = [];

  const existingTasks = db.prepare(`
    SELECT id, title
    FROM tasks
    WHERE workspace = 'content'
      AND (notes LIKE @topicPattern OR title LIKE @titlePattern)
    LIMIT 5
  `).all({ topicPattern, titlePattern }) as { id: string; title: string }[];

  const existingDocs = db.prepare(`
    SELECT id, title
    FROM docs
    WHERE (workspace = 'content' OR workspace IS NULL)
      AND title LIKE @titlePattern
    LIMIT 5
  `).all({ titlePattern }) as { id: string; title: string }[];

  const existingLists = listSlug
    ? db.prepare(`
        SELECT id, title
        FROM lists
        WHERE workspace = 'content'
          AND (slug = @listSlug OR title LIKE @titlePattern)
        LIMIT 5
      `).all({ listSlug, titlePattern }) as { id: string; title: string }[]
    : [];

  existingTasks.forEach((row) => matches.push({ type: "task", id: row.id, title: row.title }));
  existingDocs.forEach((row) => matches.push({ type: "doc", id: row.id, title: row.title }));
  existingLists.forEach((row) => matches.push({ type: "list", id: row.id, title: row.title }));

  return matches;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topicId, topicTitle, templateKey, publishDate } = body;

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
      const duplicates = findDuplicateArticlePackage(db, pkg);
      if (duplicates.length > 0) {
        return NextResponse.json(
          {
            error: `พบ Article Package ที่อาจซ้ำกับ ${pkg.topic_id}`,
            code: "DUPLICATE_ARTICLE_PACKAGE",
            duplicates,
          },
          { status: 409 }
        );
      }

      const now = new Date().toISOString();
      const listId = nanoid();
      const docId = nanoid();
      const taskIds: string[] = [];
      const listSlug = uniqueListSlug(db, pkg.slug || pkg.topic_id);
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

      const tx = db.transaction(() => {
        db.prepare(`
          INSERT INTO lists (id, workspace, slug, title, description, created_at, updated_at)
          VALUES (@id, 'content', @slug, @title, @description, @created_at, @updated_at)
        `).run({
          id: listId,
          slug: listSlug,
          title: `${pkg.topic_id} — ${pkg.title}`,
          description: `Article Studio package for ${pkg.title}`,
          created_at: now,
          updated_at: now,
        });

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

        stages.forEach((stage, index) => {
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
            list_id: listId,
            notes: buildArticleTaskNotes({ pkg, stage: stage.title, docId, checklist: stage.checklist }),
            doc_id: docId,
            sort_order: index + 1,
            created_at: now,
            updated_at: now,
          });
        });
      });

      tx();

      return NextResponse.json({
        ok: true,
        mode: "article_studio",
        topicId: pkg.topic_id,
        topicTitle: pkg.title,
        listId,
        noteId: docId,
        taskIds,
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

    const results: any[] = [];
    const refMap = new Map<string, string>(); // saveAs -> id

    // 2. Execute actions in a transaction
    const executeTx = db.transaction(() => {
      for (const action of payload.actions) {
        if (action.type === "doc.create") {
          const id = nanoid();
          const d = action.data;
          
          db.prepare(`
            INSERT INTO docs (id, title, content_md, created_at, updated_at)
            VALUES (@id, @title, @content_md, @created_at, @updated_at)
          `).run({
            id,
            title: d.title,
            content_md: d.content_md ?? "",
            created_at: now,
            updated_at: now,
          });

          if (action.saveAs) refMap.set(action.saveAs, id);
          results.push({ type: "doc", id, title: d.title });
        }

        if (action.type === "task.create") {
          const id = nanoid();
          const t = action.data;

          // Resolve doc reference like the agent/execute route
          const docIdResolved = t.doc_id_ref
            ? (refMap.get(t.doc_id_ref) ?? null)
            : (t.doc_id ? (refMap.get(t.doc_id) ?? t.doc_id) : null);

          db.prepare(`
            INSERT INTO tasks (
              id, title, workspace, status, 
              notes, doc_id, scheduled_date, created_at, updated_at
            ) VALUES (
              @id, @title, @workspace, @status,
              @notes, @doc_id, @scheduled_date, @created_at, @updated_at
            )
          `).run({
            id: id,
            title: t.title,
            workspace: t.workspace,
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
      noteId,
      taskIds
    });

  } catch (e: unknown) {
    console.error("Content package creation failed:", e);
    return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
  }
}
