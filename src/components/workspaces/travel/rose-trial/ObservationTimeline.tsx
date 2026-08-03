"use client";

import React, { useId, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, RotateCcw } from "lucide-react";
import { selectRoseTrialObservations } from "./observationSelectors";
import type {
  RoseTrialObservation,
  RoseTrialObservationScope,
  RoseTrialObservationStatus,
  RoseTrialObservationType,
  RoseTrialObservationValidationContext,
  RoseTrialObservationValidationIssue,
} from "./observationTypes";
import type {
  ObservationSampleReference,
  ObservationTreatmentReference,
} from "./observationReferenceContext";
import {
  buildObservationFilterOptions,
  formatObservationDate,
  getObservationWarningMessages,
  groupObservationsForTimeline,
  OBSERVATION_SCOPE_LABELS,
  OBSERVATION_STATUS_LABELS,
  OBSERVATION_TYPE_LABELS,
  resolveObservationTargetLabel,
} from "./observationPresentation";

interface ObservationTimelineProps {
  observations: readonly RoseTrialObservation[];
  warnings: readonly RoseTrialObservationValidationIssue[];
  validationContext: RoseTrialObservationValidationContext;
  treatments: readonly ObservationTreatmentReference[];
  samples: readonly ObservationSampleReference[];
}

interface TimelineFilters {
  scope: "" | RoseTrialObservationScope;
  treatmentId: string;
  sampleId: string;
  type: "" | RoseTrialObservationType;
  status: "" | RoseTrialObservationStatus;
  followUp: "" | "required" | "not_required";
}

const EMPTY_FILTERS: TimelineFilters = {
  scope: "",
  treatmentId: "",
  sampleId: "",
  type: "",
  status: "",
  followUp: "",
};

