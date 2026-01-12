"use client";

import { useEffect, useState } from "react";
import type { Task } from "../lib/types";
import { patchTask } from "../lib/api";
import DocEditor from "./docs/DocEditor";
import { toErrorMessage } from "../lib/error";

type Props = {
    task: Task;
    onUpdate: (updated?: Task) => void;
};

export default function TaskDocPanel({ task, onUpdate }: Props) {
    const docId = task.doc_id || null;

    const [loading, setLoading] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState<string | null>(null);


    const [busy, setBusy] = useState(false);

    async function loadDoc(id: string) {
        setLoading(true);
        setError(null);
        setNotFound(false);
        try {
            const res = await fetch(`/api/docs/${id}`, { cache: "no-store" });
            if (res.status === 404) {
                setNotFound(true);
                return;
            }
            if (!res.ok) throw new Error(`Load doc failed (${res.status})`);
            await res.json();
        } catch (e: unknown) {
            setError(toErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setError(null);
        setNotFound(false);

        if (!docId) return;
        void loadDoc(docId);

    }, [docId]);

    async function createDocAndLink() {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/docs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: task.title?.trim() || "Untitled",
                    content_md: "",
                }),
            });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`Create doc failed (${res.status}): ${text || res.statusText}`);
            }
            const data = await res.json();
            const created = data.doc;

            const updatedTask = await patchTask(task.id, { doc_id: created.id });
            onUpdate(updatedTask);

            // refresh panel state
            setNotFound(false);
        } catch (e: unknown) {
            setError(toErrorMessage(e));
        } finally {
            setBusy(false);
        }
    }

    async function unlinkDoc() {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            const updatedTask = await patchTask(task.id, { doc_id: null });
            onUpdate(updatedTask);
            setNotFound(false);
        } catch (e: unknown) {
            setError(toErrorMessage(e));
        } finally {
            setBusy(false);
        }
    }

    // ====== UI ======
    if (!docId) {
        return (
            <div className="border border-dashed rounded-xl p-10 text-center bg-gray-50/50 flex flex-col items-center justify-center min-h-[300px]">
                <div className="text-blue-500 mb-2 text-3xl">📄</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No Document Linked</h3>
                <p className="text-gray-500 mb-6 text-sm">Create a dedicated document to organize notes and details for this task.</p>
                <button
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                    disabled={busy}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void createDocAndLink();
                    }}
                >
                    {busy ? "Creating..." : "Create Document"}
                </button>
                {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
            </div>
        );
    }

    if (loading) {
        return <div className="p-10 text-center text-sm text-gray-500">Loading document...</div>;
    }

    if (notFound) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="text-red-500 mb-2 text-3xl">⚠️</div>
                <h3 className="text-lg font-semibold text-red-700 mb-1">Document Not Found (404)</h3>
                <p className="text-red-700/80 mb-6 text-sm max-w-sm mx-auto">
                    This task points to a missing doc. This can happen after restore/merge or deletion.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        disabled={busy}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void createDocAndLink();
                        }}
                        title="Create a new doc and re-link this task"
                    >
                        {busy ? "Working..." : "Recreate & Link"}
                    </button>

                    <button
                        className="bg-white border border-red-300 text-red-700 px-5 py-2.5 rounded-lg shadow-sm hover:bg-red-50 disabled:opacity-50 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                        disabled={busy}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void unlinkDoc();
                        }}
                        title="Remove doc link from this task"
                    >
                        Unlink
                    </button>
                </div>

                {error && <div className="mt-4 text-sm text-red-700 font-medium">{error}</div>}
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="text-amber-500 mb-2 text-3xl">🧩</div>
                <h3 className="text-sm font-semibold text-amber-800 mb-1">Load Error</h3>
                <p className="text-amber-800/80 text-xs mb-4">{error}</p>
                <button
                    className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-white px-4 py-2 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (docId) void loadDoc(docId);
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <DocEditor
                docId={docId}
                height="100%"
                className="flex-1"
            // No need to handle onLoadError here as we handle it in loadDoc
            />
        </div>
    );
}
