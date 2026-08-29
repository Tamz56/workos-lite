import Database from "better-sqlite3";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { handleMcpRequest } from "@/app/mcp/route";
import { createInitialLaneCheckpoint } from "@/lib/coordination/checkpoint";
import { ensureCoordinationCheckpointSchema } from "@/lib/coordination/checkpointSchema";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import { MCP_REQUIRED_SCOPE, MCP_RESOURCE_URL } from "@/lib/mcp/config";
import { encodeManifestId, encodeSourceId } from "@/lib/mcp/resultIds";

const ISSUER = "https://issuer.example.com";
const FINGERPRINT = "d".repeat(64);
let privateKey: CryptoKey;
let getKey: ReturnType<typeof createLocalJWKSet>;
let bearer: string;
let routeDb: Database.Database;

const env: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    MCP_OAUTH_ISSUER: ISSUER,
    MCP_OAUTH_AUDIENCE: MCP_RESOURCE_URL,
    MCP_OAUTH_JWKS_URI: `${ISSUER}/jwks`,
    MCP_OAUTH_SCOPE: MCP_REQUIRED_SCOPE,
    WORKOS_MCP_PROJECT_SLUGS: "allowed-project",
    WORKOS_INTERNAL_ORIGIN: "http://127.0.0.1:3100",
    AGENT_READ_PASSWORD: "route-read-password",
};

function indexPage() {
    return {
        schemaVersion: "ai-read-source-index.v1",
        project: { id: "project-1", slug: "allowed-project", name: "Allowed Project" },
        counts: {
            project_metadata: 0,
            doc_block: 0,
            doc: 1,
            decision: 0,
            project_context: 0,
            loop: 0,
            project_context_snapshot: 0,
        },
        sources: [{
            sourceKind: "doc",
            sourceId: "doc-1",
            title: "Architecture Notes",
            sourceType: "document",
            status: "active",
            hasFullContent: true,
            isDerivedContext: false,
        }],
        pagination: {
            pageSize: 200,
            returnedSources: 1,
            totalSources: 1,
            hasMore: false,
            nextCursor: null,
        },
        corpusFingerprint: FINGERPRINT,
        attachmentReadingSupported: false,
    };
}

const fetchFn = vi.fn(async () => Response.json(indexPage())) as unknown as typeof fetch;

function mcpRequest(
    body: unknown,
    options: {
        raw?: boolean;
        auth?: boolean;
        protocol?: boolean;
        host?: string;
        origin?: string;
    } = {},
): Request {
    const headers = new Headers({
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        host: options.host ?? "workos.greenfineness.com",
    });
    if (options.origin !== undefined) headers.set("origin", options.origin);
    if (options.auth !== false) headers.set("authorization", `Bearer ${bearer}`);
    if (options.protocol !== false) headers.set("mcp-protocol-version", "2025-06-18");
    return new Request(MCP_RESOURCE_URL, {
        method: "POST",
        headers,
        body: options.raw ? String(body) : JSON.stringify(body),
    });
}

async function invoke(
    body: unknown,
    options?: {
        raw?: boolean;
        auth?: boolean;
        protocol?: boolean;
        host?: string;
        origin?: string;
    },
) {
    return handleMcpRequest(mcpRequest(body, options), { env, getKey, fetchFn, db: routeDb });
}

beforeAll(async () => {
    const pair = await generateKeyPair("RS256", { extractable: true });
    privateKey = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey) as JWK;
    jwk.kid = "route-key";
    jwk.alg = "RS256";
    getKey = createLocalJWKSet({ keys: [jwk] });
    const now = Math.floor(Date.now() / 1000);
    bearer = await new SignJWT({ scope: MCP_REQUIRED_SCOPE })
        .setProtectedHeader({ alg: "RS256", kid: "route-key" })
        .setIssuer(ISSUER)
        .setAudience(MCP_RESOURCE_URL)
        .setSubject("route-client")
        .setIssuedAt(now)
        .setExpirationTime(now + 300)
        .sign(privateKey);

    routeDb = new Database(":memory:");
    routeDb.pragma("foreign_keys = ON");
    routeDb.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
    ensureCoordinationSchema(routeDb, () => undefined);
    ensureCoordinationCheckpointSchema(routeDb, () => undefined);
    routeDb.exec(`
        INSERT INTO projects (id, slug) VALUES ('project-1', 'allowed-project');
        INSERT INTO coordination_lanes (id, project_id, lane_key, name)
        VALUES ('lane-a', 'project-1', 'main', 'Main');
    `);
    createInitialLaneCheckpoint(routeDb, {
        id: "cp-1",
        laneId: "lane-a",
        continuity: {
            blocker: null,
            cross_lane_pending: [],
            do_not_reopen: ["P2-G6B"],
            next_exact_action: "continue",
        },
        openItems: [],
        provenance: "route-test",
    });
});

