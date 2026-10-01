"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Layers3,
  PauseCircle,
  ShieldCheck,
} from "lucide-react";

import { AstroRealAppLocalStorageAdapter } from "./data/astroRealAppLocalStorageAdapter";
import { MOCK_PLANNING_NOTES } from "./data/astroRealAppMockData";
import type { AstroPlanningNotes } from "./data/astroRealAppTypes";

function normalize(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function AstroNowDashboardEvidenceLayer() {
  const [planningNotes, setPlanningNotes] = React.useState<AstroPlanningNotes>(MOCK_PLANNING_NOTES);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    async function hydrate() {
      try {
        const loaded = await AstroRealAppLocalStorageAdapter.loadPlanningNotes();
        setPlanningNotes(loaded);
      } catch (error) {
        console.error("AstroNowDashboardEvidenceLayer: Failed to load planning notes.", error);
        setPlanningNotes(MOCK_PLANNING_NOTES);
      } finally {
        setIsHydrated(true);
      }
    }

    hydrate();
  }, []);

  const guidance = {
    doNow: normalize(
      planningNotes.focusNext,
      "เลือกหนึ่งเรื่องที่มี leverage สูงที่สุด แล้วกำหนด next action ที่ปิดเป็น checkpoint ได้",
    ),
    nextAction: normalize(
      planningNotes.nextSmallAction,
      "เดินหนึ่ง bounded next step ก่อนเปิด commitment ใหม่",
    ),
    doNot: normalize(
      planningNotes.slowDown,
      "อย่าขยายหลายเรื่องพร้อมกันเมื่อยังไม่มีหลักฐานหรือ authority รองรับ",
    ),
    review: normalize(
      planningNotes.reviewLater,
      "กลับมาทบทวนเมื่อมี Project evidence, Human decision หรือ timing basis ใหม่",
    ),
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="space-y-5 border-t border-slate-800/80 pt-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Layers3 className="h-4 w-4" />
              Dashboard alignment layer
            </div>
            <h2 className="mt-1 text-xl font-bold text-slate-100">Project Motion + Selected Guidance</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
              เพิ่มจาก Human-validated Daily Dashboard โดยยังคง fail-closed เมื่อ App ยังไม่มี live Portfolio source ที่เชื่อถือได้
            </p>
          </div>
          <span className="self-start rounded-full border border-amber-500/20 bg-amber-950/25 px-3 py-1 text-[11px] font-semibold text-amber-200 sm:self-auto">
            PORTFOLIO SOURCE NOT CONNECTED
          </span>
        </div>

        <section className="rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-base font-bold text-slate-100">
                <Eye className="h-5 w-5 text-sky-300" />
                Project Motion
              </div>
              <p className="mt-1 text-sm text-slate-400">Portfolio attention map — V0 fail-closed state</p>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[10px] font-semibold text-slate-400">
              REAL-WORLD SOURCE REQUIRED
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-slate-700/80 bg-slate-950/55 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                MOVE / CONTINUE
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                ยังไม่แสดงชื่อ Project จนกว่าจะมี Portfolio/WorkOS context ที่ current และ governed สำหรับหน้าจอนี้
              </p>
            </article>

            <article className="rounded-xl border border-slate-700/80 bg-slate-950/55 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <PauseCircle className="h-4 w-4 text-amber-400" />
                SLOW / HOLD
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Human HOLD, Gate, dependency และ real-world constraint ต้องมาก่อน Astro momentum เสมอ
              </p>
            </article>

            <article className="rounded-xl border border-slate-700/80 bg-slate-950/55 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <AlertCircle className="h-4 w-4 text-violet-300" />
                WHY PRIORITY CHANGED
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                เมื่อเชื่อม source แล้ว การเปลี่ยน motion ต้องอธิบายว่าเปลี่ยนเพราะ evidence, context, Human decision หรือ timing basis ใด
              </p>
            </article>
          </div>

          <div className="mt-4 rounded-xl border border-sky-500/15 bg-sky-950/15 px-4 py-3 text-xs leading-relaxed text-slate-400">
            V0 ตั้งใจไม่ hard-code Project status จาก Dashboard Chat ลงใน App เพราะค่าดังกล่าวเปลี่ยนตามเวลาและต้องมี current source ก่อนจึงจะแสดงเป็นข้อเท็จจริงได้
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <details className="group rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5 sm:p-6">
            <summary className="cursor-pointer list-none text-base font-bold text-slate-100">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  Attention / Trust Rules
                </span>
                <span className="text-xs font-normal text-slate-500 group-open:hidden">ดูหลักการ</span>
                <span className="hidden text-xs font-normal text-slate-500 group-open:inline">ซ่อน</span>
              </div>
            </summary>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
              <li><strong className="text-slate-100">1. Facts first.</strong> Project facts, Human constraint และ authority มาก่อน Astro signal</li>
              <li><strong className="text-slate-100">2. No fake timing.</strong> ถ้าไม่มี governed timing basis ให้แสดงว่าไม่มี แทนการสร้างวันหรือ window เอง</li>
              <li><strong className="text-slate-100">3. Human decides.</strong> Guidance ไม่สร้าง Human Decision และไม่เปลี่ยน Project state อัตโนมัติ</li>
              <li><strong className="text-slate-100">4. Explain change.</strong> ถ้า priority เปลี่ยน ต้องบอก What Changed และ Why Priority Changed</li>
            </ol>
          </details>

          <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/20 via-slate-900/75 to-slate-900/75 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">Selected Guidance</h3>
                <p className="mt-1 text-sm text-slate-400">ใช้ Planning Notes เดิมเป็น manual guidance surface</p>
              </div>
              <span className="rounded-full border border-violet-500/20 bg-violet-950/30 px-2.5 py-1 text-[10px] font-semibold text-violet-200">
                {isHydrated ? "LOCAL CONTEXT LOADED" : "LOADING"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <article className="rounded-xl border border-emerald-500/20 bg-slate-950/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">Do now</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">{guidance.doNow}</p>
                <p className="mt-3 border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-500">Next: {guidance.nextAction}</p>
              </article>

              <article className="rounded-xl border border-rose-500/20 bg-slate-950/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-300">Do not</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">{guidance.doNot}</p>
              </article>

              <article className="rounded-xl border border-sky-500/20 bg-slate-950/50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-300">Next review</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">{guidance.review}</p>
              </article>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
              Confidence ใน V0 นี้สะท้อน maturity ของ source: Planning Notes = manual context; Project Motion = not connected; Calculation Runtime = not activated.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
