import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    seedStorySetsWithoutDuplicates,
    type ArborStorySetSeed,
} from "@/db/storySetSeed";

const initialSeed: ArborStorySetSeed = {
    id: "story-set-1",
    title: "ชีวิตของพืชหนึ่งต้น",
    description: "Initial seed description",
};

type StorySetRow = {
    id: string;
    slug: string | null;
    title: string;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
};

let db: Database.Database;

function rows(): StorySetRow[] {
    return db.prepare("SELECT * FROM gf_story_sets ORDER BY id").all() as StorySetRow[];
}

function schema(): unknown[] {
    return db.prepare(
        "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
    ).all();
}

function totalChanges(): number {
    return (db.prepare("SELECT total_changes() AS count").get() as { count: number }).count;
}

beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`
        CREATE TABLE gf_story_sets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            slug TEXT
        );
        CREATE TABLE unrelated_business (
            id TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        INSERT INTO unrelated_business (id, value) VALUES ('unrelated-1', 'preserve me');
    `);
});

afterEach(() => {
    db.close();
});

describe("gf_story_sets startup seed idempotency", () => {
    it("inserts an absent seed row", () => {
        seedStorySetsWithoutDuplicates(db, [initialSeed]);

        expect(rows()).toMatchObject([{
            id: initialSeed.id,
            slug: null,
            title: initialSeed.title,
            description: initialSeed.description,
            status: "active",
        }]);
    });

    it("does not update an active row when the identical seed is applied again", () => {
        seedStorySetsWithoutDuplicates(db, [initialSeed]);
        db.prepare(`
            UPDATE gf_story_sets
            SET created_at = '2000-01-01 00:00:00',
                updated_at = '2001-01-01 00:00:00'
            WHERE id = ?
        `).run(initialSeed.id);
        const before = rows();
        const changesBefore = totalChanges();

        seedStorySetsWithoutDuplicates(db, [initialSeed]);

        expect(rows()).toEqual(before);
        expect(totalChanges()).toBe(changesBefore);
    });

    it.each(["draft", "archived"])(
        "does not update an identical %s row or change its timestamps",
        (status) => {
            const seed = { ...initialSeed, slug: "plant-life" };
            seedStorySetsWithoutDuplicates(db, [seed]);
            db.prepare(`
                UPDATE gf_story_sets
                SET status = ?,
                    created_at = '2000-01-01 00:00:00',
                    updated_at = '2001-01-01 00:00:00'
                WHERE id = ?
            `).run(status, initialSeed.id);
            const before = rows();
            const changesBefore = totalChanges();

            seedStorySetsWithoutDuplicates(db, [seed]);

            expect(rows()).toEqual(before);
            expect(totalChanges()).toBe(changesBefore);
        },
    );

    it("updates only intended seed-managed fields after a material seed change", () => {
        seedStorySetsWithoutDuplicates(db, [initialSeed]);
        db.prepare(`
            UPDATE gf_story_sets
            SET description = 'User-authored description',
                status = 'draft',
                created_at = '2000-01-01 00:00:00',
                updated_at = '2001-01-01 00:00:00'
            WHERE id = ?
        `).run(initialSeed.id);

        seedStorySetsWithoutDuplicates(db, [{
            ...initialSeed,
            slug: "plant-life",
        }]);

        const [row] = rows();
        expect(row).toMatchObject({
            id: initialSeed.id,
            slug: "plant-life",
            title: initialSeed.title,
            description: "User-authored description",
            status: "draft",
            created_at: "2000-01-01 00:00:00",
        });
        expect(row.updated_at).not.toBe("2001-01-01 00:00:00");
    });

    it("fills an empty description without changing archived status", () => {
        seedStorySetsWithoutDuplicates(db, [initialSeed]);
        db.prepare(`
            UPDATE gf_story_sets
            SET description = '   ',
                status = 'archived',
                created_at = '2000-01-01 00:00:00',
                updated_at = '2001-01-01 00:00:00'
            WHERE id = ?
        `).run(initialSeed.id);

        seedStorySetsWithoutDuplicates(db, [initialSeed]);

        const [row] = rows();
        expect(row).toMatchObject({
            description: initialSeed.description,
            status: "archived",
            created_at: "2000-01-01 00:00:00",
        });
        expect(row.updated_at).not.toBe("2001-01-01 00:00:00");
    });

    it("does not mutate unrelated business data or schema", () => {
        const schemaBefore = schema();
        const unrelatedBefore = db.prepare("SELECT * FROM unrelated_business").all();

        seedStorySetsWithoutDuplicates(db, [initialSeed]);
        seedStorySetsWithoutDuplicates(db, [initialSeed]);

        expect(db.prepare("SELECT * FROM unrelated_business").all()).toEqual(unrelatedBefore);
        expect(schema()).toEqual(schemaBefore);
    });
});
