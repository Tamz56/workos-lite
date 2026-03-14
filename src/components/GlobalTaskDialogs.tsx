"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskEditorDialog from "@/components/TaskEditorDialog";
import { Workspace, WORKSPACES_LIST } from "@/lib/workspaces";
import { Task } from "@/lib/types";

export function GlobalTaskDialogs() {
    const sp = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

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
        router.replace(params.toString() ? `?${params.toString()}` : pathname, { scroll: false });
    };

    // 2. New Task Dialog (?newTask=1&workspace=...)
    const isNewTaskOpen = sp.get("newTask") === "1";
    const workspaceParam = sp.get("workspace") as Workspace | null;
    const listIdParam = sp.get("list_id");
    const parentTaskIdParam = sp.get("parent_task_id");

    // Default dummy task for creation
    const newTaskInitial = useMemo(() => {
        // Fallback logic: 
        // 1. Param (?workspace=...)
        // 2. Pathname (if it's /workspaces/[id] or /[workspace]/...)
        // 3. First available workspace from list (configured default)
        
        let ws: Workspace | null = workspaceParam;

        if (!ws) {
            const parts = pathname.split("/");
            // Check /workspaces/[slug]
            if (parts[1] === "workspaces" && parts[2]) {
                ws = parts[2] as Workspace;
            } 
            // Check /[workspace]/planner etc
            else if (parts[1] && parts[1] !== "dashboard" && parts[1] !== "projects" && parts[1] !== "today" && parts[1] !== "inbox") {
                // Potential workspace slug in first part
                ws = parts[1] as Workspace;
            }
        }

        // Final fallback to the first workspace in the list if still null
        const finalWs: Workspace = ws || (WORKSPACES_LIST[0]?.id as Workspace) || "avacrm";

        return {
            id: "new",
            title: "",
            workspace: finalWs,
            status: "inbox",
            list_id: listIdParam || null,
            parent_task_id: parentTaskIdParam || null,
            sort_order: null,
        } as Task;
    }, [workspaceParam, listIdParam, parentTaskIdParam]);

    const closeNewTask = () => {
        const params = new URLSearchParams(sp.toString());
        params.delete("newTask");
        params.delete("workspace");
        params.delete("list_id");
        params.delete("parent_task_id");
        router.replace(params.toString() ? `?${params.toString()}` : pathname, { scroll: false });
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
