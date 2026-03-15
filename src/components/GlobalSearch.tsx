"use client";

import { useEffect, useState, useRef } from "react";
import { Search, FileText, CheckCircle2, Folder, Paperclip, X, Command } from "lucide-react";
import { useRouter } from "next/navigation";
import { SearchResult, SearchResultType } from "@/app/api/search/route";
import Link from "next/link";

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    // Shortcut listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Focus input when open
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            fetchResults(""); // Load recent items
        } else {
            setQuery("");
            setResults([]);
        }
    }, [isOpen]);

    const fetchResults = async (q: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            setResults(data.results || []);
            setSelectedIndex(0);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) fetchResults(query);
        }, 150);
        return () => clearTimeout(timer);
    }, [query, isOpen]);

    const handleSelect = (result: SearchResult) => {
        setIsOpen(false);
        if (result.type === "task") {
            // GlobalTaskDialogs listens for ?taskId on any page.
            // We append it to the current URL.
            const url = new URL(window.location.href);
            url.searchParams.set("taskId", result.id);
            router.push(url.pathname + url.search);
        } else {
            router.push(result.url);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === "Enter" && results[selectedIndex]) {
            e.preventDefault();
            handleSelect(results[selectedIndex]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm pointer-events-auto"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <div 
                className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col pointer-events-auto animate-in fade-in zoom-in duration-200"
                onKeyDown={handleKeyDown}
            >
                {/* Search Input */}
                <div className="flex items-center px-4 py-4 border-b border-neutral-100 bg-neutral-50/50">
                    <Search className="w-5 h-5 text-neutral-400 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-lg text-neutral-900 placeholder:text-neutral-400"
                        placeholder="Search tasks, docs, projects..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-neutral-200 bg-white text-[10px] text-neutral-400 font-medium">
                        <Command className="w-2.5 h-2.5" />
                        <span>K</span>
                    </div>
                </div>

                {/* Results Section */}
                <div className="flex-1 overflow-y-auto max-h-[60vh] p-2 custom-scrollbar">
                    {query === "" && results.length > 0 && (
                        <div className="px-3 py-2 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                            Recent Items
                        </div>
                    )}

                    {results.length > 0 ? (
                        results.map((result, idx) => (
                            <button
                                key={`${result.type}-${result.id}`}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                                    idx === selectedIndex ? "bg-emerald-50 text-emerald-900" : "hover:bg-neutral-50"
                                }`}
                                onClick={() => handleSelect(result)}
                            >
                                <div className={`p-2 rounded-lg ${
                                    idx === selectedIndex ? "bg-emerald-100" : "bg-neutral-100"
                                }`}>
                                    {getIcon(result.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium truncate">{result.title}</span>
                                        {result.isArchived && (
                                            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">Done/Archived</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                                        <span className="capitalize">{result.type}</span>
                                        {result.workspace && result.workspace !== "global" && (
                                            <>
                                                <span>•</span>
                                                <span className="truncate">{result.workspace}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {idx === selectedIndex && (
                                    <div className="text-[10px] font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
                                        Enter to select
                                    </div>
                                )}
                            </button>
                        ))
                    ) : !isLoading && query !== "" ? (
                        <div className="p-8 text-center">
                            <div className="inline-flex p-4 rounded-full bg-neutral-50 text-neutral-400 mb-2">
                                <Search className="w-8 h-8" />
                            </div>
                            <p className="text-neutral-500 font-medium">No results found for "{query}"</p>
                            <p className="text-sm text-neutral-400 mt-1">Try a different keyword</p>
                        </div>
                    ) : isLoading ? (
                        <div className="p-8 text-center text-neutral-400 animate-pulse font-medium">
                            Searching...
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 bg-white">↑↓</kbd> to navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 bg-white">↵</kbd> to select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 bg-white">esc</kbd> to close
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getIcon(type: SearchResultType) {
    switch (type) {
        case "task": return <CheckCircle2 className="w-4 h-4" />;
        case "project": return <Folder className="w-4 h-4" />;
        case "doc": return <FileText className="w-4 h-4" />;
        case "attachment": return <Paperclip className="w-4 h-4" />;
        default: return <Search className="w-4 h-4" />;
    }
}
