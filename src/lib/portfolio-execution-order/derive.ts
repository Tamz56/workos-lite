import type {
    GovernedFact,
} from "@/lib/project-state/types";

import type {
    ExecutionPosture,
    PortfolioExecutionOrderCoverage,
    PortfolioExecutionOrderReadResult,
    PortfolioPriority,
} from "./types";

export const PHASE7_EXECUTION_ORDER_CONTRACT_REF =
    "PORTFOLIO EXECUTION ORDER CONTRACT v0.1" as const;

export type Phase7Currentness =
    | "CURRENT"
    | "STALE"
    | "NOT_PROVEN"
    | "UNBOUND"
    | "NOT_AVAILABLE"
    | "CONFLICTED";

export type Phase7Authority =
    | "HUMAN_PORTFOLIO_DECISION"
    | "PROJECT_STATE"
    | "COORDINATION"
    | "PHASE7_DERIVATION"
    | "NONE";

export type Phase7Claim<T> = {
    value: T | null;
    authority: Phase7Authority;
    currentness: Phase7Currentness;
    authorityRef: string | null;
    sourceRefs: string[];
    reviewedAt: string | null;
};

export type DependencyRelationshipV01 = {
    id: string;
    target:
        | {
            kind: "PROJECT";
            managedProjectId: string;
          }
        | {
            kind: "EXTERNAL";
            externalId: string;
            label: string;
          };
    requirement:
        | "REQUIRED"
        | "OPTIONAL";
    state:
        | "OPEN"
        | "SATISFIED"
        | "WAIVED";
    evidenceRef: string;
};

export type DependencySetV01 = {
    schemaVersion:
        "dependency-set.v0.1";
    completeness:
        | "COMPLETE"
        | "PARTIAL";
    relationships:
        DependencyRelationshipV01[];
};

export type BlockerV01 = {
    id: string;
    state:
        | "OPEN"
        | "RESOLVED"
        | "WAIVED";
    evidenceRef: string;
};

export type BlockerSetV01 = {
    schemaVersion:
        "blocker-set.v0.1";
    completeness:
        | "COMPLETE"
        | "PARTIAL";
    blockers: BlockerV01[];
};

export type CanonicalPhase7Input = {
    fact: GovernedFact | null;
    currentness:
        | "CURRENT"
        | "STALE"
        | "NOT_PROVEN"
        | "UNBOUND";
    authorityRef: string | null;
    sourceRefs: string[];
};

export type Phase7ProjectInput = {
    managedProjectId: string;
    dependency: CanonicalPhase7Input;
    blocker: CanonicalPhase7Input;
};

export type HumanDecisionReason =
    | "AUTHORITY_CONFLICT"
    | "PRIORITY_MISSING"
    | "PRIORITY_AMBIGUOUS"
    | "DEPENDENCY_CYCLE"
    | "DEPENDENCY_UNTYPED"
    | "DEPENDENCY_EVIDENCE_INSUFFICIENT"
    | "MISSING_REQUIRED_AUTHORITY"
    | "EXTERNAL_EVIDENCE_MISSING"
    | "UNBOUND_REQUIRED_DEPENDENCY"
    | "TRADEOFF_NOT_GOVERNED"
    | "ORDERING_AMBIGUOUS";

export type HumanDecisionRequiredValue = {
    required: boolean;
    reasons: HumanDecisionReason[];
};

export type WaitingExternalDependency = {
    externalId: string;
    label: string;
    evidenceRef: string;
};

export type MustHappenFirstValue = {
    direct: string[];
    transitive: string[];
};

export type Phase7ProjectProjection = {
    managedProjectId: string;
    portfolioPriority:
        Phase7Claim<PortfolioPriority>;
    executionPosture:
        Phase7Claim<ExecutionPosture>;
    blockingStatus:
        Phase7Claim<"BLOCKED" | "CLEAR">;
    mustHappenFirst:
        Phase7Claim<MustHappenFirstValue>;
    canRunInParallel:
        Phase7Claim<string[]>;
    humanDecisionRequired:
        Phase7Claim<HumanDecisionRequiredValue>;
    waitingForExternalDependency:
        Phase7Claim<WaitingExternalDependency[]>;
};

export type Phase7PortfolioProjection = {
    contractRef:
        typeof PHASE7_EXECUTION_ORDER_CONTRACT_REF;
    authorityRead: {
        status:
            PortfolioExecutionOrderReadResult["status"];
        reason: string | null;
        humanPortfolioHead:
            | "PRESENT"
            | "ABSENT"
            | "NOT_AVAILABLE"
            | "NOT_PROVEN";
    };
    dependencyOrder:
        Phase7Claim<string[][]>;
    projects:
        Phase7ProjectProjection[];
};

