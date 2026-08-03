import {
  PHOTO_EVIDENCE_CAPTION_MAX_LENGTH,
  PHOTO_EVIDENCE_MAX_PER_OBSERVATION,
  composePhotoEvidenceMetadata,
  normalizePhotoEvidenceCaption,
  type PhotoEvidenceBinaryEnvelope,
  type PhotoEvidenceMimeType,
} from "./photoEvidence";
import type {
  RoseTrialObservation,
  RoseTrialObservationPhoto,
  RoseTrialObservationScope,
  RoseTrialObservationStoreV1,
  RoseTrialObservationValidationContext,
  RoseTrialObservationValidationIssue,
} from "./observationTypes";
import { validateRoseTrialObservationStore } from "./observationValidation";

export interface PhotoEvidenceDraft {
  readonly localId: string;
  readonly fingerprint: string;
  readonly sourceLabel: string;
  readonly blob: Blob;
  readonly mimeType: PhotoEvidenceMimeType;
  readonly originalSizeBytes: number;
  readonly storedSizeBytes: number;
  readonly width: number;
  readonly height: number;
  readonly caption: string;
}

export type PhotoEvidenceDraftIssueCode =
  | "maximum_exceeded"
  | "duplicate_fingerprint"
  | "caption_too_long"
  | "invalid_draft"
  | "identity_mismatch"
  | "metadata_invalid"
  | "duplicate_observation_id"
  | "duplicate_photo_id"
  | "observation_reference_mismatch"
  | "sample_reference_mismatch"
  | "invalid_store";

export interface PhotoEvidenceDraftIssue {
  code: PhotoEvidenceDraftIssueCode;
  index?: number;
  field?: "photos" | "caption";
}

export type PhotoEvidenceDraftResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: PhotoEvidenceDraftIssue[] };

export function appendPhotoEvidenceDraft(
  drafts: readonly PhotoEvidenceDraft[],
  draft: PhotoEvidenceDraft
): PhotoEvidenceDraftResult<PhotoEvidenceDraft[]> {
  if (drafts.length >= PHOTO_EVIDENCE_MAX_PER_OBSERVATION) {
    return { ok: false, issues: [{ code: "maximum_exceeded", field: "photos" }] };
  }
  if (drafts.some((candidate) => candidate.fingerprint === draft.fingerprint)) {
    return { ok: false, issues: [{ code: "duplicate_fingerprint", field: "photos" }] };
  }
  return { ok: true, value: [...drafts, { ...draft }] };
}

export function removePhotoEvidenceDraft(
  drafts: readonly PhotoEvidenceDraft[],
  localId: string
): PhotoEvidenceDraft[] {
  return drafts.filter((draft) => draft.localId !== localId);
}

export function updatePhotoEvidenceDraftCaption(
  drafts: readonly PhotoEvidenceDraft[],
  localId: string,
  caption: string
): PhotoEvidenceDraft[] {
  return drafts.map((draft) => draft.localId === localId ? { ...draft, caption } : draft);
}

export function validatePhotoEvidenceDrafts(
  drafts: readonly PhotoEvidenceDraft[]
): PhotoEvidenceDraftResult<PhotoEvidenceDraft[]> {
  const issues: PhotoEvidenceDraftIssue[] = [];
  if (drafts.length > PHOTO_EVIDENCE_MAX_PER_OBSERVATION) {
    issues.push({ code: "maximum_exceeded", field: "photos" });
  }
  const fingerprints = new Set<string>();
  drafts.forEach((draft, index) => {
    if (
      !draft.localId.trim()
      || !draft.fingerprint
      || !draft.sourceLabel.trim()
      || typeof draft.blob !== "object"
      || draft.blob === null
      || typeof draft.blob.arrayBuffer !== "function"
      || draft.blob.type !== draft.mimeType
      || draft.blob.size !== draft.storedSizeBytes
      || !Number.isInteger(draft.originalSizeBytes)
      || draft.originalSizeBytes <= 0
      || !Number.isInteger(draft.storedSizeBytes)
      || draft.storedSizeBytes <= 0
      || !Number.isInteger(draft.width)
      || draft.width <= 0
      || !Number.isInteger(draft.height)
      || draft.height <= 0
    ) {
      issues.push({ code: "invalid_draft", field: "photos", index });
    }
    if (fingerprints.has(draft.fingerprint)) {
      issues.push({ code: "duplicate_fingerprint", field: "photos", index });
    }
    fingerprints.add(draft.fingerprint);
    if (draft.caption.trim().length > PHOTO_EVIDENCE_CAPTION_MAX_LENGTH) {
      issues.push({ code: "caption_too_long", field: "caption", index });
    }
  });
  return issues.length > 0
    ? { ok: false, issues }
    : { ok: true, value: drafts.map((draft) => ({ ...draft })) };
}

