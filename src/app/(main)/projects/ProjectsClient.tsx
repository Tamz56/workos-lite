"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Project } from "@/lib/types";
import { MoreVertical, Edit2, Archive, Trash2, ExternalLink } from "lucide-react";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { Modal } from "@/components/ui/Modal";
import { CreateProjectWizard } from "@/components/dashboard/CreateProjectWizard";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_BASE } from "@/lib/styles";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

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

    useEffect(() => {
        if (sp.get("newProject") === "1") {
            setIsWizardOpen(true);
            router.replace("/projects");
        }
    }, [sp]);

    const fetchProjects = async () => {
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
    };

    useEffect(() => {
        fetchProjects();
    }, [statusFilter]);

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
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Projects</h1>
                <div className="flex gap-2">
                    <select
                        className="bg-white border border-neutral-200 rounded-md px-3 py-1.5 text-sm outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="inbox">Inbox</option>
                        <option value="planned">Planned</option>
                        <option value="done">Done</option>
                    </select>
                </div>
            </div>

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search projects..."
                    className="w-full bg-white border border-neutral-200 rounded-md px-4 py-2 text-sm outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-neutral-500 text-sm">Loading projects...</div>
            ) : filteredProjects.length === 0 ? (
                <div className="text-neutral-500 text-sm">No projects found.</div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects.map(project => (
                        <div key={project.id} className="group relative bg-white border border-neutral-200 rounded-3xl p-5 hover:shadow-xl transition-all hover:border-neutral-300 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <Link href={`/projects/${project.slug}`} className="flex-1">
                                    <h2 className="font-bold text-lg text-neutral-900 group-hover:text-black transition-colors leading-tight">{project.name}</h2>
                                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">{project.slug}</p>
                                </Link>
                                
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => {
                                            setActiveProject(project);
                                            setNewName(project.name);
                                            setIsRenameOpen(true);
                                        }}
                                        className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900"
                                        title="Rename"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => handleArchive(project)}
                                        className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900"
                                        title="Archive"
                                    >
                                        <Archive className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setActiveProject(project);
                                            setIsDeleteOpen(true);
                                        }}
                                        className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-red-600"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-neutral-50">
                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                    project.status === 'done' ? 'bg-green-50 text-green-700' : 
                                    project.status === 'planned' ? 'bg-blue-50 text-blue-700' : 
                                    'bg-neutral-50 text-neutral-600'
                                }`}>
                                    {project.status}
                                </span>
                                <Link 
                                    href={`/projects/${project.slug}`}
                                    className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-black transition-colors"
                                >
                                    Open <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Project Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className={INPUT_BASE}
                                    placeholder="Enter new name..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsRenameOpen(false)} className={`${BUTTON_SECONDARY} flex-1`}>Cancel</button>
                                <button 
                                    onClick={handleRename} 
                                    className={`${BUTTON_PRIMARY} flex-1`}
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
                    <div className="bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Project Created Successfully!</span>
                    </div>
                </div>
            )}
        </div>
    );
}
