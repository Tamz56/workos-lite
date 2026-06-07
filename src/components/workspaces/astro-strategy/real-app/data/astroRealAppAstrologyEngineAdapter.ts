import {
  AstroBirthProfile,
  AstroTimingInput,
  AstroTimingBrief,
  AstroStrategyRecommendation,
  AstroRiskFlag,
  AstroRecoveryAnchor,
  AstroEngineOutput,
  AstroTimingMode
} from "./astroRealAppTypes";

export function buildAstroBirthProfile(
  birthDate: string,
  birthTime: string,
  birthPlace: string,
  timezone = "Asia/Bangkok",
  birthWeekday = "Thursday"
): AstroBirthProfile {
  return {
    birthDate,
    birthTime,
    birthPlace,
    timezone,
    birthWeekday
  };
}

export function buildAstroTimingInput(
  birthProfile: AstroBirthProfile,
  targetDate?: string
): AstroTimingInput {
  const dateStr = targetDate || new Date().toISOString().split("T")[0];
  return {
    birthProfile,
    targetDate: dateStr
  };
}

export function calculateAstroTimingBrief(input: AstroTimingInput): AstroTimingBrief {
  const weekday = input.birthProfile.birthWeekday || "Thursday";
  const targetDateStr = input.targetDate || new Date().toISOString().split("T")[0];
  const targetDate = new Date(targetDateStr);
  
  const dayOfWeek = isNaN(targetDate.getTime()) ? 4 : targetDate.getDay();

  let mode: AstroTimingMode = "Focus & Deliver";
  let triggerSignal = "กระแสพลังงานเคลื่อนตัวสู่โหมดลงมือทำ (Focus & Deliver)";
  let reason = "เหมาะกับการใช้กำลังสมาธิเชิงลึกในการปิดงานและสร้างผลลัพธ์ที่เป็นชิ้นอันชัดเจน";
  let recommendedMove = "เลือกงานสำคัญที่สุดเพียง 1 เรื่องในวันนี้ แล้วลงมือทำแบบ Deep Work จนส่งมอบได้";
  let recoverySupport = "หยุดพักหายใจช้า ๆ 5 นาทีเพื่อรักษาโฟกัส";

  const weekdayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
  };

  const birthWeekdayIndex = weekdayMap[weekday] !== undefined ? weekdayMap[weekday] : 4;

  if (dayOfWeek === birthWeekdayIndex) {
    mode = "Pause & Calibrate";
    triggerSignal = `ตรงกับวันเกิดทางดาราศาสตร์ประจำสัปดาห์ (${weekday}) เป็นช่วงจัดจังหวะรอบความเงียบ`;
    reason = "จังหวะเวลาโคจรครบรอบสัปดาห์ของดาวเกิด เหมาะสำหรับหยุดประเมินภาระงานและพักผ่อนฟื้นฟูกำลังทางกาย";
    recommendedMove = "จำกัดการเปิดประเด็นงานพัฒนาใหม่ ตรวจสอบและปิด checkpoint เก่าให้สมบูรณ์";
    recoverySupport = "พักสายตา 3 นาทีเป็นระยะ ท่องธรรมชาติใกล้ต้นไม้";
  } else if ([3, 5, 0].includes(dayOfWeek)) {
    mode = "Stabilize & Structure";
    triggerSignal = "จังหวะเวลาแห่งการสะสางและจัดระบบ (Stabilize & Structure)";
    reason = "เมื่อภาระสะสมเริ่มตึงตัว การจัดวางแผนและเอกสารช่วยให้ขอบเขตสมาธิไม่กระจายตัว";
    recommendedMove = "จัดหมวดหมู่งานค้าง แบ่งงานเป็นสัปดาห์ย่อย ๆ และจัดระเบียบสภาพแวดล้อม";
    recoverySupport = "ปิดงานเก่าหนึ่งเรื่องก่อนเปิดงานใหม่ในทุกกรณี";
  }

  const disclaimer = "For personal reflection and planning only. Not medical advice, diagnosis, or treatment.";

  return {
    strategyMode: mode,
    triggerSignal,
    reason,
    recommendedMove,
    recoverySupport,
    guardrail: disclaimer
  };
}

