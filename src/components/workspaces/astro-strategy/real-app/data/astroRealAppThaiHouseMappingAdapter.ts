import {
  ThaiZodiacSign,
  ThaiHouseName,
  ThaiHouseNumber,
  ThaiHouseMappingInput,
  ThaiHousePlacementV01,
  ThaiHouseMappingV01
} from "./astroRealAppTypes";

/**
 * ลำดับราศีมาตรฐานของปฏิทินไทย
 */
const ZODIAC_ORDER: ThaiZodiacSign[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
];

/**
 * คืนค่าชื่อภพชะตาภาษาไทย
 */
export function getThaiHouseName(houseNumber: ThaiHouseNumber): ThaiHouseName {
  const names: Record<ThaiHouseNumber, ThaiHouseName> = {
    1: "ตนุ",
    2: "กดุมภะ",
    3: "สหัชชะ",
    4: "พันธุ",
    5: "ปุตตะ",
    6: "อริ",
    7: "ปัตนิ",
    8: "มรณะ",
    9: "ศุภะ",
    10: "กัมมะ",
    11: "ลาภะ",
    12: "วินาศ"
  };
  return names[houseNumber];
}

/**
 * คืนหมวดหมู่อิทธิพลเชิงกลยุทธ์ของแต่ละภพชะตา
 */
function getHouseThemeCategory(houseNumber: ThaiHouseNumber): "work" | "resource" | "network" | "obstacle" | "recharge" | "other" {
  const categories: Record<ThaiHouseNumber, "work" | "resource" | "network" | "obstacle" | "recharge" | "other"> = {
    1: "other",
    2: "resource",
    3: "network",
    4: "other",
    5: "work",
    6: "obstacle",
    7: "network",
    8: "obstacle",
    9: "work",
    10: "work",
    11: "network",
    12: "recharge"
  };
  return categories[houseNumber];
}

/**
 * คืนคำอธิบายแกนงานเชิงพฤติกรรมของภพชะตา (ปลอดภัยและสุขุม)
 */
function getHouseWorkLifeTheme(houseNumber: ThaiHouseNumber): string {
  const themes: Record<ThaiHouseNumber, string> = {
    1: "คุณลักษณะ สไตล์การลงมือ และแรงขับเคลื่อนพื้นฐานในการทำงานส่วนบุคคล",
    2: "การประเมินและการจัดการทรัพยากร เครื่องมือ หรือขีดความสามารถการจัดสรรแผน",
    3: "การติดต่อสื่อสารระยะสั้น ปริมาณการปฏิสัมพันธ์รายวัน และความคล่องตัวเชิงสังคม",
    4: "ความมั่นคงของฐานที่ตั้ง สภาพแวดล้อมที่ทำงาน และระบบสนับสนุนเบื้องหลัง",
    5: "โครงการริเริ่มสร้างสรรค์ การลงมือสร้างสรรค์สิ่งใหม่ และงานวิจัยช่วงเริ่มต้น",
    6: "การเผชิญหน้าอุปสรรคหน้างาน การตรวจหาบั๊ก และการประเมินสภาพความล้ากายใจ",
    7: "การเจรจาตกลงกับคู่ค้า การตกลงผลประโยชน์ และการประสานงานประชุมภายนอก",
    8: "การปรับปรุงแก้ไขโครงสร้างการทำงานเดิม การประเมินจุดเสี่ยงทางบัญชีภาษีอากร",
    9: "การยกระดับวิสัยทัศน์ ความรู้เชิงลึก การเรียนรู้ทักษะใหม่ และความก้าวหน้า",
    10: "ภาระหน้าที่รับผิดชอบหลัก งานส่งมอบที่ต้องอาศัยแรงขับเคลื่อนสมองสูงสุด",
    11: "โอกาสความลุล่วง การเชื่อมต่อกลุ่มผู้สนับสนุน และการรับผลสัมฤทธิ์ปลายน้ำ",
    12: "งานเบื้องหลังที่ไม่เปิดเผย โหมดสันโดษเพื่อจดจ่องานยาก และการพักจำศีลเพื่อคืนพลัง"
  };
  return themes[houseNumber];
}

/**
 * สกัดรหัสสัญญาณความหมายเชิงกลยุทธ์ตามพจนานุกรมสั้น
 */
