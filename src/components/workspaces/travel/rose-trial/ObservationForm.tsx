"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Save, X } from "lucide-react";
import {
  OBSERVATION_SCOPE_LABELS,
  OBSERVATION_STATUS_LABELS,
  OBSERVATION_TYPE_LABELS,
} from "./observationPresentation";
import type { ObservationReferenceContextResult } from "./observationReferenceContext";
import {
  PhotoEvidencePicker,
  type PhotoEvidencePickerIssue,
} from "./PhotoEvidencePicker";
import {
  validatePhotoEvidenceDrafts,
  type PhotoEvidenceDraft,
} from "./photoEvidenceDraft";
import {
  changeObservationDateTime,
  changeObservationScope,
  isObservationFormDirty,
  OBSERVATION_INTERPRETATION_MAX_LENGTH,
  OBSERVED_FACTS_MAX_LENGTH,
  validateObservationFormDraft,
  type ObservationFormDraft,
  type ObservationFormErrors,
  type ObservationFormField,
} from "./observationFormState";
import type {
  RoseTrialObservationScope,
  RoseTrialObservationStatus,
  RoseTrialObservationType,
} from "./observationTypes";

const DIRTY_CONFIRMATION_COPY = "ข้อมูลที่กรอกยังไม่ได้บันทึก ต้องการออกจากแบบฟอร์มหรือไม่";

export interface ObservationFormSubmitResult {
  ok: boolean;
  errors?: ObservationFormErrors;
  message?: string;
}

interface ObservationFormProps {
  initialDraft: ObservationFormDraft;
  pilotStartedAt: string;
  referenceContext: Extract<ObservationReferenceContextResult, { ok: true }>;
  saving: boolean;
  saveStage?: "saving_photos" | "saving_observation" | "promoting" | null;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSubmit: (
    draft: ObservationFormDraft,
    photoDrafts: readonly PhotoEvidenceDraft[],
    submittedAt: Date
  ) => Promise<ObservationFormSubmitResult>;
}

