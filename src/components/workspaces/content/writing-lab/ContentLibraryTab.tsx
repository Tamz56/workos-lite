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

const ROLE_COLORS: Record<string, string> = {
    core_episode: "bg-emerald-50 text-emerald-600 border-emerald-100",
    supporting_article: "bg-blue-50 text-blue-600 border-blue-100",
    bridge_article: "bg-purple-50 text-purple-600 border-purple-100",
    practical_guide: "bg-amber-50 text-amber-600 border-amber-100",
    journal_note: "bg-rose-50 text-rose-600 border-rose-100",
    social_only_piece: "bg-indigo-50 text-indigo-600 border-indigo-100",
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

    const handleArchive = async (e: React.MouseEvent, id: string, currentStatus: string) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to ${currentStatus === 'archived' ? 'restore' : 'archive'} this project?`)) return;
        
        try {
            const res = await fetch(`/api/content/writing-lab/projects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: currentStatus === 'archived' ? 'draft' : 'archived' })
            });
            if (res.ok) onRefresh();
        } catch (error) {
            console.error("Archive failed", error);
        }
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
        return <div className="py-20 text-center text-neutral-400">Loading Library...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input 
                        type="text" 
                        placeholder="Search writing projects..."
                        className="w-full bg-neutral-50 border-none rounded-xl pl-11 pr-4 py-2 text-sm focus:ring-2 focus:ring-black/5 transition-all outline-none"
                    />
                </div>
                <button 
                    onClick={() => setShowArchived(!showArchived)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${showArchived ? 'bg-black text-white' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'}`}
                >
                    {showArchived ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {showArchived ? 'Showing Archived' : 'Show Archived'}
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-all">
                    <Filter className="w-3.5 h-3.5" />
                    Filter
                </button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-100">
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Title</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Topic ID</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Episode Role</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Writing Mode</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Journey Stage</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Status</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Narrative Status</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Updated At</th>
                            <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {filteredProjects.map(project => {
                            const roleColor = ROLE_COLORS[project.episode_role] || "bg-neutral-100 text-neutral-500 border-neutral-200";
                            return (
                            <tr 
                                key={project.id} 
                                onClick={() => onSelectProject?.(project.id)}
                                className="hover:bg-neutral-50 transition-colors group cursor-pointer"
                            >
                                <td className="px-5 py-4">
                                    <div className="font-bold text-neutral-900 truncate max-w-[200px] group-hover:text-black">{project.title}</div>
                                    <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">{project.id}</div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="text-xs font-mono text-neutral-600">{project.topic_id || "—"}</div>
                                </td>
                                <td className="px-5 py-4">
                                    {project.episode_role ? (
                                        <span className={`text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full border ${roleColor}`}>
                                            {project.episode_role.replace(/_/g, ' ')}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-neutral-300">—</span>
                                    )}
                                </td>
                                <td className="px-5 py-4">
                                    <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200">
                                        {project.writing_mode?.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="text-xs font-medium text-neutral-600 uppercase">{project.journey_stage || "—"}</div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${project.status === 'published' ? 'bg-emerald-500' : project.status === 'draft' ? 'bg-amber-400' : project.status === 'archived' ? 'bg-neutral-300' : 'bg-blue-500'}`} />
                                        <span className="text-[10px] font-bold text-neutral-500 uppercase">{project.status}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    {project.narrative_status ? (
                                        <span className="text-[10px] font-bold text-neutral-500 uppercase">{project.narrative_status.replace(/_/g, ' ')}</span>
                                    ) : (
                                        <span className="text-[10px] text-neutral-300">—</span>
                                    )}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-1.5 text-neutral-400">
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
                                        className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-black transition-all"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {activeMenu === project.id && (
                                        <div className="absolute right-14 top-4 z-20 bg-white border border-neutral-200 rounded-xl shadow-xl p-1.5 min-w-[140px] animate-in fade-in zoom-in-95 duration-200">
                                            <button 
                                                onClick={(e) => handleArchive(e, project.id, project.status)}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:bg-neutral-50 hover:text-black rounded-lg transition-all"
                                            >
                                                <Archive className="w-3.5 h-3.5" />
                                                {project.status === 'archived' ? 'Restore' : 'Archive'}
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(e, project.id)}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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
                        <Library className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-500 font-bold">{showArchived ? "Library is empty." : "No active projects."}</p>
                        <p className="text-xs text-neutral-400 mt-2">
                            {showArchived ? "Try creating a new project." : "Check Show Archived to see hidden projects."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
