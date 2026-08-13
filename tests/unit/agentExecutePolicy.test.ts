import { describe, expect, it } from "vitest";
import {
    AGENT_DIRECT_WRITE_DISABLED_CODE,
    AGENT_GATEWAY_PATH,
    assertLegacyAgentExecutionAllowed,
    LegacyAgentDirectWriteDisabledError,
} from "@/lib/agent/executePolicy";

describe("assertLegacyAgentExecutionAllowed", () => {
    it("allows dry-run preview", () => {
        expect(() => assertLegacyAgentExecutionAllowed(true)).not.toThrow();
    });

    it("rejects live writes with the disabled error", () => {
        expect(() => assertLegacyAgentExecutionAllowed(false)).toThrowError(
            LegacyAgentDirectWriteDisabledError,
        );
        try {
            assertLegacyAgentExecutionAllowed(false);
            expect.unreachable("live write must be rejected");
        } catch (error) {
            expect(error).toBeInstanceOf(LegacyAgentDirectWriteDisabledError);
            expect((error as LegacyAgentDirectWriteDisabledError).code).toBe(
                AGENT_DIRECT_WRITE_DISABLED_CODE,
            );
            expect((error as LegacyAgentDirectWriteDisabledError).status).toBe(403);
            expect((error as LegacyAgentDirectWriteDisabledError).message).toContain(
                "Direct agent writes are disabled",
            );
        }
    });

    it("exposes the gateway path for the error contract", () => {
        expect(AGENT_GATEWAY_PATH).toBe("/api/operations");
    });
});
