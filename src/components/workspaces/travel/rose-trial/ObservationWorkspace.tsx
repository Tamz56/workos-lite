"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Clock3, Info, Sprout } from "lucide-react";
import { loadObservationStore } from "./observationStorage";
import type {
  RoseTrialObservationStoreV1,
  RoseTrialObservationValidationIssue,
} from "./observationTypes";
import type { PilotStartRecord, Treatment, TrialSample } from "./types";
import { ObservationTimeline } from "./ObservationTimeline";
import {
  createObservationReferenceContext,
  type ObservationReferenceContextResult,
} from "./observationReferenceContext";
import { formatObservationDate, summarizeObservations } from "./observationPresentation";

type ObservationWorkspaceFailureStatus =
  | "malformed_json"
  | "unsupported_version"
  | "invalid_envelope"
  | "storage_unavailable";

export type ObservationWorkspaceLoadState =
  | { kind: "loading" }
  | {
      kind: "empty" | "valid" | "partial";
      store: RoseTrialObservationStoreV1;
      warnings: readonly RoseTrialObservationValidationIssue[];
    }
  | {
      kind: "failed";
      status: ObservationWorkspaceFailureStatus;
    };

interface ObservationWorkspaceProps {
  pilotStart: PilotStartRecord;
  treatments: readonly Treatment[];
  samples: readonly TrialSample[];
}

interface ObservationWorkspaceViewProps {
  referenceContext: ObservationReferenceContextResult;
  loadState: ObservationWorkspaceLoadState;
}

const FAILED_STATE_COPY: Record<ObservationWorkspaceFailureStatus, string> = {
  malformed_json: "ข้อมูล Observation อ่านไม่ได้ เนื่องจากรูปแบบข้อมูลไม่สมบูรณ์",
  unsupported_version: "ข้อมูล Observation เป็นเวอร์ชันที่หน้านี้ยังไม่รองรับ",
  invalid_envelope: "โครงสร้างข้อมูล Observation ไม่สมบูรณ์",
  storage_unavailable: "ไม่สามารถอ่านพื้นที่จัดเก็บ Observation บนอุปกรณ์นี้ได้",
};

export function ObservationWorkspace({
  pilotStart,
  treatments,
  samples,
}: ObservationWorkspaceProps) {
  const referenceContext = useMemo(
    () => createObservationReferenceContext(pilotStart, treatments, samples),
    [pilotStart, samples, treatments]
  );
  const [loadState, setLoadState] = useState<ObservationWorkspaceLoadState>({ kind: "loading" });

  useEffect(() => {
    if (!referenceContext.ok) return;

    setLoadState({ kind: "loading" });
    const result = loadObservationStore(referenceContext.validationContext);
    if (!result.ok) {
      setLoadState({ kind: "failed", status: result.status });
      return;
    }
    setLoadState({
      kind: result.status,
      store: result.value,
      warnings: result.warnings,
    });
  }, [referenceContext]);

  return (
    <ObservationWorkspaceView
      referenceContext={referenceContext}
      loadState={loadState}
    />
  );
}

