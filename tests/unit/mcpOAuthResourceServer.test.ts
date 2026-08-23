import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { protectedResourceMetadataResponse } from "@/app/.well-known/oauth-protected-resource/route";
import {
    MCP_REQUIRED_SCOPE,
    MCP_RESOURCE_METADATA_URL,
    MCP_RESOURCE_URL,
} from "@/lib/mcp/config";
import {
    OAuthAccessError,
    oauthErrorResponse,
    verifyBearerRequest,
} from "@/lib/mcp/oauthResourceServer";

const ISSUER = "https://issuer.example.com";
const JWKS_URI = "https://issuer.example.com/.well-known/jwks.json";
let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;
let localJwks: ReturnType<typeof createLocalJWKSet>;

function oauthEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
    return {
        NODE_ENV: "test",
        MCP_OAUTH_ISSUER: ISSUER,
        MCP_OAUTH_AUDIENCE: MCP_RESOURCE_URL,
        MCP_OAUTH_JWKS_URI: JWKS_URI,
        MCP_OAUTH_SCOPE: MCP_REQUIRED_SCOPE,
        ...overrides,
    };
}

async function token(overrides: {
    issuer?: string;
    audience?: string;
    scope?: string;
    expirationTime?: number;
    omitExpiration?: boolean;
    notBefore?: number;
    key?: CryptoKey;
} = {}): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const jwt = new SignJWT({ scope: overrides.scope ?? MCP_REQUIRED_SCOPE })
        .setProtectedHeader({ alg: "RS256", kid: "test-key" })
        .setSubject("chatgpt-test-client")
        .setIssuer(overrides.issuer ?? ISSUER)
        .setAudience(overrides.audience ?? MCP_RESOURCE_URL)
        .setIssuedAt(now);
    if (!overrides.omitExpiration) {
        jwt.setExpirationTime(overrides.expirationTime ?? now + 300);
    }
    if (overrides.notBefore !== undefined) jwt.setNotBefore(overrides.notBefore);
    return jwt.sign(overrides.key ?? privateKey);
}

function request(bearer?: string): Request {
    return new Request(MCP_RESOURCE_URL, {
        method: "POST",
        headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
    });
}

async function expectAccessStatus(promise: Promise<unknown>, status: number): Promise<void> {
    try {
        await promise;
        throw new Error("Expected OAuth verification to fail");
    } catch (error) {
        expect(error).toBeInstanceOf(OAuthAccessError);
        expect((error as OAuthAccessError).status).toBe(status);
    }
}

beforeAll(async () => {
    const pair = await generateKeyPair("RS256", { extractable: true });
    const otherPair = await generateKeyPair("RS256", { extractable: true });
    privateKey = pair.privateKey;
    otherPrivateKey = otherPair.privateKey;
    const publicJwk = await exportJWK(pair.publicKey) as JWK;
    publicJwk.kid = "test-key";
    publicJwk.alg = "RS256";
    localJwks = createLocalJWKSet({ keys: [publicJwk] });
});

describe("READ1B OAuth resource server", () => {
    it("rejects a missing bearer token and returns the protected-resource challenge", async () => {
        await expectAccessStatus(verifyBearerRequest(request(), { env: oauthEnv(), getKey: localJwks }), 401);
        const response = oauthErrorResponse(new OAuthAccessError(401));
        expect(response.status).toBe(401);
        expect(response.headers.get("www-authenticate")).toContain(MCP_RESOURCE_METADATA_URL);
    });

    it.each([
        ["invalid signature", () => token({ key: otherPrivateKey })],
        ["wrong issuer", () => token({ issuer: "https://other-issuer.example.com" })],
        ["wrong audience", () => token({ audience: "https://other-resource.example.com" })],
        ["expired token", () => token({ expirationTime: Math.floor(Date.now() / 1000) - 30 })],
        ["future nbf", () => token({ notBefore: Math.floor(Date.now() / 1000) + 300 })],
    ])("rejects %s", async (_name, makeToken) => {
        await expectAccessStatus(
            verifyBearerRequest(request(await makeToken()), { env: oauthEnv(), getKey: localJwks }),
            401,
        );
    });

    it("rejects a valid token without the exact required scope", async () => {
        await expectAccessStatus(
            verifyBearerRequest(request(await token({ scope: "other.read" })), {
                env: oauthEnv(),
                getKey: localJwks,
            }),
            403,
        );
    });

    it("rejects an otherwise valid signed token without exp", async () => {
        await expectAccessStatus(
            verifyBearerRequest(request(await token({ omitExpiration: true })), {
                env: oauthEnv(),
                getKey: localJwks,
            }),
            401,
        );
    });

    it("accepts a signed token containing the required scope", async () => {
        const auth = await verifyBearerRequest(
            request(await token({ scope: `${MCP_REQUIRED_SCOPE} profile` })),
            { env: oauthEnv(), getKey: localJwks },
        );
        expect(auth.scopes).toContain(MCP_REQUIRED_SCOPE);
        expect(auth.resource?.toString()).toBe(MCP_RESOURCE_URL);
    });

    it("publishes provider-neutral protected-resource metadata and fails closed without config", async () => {
        const response = protectedResourceMetadataResponse(oauthEnv());
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            resource: MCP_RESOURCE_URL,
            authorization_servers: [ISSUER],
            scopes_supported: [MCP_REQUIRED_SCOPE],
            bearer_methods_supported: ["header"],
        });

        const missing = protectedResourceMetadataResponse({ NODE_ENV: "test" });
        expect(missing.status).toBe(503);
        expect(await missing.json()).toEqual({ error: "MCP_OAUTH_NOT_CONFIGURED" });
    });
});
