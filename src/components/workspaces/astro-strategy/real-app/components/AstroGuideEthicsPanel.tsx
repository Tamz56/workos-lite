"use client";

import * as React from "react";
import { Compass, Info, Clock, Shield, BookOpen } from "lucide-react";

// ---------------------------------------------------------------------------
// ASTRO-REAL-APP-DEV-006 — Guide & Ethics Panel (Presentational Only)
//
// Consolidates:
//   1. Quick Start Guide (from DEV-021)
//   2. Ethical framing / คำแนะนำทางศีลธรรม
//   3. Non-medical disclaimer / Guardrail
//   4. Reflection-use guidance
//   5. Personal Timing Guide orientation
//
// This component is additive. It does NOT:
//   - Import from AstroStrategyPrototypeClient.tsx
//   - Read/write localStorage
//   - Modify routes, autosave, or persistence logic
//   - Claim medical, spiritual, or deterministic certainty
// ---------------------------------------------------------------------------

export type GuideItem = {
  /** Short step number or icon label */
  step: string;
  /** Title of the step */
  title: string;
  /** Description text */
  description: string;
};

export type DisclaimerItem = {
  /** Title / heading for the disclaimer block */
  title: string;
  /** Body text */
  body: string;
  /** Optional accent color key */
  accent?: "amber" | "rose" | "slate";
};

export type TimingGuideDimension = {
  /** Label e.g. "มิติรายวัน (Daily)" */
  label: string;
  /** Heading e.g. "สังเกตสภาวะปัจจุบัน" */
  heading: string;
  /** Description text */
  description: string;
  /** Accent color key for the label */
  accent: "teal" | "violet" | "amber" | "indigo";
};

export type AstroGuideEthicsPanelProps = {
  /** Override the quick start guide items */
  quickStartItems?: GuideItem[];
  /** Override the disclaimer items */
  disclaimerItems?: DisclaimerItem[];
  /** Override the timing guide dimensions */
  timingGuideDimensions?: TimingGuideDimension[];
  /** Override the ethical framing text */
  ethicalFramingText?: string;
  /** Override the reflection use text */
  reflectionUseText?: string;
  /** Override the closing quote */
  closingQuote?: string;
  /** Whether to show the Quick Start Guide section */
  showQuickStart?: boolean;
  /** Whether to show the Timing Guide section */
  showTimingGuide?: boolean;
};

// ---------------------------------------------------------------------------
// Default content — extracted from prototype text without modification
// ---------------------------------------------------------------------------

const DEFAULT_QUICK_START_ITEMS: GuideItem[] = [
  {
    step: "1",
    title: "ระบุเป้าหมายรอบเวลา",
    description:
      "เลือกเดือนการพิจารณาและพิมพ์แผนยุทธศาสตร์ในแถบด้านบน เพื่อใช้เตือนใจตลอดรอบเดือน",
  },
  {
    step: "2",
    title: "ประเมินสภาวะจริง",
    description:
      "ตอบดรอปดาวน์ Daily Check-in ในแผงขวาตามสภาพจริง เพื่อปรับโหมดการทำงานประจำวันให้สอดรับกับสภาวะและบริบทงานของวันนี้มากขึ้น",
  },
  {
    step: "3",
    title: "ทบทวนและทริกเกอร์บันทึก",
    description:
      "สรุปผลงานที่เสร็จและข้อสังเกตลงในแท็บ สะท้อนคิด เพื่อคัดลอก Markdown หรือกดเก็บเข้าแฟ้มคลังประวัติศาสตร์",
  },
];

const DEFAULT_ETHICAL_FRAMING_TEXT =
  "กฎและจังหวะของดาราศาสตร์เป็นเพียงสัญวิทยาเชิงสัญลักษณ์เพื่อสะท้อนความเชื่อมโยงของระบบธรรมชาติ " +
  "ชีวิตมนุษย์ขับเคลื่อนด้วยการกระทำเป็นหลัก ปัญญาและการเจรจาที่เป็นธรรมจะเป็นเกราะคุ้มครองที่แท้จริง";

