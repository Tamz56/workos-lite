// GF-APP-077B — Rose Trial Domain Summaries Unit Tests

import { afterEach, describe, it, expect, vi } from "vitest";
import {
  buildPlannedTrialSummary,
  buildActualTrialSummary,
  buildSimulationSummary,
  buildTrialModeSummariesSafely,
} from "../../src/lib/rose-trial-domain/summaries";
import type { PlannedTrialRecord, ActualTrialRecord } from "../../src/lib/rose-trial-domain/types";

describe("Rose Trial Domain Summaries (GF-APP-077B)", () => {
  // Mock Planned Record
  const mockPlanned: PlannedTrialRecord = {
    metadata: {
      id: "rose-cutting:planned:12345",
      trialId: "rose-cutting:planned:12345",
      mode: "planned",
      version: 1,
      status: "ready",
      createdAt: "2026-07-13T10:00:00Z",
      updatedAt: "2026-07-13T10:00:00Z",
      completedAt: null,
      source: { sourceMode: "none", sourceRecordId: null, sourceVersion: null, snapshotCreatedAt: null },
    },
    identity: {
      trialId: "rose-cutting:planned:12345",
      plantId: null,
      cropId: "rose",
      trialType: "cutting",
      title: "การทดสอบปักชำกุหลาบ",
    },
    plannedStartDate: "2026-07-20",
    plannedBatch: {
      batchName: "BATCH-1",
      plannedUnitCount: 30,
    },
    plannedTreatments: [
      { id: "t1", code: "T1", name: "IBA 1000", description: "", plannedUnitCount: 15, plannedInputName: "", notes: "" },
      { id: "t2", code: "T2", name: "IBA 3000", description: "", plannedUnitCount: 15, plannedInputName: "", notes: "" },
    ],
    objectives: ["ทดสอบ IBA"],
    notes: "",
    dataIssues: [],
  };

  // Mock Actual Record
  const mockActual: ActualTrialRecord = {
    metadata: {
      id: "rose-cutting:actual:67890",
      trialId: "rose-cutting:actual:67890",
      mode: "actual",
      version: 1,
      status: "completed",
      createdAt: "2026-07-13T10:05:00Z",
      updatedAt: "2026-07-13T10:15:00Z",
      completedAt: "2026-07-13T10:15:00Z",
      source: { sourceMode: "planned", sourceRecordId: "rose-cutting:planned:12345", sourceVersion: 1, snapshotCreatedAt: "2026-07-13T10:00:00Z" },
    },
    identity: {
      trialId: "rose-cutting:actual:67890",
      plantId: null,
      cropId: "rose",
      trialType: "cutting",
      title: "การทดสอบปักชำกุหลาบ",
    },
    actualStartDate: "2026-07-21",
    actualBatch: {
      batchName: "BATCH-1", // Same batch
      actualUnitCount: 30,  // Same count
    },
    actualTreatments: [
      { id: "t1", sourcePlannedTreatmentId: "t1", code: "T1", name: "IBA 1000", description: "", actualUnitCount: 15, actualInputName: "", notes: "" },
      { id: "t2", sourcePlannedTreatmentId: "t2", code: "T2", name: "IBA 3000", description: "", actualUnitCount: 15, actualInputName: "", notes: "" },
    ],
    trialUnits: [],
    day0Observation: { directObservation: "ปกติ", interpretation: "", uncertainty: "" },
    deviationCount: 0,
    dataIssues: [],
  };

  // ─── Tests ─────────────────────────────────────────────────────────────────

  it("should build Planned summary correctly when planned record exists", () => {
    const summary = buildPlannedTrialSummary(mockPlanned);
    expect(summary.mode).toBe("planned");
    expect(summary.label).toBe("แผนการทดลอง");
    expect(summary.status).toBe("พร้อมเริ่มทดลอง");
    expect(summary.headline).toBe("การทดสอบปักชำกุหลาบ");
    expect(summary.details.some((d) => d.label === "รหัส Batch" && d.value === "BATCH-1")).toBe(true);
    expect(summary.href).toBe("/workspaces/travel/rose-trial");
  });

  it("should handle null Planned record gracefully", () => {
    const summary = buildPlannedTrialSummary(null);
    expect(summary.status).toBe("ยังไม่มีข้อมูล");
    expect(summary.recordId).toBeNull();
  });

  it("should build Actual summary for completed status", () => {
    const summary = buildActualTrialSummary(mockActual, mockPlanned);
    expect(summary.status).toBe("เสร็จสมบูรณ์ Day 0");
    expect(summary.warnings).toEqual([]); // No warnings since data matches
  });

  it("should build Actual summary for draft status", () => {
    const draftActual: ActualTrialRecord = {
      ...mockActual,
      metadata: { ...mockActual.metadata, status: "draft" },
    };
    const summary = buildActualTrialSummary(draftActual, mockPlanned);
    expect(summary.status).toBe("ร่าง Day 0");
  });

  it("should handle null Actual record (yet to start)", () => {
    const summary = buildActualTrialSummary(null, mockPlanned);
    expect(summary.status).toBe("ยังไม่เริ่ม");
    expect(summary.warnings).toEqual([]);
    expect(summary.href).toBeNull();
  });

  it("should flag warnings when actual data differs from planned (batch name, counts)", () => {
    const mismatchedActual: ActualTrialRecord = {
      ...mockActual,
      actualBatch: {
        batchName: "BATCH-DIFFERENT", // Different batch
        actualUnitCount: 25,          // Different count
      },
    };
    const summary = buildActualTrialSummary(mismatchedActual, mockPlanned);
    expect(summary.warnings).toContain("แผนปัจจุบันแตกต่างจากข้อมูล Day 0 ที่บันทึกไว้");
  });

  it("should separate corrupt/incomplete warning from plan mismatches", () => {
    // Test corrupt warning is exactly "ไม่สามารถอ่านข้อมูล Day 0 บางส่วนได้"
    const corruptSummary = buildActualTrialSummary(null, mockPlanned, true);
    expect(corruptSummary.status).toBe("ข้อมูลเสียหาย");
    expect(corruptSummary.warnings).toContain("ไม่สามารถอ่านข้อมูล Day 0 บางส่วนได้");
    expect(corruptSummary.warnings).not.toContain("แผนปัจจุบันแตกต่างจากข้อมูล Day 0 ที่บันทึกไว้");
    expect(corruptSummary.href).toBeNull();
  });

  it("should link to Day 0 only when an Actual record exists", () => {
    expect(buildActualTrialSummary(mockActual, mockPlanned).href)
      .toBe("/workspaces/travel/rose-trial/day-0");
    expect(buildActualTrialSummary(null, mockPlanned).href).toBeNull();
    expect(buildActualTrialSummary(null, mockPlanned, true).href).toBeNull();
  });

  it("should ignore treatment ordering and comparison-only case/whitespace", () => {
    const normalizedActual: ActualTrialRecord = {
      ...mockActual,
      actualBatch: { ...mockActual.actualBatch, batchName: " batch-1 " },
      actualTreatments: [
        { ...mockActual.actualTreatments[1], code: " t2 " },
        { ...mockActual.actualTreatments[0], code: "t1" },
      ],
    };
    expect(buildActualTrialSummary(normalizedActual, mockPlanned).warnings).toEqual([]);
  });

  it("should warn for duplicate treatment codes even when array lengths match", () => {
    const duplicatePlan: PlannedTrialRecord = {
      ...mockPlanned,
      plannedTreatments: [
        mockPlanned.plannedTreatments[0],
        { ...mockPlanned.plannedTreatments[1], code: " t1 " },
      ],
    };
    expect(buildActualTrialSummary(mockActual, duplicatePlan).warnings)
      .toContain("แผนปัจจุบันแตกต่างจากข้อมูล Day 0 ที่บันทึกไว้");
  });

  it("should warn for missing treatments and count differences", () => {
    const missing = { ...mockActual, actualTreatments: [mockActual.actualTreatments[0]] };
    const countDiff = {
      ...mockActual,
      actualTreatments: [
        { ...mockActual.actualTreatments[0], actualUnitCount: 14 },
        mockActual.actualTreatments[1],
      ],
    };
    expect(buildActualTrialSummary(missing, mockPlanned).warnings).not.toEqual([]);
    expect(buildActualTrialSummary(countDiff, mockPlanned).warnings).not.toEqual([]);
  });

  it("should keep incomplete Day 0 warning separate from plan differences", () => {
    const incomplete = { ...mockActual, dataIssues: ["malformed_trial_unit"] };
    expect(buildActualTrialSummary(incomplete, mockPlanned).warnings)
      .toContain("ไม่สามารถอ่านข้อมูล Day 0 บางส่วนได้");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should isolate mapping failures without writing localStorage", () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", { localStorage: { setItem } });
    const corruptDay0 = Object.defineProperty({}, "trialSnapshot", {
      get() {
        throw new Error("corrupt nested value");
      },
    });
    const summaries = buildTrialModeSummariesSafely(null, corruptDay0 as never);
    expect(summaries[1].status).toBe("ข้อมูลเสียหาย");
    expect(summaries[1].href).toBeNull();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("should build Simulation summary with expected placeholders", () => {
    const summary = buildSimulationSummary();
    expect(summary.mode).toBe("simulated");
    expect(summary.label).toBe("การจำลอง");
    expect(summary.status).toBe("ยังไม่มี Scenario");
    expect(summary.href).toBeNull();
  });

  it("should preserve Thai labels on all cards", () => {
    const pSum = buildPlannedTrialSummary(mockPlanned);
    const aSum = buildActualTrialSummary(mockActual, mockPlanned);
    const sSum = buildSimulationSummary();

    expect(pSum.label).toBe("แผนการทดลอง");
    expect(aSum.label).toBe("ข้อมูลที่เกิดขึ้นจริง");
    expect(sSum.label).toBe("การจำลอง");
  });

  it("should not mutate record inputs", () => {
    const pClone = structuredClone(mockPlanned);
    const aClone = structuredClone(mockActual);

    buildPlannedTrialSummary(mockPlanned);
    buildActualTrialSummary(mockActual, mockPlanned);

    expect(mockPlanned).toEqual(pClone);
    expect(mockActual).toEqual(aClone);
  });
});
