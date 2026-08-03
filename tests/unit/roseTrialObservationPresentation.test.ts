import { describe, expect, it } from "vitest";

import {
  buildObservationFilterOptions,
  formatObservationDate,
  getObservationWarningMessages,
  groupObservationsForTimeline,
  OBSERVATION_SCOPE_LABELS,
  OBSERVATION_STATUS_LABELS,
  OBSERVATION_TYPE_LABELS,
  resolveObservationTargetLabel,
  summarizeObservations,
} from "@/components/workspaces/travel/rose-trial/observationPresentation";
import type { RoseTrialObservation } from "@/components/workspaces/travel/rose-trial/observationTypes";

function observation(overrides: Partial<RoseTrialObservation> = {}): RoseTrialObservation {
  return {
    id: "obs-1",
    batchId: "batch-1",
    trialDay: 1,
    observedAt: "2026-07-19T09:00:00.000Z",
    scope: "sample",
    treatmentId: "treatment-1",
    sampleId: "sample-1",
    type: "general_condition",
    observedFacts: "กิ่งยังเขียว",
    status: "alive",
    followUpRequired: false,
    photoIds: [],
    createdAt: "2026-07-19T09:01:00.000Z",
    updatedAt: "2026-07-19T09:01:00.000Z",
    ...overrides,
  };
}