export type Phase7DerivationInput = {
    portfolioRead:
        PortfolioExecutionOrderReadResult;
    projects:
        Phase7ProjectInput[];
};

type ParsedCanonical<T> = {
    value: T | null;
    currentness: Phase7Currentness;
    authorityRef: string | null;
    sourceRefs: string[];
    failure:
        | "UNTYPED"
        | "PARTIAL"
        | "EXTERNAL_EVIDENCE_MISSING"
        | null;
};

type GraphResult = {
    claim: Phase7Claim<string[][]>;
    edges: Map<string, Set<string>>;
    reverseEdges: Map<string, Set<string>>;
    failureReason:
        | "DEPENDENCY_CYCLE"
        | "DEPENDENCY_UNTYPED"
        | "DEPENDENCY_EVIDENCE_INSUFFICIENT"
        | "UNBOUND_REQUIRED_DEPENDENCY"
        | "AUTHORITY_CONFLICT"
        | null;
};

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
    expected: readonly string[],
): boolean {
    const actual =
        Object.keys(value).sort();

    const wanted =
        [...expected].sort();

    return (
        actual.length === wanted.length
        && actual.every(
            (key, index) =>
                key === wanted[index],
        )
    );
}

function uniqueSorted(
    values: readonly string[],
): string[] {
    return [...new Set(values)].sort();
}

function sourceRefsFrom(
    values:
        readonly CanonicalPhase7Input[],
): string[] {
    return uniqueSorted(
        values.flatMap(
            (value) =>
                value.sourceRefs,
        ),
    );
}

function derivedClaim<T>(
    value: T | null,
    currentness: Phase7Currentness,
    sourceRefs: readonly string[],
): Phase7Claim<T> {
    return {
        value,
        authority:
            "PHASE7_DERIVATION",
        currentness,
        authorityRef:
            PHASE7_EXECUTION_ORDER_CONTRACT_REF,
        sourceRefs:
            uniqueSorted(sourceRefs),
        reviewedAt: null,
    };
}

function humanClaim<T>(
    value: T | null,
    currentness: Phase7Currentness,
    authorityRef: string | null,
    sourceRefs: readonly string[],
    reviewedAt: string | null,
): Phase7Claim<T> {
    return {
        value,
        authority:
            "HUMAN_PORTFOLIO_DECISION",
        currentness,
        authorityRef,
        sourceRefs:
            uniqueSorted(sourceRefs),
        reviewedAt,
    };
}

function parseDependencyTarget(
    value: unknown,
): DependencyRelationshipV01["target"] | null {
    if (!isRecord(value)) {
        return null;
    }

    if (
        value.kind === "PROJECT"
        && exactKeys(
            value,
            [
                "kind",
                "managedProjectId",
            ],
        )
        && nonEmpty(
            value.managedProjectId,
        )
    ) {
        return {
            kind: "PROJECT",
            managedProjectId:
                value.managedProjectId,
        };
    }

    if (
        value.kind === "EXTERNAL"
        && exactKeys(
            value,
            [
                "kind",
                "externalId",
                "label",
            ],
        )
        && nonEmpty(value.externalId)
        && nonEmpty(value.label)
    ) {
        return {
            kind: "EXTERNAL",
            externalId:
                value.externalId,
            label:
                value.label,
        };
    }

    return null;
}

function parseDependencyRelationship(
    value: unknown,
): {
    relationship:
        DependencyRelationshipV01 | null;
    externalEvidenceMissing: boolean;
} {
    if (
        !isRecord(value)
        || !exactKeys(
            value,
            [
                "id",
                "target",
                "requirement",
                "state",
                "evidenceRef",
            ],
        )
        || !nonEmpty(value.id)
        || (
            value.requirement
                !== "REQUIRED"
            && value.requirement
                !== "OPTIONAL"
        )
        || (
            value.state !== "OPEN"
            && value.state
                !== "SATISFIED"
            && value.state
                !== "WAIVED"
        )
    ) {
        return {
            relationship: null,
            externalEvidenceMissing:
                false,
        };
    }

    const target =
        parseDependencyTarget(
            value.target,
        );

    if (!target) {
        return {
            relationship: null,
            externalEvidenceMissing:
                false,
        };
    }

    const evidenceRef =
        nonEmpty(value.evidenceRef)
            ? value.evidenceRef
            : null;

    if (!evidenceRef) {
        return {
            relationship: null,
            externalEvidenceMissing:
                target.kind === "EXTERNAL"
                && value.requirement
                    === "REQUIRED"
                && value.state === "OPEN",
        };
    }

    return {
        relationship: {
            id: value.id,
            target,
            requirement:
                value.requirement,
            state:
                value.state,
            evidenceRef,
        },
        externalEvidenceMissing:
            false,
    };
}

