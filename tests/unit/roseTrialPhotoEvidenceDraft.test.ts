import { describe, expect, it } from "vitest";

import {
  appendPhotoEvidenceDraft,
  bindPhotoEvidenceDrafts,
  composeObservationStoreWithPhotos,
  removePhotoEvidenceDraft,
  updatePhotoEvidenceDraftCaption,
  validatePhotoEvidenceDrafts,
  type PhotoEvidenceDraft,
} from "@/components/workspaces/travel/rose-trial/photoEvidenceDraft";
import type {
  RoseTrialObservation,
  RoseTrialObservationPhoto,
} from "@/components/workspaces/travel/rose-trial/observationTypes";

const context = {
  batchId: "batch-1",
  treatments: [{ id: "treatment-1", batchId: "batch-1" }],
  samples: [{ id: "sample-1", batchId: "batch-1", treatmentId: "treatment-1" }],
};

function draft(overrides: Partial<PhotoEvidenceDraft> = {}): PhotoEvidenceDraft {
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
  return {
    localId: "draft-1",
    fingerprint: "rose.jpg\u00003\u00001",
    sourceLabel: "rose.jpg",
    blob,
    mimeType: "image/jpeg",
    originalSizeBytes: 5,
    storedSizeBytes: blob.size,
    width: 1200,
    height: 800,
    caption: "",
    ...overrides,
  };
}

function observation(overrides: Partial<RoseTrialObservation> = {}): RoseTrialObservation {
  return {
    id: "obs-1",
    batchId: "batch-1",
    trialDay: 1,
    observedAt: "2026-07-20T08:00:00.000Z",
    scope: "batch",
    type: "general_condition",
    observedFacts: "กิ่งยังเขียว",
    followUpRequired: false,
    photoIds: ["photo-1"],
    createdAt: "2026-07-20T08:05:00.000Z",
    updatedAt: "2026-07-20T08:05:00.000Z",
    ...overrides,
  };
}

function photo(overrides: Partial<RoseTrialObservationPhoto> = {}): RoseTrialObservationPhoto {
  return {
    id: "photo-1",
    observationId: "obs-1",
    filename: "rose-trial-photo-photo-1.jpg",
    mimeType: "image/jpeg",
    sortOrder: 0,
    createdAt: "2026-07-20T08:05:00.000Z",
    ...overrides,
  };
}

