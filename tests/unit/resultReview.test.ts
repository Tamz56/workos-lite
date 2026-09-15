import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import {
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { APPROVALS_SCHEMA_SQL } from "@/lib/approvals/approvalsSchema";
import { approveOperation } from "@/lib/approvals/service";
import { EXECUTION_SCHEMA_SQL } from "@/lib/execution/executionSchema";
import { OPERATIONS_SCHEMA_SQL } from "@/lib/operations/operationsSchema";
import { createOperation } from "@/lib/operations/service";
import type { AgentPrincipal } from "@/lib/agent-auth/agentAuthentication";
import {
    computeResultFingerprint,
    loadBoundCommittedAiResult,
} from "@/lib/result-review/resultBinding";
import {
    RESULT_REVIEW_SCHEMA_SQL,
} from "@/lib/result-review/schema";
import {
    ResultReviewError,
    prepareResultReview,
    recordHumanResultDecision,
} from "@/lib/result-review/service";

const { mockGetDb } = vi.hoisted(
    () => ({
        mockGetDb: vi.fn(),
    }),
);

vi.mock(
    "@/db/db",
    () => ({
        getDb: mockGetDb,
    }),
);

import {
    POST as decisionRoute,
} from "@/app/api/human/operations/[id]/result-decision/route";

const HUMAN = {
    actorId: "human-1",
    displayName: "Owner",
};

const T0 =
    "2026-09-15T10:00:00.000Z";

function createDb(
    withResultSchema = true,
): Database.Database {
    const db =
        new Database(":memory:");

    db.pragma(
        "foreign_keys = ON",
    );

    db.exec(
        OPERATIONS_SCHEMA_SQL,
    );

    db.exec(
        APPROVALS_SCHEMA_SQL,
    );

    db.exec(
        EXECUTION_SCHEMA_SQL,
    );

    if (withResultSchema) {
        db.exec(
            RESULT_REVIEW_SCHEMA_SQL,
        );
    }

    db.exec(`
        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE project_items (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);

    db.prepare(`
        INSERT INTO projects (
            id,
            slug,
            name,
            status,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        "p1",
        "project-a",
        "Project A",
        "planned",
        T0,
        T0,
    );

    return db;
}

function seedAi(
    db: Database.Database,
    overrides: {
        evidence?: string[];
        limitations?: string[];
    } = {},
) {
    const principal:
        AgentPrincipal = {
            actorId:
                "agent-test",
            actorName:
                "Test Agent",
            scopes: [
                "operations:request",
            ],
        };

    const op =
        createOperation(
            db,
            principal,
            {
                operationType:
                    "ai.read_analyze",
                targetType:
                    "project",
                targetRef:
                    "project-a",
                payload: {
                    analysisMode:
                        "summary_findings_evidence",
                    sourceLabel:
                        "Bounded Source",
                    sourceText:
                        "Alpha",
                },
            },
        );

    const approvalId =
        approveOperation(
            db,
            HUMAN,
            op.id,
            {
                expectedPreviewFingerprint:
                    op.previewFingerprint,
                expectedPayloadHash:
                    op.payloadHash,
                expectedContractVersion:
                    op.contractVersion,
            },
            {
                now: T0,
            },
        ).review.approval!.id;

    const attemptId =
        "opexec-ai";

    const persisted = {
        kind:
            "ai_read_analyze",
        result: {
            summary:
                "Summary",
            findings: [
                "Finding A",
            ],
            evidence:
                overrides.evidence
                ?? ["Evidence A"],
            limitations:
                overrides.limitations
                ?? ["Limitation A"],
        },
        executionMetadata: {
            operationId:
                op.id,
            approvalId,
            executionAttemptId:
                attemptId,
            contractVersion:
                "ai.read_analyze.v1",
            provider:
                "deepseek",
            model:
                "deepseek-v4-flash",
            startedAt:
                T0,
            finishedAt:
                T0,
        },
    };

    db.prepare(`
        INSERT INTO operation_execution_attempts (
            id,
            operation_id,
            approval_id,
            execution_kind,
            execution_status,
            trigger_actor_type,
            trigger_actor_id,
            trigger_display_name,
            executor_actor_type,
            executor_actor_id,
            started_at,
            finished_at,
            result_json,
            created_at,
            updated_at
        ) VALUES (
            ?, ?, ?,
            'ai_read_analyze',
            'committed',
            'human',
            'human-1',
            'Owner',
            'system',
            'system',
            ?, ?, ?, ?, ?
        )
    `).run(
        attemptId,
        op.id,
        approvalId,
        T0,
        T0,
        JSON.stringify(
            persisted,
        ),
        T0,
        T0,
    );

    return {
        op,
        approvalId,
        attemptId,
        persisted,
    };
}

function seedBacklog(
    db: Database.Database,
) {
    const principal:
        AgentPrincipal = {
            actorId:
                "agent-backlog",
            actorName:
                "Test Agent",
            scopes: [
                "operations:request",
            ],
        };

    return createOperation(
        db,
        principal,
        {
            operationType:
                "backlog.create",
            targetType:
                "project",
            targetRef:
                "project-a",
            payload: {
                title:
                    "Task",
            },
        },
    );
}

function errorCode(
    fn: () => unknown,
): string {
    try {
        fn();
        return "NO_ERROR";
    } catch (error) {
        return error
            instanceof ResultReviewError
            ? error.code
            : "UNKNOWN";
    }
}

describe(
    "ACC-P6 result binding",
    () => {
        it(
            "admits exactly a committed ai_read_analyze result",
            () => {
                const db =
                    createDb();

                const {
                    op,
                    attemptId,
                } =
                    seedAi(db);

                const result =
                    loadBoundCommittedAiResult(
                        db,
                        op.id,
                    );

                expect(
                    result
                        .binding
                        .executionAttemptId,
                ).toBe(
                    attemptId,
                );

                expect(
                    result
                        .binding
                        .executionKind,
                ).toBe(
                    "ai_read_analyze",
                );

                expect(
                    result
                        .binding
                        .executionStatus,
                ).toBe(
                    "committed",
                );

                expect(
                    result
                        .binding
                        .provider,
                ).toBe(
                    "deepseek",
                );

                expect(
                    result
                        .binding
                        .reviewContractVersion,
                ).toBe(
                    "ACC-P6-REVIEW-CONTRACT-v0.1",
                );

                expect(
                    result
                        .sourceResult
                        .summary,
                ).toBe(
                    "Summary",
                );

                db.close();
            },
        );

        it(
            "does not admit backlog_create",
            () => {
                const db =
                    createDb();

                const op =
                    seedBacklog(
                        db,
                    );

                expect(
                    () =>
                        loadBoundCommittedAiResult(
                            db,
                            op.id,
                        ),
                ).toThrow();

                db.close();
            },
        );

        it(
            "does not admit a non-committed ai_read_analyze result",
            () => {
                const db =
                    createDb();

                const {
                    op,
                    attemptId,
                } =
                    seedAi(db);

                db.prepare(`
                    UPDATE operation_execution_attempts
                    SET
                        execution_status='failed_before_write',
                        result_json=NULL,
                        failure_code='OPS_EXECUTION_AI_PROVIDER_FAILED',
                        safe_failure_message='safe failure'
                    WHERE id=?
                `).run(
                    attemptId,
                );

                expect(
                    () =>
                        loadBoundCommittedAiResult(
                            db,
                            op.id,
                        ),
                ).toThrow();

                db.close();
            },
        );

        it(
            "derives a deterministic canonical result fingerprint",
            () => {
                const a =
                    '{"kind":"x","result":{"b":2,"a":1}}';

                const b =
                    '{"result":{"a":1,"b":2},"kind":"x"}';

                const changed =
                    '{"result":{"a":1,"b":3},"kind":"x"}';

                expect(
                    computeResultFingerprint(
                        a,
                    ),
                ).toBe(
                    computeResultFingerprint(
                        b,
                    ),
                );

                expect(
                    computeResultFingerprint(
                        a,
                    ),
                ).not.toBe(
                    computeResultFingerprint(
                        changed,
                    ),
                );
            },
        );
    },
);

describe(
    "ACC-P6 Arbor advisory boundary",
    () => {
        it(
            "prepares advisory review without creating a Human decision",
            () => {
                const db =
                    createDb();

                const {
                    op,
                } =
                    seedAi(db);

                const review =
                    prepareResultReview(
                        db,
                        op.id,
                    );

                expect(
                    review
                        .arborReview
                        .reviewAuthority,
                ).toBe(
                    "ARBOR_ADVISORY",
                );

                expect(
                    review
                        .arborReview
                        .decisionAuthority,
                ).toBe(
                    "HUMAN",
                );

                expect(
                    review
                        .arborReview
                        .canonicalMutation,
                ).toBe(
                    "NONE",
                );

                expect(
                    review
                        .arborReview
                        .recommendation,
                ).toBe(
                    "NO_RECOMMENDATION",
                );

                expect(
                    review
                        .humanDecisionState,
                ).toBe(
                    "AWAITING_HUMAN_DECISION",
                );

                const count =
                    (
                        db.prepare(`
                            SELECT COUNT(*) AS count
                            FROM operation_result_decisions
                        `).get() as {
                            count: number;
                        }
                    ).count;

                expect(
                    count,
                ).toBe(0);

                db.close();
            },
        );

        it(
            "marks missing evidence as insufficient without auto-deciding",
            () => {
                const db =
                    createDb();

                const {
                    op,
                } =
                    seedAi(
                        db,
                        {
                            evidence:
                                [],
                            limitations:
                                [],
                        },
                    );

                const review =
                    prepareResultReview(
                        db,
                        op.id,
                    );

                expect(
                    review
                        .arborReview
                        .reviewStatus,
                ).toBe(
                    "INSUFFICIENT_EVIDENCE",
                );

                expect(
                    review
                        .arborReview
                        .recommendation,
                ).toBe(
                    "NO_RECOMMENDATION",
                );

                expect(
                    review.decision,
                ).toBeNull();

                db.close();
            },
        );
    },
);

describe(
    "ACC-P6 Human decision persistence",
    () => {
        it.each(
            [
                "ACCEPTED",
                "REJECTED",
                "RETURNED",
            ] as const,
        )(
            "persists %s against exact binding",
            (
                decision,
            ) => {
                const db =
                    createDb();

                const {
                    op,
                    approvalId,
                    attemptId,
                } =
                    seedAi(
                        db,
                    );

                const before =
                    prepareResultReview(
                        db,
                        op.id,
                    );

                const result =
                    recordHumanResultDecision(
                        db,
                        HUMAN,
                        op.id,
                        {
                            expectedResultFingerprint:
                                before
                                    .binding
                                    .resultFingerprint,
                            decision,
                            ...(decision
                                === "RETURNED"
                                ? {
                                      returnInstruction:
                                          "Collect follow-up evidence",
                                  }
                                : {
                                      reason:
                                          "Human reviewed evidence",
                                  }),
                        },
                        {
                            now: T0,
                            decisionId:
                                `rdec-${decision}`,
                        },
                    );

                expect(
                    result.replay,
                ).toBe(false);

                expect(
                    result
                        .review
                        .decision
                        ?.decision,
                ).toBe(
                    decision,
                );

                expect(
                    result
                        .review
                        .decision
                        ?.executionAttemptId,
                ).toBe(
                    attemptId,
                );

                expect(
                    result
                        .review
                        .decision
                        ?.approvalId,
                ).toBe(
                    approvalId,
                );

                expect(
                    result
                        .review
                        .decision
                        ?.resultFingerprint,
                ).toBe(
                    before
                        .binding
                        .resultFingerprint,
                );

                expect(
                    result
                        .review
                        .decision
                        ?.decidedByActorId,
                ).toBe(
                    "human-1",
                );

                expect(
                    result
                        .review
                        .decision
                        ?.decidedByDisplayName,
                ).toBe(
                    "Owner",
                );

                db.close();
            },
        );

        it(
            "fails closed on changed fingerprint",
            () => {
                const db =
                    createDb();

                const {
                    op,
                } =
                    seedAi(db);

                const review =
                    prepareResultReview(
                        db,
                        op.id,
                    );

                expect(
                    errorCode(
                        () =>
                            recordHumanResultDecision(
                                db,
                                HUMAN,
                                op.id,
                                {
                                    expectedResultFingerprint:
                                        `${review.binding.resultFingerprint}x`,
                                    decision:
                                        "ACCEPTED",
                                },
                            ),
                    ),
                ).toBe(
                    "RESULT_FINGERPRINT_MISMATCH",
                );

                const count =
                    (
                        db.prepare(`
                            SELECT COUNT(*) AS count
                            FROM operation_result_decisions
                        `).get() as {
                            count: number;
                        }
                    ).count;

                expect(
                    count,
                ).toBe(0);

                db.close();
            },
        );

        it(
            "replays identical final decision idempotently",
            () => {
                const db =
                    createDb();

                const {
                    op,
                } =
                    seedAi(db);

                const review =
                    prepareResultReview(
                        db,
                        op.id,
                    );

                const input = {
                    expectedResultFingerprint:
                        review
                            .binding
                            .resultFingerprint,
                    decision:
                        "ACCEPTED" as const,
                    reason:
                        "Reviewed",
                };

                const first =
                    recordHumanResultDecision(
                        db,
                        HUMAN,
                        op.id,
                        input,
                        {
                            now: T0,
                            decisionId:
                                "rdec-1",
                        },
                    );

                const second =
                    recordHumanResultDecision(
                        db,
                        HUMAN,
                        op.id,
                        input,
                        {
                            now:
                                "2026-09-15T11:00:00.000Z",
                            decisionId:
                                "rdec-2",
                        },
                    );

                expect(
                    first.replay,
                ).toBe(false);

                expect(
                    second.replay,
                ).toBe(true);

                expect(
                    second
                        .review
                        .decision
                        ?.id,
                ).toBe(
                    "rdec-1",
                );

                const count =
                    (
                        db.prepare(`
                            SELECT COUNT(*) AS count
                            FROM operation_result_decisions
                        `).get() as {
                            count: number;
                        }
                    ).count;

                expect(
                    count,
                ).toBe(1);

                db.close();
            },
        );

        it(
            "fails closed on conflicting second decision",
            () => {
                const db =
                    createDb();

                const {
                    op,
                } =
                    seedAi(db);

                const review =
                    prepareResultReview(
                        db,
                        op.id,
                    );

                recordHumanResultDecision(
                    db,
                    HUMAN,
                    op.id,
                    {
                        expectedResultFingerprint:
                            review
                                .binding
                                .resultFingerprint,
                        decision:
                            "ACCEPTED",
                    },
                    {
                        now: T0,
                        decisionId:
                            "rdec-1",
                    },
                );

                expect(
                    errorCode(
                        () =>
                            recordHumanResultDecision(
                                db,
                                HUMAN,
                                op.id,
                                {
                                    expectedResultFingerprint:
                                        review
                                            .binding
                                            .resultFingerprint,
                                    decision:
                                        "REJECTED",
                                },
                            ),
                    ),
                ).toBe(
                    "DECISION_ALREADY_FINAL",
                );

                db.close();
            },
        );

        it(
            "keeps durable decision immutable",
            () => {
                const db =
                    createDb();

                const {
                    op,
                } =
                    seedAi(db);

                const review =
                    prepareResultReview(
                        db,
                        op.id,
                    );

                recordHumanResultDecision(
                    db,
                    HUMAN,
                    op.id,
                    {
                        expectedResultFingerprint:
                            review
                                .binding
                                .resultFingerprint,
                        decision:
                            "ACCEPTED",
                    },
                    {
                        now: T0,
                        decisionId:
                            "rdec-1",
                    },
                );

                expect(
                    () =>
                        db.prepare(`
                            UPDATE operation_result_decisions
                            SET decision='REJECTED'
                            WHERE id='rdec-1'
                        `).run(),
                ).toThrow(
                    /immutable/,
                );

                db.close();
            },
        );

        it(
            "requires separately authorized schema before recording",
            () => {
                const db =
                    createDb(
                        false,
                    );

                const {
                    op,
                } =
                    seedAi(db);

                const review =
                    prepareResultReview(
                        db,
                        op.id,
                    );

                expect(
                    review
                        .decisionStoreReady,
                ).toBe(false);

                expect(
                    errorCode(
                        () =>
                            recordHumanResultDecision(
                                db,
                                HUMAN,
                                op.id,
                                {
                                    expectedResultFingerprint:
                                        review
                                            .binding
                                            .resultFingerprint,
                                    decision:
                                        "ACCEPTED",
                                },
                            ),
                    ),
                ).toBe(
                    "RESULT_REVIEW_SCHEMA_NOT_READY",
                );

                db.close();
            },
        );
    },
);

describe(
    "ACC-P6 zero downstream side effects",
    () => {
        it(
            "does not alter P5 attempt, create project items, or create another execution on RETURN",
            () => {
                const db =
                    createDb();

                const {
                    op,
                    attemptId,
                } =
                    seedAi(db);

                const review =
                    prepareResultReview(
                        db,
                        op.id,
                    );

                const executionBefore =
                    db.prepare(`
                        SELECT *
                        FROM operation_execution_attempts
                        WHERE id=?
                    `).get(
                        attemptId,
                    );

                const executionCountBefore =
                    (
                        db.prepare(`
                            SELECT COUNT(*) AS count
                            FROM operation_execution_attempts
                        `).get() as {
                            count: number;
                        }
                    ).count;

                const projectItemsBefore =
                    (
                        db.prepare(`
                            SELECT COUNT(*) AS count
                            FROM project_items
                        `).get() as {
                            count: number;
                        }
                    ).count;

                recordHumanResultDecision(
                    db,
                    HUMAN,
                    op.id,
                    {
                        expectedResultFingerprint:
                            review
                                .binding
                                .resultFingerprint,
                        decision:
                            "RETURNED",
                        returnInstruction:
                            "Follow up separately",
                    },
                    {
                        now: T0,
                        decisionId:
                            "rdec-return",
                    },
                );

                const executionAfter =
                    db.prepare(`
                        SELECT *
                        FROM operation_execution_attempts
                        WHERE id=?
                    `).get(
                        attemptId,
                    );

                expect(
                    executionAfter,
                ).toEqual(
                    executionBefore,
                );

                const executionCountAfter =
                    (
                        db.prepare(`
                            SELECT COUNT(*) AS count
                            FROM operation_execution_attempts
                        `).get() as {
                            count: number;
                        }
                    ).count;

                const projectItemsAfter =
                    (
                        db.prepare(`
                            SELECT COUNT(*) AS count
                            FROM project_items
                        `).get() as {
                            count: number;
                        }
                    ).count;

                expect(
                    executionCountAfter,
                ).toBe(
                    executionCountBefore,
                );

                expect(
                    projectItemsAfter,
                ).toBe(
                    projectItemsBefore,
                );

                db.close();
            },
        );

        it(
            "contains no provider, executor, Planner, coordination, or canonical-state writer dependency",
            () => {
                const source =
                    fs.readFileSync(
                        path.resolve(
                            process.cwd(),
                            "src/lib/result-review/service.ts",
                        ),
                        "utf8",
                    );

                expect(
                    source,
                ).not.toContain(
                    "@/lib/ai/",
                );

                expect(
                    source,
                ).not.toContain(
                    "executeOperation(",
                );

                expect(
                    source,
                ).not.toContain(
                    "project_items",
                );

                expect(
                    source,
                ).not.toContain(
                    "canonicalProjectState",
                );

                expect(
                    source,
                ).not.toContain(
                    "nextAuthoritativeAction",
                );

                expect(
                    source,
                ).not.toContain(
                    "@/lib/planner/",
                );

                expect(
                    source,
                ).not.toContain(
                    "coordination",
                );
            },
        );
    },
);

describe(
    "ACC-P6 Human API authorization",
    () => {
        it(
            "rejects unauthenticated Human decision request",
            async () => {
                const response =
                    await decisionRoute(
                        new NextRequest(
                            "http://localhost/api/human/operations/op-1/result-decision",
                            {
                                method:
                                    "POST",
                                headers: {
                                    origin:
                                        "http://localhost:3000",
                                    "content-type":
                                        "application/json",
                                },
                                body:
                                    JSON.stringify(
                                        {
                                            expectedResultFingerprint:
                                                "abc",
                                            decision:
                                                "ACCEPTED",
                                        },
                                    ),
                            },
                        ),
                        {
                            params:
                                Promise.resolve(
                                    {
                                        id:
                                            "op-1",
                                    },
                                ),
                        },
                    );

                expect(
                    response.status,
                ).toBe(401);

                const body =
                    await response.json();

                expect(
                    body.error.code,
                ).toBe(
                    "RESULT_REVIEW_AUTH_REQUIRED",
                );
            },
        );

        it(
            "persists explicit Human provenance fields in schema",
            () => {
                expect(
                    RESULT_REVIEW_SCHEMA_SQL,
                ).toContain(
                    "decided_by_actor_type",
                );

                expect(
                    RESULT_REVIEW_SCHEMA_SQL,
                ).toContain(
                    "decided_by_actor_id",
                );

                expect(
                    RESULT_REVIEW_SCHEMA_SQL,
                ).toContain(
                    "decided_by_display_name",
                );

                expect(
                    RESULT_REVIEW_SCHEMA_SQL,
                ).toContain(
                    "CHECK (decided_by_actor_type = 'human')",
                );
            },
        );
    },
);
