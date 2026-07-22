"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Clock3, Info, Plus, Sprout } from "lucide-react";
import {
  addRoseTrialObservation,
  createRoseTrialObservation,
} from "./observationCrud";
import { ObservationForm, type ObservationFormSubmitResult } from "./ObservationForm";
import {
  createObservationFormDraft,
  mapObservationIssuesToFormErrors,
  validateObservationFormDraft,
  type ObservationFormDraft,
} from "./observationFormState";
import {
  loadObservationStore,
  saveObservationStore,
} from "./observationStorage";
import { createPhotoEvidenceStorage } from "./photoEvidenceStorage";
import {
  bindPhotoEvidenceDrafts,
  composeObservationStoreWithPhotos,
  mapPhotoDraftIssuesToObservationIssues,
  validatePhotoEvidenceDrafts,
  type PhotoEvidenceDraft,
} from "./photoEvidenceDraft";
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
  onFormDirtyChange?: (dirty: boolean) => void;
}

interface ObservationWorkspaceViewProps {
  referenceContext: ObservationReferenceContextResult;
  loadState: ObservationWorkspaceLoadState;
  form?: React.ReactNode;
  formOpen?: boolean;
  successMessage?: string | null;
  onOpenForm?: () => void;
  openButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

const FAILED_STATE_COPY: Record<ObservationWorkspaceFailureStatus, string> = {
  malformed_json: "ข้อมูล Observation อ่านไม่ได้ เนื่องจากรูปแบบข้อมูลไม่สมบูรณ์",
  unsupported_version: "ข้อมูล Observation เป็นเวอร์ชันที่หน้านี้ยังไม่รองรับ",
  invalid_envelope: "โครงสร้างข้อมูล Observation ไม่สมบูรณ์",
  storage_unavailable: "ไม่สามารถอ่านพื้นที่จัดเก็บ Observation บนอุปกรณ์นี้ได้",
};

const GENERIC_SAVE_FAILURE = "ยังบันทึกไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณาตรวจสอบแล้วลองอีกครั้ง";
const STORAGE_SAVE_FAILURE = "ไม่สามารถบันทึกลงพื้นที่จัดเก็บบนอุปกรณ์นี้ได้";
const PARTIAL_STORE_LOCK = "พบข้อมูลบางรายการที่อ่านได้ไม่สมบูรณ์ จึงปิดการเพิ่มบันทึกชั่วคราวเพื่อป้องกันข้อมูลเดิม";

interface ObservationIdCrypto {
  randomUUID?: () => string;
  getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T;
}

function createSecureRecordId(
  prefix: "obs" | "photo",
  cryptoApi: ObservationIdCrypto | undefined
): string {
  if (cryptoApi?.randomUUID) return `${prefix}-${cryptoApi.randomUUID()}`;
  if (cryptoApi?.getRandomValues) {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    return `${prefix}-${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
  }
  throw new Error("secure-random-unavailable");
}

export function createObservationId(cryptoApi: ObservationIdCrypto | undefined = globalThis.crypto): string {
  return createSecureRecordId("obs", cryptoApi);
}

export function createPhotoEvidenceId(cryptoApi: ObservationIdCrypto | undefined = globalThis.crypto): string {
  return createSecureRecordId("photo", cryptoApi);
}

interface ObservationSaveDependencies {
  loadStore: typeof loadObservationStore;
  createRecord: typeof createRoseTrialObservation;
  addRecord: typeof addRoseTrialObservation;
  saveStore: typeof saveObservationStore;
  createId: () => string;
}

const DEFAULT_SAVE_DEPENDENCIES: ObservationSaveDependencies = {
  loadStore: loadObservationStore,
  createRecord: createRoseTrialObservation,
  addRecord: addRoseTrialObservation,
  saveStore: saveObservationStore,
  createId: createObservationId,
};

export type CommitObservationDraftResult =
  | { ok: true; store: RoseTrialObservationStoreV1 }
  | { ok: false; message: string; errors?: ReturnType<typeof mapObservationIssuesToFormErrors> };

type PhotoEvidenceStorageAdapter = Pick<
  ReturnType<typeof createPhotoEvidenceStorage>,
  "putPending" | "promote" | "deleteIds"
>;

export interface ObservationPhotoSaveDependencies extends ObservationSaveDependencies {
  createPhotoId: () => string;
  photoStorage: PhotoEvidenceStorageAdapter;
}

export type CommitObservationDraftWithPhotosResult =
  | { ok: true; store: RoseTrialObservationStoreV1; withPhotos: boolean }
  | { ok: false; message: string; errors?: ReturnType<typeof mapObservationIssuesToFormErrors> };

const PHOTO_SAVE_FAILURE = "ยังบันทึกรูปไม่ได้ ข้อมูลและรูปที่เตรียมไว้ยังอยู่";
const PHOTO_STORAGE_UNAVAILABLE = "ไม่สามารถบันทึกรูปในเบราว์เซอร์นี้ได้ คุณยังเก็บข้อความไว้และลองใหม่ได้";
const PHOTO_STORAGE_QUOTA = "พื้นที่จัดเก็บรูปบนอุปกรณ์นี้ไม่เพียงพอ กรุณานำรูปบางส่วนออกแล้วลองอีกครั้ง";

function photoStorageFailureMessage(code: string): string {
  if (code === "unavailable" || code === "open_failed") return PHOTO_STORAGE_UNAVAILABLE;
  if (code === "quota_exceeded") return PHOTO_STORAGE_QUOTA;
  return PHOTO_SAVE_FAILURE;
}

export function commitObservationDraft(
  draft: ObservationFormDraft,
  submittedAt: Date,
  pilotStartedAt: string,
  referenceContext: Extract<ObservationReferenceContextResult, { ok: true }>,
  dependencies: ObservationSaveDependencies = DEFAULT_SAVE_DEPENDENCIES
): CommitObservationDraftResult {
  try {
    const validation = validateObservationFormDraft(
      draft,
      referenceContext,
      pilotStartedAt,
      submittedAt
    );
    if (!validation.valid) {
      return { ok: false, message: GENERIC_SAVE_FAILURE, errors: validation.errors };
    }

    const latest = dependencies.loadStore(referenceContext.validationContext);
    if (!latest.ok) {
      return {
        ok: false,
        message: latest.status === "storage_unavailable"
          ? STORAGE_SAVE_FAILURE
          : "ข้อมูล Observation เดิมอ่านไม่สมบูรณ์ จึงยังไม่บันทึกข้อมูลใหม่เพื่อป้องกันข้อมูลเดิม",
      };
    }
    if (latest.status === "partial") {
      return { ok: false, message: PARTIAL_STORE_LOCK };
    }

    const timestamp = submittedAt.toISOString();
    const created = dependencies.createRecord(
      validation.input,
      { id: dependencies.createId(), timestamp },
      referenceContext.validationContext
    );
    if (!created.ok) {
      return {
        ok: false,
        message: GENERIC_SAVE_FAILURE,
        errors: mapObservationIssuesToFormErrors(created.issues),
      };
    }

    const added = dependencies.addRecord(
      latest.value,
      created.value,
      referenceContext.validationContext,
      timestamp
    );
    if (!added.ok) {
      return {
        ok: false,
        message: GENERIC_SAVE_FAILURE,
        errors: mapObservationIssuesToFormErrors(added.issues),
      };
    }

    const saved = dependencies.saveStore(added.value, referenceContext.validationContext);
    if (!saved.ok) {
      return {
        ok: false,
        message: saved.error.code === "storage_unavailable"
          ? STORAGE_SAVE_FAILURE
          : GENERIC_SAVE_FAILURE,
      };
    }

    return { ok: true, store: added.value };
  } catch {
    return { ok: false, message: GENERIC_SAVE_FAILURE };
  }
}

export async function commitObservationDraftWithPhotos(
  draft: ObservationFormDraft,
  photoDrafts: readonly PhotoEvidenceDraft[],
  submittedAt: Date,
  pilotStartedAt: string,
  referenceContext: Extract<ObservationReferenceContextResult, { ok: true }>,
  dependencies: ObservationPhotoSaveDependencies
): Promise<CommitObservationDraftWithPhotosResult> {
  if (photoDrafts.length === 0) {
    const result = commitObservationDraft(draft, submittedAt, pilotStartedAt, referenceContext, dependencies);
    return result.ok ? { ...result, withPhotos: false } : result;
  }

  try {
    const formValidation = validateObservationFormDraft(
      draft,
      referenceContext,
      pilotStartedAt,
      submittedAt
    );
    if (!formValidation.valid) {
      return { ok: false, message: GENERIC_SAVE_FAILURE, errors: formValidation.errors };
    }
    const photoValidation = validatePhotoEvidenceDrafts(photoDrafts);
    if (!photoValidation.ok) {
      return {
        ok: false,
        message: PHOTO_SAVE_FAILURE,
        errors: mapObservationIssuesToFormErrors(mapPhotoDraftIssuesToObservationIssues(photoValidation.issues)),
      };
    }

    const latest = dependencies.loadStore(referenceContext.validationContext);
    if (!latest.ok) {
      return {
        ok: false,
        message: latest.status === "storage_unavailable"
          ? STORAGE_SAVE_FAILURE
          : "ข้อมูล Observation เดิมอ่านไม่สมบูรณ์ จึงยังไม่บันทึกข้อมูลใหม่เพื่อป้องกันข้อมูลเดิม",
      };
    }
    if (latest.status === "partial") return { ok: false, message: PARTIAL_STORE_LOCK };

    const observationId = dependencies.createId();
    const photoIds = photoDrafts.map(() => dependencies.createPhotoId());
    const timestamp = submittedAt.toISOString();
    const created = dependencies.createRecord(
      { ...formValidation.input, photoIds },
      { id: observationId, timestamp },
      referenceContext.validationContext
    );
    if (!created.ok) {
      return {
        ok: false,
        message: GENERIC_SAVE_FAILURE,
        errors: mapObservationIssuesToFormErrors(created.issues),
      };
    }

    const bound = bindPhotoEvidenceDrafts({
      drafts: photoDrafts,
      photoIds,
      observationId,
      scope: created.value.scope,
      ...(created.value.scope === "sample" && created.value.sampleId
        ? { sampleId: created.value.sampleId }
        : {}),
      createdAt: timestamp,
    });
    if (!bound.ok) return { ok: false, message: PHOTO_SAVE_FAILURE };

    const composed = composeObservationStoreWithPhotos(
      latest.value,
      created.value,
      bound.value.metadata,
      referenceContext.validationContext,
      timestamp
    );
    if (!composed.ok) return { ok: false, message: GENERIC_SAVE_FAILURE };

    const pending = await dependencies.photoStorage.putPending(bound.value.envelopes);
    if (!pending.ok) {
      return { ok: false, message: photoStorageFailureMessage(pending.error.code) };
    }

    const saved = dependencies.saveStore(composed.value, referenceContext.validationContext);
    if (!saved.ok) {
      try {
        await dependencies.photoStorage.deleteIds(photoIds);
      } catch {
        // Rollback is best-effort; reconciliation can remove an orphan later.
      }
      return {
        ok: false,
        message: saved.error.code === "storage_unavailable"
          ? STORAGE_SAVE_FAILURE
          : GENERIC_SAVE_FAILURE,
      };
    }

    try {
      await dependencies.photoStorage.promote(photoIds);
    } catch {
      // A referenced pending Blob remains readable and will be reconciled on a later load.
    }
    return { ok: true, store: composed.value, withPhotos: true };
  } catch {
    return { ok: false, message: PHOTO_SAVE_FAILURE };
  }
}

export function ObservationWorkspace({
  pilotStart,
  treatments,
  samples,
  onFormDirtyChange = () => undefined,
}: ObservationWorkspaceProps) {
  const referenceContext = useMemo(
    () => createObservationReferenceContext(pilotStart, treatments, samples),
    [pilotStart, samples, treatments]
  );
  const [loadState, setLoadState] = useState<ObservationWorkspaceLoadState>({ kind: "loading" });
  const [formDraft, setFormDraft] = useState<ObservationFormDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStage, setSaveStage] = useState<"saving_photos" | "saving_observation" | "promoting" | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const saveInFlightRef = useRef(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const photoStorageRef = useRef<ReturnType<typeof createPhotoEvidenceStorage> | null>(null);

  const getPhotoStorage = useCallback(() => {
    photoStorageRef.current ??= createPhotoEvidenceStorage();
    return photoStorageRef.current;
  }, []);

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
    if (result.status !== "partial") {
      const referencedPhotoIds = result.value.observations.flatMap((observation) => observation.photoIds);
      void getPhotoStorage().reconcile(referencedPhotoIds, "valid", new Date().toISOString());
    }
  }, [getPhotoStorage, referenceContext]);

  useEffect(() => () => {
    void photoStorageRef.current?.close();
  }, []);

  const closeForm = useCallback(() => {
    setFormDraft(null);
    setSuccessMessage(null);
    onFormDirtyChange(false);
    window.requestAnimationFrame(() => openButtonRef.current?.focus());
  }, [onFormDirtyChange]);

  const openForm = () => {
    if (!referenceContext.ok || typeof pilotStart.startedAt !== "string") return;
    setSuccessMessage(null);
    setFormDraft(createObservationFormDraft(new Date(), pilotStart.startedAt));
  };

  const submitForm = async (
    draft: ObservationFormDraft,
    photoDrafts: readonly PhotoEvidenceDraft[],
    submittedAt: Date
  ): Promise<ObservationFormSubmitResult> => {
    if (
      saveInFlightRef.current
      || !referenceContext.ok
      || typeof pilotStart.startedAt !== "string"
      || (loadState.kind !== "empty" && loadState.kind !== "valid")
    ) {
      return { ok: false, message: GENERIC_SAVE_FAILURE };
    }

    saveInFlightRef.current = true;
    setSaving(true);
    try {
      let result: CommitObservationDraftWithPhotosResult;
      if (photoDrafts.length === 0) {
        setSaveStage("saving_observation");
        const zeroPhotoResult = commitObservationDraft(
          draft,
          submittedAt,
          pilotStart.startedAt,
          referenceContext
        );
        result = zeroPhotoResult.ok
          ? { ...zeroPhotoResult, withPhotos: false }
          : zeroPhotoResult;
      } else {
        setSaveStage("saving_photos");
        const storage = getPhotoStorage();
        result = await commitObservationDraftWithPhotos(
          draft,
          photoDrafts,
          submittedAt,
          pilotStart.startedAt,
          referenceContext,
          {
            ...DEFAULT_SAVE_DEPENDENCIES,
            createPhotoId: createPhotoEvidenceId,
            photoStorage: {
              putPending: async (records) => {
                const pending = await storage.putPending(records);
                if (pending.ok) setSaveStage("saving_observation");
                return pending;
              },
              deleteIds: storage.deleteIds,
              promote: async (ids) => {
                setSaveStage("promoting");
                return storage.promote(ids);
              },
            },
          }
        );
      }
      if (!result.ok) return result;

      setLoadState({ kind: "valid", store: result.store, warnings: [] });
      setFormDraft(null);
      onFormDirtyChange(false);
      setSuccessMessage(result.withPhotos
        ? "บันทึกการสังเกตและรูปประกอบแล้ว"
        : "บันทึกการสังเกตแล้ว");
      window.requestAnimationFrame(() => openButtonRef.current?.focus());
      return { ok: true };
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
      setSaveStage(null);
    }
  };

  const form = formDraft && referenceContext.ok && typeof pilotStart.startedAt === "string"
    ? (
        <ObservationForm
          initialDraft={formDraft}
          pilotStartedAt={pilotStart.startedAt}
          referenceContext={referenceContext}
          saving={saving}
          saveStage={saveStage}
          onCancel={closeForm}
          onDirtyChange={onFormDirtyChange}
          onSubmit={submitForm}
        />
      )
    : null;

  return (
    <ObservationWorkspaceView
      referenceContext={referenceContext}
      loadState={loadState}
      form={form}
      formOpen={formDraft !== null}
      successMessage={successMessage}
      onOpenForm={openForm}
      openButtonRef={openButtonRef}
    />
  );
}

export function ObservationWorkspaceView({
  referenceContext,
  loadState,
  form,
  formOpen = false,
  successMessage,
  onOpenForm,
  openButtonRef,
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
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-rose-500">Observation Workspace</p>
            <h2 id="observation-dashboard-heading" className="mt-1 break-words text-xl font-black text-neutral-900 dark:text-white">
              บันทึกการสังเกต
            </h2>
            <p className="mt-1 break-words text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              หลักฐานตามวันของ Batch นี้ แยกสิ่งที่สังเกตเห็นออกจากข้อสังเกตหรือการตีความ
            </p>
          </div>
          {!formOpen && (loadState.kind === "empty" || loadState.kind === "valid") && (
            <button
              ref={openButtonRef}
              type="button"
              onClick={onOpenForm}
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              เพิ่มบันทึกการสังเกต
            </button>
          )}
        </div>

        {successMessage && (
          <div role="status" className="flex min-w-0 items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="break-words">{successMessage}</p>
          </div>
        )}

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
            <p className="break-words">{PARTIAL_STORE_LOCK}</p>
          </div>
        )}

        {form}

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
        </section>
      ) : (
        <ObservationTimeline
          key={loadState.store.updatedAt ?? "observation-timeline"}
          observations={observations}
          warnings={loadState.warnings}
          validationContext={referenceContext.validationContext}
          treatments={referenceContext.treatments}
          samples={referenceContext.samples}
        />
      )}

      <div className="flex min-w-0 items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold leading-relaxed text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
        <Sprout className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="break-words">การเปิดแท็บ กรองข้อมูล หรือเปิดรายละเอียดจะไม่เขียน storage ระบบจะบันทึกเมื่อยืนยันแบบฟอร์มสำเร็จเท่านั้น</p>
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
