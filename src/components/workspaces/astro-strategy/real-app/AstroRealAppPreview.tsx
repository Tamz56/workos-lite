"use client";

import * as React from "react";
import { Star } from "lucide-react";

import { AstroTodayPanel } from "./components/AstroTodayPanel";
import { AstroReflectionPanel } from "./components/AstroReflectionPanel";
import { AstroReflectionHistoryPanel } from "./components/AstroReflectionHistoryPanel";
import { AstroStrategyPlanningPanel } from "./components/AstroStrategyPlanningPanel";
import { AstroGuideEthicsPanel } from "./components/AstroGuideEthicsPanel";
import { AstroPreviewDataToolsPanel } from "./components/AstroPreviewDataToolsPanel";
import { ThaiPlanetPlacementDiagnosticsSection } from "./components/diagnostics/ThaiPlanetPlacementDiagnosticsSection";
import { AstroBirthProfilePanel } from "./components/AstroBirthProfilePanel";
import { AstroStrategyAppShell } from "./AstroStrategyAppShell";

import {
  MOCK_TODAY_DATA,
  MOCK_HISTORY_LOGS,
  MOCK_PLANNING_NOTES,
  MOCK_GUIDE_DATA,
} from "./data/astroRealAppMockData";

import { AstroRealAppLocalStorageAdapter } from "./data/astroRealAppLocalStorageAdapter";
import { ReflectionHistoryItem, AstroPlanningNotes, AstroReflectionDraft, AstroEngineMetadata, AstroTodayData, AstroWeeklyTimingViewModel, AstroMonthlyReflectionViewModel, AstroOnboardingStatus, ThaiAstroStrategyOutput, ChineseMetaphysicsStrategyOutput, ThaiTransitStrategyOutput, NatalTransitStrategyComposerOutput } from "./data/astroRealAppTypes";
import { loadAstroBirthProfile } from "./data/astroRealAppBirthProfileStorageAdapter";
import { buildAstroTimingInput, buildAstroEngineOutput } from "./data/astroRealAppAstrologyEngineAdapter";
import { buildThaiAstroStrategyOutput } from "./data/astroRealAppThaiAstrologyAdapter";
import { buildThaiTransitStrategyOutput } from "./data/astroRealAppThaiTransitAdapter";
import { buildChineseMetaphysicsStrategyOutput } from "./data/astroRealAppChineseMetaphysicsAdapter";
import { buildNatalTransitStrategyComposerOutput } from "./data/astroRealAppNatalTransitStrategyComposer";
import { mapEngineOutputToTodayData } from "./data/astroRealAppTodayTimingViewModel";
import { buildWeeklyTimingViewModel } from "./data/astroRealAppWeeklyTimingViewModel";
import { AstroWeeklyPanel } from "./components/AstroWeeklyPanel";
import { buildMonthlyReflectionViewModel } from "./data/astroRealAppMonthlyReflectionViewModel";
import { AstroMonthlyPanel } from "./components/AstroMonthlyPanel";
import { AstroOnboardingPanel } from "./components/AstroOnboardingPanel";
import {
  buildAstroOnboardingStatus,
  saveOnboardingDismissedState,
  resetOnboardingDismissedStateForPreviewOnly,
  detectFirstRunSignals
} from "./data/astroRealAppOnboardingAdapter";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type PreviewTab = "today" | "weekly" | "monthly" | "reflection" | "history" | "planning" | "profile" | "guide" | "tools";

const TAB_ITEMS: { id: PreviewTab; label: string; description: string }[] = [
  { id: "today", label: "📊 สรุปวันนี้", description: "Daily Timing Brief" },
  { id: "weekly", label: "📅 สรุปสัปดาห์", description: "Weekly Timing View" },
  { id: "monthly", label: "📅 สรุปรอบเดือน", description: "Monthly Strategy" },
  { id: "reflection", label: "✍️ สะท้อนคิด", description: "Reflection Log" },
  { id: "history", label: "📋 ประวัติ", description: "Reflection History" },
  { id: "planning", label: "🎯 แผนกลยุทธ์", description: "Strategy Planning" },
  { id: "profile", label: "👤 โปรไฟล์ดวงเกิด", description: "Birth Profile" },
  { id: "guide", label: "📖 คู่มือ", description: "Guide & Ethics" },
  { id: "tools", label: "⚙️ เครื่องมือข้อมูล", description: "Data Tools" },
];

function getZodiacFromWeekday(weekday: string): string {
  const map: Record<string, string> = {
    Sunday: "leo",
    Monday: "taurus",
    Tuesday: "scorpio",
    Wednesday: "virgo",
    Thursday: "sagittarius",
    Friday: "libra",
    Saturday: "capricorn"
  };
  return map[weekday] || "aries";
}

