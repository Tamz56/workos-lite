import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialLaneCheckpoint } from "@/lib/coordination/checkpoint";
import { ensureCoordinationCheckpointSchema } from "@/lib/coordination/checkpointSchema";
import { CoordinationReadAdapter } from "@/lib/coordination/readAdapter";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import {
    COORDINATION_READ_TOOLS,
    COORDINATION_TOOL_NAMES,
    createCoordinationReadToolset,
} from "@/lib/mcp/coordinationReadTools";
import { MCP_REQUIRED_SCOPE } from "@/lib/mcp/config";

const openDatabases: Database.Database[] = [];

function createTestDb(): Database.Database {
    const db = new Database(":memory:");
    openDatabases.push(db);
    db.pragma("foreign_keys = ON");
    db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
    ensureCoordinationSchema(db, () => undefined);
    ensureCoordinationCheckpointSchema(db, () => undefined);
    db.exec(`
        INSERT INTO projects (id, slug) VALUES ('project-1', 'allowed-project');
        INSERT INTO coordination_lanes (id, project_id, lane_key, name)
        VALUES ('lane-a', 'project-1', 'main', 'Main');
    `);
    createInitialLaneCheckpoint(db, {
        id: "cp-1",
        laneId: "lane-a",
        continuity: {
            blocker: null,
            cross_lane_pending: [],
            do_not_reopen: ["P2-G6B"],
            next_exact_action: "continue",
        },
        openItems: [],
        provenance: "test",
    });
    return db;
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("Coordination MCP read tools", () => {
    it("defines exactly four read-only, non-destructive OAuth tools and no write operation", () => {
        expect(COORDINATION_READ_TOOLS.map((tool) => tool.name)).toEqual(COORDINATION_TOOL_NAMES);
        for (const tool of COORDINATION_READ_TOOLS) {
            expect(tool.inputSchema.type).toBe("object");
            expect(tool.outputSchema?.type).toBe("object");
            expect(tool.annotations).toMatchObject({
                readOnlyHint: true,
                destructiveHint: false,
                openWorldHint: false,
            });
            expect(tool.securitySchemes).toEqual([{ type: "oauth2", scopes: [MCP_REQUIRED_SCOPE] }]);
            expect(tool._meta?.securitySchemes).toEqual(tool.securitySchemes);
            expect(tool.name).not.toMatch(/create|write|mutate|approve/i);
        }
    });

    it("enforces project allowlist before adapter execution", () => {
        const adapter = new CoordinationReadAdapter(createTestDb());
        const current = vi.spyOn(adapter, "current");
        const tools = createCoordinationReadToolset(adapter, ["allowed-project"]);

        const result = tools.call("coordination_checkpoint_current", {
            projectSlug: "blocked-project",
            laneKey: "main",
        });
        expect(result.isError).toBe(true);
        expect(JSON.parse(result.content[0].type === "text" ? result.content[0].text : "{}")).toEqual({
            error: expect.objectContaining({ code: "PROJECT_NOT_ALLOWED" }),
        });
        expect(current).not.toHaveBeenCalled();
    });

    it("validates lookup selector as exactly one discriminated mode", () => {
        const tools = createCoordinationReadToolset(
            new CoordinationReadAdapter(createTestDb()),
            ["allowed-project"],
        );
        const result = tools.call("coordination_checkpoint_lookup", {
            projectSlug: "allowed-project",
            laneKey: "main",
            selector: { by: "seq", seq: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toEqual({
            error: expect.objectContaining({ code: "INVALID_ARGUMENT" }),
        });
    });

    it("preserves historical-only authority for LOOKUP and HISTORY", () => {
        const tools = createCoordinationReadToolset(
            new CoordinationReadAdapter(createTestDb()),
            ["allowed-project"],
        );
        for (const [name, args] of [
            ["coordination_checkpoint_lookup", {
                projectSlug: "allowed-project",
                laneKey: "main",
                selector: { by: "seq", seq: 1 },
            }],
            ["coordination_checkpoint_history", {
                projectSlug: "allowed-project",
                laneKey: "main",
            }],
        ] as const) {
            const result = tools.call(name, args);
            expect(result.isError).not.toBe(true);
            expect(result.structuredContent).toMatchObject({ authorityClass: "HISTORICAL_ONLY" });
            expect(JSON.parse(result.content[0].type === "text" ? result.content[0].text : "{}")).toEqual(
                result.structuredContent,
            );
        }
    });

    it("preserves CURRENT and validated-current-only RESUME authority classes", () => {
        const tools = createCoordinationReadToolset(
            new CoordinationReadAdapter(createTestDb()),
            ["allowed-project"],
        );
        expect(tools.call("coordination_checkpoint_current", {
            projectSlug: "allowed-project",
            laneKey: "main",
        }).structuredContent).toMatchObject({ status: "CURRENT", authorityClass: "CURRENT" });
        expect(tools.call("coordination_checkpoint_resume", {
            projectSlug: "allowed-project",
            laneKey: "main",
        }).structuredContent).toMatchObject({
            status: "RESUMED",
            authorityClass: "AUTHORITATIVE_RESUME",
        });
    });

    it("returns stable UNSUPPORTED_OPERATION for unknown Coordination tool names", () => {
        const tools = createCoordinationReadToolset(
            new CoordinationReadAdapter(createTestDb()),
            ["allowed-project"],
        );
        expect(tools.handles("coordination_checkpoint_write")).toBe(true);
        const result = tools.call("coordination_checkpoint_write", {
            projectSlug: "allowed-project",
            laneKey: "main",
        });
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toEqual({
            error: expect.objectContaining({ code: "UNSUPPORTED_OPERATION" }),
        });
    });
});