describe("Rose Trial photo evidence draft", () => {
  it("accepts empty defaults and adds, removes, and updates captions immutably", () => {
    expect(validatePhotoEvidenceDrafts([])).toEqual({ ok: true, value: [] });
    const original = [draft()];
    const added = appendPhotoEvidenceDraft(original, draft({ localId: "draft-2", fingerprint: "second" }));
    expect(added).toMatchObject({ ok: true, value: [{ localId: "draft-1" }, { localId: "draft-2" }] });
    expect(original).toHaveLength(1);
    const updated = updatePhotoEvidenceDraftCaption(original, "draft-1", "  รากใหม่  ");
    expect(updated[0].caption).toBe("  รากใหม่  ");
    expect(original[0].caption).toBe("");
    expect(removePhotoEvidenceDraft(updated, "draft-1")).toEqual([]);
  });

  it("enforces four drafts, unique fingerprints, stable order, and caption length", () => {
    const four = Array.from({ length: 4 }, (_, index) => draft({
      localId: `draft-${index}`,
      fingerprint: `fingerprint-${index}`,
    }));
    expect(appendPhotoEvidenceDraft(four, draft({ fingerprint: "fifth" })))
      .toMatchObject({ ok: false, issues: [{ code: "maximum_exceeded" }] });
    expect(appendPhotoEvidenceDraft([draft()], draft({ localId: "other" })))
      .toMatchObject({ ok: false, issues: [{ code: "duplicate_fingerprint" }] });
    expect(validatePhotoEvidenceDrafts([
      draft({ caption: "x".repeat(201) }),
    ])).toMatchObject({ ok: false, issues: [{ code: "caption_too_long", index: 0 }] });
    expect(validatePhotoEvidenceDrafts(four)).toMatchObject({
      ok: true,
      value: four.map((item) => ({ localId: item.localId })),
    });
  });

  it("binds persistent IDs in order, trims captions, omits empty captions, and creates pending envelopes", () => {
    const drafts = [
      draft({ caption: "  รากใหม่  " }),
      draft({ localId: "draft-2", fingerprint: "second", caption: "   " }),
    ];
    const before = drafts.map((item) => ({ ...item }));
    const result = bindPhotoEvidenceDrafts({
      drafts,
      photoIds: ["photo-1", "photo-2"],
      observationId: "obs-1",
      scope: "batch",
      createdAt: "2026-07-20T08:05:00.000Z",
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        metadata: [
          { id: "photo-1", caption: "รากใหม่", sortOrder: 0 },
          { id: "photo-2", sortOrder: 1 },
        ],
        envelopes: [
          { id: "photo-1", state: "pending" },
          { id: "photo-2", state: "pending" },
        ],
      },
    });
    if (result.ok) expect(result.value.metadata[1]).not.toHaveProperty("caption");
    expect(drafts).toEqual(before);
  });

  it("keeps sampleId only for sample scope and rejects persistent identity mismatch", () => {
    const sample = bindPhotoEvidenceDrafts({
      drafts: [draft()],
      photoIds: ["photo-1"],
      observationId: "obs-1",
      scope: "sample",
      sampleId: "sample-1",
      createdAt: "2026-07-20T08:05:00.000Z",
    });
    expect(sample).toMatchObject({ ok: true, value: { metadata: [{ sampleId: "sample-1" }] } });
    const treatment = bindPhotoEvidenceDrafts({
      drafts: [draft()],
      photoIds: ["photo-1"],
      observationId: "obs-1",
      scope: "treatment",
      sampleId: "must-not-persist",
      createdAt: "2026-07-20T08:05:00.000Z",
    });
    expect(treatment).toMatchObject({ ok: true });
    if (treatment.ok) expect(treatment.value.metadata[0]).not.toHaveProperty("sampleId");
    expect(bindPhotoEvidenceDrafts({
      drafts: [draft()],
      photoIds: [],
      observationId: "obs-1",
      scope: "batch",
      createdAt: "2026-07-20T08:05:00.000Z",
    })).toMatchObject({ ok: false, issues: [{ code: "identity_mismatch" }] });
  });

  it("composes Observation and photo metadata atomically without mutating inputs", () => {
    const base = { version: 1 as const, observations: [], photos: [], updatedAt: null };
    const record = observation();
    const metadata = [photo()];
    const result = composeObservationStoreWithPhotos(
      base,
      record,
      metadata,
      context,
      "2026-07-20T08:05:00.000Z"
    );
    expect(result).toMatchObject({
      ok: true,
      value: {
        observations: [{ id: "obs-1", photoIds: ["photo-1"] }],
        photos: [{ id: "photo-1", observationId: "obs-1" }],
      },
    });
    expect(base).toEqual({ version: 1, observations: [], photos: [], updatedAt: null });
    expect(record.photoIds).toEqual(["photo-1"]);
  });

  it("rejects duplicate IDs, broken references, and sample mismatches", () => {
    const base = {
      version: 1 as const,
      observations: [observation({ id: "existing", photoIds: ["existing-photo"] })],
      photos: [photo({ id: "existing-photo", observationId: "existing" })],
      updatedAt: "2026-07-20T08:05:00.000Z",
    };
    expect(composeObservationStoreWithPhotos(base, observation({ id: "existing", photoIds: [] }), [], context, "2026-07-20T08:06:00.000Z"))
      .toMatchObject({ ok: false, issues: [{ code: "duplicate_observation_id" }] });
    expect(composeObservationStoreWithPhotos(base, observation(), [photo({ id: "existing-photo" })], context, "2026-07-20T08:06:00.000Z"))
      .toMatchObject({ ok: false, issues: [{ code: "duplicate_photo_id" }] });
    expect(composeObservationStoreWithPhotos(
      { version: 1, observations: [], photos: [], updatedAt: null },
      observation(),
      [photo({ observationId: "wrong" })],
      context,
      "2026-07-20T08:06:00.000Z"
    )).toMatchObject({ ok: false, issues: [{ code: "observation_reference_mismatch" }] });
    expect(composeObservationStoreWithPhotos(
      { version: 1, observations: [], photos: [], updatedAt: null },
      observation({ scope: "sample", sampleId: "sample-1", treatmentId: "treatment-1" }),
      [photo()],
      context,
      "2026-07-20T08:06:00.000Z"
    )).toMatchObject({ ok: false, issues: [{ code: "sample_reference_mismatch" }] });
  });
});