export function getHouseStrategySignalIds(houseNumber: ThaiHouseNumber) {
  let strategyMeaningIds: string[] = [];
  let cautionSignalIds: string[] = [];
  let recoverySignalIds: string[] = [];

  switch (houseNumber) {
    case 1:
      strategyMeaningIds = ["TH_HOUSE_SELF_WORK_STYLE_SPRINTER"];
      break;
    case 2:
      cautionSignalIds = ["TH_HOUSE_DECISION_CAUTION_NO_IMPULSE"];
      break;
    case 3:
      strategyMeaningIds = ["TH_HOUSE_COLLABORATION_ALIGNMENT"];
      break;
    case 4:
      strategyMeaningIds = ["TH_HOUSE_HOME_BASE_WORKSPACE_CLEANUP"];
      break;
    case 5:
      strategyMeaningIds = ["TH_HOUSE_CAREER_FOCUS_INFRASTRUCTURE"];
      break;
    case 6:
      cautionSignalIds = ["TH_HOUSE_PROBLEM_SOLVING_REFACTOR"];
      break;
    case 7:
      strategyMeaningIds = ["TH_HOUSE_COLLABORATION_CONTRACT_SIGN"];
      break;
    case 8:
      cautionSignalIds = ["TH_HOUSE_DELAY_REVIEW_RISK_CHECK"];
      break;
    case 9:
      strategyMeaningIds = ["TH_HOUSE_LEARNING_EXPANSION_DEEP_READ"];
      break;
    case 10:
      strategyMeaningIds = ["TH_HOUSE_CAREER_FOCUS_DELIVERABLE"];
      break;
    case 11:
      strategyMeaningIds = ["TH_HOUSE_NETWORK_GAIN_PEER_HELP"];
      break;
    case 12:
      recoverySignalIds = ["TH_HOUSE_RECOVERY_BACKSTAGE_OFF_SCREEN"];
      break;
  }

  return { strategyMeaningIds, cautionSignalIds, recoverySignalIds };
}

/**
 * คำนวณคะแนนความมั่นใจเฉพาะรายภพชะตา
 */
export function calculateHouseConfidence(
  baseConfidence: number,
  birthDataConfidence: "high" | "medium" | "low" | "unknown",
  houseNumber: ThaiHouseNumber
): number {
  let score = baseConfidence;

  if (birthDataConfidence === "medium") {
    score -= 0.1;
  } else if (birthDataConfidence === "low") {
    score -= 0.3;
  } else if (birthDataConfidence === "unknown") {
    score -= 0.5;
  }

  // ภพเฉพาะจุดลัคนาและงานจะอ่อนไหวเป็นพิเศษ
  if (houseNumber === 1 || houseNumber === 10) {
    score -= 0.05;
  }

  return Math.max(0.0, Math.min(1.0, score));
}

/**
 * ประมวลผังเรือนชะตา 12 ภพจากลัคนาเกิดโดยใช้ระบบ Equal Sign
 */
export function mapZodiacToHouses(
  ascendantZodiacSign: string,
  baseConfidence: number,
  dayBoundaryRisk: boolean,
  birthDataConfidence: "high" | "medium" | "low" | "unknown"
): ThaiHousePlacementV01[] {
  const startIdx = ZODIAC_ORDER.indexOf(ascendantZodiacSign as ThaiZodiacSign);
  if (startIdx === -1) {
    throw new Error(`Invalid ascendant zodiac sign: ${ascendantZodiacSign}`);
  }

  const placements: ThaiHousePlacementV01[] = [];

  for (let i = 1; i <= 12; i++) {
    const houseNumber = i as ThaiHouseNumber;
    const zodiacIdx = (startIdx + i - 1) % 12;
    const zodiacSign = ZODIAC_ORDER[zodiacIdx];
    const houseNameThai = getThaiHouseName(houseNumber);
    const themeCategory = getHouseThemeCategory(houseNumber);
    const workLifeTheme = getHouseWorkLifeTheme(houseNumber);

    const confidenceScore = calculateHouseConfidence(baseConfidence, birthDataConfidence, houseNumber);

    let uncertaintyNotes = "";
    if (dayBoundaryRisk) {
      uncertaintyNotes += "ช่วงเวลาก้ำกึ่งข้ามผ่านวันจันทรคติไทยเดิมสะสมผลต่างลัคนา ";
    }
    if (confidenceScore < 0.5) {
      uncertaintyNotes += "ระดับคะแนนความมั่นใจไม่เพียงพอต่อการนำข้อแนะนำเรือนชะตาเชิงลึกไปวิเคราะห์ ";
    }

    const { strategyMeaningIds, cautionSignalIds, recoverySignalIds } = getHouseStrategySignalIds(houseNumber);

    placements.push({
      houseNumber,
      houseNameThai,
      zodiacSign,
      themeCategory,
      workLifeTheme,
      strategyMeaningIds,
      cautionSignalIds,
      recoverySignalIds,
      confidenceScore,
      uncertaintyNotes: uncertaintyNotes.trim()
    });
  }

  return placements;
}

