"use client";

import React, { useState } from "react";
import { Search, Filter, Play, Circle, Sparkles, Layers, MoreVertical, Archive, Trash2, Eye, EyeOff, Edit3 } from "lucide-react";
import RenameEpisodeModal from "./RenameEpisodeModal";
import ArchiveConfirmationModal from "./ArchiveConfirmationModal";

interface EpisodeBacklogTabProps {
    storySets: any[];
    projects: any[];
    loading: boolean;
    onRefresh: () => void;
    onSelectEpisode: (id: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
    core_episode: "Core Episode",
    supporting_article: "Supporting Article",
    bridge_article: "Bridge Article",
    practical_guide: "Practical Guide",
    journal_note: "Journal Note",
    social_only_piece: "Social Piece"
};

const ROLE_COLORS: Record<string, string> = {
    core_episode: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    supporting_article: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    bridge_article: "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
    practical_guide: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    journal_note: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    social_only_piece: "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
};

export default function EpisodeBacklogTab({ storySets, projects, loading, onRefresh, onSelectEpisode }: EpisodeBacklogTabProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showArchived, setShowArchived] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Modals state
    const [renameEpisode, setRenameEpisode] = useState<{ id: string; title: string; hasLinkedProject: boolean } | null>(null);
    const [archiveState, setArchiveState] = useState<{ id: string; title: string; hasLinkedProject: boolean; linkedProjectTitle?: string; actionType: "archive" | "restore" } | null>(null);

    const handleArchiveTrigger = (e: React.MouseEvent, ep: any) => {
        e.stopPropagation();
        const linkedProj = projects.find(p => p.episode_id === ep.id);
        setArchiveState({
            id: ep.id,
            title: ep.title,
            hasLinkedProject: !!linkedProj,
            linkedProjectTitle: linkedProj?.title,
            actionType: ep.status === "archived" ? "restore" : "archive"
        });
        setActiveMenu(null);
    };

    const handleRenameTrigger = (e: React.MouseEvent, ep: any) => {
        e.stopPropagation();
        const linkedProj = projects.find(p => p.episode_id === ep.id);
        setRenameEpisode({
            id: ep.id,
            title: ep.title,
            hasLinkedProject: !!linkedProj
        });
        setActiveMenu(null);
    };

    if (loading) {
        return <div className="py-20 text-center text-theme-muted">Loading Backlog...</div>;
    }

    // Flatten all episodes from story sets
    const allEpisodes = storySets.flatMap(set => 
        (set.episodes || []).map((ep: any) => ({
            ...ep,
            story_set_title: set.title
        }))
    );

