"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Project } from "@/lib/types";

export default function ProjectsClient() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("planned");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
        fetchProjects();
    }, [statusFilter]);

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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProjects.map(project => (
                        <Link key={project.id} href={`/projects/${project.slug}`}>
                            <div className="bg-white border border-neutral-200 rounded-lg p-4 hover:shadow-sm transition hover:border-neutral-300">
                                <h2 className="font-semibold text-neutral-900">{project.name}</h2>
                                <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                                    <span className={`px-2 py-0.5 rounded-full ${project.status === 'done' ? 'bg-green-100 text-green-700' : project.status === 'planned' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-700'}`}>
                                        {project.status.toUpperCase()}
                                    </span>
                                    {project.start_date && <span>Starts: {project.start_date}</span>}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
