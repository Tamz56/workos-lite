import type {
    Project,
    ProjectPriority,
    ProjectProgressStage,
    ProjectRegistryMetadata,
    ProjectRegistryStatus,
} from "@/lib/types";

export const PROJECT_REGISTRY_STATUSES = [
    "idea",
    "planning",
    "active",
    "in_development",
    "testing",
    "in_use",
    "maintenance",
    "paused",
    "completed",
] as const satisfies readonly ProjectRegistryStatus[];

export const PROJECT_PRIORITIES = [
    "high",
    "medium",
    "low",
    "none",
] as const satisfies readonly ProjectPriority[];

export type ProjectRegistryValueSource =
    | "database"
    | "legacy_local"
    | "ui_default"
    | "canonical_null";

export type ProjectRegistryFieldSources = Record<
    keyof ProjectRegistryMetadata,
    ProjectRegistryValueSource
>;

export interface ResolvedProjectRegistryMetadata {
    metadata: ProjectRegistryMetadata;
    sources: ProjectRegistryFieldSources;
}

export type ProjectRegistryUiDefaults = Omit<ProjectRegistryMetadata, "lastUpdated">;

export interface ProjectRegistryUpdatePayload {
    name: string;
    status: Project["status"];
    category: string | null;
    registry_status: ProjectRegistryStatus;
    priority: ProjectPriority;
    current_goal: string | null;
    progress_stage: string | null;
    next_action: string | null;
    cadence: string | null;
    risk_or_blocked_by: string | null;
}

const PROJECT_REGISTRY_COLUMNS = [
    "category",
    "registry_status",
    "priority",
    "current_goal",
    "progress_stage",
    "next_action",
    "cadence",
    "risk_or_blocked_by",
    "metadata_updated_at",
] as const;

type RegistryColumn = (typeof PROJECT_REGISTRY_COLUMNS)[number];

const REGISTRY_COLUMN_DEFINITIONS: Record<RegistryColumn, string> = {
    category: "TEXT NULL",
    registry_status: "TEXT NULL",
    priority: "TEXT NULL",
    current_goal: "TEXT NULL",
    progress_stage: "TEXT NULL",
    next_action: "TEXT NULL",
    cadence: "TEXT NULL",
    risk_or_blocked_by: "TEXT NULL",
    metadata_updated_at: "TEXT NULL",
};

interface ProjectSchemaDatabase {
    prepare(sql: string): {
        all(): unknown[];
    };
    exec(sql: string): unknown;
}

export function ensureProjectRegistryMetadataColumns(
    database: ProjectSchemaDatabase,
    log: (message: string) => void = console.log,
): string[] {
    const existing = new Set(
        (database.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>)
            .map((column) => column.name),
    );
    const added: string[] = [];

    try {
        for (const column of PROJECT_REGISTRY_COLUMNS) {
            if (existing.has(column)) continue;
            database.exec(
                `ALTER TABLE projects ADD COLUMN ${column} ${REGISTRY_COLUMN_DEFINITIONS[column]}`,
            );
            added.push(column);
        }
    } catch (error) {
        log("Project registry metadata migration error");
        throw error;
    }

    log(
        added.length > 0
            ? `Project registry metadata migration applied: ${added.join(", ")}`
            : "Project registry metadata migration already present",
    );
    return added;
}

export function coreStatusForRegistryStatus(
    status: ProjectRegistryStatus,
): Project["status"] {
    if (status === "idea") return "inbox";
    if (status === "completed") return "done";
    return "planned";
}

export function registryStatusForCoreStatus(
    status: Project["status"],
): ProjectRegistryStatus {
    if (status === "inbox") return "idea";
    if (status === "done") return "completed";
    return "planning";
}

export function getProjectRegistryUiDefaults(
    project: Pick<Project, "status" | "updated_at">,
    overrides: Partial<ProjectRegistryUiDefaults> = {},
): ProjectRegistryUiDefaults {
    return {
        category: "",
        status: registryStatusForCoreStatus(project.status),
        priority: "none",
        currentGoal: "",
        progressStage: project.status === "done" ? "In Use" : "Concept",
        nextAction: "",
        cadence: "",
        riskOrBlockedBy: "",
        ...overrides,
    };
}

function hasLegacyText(value: string | undefined): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

