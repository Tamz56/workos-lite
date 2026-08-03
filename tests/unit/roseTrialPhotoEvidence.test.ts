import { describe, expect, it } from "vitest";

import {
  PHOTO_EVIDENCE_CAPTION_MAX_LENGTH,
  PHOTO_EVIDENCE_COMMITTED_ORPHAN_MAX_AGE_MS,
  PHOTO_EVIDENCE_MAX_LONG_EDGE,
  PHOTO_EVIDENCE_MAX_ORIGINAL_BYTES,
  PHOTO_EVIDENCE_MAX_PER_OBSERVATION,
  PHOTO_EVIDENCE_PENDING_MAX_AGE_MS,
  PHOTO_EVIDENCE_SUPPORTED_MIME_TYPES,
  PHOTO_EVIDENCE_TARGET_LOSSY_BYTES,
  PHOTO_EVIDENCE_TARGET_PNG_BYTES,
  composePhotoEvidenceMetadata,
  createPhotoDraftFingerprint,
  createPhotoEvidenceFilename,
  decidePhotoEvidenceReconciliation,
  hasForbiddenPhotoPersistenceValue,
  isSupportedPhotoEvidenceMimeType,
  normalizePhotoEvidenceCaption,
  validatePhotoEvidenceBinaryEnvelope,
  type PhotoEvidenceBinaryEnvelope,
  type PhotoEvidenceBlobLike,
} from "@/components/workspaces/travel/rose-trial/photoEvidence";

function blob(size = 3, type = "image/jpeg"): PhotoEvidenceBlobLike {
  return {
    size,
    type,
    arrayBuffer: async () => new Uint8Array(size).buffer,
  };
}

