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
    HelpCircle
} from "lucide-react";

interface InputField {
    name: string;
    label: string;
    value: string;
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
    created_at: string;
    updated_at: string;
}

const CATEGORIES = ["Writing", "Review", "Marketing", "Coding", "General"];
const STATUSES = ["draft", "testing", "active", "archived"];

function safeParseInputFields(jsonStr: string | null): InputField[] {
    if (!jsonStr) return [];
    try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
            return parsed.map(item => {
                const typedItem = item as Record<string, unknown>;
                return {
                    name: String(typedItem.name || ""),
                    label: String(typedItem.label || typedItem.name || ""),
                    value: String(typedItem.value || "")
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

    useEffect(() => {
        fetchTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        }
        return temp;
    }, [selectedId, templates]);

    // Validate JSON string on the fly safely without crashing UI
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
                // Update test values inputs live based on valid input_fields modification
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

    // Safe parsed input fields for rendering test fields
    const currentInputFields = useMemo(() => {
        return safeParseInputFields(editorFields.input_fields || null);
    }, [editorFields.input_fields]);

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
        if (notes) blocks.push(`[NOTES]\n${notes}`);

        return blocks.join("\n\n");
    }, [editorFields, activeTemplate]);

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
            // If empty, substitute with blank string instead of placeholder to avoid breaking execution
            result = result.replace(regex, val || "");
        }

        return result;
    }, [editorFields, activeTemplate, testValues, currentInputFields]);

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
        setPreviewTab("compiled"); // Reset to default tab
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

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
            {/* Header Alert area for API Errors */}
            {apiError && (
                <div className="bg-red-950/60 border-b border-red-800 text-red-200 px-4 py-3 flex items-center justify-between text-sm animate-fadeIn">
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
                <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
                    {/* Filters & Actions */}
                    <div className="p-4 border-b border-zinc-800 space-y-3">
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
                                className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 text-xs rounded-md focus:outline-none focus:border-zinc-700 transition"
                            />
                        </div>

                        {/* Category filter */}
                        <div className="flex gap-2">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-1/2 bg-zinc-900 border border-zinc-800 text-xs py-1 px-1.5 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-300"
                            >
                                <option value="All">หมวดหมู่ทั้งหมด</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            {/* Status filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-1/2 bg-zinc-900 border border-zinc-800 text-xs py-1 px-1.5 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-300"
                            >
                                <option value="All">สถานะทั้งหมด</option>
                                <option value="active">Active</option>
                                <option value="draft">Draft</option>
                                <option value="testing">Testing</option>
                                <option value="archived">Archived</option>
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
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30">
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
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
                        {/* Meta Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-zinc-500 font-bold mb-1">ชื่อ Prompt *</label>
                                <input
                                    type="text"
                                    value={editorFields.name || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="เช่น Green Fineness Content Writer"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-zinc-500 font-bold mb-1">หมวดหมู่ *</label>
                                <select
                                    value={editorFields.category || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-zinc-500 font-bold mb-1">สถานะ</label>
                                <select
                                    value={editorFields.status || "draft"}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, status: e.target.value as PromptTemplate["status"] }))}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white"
                                >
                                    {STATUSES.map(st => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Version & Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-zinc-500 font-bold mb-1">เวอร์ชัน</label>
                                <input
                                    type="text"
                                    value={editorFields.version || "1.0.0"}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, version: e.target.value }))}
                                    placeholder="1.0.0"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-zinc-500 font-bold mb-1">บันทึกเวอร์ชัน (Version Notes)</label>
                                <input
                                    type="text"
                                    value={editorFields.version_notes || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, version_notes: e.target.value }))}
                                    placeholder="เช่น เริ่มต้นเทมเพลต หรือ แก้ไข instructions เพิ่มเติม"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white"
                                />
                            </div>
                        </div>

                        {/* Purpose */}
                        <div>
                            <label className="block text-zinc-500 font-bold mb-1">วัตถุประสงค์ (Purpose)</label>
                            <input
                                type="text"
                                value={editorFields.purpose || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, purpose: e.target.value }))}
                                placeholder="จุดประสงค์หลักในการรัน Prompt นี้"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white"
                            />
                        </div>

                        {/* Role & Context */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-zinc-500 font-bold mb-1">บทบาท (Role / Persona)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.role || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, role: e.target.value }))}
                                    placeholder="เช่น คุณคือบรรณาธิการตรวจทานบทความวิชาการสมุนไพร..."
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-zinc-500 font-bold mb-1">บริบท (Context)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.context || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, context: e.target.value }))}
                                    placeholder="บริบทโดยรอบ ข้อมูลพื้นฐาน องค์กร หรือกลุ่มเป้าหมาย..."
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white font-mono"
                                />
                            </div>
                        </div>

                        {/* Structured Input Fields JSON with Live Validation Check */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-zinc-500 font-bold">ตัวแปรอินพุต (Input Fields JSON)</label>
                                <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                    <HelpCircle className="w-3 h-3" />
                                    <span>ต้องเป็น JSON Array ของวัตถุ</span>
                                </div>
                            </div>
                            <textarea
                                rows={3}
                                value={editorFields.input_fields || "[]"}
                                onChange={(e) => handleJsonChange(e.target.value)}
                                placeholder={`[{"name": "topic", "label": "หัวข้อบทความ", "value": ""}]`}
                                className={`w-full bg-zinc-900 border rounded p-2 focus:outline-none text-white font-mono ${
                                    jsonValidationError ? "border-red-700 focus:border-red-600" : "border-zinc-800 focus:border-zinc-700"
                                }`}
                            />
                            {jsonValidationError && (
                                <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1 font-mono">
                                    <AlertCircle className="w-3 h-3" />
                                    {jsonValidationError}
                                </p>
                            )}
                        </div>

                        {/* Instructions & Constraints */}
                        <div>
                            <label className="block text-zinc-500 font-bold mb-1">ขั้นตอนดำเนินงาน (Instructions)</label>
                            <textarea
                                rows={5}
                                value={editorFields.instructions || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, instructions: e.target.value }))}
                                placeholder="ขั้นตอนการทำงาน 1, 2, 3 ทีละสเตป..."
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-zinc-500 font-bold mb-1">ข้อจำกัด / กฎเกณฑ์ (Constraints)</label>
                            <textarea
                                rows={3}
                                value={editorFields.constraints || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, constraints: e.target.value }))}
                                placeholder="สิ่งที่ห้ามทำเด็ดขาด เช่น ห้ามใช้สารเคมี, ห้ามใช้สัญลักษณ์นี้..."
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white font-mono"
                            />
                        </div>

                        {/* Output & Checklist */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-zinc-500 font-bold mb-1">รูปแบบผลลัพธ์ (Output Format)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.output_format || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, output_format: e.target.value }))}
                                    placeholder="จัดรูปแบบคำตอบ เช่น แสดงเป็น Markdown Table หรือ JSON..."
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-zinc-500 font-bold mb-1">รายการเช็คตรวจสอบก่อนส่ง (Review Checklist)</label>
                                <textarea
                                    rows={4}
                                    value={editorFields.review_checklist || ""}
                                    onChange={(e) => setEditorFields(prev => ({ ...prev, review_checklist: e.target.value }))}
                                    placeholder="การประเมินคุณภาพด้วยตนเองก่อนสรุปผล..."
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white font-mono"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-zinc-500 font-bold mb-1">บันทึกเพิ่มเติม (Notes)</label>
                            <textarea
                                rows={2}
                                value={editorFields.notes || ""}
                                onChange={(e) => setEditorFields(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="บันทึกข้อความภายในที่ไม่ได้ Compile ไปยัง Prompt"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Right Column: Preview & Test Input Area */}
                <div className="w-[420px] flex flex-col bg-zinc-900/30 overflow-hidden">
                    {/* Test Variables Area */}
                    <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <Sliders className="w-4 h-4 text-indigo-400" />
                            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Test Input Area</h2>
                        </div>
                        
                        {currentInputFields.length === 0 ? (
                            <p className="text-[11px] text-zinc-500 italic">
                                {"ไม่มีตัวแปรที่กำหนดไว้ในเทมเพลตนี้ (สามารถเพิ่มตัวแปรในช่อง Input Fields JSON ด้านข้าง เช่น [{\"name\": \"topic\", \"label\": \"หัวข้อ\"}])"}
                            </p>
                        ) : (
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                {currentInputFields.map(field => (
                                    <div key={field.name} className="flex flex-col text-xs">
                                        <label className="text-zinc-400 font-semibold mb-1 flex justify-between items-center">
                                            <span>{field.label}</span>
                                            <span className="text-[10px] text-zinc-600 font-mono">&#123;&#123;{field.name}&#125;&#125;</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={testValues[field.name] || ""}
                                            onChange={(e) => setTestValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                                            placeholder={`กรอกค่าของ ${field.label}...`}
                                            className="bg-zinc-950 border border-zinc-800 rounded p-2 focus:outline-none focus:border-zinc-700 text-white text-xs"
                                        />
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
                        <div className="p-3 border-b border-zinc-850 flex justify-between items-center bg-zinc-900/10">
                            <div className="flex items-center gap-2">
                                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                                <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    {previewTab === "compiled" ? "Compiled Result" : "Template Spec"}
                                </h2>
                            </div>
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

                        {/* Prompt rendering panel */}
                        <div className="flex-1 p-4 overflow-y-auto bg-zinc-950 font-mono text-[11px] text-zinc-300 select-text whitespace-pre-wrap leading-relaxed custom-scrollbar">
                            {activePreviewText ? (
                                activePreviewText
                            ) : (
                                <p className="text-zinc-600 italic">กรอกบทบาท ขั้นตอนการทำงาน หรือหัวข้อบทความ เพื่อเริ่มสร้าง Prompt...</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
