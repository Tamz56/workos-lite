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
    ChevronUp
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

const CATEGORIES = ["Writing", "Review", "Marketing", "Coding", "General"];
const STATUSES = ["draft", "testing", "active", "archived"];

// Consistent styling for dark inputs with high contrast caret and text
const INPUT_CLASS = "w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-slate-100 caret-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 selection:bg-emerald-400/30 selection:text-white transition-all text-xs";
const TEXTAREA_CLASS = "w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-slate-100 caret-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 selection:bg-emerald-400/30 selection:text-white transition-all text-xs font-mono";
const SELECT_CLASS = "w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-slate-100 caret-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 selection:bg-emerald-400/30 selection:text-white transition-all text-xs";

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
    const [rightPanelTab, setRightPanelTab] = useState<"playground" | "history">("playground");
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    // Filters for Run History
    const [logStatusFilter, setLogStatusFilter] = useState<string>("active");
    const [logRatingFilter, setLogRatingFilter] = useState<string>("all");

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

    useEffect(() => {
        setLogForm({
            rating: 5,
            outputNotes: "",
            nextRevisionNotes: "",
            summary: "",
            runStatus: "needs_revision"
        });
        setExpandedLogId(null);
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
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
            {/* Header Alert area for API Errors */}
            {apiError && (
                <div className="bg-red-950/60 border-b border-red-800 text-red-200 px-4 py-3 flex items-center justify-between text-sm animate-fadeIn flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
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
                {/* 1. Left Column: Prompt Library */}
                <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50 flex-shrink-0">
                    {/* Filters & Actions */}
                    <div className="p-4 border-b border-zinc-800 space-y-3 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4" /> Prompt Library
                            </h2>
                            <button
                                onClick={handleCreateNew}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-md font-semibold transition-all shadow-md cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" /> สร้างใหม่
                            </button>
                        </div>

                        {/* Search input */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ, สรรพคุณ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 text-xs rounded-md text-slate-100 caret-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 selection:bg-emerald-400/30 selection:text-white transition-all"
                            />
                        </div>

                        {/* Category filter */}
                        <div className="flex gap-2">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className={SELECT_CLASS}
                            >
                                <option className="bg-zinc-900 text-slate-100" value="All">หมวดหมู่ทั้งหมด</option>
                                {CATEGORIES.map(cat => (
                                    <option className="bg-zinc-900 text-slate-100" key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            {/* Status filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={SELECT_CLASS}
                            >
                                <option className="bg-zinc-900 text-slate-100" value="All">สถานะทั้งหมด</option>
                                <option className="bg-zinc-900 text-slate-100" value="active">Active</option>
                                <option className="bg-zinc-900 text-slate-100" value="draft">Draft</option>
                                <option className="bg-zinc-900 text-slate-100" value="testing">Testing</option>
                                <option className="bg-zinc-900 text-slate-100" value="archived">Archived</option>
                            </select>
                        </div>
                    </div>

                    {/* Template List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40">
                        {isLoading ? (
                            <div className="p-8 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
                                <span>กำลังโหลดข้อมูล...</span>
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500 text-xs">
                                ไม่พบเทมเพลตที่ตรงกับเงื่อนไข
                            </div>
                        ) : (
                            filteredTemplates.map(t => {
                                const isActive = t.id === selectedId;
                                
                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => setSelectedId(t.id)}
                                        className={`p-3 text-left cursor-pointer transition-all ${
                                            isActive 
                                                ? "bg-zinc-800 text-white border-l-2 border-indigo-500" 
                                                : "hover:bg-zinc-800/40 text-zinc-300"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-1.5">
                                            <h3 className="font-semibold text-xs truncate max-w-[180px]">{t.name}</h3>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                                                t.status === "active" ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800" :
                                                t.status === "testing" ? "bg-amber-950/80 text-amber-300 border border-amber-800" :
                                                t.status === "archived" ? "bg-zinc-900 text-zinc-500 border border-zinc-800" :
                                                "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                            }`}>
                                                {t.status}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 line-clamp-1 mt-1">{t.purpose || "ไม่มีคำอธิบาย"}</p>
                                        
                                        <div className="flex justify-between items-center mt-2 text-[9px] text-zinc-600">
                                            <span>{t.category}</span>
                                            <span>v{t.version}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 2. Center Column: Prompt Editor */}
                <div className="flex-1 border-r border-zinc-800 flex flex-col bg-zinc-950 overflow-hidden">
                    {/* Editor Toolbar */}
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Edit className="w-4 h-4 text-indigo-400" />
                            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                                {selectedId === "new-template" ? "สร้างเทมเพลตใหม่" : "แก้ไข Prompt Template"}
                            </h2>
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedId && selectedId !== "new-template" && (
                                <button
                                    onClick={handleArchive}
                                    disabled={isSaving || editorFields.status === "archived"}
                                    title="ย้ายไปยัง Archived"
                                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/50 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <Archive className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-zinc-800 text-white text-xs font-semibold rounded-md transition cursor-pointer"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{isSaving ? "กำลังบันทึก..." : "บันทึก"}</span>
                            </button>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs">
                        {/* Meta Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-zinc-400 font-bold mb-1">ชื่อ Prompt *</label>
                                <input
                                    type="text"
                                    value={editorFields.name || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="เช่น Green Fineness Content Writer"
                                    className={INPUT_CLASS}
                                />
                            </div>

                            <div>
                                <label className="block text-zinc-400 font-bold mb-1">หมวดหมู่ *</label>
                                <select
                                    value={editorFields.category || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, category: e.target.value }))}
                                    className={SELECT_CLASS}
                                >
                                    {CATEGORIES.map(cat => (
                                        <option className="bg-zinc-900 text-slate-100" key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-zinc-400 font-bold mb-1">สถานะ</label>
                                <select
                                    value={editorFields.status || "draft"}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, status: e.target.value as PromptTemplate["status"] }))}
                                    className={SELECT_CLASS}
                                >
                                    {STATUSES.map(st => (
                                        <option className="bg-zinc-900 text-slate-100" key={st} value={st}>{st}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Version & Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-zinc-400 font-bold mb-1">เวอร์ชัน</label>
                                <input
                                    type="text"
                                    value={editorFields.version || "1.0.0"}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, version: e.target.value }))}
                                    placeholder="1.0.0"
                                    className={INPUT_CLASS + " font-mono"}
                                />
                            </div>

                            <div>
                                <label className="block text-zinc-400 font-bold mb-1">บันทึกเวอร์ชัน (Version Notes)</label>
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
                            <label className="block text-zinc-400 font-bold mb-1">วัตถุประสงค์ (Purpose)</label>
                            <input
                                type="text"
                                value={editorFields.purpose || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, purpose: e.target.value }))}
                                placeholder="จุดประสงค์หลักในการรัน Prompt นี้"
                                className={INPUT_CLASS}
                            />
                        </div>

                        {/* Input Fields Section (HUMAN-FRIENDLY BUILDER + COLLAPSIBLE JSON) */}
                        <div className="border border-zinc-800 rounded-lg bg-zinc-900/10 overflow-hidden">
                            {/* Builder Header */}
                            <div className="bg-zinc-900/30 p-3 border-b border-zinc-800 flex justify-between items-center">
                                <span className="font-bold text-zinc-300 flex items-center gap-1.5 font-sans text-xs">
                                    <Sliders className="w-4 h-4 text-indigo-400" />
                                    <span>Input Fields Builder</span>
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                    {currentInputFields.length} ฟิลด์ตัวแปร
                                </span>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* List of Configured Fields */}
                                {currentInputFields.length === 0 ? (
                                    <p className="text-zinc-500 text-xs italic text-center py-4 bg-zinc-900/20 rounded-md border border-dashed border-zinc-800">
                                        ยังไม่มีตัวแปรอินพุตใด ๆ กดสร้างที่แผงควบคุมด้านล่างเพื่อผูกตัวแปร
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {currentInputFields.map((field, idx) => (
                                            <div 
                                                key={field.name + "-" + idx}
                                                className={`flex items-center justify-between p-3 rounded-lg border text-xs bg-zinc-900/40 hover:bg-zinc-900/60 transition ${
                                                    editingFieldIndex === idx ? "border-emerald-500" : "border-zinc-800"
                                                }`}
                                            >
                                                <div className="space-y-0.5 max-w-[70%]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-zinc-200">{field.label}</span>
                                                        <span className="font-mono text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                                                            &#123;&#123;{field.name}&#125;&#125;
                                                        </span>
                                                        {field.required && (
                                                            <span className="text-[9px] text-red-400 bg-red-950/40 px-1 py-0.2 rounded font-semibold border border-red-900/50">
                                                                Required
                                                            </span>
                                                        )}
                                                    </div>
                                                    {field.value && (
                                                        <p className="text-[10px] text-zinc-400 truncate">
                                                            <span className="text-zinc-600">Default:</span> {field.value}
                                                        </p>
                                                    )}
                                                    {field.placeholder && (
                                                        <p className="text-[10px] text-zinc-500 truncate">
                                                            <span className="text-zinc-600">Placeholder:</span> {field.placeholder}
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
                                                        className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:hover:text-zinc-500 rounded hover:bg-zinc-800 transition cursor-pointer"
                                                    >
                                                        <ArrowUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Move Down */}
                                                    <button
                                                        onClick={() => handleMoveField(idx, "down")}
                                                        disabled={idx === currentInputFields.length - 1}
                                                        title="เลื่อนลง"
                                                        className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:hover:text-zinc-500 rounded hover:bg-zinc-800 transition cursor-pointer"
                                                    >
                                                        <ArrowDown className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Edit */}
                                                    <button
                                                        onClick={() => handleEditField(idx)}
                                                        title="แก้ไขตัวแปร"
                                                        className="p-1 text-zinc-400 hover:text-indigo-400 rounded hover:bg-zinc-800 transition cursor-pointer ml-1"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDeleteField(idx)}
                                                        title="ลบตัวแปร"
                                                        className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-800 transition cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Field Editor Form */}
                                <div className="border border-zinc-800 rounded-lg p-3.5 bg-zinc-950/40 space-y-3 animate-fadeIn">
                                    <span className="font-semibold text-zinc-300 text-xs block border-b border-zinc-850 pb-1.5">
                                        {editingFieldIndex !== null ? "แก้ไขข้อมูลฟิลด์ตัวแปร" : "เพิ่มตัวแปรนำเข้าใหม่"}
                                    </span>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Field Name */}
                                        <div>
                                            <label className="block text-zinc-400 font-bold mb-1">
                                                Field Name (ตัวคีย์ในโค้ด) *
                                            </label>
                                            <input
                                                type="text"
                                                value={fieldForm.name || ""}
                                                onChange={(e) => handleFieldFormChange("name", e.target.value)}
                                                placeholder="เช่น target_audience"
                                                className={`w-full bg-zinc-900 border rounded p-2 text-slate-100 caret-emerald-300 placeholder-slate-500 focus:outline-none focus:ring-2 selection:bg-emerald-400/30 selection:text-white transition-all text-xs font-mono ${
                                                    fieldValidationError 
                                                        ? "border-red-800 focus:border-red-700 focus:ring-red-500/20" 
                                                        : "border-zinc-800 focus:border-emerald-400 focus:ring-emerald-400/30"
                                                }`}
                                            />
                                            {fieldValidationError && (
                                                <p className="text-red-400 text-[9px] mt-1 font-mono flex items-center gap-1">
                                                    <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />
                                                    {fieldValidationError}
                                                </p>
                                            )}
                                        </div>

                                        {/* Label */}
                                        <div>
                                            <label className="block text-zinc-400 font-bold mb-1">
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
                                            <label className="block text-zinc-400 font-bold mb-1">ค่าเริ่มต้น (Default)</label>
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
                                            <label className="block text-zinc-400 font-bold mb-1">คำแนะนำไกด์ (Placeholder)</label>
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
                                            <label className="block text-zinc-400 font-bold mb-1">ข้อความอธิบายเพิ่ม (Helper)</label>
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
                                            className="w-3.5 h-3.5 accent-emerald-500 rounded bg-zinc-900 border-zinc-800 focus:ring-emerald-400/30"
                                        />
                                        <label htmlFor="field-form-required" className="text-zinc-400 text-xs font-semibold cursor-pointer">
                                            กำหนดเป็นฟิลด์จำเป็นที่ผู้ใช้ต้องกรอก (Required Field)
                                        </label>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-2 pt-1 border-t border-zinc-900">
                                        {editingFieldIndex !== null && (
                                            <button
                                                onClick={handleCancelEdit}
                                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-semibold text-xs transition cursor-pointer"
                                            >
                                                ยกเลิก
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSubmitField}
                                            disabled={!!fieldValidationError || !fieldForm.name}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded font-bold text-xs transition cursor-pointer"
                                        >
                                            {editingFieldIndex !== null ? "บันทึกการแก้ไข" : "เพิ่มตัวแปร"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* COLLAPSIBLE RAW JSON (Advanced Mode) */}
                            <div className="border-t border-zinc-800">
                                <button
                                    onClick={() => setShowAdvancedJson(!showAdvancedJson)}
                                    className="w-full p-3 bg-zinc-900/20 hover:bg-zinc-900/40 transition flex justify-between items-center text-xs font-semibold text-zinc-400"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Code className="w-3.5 h-3.5 text-zinc-500" />
                                        <span>Advanced JSON Editor (สำหรับผู้พัฒนา)</span>
                                    </span>
                                    {showAdvancedJson ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                                </button>

                                {showAdvancedJson && (
                                    <div className="p-4 bg-zinc-950/60 border-t border-zinc-800 space-y-2 animate-slideDown">
                                        <textarea
                                            rows={4}
                                            value={editorFields.input_fields || "[]"}
                                            onChange={(e) => handleJsonChange(e.target.value)}
                                            className={`w-full bg-zinc-900 border rounded p-2 text-slate-100 caret-emerald-300 placeholder-slate-500 focus:outline-none focus:ring-2 selection:bg-emerald-400/30 selection:text-white transition-all text-xs font-mono ${
                                                jsonValidationError 
                                                    ? "border-red-800 focus:border-red-700 focus:ring-red-500/20" 
                                                    : "border-zinc-800 focus:border-emerald-400 focus:ring-emerald-400/30"
                                            }`}
                                        />
                                        {jsonValidationError ? (
                                            <p className="text-red-400 text-[10px] flex items-center gap-1 font-mono">
                                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                                {jsonValidationError}
                                            </p>
                                        ) : (
                                            <p className="text-zinc-500 text-[9px]">
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
                                <label className="block text-zinc-400 font-bold mb-1">บทบาท (Role / Persona)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.role || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, role: e.target.value }))}
                                    placeholder="เช่น คุณคือบรรณาธิการตรวจทานบทความวิชาการสมุนไพร..."
                                    className={TEXTAREA_CLASS}
                                />
                            </div>

                            <div>
                                <label className="block text-zinc-400 font-bold mb-1">บริบท (Context)</label>
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
                            <label className="block text-zinc-400 font-bold mb-1">ขั้นตอนดำเนินงาน (Instructions)</label>
                            <textarea
                                rows={5}
                                value={editorFields.instructions || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, instructions: e.target.value }))}
                                placeholder="ขั้นตอนการทำงาน 1, 2, 3 ทีละสเตป..."
                                className={TEXTAREA_CLASS}
                            />
                        </div>

                        <div>
                            <label className="block text-zinc-400 font-bold mb-1">ข้อจำกัด / กฎเกณฑ์ (Constraints)</label>
                            <textarea
                                rows={3}
                                value={editorFields.constraints || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, constraints: e.target.value }))}
                                placeholder="สิ่งที่ห้ามทำเด็ดขาด เช่น ห้ามใช้สารเคมี, ห้ามใช้สัญลักษณ์นี้..."
                                className={TEXTAREA_CLASS}
                            />
                        </div>

                        {/* Green Fineness Guardrails Preset Selection Panel */}
                        <div className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/20">
                            <label className="block text-zinc-300 font-bold mb-1 text-xs uppercase tracking-wider">Green Fineness Guardrails (แนวทางความปลอดภัยของแบรนด์)</label>
                            <span className="text-[10px] text-zinc-500 block mb-3">
                                ติ๊กเลือกแนวทางควบคุมโทนเสียง คำเตือนความปลอดภัยทางวิชาการ (Scientific Claims) และข้อจำกัดทางกฎหมายเพื่อสอดแทรกเข้าไปใน Prompt อัตโนมัติ
                            </span>
                            
                            {guardrailPresets.length === 0 ? (
                                <p className="text-zinc-500 text-[10px] italic">กำลังโหลดข้อมูล Presets หรือไม่พบข้อมูลในระบบ...</p>
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
                                                        ? "bg-indigo-950/30 border-indigo-700 hover:bg-indigo-950/40 text-slate-100 ring-1 ring-indigo-700/50"
                                                        : "bg-zinc-950/30 border-zinc-850 hover:bg-zinc-900/30 text-slate-300"
                                                }`}
                                            >
                                                <div className="space-y-1.5">
                                                    <div className="flex items-start gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={isApplied}
                                                            onChange={() => {}} // handled by onClick on container
                                                            className="mt-0.5 accent-indigo-500 cursor-pointer w-3.5 h-3.5 flex-shrink-0"
                                                        />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-[11px] text-zinc-200 truncate">{preset.name}</span>
                                                                <span className={`text-[8px] px-1 py-0.2 rounded font-semibold border uppercase tracking-wider ${
                                                                    preset.category === "tone" ? "bg-cyan-950/80 text-cyan-300 border-cyan-800" :
                                                                    preset.category === "claims" ? "bg-amber-950/80 text-amber-300 border-amber-800" :
                                                                    preset.category === "sales" ? "bg-purple-950/80 text-purple-300 border-purple-800" :
                                                                    preset.category === "review" ? "bg-emerald-950/80 text-emerald-300 border-emerald-800" :
                                                                    "bg-zinc-900 text-zinc-400 border-zinc-700"
                                                                }`}>
                                                                    {preset.category}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-zinc-400 block mt-1 leading-normal">{preset.description}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {parsedRiskWords.length > 0 && (
                                                    <div className="mt-2.5 pt-2 border-t border-zinc-800/60 text-[9px] text-zinc-500 leading-normal">
                                                        <span className="text-amber-400/70 font-semibold block mb-0.5">Risk Word Bank & Alternatives:</span>
                                                        <ul className="space-y-0.5 pl-1.5 list-disc list-inside">
                                                            {parsedRiskWords.map((rw, index) => (
                                                                <li key={index} className="truncate">
                                                                    <strong className="text-red-400/80 font-mono">&quot;{rw.word}&quot;</strong> ➔ <span className="text-zinc-400">{rw.suggestedAlternatives.join(", ")}</span>
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
                                <label className="block text-zinc-400 font-bold mb-1">รูปแบบผลลัพธ์ (Output Format)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.output_format || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, output_format: e.target.value }))}
                                    placeholder="จัดรูปแบบคำตอบ เช่น แสดงเป็น Markdown Table หรือ JSON..."
                                    className={TEXTAREA_CLASS}
                                />
                            </div>

                            <div>
                                <label className="block text-zinc-400 font-bold mb-1">รายการเช็คตรวจสอบก่อนส่ง (Review Checklist)</label>
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
                            <label className="block text-zinc-400 font-bold mb-1">บันทึกเพิ่มเติม (Notes)</label>
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

                {/* 3. Right Column: Preview & Test Input Area */}
                <div className="w-[420px] flex flex-col bg-zinc-900/30 overflow-hidden flex-shrink-0">
                    {/* Main Tab selector for Playground vs History */}
                    <div className="flex border-b border-zinc-800 bg-zinc-900/40 p-2 gap-1 flex-shrink-0">
                        <button
                            onClick={() => setRightPanelTab("playground")}
                            className={`flex-1 text-center py-1.5 rounded text-[11px] font-bold transition ${
                                rightPanelTab === "playground"
                                    ? "bg-indigo-600/30 border border-indigo-700 text-indigo-200"
                                    : "text-zinc-400 hover:bg-zinc-800/40"
                            }`}
                        >
                            Playground & Test
                        </button>
                        <button
                            onClick={() => setRightPanelTab("history")}
                            className={`flex-1 text-center py-1.5 rounded text-[11px] font-bold transition ${
                                rightPanelTab === "history"
                                    ? "bg-indigo-600/30 border border-indigo-700 text-indigo-200"
                                    : "text-zinc-400 hover:bg-zinc-800/40"
                            }`}
                        >
                            Test History / Run Log
                        </button>
                    </div>

                    {rightPanelTab === "playground" ? (
                        <>
                            {/* Test Variables Area */}
                            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex flex-col flex-shrink-0">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sliders className="w-4 h-4 text-indigo-400" />
                                    <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Test Input Area</h2>
                                </div>
                                
                                {currentInputFields.length === 0 ? (
                                    <p className="text-[11px] text-zinc-500 italic">
                                        {"ไม่มีตัวแปรที่กำหนดไว้ในเทมเพลตนี้ (สามารถเพิ่มตัวแปรในช่อง Input Fields Builder ด้านข้าง)"}
                                    </p>
                                ) : (
                                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                        {currentInputFields.map(field => (
                                            <div key={field.name} className="flex flex-col text-xs">
                                                <label className="text-zinc-400 font-semibold mb-0.5 flex justify-between items-center">
                                                    <span className="flex items-center gap-1">
                                                        <span>{field.label}</span>
                                                        {field.required && <span className="text-red-400 text-[10px] font-bold">*</span>}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-600 font-mono">&#123;&#123;{field.name}&#125;&#125;</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={testValues[field.name] || ""}
                                                    placeholder={field.placeholder || `กรอกค่าของ ${field.label}...`}
                                                    onChange={(e) => setTestValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                    className={INPUT_CLASS}
                                                />
                                                {field.helperText && (
                                                    <span className="text-[9px] text-zinc-500 mt-0.5 font-medium">
                                                        {field.helperText}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tab Navigation for Preview Area */}
                            <div className="flex border-b border-zinc-800 bg-zinc-900/40 p-2 gap-1 flex-shrink-0">
                                <button
                                    onClick={() => setPreviewTab("compiled")}
                                    className={`flex-1 text-center py-1.5 rounded text-[11px] font-bold transition ${
                                        previewTab === "compiled"
                                            ? "bg-indigo-600/30 border border-indigo-700 text-indigo-200"
                                            : "text-zinc-400 hover:bg-zinc-800/40"
                                    }`}
                                >
                                    Compiled Prompt (พร้อมใช้)
                                </button>
                                <button
                                    onClick={() => setPreviewTab("template")}
                                    className={`flex-1 text-center py-1.5 rounded text-[11px] font-bold transition ${
                                        previewTab === "template"
                                            ? "bg-indigo-600/30 border border-indigo-700 text-indigo-200"
                                            : "text-zinc-400 hover:bg-zinc-800/40"
                                    }`}
                                >
                                    Template Structure (โครงสร้าง)
                                </button>
                            </div>

                            {/* Compile Preview Area */}
                            <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
                                <div className="p-3 border-b border-zinc-850 flex justify-between items-center bg-zinc-900/10 flex-shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                                        <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                            {previewTab === "compiled" ? "Compiled Result" : "Template Spec"}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {previewTab === "compiled" && selectedId && selectedId !== "new-template" && (
                                            <button
                                                onClick={() => setRightPanelTab("history")}
                                                className="flex items-center gap-1 bg-zinc-850 hover:bg-zinc-800 active:bg-zinc-900 text-zinc-300 border border-zinc-800 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                                            >
                                                <Sliders className="w-3 h-3 text-indigo-400" />
                                                <span>บันทึกประวัติการทดสอบ</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={handleCopy}
                                            disabled={!activePreviewText}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                                copied 
                                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                                                    : "bg-zinc-850 hover:bg-zinc-800 active:bg-zinc-900 text-zinc-300 border border-zinc-800"
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
                                <div className="flex-1 p-4 overflow-y-auto bg-zinc-950 font-mono text-[11px] text-zinc-300 select-text whitespace-pre-wrap leading-relaxed custom-scrollbar">
                                    {activePreviewText ? (
                                        activePreviewText
                                    ) : (
                                        <p className="text-zinc-600 italic">กรอกบทบาท ขั้นตอนการทำงาน หรือหัวข้อบทความ เพื่อเริ่มสร้าง Prompt...</p>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Run History and Save Log Section */}
                            {!selectedId || selectedId === "new-template" ? (
                                <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-zinc-500 italic">
                                    กรุณาบันทึกเทมเพลตนี้ก่อนเพื่อเริ่มเก็บประวัติการทดสอบ
                                </div>
                            ) : (
                                <>
                                    {/* Save Test Run form */}
                                    <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex flex-col flex-shrink-0 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-zinc-300 text-xs uppercase tracking-wider">บันทึกผลการทดสอบ (Record Test Run)</span>
                                        </div>
                                        
                                        {/* Summary */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-zinc-400 font-semibold mb-1">สรุปการทดสอบ (Summary)</label>
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
                                            <label className="text-zinc-400 font-semibold mb-1">สถานะผลการรัน (Run Status)</label>
                                            <select
                                                value={logForm.runStatus}
                                                onChange={(e) => setLogForm(prev => ({ ...prev, runStatus: e.target.value }))}
                                                className={SELECT_CLASS}
                                            >
                                                <option className="bg-zinc-900 text-slate-100" value="needs_revision">⚠️ Needs Revision (ต้องปรับปรุง)</option>
                                                <option className="bg-zinc-900 text-slate-100" value="useful">✅ Useful (พร้อมใช้งาน)</option>
                                            </select>
                                        </div>

                                        {/* Rating Selector */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-zinc-400 font-semibold mb-1">ระดับคะแนน (Rating)</label>
                                            <select
                                                value={logForm.rating}
                                                onChange={(e) => setLogForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                                                className={SELECT_CLASS}
                                            >
                                                <option className="bg-zinc-900 text-slate-100" value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                                                <option className="bg-zinc-900 text-slate-100" value={4}>⭐⭐⭐⭐ (4/5)</option>
                                                <option className="bg-zinc-900 text-slate-100" value={3}>⭐⭐⭐ (3/5)</option>
                                                <option className="bg-zinc-900 text-slate-100" value={2}>⭐⭐ (2/5)</option>
                                                <option className="bg-zinc-900 text-slate-100" value={1}>⭐ (1/5)</option>
                                            </select>
                                        </div>

                                        {/* Output Notes */}
                                        <div className="flex flex-col text-xs">
                                            <label className="text-zinc-400 font-semibold mb-1">บันทึกผลลัพธ์ (Output Notes)</label>
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
                                            <label className="text-zinc-400 font-semibold mb-1">สิ่งที่ควรปรับปรุงในเวอร์ชันหน้า (Next Revision Notes)</label>
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
                                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded text-xs font-bold transition cursor-pointer"
                                        >
                                            {isSavingLog ? "กำลังบันทึก..." : "บันทึกผลการทดสอบ (Save Run Log)"}
                                        </button>
                                    </div>

                                    {/* History List */}
                                    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
                                        <div className="p-3 border-b border-zinc-850 bg-zinc-900/10 flex items-center justify-between flex-shrink-0">
                                            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">ประวัติการทดสอบ ({runLogs.length})</h3>
                                        </div>

                                        {/* Filters Bar */}
                                        <div className="p-2 border-b border-zinc-850 bg-zinc-900/20 flex gap-2 flex-shrink-0 text-[10px]">
                                            <div className="flex-1 col-span-1">
                                                <select
                                                    value={logStatusFilter}
                                                    onChange={(e) => setLogStatusFilter(e.target.value)}
                                                    className={SELECT_CLASS + " !p-1"}
                                                >
                                                    <option className="bg-zinc-900 text-slate-100" value="active">Active (ซ่อนจัดเก็บ)</option>
                                                    <option className="bg-zinc-900 text-slate-100" value="useful">Useful (พร้อมใช้งาน)</option>
                                                    <option className="bg-zinc-900 text-slate-100" value="needs_revision">Needs Revision (ต้องแก้ไข)</option>
                                                    <option className="bg-zinc-900 text-slate-100" value="archived">Archived (จัดเก็บแล้ว)</option>
                                                    <option className="bg-zinc-900 text-slate-100" value="all">สถานะทั้งหมด</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 col-span-1">
                                                <select
                                                    value={logRatingFilter}
                                                    onChange={(e) => setLogRatingFilter(e.target.value)}
                                                    className={SELECT_CLASS + " !p-1"}
                                                >
                                                    <option className="bg-zinc-900 text-slate-100" value="all">คะแนนทั้งหมด</option>
                                                    <option className="bg-zinc-900 text-slate-100" value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                                                    <option className="bg-zinc-900 text-slate-100" value="4plus">⭐⭐⭐⭐+ (4+/5)</option>
                                                    <option className="bg-zinc-900 text-slate-100" value="3minus">⭐⭐⭐ หรือน้อยกว่า</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                                            {isLoadingLogs ? (
                                                <div className="text-center text-zinc-500 text-xs py-8">กำลังโหลดประวัติ...</div>
                                            ) : runLogs.length === 0 ? (
                                                <p className="text-zinc-500 text-xs italic text-center py-8">ยังไม่มีประวัติการทดสอบสำหรับเทมเพลตนี้</p>
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
                                                        <div key={log.id} className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/20 space-y-2 text-xs">
                                                            <div className="flex justify-between items-start gap-1">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="text-[10px] text-zinc-500 font-mono">{formattedDate}</span>
                                                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
                                                                        log.runStatus === "useful" ? "bg-emerald-950/80 text-emerald-300 border-emerald-800" :
                                                                        log.runStatus === "archived" ? "bg-zinc-900 text-zinc-500 border-zinc-800" :
                                                                        "bg-amber-950/80 text-amber-300 border-amber-800"
                                                                    }`}>
                                                                        {log.runStatus === "useful" ? "Useful" :
                                                                         log.runStatus === "archived" ? "Archived" : "Needs Revision"}
                                                                    </span>
                                                                </div>
                                                                <span className="text-amber-400 font-bold flex-shrink-0">
                                                                    {"⭐".repeat(log.rating)} ({log.rating}/5)
                                                                </span>
                                                            </div>

                                                            {log.summary && (
                                                                <h4 className="font-bold text-zinc-200 border-l-2 border-indigo-500 pl-1.5 py-0.5">
                                                                    {log.summary}
                                                                </h4>
                                                            )}

                                                            {log.outputNotes && (
                                                                <div>
                                                                    <span className="text-[10px] text-zinc-500 block font-bold">ผลทดสอบ:</span>
                                                                    <p className="text-zinc-300">{log.outputNotes}</p>
                                                                </div>
                                                            )}

                                                            {log.nextRevisionNotes && (
                                                                <div>
                                                                    <span className="text-[10px] text-zinc-500 block font-bold">บันทึกปรับปรุงในรุ่นถัดไป:</span>
                                                                    <p className="text-zinc-400 italic bg-zinc-950/40 p-1.5 rounded border border-zinc-850/50">{log.nextRevisionNotes}</p>
                                                                </div>
                                                            )}

                                                            {/* Actions Row */}
                                                            <div className="flex items-center justify-between gap-2 border-t border-zinc-850/40 pt-2 mt-1">
                                                                <div className="flex gap-1.5">
                                                                    {log.nextRevisionNotes && (
                                                                        <button
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(log.nextRevisionNotes);
                                                                                alert("คัดลอกบันทึกปรับปรุงเรียบร้อย!");
                                                                            }}
                                                                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded text-[10px] font-semibold transition cursor-pointer"
                                                                        >
                                                                            คัดลอก Notes
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                
                                                                {log.runStatus !== "archived" && (
                                                                    <button
                                                                        onClick={() => handleArchiveRunLog(log.id)}
                                                                        className="px-2 py-1 bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-900/50 rounded text-[10px] font-semibold transition cursor-pointer"
                                                                    >
                                                                        Archive
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Collapsible snapshot */}
                                                            <div className="border-t border-zinc-850 pt-2 mt-1">
                                                                <button
                                                                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                                    className="w-full text-left text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold flex justify-between items-center cursor-pointer"
                                                                >
                                                                    <span>{isExpanded ? "ซ่อนรายละเอียด Prompt Snapshot" : "ดูรายละเอียด Prompt Snapshot"}</span>
                                                                    <span>{isExpanded ? "▲" : "▼"}</span>
                                                                </button>

                                                                {isExpanded && (
                                                                    <div className="mt-2 space-y-2 animate-fadeIn">
                                                                        {/* Variables */}
                                                                        {log.inputSnapshot && log.inputSnapshot.length > 0 && (
                                                                            <div className="bg-zinc-950/80 p-2 rounded border border-zinc-850">
                                                                                <span className="text-[9px] text-zinc-500 font-bold block mb-1">ตัวแปรอินพุต:</span>
                                                                                <div className="space-y-1 text-[9px] font-mono">
                                                                                    {log.inputSnapshot.map((varItem: PromptInputField) => (
                                                                                        <div key={varItem.name} className="truncate">
                                                                                            <span className="text-zinc-650">{varItem.label || varItem.name}:</span> <span className="text-zinc-300">{varItem.value}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* Prompt */}
                                                                        <div className="bg-zinc-950/80 p-2 rounded border border-zinc-850 font-mono text-[9px] text-zinc-400 whitespace-pre-wrap select-text leading-normal max-h-40 overflow-y-auto custom-scrollbar">
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
