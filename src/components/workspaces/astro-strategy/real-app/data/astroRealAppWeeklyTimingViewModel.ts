import {
  AstroBirthProfile,
  AstroWeeklyTimingDay,
  AstroWeeklyTimingViewModel,
  AstroTimingMode
} from "./astroRealAppTypes";
import {
  buildAstroTimingInput,
  calculateAstroTimingBrief,
  buildAstroStrategyRecommendations,
  buildAstroRiskFlags,
  buildAstroRecoveryAnchors
} from "./astroRealAppAstrologyEngineAdapter";

const DAYS_OF_WEEK_THAI = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const MONTHS_THAI = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const WEEKDAY_INDEX_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
};

/**
 * Calculates a single day's timing metadata and strategic suggestions.
 */
export function calculateWeeklyDay(
  birthProfile: AstroBirthProfile,
  targetDateStr: string,
  source: "engine" | "fallback"
): AstroWeeklyTimingDay {
  const input = buildAstroTimingInput(birthProfile, targetDateStr);
  const brief = calculateAstroTimingBrief(input);
  const recs = buildAstroStrategyRecommendations(input);
  const risks = buildAstroRiskFlags(input);
  const anchors = buildAstroRecoveryAnchors(input);

  const dateObj = new Date(targetDateStr);
  const dayIndex = isNaN(dateObj.getTime()) ? 4 : dateObj.getDay();
  const thaiWeekday = DAYS_OF_WEEK_THAI[dayIndex] || "";

  let label = "Focus";
  if (brief.strategyMode === "Pause & Calibrate") {
    label = "Pause";
  } else if (brief.strategyMode === "Stabilize & Structure") {
    label = "Stabilize";
  }

  // Determine if it is the birth weekday cycle (e.g. คุณตั้ม's weekday is Thursday)
  const birthWeekdayString = birthProfile.birthWeekday || "Thursday";
  const birthWeekdayNormalized = birthWeekdayString.charAt(0).toUpperCase() + birthWeekdayString.slice(1).toLowerCase();
  const birthWeekdayIndex = WEEKDAY_INDEX_MAP[birthWeekdayNormalized] !== undefined ? WEEKDAY_INDEX_MAP[birthWeekdayNormalized] : 4;
  const isBirthWeekdayCycle = dayIndex === birthWeekdayIndex;

  return {
    date: targetDateStr,
    weekday: thaiWeekday,
    mode: brief.strategyMode,
    label,
    strategicFocus: brief.reason,
    recommendedAction: recs[0]?.text || "จัดระบบประคองรอบสัปดาห์",
    riskNote: risks[0]?.text || "ไม่มีข้อควรระวังพิเศษในวันนี้",
    recoveryAnchor: anchors[0]?.text || "พักสายตาสั้นๆ 3 นาที",
    source,
    confidence: 1.0,
    isBirthWeekdayCycle
  };
}

/**
 * Builds the 7-day weekly strategy timing view model from the saved or default birth profile.
 */
export function buildWeeklyTimingViewModel(
  birthProfile: AstroBirthProfile,
  targetDateStr?: string,
  isFallback = false
): AstroWeeklyTimingViewModel {
  const startDateStr = targetDateStr || new Date().toISOString().split("T")[0];
  const days: AstroWeeklyTimingDay[] = [];
  const source = isFallback ? "fallback" : "engine";
  const disclaimer = "สำหรับใช้วางแผนส่วนบุคคลและสะท้อนจังหวะชีวิตเท่านั้น ไม่ใช่คำทำนายตายตัวหรือคำแนะนำทางการแพทย์";

  try {
    const baseDate = new Date(startDateStr);
    for (let i = 0; i < 7; i++) {
      const current = new Date(baseDate);
      current.setDate(baseDate.getDate() + i);
      const dateYMD = current.toISOString().split("T")[0];
      days.push(calculateWeeklyDay(birthProfile, dateYMD, source));
    }

    // Determine weekly theme by counting modes
    const modeCounts: Record<string, number> = {};
    days.forEach(d => {
      modeCounts[d.mode] = (modeCounts[d.mode] || 0) + 1;
    });

    let dominantMode: AstroTimingMode = "Focus & Deliver";
    let maxCount = 0;
    for (const mode in modeCounts) {
      if (modeCounts[mode] > maxCount) {
        maxCount = modeCounts[mode];
        dominantMode = mode as AstroTimingMode;
      }
    }

    let weeklyTheme = "เน้นการลงมือทำงานสำคัญอย่างมีสมาธิเชิงลึก (Focus & Deliver)";
    if (dominantMode === "Pause & Calibrate") {
      weeklyTheme = "เน้นการพักฟื้น ปรับปรุงประสิทธิภาพ และการสะท้อนคิด (Pause & Calibrate)";
    } else if (dominantMode === "Stabilize & Structure") {
      weeklyTheme = "เน้นการจัดระบบงาน สะสางเอกสาร และปิด Checkpoint (Stabilize & Structure)";
    }

    return {
      days,
      weeklyTheme,
      metadata: {
        calculationMode: isFallback ? "rule-based" : "hybrid",
        confidenceScore: 1.0,
        sourceEngine: "ArborDesk Astrology Logic v0.1",
        disclaimer
      },
      disclaimer
    };
  } catch (err) {
    console.error("Failed to build weekly timing view model:", err);
    // Return a safe fallback model
    return buildWeeklyFallbackModel(startDateStr, disclaimer);
  }
}

