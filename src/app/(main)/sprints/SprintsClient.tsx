"use client";

import { useEffect, useState } from "react";
import { Project, Sprint, ProjectItem } from "@/lib/types";

export default function SprintsClient() {
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedSprint, setSelectedSprint] = useState<string | null>(null);
    const [sprintItems, setSprintItems] = useState<ProjectItem[]>([]);

    // New sprint state
    const [isCreating, setIsCreating] = useState(false);
    const [newSprintName, setNewSprintName] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const [sRes, pRes] = await Promise.all([
            fetch("/api/sprints"),
            fetch("/api/projects")
        ]);
        if (sRes.ok) setSprints(await sRes.json());
        if (pRes.ok) {
            const allProjects = await pRes.json();
            // only planned/active projects for sprint creation
            setProjects(allProjects.filter((p: Project) => p.status !== "done"));
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (!selectedSprint) {
            setSprintItems([]);
            return;
        }
        fetch(`/api/sprints/${selectedSprint}/items`)
            .then(r => r.json())
            .then(data => setSprintItems(data));
    }, [selectedSprint]);

    const handleCreateSprint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSprintName || !selectedProjectId) return;
        const res = await fetch("/api/sprints", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newSprintName, project_id: selectedProjectId, status: "planned" })
        });
        if (res.ok) {
            setNewSprintName("");
            setIsCreating(false);
            loadData();
        }
    };

    const updateItemStatus = async (item: ProjectItem, newStatus: "inbox" | "planned" | "done") => {
        // Optimistic update
        setSprintItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
        await fetch(`/api/project_items/${item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
    };

    const StatusColumn = ({ title, statusKey }: { title: string, statusKey: "inbox" | "planned" | "done" }) => {
        const items = sprintItems.filter(i => i.status === statusKey);

        return (
            <div
                className="flex-1 bg-neutral-50 rounded-lg p-4 border border-neutral-200 min-h-[500px] flex flex-col"
                onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-neutral-100');
                }}
                onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-neutral-100');
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-neutral-100');
                    const itemId = e.dataTransfer.getData("itemId");
                    const item = sprintItems.find(i => i.id === itemId);
                    if (item && item.status !== statusKey) {
                        updateItemStatus(item, statusKey);
                    }
                }}
            >
                <h3 className="font-bold text-neutral-800 mb-4 flex justify-between items-center">
                    {title} <span className="text-neutral-500 font-medium text-sm bg-neutral-200 px-2 py-0.5 rounded-full">{items.length}</span>
                </h3>
                <div className="space-y-3 flex-1">
                    {items.map(item => (
                        <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("itemId", item.id)}
                            className="bg-white p-3 rounded-lg shadow-sm border border-neutral-200 cursor-grab active:cursor-grabbing hover:border-neutral-300 transition-colors"
                        >
                            <div className="font-medium text-sm text-neutral-900 leading-snug">{item.title}</div>
                            {item.workstream && <div className="mt-2 text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded uppercase tracking-wide inline-block">{item.workstream}</div>}
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="text-neutral-400 text-xs italic text-center mt-6">Drop items here</div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <div className="p-6 text-sm text-neutral-500">Loading sprints...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Sprints Kanban</h1>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="bg-neutral-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-800 transition"
                >
                    {isCreating ? "Cancel" : "New Sprint"}
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreateSprint} className="mb-6 bg-white p-4 rounded-lg border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Project</label>
                        <select
                            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm outline-none bg-white focus:border-neutral-900 transition"
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                            required
                        >
                            <option value="">Select Project...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-neutral-600 mb-1">Sprint Name</label>
                        <input
                            type="text"
                            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-900 transition"
                            value={newSprintName}
                            onChange={e => setNewSprintName(e.target.value)}
                            placeholder="e.g. Sprint 1 - Core Features"
                            required
                        />
                    </div>
                    <button type="submit" className="bg-neutral-900 text-white px-6 py-2 rounded-md font-medium text-sm h-[38px] w-full md:w-auto hover:bg-neutral-800 transition">
                        Create Sprint
                    </button>
                </form>
            )}

            <div className="flex gap-4 mb-6 overflow-x-auto pb-2 shrink-0">
                {sprints.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSelectedSprint(s.id)}
                        className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all border ${selectedSprint === s.id ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}`}
                    >
                        {s.name}
                    </button>
                ))}
                {sprints.length === 0 && <span className="text-sm text-neutral-500 py-2">No sprints created yet.</span>}
            </div>

            {selectedSprint ? (
                <div className="flex-1 flex gap-4 overflow-x-auto min-h-0 pb-4">
                    <div className="flex gap-4 min-w-max md:w-full h-full">
                        <StatusColumn title="Todo" statusKey="inbox" />
                        <StatusColumn title="Doing" statusKey="planned" />
                        <StatusColumn title="Done" statusKey="done" />
                    </div>
                </div>
            ) : (
                sprints.length > 0 && <div className="text-neutral-500 text-sm mt-4 text-center">Select a sprint to view its board.</div>
            )}
        </div>
    );
}
