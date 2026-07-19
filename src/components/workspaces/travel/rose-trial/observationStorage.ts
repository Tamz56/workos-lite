import type {
  RoseTrialObservation,
  RoseTrialObservationPhoto,
  RoseTrialObservationStoreLoadResult,
  RoseTrialObservationStoreParseResult,
  RoseTrialObservationStoreSaveResult,
  RoseTrialObservationStoreV1,
  RoseTrialObservationValidationContext,
  RoseTrialObservationValidationIssue,
} from "./observationTypes";
import {
  isRoseTrialObservationPhotoRecord,
  isRoseTrialObservationRecord,
  validateRoseTrialObservation,
  validateRoseTrialObservationPhoto,
  validateRoseTrialObservationStore,
} from "./observationValidation";

export const ROSE_TRIAL_OBSERVATION_STORAGE_KEY = "gf:rose-trial:observations:v1";

export function createEmptyObservationStore(): RoseTrialObservationStoreV1 {
  return { version: 1, observations: [], photos: [], updatedAt: null };
}

function warning(
  field: string,
  code: string,
  message: string,
  recordId?: string,
  index?: number
): RoseTrialObservationValidationIssue {
  return { field, code, message, severity: "warning", recordId, index };
}

function invalidEnvelope(message: string): RoseTrialObservationStoreParseResult {
  return {
    ok: false,
    status: "invalid_envelope",
    error: { code: "invalid_envelope", message },
  };
}

const CONTEXTUAL_OBSERVATION_ISSUE_CODES = new Set([
  "cross_batch_reference",
  "unknown_treatment",
  "unknown_sample",
  "sample_treatment_mismatch",
]);

function createStructuralValidationContext(
  candidate: unknown
): RoseTrialObservationValidationContext {
  const record = typeof candidate === "object" && candidate !== null && !Array.isArray(candidate)
    ? candidate as Record<string, unknown>
    : {};
  const batchId = typeof record.batchId === "string" ? record.batchId : "";
  const treatmentId = typeof record.treatmentId === "string" ? record.treatmentId : undefined;
  const sampleId = typeof record.sampleId === "string" ? record.sampleId : undefined;

  return {
    batchId,
    treatments: treatmentId ? [{ id: treatmentId, batchId }] : [],
    samples: sampleId
      ? [{ id: sampleId, batchId, ...(treatmentId ? { treatmentId } : {}) }]
      : [],
  };
}

