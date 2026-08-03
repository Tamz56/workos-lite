import type { ProjectDocBlocksUiState } from "@/lib/project-doc-blocks/useProjectDocBlocks";

export function ProjectDocBlocksSourceStatus({ state }: { state: ProjectDocBlocksUiState }) {
    if (state.status === "loading" || state.status === "idle") {
        return <p className="text-xs text-neutral-400">กำลังโหลด Project Documentation...</p>;
    }
    if (state.status === "error") {
        return <p className="text-xs text-red-600" role="alert">{state.error}</p>;
    }
    if (state.source === "fallback") {
        return (
            <p className="text-xs text-amber-700" role="status">
                กำลังแสดงข้อมูลสำรองจากเบราว์เซอร์ เนื่องจากไม่สามารถเชื่อมต่อฐานข้อมูลได้
            </p>
        );
    }
    return <p className="text-xs text-emerald-700" role="status">ข้อมูลจาก WorkOS Database</p>;
}

export function ProjectDocBlocksReadOnlyActions({
    source = "fallback",
    onAddBlock,
    onImportLog,
    onArborAssistant
}: {
    source?: "api" | "fallback" | null;
    onAddBlock?: () => void;
    onImportLog?: () => void;
    onArborAssistant?: () => void;
} = {}) {
    const isFallback = source !== "api";
    const buttonClass = (enabled: boolean) =>
        `px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ` +
        (enabled
            ? "border-black bg-black text-white hover:bg-neutral-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 cursor-pointer active:scale-95"
            : "border-neutral-200 text-neutral-400 opacity-50 cursor-not-allowed");

    return (
        <div className="flex items-center gap-2" aria-label="Project Documentation write controls">
            <button
                type="button"
                disabled={isFallback}
                aria-disabled={isFallback}
                title={isFallback ? "ไม่สามารถบันทึกได้ขณะใช้ข้อมูลสำรองจากเบราว์เซอร์" : "Add Block"}
                className={buttonClass(!isFallback)}
                onClick={onAddBlock}
            >
                Add Block
            </button>
            <button
                type="button"
                disabled={isFallback}
                aria-disabled={isFallback}
                title={isFallback ? "ไม่สามารถบันทึกได้ขณะใช้ข้อมูลสำรองจากเบราว์เซอร์" : "Import Log"}
                className={buttonClass(!isFallback)}
                onClick={onImportLog}
            >
                Import Log
            </button>
            <button
                type="button"
                disabled={isFallback}
                aria-disabled={isFallback}
                title={isFallback ? "ไม่สามารถบันทึกได้ขณะใช้ข้อมูลสำรองจากเบราว์เซอร์" : "Arbor Assistant"}
                className={buttonClass(!isFallback)}
                onClick={onArborAssistant}
            >
                Arbor Assistant
            </button>
        </div>
    );
}

export function ProjectDocBlocksEmptyState({ filtered = false }: { filtered?: boolean }) {
    return (
        <p className="text-neutral-400 font-medium italic text-sm dark:text-neutral-500">
            {filtered
                ? "ไม่พบบล็อกเอกสารที่สอดคล้องกับตัวกรอง"
                : "ยังไม่มี Project Documentation ในโปรเจกต์นี้"}
        </p>
    );
}
