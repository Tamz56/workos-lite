import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { handleMcpRequest } from "@/app/mcp/route";
import { MCP_REQUIRED_SCOPE, MCP_RESOURCE_URL } from "@/lib/mcp/config";
import { encodeManifestId } from "@/lib/mcp/resultIds";

const ISSUER = "https://issuer.example.com";
const FINGERPRINT = "d".repeat(64);
let privateKey: CryptoKey;
let getKey: ReturnType<typeof createLocalJWKSet>;
let bearer: string;

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
    return handleMcpRequest(mcpRequest(body, options), { env, getKey, fetchFn });
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

    it("advertises exactly search/fetch with schemas, annotations and OAuth security schemes", async () => {
        const response = await invoke({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.result.tools.map((tool: { name: string }) => tool.name)).toEqual(["search", "fetch"]);
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
