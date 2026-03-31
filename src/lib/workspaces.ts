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

export const WORKSPACES_LIST = [
    { id: "avacrm", label: "AVACRM", type: "admin" },
    { id: "ops", label: "OPS", type: "ops" },
    { id: "content", label: "CONTENT", type: "content" },
    { id: "finance", label: "Finance", type: "admin" },
    { id: "travel", label: "Travel", type: "admin" },
    { id: "admin", label: "Admin", type: "admin" },
    { id: "marketing", label: "Marketing/Sales", type: "ops" },
    { id: "personal", label: "Personal", type: "other" },
    { id: "system", label: "System/Archive", type: "system" },
    { id: "inbox", label: "Inbox", type: "inbox" },
    { id: "other", label: "Other", type: "other" },
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
