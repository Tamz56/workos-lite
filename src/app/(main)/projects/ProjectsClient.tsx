"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Project } from "@/lib/types";
import { Plus, MoreVertical, Edit2, Archive, Trash2, ExternalLink, CheckCircle2, Search, Filter, Layout } from "lucide-react";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { Modal } from "@/components/ui/Modal";
import { CreateProjectWizard } from "@/components/dashboard/CreateProjectWizard";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_BASE } from "@/lib/styles";
import { useSearchParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ProjectsClient() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("planned");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // Actions state
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [newName, setNewName] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    
    const sp = useSearchParams();
    const router = useRouter();

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        const url = new URL("/api/projects", window.location.origin);
        if (statusFilter && statusFilter !== "all") {
            url.searchParams.set("status", statusFilter);
        }
        try {
            const res = await fetch(url.toString());
            if (res.ok) {
                setProjects(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        if (sp.get("newProject") === "1") {
            setIsWizardOpen(true);
            router.replace("/projects");
        }
    }, [sp, router]);

    const handleArchive = async (project: Project) => {
        if (!confirm(`Archive "${project.name}"?`)) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/projects/${project.slug}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "done" })
            });
            if (res.ok) fetchProjects();
        } finally {
            setActionLoading(false);
        }
    };

    const handleRename = async () => {
        if (!activeProject || !newName.trim()) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/projects/${activeProject.slug}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName.trim() })
            });
            if (res.ok) {
                setIsRenameOpen(false);
                fetchProjects();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <PageShell>
            <PageHeader
                title="Projects"
                subtitle="Your strategic work containers. Group tasks and manage deliverables."
                actions={
                   <button
                        onClick={() => setIsWizardOpen(true)}
                        className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-black/10 hover:bg-neutral-800 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Create Project
                    </button>
                }
            />

            <div className="max-w-6xl mx-auto space-y-8">
                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-3 h-5 w-5 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="w-full pl-12 pr-4 py-3 bg-neutral-50 border-transparent focus:bg-white focus:border-neutral-200 rounded-xl text-base transition-all outline-none font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Filter className="w-4 h-4 text-neutral-400" />
                        <select
                            className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none shadow-sm focus:border-neutral-400 flex-1 md:flex-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Current Projects</option>
                            <option value="inbox">Inbox Only</option>
                            <option value="planned">Active/Planned</option>
                            <option value="done">Archived</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-neutral-100 italic text-neutral-400 font-medium">Loading projects...</div>
                ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-24 border border-dashed border-neutral-200 rounded-[2.5rem] bg-white flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-neutral-100 rounded-3xl flex items-center justify-center text-neutral-400 mb-4">
                            <Layout className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900">No projects found</h3>
                        <p className="text-neutral-500 max-w-xs mx-auto mt-2 text-sm">
                            {search ? `Your search for "${search}" didn't return any projects.` : "Organization is the key to focus. Start by creating a project container."}
                        </p>
                        {!search && (
                            <button 
                                onClick={() => setIsWizardOpen(true)}
                                className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                Create New Project
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProjects.map(project => (
                            <div key={project.id} className="group relative bg-white border border-neutral-200 rounded-[32px] p-6 hover:shadow-2xl hover:shadow-neutral-200 transition-all hover:border-neutral-300 flex flex-col h-full active:scale-[0.98]">
                                <div className="flex justify-between items-start mb-4">
                                    <Link href={`/projects/${project.slug}`} className="flex-1">
                                        <h2 className="font-black text-xl text-neutral-900 group-hover:text-black transition-colors leading-tight tracking-tight">{project.name}</h2>
                                        <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mt-1.5">{project.slug}</p>
                                    </Link>
                                    
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                        <button 
                                            onClick={() => {
                                                setActiveProject(project);
                                                setNewName(project.name);
                                                setIsRenameOpen(true);
                                            }}
                                            className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
                                            title="Rename"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleArchive(project)}
                                            className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
                                            title="Archive"
                                        >
                                            <Archive className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setActiveProject(project);
                                                setIsDeleteOpen(true);
                                            }}
                                            className="p-2 rounded-xl hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-auto flex items-center justify-between pt-5 border-t border-neutral-50">
                                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                        project.status === 'done' ? 'bg-green-100 text-green-700' : 
                                        project.status === 'planned' ? 'bg-blue-100 text-blue-700' : 
                                        'bg-neutral-100 text-neutral-600'
                                    }`}>
                                        {project.status === 'done' ? 'Archived' : project.status}
                                    </span>
                                    <Link 
                                        href={`/projects/${project.slug}`}
                                        className="flex items-center gap-1.5 text-xs font-black text-neutral-400 hover:text-black transition-all hover:gap-2 uppercase tracking-wide"
                                    >
                                        View Detail <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {activeProject && (
                <>
                    <DeleteProjectDialog
                        isOpen={isDeleteOpen}
                        onClose={() => setIsDeleteOpen(false)}
                        onSuccess={() => fetchProjects()}
                        projectSlug={activeProject.slug}
                        projectName={activeProject.name}
                    />

                    <Modal isOpen={isRenameOpen} onClose={() => setIsRenameOpen(false)} title="Rename Project">
                        <div className="p-2 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-1">New Project Name</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleRename()}
                                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-base font-medium outline-none focus:bg-white focus:border-neutral-900 transition-all"
                                    placeholder="Enter new name..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsRenameOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 text-sm font-bold hover:bg-neutral-50 transition-all">Cancel</button>
                                <button 
                                    onClick={handleRename} 
                                    className="flex-1 px-4 py-3 rounded-xl bg-black text-white text-sm font-black hover:bg-neutral-800 transition-all disabled:opacity-50 shadow-lg shadow-black/10"
                                    disabled={actionLoading || !newName.trim() || newName === activeProject.name}
                                >
                                    {actionLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </Modal>
                </>
            )}

            <CreateProjectWizard 
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSuccess={() => {
                    setShowSuccessToast(true);
                    fetchProjects();
                    setTimeout(() => setShowSuccessToast(false), 5000);
                }}
            />

            {showSuccessToast && (
                <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-neutral-900 border border-neutral-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black text-sm uppercase tracking-widest">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <span>Project Created Successfully!</span>
                    </div>
                </div>
            )}
        </PageShell>
    );
}
