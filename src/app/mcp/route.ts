import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type Database from "better-sqlite3";
import type { JWTVerifyGetKey } from "jose";
import { CoordinationReadAdapter } from "@/lib/coordination/readAdapter";
import { getAllowedProjectSlugs } from "@/lib/mcp/config";
import { createCoordinationReadToolset } from "@/lib/mcp/coordinationReadTools";
import { oauthErrorResponse, verifyBearerRequest } from "@/lib/mcp/oauthResourceServer";
import { createProjectMemoryServer } from "@/lib/mcp/projectMemoryServer";
import { ProjectMemoryService } from "@/lib/mcp/projectMemoryService";
import { createRead1Client } from "@/lib/mcp/read1Client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface McpRouteDependencies {
    env?: NodeJS.ProcessEnv;
    fetchFn?: typeof fetch;
    getKey?: JWTVerifyGetKey;
    db?: Database.Database;
}

export async function handleMcpRequest(
    request: Request,
    dependencies: McpRouteDependencies = {},
): Promise<Response> {
    const env = dependencies.env ?? process.env;
    let authInfo;
    try {
        authInfo = await verifyBearerRequest(request, { env, getKey: dependencies.getKey });
    } catch (error) {
        return oauthErrorResponse(error);
    }

    try {
        const allowedProjectSlugs = getAllowedProjectSlugs(env);
        const read1 = createRead1Client(env, dependencies.fetchFn ?? fetch);
        const service = new ProjectMemoryService(read1, allowedProjectSlugs);
        const coordinationDb = dependencies.db ?? (await import("@/db/db")).getDb();
        const coordinationTools = createCoordinationReadToolset(
            new CoordinationReadAdapter(coordinationDb),
            allowedProjectSlugs,
        );
        const server = createProjectMemoryServer(service, coordinationTools);
        const transport = new WebStandardStreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
            allowedHosts: ["workos.greenfineness.com", "workos.greenfineness.com:443"],
            allowedOrigins: [
                "https://workos.greenfineness.com",
                "https://workos.greenfineness.com:443",
            ],
            enableDnsRebindingProtection: true,
        });
        await server.connect(transport);
        try {
            return await transport.handleRequest(request, { authInfo });
        } finally {
            await server.close();
        }
    } catch {
        return Response.json(
            { error: "MCP_SERVER_UNAVAILABLE" },
            { status: 503, headers: { "cache-control": "no-store" } },
        );
    }
}

export async function POST(request: Request): Promise<Response> {
    return handleMcpRequest(request);
}
