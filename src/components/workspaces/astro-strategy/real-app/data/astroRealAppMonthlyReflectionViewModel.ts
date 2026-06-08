import {
  AstroBirthProfile,
  AstroMonthlyReflectionViewModel,
  AstroTimingMode,
  ReflectionHistoryItem
} from "./astroRealAppTypes";
import {
  buildAstroTimingInput,
  calculateAstroTimingBrief
} from "./astroRealAppAstrologyEngineAdapter";

const MONTHS_THAI_LONG = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

/**
 * Builds the monthly strategy and reflection overview by aggregating daily calculations
 * for the current calendar month and correlating them with existing reflection logs.
 */
export function buildMonthlyReflectionViewModel(
  birthProfile: AstroBirthProfile,
  historyLogs: ReflectionHistoryItem[],
  isFallback = false
): AstroMonthlyReflectionViewModel {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const monthLabel = `${MONTHS_THAI_LONG[month]} ${year + 543}`;
  
  const disclaimer = "สำหรับใช้วางแผนส่วนบุคคลและสะท้อนจังหวะชีวิตเท่านั้น ไม่ใช่คำทำนายตายตัวหรือคำแนะนำทางการแพทย์";
  const source = isFallback ? "fallback" : "engine";

  try {
    // 1. Calculate the days of the current month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // 2. Count dominant modes for the current calendar month
    const modeCounts: Record<string, number> = {};
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = dateObj.toISOString().split("T")[0];
      const input = buildAstroTimingInput(birthProfile, dateStr);
      const brief = calculateAstroTimingBrief(input);
      modeCounts[brief.strategyMode] = (modeCounts[brief.strategyMode] || 0) + 1;
    }

    const sortedModes = Object.entries(modeCounts).sort((a, b) => b[1] - a[1]);
    const primaryMode = (sortedModes[0] ? sortedModes[0][0] : "Focus & Deliver") as AstroTimingMode;
    const secondaryMode = (sortedModes[1] ? sortedModes[1][0] : "Stabilize & Structure") as AstroTimingMode;

    // 3. Define strategic text based on the primary mode
    let monthlyTheme = "";
    let strategicFocus = "";
    let recommendedFocusAreas: string[] = [];
    let riskWatch: string[] = [];
    let recoveryAnchors: string[] = [];

    if (primaryMode === "Pause & Calibrate") {
      monthlyTheme = "เดือนแห่งการทบทวนภาพรวมและฟื้นฟูสภาพแวดล้อมสมาธิ (Pause & Calibrate Month)";
      strategicFocus = "มุ่งเน้นการประเมินประสิทธิภาพการทำงาน ตรวจจับระดับความเครียด และการเคลียร์ checkpoint ค้างเพื่อจัดสมดุลชีวิต";
      recommendedFocusAreas = [
        "ทบทวนความคืบหน้าของเป้าหมายใหญ่และปรับเปลี่ยนตารางงานให้สอดรับสภาพร่างกายมากขึ้น",
        "เน้นประคองงานเดิมที่ค้างอยู่ หลีกเลี่ยงการเปิดโครงการพัฒนาใหม่หลายเรื่องพร้อมกัน",
        "จัดสรรจังหวะเวลาพักหน้าจอ (Screen Rest) ระหว่างวันทำงานยาวนานอย่างเคร่งครัด"
      ];
      riskWatch = [
        "แนวโน้มการสะสมความเหนื่อยล้าของสายตาและกล้ามเนื้อบ่าไหล่ (Physical Fatigue)",
        "ข้อสังเกตเรื่องการตกหล่มคิดกังวล วนเวียน และลังเลในหัวข้อเดิม"
      ];
      recoveryAnchors = [
        "กำหนดขอบเขตหยุดใช้อุปกรณ์อิเล็กทรอนิกส์หลัง 22:30 น. อย่างน้อย 3 วันต่อสัปดาห์",
        "จดบันทึกสะท้อนคิดส่วนตัวสั้น ๆ เพื่อสลัดสิ่งที่กังวลออกก่อนปิดคอมพิวเตอร์"
      ];
    } else if (primaryMode === "Stabilize & Structure") {
      monthlyTheme = "เดือนแห่งการสะสางระบบงาน จัดระเบียบกระบวนการ และจัดกลุ่มข้อมูล (Stabilize & Structure Month)";
      strategicFocus = "มุ่งเน้นการจัด Todo List, เคลียร์ไฟล์ชำรุดในระบบ, ปรับปรุงระบบฐานข้อมูล, และทบทวน workflow ในรอบสัปดาห์";
      recommendedFocusAreas = [
        "จัดกลุ่มและเคลียร์ไฟล์ดาวน์โหลดหรือเอกสารโครงการเก่าที่สะสมรกรุงรัง",
        "ทบทวนประวัติการบันทึกงานค้างเพื่อแบ่งชิ้นงานเป็นรอบระยะสั้น (Sprints) เล็ก ๆ",
        "ปิด checkpoint ที่มีความสำคัญที่สุด 1 รายการก่อนสลับไปเปิดหน้าต่างงานใหม่เสมอ"
      ];
      riskWatch = [
        "อาการสมาธิกระจายตัวและเสียระดับการจดจ่อจากการสลับงานบ่อยครั้ง (Context Switching)",
        "ความเฉื่อยชาในการจัดการเนื่องจากปริมาณชิ้นงานค้างคั่งสะสมมากเกินไป"
      ];
      recoveryAnchors = [
        "สูดลมหายใจลึกช้า ๆ 5 ครั้งเมื่อรู้สึกเริ่มสลับจดจ่อไม่ได้",
        "จัดสรรเวลา 5 นาทีก่อนเลิกงานในการจดบันทึกงานที่จะสางต่อในเช้าวันถัดไป"
      ];
    } else {
      monthlyTheme = "เดือนแห่งการลงมือทำเชิงลึกและส่งมอบเป้าหมายสำคัญ (Focus & Deliver Month)";
      strategicFocus = "มุ่งเน้นการใช้สมาธิระดับสูง (Deep Work) พัฒนาผลิตภัณฑ์หรือฟีเจอร์แกนหลัก และสะสางงานพัฒนาชิ้นใหญ่";
      recommendedFocusAreas = [
        "มุ่งเน้นการแก้บั๊กหรือเขียนโค้ดที่ต้องการความจดจ่อสูงในช่วงเวลาที่คุณสมองแล่นที่สุด",
        "เปิดเครื่องมือจำกัดสิ่งรบกวนสมาธิ (เช่น Focus Mode) ในระหว่างช่วงลงมือทำงานสำคัญ",
        "จัดหมวดหมู่ Todo ประจำวันให้เรียบร้อยเพื่อการทำงานที่กระชับและรวดเร็ว"
      ];
      riskWatch = [
        "การเหนื่อยล้าสะสมจากการฝืนนั่งเขียนโค้ดและจ้องหน้าจอเป็นเวลานานเกินขอบเขต",
        "การละเลยการยืดเหยียดร่างกายและความตึงเครียดของกล้ามเนื้อส่วนบ่าลำคอ"
      ];
      recoveryAnchors = [
        "ดื่มน้ำสะอาดหนึ่งแก้วในทุกรอบคาบสปิรินต์งานย่อยยักษ์",
        "ขยับตัวลุกขึ้นยืนบิดตัวหรือมองไกลออกไปนอกหน้าต่างทุก 45 นาที"
      ];
    }

    // 4. Correlate with Reflection History (Optional context)
    const monthLogs = historyLogs.filter(log => {
      try {
        const d = new Date(log.reflectionDate || log.createdAt);
        return d.getFullYear() === year && d.getMonth() === month;
      } catch {
        return false;
      }
    });

    const totalLogsThisMonth = monthLogs.length;
    let topLoggedMode = "—";
    let topLoggedEnergy = "—";
    let reflectionPatternSummary = "";

    if (totalLogsThisMonth > 0) {
      // Find top logged mode
      const loggedModeCounts: Record<string, number> = {};
      monthLogs.forEach(log => {
        const m = log.reflectionMode || "ไม่ระบุ";
        loggedModeCounts[m] = (loggedModeCounts[m] || 0) + 1;
      });
      const sortedLoggedModes = Object.entries(loggedModeCounts).sort((a, b) => b[1] - a[1]);
      topLoggedMode = sortedLoggedModes[0] ? sortedLoggedModes[0][0] : "—";

      // Find top logged energy
      const loggedEnergyCounts: Record<string, number> = {};
      monthLogs.forEach(log => {
        const e = log.dailyCheckinSnapshot?.energyLevel || "ไม่ระบุ";
        loggedEnergyCounts[e] = (loggedEnergyCounts[e] || 0) + 1;
      });
      const sortedLoggedEnergies = Object.entries(loggedEnergyCounts).sort((a, b) => b[1] - a[1]);
      const rawEnergy = sortedLoggedEnergies[0] ? sortedLoggedEnergies[0][0] : "—";

      const energyLabelMap: Record<string, string> = {
        steady: "คงที่ (Steady)",
        high: "สูง (High)",
        low: "ต่ำ (Low)",
        scattered: "กระจัดกระจาย (Scattered)"
      };
      topLoggedEnergy = energyLabelMap[rawEnergy] || rawEnergy;

      reflectionPatternSummary = `ในรอบเดือนนี้คุณบันทึกสะท้อนคิดแล้วทั้งหมด ${totalLogsThisMonth} ครั้ง โดยโหมดประเมินที่คุณเลือกบันทึกบ่อยที่สุดคือ "${topLoggedMode}" และแนวโน้มสภาพการทำงานหลักคือ "${topLoggedEnergy}" สามารถนำแนวโน้มนี้ไปประกอบการปรับทิศทางจัดตารางชีวิตงานได้`;
    } else {
      reflectionPatternSummary = `ยังไม่มีประวัติการบันทึกสะท้อนคิดในรอบเดือนปัจจุบัน (แนะนำให้จดบันทึกสะท้อนคิดในวันทำงานเป็นประจำ เพื่อที่ระบบจะคอยจับแนวโน้มโหมดสะสมและแนวโน้มสภาพการทำงานมาประมวลวิเคราะห์ให้ในหัวข้อนี้)`;
    }

    return {
      monthLabel,
      primaryMode,
      secondaryMode,
      monthlyTheme,
      strategicFocus,
      recommendedFocusAreas,
      riskWatch,
      recoveryAnchors,
      reflectionPatternSummary,
      totalLogsThisMonth,
      topLoggedMode,
      topLoggedEnergy,
      source,
      confidence: 1.0,
      generatedAt: new Date().toISOString(),
      disclaimer,
      metadata: {
        calculationMode: "rule-based",
        confidenceScore: 1.0,
        sourceEngine: "ArborDesk Monthly Strategy Engine v0.1",
        disclaimer
      }
    };
  } catch (error) {
    console.error("MonthlyReflectionViewModel: Failed to compile monthly data, fallback activated.", error);
    return buildMonthlyFallbackModel(monthLabel, disclaimer);
  }
}

