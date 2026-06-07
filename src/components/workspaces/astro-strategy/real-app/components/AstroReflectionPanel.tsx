"use client";

import * as React from "react";
import { RefreshCw, Save } from "lucide-react";

export type AstroReflectionPanelProps = {
  reflectionPrompt?: string;
  defaultTitle?: string;
  defaultActivity?: string;
  defaultRating?: string;
  defaultText?: string;
  onSubmit?: (data: {
    title: string;
    activity: string;
    rating: string;
    text: string;
    date: string;
  }) => void;
  onResetReflections?: () => void;
  totalReflectionsCount?: number;
  savedMessage?: string;
};

export function AstroReflectionPanel({
  reflectionPrompt = "วันนี้มีงานหรือโปรเจกต์ใดที่ควรปิดเป็น checkpoint เล็ก ๆ ก่อนเปิดเรื่องใหม่?",
  defaultTitle = "",
  defaultActivity = "",
  defaultRating = "เหมาะสมมาก",
  defaultText = "",
  onSubmit,
  onResetReflections,
  totalReflectionsCount = 0,
  savedMessage = "",
}: AstroReflectionPanelProps) {
  const [title, setTitle] = React.useState(defaultTitle);
  const [activity, setActivity] = React.useState(defaultActivity);
  const [rating, setRating] = React.useState(defaultRating);
  const [text, setText] = React.useState(defaultText);
  const [localSavedMessage, setLocalSavedMessage] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        title,
        activity,
        rating,
        text,
        date: new Date().toLocaleDateString("en-CA"),
      });
    } else {
      setLocalSavedMessage("บันทึกสำเร็จ (โหมดจำลอง)");
      setTimeout(() => setLocalSavedMessage(""), 3000);
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="space-y-0.5">
          <h3 className="text-lg font-bold text-slate-100">บันทึกการสะท้อนคิดจังหวะเวลา (Reflection Log)</h3>
          <p className="text-xs text-slate-300">เปรียบเทียบคำพยากรณ์รอบเวลากับเหตุการณ์ที่เผชิญจริง เพื่อทบทวนการเรียนรู้</p>
        </div>
        <button
          onClick={onResetReflections}
          className="text-xs text-slate-300 hover:text-rose-400 transition-colors flex items-center gap-1"
          title="ล้างข้อมูลและใช้ข้อมูลเริ่มต้น"
        >
          <RefreshCw className="w-3.5 h-3.5" /> ล้างข้อมูลทั้งหมด
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Form: Add Reflection */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4 bg-slate-950/70 p-5 rounded-xl border border-slate-700">
          <h4 className="text-sm font-semibold text-slate-200">เขียนบันทึกสะท้อนคิดชิ้นใหม่</h4>
          
          <div className="space-y-3">
            {/* Reflection Prompt display in the form */}
            <div className="bg-slate-900/70 border border-slate-700/60 p-3 rounded-lg text-xs space-y-1">
              <span className="text-[10px] font-bold text-amber-400 block tracking-wider uppercase">คำถามสะท้อนคิดประจำวัน</span>
              <p className="text-slate-300 italic">“{reflectionPrompt}”</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-300">หัวเรื่องบันทึก</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น รีวิวการใช้ฤกษ์วันเปิดตัวแอป"
                className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-300">กิจกรรมที่ทดลองทำ</label>
              <input
                type="text"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder="เช่น ดีลสัญญาร้านอาหารใหม่"
                className="w-full bg-slate-950 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-300">ผลประเมินในใบคำแนะนำ</label>
                <select
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
                >
                  <option value="เหมาะสมมาก">เหมาะสมมาก</option>
                  <option value="พอใช้ได้">พอใช้ได้</option>
                  <option value="ควรระวัง">ควรระวัง</option>
                  <option value="ควรเลื่อนออกไป">ควรเลื่อนออกไป</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-300">วันที่สังเกตการณ์</label>
                <input
                  type="text"
                  readOnly
                  value={new Date().toLocaleDateString("en-CA")}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-300">บันทึกสิ่งที่เกิดขึ้นจริงและการเปรียบเทียบ</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="บันทึกความรู้สึก อุปสรรค และการเตรียมความพร้อมจริง เช่น โน้มน้าวตามคำชี้แนะได้ราบรื่น..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-750 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-400 leading-relaxed"
              ></textarea>
            </div>

            {(savedMessage || localSavedMessage) && (
              <span className="text-xs text-emerald-400 font-medium block">
                {savedMessage || localSavedMessage}
              </span>
            )}

            <button
              type="submit"
              className="w-full py-2 px-3 bg-slate-855 hover:bg-slate-800 text-slate-200 border border-slate-750 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              เก็บบันทึกประวัติสะท้อนคิด
            </button>
          </div>
        </form>

        {/* Right Section: Additive placeholder explaining that history list is handled separately */}
        <div className="lg:col-span-3 space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
          <h4 className="text-xs font-bold text-slate-300 tracking-wider uppercase">ประวัติการบันทึก ({totalReflectionsCount} รายการ)</h4>
          <div className="py-12 border border-dashed border-slate-700 rounded-xl text-center text-slate-300 text-xs bg-slate-950/70 space-y-1.5">
            <p className="font-semibold text-slate-300">การแสดงรายการประวัติ (Reflection History)</p>
            <p className="text-[10px] text-slate-300 max-w-[260px] mx-auto leading-relaxed">
              โมดูลประวัติการสะท้อนคิดย้อนหลังและตัวกรองข้อมูลจะถูกดึงเข้าสู่คอมโพเนนต์หลักในขั้นตอนการปรับปรุงความปลอดภัยลำดับถัดไป (DEV-004)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
