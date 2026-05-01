// Preview or apply a safe Content workspace cleanup by topic_id.
// Default: preview only. Use --apply to move tasks into the canonical list.
// This script never deletes tasks, docs, or lists, and it never renames lists.

import Database from "better-sqlite3";
import path from "path";

type TaskRow = {
    id: string;
    title: string;
    notes: string | null;
    list_id: string | null;
};

type ListRow = {
    id: string;
    slug: string;
    title: string;
};

const apply = process.argv.includes("--apply");
const topicArg = process.argv.find((arg) => arg.startsWith("--topic="))?.slice("--topic=".length).toUpperCase();

function getDb() {
    const dbPath = path.resolve(process.cwd(), "data/workos.db");
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    return db;
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function extractTopicId(row: Pick<TaskRow, "title" | "notes">) {
    const notesMatch = row.notes?.match(/(?:^|\n)topic_id:\s*([a-zA-Z0-9_-]+)/);
    if (notesMatch) return notesMatch[1].toUpperCase();

    const titleMatch = row.title.match(/\b(?:GF-CONTENT-\d+|TOPIC-\d+)\b/i);
    return titleMatch?.[0]?.toUpperCase() ?? null;
}

function extractTopicTitle(row: Pick<TaskRow, "title" | "notes">, topicId: string) {
    const notesMatch = row.notes?.match(/(?:^|\n)topic_title:\s*(.+)/);
    if (notesMatch?.[1]?.trim()) return notesMatch[1].trim();

    const titleParts = row.title.split(" — ");
    if (titleParts.length >= 2) return titleParts[titleParts.length - 1].trim();

    return topicId;
}

function chooseCanonicalList(lists: ListRow[], topicId: string, taskRows: TaskRow[]) {
    const canonicalSlug = slugify(topicId);
    const counts = new Map<string, number>();
    taskRows.forEach((task) => {
        if (task.list_id) counts.set(task.list_id, (counts.get(task.list_id) ?? 0) + 1);
    });

    return [...lists].sort((a, b) => {
        const aTitle = a.title.startsWith(`${topicId} —`) ? 0 : 1;
        const bTitle = b.title.startsWith(`${topicId} —`) ? 0 : 1;
        if (aTitle !== bTitle) return aTitle - bTitle;

        const aSlug = a.slug === canonicalSlug ? 0 : 1;
        const bSlug = b.slug === canonicalSlug ? 0 : 1;
        if (aSlug !== bSlug) return aSlug - bSlug;

        return (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
    })[0];
}

function main() {
    const db = getDb();
    const tasks = db.prepare(`
        SELECT id, title, notes, list_id
        FROM tasks
        WHERE workspace = 'content'
    `).all() as TaskRow[];

    const byTopic = new Map<string, TaskRow[]>();
    tasks.forEach((task) => {
        const topicId = extractTopicId(task);
        if (!topicId) return;
        if (topicArg && topicId !== topicArg) return;
        byTopic.set(topicId, [...(byTopic.get(topicId) ?? []), task]);
    });

    const plannedMoves: Array<{ task: TaskRow; from: string | null; to: ListRow; topicId: string }> = [];
    const createdLists: ListRow[] = [];

    const tx = db.transaction(() => {
        for (const [topicId, topicTasks] of byTopic.entries()) {
            const listIds = Array.from(new Set(topicTasks.map((task) => task.list_id).filter(Boolean))) as string[];
            const lists = listIds.length > 0
                ? db.prepare(`SELECT id, slug, title FROM lists WHERE id IN (${listIds.map(() => "?").join(",")})`).all(...listIds) as ListRow[]
                : [];

            let canonical = chooseCanonicalList(lists, topicId, topicTasks);
            if (!canonical) {
                const title = `${topicId} — ${extractTopicTitle(topicTasks[0], topicId)}`;
                canonical = {
                    id: `cleanup-${slugify(topicId)}-${Date.now()}`,
                    slug: slugify(topicId),
                    title,
                };

                if (apply) {
                    db.prepare(`
                        INSERT INTO lists (id, workspace, slug, title, description, created_at, updated_at)
                        VALUES (@id, 'content', @slug, @title, @description, datetime('now'), datetime('now'))
                    `).run({
                        id: canonical.id,
                        slug: canonical.slug,
                        title: canonical.title,
                        description: `Cleanup-created canonical list for ${topicId}`,
                    });
                }

                createdLists.push(canonical);
            }

            topicTasks.forEach((task) => {
                if (task.list_id === canonical.id) return;
                plannedMoves.push({ task, from: task.list_id, to: canonical, topicId });

                if (apply) {
                    db.prepare(`
                        UPDATE tasks
                        SET list_id = @list_id,
                            updated_at = datetime('now')
                        WHERE id = @id
                    `).run({ id: task.id, list_id: canonical.id });
                }
            });
        }
    });

    tx();

    console.log(apply ? "Applied Content topic cleanup." : "Preview only. Re-run with --apply to move tasks.");
    console.log(`Topics scanned: ${byTopic.size}`);
    console.log(`Canonical lists to create: ${createdLists.length}`);
    createdLists.forEach((list) => {
        console.log(`  create list: ${list.title} (${list.id})`);
    });
    console.log(`Task moves: ${plannedMoves.length}`);
    plannedMoves.forEach((move) => {
        console.log(`  ${move.topicId}: ${move.task.id} "${move.task.title}"`);
        console.log(`    from: ${move.from ?? "unassigned"}`);
        console.log(`    to:   ${move.to.id} "${move.to.title}"`);
    });

    db.close();
}

main();
