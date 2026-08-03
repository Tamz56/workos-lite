"use client";

import React, { useState, useEffect, Suspense } from "react";
import { 
    Map, 
    Library, 
    PenTool, 
    RefreshCcw, 
    Plus,
    List
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Toast } from "@/components/ui/Toast";

// Components
import StoryMapTab from "@/components/workspaces/content/writing-lab/StoryMapTab";
import EpisodeBacklogTab from "@/components/workspaces/content/writing-lab/EpisodeBacklogTab";
import ContentLibraryTab from "@/components/workspaces/content/writing-lab/ContentLibraryTab";
import WritingStudioTab from "@/components/workspaces/content/writing-lab/WritingStudioTab";
import CreateLabResourceModal from "@/components/workspaces/content/writing-lab/CreateLabResourceModal";

type TabKey = "story-map" | "episode-backlog" | "writing-studio" | "content-library";

function WritingLabContent() {
    const searchParams = useSearchParams();
    const projectIdParam = searchParams.get("project_id");
    const episodeIdParam = searchParams.get("episode_id");

    const [activeTab, setActiveTab] = useState<TabKey>("story-map");
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
    const [projectInitialData, setProjectInitialData] = useState<any>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ isVisible: boolean; message: string }>({ isVisible: false, message: "" });
    
    const [storySets, setStorySets] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    const fetchData = async (background = false) => {
        if (!background) setLoading(true);
        try {
            const [ssRes, pRes] = await Promise.all([
                fetch("/api/content/writing-lab/story-sets", { cache: 'no-store' }),
                fetch("/api/content/writing-lab/projects", { cache: 'no-store' })
            ]);
            
            if (ssRes.ok) {
                const ssData = await ssRes.json();
                setStorySets(ssData);
            }
            if (pRes.ok) {
                const pData = await pRes.json();
                setProjects(pData);
            }
        } catch (error) {
            console.error("Failed to fetch Lab data", error);
        } finally {
            if (!background) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handle deep links from URL search parameters
    useEffect(() => {
        if (projects.length > 0) {
            if (episodeIdParam) {
                setSelectedEpisodeId(episodeIdParam);
                setActiveTab("writing-studio");
            } else if (projectIdParam) {
                const proj = projects.find(p => p.id === projectIdParam);
                if (proj && proj.episode_id) {
                    setSelectedEpisodeId(proj.episode_id);
                } else {
                    setSelectedProjectId(projectIdParam);
                    setSelectedEpisodeId(null);
                }
                setActiveTab("writing-studio");
            }
        }
    }, [projectIdParam, episodeIdParam, projects]);

    const handleSeed = async () => {
        setSeeding(true);
        try {
            const res = await fetch("/api/content/writing-lab/seed", { method: "POST" });
            if (res.ok) {
                setToast({ isVisible: true, message: "🌱 Arbor Writing Lab seeded!" });
                fetchData();
            }
        } catch (error) {
            console.error("Seeding failed", error);
        } finally {
            setSeeding(false);
        }
    };

    const handleOpenCreateProject = (initialData?: any) => {
        setProjectInitialData(initialData || null);
        setIsCreateProjectOpen(true);
    };

    const handleProjectCreated = async (createdItem?: any, type?: "story-set" | "episode") => {
        setToast({ isVisible: true, message: `🚀 ${type === "story-set" ? "Story Set" : "Episode"} created successfully!` });
        setProjectInitialData(null);
        await fetchData();

        if (type === "episode" && createdItem?.id) {
            setSelectedEpisodeId(createdItem.id);
            setSelectedProjectId(null);
            setActiveTab("writing-studio");
        }
    };

    const handleSelectProject = (id: string) => {
        const proj = projects.find(p => p.id === id);
        if (proj && proj.episode_id) {
            setSelectedEpisodeId(proj.episode_id);
        } else {
            setSelectedProjectId(id);
            setSelectedEpisodeId(null);
        }
        setActiveTab("writing-studio");
    };

    const handleSelectEpisode = (id: string) => {
        setSelectedEpisodeId(id);
        setSelectedProjectId(null);
        setActiveTab("writing-studio");
    };

    return (
        <div className="min-h-screen bg-theme-app p-8 transition-theme duration-500">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tight text-theme-primary">Arbor Writing Lab</h1>
                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/50">Phase 2.2</span>
                    </div>
                    <p className="text-sm font-medium text-theme-secondary mt-1">Story Map → Writing Studio → Content Library</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleSeed}
                        disabled={seeding}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700/60 rounded-xl text-sm font-bold text-neutral-600 dark:text-theme-secondary hover:bg-neutral-50 dark:hover:bg-slate-700 transition-all shadow-sm disabled:opacity-50"
                    >
                        <RefreshCcw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
                        {seeding ? 'Seeding...' : 'Seed Data'}
                    </button>
                    <button 
                        onClick={() => handleOpenCreateProject()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-slate-800 border border-transparent dark:border-slate-700 text-white dark:text-theme-primary rounded-xl text-sm font-black hover:bg-neutral-800 dark:hover:bg-slate-700 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Project
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-neutral-200/50 dark:bg-theme-panel/60 p-1.5 rounded-2xl w-fit mb-8 border border-transparent dark:border-theme-border/40">
                <button 
                    onClick={() => setActiveTab("story-map")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "story-map" ? "bg-white dark:bg-theme-card/80 text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-primary dark:hover:text-slate-200"}`}
                >
                    <Map className="w-4 h-4" />
                    Story Map
                </button>
                <button 
                    onClick={() => setActiveTab("episode-backlog")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "episode-backlog" ? "bg-white dark:bg-theme-card/80 text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-primary dark:hover:text-slate-200"}`}
                >
                    <List className="w-4 h-4" />
                    Episode Backlog
                </button>
                <button 
                    onClick={() => setActiveTab("writing-studio")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "writing-studio" ? "bg-white dark:bg-theme-card/80 text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-primary dark:hover:text-slate-200"}`}
                >
                    <PenTool className="w-4 h-4" />
                    Writing Studio
                </button>
                <button 
                    onClick={() => setActiveTab("content-library")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "content-library" ? "bg-white dark:bg-theme-card/80 text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-primary dark:hover:text-slate-200"}`}
                >
                    <Library className="w-4 h-4" />
                    Content Library
                </button>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === "story-map" && (
                    <StoryMapTab 
                        storySets={storySets} 
                        projects={projects}
                        loading={loading} 
                        onRefresh={() => fetchData(true)} 
                        onSelectEpisode={handleSelectEpisode}
                    />
                )}
                {activeTab === "episode-backlog" && (
                    <EpisodeBacklogTab 
                        storySets={storySets} 
                        projects={projects}
                        loading={loading} 
                        onRefresh={() => fetchData(true)}
                        onSelectEpisode={handleSelectEpisode}
                    />
                )}
                {activeTab === "content-library" && (
                    <ContentLibraryTab 
                        projects={projects} 
                        loading={loading} 
                        onSelectProject={handleSelectProject} 
                        onRefresh={() => fetchData(true)} 
                    />
                )}
                {activeTab === "writing-studio" && (
                    <WritingStudioTab 
                        projectId={selectedProjectId}
                        episodeId={selectedEpisodeId} 
                        projects={projects} 
                        storySets={storySets}
                        onCreateProject={() => handleOpenCreateProject()}
                        onSelectProject={handleSelectProject}
                        onSelectEpisode={handleSelectEpisode}
                        onRefresh={() => fetchData(true)}
                    />
                )}
            </div>

            <CreateLabResourceModal 
                isOpen={isCreateProjectOpen}
                onClose={() => setIsCreateProjectOpen(false)}
                storySets={storySets}
                onSuccess={handleProjectCreated}
            />

            <Toast 
                isVisible={toast.isVisible} 
                message={toast.message} 
                onClose={() => setToast({ ...toast, isVisible: false })} 
            />
        </div>
    );
}

export default function WritingLabPage() {
    return (
        <Suspense fallback={<div className="p-8 text-neutral-400">Loading Writing Lab...</div>}>
            <WritingLabContent />
        </Suspense>
    );
}
