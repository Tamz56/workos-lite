import { useState, useEffect, useCallback } from "react";

export type GroupMode = "status" | "list" | "sprint" | "package";
export type SortMode = "scheduled_date" | "updated_at" | "priority" | "created_at" | "performance";

const PREFS_KEY_PREFIX = "workos-areas-prefs-";
const GLOBAL_LAST_WS_KEY = "workos-last-workspace";

const PERSISTENT_FIELDS = [
    "sortBy", "sortDir", "groupBy", "scheduleFilter", "viewMode", 
    "collapsedTopicIds", "statusFilter", "templateFilter", "reviewStatusFilter",
    "lastActiveTaskId"
] as const;

export interface AreasViewState {
    search: string;
    statusFilter: string[];
    workspaceFilter: string[];
    listFilter: string[];
    sprintFilter: string[];
    templateFilter: string[];
    reviewStatusFilter: string[];
    onlyReadyToPublish: boolean;
    scheduleFilter: 'all' | 'scheduled' | 'unscheduled';
    dateRange: {
        start?: string;
        end?: string;
    };
    activePreset: string | null;
    sortBy: SortMode;
    sortDir: "asc" | "desc";
    groupBy: GroupMode;
    selectedTaskId: string | null;
    isQuickAddOpen: boolean;
    isTableQuickAddOpen: boolean;
    inlineQuickAddTopicId: string | null;
    inlineQuickAddTopicTitle: string | null;
    isPackageModalOpen: boolean;
    collapsedTopicIds: string[];
    viewMode: "package" | "list";
    lastActiveTaskId: string | null;
    isFlowMode: boolean;
    selectedTaskIds: string[]; // RC65: Bulk Selection
}

