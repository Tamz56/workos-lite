"use client";

import * as React from "react";
import { Star } from "lucide-react";

// ---------------------------------------------------------------------------
// ASTRO-REAL-APP-DEV-007 — Real App Composition Preview
//
// Assembles all extracted real-app components into a single preview screen.
// This is a composition/integration checkpoint only.
//
// Safety:
//   - Does NOT replace the active /workspaces/astro-strategy route
//   - Does NOT import from AstroStrategyPrototypeClient.tsx
//   - Does NOT read/write localStorage
//   - Does NOT add autosave, persistence, or export logic
//   - Does NOT add astrology engine, AI, medical, or prediction logic
//   - Uses mock/default data only
// ---------------------------------------------------------------------------

import { AstroTodayPanel } from "./components/AstroTodayPanel";
import { AstroReflectionPanel } from "./components/AstroReflectionPanel";
import { AstroReflectionHistoryPanel } from "./components/AstroReflectionHistoryPanel";
import { AstroStrategyPlanningPanel } from "./components/AstroStrategyPlanningPanel";
import { AstroGuideEthicsPanel } from "./components/AstroGuideEthicsPanel";
import { AstroStrategyAppShell } from "./AstroStrategyAppShell";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type PreviewTab = "today" | "reflection" | "history" | "planning" | "guide";

const TAB_ITEMS: { id: PreviewTab; label: string; description: string }[] = [
  { id: "today", label: "📊 สรุปวันนี้", description: "Daily Timing Brief" },
  { id: "reflection", label: "✍️ สะท้อนคิด", description: "Reflection Log" },
  { id: "history", label: "📋 ประวัติ", description: "Reflection History" },
  { id: "planning", label: "🎯 แผนกลยุทธ์", description: "Strategy Planning" },
  { id: "guide", label: "📖 คู่มือ", description: "Guide & Ethics" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AstroRealAppPreview() {
  const [activeTab, setActiveTab] = React.useState<PreviewTab>("today");

  return (
    <AstroStrategyAppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ---------------------------------------------------------------- */}
        {/* Preview Header Banner                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-gradient-to-r from-violet-950/40 via-slate-900/60 to-indigo-950/40 border border-violet-500/20 rounded-2xl p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-950/60 border border-violet-500/30 rounded-xl">
              <Star className="w-6 h-6 text-violet-300" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                Astro Strategy Lab — Real App Preview
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                ตัวอย่างการประกอบคอมโพเนนต์แอปจริง (Composition Preview) — ยังไม่เชื่อมต่อข้อมูลจริง
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-violet-950/50 text-violet-300 border border-violet-400/20 font-bold">
              PREVIEW MODE
            </span>
            <span>•</span>
            <span>ข้อมูลทั้งหมดเป็น mock data เพื่อทดสอบการ compose เท่านั้น</span>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Tab Navigation                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-1.5 flex flex-wrap gap-1">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all
                flex items-center gap-1.5
                ${
                  activeTab === tab.id
                    ? "bg-violet-950/60 text-violet-200 border border-violet-500/30 shadow-sm"
                    : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent"
                }
              `}
              title={tab.description}
            >
              <span>{tab.label}</span>
              <span className="hidden sm:inline text-[10px] text-slate-400 font-normal">
                {tab.description}
              </span>
            </button>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Tab Content                                                     */}
        {/* ---------------------------------------------------------------- */}
        <div className="min-h-[400px]">
          {activeTab === "today" && <AstroTodayPanel />}
          {activeTab === "reflection" && <AstroReflectionPanel />}
          {activeTab === "history" && <AstroReflectionHistoryPanel />}
          {activeTab === "planning" && <AstroStrategyPlanningPanel />}
          {activeTab === "guide" && <AstroGuideEthicsPanel />}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Preview Footer                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="border-t border-slate-800/60 pt-4 text-center space-y-1">
          <p className="text-[10px] text-slate-400">
            Astro Strategy Lab — Real App Composition Preview (DEV-007)
          </p>
          <p className="text-[10px] text-slate-500">
            คอมโพเนนต์ทั้งหมดใช้ข้อมูลจำลองเท่านั้น ยังไม่เชื่อมต่อ localStorage หรือระบบ persistence ใดๆ
          </p>
        </div>
      </div>
    </AstroStrategyAppShell>
  );
}
