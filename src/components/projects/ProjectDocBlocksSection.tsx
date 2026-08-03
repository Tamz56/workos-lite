"use client";

import React, { useState, useMemo } from "react";
import {
    FileText,
    Search,
    Archive,
    RotateCcw,
    Edit2,
    ChevronDown,
    ChevronUp,
    Sparkles,
    AlertCircle,
    Calendar,
    CheckCircle2
} from "lucide-react";

import {
    ProjectDocumentationBlock,
    ProjectDocBlockType,
    DocBlockSourceType
} from "@/lib/types";
import { useProjectDocBlocks } from "@/lib/project-doc-blocks/useProjectDocBlocks";
import {
    ProjectDocBlocksSourceStatus,
    ProjectDocBlocksReadOnlyActions
} from "@/components/projects/ProjectDocBlocksSourceStatus";
import {
    createProjectDocBlockOnClient,
    updateProjectDocBlockOnClient,
    archiveProjectDocBlockOnClient,
    restoreProjectDocBlockOnClient
} from "@/lib/project-doc-blocks/client";
import { Modal } from "@/components/ui/Modal";

export type ProjectDocBlocksSectionProps = {
    projectId: string;
    projectSlug: string;
};

export function countTopLevelHeadings(text: string): number {
    const lines = text.split(/\r?\n/);
    let count = 0;
    let inCodeBlock = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("```")) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) continue;

        if (/^#[ \t]+\S/.test(trimmed)) {
            count++;
        }
    }
    return count;
}

function parseProjectLogFromText(input: string): { title: string; details: string } {
    const lines = input.split(/\r?\n/);
    let title = "";
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("```")) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) continue;

        if (/^#[ \t]+\S/.test(line)) {
            title = line.replace(/^#[ \t]+/, "").trim();
            break;
        }
    }

    if (!title) {
        // Fallback for ## level 2 heading
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("## ")) {
                title = line.replace(/^##\s+/, "").trim();
                break;
            }
        }
    }

    if (!title) {
        title = "Project Log — Imported Arbor Summary";
    }

    return {
        title,
        details: input.trim()
    };
}

const BLOCK_TYPES: { label: string; value: ProjectDocBlockType }[] = [
    { label: "Brief / PRD", value: "brief" },
    { label: "Structure", value: "structure" },
    { label: "SOP", value: "sop" },
    { label: "Process Note", value: "process_note" },
    { label: "Decision", value: "decision" },
    { label: "Milestone", value: "milestone" },
    { label: "Issue / Fix", value: "issue_fix" },
    { label: "Publish Log", value: "publish" },
    { label: "QA / Review", value: "qa_review" }
];