/**
 * Safe fallback builder in case Date manipulations or adapter processes raise exceptions.
 */
function buildWeeklyFallbackModel(startDateStr: string, disclaimer: string): AstroWeeklyTimingViewModel {
  const days: AstroWeeklyTimingDay[] = [];
  const baseDate = new Date(startDateStr);

  for (let i = 0; i < 7; i++) {
    const current = new Date(baseDate);
    current.setDate(baseDate.getDate() + i);
    const dateYMD = current.toISOString().split("T")[0];
    const dayOfWeek = current.getDay();

    let mode: AstroTimingMode = "Focus & Deliver";
    let label = "Focus";
    let focus = "มุ่งเน้นการสะสางงานพัฒนาและปิด checkpoint งานสำคัญ";
    let rec = "เลือกงานชิ้นแรกสุดของวันมาปิดสะสางโดยไม่สลับหน้าจอ";
    let risk = "การล้าของดวงตาสะสมและนิสัยเปิดขอบงานหลายหน้า";
    let anchor = "พักดื่มน้ำหนึ่งแก้วในทุกๆ สปิรินต์ย่อย";

    if ([3, 5, 0].includes(dayOfWeek)) {
      mode = "Stabilize & Structure";
      label = "Stabilize";
      focus = "จัดระเบียบสภาพแวดล้อม งานค้าง และล้างระบบเอกสาร";
      rec = "จัด Todo List ตามลำดับสำคัญและจัดไฟล์ดาวน์โหลด";
      risk = "การเสียสมาธิกับงานจรนอกแผนและภาระงานค้างสะสม";
      anchor = "สูดลมหายใจเข้าลึกช้าๆ 5 ครั้งเพื่อเรียกสติ";
    }

    days.push({
      date: dateYMD,
      weekday: DAYS_OF_WEEK_THAI[dayOfWeek] || "",
      mode,
      label,
      strategicFocus: focus,
      recommendedAction: rec,
      riskNote: risk,
      recoveryAnchor: anchor,
      source: "fallback",
      confidence: 0.8,
      isBirthWeekdayCycle: false
    });
  }

  return {
    days,
    weeklyTheme: "เน้นการลงมือทำงานสำคัญอย่างมีสมาธิเชิงลึก (Focus & Deliver)",
    metadata: {
      calculationMode: "rule-based",
      confidenceScore: 0.8,
      sourceEngine: "ArborDesk Astrology Fallback v0.1",
      disclaimer
    },
    disclaimer
  };
}

/**
 * Returns a beautiful string representation for display in the Thai calendar ui.
 */
export function formatThaiDateLabel(dateYMD: string): string {
  try {
    const d = new Date(dateYMD);
    if (isNaN(d.getTime())) return dateYMD;
    const thaiDayName = DAYS_OF_WEEK_THAI[d.getDay()] || "";
    const thaiMonthName = MONTHS_THAI[d.getMonth()] || "";
    return `วัน${thaiDayName}ที่ ${d.getDate()} ${thaiMonthName}`;
  } catch {
    return dateYMD;
  }
}
