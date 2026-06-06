"use client";

import * as React from "react";
import { ClipboardList } from "lucide-react";

export type AstroStrategyPlanningPanelProps = {
  focusNext?: string;
  slowDown?: string;
  nextSmallAction?: string;
  reviewLater?: string;
  notesUpdatedAt?: string;
  
  onPlanningChange?: (notes: {
    focusNext?: string;
    slowDown?: string;
    nextSmallAction?: string;
    reviewLater?: string;
  }) => void;
};

export function AstroStrategyPlanningPanel({
  focusNext = "",
  slowDown = "",
  nextSmallAction = "",
  reviewLater = "",
  notesUpdatedAt = "",
  onPlanningChange,
}: AstroStrategyPlanningPanelProps) {
  // Local states for inputs presentation
  const [localFocusNext, setLocalFocusNext] = React.useState(focusNext);
  const [localSlowDown, setLocalSlowDown] = React.useState(slowDown);
  const [localNextSmallAction, setLocalNextSmallAction] = React.useState(nextSmallAction);
  const [localReviewLater, setLocalReviewLater] = React.useState(reviewLater);

  // Sync with props if they change externally
  React.useEffect(() => {
    setLocalFocusNext(focusNext);
  }, [focusNext]);

  React.useEffect(() => {
    setLocalSlowDown(slowDown);
  }, [slowDown]);

  React.useEffect(() => {
    setLocalNextSmallAction(nextSmallAction);
  }, [nextSmallAction]);

  React.useEffect(() => {
    setLocalReviewLater(reviewLater);
  }, [reviewLater]);

  const handleFieldChange = (field: "focusNext" | "slowDown" | "nextSmallAction" | "reviewLater", value: string) => {
    switch (field) {
      case "focusNext":
        setLocalFocusNext(value);
        break;
      case "slowDown":
        setLocalSlowDown(value);
        break;
      case "nextSmallAction":
        setLocalNextSmallAction(value);
        break;
      case "reviewLater":
        setLocalReviewLater(value);
        break;
    }

    if (onPlanningChange) {
      onPlanningChange({
        focusNext: field === "focusNext" ? value : localFocusNext,
        slowDown: field === "slowDown" ? value : localSlowDown,
        nextSmallAction: field === "nextSmallAction" ? value : localNextSmallAction,
        reviewLater: field === "reviewLater" ? value : localReviewLater,
      });
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4.5 h-4.5 text-indigo-400" />
          <h4 className="text-sm font-semibold text-slate-200">แผนงานเชิงกลยุทธ์ส่วนบุคคล (Strategy Planning Notes)</h4>
        </div>
        <div className="text-[10px] text-slate-400 flex items-center gap-1">
          <span>สถานะ:</span>
          <span className="font-mono text-slate-350 font-bold bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800">
            {notesUpdatedAt ? `บันทึกล่าสุด: ${notesUpdatedAt}` : "ยังไม่มีการบันทึก"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. สิ่งที่ต้องโฟกัสถัดไป */}
        <div className="bg-slate-955/35 p-3.5 rounded-xl border border-slate-850 space-y-1.5 flex flex-col justify-between">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">🎯 สิ่งที่ต้องโฟกัสถัดไป (Focus Next)</label>
            <span className="text-[10px] text-slate-500 block leading-tight">เป้าหมายเชิงผลผลิตหลัก หรืองานสำคัญที่สุดชิ้นถัดไป</span>
          </div>
          <textarea
            value={localFocusNext}
            onChange={(e) => handleFieldChange("focusNext", e.target.value)}
            placeholder="เช่น สรุปโครงสร้างระบบ API, ส่งมอบงานเขียนฉบับที่ 2"
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 mt-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all resize-none placeholder:text-slate-800"
          />
        </div>

        {/* 2. สิ่งที่ควรชะลอหรือลดระดับ */}
        <div className="bg-slate-955/35 p-3.5 rounded-xl border border-slate-850 space-y-1.5 flex flex-col justify-between">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">⏳ สิ่งที่ควรชะลอหรือลดระดับ (Slow Down)</label>
            <span className="text-[10px] text-slate-500 block leading-tight">ลดการเร่งงานส่วนเกิน ผ่อนจังหวะเพื่อฟื้นฟูสภาพพลังงาน</span>
          </div>
          <textarea
            value={localSlowDown}
            onChange={(e) => handleFieldChange("slowDown", e.target.value)}
            placeholder="เช่น ชะลอการตอบอีเมลที่ไม่ด่วนหลัง 6 โมงเย็น, เลื่อนประชุมทบทวนเล็กออกไป"
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 mt-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all resize-none placeholder:text-slate-800"
          />
        </div>

        {/* 3. งานเล็ก ๆ ที่ทำได้ทันที */}
        <div className="bg-slate-955/35 p-3.5 rounded-xl border border-slate-850 space-y-1.5 flex flex-col justify-between">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">⚡ งานเล็ก ๆ ที่ทำได้ทันที (Next Small Action)</label>
            <span className="text-[10px] text-slate-500 block leading-tight">ปฏิบัติการชิ้นเล็กที่เริ่มได้เร็วเพื่อสร้างแรงส่ง (Momentum)</span>
          </div>
          <textarea
            value={localNextSmallAction}
            onChange={(e) => handleFieldChange("nextSmallAction", e.target.value)}
            placeholder="เช่น เคลียร์อินบอกซ์ 5 ข้อความแรก, โทรแจ้งยอดอัปเดตสั้นๆ"
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 mt-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all resize-none placeholder:text-slate-800"
          />
        </div>

        {/* 4. สิ่งที่จะนำกลับมาทบทวนภายหลัง */}
        <div className="bg-slate-955/35 p-3.5 rounded-xl border border-slate-850 space-y-1.5 flex flex-col justify-between">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">🔎 สิ่งที่จะนำกลับมาทบทวนภายหลัง (Review Later)</label>
            <span className="text-[10px] text-slate-500 block leading-tight">หัวข้อหรือประเด็นที่ต้องรอดูรอบเวลาและสถานะสัปดาห์หน้า</span>
          </div>
          <textarea
            value={localReviewLater}
            onChange={(e) => handleFieldChange("reviewLater", e.target.value)}
            placeholder="เช่น รูปแบบดราฟต์สัญญาเช่าร้าน, ตัวเลขวิเคราะห์สภาพคล่องของมิถุนายน"
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 mt-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all resize-none placeholder:text-slate-800"
          />
        </div>
      </div>

      {/* Cautious disclaimer */}
      <div className="text-[10px] text-slate-500 leading-relaxed pt-2.5 border-t border-slate-850/40 text-center">
        “ข้อมูลนี้เป็นบันทึกแผนส่วนตัวที่จัดเก็บในเครื่องนี้ ใช้เพื่อช่วยทบทวนและวางแผน ไม่ใช่ข้อสรุปตายตัว”
      </div>
    </div>
  );
}
