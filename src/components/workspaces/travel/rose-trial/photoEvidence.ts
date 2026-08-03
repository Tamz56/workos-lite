import type {
  RoseTrialObservationPhoto,
  RoseTrialObservationPhotoType,
  RoseTrialObservationScope,
} from "./observationTypes";

export const PHOTO_EVIDENCE_MAX_PER_OBSERVATION = 4;
export const PHOTO_EVIDENCE_MAX_ORIGINAL_BYTES = 12 * 1024 * 1024;
export const PHOTO_EVIDENCE_MAX_LONG_EDGE = 1920;
export const PHOTO_EVIDENCE_TARGET_LOSSY_BYTES = Math.floor(1.5 * 1024 * 1024);
export const PHOTO_EVIDENCE_TARGET_PNG_BYTES = 3 * 1024 * 1024;
export const PHOTO_EVIDENCE_CAPTION_MAX_LENGTH = 200;
export const PHOTO_EVIDENCE_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PHOTO_EVIDENCE_COMMITTED_ORPHAN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const PHOTO_EVIDENCE_SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PhotoEvidenceMimeType = typeof PHOTO_EVIDENCE_SUPPORTED_MIME_TYPES[number];
export type PhotoEvidenceBinaryState = "pending" | "committed";
export type PhotoEvidenceObservationLoadState =
  | "valid"
  | "partial"
  | "failed"
  | "unavailable"
  | "unsupported_version";

export interface PhotoEvidenceBinaryEnvelope {
  id: string;
  version: 1;
  blob: Blob;
  mimeType: PhotoEvidenceMimeType;
  originalSizeBytes: number;
  storedSizeBytes: number;
  width: number;
  height: number;
  state: PhotoEvidenceBinaryState;
  createdAt: string;
}

export interface PhotoEvidenceDomainIssue {
  code:
    | "invalid_record"
    | "invalid_id"
    | "invalid_version"
    | "invalid_blob"
    | "blob_mime_mismatch"
    | "unsupported_mime"
    | "invalid_size"
    | "blob_size_mismatch"
    | "invalid_dimensions"
    | "invalid_state"
    | "invalid_timestamp"
    | "caption_too_long"
    | "invalid_sort_order"
    | "invalid_sample_reference";
  field: string;
}

export type PhotoEvidenceDomainResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: PhotoEvidenceDomainIssue[] };