export function parseDependencySetV01(
    value: unknown,
): {
    value: DependencySetV01 | null;
    externalEvidenceMissing: boolean;
} {
    if (
        !isRecord(value)
        || !exactKeys(
            value,
            [
                "schemaVersion",
                "completeness",
                "relationships",
            ],
        )
        || value.schemaVersion
            !== "dependency-set.v0.1"
        || (
            value.completeness
                !== "COMPLETE"
            && value.completeness
                !== "PARTIAL"
        )
        || !Array.isArray(
            value.relationships,
        )
    ) {
        return {
            value: null,
            externalEvidenceMissing:
                false,
        };
    }

    const parsed =
        value.relationships.map(
            parseDependencyRelationship,
        );

    const externalEvidenceMissing =
        parsed.some(
            (item) =>
                item.externalEvidenceMissing,
        );

    if (
        parsed.some(
            (item) =>
                item.relationship === null,
        )
    ) {
        return {
            value: null,
            externalEvidenceMissing,
        };
    }

    return {
        value: {
            schemaVersion:
                "dependency-set.v0.1",
            completeness:
                value.completeness,
            relationships:
                parsed.map(
                    (item) =>
                        item.relationship,
                ) as DependencyRelationshipV01[],
        },
        externalEvidenceMissing,
    };
}

function parseBlocker(
    value: unknown,
): BlockerV01 | null {
    if (
        !isRecord(value)
        || !exactKeys(
            value,
            [
                "id",
                "state",
                "evidenceRef",
            ],
        )
        || !nonEmpty(value.id)
        || (
            value.state !== "OPEN"
            && value.state
                !== "RESOLVED"
            && value.state
                !== "WAIVED"
        )
        || !nonEmpty(
            value.evidenceRef,
        )
    ) {
        return null;
    }

    return {
        id: value.id,
        state: value.state,
        evidenceRef:
            value.evidenceRef,
    };
}

export function parseBlockerSetV01(
    value: unknown,
): BlockerSetV01 | null {
    if (
        !isRecord(value)
        || !exactKeys(
            value,
            [
                "schemaVersion",
                "completeness",
                "blockers",
            ],
        )
        || value.schemaVersion
            !== "blocker-set.v0.1"
        || (
            value.completeness
                !== "COMPLETE"
            && value.completeness
                !== "PARTIAL"
        )
        || !Array.isArray(
            value.blockers,
        )
    ) {
        return null;
    }

    const blockers =
        value.blockers.map(
            parseBlocker,
        );

    if (
        blockers.some(
            (blocker) => blocker === null,
        )
    ) {
        return null;
    }

    return {
        schemaVersion:
            "blocker-set.v0.1",
        completeness:
            value.completeness,
        blockers:
            blockers as BlockerV01[],
    };
}

function normalizeDependency(
    input: CanonicalPhase7Input,
): ParsedCanonical<DependencySetV01> {
    if (
        input.currentness !== "CURRENT"
    ) {
        return {
            value: null,
            currentness:
                input.currentness,
            authorityRef:
                input.authorityRef,
            sourceRefs:
                uniqueSorted(
                    input.sourceRefs,
                ),
            failure: null,
        };
    }

    if (
        input.fact === null
        || input.fact.status !== "KNOWN"
    ) {
        return {
            value: null,
            currentness: "NOT_PROVEN",
            authorityRef:
                input.authorityRef,
            sourceRefs:
                uniqueSorted(
                    input.sourceRefs,
                ),
            failure: "UNTYPED",
        };
    }

    const parsed =
        parseDependencySetV01(
            input.fact.value,
        );

    if (!parsed.value) {
        return {
            value: null,
            currentness: "NOT_PROVEN",
            authorityRef:
                input.authorityRef,
            sourceRefs:
                uniqueSorted(
                    input.sourceRefs,
                ),
            failure:
                parsed.externalEvidenceMissing
                    ? "EXTERNAL_EVIDENCE_MISSING"
                    : "UNTYPED",
        };
    }

    return {
        value: parsed.value,
        currentness: "CURRENT",
        authorityRef:
            input.authorityRef,
        sourceRefs:
            uniqueSorted(
                input.sourceRefs,
            ),
        failure:
            parsed.value.completeness
                === "PARTIAL"
                ? "PARTIAL"
                : null,
    };
}

