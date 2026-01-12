import { useState, useCallback } from "react";
import { Task } from "@/lib/types";

export function useTaskEditor() {
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [initialTab, setInitialTab] = useState<"details" | "doc" | "files">("details");

    const openEditor = useCallback((task: Task, tab: "details" | "doc" | "files" = "details") => {
        setInitialTab(tab);
        setEditingTask(task);
    }, []);

    const closeEditor = useCallback(() => {
        setEditingTask(null);
    }, []);

    return {
        editingTask,
        setEditingTask,
        initialTab,
        setInitialTab,
        openEditor,
        closeEditor,
    };
}
