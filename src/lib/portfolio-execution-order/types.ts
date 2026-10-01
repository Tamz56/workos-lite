export const PORTFOLIO_EXECUTION_ORDER_SCHEMA_VERSION =
    "portfolio-execution-order.v0.1" as const;

export const PORTFOLIO_EXECUTION_ORDER_SCOPE =
    "MANAGED_PORTFOLIO" as const;

export type PortfolioPriority =
    | "PRIMARY"
    | "SECONDARY"
    | "BACKGROUND";

export type ExecutionPosture =
    | "CONTINUE"
    | "HOLD";

export type PortfolioExecutionOrderAssignmentV1 = {
    managedProjectId: string;
    portfolioPriority: PortfolioPriority;
    executionPosture: ExecutionPosture;
};

export type PortfolioExecutionOrderStateV1 = {
    schemaVersion:
        typeof PORTFOLIO_EXECUTION_ORDER_SCHEMA_VERSION;
    scope:
        typeof PORTFOLIO_EXECUTION_ORDER_SCOPE;
    managedDirectoryRef: string;
    managedProjectSetHash: string;
    authorityRef: string;
    sourceRef: string;
    decidedAt: string;
    reviewedAt: string;
    reviewBy: string;
    assignments:
        PortfolioExecutionOrderAssignmentV1[];
};

export type PortfolioExecutionOrderVersionRow = {
    id: string;
    scope_id: string;
    schema_version: string;
    state_payload_json: string;
    supersedes_version_id: string | null;
    authority_ref: string;
    source_type: string;
    source_ref: string;
    source_hash: string;
    issued_at: string;
    issued_by: string;
    created_at: string;
};

export type PortfolioExecutionOrderHeadRow = {
    scope_id: string;
    current_version_id: string;
    selected_at: string;
    selected_by: string;
    selection_authority_ref: string;
};

export type PortfolioExecutionOrderCoverage = {
    managedProjectId: string;
    assignmentPresent: boolean;
    portfolioPriority:
        | {
            status: "KNOWN";
            value: PortfolioPriority;
        }
        | {
            status: "NOT_PROVEN";
        };
    executionPosture:
        | {
            status: "KNOWN";
            value: ExecutionPosture;
        }
        | {
            status: "NOT_PROVEN";
        };
};

export type PortfolioExecutionOrderNotProvenReason =
    | "CURRENT_MANAGED_SET_INVALID"
    | "NO_HEAD"
    | "HEAD_VERSION_NOT_FOUND"
    | "UNSUPPORTED_SCHEMA_VERSION"
    | "MALFORMED_PAYLOAD"
    | "MISSING_PROVENANCE"
    | "DUPLICATE_ASSIGNMENT"
    | "OUTSIDE_MANAGED_SET"
    | "READ_UNAVAILABLE";

export type PortfolioExecutionOrderConflictReason =
    | "HEAD_VERSION_SCOPE_MISMATCH";

export type PortfolioExecutionOrderStaleReason =
    | "MANAGED_PROJECT_SET_DRIFT"
    | "MANAGED_DIRECTORY_REF_DRIFT";

export type PortfolioExecutionOrderReadContext = {
    managedDirectoryRef: string;
    currentManagedProjectIds: readonly string[];
};

export type PortfolioExecutionOrderReadResult =
    | {
        status: "NOT_AVAILABLE";
        reason: "AUTHORITY_TABLES_ABSENT";
      }
    | {
        status: "NOT_PROVEN";
        reason:
            PortfolioExecutionOrderNotProvenReason;
      }
    | {
        status: "CONFLICTED";
        reason:
            PortfolioExecutionOrderConflictReason;
        head:
            PortfolioExecutionOrderHeadRow;
      }
    | {
        status: "CURRENT";
        head:
            PortfolioExecutionOrderHeadRow;
        state:
            PortfolioExecutionOrderStateV1;
        coverage:
            PortfolioExecutionOrderCoverage[];
        currentManagedProjectSetHash: string;
      }
    | {
        status: "STALE";
        reason:
            PortfolioExecutionOrderStaleReason;
        head:
            PortfolioExecutionOrderHeadRow;
        state:
            PortfolioExecutionOrderStateV1;
        coverage:
            PortfolioExecutionOrderCoverage[];
        currentManagedProjectSetHash: string;
      };
