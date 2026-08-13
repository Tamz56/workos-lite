// ---------------------------------------------------------------------------
// Global WorkOS human session gate decision (P1E.1A)
// Pure decision logic so redirect behavior is deterministically testable
// without a browser/DOM. The component layer only executes the decision.
// This is UX/navigation enforcement; authoritative route-level authorization
// is added separately (P1E.1B / P1E.1C via requireHumanMutation).
// ---------------------------------------------------------------------------

import { humanLoginUrl } from "./clientSession";

export type HumanGateState =
    | { kind: "checking" }
    | { kind: "render" }
    | { kind: "redirect"; to: string };

export function resolveHumanGate(
    sessionChecked: boolean,
    authenticated: boolean,
    pathname: string,
): HumanGateState {
    if (!sessionChecked) return { kind: "checking" };
    if (authenticated) return { kind: "render" };
    const next = pathname && pathname !== "/" ? pathname : undefined;
    return { kind: "redirect", to: humanLoginUrl(next) };
}