const DEFAULT_REFLECTION_USE_TEXT =
  "ข้อมูลชุดนี้ถูกรวบรวมไว้และบันทึกในระบบเพื่อให้ผู้ใช้สามารถสังเกตความเกี่ยวเนื่อง " +
  "รวมถึงจับคู่ความสัมพันธ์ของพลังงานส่วนบุคคล จังหวะกระบวนการทำงาน สมาธิจดจ่อ การเหนื่อยล้าสะสม " +
  "และการเตรียมความพร้อมเพื่อวางแผนฟื้นตัวอย่างเหมาะสมในแต่ละสัปดาห์ " +
  "โดยเน้นไปที่การใช้เป็นข้อมูลสะท้อนตนเองในเชิงสัญลักษณ์เพื่อช่วยให้สังเกตจังหวะชีวิตได้ดีขึ้น " +
  "และไม่ใช้แทนคำแนะนำจากแพทย์หรือผู้เชี่ยวชาญ";

const DEFAULT_DISCLAIMER_ITEMS: DisclaimerItem[] = [
  {
    title: "ข้อพิจารณาความเป็นส่วนตัวและการจำกัดความรับผิดชอบ (Disclaimer)",
    body: "This profile is stored locally in your browser for personal reflection only. It is not medical advice, diagnosis, or treatment. All astrological and timing references are symbolic aids for self-observation — not deterministic predictions.",
    accent: "amber",
  },
  {
    title: "แนวทางการใช้งาน (Usage Guidance)",
    body: "ใช้เพื่อการสะท้อนคิดและวางแผนส่วนบุคคลเท่านั้น ไม่ใช่คำแนะนำทางการแพทย์ การวินิจฉัย หรือการรักษา",
    accent: "amber",
  },
];

const DEFAULT_TIMING_GUIDE_DIMENSIONS: TimingGuideDimension[] = [
  {
    label: "มิติรายวัน (Daily)",
    heading: "สังเกตสภาวะปัจจุบัน",
    description:
      "บันทึกระดับพลังงาน สมาธิ และสัญญาณทางกายทุกวัน เพื่อจัดสรรงานที่เหมาะกับสภาพความเป็นจริงของร่างกายและสมอง ณ เวลานั้น",
    accent: "teal",
  },
  {
    label: "มิติรายสัปดาห์ (Weekly)",
    heading: "ตรวจสอบความถี่สะสม",
    description:
      "สังเกตแนวโน้มพลังงานที่โดดเด่นและธีมที่ปรากฏซ้ำรอบ 5 วันล่าสุด เพื่อจัดปรับสมดุลกิจกรรมหลังบ้านและหน้าบ้านให้เหมาะสมสอดคล้องกัน",
    accent: "violet",
  },
  {
    label: "มิติรายเดือน (Monthly)",
    heading: "ถอดรหัสภาพรวมกว้าง",
    description:
      "ทบทวนสถิติภาพใหญ่ เพื่อวิเคราะห์ว่าระดับพลังงานหลักหรือข้อควรระวังประเภทใดที่เกิดซ้ำมากที่สุด ช่วยชี้วัดเป้าหมายระยะสั้น",
    accent: "amber",
  },
  {
    label: "แผนกลยุทธ์ (Planning)",
    heading: "แปลงผลสู่การลงมือทำ",
    description:
      "นำสิ่งที่สังเกตพบจากทุกระดับเวลา มากำหนดสิ่งที่ต้องโฟกัส สิ่งที่ต้องชะลอตัวลง และระบุการกระทำเล็กๆ ที่พร้อมทำได้ทันที",
    accent: "indigo",
  },
];

const DEFAULT_CLOSING_QUOTE =
  "\u201Cการมีสติรับรู้จังหวะเวลาของตนเอง ไม่ใช่การยอมรับข้อจำกัดเชิงโชคชะตา แต่คือการประเมินกำลังเพื่อการเคลื่อนไหวที่ชาญฉลาดและปลอดภัยที่สุด\u201D";

// ---------------------------------------------------------------------------
// Accent color utilities
// ---------------------------------------------------------------------------

const ACCENT_COLORS: Record<string, string> = {
  teal: "text-teal-400",
  violet: "text-violet-400",
  amber: "text-amber-400",
  indigo: "text-indigo-400",
  rose: "text-rose-400",
  slate: "text-slate-400",
};

