// ---------------------------------------------------------------------------
// WorkOS-Lite Operations authorization policy
// AUTOMATION-001-P1B.1
// Policy is Operations-local. Locked grants:
//   exact capability | operations:* | *
// Unrelated namespace wildcards grant nothing.
// ---------------------------------------------------------------------------

import type { AgentPrincipal } from "@/lib/agent-auth/agentAuthentication";
import { OpsError } from "./errors";
import type { OperationsCapability } from "./types";

export function hasOperationsScope(scopes: readonly string[], capability: OperationsCapability): boolean {
    return scopes.includes("*") || scopes.includes("operations:*") || scopes.includes(capability);
}

export function requireOperationsScope(principal: AgentPrincipal, capability: OperationsCapability): void {
    if (!hasOperationsScope(principal.scopes, capability)) {
        throw new OpsError("OPS_FORBIDDEN", "Insufficient operations permissions", 403);
    }
}