function normalizeBlocker(
    input: CanonicalPhase7Input,
): ParsedCanonical<BlockerSetV01> {
    if (
        input.currentness !== "CURRENT"
    ) {
        return {
            value: null,
            currentness:
                input.currentness,
            authorityRef:
                input.authorityRef,
            sourceRefs:
                uniqueSorted(
                    input.sourceRefs,
                ),
            failure: null,
        };
    }

    if (
        input.fact === null
        || input.fact.status !== "KNOWN"
    ) {
        return {
            value: null,
            currentness: "NOT_PROVEN",
            authorityRef:
                input.authorityRef,
            sourceRefs:
                uniqueSorted(
                    input.sourceRefs,
                ),
            failure: "UNTYPED",
        };
    }

    const parsed =
        parseBlockerSetV01(
            input.fact.value,
        );

    if (!parsed) {
        return {
            value: null,
            currentness: "NOT_PROVEN",
            authorityRef:
                input.authorityRef,
            sourceRefs:
                uniqueSorted(
                    input.sourceRefs,
                ),
            failure: "UNTYPED",
        };
    }

    return {
        value: parsed,
        currentness: "CURRENT",
        authorityRef:
            input.authorityRef,
        sourceRefs:
            uniqueSorted(
                input.sourceRefs,
            ),
        failure:
            parsed.completeness
                === "PARTIAL"
                ? "PARTIAL"
                : null,
    };
}

function portfolioCoverageById(
    read:
        PortfolioExecutionOrderReadResult,
): ReadonlyMap<
    string,
    PortfolioExecutionOrderCoverage
> {
    if (
        read.status !== "CURRENT"
        && read.status !== "STALE"
    ) {
        return new Map();
    }

    return new Map(
        read.coverage.map(
            (coverage) => [
                coverage.managedProjectId,
                coverage,
            ],
        ),
    );
}

function portfolioClaimForProject<T extends PortfolioPriority | ExecutionPosture>(
    read:
        PortfolioExecutionOrderReadResult,
    managedProjectId: string,
    dimension:
        | "portfolioPriority"
        | "executionPosture",
): Phase7Claim<T> {
    if (
        read.status === "NOT_AVAILABLE"
    ) {
        return humanClaim<T>(
            null,
            "NOT_AVAILABLE",
            null,
            [],
            null,
        );
    }

    if (
        read.status === "NOT_PROVEN"
    ) {
        return humanClaim<T>(
            null,
            "NOT_PROVEN",
            null,
            [],
            null,
        );
    }

    if (
        read.status === "CONFLICTED"
    ) {
        return humanClaim<T>(
            null,
            "CONFLICTED",
            read.head
                .selection_authority_ref,
            [],
            null,
        );
    }

    const coverage =
        portfolioCoverageById(read)
            .get(managedProjectId);

    const dimensionValue =
        coverage?.[dimension];

    const sourceRefs = [
        read.state.sourceRef,
    ];

    if (
        !dimensionValue
        || dimensionValue.status
            !== "KNOWN"
    ) {
        return humanClaim<T>(
            null,
            "NOT_PROVEN",
            read.state.authorityRef,
            sourceRefs,
            read.state.reviewedAt,
        );
    }

    return humanClaim(
        dimensionValue.value as T,
        read.status === "STALE"
            ? "STALE"
            : "CURRENT",
        read.state.authorityRef,
        sourceRefs,
        read.state.reviewedAt,
    );
}

function headStatus(
    read:
        PortfolioExecutionOrderReadResult,
): Phase7PortfolioProjection["authorityRead"] {
    if (
        read.status === "NOT_AVAILABLE"
    ) {
        return {
            status: read.status,
            reason: read.reason,
            humanPortfolioHead:
                "NOT_AVAILABLE",
        };
    }

    if (
        read.status === "NOT_PROVEN"
    ) {
        return {
            status: read.status,
            reason: read.reason,
            humanPortfolioHead:
                read.reason === "NO_HEAD"
                    ? "ABSENT"
                    : "NOT_PROVEN",
        };
    }

    if (
        read.status === "CONFLICTED"
    ) {
        return {
            status: read.status,
            reason: read.reason,
            humanPortfolioHead:
                "PRESENT",
        };
    }

    return {
        status: read.status,
        reason:
            "reason" in read
                ? read.reason
                : null,
        humanPortfolioHead:
            "PRESENT",
    };
}

