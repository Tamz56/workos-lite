"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Project, ProjectItem } from "@/lib/types";
import { MoreVertical, Edit2, Archive, Trash2, ChevronLeft } from "lucide-react";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { Modal } from "@/components/ui/Modal";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_BASE } from "@/lib/styles";

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

    const loadData = async () => {
        setLoading(true);
        const [projRes, itemsRes] = await Promise.all([
            fetch(`/api/projects/${slug}`),
            fetch(`/api/projects/${slug}/items`)
        ]);
        if (projRes.ok) setProject(await projRes.json());
        if (itemsRes.ok) setItems(await itemsRes.json());
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [slug]);

    const handleArchive = async () => {
        if (!project || !confirm(`Archive "${project.name}"?`)) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/projects/${slug}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "done" })
            });
            if (res.ok) loadData();
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

    if (loading) return <div className="p-6 text-sm text-neutral-500">Loading project details...</div>;
    if (!project) return <div className="p-6 text-sm text-red-500">Project &quot;{slug}&quot; not found.</div>;

    const milestones = items.filter(i => i.is_milestone === 1);
    const otherItems = items.filter(i => i.is_milestone === 0);

    return (
        <div className="p-6 max-w-5xl mx-auto pb-24">
            <header className="mb-10">
                <div className="flex items-center gap-1 text-sm font-bold text-neutral-400 mb-6 group cursor-pointer" onClick={() => router.push("/projects")}>
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="group-hover:text-black transition-colors">Back to Projects</span>
                </div>
                
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                        <h1 className="text-4xl font-extrabold text-neutral-900 tracking-tight leading-none mb-3">{project.name}</h1>
                        <div className="flex flex-wrap gap-4 items-center">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                project.status === 'done' ? 'bg-green-50 text-green-700' : 
                                project.status === 'planned' ? 'bg-blue-50 text-blue-700' : 
                                'bg-neutral-50 text-neutral-600'
                            }`}>
                                {project.status}
                            </span>
                            <div className="h-4 w-px bg-neutral-200" />
                            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{slug}</p>
                            {project.start_date && (
                                <>
                                    <div className="h-4 w-px bg-neutral-200" />
                                    <p className="text-xs font-bold text-neutral-500">{project.start_date} {project.end_date ? `— ${project.end_date}` : ""}</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => {
                                setNewName(project.name);
                                setIsRenameOpen(true);
                            }}
                            className="p-2.5 rounded-2xl bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 transition-all active:scale-95"
                            title="Rename Project"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={handleArchive}
                            className={`p-2.5 rounded-2xl bg-white border border-neutral-200 transition-all active:scale-95 ${
                                project.status === 'done' ? "text-green-600 border-green-200 bg-green-50" : "text-neutral-400 hover:text-neutral-900 hover:border-neutral-300"
                            }`}
                            disabled={project.status === 'done'}
                            title="Archive Project"
                        >
                            <Archive className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setIsDeleteOpen(true)}
                            className="p-2.5 rounded-2xl bg-white border border-neutral-200 text-neutral-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95"
                            title="Delete Project"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <form onSubmit={handleAddItem} className="mb-8 flex gap-2">
                <input
                    type="text"
                    value={newItemTitle}
                    onChange={e => setNewItemTitle(e.target.value)}
                    placeholder="Quick add a project item..."
                    className="flex-1 bg-white border border-neutral-200 rounded-md px-4 py-2 text-sm outline-none w-full"
                />
                <button type="submit" className="bg-neutral-900 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-neutral-800 transition">
                    Add Item
                </button>
            </form>

            {milestones.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-neutral-800 mb-3">Milestones</h2>
                    <div className="space-y-3">
                        {milestones.map(item => (
                            <ItemCard key={item.id} item={item} />
                        ))}
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-lg font-bold text-neutral-800 mb-3">Project Items</h2>
                {otherItems.length === 0 ? (
                    <div className="text-neutral-500 text-sm">No items yet. Add one above.</div>
                ) : (
                    <div className="space-y-3">
                        {otherItems.map(item => (
                            <ItemCard key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </div>

            <DeleteProjectDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onSuccess={() => router.push("/projects")}
                projectSlug={slug}
                projectName={project.name}
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
                            disabled={actionLoading || !newName.trim() || newName === project.name}
                        >
                            {actionLoading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function ItemCard({ item }: { item: ProjectItem }) {
    return (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 flex justify-between items-center hover:border-neutral-300 transition-colors">
            <div>
                <span className={`font-medium ${item.status === 'done' ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                    {item.title}
                </span>
                {item.workstream && <span className="ml-3 text-xs bg-orange-50 font-medium text-orange-700 border border-orange-100 px-2 py-0.5 rounded-md">{item.workstream}</span>}
                {item.schedule_bucket && item.schedule_bucket !== 'none' && <span className="ml-2 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md capitalize">{item.schedule_bucket}</span>}
            </div>
            <div className="text-xs flex gap-4 items-center">
                <span className={`px-2 py-1 rounded text-neutral-600 ${item.status === 'inbox' ? 'bg-neutral-100' : item.status === 'planned' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                    {item.status.toUpperCase()}
                </span>
                <span className="text-neutral-500 font-medium w-24 text-right">
                    {item.start_date || '-'}
                </span>
            </div>
        </div>
    );
}
