// GF-APP-075 — Rose Trial Day 0 Trial Unit Generator
// Stage 2D — Day 0 Setup MVP

import type { TrialUnit, Treatment } from "./types";

/**
 * ฟังก์ชันสร้างรหัสหน่วยกิ่งปักชำรายกิ่ง (Trial Units) จากรายชื่อกลุ่มการทดสอบจริง
 * โดยรักษารายละเอียดเดิม (containerCode, initialCondition, notes) สำหรับ ID ที่ยังตรงกันอยู่
 */
export function generateTrialUnits(
  batchName: string,
  treatments: Treatment[],
  existingUnits: TrialUnit[]
): { units: TrialUnit[]; warnings: string[] } {
  const units: TrialUnit[] = [];
  const warnings: string[] = [];

  // สร้าง batch slug สะอาดๆ
  const cleanBatchName = batchName.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const batchSlug = cleanBatchName || "B1";

  // วนลูปทุก Treatment เพื่อสร้าง ID รายกิ่ง
  for (const treatment of treatments) {
    const code = treatment.code.trim().toUpperCase() || "TX";
    const count = treatment.cuttingCount || 0;

    for (let seq = 1; seq <= count; seq++) {
      const paddedSeq = seq.toString().padStart(2, "0");
      const unitId = `ROSE-${batchSlug}-${code}-${paddedSeq}`;

      // ค้นหาว่ามีข้อมูลกิ่งนี้เดิมอยู่แล้วหรือไม่ เพื่อนำมาใช้ต่อ (Preserve)
      const existing = existingUnits.find((u) => u.id === unitId);

      units.push({
        id: unitId,
        treatmentId: treatment.id,
        treatmentCode: treatment.code,
        sequenceNumber: seq,
        label: `กิ่งที่ ${seq} - ${treatment.name}`,
        containerCode: existing?.containerCode || "",
        initialCondition: existing?.initialCondition || "สดดี (Healthy)",
        notes: existing?.notes || "",
      });
    }
  }

  // หาสิ่งที่หายไป (รายการของเดิมที่รหัสเปลี่ยนจนต้องถูกลบออก)
  const newIds = new Set(units.map((u) => u.id));
  const removedCount = existingUnits.filter((u) => !newIds.has(u.id)).length;
  if (removedCount > 0) {
    warnings.push(`ตรวจพบรหัสที่เกินหรือเปลี่ยนแผนจนต้องลบออกจากรายการเดิมจำนวน ${removedCount} รายการ`);
  }

  return { units, warnings };
}
