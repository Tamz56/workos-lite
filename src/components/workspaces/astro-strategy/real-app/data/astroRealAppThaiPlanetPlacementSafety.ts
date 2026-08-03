/**
 * ASTRO-REAL-APP-DEV-100 — Thai Planet Placement Safety Harness
 *
 * ระบบประเมินความปลอดภัย (Safety Harness / Contract Verification Layer) สำหรับตำแหน่งดวงดาวไทย
 * ทำหน้าที่คัดกรองและประเมินผลเชิงป้องกันจากการใช้ค่าจำลอง (Placeholder Values) ในรันไทม์
 * โดยไม่มีการคำนวณราศี องศา หรือตำแหน่งดาวที่แท้จริง
 */

import {
  ThaiPlanetPlacementResult,
  ThaiPlanetPlacementReferenceCaseLike,
  ThaiPlanetPlacementSafetySummary,
  ThaiPlanetId
} from './astroRealAppTypes';

/**
 * ตรวจสอบว่าค่าของตำแหน่งดวงดาวเป็นสถานะรอการตรวจสอบ (Pending) หรือใช้งานไม่ได้ (Unavailable) หรือไม่
 *
 * @param value ค่าลองจิจูด ราศี หรือองศาที่ต้องการตรวจสอบ
 * @returns true หากค่านั้นเป็นค่าจำลองหรือ pending-validation
 */
export function isPendingThaiPlanetPlacementValue(value: string | undefined): boolean {
  return (
    value === undefined ||
    value === '' ||
    value === 'pending-reference-validation' ||
    value === 'unavailable'
  );
}

/**
 * ตรวจสอบความสามารถในการนำตำแหน่งดาวไปใช้เปรียบเทียบทางสถิติและการสอบเทียบ (Comparable)
 * คืนค่า false ทันทีหากค่าฝั่งรันไทม์หรือฝั่งกรณีศึกษาอ้างอิงเป็นค่า placeholder หรือ unavailable
 *
 * @param result ผลลัพธ์ประมาณการดาวที่ประมวลจากรันไทม์
 * @param referenceCase กรณีศึกษาอ้างอิงสอบเทียบ
 * @returns true หากข้อมูลทั้งสองฝั่งพร้อมตรวจสอบและไม่มีค่าจำลองปะปน
 */
export function isThaiPlanetPlacementComparable(
  result: ThaiPlanetPlacementResult,
  referenceCase: ThaiPlanetPlacementReferenceCaseLike
): boolean {
  const targetPlanetId = result.planetId;
  const expectedPlacement = referenceCase.expectedPlacements?.find(
    (p) => p.planetId === targetPlanetId
  );

  // หากไม่มีข้อมูลคาดหวังสำหรับรหัสดาวดวงนี้ในกรณีศึกษา ให้ถือว่าเปรียบเทียบไม่ได้
  if (!expectedPlacement) {
    return false;
  }

  // หากฝั่งรันไทม์เป็นค่าจำลองหรือว่างเปล่า ให้ถือว่าเปรียบเทียบไม่ได้
  if (
    isPendingThaiPlanetPlacementValue(result.signRasi) ||
    isPendingThaiPlanetPlacementValue(result.degree)
  ) {
    return false;
  }

  // หากฝั่งกรณีศึกษาอ้างอิงเป็นค่าจำลองหรือว่างเปล่า ให้ถือว่าเปรียบเทียบไม่ได้
  if (
    isPendingThaiPlanetPlacementValue(expectedPlacement.expectedSignRasi) ||
    isPendingThaiPlanetPlacementValue(expectedPlacement.expectedDegree)
  ) {
    return false;
  }

  return true;
}

