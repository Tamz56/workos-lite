import { describe, expect, it } from "vitest";
import { CreateProjectItemSchema } from "@/lib/projects/backlogCreateSchema";

describe("Canonical backlog create schema (P1B.0 extraction contract)", () => {
    it("accepts a minimal payload and defaults status to planned", () => {
        const parsed = CreateProjectItemSchema.parse({ title: "Task" });
        expect(parsed.title).toBe("Task");
        expect(parsed.status).toBe("planned");
    });

    it("accepts explicit inbox/planned/done statuses and rejects invalid ones", () => {
        expect(CreateProjectItemSchema.parse({ title: "T", status: "inbox" }).status).toBe("inbox");
        expect(CreateProjectItemSchema.parse({ title: "T", status: "planned" }).status).toBe("planned");
        expect(CreateProjectItemSchema.parse({ title: "T", status: "done" }).status).toBe("done");
        expect(CreateProjectItemSchema.safeParse({ title: "T", status: "in_progress" }).success).toBe(false);
    });

    it("accepts integer and null priority, rejects non-integers", () => {
        expect(CreateProjectItemSchema.parse({ title: "T", priority: 3 }).priority).toBe(3);
        expect(CreateProjectItemSchema.parse({ title: "T", priority: null }).priority).toBeNull();
        expect(CreateProjectItemSchema.safeParse({ title: "T", priority: 1.5 }).success).toBe(false);
    });

    it("accepts valid schedule buckets and rejects invalid ones", () => {
        expect(CreateProjectItemSchema.parse({ title: "T", schedule_bucket: "morning" }).schedule_bucket).toBe("morning");
        expect(CreateProjectItemSchema.parse({ title: "T", schedule_bucket: null }).schedule_bucket).toBeNull();
        expect(CreateProjectItemSchema.safeParse({ title: "T", schedule_bucket: "lunch" }).success).toBe(false);
    });

    it("transforms is_milestone truthy/falsy values to 1/0 (boolean and number)", () => {
        expect(CreateProjectItemSchema.parse({ title: "T", is_milestone: true }).is_milestone).toBe(1);
        expect(CreateProjectItemSchema.parse({ title: "T", is_milestone: false }).is_milestone).toBe(0);
        expect(CreateProjectItemSchema.parse({ title: "T", is_milestone: 1 }).is_milestone).toBe(1);
        expect(CreateProjectItemSchema.parse({ title: "T", is_milestone: 0 }).is_milestone).toBe(0);
    });

    it("preserves nullable optional text/date fields", () => {
        const parsed = CreateProjectItemSchema.parse({
            title: "T",
            start_date: null,
            end_date: null,
            workstream: null,
            dod_text: null,
            notes: null,
        });
        expect(parsed.start_date).toBeNull();
        expect(parsed.end_date).toBeNull();
        expect(parsed.workstream).toBeNull();
        expect(parsed.dod_text).toBeNull();
        expect(parsed.notes).toBeNull();
    });

    it("rejects empty titles", () => {
        expect(CreateProjectItemSchema.safeParse({ title: "" }).success).toBe(false);
        expect(CreateProjectItemSchema.safeParse({ title: "   " }).success).toBe(true); // no trimming introduced
    });

    it("preserves ordinary z.object unknown-key behavior (no strict/passthrough)", () => {
        const parsed = CreateProjectItemSchema.parse({
            title: "Task",
            unexpected_field: "x",
        });
        expect(parsed).toEqual({ title: "Task", status: "planned" });
        expect("unexpected_field" in parsed).toBe(false);
    });
});
