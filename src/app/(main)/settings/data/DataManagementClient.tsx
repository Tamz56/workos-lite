"use client";

import { useState } from "react";
import { ResetDemoDataDialog } from "@/components/ResetDemoDataDialog";
import { BUTTON_DANGER } from "@/lib/styles";
import { RefreshCcw, Database, Eye, Play, Sparkles } from "lucide-react";
import { Toast } from "@/components/ui/Toast";

export default function DataManagementClient() {
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [toastMsg, setToastMsg] = useState("Reset Successful! Redirecting...");

    const [proposedChanges, setProposedChanges] = useState<any[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [applyLoading, setApplyLoading] = useState(false);
    const [migrationMessage, setMigrationMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handlePreviewMigration = async () => {
        setPreviewLoading(true);
        setMigrationMessage(null);
        try {
            const res = await fetch("/api/admin/clean-legacy-titles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "preview" })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to scan");

            setProposedChanges(data.proposedChanges || []);
            setMigrationMessage({
                type: "success",
                text: `การแสกนพบคงเหลือแถวที่มีเลขนำหน้า: ${data.proposedChanges.length} รายการ`
            });
        } catch (err: any) {
            setMigrationMessage({ type: "error", text: err.message });
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleApplyMigration = async () => {
        if (proposedChanges.length === 0) {
            alert("กรุณากดปุ่ม Preview เพื่อตรวจสอบรายการปรับปรุงก่อนดำเนินการ");
            return;
        }

        const confirmApply = window.confirm(`คุณแน่ใจหรือไม่ที่จะทำการย้ายรหัสตัวเลขและทำความสะอาดชื่อของชิ้นงานทั้งสิ้น ${proposedChanges.length} รายการ?`);
        if (!confirmApply) return;

        setApplyLoading(true);
        setMigrationMessage(null);
        try {
            const res = await fetch("/api/admin/clean-legacy-titles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "apply" })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to clean");

            setProposedChanges([]);
            setToastMsg(data.message || "จัดระเบียบชื่อตอนสำเร็จ!");
            setShowSuccessToast(true);
            setMigrationMessage({
                type: "success",
                text: data.message || "ดำเนินการปรับปรุงข้อมูลเรียบร้อย!"
            });
        } catch (err: any) {
            setMigrationMessage({ type: "error", text: err.message });
        } finally {
            setApplyLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Title Naming Clean up Migration Panel */}
            <div className="rounded-2xl border bg-white/50 p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500" />
                    Content Naming & Prefix Migration
                </h2>
                <p className="text-sm text-neutral-600">
                    แสกนหาชื่อตอนที่มีรหัสตัวเลขนำหน้า (เช่น <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs">07090 — EP.9.2</code>)
                    เพื่อย้ายตัวเลขรหัสเก่าไปไว้ในฟิลด์ <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs">notes.legacyId</code> เพื่อความเป็นระเบียบและไม่สับสนหน้าชื่อจริง
                </p>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handlePreviewMigration}
                        disabled={previewLoading || applyLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-50"
                    >
                        <Eye className="w-4 h-4" />
                        <span>Preview Changes</span>
                    </button>
                    <button
                        onClick={handleApplyMigration}
                        disabled={applyLoading || previewLoading || proposedChanges.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Apply Title Cleanup ({proposedChanges.length})</span>
                    </button>
                </div>

                {migrationMessage && (
                    <div className={`p-3.5 rounded-xl border text-xs font-bold ${
                        migrationMessage.type === "success" 
                            ? "bg-green-50 border-green-200 text-green-700" 
                            : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                        {migrationMessage.text}
                    </div>
                )}

                {proposedChanges.length > 0 && (
                    <div className="border border-neutral-200 rounded-xl overflow-hidden text-xs max-h-[250px] overflow-y-auto font-mono bg-white">
                        <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 font-bold flex justify-between text-neutral-600">
                            <span>Proposed Changes (รายการจำลองเปลี่ยนชื่อ)</span>
                            <span>{proposedChanges.length} items</span>
                        </div>
                        <div className="divide-y divide-neutral-100">
                            {proposedChanges.map((item, idx) => (
                                <div key={idx} className="p-3 hover:bg-neutral-50 space-y-1">
                                    <div className="flex items-center gap-1">
                                        <span className="bg-amber-100 text-amber-700 px-1 py-0.5 rounded text-[10px] font-bold">
                                            ID: {item.legacyId}
                                        </span>
                                        <span className="text-neutral-400 text-[10px]">{item.projectId}</span>
                                    </div>
                                    <div className="text-red-500 line-through truncate">
                                        - {item.oldTitle}
                                    </div>
                                    <div className="text-green-600 font-bold truncate">
                                        + {item.newTitle}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl border border-red-100 bg-red-50/30 p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-800 mb-2 flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4" />
                    Danger Zone
                </h3>
                <p className="text-sm text-neutral-600 mb-4">
                    Reset your workspace to clear demo content or start fresh with a clean slate.
                </p>
                <button 
                    onClick={() => setIsResetOpen(true)}
                    className={BUTTON_DANGER}
                >
                    Reset Demo Data...
                </button>
            </div>

            <ResetDemoDataDialog
                isOpen={isResetOpen}
                onClose={() => setIsResetOpen(false)}
                onSuccess={() => {
                    setIsResetOpen(false);
                    setToastMsg("Reset Successful! Redirecting...");
                    setShowSuccessToast(true);
                    setTimeout(() => {
                        window.location.href = "/dashboard";
                    }, 2500);
                }}
            />

            <Toast 
                isVisible={showSuccessToast} 
                message={toastMsg} 
                onClose={() => setShowSuccessToast(false)} 
            />
        </div>
    );
}
