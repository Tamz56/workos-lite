"use client";

import { useId, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, FlaskConical } from "lucide-react";
import {
  getSampleFieldValidation,
  isValidCuttingLengthInput,
  isValidNodeCountInput,
  SAMPLE_CONDITION_LABELS,
  SAMPLE_STATUS_LABELS,
  summarizeSamplePreparation,
  type SamplePreparationPatch,
} from "./samplePreparation";
import type {
  PilotGroupConfig,
  ReadinessSectionStatus,
  RootingMedium,
  SampleInitialCondition,
  TreatmentRole,
  TrialSample,
} from "./types";

interface SamplePreparationSectionProps {
  groupConfig: PilotGroupConfig[];
  samples: TrialSample[];
  sectionStatus: ReadinessSectionStatus;
  onUpdateSample: (sampleId: string, patch: SamplePreparationPatch) => void;
}

const SECTION_STATUS_LABELS: Record<ReadinessSectionStatus, string> = {
  pending: "ยังไม่เริ่ม",
  blocked: "ยังต้องเตรียมตัวอย่าง",
  warning: "พร้อม โดยมีสิ่งที่ควรสังเกต",
  ready: "ตัวอย่างพร้อมครบแล้ว",
};

const MEDIUM_LABELS: Record<RootingMedium, string> = {
  water: "ระบบชำในน้ำ",
  peat_moss: "ระบบชำในพีทมอส",
};

const TREATMENT_LABELS: Record<TreatmentRole, string> = {
  control: "Control",
  treatment: "Clonex",
};

const INPUT_CLASS = "w-full min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200";

