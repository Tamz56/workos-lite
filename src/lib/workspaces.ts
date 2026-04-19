export const WORKSPACES = [
    "avacrm",
    "ops",
    "content",
    "finance",
    "travel",
    "admin",
    "marketing",
    "personal",
    "system",
    "inbox",
    "other",
] as const;

export interface WorkspaceConfig {
    id: string;
    label: string;
    type: string;
    iconKey: string;
    colorKey: string;
    description?: string;
    emptyState?: {
        title: string;
        description: string;
        actionLabel: string;
        actionType: 'quickAdd' | 'newPackage' | 'newList';
    };
}

export const WORKSPACES_LIST: readonly WorkspaceConfig[] = [
    { 
        id: "avacrm", label: "AVACRM", type: "admin", 
        iconKey: "Briefcase", colorKey: "indigo",
        emptyState: { title: "Manage your CRM", description: "Track clients and sales pipelines here.", actionLabel: "Add CRM Task", actionType: "quickAdd" }
    },
    { 
        id: "ops", label: "OPS", type: "ops", 
        iconKey: "Settings", colorKey: "emerald",
        emptyState: { title: "Operations are clear", description: "No pending operational tasks at the moment.", actionLabel: "Add Ops Task", actionType: "quickAdd" }
    },
    { 
        id: "content", label: "CONTENT", type: "content", 
        iconKey: "PenTool", colorKey: "blue",
        emptyState: { title: "Ready for a new campaign?", description: "Create a structured content package with notes and tasks.", actionLabel: "Create Content Package", actionType: "newPackage" }
    },
    { 
        id: "finance", label: "Finance", type: "admin", 
        iconKey: "DollarSign", colorKey: "amber",
        emptyState: { title: "Finance queue is empty", description: "Keep your books clean and budgets updated.", actionLabel: "Record Expense", actionType: "quickAdd" }
    },
    { 
        id: "travel", label: "Travel", type: "admin", 
        iconKey: "Plane", colorKey: "rose",
        emptyState: { title: "Plan your next journey", description: "No upcoming travel tasks planned.", actionLabel: "Add Itinerary", actionType: "quickAdd" }
    },
    { 
        id: "admin", label: "Admin", type: "admin", 
        iconKey: "Shield", colorKey: "slate",
        emptyState: { title: "Administrative tasks", description: "Manage organizational overhead effectively.", actionLabel: "Add Admin Task", actionType: "quickAdd" }
    },
    { 
        id: "marketing", label: "Marketing/Sales", type: "ops", 
        iconKey: "TrendingUp", colorKey: "orange",
        emptyState: { title: "Growth is looking good", description: "No active marketing campaigns in this view.", actionLabel: "Start Campaign", actionType: "quickAdd" }
    },
    { 
        id: "personal", label: "Personal", type: "other", 
        iconKey: "User", colorKey: "violet",
        emptyState: { title: "Capture your first thought", description: "Empty space is free space. Focus on what matters.", actionLabel: "Add Quick Task", actionType: "quickAdd" }
    },
    { 
        id: "system", label: "System/Archive", type: "system", 
        iconKey: "Archive", colorKey: "neutral",
        emptyState: { title: "Archive view", description: "Everything is backed up and safe.", actionLabel: "Archive Task", actionType: "quickAdd" }
    },
    { 
        id: "inbox", label: "Inbox", type: "inbox", 
        iconKey: "Inbox", colorKey: "sky",
        emptyState: { title: "Inbox Zero reached!", description: "All new captures have been processed.", actionLabel: "Quick Capture", actionType: "quickAdd" }
    },
    { 
        id: "other", label: "Other", type: "other", 
        iconKey: "MoreHorizontal", colorKey: "neutral",
        emptyState: { title: "Everything Else", description: "A catch-all for miscellaneous tasks.", actionLabel: "Add Task", actionType: "quickAdd" }
    },
] as const;

export type Workspace = (typeof WORKSPACES)[number];

const ALIASES: Record<string, Workspace> = {
    // crm
    "crm": "avacrm",
    "avacrm": "avacrm",
    "ava": "avacrm",

    // ops
    "ops": "ops",
    "operation": "ops",

    // content
    "content": "content",
    "cnt": "content",

    // others
    "finance": "finance",
    "fin": "finance",
    "travel": "travel",
    "admin": "admin",
    "marketing": "marketing",
    "mkt": "marketing",
    "mktg": "marketing",
    "sales": "marketing",
    "marketing_sales": "marketing",
    "mktsales": "marketing",
    "marketing_and_sales": "marketing",
    "personal": "personal",
    "system": "system",
    "sys": "system",
    "inbox": "inbox",
    "ib": "inbox",
    "other": "other",
};

export function normalizeWorkspace(input?: string | null): Workspace {
    const key = String(input ?? "").trim().toLowerCase();
    return ALIASES[key] ?? "other";
}

export function workspaceLabel(w: Workspace | string): string {
    switch (w) {
        case "avacrm": return "AVACRM";
        case "ops": return "OPS";
        case "content": return "CONTENT";
        case "personal": return "Personal";
        case "admin": return "Admin";
        case "marketing": return "Marketing/Sales";
        case "finance": return "Finance";
        case "travel": return "Travel";
        case "system": return "System/Archive";
        case "inbox": return "Inbox";
        case "other": return "Other";
        default: return typeof w === "string" ? w.toUpperCase() : "UNKNOWN";
    }
}

// RC45: Identity mapping
export function getWorkspaceColor(colorKey: string): { 
    bg: string, 
    text: string, 
    border: string, 
    ring: string, 
    light: string,
    dot: string
} {
    switch (colorKey) {
        case "indigo": return { bg: "bg-indigo-600", text: "text-indigo-600", border: "border-indigo-200", ring: "ring-indigo-100", light: "bg-indigo-50", dot: "bg-indigo-500" };
        case "emerald": return { bg: "bg-emerald-600", text: "text-emerald-600", border: "border-emerald-200", ring: "ring-emerald-100", light: "bg-emerald-50", dot: "bg-emerald-500" };
        case "blue": return { bg: "bg-blue-600", text: "text-blue-600", border: "border-blue-200", ring: "ring-blue-100", light: "bg-blue-50", dot: "bg-blue-500" };
        case "amber": return { bg: "bg-amber-600", text: "text-amber-600", border: "border-amber-200", ring: "ring-amber-100", light: "bg-amber-50", dot: "bg-amber-500" };
        case "rose": return { bg: "bg-rose-600", text: "text-rose-600", border: "border-rose-200", ring: "ring-rose-100", light: "bg-rose-50", dot: "bg-rose-500" };
        case "slate": return { bg: "bg-slate-600", text: "text-slate-600", border: "border-slate-200", ring: "ring-slate-100", light: "bg-slate-50", dot: "bg-slate-500" };
        case "orange": return { bg: "bg-orange-600", text: "text-orange-600", border: "border-orange-200", ring: "ring-orange-100", light: "bg-orange-50", dot: "bg-orange-500" };
        case "violet": return { bg: "bg-violet-600", text: "text-violet-600", border: "border-violet-200", ring: "ring-violet-100", light: "bg-violet-50", dot: "bg-violet-500" };
        case "sky": return { bg: "bg-sky-600", text: "text-sky-600", border: "border-sky-200", ring: "ring-sky-100", light: "bg-sky-50", dot: "bg-sky-500" };
        default: return { bg: "bg-neutral-600", text: "text-neutral-600", border: "border-neutral-200", ring: "ring-neutral-100", light: "bg-neutral-50", dot: "bg-neutral-500" };
    }
}
