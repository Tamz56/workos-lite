"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Compass,
  FileClock,
  MessageSquarePlus,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

import { AstroStrategyAppShell } from "./AstroStrategyAppShell";
import { AstroRealAppLocalStorageAdapter } from "./data/astroRealAppLocalStorageAdapter";
import { MOCK_PLANNING_NOTES, MOCK_TODAY_DATA } from "./data/astroRealAppMockData";
import { loadAstroBirthProfile } from "./data/astroRealAppBirthProfileStorageAdapter";
import {
  buildAstroEngineOutput,
  buildAstroTimingInput,
} from "./data/astroRealAppAstrologyEngineAdapter";
import { mapEngineOutputToTodayData } from "./data/astroRealAppTodayTimingViewModel";
import type {
  AstroEngineMetadata,
  AstroPlanningNotes,
  AstroTodayData,
} from "./data/astroRealAppTypes";

const CONTEXT_EVENTS_KEY = "astro-real-app:now-context-events:v0";
const CONTEXT_EVENTS_VERSION = 1;
const MAX_VISIBLE_CONTEXT_EVENTS = 3;

type AstroNowContextEvent = {
  id: string;
  originalStory: string;
  occurredAt: string;
  sourceType: "human-reported";
};

type PersistedContextEvents = {
  version: number;
  updatedAt: string;
  data: AstroNowContextEvent[];
};

function loadContextEvents(): AstroNowContextEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(CONTEXT_EVENTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as PersistedContextEvents | AstroNowContextEvent[];
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.data && Array.isArray(parsed.data)) return parsed.data;
    return [];
  } catch (error) {
    console.error("AstroNowV0: Failed to load context events.", error);
    return [];
  }
}

