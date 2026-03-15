"use client";

import React from "react";
import { FileText, Paperclip, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import { timeAgo } from "@/lib/dates";

interface KnowledgeNote {
    id: string;
    title: string;
    updated_at: string;
    hasAttachments: boolean;
}

interface KnowledgeActivityProps {
    notes: KnowledgeNote[];
    loading?: boolean;
}

export default function KnowledgeActivityCard({ notes, loading }: KnowledgeActivityProps) {
    if (loading) {
        return (
            <div className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-sm">
                <div className="h-6 w-48 bg-neutral-100 animate-pulse rounded mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 w-full bg-neutral-50 animate-pulse rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (notes.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-neutral-300" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-1">Knowledge base is clear</h3>
                <p className="text-sm text-neutral-500 max-w-xs mb-6">Start taking notes to build your personal knowledge base.</p>
                <Link href="/docs?newDoc=1" className="px-6 py-2 bg-neutral-50 text-neutral-700 text-sm font-bold rounded-xl hover:bg-neutral-100 transition-colors border border-neutral-200 active:scale-95">
                    New Note
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Recent Knowledge
                </h3>
            </div>
            <div className="divide-y divide-neutral-100 flex-1">
                {notes.map((note) => (
                    <Link 
                        key={note.id} 
                        href={`/docs/${note.id}`}
                        className="group flex items-center justify-between p-4 hover:bg-neutral-50 transition-all active:bg-neutral-100"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-neutral-50 text-neutral-400 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-neutral-600 transition-colors">
                                <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="text-sm font-bold text-neutral-800 truncate group-hover:text-black transition-colors">
                                        {note.title || "Untitled Note"}
                                    </div>
                                    {note.hasAttachments && (
                                        <Paperclip className="w-3 h-3 text-neutral-400 shrink-0" />
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 mt-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span className="uppercase tracking-wider">
                                        UPDATED {timeAgo(new Date(note.updated_at)).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-500 transition-all group-hover:translate-x-0.5 shrink-0" />
                    </Link>
                ))}
            </div>
            <Link 
                href="/docs"
                className="p-4 text-center text-xs font-bold text-neutral-500 hover:text-neutral-900 border-t border-neutral-100 bg-neutral-50/30 hover:bg-neutral-50 transition-all"
            >
                View all notes
            </Link>
        </div>
    );
}
