"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
    Plus, 
    Search, 
    Copy, 
    Check, 
    Archive, 
    AlertCircle, 
    RefreshCw, 
    Sliders, 
    Eye, 
    Edit, 
    BookOpen, 
    Save, 
    ArrowUp,
    ArrowDown,
    Trash2,
    Edit2,
    Code,
    ChevronDown,
    ChevronUp,
    HelpCircle
} from "lucide-react";

interface PromptInputField {
    name: string;
    label: string;
    value: string;
    placeholder?: string;
    helperText?: string;
    required?: boolean;
}

interface GuardrailPreset {
    id: string;
    name: string;
    category: string;
    description: string;
    content: string;
    risk_words: string | null;
    is_active: number;
    created_at: string;
    updated_at: string;
}

interface PromptTemplate {
    id: string;
    name: string;
    category: string;
    purpose: string | null;
    role: string | null;
    context: string | null;
    input_fields: string | null;
    instructions: string | null;
    constraints: string | null;
    output_format: string | null;
    review_checklist: string | null;
    notes: string | null;
    status: "draft" | "testing" | "active" | "archived";
    version: string;
    version_notes: string | null;
    guardrail_preset_ids: string | null;
    created_at: string;
    updated_at: string;
    active_version?: string | null;
}

interface PromptVersion {
    id: string;
    prompt_template_id: string;
    version: string;
    revision_notes: string | null;
    created_from_run_log_id: string | null;
    is_active: number;
    purpose: string | null;
    role: string | null;
    context: string | null;
    input_fields: string | null;
    instructions: string | null;
    constraints: string | null;
    output_format: string | null;
    review_checklist: string | null;
    notes: string | null;
    guardrail_preset_ids: string;
    created_at: string;
    updated_at: string;
}

interface PromptRunLog {
    id: string;
    promptTemplateId: string;
    inputSnapshot: PromptInputField[];
    compiledPromptSnapshot: string;
    outputNotes: string;
    rating: number;
    nextRevisionNotes: string;
    summary: string;
    runStatus: string;
    createdAt: string;
    updatedAt: string;
}

interface PromptWorkflow {
    id: string;
    name: string;
    description: string | null;
    status: "active" | "archived";
    created_at: string;
    updated_at: string;
    step_count?: number;
    steps?: PromptWorkflowStep[];
}

interface PromptWorkflowStep {
    id: string;
    workflow_id: string;
    prompt_template_id: string;
    step_name: string;
    step_description: string | null;
    step_instruction: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
    template_name?: string;
    template_category?: string;
    template_status?: string;
    active_version?: string | null;
}

const CATEGORIES = ["Writing", "Review", "Marketing", "Coding", "General"];
const STATUSES = ["draft", "testing", "active", "archived"];

// Consistent styling for light inputs with high contrast text and focus styles
const INPUT_CLASS = "w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 selection:bg-blue-500/10 transition-all text-xs shadow-sm";
const TEXTAREA_CLASS = "w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 selection:bg-blue-500/10 transition-all text-xs font-mono leading-relaxed shadow-sm";
const SELECT_CLASS = "w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all text-xs shadow-sm";

function safeParseInputFields(jsonStr: string | null): PromptInputField[] {
    if (!jsonStr) return [];
    try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
            return parsed.map(item => {
                const typedItem = item as Record<string, unknown>;
                return {
                    name: String(typedItem.name || ""),
                    label: String(typedItem.label || typedItem.name || ""),
                    value: String(typedItem.value || ""),
                    placeholder: typedItem.placeholder !== undefined ? String(typedItem.placeholder) : undefined,
                    helperText: typedItem.helperText !== undefined ? String(typedItem.helperText) : undefined,
                    required: typedItem.required === true
                };
            }).filter(item => item.name !== "");
        }
    } catch (err) {
        console.error("Failed to parse input fields JSON:", err);
    }
    return [];
}

