import { db } from "@/db/db";
import { DocListRow, DocRow } from "@/lib/types/docs";
import { stripMarkdown } from "@/lib/docsUtils";

/**
 * Fetch docs for list view (includes summary snippet)
 */
export async function getAllDocs(q: string = "", limit: number = 200): Promise<DocListRow[]> {
  const sanitizedQ = q.trim();
  const clampedLimit = Math.min(Math.max(limit, 1), 500);

  const where: string[] = [];
  const bind: Record<string, unknown> = { limit: clampedLimit };

  if (sanitizedQ.length > 0) {
    where.push("(title LIKE @q OR id LIKE @q)");
    bind.q = `%${sanitizedQ}%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // Secondary sort: updated_at, created_at, id
  // Also fetch SUBSTR of content_md for summary
  const rows = db.prepare(`
    SELECT id, title, created_at, updated_at, SUBSTR(content_md, 1, 250) as snippet
    FROM docs
    ${whereSql}
    ORDER BY updated_at DESC, created_at DESC, id DESC
    LIMIT @limit
  `).all(bind) as { id: string; title: string; created_at: string; updated_at: string; snippet: string | null }[];

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    created_at: r.created_at,
    updated_at: r.updated_at,
    summary: stripMarkdown(r.snippet || "")
  }));
}

/**
 * Fetch single doc (includes content_md)
 */
export async function getDocById(id: string): Promise<DocRow | null> {
  const row = db.prepare(`
    SELECT id, title, content_md, created_at, updated_at 
    FROM docs 
    WHERE id = ?
  `).get(id);

  return (row as DocRow) || null;
}