export interface PhotoEvidenceBlobLike {
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface ComposePhotoMetadataInput {
  id: string;
  observationId: string;
  scope: RoseTrialObservationScope;
  sampleId?: string;
  mimeType: PhotoEvidenceMimeType;
  caption?: string;
  photoType?: RoseTrialObservationPhotoType;
  capturedAt?: string;
  sortOrder: number;
  createdAt: string;
}

export interface PhotoDraftFingerprintInput {
  filename: string;
  size: number;
  lastModified: number;
}

export interface PhotoEvidenceReconciliationDecision {
  locked: boolean;
  promoteIds: string[];
  deleteIds: string[];
  retainIds: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === "string"
    && value.trim().length > 0
    && Number.isFinite(Date.parse(value));
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function defaultBlobCheck(value: unknown): value is PhotoEvidenceBlobLike {
  return isRecord(value)
    && isNonNegativeInteger(value.size)
    && typeof value.type === "string"
    && typeof value.arrayBuffer === "function";
}

export function isSupportedPhotoEvidenceMimeType(value: unknown): value is PhotoEvidenceMimeType {
  return typeof value === "string"
    && (PHOTO_EVIDENCE_SUPPORTED_MIME_TYPES as readonly string[]).includes(value);
}

export function normalizePhotoEvidenceCaption(
  value: string | undefined
): PhotoEvidenceDomainResult<string | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  const normalized = value.trim();
  if (normalized.length > PHOTO_EVIDENCE_CAPTION_MAX_LENGTH) {
    return {
      ok: false,
      issues: [{ code: "caption_too_long", field: "caption" }],
    };
  }
  return { ok: true, value: normalized.length > 0 ? normalized : undefined };
}

function extensionForMimeType(mimeType: PhotoEvidenceMimeType): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export function createPhotoEvidenceFilename(
  photoId: string,
  mimeType: PhotoEvidenceMimeType
): string {
  const safeId = photoId
    .normalize("NFC")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
  return `rose-trial-photo-${safeId}.${extensionForMimeType(mimeType)}`;
}

export function composePhotoEvidenceMetadata(
  input: ComposePhotoMetadataInput
): PhotoEvidenceDomainResult<RoseTrialObservationPhoto> {
  const issues: PhotoEvidenceDomainIssue[] = [];
  if (input.id.trim().length === 0) issues.push({ code: "invalid_id", field: "id" });
  if (input.observationId.trim().length === 0) {
    issues.push({ code: "invalid_id", field: "observationId" });
  }
  if (!isSupportedPhotoEvidenceMimeType(input.mimeType)) {
    issues.push({ code: "unsupported_mime", field: "mimeType" });
  }
  if (!isNonNegativeInteger(input.sortOrder)) {
    issues.push({ code: "invalid_sort_order", field: "sortOrder" });
  }
  if (!isValidTimestamp(input.createdAt)) {
    issues.push({ code: "invalid_timestamp", field: "createdAt" });
  }
  if (input.capturedAt !== undefined && !isValidTimestamp(input.capturedAt)) {
    issues.push({ code: "invalid_timestamp", field: "capturedAt" });
  }
  if (input.scope === "sample" && (!input.sampleId || input.sampleId.trim().length === 0)) {
    issues.push({ code: "invalid_sample_reference", field: "sampleId" });
  }

  const caption = normalizePhotoEvidenceCaption(input.caption);
  if (!caption.ok) issues.push(...caption.issues);
  if (issues.length > 0 || !caption.ok) return { ok: false, issues };

  const value: RoseTrialObservationPhoto = {
    id: input.id,
    observationId: input.observationId,
    filename: createPhotoEvidenceFilename(input.id, input.mimeType),
    mimeType: input.mimeType,
    sortOrder: input.sortOrder,
    createdAt: input.createdAt,
    ...(input.scope === "sample" && input.sampleId ? { sampleId: input.sampleId } : {}),
    ...(caption.value ? { caption: caption.value } : {}),
    ...(input.photoType ? { photoType: input.photoType } : {}),
    ...(input.capturedAt ? { capturedAt: input.capturedAt } : {}),
  };
  return { ok: true, value };
}

export function createPhotoDraftFingerprint(input: PhotoDraftFingerprintInput): string {
  const normalizedFilename = input.filename.trim().normalize("NFC").toLocaleLowerCase("en-US");
  return `${normalizedFilename}\u0000${input.size}\u0000${input.lastModified}`;
}

export function validatePhotoEvidenceBinaryEnvelope(
  value: unknown,
  isBlob: (candidate: unknown) => candidate is PhotoEvidenceBlobLike = defaultBlobCheck
): PhotoEvidenceDomainResult<PhotoEvidenceBinaryEnvelope> {
  if (!isRecord(value)) {
    return { ok: false, issues: [{ code: "invalid_record", field: "record" }] };
  }

  const issues: PhotoEvidenceDomainIssue[] = [];
  if (typeof value.id !== "string" || value.id.trim().length === 0) {
    issues.push({ code: "invalid_id", field: "id" });
  }
  if (value.version !== 1) issues.push({ code: "invalid_version", field: "version" });
  if (!isBlob(value.blob)) issues.push({ code: "invalid_blob", field: "blob" });
  if (!isSupportedPhotoEvidenceMimeType(value.mimeType)) {
    issues.push({ code: "unsupported_mime", field: "mimeType" });
  }
  if (!isNonNegativeInteger(value.originalSizeBytes)) {
    issues.push({ code: "invalid_size", field: "originalSizeBytes" });
  }
  if (!isNonNegativeInteger(value.storedSizeBytes)) {
    issues.push({ code: "invalid_size", field: "storedSizeBytes" });
  }
  if (isBlob(value.blob)
    && isNonNegativeInteger(value.storedSizeBytes)
    && value.blob.size !== value.storedSizeBytes) {
    issues.push({ code: "blob_size_mismatch", field: "storedSizeBytes" });
  }
  if (isBlob(value.blob)
    && isSupportedPhotoEvidenceMimeType(value.mimeType)
    && value.blob.type !== value.mimeType) {
    issues.push({ code: "blob_mime_mismatch", field: "blob" });
  }
  if (isNonNegativeInteger(value.originalSizeBytes)
    && value.originalSizeBytes > PHOTO_EVIDENCE_MAX_ORIGINAL_BYTES) {
    issues.push({ code: "invalid_size", field: "originalSizeBytes" });
  }
  if (isNonNegativeInteger(value.storedSizeBytes)
    && isSupportedPhotoEvidenceMimeType(value.mimeType)) {
    const target = value.mimeType === "image/png"
      ? PHOTO_EVIDENCE_TARGET_PNG_BYTES
      : PHOTO_EVIDENCE_TARGET_LOSSY_BYTES;
    if (value.storedSizeBytes > target) {
      issues.push({ code: "invalid_size", field: "storedSizeBytes" });
    }
  }
  if (!isPositiveInteger(value.width)) {
    issues.push({ code: "invalid_dimensions", field: "width" });
  }
  if (!isPositiveInteger(value.height)) {
    issues.push({ code: "invalid_dimensions", field: "height" });
  }
  if (value.state !== "pending" && value.state !== "committed") {
    issues.push({ code: "invalid_state", field: "state" });
  }
  if (!isValidTimestamp(value.createdAt)) {
    issues.push({ code: "invalid_timestamp", field: "createdAt" });
  }

  return issues.length === 0
    ? { ok: true, value: value as unknown as PhotoEvidenceBinaryEnvelope }
    : { ok: false, issues };
}

export function decidePhotoEvidenceReconciliation(
  records: readonly PhotoEvidenceBinaryEnvelope[],
  referencedPhotoIds: readonly string[],
  observationLoadState: PhotoEvidenceObservationLoadState,
  now: string
): PhotoEvidenceReconciliationDecision {
  const promoteIds: string[] = [];
  const deleteIds: string[] = [];
  const retainIds: string[] = [];
  const locked = observationLoadState !== "valid" || !isValidTimestamp(now);
  if (locked) {
    return { locked: true, promoteIds, deleteIds, retainIds: records.map((record) => record.id) };
  }

  const referenced = new Set(referencedPhotoIds);
  const nowMs = Date.parse(now);
  for (const record of records) {
    if (referenced.has(record.id)) {
      if (record.state === "pending") promoteIds.push(record.id);
      else retainIds.push(record.id);
      continue;
    }

    const createdAtMs = Date.parse(record.createdAt);
    if (!Number.isFinite(createdAtMs) || createdAtMs > nowMs) {
      retainIds.push(record.id);
      continue;
    }
    const age = nowMs - createdAtMs;
    const eligible = record.state === "pending"
      ? age > PHOTO_EVIDENCE_PENDING_MAX_AGE_MS
      : age > PHOTO_EVIDENCE_COMMITTED_ORPHAN_MAX_AGE_MS;
    if (eligible) deleteIds.push(record.id);
    else retainIds.push(record.id);
  }

  return { locked: false, promoteIds, deleteIds, retainIds };
}

export function hasForbiddenPhotoPersistenceValue(value: unknown): boolean {
  const dataImagePrefix = ["data", "image/"].join(":");
  const seen = new Set<object>();
  const visit = (candidate: unknown): boolean => {
    if (typeof candidate === "string") {
      const normalized = candidate.trim().toLocaleLowerCase("en-US");
      return normalized.startsWith(dataImagePrefix) || normalized.startsWith("blob:");
    }
    if (typeof candidate !== "object" || candidate === null) return false;
    if (seen.has(candidate)) return false;
    seen.add(candidate);
    if (Array.isArray(candidate)) return candidate.some(visit);
    return Object.values(candidate as Record<string, unknown>).some(visit);
  };
  return visit(value);
}
