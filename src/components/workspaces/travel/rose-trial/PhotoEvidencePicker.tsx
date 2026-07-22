"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import {
  PHOTO_EVIDENCE_CAPTION_MAX_LENGTH,
  PHOTO_EVIDENCE_MAX_ORIGINAL_BYTES,
  PHOTO_EVIDENCE_MAX_PER_OBSERVATION,
  PHOTO_EVIDENCE_SUPPORTED_MIME_TYPES,
  createPhotoDraftFingerprint,
} from "./photoEvidence";
import {
  processPhotoEvidenceImage,
  type ProcessedPhotoEvidenceImage,
} from "./photoEvidenceImageProcessing";
import {
  appendPhotoEvidenceDraft,
  removePhotoEvidenceDraft,
  updatePhotoEvidenceDraftCaption,
  type PhotoEvidenceDraft,
} from "./photoEvidenceDraft";

export const PHOTO_EVIDENCE_ACCEPT = "image/jpeg,image/png,image/webp";

const createBrowserObjectUrl = (blob: Blob) => URL.createObjectURL(blob);
const revokeBrowserObjectUrl = (url: string) => URL.revokeObjectURL(url);

export type PhotoEvidencePickerIssueCode =
  | "maximum_exceeded"
  | "duplicate"
  | "unsupported"
  | "too_large"
  | "processing_failed";

export interface PhotoEvidencePickerIssue {
  code: PhotoEvidencePickerIssueCode;
  filename: string;
  message: string;
  blocking: false;
}

interface PhotoEvidenceSelectionDependencies {
  processImage: (file: File) => Promise<
    | { ok: true; value: ProcessedPhotoEvidenceImage }
    | { ok: false; error: { code: string } }
  >;
  createLocalId: () => string;
  onProgress?: (current: number, total: number) => void;
}

export interface PhotoEvidenceSelectionResult {
  drafts: PhotoEvidenceDraft[];
  issues: PhotoEvidencePickerIssue[];
  addedCount: number;
}

function pickerIssue(
  code: PhotoEvidencePickerIssueCode,
  filename: string
): PhotoEvidencePickerIssue {
  const message = code === "maximum_exceeded"
    ? "เลือกได้สูงสุด 4 รูป กรุณานำรูปเดิมออกก่อนเพิ่มรูปใหม่"
    : code === "duplicate"
      ? "รูปนี้ถูกเลือกไว้แล้ว"
      : code === "unsupported"
        ? "รองรับเฉพาะไฟล์ JPEG, PNG และ WebP"
        : code === "too_large"
          ? "รูปนี้มีขนาดเกิน 12 MB"
          : "เตรียมรูปนี้ไม่สำเร็จ กรุณาเลือกรูปอื่น";
  return { code, filename, message, blocking: false };
}

export async function processPhotoEvidenceSelection(
  selectedFiles: readonly File[],
  currentDrafts: readonly PhotoEvidenceDraft[],
  dependencies: PhotoEvidenceSelectionDependencies
): Promise<PhotoEvidenceSelectionResult> {
  let drafts = currentDrafts.map((draft) => ({ ...draft }));
  const issues: PhotoEvidencePickerIssue[] = [];
  let addedCount = 0;
  const fingerprints = new Set(drafts.map((draft) => draft.fingerprint));

  for (let index = 0; index < selectedFiles.length; index += 1) {
    const file = selectedFiles[index];
    dependencies.onProgress?.(index + 1, selectedFiles.length);
    if (drafts.length >= PHOTO_EVIDENCE_MAX_PER_OBSERVATION) {
      issues.push(pickerIssue("maximum_exceeded", file.name));
      continue;
    }
    const fingerprint = createPhotoDraftFingerprint({
      filename: file.name,
      size: file.size,
      lastModified: file.lastModified,
    });
    if (fingerprints.has(fingerprint)) {
      issues.push(pickerIssue("duplicate", file.name));
      continue;
    }
    if (!(PHOTO_EVIDENCE_SUPPORTED_MIME_TYPES as readonly string[]).includes(file.type)) {
      issues.push(pickerIssue("unsupported", file.name));
      continue;
    }
    if (file.size > PHOTO_EVIDENCE_MAX_ORIGINAL_BYTES) {
      issues.push(pickerIssue("too_large", file.name));
      continue;
    }

    const processed = await dependencies.processImage(file);
    if (!processed.ok) {
      issues.push(pickerIssue(
        processed.error.code === "file_too_large" ? "too_large" : "processing_failed",
        file.name
      ));
      continue;
    }
    const appended = appendPhotoEvidenceDraft(drafts, {
      localId: dependencies.createLocalId(),
      fingerprint,
      sourceLabel: file.name,
      blob: processed.value.blob,
      mimeType: processed.value.mimeType,
      originalSizeBytes: processed.value.originalSizeBytes,
      storedSizeBytes: processed.value.storedSizeBytes,
      width: processed.value.width,
      height: processed.value.height,
      caption: "",
    });
    if (!appended.ok) {
      issues.push(pickerIssue(
        appended.issues[0]?.code === "duplicate_fingerprint" ? "duplicate" : "maximum_exceeded",
        file.name
      ));
      continue;
    }
    drafts = appended.value;
    fingerprints.add(fingerprint);
    addedCount += 1;
  }
  return { drafts, issues, addedCount };
}

