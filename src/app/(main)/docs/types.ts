export type DocRow = {
    id: string;
    title: string;
    content_md: string;
    project_id: string | null;
    project_name?: string | null;
    workspace: string | null;
    created_at: string;
    updated_at: string;
    attachment_count?: number;
};

export function isDraft(doc: DocRow) {
    const t = (doc.title ?? "").trim();
    const c = (doc.content_md ?? "").trim();
    return (t === "" || t === "Untitled") && c === "";
}
