import { summarizeInventoryReadiness } from "./inventory";
import type {
  ReadinessResult,
  ReadinessSectionStatus,
  RoseTrialState,
  TreatmentProductRecord,
} from "./types";

export interface TreatmentProductReadiness {
  blockers: string[];
  warnings: string[];
  status: ReadinessSectionStatus;
}

function normalizeIdentity(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function evaluateTreatmentProductReadiness(
  product: TreatmentProductRecord,
  hasCanonicalTreatmentGroups = true
): TreatmentProductReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!product.productName.trim()) blockers.push("Treatment Product: กรุณาระบุชื่อสินค้า");
  else if (!normalizeIdentity(product.productName).includes("clonex")) {
    blockers.push("Treatment Product: สินค้าที่เลือกต้องตรงกับ Clonex Rooting Gel ตาม Pilot contract");
  }
  if (product.status !== "ready_to_use") blockers.push("Treatment Product: สินค้ายังไม่อยู่ในสถานะพร้อมใช้");
  if (normalizeIdentity(product.productType) !== "commercial rooting treatment") {
    blockers.push("Treatment Product: บทบาทผลิตภัณฑ์ไม่ตรงกับ Commercial Rooting Treatment");
  }
  if (normalizeIdentity(product.activeIngredient) !== "iba") {
    blockers.push("Treatment Product: สารสำคัญต้องเป็น IBA ตาม Pilot contract");
  }
  if (normalizeIdentity(product.form) !== "gel") {
    blockers.push("Treatment Product: รูปแบบผลิตภัณฑ์ต้องเป็น Gel ตาม Pilot contract");
  }
  if (!hasCanonicalTreatmentGroups) {
    blockers.push("Treatment Product: กลุ่มที่ใช้ Treatment ไม่ตรงกับ W-T1 และ P-T1");
  }
  if (["ordered", "received", "ready_to_use"].includes(product.status) && !product.seller.trim()) {
    blockers.push("Treatment Product: กรุณาระบุผู้ขายสำหรับสินค้าที่สั่งซื้อหรือได้รับแล้ว");
  }

  if (product.packagingType === "repacked" || product.packagingType === "repacked_unknown") {
    warnings.push("Treatment Product: ผลิตภัณฑ์เป็นแบบแบ่งบรรจุ ควรบันทึกสภาพที่ได้รับจริง");
  }
  if (!product.expiryNote.trim()) warnings.push("Treatment Product: ยังไม่มีข้อมูลวันหมดอายุ");
  if (!product.applicationMethod.trim()) warnings.push("Treatment Product: ยังไม่มีวิธีใช้จากฉลากหรือผู้ขาย");
  if (!product.storageNote.trim()) warnings.push("Treatment Product: ยังไม่มีข้อมูลการเก็บรักษา");

  return {
    blockers,
    warnings,
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready",
  };
}

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

  let inventoryStatus: ReadinessSectionStatus = "pending";
  let treatmentProductStatus: ReadinessSectionStatus = "pending";
  if (state.version === 2) {
    const inventoryReadiness = summarizeInventoryReadiness(state.inventory);
    blockers.push(...inventoryReadiness.blockers);
    warnings.push(...inventoryReadiness.warnings);
    inventoryStatus = inventoryReadiness.status;

    const hasCanonicalTreatmentGroups = ["W-T1", "P-T1"].every((groupId) =>
      state.groupConfig.some((group) =>
        group.id === groupId && group.treatmentRole === "treatment" && group.treatmentCode === "T1"
      )
    );
    const productReadiness = evaluateTreatmentProductReadiness(
      state.treatmentProduct,
      hasCanonicalTreatmentGroups
    );
    blockers.push(...productReadiness.blockers);
    warnings.push(...productReadiness.warnings);
    treatmentProductStatus = productReadiness.status;
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
      inventory: inventoryStatus,
      treatmentProduct: treatmentProductStatus,
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
