"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { type Doc } from "@/lib/types";
import { formatDate } from "@/lib/docsUtils";
import { clsx } from "clsx";

type Props = {
    isOpen: boolean;
    docs: Doc[];
    onClose: () => void;
    onOpenDoc: (docId: string) => void;
    onCreateDoc: (title: string) => void;
};

export default function CommandPalette({ isOpen, docs, onClose, onOpenDoc, onCreateDoc }: Props) {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter docs
    const filteredDocs = useMemo(() => {
        if (!query.trim()) {
            return [...docs]
                .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
                .slice(0, 8);
        }
        const q = query.toLowerCase();
        return docs.filter(d => (d.title || "").toLowerCase().includes(q)).slice(0, 10);
    }, [docs, query]);

    // Handle Open/Close effects (External System Sync only)
    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("overflow-hidden");
            // Auto focus
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            document.body.classList.remove("overflow-hidden");
        }
        return () => document.body.classList.remove("overflow-hidden");
    }, [isOpen]);

    // Internal Handlers to avoid setState in effects
    const handleClose = useCallback(() => {
        setQuery("");
        setSelectedIndex(0);
        onClose();
    }, [onClose]);

    const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setSelectedIndex(0);
    };



    const confirmSelection = useCallback(() => {
        if (query.trim() && selectedIndex === filteredDocs.length) {
            onCreateDoc(query);
            handleClose();
            return;
        }
        const doc = filteredDocs[selectedIndex];
        if (doc) {
            onOpenDoc(doc.id);
            handleClose();
        }
    }, [query, selectedIndex, filteredDocs, onCreateDoc, handleClose, onOpenDoc]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                handleClose();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredDocs.length + (query ? 1 : 0) - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === "Enter") {
                if (e.metaKey || e.ctrlKey) {
                    const doc = filteredDocs[selectedIndex];
                    if (doc) {
                        e.preventDefault();
                        window.open(`/docs/${doc.id}`, "_blank");
                        handleClose();
                    }
                } else {
                    e.preventDefault();
                    confirmSelection();
                }
            } else if ((e.metaKey || e.ctrlKey) && e.key === "c") {
                const doc = filteredDocs[selectedIndex];
                if (doc) {
                    e.preventDefault();
                    const url = `${window.location.origin}/docs/${doc.id}`;
                    navigator.clipboard.writeText(url);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, selectedIndex, filteredDocs, query, handleClose, confirmSelection]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]"
            onClick={handleClose}
        >
            <div
                className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] ring-1 ring-gray-900/5"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center px-4 border-b">
                    <span className="text-gray-400 mr-3">🔍</span>
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 h-12 text-lg outline-none placeholder:text-gray-400"
                        placeholder="Search docs..."
                        value={query}
                        onChange={handleQueryChange}
                    />
                    <kbd className="hidden sm:inline-block bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-400 font-mono">
                        Esc
                    </kbd>
                </div>

                <div className="overflow-y-auto flex-1 p-2">
                    {/* Section Header */}
                    {!query && <div className="text-xs font-medium text-gray-500 px-3 py-2 mb-1">Recent</div>}

                    {filteredDocs.map((doc, i) => (
                        <div
                            key={doc.id}
                            className={clsx(
                                "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm",
                                i === selectedIndex ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"
                            )}
                            onMouseEnter={() => setSelectedIndex(i)}
                            onClick={() => {
                                onOpenDoc(doc.id);
                                handleClose();
                            }}
                        >
                            <span className="font-medium truncate pr-4">{doc.title || "Untitled"}</span>
                            <span className={clsx("text-xs shrink-0", i === selectedIndex ? "text-blue-500" : "text-gray-400")}>
                                {formatDate(doc.updated_at)}
                            </span>
                        </div>
                    ))}

                    {query.trim() && (
                        <div
                            className={clsx(
                                "flex items-center px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium",
                                selectedIndex === filteredDocs.length ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"
                            )}
                            onMouseEnter={() => setSelectedIndex(filteredDocs.length)}
                            onClick={() => {
                                onCreateDoc(query);
                                handleClose();
                            }}
                        >
                            <span className="mr-2">➕</span> Create &quot;{query}&quot;
                        </div>
                    )}

                    {!query && filteredDocs.length === 0 && (
                        <div className="p-4 text-center text-gray-400 text-sm">No recent documents</div>
                    )}
                </div>
            </div>
        </div>
    );
}
