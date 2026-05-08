"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    PenTool, 
    Settings, 
    Target, 
    Share2, 
    Layout,
    Type,
    Zap,
    ChevronDown,
    Plus,
    Save,
    CheckCircle,
    RefreshCw,
    AlertCircle,
    Loader2
} from "lucide-react";
import { WritingProject, WritingBlock } from "@/lib/types/writing-lab";

interface WritingStudioTabProps {
    projectId: string | null;
    projects: WritingProject[];
    onCreateProject: () => void;
    onSelectProject: (id: string) => void;
}

export default function WritingStudioTab({ 
    projectId, 
    projects, 
    onCreateProject,
    onSelectProject 
}: WritingStudioTabProps) {
    const activeProject = projects.find(p => p.id === projectId);
    const [blocks, setBlocks] = useState<WritingBlock[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const fetchBlocks = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/content/writing-lab/projects/${projectId}/blocks`);
            if (res.ok) {
                const data = await res.json();
                setBlocks(data);
            }
        } catch (error) {
            console.error("Failed to fetch blocks", error);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchBlocks();
    }, [fetchBlocks]);

    const handleInitialize = async () => {
        if (!activeProject) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/content/writing-lab/projects/${projectId}/blocks`, {
                method: "POST"
            });
            if (res.ok) {
                const data = await res.json();
                setBlocks(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Failed to initialize blocks", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!projectId || blocks.length === 0) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/content/writing-lab/projects/${projectId}/blocks`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ blocks }),
            });
            if (res.ok) {
                setLastSaved(new Date());
            }
        } catch (error) {
            console.error("Failed to save blocks", error);
        } finally {
            setSaving(false);
        }
    };

    const updateBlockContent = (id: string, content_md: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, content_md } : b));
    };

    return (
        <div className="grid grid-cols-12 gap-8 h-[calc(100vh-280px)] min-h-[600px]">
            {/* Left Column: Context & Structure */}
            <div className="col-span-3 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
                {/* Project Selector */}
                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <PenTool className="w-4 h-4 text-neutral-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Active Project</h4>
                    </div>
                    <div className="relative group">
                        <select 
                            value={projectId || ""}
                            onChange={(e) => onSelectProject(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-sm font-bold text-neutral-900 appearance-none outline-none focus:ring-2 focus:ring-black/5"
                        >
                            <option value="">Select Project...</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-neutral-900 transition-colors" />
                    </div>
                    <button 
                        onClick={onCreateProject}
                        className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 border border-dashed border-neutral-200 rounded-xl text-[10px] font-black text-neutral-400 uppercase tracking-widest hover:bg-neutral-50 hover:text-black transition-all"
                    >
                        <Plus className="w-3 h-3" />
                        New Project
                    </button>
                </div>

                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Context</h4>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight">Writing Mode</label>
                            <div className="mt-1 text-sm font-bold text-neutral-900 uppercase">
                                {activeProject?.writing_mode?.replace(/_/g, ' ') || "—"}
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight">Episode Role</label>
                            <div className="mt-1 text-sm font-bold text-neutral-900 uppercase">
                                {activeProject?.episode_role?.replace(/_/g, ' ') || "—"}
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-tight">Journey Stage</label>
                            <div className="mt-1 text-sm font-bold text-neutral-900 uppercase">
                                {activeProject?.journey_stage || "—"}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm flex-1">
                    <div className="flex items-center gap-2 mb-4">
                        <Layout className="w-4 h-4 text-blue-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Structure</h4>
                    </div>
                    <div className="space-y-2">
                        {activeProject ? (
                            <div className="space-y-3">
                                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-tight mb-1">Summary</div>
                                    <p className="text-xs text-neutral-600 leading-relaxed">{activeProject.summary || "No summary provided."}</p>
                                </div>
                                
                                {blocks.length > 0 && (
                                    <div className="mt-4">
                                        <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Blocks Layout</div>
                                        <div className="space-y-1">
                                            {blocks.map((b, i) => (
                                                <div key={b.id} className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 py-1.5 px-3 bg-neutral-50 rounded-lg border border-neutral-100">
                                                    <span className="text-neutral-300 w-3">{i + 1}</span>
                                                    <span className="truncate">{b.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-[10px] font-bold text-neutral-400 text-center border-dashed">
                                Select a project to view structure
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Center Column: Writing Area */}
            <div className="col-span-6 flex flex-col gap-6">
                {activeProject ? (
                    <div className="bg-white border border-neutral-200 rounded-[40px] shadow-sm flex-1 flex flex-col overflow-hidden">
                        {/* Writing Header */}
                        <div className="px-10 py-8 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-black text-neutral-900 leading-none">{activeProject.title}</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">{activeProject.id}</span>
                                    <span className="w-1 h-1 bg-neutral-200 rounded-full" />
                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{activeProject.status}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {lastSaved && (
                                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                                        <CheckCircle className="w-3 h-3" />
                                        Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                                <button 
                                    onClick={handleSave}
                                    disabled={saving || blocks.length === 0}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl text-xs font-black hover:bg-neutral-800 transition-all shadow-lg shadow-black/10 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    {saving ? "Saving..." : "Save Content"}
                                </button>
                            </div>
                        </div>

                        {/* Blocks Area */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-300">
                                    <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">Loading Blocks...</p>
                                </div>
                            ) : blocks.length > 0 ? (
                                <div className="max-w-3xl mx-auto space-y-12">
                                    {blocks.map((block) => (
                                        <div key={block.id} className="group">
                                            <div className="flex items-center justify-between mb-3 px-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-neutral-300 uppercase tracking-tight group-hover:text-neutral-400 transition-colors">#{block.sort_order + 1}</span>
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-neutral-500">{block.label}</label>
                                                </div>
                                            </div>
                                            <textarea 
                                                value={block.content_md}
                                                onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                                placeholder={block.placeholder || "Start writing here..."}
                                                className="w-full min-h-[120px] bg-transparent text-lg text-neutral-800 leading-relaxed placeholder:text-neutral-200 outline-none resize-none border-l-2 border-transparent focus:border-neutral-100 pl-4 transition-all"
                                                style={{ height: 'auto', minHeight: '120px' }}
                                                onInput={(e) => {
                                                    const target = e.target as HTMLTextAreaElement;
                                                    target.style.height = 'auto';
                                                    target.style.height = target.scrollHeight + 'px';
                                                }}
                                            />
                                        </div>
                                    ))}
                                    
                                    <div className="pt-20 pb-10 text-center">
                                        <div className="w-10 h-1 bg-neutral-100 mx-auto rounded-full mb-6" />
                                        <p className="text-[10px] font-black text-neutral-300 uppercase tracking-[0.2em]">End of Document</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6">
                                        <Layout className="w-8 h-8 text-neutral-200" />
                                    </div>
                                    <h3 className="text-xl font-black text-neutral-900 mb-2">No blocks initialized</h3>
                                    <p className="text-sm text-neutral-400 max-w-xs mx-auto mb-8 leading-relaxed">
                                        This project needs a writing structure. Click below to initialize blocks for 
                                        <span className="text-black font-bold mx-1 uppercase">{activeProject.writing_mode.replace(/_/g, ' ')}</span>.
                                    </p>
                                    <button 
                                        onClick={handleInitialize}
                                        className="px-8 py-3 bg-neutral-900 text-white rounded-2xl text-sm font-black hover:bg-black transition-all shadow-lg flex items-center gap-2"
                                    >
                                        <Zap className="w-4 h-4 text-amber-400" />
                                        Initialize Blocks
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border border-neutral-200 rounded-[40px] p-10 shadow-sm flex-1 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6">
                            <PenTool className="w-8 h-8 text-neutral-300" />
                        </div>
                        <h2 className="text-2xl font-black text-neutral-900 mb-2">Writing Studio</h2>
                        <p className="text-sm text-neutral-400 max-w-xs mx-auto leading-relaxed">
                            This is where your story comes to life. Select a project to start writing.
                        </p>
                        <button 
                            onClick={onCreateProject}
                            className="mt-8 px-8 py-3 bg-black text-white rounded-2xl text-sm font-black hover:bg-neutral-800 transition-all shadow-lg shadow-black/10 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Start New Project
                        </button>
                    </div>
                )}
            </div>

            {/* Right Column: Intelligence & Settings */}
            <div className="col-span-3 flex flex-col gap-6 overflow-y-auto pl-2 custom-scrollbar pb-10">
                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Arbor Intelligence</h4>
                    </div>
                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                        <p className="text-xs text-amber-700 font-medium leading-relaxed">
                            AI Writing Generation is currently disabled. Focus on your human-led narrative structure.
                        </p>
                    </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings className="w-4 h-4 text-neutral-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Settings</h4>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Voice & Tone</span>
                            <span className="text-[10px] font-bold text-neutral-300 uppercase italic">Coming Soon</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Guardrails</span>
                            <span className="text-[10px] font-bold text-neutral-300 uppercase italic">Coming Soon</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Share2 className="w-4 h-4 text-neutral-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Export</h4>
                    </div>
                    <button disabled className="w-full py-2.5 bg-neutral-100 text-neutral-400 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2">
                        <AlertCircle className="w-3 h-3" />
                        Export Disabled
                    </button>
                </div>
            </div>
        </div>
    );
}
