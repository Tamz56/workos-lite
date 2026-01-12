"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toErrorMessage } from "@/lib/error";

type DocRow = {
    id: string;
    title: string;
    content_md: string;
    created_at: string;
    updated_at: string;
};

function formatThai(dt: string) {
    try {
        return new Date(dt).toLocaleString("th-TH", { hour12: false });
    } catch {
        return dt;
    }
}

export default function DocClient({ id }: { id: string }) {
    const router = useRouter();

    const [doc, setDoc] = useState<DocRow | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);

    const tRef = useRef<number | null>(null);
    const pendingRef = useRef<Partial<Pick<DocRow, "title" | "content_md">>>({});
    const mountedRef = useRef(true);

    async function load() {
        setErr(null);
        const res = await fetch(`/api/docs/${id}`, { cache: "no-store" });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Load doc failed (${res.status}): ${text || res.statusText}`);
        }
        const row = (await res.json()) as DocRow;
        return row;
    }

    async function patch(next: Partial<Pick<DocRow, "title" | "content_md">>) {
        setSaving(true);
        setSaved(false);
        setErr(null);

        try {
            const payload = { ...next };
            if (typeof payload.title === "string") {
                payload.title = payload.title.trim() || "Untitled";
            }

            const res = await fetch(`/api/docs/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`Save failed (${res.status}): ${text || res.statusText}`);
            }

            const updated = (await res.json()) as DocRow;
            if (!mountedRef.current) return;

            setDoc(updated);
            setLastSaved(new Date().toISOString());
            setSaved(true);
        } catch (e: unknown) {
            if (!mountedRef.current) return;
            setErr(toErrorMessage(e));
        } finally {
            if (!mountedRef.current) return;
            setSaving(false);
        }
    }

    function scheduleSave(next: Partial<Pick<DocRow, "title" | "content_md">>) {
        pendingRef.current = { ...pendingRef.current, ...next };

        if (tRef.current) window.clearTimeout(tRef.current);
        tRef.current = window.setTimeout(() => {
            const payload = pendingRef.current;
            pendingRef.current = {};
            patch(payload);
        }, 600); // debounce 600ms
    }

    async function flushPending() {
        const payload = pendingRef.current;
        if (Object.keys(payload).length === 0) return;
        pendingRef.current = {};
        if (tRef.current) window.clearTimeout(tRef.current);
        await patch(payload);
    }

    useEffect(() => {
        mountedRef.current = true;

        load()
            .then((row) => setDoc(row))
            .catch((e) => setErr(toErrorMessage(e)));

        return () => {
            mountedRef.current = false;
            if (tRef.current) window.clearTimeout(tRef.current);
            pendingRef.current = {};
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // const title = doc?.title ?? "Untitled"; // Unused

    const updatedAtText = useMemo(() => (doc ? formatThai(doc.updated_at) : ""), [doc]);

    async function onDelete() {
        const name = (doc?.title || "Untitled").trim() || "Untitled";
        const ok = window.confirm(`ลบเอกสาร "${name}" ถาวร? (กู้คืนไม่ได้)`);
        if (!ok) return;

        try {
            const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`Delete failed (${res.status}): ${text || res.statusText}`);
            }
            router.push("/docs");
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        }
    }

    if (err) {
        return (
            <div className="mx-auto max-w-4xl px-6 py-10">
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {err}
                </div>
                <button className="mt-4 text-sm underline" onClick={() => router.push("/docs")}>
                    กลับไป Docs
                </button>
            </div>
        );
    }

    if (!doc) {
        return (
            <div className="mx-auto max-w-4xl px-6 py-10">
                <div className="text-sm text-neutral-600">กำลังโหลด...</div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-6 py-10">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <input
                        className="w-full rounded-md border px-4 py-3 text-2xl font-semibold"
                        value={doc.title}
                        onChange={(e) => {
                            const nextTitle = e.target.value;
                            setDoc((prev) => (prev ? { ...prev, title: nextTitle } : prev));
                            scheduleSave({ title: nextTitle });
                        }}
                    />
                    <div className="mt-2 text-xs text-neutral-600">อัปเดตล่าสุด: {updatedAtText}</div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-xs text-neutral-500">
                        {saving ? "Saving..." : saved ? "Saved" : ""}
                    </div>

                    <button
                        className="rounded-md border px-4 py-2 text-sm hover:bg-neutral-50"
                        onClick={async () => {
                            await flushPending();
                            router.push("/docs");
                        }}
                    >
                        Back
                    </button>

                    <button
                        className="rounded-md border px-4 py-2 text-sm hover:bg-neutral-50"
                        onClick={async () => {
                            await flushPending();
                            router.push(`/docs/${id}/print`);
                        }}
                    >
                        Print
                    </button>

                    <button
                        className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                        onClick={onDelete}
                    >
                        Delete
                    </button>
                </div>
            </div>

            <div className="mt-6">
                <textarea
                    className="min-h-[560px] w-full rounded-md border px-4 py-3 text-sm"
                    placeholder="เขียน Markdown ที่นี่..."
                    value={doc.content_md}
                    onChange={(e) => {
                        const nextMd = e.target.value;
                        setDoc((prev) => (prev ? { ...prev, content_md: nextMd } : prev));
                        scheduleSave({ content_md: nextMd });
                    }}
                />
                <div className="mt-2 text-right text-xs text-neutral-500">
                    {lastSaved ? `LAST SAVED: ${formatThai(lastSaved)}` : ""}
                </div>
            </div>
        </div>
    );
}