interface PhotoEvidencePickerProps {
  drafts: readonly PhotoEvidenceDraft[];
  disabled: boolean;
  onDraftsChange: (drafts: readonly PhotoEvidenceDraft[]) => void;
  onTouched: () => void;
  onProcessingChange: (processing: boolean) => void;
  onIssuesChange: (issues: readonly PhotoEvidencePickerIssue[]) => void;
  processImage?: PhotoEvidenceSelectionDependencies["processImage"];
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
}

export function PhotoEvidencePicker({
  drafts,
  disabled,
  onDraftsChange,
  onTouched,
  onProcessingChange,
  onIssuesChange,
  processImage = processPhotoEvidenceImage,
  createObjectUrl = createBrowserObjectUrl,
  revokeObjectUrl = revokeBrowserObjectUrl,
}: PhotoEvidencePickerProps) {
  const idPrefix = useId().replace(/:/g, "");
  const inputRef = useRef<HTMLInputElement>(null);
  const captionRefs = useRef(new Map<string, HTMLTextAreaElement>());
  const previewRecordsRef = useRef(new Map<string, { blob: Blob; url: string }>());
  const operationRef = useRef(0);
  const mountedRef = useRef(true);
  const localIdCounterRef = useRef(0);
  const previousDraftCountRef = useRef(drafts.length);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [issues, setIssues] = useState<PhotoEvidencePickerIssue[]>([]);

  useEffect(() => {
    const activeIds = new Set(drafts.map((draft) => draft.localId));
    for (const [localId, record] of previewRecordsRef.current) {
      const draft = drafts.find((candidate) => candidate.localId === localId);
      if (!activeIds.has(localId) || draft?.blob !== record.blob) {
        revokeObjectUrl(record.url);
        previewRecordsRef.current.delete(localId);
      }
    }
    for (const draft of drafts) {
      if (!previewRecordsRef.current.has(draft.localId)) {
        previewRecordsRef.current.set(draft.localId, {
          blob: draft.blob,
          url: createObjectUrl(draft.blob),
        });
      }
    }
    setPreviewUrls(Object.fromEntries(
      [...previewRecordsRef.current].map(([localId, record]) => [localId, record.url])
    ));
  }, [createObjectUrl, drafts, revokeObjectUrl]);

  useEffect(() => {
    mountedRef.current = true;
    const previewRecords = previewRecordsRef.current;
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      for (const record of previewRecords.values()) revokeObjectUrl(record.url);
      previewRecords.clear();
    };
  }, [revokeObjectUrl]);

  useEffect(() => {
    if (drafts.length > previousDraftCountRef.current) {
      const latest = drafts[drafts.length - 1];
      window.requestAnimationFrame(() => captionRefs.current.get(latest.localId)?.focus());
    }
    previousDraftCountRef.current = drafts.length;
  }, [drafts]);

  const publishIssues = (nextIssues: PhotoEvidencePickerIssue[]) => {
    setIssues(nextIssues);
    onIssuesChange(nextIssues);
  };

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0 || processing || disabled) return;
    const operation = operationRef.current + 1;
    operationRef.current = operation;
    setProcessing(true);
    onProcessingChange(true);
    setProgress({ current: 1, total: files.length });
    publishIssues([]);
    try {
      const result = await processPhotoEvidenceSelection(files, drafts, {
        processImage,
        createLocalId: () => `${idPrefix}-photo-draft-${++localIdCounterRef.current}`,
        onProgress: (current, total) => {
          if (mountedRef.current && operationRef.current === operation) setProgress({ current, total });
        },
      });
      if (!mountedRef.current || operationRef.current !== operation) return;
      if (result.addedCount > 0) {
        onDraftsChange(result.drafts);
        onTouched();
      }
      publishIssues(result.issues);
    } finally {
      if (mountedRef.current && operationRef.current === operation) {
        setProcessing(false);
        setProgress(null);
        onProcessingChange(false);
      }
    }
  };

  const handleRemove = (localId: string, index: number) => {
    const next = removePhotoEvidenceDraft(drafts, localId);
    onDraftsChange(next);
    onTouched();
    publishIssues([]);
    window.requestAnimationFrame(() => {
      const previous = next[Math.max(0, index - 1)];
      if (previous) captionRefs.current.get(previous.localId)?.focus();
      else inputRef.current?.focus();
    });
  };

  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-rose-200 bg-white p-4 dark:border-rose-900/60 dark:bg-neutral-950" aria-labelledby={`${idPrefix}-heading`}>
      <div className="min-w-0">
        <h4 id={`${idPrefix}-heading`} className="break-words text-base font-black text-neutral-900 dark:text-white">
          รูปประกอบ Observation
        </h4>
        <p id={`${idPrefix}-helper`} className="mt-1 break-words text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          เลือกได้สูงสุด 4 รูป รองรับ JPEG, PNG และ WebP รูปละไม่เกิน 12 MB
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white focus-within:ring-2 focus-within:ring-rose-500 focus-within:ring-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          เลือกรูปจากอุปกรณ์
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={PHOTO_EVIDENCE_ACCEPT}
            disabled={disabled || processing || drafts.length >= PHOTO_EVIDENCE_MAX_PER_OBSERVATION}
            aria-describedby={`${idPrefix}-helper ${idPrefix}-privacy`}
            onChange={handleFiles}
            className="sr-only"
          />
        </label>
        <p className="break-words text-sm font-bold text-neutral-600 dark:text-neutral-300">
          เลือกแล้ว {drafts.length}/4 รูป
        </p>
      </div>

      <div aria-live="polite" className="min-h-5 text-sm font-semibold text-rose-700 dark:text-rose-300">
        {processing && progress && (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            กำลังเตรียมรูป {progress.current} จาก {progress.total}
          </span>
        )}
      </div>

      {issues.length > 0 && (
        <div role="status" className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          {issues.map((issue, index) => (
            <p key={`${issue.code}-${issue.filename}-${index}`} className="flex min-w-0 items-start gap-2 break-words">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span><span className="font-bold">{issue.filename}:</span> {issue.message}</span>
            </p>
          ))}
        </div>
      )}

      {drafts.length > 0 && (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {drafts.map((draft, index) => {
            const captionId = `${idPrefix}-caption-${draft.localId}`;
            const counterId = `${captionId}-counter`;
            return (
              <article key={draft.localId} className="min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50">
                <div className="aspect-[4/3] min-w-0 bg-neutral-100 dark:bg-neutral-900">
                  {previewUrls[draft.localId] && (
                    // eslint-disable-next-line @next/next/no-img-element -- Blob URLs are local previews, not deployable assets.
                    <img src={previewUrls[draft.localId]} alt={`ตัวอย่างรูปที่ ${index + 1}`} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 space-y-3 p-3">
                  <p className="break-words text-xs font-semibold text-neutral-500 dark:text-neutral-400">{draft.sourceLabel}</p>
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor={captionId} className="block break-words text-sm font-bold text-neutral-800 dark:text-neutral-100">
                      คำอธิบายรูปที่ {index + 1} (ไม่จำเป็น)
                    </label>
                    <textarea
                      ref={(element) => {
                        if (element) captionRefs.current.set(draft.localId, element);
                        else captionRefs.current.delete(draft.localId);
                      }}
                      id={captionId}
                      value={draft.caption}
                      rows={2}
                      maxLength={PHOTO_EVIDENCE_CAPTION_MAX_LENGTH}
                      disabled={disabled}
                      aria-describedby={counterId}
                      onChange={(event) => {
                        onDraftsChange(updatePhotoEvidenceDraftCaption(drafts, draft.localId, event.target.value));
                        onTouched();
                      }}
                      className="min-h-20 w-full min-w-0 resize-y rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                    />
                    <p id={counterId} className="text-right text-xs text-neutral-500 dark:text-neutral-400">
                      {draft.caption.length} / 200 ตัวอักษร
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`นำรูปที่ ${index + 1} ออก`}
                    onClick={() => handleRemove(draft.localId, index)}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:bg-neutral-950 dark:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    นำรูปนี้ออก
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p id={`${idPrefix}-privacy`} className="break-words rounded-xl bg-neutral-100 p-3 text-xs leading-relaxed text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
        รูปภาพในรุ่นนี้จัดเก็บไว้ในเบราว์เซอร์ของอุปกรณ์นี้ การล้างข้อมูลเว็บไซต์หรือเปลี่ยนอุปกรณ์อาจทำให้รูปไม่สามารถเรียกดูได้
      </p>
    </section>
  );
}
