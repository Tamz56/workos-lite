"use client";

import * as React from "react";
import { Star } from "lucide-react";

import { AstroTodayPanel } from "./components/AstroTodayPanel";
import { AstroReflectionPanel } from "./components/AstroReflectionPanel";
import { AstroReflectionHistoryPanel } from "./components/AstroReflectionHistoryPanel";
import { AstroStrategyPlanningPanel } from "./components/AstroStrategyPlanningPanel";
import { AstroGuideEthicsPanel } from "./components/AstroGuideEthicsPanel";
import { AstroPreviewDataToolsPanel } from "./components/AstroPreviewDataToolsPanel";
import { AstroBirthProfilePanel } from "./components/AstroBirthProfilePanel";
import { AstroStrategyAppShell } from "./AstroStrategyAppShell";

import {
  MOCK_TODAY_DATA,
  MOCK_HISTORY_LOGS,
  MOCK_PLANNING_NOTES,
  MOCK_GUIDE_DATA,
} from "./data/astroRealAppMockData";

import { AstroRealAppLocalStorageAdapter } from "./data/astroRealAppLocalStorageAdapter";
import { ReflectionHistoryItem, AstroPlanningNotes, AstroReflectionDraft } from "./data/astroRealAppTypes";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type PreviewTab = "today" | "reflection" | "history" | "planning" | "profile" | "guide" | "tools";

