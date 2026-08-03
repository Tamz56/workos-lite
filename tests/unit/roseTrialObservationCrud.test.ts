import { describe, expect, it } from "vitest";

import type {
  RoseTrialObservation,
  RoseTrialObservationStoreV1,
  RoseTrialObservationValidationContext,
} from "@/components/workspaces/travel/rose-trial/observationTypes";
import {
  addRoseTrialObservation,
  createRoseTrialObservation,
  removeRoseTrialObservation,
  updateRoseTrialObservation,
} from "@/components/workspaces/travel/rose-trial/observationCrud";

const context: RoseTrialObservationValidationContext = {
  batchId: "batch-1",
  treatments: [{ id: "t0", batchId: "batch-1" }],
  samples: [{ id: "sample-1", batchId: "batch-1", treatmentId: "t0" }],
};

function observation(overrides: Partial<RoseTrialObservation> = {}): RoseTrialObservation {
  return {
    id: "obs-1",
    batchId: "batch-1",
    trialDay: 0,
    observedAt: "2026-07-11T09:00:00.000Z",
    scope: "sample",
    sampleId: "sample-1",
    type: "general_condition",
    observedFacts: "กิ่งยังเขียว",
    followUpRequired: false,
    photoIds: [],
    createdAt: "2026-07-11T09:05:00.000Z",
    updatedAt: "2026-07-11T09:05:00.000Z",
    ...overrides,
  };
}

function store(records: RoseTrialObservation[] = []): RoseTrialObservationStoreV1 {
  return { version: 1, observations: records, photos: [], updatedAt: null };
}

describe("Rose Trial observation CRUD", () => {
  it("creates a valid record with injected ID and timestamp", () => {
    const result = createRoseTrialObservation({
      batchId: "batch-1",
      trialDay: 0,
      observedAt: "2026-07-11T09:00:00.000Z",
      scope: "batch",
      type: "environment",
      observedFacts: "ความชื้นสูง",
      followUpRequired: false,
      photoIds: [],
    }, {
      id: "injected-id",
      timestamp: "2026-07-11T09:05:00.000Z",
    }, context);

    expect(result).toMatchObject({
      ok: true,
      value: {
        id: "injected-id",
        createdAt: "2026-07-11T09:05:00.000Z",
        updatedAt: "2026-07-11T09:05:00.000Z",
      },
    });
  });

  it("rejects an invalid create without inventing defaults", () => {
    const result = createRoseTrialObservation({
      batchId: "batch-1",
      trialDay: -1,
      observedAt: "invalid",
      scope: "batch",
      type: "general_condition",
      observedFacts: "",
      followUpRequired: false,
      photoIds: [],
    }, { id: "obs-bad", timestamp: "2026-07-11T09:05:00.000Z" }, context);
    expect(result.ok).toBe(false);
  });

  it("adds a valid observation immutably", () => {
    const source = store();
    const result = addRoseTrialObservation(source, observation(), context, "2026-07-11T10:00:00.000Z");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.observations).toHaveLength(1);
      expect(result.value.updatedAt).toBe("2026-07-11T10:00:00.000Z");
    }
    expect(source.observations).toEqual([]);
    expect(source.updatedAt).toBeNull();
  });

  it("rejects duplicate IDs and invalid records", () => {
    const source = store([observation()]);
    expect(addRoseTrialObservation(source, observation(), context, "2026-07-11T10:00:00.000Z"))
      .toMatchObject({ ok: false });
    expect(addRoseTrialObservation(store(), observation({ trialDay: -1 }), context, "2026-07-11T10:00:00.000Z"))
      .toMatchObject({ ok: false });
  });

  it("updates immutably while preserving ID, batchId, and createdAt", () => {
    const original = observation();
    const source = store([original]);
    const result = updateRoseTrialObservation(
      source,
      "obs-1",
      { observedFacts: "เริ่มแตกยอด", followUpRequired: true },
      "2026-07-12T09:00:00.000Z",
      context
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.observations[0]).toMatchObject({
        id: "obs-1",
        batchId: "batch-1",
        createdAt: original.createdAt,
        updatedAt: "2026-07-12T09:00:00.000Z",
        observedFacts: "เริ่มแตกยอด",
        followUpRequired: true,
      });
    }
    expect(source.observations[0]).toBe(original);
    expect(original.observedFacts).toBe("กิ่งยังเขียว");
  });

  it("rejects unknown and invalid updates", () => {
    const source = store([observation()]);
    expect(updateRoseTrialObservation(source, "missing", {}, "2026-07-12T09:00:00.000Z", context))
      .toMatchObject({ ok: false });
    expect(updateRoseTrialObservation(source, "obs-1", { trialDay: -1 }, "2026-07-12T09:00:00.000Z", context))
      .toMatchObject({ ok: false });
    expect(updateRoseTrialObservation(source, "obs-1", {}, "2026-07-10T09:00:00.000Z", context))
      .toMatchObject({ ok: false });
  });

  it("removes an observation and cascades its photo metadata only", () => {
    const source: RoseTrialObservationStoreV1 = {
      version: 1,
      observations: [observation({ photoIds: ["photo-1"] }), observation({ id: "obs-2" })],
      photos: [
        { id: "photo-1", observationId: "obs-1", filename: "one.jpg", sortOrder: 0, createdAt: "2026-07-11T09:05:00.000Z" },
        { id: "photo-2", observationId: "obs-2", filename: "two.jpg", sortOrder: 0, createdAt: "2026-07-11T09:05:00.000Z" },
      ],
      updatedAt: null,
    };
    const result = removeRoseTrialObservation(source, "obs-1", "2026-07-12T09:00:00.000Z", context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.removed).toBe(true);
      expect(result.value.removedPhotoIds).toEqual(["photo-1"]);
      expect(result.value.store.observations.map((record) => record.id)).toEqual(["obs-2"]);
      expect(result.value.store.photos.map((record) => record.id)).toEqual(["photo-2"]);
    }
    expect(source.observations).toHaveLength(2);
    expect(source.photos).toHaveLength(2);
  });

  it("removes an unknown ID safely without changing identity", () => {
    const source = store([observation()]);
    const result = removeRoseTrialObservation(source, "missing", "2026-07-12T09:00:00.000Z", context);
    expect(result).toEqual({ ok: true, value: { store: source, removed: false, removedPhotoIds: [] } });
  });

  it("rejects invalid store timestamps in add and delete operations", () => {
    expect(addRoseTrialObservation(store(), observation(), context, "invalid")).toMatchObject({ ok: false });
    expect(removeRoseTrialObservation(store([observation()]), "obs-1", "invalid", context)).toMatchObject({ ok: false });
  });
});
