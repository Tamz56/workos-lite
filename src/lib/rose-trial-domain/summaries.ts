// GF-APP-077B — Rose Trial Domain Summaries

import type { RoseTrialState } from "../../components/workspaces/travel/rose-trial/types";
import type { RoseDay0State } from "../../components/workspaces/travel/rose-trial/day-0/types";
import {
  mapRoseDay0ToActualRecord,
  mapRosePreparationToPlannedRecord,
} from "./adapters";
import type {
  PlannedTrialRecord,
  ActualTrialRecord,
  TrialModeSummary,
  RoseTrialComparisonInput,
  RoseTrialComparisonReport,
  TrialComparisonItem,
} from "./types";

const PLAN_DIFF_WARNING = "แผนปัจจุบันแตกต่างจากข้อมูล Day 0 ที่บันทึกไว้";
const INCOMPLETE_DAY0_WARNING = "ไม่สามารถอ่านข้อมูล Day 0 บางส่วนได้";

function normalizeComparisonValue(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

function buildNormalizedTreatmentMap<T extends { code: string }>(treatments: T[]): Map<string, T> {
  const result = new Map<string, T>();
  for (const treatment of treatments) {
    const code = normalizeComparisonValue(treatment.code);
    if (code && !result.has(code)) result.set(code, treatment);
  }
  return result;
}

function treatmentTokens(
  treatments: Array<{ code: string; count: number }>
): string[] {
  return treatments
    .map(({ code, count }) => `${normalizeComparisonValue(code)}\u0000${count}`)
    .sort();
}

function hasDuplicateTreatmentCodes(treatments: Array<{ code: string }>): boolean {
  const seen = new Set<string>();
  for (const treatment of treatments) {
    const code = normalizeComparisonValue(treatment.code);
    if (!code || seen.has(code)) return true;
    seen.add(code);
  }
  return false;
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

const DATA_ISSUE_MESSAGES: Record<string, string> = {
  duplicate_treatment_code: "พบรหัสกลุ่มทดลองซ้ำในข้อมูล",
  malformed_treatment: "ข้อมูลกลุ่มทดลองบางส่วนอ่านได้ไม่ครบ",
  malformed_treatments: "รายการกลุ่มทดลองอ่านได้ไม่ครบ",
  missing_treatment_code: "กลุ่มทดลองบางรายการไม่มีรหัส",
  malformed_trial_unit: "ข้อมูลหน่วยทดลองบางส่วนอ่านได้ไม่ครบ",
  malformed_trial_units: "รายการหน่วยทดลองอ่านได้ไม่ครบ",
  duplicate_trial_unit_id: "พบรหัสหน่วยทดลองซ้ำในข้อมูล",
  invalid_trial_unit_status: "สถานะหน่วยทดลองบางรายการไม่ถูกต้อง",
  snapshot_treatments_not_array: "รายการกลุ่มทดลองใน snapshot Day 0 อ่านได้ไม่ครบ",
  snapshot_batch_missing: "snapshot Day 0 ไม่มีรหัส Batch",
  snapshot_start_date_invalid: "วันที่เริ่มตามแผนใน snapshot Day 0 ไม่ถูกต้อง",
  snapshot_total_count_invalid: "จำนวนกิ่งรวมใน snapshot Day 0 ไม่ถูกต้อง",
  snapshot_treatment_malformed: "ข้อมูลกลุ่มทดลองบางส่วนใน snapshot Day 0 อ่านได้ไม่ครบ",
  snapshot_treatment_code_missing: "กลุ่มทดลองบางรายการใน snapshot Day 0 ไม่มีรหัส",
  snapshot_treatment_code_duplicate: "พบรหัสกลุ่มทดลองซ้ำใน snapshot Day 0",
  snapshot_treatment_count_invalid: "จำนวนกิ่งของกลุ่มทดลองใน snapshot Day 0 ไม่ถูกต้อง",
  snapshot_treatment_identity_ambiguous: "พบกลุ่มทดลองบางรายการที่ไม่มีรหัสและไม่สามารถแยกออกจากกันได้อย่างชัดเจน",
  comparison_snapshot_missing: "ไม่พบ snapshot แผน Day 0 สำหรับการเปรียบเทียบ",
  comparison_actual_missing: "ไม่พบข้อมูลปฏิบัติจริง Day 0 สำหรับการเปรียบเทียบ",
};

export function mapRoseTrialDataIssueToUserMessage(issue: string): string {
  return DATA_ISSUE_MESSAGES[issue] ?? "พบข้อมูลบางส่วนที่ไม่สามารถอ่านได้ครบถ้วน";
}

function formatRoseTrialDataIssues(issues: string[]): string {
  return Array.from(new Set(issues.map(mapRoseTrialDataIssueToUserMessage))).join(" • ");
}

/**
 * สร้าง Summary Card สำหรับ Planned Domain
 */
export function buildPlannedTrialSummary(
  planned: PlannedTrialRecord | null
): TrialModeSummary {
  const label = "แผนการทดลอง";
  const href = "/workspaces/travel/rose-trial";

  if (!planned) {
    return {
      mode: "planned",
      label,
      recordId: null,
      status: "ยังไม่มีข้อมูล",
      headline: "ข้อมูลที่กำหนดไว้ก่อนเริ่มดำเนินการ",
      details: [
        { label: "สถานะ", value: "รอระบุแผนงาน" }
      ],
      warnings: [],
      href,
    };
  }

  const { plannedBatch, plannedTreatments } = planned;
  const statusLabel = planned.metadata.status === "ready"
    ? "พร้อมเริ่มทดลอง"
    : planned.metadata.status === "partial"
      ? "พร้อมบางส่วน"
      : "กำลังวางแผน";

  return {
    mode: "planned",
    label,
    recordId: planned.metadata.id,
    status: statusLabel,
    headline: planned.identity.title,
    details: [
      { label: "รหัส Batch", value: plannedBatch.batchName },
      { label: "ยอดกิ่งแผนรวม", value: `${plannedBatch.plannedUnitCount} กิ่ง` },
      { label: "จำนวนกลุ่มทดลอง", value: `${plannedTreatments.length} กลุ่ม` },
    ],
    warnings: [],
    href,
  };
}

/**
 * สร้าง Summary Card สำหรับ Actual Domain
 * รองรับการวิเคราะห์ Warnings ขัดแย้งระหว่าง Planned และ Actual
 */
export function buildActualTrialSummary(
  actual: ActualTrialRecord | null,
  planned: PlannedTrialRecord | null,
  isCorrupt: boolean = false
): TrialModeSummary {
  const label = "ข้อมูลที่เกิดขึ้นจริง";
  const href = "/workspaces/travel/rose-trial/day-0";

  if (isCorrupt) {
    return {
      mode: "actual",
      label,
      recordId: null,
      status: "ข้อมูลเสียหาย",
      headline: "พบความผิดพลาดในการอ่านข้อมูล",
      details: [
        { label: "สาเหตุ", value: "ไม่สามารถแปลงรูปแบบข้อมูลล่าสุดได้" }
      ],
      warnings: [INCOMPLETE_DAY0_WARNING],
      href: null,
    };
  }

  if (!actual) {
    return {
      mode: "actual",
      label,
      recordId: null,
      status: "ยังไม่เริ่ม",
      headline: "ข้อมูลที่บันทึกจากการดำเนินการและการสังเกตจริง",
      details: [
        { label: "การดำเนินการ", value: "รอเริ่มบันทึก Day 0" }
      ],
      warnings: [],
      href: null,
    };
  }

  const { actualBatch, actualTreatments, trialUnits, metadata, deviationCount } = actual;
  const statusLabel = metadata.status === "completed" ? "เสร็จสมบูรณ์ Day 0" : "ร่าง Day 0";

  const details = [
    { label: "เริ่มจริง", value: actual.actualStartDate || "ยังไม่ได้เริ่ม" },
    { label: "รหัส Batch จริง", value: actualBatch.batchName },
    { label: "ยอดกิ่งจริง", value: `${actualBatch.actualUnitCount} กิ่ง` },
    { label: "จำนวนกิ่งสร้างแล้ว", value: `${trialUnits.length} กิ่ง` },
  ];

  if (deviationCount > 0) {
    details.push({ label: "ข้อเบี่ยงเบนจากแผน", value: `${deviationCount} รายการ` });
  }

  // Calculate Warnings
  const warnings: string[] = actual.dataIssues?.length ? [INCOMPLETE_DAY0_WARNING] : [];

  if (planned) {
    const plannedTokens = treatmentTokens(
      planned.plannedTreatments.map((treatment) => ({
        code: treatment.code,
        count: treatment.plannedUnitCount,
      }))
    );
    const actualTokens = treatmentTokens(
      actualTreatments.map((treatment) => ({
        code: treatment.code,
        count: treatment.actualUnitCount,
      }))
    );
    const hasDiff =
      normalizeComparisonValue(planned.plannedBatch.batchName) !== normalizeComparisonValue(actualBatch.batchName) ||
      planned.plannedBatch.plannedUnitCount !== actualBatch.actualUnitCount ||
      !arraysEqual(plannedTokens, actualTokens) ||
      hasDuplicateTreatmentCodes(planned.plannedTreatments) ||
      hasDuplicateTreatmentCodes(actualTreatments) ||
      Boolean(planned.dataIssues?.length);

    if (hasDiff) {
      warnings.push(PLAN_DIFF_WARNING);
    }
  }

  return {
    mode: "actual",
    label,
    recordId: metadata.id,
    status: statusLabel,
    headline: actual.identity.title,
    details,
    warnings,
    href,
  };
}

export function buildTrialModeSummariesSafely(
  preparationState: RoseTrialState | null | undefined,
  day0State: RoseDay0State | null | undefined,
  day0Corrupt: boolean = false
): TrialModeSummary[] {
  let planned: PlannedTrialRecord | null = null;
  try {
    planned = mapRosePreparationToPlannedRecord(preparationState);
  } catch {
    planned = null;
  }

  let actual: ActualTrialRecord | null = null;
  let actualIsCorrupt = day0Corrupt;
  if (!actualIsCorrupt) {
    try {
      actual = mapRoseDay0ToActualRecord(day0State);
      if (day0State && !actual) actualIsCorrupt = true;
    } catch {
      actualIsCorrupt = true;
    }
  }

  return [
    buildPlannedTrialSummary(planned),
    buildActualTrialSummary(actual, planned, actualIsCorrupt),
    buildSimulationSummary(),
  ];
}

/**
 * สร้าง Summary Card สำหรับ Simulated Domain
 */
export function buildSimulationSummary(): TrialModeSummary {
  return {
    mode: "simulated",
    label: "การจำลอง",
    recordId: null,
    status: "ยังไม่มี Scenario",
    headline: "พื้นที่สำหรับทดลองสมมติฐานในอนาคต ยังไม่ใช่ผลที่เกิดขึ้นจริง",
    details: [
      { label: "สถานะระบบจำลอง", value: "ไม่เปิดใช้งาน" }
    ],
    warnings: [],
    href: null,
  };
}

// ─── Three-Way Comparison Engine ─────────────────────────────────────────────

export function buildRoseTrialComparisonReport(
  input: RoseTrialComparisonInput
): RoseTrialComparisonReport {
  if (input.actualLoadState === "not_found") {
    return {
      overallStatus: "no_actual",
      summaryText: "ยังไม่มีข้อมูล Day 0 สำหรับเปรียบเทียบ",
      items: [],
      planChangeCount: 0,
      actualDeviationCount: 0,
      dataIssueCount: 0,
    };
  }

  if (input.actualLoadState === "corrupt") {
    return {
      overallStatus: "corrupt",
      summaryText: "ข้อมูล Day 0 บางส่วนไม่สามารถอ่านได้",
      items: [],
      planChangeCount: 0,
      actualDeviationCount: 0,
      dataIssueCount: 0,
    };
  }

  const { currentPlan, snapshotPlan, actual } = input;
  const items: TrialComparisonItem[] = [];

  let planChangeCount = 0;
  let actualDeviationCount = 0;
  let dataIssueCount = 0;

  if (!snapshotPlan) {
    dataIssueCount++;
    items.push({
      id: "data_quality:snapshot-missing",
      category: "data_quality",
      severity: "warning",
      status: "incomplete",
      changeType: "incomplete",
      label: "ความครบถ้วนของ Snapshot Day 0",
      currentPlanValue: currentPlan ? "มีข้อมูล" : null,
      snapshotValue: "ไม่พบข้อมูล",
      actualValue: actual ? "มีข้อมูล" : null,
      explanation: mapRoseTrialDataIssueToUserMessage("comparison_snapshot_missing"),
    });
  }

  if (!actual) {
    dataIssueCount++;
    items.push({
      id: "data_quality:actual-missing",
      category: "data_quality",
      severity: "warning",
      status: "incomplete",
      changeType: "incomplete",
      label: "ความครบถ้วนของข้อมูลปฏิบัติจริง Day 0",
      currentPlanValue: currentPlan ? "มีข้อมูล" : null,
      snapshotValue: snapshotPlan ? "มีข้อมูล" : null,
      actualValue: "ไม่พบข้อมูล",
      explanation: mapRoseTrialDataIssueToUserMessage("comparison_actual_missing"),
    });
  }

  // 1. Trial Title (trial_identity)
  if (currentPlan && snapshotPlan) {
    const plannedTitle = currentPlan.identity.title;
    const snapshotTitle = snapshotPlan.identity.title;

    const normPlanned = normalizeComparisonValue(plannedTitle);
    const normSnapshot = normalizeComparisonValue(snapshotTitle);

    if (normPlanned !== normSnapshot) {
      planChangeCount++;
      items.push({
        id: "trial_identity:title",
        category: "trial_identity",
        severity: "info",
        status: "plan_changed",
        changeType: "value_changed",
        label: "ชื่อการทดลอง",
        currentPlanValue: plannedTitle,
        snapshotValue: snapshotTitle,
        actualValue: null,
        explanation: "ชื่อการทดลองในแผนปัจจุบันถูกแก้ไขหลังจากเริ่ม Day 0",
      });
    }
  }

  // 2. Batch Name (batch)
  if (currentPlan && snapshotPlan) {
    const plannedBatchName = currentPlan.plannedBatch.batchName;
    const snapshotBatchName = snapshotPlan.plannedBatch.batchName;

    const normPlanned = normalizeComparisonValue(plannedBatchName);
    const normSnapshot = normalizeComparisonValue(snapshotBatchName);

    if (normPlanned !== normSnapshot) {
      planChangeCount++;
      items.push({
        id: "batch:name",
        category: "batch",
        severity: "info",
        status: "plan_changed",
        changeType: "value_changed",
        label: "รหัส Batch",
        currentPlanValue: plannedBatchName,
        snapshotValue: snapshotBatchName,
        actualValue: null,
        explanation: "รหัส Batch ในแผนปัจจุบันถูกแก้ไขหลังจากเริ่ม Day 0",
      });
    }
  }

  // 3. Start Date (schedule)
  if (currentPlan && snapshotPlan) {
    const plannedStartDate = currentPlan.plannedStartDate;
    const snapshotStartDate = snapshotPlan.plannedStartDate;

    if (plannedStartDate !== snapshotStartDate) {
      planChangeCount++;
      items.push({
        id: "schedule:start-date-plan",
        category: "schedule",
        severity: "info",
        status: "plan_changed",
        changeType: "value_changed",
        label: "วันที่คาดว่าจะเริ่ม (แผน)",
        currentPlanValue: plannedStartDate || "ไม่ได้ระบุ",
        snapshotValue: snapshotStartDate || "ไม่ได้ระบุ",
        actualValue: null,
        explanation: "วันที่คาดว่าจะเริ่มในแผนปัจจุบันถูกแก้ไขหลังจากเริ่ม Day 0",
      });
    }
  }

  if (snapshotPlan && actual) {
    const snapshotStartDate = snapshotPlan.plannedStartDate;
    const actualStartDate = actual.actualStartDate;
    if (actualStartDate !== snapshotStartDate && (actualStartDate || snapshotStartDate)) {
      actualDeviationCount++;
      items.push({
        id: "schedule:start-date-actual",
        category: "schedule",
        severity: "warning",
        status: "actual_deviation",
        changeType: "value_changed",
        label: "วันที่เริ่มจริง",
        currentPlanValue: null,
        snapshotValue: snapshotStartDate || "ไม่ได้ระบุ",
        actualValue: actualStartDate || "ไม่ได้ระบุ",
        explanation: "วันเริ่มดำเนินการจริงแตกต่างจากวันที่วางแผนไว้ตอนเริ่มต้น",
      });
    }
  }

  // 4. Total Cutting Count (unit_count)
  if (currentPlan && snapshotPlan) {
    const plannedUnitCount = currentPlan.plannedBatch.plannedUnitCount;
    const snapshotUnitCount = snapshotPlan.plannedBatch.plannedUnitCount;

    if (plannedUnitCount !== snapshotUnitCount) {
      planChangeCount++;
      items.push({
        id: "unit_count:total-cuttings-plan",
        category: "unit_count",
        severity: "info",
        status: "plan_changed",
        changeType: "value_changed",
        label: "จำนวนกิ่งรวมตามแผน",
        currentPlanValue: plannedUnitCount,
        snapshotValue: snapshotUnitCount,
        actualValue: null,
        explanation: "จำนวนกิ่งรวมในแผนปัจจุบันถูกแก้ไขหลังจากเริ่ม Day 0",
      });
    }
  }

  if (snapshotPlan && actual) {
    const snapshotUnitCount = snapshotPlan.plannedBatch.plannedUnitCount;
    const actualUnitCount = actual.actualBatch.actualUnitCount;
    if (actualUnitCount !== snapshotUnitCount) {
      actualDeviationCount++;
      items.push({
        id: "unit_count:total-cuttings-actual",
        category: "unit_count",
        severity: "warning",
        status: "actual_deviation",
        changeType: "value_changed",
        label: "จำนวนกิ่งปักชำรวมปฏิบัติจริง",
        currentPlanValue: null,
        snapshotValue: snapshotUnitCount,
        actualValue: actualUnitCount,
        explanation: "จำนวนกิ่งรวมที่ปักชำจริงแตกต่างจากแผน ณ เวลาเริ่มทดลอง",
      });
    }
  }

  // 5. Treatments (treatment)
  if (currentPlan && snapshotPlan) {
    const currentTreatments = buildNormalizedTreatmentMap(currentPlan.plannedTreatments);
    const snapshotTreatments = buildNormalizedTreatmentMap(snapshotPlan.plannedTreatments);
    const allCodes = new Set([...currentTreatments.keys(), ...snapshotTreatments.keys()]);

    const sortedCodes = Array.from(allCodes).sort();

    for (const code of sortedCodes) {
      const tCurrent = currentTreatments.get(code);
      const tSnapshot = snapshotTreatments.get(code);

      const displayCode = tCurrent?.code || tSnapshot?.code || code.toUpperCase();

      // Case A: Added in Current Plan after Day 0 (Current Plan has it, Snapshot doesn't)
      if (tCurrent && !tSnapshot) {
        planChangeCount++;
        items.push({
          id: `treatment:${code}:presence`,
          category: "treatment",
          severity: "info",
          status: "plan_changed",
          changeType: "added",
          label: `กลุ่มทดลอง ${displayCode}`,
          currentPlanValue: "มีในแผน",
          snapshotValue: "ไม่มีในแผนเริ่ม",
          actualValue: null,
          explanation: "กลุ่มทดลองนี้ถูกเพิ่มเข้ามาในแผนปัจจุบันหลังจากเริ่ม Day 0",
        });
      }

      // Case B: Removed from Current Plan after Day 0 (Snapshot has it, Current Plan doesn't)
      if (!tCurrent && tSnapshot) {
        planChangeCount++;
        items.push({
          id: `treatment:${code}:presence`,
          category: "treatment",
          severity: "info",
          status: "plan_changed",
          changeType: "removed",
          label: `กลุ่มทดลอง ${displayCode}`,
          currentPlanValue: "ไม่มีในแผน",
          snapshotValue: "มีในแผนเริ่ม",
          actualValue: null,
          explanation: "กลุ่มทดลองนี้ถูกลบออกจากแผนปัจจุบันหลังจากเริ่ม Day 0",
        });
      }

      // Matched in Current Plan and Snapshot: compare plan values only.
      if (tSnapshot && tCurrent) {
        // Count Mismatch
        if (tCurrent.plannedUnitCount !== tSnapshot.plannedUnitCount) {
          planChangeCount++;
          items.push({
            id: `treatment:${code}:count-plan`,
            category: "treatment",
            severity: "info",
            status: "plan_changed",
            changeType: "value_changed",
            label: `จำนวนกิ่งกลุ่ม ${displayCode} ตามแผน`,
            currentPlanValue: `${tCurrent.plannedUnitCount} กิ่ง`,
            snapshotValue: `${tSnapshot.plannedUnitCount} กิ่ง`,
            actualValue: null,
            explanation: `จำนวนกิ่งของกลุ่ม ${displayCode} ในแผนปัจจุบันถูกแก้ไขหลังจากเริ่ม Day 0`,
          });
        }

        // Input Mismatch
        const normPlanInput = normalizeComparisonValue(tCurrent.plannedInputName);
        const normSnapInput = normalizeComparisonValue(tSnapshot.plannedInputName);

        if (normPlanInput !== normSnapInput) {
          planChangeCount++;
          items.push({
            id: `treatment:${code}:input-plan`,
            category: "treatment",
            severity: "info",
            status: "plan_changed",
            changeType: "value_changed",
            label: `สารเร่งรากกลุ่ม ${displayCode} ตามแผน`,
            currentPlanValue: tCurrent.plannedInputName || "ไม่ได้ระบุ",
            snapshotValue: tSnapshot.plannedInputName || "ไม่ได้ระบุ",
            actualValue: null,
            explanation: `ประเภทสารเร่งรากของกลุ่ม ${displayCode} ในแผนปัจจุบันถูกแก้ไขหลังจากเริ่ม Day 0`,
          });
        }

        // Name Mismatch
        const normPlanName = normalizeComparisonValue(tCurrent.name);
        const normSnapName = normalizeComparisonValue(tSnapshot.name);

        if (normPlanName !== normSnapName) {
          planChangeCount++;
          items.push({
            id: `treatment:${code}:name-plan`,
            category: "treatment",
            severity: "info",
            status: "plan_changed",
            changeType: "value_changed",
            label: `ชื่อกลุ่มทดลอง ${displayCode} (แผน)`,
            currentPlanValue: tCurrent.name,
            snapshotValue: tSnapshot.name,
            actualValue: null,
            explanation: `ชื่อกลุ่มทดลอง ${displayCode} ในแผนปัจจุบันถูกแก้ไขหลังจากเริ่ม Day 0`,
          });
        }

      }
    }
  }

  // Pass B: Snapshot vs Actual. This pass is intentionally independent of Current Plan.
  if (snapshotPlan && actual) {
    const snapshotTreatments = buildNormalizedTreatmentMap(snapshotPlan.plannedTreatments);
    const actualTreatments = buildNormalizedTreatmentMap(actual.actualTreatments);
    const allCodes = new Set([...snapshotTreatments.keys(), ...actualTreatments.keys()]);

    for (const code of Array.from(allCodes).sort()) {
      const tSnapshot = snapshotTreatments.get(code);
      const tActual = actualTreatments.get(code);
      const displayCode = tSnapshot?.code || tActual?.code || code.toUpperCase();

      if (tSnapshot && !tActual) {
        actualDeviationCount++;
        items.push({
          id: `treatment:${code}:presence-actual`,
          category: "treatment",
          severity: "warning",
          status: "actual_deviation",
          changeType: "removed",
          label: `กลุ่มทดลอง ${displayCode}`,
          currentPlanValue: null,
          snapshotValue: "มีในแผนเริ่ม",
          actualValue: "ไม่มีข้อมูลจริง",
          explanation: "ไม่มีข้อมูลบันทึกจริงสำหรับกลุ่มทดลองนี้ใน Day 0",
        });
      }

      if (!tSnapshot && tActual) {
        actualDeviationCount++;
        items.push({
          id: `treatment:${code}:presence-actual`,
          category: "treatment",
          severity: "warning",
          status: "actual_deviation",
          changeType: "added",
          label: `กลุ่มทดลอง ${displayCode}`,
          currentPlanValue: null,
          snapshotValue: "ไม่มีในแผนเริ่ม",
          actualValue: "มีข้อมูลจริง",
          explanation: "พบกลุ่มปฏิบัติจริงใน Day 0 ที่ไม่มีในแผน Snapshot ตอนเริ่มทดลอง",
        });
      }

      if (tSnapshot && tActual) {
        if (tActual.actualUnitCount !== tSnapshot.plannedUnitCount) {
          actualDeviationCount++;
          items.push({
            id: `treatment:${code}:count-actual`,
            category: "treatment",
            severity: "warning",
            status: "actual_deviation",
            changeType: "value_changed",
            label: `จำนวนกิ่งปักชำจริงกลุ่ม ${displayCode}`,
            currentPlanValue: null,
            snapshotValue: `${tSnapshot.plannedUnitCount} กิ่ง`,
            actualValue: `${tActual.actualUnitCount} กิ่ง`,
            explanation: `จำนวนกิ่งปักชำจริงของกลุ่ม ${displayCode} แตกต่างจากแผน Snapshot`,
          });
        }

        if (
          normalizeComparisonValue(tActual.actualInputName) !==
          normalizeComparisonValue(tSnapshot.plannedInputName)
        ) {
          actualDeviationCount++;
          items.push({
            id: `treatment:${code}:input-actual`,
            category: "treatment",
            severity: "warning",
            status: "actual_deviation",
            changeType: "value_changed",
            label: `สารเร่งรากที่ใช้จริงกลุ่ม ${displayCode}`,
            currentPlanValue: null,
            snapshotValue: tSnapshot.plannedInputName || "ไม่ได้ระบุ",
            actualValue: tActual.actualInputName || "ไม่ได้ระบุ",
            explanation: `สารเร่งรากที่ใช้จริงในกลุ่ม ${displayCode} แตกต่างจากแผน Snapshot`,
          });
        }

        if (normalizeComparisonValue(tActual.name) !== normalizeComparisonValue(tSnapshot.name)) {
          actualDeviationCount++;
          items.push({
            id: `treatment:${code}:name-actual`,
            category: "treatment",
            severity: "warning",
            status: "actual_deviation",
            changeType: "value_changed",
            label: `ชื่อกลุ่มทดลอง ${displayCode} (ปฏิบัติจริง)`,
            currentPlanValue: null,
            snapshotValue: tSnapshot.name,
            actualValue: tActual.name,
            explanation: `ชื่อกลุ่มทดลองที่ทำจริงของกลุ่ม ${displayCode} แตกต่างจากแผน Snapshot`,
          });
        }
      }
    }
  }

  // 6. Data Quality Issues (data_quality)
  const currentDataIssues = currentPlan ? [...currentPlan.dataIssues] : [];
  const snapshotDataIssues = snapshotPlan ? [...snapshotPlan.dataIssues] : [];
  const actualDataIssues = actual ? [...actual.dataIssues] : [];

  if (
    currentPlan &&
    hasDuplicateTreatmentCodes(currentPlan.plannedTreatments) &&
    !currentDataIssues.includes("duplicate_treatment_code")
  ) {
    currentDataIssues.push("duplicate_treatment_code");
  }
  if (
    snapshotPlan &&
    hasDuplicateTreatmentCodes(snapshotPlan.plannedTreatments) &&
    !snapshotDataIssues.includes("snapshot_treatment_code_duplicate")
  ) {
    snapshotDataIssues.push("snapshot_treatment_code_duplicate");
  }
  if (
    actual &&
    hasDuplicateTreatmentCodes(actual.actualTreatments) &&
    !actualDataIssues.includes("duplicate_treatment_code")
  ) {
    actualDataIssues.push("duplicate_treatment_code");
  }

  if (currentPlan && currentDataIssues.length > 0) {
    dataIssueCount++;
    items.push({
      id: "data_quality:current-plan-issues",
      category: "data_quality",
      severity: "warning",
      status: "incomplete",
      changeType: "incomplete",
      label: "คุณภาพข้อมูลแผนปัจจุบัน",
      currentPlanValue: `พบปัญหา (${currentDataIssues.length} รายการ)`,
      snapshotValue: "ไม่พบปัญหา",
      actualValue: "ไม่พบปัญหา",
      explanation: formatRoseTrialDataIssues(currentDataIssues),
    });
  }

  if (snapshotPlan && snapshotDataIssues.length > 0) {
    dataIssueCount++;
    items.push({
      id: "data_quality:snapshot-issues",
      category: "data_quality",
      severity: "warning",
      status: "incomplete",
      changeType: "incomplete",
      label: "คุณภาพข้อมูล Snapshot วันเริ่ม",
      currentPlanValue: "ไม่พบปัญหา",
      snapshotValue: `พบปัญหา (${snapshotDataIssues.length} รายการ)`,
      actualValue: "ไม่พบปัญหา",
      explanation: formatRoseTrialDataIssues(snapshotDataIssues),
    });
  }

  if (actual && actualDataIssues.length > 0) {
    dataIssueCount++;
    items.push({
      id: "data_quality:actual-issues",
      category: "data_quality",
      severity: "warning",
      status: "incomplete",
      changeType: "incomplete",
      label: "คุณภาพข้อมูลบันทึกจริง",
      currentPlanValue: "ไม่พบปัญหา",
      snapshotValue: "ไม่พบปัญหา",
      actualValue: `พบปัญหา (${actualDataIssues.length} รายการ)`,
      explanation: formatRoseTrialDataIssues(actualDataIssues),
    });
  }

  // Determine overallStatus and summaryText
  let overallStatus: RoseTrialComparisonReport["overallStatus"] = "match";
  let summaryText = "ข้อมูล Day 0 ตรงกับแผน ณ เวลาเริ่มทดลอง";

  if (dataIssueCount > 0) {
    overallStatus = "incomplete";
    summaryText = "ข้อมูลบางส่วนอ่านได้ไม่ครบ จึงอาจเปรียบเทียบได้ไม่สมบูรณ์";
  } else if (actualDeviationCount > 0) {
    overallStatus = "differs";
    summaryText = "พบข้อมูล Day 0 บางส่วนแตกต่างจากแผน ณ เวลาเริ่มทดลอง";
  } else if (planChangeCount > 0) {
    overallStatus = "differs";
    summaryText = "แผนปัจจุบันแตกต่างจาก snapshot ที่ใช้เริ่ม Day 0";
  }

  return {
    overallStatus,
    summaryText,
    items,
    planChangeCount,
    actualDeviationCount,
    dataIssueCount,
  };
}