function graphFromDependencies(
    projects:
        readonly Phase7ProjectInput[],
    normalized:
        ReadonlyMap<
            string,
            ParsedCanonical<DependencySetV01>
        >,
): GraphResult {
    const projectIds =
        projects.map(
            (project) =>
                project.managedProjectId,
        );

    const projectSet =
        new Set(projectIds);

    const sourceRefs =
        sourceRefsFrom(
            projects.map(
                (project) =>
                    project.dependency,
            ),
        );

    for (const project of projects) {
        const parsed =
            normalized.get(
                project.managedProjectId,
            );

        if (!parsed) {
            return {
                claim:
                    derivedClaim<string[][]>(
                        null,
                        "NOT_PROVEN",
                        sourceRefs,
                    ),
                edges: new Map(),
                reverseEdges:
                    new Map(),
                failureReason:
                    "DEPENDENCY_UNTYPED",
            };
        }

        if (
            parsed.currentness
                === "CONFLICTED"
        ) {
            return {
                claim:
                    derivedClaim<string[][]>(
                        null,
                        "CONFLICTED",
                        sourceRefs,
                    ),
                edges: new Map(),
                reverseEdges:
                    new Map(),
                failureReason:
                    "AUTHORITY_CONFLICT",
            };
        }

        if (
            parsed.currentness
                !== "CURRENT"
            || !parsed.value
        ) {
            return {
                claim:
                    derivedClaim<string[][]>(
                        null,
                        "NOT_PROVEN",
                        sourceRefs,
                    ),
                edges: new Map(),
                reverseEdges:
                    new Map(),
                failureReason:
                    parsed.failure
                        === "PARTIAL"
                        ? "DEPENDENCY_EVIDENCE_INSUFFICIENT"
                        : "DEPENDENCY_UNTYPED",
            };
        }

        if (
            parsed.value.completeness
                !== "COMPLETE"
        ) {
            return {
                claim:
                    derivedClaim<string[][]>(
                        null,
                        "NOT_PROVEN",
                        sourceRefs,
                    ),
                edges: new Map(),
                reverseEdges:
                    new Map(),
                failureReason:
                    "DEPENDENCY_EVIDENCE_INSUFFICIENT",
            };
        }
    }

    const edges =
        new Map<string, Set<string>>();

    const reverseEdges =
        new Map<string, Set<string>>();

    for (const id of projectIds) {
        edges.set(id, new Set());
        reverseEdges.set(
            id,
            new Set(),
        );
    }

    const relationSignatures =
        new Map<string, string>();

    for (const project of projects) {
        const dependencySet =
            normalized.get(
                project.managedProjectId,
            )?.value;

        if (!dependencySet) {
            continue;
        }

        for (
            const relationship
            of dependencySet.relationships
        ) {
            const signature =
                JSON.stringify({
                    subject:
                        project.managedProjectId,
                    target:
                        relationship.target,
                    requirement:
                        relationship.requirement,
                    state:
                        relationship.state,
                });

            const previous =
                relationSignatures.get(
                    relationship.id,
                );

            if (
                previous !== undefined
                && previous !== signature
            ) {
                return {
                    claim:
                        derivedClaim<string[][]>(
                            null,
                            "CONFLICTED",
                            sourceRefs,
                        ),
                    edges,
                    reverseEdges,
                    failureReason:
                        "AUTHORITY_CONFLICT",
                };
            }

            relationSignatures.set(
                relationship.id,
                signature,
            );

            if (
                relationship.requirement
                    !== "REQUIRED"
                || relationship.state
                    !== "OPEN"
                || relationship.target.kind
                    !== "PROJECT"
            ) {
                continue;
            }

            const target =
                relationship.target
                    .managedProjectId;

            if (!projectSet.has(target)) {
                return {
                    claim:
                        derivedClaim<string[][]>(
                            null,
                            "NOT_PROVEN",
                            sourceRefs,
                        ),
                    edges,
                    reverseEdges,
                    failureReason:
                        "UNBOUND_REQUIRED_DEPENDENCY",
                };
            }

            edges.get(target)?.add(
                project.managedProjectId,
            );

            reverseEdges
                .get(project.managedProjectId)
                ?.add(target);
        }
    }

    const indegree =
        new Map(
            projectIds.map(
                (id) => [
                    id,
                    reverseEdges
                        .get(id)
                        ?.size ?? 0,
                ],
            ),
        );

    const layers: string[][] = [];
    const remaining =
        new Set(projectIds);

    while (remaining.size > 0) {
        const layer =
            [...remaining]
                .filter(
                    (id) =>
                        indegree.get(id)
                        === 0,
                )
                .sort();

        if (layer.length === 0) {
            return {
                claim:
                    derivedClaim<string[][]>(
                        null,
                        "CONFLICTED",
                        sourceRefs,
                    ),
                edges,
                reverseEdges,
                failureReason:
                    "DEPENDENCY_CYCLE",
            };
        }

        layers.push(layer);

        for (const id of layer) {
            remaining.delete(id);

            for (
                const dependent
                of edges.get(id) ?? []
            ) {
                indegree.set(
                    dependent,
                    (
                        indegree.get(
                            dependent,
                        ) ?? 0
                    ) - 1,
                );
            }
        }
    }

    return {
        claim:
            derivedClaim(
                layers,
                "CURRENT",
                sourceRefs,
            ),
        edges,
        reverseEdges,
        failureReason: null,
    };
}

