// GF-APP-079B — Rose Trial Domain Three-Way Comparison Unit Tests

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildRoseTrialComparisonReport,
  mapRoseTrialDataIssueToUserMessage,
} from "../../src/lib/rose-trial-domain/summaries";
import { mapRoseDay0SnapshotToSnapshotRecord } from "../../src/lib/rose-trial-domain/adapters";
import {
  ComparisonItemRow,
  TrialComparisonPanel,
} from "../../src/components/workspaces/travel/rose-trial/TrialComparisonPanel";
import type {
  PlannedTrialRecord,
  SnapshotTrialRecord,
  ActualTrialRecord,
} from "../../src/lib/rose-trial-domain/types";

describe("Rose Trial Domain Three-Way Comparison (GF-APP-079B)", () => {
  // Mock Base Planned Record
  const basePlanned: PlannedTrialRecord = {
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
      { id: "t1", code: "T1", name: "IBA 1000", description: "", plannedUnitCount: 15, plannedInputName: "IBA 1000 ppm", notes: "" },
      { id: "t2", code: "T2", name: "IBA 3000", description: "", plannedUnitCount: 15, plannedInputName: "IBA 3000 ppm", notes: "" },
    ],
    objectives: ["ทดสอบ IBA"],
    notes: "",
    dataIssues: [],
  };

  // Mock Base Snapshot Record
  const baseSnapshot: SnapshotTrialRecord = {
    metadata: {
      trialId: "rose-cutting:planned:12345",
      snapshotCreatedAt: "2026-07-13T10:00:00Z",
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
      { code: "T1", name: "IBA 1000", description: "", plannedUnitCount: 15, plannedInputName: "IBA 1000 ppm", notes: "" },
      { code: "T2", name: "IBA 3000", description: "", plannedUnitCount: 15, plannedInputName: "IBA 3000 ppm", notes: "" },
    ],
    objectives: ["ทดสอบ IBA"],
    notes: "",
    dataIssues: [],
  };

  // Mock Base Actual Record
  const baseActual: ActualTrialRecord = {
    metadata: {
      id: "rose-cutting:actual:12345",
      trialId: "rose-cutting:actual:12345",
      mode: "actual",
      version: 1,
      status: "completed",
      createdAt: "2026-07-13T10:05:00Z",
      updatedAt: "2026-07-13T10:15:00Z",
      completedAt: "2026-07-13T10:15:00Z",
      source: { sourceMode: "planned", sourceRecordId: "rose-cutting:planned:12345", sourceVersion: 1, snapshotCreatedAt: "2026-07-13T10:00:00Z" },
    },
    identity: {
      trialId: "rose-cutting:actual:12345",
      plantId: null,
      cropId: "rose",
      trialType: "cutting",
      title: "การทดสอบปักชำกุหลาบ",
    },
    actualStartDate: "2026-07-20",
    actualBatch: {
      batchName: "BATCH-1",
      actualUnitCount: 30,
    },
    actualTreatments: [
      { id: "t1", sourcePlannedTreatmentId: "t1", code: "T1", name: "IBA 1000", description: "", actualUnitCount: 15, actualInputName: "IBA 1000 ppm", notes: "" },
      { id: "t2", sourcePlannedTreatmentId: "t2", code: "T2", name: "IBA 3000", description: "", actualUnitCount: 15, actualInputName: "IBA 3000 ppm", notes: "" },
    ],
    trialUnits: [],
    day0Observation: { directObservation: "ปกติ", interpretation: "", uncertainty: "" },
    deviationCount: 0,
    dataIssues: [],
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // 1. No actual
  it("should handle no actual loaded state correctly", () => {
    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: baseSnapshot,
      actual: null,
      actualLoadState: "not_found",
    });
    expect(report.overallStatus).toBe("no_actual");
    expect(report.summaryText).toBe("ยังไม่มีข้อมูล Day 0 สำหรับเปรียบเทียบ");
    expect(report.items).toEqual([]);
  });

  // 2. Corrupt actual
  it("should handle corrupt actual loaded state correctly", () => {
    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: baseSnapshot,
      actual: null,
      actualLoadState: "corrupt",
    });
    expect(report.overallStatus).toBe("corrupt");
    expect(report.summaryText).toBe("ข้อมูล Day 0 บางส่วนไม่สามารถอ่านได้");
    expect(report.items).toEqual([]);
  });

  // 3. Exact match
  it("should report perfect match when plan, snapshot, and actual are identical", () => {
    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("match");
    expect(report.items).toEqual([]);
    expect(report.planChangeCount).toBe(0);
    expect(report.actualDeviationCount).toBe(0);
  });

  // 4. Current batch changed after Day 0
  it("should flag plan_changed when current plan batch name is edited post-Day 0", () => {
    const changedPlanned = {
      ...basePlanned,
      plannedBatch: { ...basePlanned.plannedBatch, batchName: "BATCH-CHANGED" },
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: changedPlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("differs");
    expect(report.planChangeCount).toBe(1);
    const item = report.items.find((i) => i.id === "batch:name");
    expect(item).toBeDefined();
    expect(item!.status).toBe("plan_changed");
    expect(item!.currentPlanValue).toBe("BATCH-CHANGED");
    expect(item!.snapshotValue).toBe("BATCH-1");
  });

  // 5. Current total count changed
  it("should flag plan_changed when total cuttings count in plan is edited post-Day 0", () => {
    const changedPlanned = {
      ...basePlanned,
      plannedBatch: { ...basePlanned.plannedBatch, plannedUnitCount: 40 },
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: changedPlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    const item = report.items.find((i) => i.id === "unit_count:total-cuttings-plan");
    expect(item).toBeDefined();
    expect(item!.status).toBe("plan_changed");
    expect(item!.currentPlanValue).toBe(40);
    expect(item!.snapshotValue).toBe(30);
  });

  // 6. Actual total count differs
  it("should flag actual_deviation when total cuttings performed differs from snapshot", () => {
    const changedActual = {
      ...baseActual,
      actualBatch: { ...baseActual.actualBatch, actualUnitCount: 28 },
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: baseSnapshot,
      actual: changedActual,
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("differs");
    expect(report.actualDeviationCount).toBe(1);
    const item = report.items.find((i) => i.id === "unit_count:total-cuttings-actual");
    expect(item).toBeDefined();
    expect(item!.status).toBe("actual_deviation");
    expect(item!.actualValue).toBe(28);
    expect(item!.snapshotValue).toBe(30);
  });

  // 7. Treatment added to current plan
  it("should flag plan_changed when a treatment is added to the current plan", () => {
    const changedPlanned = {
      ...basePlanned,
      plannedTreatments: [
        ...basePlanned.plannedTreatments,
        { id: "t3", code: "T3", name: "IBA 5000", description: "", plannedUnitCount: 10, plannedInputName: "IBA 5000 ppm", notes: "" },
      ],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: changedPlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    const item = report.items.find((i) => i.id === "treatment:t3:presence");
    expect(item).toBeDefined();
    expect(item!.status).toBe("plan_changed");
    expect(item!.changeType).toBe("added");
  });

  // 8. Treatment removed from current plan
  it("should flag plan_changed when a treatment is removed from the current plan", () => {
    const changedPlanned = {
      ...basePlanned,
      plannedTreatments: [basePlanned.plannedTreatments[0]],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: changedPlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    const item = report.items.find((i) => i.id === "treatment:t2:presence");
    expect(item).toBeDefined();
    expect(item!.status).toBe("plan_changed");
    expect(item!.changeType).toBe("removed");
  });

  // 9. Treatment missing from actual
  it("should flag actual_deviation when a treatment is missing from actual record", () => {
    const changedActual = {
      ...baseActual,
      actualTreatments: [baseActual.actualTreatments[0]],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: baseSnapshot,
      actual: changedActual,
      actualLoadState: "valid",
    });
    const item = report.items.find((i) => i.id === "treatment:t2:presence-actual");
    expect(item).toBeDefined();
    expect(item!.status).toBe("actual_deviation");
    expect(item!.changeType).toBe("removed");
  });

  // 10. Actual treatment added
  it("should flag actual_deviation when an extra treatment is added in actuals", () => {
    const changedActual = {
      ...baseActual,
      actualTreatments: [
        ...baseActual.actualTreatments,
        { id: "t3", sourcePlannedTreatmentId: null, code: "T3", name: "IBA 5000", description: "", actualUnitCount: 10, actualInputName: "IBA", notes: "" },
      ],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: baseSnapshot,
      actual: changedActual,
      actualLoadState: "valid",
    });
    const item = report.items.find((i) => i.id === "treatment:t3:presence-actual");
    expect(item).toBeDefined();
    expect(item!.status).toBe("actual_deviation");
    expect(item!.changeType).toBe("added");
  });

  // 11. Treatment count differs
  it("should identify planned count changes and actual count deviations separately", () => {
    const changedPlanned = {
      ...basePlanned,
      plannedTreatments: [
        { ...basePlanned.plannedTreatments[0], plannedUnitCount: 20 },
        basePlanned.plannedTreatments[1],
      ],
    };
    const changedActual = {
      ...baseActual,
      actualTreatments: [
        { ...baseActual.actualTreatments[0], actualUnitCount: 12 },
        baseActual.actualTreatments[1],
      ],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: changedPlanned,
      snapshotPlan: baseSnapshot,
      actual: changedActual,
      actualLoadState: "valid",
    });
    const pItem = report.items.find((i) => i.id === "treatment:t1:count-plan");
    const aItem = report.items.find((i) => i.id === "treatment:t1:count-actual");
    expect(pItem).toBeDefined();
    expect(aItem).toBeDefined();
    expect(pItem!.status).toBe("plan_changed");
    expect(aItem!.status).toBe("actual_deviation");
  });

  // 12. Treatment input differs
  it("should identify planned input changes and actual input deviations separately", () => {
    const changedPlanned = {
      ...basePlanned,
      plannedTreatments: [
        { ...basePlanned.plannedTreatments[0], plannedInputName: "IBA 1500 ppm" },
        basePlanned.plannedTreatments[1],
      ],
    };
    const changedActual = {
      ...baseActual,
      actualTreatments: [
        { ...baseActual.actualTreatments[0], actualInputName: "IBA 500 ppm" },
        baseActual.actualTreatments[1],
      ],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: changedPlanned,
      snapshotPlan: baseSnapshot,
      actual: changedActual,
      actualLoadState: "valid",
    });
    const pItem = report.items.find((i) => i.id === "treatment:t1:input-plan");
    const aItem = report.items.find((i) => i.id === "treatment:t1:input-actual");
    expect(pItem).toBeDefined();
    expect(aItem).toBeDefined();
  });

  // 13. Treatment order only differs
  it("should ignore treatment array ordering differences", () => {
    const reorderedPlanned = {
      ...basePlanned,
      plannedTreatments: [basePlanned.plannedTreatments[1], basePlanned.plannedTreatments[0]],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: reorderedPlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("match");
    expect(report.items).toEqual([]);
  });

  // 14. Whitespace/case only differs
  it("should ignore leading/trailing whitespace and casing in code matches", () => {
    const spacesPlanned = {
      ...basePlanned,
      plannedTreatments: [
        { ...basePlanned.plannedTreatments[0], code: " t1 " },
        { ...basePlanned.plannedTreatments[1], code: "T2" },
      ],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: spacesPlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("match");
  });

  // 15. Thai Unicode NFC/NFD
  it("should normalize Thai Unicode NFC and NFD strings to prevent false mismatches", () => {
    const nfdTitle = "การทดสอบปักชำกุหลาบ".normalize("NFD");
    const nfcTitle = "การทดสอบปักชำกุหลาบ".normalize("NFC");
    const nfdPlanned = {
      ...basePlanned,
      identity: { ...basePlanned.identity, title: nfdTitle },
    };
    const nfcSnapshot = {
      ...baseSnapshot,
      identity: { ...baseSnapshot.identity, title: nfcTitle },
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: nfdPlanned,
      snapshotPlan: nfcSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.items.some((i) => i.id === "trial_identity:title")).toBe(false);
  });

  // 16. Duplicate treatment code
  it("should warn if duplicate codes are present in dataIssues", () => {
    const buggyPlanned = {
      ...basePlanned,
      dataIssues: ["duplicate_treatment_code"],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: buggyPlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("incomplete");
    expect(report.dataIssueCount).toBe(1);
  });

  // 17. Incomplete snapshot
  it("should report data quality issues for incomplete snapshot dataIssues", () => {
    const buggySnapshot = {
      ...baseSnapshot,
      dataIssues: ["malformed_treatment"],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: buggySnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("incomplete");
    expect(report.dataIssueCount).toBe(1);
    expect(report.items.some((i) => i.id === "data_quality:snapshot-issues")).toBe(true);
  });

  // 18. Incomplete actual
  it("should report data quality issues for incomplete actual dataIssues", () => {
    const buggyActual = {
      ...baseActual,
      dataIssues: ["malformed_trial_unit"],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: baseSnapshot,
      actual: buggyActual,
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("incomplete");
    expect(report.dataIssueCount).toBe(1);
    expect(report.items.some((i) => i.id === "data_quality:actual-issues")).toBe(true);
  });

  // 19. Stable item IDs
  it("should generate stable deterministic IDs for comparison items", () => {
    const changedPlanned = {
      ...basePlanned,
      plannedBatch: { ...basePlanned.plannedBatch, batchName: "BATCH-CHANGED" },
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: changedPlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.items[0].id).toBe("batch:name");
  });

  // 20. Deterministic output
  it("should produce deterministic report given the same inputs", () => {
    const report1 = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    const report2 = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report1).toEqual(report2);
  });

  // 21. Input not mutated
  it("should not mutate any of the input structures", () => {
    const planClone = structuredClone(basePlanned);
    const snapClone = structuredClone(baseSnapshot);
    const actClone = structuredClone(baseActual);

    buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });

    expect(basePlanned).toEqual(planClone);
    expect(baseSnapshot).toEqual(snapClone);
    expect(baseActual).toEqual(actClone);
  });

  // 22. No localStorage write
  it("should not perform any storage write operations", () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", { localStorage: { setItem } });

    buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });

    expect(setItem).not.toHaveBeenCalled();
  });

  it("compares Snapshot and Actual counts without a Current Plan", () => {
    const report = buildRoseTrialComparisonReport({
      currentPlan: null,
      snapshotPlan: baseSnapshot,
      actual: {
        ...baseActual,
        actualBatch: { ...baseActual.actualBatch, actualUnitCount: 29 },
      },
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("differs");
    expect(report.items.find((item) => item.id === "unit_count:total-cuttings-actual")).toMatchObject({
      status: "actual_deviation",
      currentPlanValue: null,
      snapshotValue: 30,
      actualValue: 29,
    });
  });

  it("compares Snapshot and Actual inputs without a Current Plan", () => {
    const actual = {
      ...baseActual,
      actualTreatments: [
        { ...baseActual.actualTreatments[0], actualInputName: "IBA 500 ppm" },
        baseActual.actualTreatments[1],
      ],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: null,
      snapshotPlan: baseSnapshot,
      actual,
      actualLoadState: "valid",
    });
    expect(report.items.find((item) => item.id === "treatment:t1:input-actual")).toMatchObject({
      status: "actual_deviation",
      currentPlanValue: null,
      snapshotValue: "IBA 1000 ppm",
      actualValue: "IBA 500 ppm",
    });
  });

  it("emits both directions when Current removes T1 and Actual count differs", () => {
    const report = buildRoseTrialComparisonReport({
      currentPlan: { ...basePlanned, plannedTreatments: [basePlanned.plannedTreatments[1]] },
      snapshotPlan: baseSnapshot,
      actual: {
        ...baseActual,
        actualTreatments: [
          { ...baseActual.actualTreatments[0], actualUnitCount: 12 },
          baseActual.actualTreatments[1],
        ],
      },
      actualLoadState: "valid",
    });
    expect(report.items.map((item) => item.id)).toEqual(expect.arrayContaining([
      "treatment:t1:presence",
      "treatment:t1:count-actual",
    ]));
    expect(report.planChangeCount).toBe(1);
    expect(report.actualDeviationCount).toBe(1);
  });

  it("emits both directions when T2 is added to Current and Actual", () => {
    const snapshot = { ...baseSnapshot, plannedTreatments: [baseSnapshot.plannedTreatments[0]] };
    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: snapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.items.map((item) => item.id)).toEqual(expect.arrayContaining([
      "treatment:t2:presence",
      "treatment:t2:presence-actual",
    ]));
  });

  it("returns incomplete when a valid load has no Snapshot", () => {
    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: null,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("incomplete");
    expect(report.items.find((item) => item.id === "data_quality:snapshot-missing")?.explanation)
      .toBe("ไม่พบ snapshot แผน Day 0 สำหรับการเปรียบเทียบ");
  });

  it("returns incomplete when a valid load has no Actual record", () => {
    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: baseSnapshot,
      actual: null,
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("incomplete");
    expect(report.items.some((item) => item.id === "data_quality:actual-missing")).toBe(true);
  });

  it("marks duplicate normalized treatment codes incomplete", () => {
    const snapshot = {
      ...baseSnapshot,
      plannedTreatments: [
        baseSnapshot.plannedTreatments[0],
        { ...baseSnapshot.plannedTreatments[0], code: " t1 " },
      ],
      dataIssues: [],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan: snapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("incomplete");
    expect(report.items.find((item) => item.id === "data_quality:snapshot-issues")?.explanation)
      .toContain("พบรหัสกลุ่มทดลองซ้ำใน snapshot Day 0");
  });

  it("reports treatment name-only changes in both independent passes", () => {
    const currentPlan = {
      ...basePlanned,
      plannedTreatments: [
        { ...basePlanned.plannedTreatments[0], name: "ชื่อแผนใหม่" },
        basePlanned.plannedTreatments[1],
      ],
    };
    const actual = {
      ...baseActual,
      actualTreatments: [
        { ...baseActual.actualTreatments[0], name: "ชื่อทำจริง" },
        baseActual.actualTreatments[1],
      ],
    };
    const report = buildRoseTrialComparisonReport({
      currentPlan,
      snapshotPlan: baseSnapshot,
      actual,
      actualLoadState: "valid",
    });
    expect(report.items.map((item) => item.id)).toEqual(expect.arrayContaining([
      "treatment:t1:name-plan",
      "treatment:t1:name-actual",
    ]));
  });

  it("collapses internal whitespace during treatment comparison", () => {
    const report = buildRoseTrialComparisonReport({
      currentPlan: {
        ...basePlanned,
        plannedTreatments: basePlanned.plannedTreatments.map((treatment, index) =>
          index === 0
            ? { ...treatment, code: "T1", name: "IBA   1000", plannedInputName: "IBA   1000 ppm" }
            : treatment
        ),
      },
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.items.filter((item) => item.id.startsWith("treatment:t1:"))).toEqual([]);
  });

  it("maps unknown data issues to a Thai fallback", () => {
    expect(mapRoseTrialDataIssueToUserMessage("unknown_internal_key"))
      .toBe("พบข้อมูลบางส่วนที่ไม่สามารถอ่านได้ครบถ้วน");
  });

  it("never exposes a raw data issue key in report explanations", () => {
    const report = buildRoseTrialComparisonReport({
      currentPlan: { ...basePlanned, dataIssues: ["unknown_internal_key"] },
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    expect(report.items.map((item) => item.explanation).join(" ")).not.toContain("unknown_internal_key");
    expect(report.items.find((item) => item.id === "data_quality:current-plan-issues")?.explanation)
      .toBe("พบข้อมูลบางส่วนที่ไม่สามารถอ่านได้ครบถ้วน");
  });

  it("keeps incomplete above differs and keeps counters aligned with items", () => {
    const report = buildRoseTrialComparisonReport({
      currentPlan: {
        ...basePlanned,
        plannedBatch: { ...basePlanned.plannedBatch, plannedUnitCount: 31 },
        dataIssues: ["unknown_internal_key"],
      },
      snapshotPlan: baseSnapshot,
      actual: {
        ...baseActual,
        actualBatch: { ...baseActual.actualBatch, actualUnitCount: 29 },
      },
      actualLoadState: "valid",
    });
    expect(report.overallStatus).toBe("incomplete");
    expect(report.planChangeCount).toBe(
      report.items.filter((item) => item.status === "plan_changed").length
    );
    expect(report.actualDeviationCount).toBe(
      report.items.filter((item) => item.status === "actual_deviation").length
    );
    expect(report.dataIssueCount).toBe(
      report.items.filter((item) => item.status === "incomplete").length
    );
  });

  it("uses unique region and control IDs for multiple panels", () => {
    const report = buildRoseTrialComparisonReport({
      currentPlan: { ...basePlanned, plannedBatch: { ...basePlanned.plannedBatch, plannedUnitCount: 31 } },
      snapshotPlan: baseSnapshot,
      actual: baseActual,
      actualLoadState: "valid",
    });
    const html = renderToStaticMarkup(React.createElement(
      React.Fragment,
      null,
      React.createElement(TrialComparisonPanel, { report }),
      React.createElement(TrialComparisonPanel, { report })
    ));
    const controls = Array.from(html.matchAll(/aria-controls="([^"]+)"/g), (match) => match[1]);
    const regions = Array.from(html.matchAll(/id="(trial-comparison-[^"]+)"/g), (match) => match[1]);
    expect(controls).toHaveLength(2);
    expect(new Set(controls).size).toBe(2);
    expect(new Set(regions).size).toBe(2);
  });

  it("renders a Thai-first comparison heading", () => {
    const html = renderToStaticMarkup(React.createElement(TrialComparisonPanel, {
      report: buildRoseTrialComparisonReport({
        currentPlan: basePlanned,
        snapshotPlan: baseSnapshot,
        actual: baseActual,
        actualLoadState: "valid",
      }),
    }));
    expect(html).toContain("รายงานเปรียบเทียบแผน Snapshot และข้อมูล Day 0");
  });

  it("wraps long comparison labels instead of truncating them", () => {
    const html = renderToStaticMarkup(React.createElement(ComparisonItemRow, {
      item: {
        id: "test:long-label",
        category: "treatment",
        severity: "info",
        status: "plan_changed",
        changeType: "value_changed",
        label: "ชื่อกลุ่มทดลองภาษาไทยที่ยาวมากและต้องแสดงได้ครบโดยไม่ตัดข้อความ",
        currentPlanValue: "ค่าใหม่",
        snapshotValue: "ค่าเดิม",
        actualValue: null,
        explanation: "ข้อความทดสอบ",
      },
    }));
    expect(html).toContain("break-words min-w-0");
    expect(html).not.toContain("truncate");
  });

  it("reports an ambiguous missing-code identity as incomplete without leaking its key", () => {
    const snapshotPlan = {
      ...baseSnapshot,
      dataIssues: ["snapshot_treatment_identity_ambiguous"],
    };
    const planClone = structuredClone(basePlanned);
    const snapshotClone = structuredClone(snapshotPlan);
    const actualClone = structuredClone(baseActual);
    const setItem = vi.fn();
    vi.stubGlobal("window", { localStorage: { setItem } });

    const report = buildRoseTrialComparisonReport({
      currentPlan: basePlanned,
      snapshotPlan,
      actual: baseActual,
      actualLoadState: "valid",
    });
    const qualityItems = report.items.filter((item) => item.status === "incomplete");

    expect(report.overallStatus).toBe("incomplete");
    expect(report.dataIssueCount).toBe(qualityItems.length);
    expect(new Set(report.items.map((item) => item.id)).size).toBe(report.items.length);
    expect(qualityItems[0].explanation)
      .toBe("พบกลุ่มทดลองบางรายการที่ไม่มีรหัสและไม่สามารถแยกออกจากกันได้อย่างชัดเจน");
    expect(qualityItems[0].explanation).not.toContain("snapshot_treatment_identity_ambiguous");
    expect(basePlanned).toEqual(planClone);
    expect(snapshotPlan).toEqual(snapshotClone);
    expect(baseActual).toEqual(actualClone);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("keeps the ambiguous missing-code report deterministic after source reorder", () => {
    const treatment = {
      code: "",
      name: "กลุ่มไม่มีรหัส",
      description: "สูตรเดียวกัน",
      cuttingCount: 5,
      inputName: "A",
      notes: "",
    };
    const mapSnapshot = (treatments: typeof treatment[]) =>
      mapRoseDay0SnapshotToSnapshotRecord({
        trialName: baseSnapshot.identity.title,
        cropName: "กุหลาบ",
        goal: "",
        batchName: baseSnapshot.plannedBatch.batchName,
        plannedStartDate: baseSnapshot.plannedStartDate ?? "",
        totalCuttings: 5,
        treatments,
        readinessStatus: "ready_for_day0",
        sourceUpdatedAt: baseSnapshot.metadata.snapshotCreatedAt,
      })!;
    const firstSnapshot = mapSnapshot([treatment, { ...treatment }]);
    const reorderedSnapshot = mapSnapshot([{ ...treatment }, treatment]);
    const actualTreatment = firstSnapshot.plannedTreatments[0];
    const matchingActual: ActualTrialRecord = {
      ...baseActual,
      actualBatch: { ...baseActual.actualBatch, actualUnitCount: 5 },
      actualTreatments: [{
        id: `tr-${actualTreatment.code}`,
        sourcePlannedTreatmentId: null,
        code: actualTreatment.code,
        name: actualTreatment.name,
        description: actualTreatment.description,
        actualUnitCount: actualTreatment.plannedUnitCount,
        actualInputName: actualTreatment.plannedInputName,
        notes: actualTreatment.notes,
      }],
    };
    const build = (snapshotPlan: SnapshotTrialRecord) => buildRoseTrialComparisonReport({
      currentPlan: null,
      snapshotPlan,
      actual: matchingActual,
      actualLoadState: "valid",
    });

    expect(firstSnapshot).toEqual(reorderedSnapshot);
    expect(build(firstSnapshot)).toEqual(build(reorderedSnapshot));
    expect(build(firstSnapshot)).toEqual(build(firstSnapshot));
    expect(build(firstSnapshot).overallStatus).toBe("incomplete");
  });
});
