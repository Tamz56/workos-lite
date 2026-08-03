import type {
  RoseTrialObservation,
  RoseTrialObservationStoreV1,
  RoseTrialObservationValidationContext,
  RoseTrialObservationValidationIssue,
} from "./observationTypes";
import {
  validateRoseTrialObservation,
  validateRoseTrialObservationStore,
} from "./observationValidation";

export type CreateRoseTrialObservationInput = Omit<
  RoseTrialObservation,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateRoseTrialObservationPatch = Partial<Omit<
  RoseTrialObservation,
  "id" | "batchId" | "createdAt" | "updatedAt"
>>;

export type RoseTrialObservationMutationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: RoseTrialObservationValidationIssue[] };

export function createRoseTrialObservation(
  input: CreateRoseTrialObservationInput,
  identity: { id: string; timestamp: string },
  context: RoseTrialObservationValidationContext
): RoseTrialObservationMutationResult<RoseTrialObservation> {
  const observation: RoseTrialObservation = {
    ...input,
    id: identity.id,
    createdAt: identity.timestamp,
    updatedAt: identity.timestamp,
    photoIds: [...input.photoIds],
  };
  const validation = validateRoseTrialObservation(observation, context);
  return validation.valid
    ? { ok: true, value: observation }
    : { ok: false, issues: validation.issues };
}

export function addRoseTrialObservation(
  store: RoseTrialObservationStoreV1,
  observation: RoseTrialObservation,
  context: RoseTrialObservationValidationContext,
  storeUpdatedAt: string
): RoseTrialObservationMutationResult<RoseTrialObservationStoreV1> {
  if (store.observations.some((candidate) => candidate.id === observation.id)) {
    return {
      ok: false,
      issues: [{
        field: "id",
        code: "duplicate_observation_id",
        message: "Observation ID ซ้ำ",
        severity: "error",
        recordId: observation.id,
      }],
    };
  }
  const validation = validateRoseTrialObservation(observation, context);
  if (!validation.valid) return { ok: false, issues: validation.issues };

  const nextStore: RoseTrialObservationStoreV1 = {
    ...store,
    observations: [...store.observations, { ...observation, photoIds: [...observation.photoIds] }],
    photos: [...store.photos],
    updatedAt: storeUpdatedAt,
  };
  const storeValidation = validateRoseTrialObservationStore(nextStore, context);
  if (!storeValidation.valid) return { ok: false, issues: storeValidation.issues };

  return {
    ok: true,
    value: nextStore,
  };
}

export function updateRoseTrialObservation(
  store: RoseTrialObservationStoreV1,
  observationId: string,
  patch: UpdateRoseTrialObservationPatch,
  updatedAt: string,
  context: RoseTrialObservationValidationContext
): RoseTrialObservationMutationResult<RoseTrialObservationStoreV1> {
  const index = store.observations.findIndex((observation) => observation.id === observationId);
  if (index < 0) {
    return {
      ok: false,
      issues: [{
        field: "id",
        code: "unknown_observation",
        message: "ไม่พบ Observation ที่ต้องการแก้ไข",
        severity: "error",
        recordId: observationId,
      }],
    };
  }

  const current = store.observations[index];
  const updated: RoseTrialObservation = {
    ...current,
    ...patch,
    id: current.id,
    batchId: current.batchId,
    createdAt: current.createdAt,
    updatedAt,
    photoIds: patch.photoIds ? [...patch.photoIds] : [...current.photoIds],
  };
  const validation = validateRoseTrialObservation(updated, context);
  if (!validation.valid) return { ok: false, issues: validation.issues };

  const nextStore: RoseTrialObservationStoreV1 = {
    ...store,
    observations: store.observations.map((observation, observationIndex) =>
      observationIndex === index ? updated : observation
    ),
    photos: [...store.photos],
    updatedAt,
  };
  const storeValidation = validateRoseTrialObservationStore(nextStore, context);
  if (!storeValidation.valid) return { ok: false, issues: storeValidation.issues };

  return {
    ok: true,
    value: nextStore,
  };
}

export interface RemoveRoseTrialObservationValue {
  store: RoseTrialObservationStoreV1;
  removed: boolean;
  removedPhotoIds: string[];
}

export function removeRoseTrialObservation(
  store: RoseTrialObservationStoreV1,
  observationId: string,
  updatedAt: string,
  context: RoseTrialObservationValidationContext
): RoseTrialObservationMutationResult<RemoveRoseTrialObservationValue> {
  if (!store.observations.some((observation) => observation.id === observationId)) {
    return { ok: true, value: { store, removed: false, removedPhotoIds: [] } };
  }

  const removedPhotoIds = store.photos
    .filter((photo) => photo.observationId === observationId)
    .map((photo) => photo.id);

  const nextStore: RoseTrialObservationStoreV1 = {
    ...store,
    observations: store.observations.filter((observation) => observation.id !== observationId),
    photos: store.photos.filter((photo) => photo.observationId !== observationId),
    updatedAt,
  };
  const validation = validateRoseTrialObservationStore(nextStore, context);
  if (!validation.valid) return { ok: false, issues: validation.issues };

  return { ok: true, value: {
    removed: true,
    removedPhotoIds,
    store: nextStore,
  } };
}
