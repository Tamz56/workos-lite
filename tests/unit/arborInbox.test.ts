import { describe, it, expect } from "vitest";
import { 
    validatePayload, 
    buildPreview, 
    generateSlug, 
    SUPPORTED_SCHEMA_VERSION 
} from "@/lib/arborInboxSchema";

describe("Arbor Inbox - generateSlug", () => {
    it("should format ASCII project titles into lowercase alphanumeric slugs with hyphens", () => {
        expect(generateSlug("Portfolio Command Center")).toBe("portfolio-command-center");
        expect(generateSlug("GF-ANALYTICS-001")).toBe("gf-analytics-001");
        expect(generateSlug("  Project Name  ")).toBe("project-name");
    });

    it("should fallback to project-xxxx when titles are non-ASCII or Thai characters only", () => {
        const fallback = generateSlug("ศูนย์บัญชาการ");
        expect(fallback).toMatch(/^project-[a-z0-9]{6}$/);
    });
});

describe("Arbor Inbox - validatePayload", () => {
    const existingProjects = [
        { name: "Portfolio Command Center", slug: "portfolio-command-center" }
    ];

    it("should pass validation with a correct payload", () => {
        const payload = {
            schemaVersion: SUPPORTED_SCHEMA_VERSION,
            source: "Arbor",
            importBatchTitle: "Batch 1",
            items: [
                {
                    type: "project",
                    title: "New Project Alpha",
                    status: "planned"
                },
                {
                    type: "note",
                    targetProject: "New Project Alpha",
                    title: "Sprint Notes",
                    content: "Notes content..."
                },
                {
                    type: "task",
                    targetProject: "Portfolio Command Center",
                    title: "Setup CI",
                    status: "inbox"
                }
            ]
        };

        const result = validatePayload(payload, existingProjects);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it("should fail validation if schemaVersion is incorrect", () => {
        const payload = {
            schemaVersion: "invalid-version",
            source: "Arbor",
            importBatchTitle: "Batch 1",
            items: [
                {
                    type: "project",
                    title: "Proj A",
                    status: "planned"
                }
            ]
        };

        const result = validatePayload(payload, existingProjects);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("schemaVersion must be exactly");
    });

    it("should fail validation if items is empty", () => {
        const payload = {
            schemaVersion: SUPPORTED_SCHEMA_VERSION,
            source: "Arbor",
            importBatchTitle: "Batch 1",
            items: []
        };

        const result = validatePayload(payload, existingProjects);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('"items" array must not be empty');
    });

    it("should flag warnings for duplicate project names", () => {
        const payload = {
            schemaVersion: SUPPORTED_SCHEMA_VERSION,
            source: "Arbor",
            importBatchTitle: "Batch 1",
            items: [
                {
                    type: "project",
                    title: "Portfolio Command Center",
                    status: "planned"
                }
            ]
        };

        const result = validatePayload(payload, existingProjects);
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toContain('already exists');
    });

    it("should fail validation if targetProject does not exist and is not being created in this batch", () => {
        const payload = {
            schemaVersion: SUPPORTED_SCHEMA_VERSION,
            source: "Arbor",
            importBatchTitle: "Batch 1",
            items: [
                {
                    type: "task",
                    targetProject: "Unknown Project X",
                    title: "Test Task",
                    status: "planned"
                }
            ]
        };

        const result = validatePayload(payload, existingProjects);
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("does not exist in the database and is not being created in this batch");
    });
});

describe("Arbor Inbox - buildPreview", () => {
    const existingProjects = [
        { name: "Portfolio Command Center", slug: "portfolio-command-center" }
    ];

    it("should build correct preview objects and format task titles with project prefix", () => {
        const payload = {
            schemaVersion: SUPPORTED_SCHEMA_VERSION,
            source: "Arbor",
            importBatchTitle: "Batch 1",
            items: [
                {
                    type: "project",
                    title: "Portfolio Command Center",
                    status: "planned"
                },
                {
                    type: "project",
                    title: "Project Alpha",
                    status: "inbox"
                },
                {
                    type: "task",
                    targetProject: "Portfolio Command Center",
                    title: "WORKOS-QA-001 — Add Testing Foundation",
                    status: "planned",
                    workspace: "other"
                },
                {
                    type: "task",
                    targetProject: "Project Alpha",
                    title: "Do something else",
                    status: "inbox"
                }
            ]
        };

        const preview = buildPreview(payload as any, existingProjects);

        expect(preview.projects).toHaveLength(2);
        expect(preview.projects[0].isDuplicate).toBe(true);
        expect(preview.projects[1].isDuplicate).toBe(false);

        expect(preview.tasks).toHaveLength(2);
        expect(preview.tasks[0].title).toBe("project:portfolio-command-center WORKOS-QA-001 — Add Testing Foundation");
        expect(preview.tasks[0].originalTitle).toBe("WORKOS-QA-001 — Add Testing Foundation");

        expect(preview.tasks[1].title).toBe("project:project-alpha Do something else");
        expect(preview.tasks[1].originalTitle).toBe("Do something else");
    });
});