/**
 * สร้างหมายเหตุอภิปรายความเชื่อมั่นโดยรวม
 */
export function buildHouseMappingConfidenceNotes(input: ThaiHouseMappingInput): string {
  let notes = "";
  if (input.ascendantConfidenceScore < 0.4) {
    notes += "คะแนนความเชื่อมั่นลัคนาอยู่ในระดับต่ำกว่าเกณฑ์การแสดงผลเรือนชะตา แนะนำให้ผู้ใช้ดูคำแนะนำทั่วไปเท่านั้น ";
  } else if (input.ascendantConfidenceScore < 0.7) {
    notes += "ความมั่นใจระดับปานกลาง ใช้ข้อมูลสัญญะประกอบการทดลองสังเกตพฤติกรรมส่วนบุคคล ";
  } else {
    notes += "ข้อมูลความน่าเชื่อถือสมบูรณ์ ผังเรือนชะตาสามารถประเมินผลกลยุทธ์ตามมาตรฐานการประมาณการ ";
  }

  if (input.dayBoundaryRisk) {
    notes += "[แจ้งเตือนช่วงเวลาก้ำกึ่ง 00:00 - 06:00 น. รอยต่อเปลี่ยนวันเกิด]";
  }

  return notes.trim();
}

/**
 * ฟังก์ชันหลักในการสร้างอแดปเตอร์ส่งออกข้อมูลโครงสร้างเรือนชะตาไทย
 */
export function buildThaiHouseMapping(input: ThaiHouseMappingInput): ThaiHouseMappingV01 {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const mappingId = "thm_" + Math.random().toString(36).substring(2, 11);

  const houses = mapZodiacToHouses(
    input.ascendantZodiacSign,
    input.ascendantConfidenceScore,
    input.dayBoundaryRisk,
    input.birthDataConfidence
  );

  // รวบรวม IDs ของสัญญาณที่ได้ทั้งหมด
  const strategicSignalIds: string[] = [];
  houses.forEach(h => {
    strategicSignalIds.push(...h.strategyMeaningIds);
    strategicSignalIds.push(...h.cautionSignalIds);
    strategicSignalIds.push(...h.recoverySignalIds);
  });

  const dominantWorkHouses = [1, 10, 11]; // ตนุ, กัมมะ, ลาภะ
  const sensitiveHouses = [6, 12]; // อริ, วินาศ

  const confidenceNotes = buildHouseMappingConfidenceNotes(input);
  const safetyDisclaimer = "ข้อแนะนำเชิงสัญญะเรือนชะตาไทยนี้ จัดทำขึ้นเพื่อสนับสนุนการสะท้อนคิดและการบริหารตารางเวลากิจกรรมส่วนบุคคลเชิงพฤติกรรมเท่านั้น ปราศจากการชี้วัดหรือทำนายโชคชะตาอนาคตการเงินความรักที่ฟันธง";

  return {
    mappingId,
    source: "AstroStrategyLab_HouseAdapter",
    calculationVersion: "0.1.0",
    houseSystem: "equal_house_system",
    ascendant: {
      zodiacSign: input.ascendantZodiacSign,
      confidenceScore: input.ascendantConfidenceScore,
      calculationMethod: input.calculationMethod
    },
    houses,
    dominantWorkHouses,
    sensitiveHouses,
    strategicSignalIds,
    confidenceNotes,
    safetyDisclaimer,
    generatedAt
  };
}
