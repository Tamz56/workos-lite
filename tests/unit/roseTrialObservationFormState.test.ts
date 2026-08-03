import { describe, expect, it } from "vitest";

import type { ObservationReferenceContextResult } from "@/components/workspaces/travel/rose-trial/observationReferenceContext";
import {
  calculateObservationTrialDay,
  changeObservationDateTime,
  changeObservationScope,
  createObservationFormDraft,
  dateTimeLocalToIso,
  formatDateTimeLocal,
  OBSERVATION_INTERPRETATION_MAX_LENGTH,
  OBSERVED_FACTS_MAX_LENGTH,
  validateObservationFormDraft,
  type ObservationFormDraft,
} from "@/components/workspaces/travel/rose-trial/observationFormState";

const startedAt = new Date(2026, 6, 19, 9, 0).toISOString();
const submittedAt = new Date(2026, 6, 21, 12, 0);
const referenceContext: Extract<ObservationReferenceContextResult, { ok: true }> = {
  ok: true,
  batchId: `rose-trial:${startedAt}`,
  validationContext: {
    batchId: `rose-trial:${startedAt}`,
    treatments: [
      { id: "treatment-1", batchId: `rose-trial:${startedAt}` },
      { id: "treatment-2", batchId: `rose-trial:${startedAt}` },
    ],
    samples: [
      { id: "sample-1", batchId: `rose-trial:${startedAt}`, treatmentId: "treatment-1" },
      { id: "sample-ambiguous", batchId: `rose-trial:${startedAt}` },
    ],
  },
  treatments: [
    { id: "treatment-1", code: "T1", label: "T1 — Control" },
    { id: "treatment-2", code: "T2", label: "T2 — Treatment" },
  ],
  samples: [
    { id: "sample-1", label: "กิ่ง 1", treatmentCode: "T1", treatmentId: "treatment-1" },
    { id: "sample-ambiguous", label: "กิ่งกำกวม", treatmentCode: "T?" },
  ],
  warnings: [],
};

function validDraft(overrides: Partial<ObservationFormDraft> = {}): ObservationFormDraft {
  const observedAt = new Date(2026, 6, 20, 10, 30);
  return {
    ...createObservationFormDraft(observedAt, startedAt),
    observedFacts: "กิ่งยังเขียว",
    ...overrides,
  };
}