function SampleCard({
  group,
  sample,
  onUpdate,
}: {
  group: PilotGroupConfig;
  sample: TrialSample;
  onUpdate: (patch: SamplePreparationPatch) => void;
}) {
  const reactId = useId();
  const [expanded, setExpanded] = useState(false);
  const validation = getSampleFieldValidation(sample);
  const condition = sample.baseline.initialCondition === "observe" ||
    sample.baseline.initialCondition === "unsuitable"
    ? sample.baseline.initialCondition
    : "normal";
  const fieldId = (field: string) => `${sample.id}-${field}`;
  const detailsId = `${reactId}-${sample.id}-details`;
  const hasFieldError = Boolean(validation.cuttingLengthError || validation.nodeCountError);
  const validationLabel = hasFieldError || condition === "unsuitable"
    ? "ต้องแก้ข้อมูล"
    : condition === "observe"
      ? "ควรสังเกต"
      : "ข้อมูลปกติ";

  return (
    <article className="min-w-0 rounded-xl border border-emerald-100 bg-white dark:border-emerald-950/70 dark:bg-neutral-950">
      <div className="flex min-w-0 flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="break-words font-mono text-sm font-black text-neutral-900 dark:text-white">{sample.id}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              sample.status === "ready"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : sample.status === "excluded"
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}>
              {sample.status === "replaced" ? "ข้อมูลเดิมต้องตรวจ" : SAMPLE_STATUS_LABELS[sample.status]}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              hasFieldError || condition === "unsuitable"
                ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                : condition === "observe"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
            }`}>
              {validationLabel}
            </span>
          </div>
          <p className="break-words text-xs text-neutral-500 dark:text-neutral-400">
            กิ่ง {sample.replicate} · {group.id} · {MEDIUM_LABELS[group.medium]} · {TREATMENT_LABELS[group.treatmentRole]} ({group.treatmentCode})
          </p>
          <p className="flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            <span>{SAMPLE_CONDITION_LABELS[condition]}</span>
            {sample.baseline.length && <span>· {sample.baseline.length} ซม.</span>}
            {sample.baseline.nodeCount && <span>· {sample.baseline.nodeCount} ข้อ</span>}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex min-h-11 flex-shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
        >
          {expanded ? "ปิดรายละเอียด" : "แก้ไข"}
        </button>
      </div>

      <div
        id={detailsId}
        hidden={!expanded}
        className="min-w-0 space-y-3 border-t border-emerald-100 bg-amber-50/30 p-3 dark:border-emerald-950/70 dark:bg-neutral-900/40"
      >
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="min-w-0 space-y-1" htmlFor={fieldId("status")}>
          <span className="block text-xs font-bold text-neutral-600 dark:text-neutral-300">สถานะการเตรียม</span>
          <select
            id={fieldId("status")}
            value={sample.status === "replaced" ? "pending" : sample.status}
            onChange={(event) => onUpdate({ status: event.target.value as SamplePreparationPatch["status"] })}
            className={INPUT_CLASS}
          >
            {Object.entries(SAMPLE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="min-w-0 space-y-1" htmlFor={fieldId("condition")}>
          <span className="block text-xs font-bold text-neutral-600 dark:text-neutral-300">สภาพเริ่มต้น</span>
          <select
            id={fieldId("condition")}
            value={condition}
            onChange={(event) => onUpdate({ initialCondition: event.target.value as SampleInitialCondition })}
            className={INPUT_CLASS}
          >
            {Object.entries(SAMPLE_CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="min-w-0 space-y-1 sm:col-span-2" htmlFor={fieldId("label")}>
          <span className="block text-xs font-bold text-neutral-600 dark:text-neutral-300">Sample Label (ไม่บังคับ)</span>
          <input
            id={fieldId("label")}
            value={sample.baseline.sampleLabel ?? ""}
            onChange={(event) => onUpdate({ sampleLabel: event.target.value })}
            onBlur={(event) => onUpdate({ sampleLabel: event.target.value.trim() })}
            className={INPUT_CLASS}
            placeholder="เช่น กิ่ง A หรือป้ายสีฟ้า"
          />
        </label>

        <label className="min-w-0 space-y-1" htmlFor={fieldId("length")}>
          <span className="block text-xs font-bold text-neutral-600 dark:text-neutral-300">ความยาวกิ่ง (ซม.)</span>
          <input
            id={fieldId("length")}
            type="text"
            inputMode="decimal"
            value={sample.baseline.length}
            aria-invalid={Boolean(validation.cuttingLengthError)}
            aria-describedby={validation.cuttingLengthError ? fieldId("length-error") : undefined}
            onChange={(event) => {
              if (isValidCuttingLengthInput(event.target.value)) onUpdate({ cuttingLength: event.target.value });
            }}
            className={INPUT_CLASS}
            placeholder="เช่น 12.5"
          />
          {validation.cuttingLengthError && (
            <span id={fieldId("length-error")} className="block text-xs font-semibold text-rose-600 dark:text-rose-400">
              {validation.cuttingLengthError}
            </span>
          )}
        </label>

        <label className="min-w-0 space-y-1" htmlFor={fieldId("nodes")}>
          <span className="block text-xs font-bold text-neutral-600 dark:text-neutral-300">จำนวนข้อ</span>
          <input
            id={fieldId("nodes")}
            type="text"
            inputMode="numeric"
            value={sample.baseline.nodeCount}
            aria-invalid={Boolean(validation.nodeCountError)}
            aria-describedby={validation.nodeCountError ? fieldId("nodes-error") : undefined}
            onChange={(event) => {
              if (isValidNodeCountInput(event.target.value)) onUpdate({ nodeCount: event.target.value });
            }}
            className={INPUT_CLASS}
            placeholder="เช่น 3"
          />
          {validation.nodeCountError && (
            <span id={fieldId("nodes-error")} className="block text-xs font-semibold text-rose-600 dark:text-rose-400">
              {validation.nodeCountError}
            </span>
          )}
        </label>

        <label className="min-w-0 space-y-1 sm:col-span-2" htmlFor={fieldId("notes")}>
          <span className="block text-xs font-bold text-neutral-600 dark:text-neutral-300">หมายเหตุ (ไม่บังคับ)</span>
          <textarea
            id={fieldId("notes")}
            rows={2}
            value={sample.baseline.note}
            onChange={(event) => onUpdate({ notes: event.target.value })}
            className={`${INPUT_CLASS} resize-y break-words`}
            placeholder="บันทึกสิ่งที่สังเกตได้"
          />
        </label>
        </div>

        {condition === "unsuitable" && sample.status !== "excluded" && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            สภาพเริ่มต้นไม่เหมาะใช้ กรุณาตัดออกจากการทดลองหรือเลือกกิ่งที่เหมาะสม
          </p>
        )}
        {condition === "observe" && sample.status === "ready" && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            ตัวอย่างนี้พร้อมโดยมีจุดที่ควรสังเกตต่อ
          </p>
        )}
      </div>
    </article>
  );
}

export function SamplePreparationSection({
  groupConfig,
  samples,
  sectionStatus,
  onUpdateSample,
}: SamplePreparationSectionProps) {
  const sectionPanelId = `${useId()}-sample-preparation-panel`;
  const [isSectionOpen, setIsSectionOpen] = useState(true);
  const summary = summarizeSamplePreparation(samples, groupConfig);

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-emerald-200 bg-white dark:border-emerald-900/60 dark:bg-neutral-950" aria-labelledby="sample-preparation-heading">
      <button
        type="button"
        aria-expanded={isSectionOpen}
        aria-controls={sectionPanelId}
        onClick={() => setIsSectionOpen((current) => !current)}
        className="flex min-h-11 w-full min-w-0 items-start justify-between gap-3 bg-emerald-50/70 px-4 py-3 text-left hover:bg-emerald-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/35"
      >
        <span className="flex min-w-0 items-start gap-2">
          <FlaskConical className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-500" />
          <span className="min-w-0">
            <span id="sample-preparation-heading" className="block break-words text-base font-bold text-neutral-900 dark:text-white">
              การเตรียมตัวอย่างกิ่งชำ (Sample Preparation)
            </span>
            <span className="mt-1 block break-words text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              กิ่งชำ {summary.totalCount} กิ่ง • พร้อม {summary.readyCount} • ต้องตรวจ {summary.notReadyCount}
            </span>
          </span>
        </span>
        <span className="flex flex-shrink-0 items-center gap-2">
          <span className={`hidden rounded-full px-3 py-1 text-xs font-bold sm:inline-flex ${
            sectionStatus === "ready" || sectionStatus === "warning"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
          }`}>
            {SECTION_STATUS_LABELS[sectionStatus]}
          </span>
          <ChevronDown className={`mt-0.5 h-5 w-5 text-emerald-700 dark:text-emerald-300 ${isSectionOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>

      <div id={sectionPanelId} hidden={!isSectionOpen} className="min-w-0 space-y-3 border-t border-emerald-100 p-4 dark:border-emerald-950/60">
      <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        ตรวจตัวอย่างตาม Sample ID ที่ล็อกไว้จากแผนเดิม การแก้ข้อมูลภายใน card จะไม่เปลี่ยนรหัสหรือย้ายกลุ่มตัวอย่าง
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["ตัวอย่างทั้งหมด", summary.totalCount],
          ["พร้อมแล้ว", summary.readyCount],
          ["ยังไม่พร้อม", summary.notReadyCount],
          ["ตัดออก", summary.excludedCount],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
            <p className="break-words text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
            <p className="mt-1 text-lg font-black text-neutral-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-xl border p-3 ${
        summary.blockers.length > 0
          ? "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20"
          : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
      }`}>
        <div className={`flex items-center gap-2 text-sm font-bold ${
          summary.blockers.length > 0
            ? "text-rose-700 dark:text-rose-300"
            : "text-emerald-700 dark:text-emerald-300"
        }`}>
          {summary.blockers.length > 0
            ? <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            : <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
          {summary.readyCount} / {summary.totalCount} ตัวอย่างพร้อม
        </div>
        {summary.blockers.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-rose-600 dark:text-rose-400">
            {summary.blockers.map((message) => <li key={message} className="break-words">• {message}</li>)}
          </ul>
        )}
        {summary.warnings.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300">
            {summary.warnings.map((message) => <li key={message} className="break-words">• {message}</li>)}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        {groupConfig.map((group) => {
          const groupSamples = samples
            .filter((sample) => sample.groupId === group.id)
            .sort((left, right) => left.replicate - right.replicate);
          const readyInGroup = groupSamples.filter((sample) => sample.status === "ready").length;

          return (
            <section key={group.id} className="min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-950/60 dark:bg-emerald-950/10" aria-labelledby={`sample-group-${group.id}`}>
              <div className="mb-3 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 id={`sample-group-${group.id}`} className="font-mono text-sm font-black text-neutral-900 dark:text-white">{group.id}</h3>
                  <p className="break-words text-xs text-neutral-500 dark:text-neutral-400">
                    {MEDIUM_LABELS[group.medium]} · {TREATMENT_LABELS[group.treatmentRole]} ({group.treatmentCode})
                  </p>
                </div>
                <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                  พร้อม {readyInGroup} / {group.replicateCount}
                </p>
              </div>
              <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                {groupSamples.map((sample) => (
                  <SampleCard
                    key={sample.id}
                    group={group}
                    sample={sample}
                    onUpdate={(patch) => onUpdateSample(sample.id, patch)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      </div>
    </section>
  );
}