export function useAreasState(workspaceId: string, initialState?: Partial<AreasViewState>) {
    const defaultState: AreasViewState = {
        search: "",
        statusFilter: [],
        workspaceFilter: [],
        listFilter: [],
        sprintFilter: [],
        templateFilter: [],
        reviewStatusFilter: [],
        onlyReadyToPublish: false,
        scheduleFilter: "all",
        dateRange: {},
        activePreset: "all",
        sortBy: "scheduled_date",
        sortDir: "asc",
        groupBy: "status",
        selectedTaskId: null,
        isQuickAddOpen: false,
        isTableQuickAddOpen: false,
        inlineQuickAddTopicId: null,
        inlineQuickAddTopicTitle: null,
        isPackageModalOpen: false,
        collapsedTopicIds: [],
        viewMode: "package",
        lastActiveTaskId: null,
        isFlowMode: false,
        selectedTaskIds: [],
    };

    const validate = (key: string, value: any): boolean => {
        if (key === "viewMode") return ["package", "list"].includes(value);
        if (key === "sortBy") return ["scheduled_date", "updated_at", "priority", "created_at", "performance"].includes(value);
        if (key === "sortDir") return ["asc", "desc"].includes(value);
        if (key === "groupBy") return ["status", "list", "sprint", "package"].includes(value);
        if (key === "scheduleFilter") return ["all", "scheduled", "unscheduled"].includes(value);
        if (key === "collapsedTopicIds") return Array.isArray(value) && value.every(v => typeof v === "string");
        if (["statusFilter", "templateFilter", "reviewStatusFilter"].includes(key)) return Array.isArray(value);
        return true;
    };

    const [isHydrated, setIsHydrated] = useState(false);
    const [sessionLoadedId, setSessionLoadedId] = useState<string | null>(null);
    const [state, setState] = useState<AreasViewState>(() => ({ ...defaultState, ...initialState }));

    const updateState = useCallback((updates: Partial<AreasViewState>) => {
        setState(prev => {
            const next = { ...prev, ...updates };
            const filterFieldsChanged = Object.keys(updates).some(k => 
                ["statusFilter", "templateFilter", "reviewStatusFilter", "onlyReadyToPublish", "scheduleFilter", "dateRange", "search"].includes(k)
            );
            if (filterFieldsChanged && next.activePreset) {
                next.activePreset = null; 
            }
            return next;
        });
    }, []);

    // RC34: Hydrate from localStorage
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const saved = localStorage.getItem(`${PREFS_KEY_PREFIX}${workspaceId}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                const updates: any = {};
                PERSISTENT_FIELDS.forEach(field => {
                    if (parsed[field] !== undefined && validate(field, parsed[field])) {
                        let val = parsed[field];
                        if (field === "collapsedTopicIds" && val.length > 100) val = val.slice(0, 100);
                        updates[field] = val;
                    }
                });
                setState(prev => ({ ...prev, ...updates }));
            }
        } catch (e) {
            console.warn("Failed to load areas preferences", e);
        } finally {
            setIsHydrated(true);
        }
    }, [workspaceId]);

    // RC35 & RC43B: Last Workspace & Recent Tracking
    useEffect(() => {
        if (workspaceId && typeof window !== "undefined") {
            localStorage.setItem(GLOBAL_LAST_WS_KEY, workspaceId);
            try {
                const key = "workos-recent-workspaces";
                const currentRaw = localStorage.getItem(key);
                let recents: string[] = currentRaw ? JSON.parse(currentRaw) : [];
                recents = recents.filter(id => id !== workspaceId);
                recents.unshift(workspaceId);
                if (recents.length > 5) recents = recents.slice(0, 5);
                localStorage.setItem(key, JSON.stringify(recents));
            } catch (e) {
                console.warn("Failed to update recent workspaces", e);
            }
        }
    }, [workspaceId]);

    // RC43A: Per-Workspace Flow Mode (Session-only)
    // 1. Initial Load
    useEffect(() => {
        if (!workspaceId || workspaceId === "global" || typeof window === "undefined") return;
        
        const key = `workos-flow-mode-${workspaceId}`;
        const saved = sessionStorage.getItem(key);
        if (saved !== null) {
            setState(prev => ({ ...prev, isFlowMode: saved === "true" }));
        } else {
            setState(prev => ({ ...prev, isFlowMode: false }));
        }
        setSessionLoadedId(workspaceId);
    }, [workspaceId]);

    // 2. Continuous Sync (Only after load for current ID)
    useEffect(() => {
        if (!workspaceId || workspaceId === "global" || typeof window === "undefined" || sessionLoadedId !== workspaceId) return;
        
        const key = `workos-flow-mode-${workspaceId}`;
        sessionStorage.setItem(key, state.isFlowMode.toString());
    }, [workspaceId, state.isFlowMode, sessionLoadedId]);

    // RC35: Truthful Preset Re-computation
    useEffect(() => {
        if (!isHydrated) return;
        const s = state;
        let matched: string | null = null;
        const isAll = s.statusFilter.length === 0 && s.templateFilter.length === 0 && s.scheduleFilter === "all" && !s.dateRange.start;
        if (isAll) matched = "all";
        else if (s.scheduleFilter === "unscheduled" && !s.dateRange.start) matched = "unscheduled";
        else if (s.templateFilter.length === 1) {
            if (s.templateFilter[0] === "article") matched = "articles";
            else if (s.templateFilter[0] === "short_video") matched = "videos";
            else if (s.templateFilter[0] === "carousel") matched = "carousels";
        } else if (s.statusFilter.length === 1 && s.statusFilter[0] === "done") {
            matched = "done";
        }
        if (matched !== state.activePreset) {
            setState(prev => ({ ...prev, activePreset: matched }));
        }
    }, [isHydrated, state.statusFilter, state.templateFilter, state.scheduleFilter, state.dateRange.start, state.dateRange.end]);

    // Save preferences on change
    useEffect(() => {
        if (!workspaceId || !isHydrated) return;
        const prefs: Partial<AreasViewState> = {};
        PERSISTENT_FIELDS.forEach(field => {
            (prefs as any)[field] = state[field];
        });
        try {
            localStorage.setItem(`${PREFS_KEY_PREFIX}${workspaceId}`, JSON.stringify(prefs));
        } catch (e) {
            console.error("Failed to save areas preferences", e);
        }
    }, [workspaceId, isHydrated, state.viewMode, state.sortBy, state.sortDir, state.groupBy, state.scheduleFilter, state.collapsedTopicIds, state.statusFilter, state.templateFilter, state.reviewStatusFilter, state.lastActiveTaskId]);

    return {
        state,
        updateState,
    };
}
