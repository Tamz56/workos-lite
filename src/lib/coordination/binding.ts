// ---------------------------------------------------------------------------
// WorkOS-Lite P1-G2B — Evaluated-State / Baseline Binding contract + value
// validation + persisted reconstruction.
//
// The binding is OPTIONAL on a durable Lane state record and NEVER participates
// in currentness. Attribution stays on the record itself (`provenance`); the
// binding records Project Context source identity and the durable
// evaluated-state / baseline reference only.
//
// NO lifecycle semantics are introduced. baselineKind / baselineId /
// baselineFingerprint are reference-only / opaque in G2B (no specialized
// taxonomy, no SHA-256 enforcement, no baseline resolution).
// ---------------------------------------------------------------------------

import type {
    ProjectContextSourceKind,
    ProjectContextSourceRef,
} from "@/lib/project-curator/contracts";

export const COORDINATION_BINDING_INVALID = "COORDINATION_BINDING_INVALID" as const;

export class CoordinationBindingError extends Error {
    readonly code = COORDINATION_BINDING_INVALID;

    constructor(detail: string) {
        super(`${COORDINATION_BINDING_INVALID}: ${detail}`);
        this.name = "CoordinationBindingError";
    }
}

/** Durable identity of an existing coordination_lane_state_history record. */
export type CoordinationLaneStateRef = {
    laneId: string;
    seq: number;
};

/**
 * Reference-only / opaque evaluated baseline. baselineKind is a non-empty
 * opaque string; fingerprint (when supplied) is a non-empty opaque value in
 * G2B — no specialized taxonomy and no SHA-256 enforcement.
 */
export type CoordinationEvaluatedBaselineRef = {
    baselineKind: string;
    baselineId: string;
    baselineFingerprint?: string;
};

export type CoordinationLaneStateBinding = {
    sourceRef?: ProjectContextSourceRef;
    evaluatedStateRef?: CoordinationLaneStateRef;
    evaluatedBaseline?: CoordinationEvaluatedBaselineRef;
};

/** Persisted shape of the binding (the seven approved additive columns). */
export type PersistedBindingRow = {
    source_ref_kind: string | null;
    source_ref_id: string | null;
    evaluated_state_lane_id: string | null;
    evaluated_state_seq: number | null;
    evaluated_baseline_kind: string | null;
    evaluated_baseline_id: string | null;
    evaluated_baseline_fingerprint: string | null;
};

/** Write-side value validation (shape only; ownership/existence are DB-scoped). */
export function validateCoordinationLaneStateBinding(
    binding: CoordinationLaneStateBinding,
): void {
    if (binding.sourceRef) {
        if (!binding.sourceRef.sourceKind || binding.sourceRef.sourceKind.trim().length === 0) {
            throw new CoordinationBindingError("sourceRef.sourceKind must be non-empty");
        }
        if (!binding.sourceRef.sourceId || binding.sourceRef.sourceId.trim().length === 0) {
            throw new CoordinationBindingError("sourceRef.sourceId must be non-empty");
        }
    }
    if (binding.evaluatedStateRef) {
        if (!binding.evaluatedStateRef.laneId || binding.evaluatedStateRef.laneId.trim().length === 0) {
            throw new CoordinationBindingError("evaluatedStateRef.laneId must be non-empty");
        }
        if (!Number.isInteger(binding.evaluatedStateRef.seq) || binding.evaluatedStateRef.seq <= 0) {
            throw new CoordinationBindingError("evaluatedStateRef.seq must be a positive integer");
        }
    }
    if (binding.evaluatedBaseline) {
        if (!binding.evaluatedBaseline.baselineKind || binding.evaluatedBaseline.baselineKind.trim().length === 0) {
            throw new CoordinationBindingError("evaluatedBaseline.baselineKind must be non-empty");
        }
        if (!binding.evaluatedBaseline.baselineId || binding.evaluatedBaseline.baselineId.trim().length === 0) {
            throw new CoordinationBindingError("evaluatedBaseline.baselineId must be non-empty");
        }
        if (
            binding.evaluatedBaseline.baselineFingerprint !== undefined &&
            binding.evaluatedBaseline.baselineFingerprint.trim().length === 0
        ) {
            throw new CoordinationBindingError("evaluatedBaseline.baselineFingerprint must be non-empty");
        }
    }
}

/** Maps an optional binding to the seven persisted columns (NULL when absent). */
export function toPersistedBindingRow(
    binding: CoordinationLaneStateBinding | undefined,
): PersistedBindingRow {
    return {
        source_ref_kind: binding?.sourceRef?.sourceKind ?? null,
        source_ref_id: binding?.sourceRef?.sourceId ?? null,
        evaluated_state_lane_id: binding?.evaluatedStateRef?.laneId ?? null,
        evaluated_state_seq: binding?.evaluatedStateRef?.seq ?? null,
        evaluated_baseline_kind: binding?.evaluatedBaseline?.baselineKind ?? null,
        evaluated_baseline_id: binding?.evaluatedBaseline?.baselineId ?? null,
        evaluated_baseline_fingerprint: binding?.evaluatedBaseline?.baselineFingerprint ?? null,
    };
}

/**
 * Read-side reconstruction. Applies the approved persisted rules and fails
 * visibly on malformed partial data; never silently repairs.
 */
export function reconstructCoordinationLaneStateBinding(
    row: PersistedBindingRow,
): CoordinationLaneStateBinding | null {
    const binding: CoordinationLaneStateBinding = {};

    const sourceKind = row.source_ref_kind as ProjectContextSourceKind | null;
    const sourceId = row.source_ref_id;
    if (sourceKind === null && sourceId === null) {
        // absent
    } else if (sourceKind !== null && sourceId !== null) {
        binding.sourceRef = { sourceKind, sourceId };
    } else {
        throw new CoordinationBindingError(
            "partial sourceRef binding: kind and id must both be present or both be absent",
        );
    }

    const evaluatedLaneId = row.evaluated_state_lane_id;
    const evaluatedSeq = row.evaluated_state_seq;
    if (evaluatedLaneId === null && evaluatedSeq === null) {
        // absent
    } else if (
        evaluatedLaneId !== null &&
        evaluatedSeq !== null &&
        Number.isInteger(evaluatedSeq) &&
        evaluatedSeq > 0
    ) {
        binding.evaluatedStateRef = { laneId: evaluatedLaneId, seq: evaluatedSeq };
    } else {
        throw new CoordinationBindingError(
            "invalid evaluatedStateRef binding: laneId+seq must both be present with a positive integer seq",
        );
    }

    const baselineKind = row.evaluated_baseline_kind;
    const baselineId = row.evaluated_baseline_id;
    const baselineFingerprint = row.evaluated_baseline_fingerprint;
    if (baselineKind === null && baselineId === null && baselineFingerprint === null) {
        // absent
    } else if (baselineKind !== null && baselineId !== null) {
        binding.evaluatedBaseline = {
            baselineKind,
            baselineId,
            ...(baselineFingerprint !== null ? { baselineFingerprint } : {}),
        };
    } else {
        throw new CoordinationBindingError(
            "invalid evaluatedBaseline binding: kind+id must both be present, and fingerprint cannot exist without kind+id",
        );
    }

    return Object.keys(binding).length === 0 ? null : binding;
}
