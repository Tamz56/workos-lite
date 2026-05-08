"use client";

import React, { useState } from "react";
import { ChevronRight, Layers, FileText, Share2, Plus } from "lucide-react";
import CreateEpisodeModal from "./CreateEpisodeModal";

interface StoryMapTabProps {
    storySets: any[];
    loading: boolean;
    onRefresh: () => void;
}

export default function StoryMapTab({ storySets, loading, onRefresh }: StoryMapTabProps) {
    const [selectedStorySet, setSelectedStorySet] = useState<{ id: string; title: string; episodes: any[] } | null>(null);

    if (loading) {
        return <div className="py-20 text-center text-neutral-400">Loading Story Map...</div>;
    }

    if (storySets.length === 0) {
        return (
            <div className="py-20 text-center bg-white border-2 border-dashed border-neutral-200 rounded-3xl">
                <Layers className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 font-bold">No Story Sets found. Try seeding data.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storySets.map(set => (
                    <div key={set.id} className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                {set.status}
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setSelectedStorySet({ id: set.id, title: set.title, episodes: set.episodes || [] })}
                                    className="p-1.5 bg-neutral-50 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition-all"
                                    title="Add Episode"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 text-neutral-300 hover:text-neutral-600 transition-colors">
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-black text-neutral-900 mb-2">{set.title}</h3>
                        <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2 mb-6">
                            {set.description || "No description provided."}
                        </p>

                        <div className="space-y-3 flex-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-50 pb-2">
                                <span>Episodes</span>
                                <span>{set.episodes?.length || 0}</span>
                            </div>
                            
                            {set.episodes && set.episodes.length > 0 ? (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                    {set.episodes.map((ep: any) => (
                                        <div key={ep.id} className="group/ep">
                                            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ep.role === 'core_episode' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-blue-400'}`} />
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className={`text-xs font-bold truncate ${ep.role === 'core_episode' ? 'text-neutral-900' : 'text-neutral-600'}`}>
                                                        {ep.title}
                                                    </span>
                                                    {ep.role !== 'core_episode' && (
                                                        <span className="text-[9px] text-neutral-400 uppercase font-black tracking-tight">{ep.role.replace(/_/g, ' ')}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover/ep:opacity-100 transition-opacity">
                                                    <span className="text-[9px] font-bold text-neutral-300 uppercase">{ep.status}</span>
                                                    <ChevronRight className="w-3 h-3 text-neutral-300" />
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
                                        className="mt-2 text-[9px] font-black text-neutral-400 hover:text-black uppercase tracking-widest transition-colors"
                                    >
                                        + Add First Episode
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-neutral-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[8px] font-bold text-neutral-400">
                                    <FileText className="w-3 h-3" />
                                </div>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">0 Projects</span>
                            </div>
                            <button className="text-[10px] font-black text-neutral-900 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                                View Map <ChevronRight className="w-3 h-3" />
                            </button>
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