function getAccentColor(accent: string | undefined): string {
  return ACCENT_COLORS[accent || "amber"] || ACCENT_COLORS.amber;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AstroGuideEthicsPanel({
  quickStartItems = DEFAULT_QUICK_START_ITEMS,
  disclaimerItems = DEFAULT_DISCLAIMER_ITEMS,
  timingGuideDimensions = DEFAULT_TIMING_GUIDE_DIMENSIONS,
  ethicalFramingText = DEFAULT_ETHICAL_FRAMING_TEXT,
  reflectionUseText = DEFAULT_REFLECTION_USE_TEXT,
  closingQuote = DEFAULT_CLOSING_QUOTE,
  showQuickStart = true,
  showTimingGuide = true,
}: AstroGuideEthicsPanelProps) {
  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* 1. Quick Start Guide                                            */}
      {/* ---------------------------------------------------------------- */}
      {showQuickStart && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Compass className="w-4.5 h-4.5 text-indigo-400" />
            <h3 className="font-semibold text-sm text-slate-100">
              คู่มือการใช้งานด่วน (Quick Start Guide)
            </h3>
          </div>
          <div className="text-xs text-slate-350 space-y-3 leading-relaxed">
            {quickStartItems.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-950 border border-slate-850 flex items-center justify-center font-bold text-indigo-300 text-[10px] flex-shrink-0">
                  {item.step}
                </span>
                <p>
                  <strong className="text-slate-200">{item.title}</strong>: {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* 2. Ethical Framing / คำแนะนำทางศีลธรรม                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-slate-955/40 to-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-3">
        <h4 className="text-sm font-semibold text-amber-250 tracking-wider uppercase flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-300" /> คำแนะนำทางศีลธรรม
        </h4>
        <p className="text-sm text-slate-200 leading-relaxed font-medium">
          {ethicalFramingText}
        </p>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 3. Reflection Use Guidance                                      */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <div className="space-y-1.5">
          <h4 className="text-sm font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-violet-400" />
            การบันทึกเพื่อการสะท้อนคิด (Reflection Use)
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            {reflectionUseText}
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* 4. Disclaimers / Guardrails                                     */}
      {/* ---------------------------------------------------------------- */}
      {disclaimerItems.map((item, idx) => (
        <div
          key={idx}
          className="bg-slate-955/60 border border-slate-850 p-5 rounded-xl flex items-start gap-3"
        >
          <Info
            className={`w-5 h-5 mt-0.5 flex-shrink-0 ${getAccentColor(item.accent)}`}
          />
          <div className="space-y-1">
            <span
              className={`text-[11px] font-bold tracking-wider uppercase block ${getAccentColor(item.accent)}`}
            >
              {item.title}
            </span>
            <p className="text-sm text-slate-200 leading-relaxed">
              {item.body}
            </p>
          </div>
        </div>
      ))}

      {/* ---------------------------------------------------------------- */}
      {/* 5. Personal Timing Guide Orientation                            */}
      {/* ---------------------------------------------------------------- */}
      {showTimingGuide && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-400" />
            <div className="space-y-0.5">
              <h3 className="text-lg font-bold text-slate-100">
                คู่มือแนวทางการจัดจังหวะเวลาส่วนบุคคล (Personal Timing Guide)
              </h3>
              <p className="text-xs text-slate-400">
                วิธีบูรณาการมิติต่างๆ ของเวลาเพื่อการจัดระเบียบสมาธิและการฟื้นฟูอย่างมีประสิทธิภาพ
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {timingGuideDimensions.map((dim, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2"
              >
                <span
                  className={`text-[10px] font-bold tracking-wider uppercase block ${getAccentColor(dim.accent)}`}
                >
                  {dim.label}
                </span>
                <h4 className="text-xs font-bold text-slate-200">{dim.heading}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {dim.description}
                </p>
              </div>
            ))}
          </div>

          {/* Closing quote */}
          <div className="bg-slate-950/20 border border-slate-850 p-4 rounded-xl text-center">
            <p className="text-xs text-slate-400 leading-relaxed">
              {closingQuote}
            </p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Footer note                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="text-[10px] text-slate-400 leading-relaxed text-center">
        คำแนะนำในส่วนนี้
        <span className="text-slate-400"> ใช้เพื่อช่วยตั้งคำถาม</span>
        และจัดลำดับความสำคัญ
        <span className="text-slate-400"> ไม่ใช่คำทำนาย</span>{" "}
        <span className="text-slate-400">ไม่ใช่คำสั่ง</span> และ
        <span className="text-slate-400">ไม่ควรใช้แทนข้อมูลจริง</span>
        หรือดุลยพินิจของตนเอง
      </div>
    </div>
  );
}
