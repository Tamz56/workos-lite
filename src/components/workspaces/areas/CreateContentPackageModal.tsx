"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Loader2, PackagePlus, CalendarDays, ListPlus, FolderSearch } from "lucide-react";
import { calculateContentSchedule, CONTENT_VARIANTS } from "@/lib/agent/templates";

interface CreateContentPackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (data: { topicId: string; topicTitle: string; noteId: string; taskIds: string[] }) => void;
}

export default function CreateContentPackageModal({ isOpen, onClose, onSuccess }: CreateContentPackageModalProps) {
    const [topicId, setTopicId] = useState("TOPIC-001");
    const [topicTitle, setTopicTitle] = useState("Untitled Topic");
    const [templateKey, setTemplateKey] = useState("generic_content");
    const [publishDate, setPublishDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // List Management
    const [lists, setLists] = useState<any[]>([]);
    const [listMode, setListMode] = useState<'existing' | 'new'>('new');
    const [selectedListId, setSelectedListId] = useState<string>("");
    const [newListName, setNewListName] = useState<string>("");
    const [isLoadingLists, setIsLoadingLists] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setIsDirty(topicTitle !== "Untitled Topic" || topicId !== "TOPIC-001" || publishDate !== "" || newListName !== "");
    }, [topicTitle, topicId, publishDate, newListName]);

    useEffect(() => {
        if (isOpen) {
            setTopicId("TOPIC-001");
            setTopicTitle("Untitled Topic");
            setTemplateKey("generic_content");
            setPublishDate("");
            setNewListName("");
            setError(null);
            setShowDiscardConfirm(false);
            fetchLists();
        }
    }, [isOpen]);

    const handleClose = () => {
        if (showDiscardConfirm) {
            setShowDiscardConfirm(false);
            return;
        }

        if (isDirty && !isSubmitting) {
            setShowDiscardConfirm(true);
        } else {
            onClose();
        }
    };

    const fetchLists = async () => {
        setIsLoadingLists(true);
        try {
            const res = await fetch("/api/lists?workspace=content");
            if (res.ok) {
                const data = await res.json();
                setLists(data);
                if (data.length > 0) {
                    setListMode('existing');
                    setSelectedListId(data[0].id);
                } else {
                    setListMode('new');
                }
            }
        } catch (err) {
            console.error("Failed to fetch lists", err);
        } finally {
            setIsLoadingLists(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/content/package", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    topicId: topicId.trim(), 
                    topicTitle: topicTitle.trim(),
                    templateKey,
                    publishDate: publishDate || undefined,
                    listId: listMode === 'existing' ? selectedListId : undefined,
                    newListName: listMode === 'new' ? (newListName || topicTitle) : undefined
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create package");
            }

            const data = await res.json();

            // Success! Reset and close
            setTopicId("TOPIC-001");
            setTopicTitle("Untitled Topic");
            setTemplateKey("generic_content");
            setPublishDate("");
            setNewListName("");
            onSuccess(data);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} title="New Content Package" onClose={handleClose}>
            <div className="relative">
                {/* Discard Confirmation Overlay */}
                {showDiscardConfirm && (
                    <div className="absolute inset-0 z-[100] bg-white/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="max-w-xs text-center space-y-6 p-6">
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-neutral-900">Discard Package?</h3>
                                <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                                    You have unsaved changes in this draft. Are you sure you want to discard it?
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={onClose} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-sm">Discard</button>
                                <button onClick={() => setShowDiscardConfirm(false)} className="w-full py-3 bg-neutral-100 text-neutral-600 rounded-xl font-bold text-sm">Keep Editing</button>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 flex items-start gap-3">
                    <div className="mt-0.5 bg-blue-100 text-blue-600 p-2 rounded-lg">
                        <PackagePlus className="w-5 h-5" />
                    </div>
                    <div className="text-sm text-neutral-600 leading-relaxed">
                        This will automatically generate a **Topic List (Container)**, 
                        a **Content Hub note**, and **5 checkpoint tasks** linked together.
                    </div>
                </div>

                <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                        type="button"
                        onClick={() => setListMode('existing')}
                        className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-2 group ${
                            listMode === 'existing'
                                ? 'border-neutral-900 bg-neutral-50 shadow-sm ring-1 ring-neutral-900/5' 
                                : 'border-neutral-100 hover:border-neutral-200 text-neutral-400 bg-white'
                        }`}
                        disabled={lists.length === 0}
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${listMode === 'existing' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200'}`}>
                            <FolderSearch className="w-5 h-5" />
                        </div>
                        <div>
                            <div className={`font-bold text-xs uppercase tracking-tight ${listMode === 'existing' ? 'text-black' : 'text-neutral-400'}`}>Use Existing</div>
                            <div className="text-[10px] opacity-60">Pick a topic from your library</div>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setListMode('new')}
                        className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-2 group ${
                            listMode === 'new'
                                ? 'border-neutral-900 bg-neutral-50 shadow-sm ring-1 ring-neutral-900/5' 
                                : 'border-neutral-100 hover:border-neutral-200 text-neutral-400 bg-white'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${listMode === 'new' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200'}`}>
                            <ListPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <div className={`font-bold text-xs uppercase tracking-tight ${listMode === 'new' ? 'text-black' : 'text-neutral-400'}`}>Create New</div>
                            <div className="text-[10px] opacity-60">Start a fresh content topic</div>
                        </div>
                    </button>
                </div>

                {listMode === 'existing' ? (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500 mb-8">
                        <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest px-1">Select Topic Container</label>
                        <div className="relative group">
                            <FolderSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <select 
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl pl-10 pr-4 py-3 text-base font-bold focus:ring-2 focus:ring-black/5 focus:border-black appearance-none cursor-pointer transition-all"
                                value={selectedListId}
                                onChange={(e) => setSelectedListId(e.target.value)}
                                disabled={isLoadingLists}
                            >
                                <option value="" disabled>Choose an existing topic...</option>
                                {lists.map(list => (
                                    <option key={list.id} value={list.id}>{list.title}</option> // Note: using .title based on my previous view_file
                                ))}
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 mb-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest px-1">New Topic Title</label>
                            <div className="relative group">
                                <ListPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-hover:text-black transition-colors" />
                                <input
                                    type="text"
                                    className="w-full bg-neutral-50 border border-neutral-100 rounded-xl pl-10 pr-4 py-3 text-base font-bold focus:ring-2 focus:ring-black/5 focus:border-black transition-all outline-none"
                                    placeholder="Enter new topic name..."
                                    value={newListName || topicTitle}
                                    onChange={(e) => setNewListName(e.target.value)}
                                />
                                <p className="mt-3 text-[11px] font-bold text-neutral-400 px-1 italic">
                                    This will be created as: <span className="text-black font-black uppercase tracking-tight">{topicId} — {newListName || topicTitle}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                Topic ID
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full bg-neutral-100/50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black focus:border-black focus:bg-white transition-all font-mono"
                                placeholder="e.g. GF-CONTENT-001"
                                value={topicId}
                                onChange={(e) => setTopicId(e.target.value)}
                            />
                            <p className="mt-1.5 text-[9px] text-neutral-400 font-medium px-1 italic">
                                * แนะนำให้ใช้รหัส <span className="text-indigo-600 font-bold">GF-CONTENT-###</span> สำหรับงานใหม่
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                Content Type
                            </label>
                            <select
                                className="w-full bg-neutral-100/50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black focus:border-black focus:bg-white transition-all appearance-none"
                                value={templateKey}
                                onChange={(e) => setTemplateKey(e.target.value)}
                            >
                                <option value="article">Article</option>
                                <option value="short_video">Short Video</option>
                                <option value="carousel">Carousel</option>
                                <option value="generic_content">Generic Content</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                            Package Title (Main Idea)
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full bg-neutral-100/50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black focus:border-black focus:bg-white transition-all"
                            placeholder="e.g. Gardening Pro Tips"
                            value={topicTitle}
                            onChange={(e) => setTopicTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                            Publish Date (Optional)
                        </label>
                        <input
                            type="date"
                            className="w-full bg-neutral-100/50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black focus:border-black focus:bg-white transition-all"
                            value={publishDate}
                            onChange={(e) => setPublishDate(e.target.value)}
                        />
                        
                        {publishDate && (
                            <div className="mt-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <CalendarDays className="w-4 h-4 text-neutral-500" />
                                    <span className="text-xs font-bold text-neutral-600 uppercase tracking-tight">Schedule Preview</span>
                                </div>
                                <div className="space-y-2">
                                    {calculateContentSchedule(publishDate).map((date, idx) => {
                                        const variant = CONTENT_VARIANTS[templateKey] || CONTENT_VARIANTS.generic_content;
                                        const label = variant.taskPrefixes[idx];
                                        const isMain = idx === 3; // Publish task

                                        return (
                                            <div key={idx} className="flex items-center justify-between text-[11px]">
                                                <span className={`font-medium ${isMain ? 'text-black font-bold' : 'text-neutral-500'}`}>
                                                    {label}
                                                </span>
                                                <span className={`font-mono ${isMain ? 'text-blue-600 font-bold' : 'text-neutral-400'}`}>
                                                    {date}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                )}

                <div className="pt-6 flex items-center justify-between border-t border-neutral-100 mt-6">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-6 py-3 text-sm font-bold text-neutral-400 hover:text-red-500 transition-all hover:bg-neutral-50 rounded-xl"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-black text-white px-8 py-3 rounded-2xl text-sm font-black hover:bg-neutral-800 transition-all shadow-xl shadow-black/10 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating Package...
                                </>
                            ) : (
                                "Launch Content Package"
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </Modal>
    );
}
