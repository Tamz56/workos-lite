import { nanoid } from "nanoid";

import { slugify } from "@/lib/content/articleStudio";
import type { getDb } from "@/db/db";

type Db = ReturnType<typeof getDb>;

type ContentListRow = {
    id: string;
    slug: string;
    title: string;
    task_count?: number;
};

export type ContentListResolution = {
    list: ContentListRow;
    created: boolean;
    warnings: string[];
};

const TOPIC_ID_PATTERN = /\b(?:GF-CONTENT-\d+|TOPIC-\d+)\b/i;

export function normalizeContentTopicId(topicId: string) {
    return topicId.trim().toUpperCase();
}

export function canonicalContentListTitle(topicId: string, topicTitle: string) {
    return `${normalizeContentTopicId(topicId)} — ${topicTitle.trim() || "Untitled Topic"}`;
}

export function canonicalContentListSlug(topicId: string) {
    return slugify(normalizeContentTopicId(topicId)).replace(/[^a-z0-9-]/g, "");
}

export function extractContentTopicId(input: { notes?: string | null; title?: string | null; topic_id?: string | null }) {
    const explicit = input.topic_id?.trim();
    if (explicit) return normalizeContentTopicId(explicit);

    const notesMatch = input.notes?.match(/(?:^|\n)topic_id:\s*([a-zA-Z0-9_-]+)/);
    if (notesMatch) return normalizeContentTopicId(notesMatch[1]);

    const titleMatch = input.title?.match(TOPIC_ID_PATTERN);
    if (titleMatch) return normalizeContentTopicId(titleMatch[0]);

    return null;
}

function inferListTopicIds(db: Db, listId: string) {
    const rows = db.prepare(`
        SELECT title, notes
        FROM tasks
        WHERE workspace = 'content'
          AND list_id = ?
    `).all(listId) as { title: string | null; notes: string | null }[];

    return Array.from(new Set(rows.map((row) => extractContentTopicId(row)).filter(Boolean))) as string[];
}

export function findContentListByTopicId(db: Db, topicId: string) {
    const normalizedTopicId = normalizeContentTopicId(topicId);
    const canonicalSlug = canonicalContentListSlug(normalizedTopicId);
    const titlePrefix = `${normalizedTopicId} —%`;
    const titleBracketPattern = `%[${normalizedTopicId}]%`;
    const titlePattern = `%${normalizedTopicId}%`;
    const topicNotesPattern = `%topic_id: ${normalizedTopicId}%`;

    const rows = db.prepare(`
        SELECT l.id, l.slug, l.title, COUNT(t.id) AS task_count
        FROM lists l
        LEFT JOIN tasks t ON t.list_id = l.id AND t.workspace = 'content'
        WHERE l.workspace = 'content'
          AND (
            l.slug = @canonicalSlug
            OR l.title LIKE @titlePrefix
            OR EXISTS (
              SELECT 1
              FROM tasks tt
              WHERE tt.workspace = 'content'
                AND tt.list_id = l.id
                AND (
                  tt.notes LIKE @topicNotesPattern
                  OR tt.title LIKE @titleBracketPattern
                  OR tt.title LIKE @titlePattern
                )
            )
          )
        GROUP BY l.id
        ORDER BY
          CASE WHEN l.title LIKE @titlePrefix THEN 0 ELSE 1 END,
          CASE WHEN l.slug = @canonicalSlug THEN 0 ELSE 1 END,
          task_count DESC,
          datetime(l.updated_at) ASC,
          l.id ASC
        LIMIT 1
    `).get({
        canonicalSlug,
        titlePrefix,
        titleBracketPattern,
        titlePattern,
        topicNotesPattern,
    }) as ContentListRow | undefined;

    return rows ?? null;
}

export function findContentSlugConflict(db: Db, slugSource: string, topicId: string) {
    const slug = slugify(slugSource).replace(/[^a-z0-9-]/g, "");
    if (!slug) return null;

    const list = db.prepare(`
        SELECT id, slug, title
        FROM lists
        WHERE workspace = 'content'
          AND slug = ?
        LIMIT 1
    `).get(slug) as ContentListRow | undefined;

    if (!list) return null;

    const normalizedTopicId = normalizeContentTopicId(topicId);
    const topicIds = inferListTopicIds(db, list.id);
    const hasSameTopic = topicIds.includes(normalizedTopicId) || list.title.startsWith(`${normalizedTopicId} —`);

    if (hasSameTopic) return null;

    return {
        list,
        topicIds,
    };
}

