"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ArrowLeft, Trash2, Link as LinkIcon, Save, CheckCircle, AlertCircle } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import { Note } from "@/lib/types";

export default function NoteEditorClient({ id }: { id: string }) {
    const router = useRouter();
    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [title, setTitle] = useState("");
    
    // Auto-save refs
    const dirtyRef = useRef(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const fetchNote = useCallback(async () => {
        try {
            const res = await fetch(`/api/notes/${id}`);
            if (res.ok) {
                const data = await res.json();
                setNote(data);
                setTitle(data.title);
            } else {
                router.push("/notes");
            }
        } catch (e) {
            console.error("Failed to fetch note", e);
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        fetchNote();
    }, [fetchNote]);

    const saveNote = useCallback(async (updates: Partial<Note>) => {
        setSaveStatus("saving");
        try {
            const res = await fetch(`/api/notes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (res.ok) {
                setSaveStatus("saved");
                dirtyRef.current = false;
            } else {
                setSaveStatus("error");
            }
        } catch (e) {
            console.error("Failed to save note", e);
            setSaveStatus("error");
        }
    }, [id]);

    const triggerSave = useCallback((updates: Partial<Note>) => {
        dirtyRef.current = true;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveNote(updates);
        }, 1000); // 1s debounce
    }, [saveNote]);

    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        triggerSave({ title: newTitle });
    };

    const handleContentChange = ({ json, html, text }: { json: string; html: string; text: string }) => {
        triggerSave({ 
            content_json: json, 
            content_html: html, 
            plain_text: text 
        });
    };

    const deleteNote = async () => {
        if (!confirm("Are you sure you want to delete this note?")) return;
        try {
            const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
            if (res.ok) {
                router.push("/notes");
            }
        } catch (e) {
            console.error("Failed to delete note", e);
        }
    };

    if (loading) {
        return (
            <PageShell>
                <div className="flex items-center justify-center h-[60vh]">
                    <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
                </div>
            </PageShell>
        );
    }

    if (!note) return null;

    return (
        <PageShell>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 h-full flex flex-col space-y-6">
                <div className="flex items-center justify-between shrink-0">
                    <button 
                        onClick={() => router.push("/notes")}
                        className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors py-2 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Back to Notes</span>
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
                            {saveStatus === "saving" && <><Save className="w-3 h-3 animate-pulse" /> Saving...</>}
                            {saveStatus === "saved" && <><CheckCircle className="w-3 h-3 text-emerald-500" /> All saved</>}
                            {saveStatus === "error" && <><AlertCircle className="w-3 h-3 text-red-500" /> Save failed</>}
                        </div>
                        <button 
                            onClick={deleteNote}
                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete Note"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Editor Surface */}
                <div className="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    <input 
                        type="text"
                        value={title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Note Title"
                        className="text-4xl font-black text-neutral-900 bg-transparent border-none outline-none placeholder:text-neutral-200 w-full tracking-tight"
                    />

                    <div className="flex-1 min-h-0">
                        <RichTextEditor 
                            content={note.content_json}
                            onChange={handleContentChange}
                            placeholder="Tell your story..."
                            className="h-full min-h-[500px] border-none !bg-transparent !focus-within:ring-0"
                        />
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
