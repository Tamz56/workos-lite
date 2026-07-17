export type RoseTrialObservationScope = "batch" | "treatment" | "sample";

export type RoseTrialObservationType =
  | "general_condition"
  | "growth_response"
  | "survival_status"
  | "management_event"
  | "environment"
  | "other";

export type RoseTrialObservationStatus =
  | "monitoring"
  | "alive"
  | "weak"
  | "not_survived"
  | "removed"
  | "not_assessed";

export type RoseTrialObservationPhotoType =
  | "batch_overview"
  | "treatment_overview"
  | "whole_sample"
  | "basal_cut"
  | "root_closeup"
  | "before_after"
  | "other";

export interface RoseTrialObservation {
  id: string;
  batchId: string;
  trialDay: number;
  observedAt: string;
  scope: RoseTrialObservationScope;
  treatmentId?: string;
  sampleId?: string;
  type: RoseTrialObservationType;
  observedFacts: string;
  interpretation?: string;
  status?: RoseTrialObservationStatus;
  followUpRequired: boolean;
  photoIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoseTrialObservationPhoto {
  id: string;
  observationId: string;
  sampleId?: string;
  filename: string;
  mimeType?: string;
  caption?: string;
  photoType?: RoseTrialObservationPhotoType;
  capturedAt?: string;
  sortOrder: number;
  createdAt: string;
}

export interface RoseTrialObservationStoreV1 {
  version: 1;
  observations: RoseTrialObservation[];
  photos: RoseTrialObservationPhoto[];
  updatedAt: string | null;
}

export interface RoseTrialObservationTreatmentReference {
  id: string;
  batchId: string;
}

export interface RoseTrialObservationSampleReference {
  id: string;
  batchId: string;
  treatmentId?: string;
}

export interface RoseTrialObservationValidationContext {
  batchId: string;
  treatments: readonly RoseTrialObservationTreatmentReference[];
  samples: readonly RoseTrialObservationSampleReference[];
}

export type RoseTrialObservationValidationSeverity = "error" | "warning";

export interface RoseTrialObservationValidationIssue {
  field: string;
  code: string;
  message: string;
  severity: RoseTrialObservationValidationSeverity;
  recordId?: string;
  index?: number;
}

export interface RoseTrialObservationValidationResult {
  valid: boolean;
  issues: RoseTrialObservationValidationIssue[];
}

export type RoseTrialObservationStoreParseStatus =
  | "empty"
  | "valid"
  | "partial"
  | "malformed_json"
  | "unsupported_version"
  | "invalid_envelope";

export interface RoseTrialObservationStoreError {
  code:
    | "malformed_json"
    | "unsupported_version"
    | "invalid_envelope"
    | "storage_unavailable"
    | "invalid_store"
    | "serialization_failed";
  message: string;
  issues?: RoseTrialObservationValidationIssue[];
}

export type RoseTrialObservationStoreParseResult =
  | {
      ok: true;
      status: "empty" | "valid" | "partial";
      value: RoseTrialObservationStoreV1;
      warnings: RoseTrialObservationValidationIssue[];
    }
  | {
      ok: false;
      status: "malformed_json" | "unsupported_version" | "invalid_envelope";
      error: RoseTrialObservationStoreError;
    };

export type RoseTrialObservationStoreLoadResult =
  | RoseTrialObservationStoreParseResult
  | {
      ok: false;
      status: "storage_unavailable";
      error: RoseTrialObservationStoreError;
    };

export type RoseTrialObservationStoreSaveResult =
  | { ok: true }
  | { ok: false; error: RoseTrialObservationStoreError };
