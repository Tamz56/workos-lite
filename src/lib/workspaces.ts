export const WORKSPACES = [
    "avacrm",
    "ops",
    "content",
    "finance",
    "travel",
    "admin",
    "marketing",
    "sales",
    "marketing_sales",
    "personal",
    "other",
] as const;

export const WORKSPACES_LIST = [
    { id: "avacrm", label: "AVACRM" },
    { id: "ops", label: "OPS" },
    { id: "content", label: "CONTENT" },
    { id: "finance", label: "Finance" },
    { id: "travel", label: "Travel" },
    { id: "admin", label: "Admin" },
    { id: "marketing", label: "Marketing" },
    { id: "sales", label: "Sales" },
    { id: "marketing_sales", label: "Marketing/Sales" },
    { id: "personal", label: "Personal" },
    { id: "other", label: "Other" },
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
    "sales": "sales",
    "marketing_sales": "marketing_sales",
    "mktsales": "marketing_sales",
    "marketing_and_sales": "marketing_sales",
    "personal": "personal",
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
        case "marketing": return "Marketing";
        case "sales": return "Sales";
        case "marketing_sales": return "Marketing/Sales";
        case "finance": return "Finance";
        case "travel": return "Travel";
        case "other": return "Other";
        default: return typeof w === "string" ? w.toUpperCase() : "UNKNOWN";
    }
}
