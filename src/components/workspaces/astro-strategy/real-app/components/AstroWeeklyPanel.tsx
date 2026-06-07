"use client";

import * as React from "react";
import { Calendar, Compass, CheckCircle, ShieldAlert, Activity, Info, Zap } from "lucide-react";
import { AstroWeeklyTimingViewModel } from "../data/astroRealAppTypes";
import { formatThaiDateLabel } from "../data/astroRealAppWeeklyTimingViewModel";

export type AstroWeeklyPanelProps = {
  weeklyData: AstroWeeklyTimingViewModel;
  fallbackNote?: string | null;
};

export function AstroWeeklyPanel({
  weeklyData,
  fallbackNote = null,
}: AstroWeeklyPanelProps) {
  const { days, weeklyTheme, metadata } = weeklyData;

  // Mode badge styles helper
  const getModeStyles = (mode: string) => {
    switch (mode) {
      case "Pause & Calibrate":
        return "bg-violet-950/50 text-violet-300 border-violet-500/30";
      case "Stabilize & Structure":
        return "bg-slate-800/80 text-slate-200 border-slate-650";
      default: // Focus & Deliver
        return "bg-emerald-950/40 text-emerald-350 border-emerald-500/20";
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/80 pb-4 gap-2">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-400" /> Weekly Strategy View
          </h3>
          <p className="text-sm text-slate-300 font-medium">ภาพรวมกลยุทธ์และการจัดสรรเวลาในสัปดาห์นี้ (7 วันข้างหน้า)</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-955/40 text-violet-300 border border-violet-500/20 self-start sm:self-center">
          รายสัปดาห์ (Weekly)
        </span>
      </div>

      {/* Fallback Warning if any */}
      {fallbackNote && (
        <div className="bg-amber-950/30 border border-amber-500/20 p-3.5 rounded-xl text-xs text-amber-300 flex items-start gap-2.5 animate-fadeIn">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{fallbackNote}</span>
        </div>
      )}

      {/* Weekly Theme Banner */}
      <div className="bg-slate-950/70 border border-slate-700/80 p-5 rounded-xl space-y-1.5 hover:border-slate-650 transition-all">
        <span className="text-[10px] font-bold text-violet-300 tracking-wider uppercase block">ธีมหลักประจำสัปดาห์นี้ (Weekly Theme)</span>
        <h4 className="text-base sm:text-lg font-bold text-slate-200 flex items-center gap-2">
          <Compass className="w-5 h-5 text-violet-400 shrink-0" />
          {weeklyTheme}
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed font-normal">
          วิเคราะห์จากโหมดเวลาที่ปรากฏถี่ที่สุดในรอบ 7 วันนี้ เพื่อใช้กำหนดทิศทางใหญ่ประจำรอบวางแผนของสัปดาห์
        </p>
      </div>

      {/* 7-Day Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map((day, idx) => {
          const dateLabel = formatThaiDateLabel(day.date);
          const isBirthDay = day.isBirthWeekdayCycle;

          return (
            <div
              key={day.date}
              className={`
                rounded-xl p-4.5 space-y-3.5 border transition-all hover:scale-[1.01] duration-200
                ${isBirthDay 
                  ? "border-violet-500/50 bg-violet-955/10 shadow-[0_0_12px_rgba(139,92,246,0.06)]" 
                  : "border-slate-800/80 bg-slate-950/40 hover:border-slate-700"
                }
              `}
            >
              {/* Day Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                <div className="space-y-0.5">
                  <h5 className="font-bold text-slate-100 text-xs sm:text-sm">{dateLabel}</h5>
                  {isBirthDay && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-violet-350 uppercase tracking-wide bg-violet-950/60 px-1.5 py-0.5 rounded border border-violet-500/20">
                      <Zap className="w-2.5 h-2.5" /> ครบรอบวันเกิดสุริยคติ
                    </span>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border shrink-0 ${getModeStyles(day.mode)}`}>
                  {day.label}
                </span>
              </div>

              {/* Day Details */}
              <div className="space-y-2.5 text-xs text-slate-300">
                {/* Focus */}
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-300 font-semibold block">🎯 ทิศทาง / บริบทหลัก:</span>
                  <p className="leading-relaxed font-normal text-slate-300">{day.strategicFocus}</p>
                </div>

                {/* Recommendation */}
                <div className="space-y-0.5">
                  <span className="text-[10px] text-emerald-400 font-semibold block flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> แนะนำการลงมือทำ:
                  </span>
                  <p className="leading-relaxed font-normal text-slate-300">{day.recommendedAction}</p>
                </div>

                {/* Risk Prevention */}
                <div className="space-y-0.5">
                  <span className="text-[10px] text-rose-400 font-semibold block flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> การคุมความเสี่ยง:
                  </span>
                  <p className="leading-relaxed font-normal text-slate-300">{day.riskNote}</p>
                </div>

                {/* Recovery Anchor */}
                <div className="space-y-0.5">
                  <span className="text-[10px] text-violet-300 font-semibold block flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> สมอใจฟื้นฟู:
                  </span>
                  <p className="leading-relaxed font-normal text-slate-300">{day.recoveryAnchor}</p>
                </div>
              </div>
            </div>
          );
        })}
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
