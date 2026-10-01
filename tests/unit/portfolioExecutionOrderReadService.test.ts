import Database from "better-sqlite3";

import {
    describe,
    expect,
    it,
} from "vitest";

import {
    ensurePortfolioExecutionOrderSchema,
} from "@/lib/portfolio-execution-order/schema";

import {
    computeManagedProjectSetHash,
    readPortfolioExecutionOrder,
} from "@/lib/portfolio-execution-order/readService";

import {
    PORTFOLIO_EXECUTION_ORDER_SCHEMA_VERSION,
    PORTFOLIO_EXECUTION_ORDER_SCOPE,
    type PortfolioExecutionOrderAssignmentV1,
} from "@/lib/portfolio-execution-order/types";

const DIRECTORY_REF =
    "MANAGED PROJECT DIRECTORY v0.1 / snapshot-2026-10-01";

function createDb(
    withSchema = true,
) {
    const db =
        new Database(":memory:");

    db.pragma(
        "foreign_keys = ON",
    );

    if (withSchema) {
        ensurePortfolioExecutionOrderSchema(
            db,
        );
    }

    return db;
}

function stateJson(
    ids:
        readonly string[],
    assignments:
        PortfolioExecutionOrderAssignmentV1[],
    overrides:
        Record<string, unknown> = {},
): string {
    return JSON.stringify({
        schemaVersion:
            PORTFOLIO_EXECUTION_ORDER_SCHEMA_VERSION,
        scope:
            PORTFOLIO_EXECUTION_ORDER_SCOPE,
        managedDirectoryRef:
            DIRECTORY_REF,
        managedProjectSetHash:
            computeManagedProjectSetHash(
                ids,
            ),
        authorityRef:
            "AUTH-PORTFOLIO-1",
        sourceRef:
            "HUMAN-DECISION-1",
        decidedAt:
            "2026-10-01T00:00:00Z",
        reviewedAt:
            "2026-10-01T00:00:00Z",
        reviewBy:
            "human",
        assignments,
        ...overrides,
    });
}

function assignment(
    managedProjectId: string,
    priority:
        "PRIMARY"
        | "SECONDARY"
        | "BACKGROUND" =
            "PRIMARY",
    posture:
        "CONTINUE"
        | "HOLD" =
            "CONTINUE",
): PortfolioExecutionOrderAssignmentV1 {
    return {
        managedProjectId,
        portfolioPriority:
            priority,
        executionPosture:
            posture,
    };
}

function insertVersion(
    db: Database.Database,
    options: {
        id?: string;
        scopeId?: string;
        supersedes?: string | null;
        schemaVersion?: string;
        payload: string;
        authorityRef?: string;
        sourceType?: string;
        sourceRef?: string;
        sourceHash?: string;
        issuedAt?: string;
        issuedBy?: string;
        createdAt?: string;
    },
): void {
    const row = {
        id:
            options.id
            ?? "v1",
        scope_id:
            options.scopeId
            ?? PORTFOLIO_EXECUTION_ORDER_SCOPE,
        schema_version:
            options.schemaVersion
            ?? PORTFOLIO_EXECUTION_ORDER_SCHEMA_VERSION,
        state_payload_json:
            options.payload,
        supersedes_version_id:
            options.supersedes
            ?? null,
        authority_ref:
            options.authorityRef
            ?? "AUTH-PORTFOLIO-1",
        source_type:
            options.sourceType
            ?? "human_portfolio_decision",
        source_ref:
            options.sourceRef
            ?? "HUMAN-DECISION-1",
        source_hash:
            options.sourceHash
            ?? "SOURCE-HASH-1",
        issued_at:
            options.issuedAt
            ?? "2026-10-01T00:00:00Z",
        issued_by:
            options.issuedBy
            ?? "human",
        created_at:
            options.createdAt
            ?? "2026-10-01T00:00:00Z",
    };

    db.prepare(`
        INSERT INTO portfolio_execution_order_versions (
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
        ) VALUES (
            @id,
            @scope_id,
            @schema_version,
            @state_payload_json,
            @supersedes_version_id,
            @authority_ref,
            @source_type,
            @source_ref,
            @source_hash,
            @issued_at,
            @issued_by,
            @created_at
        )
    `).run(row);
}

