"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Database,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";

type Availability =
    | "AVAILABLE"
    | "NOT_AVAILABLE"
    | "UNKNOWN";

type SourceCurrentness =
    | "CURRENT_WITHIN_SOURCE"
    | "NOT_PROVEN";

type ClaimCurrentness =
    | "CURRENT_WITHIN_SOURCE"
    | "CURRENT"
    | "STALE"
    | "NOT_PROVEN"
    | "UNBOUND"
    | "NOT_AVAILABLE"
    | "CONFLICTED";

type DisclosureCurrentness =
    | SourceCurrentness
    | ClaimCurrentness;

type Phase7Claim<T> = {
    value: T | null;
    authority: string;
    currentness:
        | "CURRENT"
        | "STALE"
        | "NOT_PROVEN"
        | "UNBOUND"
        | "NOT_AVAILABLE"
        | "CONFLICTED";
    authorityRef: string | null;
    sourceRefs: string[];
    reviewedAt: string | null;
};

type Phase7ProjectProjection = {
    managedProjectId: string;
    portfolioPriority:
        Phase7Claim<string>;
    executionPosture:
        Phase7Claim<string>;
    blockingStatus:
        Phase7Claim<string>;
    mustHappenFirst:
        Phase7Claim<{
            direct: string[];
            transitive: string[];
        }>;
    canRunInParallel:
        Phase7Claim<string[]>;
    humanDecisionRequired:
        Phase7Claim<{
            required: boolean;
            reasons: string[];
        }>;
    waitingForExternalDependency:
        Phase7Claim<
            Array<{
                externalId: string;
                label: string;
                evidenceRef: string;
            }>
        >;
};

type GovernedFact =
    | {
        status: "KNOWN";
        value: unknown;
      }
    | {
        status: "UNKNOWN";
      }
    | {
        status: "NOT_GOVERNED";
      };

type SourceDescriptor = {
    authority: string;
    availability: Availability;
    currentness: SourceCurrentness;
};

type CoreRegistryMetadataValue = {
    authority: "REGISTRY_METADATA";
    currentness: "CURRENT_WITHIN_SOURCE";
    category: string | null;
    registryStatus: string | null;
    priority: string | null;
    currentGoal: string | null;
    progressStage: string | null;
    nextAction: string | null;
    cadence: string | null;
    riskOrBlockedBy: string | null;
    metadataUpdatedAt: string | null;
};

type ProjectProjection = {
    identity: {
        id: string;
        name: string;
        slug: string | null;
        registryProjectId: string | null;
    };

    directoryBinding:
        | "BOUND"
        | "MISSING_OR_UNBOUND";

    registryObservation:
        | "PROVEN_PRESENT"
        | "PROVEN_ABSENT"
        | "NOT_PROVEN";

    registryMetadata: {
        value:
            | CoreRegistryMetadataValue
            | null;
        authority:
            | "REGISTRY_METADATA"
            | "NONE";
        currentness:
            ClaimCurrentness;
    };

    canonicalProjectState: {
        value:
            | string
            | null;
        authority:
            | "PROJECT_STATE"
            | "NONE";
        currentness:
            ClaimCurrentness;
    };

    nextAuthoritativeAction: {
        value:
            | GovernedFact
            | null;
        authority:
            | "PROJECT_STATE"
            | "NONE";
        currentness:
            ClaimCurrentness;
    };

    projectLink: {
        href: string | null;
        authority:
            | "MANAGED_PROJECT_REGISTRY"
            | "NONE";
        currentness:
            ClaimCurrentness;
    };

    dependencyClaim: {
        value:
            | GovernedFact
            | null;
        authority:
            | "PROJECT_STATE"
            | "NONE";
        currentness:
            ClaimCurrentness;
    };

    canonicalStateEvidence: {
        value: {
            stateVersionId: string;
            href: string;
            authorityRef: string;
            sourceType: string;
            sourceRef: string;
            issuedAt: string;
        } | null;
        authority:
            | "PROJECT_STATE"
            | "NONE";
        currentness:
            ClaimCurrentness;
    };

    canonicalEnrichmentConsistency:
        | "PASS"
        | "FAIL"
        | "NOT_APPLICABLE";
};

