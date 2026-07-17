import { describe, expect, it } from "vitest";

import type {
  RoseTrialObservation,
  RoseTrialObservationValidationContext,
} from "@/components/workspaces/travel/rose-trial/observationTypes";
import {
  groupObservationsBySample,
  groupObservationsByTreatment,
  groupObservationsByTrialDay,
  selectLatestObservationBySample,
  selectLatestObservationByTreatment,
  selectLatestObservationForBatch,
  selectObservationsNewestFirst,
  selectRoseTrialObservations,
} from "@/components/workspaces/travel/rose-trial/observationSelectors";

function observation(overrides: Partial<RoseTrialObservation> = {}): RoseTrialObservation {
  return {
    id: "obs-a",
    batchId: "batch-1",
    trialDay: 1,
    observedAt: "2026-07-11T09:00:00.000Z",
    scope: "sample",
    sampleId: "sample-1",
    treatmentId: "t0",
    type: "general_condition",
    observedFacts: "ปกติ",
    status: "alive",
    followUpRequired: false,
    photoIds: [],
    createdAt: "2026-07-11T09:10:00.000Z",
    updatedAt: "2026-07-11T09:10:00.000Z",
    ...overrides,
  };
}

const records = [
  observation({ treatmentId: undefined }),
  observation({
    id: "obs-c",
    trialDay: 3,
    observedAt: "2026-07-13T09:00:00.000Z",
    createdAt: "2026-07-13T09:05:00.000Z",
    updatedAt: "2026-07-13T09:05:00.000Z",
    scope: "treatment",
    sampleId: undefined,
    treatmentId: "t1",
    type: "management_event",
    status: "monitoring",
    followUpRequired: true,
    photoIds: ["photo-1"],
  }),
  observation({
    id: "obs-b",
    trialDay: 3,
    observedAt: "2026-07-13T09:00:00.000Z",
    createdAt: "2026-07-13T09:05:00.000Z",
    updatedAt: "2026-07-13T09:05:00.000Z",
    sampleId: "sample-2",
    treatmentId: "t1",
    type: "growth_response",
    status: "weak",
    followUpRequired: true,
  }),
];

const context: RoseTrialObservationValidationContext = {
  batchId: "batch-1",
  treatments: [{ id: "t0", batchId: "batch-1" }, { id: "t1", batchId: "batch-1" }],
  samples: [
    { id: "sample-1", batchId: "batch-1", treatmentId: "t0" },
    { id: "sample-2", batchId: "batch-1", treatmentId: "t1" },
  ],
};

describe("Rose Trial observation selectors", () => {
  it("orders newest first with createdAt then id deterministic tie-breaks without mutation", () => {
    const source = [...records];
    expect(selectObservationsNewestFirst(source).map((record) => record.id)).toEqual(["obs-b", "obs-c", "obs-a"]);
    expect(source.map((record) => record.id)).toEqual(["obs-a", "obs-c", "obs-b"]);
  });

  it("filters by every explicit contract dimension", () => {
    expect(selectRoseTrialObservations(records, { batchId: "batch-1" })).toHaveLength(3);
    expect(selectRoseTrialObservations(records, { scope: "treatment" }).map((record) => record.id)).toEqual(["obs-c"]);
    expect(selectRoseTrialObservations(records, { treatmentId: "t1" }, context)).toHaveLength(2);
    expect(selectRoseTrialObservations(records, { treatmentId: "t0" }, context).map((record) => record.id)).toEqual(["obs-a"]);
    expect(selectRoseTrialObservations(records, { sampleId: "sample-2" }).map((record) => record.id)).toEqual(["obs-b"]);
    expect(selectRoseTrialObservations(records, { type: "growth_response" }).map((record) => record.id)).toEqual(["obs-b"]);
    expect(selectRoseTrialObservations(records, { status: "weak" }).map((record) => record.id)).toEqual(["obs-b"]);
    expect(selectRoseTrialObservations(records, { withPhotos: true }).map((record) => record.id)).toEqual(["obs-c"]);
    expect(selectRoseTrialObservations(records, { followUpRequired: true }).map((record) => record.id)).toEqual(["obs-b", "obs-c"]);
  });

  it("does not infer follow-up from status, type, or text", () => {
    const inferredLooking = observation({ status: "weak", observedFacts: "ต้องติดตาม", followUpRequired: false });
    expect(selectRoseTrialObservations([inferredLooking], { followUpRequired: true })).toEqual([]);
  });

  it("groups by trial day, sample, and treatment in newest-first order", () => {
    expect([...groupObservationsByTrialDay(records).keys()]).toEqual([3, 1]);
    expect(groupObservationsByTrialDay(records).get(3)?.map((record) => record.id)).toEqual(["obs-b", "obs-c"]);
    expect([...groupObservationsBySample(records).keys()]).toEqual(["sample-2", "sample-1"]);
    expect(groupObservationsByTreatment(records, context).get("t0")?.map((record) => record.id)).toEqual(["obs-a"]);
    expect(groupObservationsByTreatment(records, context).get("t1")?.map((record) => record.id)).toEqual(["obs-b", "obs-c"]);
  });

  it("selects latest records by batch, sample, and treatment", () => {
    expect(selectLatestObservationForBatch(records, "batch-1")?.id).toBe("obs-b");
    expect(selectLatestObservationBySample(records, "sample-1")?.id).toBe("obs-a");
    expect(selectLatestObservationByTreatment(records, "t1", context)?.id).toBe("obs-b");
    expect(selectLatestObservationBySample(records, "missing")).toBeNull();
  });

  it("handles empty input", () => {
    expect(selectObservationsNewestFirst([])).toEqual([]);
    expect(groupObservationsByTrialDay([]).size).toBe(0);
    expect(selectLatestObservationForBatch([], "batch-1")).toBeNull();
  });
});