/**
 * ประเมินและจัดทำสรุปความปลอดภัย (Safety Summary) สำหรับการเปรียบเทียบตำแหน่งดาวเคราะห์ ๐ ถึง ๙
 * ป้องกันการสอดแทรกค่าจำลองและตรวจสอบความปลอดภัยเชิงโครงสร้างรันไทม์
 *
 * @param results รายการผลลัพธ์ตำแหน่งดวงดาวที่รันไทม์ประมวลได้
 * @param referenceCase กรณีศึกษาสำหรับสอบเทียบ (ถ้ามี)
 * @returns สรุปผลลัพธ์ความปลอดภัยเชิงวิเคราะห์
 */
export function buildThaiPlanetPlacementSafetySummary(
  results: ThaiPlanetPlacementResult[],
  referenceCase?: ThaiPlanetPlacementReferenceCaseLike
): ThaiPlanetPlacementSafetySummary {
  const issues: string[] = [];
  let comparableCount = 0;
  let notComparableCount = 0;
  let validatedCount = 0;
  let pendingCount = 0;

  // 1. ตรวจสอบความครบถ้วนของรหัสดาวเคราะห์ 10 ตำแหน่ง (0 ถึง 9)
  const planetIdsInResults = new Set(results.map((r) => r.planetId));
  const expectedPlanetIds: ThaiPlanetId[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const hasAllPlanets = expectedPlanetIds.every((id) => planetIdsInResults.has(id));

  if (!hasAllPlanets) {
    issues.push('Safety Warning: Runtime results do not cover all 10 Thai planet IDs (0-9).');
  }

  // 2. ตรวจสอบและนับจำนวนค่าจำลองในระดับรันไทม์
  for (const res of results) {
    if (
      isPendingThaiPlanetPlacementValue(res.signRasi) ||
      isPendingThaiPlanetPlacementValue(res.degree)
    ) {
      pendingCount++;
    }
  }

  if (pendingCount > 0) {
    issues.push(`Diagnostic: ${pendingCount} runtime placement values are in pending/placeholder status.`);
  }

  // 3. วิเคราะห์เชิงตรวจสอบเทียบเคียงกับ Reference Case
  if (!referenceCase) {
    // หากไม่มีการระบุ Reference Case ให้ถือเป็นระบบตรวจสอบวิเคราะห์ชั่วคราว (Diagnostic only)
    issues.push('Diagnostic: No reference case provided. Safety summary operates in diagnostic mode.');
    comparableCount = 0;
    notComparableCount = results.length;
    validatedCount = 0;
  } else {
    // ตรวจสอบว่า Reference Case นั้นเป็นค่าจำลอง (Placeholder) หรือไม่
    const isReferencePlaceholder =
      referenceCase.validationStatus === 'pending-reference-validation' ||
      referenceCase.caseId.includes('placeholder') ||
      (referenceCase.expectedPlacements?.every((p) =>
        isPendingThaiPlanetPlacementValue(p.expectedSignRasi)
      ) ?? true);

    if (isReferencePlaceholder) {
      issues.push('Safety Warning: Reference case is a placeholder or not validated.');
      comparableCount = 0;
      notComparableCount = results.length;
      validatedCount = 0;
    } else {
      // กรณีมี Reference Case ที่ผ่านการตรวจสอบจริง
      for (const res of results) {
        const isComparable = isThaiPlanetPlacementComparable(res, referenceCase);
        if (isComparable) {
          comparableCount++;
          const expected = referenceCase.expectedPlacements?.find(
            (p) => p.planetId === res.planetId
          );
          if (expected) {
            // ดำเนินการตรวจสอบความตรงกันอย่างปลอดภัย
            const isMatched =
              res.signRasi === expected.expectedSignRasi &&
              res.degree === expected.expectedDegree;
            if (isMatched) {
              validatedCount++;
            } else {
              issues.push(
                `Mismatch detected for planet ID ${res.planetId}: runtime='${res.signRasi} ${res.degree}', expected='${expected.expectedSignRasi} ${expected.expectedDegree}'`
              );
            }
          }
        } else {
          notComparableCount++;
        }
      }
    }
  }

  return {
    comparableCount,
    notComparableCount,
    validatedCount,
    pendingCount,
    issues
  };
}
