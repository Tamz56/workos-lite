export type DocBase = {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
};

export type DocListRow = DocBase & {
    summary?: string;
};

export type DocRow = DocBase & {
    content_md: string;
};
