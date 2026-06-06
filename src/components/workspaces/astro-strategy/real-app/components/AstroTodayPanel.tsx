"use client";

import * as React from "react";
import { Zap, Compass, CheckCircle, ShieldAlert, Activity, MessageSquare } from "lucide-react";

export type AstroTodayPanelProps = {
  strategyMode?: string;
  strategyDirection?: string;
  workRecommendations?: string[];
  riskPreventions?: string[];
  recoveryAnchors?: string[];
  reflectionPrompt?: string;
  
  // Maps สำหรับแปลงภาษาไทย (หากไม่มีจะใช้ค่าดิบหรือ default)
  workRecommendationThaiMap?: Record<string, string>;
  riskPreventionThaiMap?: Record<string, string>;
  recoveryAnchorThaiMap?: Record<string, string>;
};

const DEFAULT_WORK_RECOMMENDATION_MAP: Record<string, string> = {
  "structure before expansion": "จัดระบบก่อนขยายงาน",
  "one checkpoint at a time": "ปิดงานให้เป็น checkpoint ทีละเรื่อง",
  "strategic planning": "วางแผนเชิงกลยุทธ์",
  "content system design": "ออกแบบระบบคอนเทนต์",
  "AI-assisted workflow building": "สร้าง workflow โดยใช้ AI ช่วยจัดระบบ",
  "knowledge synthesis": "สังเคราะห์องค์ความรู้",
  "green/nature-related work": "งานที่เกี่ยวข้องกับธรรมชาติและระบบความรู้สีเขียว"
};

const DEFAULT_RISK_PREVENTION_MAP: Record<string, string> = {
  "looping thoughts": "สังเกตภาวะคิดวนและหยุดพักก่อนตัดสินใจต่อ",
  "too much project switching": "ลดการสลับโปรเจกต์ถี่เกินไป",
  "urge to fix everything at once": "ไม่ต้องแก้ทุกอย่างพร้อมกัน ให้เลือกจุดเดียวที่สำคัญที่สุด",
  "difficulty stopping work": "ตั้งขอบเขตเวลาหยุดงานให้ชัด",
  "opening too many dev/content tasks": "หลีกเลี่ยงการเปิดงาน dev/content หลายชิ้นพร้อมกัน",
  "late-night screen work": "ระวังงานหน้าจอดึกเกินไป",
  "lack of reflection pause": "เว้นช่วง reflection สั้น ๆ ก่อนเปิดงานถัดไป"
};

const DEFAULT_RECOVERY_ANCHOR_MAP: Record<string, string> = {
  "3-minute eye rest": "พักสายตา 3 นาที",
  "5-minute breathing pause": "หยุดหายใจช้า ๆ 5 นาที",
  "walk near trees": "เดินใกล้ต้นไม้หรือพื้นที่ธรรมชาติ",
  "write one reflection note": "เขียน reflection note สั้น ๆ หนึ่งบันทึก",
  "close one task before opening another": "ปิดงานหนึ่งเรื่องก่อนเปิดงานใหม่"
};

export function AstroTodayPanel({
  strategyMode = "Stabilize & Structure",
  strategyDirection = "วันนี้เหมาะกับการจัดระบบ ตรวจงานที่ค้าง และวางแผนก่อนขยายงานใหม่",
  workRecommendations = ["structure before expansion", "one checkpoint at a time"],
  riskPreventions = ["looping thoughts", "too much project switching"],
  recoveryAnchors = ["3-minute eye rest", "5-minute breathing pause"],
  reflectionPrompt = "วันนี้มีงานหรือโปรเจกต์ใดที่ควรปิดเป็น checkpoint เล็ก ๆ ก่อนเปิดเรื่องใหม่?",
  workRecommendationThaiMap = DEFAULT_WORK_RECOMMENDATION_MAP,
  riskPreventionThaiMap = DEFAULT_RISK_PREVENTION_MAP,
  recoveryAnchorThaiMap = DEFAULT_RECOVERY_ANCHOR_MAP,
}: AstroTodayPanelProps) {
  return (
    <div className="bg-slate-900/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/80 pb-4 gap-2">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Daily Timing Brief
          </h3>
          <p className="text-sm text-slate-300 font-medium">สรุปจังหวะวันนี้ (ภาพรวมสำหรับใช้สะท้อนจังหวะงาน การใช้พลัง และการดูแลตนเองในวันนี้)</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-200 border border-amber-500/20 self-start sm:self-center">
          วันนี้ (Daily)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Today's Mode & Strategic Direction */}
        <div className="bg-slate-950/70 border border-slate-700/80 p-6 rounded-xl space-y-3 hover:border-slate-650 transition-all sm:col-span-2">
          <div className="flex items-center gap-2 text-violet-300">
            <Compass className="w-5 h-5" />
            <h4 className="font-bold text-sm sm:text-base">Today’s Mode: {strategyMode}</h4>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            <strong>ทิศทางกลยุทธ์ (Strategic Direction):</strong> {strategyDirection}
          </p>
        </div>

        {/* Work Recommendation */}
        <div className="bg-slate-950/70 border border-slate-700/80 p-6 rounded-xl space-y-3 hover:border-slate-650 transition-all">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <h4 className="font-bold text-sm sm:text-base">คำแนะนำการทำงาน (Work Recommendation)</h4>
          </div>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 leading-relaxed">
            {workRecommendations.map((item, idx) => (
              <li key={idx}>{workRecommendationThaiMap[item] || item}</li>
            ))}
          </ul>
        </div>

        {/* Risk Prevention */}
        <div className="bg-slate-950/70 border border-slate-700/80 p-6 rounded-xl space-y-3 hover:border-slate-650 transition-all">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            <h4 className="font-bold text-sm sm:text-base">การคุมความเสี่ยง (Risk Prevention)</h4>
          </div>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 leading-relaxed">
            {riskPreventions.map((item, idx) => (
              <li key={idx}>{riskPreventionThaiMap[item] || item}</li>
            ))}
          </ul>
        </div>

        {/* Recovery Anchor */}
        <div className="bg-slate-950/70 border border-slate-700/80 p-6 rounded-xl space-y-3 hover:border-slate-650 transition-all">
          <div className="flex items-center gap-2 text-violet-300">
            <Activity className="w-5 h-5" />
            <h4 className="font-bold text-sm sm:text-base">สมอใจฟื้นฟู (Recovery Anchor)</h4>
          </div>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1.5 leading-relaxed">
            {recoveryAnchors.map((item, idx) => (
              <li key={idx}>{recoveryAnchorThaiMap[item] || item}</li>
            ))}
          </ul>
        </div>

        {/* Reflection Prompt */}
        <div className="bg-slate-950/70 border border-slate-700/80 p-6 rounded-xl space-y-3 hover:border-slate-650 transition-all">
          <div className="flex items-center gap-2 text-amber-400">
            <MessageSquare className="w-5 h-5" />
            <h4 className="font-bold text-sm sm:text-base">คำถามสะท้อนคิด (Reflection Prompt)</h4>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
            “{reflectionPrompt}”
          </p>
        </div>
      </div>

      <div className="text-[11px] text-slate-300 border-t border-slate-700/60 pt-4 leading-normal">
        *ข้อความนี้เป็น mock brief สำหรับการสะท้อนตนเองและวางแผนส่วนบุคคลเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์ การวินิจฉัย หรือการรักษา
      </div>
    </div>
  );
}