function selectHead(
    db: Database.Database,
    versionId = "v1",
    overrides: {
        scopeId?: string;
        selectedAt?: string;
        selectedBy?: string;
        selectionAuthorityRef?: string;
    } = {},
): void {
    db.prepare(`
        INSERT INTO portfolio_execution_order_heads (
            scope_id,
            current_version_id,
            selected_at,
            selected_by,
            selection_authority_ref
        ) VALUES (?, ?, ?, ?, ?)
    `).run(
        overrides.scopeId
            ?? PORTFOLIO_EXECUTION_ORDER_SCOPE,
        versionId,
        overrides.selectedAt
            ?? "2026-10-01T00:10:00Z",
        overrides.selectedBy
            ?? "human",
        overrides.selectionAuthorityRef
            ?? "HEAD-AUTH-1",
    );
}

function logicalSnapshot(
    db: Database.Database,
): string {
    const schema =
        db.prepare(`
            SELECT
                type,
                name,
                tbl_name,
                COALESCE(sql, '') AS sql
            FROM sqlite_master
            WHERE name NOT LIKE 'sqlite_%'
            ORDER BY type, name, tbl_name
        `).all();

    const tableNames =
        (
            db.prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                  AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `).all() as Array<{
                name: string;
            }>
        ).map(
            (row) => row.name,
        );

    const data =
        Object.fromEntries(
            tableNames.map(
                (name) => {
                    const quoted =
                        `"${name.replaceAll(
                            '"',
                            '""',
                        )}"`;

                    return [
                        name,
                        db.prepare(
                            `SELECT * FROM ${quoted}`,
                        ).all(),
                    ];
                },
            ),
        );

    return JSON.stringify({
        schema,
        data,
    });
}

