import {
  NatalTransitComposerInput,
  NatalTransitStrategyComposerOutput,
  NatalTransitSuppressedSignal,
  NatalTransitStrategyMode,
  NatalTransitCautionLevel
} from "./astroRealAppTypes";

/**
 * ฟังก์ชันประมวลผลดลประสานน้ำหนักดวงชะตากำเนิดและดวงจรไทย (Composer)
 * รวม Today Engine, Reflection History, และ Optional Layers ข้ามศาสตร์
 */
export function buildNatalTransitStrategyComposerOutput(
  input: NatalTransitComposerInput
): NatalTransitStrategyComposerOutput {
  const strategyDate = input.targetDate;
  const generatedAt = new Date().toISOString();
  
  // 1. ตรรกะระดับความมั่นใจ (Confidence Notes & Score)
  let confidenceScore = 0.95;
  const confidenceProblems: string[] = [];
  
  if (!input.natalStrategyProfile) {
    confidenceScore -= 0.35;
    confidenceProblems.push("ไม่พบข้อมูลโปรไฟล์ดวงเกิด");
  }
  if (!input.todayTimingData) {
    confidenceScore -= 0.15;
    confidenceProblems.push("ไม่พบข้อมูล Today Engine");
  }
  if (!input.thaiTransitContext) {
    confidenceScore -= 0.10;
    confidenceProblems.push("ไม่พบข้อมูลดวงจรไทย");
  }
  
  let confidenceNotes = "ข้อมูลการวิเคราะห์และประมาณค่าฤกษ์มีพิกัดเวลาและโปรไฟล์สมบูรณ์พร้อมประเมินสัญญะ";
  if (confidenceProblems.length > 0) {
    confidenceNotes = `ข้อมูลประกอบไม่สมบูรณ์ (${confidenceProblems.join(", ")}) ปรับประเมินระดับความมั่นใจลงเหลือ ${(confidenceScore * 100).toFixed(0)}% และใช้ค่าประมาณการจำลองทดแทน`;
  }

  // 2. ตรวจสอบความเหนื่อยล้าสะสม (User Safety & Fatigue - อันดับ 1)
  const userEnergy = input.userEnergyState;
  const historySummary = input.reflectionHistorySummary;
  
  const isExtremelyFatigued = 
    userEnergy?.bodySignal === "fatigued" || 
    historySummary?.fatigueLevel === "high";
    
  const isLowEnergy = 
    userEnergy?.energyLevel === "low" || 
    historySummary?.energyLevel === "low";
    
  const isHighFatigue = isExtremelyFatigued || isLowEnergy;
  
  // 3. กำหนดโหมดกลยุทธ์หลัก (Strategy Mode) โดยใช้ตรรกะลำดับความสำคัญ (Priority rules)
  let strategyMode: NatalTransitStrategyMode = "Focus";
  let conflictResolutionNotes = "สัญญาณข้อมูลทิศทางสอดคล้องกันดี ไม่มีข้อขัดแย้งหลัก";
  const suppressedSignals: NatalTransitSuppressedSignal[] = [];
  
  // ดึงโหมดจาก Today Engine
  const engineModeRaw = input.todayTimingData?.strategyMode || "Focus & Deliver";
  let engineMode: NatalTransitStrategyMode = "Focus";
  if (engineModeRaw === "Pause & Calibrate") {
    engineMode = "Pause";
  } else if (engineModeRaw === "Stabilize & Structure") {
    engineMode = "Stabilize";
  }
  
  // ดึงโหมดจาก Thai Transit
  const transitModeRaw = input.thaiTransitContext?.transitMode || "Focus";
  const transitMode: NatalTransitStrategyMode = transitModeRaw as NatalTransitStrategyMode;
  
  // ประเมินโหมดหลัก
  if (isExtremelyFatigued) {
    strategyMode = "Recover";
    conflictResolutionNotes = "ระบบสลับเข้าโหมดฟื้นฟู (Recover) อัตโนมัติ เนื่องจากระดับความล้าสะสมหรือดัชนีร่างกายอยู่ในเกณฑ์ตึงเครียดสูง โดยระงับสัญญาณดวงดาวเพื่อความปลอดภัย";
  } else if (isLowEnergy) {
    strategyMode = "Pause";
    conflictResolutionNotes = "ระบบจัดสรรเข้าโหมดผ่อนปรน (Pause) อัตโนมัติ เพื่อตั้งหลักป้องกันความล้า โดยระงับการทำงานหนักแม้ดวงจรจะสนับสนุน";
  } else {
    // ไม่มีดัชนีความเหนื่อยล้าสูง -> ประสานความขัดแย้งระหว่าง Today Engine กับ Transit
    if (engineMode === "Pause" && transitMode === "Focus") {
      strategyMode = "Stabilize";
      conflictResolutionNotes = "ระบบประนีประนอมเป็นโหมดประคองระบบ (Stabilize) เนื่องจาก Today Engine เตือนให้ชะลอแต่ดวงจรสนับสนุนให้จดจ่อ จึงเน้นงานตรวจสอบและดีบักทดแทนการเปิดงานใหม่";
    } else if (engineMode === "Focus" && transitMode === "Pause") {
      strategyMode = "Stabilize";
      conflictResolutionNotes = "ระบบปรับระดับเป็นโหมดประคองระบบ (Stabilize) เพื่อลดความเสี่ยงต่อความล้า เนื่องจากจังหวะเวลาดวงจรแนะนำให้ผ่อนกำลังชั่วคราว";
    } else {
      // โหมดสอดคล้องกัน
      strategyMode = engineMode;
    }
  }

  // 4. จัดการสัญญาณที่ถูกระงับ (Signal Suppression)
  const rawSupportingSignals: string[] = [];
  if (input.thaiTransitContext) {
    rawSupportingSignals.push(...input.thaiTransitContext.workTimingSignals);
    rawSupportingSignals.push(...input.thaiTransitContext.decisionCautionSignals);
    rawSupportingSignals.push(...input.thaiTransitContext.recoverySignals);
  }
  
  if (isHighFatigue) {
    // ปิดสัญญาณลุยงานหนักเนื่องจากร่างกายเหนื่อยล้า
    const deepWorkIdx = rawSupportingSignals.indexOf("TH_SIG_DEEP_WORK");
    if (deepWorkIdx !== -1) {
      suppressedSignals.push({
        signalId: "TH_SIG_DEEP_WORK",
        sourceLayer: "transit",
        suppressionReason: "ปิดสัญญาณลุยงานจดจ่อเนื่องจากระดับความเหนื่อยล้าของร่างกายผู้ใช้สูงกว่าเกณฑ์",
        suppressedBy: "user_fatigue",
        confidenceImpact: 0.05
      });
    }
    
    const refactorIdx = rawSupportingSignals.indexOf("TH_SIG_REFACTOR");
    if (refactorIdx !== -1) {
      suppressedSignals.push({
        signalId: "TH_SIG_REFACTOR",
        sourceLayer: "transit",
        suppressionReason: "ระงับสัญญาณการปรับปรุงโครงสร้างงานหนักเนื่องจากผู้ใช้มีดัชนีความล้าสูง",
        suppressedBy: "user_fatigue",
        confidenceImpact: 0.02
      });
    }
  }

  const supportingSignals = rawSupportingSignals.filter(s => 
    !suppressedSignals.some(sup => sup.signalId === s)
  );

  // 5. ร่างข้อเสนอแนะหลักและรอง (Primary & Secondary Recommendations)
  let primaryRecommendation = "วันนี้เหมาะกับการจัดลำดับงานที่ค้างให้ชัดเจนและประคองการรันระบบงานย่อย";
  const secondaryRecommendation: string[] = [];
  let cautionLevel: NatalTransitCautionLevel = "low";
  let decisionGuidance = "ใช้จังหวะเวลานี้เป็นข้อมูลประกอบ ไม่ใช่คำตัดสิน ผู้ใช้ควรตัดสินใจตามบริบทจริง";
  const workModePriority: string[] = [];
  const recoveryPriority: string[] = [];
  let reflectionPrompt = "วันนี้มีสภาวะความจดจ่อเป็นอย่างไร และรู้สึกตึงล้าในรอบสัปดาห์งานจุดไหนบ้าง?";

  // คัดกรองตามโหมด
  if (strategyMode === "Recover") {
    primaryRecommendation = "หากรู้สึกล้าสะสมหรือสมองหน่วง แนะนำให้จัดลำดับสลับพักและงดงานที่ต้องใช้แรงตัดสินใจสูง";
    secondaryRecommendation.push(
      "จัดเวลาพักสายตาระหว่างรอบการทำงานทุก 30 นาที",
      "ทบทวนความล้าประจำวันและงดหน้าจอคอมพิวเตอร์ก่อนนอน",
      "สลับฟังคลื่นเสียงฟื้นฟูสมาธิเบา ๆ เพื่อบำบัดคลื่นสมอง"
    );
    cautionLevel = "high";
    decisionGuidance = "ควรชะลอการลงนามข้อตกลงตึงเครียดหรือการประชุมเจรจาสำคัญเชิงอารมณ์ออกไปก่อน";
    workModePriority.push("recovery", "low_intensity");
    recoveryPriority.push("พักสายตา 3 นาที", "ดื่มน้ำสะอาด", "หลีกเลี่ยงแสงสีฟ้า");
    reflectionPrompt = "ในภาวะเหนื่อยล้าสะสมนี้ คุณสามารถเว้นพื้นที่สั้นๆ เพื่อดูแลร่างกายและพักผ่อนในวันนี้ได้อย่างไรบ้าง?";
  } else if (strategyMode === "Pause") {
    primaryRecommendation = "วันนี้เหมาะสำหรับการผ่อนความเร่งรีบ ทบทวนแผน Todo List และจำกัดงานใหม่ให้กระชับ";
    secondaryRecommendation.push(
      "เน้นงานจดบันทึกย่อยและการตรวจสอบระบบภายในเบาๆ",
      "หลีกเลี่ยงการสลับเปลี่ยนโปรเจกต์งานเร็วเกินไปในรอบวัน",
      "จัดสเปซสั้น ๆ เพื่อสะท้อนสติก่อนกดสลับไปทำหัวข้องานถัดไป"
    );
    cautionLevel = "medium";
    decisionGuidance = "ควรเลี่ยงหรือชะลอการตอบรับเงื่อนไขสำคัญที่ต้องผูกพันข้อตกลงระยะยาว";
    workModePriority.push("review", "summary_notes", "self_pacing");
    recoveryPriority.push("เดินชมธรรมชาติ", "เขียนสะท้อนความรู้สึกสั้น ๆ", "หยุดจังหวะหายใจลึก 5 ครั้ง");
    reflectionPrompt = "เมื่อต้องชะลอจังหวะงาน มีเรื่องใดในระบบที่คุณคิดว่าสมควรจัดสรรระเบียบก่อนเดินหน้าต่อ?";
  } else if (strategyMode === "Stabilize") {
    primaryRecommendation = "วันนี้เหมาะกับการตรวจทานระบบ ตรวจสอบความถูกต้อง (QA) ดีบักข้อผิดพลาด และเคลียร์งานค้างสะสม";
    secondaryRecommendation.push(
      "เน้นจัดหมวดหมู่เอกสารและล้างไฟล์ที่ไม่จำเป็นออกจากระบบงาน",
      "ดีบักและแก้ไขจุดบกพร่องย่อยในสเปกโปรเจกต์หลัก",
      "วิเคราะห์และทบทวนรูปแบบความสม่ำเสมอในการส่งมอบงานเบื้องหลัง"
    );
    cautionLevel = "medium";
    decisionGuidance = "เหมาะสำหรับการไตร่ตรองแก้ไขงานเดิม มากกว่าการลงมติเร่งเปิดตัวฟีเจอร์ใหม่";
    workModePriority.push("qa_testing", "debugging", "system_cleanup");
    recoveryPriority.push("พักสายตา 5 นาที", "ยืดเหยียดร่างกายสั้นๆ", "ดื่มน้ำอุ่นประคองพลัง");
    reflectionPrompt = "ในการสำรวจจุดเสถียรของงานวันนี้ มีบั๊กหรือจุดตกหล่นใดที่ควรสะสะก่อนขยายตัวต่อไป?";
  } else {
    // Focus
    primaryRecommendation = "วันนี้เหมาะกับการจัดระบบงานหลัก ดำเนินงานลอจิกที่มีความต้านทานสูง และจดจ่อเป้าหมายสำคัญ";
    secondaryRecommendation.push(
      "มุ่งเน้นการออกแบบโครงสร้างระบบและการร่างเขียนเนื้อหาหลัก",
      "กำหนดรอบเวลาสำหรับจดจ่อ (Focus block) อย่างมีประสิทธิภาพสูงสุด 1-2 ชั่วโมง",
      "ปิดงานและส่งมอบตาม checkpoint ทีละชิ้นอย่างเป็นลำดับ"
    );
    cautionLevel = "low";
    decisionGuidance = "การตัดสินใจเชิงเทคนิคและแผนงานดำเนินได้ปกติ ควรใช้ร่วมกับเกณฑ์เป้าหมายหน้างาน";
    workModePriority.push("structured_work", "system_design", "delivery");
    recoveryPriority.push("พักสายตาสั้นๆ หลังจดจ่อจบ 1 รอบ", "จัดระเบียบโต๊ะทำงาน");
    reflectionPrompt = "วันนี้มีเป้าหมายหรืองานชิ้นใดที่คุณสามารถมุ่งสมาธิและปิดเช็คพอยต์ให้สำเร็จได้ดีที่สุด?";
  }

  // 6. ความสัมพันธ์ธาตุจรและ baseline
  let focusWindow = "09:00 - 11:30";
  if (input.thaiTransitContext) {
    const active = input.thaiTransitContext.activeTransitHouses;
    if (active.includes("kamma") || active.includes("lapa")) {
      focusWindow = "10:00 - 12:00 และ 14:00 - 16:30";
    } else if (active.includes("vinas") || active.includes("ari")) {
      focusWindow = "ช่วงเช้าตรู่ก่อนเริ่มงาน หรือช่วงค่ำสั้น ๆ สำหรับงานทบทวน";
    }
  }

  const safetyDisclaimer = "ข้อมูลนี้เป็นกรอบสัญญะเพื่อช่วยสะท้อนจังหวะการทำงานและการตัดสินใจ ไม่ใช่คำทำนายผลลัพธ์ชีวิตแบบแน่นอน ผู้ใช้ควรใช้ร่วมกับข้อมูลจริง สุขภาพ เวลา และบริบทของตนเอง";

  return {
    layerName: "Natal + Transit Strategy Composer",
    source: "ArborDesk Strategy Composer v0.1",
    strategyDate,
    strategyMode,
    primaryRecommendation,
    secondaryRecommendation,
    cautionLevel,
    focusWindow,
    workModePriority,
    recoveryPriority,
    decisionGuidance,
    supportingSignals,
    suppressedSignals,
    conflictResolutionNotes,
    reflectionPrompt,
    confidenceNotes,
    safetyDisclaimer,
    generatedAt
  };
}