function envelope(
  overrides: Partial<PhotoEvidenceBinaryEnvelope> = {}
): PhotoEvidenceBinaryEnvelope {
  return {
    id: "photo-1",
    version: 1,
    blob: blob() as Blob,
    mimeType: "image/jpeg",
    originalSizeBytes: 5,
    storedSizeBytes: 3,
    width: 1200,
    height: 800,
    state: "pending",
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("Rose Trial photo evidence domain", () => {
  it("locks the approved MVP constants and MIME allowlist", () => {
    expect(PHOTO_EVIDENCE_MAX_PER_OBSERVATION).toBe(4);
    expect(PHOTO_EVIDENCE_MAX_ORIGINAL_BYTES).toBe(12 * 1024 * 1024);
    expect(PHOTO_EVIDENCE_MAX_LONG_EDGE).toBe(1920);
    expect(PHOTO_EVIDENCE_TARGET_LOSSY_BYTES).toBe(Math.floor(1.5 * 1024 * 1024));
    expect(PHOTO_EVIDENCE_TARGET_PNG_BYTES).toBe(3 * 1024 * 1024);
    expect(PHOTO_EVIDENCE_CAPTION_MAX_LENGTH).toBe(200);
    expect(PHOTO_EVIDENCE_SUPPORTED_MIME_TYPES).toEqual(["image/jpeg", "image/png", "image/webp"]);
    expect(isSupportedPhotoEvidenceMimeType("image/webp")).toBe(true);
    for (const value of ["image/svg+xml", "image/gif", "image/heic", "video/mp4", "audio/mpeg", "application/pdf"]) {
      expect(isSupportedPhotoEvidenceMimeType(value)).toBe(false);
    }
  });

  it("normalizes captions without truncating over-limit input", () => {
    expect(normalizePhotoEvidenceCaption("  กิ่งยังเขียว  ")).toEqual({ ok: true, value: "กิ่งยังเขียว" });
    expect(normalizePhotoEvidenceCaption("   ")).toEqual({ ok: true, value: undefined });
    expect(normalizePhotoEvidenceCaption("ก".repeat(201))).toEqual({
      ok: false,
      issues: [{ code: "caption_too_long", field: "caption" }],
    });
  });

  it("creates deterministic private filenames and canonical metadata", () => {
    expect(createPhotoEvidenceFilename("photo:abc/123", "image/jpeg"))
      .toBe("rose-trial-photo-photo-abc-123.jpg");
    const result = composePhotoEvidenceMetadata({
      id: "photo-1",
      observationId: "obs-1",
      scope: "sample",
      sampleId: "sample-1",
      mimeType: "image/png",
      caption: "  รากใหม่  ",
      photoType: "root_closeup",
      capturedAt: "2026-07-20T08:00:00.000Z",
      sortOrder: 2,
      createdAt: "2026-07-20T08:05:00.000Z",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        id: "photo-1",
        observationId: "obs-1",
        sampleId: "sample-1",
        filename: "rose-trial-photo-photo-1.png",
        mimeType: "image/png",
        caption: "รากใหม่",
        photoType: "root_closeup",
        capturedAt: "2026-07-20T08:00:00.000Z",
        sortOrder: 2,
        createdAt: "2026-07-20T08:05:00.000Z",
      },
    });
  });

  it("keeps sampleId only for sample scope and validates composition inputs", () => {
    const batch = composePhotoEvidenceMetadata({
      id: "photo-1",
      observationId: "obs-1",
      scope: "batch",
      sampleId: "must-not-persist",
      mimeType: "image/webp",
      sortOrder: 0,
      createdAt: "2026-07-20T08:05:00.000Z",
    });
    expect(batch.ok).toBe(true);
    if (batch.ok) expect(batch.value).not.toHaveProperty("sampleId");

    const invalid = composePhotoEvidenceMetadata({
      id: "",
      observationId: "",
      scope: "sample",
      mimeType: "image/jpeg",
      sortOrder: -1,
      createdAt: "invalid",
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.issues.map((issue) => issue.field)).toEqual(expect.arrayContaining([
        "id",
        "observationId",
        "sampleId",
        "sortOrder",
        "createdAt",
      ]));
    }
  });

  it("validates pending and committed binary envelopes", () => {
    for (const state of ["pending", "committed"] as const) {
      expect(validatePhotoEvidenceBinaryEnvelope(
        envelope({ state }),
        (value): value is PhotoEvidenceBlobLike => Boolean(value && typeof value === "object" && "arrayBuffer" in value)
      )).toMatchObject({ ok: true });
    }
  });

  it("rejects invalid binary state, dimensions, timestamps, MIME and Blob size mismatch", () => {
    const invalid = {
      ...envelope(),
      state: "draft",
      width: 0,
      height: 1.5,
      createdAt: "invalid",
      mimeType: "image/gif",
      storedSizeBytes: 99,
      blob: blob(3, "image/png") as Blob,
    };
    const result = validatePhotoEvidenceBinaryEnvelope(
      invalid,
      (value): value is PhotoEvidenceBlobLike => Boolean(value && typeof value === "object" && "arrayBuffer" in value)
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
        "invalid_state",
        "invalid_dimensions",
        "invalid_timestamp",
        "unsupported_mime",
        "blob_size_mismatch",
      ]));
    }
    const mimeMismatch = validatePhotoEvidenceBinaryEnvelope(
      envelope({ blob: blob(3, "image/png") as Blob }),
      (value): value is PhotoEvidenceBlobLike => Boolean(value && typeof value === "object" && "arrayBuffer" in value)
    );
    expect(mimeMismatch).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([{ code: "blob_mime_mismatch", field: "blob" }]),
    });
  });

  it("creates deterministic draft fingerprints without treating them as photo IDs", () => {
    const source = { filename: "  RÓSE.JPG ", size: 123, lastModified: 456 };
    expect(createPhotoDraftFingerprint(source)).toBe("róse.jpg\u0000123\u0000456");
    expect(createPhotoDraftFingerprint({ ...source })).toBe(createPhotoDraftFingerprint(source));
  });

  it("promotes referenced pending records and retains referenced committed records", () => {
    const records = [
      envelope({ id: "pending", state: "pending" }),
      envelope({ id: "committed", state: "committed" }),
    ];
    const decision = decidePhotoEvidenceReconciliation(
      records,
      ["pending", "committed"],
      "valid",
      "2026-07-21T00:00:00.000Z"
    );
    expect(decision).toEqual({
      locked: false,
      promoteIds: ["pending"],
      deleteIds: [],
      retainIds: ["committed"],
    });
  });

  it("deletes only stale unreferenced pending and committed records", () => {
    const now = Date.parse("2026-07-21T00:00:00.000Z");
    const records = [
      envelope({ id: "stale-pending", state: "pending", createdAt: new Date(now - PHOTO_EVIDENCE_PENDING_MAX_AGE_MS - 1).toISOString() }),
      envelope({ id: "fresh-pending", state: "pending", createdAt: new Date(now - PHOTO_EVIDENCE_PENDING_MAX_AGE_MS).toISOString() }),
      envelope({ id: "stale-committed", state: "committed", createdAt: new Date(now - PHOTO_EVIDENCE_COMMITTED_ORPHAN_MAX_AGE_MS - 1).toISOString() }),
      envelope({ id: "fresh-committed", state: "committed", createdAt: new Date(now - PHOTO_EVIDENCE_COMMITTED_ORPHAN_MAX_AGE_MS).toISOString() }),
    ];
    expect(decidePhotoEvidenceReconciliation(records, [], "valid", new Date(now).toISOString())).toEqual({
      locked: false,
      promoteIds: [],
      deleteIds: ["stale-pending", "stale-committed"],
      retainIds: ["fresh-pending", "fresh-committed"],
    });
  });

  it.each(["partial", "failed", "unavailable", "unsupported_version"] as const)(
    "locks cleanup for %s Observation state",
    (state) => {
      expect(decidePhotoEvidenceReconciliation([envelope()], [], state, "2026-07-21T00:00:00.000Z"))
        .toEqual({ locked: true, promoteIds: [], deleteIds: [], retainIds: ["photo-1"] });
    }
  );

  it("does not mutate reconciliation inputs", () => {
    const records = [envelope()];
    const references = ["photo-1"];
    const before = { records: [...records], references: [...references] };
    decidePhotoEvidenceReconciliation(records, references, "valid", "2026-07-21T00:00:00.000Z");
    expect(records).toEqual(before.records);
    expect(references).toEqual(before.references);
  });

  it("detects forbidden persistent data/object URLs without touching Blob data", () => {
    expect(hasForbiddenPhotoPersistenceValue({ preview: ["data", "image/jpeg;base64,abc"].join(":") })).toBe(true);
    expect(hasForbiddenPhotoPersistenceValue({ preview: "blob:https://example.test/1" })).toBe(true);
    expect(hasForbiddenPhotoPersistenceValue({ caption: "ภาพกิ่งชำ", nested: [1, null] })).toBe(false);
  });
});
