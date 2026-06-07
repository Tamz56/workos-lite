"use client";

import * as React from "react";
import { Database, Trash2, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export type AstroPreviewDataToolsPanelProps = {
  onResetHistory: () => void;
  onResetPlanning: () => void;
  onResetDraft: () => void;
  onResetAll: () => void;
};

const KEYS = {
  REFLECTION_HISTORY: "astro-real-app:reflection-history:v1",
  PLANNING_NOTES: "astro-real-app:planning-notes:v1",
  REFLECTION_DRAFT: "astro-real-app:reflection-draft:v1",
};

export function AstroPreviewDataToolsPanel({
  onResetHistory,
  onResetPlanning,
  onResetDraft,
  onResetAll,
}: AstroPreviewDataToolsPanelProps) {
  const [statuses, setStatuses] = React.useState<Record<string, boolean>>({
    history: false,
    planning: false,
    draft: false,
  });
  const [statusMessage, setStatusMessage] = React.useState("");

  const updateStatuses = React.useCallback(() => {
    if (typeof window !== "undefined") {
      setStatuses({
        history: localStorage.getItem(KEYS.REFLECTION_HISTORY) !== null,
        planning: localStorage.getItem(KEYS.PLANNING_NOTES) !== null,
        draft: localStorage.getItem(KEYS.REFLECTION_DRAFT) !== null,
      });
    }
  }, []);

  React.useEffect(() => {
    updateStatuses();
    // Listen for storage events (if modified in other tabs)
    window.addEventListener("storage", updateStatuses);
    return () => window.removeEventListener("storage", updateStatuses);
  }, [updateStatuses]);

  const showFeedback = (msg: string) => {
    setStatusMessage(msg);
    updateStatuses();
    setTimeout(() => setStatusMessage(""), 3000);
  };

  const handleAction = (label: string, callback: () => void) => {
    const confirmed = window.confirm(`คุณต้องการลบ/รีเซ็ต "${label}" ใช่หรือไม่? การกระทำนี้จะมีผลทันทีและไม่สามารถเรียกคืนได้`);
    if (confirmed) {
      callback();
      showFeedback(`รีเซ็ต "${label}" สำเร็จ`);
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="space-y-0.5">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" /> เครื่องมือจัดการข้อมูลพรีวิว (Data & Safety Tools)
          </h3>
          <p className="text-xs text-slate-300">ตรวจสอบ ตรวจสอบสถานะการจัดเก็บ และล้างข้อมูลจำลองเพื่อการพัฒนาและทดสอบ</p>
        </div>
      </div>

      {/* Safety Warning */}
      <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-amber-200">
          <p className="font-semibold text-[13px]">คำเตือนความปลอดภัย (Safety Scope Boundary)</p>
          <p className="leading-relaxed">
            ปุ่มควบคุมการล้างข้อมูลเหล่านี้จะส่งผลกระทบต่อข้อมูล **Namespace ของหน้า Preview (`astro-real-app:`)** เท่านั้น
            ระบบจะไม่ไปอ่าน เขียน หรือลบข้อมูลใด ๆ ที่เป็นของหน้าโปรโตไทป์หลัก หรือระบบผู้ใช้งานหลัก เพื่อป้องกันการทำข้อมูลงานจริงสูญหาย
          </p>
        </div>
      </div>

      {/* Key Status List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">คีย์ตรวจวัดข้อมูล (LocalStorage Keys Status)</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. History */}
          <div className="bg-slate-950/70 border border-slate-750 p-4 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono block break-all">{KEYS.REFLECTION_HISTORY}</span>
              <p className="text-xs font-semibold text-slate-200">Reflection History (ประวัติสะท้อนคิด)</p>
              <div className="flex items-center gap-1 text-[11px] pt-1">
                {statuses.history ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> มีข้อมูลเก็บอยู่ (Exists)
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> ว่างเปล่า / ใช้ค่า Mock
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleAction("ประวัติสะท้อนคิด (Reflection History)", onResetHistory)}
              className="w-full py-1.5 px-3 bg-slate-900 hover:bg-rose-950/30 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-900/50 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> ล้างเฉพาะประวัติ
            </button>
          </div>

          {/* 2. Planning Notes */}
          <div className="bg-slate-950/70 border border-slate-750 p-4 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono block break-all">{KEYS.PLANNING_NOTES}</span>
              <p className="text-xs font-semibold text-slate-200">Planning Notes (แผนเชิงกลยุทธ์)</p>
              <div className="flex items-center gap-1 text-[11px] pt-1">
                {statuses.planning ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> มีข้อมูลเก็บอยู่ (Exists)
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> ว่างเปล่า / ใช้ค่า Mock
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleAction("แผนงานเชิงกลยุทธ์ (Planning Notes)", onResetPlanning)}
              className="w-full py-1.5 px-3 bg-slate-900 hover:bg-rose-950/30 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-900/50 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> ล้างเฉพาะแผนงาน
            </button>
          </div>

          {/* 3. Reflection Draft */}
          <div className="bg-slate-950/70 border border-slate-750 p-4 rounded-xl space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono block break-all">{KEYS.REFLECTION_DRAFT}</span>
              <p className="text-xs font-semibold text-slate-200">Reflection Draft (ดราฟต์พิมพ์ค้าง)</p>
              <div className="flex items-center gap-1 text-[11px] pt-1">
                {statuses.draft ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> มีข้อมูลเก็บอยู่ (Exists)
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> ไม่มีดราฟต์ชั่วคราว
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleAction("ดราฟต์ชั่วคราว (Reflection Draft)", onResetDraft)}
              className="w-full py-1.5 px-3 bg-slate-900 hover:bg-rose-950/30 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-900/50 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> ล้างเฉพาะดราฟต์
            </button>
          </div>
        </div>
      </div>

      {/* Global Actions */}
      <div className="pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {statusMessage ? (
          <span className="text-xs text-emerald-400 font-medium animate-pulse flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {statusMessage}
          </span>
        ) : (
          <span className="text-xs text-slate-300">
            ระบบเก็บข้อมูลแยกส่วน สามารถกดล้างคีย์ทั้งหมดเพื่อตั้งต้นใหม่เป็นข้อมูล Mock ได้เสมอ
          </span>
        )}

        <button
          onClick={() => handleAction("ข้อมูล Preview ทั้งหมด (Reset All Preview Data)", onResetAll)}
          className="py-2.5 px-5 bg-rose-950/20 hover:bg-rose-900/40 text-rose-200 hover:text-rose-100 border border-rose-800/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm self-end"
        >
          <Trash2 className="w-4 h-4 text-rose-400" /> ล้างข้อมูลพรีวิวทั้งหมด (Reset All Data)
        </button>
      </div>
    </div>
  );
}