export function buildAstroStrategyRecommendations(input: AstroTimingInput): AstroStrategyRecommendation[] {
  const brief = calculateAstroTimingBrief(input);
  if (brief.strategyMode === "Pause & Calibrate") {
    return [
      { text: "จำกัดการเปิดไฟล์หรือแท็บโค้ดใหม่เกิน 3 เรื่องพร้อมกัน", category: "work" },
      { text: "ทบทวนประวัติสะท้อนคิดรอบสัปดาห์เพื่อวิเคราะห์อาการล้าสะสม", category: "planning" },
      { text: "กำหนดเวลาพักหน้าจอทุกๆ 45 นาทีอย่างเคร่งครัด", category: "action" }
    ];
  } else if (brief.strategyMode === "Stabilize & Structure") {
    return [
      { text: "จัดหมวดหมู่ Todo List ให้สอดคล้องกับ Sprint ปัจจุบัน", category: "work" },
      { text: "เคลียร์ไฟล์ดาวน์โหลดที่ไม่ได้ใช้งานและอัปเดตไฟล์จดบันทึกแผนงาน", category: "planning" },
      { text: "ปิด Checkpoint ที่สำคัญที่สุด 1 รายการก่อนสลับไปเปิดงานอื่น", category: "action" }
    ];
  } else {
    return [
      { text: "มุ่งเน้นการแก้บั๊กหรือพัฒนาฟีเจอร์เชิงลึกที่มีเงื่อนไขชัดเจน", category: "work" },
      { text: "แบ่งเป้าหมายประจำวันเป็นรอบ Sprint สั้น 25 นาที (Pomodoro)", category: "planning" },
      { text: "จัดสภาพแวดล้อมหน้าโต๊ะทำงานให้มีสิ่งรบกวนสมาธิน้อยที่สุด", category: "action" }
    ];
  }
}

export function buildAstroRiskFlags(input: AstroTimingInput): AstroRiskFlag[] {
  const brief = calculateAstroTimingBrief(input);
  if (brief.strategyMode === "Pause & Calibrate") {
    return [
      { text: "มีโอกาสเผชิญความล้าของดวงตาสะสม (Eye Strain Risk)", severity: "high" },
      { text: "ความคิดวนเวียนและการตัดสินใจที่ไม่เด็ดขาด (Looping Thoughts)", severity: "medium" }
    ];
  } else if (brief.strategyMode === "Stabilize & Structure") {
    return [
      { text: "ความเสี่ยงจากการสลับบริบทงานบ่อยเกินไป (Context Switching Load)", severity: "medium" },
      { text: "การเปิดงานพัฒนาหลายชิ้นคาไว้โดยไม่มีเป้าหมายการปิด (Task Accumulation)", severity: "medium" }
    ];
  } else {
    return [
      { text: "อาจละเลยการพักสมาธิระหว่างคาบการทำงานต่อเนื่อง", severity: "low" }
    ];
  }
}

export function buildAstroRecoveryAnchors(input: AstroTimingInput): AstroRecoveryAnchor[] {
  const brief = calculateAstroTimingBrief(input);
  if (brief.strategyMode === "Pause & Calibrate") {
    return [
      { text: "พักสายตาและมองระยะไกล 3 นาที", type: "short" },
      { text: "หลีกเลี่ยงการเปิดจอมือถือหลังเวลา 22:30 น.", type: "evening" }
    ];
  } else if (brief.strategyMode === "Stabilize & Structure") {
    return [
      { text: "สูดลมหายใจเข้าลึกๆ ช้าๆ 5 รอบลมหายใจ", type: "short" },
      { text: "จดสรุปความคืบหน้าสั้นๆ ลงในโน้ตก่อนปิดเครื่อง", type: "evening" }
    ];
  } else {
    return [
      { text: "ดื่มน้ำ 1 แก้วทุกคาบเวลางานย่อย", type: "short" },
      { text: "ยืดเส้นยืดสายบริเวณบ่าและลำคอ", type: "short" }
    ];
  }
}

export function buildAstroEngineOutput(input: AstroTimingInput): AstroEngineOutput {
  const brief = calculateAstroTimingBrief(input);
  const recommendations = buildAstroStrategyRecommendations(input);
  const riskFlags = buildAstroRiskFlags(input);
  const recoveryAnchors = buildAstroRecoveryAnchors(input);
  const disclaimer = "For personal reflection and planning only. Not medical advice, diagnosis, or treatment.";

  return {
    timestamp: new Date().toISOString(),
    timingInput: input,
    brief,
    recommendations,
    riskFlags,
    recoveryAnchors,
    disclaimer
  };
}

export const SAMPLE_ASTRO_ENGINE_OUTPUT: AstroEngineOutput = buildAstroEngineOutput({
  birthProfile: {
    birthDate: "1980-06-05",
    birthTime: "06:45",
    birthPlace: "Siriraj Hospital, Bangkok, Thailand",
    timezone: "Asia/Bangkok",
    birthWeekday: "Thursday"
  },
  targetDate: "2026-06-07"
});
