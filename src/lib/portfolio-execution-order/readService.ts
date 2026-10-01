import { createHash } from "node:crypto";

import type Database from "better-sqlite3";

import {
    PORTFOLIO_EXECUTION_ORDER_SCHEMA_VERSION,
    PORTFOLIO_EXECUTION_ORDER_SCOPE,
    type ExecutionPosture,
    type PortfolioExecutionOrderAssignmentV1,
    type PortfolioExecutionOrderCoverage,
    type PortfolioExecutionOrderHeadRow,
    type PortfolioExecutionOrderReadContext,
    type PortfolioExecutionOrderReadResult,
    type PortfolioExecutionOrderStateV1,
    type PortfolioExecutionOrderVersionRow,
    type PortfolioPriority,
} from "./types";

const STATE_KEYS = [
    "schemaVersion",
    "scope",
    "managedDirectoryRef",
    "managedProjectSetHash",
    "authorityRef",
    "sourceRef",
    "decidedAt",
    "reviewedAt",
    "reviewBy",
    "assignments",
] as const;

const ASSIGNMENT_KEYS = [
    "managedProjectId",
    "portfolioPriority",
    "executionPosture",
] as const;

const PRIORITIES =
    new Set<PortfolioPriority>([
        "PRIMARY",
        "SECONDARY",
        "BACKGROUND",
    ]);

const POSTURES =
    new Set<ExecutionPosture>([
        "CONTINUE",
        "HOLD",
    ]);

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === "object"
        && value !== null
        && !Array.isArray(value)
    );
}

function nonEmpty(
    value: unknown,
): value is string {
    return (
        typeof value === "string"
        && value.trim().length > 0
    );
}

function exactKeys(
    value: Record<string, unknown>,
    expected:
        readonly string[],
): boolean {
    const keys =
        Object.keys(value).sort();

    const wanted =
        [...expected].sort();

    return (
        keys.length === wanted.length
        && keys.every(
            (key, index) =>
                key === wanted[index],
        )
    );
}

function tableExists(
    db: Database.Database,
    name: string,
): boolean {
    return Boolean(
        db.prepare(`
            SELECT 1
            FROM sqlite_master
            WHERE type = 'table'
              AND name = ?
        `).get(name),
    );
}

function normalizeManagedProjectIds(
    ids: readonly string[],
): string[] | null {
    if (
        ids.some(
            (id) => !nonEmpty(id),
        )
    ) {
        return null;
    }

    const sorted =
        [...ids].sort();

    if (
        new Set(sorted).size
        !== sorted.length
    ) {
        return null;
    }

    return sorted;
}

export function computeManagedProjectSetHash(
    managedProjectIds:
        readonly string[],
): string {
    const sorted =
        normalizeManagedProjectIds(
            managedProjectIds,
        );

    if (!sorted) {
        throw new Error(
            "managedProjectIds must be unique non-empty IDs",
        );
    }

    return createHash("sha256")
        .update(
            JSON.stringify(sorted),
            "utf8",
        )
        .digest("hex");
}

function parseAssignment(
    value: unknown,
): PortfolioExecutionOrderAssignmentV1 | null {
    if (
        !isRecord(value)
        || !exactKeys(
            value,
            ASSIGNMENT_KEYS,
        )
        || !nonEmpty(
            value.managedProjectId,
        )
        || !PRIORITIES.has(
            value.portfolioPriority as PortfolioPriority,
        )
        || !POSTURES.has(
            value.executionPosture as ExecutionPosture,
        )
    ) {
        return null;
    }

    return {
        managedProjectId:
            value.managedProjectId,
        portfolioPriority:
            value.portfolioPriority as PortfolioPriority,
        executionPosture:
            value.executionPosture as ExecutionPosture,
    };
}

