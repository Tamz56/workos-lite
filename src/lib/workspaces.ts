export const WORKSPACES = [
    "avacrm",
    "ops",
    "content",
    "personal",
    "admin",
    "finance",
    "travel",
    "other",
] as const;

export type Workspace = (typeof WORKSPACES)[number];

export function workspaceLabel(w: Workspace | string): string {
    switch (w) {
        case "avacrm":
            return "AVACRM";
        case "ops":
            return "OPS";
        case "content":
            return "CONTENT";
        case "personal":
            return "Personal";
        case "admin":
            return "Admin";
        case "finance":
            return "Finance";
        case "travel":
            return "Travel";
        case "other":
            return "Other";
        default:
            return typeof w === "string" ? w.toUpperCase() : "UNKNOWN";
    }
}