function hasPath(
    edges:
        ReadonlyMap<string, Set<string>>,
    from: string,
    to: string,
): boolean {
    if (from === to) {
        return true;
    }

    const seen = new Set<string>();
    const stack = [from];

    while (stack.length > 0) {
        const current = stack.pop();

        if (
            current === undefined
            || seen.has(current)
        ) {
            continue;
        }

        seen.add(current);

        for (
            const next
            of edges.get(current) ?? []
        ) {
            if (next === to) {
                return true;
            }

            if (!seen.has(next)) {
                stack.push(next);
            }
        }
    }

    return false;
}

function transitivePredecessors(
    reverseEdges:
        ReadonlyMap<string, Set<string>>,
    id: string,
): string[] {
    const direct =
        reverseEdges.get(id)
        ?? new Set<string>();

    const seen = new Set<string>();
    const stack = [...direct];

    while (stack.length > 0) {
        const current = stack.pop();

        if (
            current === undefined
            || seen.has(current)
        ) {
            continue;
        }

        seen.add(current);

        for (
            const predecessor
            of reverseEdges.get(current)
                ?? []
        ) {
            if (!seen.has(predecessor)) {
                stack.push(predecessor);
            }
        }
    }

    return [...seen].sort();
}

function canonicalFailureCurrentness(
    values:
        readonly ParsedCanonical<unknown>[],
): Phase7Currentness {
    if (
        values.some(
            (value) =>
                value.currentness
                    === "CONFLICTED",
        )
    ) {
        return "CONFLICTED";
    }

    if (
        values.some(
            (value) =>
                value.currentness
                    === "STALE",
        )
    ) {
        return "STALE";
    }

    if (
        values.some(
            (value) =>
                value.currentness
                    === "UNBOUND",
        )
    ) {
        return "UNBOUND";
    }

    return "NOT_PROVEN";
}

function blockingClaim(
    dependency:
        ParsedCanonical<DependencySetV01>,
    blocker:
        ParsedCanonical<BlockerSetV01>,
    sourceRefs: readonly string[],
): Phase7Claim<"BLOCKED" | "CLEAR"> {
    const openRequired =
        dependency.currentness
            === "CURRENT"
        && dependency.value !== null
        && dependency.value
            .relationships
            .some(
                (relationship) =>
                    relationship.requirement
                        === "REQUIRED"
                    && relationship.state
                        === "OPEN",
            );

    const openBlocker =
        blocker.currentness
            === "CURRENT"
        && blocker.value !== null
        && blocker.value.blockers
            .some(
                (item) =>
                    item.state === "OPEN",
            );

    if (
        openRequired
        || openBlocker
    ) {
        return derivedClaim(
            "BLOCKED",
            "CURRENT",
            sourceRefs,
        );
    }

    if (
        dependency.currentness
            === "CURRENT"
        && dependency.value
            ?.completeness === "COMPLETE"
        && blocker.currentness
            === "CURRENT"
        && blocker.value
            ?.completeness === "COMPLETE"
    ) {
        return derivedClaim(
            "CLEAR",
            "CURRENT",
            sourceRefs,
        );
    }

    return derivedClaim<"BLOCKED" | "CLEAR">(
        null,
        canonicalFailureCurrentness([
            dependency,
            blocker,
        ]),
        sourceRefs,
    );
}

function waitingExternalClaim(
    dependency:
        ParsedCanonical<DependencySetV01>,
    sourceRefs: readonly string[],
): Phase7Claim<WaitingExternalDependency[]> {
    if (
        dependency.currentness
            !== "CURRENT"
        || !dependency.value
    ) {
        return derivedClaim<WaitingExternalDependency[]>(
            null,
            dependency.currentness,
            sourceRefs,
        );
    }

    const waiting =
        dependency.value.relationships
            .filter(
                (
                    relationship,
                ): relationship is DependencyRelationshipV01 & {
                    target: {
                        kind: "EXTERNAL";
                        externalId: string;
                        label: string;
                    };
                } =>
                    relationship.target.kind
                        === "EXTERNAL"
                    && relationship.requirement
                        === "REQUIRED"
                    && relationship.state
                        === "OPEN",
            )
            .map(
                (relationship) => ({
                    externalId:
                        relationship.target
                            .externalId,
                    label:
                        relationship.target
                            .label,
                    evidenceRef:
                        relationship.evidenceRef,
                }),
            )
            .sort(
                (left, right) =>
                    left.externalId
                        .localeCompare(
                            right.externalId,
                        ),
            );

    if (
        waiting.length > 0
        || dependency.value.completeness
            === "COMPLETE"
    ) {
        return derivedClaim(
            waiting,
            "CURRENT",
            sourceRefs,
        );
    }

    return derivedClaim<WaitingExternalDependency[]>(
        null,
        "NOT_PROVEN",
        sourceRefs,
    );
}