export function ObservationForm({
  initialDraft,
  pilotStartedAt,
  referenceContext,
  saving,
  saveStage = null,
  onCancel,
  onDirtyChange,
  onSubmit,
}: ObservationFormProps) {
  const idPrefix = useId().replace(/:/g, "");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<ObservationFormErrors>({});
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [photoDrafts, setPhotoDrafts] = useState<readonly PhotoEvidenceDraft[]>([]);
  const [photoTouched, setPhotoTouched] = useState(false);
  const [photoIssues, setPhotoIssues] = useState<readonly PhotoEvidencePickerIssue[]>([]);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoSubmitError, setPhotoSubmitError] = useState<string | null>(null);
  const dirty = useMemo(
    () => isObservationFormDirty(draft, initialDraft)
      || photoDrafts.length > 0
      || photoTouched
      || photoProcessing,
    [draft, initialDraft, photoDrafts.length, photoProcessing, photoTouched]
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  const errorEntries = Object.entries(errors).filter((entry): entry is [ObservationFormField, string] => Boolean(entry[1]));

  const clearFieldError = (field: ObservationFormField) => {
    setErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setSubmitMessage(null);
  };

  const fieldId = (field: ObservationFormField) => `${idPrefix}-${field}`;
  const errorId = (field: ObservationFormField) => `${fieldId(field)}-error`;
  const describedBy = (field: ObservationFormField, helperId?: string) =>
    [helperId, errors[field] ? errorId(field) : null].filter(Boolean).join(" ") || undefined;

  const focusErrorSummary = () => {
    window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
  };

  const handleCancel = () => {
    if (dirty && !window.confirm(DIRTY_CONFIRMATION_COPY)) return;
    onCancel();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || photoProcessing) return;

    const submittedAt = new Date();
    const validation = validateObservationFormDraft(
      draft,
      referenceContext,
      pilotStartedAt,
      submittedAt
    );
    if (!validation.valid) {
      setErrors(validation.errors);
      setSubmitMessage(null);
      focusErrorSummary();
      return;
    }

    const photoValidation = validatePhotoEvidenceDrafts(photoDrafts);
    if (!photoValidation.ok) {
      setPhotoSubmitError("ข้อมูลภาพประกอบไม่ถูกต้อง กรุณาตรวจสอบรูปและคำอธิบายก่อนบันทึก");
      setSubmitMessage(null);
      focusErrorSummary();
      return;
    }

    setErrors({});
    setPhotoSubmitError(null);
    setSubmitMessage(null);
    const result = await onSubmit(draft, photoDrafts, submittedAt);
    if (result.ok) return;
    setErrors(result.errors ?? {});
    setSubmitMessage(result.message ?? "ยังบันทึกไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณาตรวจสอบแล้วลองอีกครั้ง");
    focusErrorSummary();
  };

  return (
    <section className="min-w-0 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/20 sm:p-6">
      <form
        noValidate
        onSubmit={handleSubmit}
        aria-busy={saving || photoProcessing}
        className="min-w-0 space-y-5"
      >
        <div className="min-w-0">
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="break-words text-lg font-black text-neutral-900 outline-none dark:text-white"
          >
            สร้างบันทึกการสังเกต
          </h3>
          <p className="mt-1 break-words text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            บันทึกเฉพาะสิ่งที่เห็นหรือวัดได้ก่อน แล้วจึงแยกข้อสังเกตหรือการตีความไว้ต่างหาก
          </p>
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <FormField
            id={fieldId("scope")}
            label="ขอบเขตการบันทึก"
            required
            error={errors.scope}
          >
            <select
              id={fieldId("scope")}
              value={draft.scope}
              required
              aria-invalid={Boolean(errors.scope)}
              aria-describedby={describedBy("scope")}
              onChange={(event) => {
                clearFieldError("scope");
                clearFieldError("treatmentId");
                clearFieldError("sampleId");
                setDraft((current) => changeObservationScope(
                  current,
                  event.target.value as RoseTrialObservationScope
                ));
              }}
              className={controlClassName}
            >
              {Object.entries(OBSERVATION_SCOPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FormField>

          {draft.scope === "treatment" && (
            <FormField
              id={fieldId("treatmentId")}
              label="กลุ่มทดลอง"
              required
              error={errors.treatmentId}
            >
              <select
                id={fieldId("treatmentId")}
                value={draft.treatmentId}
                required
                aria-invalid={Boolean(errors.treatmentId)}
                aria-describedby={describedBy("treatmentId")}
                onChange={(event) => {
                  clearFieldError("treatmentId");
                  setDraft((current) => ({ ...current, treatmentId: event.target.value }));
                }}
                className={controlClassName}
              >
                <option value="">เลือกกลุ่มทดลอง</option>
                {referenceContext.treatments.map((treatment) => (
                  <option key={treatment.id} value={treatment.id}>{treatment.label}</option>
                ))}
              </select>
            </FormField>
          )}

          {draft.scope === "sample" && (
            <FormField
              id={fieldId("sampleId")}
              label="กิ่งชำ"
              required
              error={errors.sampleId}
              helper="ระบบระบุกลุ่มทดลองจากกิ่งชำที่เลือก โดยไม่เดาความสัมพันธ์ที่กำกวม"
            >
              <select
                id={fieldId("sampleId")}
                value={draft.sampleId}
                required
                aria-invalid={Boolean(errors.sampleId)}
                aria-describedby={describedBy("sampleId", `${fieldId("sampleId")}-helper`)}
                onChange={(event) => {
                  clearFieldError("sampleId");
                  setDraft((current) => ({
                    ...current,
                    sampleId: event.target.value,
                    treatmentId: "",
                  }));
                }}
                className={controlClassName}
              >
                <option value="">เลือกกิ่งชำ</option>
                {referenceContext.samples.map((sample) => (
                  <option key={sample.id} value={sample.id}>{sample.label}</option>
                ))}
              </select>
            </FormField>
          )}

          <FormField
            id={fieldId("observedAtLocal")}
            label="วันและเวลาที่สังเกต"
            required
            error={errors.observedAtLocal}
            helper="ใช้วันและเวลาบนอุปกรณ์นี้ และบันทึกเป็นเวลา ISO"
          >
            <input
              id={fieldId("observedAtLocal")}
              type="datetime-local"
              value={draft.observedAtLocal}
              required
              aria-invalid={Boolean(errors.observedAtLocal)}
              aria-describedby={describedBy("observedAtLocal", `${fieldId("observedAtLocal")}-helper`)}
              onChange={(event) => {
                clearFieldError("observedAtLocal");
                clearFieldError("trialDay");
                setDraft((current) => changeObservationDateTime(
                  current,
                  event.target.value,
                  pilotStartedAt
                ));
              }}
              className={controlClassName}
            />
          </FormField>

          <FormField
            id={fieldId("trialDay")}
            label="Trial Day ที่คำนวณได้"
            required
            error={errors.trialDay}
            helper="Day 0 คือวันปฏิทินเดียวกับวันที่เริ่ม Pilot"
          >
            <input
              id={fieldId("trialDay")}
              type="text"
              value={draft.trialDay === null ? "—" : `Day ${draft.trialDay}`}
              readOnly
              aria-readonly="true"
              aria-invalid={Boolean(errors.trialDay)}
              aria-describedby={describedBy("trialDay", `${fieldId("trialDay")}-helper`)}
              className={`${controlClassName} bg-neutral-100 font-bold text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200`}
            />
          </FormField>

          <FormField
            id={fieldId("type")}
            label="ประเภทการสังเกต"
            required
            error={errors.type}
          >
            <select
              id={fieldId("type")}
              value={draft.type}
              required
              aria-invalid={Boolean(errors.type)}
              aria-describedby={describedBy("type")}
              onChange={(event) => {
                clearFieldError("type");
                setDraft((current) => ({
                  ...current,
                  type: event.target.value as RoseTrialObservationType,
                }));
              }}
              className={controlClassName}
            >
              {Object.entries(OBSERVATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FormField>

          <FormField
            id={fieldId("status")}
            label="สถานะ ณ วันที่บันทึก"
            error={errors.status}
            helper="เป็นสถานะที่เลือกโดยผู้ใช้ ระบบจะไม่วิเคราะห์หรือเดาจากข้อความ"
          >
            <select
              id={fieldId("status")}
              value={draft.status}
              aria-invalid={Boolean(errors.status)}
              aria-describedby={describedBy("status", `${fieldId("status")}-helper`)}
              onChange={(event) => {
                clearFieldError("status");
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as RoseTrialObservationStatus | "",
                }));
              }}
              className={controlClassName}
            >
              <option value="">ยังไม่ระบุสถานะ</option>
              {Object.entries(OBSERVATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField
          id={fieldId("observedFacts")}
          label="สิ่งที่สังเกตเห็น"
          required
          error={errors.observedFacts}
          helper={`${draft.observedFacts.length.toLocaleString("th-TH")} / ${OBSERVED_FACTS_MAX_LENGTH.toLocaleString("th-TH")} ตัวอักษร`}
        >
          <textarea
            id={fieldId("observedFacts")}
            value={draft.observedFacts}
            required
            rows={5}
            maxLength={OBSERVED_FACTS_MAX_LENGTH}
            placeholder="เช่น ใบยังเขียว 4 ใบ ลำต้นตั้งตรง และยังไม่พบรากที่มองเห็นได้"
            aria-invalid={Boolean(errors.observedFacts)}
            aria-describedby={describedBy("observedFacts", `${fieldId("observedFacts")}-helper`)}
            onChange={(event) => {
              clearFieldError("observedFacts");
              setDraft((current) => ({ ...current, observedFacts: event.target.value }));
            }}
            className={`${controlClassName} min-h-32 resize-y`}
          />
        </FormField>

        <FormField
          id={fieldId("interpretation")}
          label="ข้อสังเกตหรือการตีความ"
          error={errors.interpretation}
          helper={`${draft.interpretation.length.toLocaleString("th-TH")} / ${OBSERVATION_INTERPRETATION_MAX_LENGTH.toLocaleString("th-TH")} ตัวอักษร — ไม่จำเป็นต้องระบุ`}
        >
          <textarea
            id={fieldId("interpretation")}
            value={draft.interpretation}
            rows={4}
            maxLength={OBSERVATION_INTERPRETATION_MAX_LENGTH}
            aria-invalid={Boolean(errors.interpretation)}
            aria-describedby={describedBy("interpretation", `${fieldId("interpretation")}-helper`)}
            onChange={(event) => {
              clearFieldError("interpretation");
              setDraft((current) => ({ ...current, interpretation: event.target.value }));
            }}
            className={`${controlClassName} min-h-28 resize-y`}
          />
        </FormField>

        <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
          <label htmlFor={fieldId("followUpRequired")} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold text-neutral-800 dark:text-neutral-100">
            <input
              id={fieldId("followUpRequired")}
              type="checkbox"
              checked={draft.followUpRequired}
              aria-invalid={Boolean(errors.followUpRequired)}
              aria-describedby={describedBy("followUpRequired")}
              onChange={(event) => {
                clearFieldError("followUpRequired");
                setDraft((current) => ({ ...current, followUpRequired: event.target.checked }));
              }}
              className="h-5 w-5 rounded border-neutral-300 text-rose-600 focus-visible:ring-2 focus-visible:ring-rose-500"
            />
            <span className="min-w-0 break-words">ยังต้องติดตามรายการนี้ต่อ</span>
          </label>
          {errors.followUpRequired && <FieldError id={errorId("followUpRequired")} message={errors.followUpRequired} />}
        </div>

        <div id={`${idPrefix}-photo-evidence`} className="min-w-0">
          <PhotoEvidencePicker
            drafts={photoDrafts}
            disabled={saving}
            onDraftsChange={(nextDrafts) => {
              setPhotoDrafts(nextDrafts);
              setPhotoSubmitError(null);
            }}
            onTouched={() => setPhotoTouched(true)}
            onProcessingChange={setPhotoProcessing}
            onIssuesChange={setPhotoIssues}
          />
        </div>

        {(errorEntries.length > 0 || submitMessage || photoSubmitError || photoIssues.length > 0) && (
          <div
            ref={errorSummaryRef}
            tabIndex={-1}
            role="alert"
            className="min-w-0 rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-800 outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-900/60 dark:bg-neutral-950 dark:text-rose-200"
          >
            <p className="flex items-start gap-2 font-black">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              กรุณาตรวจสอบข้อมูลก่อนบันทึก
            </p>
            {submitMessage && <p className="mt-2 break-words">{submitMessage}</p>}
            {photoSubmitError && (
              <p className="mt-2 break-words">
                <a href={`#${idPrefix}-photo-evidence`} className="underline underline-offset-2">
                  {photoSubmitError}
                </a>
              </p>
            )}
            {errorEntries.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errorEntries.map(([field, message]) => (
                  <li key={field} className="break-words">
                    <a href={`#${fieldId(field)}`} className="underline underline-offset-2">{message}</a>
                  </li>
                ))}
              </ul>
            )}
            {photoIssues.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {photoIssues.map((issue, index) => (
                  <li key={`${issue.code}-${issue.filename}-${index}`} className="break-words">
                    {issue.filename}: {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex min-w-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900 sm:w-auto"
          >
            <X className="h-4 w-4" />
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={saving || photoProcessing || photoIssues.some((issue) => issue.blocking)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? <Save className="h-4 w-4 animate-pulse" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving
              ? saveStage === "saving_photos"
                ? "กำลังบันทึกรูป"
                : "กำลังบันทึก Observation"
              : "บันทึกการสังเกต"}
          </button>
        </div>
      </form>
    </section>
  );
}

const controlClassName = "min-h-11 w-full min-w-0 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:ring-rose-900/40";

function FormField({
  id,
  label,
  required = false,
  error,
  helper,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block break-words text-sm font-bold text-neutral-800 dark:text-neutral-100">
        {label}{required && <span className="ml-1 text-rose-600" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (จำเป็น)</span>}
      </label>
      {children}
      {helper && <p id={`${id}-helper`} className="break-words text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{helper}</p>}
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return <p id={id} className="break-words text-xs font-bold text-rose-700 dark:text-rose-300">{message}</p>;
}