describe("Rose Trial observation form state", () => {
  it("creates defaults only from injected open time and derives Trial Day", () => {
    const openedAt = new Date(2026, 6, 20, 10, 30);
    expect(createObservationFormDraft(openedAt, startedAt)).toEqual({
      scope: "batch",
      treatmentId: "",
      sampleId: "",
      observedAtLocal: formatDateTimeLocal(openedAt),
      trialDay: 1,
      type: "general_condition",
      observedFacts: "",
      interpretation: "",
      status: "",
      followUpRequired: false,
    });
  });

  it("converts strict datetime-local values to ISO and rejects normalized invalid dates", () => {
    const local = formatDateTimeLocal(new Date(2026, 6, 20, 10, 30));
    expect(dateTimeLocalToIso(local)).toBe(new Date(2026, 6, 20, 10, 30).toISOString());
    expect(dateTimeLocalToIso("2026-02-30T10:00")).toBeNull();
    expect(dateTimeLocalToIso("not-a-date")).toBeNull();
  });

  it("calculates calendar Day 0 and Day 1 without fractional days", () => {
    expect(calculateObservationTrialDay(startedAt, new Date(2026, 6, 19, 23, 30).toISOString())).toBe(0);
    expect(calculateObservationTrialDay(startedAt, new Date(2026, 6, 20, 0, 1).toISOString())).toBe(1);
    expect(calculateObservationTrialDay(startedAt, new Date(2026, 6, 18, 23, 59).toISOString())).toBeNull();
  });

  it("clears stale target IDs on every scope transition without mutating input", () => {
    const source = validDraft({ scope: "sample", treatmentId: "treatment-1", sampleId: "sample-1" });
    const before = structuredClone(source);
    expect(changeObservationScope(source, "batch")).toMatchObject({
      scope: "batch",
      treatmentId: "",
      sampleId: "",
    });
    expect(changeObservationScope(source, "treatment")).toMatchObject({
      scope: "treatment",
      treatmentId: "",
      sampleId: "",
    });
    expect(source).toEqual(before);
  });

  it("recalculates Trial Day when the local datetime changes", () => {
    const source = validDraft();
    const changed = changeObservationDateTime(
      source,
      formatDateTimeLocal(new Date(2026, 6, 21, 8, 0)),
      startedAt
    );
    expect(changed.trialDay).toBe(2);
    expect(source.trialDay).toBe(1);
  });

  it("prepares normalized Batch and Treatment inputs", () => {
    const batch = validateObservationFormDraft(
      validDraft({
        treatmentId: "stale-treatment",
        sampleId: "stale-sample",
        observedFacts: "  ใบยังเขียว  ",
        interpretation: "  ติดตามต่อ  ",
      }),
      referenceContext,
      startedAt,
      submittedAt
    );
    expect(batch).toMatchObject({
      valid: true,
      input: {
        scope: "batch",
        observedFacts: "ใบยังเขียว",
        interpretation: "ติดตามต่อ",
        photoIds: [],
      },
    });
    if (batch.valid) {
      expect(batch.input).not.toHaveProperty("treatmentId");
      expect(batch.input).not.toHaveProperty("sampleId");
    }

    const treatment = validateObservationFormDraft(
      validDraft({ scope: "treatment", treatmentId: "treatment-2", sampleId: "stale" }),
      referenceContext,
      startedAt,
      submittedAt
    );
    expect(treatment).toMatchObject({
      valid: true,
      input: { scope: "treatment", treatmentId: "treatment-2" },
    });
    if (treatment.valid) expect(treatment.input).not.toHaveProperty("sampleId");
  });

  it("derives Treatment from Sample and rejects ambiguous mapping", () => {
    const sample = validateObservationFormDraft(
      validDraft({ scope: "sample", sampleId: "sample-1", treatmentId: "stale" }),
      referenceContext,
      startedAt,
      submittedAt
    );
    expect(sample).toMatchObject({
      valid: true,
      input: {
        scope: "sample",
        sampleId: "sample-1",
        treatmentId: "treatment-1",
      },
    });

    const ambiguous = validateObservationFormDraft(
      validDraft({ scope: "sample", sampleId: "sample-ambiguous" }),
      referenceContext,
      startedAt,
      submittedAt
    );
    expect(ambiguous).toMatchObject({ valid: false, errors: { sampleId: expect.any(String) } });
  });

  it.each([
    ["missing Treatment", { scope: "treatment", treatmentId: "" }, "treatmentId"],
    ["missing Sample", { scope: "sample", sampleId: "" }, "sampleId"],
    ["blank facts", { observedFacts: "   " }, "observedFacts"],
    ["facts too long", { observedFacts: "x".repeat(OBSERVED_FACTS_MAX_LENGTH + 1) }, "observedFacts"],
    ["interpretation too long", { interpretation: "x".repeat(OBSERVATION_INTERPRETATION_MAX_LENGTH + 1) }, "interpretation"],
  ] as const)("rejects %s", (_label, patch, field) => {
    const result = validateObservationFormDraft(
      validDraft(patch as Partial<ObservationFormDraft>),
      referenceContext,
      startedAt,
      submittedAt
    );
    expect(result).toMatchObject({ valid: false, errors: { [field]: expect.any(String) } });
  });

  it("rejects invalid, pre-start, and future datetimes", () => {
    const invalid = validateObservationFormDraft(
      validDraft({ observedAtLocal: "invalid", trialDay: null }),
      referenceContext,
      startedAt,
      submittedAt
    );
    expect(invalid).toMatchObject({ valid: false, errors: { observedAtLocal: expect.any(String) } });

    const preStart = validateObservationFormDraft(
      validDraft({ observedAtLocal: formatDateTimeLocal(new Date(2026, 6, 19, 8, 59)), trialDay: 0 }),
      referenceContext,
      startedAt,
      submittedAt
    );
    expect(preStart).toMatchObject({ valid: false, errors: { observedAtLocal: expect.any(String) } });

    const future = validateObservationFormDraft(
      validDraft({ observedAtLocal: formatDateTimeLocal(new Date(2026, 6, 21, 12, 1)), trialDay: 2 }),
      referenceContext,
      startedAt,
      submittedAt
    );
    expect(future).toMatchObject({ valid: false, errors: { observedAtLocal: expect.any(String) } });
  });

  it("does not mutate draft or reference inputs during validation", () => {
    const draft = validDraft({ scope: "sample", sampleId: "sample-1" });
    const draftBefore = structuredClone(draft);
    const contextBefore = structuredClone(referenceContext);
    validateObservationFormDraft(draft, referenceContext, startedAt, submittedAt);
    expect(draft).toEqual(draftBefore);
    expect(referenceContext).toEqual(contextBefore);
  });
});