export function resolveContentListForTopic(db: Db, params: {
    topicId: string;
    topicTitle: string;
    preferredListId?: string | null;
    createIfMissing?: boolean;
    now?: string;
}): ContentListResolution {
    const topicId = normalizeContentTopicId(params.topicId);
    const warnings: string[] = [];

    const existingByTopic = findContentListByTopicId(db, topicId);
    if (existingByTopic) {
        return { list: existingByTopic, created: false, warnings };
    }

    if (params.preferredListId) {
        const preferred = db.prepare(`
            SELECT id, slug, title
            FROM lists
            WHERE workspace = 'content'
              AND id = ?
            LIMIT 1
        `).get(params.preferredListId) as ContentListRow | undefined;

        if (preferred) {
            const topicIds = inferListTopicIds(db, preferred.id);
            const conflictingTopicIds = topicIds.filter((id) => id !== topicId);
            if (conflictingTopicIds.length > 0) {
                warnings.push(`Selected list already has topic_id: ${conflictingTopicIds.join(", ")}`);
            }
            return { list: preferred, created: false, warnings };
        }
    }

    if (params.createIfMissing === false) {
        throw new Error(`ไม่พบ content list สำหรับ topic_id ${topicId}`);
    }

    const now = params.now ?? new Date().toISOString();
    const list = {
        id: nanoid(),
        slug: canonicalContentListSlug(topicId),
        title: canonicalContentListTitle(topicId, params.topicTitle),
    };

    db.prepare(`
        INSERT INTO lists (id, workspace, slug, title, description, created_at, updated_at)
        VALUES (@id, 'content', @slug, @title, @description, @created_at, @updated_at)
    `).run({
        id: list.id,
        slug: list.slug,
        title: list.title,
        description: `Content package for ${params.topicTitle}`,
        created_at: now,
        updated_at: now,
    });

    return {
        list,
        created: true,
        warnings,
    };
}

export function findExistingTopicDoc(db: Db, topicId: string) {
    const normalizedTopicId = normalizeContentTopicId(topicId);
    const titlePattern = `%[${normalizedTopicId}]%`;
    const contentPattern = `%Topic ID: ${normalizedTopicId}%`;

    const row = db.prepare(`
        SELECT id, title
        FROM docs
        WHERE (workspace = 'content' OR workspace IS NULL)
          AND (title LIKE @titlePattern OR content_md LIKE @contentPattern)
        ORDER BY
          CASE WHEN title LIKE @titlePattern THEN 0 ELSE 1 END,
          datetime(updated_at) ASC,
          id ASC
        LIMIT 1
    `).get({ titlePattern, contentPattern }) as { id: string; title: string } | undefined;

    return row ?? null;
}

export function findExistingTopicStageTask(db: Db, topicId: string, stage: string) {
    const normalizedTopicId = normalizeContentTopicId(topicId);
    const topicPattern = `%topic_id: ${normalizedTopicId}%`;
    const stagePattern = `%stage: ${stage}%`;
    const titlePattern = `%[${normalizedTopicId}] ${stage} —%`;

    const row = db.prepare(`
        SELECT id, title, list_id
        FROM tasks
        WHERE workspace = 'content'
          AND (
            (notes LIKE @topicPattern AND notes LIKE @stagePattern)
            OR title LIKE @titlePattern
          )
        ORDER BY datetime(updated_at) ASC, id ASC
        LIMIT 1
    `).get({ topicPattern, stagePattern, titlePattern }) as { id: string; title: string; list_id: string | null } | undefined;

    return row ?? null;
}

export function listTopicGroupsForCleanup(db: Db) {
    const rows = db.prepare(`
        SELECT id, title, notes, list_id
        FROM tasks
        WHERE workspace = 'content'
    `).all() as { id: string; title: string | null; notes: string | null; list_id: string | null }[];

    const groups = new Map<string, { taskIds: string[]; listIds: Set<string> }>();

    rows.forEach((row) => {
        const topicId = extractContentTopicId(row);
        if (!topicId) return;
        const group = groups.get(topicId) ?? { taskIds: [], listIds: new Set<string>() };
        group.taskIds.push(row.id);
        if (row.list_id) group.listIds.add(row.list_id);
        groups.set(topicId, group);
    });

    return Array.from(groups.entries()).map(([topicId, group]) => ({
        topicId,
        taskIds: group.taskIds,
        listIds: Array.from(group.listIds),
    }));
}
