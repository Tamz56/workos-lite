import type { ReadinessResult, RoseTrialState } from "./types";

export function parseIntegerInput(value: string, minValue: number): number | null {
  if (value === "") return 0;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < minValue) {
    return null;
  }
  return parsed;
}

export function calculateReadiness(state: RoseTrialState): ReadinessResult {
  const { pilot, batch, checklistItems, treatments } = state;
  const totalItems = checklistItems.length;
  const isReadyStatus = (status: string) => status === "ready" || status === "not_needed";
  const readyItems = checklistItems.filter((item) => isReadyStatus(item.status)).length;
  const criticalMissingItems = checklistItems.filter(
    (item) => item.isCritical && !isReadyStatus(item.status)
  );
  const optionalPendingItems = checklistItems.filter(
    (item) => !item.isCritical && !isReadyStatus(item.status)
  );

  const hasValidTotalCuttings = Number.isFinite(batch.totalCuttings) &&
    Number.isInteger(batch.totalCuttings) && batch.totalCuttings > 0;
  const totalCuttings = hasValidTotalCuttings ? batch.totalCuttings : 0;
  const assignedCuttings = treatments.reduce((sum, treatment) => {
    if (!Number.isFinite(treatment.cuttingCount) || !Number.isInteger(treatment.cuttingCount)) {
      return sum;
    }
    return sum + treatment.cuttingCount;
  }, 0);
  const cuttingDifference = totalCuttings - assignedCuttings;
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!pilot.trialName.trim()) blockers.push("ชื่อการทดลองต้องไม่ว่าง");
  if (!pilot.goal.trim()) blockers.push("เป้าหมายการทดลองต้องไม่ว่าง");
  if (!batch.batchName.trim()) blockers.push("ชื่อ Batch ต้องไม่ว่าง");
  if (!hasValidTotalCuttings) blockers.push("จำนวนกิ่งปักชำทั้งหมดต้องมากกว่า 0");
  if (criticalMissingItems.length > 0) {
    blockers.push(`ยังมีอุปกรณ์/วัสดุจำเป็น ${criticalMissingItems.length} รายการที่ยังไม่พร้อมใช้`);
  }
  if (optionalPendingItems.length > 0) {
    warnings.push(`ยังมีอุปกรณ์/วัสดุทางเลือก ${optionalPendingItems.length} รายการที่ยังไม่พร้อมใช้`);
  }

  const codes = new Set<string>();
  let hasDuplicateCode = false;
  let hasEmptyCode = false;
  let hasEmptyName = false;
  let hasInvalidCutting = false;

  for (const treatment of treatments) {
    const code = treatment.code.trim();
    if (!code) hasEmptyCode = true;
    else if (codes.has(code)) hasDuplicateCode = true;
    else codes.add(code);

    if (!treatment.name.trim()) hasEmptyName = true;
    if (!Number.isFinite(treatment.cuttingCount) ||
      !Number.isInteger(treatment.cuttingCount) || treatment.cuttingCount < 0) {
      hasInvalidCutting = true;
    }
  }

  if (hasEmptyCode) blockers.push("มี Treatment Code ว่างอยู่");
  if (hasDuplicateCode) blockers.push("มี Treatment Code ซ้ำกัน");
  if (hasEmptyName) blockers.push("มีชื่อ Treatment ว่างอยู่");
  if (hasInvalidCutting) blockers.push("จำนวนกิ่งใน Treatment ต้องเป็นจำนวนเต็มไม่ติดลบ");
  if (cuttingDifference !== 0) {
    blockers.push(cuttingDifference > 0
      ? `จำนวนกิ่งใน Treatment ขาดอีก ${cuttingDifference} กิ่ง`
      : `จำนวนกิ่งใน Treatment เกินไป ${Math.abs(cuttingDifference)} กิ่ง`);
  }

  const status = blockers.length > 0
    ? "not_ready"
    : warnings.length > 0
      ? "partially_ready"
      : "ready_for_day0";

  return {
    status,
    canStart: blockers.length === 0,
    blockers,
    warnings,
    sections: {
      pilot: !pilot.trialName.trim() || !pilot.goal.trim() ? "blocked" : "ready",
      batchAllocation: !batch.batchName.trim() || !hasValidTotalCuttings || cuttingDifference !== 0
        ? "blocked" : "ready",
      preparationChecklist: criticalMissingItems.length > 0
        ? "blocked" : optionalPendingItems.length > 0 ? "warning" : "ready",
      inventory: "pending",
      treatmentProduct: "pending",
      samples: "pending",
      day0Workflow: "pending",
    },
    totalItems,
    readyItems,
    criticalMissingItems,
    optionalPendingItems,
    totalCuttings,
    assignedCuttings,
    cuttingDifference,
    reasons: blockers,
  };
}
