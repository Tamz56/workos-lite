"use client";

import { useEffect, useRef, useState } from "react";
import { toErrorMessage } from "@/lib/error";

type Props = {
    id: string;
    title: string;
    disabled?: boolean;
    onSaved?: (nextTitle: string) => void; // อัปเดต state ภายนอก
};

export default function TaskTitleInlineEdit({ id, title, onSaved }: Props) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(title);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => setVal(title), [title]);

    useEffect(() => {
        if (editing) setTimeout(() => inputRef.current?.focus(), 0);
    }, [editing]);

    async function save() {
        const next = val.trim();
        if (!next || next === title.trim()) {
            setEditing(false);
            setVal(title);
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/tasks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: next }),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`Update task title failed (${res.status}): ${text || res.statusText}`);
            }

            onSaved?.(next);
            onSaved?.(next);
            setEditing(false);
        } catch (e: unknown) {
            console.error(e);
            alert(toErrorMessage(e));
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return (
            <span
                className="font-medium truncate max-w-[500px] cursor-pointer"
                title={title}
                // No propagation stop here -> allows bubbling to parent for opening Modal
                onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setVal(title);
                    setEditing(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === "F2") {
                        e.preventDefault();
                        e.stopPropagation();
                        setVal(title);
                        setEditing(true);
                    }
                }}
                tabIndex={0}
                role="button"
            >
                {title}
            </span>
        );
    }

    return (
        <div className="flex min-w-0 items-center gap-2">
            <input
                ref={inputRef}
                className="h-8 w-full min-w-0 rounded-md border border-blue-500 px-2 text-sm focus:outline-none"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => {
                    // Stop propagation so parent doesn't handle keyboard events while editing
                    e.stopPropagation();
                    if (e.key === "Enter") {
                        e.preventDefault();
                        void save();
                        return;
                    }
                    if (e.key === "Escape") {
                        e.preventDefault();
                        setEditing(false);
                        setVal(title);
                        return;
                    }
                }}
                onClick={(e) => {
                    // Stop propagation to prevent opening the Modal when clicking the input
                    e.stopPropagation();
                }}
                disabled={saving}
            />
            {saving && <span className="text-[10px] text-gray-400">Saving...</span>}
        </div>
    );
}
