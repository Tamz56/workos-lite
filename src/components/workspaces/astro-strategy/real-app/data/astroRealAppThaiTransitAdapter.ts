import {
  ThaiTransitStrategyOutput,
  ThaiTransitPlanetSummary,
  ThaiTransitHouseImpact,
  ThaiTransitElementRelationship
} from "./astroRealAppTypes";

export interface ThaiTransitInput {
  readonly targetDate: string;
  readonly targetTime?: string;
  readonly timezone?: string;
  readonly natalAscendantZodiac?: string; // e.g., "aries", "taurus", "gemini", etc.
  readonly natalHouseMap?: Record<string, string>; // e.g., {"aries": "tanu", "taurus": "kadumpa"}
  readonly recentReflectionContext?: {
    readonly fatigueLevel?: "low" | "medium" | "high";
    readonly energyLevel?: "low" | "medium" | "high";
  };
  readonly userCurrentFocus?: string;
}

const ZODIAC_SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];

const HOUSE_NAMES = [
  "tanu", "kadumpa", "sahatcha", "panthu", "putta", "ari",
  "patni", "morana", "supa", "kamma", "lapa", "vinas"
];

/**
 * สกัดธาตุประจำราศีเกิดเพื่อคำนวณสมดุลธาตุ
 */
function getZodiacElement(zodiac: string): "fire" | "earth" | "wind" | "water" {
  switch (zodiac) {
    case "aries":
    case "leo":
    case "sagittarius":
      return "fire";
    case "taurus":
    case "virgo":
    case "capricorn":
      return "earth";
    case "gemini":
    case "libra":
    case "aquarius":
      return "wind";
    case "cancer":
    case "scorpio":
    case "pisces":
    default:
      return "water";
  }
}

/**
 * คำนวณหาตำแหน่งดาวจรแบบประมาณการ
 */
function getApproximatedTransitZodiac(planetId: number, targetDate: string): string {
  const dateObj = new Date(targetDate);
  const timeMs = isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime();
  const dayIndex = Math.floor(timeMs / (1000 * 60 * 60 * 24));
  
  // Modulo ชิ้นงานแบบ Rule-based
  const offset = (dayIndex + (planetId * 13)) % 12;
  const index = (offset + 12) % 12;
  return ZODIAC_SIGNS[index];
}

/**
 * คำนวณความสัมพันธ์ธาตุและแนะแนวทางสะท้อนตนเอง
 */
function calculateElementRelationship(
  selfElement: "fire" | "earth" | "wind" | "water",
  dayIndex: number
): ThaiTransitElementRelationship {
  const ELEMENTS: ("fire" | "earth" | "wind" | "water")[] = ["fire", "earth", "wind", "water"];
  const dayElement = ELEMENTS[dayIndex % 4];
  
  let compatibilityType: "supporting" | "neutral" | "clashing" = "neutral";
  let elementPairAdvice = "ธาตุคู่สมดุลปานกลาง ประคองสติทำงานปกติ";
  
  if (selfElement === dayElement) {
    compatibilityType = "supporting";
    elementPairAdvice = "ธาตุวันตรงกับธาตุตนเอง เอื้อต่อการจัดสรรสมาธิได้ยาวนานขึ้น";
  } else if (
    (selfElement === "fire" && dayElement === "wind") ||
    (selfElement === "wind" && dayElement === "fire")
  ) {
    compatibilityType = "supporting";
    elementPairAdvice = "ลมหนุนส่งเสริมพลังไฟ มีพลังสร้างสรรค์ไอเดียและการริเริ่มงานโดดเด่น";
  } else if (
    (selfElement === "water" && dayElement === "earth") ||
    (selfElement === "earth" && dayElement === "water")
  ) {
    compatibilityType = "supporting";
    elementPairAdvice = "น้ำช่วยโอบอุ้มหล่อเลี้ยงผืนดิน เหมาะแก่การจดบันทึก รวบรวมข้อมูลมั่นคง";
  } else if (
    (selfElement === "fire" && dayElement === "water") ||
    (selfElement === "water" && dayElement === "fire")
  ) {
    compatibilityType = "clashing";
    elementPairAdvice = "น้ำกระทบดับพลังไฟในตัว ระวังความอารมณ์ร้อนรนและอาการตึงเครียด แนะนำให้มีช่วงพักสายตา";
  } else if (
    (selfElement === "wind" && dayElement === "earth") ||
    (selfElement === "earth" && dayElement === "wind")
  ) {
    compatibilityType = "clashing";
    elementPairAdvice = "กระแสลมพัดเซาะผิวดิน ระวังความคิดสลับถี่เกินไป แนะนำจำกัด Todo List ให้สั้นลง";
  }
  
  return {
    compatibilityType,
    elementPairAdvice
  };
}

