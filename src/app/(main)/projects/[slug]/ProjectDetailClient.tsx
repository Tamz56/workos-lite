"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Project, ProjectItem } from "@/lib/types";

export default function ProjectDetailClient() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;

    const [project, setProject] = useState<Project | null>(null);
    const [items, setItems] = useState<ProjectItem[]>([]);
    const [newItemTitle, setNewItemTitle] = useState("");
    const [loading, setLoading] = useState(true);

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
        <div className="p-6 max-w-5xl mx-auto">
            <header className="mb-6 flex justify-between items-start">
                <div>
                    <Link href="/projects" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 mb-2 inline-block">&larr; Back to Projects</Link>
                    <h1 className="text-3xl font-bold text-neutral-900">{project.name}</h1>
                    <div className="text-sm text-neutral-500 mt-2 flex gap-4">
                        <span className={`px-2 py-0.5 rounded-full ${project.status === 'done' ? 'bg-green-100 text-green-700' : project.status === 'planned' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-700'}`}>
                            {project.status.toUpperCase()}
                        </span>
                        {project.start_date && project.end_date && <span>{project.start_date} &rarr; {project.end_date}</span>}
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
