import type {
  RoseTrialObservation,
  RoseTrialObservationPhoto,
  RoseTrialObservationStoreV1,
  RoseTrialObservationValidationContext,
  RoseTrialObservationValidationIssue,
  RoseTrialObservationValidationResult,
} from "./observationTypes";

const OBSERVATION_SCOPES = new Set(["batch", "treatment", "sample"]);
const OBSERVATION_TYPES = new Set([
  "general_condition",
  "growth_response",
  "survival_status",
  "management_event",
  "environment",
  "other",
]);
const OBSERVATION_STATUSES = new Set([
  "monitoring",
  "alive",
  "weak",
  "not_survived",
  "removed",
  "not_assessed",
]);
const PHOTO_TYPES = new Set([
  "batch_overview",
  "treatment_overview",
  "whole_sample",
  "basal_cut",
  "root_closeup",
  "before_after",
  "other",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDateTime(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function issue(
  field: string,
  code: string,
  message: string,
  details: Partial<Pick<RoseTrialObservationValidationIssue, "recordId" | "index">> = {}
): RoseTrialObservationValidationIssue {
  return { field, code, message, severity: "error", ...details };
}

function optionalStringIsValid(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

export function validateRoseTrialObservation(
  value: unknown,
  context: RoseTrialObservationValidationContext
): RoseTrialObservationValidationResult {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [issue("observation", "malformed_record", "Observation ต้องเป็น object")],
    };
  }

  const issues: RoseTrialObservationValidationIssue[] = [];
  const recordId = typeof value.id === "string" ? value.id : undefined;
  const add = (field: string, code: string, message: string) => {
    issues.push(issue(field, code, message, { recordId }));
  };

  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    add("id", "missing_required", "Observation ID ต้องไม่ว่าง");
  }
  if (typeof value.batchId !== "string" || value.batchId.trim().length === 0) {
    add("batchId", "missing_required", "Batch ID ต้องไม่ว่าง");
  } else if (value.batchId !== context.batchId) {
    add("batchId", "cross_batch_reference", "Observation อ้าง Batch นอก context ปัจจุบัน");
  }
  if (!Number.isInteger(value.trialDay) || Number(value.trialDay) < 0) {
    add("trialDay", "invalid_trial_day", "Trial day ต้องเป็นจำนวนเต็มที่ไม่ติดลบ");
  }
  if (!isValidDateTime(value.observedAt)) {
    add("observedAt", "invalid_date", "Observed at ต้องเป็นวันเวลาที่ถูกต้อง");
  }
  if (typeof value.scope !== "string" || !OBSERVATION_SCOPES.has(value.scope)) {
    add("scope", "invalid_scope", "Observation scope ไม่ถูกต้อง");
  }
  if (typeof value.type !== "string" || !OBSERVATION_TYPES.has(value.type)) {
    add("type", "invalid_observation_type", "Observation type ไม่ถูกต้อง");
  }
  if (typeof value.observedFacts !== "string" || value.observedFacts.trim().length === 0) {
    add("observedFacts", "missing_required", "สิ่งที่สังเกตเห็นต้องไม่ว่าง");
  }
  if (!optionalStringIsValid(value.interpretation)) {
    add("interpretation", "invalid_type", "Interpretation ต้องเป็นข้อความเมื่อระบุ");
  }
  if (value.status !== undefined && (typeof value.status !== "string" || !OBSERVATION_STATUSES.has(value.status))) {
    add("status", "invalid_status", "Observation status ไม่ถูกต้อง");
  }
  if (typeof value.followUpRequired !== "boolean") {
    add("followUpRequired", "invalid_type", "Follow-up required ต้องเป็น boolean");
  }
  if (!Array.isArray(value.photoIds) || value.photoIds.some((id) => typeof id !== "string" || id.trim().length === 0)) {
    add("photoIds", "invalid_photo_references", "Photo IDs ต้องเป็นรายการ string ที่ไม่ว่าง");
  } else if (new Set(value.photoIds).size !== value.photoIds.length) {
    add("photoIds", "duplicate_photo_reference", "Photo IDs ต้องไม่ซ้ำกัน");
  }
  if (!isValidDateTime(value.createdAt)) {
    add("createdAt", "invalid_date", "Created at ต้องเป็นวันเวลาที่ถูกต้อง");
  }
  if (!isValidDateTime(value.updatedAt)) {
    add("updatedAt", "invalid_date", "Updated at ต้องเป็นวันเวลาที่ถูกต้อง");
  }
  if (isValidDateTime(value.createdAt) && isValidDateTime(value.updatedAt) && Date.parse(value.updatedAt) < Date.parse(value.createdAt)) {
    add("updatedAt", "updated_before_created", "Updated at ต้องไม่ก่อน Created at");
  }

  const treatmentId = typeof value.treatmentId === "string" ? value.treatmentId : undefined;
  const sampleId = typeof value.sampleId === "string" ? value.sampleId : undefined;
  const treatment = treatmentId
    ? context.treatments.find((candidate) => candidate.id === treatmentId)
    : undefined;
  const sample = sampleId
    ? context.samples.find((candidate) => candidate.id === sampleId)
    : undefined;

  if (value.scope === "batch") {
    if (value.treatmentId !== undefined) add("treatmentId", "invalid_scope_relationship", "Batch scope ห้ามมี Treatment ID");
    if (value.sampleId !== undefined) add("sampleId", "invalid_scope_relationship", "Batch scope ห้ามมี Sample ID");
  }

  if (value.scope === "treatment") {
    if (!treatmentId) {
      add("treatmentId", "missing_required", "Treatment scope ต้องมี Treatment ID");
    } else if (!treatment) {
      add("treatmentId", "unknown_treatment", "ไม่พบ Treatment ที่อ้างถึง");
    } else if (treatment.batchId !== context.batchId) {
      add("treatmentId", "cross_batch_reference", "Treatment อยู่คนละ Batch");
    }
    if (value.sampleId !== undefined) add("sampleId", "invalid_scope_relationship", "Treatment scope ห้ามมี Sample ID");
  }

  if (value.scope === "sample") {
    if (!sampleId) {
      add("sampleId", "missing_required", "Sample scope ต้องมี Sample ID");
    } else if (!sample) {
      add("sampleId", "unknown_sample", "ไม่พบ Sample ที่อ้างถึง");
    } else if (sample.batchId !== context.batchId) {
      add("sampleId", "cross_batch_reference", "Sample อยู่คนละ Batch");
    }

    if (treatmentId) {
      if (!treatment) {
        add("treatmentId", "unknown_treatment", "ไม่พบ Treatment ที่อ้างถึง");
      } else if (treatment.batchId !== context.batchId) {
        add("treatmentId", "cross_batch_reference", "Treatment อยู่คนละ Batch");
      } else if (sample?.treatmentId && sample.treatmentId !== treatmentId) {
        add("treatmentId", "sample_treatment_mismatch", "Treatment ไม่ตรงกับ Sample relationship");
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

export function validateRoseTrialObservationPhoto(
  value: unknown,
  observations: readonly RoseTrialObservation[],
  context: RoseTrialObservationValidationContext
): RoseTrialObservationValidationResult {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [issue("photo", "malformed_record", "Photo metadata ต้องเป็น object")],
    };
  }

  const issues: RoseTrialObservationValidationIssue[] = [];
  const recordId = typeof value.id === "string" ? value.id : undefined;
  const add = (field: string, code: string, message: string) => {
    issues.push(issue(field, code, message, { recordId }));
  };

  if (typeof value.id !== "string" || value.id.trim().length === 0) add("id", "missing_required", "Photo ID ต้องไม่ว่าง");
  if (typeof value.observationId !== "string" || value.observationId.trim().length === 0) {
    add("observationId", "missing_required", "Photo ต้องมี Observation ID");
  } else if (!observations.some((observation) => observation.id === value.observationId)) {
    add("observationId", "broken_photo_reference", "Photo อ้าง Observation ที่ไม่มีอยู่");
  }
  if (typeof value.filename !== "string" || value.filename.trim().length === 0) add("filename", "missing_required", "Filename ต้องไม่ว่าง");
  if (!optionalStringIsValid(value.mimeType)) add("mimeType", "invalid_type", "MIME type ต้องเป็นข้อความเมื่อระบุ");
  if (!optionalStringIsValid(value.caption)) add("caption", "invalid_type", "Caption ต้องเป็นข้อความเมื่อระบุ");
  if (value.photoType !== undefined && (typeof value.photoType !== "string" || !PHOTO_TYPES.has(value.photoType))) {
    add("photoType", "invalid_photo_type", "Photo type ไม่ถูกต้อง");
  }
  if (value.capturedAt !== undefined && !isValidDateTime(value.capturedAt)) add("capturedAt", "invalid_date", "Captured at ไม่ถูกต้อง");
  if (!Number.isInteger(value.sortOrder) || Number(value.sortOrder) < 0) add("sortOrder", "invalid_sort_order", "Sort order ต้องเป็นจำนวนเต็มที่ไม่ติดลบ");
  if (!isValidDateTime(value.createdAt)) add("createdAt", "invalid_date", "Created at ต้องเป็นวันเวลาที่ถูกต้อง");

  if (value.sampleId !== undefined) {
    if (typeof value.sampleId !== "string" || value.sampleId.trim().length === 0) {
      add("sampleId", "invalid_type", "Sample ID ต้องเป็นข้อความที่ไม่ว่าง");
    } else {
      const sample = context.samples.find((candidate) => candidate.id === value.sampleId);
      if (!sample) add("sampleId", "unknown_sample", "ไม่พบ Sample ที่ Photo อ้างถึง");
      else if (sample.batchId !== context.batchId) add("sampleId", "cross_batch_reference", "Photo อ้าง Sample คนละ Batch");
    }
  }

  return { valid: issues.length === 0, issues };
}

export function validateRoseTrialObservationStore(
  store: RoseTrialObservationStoreV1,
  context: RoseTrialObservationValidationContext
): RoseTrialObservationValidationResult {
  const issues: RoseTrialObservationValidationIssue[] = [];
  const observationIds = new Set<string>();
  const photoIds = new Set<string>();

  store.observations.forEach((observation, index) => {
    const result = validateRoseTrialObservation(observation, context);
    issues.push(...result.issues.map((item) => ({ ...item, index })));
    if (observationIds.has(observation.id)) {
      issues.push(issue("id", "duplicate_observation_id", "Observation ID ซ้ำ", { recordId: observation.id, index }));
    } else {
      observationIds.add(observation.id);
    }
  });

  store.photos.forEach((photo, index) => {
    const result = validateRoseTrialObservationPhoto(photo, store.observations, context);
    issues.push(...result.issues.map((item) => ({ ...item, index })));
    if (photoIds.has(photo.id)) {
      issues.push(issue("id", "duplicate_photo_id", "Photo ID ซ้ำ", { recordId: photo.id, index }));
    } else {
      photoIds.add(photo.id);
    }
  });

  store.observations.forEach((observation, index) => {
    observation.photoIds.forEach((photoId) => {
      const photo = store.photos.find((candidate) => candidate.id === photoId);
      if (!photo || photo.observationId !== observation.id) {
        issues.push(issue("photoIds", "broken_photo_reference", "Observation อ้าง Photo ที่ไม่มีอยู่หรือเป็นของ record อื่น", {
          recordId: observation.id,
          index,
        }));
      }
    });
  });

  if (store.updatedAt !== null && !isValidDateTime(store.updatedAt)) {
    issues.push(issue("updatedAt", "invalid_date", "Store updatedAt ต้องเป็น valid date หรือ null"));
  }

  return { valid: issues.length === 0, issues };
}

export function isRoseTrialObservationRecord(value: unknown): value is RoseTrialObservation {
  return isRecord(value);
}

export function isRoseTrialObservationPhotoRecord(value: unknown): value is RoseTrialObservationPhoto {
  return isRecord(value);
}
