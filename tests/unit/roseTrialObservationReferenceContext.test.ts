import { describe, expect, it } from "vitest";

import { createDefaultRoseTrialState } from "@/components/workspaces/travel/rose-trial/defaults";
import {
  createObservationReferenceContext,
  normalizeObservationTreatmentCode,
} from "@/components/workspaces/travel/rose-trial/observationReferenceContext";

describe("Rose Trial observation reference context", () => {
  it("derives a stable Batch identity and current references from Pilot start state", () => {
    const state = createDefaultRoseTrialState();
    const pilotStart = {
      ...state.pilotStart,
      started: true,
      startedAt: "2026-07-19T03:04:05.000Z",
    };

    const result = createObservationReferenceContext(pilotStart, state.treatments, state.samples);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.batchId).toBe("rose-trial:2026-07-19T03:04:05.000Z");
    expect(result.validationContext.batchId).toBe(result.batchId);
    expect(result.treatments.map((item) => item.id)).toEqual(state.treatments.map((item) => item.id));
    expect(result.samples.map((item) => item.id)).toEqual(state.samples.map((item) => item.id));
    expect(result.samples.every((sample) => sample.treatmentId)).toBe(true);
  });

  it.each([
    ["not started", { started: false, startedAt: "2026-07-19T03:04:05.000Z" }, "pilot_not_started"],
    ["missing startedAt", { started: true, startedAt: null }, "missing_started_at"],
    ["blank startedAt", { started: true, startedAt: "   " }, "missing_started_at"],
    ["invalid startedAt", { started: true, startedAt: "not-a-date" }, "invalid_started_at"],
  ] as const)("blocks context when Pilot is %s", (_label, patch, reason) => {
    const state = createDefaultRoseTrialState();
    const result = createObservationReferenceContext(
      { ...state.pilotStart, ...patch },
      state.treatments,
      state.samples
    );
    expect(result).toMatchObject({ ok: false, reason });
  });

  it("normalizes Unicode, case, and whitespace when matching Sample to Treatment", () => {
    const state = createDefaultRoseTrialState();
    const treatments = [{ ...state.treatments[0], code: " TÉ  1 " }];
    const samples = [{ ...state.samples[0], treatmentCode: "te\u0301 1" }];
    const result = createObservationReferenceContext(
      { ...state.pilotStart, started: true, startedAt: "2026-07-19T03:04:05.000Z" },
      treatments,
      samples
    );

    expect(normalizeObservationTreatmentCode(" TÉ  1 ")).toBe("té 1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.samples[0].treatmentId).toBe(treatments[0].id);
  });

  it("does not guess Sample relationships when normalized Treatment codes are ambiguous", () => {
    const state = createDefaultRoseTrialState();
    const treatments = [
      { ...state.treatments[0], id: "treatment-a", code: "T 1" },
      { ...state.treatments[1], id: "treatment-b", code: " t  1 " },
    ];
    const samples = [{ ...state.samples[0], treatmentCode: "T 1" }];
    const result = createObservationReferenceContext(
      { ...state.pilotStart, started: true, startedAt: "2026-07-19T03:04:05.000Z" },
      treatments,
      samples
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.samples[0].treatmentId).toBeUndefined();
    expect(result.validationContext.samples[0].treatmentId).toBeUndefined();
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: "ambiguous_treatment_code" }),
    ]);
  });

  it("does not mutate Setup inputs", () => {
    const state = createDefaultRoseTrialState();
    const pilotStart = { ...state.pilotStart, started: true, startedAt: "2026-07-19T03:04:05.000Z" };
    const before = JSON.stringify({ pilotStart, treatments: state.treatments, samples: state.samples });

    createObservationReferenceContext(pilotStart, state.treatments, state.samples);

    expect(JSON.stringify({ pilotStart, treatments: state.treatments, samples: state.samples })).toBe(before);
  });
});
