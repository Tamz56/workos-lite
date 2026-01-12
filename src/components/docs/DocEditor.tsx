"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { clsx } from "clsx";

import { patchDoc } from "@/lib/api";
import { formatDate } from "@/lib/docsUtils";
import { toErrorMessage } from "@/lib/error";
import { findActiveMentionQuery, processMentionsToMarkdown, replaceRange } from "@/lib/mentions";
import type { Doc } from "@/lib/types";

type ViewMode = "write" | "preview" | "split";
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface DocEditorProps {
    docId: string | null;
    height?: string;
    autoFocus?: boolean;
    onMeta?: (doc: Doc) => void;
    onLoadError?: (status: number) => void;
    className?: string;
}

export default function DocEditor({
    docId,
    height = "70vh",
    autoFocus = false,
    onMeta,
    onLoadError,
    className
}: DocEditorProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("split");
    const [content, setContent] = useState<string>("");
    const [dirty, setDirty] = useState(false);

    // Setup save status
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Mentions state
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionStart, setMentionStart] = useState<number | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [allDocs, setAllDocs] = useState<Doc[]>([]);

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inFlightRef = useRef(false);
    const latestContentRef = useRef(content);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Keep latest content ref updated
    useEffect(() => {
        latestContentRef.current = content;
    }, [content]);

    // Initial load fetch
    useEffect(() => {
        if (!docId) {
            setContent("");
            setSaveStatus("idle");
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        (async () => {
            try {
                // Fetch current doc
                const res = await fetch(`/api/docs/${docId}`, { cache: "no-store" });
                if (!res.ok) {
                    if (onLoadError) onLoadError(res.status);
                    throw new Error(`Failed to load doc (${res.status})`);
                }
                const data = await res.json();

                if (cancelled) return;

                const d = data.doc;
                if (!d) throw new Error("Doc not found");

                setContent(d.content_md ?? "");
                setLastSavedAt(d.updated_at ? new Date(d.updated_at) : null);
                if (onMeta) onMeta(d);

                // Fetch all docs for mentions (lightweight)
                // In production might trigger this lazily on first "[[" type
                const docsRes = await fetch("/api/docs");
                if (docsRes.ok) {
                    const docsData = await docsRes.json();
                    setAllDocs(docsData.docs || []);
                }

            } catch (e: unknown) {
                if (!cancelled) {
                    setErrorMsg(toErrorMessage(e));
                    setSaveStatus("error");
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [docId, onLoadError, onMeta]);

    // Focus on mount logic
    useEffect(() => {
        if (autoFocus && !isLoading && textAreaRef.current) {
            setTimeout(() => textAreaRef.current?.focus(), 50);
        }
    }, [autoFocus, isLoading, viewMode]);

    // Autosave Debounce
    useEffect(() => {
        if (!docId || !dirty) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        saveTimerRef.current = setTimeout(() => {
            void doSave();
        }, 800);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content, dirty, docId]);

    async function doSave() {
        if (!docId || !dirty || inFlightRef.current) return;
        inFlightRef.current = true;
        setSaveStatus("saving");
        setErrorMsg(null);

        try {
            const md = latestContentRef.current;
            const updatedDoc = await patchDoc(docId, { content_md: md });

            setSaveStatus("saved");
            setDirty(false);
            setLastSavedAt(new Date());
            if (onMeta) onMeta(updatedDoc);
        } catch (e: unknown) {
            setSaveStatus("error");
            setErrorMsg(toErrorMessage(e));
        } finally {
            inFlightRef.current = false;
        }
    }

    // Mention logic
    const filteredMentions = useMemo(() => {
        if (mentionQuery === null) return [];
        const q = mentionQuery.toLowerCase();
        return allDocs
            .filter(d => (d.title || "").toLowerCase().includes(q))
            .slice(0, 5);
    }, [allDocs, mentionQuery]);

    // Reset selection index when query changes
    useEffect(() => {
        setMentionIndex(0);
    }, [mentionQuery]);

    const handleSelectMention = (index: number) => {
        const doc = filteredMentions[index];
        if (!doc || mentionStart === null || !textAreaRef.current) return;

        const cursor = textAreaRef.current.selectionStart;
        const insert = `[[doc:${doc.id}|${doc.title || "Untitled"}]]`;

        // Replace from start of [[ to current cursor
        // Note: findActiveMentionQuery returns start index of "[["
        // We replace up to current cursor position (which includes the query typed so far)
        const newContent = replaceRange(content, mentionStart, cursor, insert);

        setContent(newContent);
        setDirty(true);
        setMentionQuery(null);
        setMentionStart(null);

        // Move cursor to end of insertion
        const newCursor = mentionStart + insert.length;
        // Need to wait for render cycle or force update? 
        // React's ref update for cursor needs to happen after render with new content value
        requestAnimationFrame(() => {
            if (textAreaRef.current) {
                textAreaRef.current.selectionStart = newCursor;
                textAreaRef.current.selectionEnd = newCursor;
                textAreaRef.current.focus();
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (mentionQuery !== null) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionIndex(prev => Math.min(prev + 1, filteredMentions.length - 1));
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionIndex(prev => Math.max(prev - 1, 0));
                return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                handleSelectMention(mentionIndex);
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setMentionQuery(null);
                setMentionStart(null);
                return;
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setContent(val);
        setDirty(true);
        if (saveStatus === "saved") setSaveStatus("idle");

        // Check for triggers
        const cursor = e.target.selectionStart;
        const result = findActiveMentionQuery(val, cursor);

        if (result) {
            setMentionStart(result.start);
            setMentionQuery(result.query);
        } else {
            setMentionQuery(null);
            setMentionStart(null);
        }
    };

    // Render Helpers
    const handleRetry = () => void doSave();

    const StatusBadge = () => {
        if (!docId) return null;
        if (saveStatus === "saving") return <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 animate-pulse">Saving…</span>;
        if (saveStatus === "saved") return <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700">Saved {formatDate(lastSavedAt)}</span>;
        if (saveStatus === "error") return (
            <span className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 flex items-center gap-1">
                Error <button type="button" onClick={handleRetry} className="underline font-medium hover:text-red-900">Retry</button>
            </span>
        );
        return dirty ? <span className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700">Unsaved</span> : <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">Up to date</span>;
    };

    if (isLoading) return <div className="p-8 text-center text-gray-400">Loading document...</div>;
    if (!docId) return null;

    const previewContent = processMentionsToMarkdown(content);

    return (
        <div className={clsx("flex flex-col gap-2", className)}>
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 border-b pb-2">
                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    {(["write", "split", "preview"] as ViewMode[]).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewMode(m);
                            }}
                            className={clsx(
                                "px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors",
                                viewMode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                            )}
                        >
                            {m}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {dirty && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                void doSave();
                            }}
                            disabled={inFlightRef.current}
                            className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50"
                        >
                            Save now
                        </button>
                    )}
                    <StatusBadge />
                </div>
            </div>

            {/* Editor Area */}
            <div className="border rounded-md overflow-hidden bg-white shadow-sm flex relative" style={{ height }}>
                {/* Write Pane */}
                {(viewMode === "write" || viewMode === "split") && (
                    <div className={clsx("flex-1 h-full relative", viewMode === "split" && "border-r")}>
                        <textarea
                            ref={textAreaRef}
                            value={content}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            // Also need to check on click/select to update mention query state? 
                            // Usually typing handles it, but clicking away should clear it.
                            onSelect={(e) => {
                                // optional: verify if we are still inside a mention? 
                                // For simplicity: do simpler valid check or just clear if moved far?
                                // Let's stick to key events for robust typing, but allow click to maybe clear
                                // If user clicks somewhere else, we should probably close autocomplete
                                // Implementation: check cursor position again
                                const target = e.target as HTMLTextAreaElement;
                                const result = findActiveMentionQuery(target.value, target.selectionStart);
                                if (!result) {
                                    setMentionQuery(null);
                                    setMentionStart(null);
                                }
                            }}
                            className="w-full h-full p-4 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500/10"
                            placeholder="Type markdown here... use [[ to mention docs"
                        />

                        {/* Mention Popover */}
                        {mentionQuery !== null && (filteredMentions.length > 0) && (
                            <div className="absolute left-4 bottom-4 z-10 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden ring-1 ring-black/5">
                                <div className="text-xs bg-gray-50 px-2 py-1 text-gray-500 border-b">Link to doc...</div>
                                {filteredMentions.map((doc, i) => (
                                    <button
                                        key={doc.id}
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault(); // prevent losing focus from textarea
                                            e.stopPropagation();
                                            handleSelectMention(i);
                                        }}
                                        className={clsx(
                                            "w-full text-left px-3 py-2 text-sm truncate",
                                            i === mentionIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                                        )}
                                    >
                                        {doc.title || "Untitled"}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Preview Pane */}
                {(viewMode === "preview" || viewMode === "split") && (
                    <div className="flex-1 h-full overflow-auto bg-gray-50/50 p-4">
                        <article className="prose prose-sm prose-slate max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                {previewContent || "*No content*"}
                            </ReactMarkdown>
                        </article>
                    </div>
                )}
            </div>
            {errorMsg && <div className="text-xs text-red-600 font-medium px-1">{errorMsg}</div>}
        </div>
    );
}