export interface BindPhotoEvidenceDraftsInput {
  drafts: readonly PhotoEvidenceDraft[];
  photoIds: readonly string[];
  observationId: string;
  scope: RoseTrialObservationScope;
  sampleId?: string;
  createdAt: string;
}

export interface BoundPhotoEvidenceDrafts {
  metadata: RoseTrialObservationPhoto[];
  envelopes: PhotoEvidenceBinaryEnvelope[];
}

export function bindPhotoEvidenceDrafts(
  input: BindPhotoEvidenceDraftsInput
): PhotoEvidenceDraftResult<BoundPhotoEvidenceDrafts> {
  const validation = validatePhotoEvidenceDrafts(input.drafts);
  if (!validation.ok) return validation;
  if (
    input.photoIds.length !== input.drafts.length
    || input.photoIds.some((id) => !id.trim())
    || new Set(input.photoIds).size !== input.photoIds.length
  ) {
    return { ok: false, issues: [{ code: "identity_mismatch", field: "photos" }] };
  }

  const metadata: RoseTrialObservationPhoto[] = [];
  const envelopes: PhotoEvidenceBinaryEnvelope[] = [];
  for (let index = 0; index < input.drafts.length; index += 1) {
    const draft = input.drafts[index];
    const caption = normalizePhotoEvidenceCaption(draft.caption);
    if (!caption.ok) {
      return { ok: false, issues: [{ code: "caption_too_long", field: "caption", index }] };
    }
    const composed = composePhotoEvidenceMetadata({
      id: input.photoIds[index],
      observationId: input.observationId,
      scope: input.scope,
      ...(input.scope === "sample" && input.sampleId ? { sampleId: input.sampleId } : {}),
      mimeType: draft.mimeType,
      ...(caption.value ? { caption: caption.value } : {}),
      sortOrder: index,
      createdAt: input.createdAt,
    });
    if (!composed.ok) {
      return { ok: false, issues: [{ code: "metadata_invalid", field: "photos", index }] };
    }
    metadata.push(composed.value);
    envelopes.push({
      id: input.photoIds[index],
      version: 1,
      blob: draft.blob,
      mimeType: draft.mimeType,
      originalSizeBytes: draft.originalSizeBytes,
      storedSizeBytes: draft.storedSizeBytes,
      width: draft.width,
      height: draft.height,
      state: "pending",
      createdAt: input.createdAt,
    });
  }
  return { ok: true, value: { metadata, envelopes } };
}

function storeIssue(
  code: PhotoEvidenceDraftIssueCode,
  field: "photos" = "photos"
): PhotoEvidenceDraftResult<never> {
  return { ok: false, issues: [{ code, field }] };
}

export function composeObservationStoreWithPhotos(
  store: RoseTrialObservationStoreV1,
  observation: RoseTrialObservation,
  photos: readonly RoseTrialObservationPhoto[],
  context: RoseTrialObservationValidationContext,
  updatedAt: string
): PhotoEvidenceDraftResult<RoseTrialObservationStoreV1> {
  if (store.observations.some((candidate) => candidate.id === observation.id)) {
    return storeIssue("duplicate_observation_id");
  }
  const existingPhotoIds = new Set(store.photos.map((photo) => photo.id));
  const newPhotoIds = new Set<string>();
  for (const photo of photos) {
    if (existingPhotoIds.has(photo.id) || newPhotoIds.has(photo.id)) {
      return storeIssue("duplicate_photo_id");
    }
    newPhotoIds.add(photo.id);
    if (photo.observationId !== observation.id) {
      return storeIssue("observation_reference_mismatch");
    }
    const expectedSampleId = observation.scope === "sample" ? observation.sampleId : undefined;
    if (photo.sampleId !== expectedSampleId) {
      return storeIssue("sample_reference_mismatch");
    }
  }
  if (
    observation.photoIds.length !== photos.length
    || observation.photoIds.some((id, index) => id !== photos[index]?.id)
  ) {
    return storeIssue("observation_reference_mismatch");
  }

  const nextStore: RoseTrialObservationStoreV1 = {
    ...store,
    observations: [
      ...store.observations.map((record) => ({ ...record, photoIds: [...record.photoIds] })),
      { ...observation, photoIds: [...observation.photoIds] },
    ],
    photos: [...store.photos.map((photo) => ({ ...photo })), ...photos.map((photo) => ({ ...photo }))],
    updatedAt,
  };
  const finalValidation = validateRoseTrialObservationStore(nextStore, context);
  if (!finalValidation.valid) return storeIssue("invalid_store");
  return { ok: true, value: nextStore };
}

export function mapPhotoDraftIssuesToObservationIssues(
  issues: readonly PhotoEvidenceDraftIssue[]
): RoseTrialObservationValidationIssue[] {
  return issues.map((item) => ({
    field: "photoIds",
    code: item.code,
    message: "ข้อมูลภาพประกอบไม่ถูกต้อง",
    severity: "error",
    ...(item.index === undefined ? {} : { index: item.index }),
  }));
}
