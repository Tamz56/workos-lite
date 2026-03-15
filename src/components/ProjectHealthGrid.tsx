"use client";

import React from "react";
import { Folder, AlertCircle, CheckCircle2, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";

interface ProjectHealth {
    id: string;
    name: string;
    slug: string;
    openTasks: number;
    overdueCount: number;
    noteCount: number;
}

interface ProjectHealthGridProps {
    projects: ProjectHealth[];
    loading?: boolean;
}

export default function ProjectHealthGrid({ projects, loading }: ProjectHealthGridProps) {
    if (loading) {
        return (
            <div className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-sm">
                <div className="h-6 w-48 bg-neutral-100 animate-pulse rounded mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 w-full bg-neutral-50 animate-pulse rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                    <Folder className="w-8 h-8 text-neutral-300" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-1">Ready for your first project?</h3>
                <p className="text-sm text-neutral-500 max-w-xs mb-6">Create a project to start tracking tasks and notes in a unified view.</p>
                <Link href="/dashboard?newProject=1" className="px-6 py-2 bg-neutral-900 text-white text-sm font-bold rounded-xl hover:bg-neutral-800 transition-colors shadow-sm active:scale-95">
                    Start Project
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    Project Health
                </h3>
                <span className="text-[10px] font-bold text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100">
                    {projects.length} ACTIVE
                </span>
            </div>
            <div className="divide-y divide-neutral-100">
                {projects.map((project) => (
                    <Link 
                        key={project.id} 
                        href={`/projects/${project.slug}`}
                        className="group flex items-center justify-between p-4 hover:bg-neutral-50 transition-all active:bg-neutral-100"
                    >
                        <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${project.overdueCount > 0 ? 'bg-red-50 text-red-600' : 'bg-neutral-50 text-neutral-600'}`}>
                                <Folder className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-neutral-900 truncate group-hover:text-black transition-colors">
                                    {project.name}
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-500">
                                        <CheckCircle2 className="w-3 h-3 text-neutral-400" />
                                        <span>{project.openTasks} TASKS</span>
                                    </div>
                                    {project.overdueCount > 0 && (
                                        <div className="flex items-center gap-1 text-[10px] font-black text-red-600">
                                            <AlertCircle className="w-3 h-3" />
                                            <span>{project.overdueCount} OVERDUE</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-500">
                                        <FileText className="w-3 h-3 text-neutral-400" />
                                        <span>{project.noteCount} NOTES</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-all group-hover:translate-x-0.5 shrink-0" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