describe("Rose Trial observation presentation", () => {
  it("maps scope, type, and status labels to approved Thai copy", () => {
    expect(OBSERVATION_SCOPE_LABELS).toEqual({ batch: "ทั้งการทดลอง", treatment: "กลุ่มทดลอง", sample: "กิ่งชำรายกิ่ง" });
    expect(OBSERVATION_TYPE_LABELS.management_event).toBe("เหตุการณ์การจัดการ");
    expect(OBSERVATION_STATUS_LABELS.not_assessed).toBe("ยังไม่ประเมิน");
  });

  it("summarizes descriptive metrics and the latest observed date", () => {
    const records = [
      observation(),
      observation({ id: "obs-2", scope: "batch", treatmentId: undefined, sampleId: undefined, trialDay: 2, observedAt: "2026-07-20T09:00:00.000Z", followUpRequired: true }),
      observation({ id: "obs-3", scope: "treatment", sampleId: undefined, treatmentId: "treatment-2" }),
    ];
    expect(summarizeObservations(records)).toEqual({
      total: 3,
      batch: 1,
      treatment: 1,
      sample: 1,
      followUp: 1,
      observedSamples: 1,
      latestObservedAt: "2026-07-20T09:00:00.000Z",
    });
  });

  it("groups numeric Trial Days descending and orders records newest first without mutation", () => {
    const records = [
      observation({ id: "day-2-old", trialDay: 2, observedAt: "2026-07-19T08:00:00.000Z" }),
      observation({ id: "day-10", trialDay: 10 }),
      observation({ id: "day-2-new", trialDay: 2, observedAt: "2026-07-19T10:00:00.000Z" }),
    ];
    const before = records.map((item) => item.id);
    const groups = groupObservationsForTimeline(records);
    expect(groups.map((group) => group.trialDay)).toEqual([10, 2]);
    expect(groups[1].observations.map((item) => item.id)).toEqual(["day-2-new", "day-2-old"]);
    expect(records.map((item) => item.id)).toEqual(before);
  });

  it("resolves current labels and explicit orphan fallbacks", () => {
    const treatments = [{ id: "treatment-1", code: "T1", label: "T1 — Clonex" }];
    const samples = [{ id: "sample-1", label: "กิ่ง 1 (sample-1)", treatmentCode: "T1", treatmentId: "treatment-1" }];
    expect(resolveObservationTargetLabel(observation(), treatments, samples)).toBe("กิ่ง 1 (sample-1)");
    expect(resolveObservationTargetLabel(observation({ scope: "treatment", sampleId: undefined, treatmentId: "missing" }), treatments, samples)).toBe("ไม่พบกลุ่มทดลอง (ID: missing)");
    expect(resolveObservationTargetLabel(observation({ sampleId: "missing" }), treatments, samples)).toBe("ไม่พบกิ่งชำ (ID: missing)");
  });

  it("maps supported warnings only when recordId, code, field, and severity all match", () => {
    const warnings = [
      { field: "treatmentId", code: "unknown_treatment", message: "raw treatment", severity: "warning" as const, recordId: "obs-1" },
      { field: "sampleId", code: "unknown_sample", message: "raw sample", severity: "warning" as const, recordId: "obs-1" },
      { field: "treatmentId", code: "sample_treatment_mismatch", message: "raw mismatch", severity: "warning" as const, recordId: "obs-1" },
      { field: "batchId", code: "cross_batch_reference", message: "raw batch", severity: "warning" as const, recordId: "obs-1" },
      { field: "photoIds", code: "broken_photo_reference", message: "raw photo", severity: "warning" as const, recordId: "obs-1" },
    ];
    expect(getObservationWarningMessages(warnings, "obs-1")).toEqual([
      "ไม่พบกลุ่มทดลองที่บันทึกไว้นี้ในการตั้งค่าปัจจุบัน",
      "ไม่พบกิ่งชำที่บันทึกไว้นี้ในการตั้งค่าปัจจุบัน",
      "ข้อมูลกิ่งชำและกลุ่มทดลองไม่ตรงกับการตั้งค่าปัจจุบัน",
      "ข้อมูลอ้างอิงอยู่คนละชุดการทดลองกับ Batch ปัจจุบัน",
      "ข้อมูลภาพบางรายการเชื่อมโยงได้ไม่สมบูรณ์",
    ]);
  });

  it("does not map mismatched records, fields, severities, or unknown codes", () => {
    const warnings = [
      { field: "sampleId", code: "unknown_sample", message: "other record", severity: "warning" as const, recordId: "obs-2" },
      { field: "treatmentId", code: "unknown_sample", message: "wrong field", severity: "warning" as const, recordId: "obs-1" },
      { field: "sampleId", code: "unknown_sample", message: "error issue", severity: "error" as const, recordId: "obs-1" },
      { field: "sampleId", code: "future_warning", message: "unknown code", severity: "warning" as const, recordId: "obs-1" },
      { field: "sampleId", code: "toString", message: "prototype property", severity: "warning" as const, recordId: "obs-1" },
      { field: "futureField", code: "cross_batch_reference", message: "unknown field", severity: "warning" as const, recordId: "obs-1" },
    ];

    expect(getObservationWarningMessages(warnings, "obs-1")).toEqual([]);
  });

  it("accepts every validator field for cross-batch references", () => {
    const warnings = ["batchId", "treatmentId", "sampleId"].map((field) => ({
      field,
      code: "cross_batch_reference",
      message: `raw ${field}`,
      severity: "warning" as const,
      recordId: "obs-1",
    }));

    expect(getObservationWarningMessages(warnings, "obs-1")).toEqual([
      "ข้อมูลอ้างอิงอยู่คนละชุดการทดลองกับ Batch ปัจจุบัน",
    ]);
  });

  it("deduplicates valid copy deterministically without mutating warning input or exposing raw data", () => {
    const warnings = [
      { field: "sampleId", code: "unknown_sample", message: "raw first", severity: "warning" as const, recordId: "obs-1" },
      { field: "sampleId", code: "unknown_sample", message: "raw duplicate", severity: "warning" as const, recordId: "obs-1" },
      { field: "treatmentId", code: "unknown_treatment", message: "raw second", severity: "warning" as const, recordId: "obs-1" },
      { field: "sampleId", code: "unknown_sample", message: "raw other", severity: "warning" as const, recordId: "obs-2" },
    ];
    const before = JSON.stringify(warnings);

    const messages = getObservationWarningMessages(warnings, "obs-1");

    expect(messages).toEqual([
      "ไม่พบกิ่งชำที่บันทึกไว้นี้ในการตั้งค่าปัจจุบัน",
      "ไม่พบกลุ่มทดลองที่บันทึกไว้นี้ในการตั้งค่าปัจจุบัน",
    ]);
    expect(messages.join(" ")).not.toMatch(/raw|unknown_sample|sampleId/);
    expect(JSON.stringify(warnings)).toBe(before);
  });

  it("includes orphan IDs in filter options without remapping them", () => {
    const options = buildObservationFilterOptions(
      [observation({ treatmentId: "orphan-treatment", sampleId: "orphan-sample" })],
      [{ id: "treatment-1", code: "T1", label: "T1" }],
      [{ id: "sample-1", label: "Sample 1", treatmentCode: "T1" }]
    );
    expect(options.treatments).toContainEqual({ id: "orphan-treatment", label: "ไม่พบกลุ่มทดลอง (ID: orphan-treatment)" });
    expect(options.samples).toContainEqual({ id: "orphan-sample", label: "ไม่พบกิ่งชำ (ID: orphan-sample)" });
  });

  it("uses an em dash for missing or malformed dates", () => {
    expect(formatObservationDate(null)).toBe("—");
    expect(formatObservationDate("not-a-date")).toBe("—");
  });
});
