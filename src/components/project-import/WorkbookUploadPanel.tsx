"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
    formatFileSize,
    validateUploadFile,
} from "@/lib/project-import/client/projectImportApiClient";

export type UploadState = {
    file: File | null;
    error: string | null;
    uploading: boolean;
};

type Props = {
    disabled: boolean;
    state: UploadState;
    onChange: (file: File | null) => void;
    onError: (message: string) => void;
    onClear: () => void;
    onUpload: () => void;
};

export type FileSelectionCallbacks = {
    onChange: (file: File | null) => void;
    onError: (message: string) => void;
};

/**
 * Shared selection logic used by both the file input and the drop handler.
 * Exported as a pure helper so interaction tests can exercise it with real
 * File objects and synthetic events without a DOM environment.
 */
export function createFileSelectionHandlers(callbacks: FileSelectionCallbacks, disabled: boolean) {
    const handleSelectedFile = (files: FileList | null): File | null => {
        const file = files?.[0] ?? null;
        if (!file) {
            callbacks.onChange(null);
            callbacks.onError("กรุณาเลือกไฟล์ .xlsx");
            return null;
        }
        const problem = validateUploadFile(file);
        if (problem) {
            callbacks.onChange(null);
            callbacks.onError(problem);
            return null;
        }
        callbacks.onChange(file);
        return file;
    };

    return {
        handleSelectedFile,
        handleDragOver(event: { preventDefault(): void; stopPropagation(): void }) {
            event.preventDefault();
            event.stopPropagation();
        },
        handleDrop(event: { preventDefault(): void; stopPropagation(): void; dataTransfer: { files: FileList | null } }) {
            event.preventDefault();
            event.stopPropagation();
            if (disabled) {
                callbacks.onError("กรุณากรอก Agent Password ก่อนเลือกไฟล์");
                return null;
            }
            return handleSelectedFile(event.dataTransfer.files);
        },
        handleInputChange(event: { target: { files: FileList | null; value: string } }) {
            const files = event.target.files;
            const result = handleSelectedFile(files);
            event.target.value = "";
            return result;
        },
    };
}

export function WorkbookUploadPanel({ disabled, state, onChange, onError, onClear, onUpload }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const handlers = useMemo(
        () => createFileSelectionHandlers({ onChange, onError }, disabled),
        [disabled, onChange, onError],
    );

    const handleDragOver = useCallback(
        (event: React.DragEvent) => {
            handlers.handleDragOver(event);
            if (!disabled) setDragActive(true);
        },
        [disabled, handlers],
    );

    const handleDrop = useCallback(
        (event: React.DragEvent) => {
            setDragActive(false);
            handlers.handleDrop(event);
        },
        [handlers],
    );

    const handleInputChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            handlers.handleInputChange(event);
        },
        [handlers],
    );

    const openFilePicker = useCallback(() => {
        if (disabled) {
            onError("กรุณากรอก Agent Password ก่อนเลือกไฟล์");
            return;
        }
        inputRef.current?.click();
    }, [disabled, onError]);

    const disabledReason =
        state.uploading
            ? "กำลังอัปโหลด"
            : disabled
                ? "กรุณากรอก Agent Password"
                : !state.file
                    ? "กรุณาเลือกไฟล์ .xlsx"
                    : null;

    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-black text-neutral-900">อัปโหลดไฟล์ Workbook</h2>
            <p className="mt-1 text-xs text-neutral-500">
                รองรับไฟล์ .xlsx หนึ่งไฟล์ ขนาดไม่เกิน 25 MB
            </p>

            <input
                ref={inputRef}
                id="project-import-workbook"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                aria-label="เลือกไฟล์ .xlsx"
                onChange={handleInputChange}
            />

            <label
                htmlFor="project-import-workbook"
                role="button"
                tabIndex={0}
                aria-label="เลือกหรือลากไฟล์ .xlsx มาที่นี่"
                className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    dragActive ? "border-emerald-400 bg-emerald-50" : "border-neutral-300 bg-neutral-50 hover:border-neutral-400"
                } ${disabled || state.uploading ? "cursor-not-allowed opacity-60" : ""}`}
                onClick={(event) => {
                    // Native label activation opens the picker; keep the ref
                    // call as a cross-browser fallback.
                    event.preventDefault();
                    openFilePicker();
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openFilePicker();
                    }
                }}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
            >
                <div className="text-3xl">{state.uploading ? "⏳" : "📄"}</div>
                <div className="text-sm font-semibold text-neutral-700">
                    {state.uploading ? "กำลังอัปโหลดและสร้าง Dry Run..." : "คลิกหรือลากไฟล์ .xlsx มาที่นี่"}
                </div>
                <div className="text-xs text-neutral-500">สูงสุด 1 ไฟล์ / 25 MB</div>
            </label>

            {state.file && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-neutral-800">{state.file.name}</div>
                        <div className="text-xs text-emerald-700">
                            {formatFileSize(state.file.size)} · พร้อมสร้าง Dry Run
                        </div>
                    </div>
                    {!state.uploading && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-emerald-100"
                        >
                            ล้าง / เปลี่ยนไฟล์
                        </button>
                    )}
                </div>
            )}

            {state.error && (
                <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <button
                type="button"
                onClick={onUpload}
                disabled={Boolean(disabledReason)}
                aria-disabled={Boolean(disabledReason)}
                className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
            >
                {state.uploading ? "กำลังอัปโหลด..." : disabledReason ? `${disabledReason} — อัปโหลด / สร้าง Dry Run` : "อัปโหลด / สร้าง Dry Run"}
            </button>
        </section>
    );
}
