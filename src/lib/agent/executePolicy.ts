// ---------------------------------------------------------------------------
// Legacy agent execute policy (P1E.1C Phase B — Strategy A)
// dry_run:true  → legacy preview allowed, zero domain write
// dry_run:false → 403 AGENT_DIRECT_WRITE_DISABLED, zero domain write
// Deterministic and testable; no runtime fallback to any other write path.
// ---------------------------------------------------------------------------

export const AGENT_DIRECT_WRITE_DISABLED_CODE = "AGENT_DIRECT_WRITE_DISABLED";
export const AGENT_DIRECT_WRITE_DISABLED_MESSAGE = "Direct agent writes are disabled.";
export const AGENT_GATEWAY_PATH = "/api/operations";

export class LegacyAgentDirectWriteDisabledError extends Error {
    readonly code = AGENT_DIRECT_WRITE_DISABLED_CODE;
    readonly status = 403;

    constructor() {
        super(AGENT_DIRECT_WRITE_DISABLED_MESSAGE);
        this.name = "LegacyAgentDirectWriteDisabledError";
    }
}

export function assertLegacyAgentExecutionAllowed(dryRun: boolean): void {
    if (dryRun !== true) {
        throw new LegacyAgentDirectWriteDisabledError();
    }
}