function reasonsForProject(
    priority:
        Phase7Claim<PortfolioPriority>,
    posture:
        Phase7Claim<ExecutionPosture>,
    dependency:
        ParsedCanonical<DependencySetV01>,
    graph: GraphResult,
): HumanDecisionReason[] {
    const reasons:
        HumanDecisionReason[] = [];

    if (
        priority.currentness
            === "CONFLICTED"
        || posture.currentness
            === "CONFLICTED"
    ) {
        reasons.push(
            "AUTHORITY_CONFLICT",
        );
    }

    if (
        priority.currentness
            !== "CURRENT"
    ) {
        reasons.push(
            "PRIORITY_MISSING",
        );
    }

    if (
        posture.currentness
            === "NOT_AVAILABLE"
        || posture.currentness
            === "NOT_PROVEN"
        || posture.currentness
            === "UNBOUND"
        || posture.currentness
            === "STALE"
    ) {
        reasons.push(
            "MISSING_REQUIRED_AUTHORITY",
        );
    }

    if (
        dependency.failure
            === "EXTERNAL_EVIDENCE_MISSING"
    ) {
        reasons.push(
            "EXTERNAL_EVIDENCE_MISSING",
        );
    } else if (
        dependency.failure
            === "UNTYPED"
    ) {
        reasons.push(
            "DEPENDENCY_UNTYPED",
        );
    } else if (
        dependency.failure
            === "PARTIAL"
    ) {
        reasons.push(
            "DEPENDENCY_EVIDENCE_INSUFFICIENT",
        );
    }

    if (
        graph.failureReason
            === "DEPENDENCY_CYCLE"
    ) {
        reasons.push(
            "DEPENDENCY_CYCLE",
        );
    }

    if (
        graph.failureReason
            === "UNBOUND_REQUIRED_DEPENDENCY"
    ) {
        reasons.push(
            "UNBOUND_REQUIRED_DEPENDENCY",
        );
    }

    if (
        graph.failureReason
            === "AUTHORITY_CONFLICT"
    ) {
        reasons.push(
            "AUTHORITY_CONFLICT",
        );
    }

    if (
        graph.failureReason
            === "DEPENDENCY_EVIDENCE_INSUFFICIENT"
    ) {
        reasons.push(
            "DEPENDENCY_EVIDENCE_INSUFFICIENT",
        );
    }

    if (
        graph.failureReason
            === "DEPENDENCY_UNTYPED"
    ) {
        reasons.push(
            "DEPENDENCY_UNTYPED",
        );
    }

    return uniqueSorted(
        reasons,
    ) as HumanDecisionReason[];
}