export function ProjectDocBlocksSection({ projectId, projectSlug }: ProjectDocBlocksSectionProps) {
    const { status, blocks, source, fallbackReason, error, refetch } = useProjectDocBlocks(projectId, projectSlug);
    const uiState = useMemo(() => ({ status, blocks, source, fallbackReason, error }), [status, blocks, source, fallbackReason, error]);

    // Filters & Search
    const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Accordion State
    const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

    // Modal States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingBlock, setEditingBlock] = useState<ProjectDocumentationBlock | null>(null);

    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
    const [archivingBlock, setArchivingBlock] = useState<ProjectDocumentationBlock | null>(null);

    const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
    const [restoringBlock, setRestoringBlock] = useState<ProjectDocumentationBlock | null>(null);

    const [isImportLogOpen, setIsImportLogOpen] = useState(false);
    const [importLogText, setImportLogText] = useState("");
    const [importLogPreview, setImportLogPreview] = useState<{ title: string; details: string } | null>(null);
    const [importLogError, setImportLogError] = useState<string | null>(null);

    const [isArborAssistantOpen, setIsArborAssistantOpen] = useState(false);
    const [arborText, setArborText] = useState("");
    const [arborDraft, setArborDraft] = useState<{
        title: string;
        summary: string;
        details: string;
        sourceType: DocBlockSourceType;
        nextAction: string;
    } | null>(null);

    const [actionLoading, setActionLoading] = useState(false);

    // Form fields for Add / Edit
    const [formTitle, setFormTitle] = useState("");
    const [formType, setFormType] = useState<ProjectDocBlockType>("process_note");
    const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
    const [formSummary, setFormSummary] = useState("");
    const [formDetails, setFormDetails] = useState("");
    const [formNextAction, setFormNextAction] = useState("");
    const [formEvidenceLinks, setFormEvidenceLinks] = useState("");
    const [formRelatedFiles, setFormRelatedFiles] = useState("");
    const [formSourceType, setFormSourceType] = useState<DocBlockSourceType>("manual_paste");

    const toggleExpand = (id: string) => {
        setExpandedBlocks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const filteredBlocks = useMemo(() => {
        return (blocks || []).filter((block: ProjectDocumentationBlock) => {
            if (statusFilter === "active" && block.status !== "active") return false;
            if (statusFilter === "archived" && block.status !== "archived") return false;
            if (typeFilter !== "all" && block.type !== typeFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = (block.title || "").toLowerCase().includes(q);
                const matchSummary = (block.summary || "").toLowerCase().includes(q);
                const matchDetails = (block.details || "").toLowerCase().includes(q);
                if (!matchTitle && !matchSummary && !matchDetails) return false;
            }
            return true;
        });
    }, [blocks, statusFilter, typeFilter, searchQuery]);

    // Open Add Modal
    const handleOpenAdd = () => {
        setFormTitle("");
        setFormType("process_note");
        setFormDate(new Date().toISOString().slice(0, 10));
        setFormSummary("");
        setFormDetails("");
        setFormNextAction("");
        setFormEvidenceLinks("");
        setFormRelatedFiles("");
        setFormSourceType("manual_paste");
        setIsAddOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (block: ProjectDocumentationBlock) => {
        setEditingBlock(block);
        setFormTitle(block.title);
        setFormType(block.type);
        setFormDate(block.date || new Date().toISOString().slice(0, 10));
        setFormSummary(block.summary || "");
        setFormDetails(block.details || "");
        setFormNextAction(block.nextAction || "");
        setFormEvidenceLinks((block.evidenceLinks || []).join(", "));
        setFormRelatedFiles((block.relatedFiles || []).join(", "));
        setFormSourceType(block.sourceType || "manual_paste");
        setIsEditOpen(true);
    };

    // Submit Add Form
    const handleSaveAdd = async () => {
        if (!formTitle.trim()) return;
        setActionLoading(true);
        try {
            const evidenceLinks = formEvidenceLinks
                .split(",")
                .map(s => s.trim())
                .filter(Boolean);
            const relatedFiles = formRelatedFiles
                .split(",")
                .map(s => s.trim())
                .filter(Boolean);

            await createProjectDocBlockOnClient(projectId, projectSlug, {
                type: formType,
                title: formTitle.trim(),
                date: formDate,
                summary: formSummary.trim(),
                details: formDetails.trim(),
                nextAction: formNextAction.trim() || undefined,
                evidenceLinks,
                relatedFiles,
                status: "active",
                sourceType: formSourceType,
                reviewedByUser: true,
                projectSlug
            });

            setIsAddOpen(false);
            refetch();
        } catch (e: unknown) {
            const err = e as Error;
            alert(err.message || "Failed to process request");
        } finally {
            setActionLoading(false);
        }
    };

    // Submit Edit Form (MUTABLE PAYLOAD ONLY)
    const handleSaveEdit = async () => {
        if (!editingBlock || !formTitle.trim()) return;
        setActionLoading(true);
        try {
            const evidenceLinks = formEvidenceLinks
                .split(",")
                .map(s => s.trim())
                .filter(Boolean);
            const relatedFiles = formRelatedFiles
                .split(",")
                .map(s => s.trim())
                .filter(Boolean);

            await updateProjectDocBlockOnClient(
                projectId,
                projectSlug,
                editingBlock.id,
                editingBlock.updatedAt,
                {
                    type: formType,
                    title: formTitle.trim(),
                    date: formDate,
                    summary: formSummary.trim(),
                    details: formDetails.trim(),
                    nextAction: formNextAction.trim() || undefined,
                    evidenceLinks,
                    relatedFiles,
                    sourceType: formSourceType,
                    reviewedByUser: true
                }
            );

            setIsEditOpen(false);
            setEditingBlock(null);
            refetch();
        } catch (e: unknown) {
            const err = e as Error;
            alert(err.message || "Failed to process request");
        } finally {
            setActionLoading(false);
        }
    };

    // Archive Action
    const handleConfirmArchive = async () => {
        if (!archivingBlock) return;
        setActionLoading(true);
        try {
            await archiveProjectDocBlockOnClient(
                projectId,
                projectSlug,
                archivingBlock.id,
                archivingBlock.updatedAt
            );
            setIsArchiveConfirmOpen(false);
            setArchivingBlock(null);
            refetch();
        } catch (e: unknown) {
            const err = e as Error;
            alert(err.message || "Failed to process request");
        } finally {
            setActionLoading(false);
        }
    };

    // Restore Action
    const handleConfirmRestore = async () => {
        if (!restoringBlock) return;
        setActionLoading(true);
        try {
            await restoreProjectDocBlockOnClient(
                projectId,
                projectSlug,
                restoringBlock.id,
                restoringBlock.updatedAt
            );
            setIsRestoreConfirmOpen(false);
            setRestoringBlock(null);
            refetch();
        } catch (e: unknown) {
            const err = e as Error;
            alert(err.message || "Failed to process request");
        } finally {
            setActionLoading(false);
        }
    };

    // Import Log - Preview Step
    const handlePreviewLogImport = () => {
        setImportLogError(null);
        setImportLogPreview(null);
        if (!importLogText.trim()) return;

        const headingCount = countTopLevelHeadings(importLogText);
        if (headingCount > 1) {
            setImportLogError(`ระบบรองรับการนำเข้าครั้งละ 1 บันทึกเท่านั้น (พบ ${headingCount} หัวข้อหลัก #)`);
            return;
        }

        const parsed = parseProjectLogFromText(importLogText);
        setImportLogPreview(parsed);
    };

    // Import Log - Save Step (POST 1 block)
    const handleSaveLogImport = async () => {
        if (!importLogPreview) return;
        setActionLoading(true);
        try {
            await createProjectDocBlockOnClient(projectId, projectSlug, {
                type: "process_note",
                title: importLogPreview.title,
                date: new Date().toISOString().slice(0, 10),
                summary: "Imported from Arbor Log",
                details: importLogPreview.details,
                evidenceLinks: [],
                relatedFiles: [],
                status: "active",
                reviewedByUser: true,
                sourceText: importLogText,
                sourceType: "manual_paste",
                projectSlug
            });

            setIsImportLogOpen(false);
            setImportLogText("");
            setImportLogPreview(null);
            setImportLogError(null);
            refetch();
        } catch (e: unknown) {
            const err = e as Error;
            alert(err.message || "Failed to process request");
        } finally {
            setActionLoading(false);
        }
    };

    // Arbor Assistant - Generate Draft
    const handleGenerateArborDraft = () => {
        if (!arborText.trim()) return;
        const lines = arborText.trim().split(/\r?\n/);
        const titleLine = lines.find(l => l.trim().length > 0) || "Arbor Assistant Summary";
        const title = titleLine.replace(/^#+\s*/, "").trim();

        setArborDraft({
            title: title.startsWith("Arbor") ? title : `Arbor Auto-Draft: ${title}`,
            summary: arborText.trim().slice(0, 200) + (arborText.length > 200 ? "..." : ""),
            details: arborText.trim(),
            sourceType: "qa_report",
            nextAction: "ตรวจสอบความถูกต้องของฟีเจอร์"
        });
    };

    // Arbor Assistant - Apply Draft (Explicit POST)
    const handleApplyArborDraft = async () => {
        if (!arborDraft) return;
        setActionLoading(true);
        try {
            await createProjectDocBlockOnClient(projectId, projectSlug, {
                type: "qa_review",
                title: arborDraft.title,
                date: new Date().toISOString().slice(0, 10),
                summary: arborDraft.summary,
                details: arborDraft.details,
                evidenceLinks: [],
                relatedFiles: [],
                nextAction: arborDraft.nextAction,
                status: "active",
                sourceType: arborDraft.sourceType,
                generatedBy: "arbor_assistant",
                reviewedByUser: true,
                sourceText: arborText,
                sourceExcerpt: arborText.slice(0, 300),
                projectSlug
            });

            setIsArborAssistantOpen(false);
            setArborText("");
            setArborDraft(null);
            refetch();
        } catch (e: unknown) {
            const err = e as Error;
            alert(err.message || "Failed to process request");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <section className="space-y-6">
            {/* Header & Source Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-neutral-500" />
                    <div className="space-y-0.5">
                        <h2 className="text-sm font-black uppercase tracking-widest text-neutral-700">
                            Project Documentation & Logs
                        </h2>
                        <ProjectDocBlocksSourceStatus state={uiState} />
                    </div>
                </div>

                <ProjectDocBlocksReadOnlyActions
                    source={source}
                    onAddBlock={handleOpenAdd}
                    onImportLog={() => {
                        setImportLogText("");
                        setImportLogPreview(null);
                        setImportLogError(null);
                        setIsImportLogOpen(true);
                    }}
                    onArborAssistant={() => {
                        setArborText("");
                        setArborDraft(null);
                        setIsArborAssistantOpen(true);
                    }}
                />
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* Status filter */}
                    <div className="flex bg-white rounded-xl border border-neutral-200 p-1 shadow-sm text-xs font-bold">
                        <button
                            onClick={() => setStatusFilter("active")}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                statusFilter === "active" ? "bg-black text-white shadow-sm" : "text-neutral-500 hover:text-black"
                            }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setStatusFilter("archived")}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                statusFilter === "archived" ? "bg-black text-white shadow-sm" : "text-neutral-500 hover:text-black"
                            }`}
                        >
                            Archived
                        </button>
                        <button
                            onClick={() => setStatusFilter("all")}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                statusFilter === "all" ? "bg-black text-white shadow-sm" : "text-neutral-500 hover:text-black"
                            }`}
                        >
                            All
                        </button>
                    </div>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-700 outline-none shadow-sm focus:border-black"
                    >
                        <option value="all">All Types</option>
                        {BLOCK_TYPES.map(bt => (
                            <option key={bt.value} value={bt.value}>
                                {bt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search documentation..."
                        className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium outline-none focus:border-black transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Content List */}
            {status === "loading" || status === "idle" ? (
                <div className="text-center py-12 text-neutral-400 font-medium italic text-xs">
                    Loading project documentation...
                </div>
            ) : filteredBlocks.length === 0 ? (
                <div className="text-center py-14 bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-200 space-y-2">
                    <p className="text-neutral-500 font-bold text-sm">No documentation blocks found.</p>
                    <p className="text-neutral-400 text-xs">
                        {searchQuery || typeFilter !== "all" || statusFilter !== "active"
                            ? "Try adjusting your search or filters."
                            : "Click 'Add Block' or 'Import Log' above to record project documentation."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredBlocks.map((block: ProjectDocumentationBlock) => {
                        const isExpanded = expandedBlocks.has(block.id);
                        const typeObj = BLOCK_TYPES.find(t => t.value === block.type);

                        return (
                            <div
                                key={block.id}
                                className={`bg-white border rounded-2xl transition-all shadow-sm ${
                                    block.status === "archived"
                                        ? "border-neutral-200 opacity-70 bg-neutral-50/50"
                                        : "border-neutral-200 hover:border-neutral-300"
                                }`}
                            >
                                <div className="p-4 flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-neutral-100 text-neutral-600 border border-neutral-200">
                                                {typeObj?.label || block.type}
                                            </span>
                                            {block.status === "archived" && (
                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                                                    Archived
                                                </span>
                                            )}
                                            {block.generatedBy === "arbor_assistant" && (
                                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3" /> Arbor
                                                </span>
                                            )}
                                            <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {block.date}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-neutral-900 text-base line-clamp-1">
                                            {block.title}
                                        </h3>
                                        <p className="text-xs text-neutral-600 font-medium line-clamp-2">
                                            {block.summary}
                                        </p>
                                    </div>

                                    {/* Action Controls */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleOpenEdit(block)}
                                            className="p-2 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-100 transition-all"
                                            title="Edit Block"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        {block.status === "active" ? (
                                            <button
                                                onClick={() => {
                                                    setArchivingBlock(block);
                                                    setIsArchiveConfirmOpen(true);
                                                }}
                                                className="p-2 rounded-xl text-neutral-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                                                title="Archive Block"
                                            >
                                                <Archive className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setRestoringBlock(block);
                                                    setIsRestoreConfirmOpen(true);
                                                }}
                                                className="p-2 rounded-xl text-neutral-400 hover:text-green-600 hover:bg-green-50 transition-all"
                                                title="Restore Block"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => toggleExpand(block.id)}
                                            className="p-2 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-100 transition-all"
                                            title={isExpanded ? "Collapse Details" : "Expand Details"}
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details View */}
                                {isExpanded && (
                                    <div className="border-t border-neutral-100 p-4 bg-neutral-50/50 rounded-b-2xl space-y-4 text-xs">
                                        <div>
                                            <h4 className="font-bold text-neutral-500 uppercase tracking-widest text-[10px] mb-1">
                                                Details
                                            </h4>
                                            <div className="whitespace-pre-wrap font-mono text-neutral-800 bg-white p-3 rounded-xl border border-neutral-200">
                                                {block.details}
                                            </div>
                                        </div>

                                        {block.nextAction && (
                                            <div>
                                                <h4 className="font-bold text-neutral-500 uppercase tracking-widest text-[10px] mb-1">
                                                    Next Action
                                                </h4>
                                                <p className="font-semibold text-neutral-900 bg-orange-50 text-orange-900 p-2.5 rounded-xl border border-orange-200">
                                                    {block.nextAction}
                                                </p>
                                            </div>
                                        )}

                                        {block.evidenceLinks && block.evidenceLinks.length > 0 && (
                                            <div>
                                                <h4 className="font-bold text-neutral-500 uppercase tracking-widest text-[10px] mb-1">
                                                    Evidence Links
                                                </h4>
                                                <div className="flex gap-2 flex-wrap">
                                                    {block.evidenceLinks.map((link: string, idx: number) => (
                                                        <span key={idx} className="bg-white border border-neutral-200 text-neutral-700 px-2.5 py-1 rounded-lg font-mono">
                                                            {link}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {block.relatedFiles && block.relatedFiles.length > 0 && (
                                            <div>
                                                <h4 className="font-bold text-neutral-500 uppercase tracking-widest text-[10px] mb-1">
                                                    Related Files
                                                </h4>
                                                <div className="flex gap-2 flex-wrap">
                                                    {block.relatedFiles.map((file: string, idx: number) => (
                                                        <span key={idx} className="bg-white border border-neutral-200 text-neutral-700 px-2.5 py-1 rounded-lg font-mono">
                                                            {file}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ADD BLOCK MODAL */}
            <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Documentation Block">
                <div className="p-2 space-y-4 text-xs font-medium">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Title *</label>
                        <input
                            type="text"
                            value={formTitle}
                            onChange={e => setFormTitle(e.target.value)}
                            placeholder="Enter block title..."
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:bg-white focus:border-black transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Block Type</label>
                            <select
                                value={formType}
                                onChange={e => setFormType(e.target.value as ProjectDocBlockType)}
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-black"
                            >
                                {BLOCK_TYPES.map(bt => (
                                    <option key={bt.value} value={bt.value}>
                                        {bt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Date</label>
                            <input
                                type="date"
                                value={formDate}
                                onChange={e => setFormDate(e.target.value)}
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-black"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Summary</label>
                        <textarea
                            value={formSummary}
                            onChange={e => setFormSummary(e.target.value)}
                            placeholder="Brief summary..."
                            rows={2}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs outline-none focus:bg-white focus:border-black transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Details (Markdown)</label>
                        <textarea
                            value={formDetails}
                            onChange={e => setFormDetails(e.target.value)}
                            placeholder="Detailed markdown content..."
                            rows={5}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-mono outline-none focus:bg-white focus:border-black transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Next Action (Optional)</label>
                        <input
                            type="text"
                            value={formNextAction}
                            onChange={e => setFormNextAction(e.target.value)}
                            placeholder="Next steps..."
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:border-black"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Evidence Links (Comma separated)</label>
                            <input
                                type="text"
                                value={formEvidenceLinks}
                                onChange={e => setFormEvidenceLinks(e.target.value)}
                                placeholder="https://..., commit-hash"
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:border-black"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Related Files (Comma separated)</label>
                            <input
                                type="text"
                                value={formRelatedFiles}
                                onChange={e => setFormRelatedFiles(e.target.value)}
                                placeholder="src/db/db.ts, schema.sql"
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:border-black"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setIsAddOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-neutral-200 font-bold hover:bg-neutral-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveAdd}
                            disabled={actionLoading || !formTitle.trim()}
                            className="flex-1 py-2.5 rounded-xl bg-black text-white font-bold hover:bg-neutral-800 disabled:opacity-50 transition-all shadow-md"
                        >
                            {actionLoading ? "Saving..." : "Create Block"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* EDIT BLOCK MODAL */}
            <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Documentation Block">
                <div className="p-2 space-y-4 text-xs font-medium">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Title *</label>
                        <input
                            type="text"
                            value={formTitle}
                            onChange={e => setFormTitle(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:bg-white focus:border-black transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Block Type</label>
                            <select
                                value={formType}
                                onChange={e => setFormType(e.target.value as ProjectDocBlockType)}
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-black"
                            >
                                {BLOCK_TYPES.map(bt => (
                                    <option key={bt.value} value={bt.value}>
                                        {bt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Date</label>
                            <input
                                type="date"
                                value={formDate}
                                onChange={e => setFormDate(e.target.value)}
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:bg-white focus:border-black"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Summary</label>
                        <textarea
                            value={formSummary}
                            onChange={e => setFormSummary(e.target.value)}
                            rows={2}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs outline-none focus:bg-white focus:border-black transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Details (Markdown)</label>
                        <textarea
                            value={formDetails}
                            onChange={e => setFormDetails(e.target.value)}
                            rows={5}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-mono outline-none focus:bg-white focus:border-black transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Next Action</label>
                        <input
                            type="text"
                            value={formNextAction}
                            onChange={e => setFormNextAction(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:border-black"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Evidence Links</label>
                            <input
                                type="text"
                                value={formEvidenceLinks}
                                onChange={e => setFormEvidenceLinks(e.target.value)}
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:border-black"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1">Related Files</label>
                            <input
                                type="text"
                                value={formRelatedFiles}
                                onChange={e => setFormRelatedFiles(e.target.value)}
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:bg-white focus:border-black"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setIsEditOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-neutral-200 font-bold hover:bg-neutral-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveEdit}
                            disabled={actionLoading || !formTitle.trim()}
                            className="flex-1 py-2.5 rounded-xl bg-black text-white font-bold hover:bg-neutral-800 disabled:opacity-50 transition-all shadow-md"
                        >
                            {actionLoading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ARCHIVE CONFIRMATION MODAL */}
            <Modal isOpen={isArchiveConfirmOpen} onClose={() => setIsArchiveConfirmOpen(false)} title="Archive Block">
                <div className="p-2 space-y-4 text-xs font-medium">
                    <p className="text-neutral-700">
                        Are you sure you want to archive <strong>{archivingBlock?.title}</strong>?
                    </p>
                    <p className="text-neutral-400 italic">
                        Archived blocks can be restored at any time from the &quot;Archived&quot; filter tab.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsArchiveConfirmOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-neutral-200 font-bold hover:bg-neutral-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmArchive}
                            disabled={actionLoading}
                            className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50 shadow-md"
                        >
                            {actionLoading ? "Archiving..." : "Archive Block"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* RESTORE CONFIRMATION MODAL */}
            <Modal isOpen={isRestoreConfirmOpen} onClose={() => setIsRestoreConfirmOpen(false)} title="Restore Block">
                <div className="p-2 space-y-4 text-xs font-medium">
                    <p className="text-neutral-700">
                        Restore <strong>{restoringBlock?.title}</strong> back to active status?
                    </p>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsRestoreConfirmOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-neutral-200 font-bold hover:bg-neutral-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmRestore}
                            disabled={actionLoading}
                            className="flex-1 py-2.5 rounded-xl bg-black text-white font-bold hover:bg-neutral-800 disabled:opacity-50 shadow-md"
                        >
                            {actionLoading ? "Restoring..." : "Restore Block"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* SINGLE-RECORD IMPORT LOG MODAL */}
            <Modal isOpen={isImportLogOpen} onClose={() => setIsImportLogOpen(false)} title="Import Project Log">
                <div className="p-2 space-y-4 text-xs font-medium">
                    <p className="text-neutral-500">
                        Paste a single Markdown log entry. Must contain exactly one top-level heading (<code># Title</code>).
                    </p>

                    <div>
                        <textarea
                            value={importLogText}
                            onChange={e => {
                                setImportLogText(e.target.value);
                                setImportLogPreview(null);
                                setImportLogError(null);
                            }}
                            placeholder="# QA-IMPORT-001 — Single Record Import&#10;&#10;## Summary&#10;&#10;Details..."
                            rows={8}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-mono outline-none focus:bg-white focus:border-black transition-all"
                        />
                    </div>

                    {importLogError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <div>{importLogError}</div>
                        </div>
                    )}

                    {importLogPreview && (
                        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl space-y-2">
                            <div className="font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-green-600" /> Preview Validated (1 Record)
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-green-200 space-y-1">
                                <div className="font-bold">{importLogPreview.title}</div>
                                <div className="text-neutral-500 font-mono text-[10px] line-clamp-3">
                                    {importLogPreview.details}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsImportLogOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-neutral-200 font-bold hover:bg-neutral-50"
                        >
                            Cancel
                        </button>
                        {!importLogPreview ? (
                            <button
                                onClick={handlePreviewLogImport}
                                disabled={!importLogText.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-black text-white font-bold hover:bg-neutral-800 disabled:opacity-50 shadow-md"
                            >
                                Preview Log
                            </button>
                        ) : (
                            <button
                                onClick={handleSaveLogImport}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 shadow-md"
                            >
                                {actionLoading ? "Importing..." : "Save Imported Log"}
                            </button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* ARBOR ASSISTANT MODAL */}
            <Modal isOpen={isArborAssistantOpen} onClose={() => setIsArborAssistantOpen(false)} title="✨ Arbor Documentation Assistant">
                <div className="p-2 space-y-4 text-xs font-medium">
                    <p className="text-neutral-500">
                        Paste walkthrough, commit logs, or QA reports. Arbor Assistant will draft a structured block for review.
                    </p>

                    <div>
                        <textarea
                            value={arborText}
                            onChange={e => {
                                setArborText(e.target.value);
                                setArborDraft(null);
                            }}
                            placeholder="Paste raw release note, QA walkthrough, or chat summary..."
                            rows={6}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-mono outline-none focus:bg-white focus:border-black transition-all"
                        />
                    </div>

                    {arborDraft && (
                        <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl space-y-3">
                            <div className="font-bold flex items-center gap-1 text-purple-700">
                                <Sparkles className="w-4 h-4 text-purple-600" /> Arbor Assistant Preview
                            </div>
                            <div className="space-y-2 bg-white p-3 rounded-xl border border-purple-200">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-neutral-400">Draft Title</label>
                                    <input
                                        type="text"
                                        value={arborDraft.title}
                                        onChange={e => setArborDraft({ ...arborDraft, title: e.target.value })}
                                        className="w-full border border-neutral-200 rounded-lg p-2 font-bold text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-neutral-400">Draft Summary</label>
                                    <input
                                        type="text"
                                        value={arborDraft.summary}
                                        onChange={e => setArborDraft({ ...arborDraft, summary: e.target.value })}
                                        className="w-full border border-neutral-200 rounded-lg p-2 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-neutral-400">Next Action</label>
                                    <input
                                        type="text"
                                        value={arborDraft.nextAction}
                                        onChange={e => setArborDraft({ ...arborDraft, nextAction: e.target.value })}
                                        className="w-full border border-neutral-200 rounded-lg p-2 text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsArborAssistantOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-neutral-200 font-bold hover:bg-neutral-50"
                        >
                            Cancel
                        </button>
                        {!arborDraft ? (
                            <button
                                onClick={handleGenerateArborDraft}
                                disabled={!arborText.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50 shadow-md flex items-center justify-center gap-1.5"
                            >
                                <Sparkles className="w-4 h-4" /> Generate Draft
                            </button>
                        ) : (
                            <button
                                onClick={handleApplyArborDraft}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 rounded-xl bg-purple-900 text-white font-bold hover:bg-black disabled:opacity-50 shadow-md flex items-center justify-center gap-1.5"
                            >
                                <CheckCircle2 className="w-4 h-4" /> Apply Draft
                            </button>
                        )}
                    </div>
                </div>
            </Modal>
        </section>
    );
}
