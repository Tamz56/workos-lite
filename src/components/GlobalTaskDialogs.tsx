"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskEditorDialog from "@/components/TaskEditorDialog";
import { Workspace } from "@/lib/workspaces";
import { Task } from "@/lib/types";

export function GlobalTaskDialogs() {
    const sp = useSearchParams();
    const router = useRouter();

    // 1. Task Detail Dialog (?taskId=...)
    const taskId = sp.get("taskId");
    const [task, setTask] = React.useState<Task | null>(null);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        if (!taskId) {
            setTask(null);
            return;
        }
        // Fetch task
        setLoading(true);
        fetch(`/api/tasks?id=${taskId}`, { cache: "no-store", headers: { 'Pragma': 'no-cache' } })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) setTask(data[0]);
                else setTask(null); // Not found
            })
            .catch(() => setTask(null))
            .finally(() => setLoading(false));
    }, [taskId]);

    const closeDetail = () => {
        const params = new URLSearchParams(sp.toString());
        params.delete("taskId");
        router.replace(params.toString() ? `?${params.toString()}` : window.location.pathname, { scroll: false });
    };

    // 2. New Task Dialog (?newTask=1&workspace=...)
    const isNewTaskOpen = sp.get("newTask") === "1";
    const workspaceParam = sp.get("workspace") as Workspace | null;

    // Default dummy task for creation
    const newTaskInitial = useMemo(() => ({
        id: "new",
        title: "",
        workspace: workspaceParam || "avacrm", // Default or from param
        status: "inbox",
    } as Task), [workspaceParam]);

    const closeNewTask = () => {
        const params = new URLSearchParams(sp.toString());
        params.delete("newTask");
        params.delete("workspace");
        router.replace(params.toString() ? `?${params.toString()}` : window.location.pathname, { scroll: false });
    };

    const handleSuccess = () => {
        router.refresh();
    };

    return (
        <>
            {taskId && !loading && task && (
                <TaskDetailDialog
                    isOpen={!!task}
                    onClose={closeDetail}
                    task={task}
                    onUpdate={handleSuccess}
                />
            )}

            {isNewTaskOpen && (
                <TaskEditorDialog
                    isOpen={isNewTaskOpen}
                    onClose={closeNewTask}
                    task={newTaskInitial}
                    onUpdate={() => {
                        handleSuccess();
                        setTask(null); // Force reset
                        closeNewTask(); // Close modal
                    }}
                />
            )}
        </>
    );
}
