import type Database from "better-sqlite3";

export type ArborStorySetSeed = {
    id: string;
    slug?: string;
    title: string;
    description: string;
};

type ExistingStorySet = {
    id: string;
    slug: string | null;
    title: string;
    description: string | null;
};

function normalizeStorySetName(name: string) {
    return name
        .normalize("NFKC")
        .replace(/\s+/g, "")
        .trim()
        .toLocaleLowerCase("th-TH");
}

export function seedStorySetsWithoutDuplicates(
    db: Database.Database,
    storySets: ArborStorySetSeed[],
) {
    const existingRows = db.prepare(
        "SELECT id, slug, title, description FROM gf_story_sets",
    ).all() as ExistingStorySet[];

    const byId = new Map(existingRows.map((row) => [row.id, row]));
    const bySlug = new Map<string, string>();
    const byNormalizedTitle = new Map<string, string>();

    for (const row of existingRows) {
        if (row.slug) bySlug.set(row.slug, row.id);
        byNormalizedTitle.set(normalizeStorySetName(row.title), row.id);
    }

    const insertStmt = db.prepare(`
        INSERT INTO gf_story_sets (id, slug, title, description, status, created_at, updated_at)
        VALUES (@id, @slug, @title, @description, 'active', datetime('now'), datetime('now'))
    `);

    const updateStmt = db.prepare(`
        UPDATE gf_story_sets
        SET slug = @slug,
            description = @description,
            updated_at = datetime('now')
        WHERE id = @id
    `);

    const tx = db.transaction(() => {
        for (const storySet of storySets) {
            const seedSlug = storySet.slug ?? null;
            const matchId = (seedSlug ? bySlug.get(seedSlug) : undefined)
                ?? byNormalizedTitle.get(normalizeStorySetName(storySet.title));

            if (matchId) {
                const existing = byId.get(matchId);
                if (!existing) continue;

                const desiredSlug = existing.slug === null || existing.slug === ""
                    ? seedSlug
                    : existing.slug;
                const desiredDescription = existing.description === null || existing.description.trim() === ""
                    ? storySet.description
                    : existing.description;

                const materiallyChanged = existing.slug !== desiredSlug
                    || existing.description !== desiredDescription;

                if (materiallyChanged) {
                    updateStmt.run({
                        id: existing.id,
                        slug: desiredSlug,
                        description: desiredDescription,
                    });
                    existing.slug = desiredSlug;
                    existing.description = desiredDescription;
                }
                continue;
            }

            insertStmt.run({ ...storySet, slug: seedSlug });
            const inserted: ExistingStorySet = {
                id: storySet.id,
                slug: seedSlug,
                title: storySet.title,
                description: storySet.description,
            };
            byId.set(inserted.id, inserted);
            if (seedSlug) bySlug.set(seedSlug, inserted.id);
            byNormalizedTitle.set(normalizeStorySetName(inserted.title), inserted.id);
        }
    });

    tx();
}
