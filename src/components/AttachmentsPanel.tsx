"use client";

import DangerIconButton from "./ui/DangerIconButton";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { 
    listAttachments, uploadAttachment, 
    listDocAttachments, uploadDocAttachment,
    deleteAttachment 
} from "../lib/api";
import { toErrorMessage } from "../lib/error";
import type { Attachment } from "../lib/types";
import ConfirmDialog from "./ConfirmDialog";
import { MAX_UPLOAD_BYTES, ALLOWED_EXTENSIONS, getFileExtLower } from "../lib/uploadRules";
import { Paperclip, FileText, Download, Eye, File } from "lucide-react";

type Props = {
    kind: "task" | "doc";
    entityId: string;
    onCountChange?: (n: number) => void;
};

export default function AttachmentsPanel({ kind, entityId, onCountChange }: Props) {
    const [list, setList] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Dialog state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);

    const loadFiles = useCallback(async () => {
        setLoading(true);
        try {
            const files = kind === "task" 
                ? await listAttachments(entityId)
                : await listDocAttachments(entityId);
            setList(files);
            onCountChange?.(files.length);
        } catch {
            setList([]);
            onCountChange?.(0);
        } finally {
            setLoading(false);
        }
    }, [kind, entityId, onCountChange]);

    useEffect(() => {
        void loadFiles();
    }, [loadFiles]);

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
            if (kind === "task") {
                await uploadAttachment(entityId, file);
            } else {
                await uploadDocAttachment(entityId, file);
            }
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
        <section className="mt-8 border-t border-neutral-100 pt-8">
            <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-neutral-400" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Attachments & Assets</h2>
                </div>
                <div className="flex items-center gap-4">
                     <span className="text-[10px] font-black text-neutral-300 uppercase">{list.length} Files</span>
                     <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-[10px] font-black uppercase tracking-widest hover:border-neutral-900 transition-all shadow-sm active:scale-95">
                        <Paperclip className="w-3 h-3" />
                         Attach File
                        <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
                     </label>
                </div>
            </div>

            {errorMsg && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-[11px] font-bold text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {errorMsg}
                </div>
            )}

            {uploading && (
                <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl text-[11px] font-bold text-blue-600 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Uploading asset...
                </div>
            )}

            {loading ? (
                <div className="text-center py-10 text-neutral-400 italic text-xs font-medium">Loading attachments...</div>
            ) : list.length === 0 ? (
                <div className="text-center py-10 bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-200">
                    <p className="text-neutral-400 font-medium italic text-xs">No files attached. Keep your assets close.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {list.map((f) => {
                        const url = `/api/attachments/${f.id}`;
                        const img = isImage(f.mime_type, f.file_name);
                        const isPdf = f.mime_type === "application/pdf" || f.file_name.toLowerCase().endsWith(".pdf");

                        return (
                            <div
                                key={f.id}
                                className="group bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between hover:border-neutral-900 transition-all shadow-sm hover:shadow-md"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                                        {img ? (
                                            <Image
                                                src={url}
                                                alt={f.file_name}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        ) : isPdf ? (
                                            <FileText className="w-5 h-5 text-red-500" />
                                        ) : (
                                            <File className="w-5 h-5 text-neutral-400" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-neutral-900 truncate pr-2 group-hover:text-black" title={f.file_name}>
                                            {f.file_name}
                                        </div>
                                        <div className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest mt-0.5">
                                            {formatBytes(f.size_bytes)} • {new Date(f.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                                    <a 
                                        href={url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-50 transition-all"
                                        title="View"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </a>
                                    <a 
                                        href={`${url}?download=1`}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-50 transition-all"
                                        title="Download"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                    <DangerIconButton
                                        onClick={() => confirmDelete(f.id)}
                                        className="h-8 w-8 !p-1.5"
                                        title="Delete"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmOpen}
                title="Delete Attachment"
                message="Are you sure you want to delete this file? The physical asset will be removed from disk."
                confirmText="Delete"
                danger={true}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmOpen(false)}
            />
        </section>
    );
}
