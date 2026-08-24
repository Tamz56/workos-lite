import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    type CallToolResult,
    type ListToolsResult,
    type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { MCP_REQUIRED_SCOPE, MCP_RESOURCE_METADATA_URL } from "./config";
import { safeMcpError } from "./errors";
import type { FetchOutput, ProjectMemoryService, SearchOutput } from "./projectMemoryService";

export const PROJECT_MEMORY_SERVER_NAME = "workos-project-memory";
export const PROJECT_MEMORY_SERVER_VERSION = "1.0.0";

const SERVER_INSTRUCTIONS = [
    "This server is read-only.",
    "Use search to discover WorkOS Projects, bounded Project Source Registry controls, and sources.",
    "Fetch the registry index and every fingerprint-bound registry page to enumerate a complete Project source inventory.",
    "Fetch canonical source result IDs separately to read source bodies.",
    "Never claim complete Project coverage unless every manifest source was fetched completely and the manifest fingerprint is unchanged.",
    "Attachments are unsupported in v1.",
].join(" ");

const searchInput = z.object({ query: z.string().max(500) }).strict();
const fetchInput = z.object({ id: z.string().min(1).max(4_096) }).strict();

const SEARCH_OUTPUT_SCHEMA = {
    type: "object" as const,
    properties: {
        results: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    url: { type: "string" },
                },
                required: ["id", "title", "url"],
                additionalProperties: false,
            },
        },
    },
    required: ["results"],
    additionalProperties: false,
};

const FETCH_OUTPUT_SCHEMA = {
    type: "object" as const,
    properties: {
        id: { type: "string" },
        title: { type: "string" },
        text: { type: "string" },
        url: { type: "string" },
        metadata: { type: "object", additionalProperties: true },
    },
    required: ["id", "title", "text", "url", "metadata"],
    additionalProperties: false,
};

const OAUTH_SCHEMES = [{ type: "oauth2" as const, scopes: [MCP_REQUIRED_SCOPE] }];

type OpenAiTool = Tool & {
    securitySchemes: typeof OAUTH_SCHEMES;
};

export const PROJECT_MEMORY_TOOLS: readonly OpenAiTool[] = [
    {
        name: "search",
        title: "Search WorkOS project memory",
        description:
            "Search allowlisted WorkOS Projects and canonical source metadata. Use an exact Project name or slug to obtain its manifest and bounded Project Source Registry index.",
        inputSchema: {
            type: "object",
            properties: { query: { type: "string", maxLength: 500 } },
            required: ["query"],
            additionalProperties: false,
        },
        outputSchema: SEARCH_OUTPUT_SCHEMA,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        securitySchemes: OAUTH_SCHEMES,
        _meta: { securitySchemes: OAUTH_SCHEMES },
    },
    {
        name: "fetch",
        title: "Fetch WorkOS project memory",
        description:
            "Fetch one fingerprint-bound Project manifest, registry index/page control artifact, or complete canonical source returned by search. Stale or fabricated IDs fail closed.",
        inputSchema: {
            type: "object",
            properties: { id: { type: "string", minLength: 1, maxLength: 4_096 } },
            required: ["id"],
            additionalProperties: false,
        },
        outputSchema: FETCH_OUTPUT_SCHEMA,
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        securitySchemes: OAUTH_SCHEMES,
        _meta: { securitySchemes: OAUTH_SCHEMES },
    },
];

function requireToolScope(authInfo: AuthInfo | undefined): CallToolResult | undefined {
    if (authInfo?.scopes.includes(MCP_REQUIRED_SCOPE)) return undefined;
    const challenge =
        `Bearer resource_metadata="${MCP_RESOURCE_METADATA_URL}", ` +
        `scope="${MCP_REQUIRED_SCOPE}", error="insufficient_scope", ` +
        'error_description="Required read scope is missing"';
    return {
        isError: true,
        content: [{ type: "text", text: "OAuth authorization with the required read scope is needed." }],
        _meta: { "mcp/www_authenticate": [challenge] },
    };
}

function successResult(output: SearchOutput | FetchOutput): CallToolResult {
    return {
        structuredContent: output as unknown as Record<string, unknown>,
        content: [{ type: "text", text: JSON.stringify(output) }],
    };
}

function errorResult(error: unknown): CallToolResult {
    const safe = safeMcpError(error);
    return {
        isError: true,
        structuredContent: { error: safe },
        content: [{ type: "text", text: JSON.stringify({ error: safe }) }],
    };
}

export function createProjectMemoryServer(service: ProjectMemoryService): Server {
    const server = new Server(
        { name: PROJECT_MEMORY_SERVER_NAME, version: PROJECT_MEMORY_SERVER_VERSION },
        { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: PROJECT_MEMORY_TOOLS,
    } as unknown as ListToolsResult));

    server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
        const authError = requireToolScope(extra.authInfo);
        if (authError) return authError;
        try {
            if (request.params.name === "search") {
                const input = searchInput.parse(request.params.arguments ?? {});
                return successResult(await service.search(input.query));
            }
            if (request.params.name === "fetch") {
                const input = fetchInput.parse(request.params.arguments ?? {});
                return successResult(await service.fetch(input.id));
            }
            return errorResult(new Error("Unknown tool"));
        } catch (error) {
            return errorResult(error);
        }
    });

    return server;
}
