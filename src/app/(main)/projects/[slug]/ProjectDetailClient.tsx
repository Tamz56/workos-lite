"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Project, ProjectItem } from "@/lib/types";
import { MoreVertical, Edit2, Archive, Trash2, ChevronLeft, Target, Plus, CheckCircle2, Layout, Calendar, FileText } from "lucide-react";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { Toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ProjectDetailClient() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [project, setProject] = useState<Project | null>(null);
    const [items, setItems] = useState<ProjectItem[]>([]);
    const [newItemTitle, setNewItemTitle] = useState("");
    const [loading, setLoading] = useState(true);

    // Actions state
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [projRes, itemsRes] = await Promise.all([
                fetch(`/api/projects/${slug}`),
                fetch(`/api/projects/${slug}/items`)
            ]);
            if (projRes.ok) setProject(await projRes.json());
            if (itemsRes.ok) setItems(await itemsRes.json());
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleArchive = async () => {
        if (!project || !confirm(`Archive "${project.name}"?`)) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/projects/${slug}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "done" })
            });
            if (res.ok) {
                setToastMessage(`Project "${project.name}" archived successfully`);
                setShowToast(true);
                loadData();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleRename = async () => {
        if (!project || !newName.trim()) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/projects/${slug}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName.trim() })
            });
            if (res.ok) {
                setToastMessage("Project renamed successfully");
                setShowToast(true);
                setIsRenameOpen(false);
                loadData();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemTitle.trim()) return;

        const res = await fetch(`/api/projects/${slug}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newItemTitle, status: "inbox" })
        });

        if (res.ok) {
            setNewItemTitle("");
            loadData();
        }
    };

    if (loading) return <PageShell><div className="p-20 text-center text-neutral-400 italic font-medium">Loading project details...</div></PageShell>;
    if (!project) return <PageShell><div className="p-20 text-center text-red-500 font-bold">Project &quot;{slug}&quot; not found.</div></PageShell>;

    const milestones = items.filter(i => i.is_milestone === 1);
    const otherItems = items.filter(i => i.is_milestone === 0);

    return (
        <PageShell>
            <div className="flex items-center gap-2 mb-6 text-neutral-400 hover:text-black transition-colors cursor-pointer group w-fit" onClick={() => router.push("/projects")}>
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">Projects</span>
            </div>

            <PageHeader
                title={project.name}
                subtitle={`${slug} • ${project.status}`}
                rightMeta={
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                        project.status === 'done' ? 'bg-green-100 text-green-700' : 
                        project.status === 'planned' ? 'bg-blue-100 text-blue-700' : 
                        'bg-neutral-100 text-neutral-600'
                    }`}>
                        {project.status === 'done' ? 'Archived' : project.status}
                    </span>
                }
                actions={
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => {
                                setNewName(project.name);
                                setIsRenameOpen(true);
                            }}
                            className="p-2.5 rounded-2xl bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 transition-all active:scale-95 shadow-sm"
                            title="Rename Project"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={handleArchive}
                            className={`p-2.5 rounded-2xl bg-white border border-neutral-200 transition-all active:scale-95 shadow-sm ${
                                project.status === 'done' ? "text-green-600 border-green-200 bg-green-50" : "text-neutral-400 hover:text-neutral-900 hover:border-neutral-300"
                            }`}
                            disabled={project.status === 'done'}
                            title="Archive Project"
                        >
                            <Archive className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setIsDeleteOpen(true)}
                            className="p-2.5 rounded-2xl bg-white border border-neutral-200 text-neutral-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95 shadow-sm"
                            title="Delete Project"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                }
            />

            <div className="max-w-5xl mx-auto space-y-10 mt-8">
                {/* Project Items Form */}
                <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm focus-within:shadow-md transition-shadow">
                    <form onSubmit={handleAddItem} className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={newItemTitle}
                                onChange={e => setNewItemTitle(e.target.value)}
                                placeholder="Add a project deliverable or item..."
                                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border-transparent focus:bg-white focus:border-neutral-200 rounded-2xl text-base transition-all outline-none font-medium"
                            />
                            <Plus className="absolute left-3.5 top-3.5 h-5 w-5 text-neutral-400" />
                        </div>
                        <button 
                            type="submit" 
                            disabled={!newItemTitle.trim()}
                            className="bg-black text-white px-6 py-3 rounded-2xl text-sm font-black disabled:opacity-50 transition-all hover:bg-neutral-800 shadow-lg shadow-black/10 active:scale-95"
                        >
                            Add Item
                        </button>
                    </form>
                </div>

                {milestones.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <Target className="w-4 h-4 text-orange-500" />
                            <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Major Milestones</h2>
                        </div>
                        <div className="space-y-3">
                            {milestones.map(item => (
                                <ItemCard key={item.id} item={item} />
                            ))}
                        </div>
                    </section>
                )}

                <section>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-2">
                            <Layout className="w-4 h-4 text-neutral-400" />
                            <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Project Backlog / Deliverables</h2>
                        </div>
                        <span className="text-[10px] font-black text-neutral-300 uppercase">{otherItems.length} Items</span>
                    </div>
                    
                    {otherItems.length === 0 ? (
                        <div className="text-center py-20 bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-200">
                            <p className="text-neutral-400 font-medium italic text-sm">No items yet. Quick add above to start building.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {otherItems.map(item => (
                                <ItemCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </section>

                <RelatedNotesSection projectId={project.id} />
            </div>

            <DeleteProjectDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onSuccess={() => router.push("/projects")}
                projectSlug={slug}
                projectName={project.name}
            />

            <Modal isOpen={isRenameOpen} onClose={() => setIsRenameOpen(false)} title="Rename Project">
                <div className="p-2 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-neutral-400 uppercase tracking-widest ml-1">New Project Name</label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-base font-medium outline-none focus:bg-white focus:border-neutral-900 transition-all font-display"
                            placeholder="Enter new name..."
                        />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsRenameOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 text-sm font-bold hover:bg-neutral-50 transition-all">Cancel</button>
                        <button 
                            onClick={handleRename} 
                            className="flex-1 px-4 py-3 rounded-xl bg-black text-white text-sm font-black hover:bg-neutral-800 transition-all disabled:opacity-50 shadow-lg shadow-black/10"
                            disabled={actionLoading || !newName.trim() || newName === project.name}
                        >
                            {actionLoading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </Modal>

            <Toast 
                isVisible={showToast} 
                message={toastMessage} 
                onClose={() => setShowToast(false)} 
            />
        </PageShell>
    );
}

function ItemCard({ item }: { item: ProjectItem }) {
    return (
        <div className="bg-white border border-neutral-200 rounded-3xl p-5 flex justify-between items-center hover:shadow-xl hover:border-neutral-300 transition-all group active:scale-[0.99] cursor-default">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${
                    item.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-neutral-50 text-neutral-400 group-hover:bg-neutral-900 group-hover:text-white'
                }`}>
                    {item.status === 'done' ? <CheckCircle2 className="w-6 h-6" /> : <Layout className="w-5 h-5" />}
                </div>
                <div>
                    <div className={`font-black tracking-tight ${item.status === 'done' ? 'line-through text-neutral-400' : 'text-neutral-900 text-lg'}`}>
                        {item.title}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        {item.workstream && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">
                                {item.workstream}
                            </span>
                        )}
                        {item.schedule_bucket && item.schedule_bucket !== 'none' && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                <Calendar className="w-3 h-3" />
                                {item.schedule_bucket}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        item.status === 'inbox' ? 'bg-neutral-100 text-neutral-500' : 
                        item.status === 'planned' ? 'bg-blue-100 text-blue-700' : 
                        'bg-green-100 text-green-700'
                    }`}>
                        {item.status}
                    </span>
                    {item.start_date && (
                        <span className="text-[10px] font-bold text-neutral-400 mt-1.5 uppercase tracking-tighter">
                            Starts {item.start_date}
                        </span>
                    )}
                </div>
                <button className="p-2 rounded-xl text-neutral-300 hover:text-black hover:bg-neutral-50 transition-all opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

function RelatedNotesSection({ projectId }: { projectId: string }) {
    const router = useRouter();
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNotes = useCallback(async () => {
        try {
            const res = await fetch(`/api/docs?project_id=${projectId}`);
            if (res.ok) {
                const data = await res.json();
                setNotes(data.docs || []);
            }
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    async function handleCreateNote() {
        try {
            const res = await fetch("/api/docs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project_id: projectId, title: "New Project Note" })
            });
            if (res.ok) {
                const data = await res.json();
                router.push(`/docs/${data.doc.id}`);
            }
        } catch (e) {
            alert("Failed to create note");
        }
    }

    return (
        <section>
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Related Notes & Knowledge</h2>
                </div>
                <button 
                    onClick={handleCreateNote}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-[10px] font-black uppercase tracking-widest hover:border-neutral-900 transition-all shadow-sm active:scale-95"
                >
                    <Plus className="w-3 h-3" />
                    Create Note
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-neutral-400 italic text-xs font-medium">Loading related bytes...</div>
            ) : notes.length === 0 ? (
                <div className="text-center py-10 bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-200">
                    <p className="text-neutral-400 font-medium italic text-xs">No linked notes. Document your process.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {notes.map(note => (
                        <div 
                            key={note.id} 
                            onClick={() => router.push(`/docs/${note.id}`)}
                            className="bg-white border border-neutral-200 rounded-2xl p-4 hover:border-neutral-900 transition-all group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]"
                        >
                            <div className="font-bold text-neutral-900 line-clamp-1 group-hover:text-black">{note.title || "Untitled"}</div>
                            <div className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest mt-1">
                                Modified {new Date(note.updated_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