/**
 * Fallback generator in case of unexpected errors.
 */
function buildMonthlyFallbackModel(monthLabel: string, disclaimer: string): AstroMonthlyReflectionViewModel {
  return {
    monthLabel,
    primaryMode: "Focus & Deliver",
    secondaryMode: "Stabilize & Structure",
    monthlyTheme: "ธีมประมาณการทั่วไป: มุ่งเน้นการจัดสรรสมาธิเชิงระบบ (Focus & Deliver Month)",
    strategicFocus: "ประคองการจัดลำดับงานสำคัญประจำสัปดาห์ สะสางข้อมูลที่คั่งค้าง และปิดจุด checkpoint ในเวลาที่เหมาะสม",
    recommendedFocusAreas: [
      "ทบทวนเป้าหมายยุทธศาสตร์รายสัปดาห์ในวันทำงานช่วงเช้า",
      "แบ่งย่อยงานพัฒนาใหญ่ให้กลายเป็นเป้าหมายเล็ก ๆ ที่จบได้ในเครื่อง",
      "จำกัดงานประชุมที่ไม่ด่วนเพื่อรักษาเวลาและคงความสม่ำเสมอของสมาธิ"
    ],
    riskWatch: [
      "ความล้าสะสมจากการใช้งานสายตาและระบบคิดต่อเนื่องยาวนาน",
      "การเปิดประเด็นงานซ้อนทับกันหลายชิ้นโดยไม่กดจบ checkpoint"
    ],
    recoveryAnchors: [
      "ฝึกการหยุดพักจดจ่อระยะสั้น 3 นาทีด้วยวิธีการสูดหายใจลึกช้า ๆ",
      "หลีกเลี่ยงการหยิบจับงานหลังเวลาผ่อนคลายช่วงค่ำอย่างสมเหตุสมผล"
    ],
    reflectionPatternSummary: "ระบบขัดข้องในการตรวจประวัติ แต่ได้เตรียมชุดแผนกลยุทธ์จำลองไว้เพื่อการสะท้อนแนวทางการทำงานทั่วไปอย่างปลอดภัย",
    totalLogsThisMonth: 0,
    topLoggedMode: "—",
    topLoggedEnergy: "—",
    source: "fallback",
    confidence: 0.8,
    generatedAt: new Date().toISOString(),
    disclaimer,
    metadata: {
      calculationMode: "rule-based",
      confidenceScore: 0.8,
      sourceEngine: "ArborDesk Monthly Strategy Fallback v0.1",
      disclaimer
    }
  };
}