const TAB_ITEMS: { id: PreviewTab; label: string; description: string }[] = [
  { id: "today", label: "📊 สรุปวันนี้", description: "Daily Timing Brief" },
  { id: "reflection", label: "✍️ สะท้อนคิด", description: "Reflection Log" },
  { id: "history", label: "📋 ประวัติ", description: "Reflection History" },
  { id: "planning", label: "🎯 แผนกลยุทธ์", description: "Strategy Planning" },
  { id: "profile", label: "👤 โปรไฟล์ดวงเกิด", description: "Birth Profile" },
  { id: "guide", label: "📖 คู่มือ", description: "Guide & Ethics" },
  { id: "tools", label: "⚙️ เครื่องมือข้อมูล", description: "Data Tools" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AstroRealAppPreview() {
  const [activeTab, setActiveTab] = React.useState<PreviewTab>("today");

  // Client states with fallback to mock data before hydration
  const [historyLogs, setHistoryLogs] = React.useState<ReflectionHistoryItem[]>(MOCK_HISTORY_LOGS);
  const [planningNotes, setPlanningNotes] = React.useState<AstroPlanningNotes>(MOCK_PLANNING_NOTES);
  const [reflectionDraft, setReflectionDraft] = React.useState<AstroReflectionDraft>({
    title: "",
    activity: "",
    rating: "เหมาะสมมาก",
    text: ""
  });
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [historySaveStatus, setHistorySaveStatus] = React.useState("");

  // Hydration hook: Load from localStorage on client mount
  React.useEffect(() => {
    async function loadData() {
      const loadedHistory = await AstroRealAppLocalStorageAdapter.loadReflectionHistory();
      const loadedPlanning = await AstroRealAppLocalStorageAdapter.loadPlanningNotes();
      const loadedDraft = await AstroRealAppLocalStorageAdapter.loadReflectionDraft();
      setHistoryLogs(loadedHistory);
      setPlanningNotes(loadedPlanning);
      if (loadedDraft) {
        setReflectionDraft(loadedDraft);
      }
      setIsHydrated(true);
    }
    loadData();
  }, []);

  // Handler to save new reflection history entry
  const handleSubmitReflection = async (data: {
    title: string;
    activity: string;
    rating: string;
    text: string;
    date: string;
  }) => {
    const newItem: ReflectionHistoryItem = {
      id: "h_" + Date.now(),
      version: 1,
      createdAt: new Date().toLocaleDateString("en-CA") + " " + new Date().toLocaleTimeString("en-GB"),
      reflectionDate: data.date,
      reflectionMode: "Focus", // Default mock category
      reflectionSummary: data.title,
      noticedNotes: data.text,
      nextRightAction: data.activity,
      strategyMode: MOCK_TODAY_DATA.strategyMode,
      dailyCheckinSnapshot: {
        energyLevel: "steady",
        clarityLevel: "clear",
        workloadPressure: "normal",
        focusCondition: "deep_focus",
        bodySignal: "normal",
        todayIntention: data.activity,
        cautionNote: ""
      },
      markdownSnapshot: ""
    };

    const updatedHistory = [newItem, ...historyLogs];
    setHistoryLogs(updatedHistory);
    await AstroRealAppLocalStorageAdapter.saveReflectionHistory(updatedHistory);

    // Clear active draft after successful submission
    const clearedDraft = {
      title: "",
      activity: "",
      rating: "เหมาะสมมาก",
      text: ""
    };
    setReflectionDraft(clearedDraft);
    await AstroRealAppLocalStorageAdapter.clearReflectionDraft();

    setHistorySaveStatus("บันทึกเข้าระบบประวัติสำเร็จ");
    setTimeout(() => setHistorySaveStatus(""), 3000);
  };

  // Handler to save active draft as user edits
  const handleDraftChange = async (updatedDraft: Partial<AstroReflectionDraft>) => {
    const newDraft: AstroReflectionDraft = {
      title: updatedDraft.title !== undefined ? updatedDraft.title : reflectionDraft.title,
      activity: updatedDraft.activity !== undefined ? updatedDraft.activity : reflectionDraft.activity,
      rating: updatedDraft.rating !== undefined ? updatedDraft.rating : reflectionDraft.rating,
      text: updatedDraft.text !== undefined ? updatedDraft.text : reflectionDraft.text
    };
    setReflectionDraft(newDraft);
    await AstroRealAppLocalStorageAdapter.saveReflectionDraft(newDraft);
  };

  // Handler to clear active draft when form is reset
  const handleResetReflections = async () => {
    const clearedDraft = {
      title: "",
      activity: "",
      rating: "เหมาะสมมาก",
      text: ""
    };
    setReflectionDraft(clearedDraft);
    await AstroRealAppLocalStorageAdapter.clearReflectionDraft();
  };

  // Handler to clear history logs
  const handleClearAllHistory = async () => {
    const confirmed = window.confirm("คุณแน่ใจหรือไม่ที่จะล้างประวัติการบันทึกทั้งหมดในเครื่องนี้?");
    if (!confirmed) return;
    setHistoryLogs([]);
    await AstroRealAppLocalStorageAdapter.saveReflectionHistory([]);
  };

  // Handler to delete a single history log
  const handleDeleteHistoryItem = async (id: string) => {
    const updated = historyLogs.filter((item) => item.id !== id);
    setHistoryLogs(updated);
    await AstroRealAppLocalStorageAdapter.saveReflectionHistory(updated);
  };

  // Handler to update strategy planning notes
  const handlePlanningChange = async (updatedFields: {
    focusNext?: string;
    slowDown?: string;
    nextSmallAction?: string;
    reviewLater?: string;
  }) => {
    const updatedNotes: AstroPlanningNotes = {
      focusNext: updatedFields.focusNext !== undefined ? updatedFields.focusNext : planningNotes.focusNext,
      slowDown: updatedFields.slowDown !== undefined ? updatedFields.slowDown : planningNotes.slowDown,
      nextSmallAction: updatedFields.nextSmallAction !== undefined ? updatedFields.nextSmallAction : planningNotes.nextSmallAction,
      reviewLater: updatedFields.reviewLater !== undefined ? updatedFields.reviewLater : planningNotes.reviewLater,
      notesUpdatedAt: new Date().toLocaleDateString("en-CA") + " " + new Date().toLocaleTimeString("en-GB")
    };
    setPlanningNotes(updatedNotes);
    await AstroRealAppLocalStorageAdapter.savePlanningNotes(updatedNotes);
  };

  // Tools Handlers to Reset Individual or All preview LocalStorage namespaces safely
  const handleResetHistoryOnly = async () => {
    setHistoryLogs(MOCK_HISTORY_LOGS);
    if (typeof window !== "undefined") {
      localStorage.removeItem("astro-real-app:reflection-history:v1");
    }
  };

  const handleResetPlanningOnly = async () => {
    setPlanningNotes(MOCK_PLANNING_NOTES);
    await AstroRealAppLocalStorageAdapter.clearPlanningNotes();
  };

  const handleResetDraftOnly = async () => {
    const clearedDraft = {
      title: "",
      activity: "",
      rating: "เหมาะสมมาก",
      text: ""
    };
    setReflectionDraft(clearedDraft);
    await AstroRealAppLocalStorageAdapter.clearReflectionDraft();
  };

  const handleResetAllData = async () => {
    setHistoryLogs(MOCK_HISTORY_LOGS);
    setPlanningNotes(MOCK_PLANNING_NOTES);
    const clearedDraft = {
      title: "",
      activity: "",
      rating: "เหมาะสมมาก",
      text: ""
    };
    setReflectionDraft(clearedDraft);
    await AstroRealAppLocalStorageAdapter.clearAllPreviewData();
  };

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
                ตัวอย่างการประกอบคอมโพเนนต์แอปจริง (Composition Preview) — บันทึกข้อมูลจำลองลงเครื่องจริงได้แล้ว
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-300">
            <span className="px-2 py-0.5 rounded bg-violet-950/50 text-violet-300 border border-violet-400/20 font-bold">
              PREVIEW MODE
            </span>
            <span>•</span>
            <span>
              {!isHydrated 
                ? "กำลังเตรียมโหลดข้อมูลจากเครื่อง..." 
                : "ข้อมูลประวัติและแผนงานจะเซฟเก็บไว้ในบราวเซอร์นี้โดยอัตโนมัติ"
              }
            </span>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Tab Navigation                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-1.5 flex flex-wrap gap-1">
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
              <span className={`hidden sm:inline text-[10px] font-normal ${
                activeTab === tab.id ? "text-violet-350" : "text-slate-300"
              }`}>
                {tab.description}
              </span>
            </button>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Tab Content                                                     */}
        {/* ---------------------------------------------------------------- */}
        <div className="min-h-[400px]">
          {activeTab === "today" && (
            <AstroTodayPanel
              strategyMode={MOCK_TODAY_DATA.strategyMode}
              strategyDirection={MOCK_TODAY_DATA.strategyDirection}
              workRecommendations={MOCK_TODAY_DATA.workRecommendations}
              riskPreventions={MOCK_TODAY_DATA.riskPreventions}
              recoveryAnchors={MOCK_TODAY_DATA.recoveryAnchors}
              reflectionPrompt={MOCK_TODAY_DATA.reflectionPrompt}
            />
          )}
          {activeTab === "reflection" && (
            <AstroReflectionPanel
              reflectionPrompt={MOCK_TODAY_DATA.reflectionPrompt}
              totalReflectionsCount={isHydrated ? historyLogs.length : MOCK_HISTORY_LOGS.length}
              onSubmit={handleSubmitReflection}
              savedMessage={historySaveStatus}
              defaultTitle={isHydrated ? reflectionDraft.title : ""}
              defaultActivity={isHydrated ? reflectionDraft.activity : ""}
              defaultRating={isHydrated ? reflectionDraft.rating : "เหมาะสมมาก"}
              defaultText={isHydrated ? reflectionDraft.text : ""}
              onDraftChange={handleDraftChange}
              onResetReflections={handleResetReflections}
            />
          )}
          {activeTab === "history" && (
            <AstroReflectionHistoryPanel
              historyLogs={isHydrated ? historyLogs : MOCK_HISTORY_LOGS}
              historySaveStatus={historySaveStatus}
              onClearAllHistory={handleClearAllHistory}
              onDeleteFromHistory={handleDeleteHistoryItem}
            />
          )}
          {activeTab === "planning" && (
            <AstroStrategyPlanningPanel
              focusNext={isHydrated ? planningNotes.focusNext : MOCK_PLANNING_NOTES.focusNext}
              slowDown={isHydrated ? planningNotes.slowDown : MOCK_PLANNING_NOTES.slowDown}
              nextSmallAction={isHydrated ? planningNotes.nextSmallAction : MOCK_PLANNING_NOTES.nextSmallAction}
              reviewLater={isHydrated ? planningNotes.reviewLater : MOCK_PLANNING_NOTES.reviewLater}
              notesUpdatedAt={isHydrated ? planningNotes.notesUpdatedAt : MOCK_PLANNING_NOTES.notesUpdatedAt}
              onPlanningChange={handlePlanningChange}
            />
          )}
          {activeTab === "profile" && (
            <AstroBirthProfilePanel />
          )}
          {activeTab === "guide" && (
            <AstroGuideEthicsPanel
              quickStartItems={MOCK_GUIDE_DATA.quickStartItems}
              disclaimerItems={MOCK_GUIDE_DATA.disclaimerItems}
              timingGuideDimensions={MOCK_GUIDE_DATA.timingGuideDimensions}
              ethicalFramingText={MOCK_GUIDE_DATA.ethicalFramingText}
              reflectionUseText={MOCK_GUIDE_DATA.reflectionUseText}
              closingQuote={MOCK_GUIDE_DATA.closingQuote}
            />
          )}
          {activeTab === "tools" && (
            <AstroPreviewDataToolsPanel
              onResetHistory={handleResetHistoryOnly}
              onResetPlanning={handleResetPlanningOnly}
              onResetDraft={handleResetDraftOnly}
              onResetAll={handleResetAllData}
            />
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Preview Footer                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="border-t border-slate-700/60 pt-4 text-center space-y-1">
          <p className="text-[10px] text-slate-300">
            Astro Strategy Lab — Real App LocalStorage Preview (DEV-012)
          </p>
          <p className="text-[10px] text-slate-300">
            ข้อมูลประวัติและแผนกลยุทธ์จะถูกแยกจัดเก็บไว้ในพื้นที่เบราว์เซอร์นี้ ไม่กระทบข้อมูลการทำงานหลักของระบบเดิม
          </p>
        </div>
      </div>
    </AstroStrategyAppShell>
  );
}
