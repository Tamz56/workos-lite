/**
 * ASTRO-REAL-APP-DEV-099 — Thai Planet Placement Runtime Adapter Stub
 *
 * เอกสารซอร์สโค้ดโครงร่างจำลอง (Interface Stub) สำหรับอแดปเตอร์คำนวณและประเมินพิกัดดวงดาวของไทย
 * ลอจิกจริงในการประมาณพิกัดดวงดาวยังไม่ได้อิมพลีเมนต์ในเวอร์ชันนี้
 * ค่าราศีสถิตและองศาทั้งหมดจะส่งคืนเป็นสถานะรอตรวจสอบ (pending-reference-validation)
 */

import {
  ThaiPlanetId,
  ThaiPlanetPlacementInput,
  ThaiPlanetPlacementResult,
  ThaiPlanetPlacementReferenceCaseLike,
  ThaiPlanetPlacementComparison
} from './astroRealAppTypes';

/**
 * รายการรหัสประจำดาวเคราะห์ของปฏิทินไทย 10 ตำแหน่ง (๐ ถึง ๙)
 * อ้างอิงจากบทบาทดวงดาวใน docs/astro-strategy/astro-real-app-093-thai-planet-placement-approximation-plan.md
 */
export const THAI_PLANET_IDS: ThaiPlanetId[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * สร้างชุดผลลัพธ์ตำแหน่งดาวเคราะห์ไทยจำลอง v0.1 (Interface Stub)
 * ทุกดวงดาวจะมีค่าพิกัดเป็นสถานะรอตรวจสอบ เพื่อความปลอดภัยทางข้อมูลของระบบรันไทม์
 *
 * @param input ข้อมูลนำเข้าสำหรับประกอบการประมาณการ (เช่น วันเกิด เวลาเกิด เขตเวลาเกิด)
 * @returns รายการผลลัพธ์ตำแหน่งดวงดาว 10 ดวง
 */
export function buildThaiPlanetPlacementStub(input: ThaiPlanetPlacementInput): ThaiPlanetPlacementResult[] {
  // บันทึกเพื่อหลีกเลี่ยง lint warning ของ input โดยไม่ได้คำนวณจริง
  const debugNote = `Stub generated based on input profile context: calendar=${input.calendarSystem}, calculation=${input.calculationSystem}`;

  return THAI_PLANET_IDS.map((id): ThaiPlanetPlacementResult => {
    return {
      planetId: id,
      signRasi: 'pending-reference-validation',
      degree: 'pending-reference-validation',
      segment: 'pending-reference-validation',
      specialStatus: 'unavailable',
      confidence: 'pending',
      validationStatus: 'not-validated',
      notes: `Placeholder stub output. ${debugNote}`
    };
  });
}

/**
 * เปรียบเทียบผลลัพธ์ประมาณการดาวเคราะห์รันไทม์กับกรณีศึกษาอ้างอิงควบคุม (DEV-097)
 * ทำหน้าที่ประเมินคุณภาพของ Adapter เชิงการวินิจฉัย (Diagnostic) เท่านั้น
 *
 * @param runtimeResult ผลลัพธ์ประมาณการดาวที่รันได้จริงจากระบบ
 * @param referenceCase ข้อมูลดวงชะตากรณีศึกษาที่ต้องการนำมาสอบเทียบ
 * @returns ผลการเปรียบเทียบในแต่ละตำแหน่งดวงดาว
 */
export function compareThaiPlanetPlacementWithReference(
  runtimeResult: ThaiPlanetPlacementResult,
  referenceCase: ThaiPlanetPlacementReferenceCaseLike
): ThaiPlanetPlacementComparison {
  const targetPlanetId = runtimeResult.planetId;

  // ค้นหาค่าตำแหน่งคาดหวังในกรณีศึกษาสำหรับดาวดวงนั้น
  const expectedPlacement = referenceCase.expectedPlacements?.find(
    (p) => p.planetId === targetPlanetId
  );

  // กฎเกณฑ์ที่ 1: หากไม่มีค่าคาดหวัง หรือค่าคาดหวังเป็น placeholder ให้คืนค่า not-comparable ทันที
  if (!expectedPlacement || expectedPlacement.expectedSignRasi === 'pending-reference-validation') {
    return {
      caseId: referenceCase.caseId,
      planetId: targetPlanetId,
      runtimeValue: runtimeResult,
      expectedValueStatus: 'pending-reference-validation',
      comparisonStatus: 'not-comparable',
      notes: 'Comparison skipped. Expected reference value is not validated.'
    };
  }

  // กฎเกณฑ์ที่ 2: หากค่าทดแทนรันไทม์ยังเป็น placeholder ให้คืนค่า not-comparable
  if (runtimeResult.signRasi === 'pending-reference-validation') {
    return {
      caseId: referenceCase.caseId,
      planetId: targetPlanetId,
      runtimeValue: runtimeResult,
      expectedValueStatus: 'validated',
      comparisonStatus: 'not-comparable',
      notes: 'Comparison skipped. Runtime result is still in pending-validation status.'
    };
  }

  // หมายเหตุ: การวิเคราะห์และลอจิกการคำนวณจับคู่จริง (matching logic) จะถูกพัฒนาต่อไปในเฟสถัดไป
  return {
    caseId: referenceCase.caseId,
    planetId: targetPlanetId,
    runtimeValue: runtimeResult,
    expectedValueStatus: 'validated',
    comparisonStatus: 'not-comparable',
    notes: 'Real matching logic is intentionally not implemented in this stub.'
  };
}
