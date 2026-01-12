"use client";

import { useRef, useState } from "react";
import { toErrorMessage } from "@/lib/error";

export default function RestoreBackupButton() {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    async function run(mode: "merge" | "replace") {
        setMsg(null);

        // เลือกไฟล์ก่อน
        inputRef.current?.click();

        // รอ user เลือกไฟล์ผ่าน onChange
        // เราจะเก็บ mode ไว้ใน dataset
        if (inputRef.current) inputRef.current.dataset.mode = mode;
    }

    async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const mode = (e.target.dataset?.mode as "merge" | "replace") || "merge";

        if (mode === "replace") {
            const ans = window.prompt('โหมด REPLACE จะล้างข้อมูลเดิมทั้งหมด\nพิมพ์ RESTORE เพื่อยืนยัน');
            if (ans !== "RESTORE") {
                e.target.value = "";
                return;
            }
        }

        setBusy(true);
        try {
            const text = await file.text();

            const res = await fetch(`/api/import?mode=${mode}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: text,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || `Import failed (${res.status})`);

            setMsg(
                `Restore OK (${mode}) — tasks: ${data.tasks_imported}, attachments: ${data.attachments_imported}, docs merged: ${data.docs_merged}`
            );
        } catch (err: unknown) {
            setMsg(toErrorMessage(err)); // Use standard error msg
        } finally {
            setBusy(false);
            e.target.value = "";
        }
    }

    return (
        <div className="mt-3">
            <input
                ref={inputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={onPick}
            />

            <div className="flex items-center gap-2">
                <button
                    disabled={busy}
                    onClick={() => run("merge")}
                    className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                    title="นำเข้าข้อมูลแบบ merge/upsert"
                >
                    Restore (Merge)
                </button>

                <button
                    disabled={busy}
                    onClick={() => run("replace")}
                    className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                    title="ล้างของเดิมแล้วทับทั้งหมด"
                >
                    Restore (Replace)
                </button>
            </div>

            {msg && <div className="mt-2 text-xs text-neutral-600">{msg}</div>}
        </div>
    );
}
