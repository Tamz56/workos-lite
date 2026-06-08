"use client";

import * as React from "react";
import { Compass, User, Clock, Edit3, Database, X, ArrowRight, Lightbulb } from "lucide-react";

interface AstroOnboardingPanelProps {
  onDismiss: () => void;
  onNavigateToTab: (tabId: "today" | "weekly" | "monthly" | "reflection" | "history" | "planning" | "profile" | "guide" | "tools") => void;
  legacyKeysExist?: boolean;
}

export function AstroOnboardingPanel({
  onDismiss,
  onNavigateToTab,
  legacyKeysExist = false,
}: AstroOnboardingPanelProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 border border-violet-500/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
      {/* Decorative blurred background orb */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Dismiss Button (Top Right) */}
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
        aria-label="ปิดแผงแนะนำ"
        type="button"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="space-y-2 max-w-2xl">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-violet-300 uppercase">
          <Compass className="w-4.5 h-4.5 text-violet-400" />
          <span>Onboarding & First-Run Guidance</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
          ยินดีต้อนรับสู่ Astro Strategy Lab 📊
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          ระบบวิเคราะห์จังหวะชีวิตเชิงกลยุทธ์ส่วนบุคคล เพื่อช่วยในการจดจ่อและการวางแผนงานอย่างมีประสิทธิผล 
          โดยประมวลผลดาราศาสตร์เชิงสัญลักษณ์และบันทึกสถิติส่วนบุคคล ทั้งนี้ระบบบันทึกข้อมูลแบบ 
          <strong> Local-first ภายในเบราว์เซอร์ของคุณ 100%</strong> ปลอดภัยและเป็นส่วนตัวอย่างแท้จริง
        </p>
      </div>

      {/* Checklist items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 1: Birth Profile */}
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700/80 transition-all">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <User className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">1. ตั้งค่าโปรไฟล์ดวงเกิด</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            ระบุวัน เวลา และสถานที่เกิด เพื่อช่วยคำนวณและปรับโหมดความสอดคล้องตามกลยุทธ์ได้ตรงตัวคุณที่สุด
          </p>
          <button
            onClick={() => onNavigateToTab("profile")}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 hover:underline pt-1"
            type="button"
          >
            <span>ไปที่แท็บโปรไฟล์ดวงเกิด</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Step 2: Daily Timing */}
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700/80 transition-all">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-500/10 border border-teal-500/20 rounded-lg">
              <Clock className="w-4 h-4 text-teal-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">2. ดูจังหวะการจัดแจงวันนี้</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            ตรวจสอบแนวทางโหมดการทำงานประจำวัน เช่น มุ่งเน้นสร้างงาน (Focus), จัดโครงสร้าง (Stabilize) หรือผ่อนคลาย (Pause)
          </p>
          <button
            onClick={() => onNavigateToTab("today")}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-400 hover:text-teal-300 hover:underline pt-1"
            type="button"
          >
            <span>ไปที่แท็บสรุปวันนี้</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Step 3: Reflection */}
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700/80 transition-all">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <Edit3 className="w-4 h-4 text-violet-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">3. เริ่มบันทึกสะท้อนคิด</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            บันทึกการประเมินสภาวะจริงและพลังงานรายวันเพื่อสะสมแนวโน้มรอบสัปดาห์และรอบเดือน ยิ่งบันทึกมาก ยิ่งเห็นทิศทางชัดเจน
          </p>
          <button
            onClick={() => onNavigateToTab("reflection")}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300 hover:underline pt-1"
            type="button"
          >
            <span>ไปที่แท็บสะท้อนคิด</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Step 4: Legacy Migration / Data Tools */}
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700/80 transition-all">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <Database className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">
              {legacyKeysExist ? "4. ตรวจพบประวัติเก่าดั้งเดิม" : "4. โยกย้ายและจัดการข้อมูล"}
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {legacyKeysExist
              ? "ระบบตรวจพบคีย์ประวัติบันทึกเดิมในบราวเซอร์นี้ คุณสามารถเลือกโอนย้ายไปยังแอปใหม่ได้อย่างปลอดภัย"
              : "นำเข้าหรือส่งออกประวัติสะสมทางกลยุทธ์ของคุณได้ตามต้องการ ผ่านแท็บควบคุมโดยตรง"
            }
          </p>
          <button
            onClick={() => onNavigateToTab("tools")}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 hover:underline pt-1"
            type="button"
          >
            <span>ไปที่แท็บเครื่องมือข้อมูล</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Ethical guidance footnote & Dismiss action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800/80 pt-5 text-slate-400">
        <div className="flex items-start gap-2 max-w-xl">
          <Lightbulb className="w-4.5 h-4.5 text-amber-500/60 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>คำแนะนำด้านจริยธรรม:</strong> แผนกลยุทธ์และจังหวะดาราศาสตร์เป็นกรอบสะท้อนเชิงสัญลักษณ์เพื่อการเรียนรู้ตนเอง 
            ไม่เด็ดขาด ตายตัว หรือมีอำนาจเหนือเจตจำนงในการกระทำและการตัดสินใจที่ชาญฉลาดของคุณ
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-slate-100 text-xs font-semibold rounded-lg shadow-md hover:shadow-violet-600/10 transition-all flex-shrink-0 text-center"
          type="button"
        >
          รับทราบ / ซ่อนไว้ก่อน
        </button>
      </div>
    </div>
  );
}
