"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Project, ProjectRegistryStatus, ProjectProgressStage, ProjectRegistryMetadata } from "@/lib/types";
import {
    Plus, Edit2, Archive, Trash2, ExternalLink,
    Search, LayoutGrid, Table, Info,
    AlertCircle, RefreshCw, ChevronRight
} from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { CreateProjectWizard } from "@/components/dashboard/CreateProjectWizard";
import { useSearchParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import {
    buildProjectRegistryUpdatePayload,
    canonicalProjectToLegacyMetadata,
    getProjectRegistryUiDefaults,
    resolveProjectRegistryMetadata,
} from "@/lib/projects/registryMetadata";

const SEED_PROJECTS = [
    { slug: "workos-lite-arbordesk", name: "WorkOS-Lite / ArborDesk", category: "Core WorkOS" },
    { slug: "green-fineness-content", name: "Green Fineness Content", category: "Green Fineness" },
    { slug: "www-greenfineness", name: "www.greenfineness", category: "Green Fineness" },
    { slug: "gf-content-analytics", name: "GF Content Analytics", category: "Green Fineness" },
    { slug: "gf-trial-lab", name: "GF Trial Lab", category: "Green Fineness" },
    { slug: "gf-knowledge-video-studio", name: "GF Knowledge Video Studio", category: "Green Fineness" },
    { slug: "music-lab", name: "Music Lab", category: "Personal" },
    { slug: "home-renovation-planner", name: "Home Renovation Planner", category: "Personal" },
    { slug: "astro-real-app", name: "Astro Real App", category: "Astro" },
    { slug: "personal-positioning-income-design", name: "Personal Positioning & Income Design", category: "Astro" }
];

const STATUS_LABELS: Record<ProjectRegistryStatus, string> = {
    idea: "Idea",
    planning: "Planning",
    active: "Active",
    in_development: "In Dev",
    testing: "Testing",
    in_use: "In Use",
    maintenance: "Maintenance",
    paused: "Paused",
    completed: "Completed"
};

const STATUS_COLORS: Record<ProjectRegistryStatus, string> = {
    idea: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
    planning: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    in_development: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
    testing: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    in_use: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
    maintenance: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
    paused: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
};

const PRIORITY_COLORS: Record<string, string> = {
    high: "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/30",
    medium: "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30",
    low: "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50",
    none: "bg-neutral-50 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500"
};

const METADATA_KEY = "workos_projects_metadata_v1";

function getStoredMetadata(): Record<string, ProjectRegistryMetadata> {
    if (typeof window === "undefined") return {};
    try {
        const data = localStorage.getItem(METADATA_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Failed to load metadata", e);
        return {};
    }
}

function saveStoredMetadata(metadata: Record<string, ProjectRegistryMetadata>): boolean {
    if (typeof window === "undefined") return false;
    try {
        localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
        return true;
    } catch (e) {
        console.error("Failed to save metadata", e);
        return false;
    }
}

export default function ProjectsClient() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [metadata, setMetadata] = useState<Record<string, ProjectRegistryMetadata>>({});
    const [missingSeeds, setMissingSeeds] = useState<typeof SEED_PROJECTS>([]);
    const [loading, setLoading] = useState(true);

    // View modes
    const [viewMode, setViewMode] = useState<"table" | "card">("table");

    // Filters & Search
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    // Actions state
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    const [activeProject, setActiveProject] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    // Editing fields state
    const [editName, setEditName] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [editStatus, setEditStatus] = useState<ProjectRegistryStatus>("planning");
    const [editPriority, setEditPriority] = useState<"high" | "medium" | "low" | "none">("medium");
    const [editCurrentGoal, setEditCurrentGoal] = useState("");
    const [editProgressStage, setEditProgressStage] = useState<ProjectProgressStage>("Concept");
    const [editNextAction, setEditNextAction] = useState("");
    const [editCadence, setEditCadence] = useState("Weekly");
    const [editRiskOrBlockedBy, setEditRiskOrBlockedBy] = useState("None");

    const sp = useSearchParams();
    const router = useRouter();

    const resolveMetadataForProject = useCallback((project: Project): ProjectRegistryMetadata => {
        const seedConfig = SEED_PROJECTS.find(s => s.slug === project.slug);
        const defaults = getProjectRegistryUiDefaults(project, {
            category: seedConfig?.category ?? "",
        });
        return resolveProjectRegistryMetadata(
            project,
            metadata[project.slug],
            defaults,
        ).metadata;
    }, [metadata]);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        const url = new URL("/api/projects", window.location.origin);
        try {
            const res = await fetch(url.toString(), { cache: "no-store" });
            if (res.ok) {
                const dbProjects: Project[] = await res.json();
                setProjects(dbProjects);

                // Load metadata
                const storedMeta = getStoredMetadata();
                setMetadata(storedMeta);

                // Detect missing seeds
                const missing = SEED_PROJECTS.filter(seed =>
                    !dbProjects.some(p => p.slug === seed.slug)
                );
                setMissingSeeds(missing);
            }
        } catch (e) {
            console.error("Error fetching projects:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
        // Load view mode preference
        const savedViewMode = localStorage.getItem("workos_projects_view_mode");
        if (savedViewMode === "table" || savedViewMode === "card") {
            setViewMode(savedViewMode);
        }
    }, [fetchProjects]);

    useEffect(() => {
        if (sp.get("newProject") === "1") {
            setIsWizardOpen(true);
            router.replace("/projects");
        }
    }, [sp, router]);

    const handleViewModeChange = (mode: "table" | "card") => {
        setViewMode(mode);
        localStorage.setItem("workos_projects_view_mode", mode);
    };

    // Client-side Seeding Action (Non-silent)
    const handleCreateMissingSeeds = async () => {
        if (missingSeeds.length === 0) return;
        setActionLoading(true);
        try {
            let count = 0;
            const updatedMeta = { ...metadata };

            for (const seed of missingSeeds) {
                const res = await fetch("/api/projects", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: seed.name,
                        slug: seed.slug,
                        status: "planned"
                    })
                });

                if (res.ok) {
                    const created: Project = await res.json();
                    updatedMeta[seed.slug] = canonicalProjectToLegacyMetadata(created);
                    count++;
                }
            }

            saveStoredMetadata(updatedMeta);
            setMetadata(updatedMeta);
            setToastMessage(`สร้างโปรเจกต์เริ่มต้นสำเร็จ ${count} โปรเจกต์`);
            setShowToast(true);
            await fetchProjects();
        } catch (e) {
            console.error("Error seeding projects:", e);
            setToastMessage("เกิดข้อผิดพลาดระหว่างการสร้างโปรเจกต์เริ่มต้น");
            setShowToast(true);
        } finally {
            setActionLoading(false);
        }
    };

    const handleArchive = async () => {
        if (!activeProject) return;
        const projectRecord = projects.find((project) => project.slug === activeProject.slug);
        if (!projectRecord) return;
        setActionLoading(true);
        try {
            const currentMeta = resolveMetadataForProject(projectRecord);
            const archiveMeta: ProjectRegistryMetadata = {
                ...currentMeta,
                status: "completed",
                progressStage: "In Use",
            };
            const res = await fetch(`/api/projects/${activeProject.slug}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    buildProjectRegistryUpdatePayload(projectRecord.name, archiveMeta),
                ),
            });
            const responseBody = await res.json();
            if (!res.ok) {
                throw new Error(responseBody.error || "ไม่สามารถจัดเก็บโปรเจกต์ได้");
            }
            const updatedProject = responseBody as Project;
            const updatedMeta = {
                ...metadata,
                [updatedProject.slug]: canonicalProjectToLegacyMetadata(updatedProject),
            };
            setProjects((current) => current.map((project) => (
                project.slug === updatedProject.slug ? updatedProject : project
            )));
            setMetadata(updatedMeta);
            if (!saveStoredMetadata(updatedMeta)) {
                console.warn("Canonical project saved, but compatibility metadata mirror failed");
            }
            setToastMessage(`บันทึกการจัดเก็บโปรเจกต์ "${activeProject.name}" เรียบร้อยแล้ว`);
            setShowToast(true);
            setIsArchiveOpen(false);
        } catch (e) {
            console.error("Error archiving project:", e);
            setToastMessage(e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการจัดเก็บโปรเจกต์");
            setShowToast(true);
        } finally {
            setActionLoading(false);
        }
    };

    const openEditPanel = (project: any) => {
        setActiveProject(project);
        const projectRecord = projects.find((record) => record.slug === project.slug);
        if (!projectRecord) return;
        const meta = resolveMetadataForProject(projectRecord);
        setEditName(project.name);
        setEditCategory(meta.category);
        setEditStatus(meta.status);
        setEditPriority(meta.priority);
        setEditCurrentGoal(meta.currentGoal);
        setEditProgressStage(meta.progressStage);
        setEditNextAction(meta.nextAction);
        setEditCadence(meta.cadence);
        setEditRiskOrBlockedBy(meta.riskOrBlockedBy);
        setIsEditOpen(true);
    };

    const handleSaveMetadata = async () => {
        if (!activeProject) return;
        setActionLoading(true);
        try {
            const newMeta: ProjectRegistryMetadata = {
                category: editCategory,
                status: editStatus,
                priority: editPriority,
                currentGoal: editCurrentGoal,
                progressStage: editProgressStage,
                nextAction: editNextAction,
                cadence: editCadence,
                riskOrBlockedBy: editRiskOrBlockedBy,
                lastUpdated: activeProject.lastUpdated,
            };
            const res = await fetch(`/api/projects/${activeProject.slug}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(buildProjectRegistryUpdatePayload(editName, newMeta)),
            });
            const responseBody = await res.json();
            if (!res.ok) {
                throw new Error(responseBody.error || "ไม่สามารถบันทึกข้อมูลโปรเจกต์ได้");
            }
            const updatedProject = responseBody as Project;
            const updatedMetadata = {
                ...metadata,
                [updatedProject.slug]: canonicalProjectToLegacyMetadata(updatedProject),
            };

            setProjects((current) => current.map((project) => (
                project.slug === updatedProject.slug ? updatedProject : project
            )));
            setMetadata(updatedMetadata);
            if (!saveStoredMetadata(updatedMetadata)) {
                console.warn("Canonical project saved, but compatibility metadata mirror failed");
            }

            setToastMessage("บันทึกการปรับปรุงโปรเจกต์สำเร็จ");
            setShowToast(true);
            setIsEditOpen(false);
        } catch (e) {
            console.error("Error updating project metadata:", e);
            setToastMessage(e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            setShowToast(true);
        } finally {
            setActionLoading(false);
        }
    };

    // Prepare Merged Projects
    const mergedProjects = useMemo(() => {
        return projects.map(p => {
            const meta = resolveMetadataForProject(p);
            return {
                ...p,
                ...meta
            };
        });
    }, [projects, resolveMetadataForProject]);

    // Categories dynamic list for filters
    const categoriesList = useMemo(() => {
        const unique = new Set(mergedProjects.map(p => p.category).filter(Boolean));
        return Array.from(unique);
    }, [mergedProjects]);

    // Filtering & Searching logic
    const filteredProjects = useMemo(() => {
        return mergedProjects.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === "all" || p.status === statusFilter;
            const matchPriority = priorityFilter === "all" || p.priority === priorityFilter;
            const matchCategory = categoryFilter === "all" || p.category === categoryFilter;
            return matchSearch && matchStatus && matchPriority && matchCategory;
        });
    }, [mergedProjects, search, statusFilter, priorityFilter, categoryFilter]);

    return (
        <PageShell>
            <PageHeader
                title="Project Registry"
                subtitle="ฐานข้อมูลทะเบียนโปรเจกต์ทั้งหมดของ WorkOS-Lite และประเมินความคืบหน้าแบบ Local-First"
                actions={
                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 px-5 py-2.5 rounded-xl text-sm font-black shadow-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Create Project
                    </button>
                }
            />

            <div className="max-w-7xl mx-auto space-y-8 pb-12">

                {/* Seed Preview Panel */}
                {missingSeeds.length > 0 && (
                    <div className="bg-amber-50/50 border border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/30 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="space-y-1.5 flex-1">
                            <h3 className="text-base font-bold text-amber-900 dark:text-amber-400 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                พบโปรเจกต์ตั้งต้นที่ขาดหาย ({missingSeeds.length} รายการ)
                            </h3>
                            <p className="text-sm text-amber-700/90 dark:text-amber-500/80 max-w-2xl leading-relaxed">
                                เพื่อให้ระบบมีข้อมูลครบถ้วนสำหรับฟลอว์งาน ArborDesk คุณสามารถเพิ่มโปรเจกต์พื้นฐานต่อไปนี้ลงฐานข้อมูลหลักได้:
                            </p>
                            <div className="flex flex-wrap gap-1.5 pt-2">
                                {missingSeeds.map(s => (
                                    <span key={s.slug} className="px-2.5 py-1 bg-white/70 border border-amber-200 dark:bg-neutral-900/60 dark:border-amber-900/20 text-xs font-semibold text-amber-800 dark:text-amber-400 rounded-lg">
                                        {s.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={handleCreateMissingSeeds}
                            disabled={actionLoading}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0 disabled:opacity-50"
                        >
                            {actionLoading ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    กำลังสร้าง...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Create Missing Seed Projects
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Filter and Configuration Controls */}
                <div className="flex flex-col gap-4 bg-theme-panel p-5 rounded-3xl border border-neutral-200 shadow-sm">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">

                        {/* Search */}
                        <div className="relative flex-1 min-w-[280px]">
                            <Search className="absolute left-4 top-3.5 h-5 w-5 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="ค้นหาโปรเจกต์ด้วยชื่อ หรือ Slug..."
                                className="w-full pl-12 pr-4 py-3 bg-theme-card border-transparent focus:bg-white focus:border-neutral-300 rounded-xl text-base transition-all outline-none font-medium text-theme-primary"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-1.5 bg-theme-card p-1 rounded-xl border border-neutral-200 self-end lg:self-auto shrink-0">
                            <button
                                onClick={() => handleViewModeChange("table")}
                                className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${
                                    viewMode === "table"
                                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
                                        : "text-neutral-500 hover:text-neutral-950"
                                }`}
                                title="Table Layout"
                            >
                                <Table className="w-4 h-4" />
                                ตาราง
                            </button>
                            <button
                                onClick={() => handleViewModeChange("card")}
                                className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${
                                    viewMode === "card"
                                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
                                        : "text-neutral-500 hover:text-neutral-950"
                                }`}
                                title="Grid/Card Layout"
                            >
                                <LayoutGrid className="w-4 h-4" />
                                การ์ด
                            </button>
                        </div>
                    </div>

                    {/* Filter selects */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-neutral-200/50">
                        {/* Status Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">สถานะโครงการ</label>
                            <div className="relative">
                                <select
                                    className="w-full bg-theme-card border border-neutral-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-neutral-400"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">ทั้งหมด (ทุกสถานะ)</option>
                                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Priority Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">ความสำคัญ (Priority)</label>
                            <select
                                className="w-full bg-theme-card border border-neutral-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-neutral-400"
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                            >
                                <option value="all">ทั้งหมด (ทุกความสำคัญ)</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                                <option value="none">None</option>
                            </select>
                        </div>

                        {/* Category Filter */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">หมวดหมู่โครงการ</label>
                            <select
                                className="w-full bg-theme-card border border-neutral-200 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-neutral-400"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="all">ทั้งหมด (ทุกหมวดหมู่)</option>
                                {categoriesList.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 bg-theme-card rounded-3xl border border-neutral-200 italic text-neutral-400 font-medium">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-neutral-400" />
                        กำลังโหลดข้อมูลโปรเจกต์...
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-24 border border-dashed border-neutral-200 rounded-[2.5rem] bg-theme-card flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-3xl flex items-center justify-center text-neutral-400 mb-4">
                            <Info className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">ไม่พบโปรเจกต์ที่สอดคล้อง</h3>
                        <p className="text-neutral-500 max-w-xs mx-auto mt-2 text-sm">
                            {search || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all"
                                ? "ลองปรับเปลี่ยนเงื่อนไขการค้นหาหรือปุ่มตัวกรองเพื่อค้นหาโครงการของคุณ"
                                : "คุณยังไม่ได้สร้างโครงการใหม่ในทะเบียนคลิกสร้างได้ที่มุมขวาบน"}
                        </p>
                    </div>
                ) : viewMode === "table" ? (

                    /* Premium Spreadsheet-style Registry Table Layout */
                    <div className="bg-theme-card border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-neutral-200 bg-neutral-50/50 dark:bg-neutral-950/20">
                                        <th className="p-4 text-xs font-black text-neutral-400 uppercase tracking-widest">โครงการ / Slug</th>
                                        <th className="p-4 text-xs font-black text-neutral-400 uppercase tracking-widest">หมวดหมู่</th>
                                        <th className="p-4 text-xs font-black text-neutral-400 uppercase tracking-widest">สถานะ</th>
                                        <th className="p-4 text-xs font-black text-neutral-400 uppercase tracking-widest">ขั้นตอน</th>
                                        <th className="p-4 text-xs font-black text-neutral-400 uppercase tracking-widest">ความสำคัญ</th>
                                        <th className="p-4 text-xs font-black text-neutral-400 uppercase tracking-widest">เป้าหมายปัจจุบัน</th>
                                        <th className="p-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Next Action</th>
                                        <th className="p-4 text-xs font-black text-neutral-400 uppercase tracking-widest w-[120px]">ดำเนินการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {filteredProjects.map(project => (
                                        <tr key={project.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-950/10 transition-colors group">
                                            <td className="p-4 max-w-[240px]">
                                                <Link
                                                    href={`/projects/${project.slug}`}
                                                    className="font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-black dark:group-hover:text-white hover:text-black dark:hover:text-white hover:underline cursor-pointer transition-colors truncate block"
                                                    title={`เปิดหน้าโครงการ ${project.name}`}
                                                >
                                                    {project.name}
                                                </Link>
                                                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{project.slug}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs font-medium text-neutral-600 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 px-2 py-0.5 rounded-md">
                                                    {project.category}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[project.status as ProjectRegistryStatus]}`}>
                                                    {STATUS_LABELS[project.status as ProjectRegistryStatus] || project.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                                                    {project.progressStage}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${PRIORITY_COLORS[project.priority]}`}>
                                                    {project.priority}
                                                </span>
                                            </td>
                                            <td className="p-4 max-w-[200px]">
                                                <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate" title={project.currentGoal}>
                                                    {project.currentGoal}
                                                </div>
                                            </td>
                                            <td className="p-4 max-w-[200px]">
                                                <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate" title={project.nextAction}>
                                                    {project.nextAction}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => openEditPanel(project)}
                                                        className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all"
                                                        title="แก้ไข Registry"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <Link
                                                        href={`/projects/${project.slug}`}
                                                        className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all flex items-center justify-center"
                                                        title="เปิดหน้าหลัก"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Link>
                                                    <button
                                                        onClick={() => {
                                                            setActiveProject(project);
                                                            setIsDeleteOpen(true);
                                                        }}
                                                        className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-300 hover:text-rose-600 dark:hover:bg-rose-950/20 transition-all"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (

                    /* Premium Grid/Card view layout */
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredProjects.map(project => (
                            <div key={project.id} className="group relative bg-theme-card border border-neutral-200 rounded-[32px] p-6 hover:shadow-xl hover:border-neutral-300 transition-all flex flex-col h-full active:scale-[0.99] duration-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                            {project.category}
                                        </span>
                                        <Link href={`/projects/${project.slug}`} className="block">
                                            <h2 className="font-black text-lg text-neutral-900 dark:text-neutral-100 group-hover:text-black dark:group-hover:text-white hover:underline transition-colors leading-tight tracking-tight">
                                                {project.name}
                                            </h2>
                                        </Link>
                                        <p className="text-[9px] text-neutral-400 font-mono tracking-widest">{project.slug}</p>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                        <button
                                            onClick={() => openEditPanel(project)}
                                            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                                            title="แก้ไข"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setActiveProject(project);
                                                setIsArchiveOpen(true);
                                            }}
                                            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                                            title="จัดเก็บ"
                                        >
                                            <Archive className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setActiveProject(project);
                                                setIsDeleteOpen(true);
                                            }}
                                            className="p-2 rounded-xl hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors"
                                            title="ลบ"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Goals & Progress */}
                                <div className="my-4 space-y-3 bg-neutral-50/50 dark:bg-neutral-950/20 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-900/30 flex-1">
                                    <div className="space-y-0.5">
                                        <div className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">เป้าหมายปัจจุบัน</div>
                                        <div className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2" title={project.currentGoal}>
                                            {project.currentGoal}
                                        </div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-[9px] font-black uppercase text-neutral-400 tracking-wider">Next Action</div>
                                        <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 line-clamp-2" title={project.nextAction}>
                                            {project.nextAction}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-neutral-200/50">
                                        <span className="text-[9px] text-neutral-400 font-bold">Cadence: {project.cadence}</span>
                                        <span className="text-[9px] text-neutral-400 font-bold">Stage: {project.progressStage}</span>
                                    </div>
                                </div>

                                {/* Bottom Metadata info */}
                                <div className="mt-auto flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-900/50">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${STATUS_COLORS[project.status as ProjectRegistryStatus]}`}>
                                            {STATUS_LABELS[project.status as ProjectRegistryStatus] || project.status}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${PRIORITY_COLORS[project.priority]}`}>
                                            {project.priority}
                                        </span>
                                    </div>
                                    <Link
                                        href={`/projects/${project.slug}`}
                                        className="flex items-center gap-1.5 text-[10px] font-black text-neutral-400 hover:text-black dark:hover:text-white transition-all uppercase tracking-wide"
                                    >
                                        View Detail <ChevronRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Registry Edit Panel Modal */}
            <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="แก้ไขข้อมูลโครงการโครงการ (Project Registry)">
                <div className="p-3 space-y-5 max-h-[82vh] overflow-y-auto">

                    {/* Project Name */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">ชื่อโครงการ (Project Name)</label>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                            placeholder="กรอกชื่อโครงการ..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Category */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">หมวดหมู่ (Category)</label>
                            <input
                                type="text"
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                                placeholder="Core, Green Fineness, Personal..."
                            />
                        </div>

                        {/* Cadence */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">ความถี่การอัปเดต (Cadence)</label>
                            <input
                                type="text"
                                value={editCadence}
                                onChange={(e) => setEditCadence(e.target.value)}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                                placeholder="Weekly, Bi-weekly, Monthly..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {/* Status */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">สถานะละเอียด (Status)</label>
                            <select
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as ProjectRegistryStatus)}
                            >
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>

                        {/* Progress Stage */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">ขั้นตอนหลัก (Stage)</label>
                            <select
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                                value={editProgressStage}
                                onChange={(e) => setEditProgressStage(e.target.value as ProjectProgressStage)}
                            >
                                <option value="Concept">Concept</option>
                                <option value="Spec Ready">Spec Ready</option>
                                <option value="Dev Ready">Dev Ready</option>
                                <option value="In Dev">In Dev</option>
                                <option value="QA">QA</option>
                                <option value="Committed">Committed</option>
                                <option value="In Use">In Use</option>
                                <option value="Needs Improvement">Needs Improvement</option>
                                <option value="Paused">Paused</option>
                            </select>
                        </div>

                        {/* Priority */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">ความสำคัญ (Priority)</label>
                            <select
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value as "high" | "medium" | "low" | "none")}
                            >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                    </div>

                    {/* Current Goal */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">เป้าหมายปัจจุบัน (Current Goal)</label>
                        <textarea
                            value={editCurrentGoal}
                            onChange={(e) => setEditCurrentGoal(e.target.value)}
                            rows={2}
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400 resize-none"
                            placeholder="อธิบายสิ่งที่เป็นความพยายามหรือเป้าหมายหลักในเฟสนี้..."
                        />
                    </div>

                    {/* Next Action */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Next Action (สิ่งที่ต้องทำถัดไป)</label>
                        <textarea
                            value={editNextAction}
                            onChange={(e) => setEditNextAction(e.target.value)}
                            rows={2}
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400 resize-none"
                            placeholder="การปฏิบัติที่เจาะจงที่จำเป็นเป็นลำดับถัดไป..."
                        />
                    </div>

                    {/* Risk or Blocked by */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">ความเสี่ยง / อุปสรรค (Risks / Blocked By)</label>
                        <input
                            type="text"
                            value={editRiskOrBlockedBy}
                            onChange={(e) => setEditRiskOrBlockedBy(e.target.value)}
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                            placeholder="ระบุความเสี่ยง หรืออุปสรรคคอขวด (เช่น บล็อกเกอร์ หรือต้องการข้อมูลเพิ่ม)..."
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                        <button
                            type="button"
                            onClick={() => setIsEditOpen(false)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveMetadata}
                            disabled={actionLoading || !editName.trim()}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50 shadow-md"
                        >
                            {actionLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Existing confirmation dialogs */}
            {activeProject && (
                <>
                    <DeleteProjectDialog
                        isOpen={isDeleteOpen}
                        onClose={() => setIsDeleteOpen(false)}
                        onSuccess={() => fetchProjects()}
                        projectSlug={activeProject.slug}
                        projectName={activeProject.name}
                    />

                    <ConfirmDialog
                        isOpen={isArchiveOpen}
                        title="Archive Project"
                        message={`คุณแน่ใจหรือไม่ว่าต้องการจัดเก็บโปรเจกต์ "${activeProject?.name}"? โครงการจะถูกเปลี่ยนสถานะเป็น Completed และจัดเก็บลงแฟ้มเอกสารเก่า`}
                        confirmText="จัดเก็บโครงการ"
                        onConfirm={handleArchive}
                        onCancel={() => setIsArchiveOpen(false)}
                    />
                </>
            )}

            <CreateProjectWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSuccess={() => {
                    setToastMessage("สร้างโปรเจกต์ใหม่สำเร็จ");
                    setShowToast(true);
                    fetchProjects();
                }}
            />

            <Toast
                isVisible={showToast}
                message={toastMessage}
                onClose={() => setShowToast(false)}
            />
        </PageShell>
    );
}
