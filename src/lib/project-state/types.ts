export const PROJECT_STATE_SCHEMA_VERSION = "project-state.v1" as const;

export type GovernedFact<T = unknown> =
    | { status: "KNOWN"; value: T }
    | { status: "UNKNOWN" }
    | { status: "NOT_GOVERNED" };

export type ProjectStatePayloadV1 = {
    projectStatus: GovernedFact;
    posture: GovernedFact;
    phase: GovernedFact;
    currentFocus: GovernedFact;
    nextAuthoritativeAction: GovernedFact;
    waitingOrHold: GovernedFact;
    blockers: GovernedFact;
    dependencies: GovernedFact;
};

export type ProjectStateVersionRow = {
    id: string;
    project_id: string;
    schema_version: string;
    state_payload_json: string;
    supersedes_state_version_id: string | null;
    authority_ref: string;
    source_type: string;
    source_ref: string;
    source_hash: string;
    issued_at: string;
    issued_by: string;
    created_at: string;
};

export type ProjectStateHeadRow = {
    project_id: string;
    current_state_version_id: string;
    selected_at: string;
    selected_by: string;
    selection_authority_ref: string;
};

export type CanonicalProjectState = {
    id: string;
    projectId: string;
    schemaVersion: typeof PROJECT_STATE_SCHEMA_VERSION;
    payload: ProjectStatePayloadV1;
    supersedesStateVersionId: string | null;
    authorityRef: string;
    sourceType: string;
    sourceRef: string;
    sourceHash: string;
    issuedAt: string;
    issuedBy: string;
    createdAt: string;
};

export type ProjectStateNotProvenReason =
    | "NO_HEAD"
    | "HEAD_VERSION_NOT_FOUND"
    | "UNSUPPORTED_SCHEMA_VERSION"
    | "MALFORMED_PAYLOAD"
    | "MISSING_PROVENANCE"
    | "PROJECT_MISMATCH"
    | "SUPERSESSION_INVALID"
    | "READ_UNAVAILABLE";

export type CanonicalProjectStateReadResult =
    | {
        status: "PROJECT_NOT_FOUND";
        projectSlug: string;
      }
    | {
        status: "NOT_PROVEN";
        projectSlug: string;
        projectId?: string;
        reason: ProjectStateNotProvenReason;
      }
    | {
        status: "CURRENT";
        projectSlug: string;
        projectId: string;
        head: ProjectStateHeadRow;
        state: CanonicalProjectState;
      }
    | {
        status: "STALE";
        projectSlug: string;
        projectId: string;
        head: ProjectStateHeadRow;
        staleStateVersionId: string;
        supersededByStateVersionId: string;
      };
