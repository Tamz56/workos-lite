"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    Plus, 
    Link as LinkIcon, 
    Unlink, 
    FileText, 
    Search, 
    X,
    ExternalLink,
    Loader2
} from "lucide-react";
import { Note } from "@/lib/types";
import { useRouter } from "next/navigation";

interface TaskRelatedNotesProps {
    taskId: string;
    workspace: string;
}

export default function TaskRelatedNotes({ taskId, workspace }: TaskRelatedNotesProps) {
    const router = useRouter();
    const [linkedNotes, setLinkedNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [linking, setLinking] = useState(false);
    
    // Search state
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [availableNotes, setAvailableNotes] = useState<Note[]>([]);
    const [searchingNotes, setSearchingNotes] = useState(false);

    const fetchLinkedNotes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/notes?task_id=${taskId}`);
            if (res.ok) {
                const data = await res.json();
                setLinkedNotes(data);
            }
        } catch (e) {
            console.error("Failed to fetch linked notes", e);
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        fetchLinkedNotes();
    }, [fetchLinkedNotes]);

    const handleSearch = useCallback(async (q: string) => {
        if (!q.trim()) {
            setAvailableNotes([]);
            return;
        }
        setSearchingNotes(true);
        try {
            const res = await fetch(`/api/notes?q=${encodeURIComponent(q)}`);
            if (res.ok) {
                const data = await res.json();
                // Filter out already linked notes
                const linkedIds = new Set(linkedNotes.map(n => n.id));
                setAvailableNotes(data.filter((n: Note) => !linkedIds.has(n.id)));
            }
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setSearchingNotes(false);
        }
    }, [linkedNotes]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) handleSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    const linkExistingNote = async (noteId: string) => {
        setLinking(true);
        try {
            const res = await fetch("/api/notes/links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    note_id: noteId,
                    linked_entity_type: "task",
                    linked_entity_id: taskId
                })
            });
            if (res.ok) {
                await fetchLinkedNotes();
                setIsSearching(false);
                setSearchQuery("");
            }
        } catch (e) {
            console.error("Linking failed", e);
        } finally {
            setLinking(false);
        }
    };

    const unlinkNote = async (noteId: string) => {
        try {
            const res = await fetch(`/api/notes/links?note_id=${noteId}&entity_id=${taskId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setLinkedNotes(prev => prev.filter(n => n.id !== noteId));
            }
        } catch (e) {
            console.error("Unlinking failed", e);
        }
    };

    const createAndLinkNote = async () => {
        setLinking(true);
        try {
            const res = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "New Note for Task",
                    content_json: JSON.stringify({ type: "doc", content: [] }),
                    content_html: "",
                    plain_text: "",
                    linked_task_id: taskId
                })
            });
            if (res.ok) {
                const newNote = await res.json();
                router.push(`/notes/edit/${newNote.id}`);
            }
        } catch (e) {
            console.error("Creation failed", e);
        } finally {
            setLinking(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Workflow Tip */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shadow-sm">
                    <LinkIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Workflow Tip</p>
                    <p className="text-xs text-blue-700 leading-relaxed font-medium">
                        <strong>Tasks</strong> are your execution checkpoints. 
                        <strong>Notes</strong> are your full content workspace (Briefs, Scripts, Research). 
                        Work in Notes for the heavy lifting!
                    </p>
                </div>
            </div>

            {/* Header / Actions */}
            <div className="flex items-center justify-between px-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    Linked Content Hubs ({linkedNotes.length})
                </div>
                {!isSearching && (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSearching(true)}
                            className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-black transition-colors"
                        >
                            Link Existing
                        </button>
                        <div className="w-[1px] h-3 bg-neutral-200" />
                        <button 
                            onClick={createAndLinkNote}
                            className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" />
                            Create New Hub
                        </button>
                    </div>
                )}
            </div>

            {/* Search Overlay/Input */}
            {isSearching && (
                <div className="relative animate-in fade-in slide-in-from-top-1 duration-200 px-1">
                    <div className="flex items-center gap-2 bg-neutral-50 rounded-xl p-2.5 border border-neutral-200 focus-within:border-neutral-400 focus-within:ring-4 focus-within:ring-neutral-100 transition-all">
                        <Search className="w-4 h-4 text-neutral-400" />
                        <input 
                            autoFocus
                            type="text"
                            placeholder="Search existing notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-neutral-400"
                        />
                        <button onClick={() => setIsSearching(false)}>
                            <X className="w-4 h-4 text-neutral-400 hover:text-black" />
                        </button>
                    </div>

                    {/* Search Results Dropdown */}
                    {(availableNotes.length > 0 || searchingNotes) && (
                        <div className="absolute top-full left-0 right-0 mx-1 mt-2 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto overflow-x-hidden">
                            {searchingNotes ? (
                                <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-300" /></div>
                            ) : (
                                <div className="p-1">
                                    {availableNotes.map(note => (
                                        <button
                                            key={note.id}
                                            onClick={() => linkExistingNote(note.id)}
                                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-50 rounded-lg transition-colors group"
                                        >
                                            <FileText className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900" />
                                            <span className="flex-1 text-sm font-medium text-neutral-700 truncate">{note.title || "Untitled Note"}</span>
                                            <LinkIcon className="w-3.5 h-3.5 text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Notes List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="py-2 space-y-2 px-1">
                        <div className="h-20 bg-neutral-50 rounded-2xl animate-pulse" />
                        <div className="h-20 bg-neutral-50 rounded-2xl animate-pulse" />
                    </div>
                ) : linkedNotes.length > 0 ? (
                    linkedNotes.map(note => (
                        <div 
                            key={note.id}
                            className="group relative flex flex-col gap-4 p-5 bg-white border border-neutral-200 rounded-[1.5rem] hover:border-blue-200 hover:ring-4 hover:ring-blue-50 transition-all shadow-sm hover:shadow-md cursor-default"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-neutral-50 rounded-2xl text-neutral-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-inner">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1 flex flex-col min-w-0 pt-0.5">
                                    <h4 className="text-base font-black text-neutral-900 truncate leading-tight mb-1">
                                        {note.title || "Untitled Note"}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest bg-neutral-50 px-2 py-0.5 rounded-md">
                                            Content Hub
                                        </span>
                                        <span className="text-[10px] text-neutral-300 font-medium">
                                            Updated {new Date(note.updated_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); unlinkNote(note.id); }}
                                    className="p-2 text-neutral-300 hover:text-red-500 hover:bg-neutral-50 rounded-xl transition-all"
                                    title="Unlink Note"
                                >
                                    <Unlink className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Prominent Action Overlay/Button */}
                            <button 
                                onClick={() => router.push(`/notes/edit/${note.id}`)}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-neutral-50 group-hover:bg-blue-600 rounded-2xl text-sm font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-blue-200 group-hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Open Full Note Editor
                            </button>
                        </div>
                    ))
                ) : (
                    !isSearching && (
                        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-neutral-200 rounded-[2.5rem] bg-neutral-50/50 text-neutral-400 group hover:bg-neutral-50 transition-colors">
                            <FileText className="w-8 h-8 mb-3 opacity-20" />
                            <p className="text-xs font-black uppercase tracking-widest mb-1 text-neutral-500">No content hub linked</p>
                            <p className="text-[10px] text-neutral-400 px-10 text-center leading-relaxed font-medium">
                                Link an existing note or create a new one to serve as your central content workspace for this task.
                            </p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
