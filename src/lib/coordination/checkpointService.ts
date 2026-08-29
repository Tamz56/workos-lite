// ---------------------------------------------------------------------------
// WorkOS-Lite P2-G6B-I1 — U5 checkpoint read/current/resume semantics.
//
// Only CURRENT_RESOLUTION may assert CURRENT, and it does so exclusively from
// U2 checkpoint-core lineage. RESUME then validates the checkpoint-owned U3
// and continuity evidence required to restore the authoritative snapshot.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import {
    CoordinationCheckpointCurrentnessError,
    CoordinationCheckpointEvidenceError,
    coordinationLaneExists,
    decodeContinuityPayload,
    readCheckpointSnapshot,
    readLaneCheckpointCores,
    readLaneCheckpointSnapshots,
    validateCheckpointCoreLineage,
    validateLaneCheckpointSnapshotEvidence,
    type CoordinationCheckpointContinuityPayload,
    type CoordinationCheckpointSnapshot,
    type CoordinationLaneCheckpoint,
} from "./checkpoint";

export type CheckpointLookupSelector =
    | { checkpointId: string; seq?: never }
    | { checkpointId?: never; seq: number };

export type CheckpointLookupResult =
    | { status: "FOUND"; snapshot: CoordinationCheckpointSnapshot }
    | { status: "NOT_FOUND" }
    | { status: "EVIDENCE_UNAVAILABLE"; detail: string };

export type CheckpointHistoryResult =
    | { status: "HISTORY"; checkpoints: CoordinationCheckpointSnapshot[] }
    | { status: "EVIDENCE_UNAVAILABLE"; detail: string };

export type CurrentCheckpointResult =
    | { status: "CURRENT"; checkpoint: CoordinationLaneCheckpoint }
    | { status: "NO_CHECKPOINT_YET" }
    | { status: "EVIDENCE_UNAVAILABLE"; detail: string }
    | { status: "CURRENTNESS_UNRESOLVABLE"; detail: string };

export type ResumeLaneResult =
    | {
        status: "RESUMED";
        checkpoint: CoordinationLaneCheckpoint;
        continuity: CoordinationCheckpointContinuityPayload;
        openItems: CoordinationCheckpointSnapshot["openItems"];
        openItemExits: CoordinationCheckpointSnapshot["openItemExits"];
    }
    | { status: "NO_CHECKPOINT_YET" }
    | { status: "EVIDENCE_UNAVAILABLE"; detail: string }
    | { status: "CURRENTNESS_UNRESOLVABLE"; detail: string }
    | { status: "CHECKPOINT_EVIDENCE_INVALID"; detail: string };

function detailFromError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function resolveCurrentLaneCheckpointUnchecked(
    db: Database.Database,
    laneId: string,
): CurrentCheckpointResult {
    if (!coordinationLaneExists(db, laneId)) {
        return {
            status: "EVIDENCE_UNAVAILABLE",
            detail: `Lane ${laneId} does not exist`,
        };
    }
    const checkpoints = readLaneCheckpointCores(db, laneId);
    if (checkpoints.length === 0) return { status: "NO_CHECKPOINT_YET" };
    try {
        const current = validateCheckpointCoreLineage(laneId, checkpoints);
        if (!current) return { status: "NO_CHECKPOINT_YET" };
        return { status: "CURRENT", checkpoint: current };
    } catch (error) {
        if (error instanceof CoordinationCheckpointCurrentnessError) {
            return { status: "CURRENTNESS_UNRESOLVABLE", detail: error.message };
        }
        throw error;
    }
}

export function lookupLaneCheckpoint(
    db: Database.Database,
    laneId: string,
    selector: CheckpointLookupSelector,
): CheckpointLookupResult {
    try {
        if (!coordinationLaneExists(db, laneId)) {
            return {
                status: "EVIDENCE_UNAVAILABLE",
                detail: `Lane ${laneId} does not exist`,
            };
        }
        const hasId = "checkpointId" in selector && selector.checkpointId !== undefined;
        const hasSeq = "seq" in selector && selector.seq !== undefined;
        if (hasId === hasSeq) {
            return {
                status: "EVIDENCE_UNAVAILABLE",
                detail: "LOOKUP requires exactly one checkpointId or seq selector",
            };
        }
        const checkpoint = hasId
            ? readLaneCheckpointCores(db, laneId).find(
                (candidate) => candidate.id === selector.checkpointId,
            )
            : readLaneCheckpointCores(db, laneId).find(
                (candidate) => candidate.seq === selector.seq,
            );
        if (!checkpoint) return { status: "NOT_FOUND" };
        return { status: "FOUND", snapshot: readCheckpointSnapshot(db, checkpoint) };
    } catch (error) {
        return { status: "EVIDENCE_UNAVAILABLE", detail: detailFromError(error) };
    }
}

export function readLaneCheckpointHistory(
    db: Database.Database,
    laneId: string,
): CheckpointHistoryResult {
    try {
        if (!coordinationLaneExists(db, laneId)) {
            return {
                status: "EVIDENCE_UNAVAILABLE",
                detail: `Lane ${laneId} does not exist`,
            };
        }
        return {
            status: "HISTORY",
            checkpoints: readLaneCheckpointSnapshots(db, laneId),
        };
    } catch (error) {
        return { status: "EVIDENCE_UNAVAILABLE", detail: detailFromError(error) };
    }
}

export function resolveCurrentLaneCheckpoint(
    db: Database.Database,
    laneId: string,
): CurrentCheckpointResult {
    try {
        return resolveCurrentLaneCheckpointUnchecked(db, laneId);
    } catch (error) {
        return { status: "EVIDENCE_UNAVAILABLE", detail: detailFromError(error) };
    }
}

export function resumeLaneFromValidatedCurrentCheckpoint(
    db: Database.Database,
    laneId: string,
): ResumeLaneResult {
    const resume = db.transaction((): ResumeLaneResult => {
        const current = resolveCurrentLaneCheckpointUnchecked(db, laneId);
        if (current.status !== "CURRENT") return current;

        try {
            const cores = readLaneCheckpointCores(db, laneId);
            const snapshots = validateLaneCheckpointSnapshotEvidence(db, laneId, cores);
            const currentSnapshot = snapshots[snapshots.length - 1];
            if (!currentSnapshot || currentSnapshot.checkpoint.id !== current.checkpoint.id) {
                return {
                    status: "CHECKPOINT_EVIDENCE_INVALID",
                    detail: "validated CURRENT does not match terminal complete checkpoint evidence",
                };
            }
            const continuity = decodeContinuityPayload(currentSnapshot.checkpoint);
            return {
                status: "RESUMED",
                checkpoint: currentSnapshot.checkpoint,
                continuity,
                openItems: currentSnapshot.openItems,
                openItemExits: currentSnapshot.openItemExits,
            };
        } catch (error) {
            if (error instanceof CoordinationCheckpointEvidenceError) {
                return { status: "CHECKPOINT_EVIDENCE_INVALID", detail: error.message };
            }
            throw error;
        }
    });

    try {
        return resume.deferred();
    } catch (error) {
        return { status: "EVIDENCE_UNAVAILABLE", detail: detailFromError(error) };
    }
}
