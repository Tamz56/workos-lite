import { McpBridgeError } from "./errors";

export const MCP_RESOURCE_URL = "https://workos.greenfineness.com/mcp";
export const MCP_RESOURCE_METADATA_URL =
    "https://workos.greenfineness.com/.well-known/oauth-protected-resource";
export const MCP_REQUIRED_SCOPE = "workos.projects.read";

const PROJECT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function getAllowedProjectSlugs(env: NodeJS.ProcessEnv = process.env): string[] {
    const raw = env.WORKOS_MCP_PROJECT_SLUGS?.trim();
    if (!raw) return [];

    const slugs = [...new Set(raw.split(",").map((value) => value.trim()).filter(Boolean))].sort();
    if (slugs.some((slug) => !PROJECT_SLUG.test(slug))) {
        throw new McpBridgeError("MCP_CONFIG_MISSING", "MCP project allowlist is invalid");
    }
    return slugs;
}

export interface Read1ClientConfig {
    internalOrigin: string;
    readPassword: string;
}

export function getRead1ClientConfig(env: NodeJS.ProcessEnv = process.env): Read1ClientConfig {
    const internalOrigin = env.WORKOS_INTERNAL_ORIGIN?.trim();
    const readPassword = env.AGENT_READ_PASSWORD;
    if (!internalOrigin || !readPassword) {
        throw new McpBridgeError("MCP_CONFIG_MISSING", "Internal READ1 access is not configured");
    }

    let origin: URL;
    try {
        origin = new URL(internalOrigin);
    } catch {
        throw new McpBridgeError("MCP_CONFIG_MISSING", "Internal READ1 origin is invalid");
    }
    if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password) {
        throw new McpBridgeError("MCP_CONFIG_MISSING", "Internal READ1 origin is invalid");
    }

    return {
        internalOrigin: origin.origin,
        readPassword,
    };
}

export function canonicalSourceUrl(projectSlug: string, sourceKind?: string, sourceId?: string): string {
    const origin = new URL(MCP_RESOURCE_URL).origin;
    if (sourceKind === "doc" && sourceId) {
        return new URL(`/docs/${encodeURIComponent(sourceId)}`, origin).toString();
    }
    return new URL(`/projects/${encodeURIComponent(projectSlug)}`, origin).toString();
}