export function parsePortfolioExecutionOrderStateV1(
    raw: string,
): PortfolioExecutionOrderStateV1 | null {
    let parsed: unknown;

    try {
        parsed =
            JSON.parse(raw);
    } catch {
        return null;
    }

    if (
        !isRecord(parsed)
        || !exactKeys(
            parsed,
            STATE_KEYS,
        )
        || parsed.schemaVersion
            !==
            PORTFOLIO_EXECUTION_ORDER_SCHEMA_VERSION
        || parsed.scope
            !==
            PORTFOLIO_EXECUTION_ORDER_SCOPE
        || !nonEmpty(
            parsed.managedDirectoryRef,
        )
        || !nonEmpty(
            parsed.managedProjectSetHash,
        )
        || !/^[a-f0-9]{64}$/.test(
            parsed.managedProjectSetHash,
        )
        || !nonEmpty(
            parsed.authorityRef,
        )
        || !nonEmpty(
            parsed.sourceRef,
        )
        || !nonEmpty(
            parsed.decidedAt,
        )
        || !nonEmpty(
            parsed.reviewedAt,
        )
        || !nonEmpty(
            parsed.reviewBy,
        )
        || !Array.isArray(
            parsed.assignments,
        )
    ) {
        return null;
    }

    const assignments =
        parsed.assignments.map(
            parseAssignment,
        );

    if (
        assignments.some(
            (item) => item === null,
        )
    ) {
        return null;
    }

    return {
        schemaVersion:
            PORTFOLIO_EXECUTION_ORDER_SCHEMA_VERSION,
        scope:
            PORTFOLIO_EXECUTION_ORDER_SCOPE,
        managedDirectoryRef:
            parsed.managedDirectoryRef,
        managedProjectSetHash:
            parsed.managedProjectSetHash,
        authorityRef:
            parsed.authorityRef,
        sourceRef:
            parsed.sourceRef,
        decidedAt:
            parsed.decidedAt,
        reviewedAt:
            parsed.reviewedAt,
        reviewBy:
            parsed.reviewBy,
        assignments:
            assignments as PortfolioExecutionOrderAssignmentV1[],
    };
}

function coverageFor(
    currentManagedProjectIds:
        readonly string[],
    assignments:
        readonly PortfolioExecutionOrderAssignmentV1[],
): PortfolioExecutionOrderCoverage[] {
    const byId =
        new Map(
            assignments.map(
                (assignment) => [
                    assignment.managedProjectId,
                    assignment,
                ],
            ),
        );

    return [...currentManagedProjectIds]
        .sort()
        .map(
            (managedProjectId) => {
                const assignment =
                    byId.get(
                        managedProjectId,
                    );

                if (!assignment) {
                    return {
                        managedProjectId,
                        assignmentPresent:
                            false,
                        portfolioPriority: {
                            status:
                                "NOT_PROVEN",
                        },
                        executionPosture: {
                            status:
                                "NOT_PROVEN",
                        },
                    };
                }

                return {
                    managedProjectId,
                    assignmentPresent:
                        true,
                    portfolioPriority: {
                        status:
                            "KNOWN",
                        value:
                            assignment
                                .portfolioPriority,
                    },
                    executionPosture: {
                        status:
                            "KNOWN",
                        value:
                            assignment
                                .executionPosture,
                    },
                };
            },
        );
}

