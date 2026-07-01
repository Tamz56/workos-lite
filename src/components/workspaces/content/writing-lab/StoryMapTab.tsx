"use client";

import React, { useState } from "react";
import { ChevronRight, Layers, FileText, Share2, Plus, MoreVertical, Archive, Trash2, Eye, EyeOff } from "lucide-react";
import CreateEpisodeModal from "./CreateEpisodeModal";

interface StoryMapTabProps {
    storySets: any[];
    loading: boolean;
    onRefresh: () => void;
    onSelectEpisode: (id: string) => void;
}

// Helper to format title to "07 — Title" if it doesn't already start with numbering
const formatEpisodeTitle = (id: string, title: string) => {
    const prefixRegex = /^(\d+)\s*—\s*/;
    let cleanTitle = title.replace(prefixRegex, "");

    if (/^\d+/.test(cleanTitle)) return cleanTitle;
    const match = id.match(/E(\d+)$/i) || id.match(/(\d+)$/);
    if (match) {
        return `${Number(match[1])} — ${cleanTitle}`;
    }
    return cleanTitle;
};

export default function StoryMapTab({ storySets, loading, onRefresh, onSelectEpisode }: StoryMapTabProps) {
    const [selectedStorySet, setSelectedStorySet] = useState<{ id: string; title: string; episodes: any[] } | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const handleArchiveEpisode = async (e: React.MouseEvent, id: string, currentStatus: string) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to ${currentStatus === 'archived' ? 'restore' : 'archive'} this episode?`)) return;
        
        try {
            const res = await fetch(`/api/content/writing-lab/episodes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: currentStatus === 'archived' ? 'idea' : 'archived' })
            });
            if (res.ok) onRefresh();
        } catch (error) {
            console.error("Archive failed", error);
        }
        setActiveMenu(null);
    };

    const handleDeleteEpisode = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm("CRITICAL: Are you sure you want to PERMANENTLY DELETE this episode and ALL its related writing projects/blocks? This cannot be undone.")) return;
        
        try {
            const res = await fetch(`/api/content/writing-lab/episodes/${id}`, {
                method: "DELETE"
            });
            if (res.ok) onRefresh();
        } catch (error) {
            console.error("Delete failed", error);
        }
        setActiveMenu(null);
    };

    if (loading) {
        return <div className="py-20 text-center text-theme-muted">Loading Story Map...</div>;
    }

    if (storySets.length === 0) {
        return (
            <div className="py-20 text-center bg-theme-card border-2 border-dashed border-theme-border rounded-3xl">
                <Layers className="w-12 h-12 text-theme-muted mx-auto mb-4" />
                <p className="text-theme-secondary font-bold">No Story Sets found. Try seeding data.</p>
            </div>
        );
    }

    return (
        <>
            <div className="mb-6 flex justify-end">
                <button 
                    onClick={() => setShowArchived(!showArchived)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showArchived ? 'bg-black dark:bg-slate-800 text-white dark:text-theme-primary border-transparent dark:border-slate-700' : 'bg-theme-card border-theme-border text-theme-secondary hover:bg-theme-hover'}`}
                >
                    {showArchived ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {showArchived ? 'Showing Archived Episodes' : 'Show Archived Episodes'}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storySets.map(set => (
                    <div key={set.id} className="bg-theme-card border border-theme-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                {set.status}
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setSelectedStorySet({ id: set.id, title: set.title, episodes: set.episodes || [] })}
                                    className="p-1.5 bg-theme-panel text-theme-muted hover:text-theme-primary hover:bg-theme-hover rounded-lg transition-all"
                                    title="Add Episode"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 text-theme-subtle hover:text-theme-secondary transition-colors">
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-black text-theme-primary mb-2">{set.title}</h3>
                        <p className="text-sm text-theme-secondary leading-relaxed line-clamp-2 mb-6">
                            {set.description || "No description provided."}
                        </p>

                        <div className="space-y-3 flex-1">
                             <div className="flex items-center justify-between text-[10px] font-bold text-theme-muted uppercase tracking-widest border-b border-theme-border/30 pb-2">
                                <span>Episodes</span>
                                <span>{set.episodes?.filter((ep: any) => showArchived ? true : ep.status !== 'archived').length || 0}</span>
                            </div>
                            
                            {set.episodes && set.episodes.length > 0 ? (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-theme">
                                    {set.episodes
                                        .filter((ep: any) => showArchived ? true : ep.status !== 'archived')
                                        .map((ep: any) => (
                                          <div 
                                            key={ep.id} 
                                            className="group/ep"
                                            onClick={() => onSelectEpisode(ep.id)}
                                          >
                                              <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-theme-hover transition-colors cursor-pointer">
                                                 <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ep.role === 'core_episode' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] dark:shadow-[0_0_12px_rgba(52,211,153,0.1)]' : 'bg-blue-400 dark:bg-blue-500/80'}`} />
                                                 <div className="flex flex-col min-w-0 flex-1">
                                                      <span className={`text-xs font-bold truncate ${ep.role === 'core_episode' ? 'text-theme-primary' : 'text-theme-secondary'} ${ep.status === 'archived' ? 'opacity-50 italic' : ''}`}>
                                                         {formatEpisodeTitle(ep.id, ep.title)} {ep.status === 'archived' && "(Archived)"}
                                                      </span>
                                                      {ep.role !== 'core_episode' && (
                                                         <span className="text-[9px] text-theme-muted uppercase font-black tracking-tight">{ep.role.replace(/_/g, ' ')}</span>
                                                      )}
                                                 </div>
                                                 <div className="flex items-center gap-2 opacity-0 group-hover/ep:opacity-100 transition-opacity relative">
                                                      <button 
                                                          onClick={(e) => {
                                                              e.stopPropagation();
                                                              setActiveMenu(activeMenu === ep.id ? null : ep.id);
                                                          }}
                                                          className="p-1 hover:bg-theme-hover rounded-lg text-theme-muted hover:text-theme-primary transition-all"
                                                      >
                                                          <MoreVertical className="w-3.5 h-3.5" />
                                                      </button>

                                                      {activeMenu === ep.id && (
                                                          <div className="absolute right-0 top-8 z-20 bg-theme-card border border-theme-border rounded-xl shadow-xl p-1.5 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
                                                              <button 
                                                                  onClick={(e) => handleArchiveEpisode(e, ep.id, ep.status)}
                                                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-theme-secondary hover:bg-theme-hover hover:text-theme-primary rounded-lg transition-all"
                                                              >
                                                                 <Archive className="w-3 h-3" />
                                                                 {ep.status === 'archived' ? 'Restore' : 'Archive'}
                                                              </button>
                                                              <button 
                                                                  onClick={(e) => handleDeleteEpisode(e, ep.id)}
                                                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                                                              >
                                                                  <Trash2 className="w-3 h-3" />
                                                                  Delete
                                                              </button>
                                                          </div>
                                                      )}
                                                 </div>
                                              </div>
                                          </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="py-4 text-center">
                                    <p className="text-[10px] font-bold text-neutral-300 uppercase">No episodes mapped</p>
                                     <button 
                                         onClick={() => setSelectedStorySet({ id: set.id, title: set.title, episodes: [] })}
                                         className="mt-2 text-[9px] font-black text-neutral-400 dark:text-slate-600 hover:text-black dark:hover:text-slate-300 uppercase tracking-widest transition-colors"
                                     >
                                         + Add First Episode
                                     </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold text-neutral-400 dark:text-slate-500">
                                    <FileText className="w-3 h-3" />
                                </div>
                                <span className="text-[10px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-tight">{set.episodes?.length || 0} Project Nodes</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {selectedStorySet && (
                <CreateEpisodeModal 
                    isOpen={!!selectedStorySet}
                    onClose={() => setSelectedStorySet(null)}
                    storySetId={selectedStorySet.id}
                    storySetTitle={selectedStorySet.title}
                    coreEpisodes={selectedStorySet.episodes.filter(ep => ep.role === "core_episode")}
                    onSuccess={onRefresh}
                />
            )}
        </>
    );
}