export function parseObservationStore(
  raw: string | null,
  context: RoseTrialObservationValidationContext
): RoseTrialObservationStoreParseResult {
  if (raw === null || raw.trim().length === 0) {
    return { ok: true, status: "empty", value: createEmptyObservationStore(), warnings: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return {
      ok: false,
      status: "malformed_json",
      error: { code: "malformed_json", message: "ข้อมูล Observation ไม่ใช่ JSON ที่อ่านได้" },
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return invalidEnvelope("Observation store ต้องเป็น object");
  }

  const envelope = parsed as Record<string, unknown>;
  if (!("version" in envelope)) {
    return invalidEnvelope("Observation store ต้องมี version");
  }
  if (envelope.version !== 1) {
    return {
      ok: false,
      status: "unsupported_version",
      error: {
        code: "unsupported_version",
        message: `ไม่รองรับ Observation store version ${String(envelope.version)}`,
      },
    };
  }
  if (!Array.isArray(envelope.observations) || !Array.isArray(envelope.photos)) {
    return invalidEnvelope("Observation store ต้องมี observations และ photos arrays");
  }
  if (envelope.updatedAt !== null && typeof envelope.updatedAt !== "string") {
    return invalidEnvelope("Observation store updatedAt ต้องเป็น string หรือ null");
  }

  const warnings: RoseTrialObservationValidationIssue[] = [];
  const observations: RoseTrialObservation[] = [];
  const observationIds = new Set<string>();

  envelope.observations.forEach((candidate, index) => {
    const structuralValidation = validateRoseTrialObservation(
      candidate,
      createStructuralValidationContext(candidate)
    );
    if (!structuralValidation.valid || !isRoseTrialObservationRecord(candidate)) {
      warnings.push(...structuralValidation.issues.map((item) => ({
        ...item,
        severity: "warning" as const,
        index,
      })));
      return;
    }
    if (observationIds.has(candidate.id)) {
      warnings.push(warning("id", "duplicate_observation_id", "เก็บ Observation แรกและข้าม ID ที่ซ้ำ", candidate.id, index));
      return;
    }

    const contextualValidation = validateRoseTrialObservation(candidate, context);
    const contextualIssues = contextualValidation.issues.filter((item) =>
      CONTEXTUAL_OBSERVATION_ISSUE_CODES.has(item.code)
    );
    const unexpectedIssues = contextualValidation.issues.filter((item) =>
      !CONTEXTUAL_OBSERVATION_ISSUE_CODES.has(item.code)
    );
    if (unexpectedIssues.length > 0) {
      warnings.push(...unexpectedIssues.map((item) => ({
        ...item,
        severity: "warning" as const,
        index,
      })));
      return;
    }

    observationIds.add(candidate.id);
    observations.push({ ...candidate, photoIds: [...candidate.photoIds] });
    warnings.push(...contextualIssues.map((item) => ({
      ...item,
      severity: "warning" as const,
      index,
    })));
  });

  const photos: RoseTrialObservationPhoto[] = [];
  const photoIds = new Set<string>();
  envelope.photos.forEach((candidate, index) => {
    const validation = validateRoseTrialObservationPhoto(candidate, observations, context);
    if (!validation.valid || !isRoseTrialObservationPhotoRecord(candidate)) {
      warnings.push(...validation.issues.map((item) => ({ ...item, severity: "warning" as const, index })));
      return;
    }
    if (photoIds.has(candidate.id)) {
      warnings.push(warning("id", "duplicate_photo_id", "เก็บ Photo แรกและข้าม ID ที่ซ้ำ", candidate.id, index));
      return;
    }
    photoIds.add(candidate.id);
    photos.push({ ...candidate });
  });

  const photoById = new Map(photos.map((photo) => [photo.id, photo]));
  const reconciledObservations = observations.map((observation, index) => {
    const seen = new Set<string>();
    const validPhotoIds = observation.photoIds.filter((photoId) => {
      const photo = photoById.get(photoId);
      if (seen.has(photoId)) {
        warnings.push(warning("photoIds", "duplicate_photo_reference", "ข้าม Photo reference ที่ซ้ำ", observation.id, index));
        return false;
      }
      seen.add(photoId);
      if (!photo || photo.observationId !== observation.id) {
        warnings.push(warning("photoIds", "broken_photo_reference", "ข้าม Photo reference ที่ไม่มีอยู่หรือเป็นของ record อื่น", observation.id, index));
        return false;
      }
      return true;
    });
    return validPhotoIds.length === observation.photoIds.length
      ? observation
      : { ...observation, photoIds: validPhotoIds };
  });

  const updatedAt = envelope.updatedAt;
  if (updatedAt !== null && !Number.isFinite(Date.parse(updatedAt))) {
    return invalidEnvelope("Observation store updatedAt ไม่ใช่วันเวลาที่ถูกต้อง");
  }

  return {
    ok: true,
    status: warnings.length > 0 ? "partial" : "valid",
    value: { version: 1, observations: reconciledObservations, photos, updatedAt },
    warnings,
  };
}

export function serializeObservationStore(store: RoseTrialObservationStoreV1): string {
  return JSON.stringify(store);
}

export function loadObservationStore(
  context: RoseTrialObservationValidationContext
): RoseTrialObservationStoreLoadResult {
  if (typeof window === "undefined") {
    return { ok: true, status: "empty", value: createEmptyObservationStore(), warnings: [] };
  }

  try {
    return parseObservationStore(window.localStorage.getItem(ROSE_TRIAL_OBSERVATION_STORAGE_KEY), context);
  } catch {
    return {
      ok: false,
      status: "storage_unavailable",
      error: { code: "storage_unavailable", message: "ไม่สามารถอ่าน Observation storage ได้" },
    };
  }
}

export function saveObservationStore(
  store: RoseTrialObservationStoreV1,
  context: RoseTrialObservationValidationContext
): RoseTrialObservationStoreSaveResult {
  const validation = validateRoseTrialObservationStore(store, context);
  if (!validation.valid) {
    return {
      ok: false,
      error: { code: "invalid_store", message: "Observation store ไม่ผ่าน validation", issues: validation.issues },
    };
  }
  if (typeof window === "undefined") {
    return { ok: false, error: { code: "storage_unavailable", message: "ไม่สามารถเขียน storage ฝั่ง server" } };
  }

  let serialized: string;
  try {
    serialized = serializeObservationStore(store);
  } catch {
    return {
      ok: false,
      error: { code: "serialization_failed", message: "ไม่สามารถบันทึก Observation store ได้" },
    };
  }

  try {
    window.localStorage.setItem(ROSE_TRIAL_OBSERVATION_STORAGE_KEY, serialized);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: { code: "storage_unavailable", message: "ไม่สามารถเขียน Observation storage ได้" },
    };
  }
}
