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
    Loader2,
    FileText,
    List
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
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

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

    // Export / Copy Pack Logic
    const getMarkdownBlocks = (skipEmpty = false) => {
        return blocks
            .filter(b => !skipEmpty || b.content_md?.trim() !== "")
            .map(b => `## ${b.label}\n\n${b.content_md || ""}`)
            .join("\n\n");
    };

    const handleCopy = (type: 'markdown' | 'workos' | 'draft' | 'outline') => {
        if (!activeProject) return;

        let content = "";
        let feedback = "";

        switch (type) {
            case 'markdown':
                content = getMarkdownBlocks();
                feedback = "Copied Markdown";
                break;
            case 'workos':
                content = `# ${activeProject.title}\n\n` +
                          `Project ID: ${activeProject.id}\n` +
                          `Topic ID: ${activeProject.topic_id || "—"}\n` +
                          `Writing Mode: ${activeProject.writing_mode || "—"}\n` +
                          `Episode Role: ${activeProject.episode_role || "—"}\n` +
                          `Story Set: ${activeProject.story_set_id || "—"}\n` +
                          `Episode: ${activeProject.episode_id || "—"}\n` +
                          `Status: ${activeProject.status}\n\n` +
                          `---\n\n` +
                          `## Writing Blocks\n\n` +
                          getMarkdownBlocks();
                feedback = "Copied WorkOS Note";
                break;
            case 'draft':
                content = `# ${activeProject.title}\n\n` + getMarkdownBlocks(true);
                feedback = "Copied Article Draft";
                break;
            case 'outline':
                content = `# Outline — ${activeProject.title}\n\n` +
                          blocks.map((b, i) => `${i + 1}. ${b.label}`).join("\n");
                feedback = "Copied Outline";
                break;
        }

        navigator.clipboard.writeText(content);
        setCopyStatus(feedback);
        setTimeout(() => setCopyStatus(null), 2000);
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
                            className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-sm font-bold text-neutral-900 appearance-none outline-none focus:ring-2 focus:ring-black/5 transition-all"
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

                <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm flex-1 min-h-[200px]">
                    <div className="flex items-center gap-2 mb-4">
                        <Layout className="w-4 h-4 text-blue-600" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Structure</h4>
                    </div>
                    <div className="space-y-2">
                        {activeProject ? (
                            <div className="space-y-3">
                                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-tight mb-1">Summary</div>
                                    <p className="text-xs text-neutral-600 leading-relaxed line-clamp-4 hover:line-clamp-none transition-all cursor-help">{activeProject.summary || "No summary provided."}</p>
                                </div>
                                
                                {blocks.length > 0 && (
                                    <div className="mt-4">
                                        <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Blocks Outline</div>
                                        <div className="space-y-1">
                                            {blocks.map((b, i) => (
                                                <div key={b.id} className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 py-1.5 px-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-neutral-200 transition-colors">
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

            {/* Center Column: Wide Writing Area */}
            <div className="col-span-9 flex flex-col gap-6">
                {activeProject ? (
                    <div className="bg-white border border-neutral-200 rounded-[40px] shadow-sm flex-1 flex flex-col overflow-hidden">
                        {/* Writing Header */}
                        <div className="px-10 py-8 border-b border-neutral-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <div className="flex items-center gap-4 mb-1">
                                    <h2 className="text-2xl font-black text-neutral-900 leading-none">{activeProject.title}</h2>
                                    {/* View Mode Toggle */}
                                    <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
                                        <button 
                                            onClick={() => setViewMode('edit')}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'edit' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => setViewMode('preview')}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'preview' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                                        >
                                            Preview
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">{activeProject.id}</span>
                                        <span className="w-1 h-1 bg-neutral-200 rounded-full" />
                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{activeProject.status}</span>
                                    </div>
                                    <span className="w-px h-3 bg-neutral-100" />
                                    {/* Compact Placeholder Toolbar */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 rounded-md">
                                            <Zap className="w-2.5 h-2.5 text-amber-500" />
                                            <span className="text-[8px] font-black text-amber-700 uppercase">AI Disabled</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-neutral-50 rounded-md">
                                            <Settings className="w-2.5 h-2.5 text-neutral-400" />
                                            <span className="text-[8px] font-black text-neutral-500 uppercase">Tone Placeholder</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-neutral-50 rounded-md">
                                            <Share2 className="w-2.5 h-2.5 text-neutral-400" />
                                            <span className="text-[8px] font-black text-neutral-500 uppercase">Export Locked</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {viewMode === 'preview' && blocks.length > 0 && (
                                    <div className="flex items-center gap-2 bg-neutral-100 p-1.5 rounded-2xl">
                                        <button 
                                            onClick={() => handleCopy('markdown')}
                                            title="Copy As Markdown"
                                            className="p-2 hover:bg-white rounded-xl text-neutral-500 hover:text-black transition-all"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleCopy('workos')}
                                            title="Copy WorkOS Note"
                                            className="p-2 hover:bg-white rounded-xl text-neutral-500 hover:text-black transition-all"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleCopy('draft')}
                                            title="Copy Article Draft"
                                            className="p-2 hover:bg-white rounded-xl text-neutral-500 hover:text-black transition-all"
                                        >
                                            <Type className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleCopy('outline')}
                                            title="Copy Outline"
                                            className="p-2 hover:bg-white rounded-xl text-neutral-500 hover:text-black transition-all"
                                        >
                                            <List className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {copyStatus && (
                                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                                        <CheckCircle className="w-3 h-3" />
                                        {copyStatus}
                                    </span>
                                )}
                                
                                {lastSaved && viewMode === 'edit' && !copyStatus && (
                                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                                        <CheckCircle className="w-3 h-3" />
                                        Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                                
                                {viewMode === 'edit' && (
                                    <button 
                                        onClick={handleSave}
                                        disabled={saving || blocks.length === 0}
                                        className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-2xl text-sm font-black hover:bg-neutral-800 transition-all shadow-lg shadow-black/10 disabled:opacity-30 disabled:cursor-not-allowed transform active:scale-95"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {saving ? "Saving..." : "Save Content"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Blocks Area / Preview Area */}
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-neutral-50/30">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full text-neutral-300">
                                    <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                                    <p className="text-sm font-bold uppercase tracking-widest">Loading Blocks...</p>
                                </div>
                            ) : viewMode === 'preview' ? (
                                <div className="max-w-4xl mx-auto py-8">
                                    {blocks.length > 0 ? (
                                        <div className="bg-white border border-neutral-100 rounded-3xl p-12 shadow-sm min-h-[500px]">
                                            <div className="max-w-none">
                                                {blocks.map((block) => (
                                                    <div key={block.id} className="mb-12 last:mb-0">
                                                        <h2 className="text-xl font-black text-neutral-900 border-b border-neutral-100 pb-3 mb-6 uppercase tracking-tight">
                                                            {block.label}
                                                        </h2>
                                                        <div className="text-lg text-neutral-800 leading-relaxed whitespace-pre-wrap">
                                                            {block.content_md || <span className="text-neutral-200 italic font-medium">No content for this section</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-white border border-neutral-100 rounded-3xl shadow-sm">
                                            <AlertCircle className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                                            <p className="text-sm font-bold text-neutral-400 uppercase">No content to preview</p>
                                        </div>
                                    )}
                                </div>
                            ) : blocks.length > 0 ? (
                                <div className="max-w-4xl mx-auto space-y-16">
                                    {blocks.map((block) => (
                                        <div key={block.id} className="group relative">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-8 h-8 flex items-center justify-center bg-white border border-neutral-100 rounded-lg text-[10px] font-black text-neutral-300 uppercase tracking-tight group-hover:text-neutral-900 group-hover:border-neutral-200 transition-all shadow-sm">
                                                        {block.sort_order + 1}
                                                    </span>
                                                    <div>
                                                        <label className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-400 group-focus-within:text-neutral-900 transition-colors">
                                                            {block.label}
                                                        </label>
                                                        {block.placeholder && (
                                                            <p className="text-[8px] font-bold text-neutral-300 uppercase tracking-wider mt-0.5">
                                                                {block.placeholder.length > 40 ? block.placeholder.substring(0, 40) + '...' : block.placeholder}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <textarea 
                                                    value={block.content_md}
                                                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                                    placeholder={block.placeholder || "Start writing here..."}
                                                    className="w-full bg-white border border-neutral-100 rounded-2xl p-6 text-lg text-neutral-800 leading-relaxed placeholder:text-neutral-200 outline-none resize-none focus:ring-4 focus:ring-black/5 focus:border-neutral-200 transition-all shadow-sm group-hover:shadow-md"
                                                    style={{ height: 'auto', minHeight: '160px' }}
                                                    onInput={(e) => {
                                                        const target = e.target as HTMLTextAreaElement;
                                                        target.style.height = 'auto';
                                                        target.style.height = target.scrollHeight + 'px';
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <div className="pt-24 pb-12 text-center">
                                        <div className="w-12 h-1 bg-neutral-200 mx-auto rounded-full mb-8" />
                                        <p className="text-[10px] font-black text-neutral-300 uppercase tracking-[0.3em]">End of Narrative Structure</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                                    <div className="w-24 h-24 bg-white border border-neutral-100 rounded-[32px] flex items-center justify-center mb-8 shadow-sm">
                                        <Layout className="w-10 h-10 text-neutral-200" />
                                    </div>
                                    <h3 className="text-2xl font-black text-neutral-900 mb-3">No blocks initialized</h3>
                                    <p className="text-sm text-neutral-400 max-w-sm mx-auto mb-10 leading-relaxed">
                                        This project needs a writing structure. Click below to initialize blocks for 
                                        <span className="text-black font-bold mx-2 uppercase border-b-2 border-amber-400">{activeProject.writing_mode.replace(/_/g, ' ')}</span>.
                                    </p>
                                    <button 
                                        onClick={handleInitialize}
                                        className="px-10 py-4 bg-neutral-900 text-white rounded-2xl text-sm font-black hover:bg-black transition-all shadow-xl hover:shadow-black/20 flex items-center gap-3 transform hover:-translate-y-1"
                                    >
                                        <Zap className="w-5 h-5 text-amber-400" />
                                        Initialize Narrative Blocks
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border border-neutral-200 rounded-[40px] p-16 shadow-sm flex-1 flex flex-col items-center justify-center text-center">
                        <div className="w-28 h-28 bg-neutral-50 rounded-[40px] flex items-center justify-center mb-8">
                            <PenTool className="w-12 h-12 text-neutral-300" />
                        </div>
                        <h2 className="text-3xl font-black text-neutral-900 mb-3">Writing Studio</h2>
                        <p className="text-base text-neutral-400 max-w-sm mx-auto leading-relaxed">
                            Every great story starts with a single word. Select a project to begin your journey.
                        </p>
                        <button 
                            onClick={onCreateProject}
                            className="mt-10 px-10 py-4 bg-black text-white rounded-[24px] text-sm font-black hover:bg-neutral-800 transition-all shadow-xl shadow-black/10 flex items-center gap-3 transform hover:-translate-y-1"
                        >
                            <Plus className="w-5 h-5" />
                            Create Your First Project
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
