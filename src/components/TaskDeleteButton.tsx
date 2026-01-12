"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import DangerIconButton from "@/components/ui/DangerIconButton";
import { toErrorMessage } from "@/lib/error";

type Props = {
    taskId: string;
    taskTitle?: string;
    disabled?: boolean;
    onDeleted?: () => void; // ให้ parent เอา task ออกจาก list (optimistic)
};

export default function TaskDeleteButton({ taskId, taskTitle, disabled, onDeleted }: Props) {
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const title = (taskTitle ?? "").trim() || "Untitled";

    function stop(e?: React.SyntheticEvent) {
        e?.preventDefault?.();
        e?.stopPropagation?.();
    }

    async function doDelete(e?: React.SyntheticEvent) {
        stop(e);
        setDeleting(true);
        try {
            const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                throw new Error(`Delete failed (${res.status}): ${text || res.statusText}`);
            }
            onDeleted?.();
            setOpen(false);
            setOpen(false);
        } catch (err: unknown) {
            alert(toErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    }

    return (
        <>
            <DangerIconButton
                title="Delete"
                disabled={disabled || deleting}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(true);
                }}
            />

            <ConfirmDialog
                isOpen={open}
                title="Delete Task"
                message={`Are you sure you want to delete this task?\n\n${title}\n\nThis cannot be undone.`}
                confirmText={deleting ? "Deleting..." : "Delete"}
                danger={true}
                onConfirm={(e?: React.MouseEvent) => doDelete(e)}
                onCancel={(e?: React.MouseEvent) => {
                    stop(e);
                    setOpen(false);
                }}
            />
        </>
    );
}
