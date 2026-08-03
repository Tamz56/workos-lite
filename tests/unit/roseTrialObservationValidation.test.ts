import { describe, expect, it } from "vitest";

import type {
  RoseTrialObservation,
  RoseTrialObservationPhoto,
  RoseTrialObservationStoreV1,
  RoseTrialObservationValidationContext,
} from "@/components/workspaces/travel/rose-trial/observationTypes";
import {
  validateRoseTrialObservation,
  validateRoseTrialObservationPhoto,
  validateRoseTrialObservationStore,
} from "@/components/workspaces/travel/rose-trial/observationValidation";

const context: RoseTrialObservationValidationContext = {
  batchId: "batch-1",
  treatments: [
    { id: "t0", batchId: "batch-1" },
    { id: "t1", batchId: "batch-1" },
    { id: "foreign-treatment", batchId: "batch-2" },
  ],
  samples: [
    { id: "W-T0-01", batchId: "batch-1", treatmentId: "t0" },
    { id: "W-T1-01", batchId: "batch-1", treatmentId: "t1" },
    { id: "foreign-sample", batchId: "batch-2", treatmentId: "foreign-treatment" },
  ],
};

function observation(overrides: Partial<RoseTrialObservation> = {}): RoseTrialObservation {
  return {
    id: "obs-1",
    batchId: "batch-1",
    trialDay: 3,
    observedAt: "2026-07-14T09:00:00.000Z",
    scope: "batch",
    type: "general_condition",
    observedFacts: "ลำต้นยังเขียว",
    interpretation: "ควรติดตามต่อ",
    status: "monitoring",
    followUpRequired: false,
    photoIds: [],
    createdAt: "2026-07-14T09:05:00.000Z",
    updatedAt: "2026-07-14T09:05:00.000Z",
    ...overrides,
  };
}

function photo(overrides: Partial<RoseTrialObservationPhoto> = {}): RoseTrialObservationPhoto {
  return {
    id: "photo-1",
    observationId: "obs-1",
    filename: "rose.jpg",
    sortOrder: 0,
    createdAt: "2026-07-14T09:05:00.000Z",
    ...overrides,
  };
}

describe("Rose Trial observation validation", () => {
  it("accepts valid batch, treatment, and sample observations", () => {
    const records = [
      observation(),
      observation({ id: "obs-2", scope: "treatment", treatmentId: "t0" }),
      observation({ id: "obs-3", scope: "sample", sampleId: "W-T0-01" }),
    ];

    expect(records.map((record) => validateRoseTrialObservation(record, context).valid)).toEqual([true, true, true]);
  });

  it.each([
    ["missing batch", { batchId: "" }, "missing_required"],
    ["negative trial day", { trialDay: -1 }, "invalid_trial_day"],
    ["decimal trial day", { trialDay: 1.5 }, "invalid_trial_day"],
    ["invalid observedAt", { observedAt: "not-a-date" }, "invalid_date"],
    ["empty facts", { observedFacts: "   " }, "missing_required"],
    ["invalid createdAt", { createdAt: "nope" }, "invalid_date"],
    ["invalid updatedAt", { updatedAt: "nope" }, "invalid_date"],
  ])("rejects %s", (_name, overrides, code) => {
    const result = validateRoseTrialObservation(observation(overrides), context);
    expect(result.valid).toBe(false);
    expect(result.issues.some((entry) => entry.code === code)).toBe(true);
  });

  it("rejects updatedAt before createdAt", () => {
    const result = validateRoseTrialObservation(observation({
      createdAt: "2026-07-14T10:00:00.000Z",
      updatedAt: "2026-07-14T09:00:00.000Z",
    }), context);
    expect(result.issues.map((entry) => entry.code)).toContain("updated_before_created");
  });

  it("enforces scope relationships without duplicating treatment on sample scope", () => {
    expect(validateRoseTrialObservation(observation({ scope: "treatment" }), context).issues.map((entry) => entry.code))
      .toContain("missing_required");
    expect(validateRoseTrialObservation(observation({ scope: "sample" }), context).issues.map((entry) => entry.code))
      .toContain("missing_required");
    expect(validateRoseTrialObservation(observation({ scope: "batch", treatmentId: "t0" }), context).issues.map((entry) => entry.code))
      .toContain("invalid_scope_relationship");
    expect(validateRoseTrialObservation(observation({ scope: "sample", sampleId: "W-T0-01" }), context).valid)
      .toBe(true);
  });

  it("rejects unknown and cross-batch references", () => {
    const unknownSample = validateRoseTrialObservation(observation({ scope: "sample", sampleId: "missing" }), context);
    const unknownTreatment = validateRoseTrialObservation(observation({ scope: "treatment", treatmentId: "missing" }), context);
    const foreignSample = validateRoseTrialObservation(observation({ scope: "sample", sampleId: "foreign-sample" }), context);
    const foreignTreatment = validateRoseTrialObservation(observation({ scope: "treatment", treatmentId: "foreign-treatment" }), context);

    expect(unknownSample.issues.map((entry) => entry.code)).toContain("unknown_sample");
    expect(unknownTreatment.issues.map((entry) => entry.code)).toContain("unknown_treatment");
    expect(foreignSample.issues.map((entry) => entry.code)).toContain("cross_batch_reference");
    expect(foreignTreatment.issues.map((entry) => entry.code)).toContain("cross_batch_reference");
  });

  it("rejects mismatched sample and treatment relationships", () => {
    const result = validateRoseTrialObservation(observation({
      scope: "sample",
      sampleId: "W-T0-01",
      treatmentId: "t1",
    }), context);
    expect(result.issues.map((entry) => entry.code)).toContain("sample_treatment_mismatch");
  });

  it("requires explicit boolean follow-up and does not infer it from text or status", () => {
    const explicit = observation({
      observedFacts: "ต้องติดตามอาการ",
      status: "weak",
      followUpRequired: false,
    });
    expect(validateRoseTrialObservation(explicit, context).valid).toBe(true);

    const missing = { ...explicit } as Partial<RoseTrialObservation>;
    delete missing.followUpRequired;
    expect(validateRoseTrialObservation(missing, context).issues.map((entry) => entry.code)).toContain("invalid_type");
  });

  it("validates photo observation reference, sample ownership, and sort order", () => {
    const records = [observation()];
    expect(validateRoseTrialObservationPhoto(photo(), records, context).valid).toBe(true);
    expect(validateRoseTrialObservationPhoto(photo({ observationId: "missing" }), records, context).issues.map((entry) => entry.code))
      .toContain("broken_photo_reference");
    expect(validateRoseTrialObservationPhoto(photo({ sampleId: "foreign-sample" }), records, context).issues.map((entry) => entry.code))
      .toContain("cross_batch_reference");
    expect(validateRoseTrialObservationPhoto(photo({ sortOrder: -1 }), records, context).issues.map((entry) => entry.code))
      .toContain("invalid_sort_order");
  });

  it("detects duplicate observation IDs and broken photo references at store level", () => {
    const store: RoseTrialObservationStoreV1 = {
      version: 1,
      observations: [
        observation({ photoIds: ["missing-photo"] }),
        observation(),
      ],
      photos: [],
      updatedAt: "2026-07-14T10:00:00.000Z",
    };
    const result = validateRoseTrialObservationStore(store, context);
    expect(result.issues.map((entry) => entry.code)).toEqual(expect.arrayContaining([
      "duplicate_observation_id",
      "broken_photo_reference",
    ]));
  });
});
