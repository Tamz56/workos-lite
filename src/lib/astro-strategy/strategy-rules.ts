import type { AstroPersonalProfile } from "@/lib/types/astro-strategy";

export interface StrategyRuleResult {
    strategyMode: "Stabilize & Structure" | "Focus & Deliver" | "Pause & Calibrate";
    triggerSignal: string;
    reason: string;
    recommendedMove: string;
    recoverySupport: string;
    guardrail: string;
}

export function deriveStrategyMode(profile: AstroPersonalProfile): StrategyRuleResult {
    const physicalWarnings = profile.personalWarningSigns?.physical ?? [];
    const mentalWarnings = profile.personalWarningSigns?.mental ?? [];
    const drainingFactors = profile.workEnergyPattern?.drainingWork ?? [];
    const workPatternWarnings = profile.personalWarningSigns?.workPattern ?? [];
    const disclaimer = profile.interpretationBoundary?.disclaimer ?? "For personal reflection and planning only.";

    // Rule 1: Pause & Calibrate if warning signs are high
    if (physicalWarnings.includes("eye strain") || mentalWarnings.includes("looping thoughts")) {
        return {
            strategyMode: "Pause & Calibrate",
            triggerSignal: "มี pattern ที่ควรสังเกตเกี่ยวกับความล้าจากงานหน้าจอและความคิดวน",
            reason: "เมื่อ profile มีสัญญาณลักษณะนี้ การเร่งเปิดงานใหม่อาจทำให้สมาธิกระจาย จึงเหมาะกับการลดความเร็วและจัดจังหวะใหม่",
            recommendedMove: "จำกัดการเปิดงานใหม่ และเลือกปิด checkpoint เดิม 1 เรื่องก่อน",
            recoverySupport: profile.practiceAnchors?.shortAnchors?.[0] ?? "พักสายตา 3 นาทีเป็นช่วง ๆ",
            guardrail: disclaimer
        };
    }

    // Rule 2: Stabilize & Structure if overloaded
    if (drainingFactors.includes("too many open projects at once") || workPatternWarnings.includes("opening too many dev/content tasks")) {
        return {
            strategyMode: "Stabilize & Structure",
            triggerSignal: "มี pattern ที่เกี่ยวข้องกับการเปิดหลายโปรเจกต์พร้อมกัน",
            reason: "การกระจายงานหลายทิศทางอาจทำให้การตัดสินใจไม่คมชัด จึงเหมาะกับการจัดระบบก่อนขยายงาน",
            recommendedMove: "แบ่งงานเป็น checkpoint เล็ก ๆ และทำงานเชิงลึกทีละหนึ่งจุด",
            recoverySupport: profile.practiceAnchors?.shortAnchors?.[4] ?? "ปิดงานหนึ่งเรื่องก่อนเปิดงานใหม่",
            guardrail: disclaimer
        };
    }

    // Fallback: Focus & Deliver
    return {
        strategyMode: "Focus & Deliver",
        triggerSignal: "profile อยู่ในจังหวะที่สามารถใช้พลังกับงานชัดเจนได้",
        reason: "เหมาะกับการลงมือทำงานที่มีขอบเขตชัดและส่งมอบผลลัพธ์เป็นรูปธรรม",
        recommendedMove: "เลือกงานสำคัญ 1 เรื่อง แล้วทำให้เป็น output ที่ตรวจสอบได้",
        recoverySupport: profile.practiceAnchors?.shortAnchors?.[1] ?? "หยุดพักหายใจช้า ๆ 5 นาทีเพื่อรักษาโฟกัส",
        guardrail: disclaimer
    };
}