function saveContextEvents(events: AstroNowContextEvent[]): void {
  if (typeof window === "undefined") return;

  try {
    const payload: PersistedContextEvents = {
      version: CONTEXT_EVENTS_VERSION,
      updatedAt: new Date().toISOString(),
      data: events,
    };
    localStorage.setItem(CONTEXT_EVENTS_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("AstroNowV0: Failed to save context events.", error);
  }
}

function normalizeRecommendation(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function formatThaiDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

function formatEventTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  try {
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function AstroNowV0() {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [todayData, setTodayData] = React.useState<AstroTodayData>(MOCK_TODAY_DATA);
  const [engineMetadata, setEngineMetadata] = React.useState<AstroEngineMetadata | undefined>();
  const [planningNotes, setPlanningNotes] = React.useState<AstroPlanningNotes>(MOCK_PLANNING_NOTES);
  const [contextEvents, setContextEvents] = React.useState<AstroNowContextEvent[]>([]);
  const [contextDraft, setContextDraft] = React.useState("");
  const [contextSaveMessage, setContextSaveMessage] = React.useState("");
  const [currentDateLabel, setCurrentDateLabel] = React.useState("วันนี้");

  React.useEffect(() => {
    async function hydrateNow() {
      setCurrentDateLabel(formatThaiDate(new Date()));
      setContextEvents(loadContextEvents());

      try {
        const loadedPlanning = await AstroRealAppLocalStorageAdapter.loadPlanningNotes();
        setPlanningNotes(loadedPlanning);
      } catch (error) {
        console.error("AstroNowV0: Failed to load planning notes.", error);
        setPlanningNotes(MOCK_PLANNING_NOTES);
      }

      try {
        const birthProfile = loadAstroBirthProfile();
        const timingInput = buildAstroTimingInput(birthProfile);
        const engineOutput = buildAstroEngineOutput(timingInput);

        if (engineOutput) {
          setTodayData(mapEngineOutputToTodayData(engineOutput));
          setEngineMetadata(engineOutput.metadata);
        } else {
          setTodayData(MOCK_TODAY_DATA);
          setEngineMetadata(undefined);
        }
      } catch (error) {
        console.error("AstroNowV0: Failed to build current strategy context.", error);
        setTodayData(MOCK_TODAY_DATA);
        setEngineMetadata(undefined);
      }

      setIsHydrated(true);
    }

    hydrateNow();
  }, []);

  const priorityItems = React.useMemo(() => {
    const firstRecommendation = todayData.workRecommendations?.[0] ?? "เลือกงานสำคัญหนึ่งเรื่องและปิด checkpoint ให้ชัด";
    const secondRecommendation = todayData.workRecommendations?.[1] ?? "เดินทีละขั้นและรักษาขอบเขตงาน";
    const firstRisk = todayData.riskPreventions?.[0] ?? "หลีกเลี่ยงการเปิดงานใหม่มากเกินไปพร้อมกัน";

    return [
      {
        signal: "MOVE",
        label: "Focus Next",
        text: normalizeRecommendation(planningNotes.focusNext, firstRecommendation),
        tone: "emerald",
      },
      {
        signal: "CONTINUE",
        label: "Next Small Action",
        text: normalizeRecommendation(planningNotes.nextSmallAction, secondRecommendation),
        tone: "sky",
      },
      {
        signal: "SLOW / PROTECT",
        label: "Protect Focus",
        text: normalizeRecommendation(planningNotes.slowDown, firstRisk),
        tone: "amber",
      },
    ];
  }, [planningNotes, todayData]);

  const watchItems = React.useMemo(() => {
    const source = todayData.riskPreventions?.length
      ? todayData.riskPreventions
      : ["ยังไม่มี risk signal ที่ชัดเจนจากข้อมูลปัจจุบัน"];
    return source.slice(0, 3);
  }, [todayData.riskPreventions]);

  const currentClose = normalizeRecommendation(
    planningNotes.nextSmallAction,
    todayData.workRecommendations?.[0] ?? "ปิดหนึ่งงานสำคัญให้เป็น checkpoint ก่อนเปิดงานใหม่",
  );

  const upcomingReview = normalizeRecommendation(
    planningNotes.reviewLater,
    "ยังไม่มี review trigger ที่ระบุไว้ — เพิ่มเมื่อมีเหตุการณ์หรือจังหวะที่ต้องกลับมาทบทวน",
  );

  const handleAddContext = () => {
    const originalStory = contextDraft.trim();
    if (!originalStory) return;

    const newEvent: AstroNowContextEvent = {
      id: `context-${Date.now()}`,
      originalStory,
      occurredAt: new Date().toISOString(),
      sourceType: "human-reported",
    };

    const updated = [newEvent, ...contextEvents].slice(0, 50);
    setContextEvents(updated);
    saveContextEvents(updated);
    setContextDraft("");
    setContextSaveMessage("บันทึกเรื่องราวแล้ว — เก็บเป็น Human-reported context โดยยังไม่เปลี่ยน Project authority");
    window.setTimeout(() => setContextSaveMessage(""), 4500);
  };

  return (
    <AstroStrategyAppShell>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="space-y-5">
          <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                <Sparkles className="h-4 w-4" />
                Astro Strategy · NOW V0
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">NOW</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
                ภาพรวมเชิงยุทธศาสตร์สำหรับวันนี้และช่วงนี้ — ดูสิ่งที่ควรเดิน สิ่งที่ควรชะลอ และบริบทที่เปลี่ยนไป
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-slate-300">
                {currentDateLabel}
              </span>
              <span className="rounded-full border border-violet-500/30 bg-violet-950/30 px-3 py-1.5 font-semibold text-violet-200">
                MANUAL-FIRST
              </span>
            </div>
          </header>

          <section className="grid gap-4 lg:grid-cols-[1.45fr_0.75fr]">
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-violet-500/25 bg-violet-950/40 p-2.5 text-violet-300">
                  <Compass className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Current Strategic Posture</p>
                  <h2 className="text-xl font-bold text-slate-100 sm:text-2xl">{todayData.strategyMode}</h2>
                  <p className="text-sm leading-relaxed text-slate-300">{todayData.strategyDirection}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Currentness / Trust
              </div>
              <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-400">
                <p>{isHydrated ? "ข้อมูลใน browser โหลดแล้ว" : "กำลังโหลดข้อมูลใน browser..."}</p>
                <p>
                  Astro source: {engineMetadata?.calculationMode ?? "fallback / existing rule-based brief"}
                </p>
                <p>เรื่องราวที่เพิ่มใน NOW ยังไม่เปลี่ยน WorkOS Project state หรือ Human Decision อัตโนมัติ</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-sky-500/25 bg-sky-950/30 p-2.5 text-sky-300">
                <MessageSquarePlus className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-100">มีอะไรเกิดขึ้นหรือเปลี่ยนไปไหม?</h2>
                <p className="mt-1 text-sm text-slate-400">
                  เล่าเหตุการณ์ใหม่ ความคืบหน้า ปัญหา โอกาส เรื่องเงิน คนร่วมงาน หรือข้อจำกัดที่เพิ่งเกิดขึ้นได้ตามภาษาธรรมชาติ
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <textarea
                value={contextDraft}
                onChange={(event) => setContextDraft(event.target.value)}
                placeholder="เช่น วันนี้ลูกค้าขอดู demo แต่ยังไม่ได้คุยราคา และสัปดาห์นี้ผมมีเวลาน้อยลง..."
                rows={4}
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/75 px-4 py-3 text-sm leading-relaxed text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">ระบบจะเก็บข้อความต้นฉบับไว้เป็น Human-reported context ก่อนการตีความ</p>
                <button
                  type="button"
                  onClick={handleAddContext}
                  disabled={!contextDraft.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  บันทึกเรื่องราว
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {contextSaveMessage && <p className="text-xs font-medium text-emerald-300">{contextSaveMessage}</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-100">What Changed</h2>
                <p className="mt-1 text-sm text-slate-400">เหตุการณ์ล่าสุดที่คุณบันทึก ซึ่งอาจมีผลต่อการวิเคราะห์รอบถัดไป</p>
              </div>
              <FileClock className="h-5 w-5 text-slate-500" />
            </div>

            <div className="mt-4 space-y-3">
              {contextEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-6 text-center text-sm text-slate-500">
                  ยังไม่มี Context Event ใหม่ใน NOW V0
                </div>
              ) : (
                contextEvents.slice(0, MAX_VISIBLE_CONTEXT_EVENTS).map((event) => (
                  <article key={event.id} className="rounded-xl border border-slate-700/80 bg-slate-950/55 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-full border border-sky-500/20 bg-sky-950/30 px-2 py-0.5 font-semibold text-sky-300">
                        HUMAN-REPORTED
                      </span>
                      <span className="text-slate-500">{formatEventTimestamp(event.occurredAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{event.originalStory}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Current Priorities</h2>
                <p className="mt-1 text-sm text-slate-400">V0 ใช้ Planning Notes เดิม + Current Astro brief โดยยังไม่อ้างว่าเป็น Project authority</p>
              </div>
              <Target className="h-5 w-5 text-slate-500" />
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {priorityItems.map((item) => {
                const toneClass =
                  item.tone === "emerald"
                    ? "border-emerald-500/25 text-emerald-300"
                    : item.tone === "sky"
                      ? "border-sky-500/25 text-sky-300"
                      : "border-amber-500/25 text-amber-300";

                return (
                  <article key={item.label} className="rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5">
                    <span className={`inline-flex rounded-full border bg-slate-950/50 px-2.5 py-1 text-[11px] font-bold ${toneClass}`}>
                      {item.signal}
                    </span>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-200">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-base font-bold text-slate-100">
                <CalendarClock className="h-5 w-5 text-violet-300" />
                Upcoming / Review
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{upcomingReview}</p>
              <p className="mt-3 text-xs text-slate-500">V0 ไม่สร้างวันที่ Astro Timing ใหม่เอง หากยังไม่มี timing basis ที่ชัดเจน</p>
            </div>

            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5 sm:p-6">
              <div className="flex items-center gap-2 text-base font-bold text-slate-100">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                Watch
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {watchItems.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/25 via-slate-900/75 to-slate-900/75 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-base font-bold text-slate-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Current Close
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">{currentClose}</p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-3 text-xs leading-relaxed text-slate-400 sm:max-w-xs">
                เป้าหมายคือปิดหนึ่งเงื่อนไขที่มีความหมาย ไม่ใช่เติมรายการ To-do ให้ครบ
              </div>
            </div>
          </section>

          <footer className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-[11px] leading-relaxed text-slate-500">
            NOW V0 เป็น bounded implementation สำหรับทดสอบ Product flow เท่านั้น: Context Event ที่เพิ่มเข้ามายังไม่ rerun governed calculation, ไม่แก้ WorkOS Project state และไม่สร้าง Human Decision อัตโนมัติ
          </footer>
        </div>
      </main>
    </AstroStrategyAppShell>
  );
}
