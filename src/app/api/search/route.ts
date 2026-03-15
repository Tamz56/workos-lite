export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { toErrorMessage } from "@/lib/error";

/**
 * Unified Search Result Types
 */
export type SearchResultType = "task" | "project" | "doc" | "attachment";

export interface SearchResult {
    id: string;
    type: SearchResultType;
    title: string;
    subtitle: string;
    status?: string;
    workspace?: string;
    isArchived: boolean;
    updated_at: string;
    url: string;
    score: number; // For ranking
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get("q") ?? "").trim().toLowerCase();
        const db = getDb();

        // 1. Fetch from each table
        // We'll normalize the results into a common format

        // Tasks
        const tasksSql = `
            SELECT id, title, status, workspace, updated_at, 
                   CASE WHEN status = 'done' THEN 1 ELSE 0 END as isArchived
            FROM tasks
        `;
        const tasks = db.prepare(tasksSql).all() as any[];

        // Projects
        const projectsSql = `
            SELECT id, slug, name, status, updated_at,
                   CASE WHEN status = 'done' THEN 1 ELSE 0 END as isArchived
            FROM projects
        `;
        const projects = db.prepare(projectsSql).all() as any[];

        // Docs
        const docsSql = `
            SELECT id, title, updated_at, workspace, 0 as isArchived
            FROM docs
        `;
        const docs = db.prepare(docsSql).all() as any[];

        // Attachments (metadata only)
        const attachmentsSql = `
            SELECT a.id, a.file_name, a.created_at as updated_at, 
                   COALESCE(t.workspace, d.workspace) as workspace,
                   CASE WHEN t.status = 'done' THEN 1 ELSE 0 END as isArchived,
                   COALESCE(t.id, d.id) as parent_id,
                   CASE WHEN t.id IS NOT NULL THEN 'task' ELSE 'doc' END as parent_type
            FROM attachments a
            LEFT JOIN tasks t ON a.task_id = t.id
            LEFT JOIN docs d ON a.doc_id = d.id
        `;
        const attachments = db.prepare(attachmentsSql).all() as any[];

        // 2. Map & Filter & Score
        let results: SearchResult[] = [];

        // Helper to calculate score
        const calculateScore = (title: string, type: string, isArchived: boolean, query: string) => {
            if (!query) return 0; // Recent view logic handles empty query cases differently
            
            let score = 0;
            const titleLower = title.toLowerCase();

            // 1. Match type
            if (titleLower === query) score += 1000;
            else if (titleLower.startsWith(query)) score += 500;
            else if (titleLower.includes(query)) score += 100;

            // 2. Active vs Archived
            if (!isArchived) score += 50;

            // 3. Entity priority (Task/Doc/Proj > Attachment)
            if (type !== "attachment") score += 20;

            return score;
        };

        const results_tasks = tasks.map(t => ({
            id: t.id,
            type: "task" as const,
            title: t.title,
            subtitle: t.workspace || "Tasks",
            status: t.status,
            workspace: t.workspace,
            isArchived: !!t.isArchived,
            updated_at: t.updated_at,
            url: `/dashboard?taskId=${t.id}`, // Changed to taskId for consistency with UI navigation
            score: calculateScore(t.title, "task", !!t.isArchived, q)
        }));

        const results_projects = projects.map(p => ({
            id: p.id,
            type: "project" as const,
            title: p.name,
            subtitle: "Project",
            status: p.status,
            workspace: "global",
            isArchived: !!p.isArchived,
            updated_at: p.updated_at,
            url: `/projects/${p.slug}`,
            score: calculateScore(p.name, "project", !!p.isArchived, q)
        }));

        const results_docs = docs.map(d => ({
            id: d.id,
            type: "doc" as const,
            title: d.title,
            subtitle: d.workspace || "Notes",
            status: "active",
            workspace: d.workspace,
            isArchived: !!d.isArchived,
            updated_at: d.updated_at,
            url: `/docs/${d.id}`,
            score: calculateScore(d.title, "doc", !!d.isArchived, q)
        }));

        const results_attachments = attachments.map(a => ({
            id: a.id,
            type: "attachment" as const,
            title: a.file_name,
            subtitle: `File • ${a.parent_type}`,
            status: "active",
            workspace: a.workspace,
            isArchived: !!a.isArchived,
            updated_at: a.updated_at,
            url: a.parent_type === "task" ? `/dashboard?task=${a.parent_id}` : `/docs/${a.parent_id}`,
            score: calculateScore(a.file_name, "attachment", !!a.isArchived, q)
        }));

        results = [...results_tasks, ...results_projects, ...results_docs, ...results_attachments];

        // 3. Filter and Rank
        if (q) {
            results = results.filter(r => r.score > 0);
        }

        results.sort((a, b) => {
            // Priority 1: Match Score
            if (b.score !== a.score) return b.score - a.score;
            // Priority 2: Recency
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

        // Limit results
        const limit = q ? 20 : 10; // More results if searching
        return NextResponse.json({ results: results.slice(0, limit) });

    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}
