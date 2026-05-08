"use client";

import React, { useState, useEffect } from "react";
import { 
    Map, 
    Library, 
    PenTool, 
    RefreshCcw, 
    Plus
} from "lucide-react";
import { Toast } from "@/components/ui/Toast";

// Components
import StoryMapTab from "@/components/workspaces/content/writing-lab/StoryMapTab";
import ContentLibraryTab from "@/components/workspaces/content/writing-lab/ContentLibraryTab";
import WritingStudioTab from "@/components/workspaces/content/writing-lab/WritingStudioTab";
import CreateProjectModal from "@/components/workspaces/content/writing-lab/CreateProjectModal";

type TabKey = "story-map" | "content-library" | "writing-studio";

export default function WritingLabPage() {
    const [activeTab, setActiveTab] = useState<TabKey>("story-map");
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
    const [projectInitialData, setProjectInitialData] = useState<any>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ isVisible: boolean; message: string }>({ isVisible: false, message: "" });
    
    const [storySets, setStorySets] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ssRes, pRes] = await Promise.all([
                fetch("/api/content/writing-lab/story-sets"),
                fetch("/api/content/writing-lab/projects")
            ]);
            
            if (ssRes.ok) setStorySets(await ssRes.json());
            if (pRes.ok) setProjects(await pRes.json());
        } catch (error) {
            console.error("Failed to fetch Lab data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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

    const handleProjectCreated = () => {
        setToast({ isVisible: true, message: "🚀 Project created successfully!" });
        setProjectInitialData(null);
        fetchData();
    };

    const handleSelectProject = (id: string) => {
        setSelectedProjectId(id);
        setActiveTab("writing-studio");
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] p-8">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tight text-neutral-900">Arbor Writing Lab</h1>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">Phase 2.2</span>
                    </div>
                    <p className="text-sm font-medium text-neutral-500 mt-1">Story Map → Writing Studio → Content Library</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleSeed}
                        disabled={seeding}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-600 hover:bg-neutral-50 transition-all shadow-sm disabled:opacity-50"
                    >
                        <RefreshCcw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
                        {seeding ? 'Seeding...' : 'Seed Data'}
                    </button>
                    <button 
                        onClick={() => handleOpenCreateProject()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl text-sm font-black hover:bg-neutral-800 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Project
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-neutral-200/50 p-1.5 rounded-2xl w-fit mb-8">
                <button 
                    onClick={() => setActiveTab("story-map")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "story-map" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                >
                    <Map className="w-4 h-4" />
                    Story Map
                </button>
                <button 
                    onClick={() => setActiveTab("content-library")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "content-library" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                >
                    <Library className="w-4 h-4" />
                    Content Library
                </button>
                <button 
                    onClick={() => setActiveTab("writing-studio")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "writing-studio" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                >
                    <PenTool className="w-4 h-4" />
                    Writing Studio
                </button>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === "story-map" && (
                    <StoryMapTab 
                        storySets={storySets} 
                        loading={loading} 
                        onRefresh={fetchData} 
                        onCreateProject={handleOpenCreateProject}
                    />
                )}
                {activeTab === "content-library" && <ContentLibraryTab projects={projects} loading={loading} onSelectProject={handleSelectProject} />}
                {activeTab === "writing-studio" && (
                    <WritingStudioTab 
                        projectId={selectedProjectId} 
                        projects={projects} 
                        onCreateProject={() => handleOpenCreateProject()}
                        onSelectProject={setSelectedProjectId}
                    />
                )}
            </div>

            <CreateProjectModal 
                isOpen={isCreateProjectOpen}
                onClose={() => setIsCreateProjectOpen(false)}
                storySets={storySets}
                onSuccess={handleProjectCreated}
                initialData={projectInitialData}
            />

            <Toast 
                isVisible={toast.isVisible} 
                message={toast.message} 
                onClose={() => setToast({ ...toast, isVisible: false })} 
            />
        </div>
    );
}
