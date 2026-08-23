import {
    createRemoteJWKSet,
    errors as joseErrors,
    jwtVerify,
    type JWTVerifyGetKey,
    type JWTPayload,
} from "jose";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
    MCP_REQUIRED_SCOPE,
    MCP_RESOURCE_METADATA_URL,
    MCP_RESOURCE_URL,
} from "./config";

const ASYMMETRIC_JWT_ALGORITHMS = [
    "RS256", "RS384", "RS512",
    "PS256", "PS384", "PS512",
    "ES256", "ES384", "ES512",
    "EdDSA",
];
const remoteJwksCache = new Map<string, JWTVerifyGetKey>();

function remoteJwks(uri: string): JWTVerifyGetKey {
    const cached = remoteJwksCache.get(uri);
    if (cached) return cached;
    const created = createRemoteJWKSet(new URL(uri));
    remoteJwksCache.set(uri, created);
    return created;
}

export interface OAuthResourceConfig {
    issuer: string;
    audience: string;
    jwksUri: string;
    scope: typeof MCP_REQUIRED_SCOPE;
}

export class OAuthConfigurationError extends Error {
    constructor() {
        super("MCP OAuth resource server is not configured");
        this.name = "OAuthConfigurationError";
    }
}

export class OAuthAccessError extends Error {
    constructor(readonly status: 401 | 403) {
        super(status === 403 ? "Insufficient OAuth scope" : "Invalid bearer token");
        this.name = "OAuthAccessError";
    }
}

function validHttpsUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password;
    } catch {
        return false;
    }
}

export function getOAuthResourceConfig(env: NodeJS.ProcessEnv = process.env): OAuthResourceConfig {
    const issuer = env.MCP_OAUTH_ISSUER?.trim();
    const audience = env.MCP_OAUTH_AUDIENCE?.trim();
    const jwksUri = env.MCP_OAUTH_JWKS_URI?.trim();
    const scope = env.MCP_OAUTH_SCOPE?.trim();
    if (
        !issuer ||
        !audience ||
        !jwksUri ||
        scope !== MCP_REQUIRED_SCOPE ||
        audience !== MCP_RESOURCE_URL ||
        !validHttpsUrl(issuer) ||
        !validHttpsUrl(jwksUri)
    ) {
        throw new OAuthConfigurationError();
    }
    return { issuer, audience, jwksUri, scope };
}

function tokenScopes(payload: JWTPayload): string[] {
    if (typeof payload.scope === "string") return payload.scope.split(/\s+/).filter(Boolean);
    if (Array.isArray(payload.scope) && payload.scope.every((scope) => typeof scope === "string")) {
        return [...payload.scope];
    }
    return [];
}

export interface VerifyBearerOptions {
    env?: NodeJS.ProcessEnv;
    getKey?: JWTVerifyGetKey;
}

export async function verifyBearerRequest(
    request: Request,
    options: VerifyBearerOptions = {},
): Promise<AuthInfo> {
    const config = getOAuthResourceConfig(options.env);
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ") || authorization.length <= "Bearer ".length) {
        throw new OAuthAccessError(401);
    }
    const token = authorization.slice("Bearer ".length);
    const getKey = options.getKey ?? remoteJwks(config.jwksUri);
    try {
        const { payload } = await jwtVerify(token, getKey, {
            issuer: config.issuer,
            audience: config.audience,
            algorithms: ASYMMETRIC_JWT_ALGORITHMS,
            requiredClaims: ["exp"],
        });
        const scopes = tokenScopes(payload);
        if (!scopes.includes(MCP_REQUIRED_SCOPE)) {
            throw new OAuthAccessError(403);
        }
        return {
            token,
            clientId:
                (typeof payload.client_id === "string" && payload.client_id) ||
                (typeof payload.azp === "string" && payload.azp) ||
                (typeof payload.sub === "string" && payload.sub) ||
                "verified-oauth-client",
            scopes,
            expiresAt: payload.exp,
            resource: new URL(MCP_RESOURCE_URL),
            extra: { issuer: payload.iss },
        };
    } catch (error) {
        if (error instanceof OAuthAccessError) throw error;
        if (error instanceof joseErrors.JOSEError || error instanceof TypeError) {
            throw new OAuthAccessError(401);
        }
        throw new OAuthAccessError(401);
    }
}

export function oauthChallenge(status: 401 | 403): string {
    const base = `Bearer resource_metadata="${MCP_RESOURCE_METADATA_URL}", scope="${MCP_REQUIRED_SCOPE}"`;
    return status === 403
        ? `${base}, error="insufficient_scope", error_description="Required read scope is missing"`
        : base;
}

export function oauthErrorResponse(error: unknown): Response {
    if (error instanceof OAuthConfigurationError) {
        return Response.json(
            { error: "MCP_OAUTH_NOT_CONFIGURED" },
            { status: 503, headers: { "cache-control": "no-store" } },
        );
    }
    const status = error instanceof OAuthAccessError ? error.status : 401;
    return Response.json(
        { error: status === 403 ? "INSUFFICIENT_SCOPE" : "UNAUTHORIZED" },
        {
            status,
            headers: {
                "cache-control": "no-store",
                "www-authenticate": oauthChallenge(status),
            },
        },
    );
}

export function protectedResourceMetadata(env: NodeJS.ProcessEnv = process.env): Record<string, unknown> {
    const config = getOAuthResourceConfig(env);
    return {
        resource: MCP_RESOURCE_URL,
        authorization_servers: [config.issuer],
        scopes_supported: [MCP_REQUIRED_SCOPE],
        bearer_methods_supported: ["header"],
    };
}
