import { AstroEngineOutput, AstroTodayData } from "./astroRealAppTypes";

/**
 * Maps the raw AstroEngineOutput from the calculation engine into the format expected by AstroTodayPanel.
 */
export function mapEngineOutputToTodayData(output: AstroEngineOutput): AstroTodayData {
  let reflectionPrompt = "วันนี้มีงานหรือโปรเจกต์ใดที่ควรปิดเป็น checkpoint เล็ก ๆ ก่อนเปิดเรื่องใหม่?";
  
  if (output.brief.strategyMode === "Pause & Calibrate") {
    reflectionPrompt = "วันนี้เป็นวันเกิดทางดาราศาสตร์ประจำสัปดาห์ของคุณ มีเรื่องอะไรที่คุณอยากผ่อนจังหวะเพื่อทบทวนสุขภาพและเป้าหมายรอบสัปดาห์บ้าง?";
  } else if (output.brief.strategyMode === "Stabilize & Structure") {
    reflectionPrompt = "ระบบงานหรือข้อมูลค้างชิ้นใดที่คุณต้องการจัดหมวดหมู่และปิด checkpoint ให้เป็นระเบียบในวันนี้บ้าง?";
  } else if (output.brief.strategyMode === "Focus & Deliver") {
    reflectionPrompt = "มีงานสำคัญชิ้นใหญ่เรื่องใดที่คุณต้องการใช้สมาธิเชิงลึก (Deep Work) มุ่งมั่นทำให้สำเร็จเสร็จสิ้นในวันนี้บ้าง?";
  }

  return {
    strategyMode: output.brief.strategyMode,
    strategyDirection: `${output.brief.triggerSignal} — ${output.brief.reason} (${output.brief.recommendedMove})`,
    workRecommendations: output.recommendations.map(r => r.text),
    riskPreventions: output.riskFlags.map(r => r.text),
    recoveryAnchors: output.recoveryAnchors.map(r => r.text),
    reflectionPrompt
  };
}