export function readPortfolioExecutionOrder(
    db: Database.Database,
    context:
        PortfolioExecutionOrderReadContext,
): PortfolioExecutionOrderReadResult {
    try {
        const hasVersions =
            tableExists(
                db,
                "portfolio_execution_order_versions",
            );

        const hasHeads =
            tableExists(
                db,
                "portfolio_execution_order_heads",
            );

        if (
            !hasVersions
            || !hasHeads
        ) {
            return {
                status:
                    "NOT_AVAILABLE",
                reason:
                    "AUTHORITY_TABLES_ABSENT",
            };
        }

        const currentIds =
            normalizeManagedProjectIds(
                context
                    .currentManagedProjectIds,
            );

        if (
            !currentIds
            || !nonEmpty(
                context
                    .managedDirectoryRef,
            )
        ) {
            return {
                status:
                    "NOT_PROVEN",
                reason:
                    "CURRENT_MANAGED_SET_INVALID",
            };
        }

        const currentHash =
            computeManagedProjectSetHash(
                currentIds,
            );

        const head =
            db.prepare(`
                SELECT
                    scope_id,
                    current_version_id,
                    selected_at,
                    selected_by,
                    selection_authority_ref
                FROM portfolio_execution_order_heads
                WHERE scope_id = ?
            `).get(
                PORTFOLIO_EXECUTION_ORDER_SCOPE,
            ) as PortfolioExecutionOrderHeadRow | undefined;

        if (!head) {
            return {
                status:
                    "NOT_PROVEN",
                reason:
                    "NO_HEAD",
            };
        }

        if (
            !nonEmpty(
                head.current_version_id,
            )
            || !nonEmpty(
                head.selected_at,
            )
            || head.selected_by
                !== "human"
            || !nonEmpty(
                head.selection_authority_ref,
            )
        ) {
            return {
                status:
                    "NOT_PROVEN",
                reason:
                    "MISSING_PROVENANCE",
            };
        }

        const version =
            db.prepare(`
                SELECT
                    id,
                    scope_id,
                    schema_version,
                    state_payload_json,
                    supersedes_version_id,
                    authority_ref,
                    source_type,
                    source_ref,
                    source_hash,
                    issued_at,
                    issued_by,
                    created_at
                FROM portfolio_execution_order_versions
                WHERE id = ?
            `).get(
                head.current_version_id,
            ) as PortfolioExecutionOrderVersionRow | undefined;

        if (!version) {
            return {
                status:
                    "NOT_PROVEN",
                reason:
                    "HEAD_VERSION_NOT_FOUND",
            };
        }

        if (
            head.scope_id
                !== version.scope_id
            || version.scope_id
                !==
                PORTFOLIO_EXECUTION_ORDER_SCOPE
        ) {
            return {
                status:
                    "CONFLICTED",
                reason:
                    "HEAD_VERSION_SCOPE_MISMATCH",
                head,
            };
        }

        if (
            version.schema_version
                !==
                PORTFOLIO_EXECUTION_ORDER_SCHEMA_VERSION
        ) {
            return {
                status:
                    "NOT_PROVEN",
                reason:
                    "UNSUPPORTED_SCHEMA_VERSION",
            };
        }

        if (
            !nonEmpty(version.id)
            || !nonEmpty(
                version.authority_ref,
            )
            || version.source_type
                !==
                "human_portfolio_decision"
            || !nonEmpty(
                version.source_ref,
            )
            || !nonEmpty(
                version.source_hash,
            )
            || !nonEmpty(
                version.issued_at,
            )
            || version.issued_by
                !== "human"
            || !nonEmpty(
                version.created_at,
            )
        ) {
            return {
                status:
                    "NOT_PROVEN",
                reason:
                    "MISSING_PROVENANCE",
            };
        }

        const state =
            parsePortfolioExecutionOrderStateV1(
                version
                    .state_payload_json,
            );

        if (!state) {
            return {
                status:
                    "NOT_PROVEN",
                reason:
                    "MALFORMED_PAYLOAD",
            };
        }

        if (
            state.authorityRef
                !== version.authority_ref
            || state.sourceRef
                !== version.source_ref
        ) {
            return {
                status:
                    "NOT_PROVEN",
                reason:
                    "MISSING_PROVENANCE",
            };
        }

        const assignedIds =
            state.assignments.map(
                (assignment) =>
                    assignment
                        .managedProjectId,
            );

        if (
            new Set(assignedIds).size
                !== assignedIds.length
        ) {
            return {
                status:
                    "NOT_PROVEN",
                reason:
                    "DUPLICATE_ASSIGNMENT",
            };
        }

        const currentSet =
            new Set(currentIds);

        if (
            assignedIds.some(
                (id) =>
                    !currentSet.has(id),
            )
        ) {
            return {
                status:
                    "NOT_PROVEN",
                reason:
                    "OUTSIDE_MANAGED_SET",
            };
        }

        const coverage =
            coverageFor(
                currentIds,
                state.assignments,
            );

        if (
            state.managedProjectSetHash
                !== currentHash
        ) {
            return {
                status:
                    "STALE",
                reason:
                    "MANAGED_PROJECT_SET_DRIFT",
                head,
                state,
                coverage,
                currentManagedProjectSetHash:
                    currentHash,
            };
        }

        if (
            state.managedDirectoryRef
                !==
                context
                    .managedDirectoryRef
        ) {
            return {
                status:
                    "STALE",
                reason:
                    "MANAGED_DIRECTORY_REF_DRIFT",
                head,
                state,
                coverage,
                currentManagedProjectSetHash:
                    currentHash,
            };
        }

        return {
            status:
                "CURRENT",
            head,
            state,
            coverage,
            currentManagedProjectSetHash:
                currentHash,
        };
    } catch {
        return {
            status:
                "NOT_PROVEN",
            reason:
                "READ_UNAVAILABLE",
        };
    }
}
