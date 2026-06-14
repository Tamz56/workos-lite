"use client";
 
import * as React from "react";
import { Zap, Compass, CheckCircle, ShieldAlert, Activity, MessageSquare } from "lucide-react";
import { AstroEngineMetadata, ThaiAstroStrategyOutput, ChineseMetaphysicsStrategyOutput, ThaiTransitStrategyOutput } from "../data/astroRealAppTypes";
 
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
 
  // DEV-024 props
  engineMetadata?: AstroEngineMetadata;
  fallbackNote?: string | null;

  // DEV-059 props
  thaiAstroContext?: ThaiAstroStrategyOutput | null;
  thaiAstroFallbackNote?: string | null;

  // DEV-067 props
  chineseAstroContext?: ChineseMetaphysicsStrategyOutput | null;
  chineseAstroFallbackNote?: string | null;

  // DEV-078 props
  thaiTransitContext?: ThaiTransitStrategyOutput | null;
  thaiTransitFallbackNote?: string | null;
  showThaiTransitContext?: boolean;
  defaultThaiTransitCollapsed?: boolean;
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
  engineMetadata,
  fallbackNote = null,
  thaiAstroContext = null,
  thaiAstroFallbackNote = null,
  chineseAstroContext = null,
  chineseAstroFallbackNote = null,
  thaiTransitContext = null,
  thaiTransitFallbackNote = null,
  showThaiTransitContext = true,
  defaultThaiTransitCollapsed = true,
}: AstroTodayPanelProps) {
  const [chineseAstroExpanded, setChineseAstroExpanded] = React.useState(false);
  const [thaiTransitExpanded, setThaiTransitExpanded] = React.useState(!defaultThaiTransitCollapsed);

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

      {fallbackNote && (
        <div className="bg-amber-950/30 border border-amber-500/20 p-3.5 rounded-xl text-xs text-amber-300 flex items-start gap-2.5 animate-fadeIn">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{fallbackNote}</span>
        </div>
      )}

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
 
      {/* Thai Astrology Context Card (DEV-059) */}
      {thaiAstroContext && (
        <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-xl space-y-2.5 hover:border-slate-700/80 transition-all animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2 text-amber-400">
              <Compass className="w-4 h-4 shrink-0" />
              <span className="font-bold text-xs sm:text-sm tracking-wide text-slate-200">จังหวะเวลาไทยประกอบการทบทวน (Thai Timing Context)</span>
            </div>
            <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-slate-800/50 text-slate-350">
              สอดคล้อง: {(thaiAstroContext.symbolicAlignment * 100).toFixed(0)}%
            </span>
          </div>
 
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p className="font-semibold text-slate-100 flex items-center gap-1.5 flex-wrap">
              <span>🧭 {thaiAstroContext.thaiAstroSignal}</span>
              <span className="text-[10px] text-slate-400 font-normal">({thaiAstroContext.symbolicMeaning})</span>
            </p>
            <p className="text-slate-300">
              <strong className="text-slate-200 font-medium">ทิศทางเชิงฤกษ์:</strong> {thaiAstroContext.strategyImplication}
            </p>
            <p className="text-slate-300">
              <strong className="text-slate-200 font-medium">คำแนะนำปฏิบัติ:</strong> {thaiAstroContext.suggestedAction}
            </p>
            {thaiAstroContext.cautionNote && (
              <p className="text-rose-300/90 bg-rose-950/20 px-2.5 py-1 rounded border border-rose-950/40">
                <strong className="text-rose-200 font-semibold">ข้อสังเกต:</strong> {thaiAstroContext.cautionNote}
              </p>
            )}
            <p className="text-[9px] text-slate-500 italic mt-1 pt-1.5 border-t border-slate-900 leading-normal">
              *{thaiAstroContext.safetyDisclaimer}
            </p>
          </div>
        </div>
      )}
 
      {thaiAstroFallbackNote && (
        <div className="bg-rose-950/25 border border-rose-500/25 p-3 rounded-xl text-xs text-rose-350 flex items-start gap-2.5 animate-fadeIn">
          <ShieldAlert className="w-4 h-4 text-rose-450 shrink-0 mt-0.5" />
          <span>{thaiAstroFallbackNote}</span>
        </div>
      )}
 
      {/* Chinese Metaphysics Context Card (DEV-067) */}
      {chineseAstroContext && (
        <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-xl space-y-2.5 hover:border-slate-700/80 transition-all animate-fadeIn">
          <div 
            className="flex items-center justify-between border-b border-slate-800/80 pb-2 cursor-pointer select-none"
            onClick={() => setChineseAstroExpanded(!chineseAstroExpanded)}
          >
            <div className="flex items-center gap-2 text-violet-400">
              <Compass className="w-4 h-4 shrink-0" />
              <span className="font-bold text-xs sm:text-sm tracking-wide text-slate-200">
                ☯️ คำแนะนำธาตุและฤดูกาลจีน (Chinese Metaphysics Context)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-slate-800/50 text-slate-350">
                สอดคล้อง: {(chineseAstroContext.symbolicAlignment * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                {chineseAstroExpanded ? "▲ ซ่อน" : "▼ ขยาย"}
              </span>
            </div>
          </div>
 
          {chineseAstroExpanded && (
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed animate-fadeIn">
              <p className="font-semibold text-slate-100 flex items-center gap-1.5 flex-wrap">
                <span>☯️ {chineseAstroContext.chineseMetaphysicsSignal}</span>
                <span className="text-[10px] text-slate-400 font-normal">({chineseAstroContext.symbolicMeaning})</span>
              </p>
              <p className="text-slate-300">
                <strong className="text-slate-200 font-medium">กลยุทธ์ธาตุประจำวัน:</strong> {chineseAstroContext.strategyImplication}
              </p>
              <p className="text-slate-300">
                <strong className="text-slate-200 font-medium">คำแนะนำปฏิบัติ:</strong> {chineseAstroContext.suggestedAction}
              </p>
              {chineseAstroContext.cautionNote && (
                <p className="text-rose-300/90 bg-rose-950/20 px-2.5 py-1 rounded border border-rose-950/40">
                  <strong className="text-rose-200 font-semibold">ข้อสังเกต:</strong> {chineseAstroContext.cautionNote}
                </p>
              )}
              <p className="text-[9px] text-slate-500 italic mt-1 pt-1.5 border-t border-slate-900 leading-normal">
                *{chineseAstroContext.safetyDisclaimer}
              </p>
            </div>
          )}
        </div>
      )}
 
      {chineseAstroFallbackNote && (
        <div className="bg-rose-950/25 border border-rose-500/25 p-3 rounded-xl text-xs text-rose-350 flex items-start gap-2.5 animate-fadeIn">
          <ShieldAlert className="w-4 h-4 text-rose-450 shrink-0 mt-0.5" />
          <span>{chineseAstroFallbackNote}</span>
        </div>
      )}

      {/* Thai Transit Context Card (DEV-078) */}
      {showThaiTransitContext && thaiTransitContext && (
        <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-xl space-y-2.5 hover:border-slate-700/80 transition-all animate-fadeIn">
          <div 
            className="flex items-center justify-between border-b border-slate-800/80 pb-2 cursor-pointer select-none"
            onClick={() => setThaiTransitExpanded(!thaiTransitExpanded)}
          >
            <div className="flex items-center gap-2 text-indigo-400">
              <Compass className="w-4 h-4 shrink-0" />
              <span className="font-bold text-xs sm:text-sm tracking-wide text-slate-200">
                🧭 จังหวะดวงจรไทยวันนี้ (Thai Transit Context)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-slate-800/50 text-slate-350">
                โหมด: {thaiTransitContext.transitMode}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                {thaiTransitExpanded ? "▲ ซ่อน" : "▼ ขยาย"}
              </span>
            </div>
          </div>
  
          {/* Compact summary 1-2 lines shown when collapsed */}
          {!thaiTransitExpanded && (
            <p className="text-xs text-slate-400 italic leading-relaxed">
              *จังหวะจรหลัก: {thaiTransitContext.transitMode} ({thaiTransitContext.elementRelationship.elementPairAdvice})
            </p>
          )}

          {thaiTransitExpanded && (
            <div className="text-xs text-slate-300 space-y-2.5 leading-relaxed animate-fadeIn">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-slate-200 font-medium shrink-0">เรือนจรที่ถูกกระตุ้น:</strong>
                {thaiTransitContext.activeTransitHouses.map((h, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-indigo-950/40 text-indigo-200 border border-indigo-500/20 text-[10px] font-mono">
                    {h}
                  </span>
                ))}
              </div>

              <p className="text-slate-300">
                <strong className="text-slate-200 font-medium">ธาตุสัมพันธ์จร:</strong> {thaiTransitContext.elementRelationship.elementPairAdvice}
              </p>

              {thaiTransitContext.recommendedWorkModes.length > 0 && (
                <div className="text-slate-300">
                  <strong className="text-slate-200 font-medium">โหมดงานส่งเสริม:</strong>{" "}
                  {thaiTransitContext.recommendedWorkModes.map(m => {
                    const maps: Record<string, string> = {
                      structured_work: "จัดระบบโครงสร้างงาน",
                      system_design: "ออกแบบโครงร่างระบบ",
                      qa_testing: "ตรวจสอบความเสถียร/QA",
                      debugging: "แก้ไขข้อบกพร่อง/ดีบัก",
                      delivery: "สรุปผลส่งมอบงาน",
                      summary_notes: "เขียนบันทึกย่อย",
                      research: "ค้นคว้าข้อมูลเบื้องหลัง",
                      system_cleanup: "จัดระเบียบเคลียร์ระบบ",
                      meeting: "นัดหมายเจรจา/ประชุมทีม",
                      agreements: "ตกลงข้อเสนอสัญญา",
                      self_pacing: "จัดจังหวะกำลังตนเอง",
                      energy_check: "ประเมินโฟกัสส่วนบุคคล",
                      recovery: "พักฟื้นฟูจิตใจ",
                      review: "ทบทวนการทำงานเบา",
                      low_intensity: "ทำงานเบาความเค้นต่ำ"
                    };
                    return maps[m] || m;
                  }).join(", ")}
                </div>
              )}

              {thaiTransitContext.avoidOrDelayModes.length > 0 && (
                <div className="text-slate-300">
                  <strong className="text-rose-350 font-medium">ควรเลี่ยงหรือชะลอ:</strong>{" "}
                  <span className="text-slate-350">
                    {thaiTransitContext.avoidOrDelayModes.map(m => {
                      const maps: Record<string, string> = {
                        structured_work: "การขึ้นโครงสร้างใหม่ขนาดใหญ่",
                        system_design: "การลงรายละเอียดสเปกซับซ้อน",
                        meeting: "การนัดหมายตกลงประเด็นสำคัญ",
                        agreements: "การลงนามข้อตกลงตึงเครียด"
                      };
                      return maps[m] || m;
                    }).join(", ")}
                  </span>
                </div>
              )}

              {thaiTransitContext.decisionCautionSignals.length > 0 && (
                <div className="text-amber-300 bg-amber-950/20 px-2.5 py-1 rounded border border-amber-950/40">
                  <strong className="text-amber-200 font-semibold">ข้อควรพิจารณา:</strong>{" "}
                  {thaiTransitContext.decisionCautionSignals.map(s => {
                    const maps: Record<string, string> = {
                      TH_SIG_AVOID_DECISION: "ควรลดการตัดสินใจสำคัญเชิงร้อนรนหรือสลับสับเปลี่ยนโปรเจกต์งานเร็วเกินไป",
                      TH_SIG_RECALIBRATE: "แนะนำการตั้งหลักทบทวนแผนกลยุทธ์ส่วนตัวเพื่อจัดสรรพลังสมาธิใหม่"
                    };
                    return maps[s] || s;
                  }).join(" / ")}
                </div>
              )}

              <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900 leading-normal">
                {thaiTransitContext.confidenceNotes}
              </div>
              <p className="text-[9px] text-slate-500 italic mt-0.5 leading-normal">
                *{thaiTransitContext.safetyDisclaimer}
              </p>
            </div>
          )}
        </div>
      )}

      {showThaiTransitContext && thaiTransitFallbackNote && (
        <div className="bg-rose-950/25 border border-rose-500/25 p-3 rounded-xl text-xs text-rose-350 flex items-start gap-2.5 animate-fadeIn">
          <ShieldAlert className="w-4 h-4 text-rose-450 shrink-0 mt-0.5" />
          <span>{thaiTransitFallbackNote}</span>
        </div>
      )}
 
      {engineMetadata ? (
        <div className="text-[10px] text-slate-400 border-t border-slate-700/60 pt-4 leading-normal space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] text-slate-500">
            <span>การคำนวณ: {engineMetadata.calculationMode}</span>
            <span>•</span>
            <span>เอนจิ้น: {engineMetadata.sourceEngine}</span>
            <span>•</span>
            <span>ระดับความมั่นใจ: {(engineMetadata.confidenceScore * 100).toFixed(0)}%</span>
          </div>
          <p className="leading-relaxed text-slate-400 text-[10px]">
            *คำเตือน: {engineMetadata.disclaimer || "ข้อมูลนี้ใช้เพื่อการสะท้อนและวางแผนเชิงกลยุทธ์เท่านั้น ไม่ใช่คำทำนายตายตัวหรือคำแนะนำทางการแพทย์"}
          </p>
        </div>
      ) : (
        <div className="text-[11px] text-slate-350 border-t border-slate-700/60 pt-4 leading-normal">
          *ข้อความนี้เป็นประมาณการจำลองสำหรับการสะท้อนตนเองและวางแผนส่วนบุคคลเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์ การวินิจฉัย หรือการรักษา
        </div>
      )}
    </div>
  );
}