afterAll(() => {
    routeDb.close();
});

describe("READ1B Next.js Streamable HTTP route", () => {
    it("initializes with the expected server identity", async () => {
        const response = await invoke({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                protocolVersion: "2025-06-18",
                capabilities: {},
                clientInfo: { name: "route-test", version: "1.0.0" },
            },
        }, { protocol: false });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.result.serverInfo).toEqual({ name: "workos-project-memory", version: "1.0.0" });
        expect(body.result.instructions).toContain("read-only");
    });

    it("advertises Project Memory plus four Coordination read tools with OAuth security schemes", async () => {
        const response = await invoke({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
            "search",
            "fetch",
            "coordination_checkpoint_lookup",
            "coordination_checkpoint_history",
            "coordination_checkpoint_current",
            "coordination_checkpoint_resume",
        ]);
        for (const tool of body.result.tools) {
            expect(tool.inputSchema.type).toBe("object");
            expect(tool.outputSchema.type).toBe("object");
            expect(tool.annotations).toMatchObject({
                readOnlyHint: true,
                destructiveHint: false,
                openWorldHint: false,
            });
            expect(tool.securitySchemes).toEqual([{ type: "oauth2", scopes: [MCP_REQUIRED_SCOPE] }]);
            expect(tool._meta.securitySchemes).toEqual(tool.securitySchemes);
        }
        expect(body.result.tools.find((tool: { name: string }) => tool.name === "search").description)
            .toContain("Project Source Registry");
        expect(body.result.tools.find((tool: { name: string }) => tool.name === "fetch").description)
            .toContain("registry index/page");
    });

    it("invokes search and returns matching structuredContent and JSON content", async () => {
        const response = await invoke({
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: { name: "search", arguments: { query: "allowed-project" } },
        });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.result.isError).not.toBe(true);
        expect(JSON.parse(body.result.content[0].text)).toEqual(body.result.structuredContent);
        expect(body.result.structuredContent.results[0].title).toContain("Project manifest");
        expect(body.result.structuredContent.results[1].title).toContain("Project Source Registry");
    });

    it("invokes fetch for a valid manifest", async () => {
        const response = await invoke({
            jsonrpc: "2.0",
            id: 4,
            method: "tools/call",
            params: {
                name: "fetch",
                arguments: { id: encodeManifestId("allowed-project", FINGERPRINT) },
            },
        });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.result.structuredContent.metadata).toMatchObject({
            isProjectManifest: true,
            isCanonicalSource: false,
            totalSources: 1,
            complete: true,
        });
    });

    it("serializes exact snapshot provenance before long snapshot source text", async () => {
        const generatedFromFingerprint = "b".repeat(64);
        const snapshotText = `snapshot-start\n${"long snapshot line\n".repeat(2_000)}snapshot-end`;
        const snapshotSourceId = "snapshot-version-1";
        const snapshotPage = {
            ...indexPage(),
            counts: {
                project_metadata: 0,
                doc_block: 0,
                doc: 0,
                decision: 0,
                project_context: 0,
                loop: 0,
                project_context_snapshot: 1,
            },
            sources: [{
                sourceKind: "project_context_snapshot",
                sourceId: snapshotSourceId,
                title: "Project Context Snapshot",
                sourceType: null,
                status: "PUBLISHED",
                hasFullContent: true,
                isDerivedContext: true,
                snapshotMetadata: {
                    schemaVersion: "project-context.v1",
                    generatedFromFingerprint,
                    publishedCorpusFingerprint: FINGERPRINT,
                    generatedAt: "2026-08-25T21:06:00+07:00",
                    approvedAt: "2026-08-25T15:07:25.664Z",
                },
            }],
        };
        const snapshotFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = new URL(
                typeof input === "string"
                    ? input
                    : input instanceof URL
                        ? input.href
                        : input.url,
            );
            if (url.pathname.endsWith("/sources/read")) {
                const request = JSON.parse(String(init?.body)) as { offset: number; limit: number };
                const content = snapshotText.slice(request.offset, request.offset + request.limit);
                return Response.json({
                    schemaVersion: "ai-read-source-read.v1",
                    project: snapshotPage.project,
                    ref: { sourceKind: "project_context_snapshot", sourceId: snapshotSourceId },
                    title: "Project Context Snapshot",
                    metadata: {
                        sourceKind: "project_context_snapshot",
                        sourceId: snapshotSourceId,
                        status: "PUBLISHED",
                        sourceType: null,
                        isDerivedContext: true,
                    },
                    content,
                    chunk: {
                        offset: request.offset,
                        includedChars: content.length,
                        totalCharacterCount: snapshotText.length,
                        nextOffset: request.offset + content.length,
                        hasMore: request.offset + content.length < snapshotText.length,
                    },
                });
            }
            return Response.json(snapshotPage);
        }) as unknown as typeof fetch;

        const response = await handleMcpRequest(mcpRequest({
            jsonrpc: "2.0",
            id: 41,
            method: "tools/call",
            params: {
                name: "fetch",
                arguments: {
                    id: encodeSourceId("allowed-project", FINGERPRINT, {
                        sourceKind: "project_context_snapshot",
                        sourceId: snapshotSourceId,
                    }),
                },
            },
        }), { env, getKey, fetchFn: snapshotFetch });

        expect(response.status).toBe(200);
        const body = await response.json();
        const serialized = body.result.content[0].text as string;
        const textIndex = serialized.indexOf('"text":');
        expect(textIndex).toBeGreaterThan(-1);
        expect(serialized.indexOf('"generatedFromFingerprint":')).toBeLessThan(textIndex);
        expect(serialized.indexOf('"publishedCorpusFingerprint":')).toBeLessThan(textIndex);
        expect(serialized.indexOf('"authorityClass":')).toBeLessThan(textIndex);
        expect(JSON.parse(serialized)).toEqual(body.result.structuredContent);
        expect(body.result.structuredContent).toMatchObject({
            text: snapshotText,
            metadata: {
                isProjectManifest: false,
                isCanonicalSource: false,
                sourceKind: "project_context_snapshot",
                sourceId: snapshotSourceId,
                isDerivedContext: true,
                generatedFromFingerprint,
                publishedCorpusFingerprint: FINGERPRINT,
                authorityClass: "DERIVED_WORKING_MEMORY",
                snapshot: snapshotPage.sources[0].snapshotMetadata,
            },
        });
        expect(body.result.structuredContent.metadata.controlArtifactType).toBeUndefined();
    });


    it("invokes all four Coordination operations through the real MCP transport", async () => {
        const calls = [
            {
                name: "coordination_checkpoint_lookup",
                arguments: {
                    projectSlug: "allowed-project",
                    laneKey: "main",
                    selector: { by: "seq", seq: 1 },
                },
                status: "FOUND",
                authorityClass: "HISTORICAL_ONLY",
            },
            {
                name: "coordination_checkpoint_history",
                arguments: { projectSlug: "allowed-project", laneKey: "main" },
                status: "HISTORY",
                authorityClass: "HISTORICAL_ONLY",
            },
            {
                name: "coordination_checkpoint_current",
                arguments: { projectSlug: "allowed-project", laneKey: "main" },
                status: "CURRENT",
                authorityClass: "CURRENT",
            },
            {
                name: "coordination_checkpoint_resume",
                arguments: { projectSlug: "allowed-project", laneKey: "main" },
                status: "RESUMED",
                authorityClass: "AUTHORITATIVE_RESUME",
            },
        ];

        for (const [offset, call] of calls.entries()) {
            const response = await invoke({
                jsonrpc: "2.0",
                id: 50 + offset,
                method: "tools/call",
                params: { name: call.name, arguments: call.arguments },
            });
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.result.isError).not.toBe(true);
            expect(body.result.structuredContent).toMatchObject({
                status: call.status,
                authorityClass: call.authorityClass,
                identity: {
                    projectSlug: "allowed-project",
                    laneKey: "main",
                    laneId: "lane-a",
                },
            });
            expect(JSON.parse(body.result.content[0].text)).toEqual(body.result.structuredContent);
        }
    });

    it("enforces the MCP project allowlist before Coordination project resolution", async () => {
        const response = await invoke({
            jsonrpc: "2.0",
            id: 60,
            method: "tools/call",
            params: {
                name: "coordination_checkpoint_current",
                arguments: { projectSlug: "blocked-project", laneKey: "main" },
            },
        });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.result.isError).toBe(true);
        expect(body.result.structuredContent).toEqual({
            error: expect.objectContaining({ code: "PROJECT_NOT_ALLOWED" }),
        });
    });

    it("proves Project Memory and Coordination reads coexist in one stateless MCP runtime", async () => {
        const sequence = [
            { name: "search", arguments: { query: "allowed-project" } },
            { name: "coordination_checkpoint_current", arguments: { projectSlug: "allowed-project", laneKey: "main" } },
            { name: "fetch", arguments: { id: encodeManifestId("allowed-project", FINGERPRINT) } },
            { name: "coordination_checkpoint_resume", arguments: { projectSlug: "allowed-project", laneKey: "main" } },
        ];
        const checkpointCountBefore = (routeDb.prepare(
            "SELECT COUNT(*) AS count FROM coordination_lane_checkpoints",
        ).get() as { count: number }).count;

        for (const [offset, call] of sequence.entries()) {
            const response = await invoke({
                jsonrpc: "2.0",
                id: 70 + offset,
                method: "tools/call",
                params: call,
            });
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.result.isError).not.toBe(true);
        }

        const checkpointCountAfter = (routeDb.prepare(
            "SELECT COUNT(*) AS count FROM coordination_lane_checkpoints",
        ).get() as { count: number }).count;
        expect(checkpointCountAfter).toBe(checkpointCountBefore);
    });

    it("rejects malformed MCP JSON and remains stateless/retry-safe", async () => {
        const malformed = await invoke("{not-json", { raw: true });
        expect(malformed.status).toBe(400);
        expect((await malformed.json()).error.code).toBe(-32700);

        const list = { jsonrpc: "2.0", id: 5, method: "tools/list", params: {} };
        const first = await invoke(list);
        const second = await invoke({ ...list, id: 6 });
        const firstBody = await first.json();
        const secondBody = await second.json();
        expect(secondBody.result.tools).toEqual(firstBody.result.tools);
    });

    it("rejects MCP requests without a bearer token before transport dispatch", async () => {
        const response = await invoke(
            { jsonrpc: "2.0", id: 7, method: "tools/list", params: {} },
            { auth: false, origin: "https://workos.greenfineness.com" },
        );
        expect(response.status).toBe(401);
        expect(response.headers.get("www-authenticate")).toContain("oauth-protected-resource");
    });

    it.each([
        ["evil.example"],
        ["workos.greenfineness.com.evil.example"],
    ])("rejects disallowed Host %s before tool execution", async (host) => {
        fetchFn.mockClear();
        const response = await invoke(
            { jsonrpc: "2.0", id: 8, method: "tools/list", params: {} },
            { host },
        );
        expect(response.status).toBe(403);
        expect(fetchFn).not.toHaveBeenCalled();
    });

    it("accepts the canonical Host with a valid canonical Origin", async () => {
        const response = await invoke(
            { jsonrpc: "2.0", id: 9, method: "tools/list", params: {} },
            { origin: "https://workos.greenfineness.com" },
        );
        expect(response.status).toBe(200);
    });

    it.each([
        ["https://evil.example"],
        ["http://workos.greenfineness.com"],
        ["https://workos.greenfineness.com.evil.example"],
    ])("rejects disallowed Origin %s", async (origin) => {
        const response = await invoke(
            { jsonrpc: "2.0", id: 10, method: "tools/list", params: {} },
            { origin },
        );
        expect(response.status).toBe(403);
    });

    it("accepts a legitimate MCP client that omits Origin", async () => {
        const response = await invoke({
            jsonrpc: "2.0",
            id: 11,
            method: "tools/list",
            params: {},
        });
        expect(response.status).toBe(200);
    });

});
