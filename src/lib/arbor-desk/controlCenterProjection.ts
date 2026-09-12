import type Database from "better-sqlite3";

export const CONTROL_CENTER_PROJECTION_SCHEMA_VERSION = "ACC-PPC-v0.1" as const;

type Availability = "AVAILABLE" | "NOT_AVAILABLE" | "UNKNOWN";
type Currentness = "CURRENT_WITHIN_SOURCE" | "NOT_PROVEN";

type SourceDescriptor = {
    authority: string;
    availability: Availability;
    currentness: Currentness;
};

type ProjectRow = {
    id: string;
    name: string;
    slug: string;
    status: string;
    category: string | null;
    registry_status: string | null;
    priority: string | null;
    current_goal: string | null;
    progress_stage: string | null;
    next_action: string | null;
    cadence: string | null;
    risk_or_blocked_by: string | null;
};

type PlannerDayRow = {
    id: string;
    plan_date: string;
    main_outcome: string | null;
    daily_capacity_minutes: number | null;
    energy_level: string | null;
    status: string;
};

type PlannerItemRow = {
    id: string;
    source_type: string;
    source_id: string;
    work_mode: string;
    priority: string;
    planner_status: string;
    is_main_task: number;
    source_project_id: string | null;
};

function descriptor(
    authority: string,
    availability: Availability,
    currentness: Currentness,
): SourceDescriptor {
    return { authority, availability, currentness };
}

function readPlanner(db: Database.Database, date: string) {
    try {
        const day = db.prepare(`
            SELECT id, plan_date, main_outcome, daily_capacity_minutes,
                   energy_level, status
            FROM planner_days
            WHERE plan_date = ?
        `).get(date) as PlannerDayRow | undefined;

        if (!day) {
            return {
                source: descriptor("PLANNER_STATE", "NOT_AVAILABLE", "NOT_PROVEN"),
                day: null,
                items: [] as PlannerItemRow[],
            };
        }

        const items = db.prepare(`
            SELECT
                pi.id,
                pi.source_type,
                pi.source_id,
                pi.work_mode,
                pi.priority,
                pi.planner_status,
                pi.is_main_task,
                CASE
                    WHEN pi.source_type = 'project_item'
                    THEN pitem.project_id
                    ELSE NULL
                END AS source_project_id
            FROM planner_items pi
            LEFT JOIN project_items pitem
              ON pi.source_type = 'project_item'
             AND pitem.id = pi.source_id
            WHERE pi.planner_day_id = ?
            ORDER BY pi.planned_order ASC, pi.created_at ASC
        `).all(day.id) as PlannerItemRow[];

        return {
            source: descriptor("PLANNER_STATE", "AVAILABLE", "CURRENT_WITHIN_SOURCE"),
            day,
            items,
        };
    } catch {
        return {
            source: descriptor("PLANNER_STATE", "UNKNOWN", "NOT_PROVEN"),
            day: null,
            items: [] as PlannerItemRow[],
        };
    }
}

export function buildControlCenterProjection(
    db: Database.Database,
    date: string,
) {
    const registryRows = db.prepare(`
        SELECT
            id,
            name,
            slug,
            status,
            category,
            registry_status,
            priority,
            current_goal,
            progress_stage,
            next_action,
            cadence,
            risk_or_blocked_by
        FROM projects
        ORDER BY created_at DESC
    `).all() as ProjectRow[];

    const planner = readPlanner(db, date);

    return {
        schemaVersion: CONTROL_CENTER_PROJECTION_SCHEMA_VERSION,
        asOfDate: date,

        sources: {
            projectRegistry: descriptor(
                "REGISTRY_METADATA",
                "AVAILABLE",
                "CURRENT_WITHIN_SOURCE",
            ),
            planner: planner.source,
            coordination: descriptor(
                "COORDINATION",
                "NOT_AVAILABLE",
                "NOT_PROVEN",
            ),
            projectMemory: descriptor(
                "PROJECT_MEMORY",
                "NOT_AVAILABLE",
                "NOT_PROVEN",
            ),
            executionEvidence: descriptor(
                "EXECUTION_EVIDENCE",
                "NOT_AVAILABLE",
                "NOT_PROVEN",
            ),
        },

        projects: registryRows.map((row) => ({
            identity: {
                id: row.id,
                name: row.name,
                slug: row.slug,
            },

            registryMetadata: {
                authority: "REGISTRY_METADATA",
                currentness: "CURRENT_WITHIN_SOURCE",
                status: row.status,
                category: row.category,
                registryStatus: row.registry_status,
                priority: row.priority,
                currentGoal: row.current_goal,
                progressStage: row.progress_stage,
                nextAction: row.next_action,
                cadence: row.cadence,
                riskOrBlockedBy: row.risk_or_blocked_by,
            },

            canonicalProjectState: {
                value: null,
                authority: "NONE",
                currentness: "NOT_PROVEN",
            },

            nextAuthoritativeAction: {
                value: null,
                authority: "NONE",
                currentness: "NOT_PROVEN",
            },
        })),

        plannerState: {
            authority: "PLANNER_STATE",
            currentness: planner.source.currentness,
            availability: planner.source.availability,
            day: planner.day,
            items: planner.items,
        },
    };
}