export function ObservationTimeline({
  observations,
  warnings,
  validationContext,
  treatments,
  samples,
}: ObservationTimelineProps) {
  const [filters, setFilters] = useState<TimelineFilters>(EMPTY_FILTERS);
  const filterOptions = useMemo(
    () => buildObservationFilterOptions(observations, treatments, samples),
    [observations, samples, treatments]
  );
  const filtered = useMemo(() => selectRoseTrialObservations(observations, {
    ...(filters.scope ? { scope: filters.scope } : {}),
    ...(filters.treatmentId ? { treatmentId: filters.treatmentId } : {}),
    ...(filters.sampleId ? { sampleId: filters.sampleId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.followUp
      ? { followUpRequired: filters.followUp === "required" }
      : {}),
  }, validationContext), [filters, observations, validationContext]);
  const groups = useMemo(() => groupObservationsForTimeline(filtered), [filtered]);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <section className="min-w-0 space-y-4" aria-labelledby="observation-timeline-heading">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h3 id="observation-timeline-heading" className="text-lg font-bold text-neutral-900 dark:text-white">
            Timeline การสังเกต
          </h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            เรียง Trial Day ล่าสุดก่อน และแสดงเฉพาะหลักฐานที่บันทึกไว้
          </p>
        </div>
        <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300" aria-live="polite">
          แสดง {filtered.length} จาก {observations.length} รายการ
        </p>
      </div>

      <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <FilterSelect
            label="ขอบเขต"
            value={filters.scope}
            onChange={(value) => setFilters((current) => ({ ...current, scope: value as TimelineFilters["scope"] }))}
            options={Object.entries(OBSERVATION_SCOPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FilterSelect
            label="กลุ่มทดลอง"
            value={filters.treatmentId}
            onChange={(treatmentId) => setFilters((current) => ({ ...current, treatmentId }))}
            options={filterOptions.treatments.map((item) => ({ value: item.id, label: item.label }))}
          />
          <FilterSelect
            label="กิ่งชำ"
            value={filters.sampleId}
            onChange={(sampleId) => setFilters((current) => ({ ...current, sampleId }))}
            options={filterOptions.samples.map((item) => ({ value: item.id, label: item.label }))}
          />
          <FilterSelect
            label="ประเภท Observation"
            value={filters.type}
            onChange={(value) => setFilters((current) => ({ ...current, type: value as TimelineFilters["type"] }))}
            options={Object.entries(OBSERVATION_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FilterSelect
            label="สถานะ"
            value={filters.status}
            onChange={(value) => setFilters((current) => ({ ...current, status: value as TimelineFilters["status"] }))}
            options={Object.entries(OBSERVATION_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FilterSelect
            label="การติดตาม"
            value={filters.followUp}
            onChange={(value) => setFilters((current) => ({ ...current, followUp: value as TimelineFilters["followUp"] }))}
            options={[
              { value: "required", label: "ยังต้องติดตาม" },
              { value: "not_required", label: "ไม่ต้องติดตามเพิ่มเติม" },
            ]}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={!hasFilters}
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            ล้างตัวกรอง
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center dark:border-neutral-700 dark:bg-neutral-900/40">
          <p className="font-bold text-neutral-700 dark:text-neutral-200">ไม่พบบันทึกตามตัวกรองนี้</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">ลองล้างตัวกรองเพื่อดู Timeline ทั้งหมด</p>
        </div>
      ) : (
        <div className="min-w-0 space-y-6">
          {groups.map((group) => (
            <section key={group.trialDay} className="min-w-0 space-y-3" aria-labelledby={`trial-day-${group.trialDay}`}>
              <div className="flex items-center gap-3">
                <h4 id={`trial-day-${group.trialDay}`} className="shrink-0 text-sm font-black text-rose-700 dark:text-rose-300">
                  Trial Day {group.trialDay}
                </h4>
                <span className="h-px flex-1 bg-rose-100 dark:bg-rose-950" />
                <span className="shrink-0 text-xs text-neutral-400">{group.observations.length} รายการ</span>
              </div>
              <div className="min-w-0 space-y-3">
                {group.observations.map((observation) => (
                  <ObservationTimelineCard
                    key={observation.id}
                    observation={observation}
                    warningMessages={getObservationWarningMessages(warnings, observation.id)}
                    treatments={treatments}
                    samples={samples}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0 space-y-1 text-xs font-bold text-neutral-500 dark:text-neutral-400">
      <span className="block">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm font-medium text-neutral-800 outline-none focus:ring-2 focus:ring-rose-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
      >
        <option value="">ทั้งหมด</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ObservationTimelineCard({
  observation,
  warningMessages,
  treatments,
  samples,
}: {
  observation: RoseTrialObservation;
  warningMessages: readonly string[];
  treatments: readonly ObservationTreatmentReference[];
  samples: readonly ObservationSampleReference[];
}) {
  const [expanded, setExpanded] = useState(false);
  const generatedId = useId().replace(/:/g, "");
  const detailsId = `observation-details-${generatedId}`;
  const targetLabel = resolveObservationTargetLabel(observation, treatments, samples);

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="min-w-0 space-y-3 p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                {OBSERVATION_SCOPE_LABELS[observation.scope]}
              </span>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-bold text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                {OBSERVATION_TYPE_LABELS[observation.type]}
              </span>
              {observation.status && (
                <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] font-semibold text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
                  {OBSERVATION_STATUS_LABELS[observation.status]}
                </span>
              )}
              {observation.followUpRequired && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                  ยังต้องติดตาม
                </span>
              )}
            </div>
            <p className="break-words text-sm font-bold text-neutral-800 dark:text-neutral-100">{targetLabel}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatObservationDate(observation.observedAt)}</p>
          </div>
        </div>

        <p className="line-clamp-2 break-words text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {observation.observedFacts}
        </p>

        {warningMessages.length > 0 && (
          <div role="status" className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
            {warningMessages.map((message) => (
              <p key={message} className="flex items-start gap-2 break-words">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {message}
              </p>
            ))}
          </div>
        )}

        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900 sm:w-auto sm:min-w-52"
        >
          {expanded ? "ซ่อนรายละเอียด" : "เปิดรายละเอียด"}
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div id={detailsId} hidden={!expanded} className="min-w-0 space-y-4 border-t border-neutral-100 bg-neutral-50/60 p-4 text-sm dark:border-neutral-900 dark:bg-neutral-900/20 sm:p-5">
        <div>
          <h5 className="text-xs font-black uppercase tracking-wider text-neutral-500">สิ่งที่สังเกตเห็น</h5>
          <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-neutral-800 dark:text-neutral-200">{observation.observedFacts}</p>
        </div>
        {observation.interpretation && (
          <div>
            <h5 className="text-xs font-black uppercase tracking-wider text-neutral-500">ข้อสังเกตหรือการตีความ</h5>
            <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-neutral-700 dark:text-neutral-300">{observation.interpretation}</p>
          </div>
        )}
        <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          <div><dt className="font-bold text-neutral-400">สร้างเมื่อ</dt><dd className="mt-0.5 break-words text-neutral-700 dark:text-neutral-300">{formatObservationDate(observation.createdAt)}</dd></div>
          <div><dt className="font-bold text-neutral-400">อัปเดตเมื่อ</dt><dd className="mt-0.5 break-words text-neutral-700 dark:text-neutral-300">{formatObservationDate(observation.updatedAt)}</dd></div>
          <div><dt className="font-bold text-neutral-400">ข้อมูลภาพ</dt><dd className="mt-0.5 text-neutral-700 dark:text-neutral-300">{observation.photoIds.length} รายการ</dd></div>
        </dl>
        <p className="rounded-xl bg-neutral-100 p-3 text-xs font-medium leading-relaxed text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          ข้อมูลนี้เป็นบันทึกจากการสังเกต ไม่ใช่ข้อสรุปยืนยันสาเหตุ
        </p>
      </div>
    </article>
  );
}
