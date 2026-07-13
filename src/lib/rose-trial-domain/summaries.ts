// GF-APP-077B — Rose Trial Domain Summaries

import type { RoseTrialState } from "../../components/workspaces/travel/rose-trial/types";
import type { RoseDay0State } from "../../components/workspaces/travel/rose-trial/day-0/types";
import {
  mapRoseDay0ToActualRecord,
  mapRosePreparationToPlannedRecord,
} from "./adapters";
import type { PlannedTrialRecord, ActualTrialRecord, TrialModeSummary } from "./types";

const PLAN_DIFF_WARNING = "แผนปัจจุบันแตกต่างจากข้อมูล Day 0 ที่บันทึกไว้";
const INCOMPLETE_DAY0_WARNING = "ไม่สามารถอ่านข้อมูล Day 0 บางส่วนได้";

function normalizeComparisonValue(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
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