export function ObservationWorkspaceView({
  referenceContext,
  loadState,
}: ObservationWorkspaceViewProps) {
  if (!referenceContext.ok) {
    return (
      <section className="min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20 sm:p-6" role="status">
        <div className="flex min-w-0 items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <h2 className="break-words text-base font-black text-amber-900 dark:text-amber-100">
              ยังไม่เปิดพื้นที่บันทึกการสังเกต
            </h2>
            <p className="mt-1 break-words text-sm leading-relaxed text-amber-800 dark:text-amber-200">
              {referenceContext.message}
            </p>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              ระบบจะไม่สร้างหรือเดา Batch ID และยังไม่อ่าน Observation storage ในสถานะนี้
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (loadState.kind === "loading") {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 text-center dark:border-neutral-800 dark:bg-neutral-950" role="status">
        <Clock3 className="mx-auto h-6 w-6 animate-pulse text-rose-500" />
        <h2 className="mt-3 font-black text-neutral-900 dark:text-white">กำลังอ่านบันทึกการสังเกต</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">อ่านข้อมูลหลังหน้าเว็บพร้อมใช้งาน โดยไม่เขียนทับข้อมูลเดิม</p>
      </section>
    );
  }

  if (loadState.kind === "failed") {
    return (
      <section className="min-w-0 rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900/50 dark:bg-rose-950/20 sm:p-6" role="alert">
        <div className="flex min-w-0 items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="min-w-0">
            <h2 className="break-words text-base font-black text-rose-900 dark:text-rose-100">เปิดข้อมูล Observation ไม่สำเร็จ</h2>
            <p className="mt-1 break-words text-sm leading-relaxed text-rose-800 dark:text-rose-200">
              {FAILED_STATE_COPY[loadState.status]}
            </p>
            <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">ข้อมูลเดิมยังไม่ถูกลบ ซ่อม หรือเขียนทับ</p>
          </div>
        </div>
      </section>
    );
  }

  const observations = loadState.store.observations;
  const summary = summarizeObservations(observations);

  return (
    <div className="min-w-0 space-y-6">
      <section className="min-w-0 space-y-4" aria-labelledby="observation-dashboard-heading">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider text-rose-500">Observation Workspace</p>
          <h2 id="observation-dashboard-heading" className="mt-1 break-words text-xl font-black text-neutral-900 dark:text-white">
            บันทึกการสังเกต
          </h2>
          <p className="mt-1 break-words text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            หลักฐานตามวันของ Batch นี้ แยกสิ่งที่สังเกตเห็นออกจากข้อสังเกตหรือการตีความ
          </p>
        </div>

        {referenceContext.warnings.length > 0 && (
          <div role="status" className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
            {referenceContext.warnings.map((warning) => (
              <p key={`${warning.code}-${warning.treatmentCode}`} className="flex min-w-0 items-start gap-2 break-words">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {warning.message}
              </p>
            ))}
          </div>
        )}

        {loadState.kind === "partial" && (
          <div role="status" className="flex min-w-0 items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="break-words">พบข้อมูลบางรายการที่อ่านได้ไม่สมบูรณ์ ระบบยังไม่เขียนทับข้อมูลเดิม</p>
          </div>
        )}

        <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <DashboardMetric label="Observation ทั้งหมด" value={summary.total} />
          <DashboardMetric label="ทั้ง Batch" value={summary.batch} />
          <DashboardMetric label="กลุ่มทดลอง" value={summary.treatment} />
          <DashboardMetric label="กิ่งชำ" value={summary.sample} />
          <DashboardMetric label="ยังต้องติดตาม" value={summary.followUp} />
          <DashboardMetric label="Samples ที่มีบันทึก" value={summary.observedSamples} />
          <DashboardMetric label="สังเกตล่าสุด" value={formatObservationDate(summary.latestObservedAt)} compact />
        </div>
      </section>

      {observations.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center dark:border-neutral-700 dark:bg-neutral-900/40 sm:p-8">
          <ClipboardList className="mx-auto h-8 w-8 text-rose-400" />
          <h3 className="mt-3 font-black text-neutral-800 dark:text-neutral-100">ยังไม่มีบันทึกการสังเกต</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            การบันทึกตาม Trial Day ช่วยเก็บหลักฐานของ Batch กลุ่มทดลอง และกิ่งชำไว้ตามเวลาที่สังเกตจริง
          </p>
          <p className="mt-3 text-xs font-bold text-neutral-400">การเพิ่มบันทึกจะเปิดในขั้นถัดไป</p>
        </section>
      ) : (
        <ObservationTimeline
          observations={observations}
          warnings={loadState.warnings}
          validationContext={referenceContext.validationContext}
          treatments={referenceContext.treatments}
          samples={referenceContext.samples}
        />
      )}

      <div className="flex min-w-0 items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold leading-relaxed text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
        <Sprout className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="break-words">พื้นที่นี้แสดงข้อมูลแบบอ่านอย่างเดียว การเปิดแท็บ กรองข้อมูล หรือเปิดรายละเอียดจะไม่บันทึกข้อมูลใหม่</p>
      </div>
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-4">
      <p className={`break-words font-black text-neutral-900 dark:text-white ${compact ? "text-sm leading-snug" : "text-2xl"}`}>{value}</p>
      <p className="mt-1 break-words text-[11px] font-bold leading-snug text-neutral-500 dark:text-neutral-400">{label}</p>
    </div>
  );
}
