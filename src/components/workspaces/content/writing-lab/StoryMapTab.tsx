"use client";

import React from "react";
import { ChevronRight, Layers, FileText, Share2 } from "lucide-react";

interface StoryMapTabProps {
    storySets: any[];
    loading: boolean;
}

export default function StoryMapTab({ storySets, loading }: StoryMapTabProps) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {storySets.map(set => (
                <div key={set.id} className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                            {set.status}
                        </span>
                        <div className="flex gap-2">
                            <button className="p-1.5 text-neutral-300 hover:text-neutral-600 transition-colors">
                                <Share2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    
                    <h3 className="text-xl font-black text-neutral-900 mb-2">{set.title}</h3>
                    <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2 mb-6">
                        {set.description || "No description provided."}
                    </p>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-50 pb-2">
                            <span>Episodes</span>
                            <span>{set.episodes?.length || 0}</span>
                        </div>
                        
                        {set.episodes && set.episodes.length > 0 ? (
                            <div className="space-y-2">
                                {set.episodes.slice(0, 3).map((ep: any) => (
                                    <div key={ep.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 transition-colors cursor-pointer group/ep">
                                        <div className={`w-2 h-2 rounded-full ${ep.role === 'core_episode' ? 'bg-emerald-500' : 'bg-blue-400'}`} />
                                        <span className="text-xs font-bold text-neutral-700 truncate flex-1">{ep.title}</span>
                                        <ChevronRight className="w-3 h-3 text-neutral-300 group-hover/ep:text-neutral-900 transition-colors" />
                                    </div>
                                ))}
                                {set.episodes.length > 3 && (
                                    <button className="text-[10px] font-bold text-neutral-400 hover:text-neutral-900 transition-colors pl-5">
                                        + {set.episodes.length - 3} more episodes
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="py-4 text-center">
                                <p className="text-[10px] font-bold text-neutral-300 uppercase">No episodes mapped</p>
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
    );
}
