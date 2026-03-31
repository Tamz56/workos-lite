export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { AGENT_TEMPLATES } from "@/lib/agent/templates";
import { toErrorMessage } from "@/lib/error";

export async function POST(req: NextRequest) {
  try {
    const { topicId, topicTitle, templateKey, publishDate } = await req.json();

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