export function derivePortfolioExecutionOrderProjection(
    input: Phase7DerivationInput,
): Phase7PortfolioProjection {
    const projects =
        [...input.projects]
            .sort(
                (left, right) =>
                    left.managedProjectId
                        .localeCompare(
                            right.managedProjectId,
                        ),
            );

    const dependencies =
        new Map(
            projects.map(
                (project) => [
                    project.managedProjectId,
                    normalizeDependency(
                        project.dependency,
                    ),
                ],
            ),
        );

    const blockers =
        new Map(
            projects.map(
                (project) => [
                    project.managedProjectId,
                    normalizeBlocker(
                        project.blocker,
                    ),
                ],
            ),
        );

    const graph =
        graphFromDependencies(
            projects,
            dependencies,
        );

    const preliminary =
        new Map<
            string,
            {
                priority:
                    Phase7Claim<PortfolioPriority>;
                posture:
                    Phase7Claim<ExecutionPosture>;
                blocking:
                    Phase7Claim<"BLOCKED" | "CLEAR">;
                waitingExternal:
                    Phase7Claim<WaitingExternalDependency[]>;
            }
        >();

    for (const project of projects) {
        const dependency =
            dependencies.get(
                project.managedProjectId,
            );

        const blocker =
            blockers.get(
                project.managedProjectId,
            );

        if (!dependency || !blocker) {
            continue;
        }

        const canonicalSourceRefs =
            uniqueSorted([
                ...dependency.sourceRefs,
                ...blocker.sourceRefs,
            ]);

        preliminary.set(
            project.managedProjectId,
            {
                priority:
                    portfolioClaimForProject<PortfolioPriority>(
                        input.portfolioRead,
                        project.managedProjectId,
                        "portfolioPriority",
                    ),

                posture:
                    portfolioClaimForProject<ExecutionPosture>(
                        input.portfolioRead,
                        project.managedProjectId,
                        "executionPosture",
                    ),

                blocking:
                    blockingClaim(
                        dependency,
                        blocker,
                        canonicalSourceRefs,
                    ),

                waitingExternal:
                    waitingExternalClaim(
                        dependency,
                        dependency.sourceRefs,
                    ),
            },
        );
    }

    const outputProjects:
        Phase7ProjectProjection[] = [];

    for (const project of projects) {
        const dependency =
            dependencies.get(
                project.managedProjectId,
            );

        const values =
            preliminary.get(
                project.managedProjectId,
            );

        if (!dependency || !values) {
            continue;
        }

        const graphSourceRefs =
            graph.claim.sourceRefs;

        let mustHappenFirst:
            Phase7Claim<MustHappenFirstValue>;

        if (
            graph.claim.currentness
                === "CURRENT"
        ) {
            const direct =
                [...(
                    graph.reverseEdges.get(
                        project.managedProjectId,
                    ) ?? []
                )].sort();

            mustHappenFirst =
                derivedClaim(
                    {
                        direct,
                        transitive:
                            transitivePredecessors(
                                graph.reverseEdges,
                                project.managedProjectId,
                            ),
                    },
                    "CURRENT",
                    graphSourceRefs,
                );
        } else {
            mustHappenFirst =
                derivedClaim<MustHappenFirstValue>(
                    null,
                    graph.claim.currentness,
                    graphSourceRefs,
                );
        }

        let canRunInParallel:
            Phase7Claim<string[]>;

        if (
            graph.claim.currentness
                !== "CURRENT"
        ) {
            canRunInParallel =
                derivedClaim<string[]>(
                    null,
                    graph.claim.currentness,
                    graphSourceRefs,
                );
        } else if (
            values.posture.currentness
                !== "CURRENT"
            || values.blocking.currentness
                !== "CURRENT"
        ) {
            canRunInParallel =
                derivedClaim<string[]>(
                    null,
                    "NOT_PROVEN",
                    uniqueSorted([
                        ...graphSourceRefs,
                        ...values.posture
                            .sourceRefs,
                        ...values.blocking
                            .sourceRefs,
                    ]),
                );
        } else if (
            values.posture.value
                !== "CONTINUE"
            || values.blocking.value
                !== "CLEAR"
        ) {
            canRunInParallel =
                derivedClaim(
                    [],
                    "CURRENT",
                    uniqueSorted([
                        ...graphSourceRefs,
                        ...values.posture
                            .sourceRefs,
                        ...values.blocking
                            .sourceRefs,
                    ]),
                );
        } else {
            const parallel =
                projects
                    .filter(
                        (other) => {
                            if (
                                other.managedProjectId
                                === project.managedProjectId
                            ) {
                                return false;
                            }

                            const otherValues =
                                preliminary.get(
                                    other.managedProjectId,
                                );

                            if (
                                !otherValues
                                || otherValues
                                    .posture
                                    .currentness
                                    !== "CURRENT"
                                || otherValues
                                    .posture
                                    .value
                                    !== "CONTINUE"
                                || otherValues
                                    .blocking
                                    .currentness
                                    !== "CURRENT"
                                || otherValues
                                    .blocking
                                    .value
                                    !== "CLEAR"
                            ) {
                                return false;
                            }

                            return (
                                !hasPath(
                                    graph.edges,
                                    project.managedProjectId,
                                    other.managedProjectId,
                                )
                                && !hasPath(
                                    graph.edges,
                                    other.managedProjectId,
                                    project.managedProjectId,
                                )
                            );
                        },
                    )
                    .map(
                        (other) =>
                            other.managedProjectId,
                    )
                    .sort();

            canRunInParallel =
                derivedClaim(
                    parallel,
                    "CURRENT",
                    uniqueSorted([
                        ...graphSourceRefs,
                        ...values.posture
                            .sourceRefs,
                        ...values.blocking
                            .sourceRefs,
                    ]),
                );
        }

        const reasons =
            reasonsForProject(
                values.priority,
                values.posture,
                dependency,
                graph,
            );

        outputProjects.push({
            managedProjectId:
                project.managedProjectId,
            portfolioPriority:
                values.priority,
            executionPosture:
                values.posture,
            blockingStatus:
                values.blocking,
            mustHappenFirst,
            canRunInParallel,
            humanDecisionRequired:
                derivedClaim(
                    {
                        required:
                            reasons.length > 0,
                        reasons,
                    },
                    "CURRENT",
                    uniqueSorted([
                        ...values.priority
                            .sourceRefs,
                        ...values.posture
                            .sourceRefs,
                        ...dependency.sourceRefs,
                        ...graphSourceRefs,
                    ]),
                ),
            waitingForExternalDependency:
                values.waitingExternal,
        });
    }

    return {
        contractRef:
            PHASE7_EXECUTION_ORDER_CONTRACT_REF,
        authorityRead:
            headStatus(
                input.portfolioRead,
            ),
        dependencyOrder:
            graph.claim,
        projects:
            outputProjects,
    };
}