export function resolveProjectRegistryMetadata(
    project: Project,
    legacy: ProjectRegistryMetadata | undefined,
    defaults: ProjectRegistryUiDefaults = getProjectRegistryUiDefaults(project),
): ResolvedProjectRegistryMetadata {
    const canonical = project.metadata_updated_at !== null;

    function resolveText(
        dbValue: string | null,
        legacyValue: string | undefined,
        defaultValue: string,
    ): { value: string; source: ProjectRegistryValueSource } {
        if (dbValue !== null) return { value: dbValue, source: "database" };
        if (canonical) return { value: defaultValue, source: "canonical_null" };
        if (hasLegacyText(legacyValue)) {
            return { value: legacyValue, source: "legacy_local" };
        }
        return { value: defaultValue, source: "ui_default" };
    }

    function resolveValue<T>(
        dbValue: T | null,
        legacyValue: T | undefined,
        defaultValue: T,
    ): { value: T; source: ProjectRegistryValueSource } {
        if (dbValue !== null) return { value: dbValue, source: "database" };
        if (canonical) return { value: defaultValue, source: "canonical_null" };
        if (legacyValue !== undefined && legacyValue !== null) {
            return { value: legacyValue, source: "legacy_local" };
        }
        return { value: defaultValue, source: "ui_default" };
    }

    const category = resolveText(project.category, legacy?.category, defaults.category);
    const status = resolveValue(
        project.registry_status,
        legacy?.status,
        defaults.status,
    );
    const priority = resolveValue(project.priority, legacy?.priority, defaults.priority);
    const currentGoal = resolveText(
        project.current_goal,
        legacy?.currentGoal,
        defaults.currentGoal,
    );
    const progressStage = resolveText(
        project.progress_stage,
        legacy?.progressStage,
        defaults.progressStage,
    );
    const nextAction = resolveText(
        project.next_action,
        legacy?.nextAction,
        defaults.nextAction,
    );
    const cadence = resolveText(project.cadence, legacy?.cadence, defaults.cadence);
    const riskOrBlockedBy = resolveText(
        project.risk_or_blocked_by,
        legacy?.riskOrBlockedBy,
        defaults.riskOrBlockedBy,
    );
    const lastUpdated = project.metadata_updated_at !== null
        ? { value: project.metadata_updated_at, source: "database" as const }
        : hasLegacyText(legacy?.lastUpdated)
            ? { value: legacy.lastUpdated, source: "legacy_local" as const }
            : { value: project.updated_at, source: "ui_default" as const };

    return {
        metadata: {
            category: category.value,
            status: status.value,
            priority: priority.value,
            currentGoal: currentGoal.value,
            progressStage: progressStage.value as ProjectProgressStage,
            nextAction: nextAction.value,
            cadence: cadence.value,
            riskOrBlockedBy: riskOrBlockedBy.value,
            lastUpdated: lastUpdated.value,
        },
        sources: {
            category: category.source,
            status: status.source,
            priority: priority.source,
            currentGoal: currentGoal.source,
            progressStage: progressStage.source,
            nextAction: nextAction.source,
            cadence: cadence.source,
            riskOrBlockedBy: riskOrBlockedBy.source,
            lastUpdated: lastUpdated.source,
        },
    };
}

function nullableTrimmed(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function buildProjectRegistryUpdatePayload(
    name: string,
    metadata: ProjectRegistryMetadata,
): ProjectRegistryUpdatePayload {
    return {
        name: name.trim(),
        status: coreStatusForRegistryStatus(metadata.status),
        category: nullableTrimmed(metadata.category),
        registry_status: metadata.status,
        priority: metadata.priority,
        current_goal: nullableTrimmed(metadata.currentGoal),
        progress_stage: nullableTrimmed(metadata.progressStage),
        next_action: nullableTrimmed(metadata.nextAction),
        cadence: nullableTrimmed(metadata.cadence),
        risk_or_blocked_by: nullableTrimmed(metadata.riskOrBlockedBy),
    };
}

export function canonicalProjectToLegacyMetadata(
    project: Project,
): ProjectRegistryMetadata {
    return {
        category: project.category ?? "",
        status: project.registry_status ?? registryStatusForCoreStatus(project.status),
        priority: project.priority ?? "none",
        currentGoal: project.current_goal ?? "",
        progressStage: (project.progress_stage ?? "Concept") as ProjectProgressStage,
        nextAction: project.next_action ?? "",
        cadence: project.cadence ?? "",
        riskOrBlockedBy: project.risk_or_blocked_by ?? "",
        lastUpdated: project.metadata_updated_at ?? project.updated_at,
    };
}
