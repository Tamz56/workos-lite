"use client";

import DangerIconButton from "./ui/DangerIconButton";
import Image from "next/image";
import { useEffect, useState } from "react";
import { listAttachments, uploadAttachment, deleteAttachment } from "../lib/api";
import { toErrorMessage } from "../lib/error";
import type { Attachment } from "../lib/types";
import ConfirmDialog from "./ConfirmDialog";
import { MAX_UPLOAD_BYTES, ALLOWED_EXTENSIONS, getFileExtLower } from "../lib/uploadRules";

type Props = {
    taskId: string;
    onCountChange?: (n: number) => void;
};

export default function TaskAttachmentsPanel({ taskId, onCountChange }: Props) {
    const [list, setList] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Dialog state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);

    const loadFiles = async () => {
        setLoading(true);
        try {
            const files = await listAttachments(taskId);
            setList(files);
            return files;
        } catch {
            setList([]);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadFiles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId]);

    useEffect(() => {
        onCountChange?.(list.length);
    }, [list.length, onCountChange]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setErrorMsg(null);

        if (file.size > MAX_UPLOAD_BYTES) {
            setErrorMsg("File too large (max 25MB).");
            e.target.value = "";
            return;
        }

        const ext = getFileExtLower(file.name);
        if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
            setErrorMsg(`File type not allowed. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`);
            e.target.value = "";
            return;
        }

        setUploading(true);
        try {
            await uploadAttachment(taskId, file);
            e.target.value = "";
            await loadFiles();
        } catch (err: unknown) {
            setErrorMsg(toErrorMessage(err));
        } finally {
            setUploading(false);
        }
    };

    const confirmDelete = (id: string) => {
        setFileToDelete(id);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;
        try {
            await deleteAttachment(fileToDelete);
            await loadFiles();
        } catch (err: unknown) {
            alert(toErrorMessage(err));
        } finally {
            setConfirmOpen(false);
            setFileToDelete(null);
        }
    };

    const formatBytes = (n?: number | null) => {
        if (!n || n <= 0) return "";
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    };

    const isImage = (mime?: string | null, name?: string) => {
        const m = (mime || "").toLowerCase();
        if (m.startsWith("image/")) return true;
        const n = (name || "").toLowerCase();
        return /\.(png|jpe?g|webp|gif)$/.test(n);
    };

    return (
        <div>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add Attachment
                </label>
                <input
                    type="file"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploading && <div className="text-xs text-blue-600 mt-1">Uploading...</div>}
                {errorMsg && <div className="text-xs text-red-600 mt-1 font-medium">{errorMsg}</div>}
                {!uploading && !errorMsg && <div className="text-xs text-gray-400 mt-1">Select a file to upload</div>}
            </div>

            {loading ? (
                <div className="text-sm text-gray-500">Loading files...</div>
            ) : list.length === 0 ? (
                <div className="text-sm text-gray-400 italic">No attachments yet.</div>
            ) : (
                <ul className="space-y-3">
                    {list.map((f) => {
                        const url = `/api/attachments/${f.id}`;
                        const img = isImage(f.mime_type, f.file_name);
                        const isPdf = f.mime_type === "application/pdf" || f.file_name.toLowerCase().endsWith(".pdf");

                        return (
                            <li
                                key={f.id}
                                className="group flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-white hover:bg-gray-50 hover:border-blue-200 transition-all shadow-sm"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {/* Thumbnail Placeholder */}
                                    <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border bg-gray-50 flex items-center justify-center relative group-hover:border-blue-300 transition-colors">
                                        {img ? (
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                            >

                                                <Image
                                                    src={url}
                                                    alt={f.file_name ?? ""}
                                                    width={640}
                                                    height={640}
                                                    className="h-full w-full object-cover"
                                                    unoptimized
                                                />
                                            </a>
                                        ) : isPdf ? (
                                            <div className="flex flex-col items-center">
                                                <span className="text-xl">📕</span>
                                                <span className="text-[8px] font-bold text-red-600 mt-[-4px]">PDF</span>
                                            </div>
                                        ) : (
                                            <span className="text-xl text-gray-400">📎</span>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex flex-col">
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium text-gray-700 hover:text-blue-600 truncate"
                                            title={f.file_name}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {f.file_name}
                                        </a>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-gray-400">{formatBytes(f.size_bytes)}</span>
                                            {isPdf && (
                                                <span className="px-1 py-0 px-1.5 bg-red-50 text-red-600 text-[9px] font-bold rounded border border-red-100">
                                                    PDF
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
                                        title="Open in new tab"
                                    >
                                        View
                                    </a>

                                    <a
                                        href={`${url}?download=1`}
                                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
                                        title="Download to computer"
                                    >
                                        Download
                                    </a>

                                    <DangerIconButton
                                        onClick={() => confirmDelete(f.id)}
                                        className="h-8 w-8"
                                        title="Delete"
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <ConfirmDialog
                isOpen={confirmOpen}
                title="Delete File"
                message="Are you sure you want to delete this attachment? This cannot be undone."
                confirmText="Delete"
                danger={true}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmOpen(false)}
            />
        </div>
    );
}