describe(
    "Portfolio Execution Order read foundation",
    () => {
        it(
            "T05 managedProjectSetHash is invariant to input ordering",
            () => {
                expect(
                    computeManagedProjectSetHash([
                        "P03",
                        "P01",
                        "P02",
                    ]),
                ).toBe(
                    computeManagedProjectSetHash([
                        "P02",
                        "P03",
                        "P01",
                    ]),
                );
            },
        );

        it(
            "T06 membership change changes managedProjectSetHash",
            () => {
                expect(
                    computeManagedProjectSetHash([
                        "P01",
                        "P02",
                    ]),
                ).not.toBe(
                    computeManagedProjectSetHash([
                        "P01",
                        "P02",
                        "P03",
                    ]),
                );
            },
        );

        it(
            "T07 duplicate assignments fail closed",
            () => {
                const db =
                    createDb();

                const ids = [
                    "P01",
                    "P02",
                ];

                insertVersion(
                    db,
                    {
                        payload:
                            stateJson(
                                ids,
                                [
                                    assignment(
                                        "P01",
                                    ),
                                    assignment(
                                        "P01",
                                        "SECONDARY",
                                    ),
                                ],
                            ),
                    },
                );

                selectHead(db);

                expect(
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ids,
                        },
                    ),
                ).toEqual({
                    status:
                        "NOT_PROVEN",
                    reason:
                        "DUPLICATE_ASSIGNMENT",
                });

                db.close();
            },
        );

        it(
            "T08 outside-set assignments fail closed",
            () => {
                const db =
                    createDb();

                const ids = [
                    "P01",
                    "P02",
                ];

                insertVersion(
                    db,
                    {
                        payload:
                            stateJson(
                                ids,
                                [
                                    assignment(
                                        "P01",
                                    ),
                                    assignment(
                                        "P99",
                                    ),
                                ],
                            ),
                    },
                );

                selectHead(db);

                expect(
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ids,
                        },
                    ),
                ).toEqual({
                    status:
                        "NOT_PROVEN",
                    reason:
                        "OUTSIDE_MANAGED_SET",
                });

                db.close();
            },
        );

        it(
            "T09 missing assignment remains valid but exposes per-project NOT_PROVEN coverage",
            () => {
                const db =
                    createDb();

                const ids = [
                    "P01",
                    "P02",
                ];

                insertVersion(
                    db,
                    {
                        payload:
                            stateJson(
                                ids,
                                [
                                    assignment(
                                        "P01",
                                    ),
                                ],
                            ),
                    },
                );

                selectHead(db);

                const result =
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ids,
                        },
                    );

                expect(
                    result.status,
                ).toBe(
                    "CURRENT",
                );

                if (
                    result.status
                    === "CURRENT"
                ) {
                    expect(
                        result.coverage,
                    ).toEqual([
                        {
                            managedProjectId:
                                "P01",
                            assignmentPresent:
                                true,
                            portfolioPriority: {
                                status:
                                    "KNOWN",
                                value:
                                    "PRIMARY",
                            },
                            executionPosture: {
                                status:
                                    "KNOWN",
                                value:
                                    "CONTINUE",
                            },
                        },
                        {
                            managedProjectId:
                                "P02",
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
                        },
                    ]);
                }

                db.close();
            },
        );

        it(
            "T10 absent authority tables return NOT_AVAILABLE without schema creation",
            () => {
                const db =
                    createDb(false);

                expect(
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ["P01"],
                        },
                    ),
                ).toEqual({
                    status:
                        "NOT_AVAILABLE",
                    reason:
                        "AUTHORITY_TABLES_ABSENT",
                });

                const names =
                    (
                        db.prepare(`
                            SELECT name
                            FROM sqlite_master
                            WHERE type = 'table'
                              AND name LIKE 'portfolio_execution_order_%'
                            ORDER BY name
                        `).all() as Array<{
                            name: string;
                        }>
                    ).map(
                        (row) =>
                            row.name,
                    );

                expect(
                    names,
                ).toEqual([]);

                db.close();
            },
        );

        it(
            "T11 present tables without a selected head return NOT_PROVEN",
            () => {
                const db =
                    createDb();

                expect(
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ["P01"],
                        },
                    ),
                ).toEqual({
                    status:
                        "NOT_PROVEN",
                    reason:
                        "NO_HEAD",
                });

                db.close();
            },
        );

        it(
            "T12 valid selected Human head is CURRENT",
            () => {
                const db =
                    createDb();

                const ids = [
                    "P01",
                    "P02",
                ];

                insertVersion(
                    db,
                    {
                        payload:
                            stateJson(
                                ids,
                                [
                                    assignment(
                                        "P01",
                                    ),
                                    assignment(
                                        "P02",
                                        "SECONDARY",
                                        "HOLD",
                                    ),
                                ],
                            ),
                    },
                );

                selectHead(db);

                const result =
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ids,
                        },
                    );

                expect(
                    result.status,
                ).toBe(
                    "CURRENT",
                );

                if (
                    result.status
                    === "CURRENT"
                ) {
                    expect(
                        result.state
                            .authorityRef,
                    ).toBe(
                        "AUTH-PORTFOLIO-1",
                    );

                    expect(
                        result.head
                            .selected_by,
                    ).toBe(
                        "human",
                    );
                }

                db.close();
            },
        );

        it(
            "T13 historical versions remain history and do not create CONFLICTED",
            () => {
                const db =
                    createDb();

                const ids = [
                    "P01",
                ];

                const payload =
                    stateJson(
                        ids,
                        [
                            assignment(
                                "P01",
                            ),
                        ],
                    );

                insertVersion(
                    db,
                    {
                        id:
                            "v1",
                        payload,
                    },
                );

                insertVersion(
                    db,
                    {
                        id:
                            "v2",
                        supersedes:
                            "v1",
                        payload,
                    },
                );

                selectHead(
                    db,
                    "v2",
                );

                expect(
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ids,
                        },
                    ).status,
                ).toBe(
                    "CURRENT",
                );

                db.close();
            },
        );

        it(
            "T14 managed membership hash drift returns STALE without carry-forward",
            () => {
                const db =
                    createDb();

                insertVersion(
                    db,
                    {
                        payload:
                            stateJson(
                                ["P01"],
                                [
                                    assignment(
                                        "P01",
                                    ),
                                ],
                            ),
                    },
                );

                selectHead(db);

                const result =
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                [
                                    "P01",
                                    "P02",
                                ],
                        },
                    );

                expect(
                    result,
                ).toMatchObject({
                    status:
                        "STALE",
                    reason:
                        "MANAGED_PROJECT_SET_DRIFT",
                });

                if (
                    result.status
                    === "STALE"
                ) {
                    expect(
                        result.coverage.find(
                            (item) =>
                                item
                                    .managedProjectId
                                === "P02",
                        ),
                    ).toMatchObject({
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
                    });
                }

                db.close();
            },
        );

        it(
            "A1 directory snapshot provenance drift is STALE",
            () => {
                const db =
                    createDb();

                const ids = [
                    "P01",
                ];

                insertVersion(
                    db,
                    {
                        payload:
                            stateJson(
                                ids,
                                [
                                    assignment(
                                        "P01",
                                    ),
                                ],
                                {
                                    managedDirectoryRef:
                                        "OLD-DIRECTORY-SNAPSHOT",
                                },
                            ),
                    },
                );

                selectHead(db);

                expect(
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ids,
                        },
                    ),
                ).toMatchObject({
                    status:
                        "STALE",
                    reason:
                        "MANAGED_DIRECTORY_REF_DRIFT",
                });

                db.close();
            },
        );

        it(
            "T15 invalid head/version scope binding returns CONFLICTED",
            () => {
                const db =
                    createDb();

                const ids = [
                    "P01",
                ];

                insertVersion(
                    db,
                    {
                        id:
                            "other-v1",
                        scopeId:
                            "OTHER_SCOPE",
                        payload:
                            stateJson(
                                ids,
                                [
                                    assignment(
                                        "P01",
                                    ),
                                ],
                            ),
                    },
                );

                db.exec(`
                    DROP TRIGGER
                    trg_portfolio_execution_order_heads_scope_binding_insert;
                `);

                db.prepare(`
                    INSERT INTO portfolio_execution_order_heads (
                        scope_id,
                        current_version_id,
                        selected_at,
                        selected_by,
                        selection_authority_ref
                    ) VALUES (
                        'MANAGED_PORTFOLIO',
                        'other-v1',
                        '2026-10-01T00:10:00Z',
                        'human',
                        'HEAD-AUTH-1'
                    )
                `).run();

                expect(
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ids,
                        },
                    ),
                ).toMatchObject({
                    status:
                        "CONFLICTED",
                    reason:
                        "HEAD_VERSION_SCOPE_MISMATCH",
                });

                db.close();
            },
        );

        it(
            "T16 missing or invalid Human provenance returns NOT_PROVEN",
            () => {
                const db =
                    createDb();

                const ids = [
                    "P01",
                ];

                insertVersion(
                    db,
                    {
                        payload:
                            stateJson(
                                ids,
                                [
                                    assignment(
                                        "P01",
                                    ),
                                ],
                            ),
                        sourceType:
                            "registry",
                    },
                );

                selectHead(db);

                expect(
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ids,
                        },
                    ),
                ).toEqual({
                    status:
                        "NOT_PROVEN",
                    reason:
                        "MISSING_PROVENANCE",
                });

                db.close();
            },
        );

        it(
            "T17 Registry Planner and Project-State data never become fallback authority",
            () => {
                const db =
                    createDb(false);

                db.exec(`
                    CREATE TABLE projects (
                        id TEXT PRIMARY KEY,
                        priority TEXT
                    );

                    CREATE TABLE planner_items (
                        id TEXT PRIMARY KEY,
                        priority TEXT,
                        planner_status TEXT
                    );

                    CREATE TABLE project_state_versions (
                        id TEXT PRIMARY KEY,
                        state_payload_json TEXT
                    );

                    INSERT INTO projects
                    VALUES ('P01', 'critical');

                    INSERT INTO planner_items
                    VALUES (
                        'P01',
                        'critical',
                        'doing'
                    );

                    INSERT INTO project_state_versions
                    VALUES (
                        'state-1',
                        '{"priority":"PRIMARY"}'
                    );
                `);

                expect(
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ["P01"],
                        },
                    ),
                ).toEqual({
                    status:
                        "NOT_AVAILABLE",
                    reason:
                        "AUTHORITY_TABLES_ABSENT",
                });

                db.close();
            },
        );

        it(
            "T18 read operation produces logical DB delta zero",
            () => {
                const db =
                    createDb();

                const ids = [
                    "P01",
                ];

                insertVersion(
                    db,
                    {
                        payload:
                            stateJson(
                                ids,
                                [
                                    assignment(
                                        "P01",
                                    ),
                                ],
                            ),
                    },
                );

                selectHead(db);

                const before =
                    logicalSnapshot(db);

                expect(
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ids,
                        },
                    ).status,
                ).toBe(
                    "CURRENT",
                );

                const after =
                    logicalSnapshot(db);

                expect(
                    after,
                ).toBe(
                    before,
                );

                db.close();
            },
        );

        it(
            "malformed selected payload fails closed as NOT_PROVEN",
            () => {
                const db =
                    createDb();

                insertVersion(
                    db,
                    {
                        payload:
                            "{",
                    },
                );

                selectHead(db);

                expect(
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                ["P01"],
                        },
                    ),
                ).toEqual({
                    status:
                        "NOT_PROVEN",
                    reason:
                        "MALFORMED_PAYLOAD",
                });

                db.close();
            },
        );

        it(
            "duplicate current managed IDs fail closed before authority evaluation",
            () => {
                const db =
                    createDb();

                expect(
                    readPortfolioExecutionOrder(
                        db,
                        {
                            managedDirectoryRef:
                                DIRECTORY_REF,
                            currentManagedProjectIds:
                                [
                                    "P01",
                                    "P01",
                                ],
                        },
                    ),
                ).toEqual({
                    status:
                        "NOT_PROVEN",
                    reason:
                        "CURRENT_MANAGED_SET_INVALID",
                });

                db.close();
            },
        );
    },
);
