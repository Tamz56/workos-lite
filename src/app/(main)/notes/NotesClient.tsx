"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { 
    Plus, 
    Search, 
    FileText, 
    Clock, 
    MoreVertical, 
    Trash2, 
    ExternalLink 
} from "lucide-react";
import { Note } from "@/lib/types";
import { format } from "date-fns";

export default function KnowledgeClient() {
    const router = useRouter();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/notes");
            if (res.ok) {
                const data = await res.json();
                setNotes(data);
            }
        } catch (e) {
            console.error("Failed to fetch notes", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const filteredNotes = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return notes;
        return notes.filter(n => 
            n.title.toLowerCase().includes(q) || 
            n.plain_text.toLowerCase().includes(q)
        );
    }, [notes, searchQuery]);

    const createNote = async () => {
        try {
            const res = await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "Untitled Note",
                    content_json: JSON.stringify({ type: "doc", content: [] }),
                    content_html: "",
                    plain_text: ""
                }),
            });
            if (res.ok) {
                const newNote = await res.json();
                router.push(`/notes/edit/${newNote.id}`);
            }
        } catch (e) {
            console.error("Failed to create note", e);
        }
    };

    return (
        <PageShell>
            <PageHeader
                title="Notes & Knowledge"
                subtitle="Your team's collective brain. Manage notes, docs, and wikis."
                actions={
                    <button
                        onClick={createNote}
                        className="bg-neutral-900 text-white px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-neutral-800 transition-all shadow-lg shadow-black/5 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        New Note
                    </button>
                }
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Search & Filters */}
                <div className="relative group max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search notes by title or content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-neutral-200 rounded-2xl pl-12 pr-4 py-3.5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-neutral-100 focus:border-neutral-300 transition-all"
                    />
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-neutral-50 animate-pulse rounded-3xl border border-neutral-100" />
                        ))}
                    </div>
                ) : filteredNotes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredNotes.map(note => (
                            <NoteCard 
                                key={note.id} 
                                note={note} 
                                onClick={() => router.push(`/notes/edit/${note.id}`)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 border-2 border-dashed border-neutral-100 rounded-[2.5rem] bg-neutral-50/30">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-neutral-100 text-neutral-300">
                            <FileText className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-900">No notes found</h3>
                            <p className="text-neutral-500 max-w-xs mx-auto text-sm mt-1">
                                {searchQuery ? "Try a different search term or clear the filter." : "Start your knowledge base by creating your first note."}
                            </p>
                        </div>
                        {!searchQuery && (
                            <button
                                onClick={createNote}
                                className="mt-4 px-6 py-2.5 bg-neutral-900 text-white rounded-2xl text-sm font-bold hover:bg-neutral-800 transition-all active:scale-95"
                            >
                                Create Note
                            </button>
                        )}
                    </div>
                )}
            </div>
        </PageShell>
    );
}

function NoteCard({ note, onClick }: { note: Note; onClick: () => void }) {
    return (
        <div 
            onClick={onClick}
            className="group bg-white border border-neutral-200 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-neutral-200/50 hover:border-neutral-300 transition-all cursor-pointer flex flex-col justify-between min-h-[220px] relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-2 bg-neutral-50 rounded-xl hover:bg-neutral-100">
                    <ExternalLink className="w-4 h-4 text-neutral-400" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-neutral-900 group-hover:text-black leading-tight line-clamp-2">
                        {note.title || "Untitled Note"}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                        <Clock className="w-3 h-3" />
                        {format(new Date(note.updated_at), "MMM d, yyyy")}
                    </div>
                </div>
                
                <p className="text-sm text-neutral-500 line-clamp-3 leading-relaxed">
                    {note.plain_text || "No content yet..."}
                </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-neutral-50 mt-4">
                <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-neutral-400">
                        {note.title.charAt(0)}
                    </div>
                </div>
                <div className="text-[10px] font-black text-neutral-300 uppercase tracking-[0.2em]">
                    KNOWLEDGE
                </div>
            </div>
        </div>
    );
}
