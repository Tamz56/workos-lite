import Database from "better-sqlite3";

import {
    describe,
    expect,
    it,
} from "vitest";

import {
    ensurePortfolioExecutionOrderSchema,
} from "@/lib/portfolio-execution-order/schema";

function createDb() {
    const db =
        new Database(":memory:");

    db.pragma(
        "foreign_keys = ON",
    );

    ensurePortfolioExecutionOrderSchema(
        db,
    );

    return db;
}

function insertVersion(
    db: Database.Database,
    id: string,
    scopeId = "MANAGED_PORTFOLIO",
    supersedes:
        string | null = null,
): void {
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
            ?,
            ?,
            'portfolio-execution-order.v0.1',
            '{}',
            ?,
            ?,
            'human_portfolio_decision',
            ?,
            ?,
            '2026-10-01T00:00:00Z',
            'human',
            '2026-10-01T00:00:00Z'
        )
    `).run(
        id,
        scopeId,
        supersedes,
        `AUTH-${id}`,
        `SOURCE-${id}`,
        `HASH-${id}`,
    );
}

describe(
    "Portfolio Execution Order schema",
    () => {
        it(
            "T01 creates exactly the two proposed authority tables in a disposable DB",
            () => {
                const db =
                    createDb();

                const rows =
                    db.prepare(`
                        SELECT name
                        FROM sqlite_master
                        WHERE type = 'table'
                          AND name LIKE 'portfolio_execution_order_%'
                        ORDER BY name
                    `).all() as Array<{
                        name: string;
                    }>;

                expect(
                    rows.map(
                        (row) =>
                            row.name,
                    ),
                ).toEqual([
                    "portfolio_execution_order_heads",
                    "portfolio_execution_order_versions",
                ]);

                db.close();
            },
        );

        it(
            "T02 permits exactly one selected MANAGED_PORTFOLIO head",
            () => {
                const db =
                    createDb();

                insertVersion(
                    db,
                    "v1",
                );

                db.prepare(`
                    INSERT INTO portfolio_execution_order_heads (
                        scope_id,
                        current_version_id,
                        selected_at,
                        selected_by,
                        selection_authority_ref
                    ) VALUES (
                        'MANAGED_PORTFOLIO',
                        'v1',
                        '2026-10-01T00:10:00Z',
                        'human',
                        'HEAD-AUTH-1'
                    )
                `).run();

                expect(
                    () =>
                        db.prepare(`
                            INSERT INTO portfolio_execution_order_heads (
                                scope_id,
                                current_version_id,
                                selected_at,
                                selected_by,
                                selection_authority_ref
                            ) VALUES (
                                'MANAGED_PORTFOLIO',
                                'v1',
                                '2026-10-01T00:20:00Z',
                                'human',
                                'HEAD-AUTH-2'
                            )
                        `).run(),
                ).toThrow();

                db.close();
            },
        );

        it(
            "T03 keeps version rows immutable",
            () => {
                const db =
                    createDb();

                insertVersion(
                    db,
                    "v1",
                );

                expect(
                    () =>
                        db.prepare(`
                            UPDATE portfolio_execution_order_versions
                            SET authority_ref = 'CHANGED'
                            WHERE id = 'v1'
                        `).run(),
                ).toThrow(
                    /immutable/,
                );

                expect(
                    () =>
                        db.prepare(`
                            DELETE FROM portfolio_execution_order_versions
                            WHERE id = 'v1'
                        `).run(),
                ).toThrow(
                    /immutable/,
                );

                db.close();
            },
        );

        it(
            "T04 enforces one direct successor and same-scope predecessor integrity",
            () => {
                const db =
                    createDb();

                insertVersion(
                    db,
                    "v1",
                );

                insertVersion(
                    db,
                    "v2",
                    "MANAGED_PORTFOLIO",
                    "v1",
                );

                expect(
                    () =>
                        insertVersion(
                            db,
                            "v3",
                            "MANAGED_PORTFOLIO",
                            "v1",
                        ),
                ).toThrow();

                expect(
                    () =>
                        insertVersion(
                            db,
                            "other-v1",
                            "OTHER_SCOPE",
                            "v2",
                        ),
                ).toThrow(
                    /predecessor\/scope mismatch/,
                );

                db.close();
            },
        );
    },
);
