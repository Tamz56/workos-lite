"use client";

import * as React from "react";
import { Calendar, Compass, CheckCircle, ShieldAlert, Activity, ClipboardList } from "lucide-react";
import { AstroMonthlyReflectionViewModel } from "../data/astroRealAppTypes";

export type AstroMonthlyPanelProps = {
  monthlyData: AstroMonthlyReflectionViewModel;
  fallbackNote?: string | null;
};

export function AstroMonthlyPanel({
  monthlyData,
  fallbackNote = null,
}: AstroMonthlyPanelProps) {
  const {
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
    metadata
  } = monthlyData;

  return (
    <div className="bg-slate-900/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/80 pb-4 gap-2">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" /> Monthly Strategy & Reflection
          </h3>
          <p className="text-sm text-slate-300 font-medium">ภาพรวมกลยุทธ์เชิงสัญลักษณ์และการสะท้อนจังหวะงานในรอบเดือน</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-300 border border-amber-500/20 self-start sm:self-center">
          รายเดือน (Monthly)
        </span>
      </div>

      {/* Fallback Warning if any */}
      {fallbackNote && (
        <div className="bg-amber-950/30 border border-amber-500/20 p-3.5 rounded-xl text-xs text-amber-300 flex items-start gap-2.5 animate-fadeIn">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{fallbackNote}</span>
        </div>
      )}

      {/* Statistics Snapshot Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1: Total logs */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 text-center space-y-1 hover:border-slate-700 transition-all">
          <div className="text-2xl font-bold text-amber-450">{totalLogsThisMonth}</div>
          <div className="text-xs font-semibold text-slate-200">บันทึกสะท้อนคิดสะสม</div>
          <div className="text-[10px] text-slate-400">จดบันทึกประจำเดือน {monthLabel}</div>
        </div>

        {/* Stat 2: Top logged mode */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 text-center space-y-1 hover:border-slate-700 transition-all">
          <div className="text-base sm:text-lg font-bold text-violet-300 truncate" title={topLoggedMode}>
            {topLoggedMode}
          </div>
          <div className="text-xs font-semibold text-slate-200">โหมดงานเด่นสะสม</div>
          <div className="text-[10px] text-slate-400">โหมดที่ลงบันทึกบ่อยสุดในเดือนนี้</div>
        </div>

        {/* Stat 3: Top logged energy */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 text-center space-y-1 hover:border-slate-700 transition-all">
          <div className="text-base sm:text-lg font-bold text-emerald-400 truncate" title={topLoggedEnergy}>
            {topLoggedEnergy}
          </div>
          <div className="text-xs font-semibold text-slate-200">แนวโน้มสภาพการทำงาน</div>
          <div className="text-[10px] text-slate-400">สภาวะหลักที่ลงเช็คอินสม่ำเสมอ</div>
        </div>
      </div>

      {/* Monthly Theme & Focus Banner */}
      <div className="bg-slate-950/70 border border-slate-700/80 p-5 rounded-xl space-y-2 hover:border-slate-650 transition-all">
        <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase block">ธีมกลยุทธ์หลักประจำเดือน {monthLabel}</span>
        <h4 className="text-base sm:text-lg font-bold text-slate-200 flex items-center gap-2">
          <Compass className="w-5 h-5 text-amber-400 shrink-0" />
          {monthlyTheme}
        </h4>
        <p className="text-xs sm:text-sm text-slate-350 leading-relaxed font-normal">
          <strong className="text-slate-200">ทิศทางหลัก (Strategic Focus):</strong> {strategicFocus}
        </p>
        <div className="flex flex-wrap gap-2 pt-1 font-mono text-[9px] text-slate-450">
          <span>โหมดจังหวะเวลาส่วนตัว: {primaryMode}</span>
          <span>•</span>
          <span>โหมดจังหวะเวลารอง: {secondaryMode}</span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Focus Areas */}
        <div className="bg-slate-950/50 border border-slate-800/80 p-5 rounded-xl space-y-3 hover:border-slate-700 transition-all">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <h4 className="font-bold text-sm sm:text-base">จุดโฟกัสแนะนำประจำเดือน (Focus Areas)</h4>
          </div>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-350 space-y-2.5 leading-relaxed font-normal">
            {recommendedFocusAreas.map((item, idx) => (
              <li key={idx} className="marker:text-emerald-500">{item}</li>
            ))}
          </ul>
        </div>

        {/* Risks and recovery anchors */}
        <div className="bg-slate-950/50 border border-slate-800/80 p-5 rounded-xl space-y-4 hover:border-slate-700 transition-all">
          {/* Risk Watch */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-rose-450">
              <ShieldAlert className="w-5 h-5" />
              <h4 className="font-bold text-sm sm:text-base">ความเสี่ยงที่ควรเฝ้าระวัง (Risk Watch)</h4>
            </div>
            <ul className="list-disc list-inside text-xs sm:text-sm text-slate-350 space-y-1.5 leading-relaxed font-normal">
              {riskWatch.map((item, idx) => (
                <li key={idx} className="marker:text-rose-500">{item}</li>
              ))}
            </ul>
          </div>

          {/* Recovery Anchors */}
          <div className="space-y-2 border-t border-slate-850 pt-3">
            <div className="flex items-center gap-2 text-violet-300">
              <Activity className="w-5 h-5" />
              <h4 className="font-bold text-sm sm:text-base">จังหวะการฟื้นตัวประจำเดือน (Recovery Anchors)</h4>
            </div>
            <ul className="list-disc list-inside text-xs sm:text-sm text-slate-350 space-y-1.5 leading-relaxed font-normal">
              {recoveryAnchors.map((item, idx) => (
                <li key={idx} className="marker:text-violet-400">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Pattern Summary Callout Box */}
      <div className="bg-slate-955/20 border border-slate-850 p-5 rounded-xl space-y-2">
        <div className="flex items-center gap-2 text-indigo-400">
          <ClipboardList className="w-4.5 h-4.5" />
          <h4 className="text-xs sm:text-sm font-bold">บทวิเคราะห์แนวโน้มจากการสะท้อนคิดประจำเดือน</h4>
        </div>
        <p className="text-xs text-slate-350 leading-relaxed font-normal">
          {reflectionPatternSummary}
        </p>
      </div>

      {/* Metadata and disclaimer */}
      <div className="text-[10px] text-slate-400 border-t border-slate-700/60 pt-4 leading-normal space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] text-slate-500">
          <span>ประเภทการคำนวณ: {metadata.calculationMode}</span>
          <span>•</span>
          <span>ระบบคำนวณ: {metadata.sourceEngine}</span>
          <span>•</span>
          <span>ความน่าเชื่อถือ: {(metadata.confidenceScore * 100).toFixed(0)}%</span>
        </div>
        <p className="leading-relaxed text-slate-400 text-[10px]">
          *คำเตือนทางจริยธรรมข้อมูล: {metadata.disclaimer || "ข้อมูลนี้ใช้เพื่อการสะท้อนและวางแผนเชิงกลยุทธ์ส่วนบุคคลเท่านั้น ไม่ใช่คำทำนายตายตัวหรือคำแนะนำทางการแพทย์"}
        </p>
      </div>
    </div>
  );
}
