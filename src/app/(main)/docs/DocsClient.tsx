"use client";

import DangerIconButton from "@/components/ui/DangerIconButton";
import { type DocRow } from "./types";

type Props = {
    docs: DocRow[];
    q: string;
    onQChange: (v: string) => void;
    onOpen: (id: string) => void;
    onDelete: (doc: DocRow) => void;
    deletingId: string | null;
    loading?: boolean;
    formatThai: (dt: string) => string;
};

export default function DocsClient({
    docs,
    q,
    onQChange,
    onOpen,
    onDelete,
    deletingId,
    loading,
    formatThai,
}: Props) {
    return (
        <div>
            <input
                value={q}
                onChange={(e) => onQChange(e.target.value)}
                placeholder="ค้นหาเอกสาร..."
                className="w-full border rounded-md px-4 py-3 text-sm"
            />

            <div className="mt-6 space-y-4">
                {loading ? (
                    <div className="text-sm text-gray-500 italic">Loading...</div>
                ) : docs.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">ยังไม่มีเอกสาร หรือไม่พบเอกสารที่ค้นหา</div>
                ) : (
                    docs.map((d) => (
                        <div
                            key={d.id}
                            className="group relative border rounded-xl p-6 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => onOpen(d.id)}
                        >
                            <div className="text-lg font-semibold truncate">{d.title || "Untitled"}</div>
                            <div className="text-xs text-gray-500 mt-2">อัปเดต: {formatThai(d.updated_at)}</div>

                            {/* Delete icon: โผล่เมื่อ hover (พรีเมียม + ไม่รก) */}
                            <DangerIconButton
                                className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                                title="Delete"
                                disabled={deletingId === d.id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onDelete(d);
                                }}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
