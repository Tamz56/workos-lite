import { protectedResourceMetadata } from "@/lib/mcp/oauthResourceServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function protectedResourceMetadataResponse(env: NodeJS.ProcessEnv = process.env): Response {
    try {
        return Response.json(protectedResourceMetadata(env), {
            headers: { "cache-control": "no-store" },
        });
    } catch {
        return Response.json(
            { error: "MCP_OAUTH_NOT_CONFIGURED" },
            { status: 503, headers: { "cache-control": "no-store" } },
        );
    }
}

export async function GET(): Promise<Response> {
    return protectedResourceMetadataResponse();
}