    // Filter episodes based on search query and status filter
    const filteredEpisodes = allEpisodes.filter(ep => {
        const matchesSearch = ep.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (ep.id || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" 
            ? (showArchived ? true : ep.status !== 'archived') 
            : ep.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <>
            <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-theme-card border border-theme-border rounded-2xl p-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ค้นหาตอน..."
                        className="w-full bg-theme-input border border-theme-border rounded-xl pl-11 pr-4 py-2 text-sm text-theme-primary placeholder:text-theme-muted focus:ring-2 focus:ring-theme-accent/5 transition-all outline-none"
                    />
                </div>
                
                <button 
                    onClick={() => setShowArchived(!showArchived)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showArchived ? 'bg-black dark:bg-slate-800 text-white dark:text-theme-primary border-transparent dark:border-slate-700' : 'bg-theme-panel border-transparent text-theme-secondary hover:bg-theme-hover'}`}
                >
                    {showArchived ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {showArchived ? 'Showing Archived' : 'Show Archived'}
                </button>

                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-theme-input border border-theme-border rounded-xl px-4 py-2 text-xs font-bold text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent/5"
                >
                    <option value="all">All Status</option>
                    <option value="planned">Planned</option>
                    <option value="idea">Idea</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-theme-card border border-theme-border rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-theme-panel/50 border-b border-theme-border">
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Episode Code</th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Title / Topic Title</th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Story Set</th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Role</th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Status</th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-theme-border/50">
                            {filteredEpisodes.map(ep => {
                                const roleColor = ROLE_COLORS[ep.role] || "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-theme-panel dark:text-theme-muted dark:border-theme-border";
                                return (
                                    <tr 
                                        key={ep.id} 
                                        onClick={() => onSelectEpisode(ep.id)}
                                        className="hover:bg-theme-hover transition-colors group cursor-pointer"
                                    >
                                        <td className="px-5 py-4 font-mono text-xs font-bold text-theme-secondary">
                                            {ep.id}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-theme-primary group-hover:text-blue-600 transition-colors">
                                                {ep.title}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-xs font-medium text-theme-secondary">
                                            {ep.story_set_title}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full border ${roleColor}`}>
                                                {ROLE_LABELS[ep.role] || ep.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                    ep.status === 'published' ? 'bg-emerald-500' : 
                                                    ep.status === 'draft' ? 'bg-amber-400' : 
                                                    ep.status === 'idea' ? 'bg-blue-400' : 'bg-neutral-400'
                                                }`} />
                                                <span className="text-[10px] font-bold text-theme-muted uppercase">{ep.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right relative flex items-center justify-end gap-2">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectEpisode(ep.id);
                                                }}
                                                className="px-3 py-1.5 bg-black dark:bg-slate-800 border border-transparent dark:border-slate-700 text-white dark:text-theme-primary rounded-lg text-xs font-black hover:bg-neutral-800 dark:hover:bg-slate-700 transition-all flex items-center gap-1 inline-flex cursor-pointer"
                                            >
                                                <Play className="w-3 h-3 fill-current" />
                                                Write
                                            </button>

                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenu(activeMenu === ep.id ? null : ep.id);
                                                }}
                                                className="p-1.5 hover:bg-theme-hover rounded-lg text-theme-muted hover:text-theme-primary transition-all cursor-pointer"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {activeMenu === ep.id && (
                                                <div className="absolute right-5 top-12 z-20 bg-theme-card border border-theme-border rounded-xl shadow-xl p-1.5 min-w-[120px] text-left animate-in fade-in zoom-in-95 duration-200">
                                                    <button 
                                                        onClick={(e) => handleRenameTrigger(e, ep)}
                                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-theme-secondary hover:bg-theme-hover hover:text-theme-primary rounded-lg transition-all"
                                                    >
                                                       <Edit3 className="w-3.5 h-3.5" />
                                                       Rename
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleArchiveTrigger(e, ep)}
                                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-theme-secondary hover:bg-theme-hover hover:text-theme-primary rounded-lg transition-all"
                                                    >
                                                       <Archive className="w-3.5 h-3.5" />
                                                       {ep.status === 'archived' ? 'Restore' : 'Archive'}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredEpisodes.length === 0 && (
                    <div className="py-20 text-center">
                        <Layers className="w-12 h-12 text-theme-muted mx-auto mb-4" />
                        <p className="text-theme-secondary font-bold">ไม่พบข้อมูลตอนที่สอดคล้องกับการค้นหา</p>
                    </div>
                )}
            </div>
        </div>

        {renameEpisode && (
            <RenameEpisodeModal
                isOpen={!!renameEpisode}
                onClose={() => setRenameEpisode(null)}
                episodeId={renameEpisode.id}
                currentTitle={renameEpisode.title}
                hasLinkedProject={renameEpisode.hasLinkedProject}
                onSuccess={onRefresh}
            />
        )}

        {archiveState && (
            <ArchiveConfirmationModal
                isOpen={!!archiveState}
                onClose={() => setArchiveState(null)}
                type="episode"
                itemId={archiveState.id}
                itemTitle={archiveState.title}
                hasLinkedItem={archiveState.hasLinkedProject}
                linkedItemTitle={archiveState.linkedProjectTitle}
                actionType={archiveState.actionType}
                onSuccess={onRefresh}
            />
        )}
        </>
    );
}