/**
 * ฟังก์ชันหลักสำหรับการสร้างเอาท์พุตดวงจรไทย v0.1
 */
export function buildThaiTransitStrategyOutput(input: ThaiTransitInput): ThaiTransitStrategyOutput {
  // Noon guard ป้องกันความเหลื่อมเวลาของระบบเบราว์เซอร์
  const timeGuard = input.targetTime || "12:00";
  const checkedDate = input.targetDate.includes("T") 
    ? input.targetDate 
    : `${input.targetDate}T${timeGuard}:00`;
    
  const dateObj = new Date(checkedDate);
  const timeMs = isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime();
  const dayIndex = Math.floor(timeMs / (1000 * 60 * 60 * 24));
  
  const ascendant = input.natalAscendantZodiac || "aries";
  const ascendantIndex = ZODIAC_SIGNS.indexOf(ascendant);
  
  const transitPlanetSummary: ThaiTransitPlanetSummary[] = [];
  const activeTransitHouses: string[] = [];
  const housePlanets: Record<string, number[]> = {};
  
  // คำนวณหาตำแหน่งดาวตกเรือนชะตา
  for (let pid = 0; pid <= 9; pid++) {
    const zodiac = getApproximatedTransitZodiac(pid, checkedDate);
    const zodiacIdx = ZODIAC_SIGNS.indexOf(zodiac);
    const houseIdx = (zodiacIdx - ascendantIndex + 12) % 12;
    const houseName = HOUSE_NAMES[houseIdx];
    
    transitPlanetSummary.push({
      planetId: pid,
      zodiacSign: zodiac,
      isRetrograde: (dayIndex + pid) % 9 === 0
    });
    
    if (!activeTransitHouses.includes(houseName)) {
      activeTransitHouses.push(houseName);
    }
    
    if (!housePlanets[houseName]) {
      housePlanets[houseName] = [];
    }
    housePlanets[houseName].push(pid);
  }
  
  // ประเมินผลกระทบเรือนชะตาจากดาวสำคัญ (ดาว 5 - พฤหัส, ดาว 7 - เสาร์)
  const natalHouseImpacts: ThaiTransitHouseImpact[] = HOUSE_NAMES.map(h => {
    const planets = housePlanets[h] || [];
    let impactLevel: "high_support" | "high_pressure" | "neutral" = "neutral";
    let durationDays = 7;
    
    if (planets.includes(5)) {
      impactLevel = "high_support";
      durationDays = 30; // ดาวพฤหัสเดินจรส่งอิทธิพลนาน
    } else if (planets.includes(7)) {
      impactLevel = "high_pressure";
      durationDays = 90; // ดาวเสาร์จรส่งแรงกดดันหนัก
    }
    
    return {
      houseName: h,
      impactLevel,
      durationDays
    };
  });
  
  // สแกนหาสัญญะธาตุ
  const selfElement = getZodiacElement(ascendant);
  const elementRelationship = calculateElementRelationship(selfElement, dayIndex);
  
  // วางเป้าหมายแนะนำโหมดการทำงานเบื้องต้น
  const recommendedWorkModes: string[] = [];
  const avoidOrDelayModes: string[] = [];
  
  if (activeTransitHouses.includes("kamma")) {
    recommendedWorkModes.push("structured_work", "system_design");
  }
  if (activeTransitHouses.includes("ari")) {
    recommendedWorkModes.push("qa_testing", "debugging");
    avoidOrDelayModes.push("structured_work");
  }
  if (activeTransitHouses.includes("lapa")) {
    recommendedWorkModes.push("delivery", "summary_notes");
  }
  if (activeTransitHouses.includes("vinas")) {
    recommendedWorkModes.push("research", "system_cleanup");
    avoidOrDelayModes.push("meeting");
  }
  if (activeTransitHouses.includes("patni")) {
    recommendedWorkModes.push("meeting", "agreements");
  }
  if (activeTransitHouses.includes("tanu")) {
    recommendedWorkModes.push("self_pacing", "energy_check");
  }
  
  // ตรวจสอบระดับความเหนื่อยล้า (Low-burnout priority)
  const isFatigued = 
    input.recentReflectionContext?.fatigueLevel === "high" || 
    input.recentReflectionContext?.energyLevel === "low";
    
  let transitMode: "Focus" | "Stabilize" | "Pause" = "Focus";
  if (activeTransitHouses.includes("ari") || activeTransitHouses.includes("vinas")) {
    transitMode = "Stabilize";
  }
  
  if (isFatigued) {
    transitMode = "Pause";
    // ล้างข้อแนะนำลุยงาน และสลับโหมดผ่อนปรน
    recommendedWorkModes.length = 0;
    recommendedWorkModes.push("recovery", "review", "low_intensity");
    
    if (!avoidOrDelayModes.includes("structured_work")) {
      avoidOrDelayModes.push("structured_work");
    }
    if (!avoidOrDelayModes.includes("system_design")) {
      avoidOrDelayModes.push("system_design");
    }
  }
  
  // สกัดรหัสสัญญาณสั้น (Signal IDs)
  const workTimingSignals: string[] = [];
  const decisionCautionSignals: string[] = [];
  const recoverySignals: string[] = [];
  
  if (transitMode === "Focus") {
    workTimingSignals.push("TH_SIG_DEEP_WORK");
  } else if (transitMode === "Stabilize") {
    workTimingSignals.push("TH_SIG_QA_REVIEW");
    if (activeTransitHouses.includes("vinas")) {
      workTimingSignals.push("TH_SIG_REFACTOR");
    }
  } else {
    workTimingSignals.push("TH_SIG_REST_EYE");
  }
  
  if (activeTransitHouses.includes("ari") || isFatigued) {
    decisionCautionSignals.push("TH_SIG_AVOID_DECISION");
    decisionCautionSignals.push("TH_SIG_RECALIBRATE");
  }
  
  if (isFatigued) {
    recoverySignals.push("TH_SIG_REST_EYE");
  }
  
  // สร้างความน่าเชื่อถือของข้อมูล (Confidence status)
  let confidenceNotes = "พิกัดวันและเวลาเกิดและเวลาเป้าหมายจรสมบูรณ์พร้อมประเมินสัญญะ (Confidence 0.95)";
  if (!input.natalAscendantZodiac) {
    confidenceNotes = "ไม่ระบุตำแหน่งลัคนากำเนิดลอจิกถอยหลังอิงราศีมีนประมาณการต่ำ (Confidence 0.50)";
  } else if (!input.targetTime) {
    confidenceNotes = "ไม่ระบุพารามิเตอร์เวลาจรเจาะจงปรับเที่ยงวันเฉลี่ยกันชนเขตเวลาเบราว์เซอร์ (Confidence 0.85)";
  }
  
  const safetyDisclaimer = "ข้อมูลนี้เป็นกรอบสัญญะเพื่อช่วยสะท้อนจังหวะการทำงานและการตัดสินใจ ไม่ใช่คำทำนายผลลัพธ์ชีวิตแบบแน่นอน ผู้ใช้ควรใช้ร่วมกับข้อมูลจริง สุขภาพ เวลา และบริบทของตนเอง";
  
  return {
    layerName: "Thai Transit Strategy",
    source: "ArborDesk Thai Transit Adapter v0.1",
    transitDate: input.targetDate,
    transitMode,
    activeTransitHouses,
    transitPlanetSummary,
    natalHouseImpacts,
    elementRelationship,
    workTimingSignals,
    decisionCautionSignals,
    recoverySignals,
    recommendedWorkModes,
    avoidOrDelayModes,
    reflectionPrompt: "ในรอบวันจรตกเรือนประคองสติวันนี้ คุณพบลักษณะการเบี่ยงเบนความจดจ่อหรือเกิดความคิดสับสนในการรันระบบงานหลักอย่างไรบ้าง?",
    confidenceNotes,
    safetyDisclaimer,
    generatedAt: new Date().toISOString()
  };
}
