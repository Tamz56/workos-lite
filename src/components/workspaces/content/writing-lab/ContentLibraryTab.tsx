"use client";

import React from "react";
import { 
    Library, 
    Search, 
    Filter, 
    Clock,
    MoreVertical,
    Archive,
    Trash2,
    Eye,
    EyeOff
} from "lucide-react";

import { parseProjectMetadata, ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from "@/lib/projectMetadata";
import ArchiveConfirmationModal from "./ArchiveConfirmationModal";

const ROLE_COLORS: Record<string, string> = {
    core_episode: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    supporting_article: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    bridge_article: "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
    practical_guide: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    journal_note: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    social_only_piece: "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
};

interface ContentLibraryTabProps {
    projects: any[];
    loading: boolean;
    onSelectProject?: (id: string) => void;
    onRefresh: () => void;
}

export default function ContentLibraryTab({ projects, loading, onSelectProject, onRefresh }: ContentLibraryTabProps) {
    const [showArchived, setShowArchived] = React.useState(false);
    const [activeMenu, setActiveMenu] = React.useState<string | null>(null);

    // Modal state
    const [archiveState, setArchiveState] = React.useState<{ id: string; title: string; hasLinkedEpisode: boolean; linkedEpisodeTitle?: string; actionType: "archive" | "restore" } | null>(null);

    const handleArchiveTrigger = (e: React.MouseEvent, project: any) => {
        e.stopPropagation();
        setArchiveState({
            id: project.id,
            title: project.title,
            hasLinkedEpisode: !!project.episode_id,
            linkedEpisodeTitle: project.episode_title,
            actionType: project.status === "archived" ? "restore" : "archive"
        });
        setActiveMenu(null);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm("CRITICAL: Are you sure you want to PERMANENTLY DELETE this project and ALL its writing blocks? This cannot be undone.")) return;
        
        try {
            const res = await fetch(`/api/content/writing-lab/projects/${id}`, {
                method: "DELETE"
            });
            if (res.ok) onRefresh();
        } catch (error) {
            console.error("Delete failed", error);
        }
        setActiveMenu(null);
    };

    const filteredProjects = projects.filter(p => showArchived ? true : p.status !== 'archived');

    if (loading) {
        return <div className="py-20 text-center text-theme-muted">Loading Library...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 bg-theme-card border border-theme-border rounded-2xl p-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
                    <input 
                        type="text" 
                        placeholder="Search writing projects..."
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
                <button className="flex items-center gap-2 px-4 py-2 bg-theme-panel rounded-xl text-xs font-bold text-theme-secondary hover:bg-theme-hover transition-all">
                    <Filter className="w-3.5 h-3.5" />
                    Filter
                </button>
            </div>

            <div className="bg-theme-card border border-theme-border rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-theme-panel/50 border-b border-theme-border">
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Title</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Episode Code</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Asset Type</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Content Layer</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Status</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted">Updated At</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-theme-muted text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-theme-border/50">
                        {filteredProjects.map(project => {
                            const parsedMeta = parseProjectMetadata(project);
                            const badgeColor = ASSET_TYPE_COLORS[parsedMeta.assetType] || "bg-neutral-50 text-neutral-500 border-neutral-150";
                            const badgeLabel = ASSET_TYPE_LABELS[parsedMeta.assetType] || parsedMeta.assetType;

                            return (
                            <tr 
                                key={project.id} 
                                onClick={() => onSelectProject?.(project.id)}
                                className="hover:bg-theme-hover transition-colors group cursor-pointer"
                            >
                                <td className="px-5 py-4">
                                    <div className="font-bold text-theme-primary truncate max-w-[280px] group-hover:text-black dark:group-hover:text-white transition-colors">
                                        {parsedMeta.displayTitle}
                                    </div>
                                    <div className="text-[10px] text-theme-muted mt-0.5 font-mono">{project.id}</div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="text-xs font-bold text-theme-secondary">{parsedMeta.episodeCode || "—"}</div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                        {badgeLabel}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full bg-theme-panel text-theme-muted border border-theme-border">
                                        {parsedMeta.contentLayer?.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${project.status === 'published' ? 'bg-emerald-500' : project.status === 'draft' ? 'bg-amber-400' : project.status === 'archived' ? 'bg-theme-muted/50' : 'bg-blue-500'}`} />
                                        <span className="text-[10px] font-bold text-theme-muted uppercase">{project.status}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-1.5 text-theme-muted">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-[10px] font-medium">{new Date(project.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-right relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(activeMenu === project.id ? null : project.id);
                                        }}
                                        className="p-1.5 hover:bg-theme-hover rounded-lg text-theme-muted hover:text-theme-primary transition-all"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {activeMenu === project.id && (
                                        <div className="absolute right-14 top-4 z-20 bg-theme-card border border-theme-border rounded-xl shadow-xl p-1.5 min-w-[140px] animate-in fade-in zoom-in-95 duration-200">
                                            <button 
                                                onClick={(e) => handleArchiveTrigger(e, project)}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-theme-secondary hover:bg-theme-hover hover:text-theme-primary rounded-lg transition-all cursor-pointer"
                                            >
                                                <Archive className="w-3.5 h-3.5" />
                                                {project.status === 'archived' ? 'Restore' : 'Archive'}
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(e, project.id)}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Delete
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
                {filteredProjects.length === 0 && (
                    <div className="py-20 text-center">
                        <Library className="w-12 h-12 text-theme-muted mx-auto mb-4" />
                        <p className="text-theme-secondary font-bold">{showArchived ? "Library is empty." : "No active projects."}</p>
                        <p className="text-xs text-theme-muted mt-2">
                            {showArchived ? "Try creating a new project." : "Check Show Archived to see hidden projects."}
                        </p>
                    </div>
                )}
            </div>

            {archiveState && (
                <ArchiveConfirmationModal
                    isOpen={!!archiveState}
                    onClose={() => setArchiveState(null)}
                    type="project"
                    itemId={archiveState.id}
                    itemTitle={archiveState.title}
                    hasLinkedItem={archiveState.hasLinkedEpisode}
                    linkedItemTitle={archiveState.linkedEpisodeTitle}
                    actionType={archiveState.actionType}
                    onSuccess={onRefresh}
                />
            )}
        </div>
    );
}
