"use client";

import React, { useCallback, useState, useEffect } from "react";
import { ImportPreview, ImportConflictPolicy, ImportExecutionResult } from "@/lib/planner-import/types";
import { WORK_BLOCKS } from "@/components/arbor-planner/plannerUi";
import type { PlannerScheduledBlock } from "@/lib/planner/types";

interface ProjectOption {
    id: string;
    slug: string;
    name: string;
}

interface ImportScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess?: () => void;
}

export const ImportScheduleModal: React.FC<ImportScheduleModalProps> = ({
    isOpen,
    onClose,
    onImportSuccess
}) => {
    const [rawText, setRawText] = useState<string>("");
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [conflictPolicy, setConflictPolicy] = useState<ImportConflictPolicy>("append");
    const [defaultScheduledBlock, setDefaultScheduledBlock] = useState<PlannerScheduledBlock>("morning_focus");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [projectLoadError, setProjectLoadError] = useState<string | null>(null);

    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [executionResult, setExecutionResult] = useState<ImportExecutionResult | null>(null);

    const fetchProjects = useCallback(async () => {
        setProjectLoadError(null);
        try {
            const res = await fetch("/api/projects");
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || "โหลดรายชื่อโปรเจกต์ไม่สำเร็จ");
            }
            const list = Array.isArray(data) ? data : data.projects || [];
            setProjects(list);
            if (list.length > 0) {
                setSelectedProjectId(currentProjectId => currentProjectId || list[0].id);
            } else {
                setSelectedProjectId("");
                setProjectLoadError("ไม่พบโปรเจกต์สำหรับนำเข้าตารางงาน กรุณาสร้างโปรเจกต์ก่อน");
            }
        } catch (e) {
            console.error("Failed to fetch projects:", e);
            setProjects([]);
            setSelectedProjectId("");
            setProjectLoadError(e instanceof Error ? e.message : "โหลดรายชื่อโปรเจกต์ไม่สำเร็จ");
        }
    }, []);

    // Fetch projects on open
    useEffect(() => {
        if (isOpen) {
            fetchProjects();
        }
    }, [fetchProjects, isOpen]);

    if (!isOpen) return null;

    const handlePreview = async () => {
        if (!rawText.trim()) {
            setError("กรุณากรอกหรือวางข้อความตารางงาน (Raw Schedule Text)");
            return;
        }
        setError(null);
        setIsLoading(true);
        try {
            const res = await fetch("/api/planner-import/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    raw_text: rawText,
                    project_id: selectedProjectId || undefined
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to generate preview");
            }
            setPreview(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการดูตัวอย่างตารางงาน");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResolveDate = (dayIndex: number, newDate: string) => {
        if (!preview) return;
        const updatedDays = [...preview.schedule.days];
        const day = { ...updatedDays[dayIndex] };

        day.parsed_date = newDate;
        day.is_date_range = false;
        day.warnings = day.warnings.filter(w => !w.includes("Date range detected"));

        updatedDays[dayIndex] = day;

        // Recompute parser warnings and all confirmation blockers.
        let unresolvedRangeCount = 0;
        const blockingWarnings: string[] = [];

        for (const d of updatedDays) {
            if (d.is_date_range) {
                unresolvedRangeCount++;
                blockingWarnings.push(`ช่วงวันที่ "${d.date_text}" ต้องระบุวันที่จริงก่อนนำเข้า`);
            }
            if (!d.parsed_date) blockingWarnings.push(`วัน "${d.date_text}" ไม่มีวันที่ YYYY-MM-DD ที่ถูกต้อง`);
        }
        const remainingWarnings = [
            ...updatedDays.flatMap(d => d.warnings),
            ...blockingWarnings.filter(warning => !updatedDays.some(d => d.warnings.includes(warning)))
        ];

        setPreview({
            ...preview,
            schedule: {
                ...preview.schedule,
                days: updatedDays
            },
            unresolved_warnings: remainingWarnings,
            blocking_warnings: blockingWarnings,
            stats: {
                ...preview.stats,
                unresolved_range_count: unresolvedRangeCount,
                blocking_warning_count: blockingWarnings.length
            }
        });
    };

    const handleExecuteImport = async () => {
        if (!preview || !selectedProjectId) {
            setError("กรุณาเลือกโปรเจกต์ก่อนนำเข้า");
            return;
        }

        if (preview.stats.unresolved_range_count > 0 || preview.stats.blocking_warning_count > 0) {
            setError("กรุณาแก้ไขรายการที่บล็อกการนำเข้าก่อนยืนยัน");
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            // Build raw_text reflecting date range resolutions
            let resolvedRawText = rawText;
            for (const day of preview.schedule.days) {
                if (day.date_range && day.parsed_date) {
                    resolvedRawText = resolvedRawText.replace(day.date_text, `วันที่ ${day.parsed_date}`);
                }
            }

            const res = await fetch("/api/planner-import/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    raw_text: resolvedRawText,
                    schedule: preview.schedule,
                    project_id: selectedProjectId,
                    conflict_policy: conflictPolicy,
                    default_scheduled_block: defaultScheduledBlock,
                    confirmed: true
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to execute schedule import");
            }

            setExecutionResult(data);
            if (onImportSuccess) {
                onImportSuccess();
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการนำเข้าตารางงาน");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setPreview(null);
        setExecutionResult(null);
        setError(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
                    <div>
                        <h2 className="text-xl font-bold text-emerald-400">นำเข้าตารางงานปฏิบัติการ (Import Operational Schedule)</h2>
                        <p className="text-xs text-slate-400">วางตารางงานภาษาไทย ตรวจสอบพรีวิวและเลือกโปรเจกต์ก่อนยืนยันนำเข้า</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white px-3 py-1 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 transition"
                    >
                        ✕ ปิด
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {error && (
                        <div className="bg-rose-950/70 border border-rose-800 text-rose-200 p-4 rounded-lg text-sm">
                            ⚠️ {error}
                        </div>
                    )}
                    {projectLoadError && (
                        <div className="bg-rose-950/70 border border-rose-800 text-rose-200 p-4 rounded-lg text-sm">
                            ⚠️ {projectLoadError}
                        </div>
                    )}

                    {executionResult ? (
                        /* Step 3: Success View */
                        <div className="space-y-4 bg-emerald-950/40 border border-emerald-800/80 p-6 rounded-xl text-center">
                            <div className="text-4xl">✅</div>
                            <h3 className="text-lg font-bold text-emerald-300">
                                {executionResult.duplicate
                                    ? "ไม่ได้นำเข้าซ้ำ — แสดงผลการนำเข้าครั้งก่อน"
                                    : "นำเข้าตารางงานสำเร็จ!"}
                            </h3>
                            <p className="text-sm text-slate-300">{executionResult.message || "สร้างรายการ Project Items และ Planner Days/Items เรียบร้อยแล้ว"}</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4 text-left">
                                <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                    <div className="text-xs text-slate-400">Project Items สร้างใหม่</div>
                                    <div className="text-lg font-bold text-emerald-400">{executionResult.created_project_items.length}</div>
                                </div>
                                <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                    <div className="text-xs text-slate-400">Planner Days สร้างใหม่</div>
                                    <div className="text-lg font-bold text-emerald-400">{executionResult.created_planner_days.length}</div>
                                </div>
                                <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                    <div className="text-xs text-slate-400">Planner Items สร้างใหม่</div>
                                    <div className="text-lg font-bold text-emerald-400">{executionResult.created_planner_items.length}</div>
                                </div>
                                <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                    <div className="text-xs text-slate-400">ข้าม (Skipped)</div>
                                    <div className="text-lg font-bold text-amber-400">{executionResult.skipped_planner_items}</div>
                                </div>
                            </div>

                            <div className="flex justify-center gap-3 pt-2">
                                <button
                                    onClick={handleReset}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition"
                                >
                                    นำเข้าตารางอื่นเพิ่ม
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition"
                                >
                                    เสร็จสิ้น
                                </button>
                            </div>
                        </div>
                    ) : !preview ? (
                        /* Step 1: Input Raw Text */
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    วางข้อความตารางงาน (Thai Operational Schedule Text):
                                </label>
                                <textarea
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                    placeholder={`ตัวอย่าง:
วันที่ 26 กรกฎาคม 2569
เป้าหมาย: เปิดใช้งานระบบ Arbor Import
งานหลัก:
1. พัฒนา Parser ภาษาไทย
2. สร้าง Preview API
Definition of Done:
- ผ่านการทดสอบ Unit Test`}
                                    className="w-full h-64 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        เลือกโปรเจกต์เป้าหมาย (Target Project):
                                    </label>
                                    <select
                                        value={selectedProjectId}
                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                                    >
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ({p.slug})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        ดูพรีวิวได้โดยยังไม่เลือกโปรเจกต์ แต่ต้องเลือกก่อนยืนยันนำเข้า
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">
                                        Conflict Resolution Policy:
                                    </label>
                                    <div className="flex gap-4 pt-1">
                                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="conflictPolicy"
                                                value="append"
                                                checked={conflictPolicy === "append"}
                                                onChange={() => setConflictPolicy("append")}
                                                className="accent-emerald-500"
                                            />
                                            Append (เพิ่มต่อท้าย)
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="conflictPolicy"
                                                value="skip"
                                                checked={conflictPolicy === "skip"}
                                                onChange={() => setConflictPolicy("skip")}
                                                className="accent-amber-500"
                                            />
                                            Skip (ข้ามวันที่ซ้ำ)
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Preview & Confirmation */
                        <div className="space-y-6">
                            {/* Summary Bar */}
                            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                                <div className="flex gap-6 text-sm">
                                    <div>
                                        <span className="text-slate-400">จำนวนวัน: </span>
                                        <span className="font-bold text-emerald-400">{preview.stats.days_count} วัน</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400">Project Items: </span>
                                        <span className="font-bold text-emerald-400">{preview.stats.project_items_count} รายการ</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400">Planner Items: </span>
                                        <span className="font-bold text-emerald-400">{preview.stats.planner_items_count} รายการ</span>
                                    </div>
                                    {preview.stats.unresolved_range_count > 0 && (
                                        <div>
                                            <span className="text-amber-400 font-semibold">⚠️ ช่วงวันที่ต้องระบุ: </span>
                                            <span className="font-bold text-amber-400">{preview.stats.unresolved_range_count} รายการ</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleReset}
                                    className="text-xs text-slate-400 hover:text-slate-200 underline"
                                >
                                    แก้ไขข้อความต้นฉบับ
                                </button>
                            </div>

                            <label className="block rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                                <span className="font-semibold">Default Work Block สำหรับงานที่นำเข้า</span>
                                <select
                                    value={defaultScheduledBlock}
                                    onChange={(event) => setDefaultScheduledBlock(event.target.value as PlannerScheduledBlock)}
                                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
                                >
                                    {WORK_BLOCKS.map(block => (
                                        <option key={block.key} value={block.key}>{block.label}</option>
                                    ))}
                                </select>
                                <span className="mt-2 block text-xs text-slate-500">
                                    Planner Items ที่นำเข้าครั้งนี้จะอยู่ใน Work Block นี้ โดยค่าเริ่มต้นคือ Morning Focus
                                </span>
                            </label>

                            {/* Unresolved Warning Banners */}
                            {preview.unresolved_warnings.length > 0 && (
                                <div className="bg-amber-950/60 border border-amber-800/80 p-4 rounded-xl text-amber-200 text-sm space-y-1">
                                    <div className="font-bold">⚠️ รายการคำเตือนก่อนการนำเข้า:</div>
                                    <ul className="list-disc list-inside text-xs space-y-1 text-amber-300">
                                        {preview.unresolved_warnings.map((w, idx) => (
                                            <li key={idx}>{w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Days Cards */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-300">พรีวิวจำแนกตามวัน (Parsed Days Preview):</h3>

                                {preview.schedule.days.map((day, dIdx) => (
                                    <div key={dIdx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                                        <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
                                            <div>
                                                <span className="text-xs text-slate-500 font-mono uppercase mr-2">DAY {dIdx + 1}</span>
                                                <span className="font-bold text-emerald-400">{day.date_text}</span>
                                                {day.parsed_date && (
                                                    <span className="ml-2 text-xs text-slate-400 font-mono">({day.parsed_date})</span>
                                                )}
                                            </div>

                                            {day.is_date_range && (
                                                <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-700/80 px-3 py-1 rounded-lg">
                                                    <span className="text-xs text-amber-300">ระบุวันที่จริง:</span>
                                                    <input
                                                        type="date"
                                                        value={day.parsed_date || ""}
                                                        onChange={(e) => handleResolveDate(dIdx, e.target.value)}
                                                        className="bg-slate-900 border border-amber-600 rounded text-xs text-white px-2 py-1 focus:outline-none focus:border-emerald-500 font-mono"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-xs text-slate-300">
                                            <span className="text-slate-400">Main Outcome: </span>
                                            <span className="font-medium text-slate-200">{day.main_outcome ?? "ไม่ระบุ"}</span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                                            <div className="rounded border border-slate-800 bg-slate-900/70 p-2">
                                                <span className="text-slate-500">Capacity: </span>
                                                <span className="text-slate-200">{day.daily_capacity_minutes ?? "ไม่ระบุ"}</span>
                                            </div>
                                            <div className="rounded border border-slate-800 bg-slate-900/70 p-2">
                                                <span className="text-slate-500">Energy: </span>
                                                <span className="text-slate-200">{day.energy_level ?? "ไม่รองรับ/ไม่ระบุ"}</span>
                                            </div>
                                            <div className="rounded border border-slate-800 bg-slate-900/70 p-2">
                                                <span className="text-slate-500">Planner Status: </span>
                                                <span className="text-slate-200">{day.planner_status ?? "ไม่รองรับ/ไม่ระบุ"}</span>
                                            </div>
                                        </div>

                                        {day.warnings.length > 0 && (
                                            <ul className="list-disc space-y-1 rounded border border-amber-800/70 bg-amber-950/40 p-3 pl-7 text-xs text-amber-300">
                                                {day.warnings.map((warning, warningIndex) => (
                                                    <li key={warningIndex}>{warning}</li>
                                                ))}
                                            </ul>
                                        )}

                                        {/* Tasks list */}
                                        <div className="space-y-2">
                                            <div className="text-xs font-semibold text-slate-400">รายการงาน ({day.tasks.length}):</div>
                                            {day.tasks.map((task, tIdx) => (
                                                <div key={tIdx} className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg text-xs flex justify-between items-center">
                                                    <div>
                                                        <span className="text-slate-500 mr-2">{tIdx + 1}.</span>
                                                        <span className="text-slate-200 font-medium">{task.title}</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                                        {task.category || "งานหลัก"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* DoD & Notes preview */}
                                        {(day.dods.length > 0 || day.decision_points.length > 0 || day.do_not_dos.length > 0) && (
                                            <div className="text-[11px] text-slate-400 bg-slate-900/50 p-2.5 rounded border border-slate-800/60 space-y-1">
                                                {day.dods.length > 0 && (
                                                    <div><strong className="text-slate-300">DoD:</strong> {day.dods.map(d => d.raw_text).join(" | ")}</div>
                                                )}
                                                {day.decision_points.length > 0 && (
                                                    <div><strong className="text-amber-400">Gates/Decision Points:</strong> {day.decision_points.map(dp => dp.raw_text).join(" | ")}</div>
                                                )}
                                                {day.do_not_dos.length > 0 && (
                                                    <div><strong className="text-rose-400">ไม่ควรทำ:</strong> {day.do_not_dos.join(" | ")}</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
                    {!executionResult && !preview ? (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handlePreview}
                                disabled={isLoading || !rawText.trim()}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-lg shadow-emerald-950/50 transition flex items-center gap-2"
                            >
                                {isLoading ? "กำลังประมวลผล พรีวิว..." : "ดูพรีวิวตารางงาน (Preview)"}
                            </button>
                        </>
                    ) : !executionResult && preview ? (
                        <>
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
                            >
                                ย้อนกลับ
                            </button>
                            <button
                                onClick={handleExecuteImport}
                                disabled={isLoading || !selectedProjectId || preview.stats.unresolved_range_count > 0 || preview.stats.blocking_warning_count > 0}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-lg shadow-lg shadow-emerald-950/50 transition flex items-center gap-2"
                            >
                                {isLoading ? "กำลังนำเข้าข้อมูล..." : "ยืนยันนำเข้าตารางงาน (Confirm Import)"}
                            </button>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