export default function PromptStudioClient() {
    // State
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    
    const [isLoading, setIsLoading] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showQuickGuide, setShowQuickGuide] = useState(false);
    
    // Editor State
    const [editorFields, setEditorFields] = useState<Partial<PromptTemplate>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);
    
    // Test Input Values state
    const [testValues, setTestValues] = useState<Record<string, string>>({});

    // Tab view state: compiled (default) or template structure
    const [previewTab, setPreviewTab] = useState<"compiled" | "template">("compiled");

    // Collapsible status for raw JSON editor
    const [showAdvancedJson, setShowAdvancedJson] = useState(false);

    // Field Builder form states
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
    const [fieldForm, setFieldForm] = useState<Partial<PromptInputField>>({
        name: "",
        label: "",
        value: "",
        placeholder: "",
        helperText: "",
        required: false
    });
    const [fieldValidationError, setFieldValidationError] = useState<string | null>(null);

    // Run Log / History State
    const [runLogs, setRunLogs] = useState<PromptRunLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logForm, setLogForm] = useState({
        rating: 5,
        outputNotes: "",
        nextRevisionNotes: "",
        summary: "",
        runStatus: "needs_revision"
    });
    const [isSavingLog, setIsSavingLog] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState<"playground" | "history" | "versions">("playground");
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    // Filters for Run History
    const [logStatusFilter, setLogStatusFilter] = useState<string>("active");
    const [logRatingFilter, setLogRatingFilter] = useState<string>("all");

    // Versions State
    const [versions, setVersions] = useState<PromptVersion[]>([]);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [newVersionForm, setNewVersionForm] = useState({ version: "", revisionNotes: "" });
    const [isSavingVersion, setIsSavingVersion] = useState(false);
    const [logVersionFormOpenId, setLogVersionFormOpenId] = useState<string | null>(null);
    const [logVersionInputs, setLogVersionInputs] = useState<Record<string, { version: string; notes: string }>>({});

    // Workflows States
    const [sidebarTab, setSidebarTab] = useState<"templates" | "workflows">("templates");
    const [workflows, setWorkflows] = useState<PromptWorkflow[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [selectedWorkflow, setSelectedWorkflow] = useState<PromptWorkflow | null>(null);
    const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
    const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
    const [workflowForm, setWorkflowForm] = useState({ name: "", description: "" });
    const [isEditingWorkflowMeta, setIsEditingWorkflowMeta] = useState(false);
    const [workflowMetaForm, setWorkflowMetaForm] = useState({ name: "", description: "" });

    // Step states
    const [stepForm, setStepForm] = useState({ promptTemplateId: "", stepName: "", stepDescription: "", stepInstruction: "" });
    const [isAddingStep, setIsAddingStep] = useState(false);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingStepForm, setEditingStepForm] = useState({ step_name: "", step_description: "", step_instruction: "" });

    // Guardrail Presets State
    const [guardrailPresets, setGuardrailPresets] = useState<GuardrailPreset[]>([]);
    
    // Load Templates
    const fetchTemplates = useCallback(async () => {
        setIsLoading(true);
        setApiError(null);
        try {
            const res = await fetch("/api/prompt-templates");
            if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลเทมเพลตได้");
            const data = await res.json() as PromptTemplate[];
            setTemplates(data);
            if (data.length > 0 && !selectedId) {
                setSelectedId(data[0].id);
            }
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์";
            setApiError(errMsg);
        } finally {
            setIsLoading(false);
        }
    }, [selectedId]);

    const fetchGuardrailPresets = useCallback(async () => {
        try {
            const res = await fetch("/api/prompt-guardrail-presets");
            if (res.ok) {
                const data = await res.json() as GuardrailPreset[];
                setGuardrailPresets(data);
            }
        } catch (err) {
            console.error("Failed to fetch guardrail presets:", err);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
        fetchGuardrailPresets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const parseGuardrailIds = (jsonStr: string | null | undefined): string[] => {
        if (!jsonStr) return [];
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse guardrail_preset_ids:", e);
            return [];
        }
    };

    const handleToggleGuardrail = (presetId: string) => {
        const currentIds = parseGuardrailIds(editorFields.guardrail_preset_ids);
        let newIds: string[];
        if (currentIds.includes(presetId)) {
            newIds = currentIds.filter(id => id !== presetId);
        } else {
            newIds = [...currentIds, presetId];
        }
        
        setEditorFields(prev => ({
            ...prev,
            guardrail_preset_ids: JSON.stringify(newIds)
        }));
    };

    const fetchRunLogs = useCallback(async () => {
        if (!selectedId || selectedId === "new-template") {
            setRunLogs([]);
            return;
        }
        setIsLoadingLogs(true);
        try {
            const res = await fetch(`/api/prompt-run-logs?promptTemplateId=${selectedId}&runStatus=${logStatusFilter}&ratingFilter=${logRatingFilter}`);
            if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลประวัติการทดสอบได้");
            const data = await res.json() as PromptRunLog[];
            setRunLogs(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingLogs(false);
        }
    }, [selectedId, logStatusFilter, logRatingFilter]);

    useEffect(() => {
        fetchRunLogs();
    }, [fetchRunLogs]);

    const fetchVersions = useCallback(async () => {
        if (!selectedId || selectedId === "new-template") {
            setVersions([]);
            return;
        }
        setIsLoadingVersions(true);
        try {
            const res = await fetch(`/api/prompt-templates/${selectedId}/versions`);
            if (res.ok) {
                const data = await res.json() as PromptVersion[];
                setVersions(data);
            }
        } catch (err) {
            console.error("Failed to fetch versions:", err);
        } finally {
            setIsLoadingVersions(false);
        }
    }, [selectedId]);

    useEffect(() => {
        fetchVersions();
    }, [fetchVersions]);

    const fetchWorkflows = useCallback(async () => {
        setIsLoadingWorkflows(true);
        try {
            const res = await fetch("/api/prompt-workflows");
            if (res.ok) {
                const data = await res.json() as PromptWorkflow[];
                setWorkflows(data);
            }
        } catch (err) {
            console.error("Failed to fetch workflows:", err);
        } finally {
            setIsLoadingWorkflows(false);
        }
    }, []);

    const fetchWorkflowDetails = useCallback(async () => {
        if (!selectedWorkflowId) {
            setSelectedWorkflow(null);
            return;
        }
        setIsLoadingWorkflows(true);
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}`);
            if (res.ok) {
                const data = await res.json() as PromptWorkflow;
                setSelectedWorkflow(data);
                setWorkflowMetaForm({
                    name: data.name,
                    description: data.description || ""
                });
            }
        } catch (err) {
            console.error("Failed to fetch workflow details:", err);
        } finally {
            setIsLoadingWorkflows(false);
        }
    }, [selectedWorkflowId]);

    useEffect(() => {
        fetchWorkflows();
    }, [fetchWorkflows]);

    useEffect(() => {
        fetchWorkflowDetails();
    }, [fetchWorkflowDetails]);

    const handleCreateWorkflow = async () => {
        if (!workflowForm.name.trim()) {
            alert("กรุณากรอกชื่อเวิร์กโฟลว์");
            return;
        }
        setIsSavingWorkflow(true);
        try {
            const res = await fetch("/api/prompt-workflows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: workflowForm.name.trim(),
                    description: workflowForm.description.trim() || null
                })
            });
            if (!res.ok) throw new Error("ไม่สามารถสร้างเวิร์กโฟลว์ได้");
            const newWf = await res.json() as PromptWorkflow;
            await fetchWorkflows();
            setSelectedWorkflowId(newWf.id);
            setWorkflowForm({ name: "", description: "" });
            alert("สร้างเวิร์กโฟลว์สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
            alert(errMsg);
        } finally {
            setIsSavingWorkflow(false);
        }
    };

    const handleUpdateWorkflowMeta = async () => {
        if (!selectedWorkflowId) return;
        if (!workflowMetaForm.name.trim()) {
            alert("กรุณากรอกชื่อเวิร์กโฟลว์");
            return;
        }
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: workflowMetaForm.name.trim(),
                    description: workflowMetaForm.description.trim() || null
                })
            });
            if (!res.ok) throw new Error("ไม่สามารถอัปเดตเวิร์กโฟลว์ได้");
            await fetchWorkflowDetails();
            await fetchWorkflows();
            setIsEditingWorkflowMeta(false);
            alert("อัปเดตข้อมูลเวิร์กโฟลว์สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const handleArchiveWorkflow = async () => {
        if (!selectedWorkflowId) return;
        if (!confirm("คุณต้องการเก็บถาวร (Archive) เวิร์กโฟลว์นี้ใช่หรือไม่? ขั้นตอนทั้งหมดในเวิร์กโฟลว์จะยังคงอยู่แต่อยู่ในหมวดเก็บถาวร")) return;
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "archived" })
            });
            if (!res.ok) throw new Error("ไม่สามารถเก็บถาวรเวิร์กโฟลว์ได้");
            setSelectedWorkflowId(null);
            await fetchWorkflows();
            alert("เก็บถาวรเวิร์กโฟลว์สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const handleAddStep = async () => {
        if (!selectedWorkflowId) return;
        if (!stepForm.promptTemplateId) {
            alert("กรุณาเลือกเทมเพลต Prompt");
            return;
        }
        setIsAddingStep(true);
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}/steps`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt_template_id: stepForm.promptTemplateId,
                    step_name: stepForm.stepName.trim() || null,
                    step_description: stepForm.stepDescription.trim() || null,
                    step_instruction: stepForm.stepInstruction.trim() || null
                })
            });
            if (!res.ok) throw new Error("ไม่สามารถเพิ่มขั้นตอนได้");
            await fetchWorkflowDetails();
            setStepForm({ promptTemplateId: "", stepName: "", stepDescription: "", stepInstruction: "" });
            alert("เพิ่มขั้นตอนในเวิร์กโฟลว์สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        } finally {
            setIsAddingStep(false);
        }
    };

    const handleMoveStep = async (stepId: string, direction: "up" | "down") => {
        if (!selectedWorkflowId) return;
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}/steps/${stepId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ direction })
            });
            if (!res.ok) throw new Error("ไม่สามารถเปลี่ยนลำดับได้");
            await fetchWorkflowDetails();
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const handleDeleteStep = async (stepId: string) => {
        if (!selectedWorkflowId) return;
        if (!confirm("คุณต้องการลบขั้นตอนนี้ออกจากเวิร์กโฟลว์ใช่หรือไม่? (การดำเนินการนี้จะไม่ส่งผลต่อ Prompt Template หลัก)")) return;
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}/steps/${stepId}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("ไม่สามารถลบขั้นตอนได้");
            await fetchWorkflowDetails();
            alert("ลบขั้นตอนออกจากเวิร์กโฟลว์สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const handleStartEditStep = (step: PromptWorkflowStep) => {
        setEditingStepId(step.id);
        setEditingStepForm({
            step_name: step.step_name,
            step_description: step.step_description || "",
            step_instruction: step.step_instruction || ""
        });
    };

    const handleUpdateStepDetails = async (stepId: string) => {
        if (!selectedWorkflowId) return;
        if (!editingStepForm.step_name.trim()) {
            alert("กรุณากรอกชื่อขั้นตอน");
            return;
        }
        try {
            const res = await fetch(`/api/prompt-workflows/${selectedWorkflowId}/steps/${stepId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    step_name: editingStepForm.step_name.trim(),
                    step_description: editingStepForm.step_description.trim() || null,
                    step_instruction: editingStepForm.step_instruction.trim() || null
                })
            });
            if (!res.ok) throw new Error("ไม่สามารถอัปเดตข้อมูลขั้นตอนได้");
            await fetchWorkflowDetails();
            setEditingStepId(null);
            alert("อัปเดตข้อมูลขั้นตอนสำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };


    const handleSaveRunLog = async () => {
        if (!selectedId || selectedId === "new-template") return;
        setIsSavingLog(true);
        setApiError(null);
        try {
            const res = await fetch("/api/prompt-run-logs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    promptTemplateId: selectedId,
                    inputSnapshot: currentInputFields.map(f => ({
                        ...f,
                        value: testValues[f.name] || ""
                    })),
                    compiledPromptSnapshot: compiledActivePrompt,
                    outputNotes: logForm.outputNotes,
                    rating: logForm.rating,
                    nextRevisionNotes: logForm.nextRevisionNotes,
                    summary: logForm.summary,
                    runStatus: logForm.runStatus
                })
            });

            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "ไม่สามารถบันทึกประวัติการทดสอบได้");
            }

            setLogForm({
                rating: 5,
                outputNotes: "",
                nextRevisionNotes: "",
                summary: "",
                runStatus: "needs_revision"
            });

            fetchRunLogs();
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกประวัติ";
            setApiError(errMsg);
        } finally {
            setIsSavingLog(false);
        }
    };

    const handleUpdateRunLog = async (logId: string, updates: Partial<PromptRunLog>) => {
        setApiError(null);
        try {
            const res = await fetch("/api/prompt-run-logs", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: logId,
                    summary: updates.summary,
                    runStatus: updates.runStatus,
                    outputNotes: updates.outputNotes,
                    rating: updates.rating,
                    nextRevisionNotes: updates.nextRevisionNotes
                })
            });

            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "ไม่สามารถอัปเดตประวัติการทดสอบได้");
            }

            fetchRunLogs();
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปเดตข้อมูล";
            setApiError(errMsg);
        }
    };

    const handleArchiveRunLog = async (logId: string) => {
        if (!confirm("คุณต้องการจัดเก็บ (Archive) ประวัติการรันนี้ใช่หรือไม่? (ประวัตินี้จะถูกซ่อนจากมุมมองหลัก)")) return;
        await handleUpdateRunLog(logId, { runStatus: "archived" });
    };

    const handleCreateVersion = async (vString: string, notesString: string, runLogId: string | null = null) => {
        if (!selectedId || selectedId === "new-template") return;
        if (!vString.trim()) {
            alert("กรุณากรอกเลขเวอร์ชัน");
            return;
        }
        setIsSavingVersion(true);
        try {
            const res = await fetch(`/api/prompt-templates/${selectedId}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    version: vString.trim(),
                    revision_notes: notesString.trim() || null,
                    created_from_run_log_id: runLogId
                })
            });
            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "ไม่สามารถสร้างเวอร์ชันได้");
            }
            await fetchVersions();
            await fetchTemplates();
            alert("บันทึกเวอร์ชันสำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกเวอร์ชัน";
            alert(errMsg);
        } finally {
            setIsSavingVersion(false);
        }
    };

    const handleMarkVersionActive = async (versionId: string) => {
        if (!selectedId) return;
        try {
            const res = await fetch(`/api/prompt-templates/${selectedId}/versions/${versionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: true })
            });
            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "ไม่สามารถตั้งค่าเวอร์ชัน Active ได้");
            }
            await fetchVersions();
            await fetchTemplates();
            alert("ตั้งเป็นเวอร์ชัน Active สำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const handleRestoreVersion = async (version: PromptVersion) => {
        if (!selectedId) return;
        if (!confirm(`คุณต้องการกู้คืนเนื้อหาเทมเพลตนี้กลับเป็นรุ่น ${version.version} ใช่หรือไม่?\nการดำเนินการนี้จะเปลี่ยนฟิลด์ในห้องแก้ไขปัจจุบันทั้งหมด (ประวัติเวอร์ชันเดิมและรันล็อกจะยังอยู่ครบ)`)) {
            return;
        }
        try {
            const res = await fetch(`/api/prompt-templates/${selectedId}/versions/${version.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ restore: true })
            });
            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "ไม่สามารถกู้คืนเวอร์ชันได้");
            }
            await fetchTemplates();
            await fetchVersions();
            alert("กู้คืนรุ่นสำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    const handleDeleteVersion = async (versionId: string) => {
        if (!selectedId) return;
        if (!confirm("คุณต้องการลบประวัติเวอร์ชันนี้ใช่หรือไม่? (การดำเนินการนี้ไม่สามารถกู้คืนได้)")) {
            return;
        }
        try {
            const res = await fetch(`/api/prompt-templates/${selectedId}/versions/${versionId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "ไม่สามารถลบเวอร์ชันได้");
            }
            await fetchVersions();
            alert("ลบประวัติเวอร์ชันสำเร็จ!");
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            alert(errMsg);
        }
    };

    useEffect(() => {
        setLogForm({
            rating: 5,
            outputNotes: "",
            nextRevisionNotes: "",
            summary: "",
            runStatus: "needs_revision"
        });
        setExpandedLogId(null);
        setNewVersionForm({ version: "", revisionNotes: "" });
        setLogVersionFormOpenId(null);
        setLogVersionInputs({});
    }, [selectedId]);

    // Set editor fields when template is selected
    const activeTemplate = useMemo(() => {
        const temp = templates.find(t => t.id === selectedId);
        if (temp) {
            setEditorFields({ ...temp });
            
            // Set default test values from input_fields
            const parsedInputs = safeParseInputFields(temp.input_fields);
            const initialValues: Record<string, string> = {};
            parsedInputs.forEach(f => {
                initialValues[f.name] = f.value;
            });
            setTestValues(initialValues);
            setJsonValidationError(null);
            
            // Reset field form
            setEditingFieldIndex(null);
            setFieldForm({
                name: "",
                label: "",
                value: "",
                placeholder: "",
                helperText: "",
                required: false
            });
            setFieldValidationError(null);
        }
        return temp;
    }, [selectedId, templates]);

    // Parse input fields list safely for rendering list in Field Builder
    const currentInputFields = useMemo(() => {
        return safeParseInputFields(editorFields.input_fields || null);
    }, [editorFields.input_fields]);

    // Validate Field Name Rules live
    const validateFieldNameLive = (name: string, index: number | null): string | null => {
        if (!name.trim()) {
            return "Field Name ห้ามว่าง";
        }
        const nameRegex = /^[a-zA-Z0-9_]+$/;
        if (!nameRegex.test(name)) {
            return "Field Name ต้องใช้ภาษาอังกฤษ ตัวเลข และเครื่องหมาย _ เท่านั้น (ห้ามเว้นวรรคหรือมีภาษาไทย)";
        }
        const isDuplicate = currentInputFields.some((f, idx) => f.name === name && idx !== index);
        if (isDuplicate) {
            return `ชื่อตัวแปร "${name}" มีการใช้งานซ้ำใน Prompt นี้แล้ว`;
        }
        return null;
    };

    // Synchronize currentFields back to editorFields.input_fields JSON
    const updateInputFieldsList = (newFields: PromptInputField[]) => {
        const jsonStr = JSON.stringify(newFields);
        setEditorFields(prev => ({ ...prev, input_fields: jsonStr }));
        setJsonValidationError(null);

        // Sync test values to match new fields config immediately
        setTestValues(prev => {
            const updated: Record<string, string> = {};
            newFields.forEach(f => {
                updated[f.name] = prev[f.name] !== undefined ? prev[f.name] : f.value;
            });
            return updated;
        });
    };

    // Handle JSON changes inside raw collapsible text-area safely
    const handleJsonChange = (val: string) => {
        setEditorFields(prev => ({ ...prev, input_fields: val }));
        if (!val.trim()) {
            setJsonValidationError(null);
            return;
        }
        try {
            const parsed = JSON.parse(val);
            if (!Array.isArray(parsed)) {
                setJsonValidationError("รูปแบบ JSON ต้องเป็น Array: [ { 'name': '...', 'label': '...', 'value': '...' } ]");
            } else {
                setJsonValidationError(null);
                // Sync values
                const initialValues: Record<string, string> = {};
                parsed.forEach((f: unknown) => {
                    const typedF = f as Record<string, unknown>;
                    if (typedF && typeof typedF === "object" && typedF.name) {
                        initialValues[String(typedF.name)] = String(typedF.value || "");
                    }
                });
                setTestValues(initialValues);
            }
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "Invalid JSON format";
            setJsonValidationError(`ข้อผิดพลาด JSON: ${errMsg}`);
        }
    };

    // Filter Templates
    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.purpose && t.purpose.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (t.role && t.role.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
            const matchesStatus = statusFilter === "All" || t.status === statusFilter;
            
            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [templates, searchTerm, categoryFilter, statusFilter]);

    // 1. Template Structure (Raw prompt with placeholders like {{topic}}, no [USER INPUT] block)
    const templateStructurePrompt = useMemo(() => {
        const blocks: string[] = [];
        
        const name = editorFields.name || activeTemplate?.name || "";
        const role = editorFields.role || activeTemplate?.role || "";
        const purpose = editorFields.purpose || activeTemplate?.purpose || "";
        const context = editorFields.context || activeTemplate?.context || "";
        const instructions = editorFields.instructions || activeTemplate?.instructions || "";
        const constraints = editorFields.constraints || activeTemplate?.constraints || "";
        const outputFormat = editorFields.output_format || activeTemplate?.output_format || "";
        const reviewChecklist = editorFields.review_checklist || activeTemplate?.review_checklist || "";
        const notes = editorFields.notes || activeTemplate?.notes || "";

        if (name) blocks.push(`# PROMPT TEMPLATE: ${name}`);
        if (role) blocks.push(`[ROLE]\n${role}`);
        if (purpose) blocks.push(`[PURPOSE]\n${purpose}`);
        if (context) blocks.push(`[CONTEXT]\n${context}`);
        if (instructions) blocks.push(`[INSTRUCTIONS]\n${instructions}`);
        if (constraints) blocks.push(`[CONSTRAINTS]\n${constraints}`);
        if (outputFormat) blocks.push(`[OUTPUT FORMAT]\n${outputFormat}`);
        if (reviewChecklist) blocks.push(`[REVIEW CHECKLIST]\n${reviewChecklist}`);

        // Construct [GUARDRAILS] section if presets are applied
        const appliedPresetIds = parseGuardrailIds(editorFields.guardrail_preset_ids || activeTemplate?.guardrail_preset_ids);
        const appliedPresets = appliedPresetIds
            .map(id => guardrailPresets.find(p => p.id === id))
            .filter(Boolean) as GuardrailPreset[];

        if (appliedPresets.length > 0) {
            const guardrailLines = appliedPresets.map(preset => `- ${preset.name}: ${preset.content}`);
            blocks.push(`[GUARDRAILS]\n${guardrailLines.join("\n")}`);
        }

        if (notes) blocks.push(`[NOTES]\n${notes}`);

        return blocks.join("\n\n");
    }, [editorFields, activeTemplate, guardrailPresets]);

    // 2. Compiled Prompt (Substituted placeholders & appended [USER INPUT] block)
    const compiledActivePrompt = useMemo(() => {
        const blocks: string[] = [];
        
        const name = editorFields.name || activeTemplate?.name || "";
        const role = editorFields.role || activeTemplate?.role || "";
        const purpose = editorFields.purpose || activeTemplate?.purpose || "";
        const context = editorFields.context || activeTemplate?.context || "";
        const instructions = editorFields.instructions || activeTemplate?.instructions || "";
        const constraints = editorFields.constraints || activeTemplate?.constraints || "";
        const outputFormat = editorFields.output_format || activeTemplate?.output_format || "";
        const reviewChecklist = editorFields.review_checklist || activeTemplate?.review_checklist || "";
        const notes = editorFields.notes || activeTemplate?.notes || "";

        if (name) blocks.push(`# PROMPT: ${name}`);
        if (role) blocks.push(`[ROLE]\n${role}`);
        if (purpose) blocks.push(`[PURPOSE]\n${purpose}`);
        if (context) blocks.push(`[CONTEXT]\n${context}`);
        if (instructions) blocks.push(`[INSTRUCTIONS]\n${instructions}`);
        if (constraints) blocks.push(`[CONSTRAINTS]\n${constraints}`);
        if (outputFormat) blocks.push(`[OUTPUT FORMAT]\n${outputFormat}`);
        if (reviewChecklist) blocks.push(`[REVIEW CHECKLIST]\n${reviewChecklist}`);

        // Construct [GUARDRAILS] section if presets are applied
        const appliedPresetIds = parseGuardrailIds(editorFields.guardrail_preset_ids || activeTemplate?.guardrail_preset_ids);
        const appliedPresets = appliedPresetIds
            .map(id => guardrailPresets.find(p => p.id === id))
            .filter(Boolean) as GuardrailPreset[];

        if (appliedPresets.length > 0) {
            const guardrailLines = appliedPresets.map(preset => `- ${preset.name}: ${preset.content}`);
            blocks.push(`[GUARDRAILS]\n${guardrailLines.join("\n")}`);
        }

        if (notes) blocks.push(`[NOTES]\n${notes}`);

        // Construct [USER INPUT] section dynamically if variables exist
        if (currentInputFields.length > 0) {
            const userInputLines = currentInputFields.map(field => {
                const val = testValues[field.name] || "";
                return `${field.label || field.name}: ${val}`;
            });
            blocks.push(`[USER INPUT]\n${userInputLines.join("\n")}`);
        }

        let result = blocks.join("\n\n");

        // Substitute placeholders (e.g. {{topic}} -> topic value)
        for (const [key, val] of Object.entries(testValues)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
            result = result.replace(regex, val || "");
        }

        return result;
    }, [editorFields, activeTemplate, testValues, currentInputFields, guardrailPresets]);

    // Get active prompt value based on current tab selection
    const activePreviewText = useMemo(() => {
        return previewTab === "compiled" ? compiledActivePrompt : templateStructurePrompt;
    }, [previewTab, compiledActivePrompt, templateStructurePrompt]);

    // Copy to clipboard with success feedback
    const handleCopy = () => {
        if (!activePreviewText) return;
        navigator.clipboard.writeText(activePreviewText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Create New Template
    const handleCreateNew = () => {
        const newTemp: Partial<PromptTemplate> = {
            id: "",
            name: "เทมเพลตใหม่",
            category: "General",
            purpose: "",
            role: "",
            context: "",
            input_fields: "[]",
            instructions: "",
            constraints: "",
            output_format: "",
            review_checklist: "",
            notes: "",
            status: "draft",
            version: "1.0.0",
            version_notes: "เริ่มต้นสร้างเทมเพลต"
        };
        setEditorFields(newTemp);
        setSelectedId("new-template");
        setTestValues({});
        setJsonValidationError(null);
        setPreviewTab("compiled"); 
        setEditingFieldIndex(null);
        setFieldForm({
            name: "",
            label: "",
            value: "",
            placeholder: "",
            helperText: "",
            required: false
        });
        setFieldValidationError(null);
    };

    // Save Template (POST or PATCH)
    const handleSave = async () => {
        if (jsonValidationError) {
            setApiError("ไม่สามารถบันทึกได้เนื่องจากรูปแบบ JSON ของ Input Fields ผิดพลาด");
            return;
        }
        if (!editorFields.name || !editorFields.category) {
            setApiError("กรุณากรอกชื่อและเลือกหมวดหมู่ก่อนบันทึก");
            return;
        }

        setIsSaving(true);
        setApiError(null);
        try {
            const isNew = selectedId === "new-template";
            const url = isNew ? "/api/prompt-templates" : `/api/prompt-templates/${selectedId}`;
            const method = isNew ? "POST" : "PATCH";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editorFields)
            });

            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "บันทึกข้อมูลไม่สำเร็จ");
            }

            const savedData = await res.json() as PromptTemplate;
            
            if (isNew) {
                setTemplates(prev => [savedData, ...prev]);
                setSelectedId(savedData.id);
            } else {
                setTemplates(prev => prev.map(t => t.id === savedData.id ? savedData : t));
            }
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
            setApiError(errMsg);
        } finally {
            setIsSaving(false);
        }
    };

    // Archive Template (DELETE via status update)
    const handleArchive = async () => {
        if (!selectedId || selectedId === "new-template") return;
        if (!confirm("คุณต้องการจะย้ายเทมเพลตนี้ไปยังสถานะถังขยะ/จัดเก็บเอกสาร (Archive) ใช่หรือไม่?")) return;

        setIsSaving(true);
        setApiError(null);
        try {
            const res = await fetch(`/api/prompt-templates/${selectedId}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error || "เกิดข้อผิดพลาดในการลบเทมเพลต");
            }

            const data = await res.json() as { success: boolean; template: PromptTemplate };
            if (data.success && data.template) {
                const updated = data.template;
                setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
            }
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : "ล้มเหลวในการจัดเก็บเทมเพลต";
            setApiError(errMsg);
        } finally {
            setIsSaving(false);
        }
    };

    // Builder GUI Actions
    const handleFieldFormChange = (key: keyof PromptInputField, val: string | boolean) => {
        setFieldForm(prev => {
            const updated = { ...prev, [key]: val };
            if (key === "name") {
                const err = validateFieldNameLive(String(val), editingFieldIndex);
                setFieldValidationError(err);
            }
            return updated;
        });
    };

    // Submit Field (Add or Edit)
    const handleSubmitField = () => {
        const name = fieldForm.name?.trim() || "";
        const err = validateFieldNameLive(name, editingFieldIndex);
        if (err) {
            setFieldValidationError(err);
            return;
        }

        const newField: PromptInputField = {
            name,
            label: fieldForm.label?.trim() || name,
            value: fieldForm.value || "",
            placeholder: fieldForm.placeholder?.trim() || undefined,
            helperText: fieldForm.helperText?.trim() || undefined,
            required: fieldForm.required === true
        };

        const fields = [...currentInputFields];
        if (editingFieldIndex !== null) {
            // Update
            fields[editingFieldIndex] = newField;
        } else {
            // Add
            fields.push(newField);
        }

        updateInputFieldsList(fields);

        // Reset form
        setEditingFieldIndex(null);
        setFieldForm({
            name: "",
            label: "",
            value: "",
            placeholder: "",
            helperText: "",
            required: false
        });
        setFieldValidationError(null);
    };

    // Edit Field (Load into form)
    const handleEditField = (index: number) => {
        const target = currentInputFields[index];
        setEditingFieldIndex(index);
        setFieldForm({ ...target });
        setFieldValidationError(null);
    };

    // Delete Field
    const handleDeleteField = (index: number) => {
        if (!confirm("คุณต้องการที่จะลบตัวแปรนี้ออกใช่หรือไม่? (การลบจะลบการเชื่อมต่ออินพุตของตัวแปรนี้ออกด้วย)")) return;
        const fields = currentInputFields.filter((_, idx) => idx !== index);
        updateInputFieldsList(fields);
        if (editingFieldIndex === index) {
            setEditingFieldIndex(null);
            setFieldForm({
                name: "",
                label: "",
                value: "",
                placeholder: "",
                helperText: "",
                required: false
            });
            setFieldValidationError(null);
        }
    };

    // Reorder Fields (Move Up / Down)
    const handleMoveField = (index: number, direction: "up" | "down") => {
        const fields = [...currentInputFields];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= fields.length) return;

        // Swap
        const temp = fields[index];
        fields[index] = fields[targetIndex];
        fields[targetIndex] = temp;

        updateInputFieldsList(fields);

        // Shift editing index if currently editing the swapped fields
        if (editingFieldIndex === index) {
            setEditingFieldIndex(targetIndex);
        } else if (editingFieldIndex === targetIndex) {
            setEditingFieldIndex(index);
        }
    };

    // Cancel edit state
    const handleCancelEdit = () => {
        setEditingFieldIndex(null);
        setFieldForm({
            name: "",
            label: "",
            value: "",
            placeholder: "",
            helperText: "",
            required: false
        });
        setFieldValidationError(null);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 text-slate-800 overflow-hidden font-sans">
            {/* Header Alert area for API Errors */}
            {apiError && (
                <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-3 flex items-center justify-between text-sm animate-fadeIn flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span>{apiError}</span>
                    </div>
                    <button 
                        onClick={() => setApiError(null)} 
                        className="text-red-400 hover:text-red-200 text-xs px-2 py-1 font-bold rounded animate-pulse"
                    >
                        ปิด
                    </button>
                </div>
            )}

            {/* Layout container */}
            <div className="flex flex-1 overflow-hidden">
                {/* 1. Left Column: Prompt Library & Workflows */}
                <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-100/60 flex-shrink-0">
                    {/* Tab Switcher */}
                    <div className="bg-slate-200/50 p-1 rounded-lg flex gap-1 mx-3 my-2.5 border border-slate-200/40 flex-shrink-0">
                        <button
                            onClick={() => {
                                setSidebarTab("templates");
                                setSelectedWorkflowId(null);
                                if (templates.length > 0 && !selectedId) {
                                    setSelectedId(templates[0].id);
                                }
                            }}
                            className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                sidebarTab === "templates"
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                    : "text-slate-600 hover:bg-slate-200/40"
                            }`}
                        >
                            Templates ({templates.filter(t => t.status !== "archived").length})
                        </button>
                        <button
                            onClick={() => {
                                setSidebarTab("workflows");
                                setSelectedId(null);
                                fetchWorkflows();
                            }}
                            className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                sidebarTab === "workflows"
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                    : "text-slate-600 hover:bg-slate-200/40"
                            }`}
                        >
                            Workflows ({workflows.length})
                        </button>
                    </div>

                    {sidebarTab === "templates" ? (
                        <>
                            {/* Filters & Actions */}
                            <div className="p-4 border-b border-slate-200 bg-white/45 space-y-3 flex-shrink-0">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5 text-slate-500" /> Prompt Library
                                    </h2>
                                    <button
                                        onClick={handleCreateNew}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-sm cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> สร้างใหม่
                                    </button>
                                </div>

                                {/* Search input */}
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหาชื่อ, สรรพคุณ..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 text-xs rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 selection:bg-blue-500/10 transition-all shadow-sm"
                                    />
                                </div>

                                {/* Category filter */}
                                <div className="flex gap-2">
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className={SELECT_CLASS}
                                    >
                                        <option className="text-slate-800" value="All">หมวดหมู่ทั้งหมด</option>
                                        {CATEGORIES.map(cat => (
                                            <option className="text-slate-800" key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>

                                    {/* Status filter */}
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className={SELECT_CLASS}
                                    >
                                        <option className="text-slate-800" value="All">สถานะทั้งหมด</option>
                                        <option className="text-slate-800" value="active">Active</option>
                                        <option className="text-slate-800" value="draft">Draft</option>
                                        <option className="text-slate-800" value="testing">Testing</option>
                                        <option className="text-slate-800" value="archived">Archived</option>
                                    </select>
                                </div>
                            </div>

                            {/* Template List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                                {isLoading ? (
                                    <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                                        <span>กำลังโหลดข้อมูล...</span>
                                    </div>
                                ) : filteredTemplates.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-xs">
                                        ไม่พบเทมเพลตที่ตรงกับเงื่อนไข
                                    </div>
                                ) : (
                                    filteredTemplates.map(t => {
                                        const isActive = t.id === selectedId;
                                        
                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedId(t.id)}
                                                className={`p-3 text-left cursor-pointer transition-all rounded-xl border ${
                                                    isActive 
                                                        ? "bg-white text-slate-900 border-slate-200 border-l-4 border-l-blue-500 shadow-sm font-semibold" 
                                                        : "hover:bg-slate-200/50 text-slate-600 border-transparent"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-1.5">
                                                    <h3 className={`font-semibold text-xs truncate max-w-[180px] ${isActive ? "text-slate-900" : "text-slate-700"}`}>{t.name}</h3>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-medium border ${
                                                        t.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                        t.status === "testing" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                        t.status === "archived" ? "bg-slate-100 text-slate-500 border-slate-200" :
                                                        "bg-slate-100 text-slate-500 border-slate-200"
                                                    }`}>
                                                        {t.status}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 line-clamp-1 mt-1">{t.purpose || "ไม่มีคำอธิบาย"}</p>
                                                
                                                <div className="flex justify-between items-center mt-2 text-[9px] text-slate-500">
                                                    <span>{t.category}</span>
                                                    <span>
                                                        {t.active_version ? (
                                                            <span className="text-emerald-600 font-bold">Active: {t.active_version}</span>
                                                        ) : (
                                                            `v${t.version}`
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Workflow Actions */}
                            <div className="p-4 border-b border-slate-200 bg-white/45 space-y-3 flex-shrink-0">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <Sliders className="w-3.5 h-3.5 text-slate-500" /> Workflows
                                    </h2>
                                </div>

                                {/* Create Workflow Form (inline) */}
                                <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5 shadow-sm">
                                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">สร้างเซ็ตเวิร์กโฟลว์ใหม่</span>
                                    <input
                                        type="text"
                                        placeholder="ชื่อเวิร์กโฟลว์..."
                                        value={workflowForm.name}
                                        onChange={(e) => setWorkflowForm(prev => ({ ...prev, name: e.target.value }))}
                                        className={INPUT_CLASS}
                                    />
                                    <input
                                        type="text"
                                        placeholder="คำอธิบาย (ไม่บังคับ)..."
                                        value={workflowForm.description}
                                        onChange={(e) => setWorkflowForm(prev => ({ ...prev, description: e.target.value }))}
                                        className={INPUT_CLASS}
                                    />
                                    <button
                                        onClick={handleCreateWorkflow}
                                        disabled={isSavingWorkflow}
                                        className="w-full py-2 text-center text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg cursor-pointer transition shadow-sm disabled:opacity-50"
                                    >
                                        {isSavingWorkflow ? "กำลังบันทึก..." : "สร้าง"}
                                    </button>
                                </div>
                            </div>

                            {/* Workflow List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                                {isLoadingWorkflows ? (
                                    <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                                        <span>กำลังโหลด...</span>
                                    </div>
                                ) : workflows.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 text-xs italic">
                                        ยังไม่มีเวิร์กโฟลว์ (สามารถสร้างใหม่ด้านบน)
                                    </div>
                                ) : (
                                    workflows.map(wf => {
                                        const isActive = wf.id === selectedWorkflowId;
                                        return (
                                            <div
                                                key={wf.id}
                                                onClick={() => {
                                                    setSelectedWorkflowId(wf.id);
                                                    setSelectedId(null);
                                                }}
                                                className={`p-3 text-left cursor-pointer transition-all rounded-xl border ${
                                                    isActive 
                                                        ? "bg-white text-slate-900 border-slate-200 border-l-4 border-l-blue-500 shadow-sm font-semibold" 
                                                        : "hover:bg-slate-200/50 text-slate-600 border-transparent"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-1.5">
                                                    <h3 className={`font-semibold text-xs truncate max-w-[170px] ${isActive ? "text-slate-900" : "text-slate-700"}`}>{wf.name}</h3>
                                                    <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-semibold font-mono border border-slate-200">
                                                        {wf.step_count || 0} ขั้น
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">{wf.description || "ไม่มีคำอธิบาย"}</p>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* 2. Center Column: Prompt Editor or Workflow Editor */}
                {sidebarTab === "templates" ? (
                    <div className="flex-1 border-r border-slate-200 flex flex-col bg-slate-50 overflow-hidden">
                    {/* Editor Toolbar */}
                    <div className="p-4 border-b border-slate-200/80 flex justify-between items-center bg-white flex-shrink-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center gap-2.5">
                            <Edit className="w-4 h-4 text-blue-600" />
                            <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                {selectedId === "new-template" ? "สร้างเทมเพลตใหม่" : "แก้ไข Prompt Template"}
                            </h2>
                            {selectedId && selectedId !== "new-template" && activeTemplate?.active_version && (
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-250 px-2 py-0.5 rounded text-[10px] font-extrabold">
                                    Active: {activeTemplate.active_version}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowQuickGuide(!showQuickGuide)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg font-semibold transition cursor-pointer border ${
                                    showQuickGuide 
                                        ? "bg-blue-50 text-blue-600 border-blue-200" 
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                }`}
                                title="คำแนะนำการใช้งานด่วน"
                            >
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>{showQuickGuide ? "ซ่อนแนะนำ" : "คู่มือการใช้"}</span>
                            </button>
                            {selectedId && selectedId !== "new-template" && (
                                <button
                                    onClick={handleArchive}
                                    disabled={isSaving || editorFields.status === "archived"}
                                    title="ย้ายไปยัง Archived"
                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <Archive className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-md transition shadow-sm cursor-pointer"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{isSaving ? "กำลังบันทึก..." : "บันทึก"}</span>
                            </button>
                        </div>
                    </div>

                    {showQuickGuide && (
                        <div className="mx-6 mt-4 p-4.5 bg-blue-50/40 border border-blue-100 rounded-2xl animate-fadeIn space-y-3 flex-shrink-0">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4 text-blue-600" />
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">คู่มือการใช้งาน Prompt Studio ด่วน (Quick Guide)</h3>
                                </div>
                                <button 
                                    onClick={() => setShowQuickGuide(false)}
                                    className="text-slate-400 hover:text-slate-650 text-xs font-semibold cursor-pointer"
                                >
                                    ปิดคำแนะนำ
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                <strong>Prompt Studio</strong> เป็นเครื่องมือหลักสำหรับใช้ในการสร้าง (create), ทดสอบ (test), ปรับปรุง (improve), จัดเวอร์ชัน (version) และรวบรวมคำสั่ง Prompts ให้เป็นเวิร์กโฟลว์ (workflows) เพื่อนำไปใช้งานซ้ำในขั้นตอนการผลิตเนื้อหาที่มีสไตล์และมาตรฐานคุณภาพเดียวกัน
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1 text-[11px]">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-700">✍️ 1. Prompt Templates & Inputs</h4>
                                    <p className="text-slate-500 leading-normal">
                                        ร่างข้อความหลัก และกำหนดตัวแปร <strong>Input Fields</strong> (เช่น หัวข้อ, กลุ่มเป้าหมาย) เพื่อปรับเปลี่ยนเนื้อหาเวลาทำคำสั่งส่งไปรันจริงได้โดยไม่ต้องแก้ไขเทมเพลตซ้ำ ๆ
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-700">🛡️ 2. Green Fineness Guardrails</h4>
                                    <p className="text-slate-500 leading-normal">
                                        แนวทางควบคุมความเสี่ยงและการใช้ภาษา ช่วยให้ข้อเสนอแนะและข้อห้ามใช้ (เช่น คำเคลมการแพทย์เกินจริง) สอดแทรกเข้าไปในผลลัพธ์เพื่อรักษาคุณภาพแบรนด์และโทนเสียงให้สม่ำเสมอ
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-700">🧪 3. Playground & Test History</h4>
                                    <p className="text-slate-500 leading-normal">
                                        ทดลองรันส่งข้อมูลพารามิเตอร์จำลองและบันทึกประวัติการทดสอบ (Test History) เพื่อประเมินผลลัพธ์และความพร้อมก่อนนำไปใช้งานจริง
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-slate-700">🔄 4. Version Management</h4>
                                    <p className="text-slate-500 leading-normal">
                                        ล็อกความก้าวหน้าการแก้ไขเป็นเวอร์ชันต่าง ๆ เพื่อป้องกันข้อมูลสูญหาย และสามารถกู้คืนเทมเพลตกลับไปเป็นเวอร์ชันก่อนหน้าได้ตลอดเวลา
                                    </p>
                                </div>
                             </div>
                         </div>
                     )}

                    {/* Form Fields */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs custom-scrollbar">
                        {/* Meta Grid Card */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-5">
                            <div>
                                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                                    ข้อมูลทั่วไป (Metadata)
                                </h3>
                                <p className="text-[10px] text-slate-400 border-b border-slate-100 pb-2">
                                    กำหนดชื่อและหมวดหมู่ของเทมเพลตเพื่อจัดระเบียบและเรียกใช้งานได้ง่ายในระบบคลังคำสั่ง
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ชื่อ Prompt *</label>
                                    <input
                                        type="text"
                                        value={editorFields.name || ""}
                                        onChange={(e) => setEditorFields(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="เช่น Green Fineness Content Writer"
                                        className={INPUT_CLASS}
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">หมวดหมู่ *</label>
                                    <select
                                        value={editorFields.category || ""}
                                        onChange={(e) => setEditorFields(prev => ({ ...prev, category: e.target.value }))}
                                        className={SELECT_CLASS}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option className="bg-white text-slate-800" key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">สถานะ</label>
                                    <select
                                        value={editorFields.status || "draft"}
                                        onChange={(e) => setEditorFields(prev => ({ ...prev, status: e.target.value as PromptTemplate["status"] }))}
                                        className={SELECT_CLASS}
                                    >
                                        {STATUSES.map(st => (
                                            <option className="bg-white text-slate-800" key={st} value={st}>{st}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Version & Notes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">เวอร์ชัน</label>
                                    <input
                                        type="text"
                                        value={editorFields.version || "1.0.0"}
                                        onChange={(e) => setEditorFields(prev => ({ ...prev, version: e.target.value }))}
                                        placeholder="1.0.0"
                                        className={INPUT_CLASS + " font-mono"}
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">บันทึกเวอร์ชัน (Version Notes)</label>
                                    <input
                                        type="text"
                                        value={editorFields.version_notes || ""}
                                        onChange={(e) => setEditorFields(prev => ({ ...prev, version_notes: e.target.value }))}
                                        placeholder="เช่น เริ่มต้นเทมเพลต หรือ แก้ไข instructions เพิ่มเติม"
                                        className={INPUT_CLASS}
                                    />
                                </div>
                            </div>

                            {/* Purpose */}
                            <div>
                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">วัตถุประสงค์ (Purpose)</label>
                                <input
                                    type="text"
                                    value={editorFields.purpose || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, purpose: e.target.value }))}
                                    placeholder="จุดประสงค์หลักในการรัน Prompt นี้"
                                    className={INPUT_CLASS}
                                />
                            </div>
                        </div>

                        {/* Input Fields Section (HUMAN-FRIENDLY BUILDER + COLLAPSIBLE JSON) */}
                        <div className="border border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden shadow-sm">
                            {/* Builder Header */}
                            <div className="bg-slate-100/80 p-3 border-b border-slate-200 flex justify-between items-center">
                                <span className="font-extrabold text-slate-800 flex items-center gap-1.5 font-sans text-xs">
                                    <Sliders className="w-4 h-4 text-blue-600" />
                                    <span>Input Fields Builder</span>
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                    {currentInputFields.length} ฟิลด์ตัวแปร
                                </span>
                            </div>

                            <div className="p-4 space-y-4">
                                <p className="text-[10px] text-slate-500 pb-2 border-b border-slate-100">
                                    กำหนดฟิลด์ตัวแปร (เช่น topic, target_audience) เพื่อนำไปใช้อ้างอิงในเนื้อหาเทมเพลต Prompt ผ่านเครื่องหมายปีกกาคู่ <code>{"{{ชื่อตัวแปร}}"}</code> ได้โดยอัตโนมัติ
                                </p>
                                {/* List of Configured Fields */}
                                {currentInputFields.length === 0 ? (
                                    <p className="text-slate-400 text-xs italic text-center py-5 bg-white rounded-xl border border-dashed border-slate-200 shadow-inner">
                                        ยังไม่มีตัวแปรอินพุตใด ๆ เริ่มเพิ่มตัวแปรที่ต้องการในแบบฟอร์ม &quot;เพิ่มตัวแปรนำเข้าใหม่&quot; ด้านล่างนี้เพื่อนำไปเรียกใช้ในร่างคำสั่งหลัก
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {currentInputFields.map((field, idx) => (
                                            <div 
                                                key={field.name + "-" + idx}
                                                className={`flex items-center justify-between p-3 rounded-lg border text-xs bg-white transition ${
                                                    editingFieldIndex === idx ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200"
                                                }`}
                                            >
                                                <div className="space-y-0.5 max-w-[70%]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800">{field.label}</span>
                                                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                                                            &#123;&#123;{field.name}&#125;&#125;
                                                        </span>
                                                        {field.required && (
                                                            <span className="text-[9px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded font-bold border border-red-200/50">
                                                                Required
                                                            </span>
                                                        )}
                                                    </div>
                                                    {field.value && (
                                                        <p className="text-[10px] text-slate-600 truncate">
                                                            <span className="text-slate-400">Default:</span> {field.value}
                                                        </p>
                                                    )}
                                                    {field.placeholder && (
                                                        <p className="text-[10px] text-slate-500 truncate">
                                                            <span className="text-slate-400">Placeholder:</span> {field.placeholder}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Reorder and Edit Actions */}
                                                <div className="flex items-center gap-1.5">
                                                    {/* Move Up */}
                                                    <button
                                                        onClick={() => handleMoveField(idx, "up")}
                                                        disabled={idx === 0}
                                                        title="เลื่อนขึ้น"
                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-35 disabled:hover:text-slate-400 rounded hover:bg-slate-100 transition cursor-pointer"
                                                    >
                                                        <ArrowUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Move Down */}
                                                    <button
                                                        onClick={() => handleMoveField(idx, "down")}
                                                        disabled={idx === currentInputFields.length - 1}
                                                        title="เลื่อนลง"
                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-35 disabled:hover:text-slate-400 rounded hover:bg-slate-100 transition cursor-pointer"
                                                    >
                                                        <ArrowDown className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Edit */}
                                                    <button
                                                        onClick={() => handleEditField(idx)}
                                                        title="แก้ไขตัวแปร"
                                                        className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition cursor-pointer ml-1"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDeleteField(idx)}
                                                        title="ลบตัวแปร"
                                                        className="p-1 text-slate-400 hover:text-red-650 rounded hover:bg-red-50 transition cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Field Editor Form */}
                                <div className="border border-slate-200 rounded-lg p-3.5 bg-white space-y-3 shadow-sm animate-fadeIn">
                                    <span className="font-bold text-slate-700 text-xs block border-b border-slate-100 pb-1.5">
                                        {editingFieldIndex !== null ? "แก้ไขข้อมูลฟิลด์ตัวแปร" : "เพิ่มตัวแปรนำเข้าใหม่"}
                                    </span>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Field Name */}
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">
                                                Field Name (ตัวคีย์ในโค้ด) *
                                            </label>
                                            <input
                                                type="text"
                                                value={fieldForm.name || ""}
                                                onChange={(e) => handleFieldFormChange("name", e.target.value)}
                                                placeholder="เช่น target_audience"
                                                className={`w-full bg-white border rounded p-2 text-slate-800 caret-blue-500 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 selection:bg-blue-500/10 transition-all text-xs font-mono ${
                                                    fieldValidationError 
                                                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" 
                                                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/15"
                                                }`}
                                            />
                                            {fieldValidationError && (
                                                <p className="text-red-600 text-[9px] mt-1 font-mono flex items-center gap-1">
                                                    <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />
                                                    {fieldValidationError}
                                                </p>
                                            )}
                                        </div>

                                        {/* Label */}
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">
                                                Label (ป้ายแสดงภาษาไทย) *
                                            </label>
                                            <input
                                                type="text"
                                                value={fieldForm.label || ""}
                                                onChange={(e) => handleFieldFormChange("label", e.target.value)}
                                                placeholder="เช่น กลุ่มเป้าหมายบทความ"
                                                className={INPUT_CLASS}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* Default Value */}
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ค่าเริ่มต้น (Default)</label>
                                            <input
                                                type="text"
                                                value={fieldForm.value || ""}
                                                onChange={(e) => handleFieldFormChange("value", e.target.value)}
                                                placeholder="ใส่ค่าเริ่มต้น (ถ้ามี)"
                                                className={INPUT_CLASS}
                                            />
                                        </div>

                                        {/* Placeholder */}
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">คำแนะนำไกด์ (Placeholder)</label>
                                            <input
                                                type="text"
                                                value={fieldForm.placeholder || ""}
                                                onChange={(e) => handleFieldFormChange("placeholder", e.target.value)}
                                                placeholder="คำจางๆ แสดงในช่องกรอก"
                                                className={INPUT_CLASS}
                                            />
                                        </div>

                                        {/* Helper Text */}
                                        <div>
                                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ข้อความอธิบายเพิ่ม (Helper)</label>
                                            <input
                                                type="text"
                                                value={fieldForm.helperText || ""}
                                                onChange={(e) => handleFieldFormChange("helperText", e.target.value)}
                                                placeholder="แสดงใต้ช่องป้อนข้อความ"
                                                className={INPUT_CLASS}
                                            />
                                        </div>
                                    </div>

                                    {/* Required */}
                                    <div className="flex items-center gap-2 py-1">
                                        <input
                                            type="checkbox"
                                            id="field-form-required"
                                            checked={fieldForm.required || false}
                                            onChange={(e) => handleFieldFormChange("required", e.target.checked)}
                                            className="w-3.5 h-3.5 accent-blue-600 rounded bg-white border-slate-300 focus:ring-blue-500/20"
                                        />
                                        <label htmlFor="field-form-required" className="text-slate-600 text-xs font-semibold cursor-pointer select-none">
                                            กำหนดเป็นฟิลด์จำเป็นที่ผู้ใช้ต้องกรอก (Required Field)
                                        </label>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                        {editingFieldIndex !== null && (
                                            <button
                                                onClick={handleCancelEdit}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-semibold text-xs border border-slate-200 transition cursor-pointer"
                                            >
                                                ยกเลิก
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSubmitField}
                                            disabled={!!fieldValidationError || !fieldForm.name}
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-md font-bold text-xs transition cursor-pointer"
                                        >
                                            {editingFieldIndex !== null ? "บันทึกการแก้ไข" : "เพิ่มตัวแปร"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* COLLAPSIBLE RAW JSON (Advanced Mode) */}
                            <div className="border-t border-slate-200">
                                <button
                                    onClick={() => setShowAdvancedJson(!showAdvancedJson)}
                                    className="w-full p-3 bg-slate-100/50 hover:bg-slate-100/80 transition flex justify-between items-center text-xs font-semibold text-slate-600 border-t border-transparent"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Code className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Advanced JSON Editor (สำหรับผู้พัฒนา)</span>
                                    </span>
                                    {showAdvancedJson ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                                </button>

                                {showAdvancedJson && (
                                    <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 animate-slideDown">
                                        <textarea
                                            rows={4}
                                            value={editorFields.input_fields || "[]"}
                                            onChange={(e) => handleJsonChange(e.target.value)}
                                            className={`w-full bg-white border rounded p-2.5 text-slate-800 caret-blue-500 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all text-xs font-mono ${
                                                jsonValidationError 
                                                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" 
                                                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/15"
                                            }`}
                                        />
                                        {jsonValidationError ? (
                                            <p className="text-red-600 text-[10px] flex items-center gap-1 font-mono">
                                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                                {jsonValidationError}
                                            </p>
                                        ) : (
                                            <p className="text-slate-500 text-[9px]">
                                                * การแก้ไขข้อความตรงนี้จะซิงค์กลับไปหา Field Builder ด้านบนโดยอัตโนมัติหากโครงสร้างถูกต้อง
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Role & Context */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">บทบาท (Role / Persona)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.role || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, role: e.target.value }))}
                                    placeholder="เช่น คุณคือบรรณาธิการตรวจทานบทความวิชาการสมุนไพร..."
                                    className={TEXTAREA_CLASS}
                                />
                            </div>

                            <div>
                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">บริบท (Context)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.context || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, context: e.target.value }))}
                                    placeholder="บริบทโดยรอบ ข้อมูลพื้นฐาน องค์กร หรือกลุ่มเป้าหมาย..."
                                    className={TEXTAREA_CLASS}
                                />
                            </div>
                        </div>

                        {/* Instructions & Constraints */}
                        <div>
                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ขั้นตอนดำเนินงาน (Instructions)</label>
                            <textarea
                                rows={5}
                                value={editorFields.instructions || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, instructions: e.target.value }))}
                                placeholder="ขั้นตอนการทำงาน 1, 2, 3 ทีละสเตป..."
                                className={TEXTAREA_CLASS}
                            />
                        </div>

                        <div>
                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ข้อจำกัด / กฎเกณฑ์ (Constraints)</label>
                            <textarea
                                rows={3}
                                value={editorFields.constraints || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, constraints: e.target.value }))}
                                placeholder="สิ่งที่ห้ามทำเด็ดขาด เช่น ห้ามใช้สารเคมี, ห้ามใช้สัญลักษณ์นี้..."
                                className={TEXTAREA_CLASS}
                            />
                        </div>

                        {/* Green Fineness Guardrails Preset Selection Panel */}
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                            <label className="block text-slate-800 font-bold mb-1 text-xs uppercase tracking-wider">Green Fineness Guardrails (แนวทางความปลอดภัยของแบรนด์)</label>
                            <span className="text-[10px] text-slate-500 block mb-3 leading-normal">
                                Guardrails คือกฎการควบคุมความเสี่ยงและการใช้ภาษา ซึ่งจะถูกรวมเข้าไปใน Compiled Prompt เพื่อช่วยรักษาโทนเสียง การกล่าวอ้างสรรพคุณ (Claims) และคุณภาพของผลลัพธ์ให้สอดคล้องตามเกณฑ์มาตรฐานความปลอดภัยของ Green Fineness อยู่เสมอ
                            </span>
                            
                            {guardrailPresets.length === 0 ? (
                                <p className="text-slate-400 text-[10px] italic">กำลังโหลดข้อมูล Presets หรือไม่พบข้อมูลในระบบ...</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {guardrailPresets.map((preset) => {
                                        const appliedIds = parseGuardrailIds(editorFields.guardrail_preset_ids);
                                        const isApplied = appliedIds.includes(preset.id);
                                        
                                        // Safe parse risk words
                                        let parsedRiskWords: { word: string; suggestedAlternatives: string[] }[] = [];
                                        if (preset.risk_words) {
                                            try {
                                                parsedRiskWords = JSON.parse(preset.risk_words);
                                            } catch (e) {
                                                console.error("Failed to parse risk words", e);
                                            }
                                        }

                                        return (
                                            <div
                                                key={preset.id}
                                                onClick={() => handleToggleGuardrail(preset.id)}
                                                className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between select-none ${
                                                    isApplied
                                                        ? "bg-blue-50 border-blue-300 hover:bg-blue-100/70 text-slate-900 ring-1 ring-blue-400/20 shadow-sm"
                                                        : "bg-white border-slate-200 hover:bg-slate-50/70 text-slate-700 shadow-sm"
                                                }`}
                                            >
                                                <div className="space-y-1.5">
                                                    <div className="flex items-start gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={isApplied}
                                                            onChange={() => {}} // handled by onClick on container
                                                            className="mt-0.5 accent-blue-600 cursor-pointer w-3.5 h-3.5 flex-shrink-0"
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-extrabold text-[11px] text-slate-800 truncate">{preset.name}</span>
                                                                <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold border uppercase tracking-wider ${
                                                                    preset.category === "tone" ? "bg-cyan-50 text-cyan-600 border-cyan-200" :
                                                                    preset.category === "claims" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                                    preset.category === "sales" ? "bg-purple-50 text-purple-600 border-purple-200" :
                                                                    preset.category === "review" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                                    "bg-slate-100 text-slate-500 border-slate-200"
                                                                }`}>
                                                                    {preset.category}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-500 block mt-1 leading-normal">{preset.description}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {parsedRiskWords.length > 0 && (
                                                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[9px] text-slate-400 leading-normal">
                                                        <span className="text-amber-600 font-semibold block mb-0.5">Risk Word Bank & Alternatives:</span>
                                                        <ul className="space-y-0.5 pl-1.5 list-disc list-inside">
                                                            {parsedRiskWords.map((rw, index) => (
                                                                <li key={index} className="truncate">
                                                                    <strong className="text-red-600 font-mono">&quot;{rw.word}&quot;</strong> ➔ <span className="text-slate-600">{rw.suggestedAlternatives.join(", ")}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Output & Checklist */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">รูปแบบผลลัพธ์ (Output Format)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.output_format || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, output_format: e.target.value }))}
                                    placeholder="จัดรูปแบบคำตอบ เช่น แสดงเป็น Markdown Table หรือ JSON..."
                                    className={TEXTAREA_CLASS}
                                />
                            </div>

                            <div>
                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">รายการเช็คตรวจสอบก่อนส่ง (Review Checklist)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.review_checklist || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, review_checklist: e.target.value }))}
                                    placeholder="การประเมินคุณภาพด้วยตนเองก่อนสรุปผล..."
                                    className={TEXTAREA_CLASS}
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">บันทึกเพิ่มเติม (Notes)</label>
                            <textarea
                                rows={2}
                                value={editorFields.notes || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="บันทึกข้อความภายในที่ไม่ได้ Compile ไปยัง Prompt"
                                className={TEXTAREA_CLASS}
                            />
                        </div>
                    </div>
                </div>
                ) : (
                    /* Workflow Editor Workspace */
                    <div className="flex-1 border-r border-slate-200 flex flex-col bg-slate-50 overflow-hidden">
                        {selectedWorkflowId && selectedWorkflow ? (
                            <>
                                {/* Editor Toolbar */}
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white/80 sticky top-0 backdrop-blur-md z-10 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        <Sliders className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        {isEditingWorkflowMeta ? (
                                            <div className="flex items-center gap-2 flex-1 max-w-md">
                                                <input
                                                    type="text"
                                                    value={workflowMetaForm.name}
                                                    onChange={(e) => setWorkflowMetaForm(prev => ({ ...prev, name: e.target.value }))}
                                                    className={INPUT_CLASS}
                                                    placeholder="ชื่อเวิร์กโฟลว์"
                                                />
                                                <input
                                                    type="text"
                                                    value={workflowMetaForm.description}
                                                    onChange={(e) => setWorkflowMetaForm(prev => ({ ...prev, description: e.target.value }))}
                                                    className={INPUT_CLASS}
                                                    placeholder="คำอธิบาย"
                                                />
                                                <button
                                                    onClick={handleUpdateWorkflowMeta}
                                                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-semibold cursor-pointer transition shadow-sm flex-shrink-0"
                                                >
                                                    บันทึก
                                                </button>
                                                <button
                                                    onClick={() => setIsEditingWorkflowMeta(false)}
                                                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-semibold cursor-pointer transition shadow-sm flex-shrink-0"
                                                >
                                                    ยกเลิก
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
                                                        {selectedWorkflow.name}
                                                    </h2>
                                                    <button
                                                        onClick={() => {
                                                            setWorkflowMetaForm({
                                                                name: selectedWorkflow.name,
                                                                description: selectedWorkflow.description || ""
                                                            });
                                                            setIsEditingWorkflowMeta(true);
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer transition"
                                                        title="แก้ไขชื่อและรายละเอียด"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                {selectedWorkflow.description && (
                                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{selectedWorkflow.description}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={handleArchiveWorkflow}
                                            title="เก็บถาวรเวิร์กโฟลว์"
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition cursor-pointer text-xs font-semibold bg-white shadow-sm"
                                        >
                                            <Archive className="w-3.5 h-3.5" />
                                            <span>Archive</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Main Steps & Setup Panel */}
                                <div className="flex-1 p-5 overflow-y-auto space-y-6 text-xs custom-scrollbar">
                                    {/* Workflow Steps List */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">ขั้นตอนการทำงาน ({selectedWorkflow.steps?.length || 0})</h3>
                                            <span className="text-[10px] text-slate-400">เรียงตามลำดับก่อนหลัง</span>
                                        </div>

                                        {!selectedWorkflow.steps || selectedWorkflow.steps.length === 0 ? (
                                            <div className="border border-dashed border-slate-200 bg-slate-100/30 rounded-xl p-8 text-center text-slate-500 italic">
                                                ยังไม่มีขั้นตอนในเวิร์กโฟลว์นี้ เริ่มเพิ่มขั้นตอนแรกของคุณโดยกรอกฟอร์มด้านล่าง
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {selectedWorkflow.steps.map((step, index) => {
                                                    const isEditing = editingStepId === step.id;
                                                    return (
                                                        <div key={step.id} className="border border-slate-200/80 rounded-xl bg-white p-4 space-y-3 shadow-sm hover:border-slate-300 transition-all">
                                                            <div className="flex justify-between items-start gap-4">
                                                                <div className="flex items-start gap-3 min-w-0">
                                                                    <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-mono font-bold text-[10px] flex-shrink-0 mt-0.5 shadow-sm">
                                                                        {index + 1}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className="font-bold text-slate-800 text-xs truncate">{step.step_name}</h4>
                                                                        {step.step_description && (
                                                                            <p className="text-slate-500 text-[10px] mt-0.5 leading-relaxed">{step.step_description}</p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Step Control Buttons */}
                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    <button
                                                                        onClick={() => handleMoveStep(step.id, "up")}
                                                                        disabled={index === 0}
                                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 rounded hover:bg-slate-100 transition cursor-pointer"
                                                                        title="เลื่อนขึ้น"
                                                                    >
                                                                        <ArrowUp className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleMoveStep(step.id, "down")}
                                                                        disabled={index === (selectedWorkflow.steps?.length || 1) - 1}
                                                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 rounded hover:bg-slate-100 transition cursor-pointer"
                                                                        title="เลื่อนลง"
                                                                    >
                                                                        <ArrowDown className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleStartEditStep(step)}
                                                                        className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition cursor-pointer"
                                                                        title="แก้ไขขั้นตอน"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteStep(step.id)}
                                                                        className="p-1 text-slate-400 hover:text-red-650 rounded hover:bg-slate-100 transition cursor-pointer"
                                                                        title="ลบขั้นตอนออกจากเวิร์กโฟลว์"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Step Inline Edit Form */}
                                                            {isEditing && (
                                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-2 mt-2 shadow-inner">
                                                                    <div>
                                                                        <label className="block text-[10px] text-slate-500 font-bold mb-1">ชื่อขั้นตอน *</label>
                                                                        <input
                                                                            type="text"
                                                                            value={editingStepForm.step_name}
                                                                            onChange={(e) => setEditingStepForm(prev => ({ ...prev, step_name: e.target.value }))}
                                                                            className={INPUT_CLASS}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] text-slate-500 font-bold mb-1">คำอธิบาย</label>
                                                                        <input
                                                                            type="text"
                                                                            value={editingStepForm.step_description}
                                                                            onChange={(e) => setEditingStepForm(prev => ({ ...prev, step_description: e.target.value }))}
                                                                            className={INPUT_CLASS}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] text-slate-500 font-bold mb-1">คำแนะนำ/คำสั่งการรันเฉพาะ (Instruction Override)</label>
                                                                        <textarea
                                                                            rows={3}
                                                                            value={editingStepForm.step_instruction}
                                                                            onChange={(e) => setEditingStepForm(prev => ({ ...prev, step_instruction: e.target.value }))}
                                                                            className={TEXTAREA_CLASS}
                                                                            placeholder="เขียนกำกับว่าขั้นตอนนี้ควรป้อนข้อมูลหรือรัน Prompt อย่างไร..."
                                                                        />
                                                                    </div>
                                                                    <div className="flex gap-2 justify-end pt-1">
                                                                        <button
                                                                            onClick={() => handleUpdateStepDetails(step.id)}
                                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-semibold cursor-pointer transition shadow-sm"
                                                                        >
                                                                            บันทึกการแก้ไข
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingStepId(null)}
                                                                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-semibold cursor-pointer transition shadow-sm"
                                                                        >
                                                                            ยกเลิก
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Linked Prompt Template Details */}
                                                            <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-slate-500">เทมเพลต:</span>
                                                                        <span className="text-slate-755 font-semibold">{step.template_name}</span>
                                                                        <span className="bg-slate-100 text-slate-600 text-[8px] px-1.5 py-0.5 rounded font-mono border border-slate-200">
                                                                            {step.template_category}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-slate-500">Active Version:</span>
                                                                        {step.active_version ? (
                                                                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[9px] px-1.5 py-0.2 rounded font-bold">
                                                                                v{step.active_version}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 text-[10px] italic">ไม่มี (ใช้เวอร์ชันล่าสุด)</span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    onClick={() => {
                                                                        setSidebarTab("templates");
                                                                        setSelectedId(step.prompt_template_id);
                                                                    }}
                                                                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200 hover:border-slate-300 transition cursor-pointer font-semibold shadow-sm"
                                                                >
                                                                    <BookOpen className="w-3 h-3 text-blue-500" />
                                                                    <span>เปิดแก้ไขเทมเพลต</span>
                                                                </button>
                                                            </div>

                                                            {/* Step Instruction Display */}
                                                            {step.step_instruction && !isEditing && (
                                                                <div className="bg-slate-50 border border-slate-200/50 rounded-lg p-2.5 shadow-sm">
                                                                    <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider mb-1">คำสั่งการใช้งานเฉพาะขั้นตอนนี้:</span>
                                                                    <p className="text-slate-700 text-[10px] font-mono whitespace-pre-wrap leading-relaxed">{step.step_instruction}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Add Step Form */}
                                    <div className="border border-slate-200/80 rounded-xl p-4 bg-white shadow-sm space-y-4">
                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                            <Plus className="w-3.5 h-3.5 text-blue-500" /> เพิ่มขั้นตอนใหม่
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">เลือก Prompt Template *</label>
                                                <select
                                                    value={stepForm.promptTemplateId}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const matchedTpl = templates.find(t => t.id === val);
                                                        setStepForm(prev => ({
                                                            ...prev,
                                                            promptTemplateId: val,
                                                            stepName: matchedTpl ? matchedTpl.name : ""
                                                        }));
                                                    }}
                                                    className={SELECT_CLASS}
                                                >
                                                    <option className="text-slate-400" value="">-- เลือกเทมเพลต --</option>
                                                    {templates
                                                        .filter(t => t.status !== "archived")
                                                        .map(t => (
                                                            <option className="text-slate-800" key={t.id} value={t.id}>
                                                                {t.name} ({t.category}) {t.active_version ? `[v${t.active_version}]` : `[v${t.version}]`}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ชื่อขั้นตอน (ว่างไว้เพื่อใช้ชื่อเทมเพลต)</label>
                                                <input
                                                    type="text"
                                                    value={stepForm.stepName}
                                                    onChange={(e) => setStepForm(prev => ({ ...prev, stepName: e.target.value }))}
                                                    placeholder="เช่น สร้างร่างบทความเกริ่นนำ"
                                                    className={INPUT_CLASS}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">คำอธิบายขั้นตอน</label>
                                                <input
                                                    type="text"
                                                    value={stepForm.stepDescription}
                                                    onChange={(e) => setStepForm(prev => ({ ...prev, stepDescription: e.target.value }))}
                                                    placeholder="วัตถุประสงค์ของขั้นตอนนี้..."
                                                    className={INPUT_CLASS}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">คำแนะนำสั่งงานเฉพาะขั้นตอน (Instruction Override)</label>
                                                <textarea
                                                    rows={2}
                                                    value={stepForm.stepInstruction}
                                                    onChange={(e) => setStepForm(prev => ({ ...prev, stepInstruction: e.target.value }))}
                                                    placeholder="เขียนระบุเฉพาะขั้นตอนนี้ เช่น ให้นำเนื้อหาจากขั้นตอนที่ 1 มาวิเคราะห์ต่อ..."
                                                    className={TEXTAREA_CLASS}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-1">
                                            <button
                                                onClick={handleAddStep}
                                                disabled={isAddingStep || !stepForm.promptTemplateId}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-sm"
                                            >
                                                {isAddingStep ? (
                                                    <>
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        <span>กำลังเพิ่ม...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>เพิ่มขั้นตอน</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6 max-w-2xl mx-auto text-slate-600 custom-scrollbar justify-center">
                                <div className="text-center space-y-2">
                                    <Sliders className="w-10 h-10 text-blue-500 mx-auto mb-1 animate-pulse" />
                                    <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">คู่มือระบบเวิร์กโฟลว์ (Workflow Guide)</h2>
                                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                                        เรียงร้อยหลายคำสั่ง Prompt Templates เข้าด้วยกันเป็นขั้นตอนตามลำดับ เพื่อการผลิตเนื้อหาที่มีคุณภาพและเป็นระบบระเบียบ
                                    </p>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                        🚀 วิธีเริ่มต้นใช้งานเวิร์กโฟลว์
                                    </h3>
                                    <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-600">
                                        <li>สร้างเซ็ตเวิร์กโฟลว์ใหม่ที่แถบเมนูด้านซ้าย (แท็บ <strong className="text-blue-600 font-semibold">Workflows</strong>)</li>
                                        <li>คลิกเลือกเวิร์กโฟลว์ที่ต้องการเปิดขึ้นมาเพื่อจัดการโครงสร้าง</li>
                                        <li>ผูกขั้นตอนการทำงานโดยกรอกชื่อ เลือกเทมเพลต Prompt ที่เกี่ยวข้อง และบันทึกทีละขั้นตอน</li>
                                        <li>จัดลำดับขั้นตอนต่าง ๆ ให้สอดคล้องกันเพื่อใช้ในการผลิตผลงาน</li>
                                    </ol>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                                        💡 กรณีศึกษาเวิร์กโฟลว์: Green Fineness Article Production
                                    </h3>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        ระบบงานการเขียนบทความ Green Fineness ที่เชื่อมโยง 7 ขั้นตอนตามมาตรฐานของแบรนด์:
                                    </p>
                                    <div className="space-y-3 pt-1 text-[11px]">
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">1</span>
                                            <div>
                                                <strong className="text-slate-700 block">Research Brief</strong>
                                                <span className="text-slate-500">สรุปข้อมูลตั้งต้น บริบทของหัวข้อ และข้อเท็จจริงที่ควรใช้ในการเขียน</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">2</span>
                                            <div>
                                                <strong className="text-slate-700 block">Article Outline</strong>
                                                <span className="text-slate-500">วางโครงสร้างบทความ H1, H2, H3 และลำดับการเล่า</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">3</span>
                                            <div>
                                                <strong className="text-slate-700 block">Claim Risk Review</strong>
                                                <span className="text-slate-500">ตรวจคำกล่าวอ้างเรื่องดิน พืช จุลินทรีย์ ปุ๋ย ธาตุอาหาร ผลผลิต และสิ่งแวดล้อมไม่ให้ฟันธงเกินไป</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">4</span>
                                            <div>
                                                <strong className="text-slate-700 block">Article Draft</strong>
                                                <span className="text-slate-500">ร่างเนื้อหาทั้งหมดด้วยภาษาไทยที่อ่านง่าย มีบริบท และไม่ขายแรง</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">5</span>
                                            <div>
                                                <strong className="text-slate-700 block">Green Fineness Tone Review</strong>
                                                <span className="text-slate-500">ขัดเกลาภาษาให้สงบ ชัด และสอดคล้องกับโทน Green Fineness</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">6</span>
                                            <div>
                                                <strong className="text-slate-700 block">SEO Metadata</strong>
                                                <span className="text-slate-500">ร่าง meta title, meta description, slug และคำสำคัญเบื้องต้น</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-[9px] flex-shrink-0">7</span>
                                            <div>
                                                <strong className="text-slate-700 block">Social Caption</strong>
                                                <span className="text-slate-500">ย่อยประเด็นจากบทความเป็นโพสต์สั้นสำหรับเผยแพร่</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Right Column: Preview & Test Input Area */}
                {sidebarTab === "templates" && (
                    <div className="w-[420px] flex flex-col bg-slate-100/70 border-l border-slate-200 overflow-hidden flex-shrink-0">
                    {/* Main Tab selector for Playground vs History */}
                    <div className="bg-slate-200/50 p-1 rounded-lg flex gap-1 mx-3 my-2.5 border border-slate-200/40 flex-shrink-0">
                        <button
                            onClick={() => setRightPanelTab("playground")}
                            className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                rightPanelTab === "playground"
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                    : "text-slate-600 hover:bg-slate-200/40"
                            }`}
                        >
                            Playground
                        </button>
                        <button
                            onClick={() => setRightPanelTab("history")}
                            className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                rightPanelTab === "history"
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                    : "text-slate-600 hover:bg-slate-200/40"
                            }`}
                        >
                            Test History
                        </button>
                        <button
                            onClick={() => setRightPanelTab("versions")}
                            className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                rightPanelTab === "versions"
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                    : "text-slate-600 hover:bg-slate-200/40"
                            }`}
                        >
                            Versions
                        </button>
                    </div>

                    {rightPanelTab === "playground" && (
                        <>
                            {/* Test Variables Area */}
                            <div className="p-4 border-b border-slate-200 bg-white/40 flex flex-col flex-shrink-0">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sliders className="w-4 h-4 text-blue-500" />
                                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Test Input Area</h2>
                                </div>
                                
                                {currentInputFields.length === 0 ? (
                                    <p className="text-[11px] text-slate-500 italic">
                                        {"ไม่มีตัวแปรที่กำหนดไว้ในเทมเพลตนี้ (สามารถเพิ่มตัวแปรในช่อง Input Fields Builder ด้านข้าง)"}
                                    </p>
                                ) : (
                                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                        {currentInputFields.map(field => (
                                            <div key={field.name} className="flex flex-col text-xs">
                                                <label className="text-slate-600 font-semibold mb-0.5 flex justify-between items-center">
                                                    <span className="flex items-center gap-1">
                                                        <span>{field.label}</span>
                                                        {field.required && <span className="text-red-500 text-[10px] font-bold">*</span>}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-mono">&#123;&#123;{field.name}&#125;&#125;</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={testValues[field.name] || ""}
                                                    placeholder={field.placeholder || `กรอกค่าของ ${field.label}...`}
                                                    onChange={(e) => setTestValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                    className={INPUT_CLASS}
                                                />
                                                {field.helperText && (
                                                    <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                                                        {field.helperText}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tab Navigation for Preview Area */}
                            <div className="bg-slate-200/50 p-1 rounded-lg flex gap-1 mx-3 my-2 border border-slate-200/40 flex-shrink-0">
                                <button
                                    onClick={() => setPreviewTab("compiled")}
                                    className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                        previewTab === "compiled"
                                            ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                            : "text-slate-600 hover:bg-slate-200/40"
                                    }`}
                                >
                                    Compiled Prompt (พร้อมใช้)
                                </button>
                                <button
                                    onClick={() => setPreviewTab("template")}
                                    className={`flex-1 text-center py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
                                        previewTab === "template"
                                            ? "bg-white text-slate-800 shadow-sm border border-slate-200/10"
                                            : "text-slate-600 hover:bg-slate-200/40"
                                    }`}
                                >
                                    Template Structure (โครงสร้าง)
                                </button>
                            </div>

                            {/* Compile Preview Area */}
                            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                                <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-white flex-shrink-0">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                                            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                {previewTab === "compiled" ? "Compiled Result" : "Template Spec"}
                                            </h2>
                                        </div>
                                        <span className="text-[9px] text-slate-400 mt-0.5 leading-normal">
                                            {previewTab === "compiled" 
                                                ? "ข้อความคำสั่งที่แทนที่ค่าตัวแปรทดสอบแล้ว (พร้อมก๊อปปี้ไปป้อน AI)" 
                                                : "โครงสร้างโครงร่างพารามิเตอร์และตัวแปรแบบ Raw Spec"
                                            }
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {previewTab === "compiled" && selectedId && selectedId !== "new-template" && (
                                            <button
                                                onClick={() => setRightPanelTab("history")}
                                                className="flex items-center gap-1 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer shadow-sm"
                                            >
                                                <Sliders className="w-3 h-3 text-blue-500" />
                                                <span>บันทึกประวัติการทดสอบ</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={handleCopy}
                                            disabled={!activePreviewText}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer shadow-sm ${
                                                copied 
                                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                                                    : "bg-blue-600 hover:bg-blue-500 text-white border-transparent"
                                            }`}
                                        >
                                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            <span>
                                                {copied 
                                                    ? "คัดลอกสำเร็จ!" 
                                                    : previewTab === "compiled" 
                                                        ? "คัดลอก Prompt พร้อมใช้" 
                                                        : "คัดลอกโครงสร้างเทมเพลต"
                                                }
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Prompt rendering panel */}
                                <div className="flex-1 m-3 p-4 overflow-y-auto bg-white border border-slate-200/60 rounded-xl shadow-inner font-mono text-[11px] text-slate-800 select-text whitespace-pre-wrap leading-relaxed custom-scrollbar">
                                    {activePreviewText ? (
                                        activePreviewText
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center py-10 space-y-2.5 max-w-[280px] mx-auto h-full">
                                            <Eye className="w-8 h-8 text-slate-300" />
                                            <p className="text-slate-700 font-semibold text-xs">พรีวิว Compiled Prompt</p>
                                            <p className="text-slate-400 text-[10px] leading-relaxed">
                                                กรอกร่างคำสั่งหลักในหน้าต่างตรงกลาง และป้อนตัวแปรจำลองที่ช่องกรอกทดสอบ &quot;Test Input Area&quot; เพื่อเรนเดอร์ดูข้อความ Prompt สำเร็จรูปที่พร้อมใช้ป้อน AI ได้ที่นี่ครับ
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {rightPanelTab === "history" && (
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                            {!selectedId || selectedId === "new-template" ? (
                                <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-slate-400 italic leading-relaxed">
                                    กรุณาบันทึกเทมเพลตคำสั่งหลักนี้ก่อน เพื่อเปิดใช้ระบบประเมินคะแนนและเก็บบันทึกประวัติการทดสอบในระบบคลังคำสั่ง
                                </div>
                            ) : (
                                <>
                                    {/* Save Test Run form */}
                                    <div className="p-4 border-b border-slate-200 bg-white/40 flex flex-col flex-shrink-0 space-y-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">บันทึกผลการทดสอบ (Record Test Run)</span>
                                            <span className="text-[9px] text-slate-400 mt-0.5 leading-normal">
                                                ประเมินผลคำตอบของ AI ด้วยการให้คะแนนและบันทึกข้อเสนอแนะสำหรับการปรับปรุงเทมเพลตในรุ่นถัดไป
                                            </span>
                                        </div>
                                        
                                        {/* Summary */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">สรุปการทดสอบ (Summary)</label>
                                            <input
                                                type="text"
                                                value={logForm.summary}
                                                onChange={(e) => setLogForm(prev => ({ ...prev, summary: e.target.value }))}
                                                placeholder="เช่น Outline ดี แต่ claim ยังแรง..."
                                                className={INPUT_CLASS}
                                            />
                                        </div>

                                        {/* Run Status Selector */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">สถานะผลการรัน (Run Status)</label>
                                            <select
                                                value={logForm.runStatus}
                                                onChange={(e) => setLogForm(prev => ({ ...prev, runStatus: e.target.value }))}
                                                className={SELECT_CLASS}
                                            >
                                                <option className="text-slate-800" value="needs_revision">⚠️ Needs Revision (ต้องปรับปรุง)</option>
                                                <option className="text-slate-800" value="useful">✅ Useful (พร้อมใช้งาน)</option>
                                            </select>
                                        </div>

                                        {/* Rating Selector */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">ระดับคะแนน (Rating)</label>
                                            <select
                                                value={logForm.rating}
                                                onChange={(e) => setLogForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                                                className={SELECT_CLASS}
                                            >
                                                <option className="text-slate-800" value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                                                <option className="text-slate-800" value={4}>⭐⭐⭐⭐ (4/5)</option>
                                                <option className="text-slate-800" value={3}>⭐⭐⭐ (3/5)</option>
                                                <option className="text-slate-800" value={2}>⭐⭐ (2/5)</option>
                                                <option className="text-slate-800" value={1}>⭐ (1/5)</option>
                                            </select>
                                        </div>

                                        {/* Output Notes */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">บันทึกผลลัพธ์ (Output Notes)</label>
                                            <textarea
                                                rows={2}
                                                value={logForm.outputNotes}
                                                onChange={(e) => setLogForm(prev => ({ ...prev, outputNotes: e.target.value }))}
                                                placeholder="เช่น ตอบคำถามได้ดี, ภาษาค่อนข้างทางการเกินไปนิด..."
                                                className={TEXTAREA_CLASS}
                                            />
                                        </div>

                                        {/* Next Revision Notes */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">สิ่งที่ควรปรับปรุงในเวอร์ชันหน้า (Next Revision Notes)</label>
                                            <textarea
                                                rows={2}
                                                value={logForm.nextRevisionNotes}
                                                onChange={(e) => setLogForm(prev => ({ ...prev, nextRevisionNotes: e.target.value }))}
                                                placeholder="เช่น ปรับ tone ให้กระชับขึ้น หรือห้ามใช้ภาษาคำย่อ..."
                                                className={TEXTAREA_CLASS}
                                            />
                                        </div>

                                        {/* Save Button */}
                                        <button
                                            onClick={handleSaveRunLog}
                                            disabled={isSavingLog}
                                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                                        >
                                            {isSavingLog ? "กำลังบันทึก..." : "บันทึกผลการทดสอบ (Save Run Log)"}
                                        </button>
                                    </div>

                                    {/* History List */}
                                    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                                        <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
                                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ประวัติการทดสอบ ({runLogs.length})</h3>
                                        </div>

                                        {/* Filters Bar */}
                                        <div className="p-2 border-b border-slate-200 bg-white flex gap-2 flex-shrink-0 text-[10px]">
                                            <div className="flex-1 col-span-1">
                                                <select
                                                    value={logStatusFilter}
                                                    onChange={(e) => setLogStatusFilter(e.target.value)}
                                                    className={SELECT_CLASS + " !p-1"}
                                                >
                                                    <option className="text-slate-800" value="active">Active (ซ่อนจัดเก็บ)</option>
                                                    <option className="text-slate-800" value="useful">Useful (พร้อมใช้งาน)</option>
                                                    <option className="text-slate-800" value="needs_revision">Needs Revision (ต้องแก้ไข)</option>
                                                    <option className="text-slate-800" value="archived">Archived (จัดเก็บแล้ว)</option>
                                                    <option className="text-slate-800" value="all">สถานะทั้งหมด</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 col-span-1">
                                                <select
                                                    value={logRatingFilter}
                                                    onChange={(e) => setLogRatingFilter(e.target.value)}
                                                    className={SELECT_CLASS + " !p-1"}
                                                >
                                                    <option className="text-slate-800" value="all">คะแนนทั้งหมด</option>
                                                    <option className="text-slate-800" value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                                                    <option className="text-slate-800" value="4plus">⭐⭐⭐⭐+ (4+/5)</option>
                                                    <option className="text-slate-800" value="3minus">⭐⭐⭐ หรือน้อยกว่า</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                                            {isLoadingLogs ? (
                                                <div className="text-center text-slate-400 text-xs py-8">กำลังโหลดประวัติ...</div>
                                            ) : runLogs.length === 0 ? (
                                                <p className="text-slate-400 text-xs italic text-center py-8 px-4 leading-relaxed">
                                                    ยังไม่มีประวัติการบันทึกผลการรัน. เมื่อนำ Prompt ไปทดสอบกับ AI แล้ว สามารถระบุบันทึกผลการประเมินที่ฟอร์มด้านบนเพื่อเริ่มเก็บข้อมูลรอบแรกได้ครับ
                                                </p>
                                            ) : (
                                                runLogs.map(log => {
                                                    const isExpanded = expandedLogId === log.id;
                                                    const formattedDate = new Date(log.createdAt).toLocaleString("th-TH", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    });

                                                    return (
                                                        <div key={log.id} className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2.5 text-xs shadow-sm hover:border-slate-300 transition-all">
                                                            <div className="flex justify-between items-start gap-1">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="text-[10px] text-slate-400 font-mono">{formattedDate}</span>
                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${
                                                                        log.runStatus === "useful" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                                        log.runStatus === "archived" ? "bg-slate-100 text-slate-500 border-slate-200" :
                                                                        "bg-amber-50 text-amber-600 border-amber-200"
                                                                    }`}>
                                                                        {log.runStatus === "useful" ? "Useful" :
                                                                         log.runStatus === "archived" ? "Archived" : "Needs Revision"}
                                                                    </span>
                                                                </div>
                                                                <span className="text-amber-500 font-bold flex-shrink-0">
                                                                    {"⭐".repeat(log.rating)} ({log.rating}/5)
                                                                </span>
                                                            </div>

                                                            {log.summary && (
                                                                <h4 className="font-bold text-slate-800 border-l-2 border-blue-500 pl-2 py-0.5">
                                                                    {log.summary}
                                                                </h4>
                                                            )}

                                                            {log.outputNotes && (
                                                                <div>
                                                                    <span className="text-[10px] text-slate-500 block font-bold">ผลทดสอบ:</span>
                                                                    <p className="text-slate-700 leading-relaxed">{log.outputNotes}</p>
                                                                </div>
                                                            )}

                                                            {log.nextRevisionNotes && (
                                                                <div>
                                                                    <span className="text-[10px] text-slate-500 block font-bold">บันทึกปรับปรุงในรุ่นถัดไป:</span>
                                                                    <p className="text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-200/60 leading-relaxed">{log.nextRevisionNotes}</p>
                                                                </div>
                                                            )}

                                                            {/* Actions Row */}
                                                            <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2.5 mt-1">
                                                                <div className="flex gap-1.5">
                                                                    {log.nextRevisionNotes && (
                                                                        <button
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(log.nextRevisionNotes);
                                                                                alert("คัดลอกบันทึกปรับปรุงเรียบร้อย!");
                                                                            }}
                                                                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm"
                                                                        >
                                                                            คัดลอก Notes
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            setLogVersionFormOpenId(logVersionFormOpenId === log.id ? null : log.id);
                                                                            if (!logVersionInputs[log.id]) {
                                                                                setLogVersionInputs(prev => ({
                                                                                    ...prev,
                                                                                    [log.id]: { version: "", notes: log.nextRevisionNotes || "" }
                                                                                }));
                                                                            }
                                                                        }}
                                                                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm"
                                                                    >
                                                                        {logVersionFormOpenId === log.id ? "ยกเลิก" : "บันทึกเป็นเวอร์ชัน"}
                                                                    </button>
                                                                </div>
                                                                
                                                                {log.runStatus !== "archived" && (
                                                                    <button
                                                                        onClick={() => handleArchiveRunLog(log.id)}
                                                                        className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm"
                                                                    >
                                                                        Archive
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Collapsible snapshot */}
                                                            <div className="border-t border-slate-200 pt-2.5 mt-1">
                                                                <button
                                                                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                                    className="w-full text-left text-[10px] text-slate-400 hover:text-slate-700 font-semibold flex justify-between items-center cursor-pointer"
                                                                >
                                                                    <span>{isExpanded ? "ซ่อนรายละเอียด Prompt Snapshot" : "ดูรายละเอียด Prompt Snapshot"}</span>
                                                                    <span>{isExpanded ? "▲" : "▼"}</span>
                                                                </button>

                                                                {isExpanded && (
                                                                    <div className="mt-2 space-y-2 animate-fadeIn">
                                                                        {/* Variables */}
                                                                        {log.inputSnapshot && log.inputSnapshot.length > 0 && (
                                                                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                                                                <span className="text-[9px] text-slate-500 font-bold block mb-1">ตัวแปรอินพุต:</span>
                                                                                <div className="space-y-1 text-[9px] font-mono">
                                                                                    {log.inputSnapshot.map((varItem: PromptInputField) => (
                                                                                        <div key={varItem.name} className="truncate">
                                                                                            <span className="text-slate-500">{varItem.label || varItem.name}:</span> <span className="text-slate-800">{varItem.value}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Prompt */}
                                                                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[9px] text-slate-600 whitespace-pre-wrap select-text leading-normal max-h-40 overflow-y-auto custom-scrollbar shadow-inner">
                                                                            {log.compiledPromptSnapshot}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {rightPanelTab === "versions" && (
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                            {!selectedId || selectedId === "new-template" ? (
                                <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-slate-400 italic leading-relaxed">
                                    กรุณาบันทึกเทมเพลตนี้ก่อน เพื่อเริ่มต้นจัดเก็บและจัดการประวัติรุ่น (Versions) ของคำสั่งนี้
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                                    {/* Save Current as Version Form */}
                                    <div className="p-4 border-b border-slate-200 bg-white/40 space-y-3 flex-shrink-0">
                                        <div className="flex flex-col gap-0.5 mb-1">
                                            <div className="flex items-center gap-2">
                                                <Save className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">บันทึกเวอร์ชันใหม่จากหน้าแก้ไข</span>
                                            </div>
                                            <span className="text-[9px] text-slate-400 leading-normal">
                                                ล็อกบันทึกสถานะของ Prompt ฉบับปัจจุบันนี้เก็บเป็นประวัติรุ่น (เช่น v1.0.0) เพื่อให้มั่นใจว่าสามารถคืนค่า (Restore) ย้อนกลับมาใช้ได้เสมอ
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-1">
                                                <input
                                                    type="text"
                                                    value={newVersionForm.version}
                                                    onChange={(e) => setNewVersionForm(prev => ({ ...prev, version: e.target.value }))}
                                                    placeholder="เช่น 1.0.0"
                                                    className={INPUT_CLASS + " font-mono"}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="text"
                                                    value={newVersionForm.revisionNotes}
                                                    onChange={(e) => setNewVersionForm(prev => ({ ...prev, revisionNotes: e.target.value }))}
                                                    placeholder="บันทึกการแก้ไขในรุ่นนี้..."
                                                    className={INPUT_CLASS}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                handleCreateVersion(newVersionForm.version, newVersionForm.revisionNotes);
                                                setNewVersionForm({ version: "", revisionNotes: "" });
                                            }}
                                            disabled={isSavingVersion}
                                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                                        >
                                            {isSavingVersion ? "กำลังบันทึก..." : "บันทึกเวอร์ชัน (Save Version)"}
                                        </button>
                                    </div>

                                    {/* Versions List */}
                                    <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
                                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ประวัติเวอร์ชัน ({versions.length})</h3>
                                    </div>

                                    <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                                        {isLoadingVersions ? (
                                            <div className="text-center text-slate-400 text-xs py-8">กำลังโหลดรายการเวอร์ชัน...</div>
                                        ) : versions.length === 0 ? (
                                            <p className="text-slate-400 text-xs italic text-center py-8 px-4 leading-relaxed">
                                                ยังไม่มีการบันทึกรุ่นเวอร์ชันสำหรับเทมเพลตนี้. สามารถระบุเลขรุ่น (เช่น 1.0.0) และระบุบันทึกการแก้ไขที่ฟอร์มด้านบนเพื่อเริ่มบันทึกเวอร์ชันแรกได้เลยครับ
                                            </p>
                                        ) : (
                                            versions.map(v => {
                                                const formattedDate = new Date(v.created_at).toLocaleString("th-TH", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                });

                                                return (
                                                    <div key={v.id} className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2.5 text-xs shadow-sm hover:border-slate-300 transition-all">
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-slate-800 font-mono text-xs">v{v.version}</span>
                                                                {v.is_active === 1 && (
                                                                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                                                        Active
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-mono">{formattedDate}</span>
                                                        </div>

                                                        {v.revision_notes && (
                                                            <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 leading-relaxed">
                                                                {v.revision_notes}
                                                            </p>
                                                        )}

                                                        {v.created_from_run_log_id && (
                                                            <div className="text-[9px] text-slate-400 flex items-center gap-1 font-semibold">
                                                                <span>⚡ สร้างเชื่อมโยงจากประวัติการรัน</span>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2.5 mt-1">
                                                            <div className="flex gap-1.5">
                                                                {v.is_active !== 1 && (
                                                                    <button
                                                                        onClick={() => handleMarkVersionActive(v.id)}
                                                                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm"
                                                                    >
                                                                        เปิดใช้งาน (Active)
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleRestoreVersion(v)}
                                                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-semibold transition cursor-pointer shadow-sm"
                                                                >
                                                                    คืนค่านี้ (Restore)
                                                                </button>
                                                            </div>

                                                            <button
                                                                onClick={() => handleDeleteVersion(v.id)}
                                                                className="px-2.5 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                                                                disabled={v.is_active === 1}
                                                                title={v.is_active === 1 ? "ไม่สามารถลบเวอร์ชันที่ใช้งานอยู่ได้" : "ลบเวอร์ชัน"}
                                                            >
                                                                ลบ
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                )}
            </div>
        </div>
    );
}