function getBirthWeekday(birthDate: string): string {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dateObj = new Date(birthDate);
  return isNaN(dateObj.getTime()) ? "Sunday" : weekdays[dateObj.getDay()];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AstroRealAppPreview({ variant = "preview" }: { variant?: "production" | "preview" }) {
  const [activeTab, setActiveTab] = React.useState<PreviewTab>("today");

  const visibleTabs = React.useMemo(() => {
    if (variant === "production") {
      return TAB_ITEMS.filter(item => item.id !== "tools");
    }
    return TAB_ITEMS;
  }, [variant]);

  React.useEffect(() => {
    if (variant === "production" && activeTab === "tools") {
      setActiveTab("today");
    }
  }, [activeTab, variant]);

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
  
  const [onboardingStatus, setOnboardingStatus] = React.useState<AstroOnboardingStatus>({
    isFirstRun: false,
    isDismissed: true,
    detectedSignals: []
  });

  // DEV-024: Today calculation states
  const [todayData, setTodayData] = React.useState<AstroTodayData>(MOCK_TODAY_DATA);
  const [todayMetadata, setTodayMetadata] = React.useState<AstroEngineMetadata | undefined>(undefined);
  const [calculationFallbackNote, setCalculationFallbackNote] = React.useState<string | null>(null);

  // DEV-059: Thai Astrology calculation states
  const [thaiAstroContext, setThaiAstroContext] = React.useState<ThaiAstroStrategyOutput | null>(null);
  const [thaiAstroFallbackNote, setThaiAstroFallbackNote] = React.useState<string | null>(null);

  // DEV-067: Chinese Metaphysics calculation states
  const [chineseAstroContext, setChineseAstroContext] = React.useState<ChineseMetaphysicsStrategyOutput | null>(null);
  const [chineseAstroFallbackNote, setChineseAstroFallbackNote] = React.useState<string | null>(null);

  // DEV-078: Thai Transit Astrology calculation states
  const [thaiTransitContext, setThaiTransitContext] = React.useState<ThaiTransitStrategyOutput | null>(null);
  const [thaiTransitFallbackNote, setThaiTransitFallbackNote] = React.useState<string | null>(null);

  // DEV-085: Composer Strategy calculation states
  const [composerStrategyContext, setComposerStrategyContext] = React.useState<NatalTransitStrategyComposerOutput | null>(null);

  // DEV-028: Weekly calculation states
  const [weeklyData, setWeeklyData] = React.useState<AstroWeeklyTimingViewModel>({
    days: [],
    weeklyTheme: "กำลังประมวลผล...",
    metadata: {
      calculationMode: "rule-based",
      confidenceScore: 0.0,
      sourceEngine: "ArborDesk Astrology Logic v0.1",
      disclaimer: "สำหรับใช้วางแผนส่วนบุคคลและสะท้อนจังหวะชีวิตเท่านั้น"
    },
    disclaimer: "สำหรับใช้วางแผนส่วนบุคคลและสะท้อนจังหวะชีวิตเท่านั้น"
  });
  const [weeklyFallbackNote, setWeeklyFallbackNote] = React.useState<string | null>(null);

  // DEV-030: Monthly calculation states
  const [monthlyData, setMonthlyData] = React.useState<AstroMonthlyReflectionViewModel>({
    monthLabel: "กำลังประมวลผล...",
    primaryMode: "Focus & Deliver",
    secondaryMode: "Stabilize & Structure",
    monthlyTheme: "กำลังประมวลผล...",
    strategicFocus: "กำลังประมวลผล...",
    recommendedFocusAreas: [],
    riskWatch: [],
    recoveryAnchors: [],
    reflectionPatternSummary: "กำลังโหลดข้อมูล...",
    totalLogsThisMonth: 0,
    topLoggedMode: "—",
    topLoggedEnergy: "—",
    source: "engine",
    confidence: 0.0,
    generatedAt: "",
    disclaimer: "สำหรับใช้วางแผนส่วนบุคคลและสะท้อนจังหวะชีวิตเท่านั้น",
    metadata: {
      calculationMode: "rule-based",
      confidenceScore: 0.0,
      sourceEngine: "ArborDesk Monthly Strategy Engine v0.1",
      disclaimer: "สำหรับใช้วางแผนส่วนบุคคลและสะท้อนจังหวะชีวิตเท่านั้น"
    }
  });
  const [monthlyFallbackNote, setMonthlyFallbackNote] = React.useState<string | null>(null);

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

      // DEV-024, DEV-028 & DEV-030: Load birth profile and compute Today, Weekly, and Monthly Timing
      try {
        const birthProfile = loadAstroBirthProfile();
        
        // Calculate Today Timing
        const timingInput = buildAstroTimingInput(birthProfile);
        const engineOutput = buildAstroEngineOutput(timingInput);
        if (engineOutput) {
          const mappedToday = mapEngineOutputToTodayData(engineOutput);
          setTodayData(mappedToday);
          setTodayMetadata(engineOutput.metadata);
          setCalculationFallbackNote(null);
        } else {
          setTodayData(MOCK_TODAY_DATA);
          setTodayMetadata(undefined);
          setCalculationFallbackNote("ระบบไม่สามารถประมวลผลดาราศาสตร์ได้ จึงใช้อภิปรายค่าประมาณการทั่วไปแทน");
        }

        // Calculate Weekly Timing
        const weeklyVM = buildWeeklyTimingViewModel(birthProfile);
        setWeeklyData(weeklyVM);
        setWeeklyFallbackNote(null);

        // Calculate Monthly Timing
        const monthlyVM = buildMonthlyReflectionViewModel(birthProfile, loadedHistory);
        setMonthlyData(monthlyVM);
        setMonthlyFallbackNote(null);

        // Calculate Thai Astrology (DEV-059)
        let thaiAstroOutput = null;
        try {
          const clientTimeStr = new Date().toTimeString().split(" ")[0].slice(0, 5); // Format: HH:MM
          const targetDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
          thaiAstroOutput = buildThaiAstroStrategyOutput(birthProfile, targetDateStr, clientTimeStr);
          setThaiAstroContext(thaiAstroOutput);
          setThaiAstroFallbackNote(null);
        } catch (err) {
          console.error("Failed to calculate Thai astrology timing context on mount:", err);
          setThaiAstroContext(null);
          setThaiAstroFallbackNote("ระบบไม่สามารถคำนวณจังหวะเวลาไทยย่อยได้ในขณะนี้");
        }

        // Calculate Chinese Metaphysics (DEV-067)
        let chineseAstroOutput = null;
        try {
          const targetDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
          chineseAstroOutput = buildChineseMetaphysicsStrategyOutput(birthProfile, targetDateStr);
          setChineseAstroContext(chineseAstroOutput);
          setChineseAstroFallbackNote(null);
        } catch (err) {
          console.error("Failed to calculate Chinese metaphysics timing context on mount:", err);
          setChineseAstroContext(null);
          setChineseAstroFallbackNote("ระบบไม่สามารถคำนวณจังหวะธาตุและฤดูกาลจีนย่อยได้ในขณะนี้");
        }

        // Calculate Thai Transit (DEV-078)
        let transitOutput = null;
        try {
          const targetDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
          const clientTimeStr = new Date().toTimeString().split(" ")[0].slice(0, 5); // Format: HH:MM
          const weekday = birthProfile.birthWeekday || getBirthWeekday(birthProfile.birthDate);
          const natalAscendantZodiac = getZodiacFromWeekday(weekday);
          const latestLog = loadedHistory[0];
          const recentReflection = latestLog?.dailyCheckinSnapshot ? {
            energyLevel: latestLog.dailyCheckinSnapshot.energyLevel === "low" ? ("low" as const) : ("medium" as const),
            fatigueLevel: latestLog.dailyCheckinSnapshot.bodySignal === "fatigued" ? ("high" as const) : ("medium" as const)
          } : undefined;

          transitOutput = buildThaiTransitStrategyOutput({
            targetDate: targetDateStr,
            targetTime: clientTimeStr,
            timezone: birthProfile.timezone,
            natalAscendantZodiac,
            recentReflectionContext: recentReflection
          });
          setThaiTransitContext(transitOutput);
          setThaiTransitFallbackNote(null);
        } catch (err) {
          console.error("Failed to calculate Thai transit context on mount:", err);
          setThaiTransitContext(null);
          setThaiTransitFallbackNote("ระบบไม่สามารถคำนวณดวงจรไทยย่อยได้ในขณะนี้");
        }

        // Calculate Natal + Transit Strategy Composer (DEV-085)
        try {
          const targetDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
          const clientTimeStr = new Date().toTimeString().split(" ")[0].slice(0, 5); // Format: HH:MM
          const latestLog = loadedHistory[0];
          const recentReflection = latestLog?.dailyCheckinSnapshot ? {
            energyLevel: latestLog.dailyCheckinSnapshot.energyLevel === "low" ? ("low" as const) : ("medium" as const),
            fatigueLevel: latestLog.dailyCheckinSnapshot.bodySignal === "fatigued" ? ("high" as const) : ("medium" as const)
          } : undefined;

          const timingInputForComposer = buildAstroTimingInput(birthProfile);
          const engineOutputForComposer = buildAstroEngineOutput(timingInputForComposer);
          const mappedTodayForComposer = engineOutputForComposer ? mapEngineOutputToTodayData(engineOutputForComposer) : MOCK_TODAY_DATA;

          const composerOutput = buildNatalTransitStrategyComposerOutput({
            targetDate: targetDateStr,
            targetTime: clientTimeStr,
            todayTimingData: mappedTodayForComposer,
            thaiTransitContext: transitOutput,
            natalStrategyProfile: birthProfile,
            reflectionHistorySummary: {
              totalLogsThisMonth: loadedHistory.length,
              fatigueLevel: recentReflection?.fatigueLevel,
              energyLevel: recentReflection?.energyLevel
            },
            thaiAstroContext: thaiAstroOutput,
            chineseAstroContext: chineseAstroOutput,
            userEnergyState: latestLog?.dailyCheckinSnapshot ? {
              energyLevel: latestLog.dailyCheckinSnapshot.energyLevel as "low" | "steady" | "hyper" | "variable",
              bodySignal: latestLog.dailyCheckinSnapshot.bodySignal as "normal" | "fatigued" | "tense" | "refreshed"
            } : undefined
          });
          setComposerStrategyContext(composerOutput);
        } catch (err) {
          console.error("Failed to calculate Composer strategy context on mount:", err);
          setComposerStrategyContext(null);
        }
      } catch (err) {
        console.error("Failed to calculate today/weekly/monthly timing engine output on mount:", err);
        setTodayData(MOCK_TODAY_DATA);
        setTodayMetadata(undefined);
        setCalculationFallbackNote("ระบบเกิดข้อผิดพลาดในการคำนวณจังหวะดาราศาสตร์ จึงย้อนกลับไปใช้ข้อมูลประมาณการทั่วไป");
        setThaiAstroContext(null);
        setThaiAstroFallbackNote("ไม่สามารถคำนวณจังหวะเวลาไทยย่อยได้เนื่องจากข้อผิดพลาดในข้อมูลเกิด");
        setChineseAstroContext(null);
        setChineseAstroFallbackNote("ไม่สามารถคำนวณจังหวะธาตุและฤดูกาลจีนได้เนื่องจากข้อผิดพลาดในข้อมูลเกิด");
        setThaiTransitContext(null);
        setThaiTransitFallbackNote("ไม่สามารถคำนวณดวงจรไทยย่อยได้เนื่องจากข้อผิดพลาดในข้อมูลเกิด");
        setComposerStrategyContext(null);

        // Fallback Weekly calculation
        const defaultProfile = loadAstroBirthProfile();
        const weeklyFallbackVM = buildWeeklyTimingViewModel(defaultProfile, undefined, true);
        setWeeklyData(weeklyFallbackVM);
        setWeeklyFallbackNote("ระบบเกิดข้อผิดพลาดในการประมวลผลดาราศาสตร์รายสัปดาห์ จึงย้อนกลับไปใช้ข้อมูลประมาณการทั่วไป");

        // Fallback Monthly calculation
        const monthlyFallbackVM = buildMonthlyReflectionViewModel(defaultProfile, loadedHistory, true);
        setMonthlyData(monthlyFallbackVM);
        setMonthlyFallbackNote("ระบบเกิดข้อผิดพลาดในการประมวลผลดาราศาสตร์รายเดือน จึงย้อนกลับไปใช้ข้อมูลประมาณการทั่วไป");
      }

      // Load onboarding status on client mount
      const onboardingStatus = buildAstroOnboardingStatus();
      setOnboardingStatus(onboardingStatus);

      setIsHydrated(true);
    }
    loadData();
  }, []);

  // Recalculate today, weekly, and monthly timing whenever today, weekly, or monthly tab is activated to capture new birth profile settings immediately
  React.useEffect(() => {
    if (!isHydrated) return;

    if (activeTab === "today" || activeTab === "weekly" || activeTab === "monthly") {
      try {
        const birthProfile = loadAstroBirthProfile();
        
        let thaiAstroOutput = null;
        let chineseAstroOutput = null;
        let transitOutput = null;
        
        // Calculate Today Timing
        const timingInput = buildAstroTimingInput(birthProfile);
        const engineOutput = buildAstroEngineOutput(timingInput);
        let mappedToday = MOCK_TODAY_DATA;
        if (engineOutput) {
          mappedToday = mapEngineOutputToTodayData(engineOutput);
          setTodayData(mappedToday);
          setTodayMetadata(engineOutput.metadata);
          setCalculationFallbackNote(null);
        } else {
          setTodayData(MOCK_TODAY_DATA);
          setTodayMetadata(undefined);
          setCalculationFallbackNote("ระบบไม่สามารถประมวลผลดาราศาสตร์ได้ จึงใช้อภิปรายค่าประมาณการทั่วไปแทน");
        }

        // Calculate Weekly Timing
        const weeklyVM = buildWeeklyTimingViewModel(birthProfile);
        setWeeklyData(weeklyVM);
        setWeeklyFallbackNote(null);

        // Calculate Monthly Timing
        const monthlyVM = buildMonthlyReflectionViewModel(birthProfile, historyLogs);
        setMonthlyData(monthlyVM);
        setMonthlyFallbackNote(null);

        // Calculate Thai Astrology (DEV-059)
        try {
          const clientTimeStr = new Date().toTimeString().split(" ")[0].slice(0, 5); // Format: HH:MM
          const targetDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
          thaiAstroOutput = buildThaiAstroStrategyOutput(birthProfile, targetDateStr, clientTimeStr);
          setThaiAstroContext(thaiAstroOutput);
          setThaiAstroFallbackNote(null);
        } catch (err) {
          console.error("Failed to calculate Thai astrology timing context on tab active:", err);
          setThaiAstroContext(null);
          setThaiAstroFallbackNote("ระบบไม่สามารถคำนวณจังหวะเวลาไทยย่อยได้ในขณะนี้");
        }

        // Calculate Chinese Metaphysics (DEV-067)
        try {
          const targetDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
          chineseAstroOutput = buildChineseMetaphysicsStrategyOutput(birthProfile, targetDateStr);
          setChineseAstroContext(chineseAstroOutput);
          setChineseAstroFallbackNote(null);
        } catch (err) {
          console.error("Failed to calculate Chinese metaphysics timing context on tab active:", err);
          setChineseAstroContext(null);
          setChineseAstroFallbackNote("ระบบไม่สามารถคำนวณจังหวะธาตุและฤดูกาลจีนย่อยได้ในขณะนี้");
        }

        // Calculate Thai Transit (DEV-078)
        try {
          const targetDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
          const clientTimeStr = new Date().toTimeString().split(" ")[0].slice(0, 5); // Format: HH:MM
          const weekday = birthProfile.birthWeekday || getBirthWeekday(birthProfile.birthDate);
          const natalAscendantZodiac = getZodiacFromWeekday(weekday);
          const latestLog = historyLogs[0];
          const recentReflection = latestLog?.dailyCheckinSnapshot ? {
            energyLevel: latestLog.dailyCheckinSnapshot.energyLevel === "low" ? ("low" as const) : ("medium" as const),
            fatigueLevel: latestLog.dailyCheckinSnapshot.bodySignal === "fatigued" ? ("high" as const) : ("medium" as const)
          } : undefined;

          transitOutput = buildThaiTransitStrategyOutput({
            targetDate: targetDateStr,
            targetTime: clientTimeStr,
            timezone: birthProfile.timezone,
            natalAscendantZodiac,
            recentReflectionContext: recentReflection
          });
          setThaiTransitContext(transitOutput);
          setThaiTransitFallbackNote(null);
        } catch (err) {
          console.error("Failed to calculate Thai transit context on tab active:", err);
          setThaiTransitContext(null);
          setThaiTransitFallbackNote("ระบบไม่สามารถคำนวณดวงจรไทยย่อยได้ในขณะนี้");
        }

        // Calculate Natal + Transit Strategy Composer (DEV-085)
        try {
          const targetDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
          const clientTimeStr = new Date().toTimeString().split(" ")[0].slice(0, 5); // Format: HH:MM
          const latestLog = historyLogs[0];
          const recentReflection = latestLog?.dailyCheckinSnapshot ? {
            energyLevel: latestLog.dailyCheckinSnapshot.energyLevel === "low" ? ("low" as const) : ("medium" as const),
            fatigueLevel: latestLog.dailyCheckinSnapshot.bodySignal === "fatigued" ? ("high" as const) : ("medium" as const)
          } : undefined;

          const composerOutput = buildNatalTransitStrategyComposerOutput({
            targetDate: targetDateStr,
            targetTime: clientTimeStr,
            todayTimingData: mappedToday,
            thaiTransitContext: transitOutput,
            natalStrategyProfile: birthProfile,
            reflectionHistorySummary: {
              totalLogsThisMonth: historyLogs.length,
              fatigueLevel: recentReflection?.fatigueLevel,
              energyLevel: recentReflection?.energyLevel
            },
            thaiAstroContext: thaiAstroOutput,
            chineseAstroContext: chineseAstroOutput,
            userEnergyState: latestLog?.dailyCheckinSnapshot ? {
              energyLevel: latestLog.dailyCheckinSnapshot.energyLevel as "low" | "steady" | "hyper" | "variable",
              bodySignal: latestLog.dailyCheckinSnapshot.bodySignal as "normal" | "fatigued" | "tense" | "refreshed"
            } : undefined
          });
          setComposerStrategyContext(composerOutput);
        } catch (err) {
          console.error("Failed to calculate Composer strategy context on tab active:", err);
          setComposerStrategyContext(null);
        }
      } catch (err) {
        console.error("Failed to calculate timing engine output on tab active:", err);
        setTodayData(MOCK_TODAY_DATA);
        setTodayMetadata(undefined);
        setCalculationFallbackNote("ระบบเกิดข้อผิดพลาดในการคำนวณจังหวะดาราศาสตร์ จึงย้อนกลับไปใช้ข้อมูลประมาณการทั่วไป");
        setThaiAstroContext(null);
        setThaiAstroFallbackNote("ไม่สามารถคำนวณจังหวะเวลาไทยย่อยได้เนื่องจากข้อผิดพลาดในข้อมูลเกิด");
        setChineseAstroContext(null);
        setChineseAstroFallbackNote("ไม่สามารถคำนวณจังหวะธาตุและฤดูกาลจีนได้เนื่องจากข้อผิดพลาดในข้อมูลเกิด");
        setThaiTransitContext(null);
        setThaiTransitFallbackNote("ไม่สามารถคำนวณดวงจรไทยย่อยได้เนื่องจากข้อผิดพลาดในข้อมูลเกิด");
        setComposerStrategyContext(null);

        // Fallback Weekly calculation
        const defaultProfile = loadAstroBirthProfile();
        const weeklyFallbackVM = buildWeeklyTimingViewModel(defaultProfile, undefined, true);
        setWeeklyData(weeklyFallbackVM);
        setWeeklyFallbackNote("ระบบเกิดข้อผิดพลาดในการประมวลผลดาราศาสตร์รายสัปดาห์ จึงย้อนกลับไปใช้ข้อมูลประมาณการทั่วไป");

        // Fallback Monthly calculation
        const monthlyFallbackVM = buildMonthlyReflectionViewModel(defaultProfile, historyLogs, true);
        setMonthlyData(monthlyFallbackVM);
        setMonthlyFallbackNote("ระบบเกิดข้อผิดพลาดในการประมวลผลดาราศาสตร์รายเดือน จึงย้อนกลับไปใช้ข้อมูลประมาณการทั่วไป");
      }
    }
  }, [activeTab, isHydrated, historyLogs]);

  // Handler to save new reflection history entry
  const handleSubmitReflection = async (data: {
    title: string;
    activity: string;
    rating: string;
    text: string;
    date: string;
  }) => {
    const mappedMode = todayData.strategyMode === "Pause & Calibrate" ? "Pause" : todayData.strategyMode === "Stabilize & Structure" ? "Stabilize" : "Focus";

    const newItem: ReflectionHistoryItem = {
      id: "h_" + Date.now(),
      version: 1,
      createdAt: new Date().toLocaleDateString("en-CA") + " " + new Date().toLocaleTimeString("en-GB"),
      reflectionDate: data.date,
      reflectionMode: mappedMode,
      reflectionSummary: data.title,
      noticedNotes: data.text,
      nextRightAction: data.activity,
      strategyMode: todayData.strategyMode,
      dailyCheckinSnapshot: {
        energyLevel: "steady",
        clarityLevel: "clear",
        workloadPressure: "normal",
        focusCondition: "deep_focus",
        bodySignal: "normal",
        todayIntention: data.activity,
        cautionNote: ""
      },
      markdownSnapshot: "",
      timingContext: {
        mode: todayData.strategyMode,
        label: mappedMode,
        source: todayMetadata ? "engine" : "fallback",
        capturedAt: new Date().toISOString(),
        disclaimer: todayMetadata?.disclaimer || undefined
      }
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

    // Also reset onboarding state!
    resetOnboardingDismissedStateForPreviewOnly();
    setOnboardingStatus(buildAstroOnboardingStatus());

    // Recalculate timing based on default birth profile
    try {
      const defaultProfile = loadAstroBirthProfile();
      
      let thaiAstroOutput = null;
      let chineseAstroOutput = null;
      let transitOutput = null;
      
      const timingInput = buildAstroTimingInput(defaultProfile);
      const engineOutput = buildAstroEngineOutput(timingInput);
      let mappedToday = MOCK_TODAY_DATA;
      if (engineOutput) {
        mappedToday = mapEngineOutputToTodayData(engineOutput);
        setTodayData(mappedToday);
        setTodayMetadata(engineOutput.metadata);
        setCalculationFallbackNote(null);
      }
      setWeeklyData(buildWeeklyTimingViewModel(defaultProfile));
      setWeeklyFallbackNote(null);

      // Recalculate Monthly Timing (using MOCK_HISTORY_LOGS as it has just been set)
      setMonthlyData(buildMonthlyReflectionViewModel(defaultProfile, MOCK_HISTORY_LOGS));
      setMonthlyFallbackNote(null);

      // Recalculate Thai Astrology (DEV-059)
      try {
        const clientTimeStr = new Date().toTimeString().split(" ")[0].slice(0, 5); // Format: HH:MM
        const targetDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        thaiAstroOutput = buildThaiAstroStrategyOutput(defaultProfile, targetDateStr, clientTimeStr);
        setThaiAstroContext(thaiAstroOutput);
        setThaiAstroFallbackNote(null);
      } catch (err) {
        console.error("Failed to calculate Thai astrology timing context on reset all data:", err);
        setThaiAstroContext(null);
        setThaiAstroFallbackNote("ระบบไม่สามารถคำนวณจังหวะเวลาไทยย่อยได้ในขณะนี้");
      }

      // Recalculate Chinese Metaphysics (DEV-067)
      try {
        const targetDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        chineseAstroOutput = buildChineseMetaphysicsStrategyOutput(defaultProfile, targetDateStr);
        setChineseAstroContext(chineseAstroOutput);
        setChineseAstroFallbackNote(null);
      } catch (err) {
        console.error("Failed to calculate Chinese metaphysics timing context on reset all data:", err);
        setChineseAstroContext(null);
        setChineseAstroFallbackNote("ระบบไม่สามารถคำนวณจังหวะธาตุและฤดูกาลจีนย่อยได้ในขณะนี้");
      }

      // Recalculate Thai Transit (DEV-078)
      try {
        const targetDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const clientTimeStr = new Date().toTimeString().split(" ")[0].slice(0, 5); // Format: HH:MM
        const weekday = defaultProfile.birthWeekday || getBirthWeekday(defaultProfile.birthDate);
        const natalAscendantZodiac = getZodiacFromWeekday(weekday);
        const latestLog = MOCK_HISTORY_LOGS[0];
        const recentReflection = latestLog?.dailyCheckinSnapshot ? {
          energyLevel: latestLog.dailyCheckinSnapshot.energyLevel === "low" ? ("low" as const) : ("medium" as const),
          fatigueLevel: latestLog.dailyCheckinSnapshot.bodySignal === "fatigued" ? ("high" as const) : ("medium" as const)
        } : undefined;

        transitOutput = buildThaiTransitStrategyOutput({
          targetDate: targetDateStr,
          targetTime: clientTimeStr,
          timezone: defaultProfile.timezone,
          natalAscendantZodiac,
          recentReflectionContext: recentReflection
        });
        setThaiTransitContext(transitOutput);
        setThaiTransitFallbackNote(null);
      } catch (err) {
        console.error("Failed to calculate Thai transit context on reset all data:", err);
        setThaiTransitContext(null);
        setThaiTransitFallbackNote("ระบบไม่สามารถคำนวณดวงจรไทยย่อยได้ในขณะนี้");
      }

      // Recalculate Composer (DEV-085)
      try {
        const targetDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const clientTimeStr = new Date().toTimeString().split(" ")[0].slice(0, 5); // Format: HH:MM
        const latestLog = MOCK_HISTORY_LOGS[0];
        const recentReflection = latestLog?.dailyCheckinSnapshot ? {
          energyLevel: latestLog.dailyCheckinSnapshot.energyLevel === "low" ? ("low" as const) : ("medium" as const),
          fatigueLevel: latestLog.dailyCheckinSnapshot.bodySignal === "fatigued" ? ("high" as const) : ("medium" as const)
        } : undefined;

        const composerOutput = buildNatalTransitStrategyComposerOutput({
          targetDate: targetDateStr,
          targetTime: clientTimeStr,
          todayTimingData: mappedToday,
          thaiTransitContext: transitOutput,
          natalStrategyProfile: defaultProfile,
          reflectionHistorySummary: {
            totalLogsThisMonth: MOCK_HISTORY_LOGS.length,
            fatigueLevel: recentReflection?.fatigueLevel,
            energyLevel: recentReflection?.energyLevel
          },
          thaiAstroContext: thaiAstroOutput,
          chineseAstroContext: chineseAstroOutput,
          userEnergyState: latestLog?.dailyCheckinSnapshot ? {
            energyLevel: latestLog.dailyCheckinSnapshot.energyLevel as "low" | "steady" | "hyper" | "variable",
            bodySignal: latestLog.dailyCheckinSnapshot.bodySignal as "normal" | "fatigued" | "tense" | "refreshed"
          } : undefined
        });
        setComposerStrategyContext(composerOutput);
      } catch (err) {
        console.error("Failed to calculate Composer strategy context on reset all data:", err);
        setComposerStrategyContext(null);
      }
    } catch (err) {
      console.error("Failed to recalculate timing on data reset:", err);
      setThaiAstroContext(null);
      setThaiAstroFallbackNote("ไม่สามารถคำนวณจังหวะเวลาไทยย่อยได้เนื่องจากข้อผิดพลาดในข้อมูลเกิด");
      setChineseAstroContext(null);
      setChineseAstroFallbackNote("ไม่สามารถคำนวณจังหวะธาตุและฤดูกาลจีนได้เนื่องจากข้อผิดพลาดในข้อมูลเกิด");
      setThaiTransitContext(null);
      setThaiTransitFallbackNote("ไม่สามารถคำนวณดวงจรไทยย่อยได้เนื่องจากข้อผิดพลาดในข้อมูลเกิด");
      setComposerStrategyContext(null);
    }
  };

  const handleResetOnboarding = async () => {
    resetOnboardingDismissedStateForPreviewOnly();
    setOnboardingStatus(buildAstroOnboardingStatus());
  };

  const handleDismissOnboarding = () => {
    saveOnboardingDismissedState(true);
    setOnboardingStatus(prev => ({ ...prev, isDismissed: true }));
  };

  const legacyKeysExist = React.useMemo(() => {
    if (!isHydrated) return false;
    try {
      return detectFirstRunSignals().legacyKeysExist;
    } catch {
      return false;
    }
  }, [isHydrated]);

  const handleNavigateFromOnboarding = (tabId: PreviewTab) => {
    setActiveTab(tabId);
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
                {variant === "production" ? "Astro Strategy Lab" : "Astro Strategy Lab — Real App Preview"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                {variant === "production"
                  ? "ระบบวิเคราะห์จังหวะชีวิตเชิงกลยุทธ์ส่วนบุคคล — เพื่อการจดจ่อและการวางแผนงานที่มีประสิทธิภาพ"
                  : "ตัวอย่างการประกอบคอมโพเนนต์แอปจริง (Composition Preview) — บันทึกข้อมูลจำลองลงเครื่องจริงได้แล้ว"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-300">
            {variant !== "production" && (
              <>
                <span className="px-2 py-0.5 rounded bg-violet-950/50 text-violet-300 border border-violet-400/20 font-bold">
                  PREVIEW MODE
                </span>
                <span>•</span>
              </>
            )}
            <span>
              {!isHydrated 
                ? "กำลังเตรียมโหลดข้อมูลจากเครื่อง..." 
                : "ข้อมูลประวัติและแผนงานจะเซฟเก็บไว้ในบราวเซอร์นี้โดยอัตโนมัติ"
              }
            </span>
          </div>
        </div>

        {/* Onboarding Guidance Panel */}
        {isHydrated && onboardingStatus.isFirstRun && !onboardingStatus.isDismissed && (
          <AstroOnboardingPanel
            onDismiss={handleDismissOnboarding}
            onNavigateToTab={handleNavigateFromOnboarding}
            legacyKeysExist={legacyKeysExist}
            showDataTools={variant !== "production"}
          />
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Tab Navigation                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-slate-900/70 border border-slate-700/80 rounded-xl p-1.5 flex flex-wrap gap-1">
          {visibleTabs.map((tab) => (
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
              strategyMode={isHydrated ? todayData.strategyMode : MOCK_TODAY_DATA.strategyMode}
              strategyDirection={isHydrated ? todayData.strategyDirection : MOCK_TODAY_DATA.strategyDirection}
              workRecommendations={isHydrated ? todayData.workRecommendations : MOCK_TODAY_DATA.workRecommendations}
              riskPreventions={isHydrated ? todayData.riskPreventions : MOCK_TODAY_DATA.riskPreventions}
              recoveryAnchors={isHydrated ? todayData.recoveryAnchors : MOCK_TODAY_DATA.recoveryAnchors}
              reflectionPrompt={isHydrated ? todayData.reflectionPrompt : MOCK_TODAY_DATA.reflectionPrompt}
              engineMetadata={isHydrated ? todayMetadata : undefined}
              fallbackNote={isHydrated ? calculationFallbackNote : null}
              thaiAstroContext={isHydrated ? thaiAstroContext : null}
              thaiAstroFallbackNote={isHydrated ? thaiAstroFallbackNote : null}
              chineseAstroContext={isHydrated ? chineseAstroContext : null}
              chineseAstroFallbackNote={isHydrated ? chineseAstroFallbackNote : null}
              thaiTransitContext={isHydrated ? thaiTransitContext : null}
              thaiTransitFallbackNote={isHydrated ? thaiTransitFallbackNote : null}
              composerStrategyContext={isHydrated ? composerStrategyContext : null}
              showComposerStrategySummary={true}
            />
          )}
          {activeTab === "weekly" && (
            <AstroWeeklyPanel
              weeklyData={isHydrated ? weeklyData : {
                days: [],
                weeklyTheme: "กำลังโหลดข้อมูล...",
                metadata: {
                  calculationMode: "rule-based",
                  confidenceScore: 0,
                  sourceEngine: "ArborDesk Astrology Logic v0.1",
                  disclaimer: "สำหรับใช้วางแผนส่วนบุคคลและสะท้อนจังหวะชีวิตเท่านั้น"
                },
                disclaimer: "สำหรับใช้วางแผนส่วนบุคคลและสะท้อนจังหวะชีวิตเท่านั้น"
              }}
              fallbackNote={isHydrated ? weeklyFallbackNote : null}
            />
          )}
          {activeTab === "monthly" && (
            <AstroMonthlyPanel
              monthlyData={isHydrated ? monthlyData : {
                monthLabel: "กำลังโหลดข้อมูล...",
                primaryMode: "Focus & Deliver",
                secondaryMode: "Stabilize & Structure",
                monthlyTheme: "กำลังโหลดข้อมูล...",
                strategicFocus: "กำลังโหลดข้อมูล...",
                recommendedFocusAreas: [],
                riskWatch: [],
                recoveryAnchors: [],
                reflectionPatternSummary: "กำลังโหลดข้อมูล...",
                totalLogsThisMonth: 0,
                topLoggedMode: "—",
                topLoggedEnergy: "—",
                source: "engine",
                confidence: 0.0,
                generatedAt: "",
                disclaimer: "สำหรับใช้วางแผนส่วนบุคคลและสะท้อนจังหวะชีวิตเท่านั้น",
                metadata: {
                  calculationMode: "rule-based",
                  confidenceScore: 0.0,
                  sourceEngine: "ArborDesk Monthly Strategy Engine v0.1",
                  disclaimer: "สำหรับใช้วางแผนส่วนบุคคลและสะท้อนจังหวะชีวิตเท่านั้น"
                }
              }}
              fallbackNote={isHydrated ? monthlyFallbackNote : null}
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
          {activeTab === "tools" && variant !== "production" && (
            <div className="space-y-6">
              <AstroPreviewDataToolsPanel
                onResetHistory={handleResetHistoryOnly}
                onResetPlanning={handleResetPlanningOnly}
                onResetDraft={handleResetDraftOnly}
                onResetAll={handleResetAllData}
                onResetOnboarding={handleResetOnboarding}
              />
              <ThaiPlanetPlacementDiagnosticsSection variant={variant} />
            </div>
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
