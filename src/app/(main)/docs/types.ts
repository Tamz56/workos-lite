export type DocRow = {
    id: string;
    title: string;
    content_md: string;
    created_at: string;
    updated_at: string;
};

export function isDraft(doc: DocRow) {
    const t = (doc.title ?? "").trim();
    const c = (doc.content_md ?? "").trim();
    return (t === "" || t === "Untitled") && c === "";
}
