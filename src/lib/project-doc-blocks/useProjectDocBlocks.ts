"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectDocumentationBlock } from "@/lib/types";
import {
    createProjectDocBlocksRequestGuard,
    loadProjectDocBlocks,
    type ProjectDocBlocksFallbackReason,
    type ProjectDocBlocksSource
} from "./client";

export type ProjectDocBlocksUiState = {
    status: "idle" | "loading" | "ready" | "error";
    blocks: ProjectDocumentationBlock[];
    source: ProjectDocBlocksSource | null;
    fallbackReason?: ProjectDocBlocksFallbackReason;
    error?: string;
};

const INITIAL_STATE: ProjectDocBlocksUiState = {
    status: "idle",
    blocks: [],
    source: null
};

export function useProjectDocBlocks(
    projectId: string | null,
    projectSlug: string,
    status: "active" | "archived" | "all" = "active"
) {
    const guardRef = useRef<ReturnType<typeof createProjectDocBlocksRequestGuard> | null>(null);
    if (guardRef.current === null) guardRef.current = createProjectDocBlocksRequestGuard();
    const [state, setState] = useState<ProjectDocBlocksUiState>(INITIAL_STATE);
    const [trigger, setTrigger] = useState(0);

    const refetch = () => setTrigger(t => t + 1);

    useEffect(() => {
        const guard = guardRef.current;
        if (!guard || !projectId) {
            setState(INITIAL_STATE);
            return;
        }

        const ticket = guard.begin();
        setState({ status: "loading", blocks: [], source: null });

        void loadProjectDocBlocks({ projectId, projectSlug, status, signal: ticket.signal })
            .then(result => {
                if (!ticket.isCurrent()) return;
                if (result.status === "error") {
                    setState({
                        status: "error",
                        blocks: [],
                        source: result.source,
                        fallbackReason: result.fallbackReason,
                        error: result.message
                    });
                    return;
                }
                setState({
                    status: "ready",
                    blocks: result.blocks,
                    source: result.source,
                    fallbackReason: result.fallbackReason
                });
            })
            .catch(error => {
                if (!ticket.isCurrent() || (error instanceof Error && error.name === "AbortError")) return;
                setState({
                    status: "error",
                    blocks: [],
                    source: "api",
                    error: "ไม่สามารถโหลด Project Documentation ได้"
                });
            });

        return () => guard.cancel();
    }, [projectId, projectSlug, status, trigger]);

    return {
        ...state,
        refetch
    };
}
