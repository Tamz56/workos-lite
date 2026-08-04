"use client";

import React, { useState } from "react";
import {
    Plus, Archive, Edit2, Save,
    Layers, Target, AlertTriangle, ShieldCheck, ChevronRight
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface ProjectLoopsTabProps {
    slug: string;
    loops: any[];
    templates: any[];
    gateEvents: any[];
    loading: boolean;
    onRefresh: (includeArchived?: boolean) => void;
}

const RISK_COLORS: Record<string, string> = {
    low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    medium: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    high: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    critical: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
};

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
    planned: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    active: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    waiting_review: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
    needs_revision: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    verified: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
    archived: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-400",
    stopped: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
};

const GATE_LABELS = [
    "Level 0 — Suggest",
    "Level 1 — Draft",
    "Level 2 — Modify",
    "Level 3 — Commit / Publish / Destructive"
];

export default function ProjectLoopsTab({
    slug,
    loops,
    templates,
    gateEvents = [],
    loading,
    onRefresh
}: ProjectLoopsTabProps) {
    const [showArchived, setShowArchived] = useState(false);

    // Creation modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newLoopName, setNewLoopName] = useState("");
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [newLoopType, setNewLoopType] = useState("content_creation");
    const [createLoading, setCreateLoading] = useState(false);

    // Edit states (per loop id)
    const [expandedLoopId, setExpandedLoopId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Record<string, any>>({});
    const [saveLoadingId, setSaveLoadingId] = useState<string | null>(null);

    // Gate event states (per loop id)
    const [gateInputs, setGateInputs] = useState<Record<string, { summary: string; reason: string }>>({});
    const [gateActionLoadingId, setGateActionLoadingId] = useState<string | null>(null);

    const handleGateFieldChange = (loopId: string, field: "summary" | "reason", value: string) => {
        const current = gateInputs[loopId] || { summary: "", reason: "" };
        setGateInputs({
            ...gateInputs,
            [loopId]: {
                ...current,
                [field]: value
            }
        });
    };

    const handleGateAction = async (loop: any, action: "approve" | "request_revision" | "stop" | "note") => {
        const input = gateInputs[loop.id] || { summary: "", reason: "" };
        const cleanSummary = input.summary.trim();
        let cleanReason = input.reason.trim();

        // 1. Text validations for request_revision and stop
        if ((action === "request_revision" || action === "stop") && !cleanSummary && !cleanReason) {
            const userReason = window.prompt(
                `กรุณาระบุเหตุผลสำหรับกระบวนการ ${action === "request_revision" ? "ขอแก้ไข (Request Revision)" : "หยุดทำงาน (Stop Loop)"}:`
            );
            if (!userReason || !userReason.trim()) {
                alert("ยกเลิก: จำเป็นต้องกรอกเหตุผลประกอบการดำเนินการ");
                return;
            }
            cleanReason = userReason.trim();
            // Update state so it is sent in POST
            handleGateFieldChange(loop.id, "reason", cleanReason);
        }

        // 2. Confirmation checks
        if (action === "stop") {
            if (!window.confirm("คุณต้องการหยุดรอบการทำงานนี้ใช่หรือไม่? ขั้นตอนทั้งหมดจะถูกระงับชั่วคราว (Are you sure you want to stop this loop?)")) {
                return;
            }
        }

        let confirmed = false;
        if (action === "approve" && Number(loop.review_gate_level) === 3) {
            if (!window.confirm("[CRITICAL LEVEL 3 GATE] ยืนยันสิทธิ์ขั้นสูงระดับ 3 ใช่หรือไม่? (การยืนยันจะเปลี่ยนสถานะทางตรรกะในรายงานความปลอดภัย)")) {
                return;
            }
            confirmed = true;
        }

        setGateActionLoadingId(loop.id);
        try {
            const res = await fetch(`/api/projects/${slug}/loops/gates`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    loop_id: loop.id,
                    gate_level: Number(loop.review_gate_level),
                    gate_action: action,
                    summary: cleanSummary || undefined,
                    reason: cleanReason || undefined,
                    confirmed
                })
            });

            if (res.ok) {
                // Clear input fields
                setGateInputs({
                    ...gateInputs,
                    [loop.id]: { summary: "", reason: "" }
                });
                onRefresh(showArchived);
            } else {
                const data = await res.json();
                alert(`บันทึกเกตล้มเหลว: ${data.error}`);
            }
        } catch (err: any) {
            alert(`เกิดข้อผิดพลาด: ${err.message}`);
        } finally {
            setGateActionLoadingId(null);
        }
    };

    const handleToggleArchived = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.checked;
        setShowArchived(val);
        onRefresh(val);
    };

    const handleCreateLoop = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const res = await fetch(`/api/projects/${slug}/loops`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    template_id: selectedTemplateId || undefined,
                    loop_name: newLoopName.trim() || undefined,
                    loop_type: selectedTemplateId ? undefined : newLoopType
                })
            });

            if (res.ok) {
                setIsCreateOpen(false);
                setNewLoopName("");
                setSelectedTemplateId("");
                onRefresh(showArchived);
            } else {
                const data = await res.json();
                alert(`ล้มเหลว: ${data.error}`);
            }
        } catch (err: any) {
            alert(`เกิดข้อผิดพลาด: ${err.message}`);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleStartEdit = (loop: any) => {
        setExpandedLoopId(expandedLoopId === loop.id ? null : loop.id);
        setEditData({
            ...editData,
            [loop.id]: {
                loop_name: loop.loop_name,
                current_step: loop.current_step || "",
                status: loop.status,
                risk_level: loop.risk_level,
                review_gate_level: loop.review_gate_level,
                expected_output: loop.expected_output || "",
                save_destination: loop.save_destination || "",
                learn_note: loop.learn_note || ""
            }
        });
    };

    const handleFieldChange = (loopId: string, field: string, value: any) => {
        setEditData({
            ...editData,
            [loopId]: {
                ...editData[loopId],
                [field]: value
            }
        });
    };

    const handleSaveChanges = async (loopId: string) => {
        const currentEdit = editData[loopId];
        if (!currentEdit) return;

        setSaveLoadingId(loopId);
        try {
            const res = await fetch(`/api/projects/${slug}/loops`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: loopId,
                    ...currentEdit
                })
            });

            if (res.ok) {
                onRefresh(showArchived);
                setExpandedLoopId(null);
            } else {
                const data = await res.json();
                alert(`บันทึกล้มเหลว: ${data.error}`);
            }
        } catch (err: any) {
            alert(`เกิดข้อผิดพลาด: ${err.message}`);
        } finally {
            setSaveLoadingId(null);
        }
    };

    const handleArchiveLoop = async (loopId: string) => {
        // Explicit user confirmation required
        if (!window.confirm("คุณต้องการเก็บถาวร Loop นี้ใช่หรือไม่? (Are you sure you want to archive this loop?)")) {
            return;
        }

        setSaveLoadingId(loopId);
        try {
            const res = await fetch(`/api/projects/${slug}/loops`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: loopId,
                    status: "archived"
                })
            });

            if (res.ok) {
                onRefresh(showArchived);
                setExpandedLoopId(null);
            } else {
                const data = await res.json();
                alert(`เก็บถาวรล้มเหลว: ${data.error}`);
            }
        } catch (err: any) {
            alert(`เกิดข้อผิดพลาด: ${err.message}`);
        } finally {
            setSaveLoadingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header controls row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-theme-border/60">
                <div className="space-y-1">
                    <h3 className="text-sm font-black text-theme-primary flex items-center gap-1.5 uppercase tracking-wider">
                        <Layers className="w-4 h-4 text-neutral-400" />
                        Project Workflows (Loops)
                    </h3>
                    <p className="text-[10px] text-theme-muted">
                        บริหารจัดการรอบการทำงาน (Loops) การร่าง การตรวจสอบความเสี่ยง และเกณฑ์ความปลอดภัย
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-bold text-theme-secondary cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showArchived}
                            onChange={handleToggleArchived}
                            className="rounded text-neutral-900 focus:ring-0 focus:ring-offset-0 bg-theme-input border-theme-border"
                        />
                        แสดงรายการที่เก็บถาวร (Show Archived)
                    </label>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-black hover:opacity-90 shadow-md active:scale-95 transition-all"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Start New Loop
                    </button>
                </div>
            </div>

            {loading && loops.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-sm text-theme-muted italic">กำลังโหลดข้อมูล Loops...</p>
                </div>
            ) : loops.length === 0 ? (
                <div className="text-center py-24 bg-theme-panel rounded-3xl border border-dashed border-theme-border/60">
                    <Layers className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                    <h4 className="text-sm font-black text-theme-primary mb-1">ยังไม่มีรอบการทำงาน (No Loops Active)</h4>
                    <p className="text-xs text-theme-muted max-w-md mx-auto mb-5 leading-relaxed">
                        สร้างรอบการทำงานใหม่โดยดึงข้อมูลตั้งต้นจากเทมเพลตมาตรฐาน หรือสร้างกระบวนการแบบคัสตอมได้ทันที
                    </p>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-black hover:opacity-90 transition-all shadow-md inline-flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Start First Loop
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {loops.map((loop) => {
                        const isExpanded = expandedLoopId === loop.id;
                        const current = editData[loop.id] || {};
                        let steps: string[] = [];
                        try {
                            steps = JSON.parse(loop.steps_json || "[]");
                        } catch {
                            steps = [];
                        }

                        return (
                            <div
                                key={loop.id}
                                className={`bg-theme-card border transition-all rounded-[28px] overflow-hidden ${
                                    isExpanded
                                        ? "border-neutral-400 dark:border-slate-700 shadow-md"
                                        : "border-theme-border hover:border-neutral-350 dark:hover:border-slate-800 shadow-sm"
                                }`}
                            >
                                {/* Loop Card Header */}
                                <div
                                    onClick={() => handleStartEdit(loop)}
                                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                                >
                                    <div className="space-y-2 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[10px] font-black text-theme-muted">{loop.id}</span>
                                            <h4 className="text-sm font-black text-theme-primary leading-tight">
                                                {loop.loop_name}
                                            </h4>
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${STATUS_COLORS[loop.status]}`}>
                                                {loop.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-theme-muted font-bold">
                                            <span className="flex items-center gap-1">
                                                <Target className="w-3.5 h-3.5 text-neutral-400" />
                                                ประเภท: <span className="text-theme-secondary">{loop.loop_type}</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5 text-neutral-400" />
                                                ความเสี่ยง:
                                                <span className={`px-1.5 py-0.5 rounded font-black uppercase text-[8px] ${RISK_COLORS[loop.risk_level]}`}>
                                                    {loop.risk_level}
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                                                ความปลอดภัย: <span className="text-theme-secondary">{GATE_LABELS[loop.review_gate_level]}</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action info right side */}
                                    <div className="flex items-center gap-3">
                                        {loop.current_step && (
                                            <div className="text-right hidden md:block">
                                                <div className="text-[9px] font-black uppercase text-theme-muted tracking-wider">Active Step</div>
                                                <div className="text-xs font-bold text-theme-primary">{loop.current_step}</div>
                                            </div>
                                        )}
                                        <div className="p-2 rounded-xl bg-neutral-50 dark:bg-slate-800 text-theme-muted hover:text-theme-primary transition-all">
                                            <Edit2 className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                {/* Step Timeline Bar */}
                                {steps.length > 0 && (
                                    <div className="px-5 pb-4 border-b border-theme-border/30 overflow-x-auto scrollbar-none flex items-center gap-2">
                                        {steps.map((step, idx) => {
                                            const isActive = loop.current_step === step;
                                            return (
                                                <React.Fragment key={step}>
                                                    <span
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStartEdit(loop);
                                                            handleFieldChange(loop.id, "current_step", step);
                                                        }}
                                                        className={`px-3 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all ${
                                                            isActive
                                                                ? "bg-neutral-900 text-white dark:bg-white dark:text-black font-black"
                                                                : "bg-neutral-50 hover:bg-neutral-100 text-theme-muted dark:bg-slate-800/40 dark:hover:bg-slate-800"
                                                        }`}
                                                    >
                                                        {idx + 1}. {step}
                                                    </span>
                                                    {idx < steps.length - 1 && (
                                                        <ChevronRight className="w-3 h-3 text-neutral-300 flex-shrink-0" />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Loop Card Expanded Details & Edit Form */}
                                {isExpanded && (
                                    <div className="p-5 bg-neutral-50/50 dark:bg-slate-800/10 border-t border-theme-border/30 space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            {/* Config selects */}
                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider block">Loop Status / สถานะ</label>
                                                    <select
                                                        value={current.status}
                                                        onChange={(e) => handleFieldChange(loop.id, "status", e.target.value)}
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none focus:border-neutral-400"
                                                    >
                                                        {Object.keys(STATUS_COLORS).map((st) => (
                                                            <option key={st} value={st}>{st.toUpperCase()}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider block">Risk Level / ระดับความเสี่ยง</label>
                                                    <select
                                                        value={current.risk_level}
                                                        onChange={(e) => handleFieldChange(loop.id, "risk_level", e.target.value)}
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none focus:border-neutral-400"
                                                    >
                                                        {Object.keys(RISK_COLORS).map((rk) => (
                                                            <option key={rk} value={rk}>{rk.toUpperCase()}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider block">Review Gate / ความปลอดภัย</label>
                                                    <select
                                                        value={current.review_gate_level}
                                                        onChange={(e) => handleFieldChange(loop.id, "review_gate_level", Number(e.target.value))}
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none focus:border-neutral-400"
                                                    >
                                                        {GATE_LABELS.map((label, idx) => (
                                                            <option key={idx} value={idx}>{label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {steps.length > 0 && (
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider block">Active Step / ขั้นตอนปฏิบัติ</label>
                                                        <select
                                                            value={current.current_step}
                                                            onChange={(e) => handleFieldChange(loop.id, "current_step", e.target.value)}
                                                            className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none focus:border-neutral-400"
                                                        >
                                                            <option value="">-- เลือกขั้นตอน --</option>
                                                            {steps.map((st) => (
                                                                <option key={st} value={st}>{st}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Expected Output & Save Destination */}
                                            <div className="space-y-4 md:col-span-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider block">Expected Output / ผลลัพธ์ที่คาดหวัง</label>
                                                        <textarea
                                                            value={current.expected_output}
                                                            onChange={(e) => handleFieldChange(loop.id, "expected_output", e.target.value)}
                                                            rows={3}
                                                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-xs text-theme-primary outline-none focus:border-neutral-450 leading-relaxed"
                                                            placeholder="รายละเอียดไฟล์, ลิงก์ปลายทาง หรือเอกสารที่สร้างขึ้น..."
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider block">Save Destination / ปลายทางจัดเก็บ</label>
                                                        <input
                                                            type="text"
                                                            value={current.save_destination}
                                                            onChange={(e) => handleFieldChange(loop.id, "save_destination", e.target.value)}
                                                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-xs text-theme-primary outline-none focus:border-neutral-450"
                                                            placeholder="เช่น Local DB, Staging Website, Git Repository..."
                                                        />
                                                    </div>
                                                </div>

                                                {/* Learn Note */}
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider block">Learn Note / ถอดบทเรียนกระบวนการ (Post-mortem)</label>
                                                    <textarea
                                                        value={current.learn_note}
                                                        onChange={(e) => handleFieldChange(loop.id, "learn_note", e.target.value)}
                                                        rows={3}
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-xs text-theme-primary outline-none focus:border-neutral-450 leading-relaxed"
                                                        placeholder="ข้อดี ข้อเสีย อุปสรรค หรือประเด็นนำไปปรับปรุง Project Context หรือกฎในครั้งหน้า..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Decision Gate Section */}
                                        <div className="border-t border-theme-border/30 pt-5 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-100/40 dark:bg-slate-800/20 p-4 rounded-2xl border border-theme-border/40">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase text-theme-muted tracking-wider">Gate Safety Level</span>
                                                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-neutral-900 text-white dark:bg-white dark:text-black uppercase">
                                                            Level {loop.review_gate_level}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xs font-black text-theme-primary">
                                                        {GATE_LABELS[loop.review_gate_level]}
                                                    </h4>
                                                    <p className="text-[9px] text-theme-muted">
                                                        {loop.review_gate_level === 0 && "AI operates in suggest mode (Read-only options)."}
                                                        {loop.review_gate_level === 1 && "AI is allowed to generate drafts or proposed records."}
                                                        {loop.review_gate_level === 2 && "AI is allowed to modify non-critical existing records."}
                                                        {loop.review_gate_level === 3 && "AI commits or publishes live changes (Explicit confirmation required)."}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[9px] font-black uppercase text-theme-muted block tracking-wider">Current Gate Status</span>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase inline-block ${
                                                        loop.gate_status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" :
                                                        loop.gate_status === "revision_requested" ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" :
                                                        loop.gate_status === "stopped" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" :
                                                        loop.gate_status === "noted" ? "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300" :
                                                        "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                                                    }`}>
                                                        {loop.gate_status || "NOT_REQUIRED"}
                                                    </span>
                                                    {loop.last_gate_action && (
                                                        <div className="text-[9px] text-theme-muted font-bold mt-1">
                                                            Last Action: {loop.last_gate_action.toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Gate action input */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-900/10 p-4 rounded-2xl border border-theme-border/30">
                                                <div className="space-y-1.5 md:col-span-2">
                                                    <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider block">
                                                        Gate Summary & Reason / รายละเอียดและเหตุผลประเมินผล
                                                    </label>
                                                    <textarea
                                                        value={(gateInputs[loop.id] || {}).reason || ""}
                                                        onChange={(e) => handleGateFieldChange(loop.id, "reason", e.target.value)}
                                                        rows={2}
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-xs text-theme-primary outline-none focus:border-neutral-450 leading-relaxed"
                                                        placeholder="ระบุเหตุผลประกอบการตัดสินใจ, รายละเอียดความคิดเห็นเชิงวิชาการ หรือการอนุมัติ..."
                                                    />
                                                </div>

                                                <div className="md:col-span-2 flex flex-wrap items-center gap-2 pt-2 justify-end border-t border-theme-border/20">
                                                    <span className="text-[9px] text-theme-muted mr-auto font-bold">
                                                        * การ Approve ในระดับ Level 3 หรือการ Stop Loop จะมีกล่องขอยืนยันความปลอดภัยเพิ่ม
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGateAction(loop, "note")}
                                                        className="px-4 py-2 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-theme-secondary text-xs font-black rounded-xl active:scale-95 transition-all"
                                                        disabled={gateActionLoadingId === loop.id}
                                                    >
                                                        Add Gate Note
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGateAction(loop, "request_revision")}
                                                        className="px-4 py-2 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 border border-orange-200/50 hover:bg-orange-100/60 dark:hover:bg-orange-900/20 text-xs font-black rounded-xl active:scale-95 transition-all"
                                                        disabled={gateActionLoadingId === loop.id}
                                                    >
                                                        Request Revision
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGateAction(loop, "stop")}
                                                        className="px-4 py-2 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border border-rose-200/50 hover:bg-rose-100/60 dark:hover:bg-rose-900/20 text-xs font-black rounded-xl active:scale-95 transition-all"
                                                        disabled={gateActionLoadingId === loop.id}
                                                    >
                                                        Stop Loop
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleGateAction(loop, "approve")}
                                                        className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 text-xs font-black rounded-xl active:scale-95 transition-all shadow-md"
                                                        disabled={gateActionLoadingId === loop.id}
                                                    >
                                                        Approve Gate
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Gate history logs list */}
                                            {(() => {
                                                const loopEvents = gateEvents.filter(ev => ev.loop_id === loop.id);
                                                if (loopEvents.length === 0) return null;
                                                return (
                                                    <div className="space-y-2.5">
                                                        <h5 className="text-[10px] font-black uppercase text-theme-muted tracking-wider">
                                                            Decision Gate History ({loopEvents.length})
                                                        </h5>
                                                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                                            {loopEvents.map((ev) => (
                                                                <div
                                                                    key={ev.id}
                                                                    className="text-[11px] p-3 rounded-xl bg-white dark:bg-slate-900/10 border border-theme-border/30 space-y-1.5"
                                                                >
                                                                    <div className="flex justify-between items-center gap-2">
                                                                        <div className="flex items-center gap-1.5 font-bold">
                                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                                                                ev.gate_status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" :
                                                                                ev.gate_status === "revision_requested" ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" :
                                                                                ev.gate_status === "stopped" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" :
                                                                                "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                                                                            }`}>
                                                                                {ev.gate_status}
                                                                            </span>
                                                                            <span className="text-theme-primary">
                                                                                Gate Level {ev.gate_level} Action: {ev.gate_action.toUpperCase()}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[9px] text-theme-muted font-bold">
                                                                            {new Date(ev.created_at).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                    {ev.reason && (
                                                                        <p className="text-theme-secondary font-semibold whitespace-pre-wrap leading-relaxed">
                                                                            {ev.reason}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex justify-between items-center pt-4 border-t border-theme-border/30">
                                            <button
                                                type="button"
                                                onClick={() => handleArchiveLoop(loop.id)}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all border border-transparent hover:border-rose-200"
                                                disabled={saveLoadingId === loop.id}
                                            >
                                                <Archive className="w-4 h-4" />
                                                Archive Loop
                                            </button>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedLoopId(null)}
                                                    className="px-5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-black text-theme-secondary transition-all"
                                                >
                                                    ปิด (Close)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveChanges(loop.id)}
                                                    className="flex items-center gap-1.5 px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-black hover:opacity-90 transition-all shadow-md"
                                                    disabled={saveLoadingId === loop.id}
                                                >
                                                    <Save className="w-4 h-4" />
                                                    {saveLoadingId === loop.id ? "กำลังบันทึก..." : "Save Changes"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Loop Modal */}
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="เริ่มรอบการทำงานใหม่ (Start New Loop)">
                <form onSubmit={handleCreateLoop} className="p-3 space-y-5">
                    {/* Select Template */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">เลือกเทมเพลตเริ่มต้น (Start from Template)</label>
                        <select
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                        >
                            <option value="">-- สร้างเปล่า (Custom / Manual Loop) --</option>
                            {templates.map((tpl) => (
                                <option key={tpl.id} value={tpl.id}>{tpl.template_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Loop Name */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">ชื่อรอบการทำงาน (Loop Name) *</label>
                        <input
                            type="text"
                            required
                            value={newLoopName}
                            onChange={(e) => setNewLoopName(e.target.value)}
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                            placeholder="ระบุชื่อรอบการทำงาน หรือทิ้งว่างไว้เพื่อดึงชื่อตามเทมเพลต..."
                        />
                    </div>

                    {/* Loop Type (Only if custom) */}
                    {!selectedTemplateId && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">ประเภทของกระบวนการ (Loop Type) *</label>
                            <select
                                value={newLoopType}
                                onChange={(e) => setNewLoopType(e.target.value)}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                            >
                                <option value="content_creation">Content Creation / เขียนร่างเนื้อหา</option>
                                <option value="content_review">Content Review / ตรวจสอบความถูกต้องและน้ำเสียง</option>
                                <option value="dev_work">Dev Work / พัฒนาซอฟต์แวร์</option>
                                <option value="research">Research / ค้นคว้าวิจัย</option>
                                <option value="strategy">Strategy / วางแผนเชิงกลยุทธ์</option>
                                <option value="qa_review">QA Review / ตรวจสอบคุณภาพ</option>
                                <option value="agent_handoff">Agent Handoff / ถ่ายทอดงานสู่เอเจนต์</option>
                                <option value="manual_process">Manual Process / จัดทำเช็คลิสต์คู่มือปฏิบัติ</option>
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-250/20">
                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(false)}
                            className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-black text-neutral-600 dark:text-neutral-350 transition-all"
                            disabled={createLoading}
                        >
                            ยกเลิก (Cancel)
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-black hover:opacity-90 transition-all shadow-md"
                            disabled={createLoading}
                        >
                            {createLoading ? "กำลังสร้าง..." : "สร้าง Loop (Create)"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