type PlannerDay = {
    id: string;
    plan_date: string;
    main_outcome: string | null;
    daily_capacity_minutes: number | null;
    energy_level: string | null;
    status: string;
};

type PlannerItem = {
    id: string;
    source_type: string;
    source_id: string;
    work_mode: string;
    priority: string;
    planner_status: string;
    is_main_task: number;
    source_project_id: string | null;
};

type ControlCenterProjection = {
    schemaVersion: string;
    asOfDate: string;

    sources: {
        projectRegistry:
            SourceDescriptor;

        planner:
            SourceDescriptor;

        coordination:
            SourceDescriptor;

        projectMemory:
            SourceDescriptor;

        executionEvidence:
            SourceDescriptor;
    };

    managedProjectSummary: {
        projectCount: number;
        boundCount: number;
        missingOrUnboundCount: number;
    };

    managedProjects:
        ProjectProjection[];

    portfolioExecutionOrder: {
        contractRef: string;
        authorityRead: {
            status: string;
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

    canonicalEnrichmentConsistency:
        | "PASS"
        | "FAIL";

    plannerState: {
        authority: string;
        currentness:
            SourceCurrentness;
        availability:
            Availability;
        day:
            PlannerDay | null;
        items:
            PlannerItem[];
    };

    portfolioStatus: {
        authority:
            "PLANNER_STATE";
        currentness:
            SourceCurrentness;
        availability:
            Availability;
        meaning:
            string;
        buckets: {
            NOW: PlannerItem[];
            NEXT: PlannerItem[];
            WAITING: PlannerItem[];
            BLOCKED: PlannerItem[];
        };
    };
};

const PLANNER_STATUS_ORDER = ["doing", "ready", "waiting", "blocked", "review"] as const;

function label(value: string | null | undefined) {
    return value && value.trim() ? value : "NOT_AVAILABLE";
}

function valueText(
    value: unknown,
    currentness: DisclosureCurrentness,
) {
    if (
        value === null
        || value === undefined
        || value === ""
    ) {
        if (
            currentness === "STALE"
            || currentness === "NOT_PROVEN"
            || currentness === "UNBOUND"
            || currentness === "NOT_AVAILABLE"
            || currentness === "CONFLICTED"
        ) {
            return currentness;
        }

        return "NOT_AVAILABLE";
    }

    if (
        typeof value === "object"
        && value !== null
        && "status" in value
    ) {
        const fact =
            value as GovernedFact;

        if (
            fact.status === "KNOWN"
        ) {
            const detail =
                typeof fact.value === "string"
                    ? fact.value
                    : JSON.stringify(
                        fact.value,
                    );

            return `KNOWN · ${detail}`;
        }

        return fact.status;
    }

    if (
        typeof value === "string"
    ) {
        return value;
    }

    return JSON.stringify(value);
}

function disclosureTone(value: string) {
    if (
        value === "AVAILABLE"
        || value === "CURRENT_WITHIN_SOURCE"
        || value === "CURRENT"
    ) {
        return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300";
    }
    if (value === "UNKNOWN" || value === "STALE") {
        return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300";
    }
    return "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300";
}

function plannerStatusTone(status: string) {
    switch (status.toLowerCase()) {
        case "doing":
            return "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300";
        case "ready":
            return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300";
        case "waiting":
            return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300";
        case "blocked":
            return "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300";
        case "review":
            return "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300";
        default:
            return "bg-neutral-100 text-neutral-700 dark:bg-zinc-800 dark:text-zinc-300";
    }
}

function Disclosure({
    source,
    authority,
    availability,
    currentness,
}: {
    source: string;
    authority: string;
    availability?: Availability;
    currentness: DisclosureCurrentness;
}) {
    return (
        <div className="flex flex-wrap gap-1.5 text-[8px] font-black uppercase tracking-wider">
            <span className="rounded-lg border border-theme-border bg-theme-input/30 px-2 py-1 text-theme-muted">
                Source: {source}
            </span>
            <span className="rounded-lg border border-theme-border bg-theme-input/30 px-2 py-1 text-theme-muted">
                Authority: {authority}
            </span>
            {availability && (
                <span className={`rounded-lg border px-2 py-1 ${disclosureTone(availability)}`}>
                    {availability}
                </span>
            )}
            <span className={`rounded-lg border px-2 py-1 ${disclosureTone(currentness)}`}>
                {currentness}
            </span>
        </div>
    );
}

function Phase7ClaimCard<T>({
    title,
    claim,
}: {
    title: string;
    claim: Phase7Claim<T>;
}) {
    return (
        <div className="rounded-xl border border-theme-border bg-theme-card p-3">
            <div className="text-[8px] font-black uppercase tracking-wider text-theme-muted">
                {title}
            </div>
            <dl className="mt-2 space-y-1 text-[9px] font-bold text-theme-secondary">
                <div>
                    <dt className="inline font-black text-theme-muted">VALUE: </dt>
                    <dd className="inline text-theme-primary">
                        {valueText(
                            claim.value,
                            claim.currentness,
                        )}
                    </dd>
                </div>
                <div>
                    <dt className="inline font-black text-theme-muted">AUTHORITY: </dt>
                    <dd className="inline">
                        {claim.authority}
                    </dd>
                </div>
                <div>
                    <dt className="inline font-black text-theme-muted">CURRENTNESS: </dt>
                    <dd className="inline">
                        {claim.currentness}
                    </dd>
                </div>
                <div>
                    <dt className="inline font-black text-theme-muted">SOURCE_REFS: </dt>
                    <dd className="inline">
                        {claim.sourceRefs.length > 0
                            ? claim.sourceRefs.join(", ")
                            : "NOT_AVAILABLE"}
                    </dd>
                </div>
            </dl>
        </div>
    );
}

function SourceHealthCard({ name, descriptor }: { name: string; descriptor: SourceDescriptor }) {
    return (
        <div className="rounded-2xl border border-theme-border bg-theme-input/20 p-3 space-y-2">
            <div className="text-[9px] font-black uppercase tracking-wider text-theme-primary">{name}</div>
            <Disclosure
                source={name}
                authority={descriptor.authority}
                availability={descriptor.availability}
                currentness={descriptor.currentness}
            />
        </div>
    );
}

export default function GovernedControlCenterView() {
    const [data, setData] = useState<ControlCenterProjection | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProjection = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/arbor-desk/control-center", { cache: "no-store" });
            if (!response.ok) {
                throw new Error("CONTROL_CENTER_READ_UNAVAILABLE");
            }
            setData((await response.json()) as ControlCenterProjection);
        } catch (cause) {
            console.error("Governed Control Center read failed", cause);
            setError("CONTROL_CENTER_READ_UNAVAILABLE");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProjection();
        const handleRefresh = () => loadProjection();
        window.addEventListener("task-updated", handleRefresh);
        return () => window.removeEventListener("task-updated", handleRefresh);
    }, [loadProjection]);

    const projectNames = useMemo(() => {
        const index =
            new Map<string, string>();

        data?.managedProjects.forEach(
            (project) => {
                index.set(
                    project.identity.id,
                    project.identity.name,
                );

                if (
                    project
                        .identity
                        .registryProjectId
                ) {
                    index.set(
                        project
                            .identity
                            .registryProjectId,
                        project
                            .identity
                            .name,
                    );
                }
            },
        );

        return index;
    }, [data]);

    if (loading && !data) {
        return (
            <section className="rounded-[28px] border border-theme-border bg-theme-card p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-theme-muted">
                    <Clock3 className="h-4 w-4 animate-spin" />
                    Loading governed Control Center projection…
                </div>
            </section>
        );
    }

    if (error || !data) {
        return (
            <section className="rounded-[28px] border border-red-200 bg-theme-card p-6 shadow-sm dark:border-red-900/40">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="text-xs font-black text-red-600">CONTROL_CENTER_READ_UNAVAILABLE</div>
                        <p className="mt-1 text-[10px] font-bold text-theme-muted">
                            No governed projection is being inferred from legacy dashboard data.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={loadProjection}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-theme-border px-3 py-2 text-[10px] font-black text-theme-primary"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry read
                    </button>
                </div>
            </section>
        );
    }

    const mainPlannerItem = data.plannerState.items.find((item) => item.is_main_task === 1) ?? null;
    const waitingItems = data.plannerState.items.filter((item) =>
        ["waiting", "blocked"].includes(item.planner_status.toLowerCase()),
    );
    const reviewItems = data.plannerState.items.filter(
        (item) => item.planner_status.toLowerCase() === "review",
    );
    const registryRiskRows =
        data.managedProjects.filter(
            (project) =>
                Boolean(
                    project
                        .registryMetadata
                        .value
                        ?.riskOrBlockedBy
                        ?.trim(),
                ),
        );

    const itemLabel = (item: PlannerItem) => {
        const projectName = item.source_project_id ? projectNames.get(item.source_project_id) : undefined;
        return projectName
            ? `${projectName} · ${item.source_type} · ${item.source_id}`
            : `${item.source_type} · ${item.source_id}`;
    };

    const sourceRows: Array<[string, SourceDescriptor]> = [
        ["Project Registry", data.sources.projectRegistry],
        ["Planner", data.sources.planner],
        ["Coordination", data.sources.coordination],
        ["Project Memory", data.sources.projectMemory],
        ["Execution Evidence", data.sources.executionEvidence],
    ];

    return (
        <section data-testid="governed-control-center" className="space-y-6 rounded-[32px] border border-theme-border bg-theme-card p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-theme-primary">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        Governed Control Center
                    </h3>
                    <p className="mt-1 text-[10px] font-bold text-theme-muted">
                        Managed read projection · {data.schemaVersion} · as of {data.asOfDate}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={loadProjection}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-theme-border bg-theme-input/20 px-3 py-2 text-[10px] font-black text-theme-primary"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh projection
                </button>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <div className="space-y-4 rounded-[24px] border border-theme-border bg-theme-input/10 p-5 xl:col-span-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-theme-primary">
                            <CalendarDays className="h-4 w-4 text-blue-600" />
                            Now / Today
                        </h4>
                        <Link href="/planner" className="text-[9px] font-black text-blue-600 hover:underline">
                            Open Planner
                        </Link>
                    </div>

                    <Disclosure
                        source="Planner"
                        authority={data.plannerState.authority}
                        availability={data.plannerState.availability}
                        currentness={data.plannerState.currentness}
                    />

                    {data.plannerState.day ? (
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-theme-border bg-theme-card p-4">
                                <div className="text-[8px] font-black uppercase tracking-wider text-theme-muted">Daily outcome</div>
                                <div className="mt-1 text-sm font-bold text-theme-primary">
                                    {label(data.plannerState.day.main_outcome)}
                                </div>
                                <div className="mt-2 text-[9px] font-bold text-theme-muted">
                                    Day status: {data.plannerState.day.status} · Capacity: {data.plannerState.day.daily_capacity_minutes ?? "NOT_AVAILABLE"} min · Energy: {label(data.plannerState.day.energy_level)}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-theme-border bg-theme-card p-4">
                                <div className="text-[8px] font-black uppercase tracking-wider text-theme-muted">Explicit main Planner item</div>
                                {mainPlannerItem ? (
                                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-xs font-bold text-theme-primary">{itemLabel(mainPlannerItem)}</div>
                                        <span className={`w-fit rounded-lg px-2 py-1 text-[8px] font-black uppercase ${plannerStatusTone(mainPlannerItem.planner_status)}`}>
                                            {mainPlannerItem.planner_status}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs font-bold text-theme-muted">NOT_AVAILABLE</div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                {PLANNER_STATUS_ORDER.map((status) => {
                                    const count = data.plannerState.items.filter(
                                        (item) => item.planner_status.toLowerCase() === status,
                                    ).length;
                                    return (
                                        <div key={status} className="rounded-xl border border-theme-border bg-theme-card p-3 text-center">
                                            <div className="text-[8px] font-black uppercase text-theme-muted">{status}</div>
                                            <div className="mt-1 text-lg font-black text-theme-primary">{count}</div>
                                        </div>
                                    );
                                })}
                            </div>

                            {data.plannerState.items.length > 0 && (
                                <div className="space-y-2">
                                    {data.plannerState.items.map((item) => (
                                        <div key={item.id} className="flex flex-col gap-2 rounded-xl border border-theme-border bg-theme-card p-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="text-[10px] font-bold text-theme-primary">{itemLabel(item)}</div>
                                                <div className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-theme-muted">
                                                    {item.work_mode} · {item.priority}{item.is_main_task === 1 ? " · MAIN" : ""}
                                                </div>
                                            </div>
                                            <span className={`w-fit rounded-lg px-2 py-1 text-[8px] font-black uppercase ${plannerStatusTone(item.planner_status)}`}>
                                                {item.planner_status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-theme-border bg-theme-input/20 p-4 text-xs font-bold text-theme-muted">
                            Planner day is {data.plannerState.availability}; currentness is {data.plannerState.currentness}. No Today state is inferred.
                        </div>
                    )}
                </div>

                <div className="space-y-4 rounded-[24px] border border-theme-border bg-theme-input/10 p-5">
                    <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-theme-primary">
                        <CheckCircle2 className="h-4 w-4 text-purple-600" />
                        Human Attention
                    </h4>
                    <Disclosure
                        source="Planner review state"
                        authority={data.plannerState.authority}
                        availability={data.plannerState.availability}
                        currentness={data.plannerState.currentness}
                    />
                    {reviewItems.length === 0 ? (
                        <p className="text-xs font-bold text-theme-muted">No explicit Planner review items are available.</p>
                    ) : (
                        <div className="space-y-2">
                            {reviewItems.map((item) => (
                                <div key={item.id} className="rounded-xl border border-theme-border bg-theme-card p-3">
                                    <div className="text-[10px] font-bold text-theme-primary">{itemLabel(item)}</div>
                                    <div className="mt-1 text-[8px] font-black uppercase text-purple-600">review</div>
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="text-[9px] font-bold leading-relaxed text-theme-muted">
                        Existing governed surfaces are navigation targets only. This view creates no approval or mutation action.
                    </p>
                </div>
            </div>

            <div className="space-y-4 rounded-[24px] border border-theme-border bg-theme-input/10 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-theme-primary">
                        <CalendarDays className="h-4 w-4 text-cyan-600" />
                        Portfolio Status
                    </h4>
                    <span className="text-[8px] font-black uppercase tracking-wider text-theme-muted">
                        NOW / NEXT / WAITING / BLOCKED
                    </span>
                </div>

                <Disclosure
                    source="Planner status classification"
                    authority={data.portfolioStatus.authority}
                    availability={data.portfolioStatus.availability}
                    currentness={data.portfolioStatus.currentness}
                />

                <p className="text-[9px] font-bold text-theme-muted">
                    Classification only. Not portfolio priority or execution order.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {(["NOW", "NEXT", "WAITING", "BLOCKED"] as const).map((bucket) => (
                        <div key={bucket} className="rounded-2xl border border-theme-border bg-theme-card p-4">
                            <div className="text-[9px] font-black uppercase tracking-wider text-theme-primary">
                                {bucket}
                            </div>

                            {data.portfolioStatus.buckets[bucket].length === 0 ? (
                                <div className="mt-2 text-[10px] font-bold text-theme-muted">
                                    NOT_AVAILABLE
                                </div>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    {data.portfolioStatus.buckets[bucket].map((item) => (
                                        <div key={item.id} className="rounded-xl border border-theme-border bg-theme-input/20 p-2">
                                            <div className="text-[10px] font-bold text-theme-primary">
                                                {itemLabel(item)}
                                            </div>
                                            <div className="mt-1 text-[8px] font-black uppercase tracking-wider text-theme-muted">
                                                ID: {item.id}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div
                data-testid="portfolio-execution-order"
                className="space-y-4 rounded-[24px] border border-theme-border bg-theme-input/10 p-5"
            >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-theme-primary">
                            <ShieldCheck className="h-4 w-4 text-indigo-600" />
                            Portfolio Execution Order
                        </h4>
                        <p className="mt-1 text-[9px] font-bold text-theme-muted">
                            Phase 7 governed read projection · {data.portfolioExecutionOrder.contractRef}
                        </p>
                    </div>
                    <div className="text-[8px] font-black uppercase tracking-wider text-theme-muted">
                        Human head: {data.portfolioExecutionOrder.authorityRead.humanPortfolioHead}
                        {" · "}
                        {data.portfolioExecutionOrder.authorityRead.status}
                        {data.portfolioExecutionOrder.authorityRead.reason
                            ? ` · ${data.portfolioExecutionOrder.authorityRead.reason}`
                            : ""}
                    </div>
                </div>

                <p className="text-[9px] font-bold leading-relaxed text-theme-muted">
                    Phase 6 NEXT != Phase 7 PRIMARY · Phase 6 WAITING != Phase 7 HOLD · Phase 6 BLOCKED != Phase 7 Blocking Status.
                </p>

                <Phase7ClaimCard
                    title="Dependency Order"
                    claim={data.portfolioExecutionOrder.dependencyOrder}
                />

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {data.portfolioExecutionOrder.projects.map((project) => (
                        <article
                            key={project.managedProjectId}
                            className="space-y-3 rounded-2xl border border-theme-border bg-theme-card p-4"
                        >
                            <div>
                                <div className="text-[10px] font-black text-theme-primary">
                                    {projectNames.get(project.managedProjectId) ?? project.managedProjectId}
                                </div>
                                <div className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-theme-muted">
                                    {project.managedProjectId}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Phase7ClaimCard
                                    title="Portfolio Priority"
                                    claim={project.portfolioPriority}
                                />
                                <Phase7ClaimCard
                                    title="Execution Posture"
                                    claim={project.executionPosture}
                                />
                                <Phase7ClaimCard
                                    title="Blocking Status"
                                    claim={project.blockingStatus}
                                />
                                <Phase7ClaimCard
                                    title="What Must Happen First"
                                    claim={project.mustHappenFirst}
                                />
                                <Phase7ClaimCard
                                    title="What Can Run in Parallel"
                                    claim={project.canRunInParallel}
                                />
                                <Phase7ClaimCard
                                    title="Human Decision Required"
                                    claim={project.humanDecisionRequired}
                                />
                                <Phase7ClaimCard
                                    title="Waiting for External Dependency"
                                    claim={project.waitingForExternalDependency}
                                />
                            </div>
                        </article>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-theme-primary">
                        <Database className="h-4 w-4 text-indigo-600" />
                        Portfolio
                    </h4>
                    <span className="text-[9px] font-black text-theme-muted">{data.managedProjectSummary.projectCount} Managed Projects ·{" "}
                        {data.managedProjectSummary.boundCount} bound ·{" "}
                        {data.managedProjectSummary.missingOrUnboundCount} missing/unbound</span>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {data.managedProjects.map((project) => (
                        <article key={project.identity.id} className="space-y-4 rounded-[24px] border border-theme-border bg-theme-input/10 p-5">
                            <div>
                                <div className="text-sm font-black text-theme-primary">{project.identity.name}</div>
                                <div className="mt-0.5 text-[9px] font-bold text-theme-muted">
                                    {project.identity.slug ?? "UNBOUND"}
                                </div>
                                <div className="mt-1 text-[8px] font-black uppercase tracking-wider text-theme-muted">
                                    {project.directoryBinding} · {project.registryObservation}
                                </div>
                            </div>

                            <Disclosure
                                source="Project Registry"
                                authority={project.registryMetadata.authority}
                                availability={data.sources.projectRegistry.availability}
                                currentness={project.registryMetadata.currentness}
                            />

                            <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                                <div><dt className="text-[8px] font-black uppercase text-theme-muted">Registry status</dt><dd className="mt-1 font-bold text-theme-primary">{label(project.registryMetadata.value?.registryStatus)}</dd></div>
                                <div><dt className="text-[8px] font-black uppercase text-theme-muted">Priority</dt><dd className="mt-1 font-bold text-theme-primary">{label(project.registryMetadata.value?.priority)}</dd></div>
                                <div className="sm:col-span-2"><dt className="text-[8px] font-black uppercase text-theme-muted">Current goal</dt><dd className="mt-1 font-bold text-theme-primary">{label(project.registryMetadata.value?.currentGoal)}</dd></div>
                                <div><dt className="text-[8px] font-black uppercase text-theme-muted">Registry stage</dt><dd className="mt-1 font-bold text-theme-primary">{label(project.registryMetadata.value?.progressStage)}</dd></div>
                                <div><dt className="text-[8px] font-black uppercase text-theme-muted">Cadence</dt><dd className="mt-1 font-bold text-theme-primary">{label(project.registryMetadata.value?.cadence)}</dd></div>
                                <div className="sm:col-span-2"><dt className="text-[8px] font-black uppercase text-theme-muted">Registry next action</dt><dd className="mt-1 font-bold text-theme-primary">{label(project.registryMetadata.value?.nextAction)}</dd></div>
                                <div className="sm:col-span-2"><dt className="text-[8px] font-black uppercase text-theme-muted">Blocker / risk</dt><dd className="mt-1 font-bold text-theme-primary">{label(project.registryMetadata.value?.riskOrBlockedBy)}</dd></div>
                            </dl>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-theme-border bg-theme-card p-3">
                                    <div className="text-[8px] font-black uppercase text-theme-muted">
                                        Dependencies
                                    </div>
                                    <div className="mt-1 text-[10px] font-bold text-theme-primary">
                                        {valueText(project.dependencyClaim.value, project.dependencyClaim.currentness)}
                                    </div>
                                    <Disclosure
                                        source="Canonical Project State dependencies"
                                        authority={project.dependencyClaim.authority}
                                        currentness={project.dependencyClaim.currentness}
                                    />
                                </div>

                                <div className="rounded-xl border border-theme-border bg-theme-card p-3">
                                    <div className="text-[8px] font-black uppercase text-theme-muted">
                                        Project
                                    </div>

                                    {project.projectLink.href ? (
                                        <Link
                                            href={project.projectLink.href}
                                            className="mt-1 inline-flex text-[10px] font-black text-blue-600 hover:underline"
                                        >
                                            Open Project
                                        </Link>
                                    ) : (
                                        <div className="mt-1 text-[10px] font-bold text-theme-muted">
                                            NOT_AVAILABLE
                                        </div>
                                    )}

                                    <Disclosure
                                        source="WorkOS Project Directory Binding"
                                        authority={project.projectLink.authority}
                                        currentness={project.projectLink.currentness}
                                    />
                                </div>
                            </div>

                            <div className="rounded-xl border border-theme-border bg-theme-card p-3">
                                <div className="text-[8px] font-black uppercase text-theme-muted">
                                    Canonical State Evidence
                                </div>

                                {project.canonicalStateEvidence.value ? (
                                    <div className="mt-2 space-y-2">
                                        <div className="text-[10px] font-bold text-theme-primary">
                                            {project.canonicalStateEvidence.value.stateVersionId}
                                        </div>

                                        <div className="text-[8px] font-bold text-theme-muted">
                                            Authority ref: {project.canonicalStateEvidence.value.authorityRef}
                                        </div>

                                        <div className="text-[8px] font-bold text-theme-muted">
                                            Source type: {project.canonicalStateEvidence.value.sourceType}
                                        </div>

                                        <div className="text-[8px] font-bold text-theme-muted">
                                            Source ref: {project.canonicalStateEvidence.value.sourceRef}
                                        </div>

                                        <div className="text-[8px] font-bold text-theme-muted">
                                            Issued: {project.canonicalStateEvidence.value.issuedAt}
                                        </div>

                                        <Link
                                            href={project.canonicalStateEvidence.value.href}
                                            className="inline-flex text-[10px] font-black text-blue-600 hover:underline"
                                        >
                                            Open Canonical Evidence
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="mt-1 text-[10px] font-bold text-theme-muted">
                                        {valueText(null, project.canonicalStateEvidence.currentness)}
                                    </div>
                                )}

                                <div className="mt-2">
                                    <Disclosure
                                        source="Canonical Project State"
                                        authority={project.canonicalStateEvidence.authority}
                                        currentness={project.canonicalStateEvidence.currentness}
                                    />
                                </div>

                                <div className="mt-2 text-[8px] font-black uppercase tracking-wider text-theme-muted">
                                    Canonical enrichment consistency: {project.canonicalEnrichmentConsistency}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div className="rounded-xl border border-theme-border bg-theme-card p-3">
                                    <div className="text-[8px] font-black uppercase text-theme-muted">Canonical Project State</div>
                                    <div className="mt-1 text-[10px] font-bold text-theme-primary">
                                        {valueText(project.canonicalProjectState.value, project.canonicalProjectState.currentness)}
                                    </div>
                                    <Disclosure
                                        source="Canonical Project State"
                                        authority={project.canonicalProjectState.authority}
                                        currentness={project.canonicalProjectState.currentness}
                                    />
                                </div>
                                <div className="rounded-xl border border-theme-border bg-theme-card p-3">
                                    <div className="text-[8px] font-black uppercase text-theme-muted">Next Authoritative Action</div>
                                    <div className="mt-1 text-[10px] font-bold text-theme-primary">
                                        {valueText(project.nextAuthoritativeAction.value, project.nextAuthoritativeAction.currentness)}
                                    </div>
                                    <Disclosure
                                        source="Next Authoritative Action"
                                        authority={project.nextAuthoritativeAction.authority}
                                        currentness={project.nextAuthoritativeAction.currentness}
                                    />
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className="space-y-4 rounded-[24px] border border-theme-border bg-theme-input/10 p-5">
                    <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-theme-primary">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Waiting / Dependencies
                    </h4>
                    <Disclosure
                        source="Planner waiting/blocked"
                        authority={data.plannerState.authority}
                        availability={data.plannerState.availability}
                        currentness={data.plannerState.currentness}
                    />

                    {waitingItems.length === 0 ? (
                        <p className="text-xs font-bold text-theme-muted">No explicit waiting or blocked Planner items are available.</p>
                    ) : (
                        <div className="space-y-2">
                            {waitingItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-theme-border bg-theme-card p-3">
                                    <span className="text-[10px] font-bold text-theme-primary">{itemLabel(item)}</span>
                                    <span className={`rounded-lg px-2 py-1 text-[8px] font-black uppercase ${plannerStatusTone(item.planner_status)}`}>
                                        {item.planner_status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-2 border-t border-theme-border/50 pt-3">
                        <div className="text-[8px] font-black uppercase tracking-wider text-theme-muted">Registry blocker / risk</div>
                        {registryRiskRows.length === 0 ? (
                            <p className="text-[10px] font-bold text-theme-muted">NOT_AVAILABLE</p>
                        ) : (
                            registryRiskRows.map((project) => (
                                <div key={project.identity.id} className="rounded-xl border border-theme-border bg-theme-card p-3">
                                    <div className="text-[10px] font-black text-theme-primary">{project.identity.name}</div>
                                    <div className="mt-1 text-[10px] font-bold text-theme-secondary">{project.registryMetadata.value?.riskOrBlockedBy}</div>
                                </div>
                            ))
                        )}
                    </div>

                    <p className="text-[9px] font-bold leading-relaxed text-theme-muted">
                        Planner waiting/blocked and Registry blocker/risk are contextual only. Canonical Dependencies are shown on each governed Managed Project surface.
                    </p>
                </div>

                <div className="space-y-4 rounded-[24px] border border-theme-border bg-theme-input/10 p-5">
                    <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-theme-primary">
                        <Activity className="h-4 w-4 text-emerald-600" />
                        Recent Progress / Execution Activity
                    </h4>
                    <Disclosure
                        source="Execution Evidence"
                        authority={data.sources.executionEvidence.authority}
                        availability={data.sources.executionEvidence.availability}
                        currentness={data.sources.executionEvidence.currentness}
                    />
                    <p className="text-xs font-bold leading-relaxed text-theme-muted">
                        {data.sources.executionEvidence.availability === "AVAILABLE"
                            ? "Execution evidence source is available, but this projection does not expose an activity list."
                            : "No governed execution activity is available in this projection."}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-theme-primary">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    Continuity / Source Health
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {sourceRows.map(([name, descriptor]) => (
                        <SourceHealthCard key={name} name={name} descriptor={descriptor} />
                    ))}
                </div>
            </div>
        </section>
    );
}
