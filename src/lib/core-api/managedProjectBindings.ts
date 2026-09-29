import type {
    ManagedProjectBindingDefinition,
    ManagedProjectCurrentness,
} from "./types";

const BASELINE_AUTHORITY = "WORKOS PROJECT DIRECTORY BINDING v0.1" as const;

const BASELINE_SOURCE_REFS = [
    "MANAGED PROJECT REGISTRY v0.1",
    "PORTFOLIO READ MODEL v0.1",
    "PROJECT DATA RECONCILIATION MATRIX v0.1",
] as const;

function managedProject(
    managedProjectId: string,
    projectName: string,
    workosSlug: string | null,
    baselineCurrentness: ManagedProjectCurrentness,
    evidenceAsOf: string,
    flags: readonly string[],
): ManagedProjectBindingDefinition {
    const isBound = workosSlug !== null;

    return {
        managedProjectId,
        projectName,
        managedMembership: {
            authority: "MANAGED_PROJECT_REGISTRY",
            status: "FROZEN",
            value: true,
        },
        workosSlug,
        baselineCurrentness,
        sourceRef: isBound
            ? "Frozen verified binding"
            : "Frozen managed registry + Phase 4",
        provenance: {
            baselineAuthority: BASELINE_AUTHORITY,
            sourceRefs: [...BASELINE_SOURCE_REFS],
            bindingEvidenceClass: isBound
                ? "FROZEN_VERIFIED_BINDING"
                : "FROZEN_MISSING_OR_UNBOUND",
            evidenceAsOf,
        },
        flags: [...flags],
    };
}

export const MANAGED_PROJECT_BINDINGS = [
    managedProject(
        "P01",
        "Green Fineness — Nursery Operations Platform",
        null,
        "CURRENT",
        "2026-09-28",
        [
            "MISSING_WORKOS_BINDING",
            "MISSING_STANDARD_WORK_LOG",
            "CANONICAL_STATE_UNBOUND",
        ],
    ),
    managedProject(
        "P02",
        "Green Fineness — Content",
        "green-fineness-content",
        "NOT_PROVEN",
        "2026-09-07 / frozen 2026-09-28",
        [
            "MISSING_WORK_LOG",
            "CURRENT_PROJECT_AUTHORITY_NOT_NORMALIZED",
            "CANONICAL_STATE_NOT_PROVEN",
            "ROLE_NOT_PROVEN",
        ],
    ),
    managedProject(
        "P03",
        "Arbor Plant Companion Widget",
        "arbor-plant-companion-widget-ycc",
        "CURRENT",
        "2026-09-28",
        [
            "PROJECT_WORK_LOG_LAGS_CURRENT_DIRECTION",
            "CANONICAL_STATE_NOT_PROVEN",
            "ROLE_NORMALIZATION_PARTIAL",
        ],
    ),
    managedProject(
        "P04",
        "WorkOS-Lite",
        "workos-lite-arbordesk",
        "CURRENT",
        "2026-09-28",
        [
            "PLANNER_HOME_STALE_SUPERSEDED",
            "CONTROL_CENTER_CANONICAL_BINDING_GAP",
            "CANONICAL_NEXT_ACTION_NOT_CAPTURED",
        ],
    ),
    managedProject(
        "P05",
        "Astro-Strategy Lab",
        "astro-real-app",
        "CURRENT",
        "2026-09-28",
        [
            "PLANNER_HOME_STALE_DEPENDENCY",
            "LOCAL_PROOF_PENDING",
            "CANONICAL_STATE_NOT_PROVEN",
            "ROLE_NORMALIZATION_PARTIAL",
        ],
    ),
    managedProject(
        "P06",
        "Green Fineness — Website",
        "www-greenfineness",
        "CURRENT",
        "2026-09-28",
        [
            "PORTFOLIO_HOLD_SEPARATE_FROM_PROJECT_STATE",
            "CANONICAL_STATE_NOT_PROVEN",
        ],
    ),
    managedProject(
        "P07",
        "Arbor Local AI Lab",
        null,
        "CURRENT",
        "2026-09-28",
        [
            "MISSING_WORKOS_BINDING",
            "CANONICAL_STATE_UNBOUND",
            "ROLE_NORMALIZATION_PARTIAL",
        ],
    ),
    managedProject(
        "P08",
        "Green Fineness — Nutrient Planner App",
        "green-fineness-nutrient-planner-app-y2z",
        "CURRENT",
        "2026-09-09 state / frozen 2026-09-28",
        [
            "NO_GENERAL_PROJECT_WORK_LOG",
            "PROJECT_LOCAL_STATE_LEDGER_PRESENT",
            "WORKOS_CANONICAL_STATE_NOT_PROVEN",
            "PLANNER_ALIGNMENT_PENDING",
        ],
    ),
    managedProject(
        "P09",
        "Website & Platform Development",
        "web-platform-prototype-y68",
        "CURRENT",
        "2026-09-16 project evidence / frozen 2026-09-28",
        [
            "PROJECT_EVIDENCE_OLDER_THAN_PORTFOLIO_FREEZE",
            "CANONICAL_STATE_NOT_PROVEN",
            "ROLE_NOT_PROVEN",
        ],
    ),
    managedProject(
        "GF-TOOLS",
        "Green Fineness — Tools / Digital Products",
        null,
        "CURRENT",
        "2026-09-24 / frozen 2026-09-28",
        [
            "MISSING_WORKOS_BINDING",
            "CANONICAL_STATE_UNBOUND",
            "ADVISOR_ROLE_NOT_NORMALIZED",
        ],
    ),
    managedProject(
        "MUSIC-LAB",
        "Music Lab",
        "music-lab",
        "CURRENT",
        "2026-09-28",
        [
            "CANONICAL_STATE_NOT_PROVEN",
            "CROSS_PROJECT_PLANNER_REPRESENTATION_GAP",
        ],
    ),
    managedProject(
        "AVACRM",
        "AvaCRM",
        null,
        "STALE",
        "2026-09-07",
        [
            "MISSING_WORKOS_BINDING",
            "CANONICAL_STATE_UNBOUND",
            "STALE_PROJECT_STATE",
            "SECURITY_GATE_RECONFIRM_REQUIRED",
            "ROLE_NOT_PROVEN",
        ],
    ),
    managedProject(
        "PERSONAL-HEALTH",
        "Personal Health Routine Tracker",
        "personal-health-routine-tracker-0m8",
        "STALE",
        "2026-08-27",
        [
            "MISSING_WORK_LOG",
            "INTAKE_ONLY",
            "CANONICAL_STATE_NOT_PROVEN",
            "ROLE_NOT_PROVEN",
        ],
    ),
    managedProject(
        "GFKVS",
        "GF Knowledge Video Studio",
        "gf-knowledge-video-studio",
        "STALE",
        "2026-08-27",
        [
            "MISSING_WORK_LOG",
            "INTAKE_ONLY",
            "CANONICAL_STATE_NOT_PROVEN",
            "CURRENT_GATE_REVALIDATION_REQUIRED",
            "ROLE_NOT_PROVEN",
        ],
    ),
    managedProject(
        "GF-LEARNING-CONTENT",
        "Green Fineness Learning Content",
        null,
        "STALE",
        "2026-08-27",
        [
            "MISSING_WORKOS_BINDING",
            "MISSING_WORK_LOG",
            "INTAKE_ONLY",
            "CANONICAL_STATE_UNBOUND",
            "ROLE_NOT_PROVEN",
            "LEGACY_SOURCE_CONFLICT",
        ],
    ),
] as const satisfies readonly ManagedProjectBindingDefinition[];
