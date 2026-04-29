// src/lib/uploadRules.ts
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB = 26,214,400 bytes

export const ALLOWED_EXTENSION_LIST = ["xlsx", "csv", "pdf", "png", "jpg", "jpeg", "md"] as const;
export const ALLOWED_EXTENSIONS = new Set<string>(ALLOWED_EXTENSION_LIST);
export const ALLOWED_EXTENSIONS_LABEL = ALLOWED_EXTENSION_LIST.join(", ");
export const ATTACHMENT_ACCEPT = ".xlsx,.csv,.pdf,.png,.jpg,.jpeg,.md";

export const MARKDOWN_MIME_TYPES = new Set([
    "text/markdown",
    "text/x-markdown",
    "text/plain",
    "application/octet-stream",
]);

export function getFileExtLower(fileName: string) {
    const parts = fileName.split(".");
    if (parts.length < 2) return "";
    return (parts.pop() ?? "").toLowerCase();
}

export function isAllowedAttachmentFile(file: { name: string; type?: string }) {
    const ext = getFileExtLower(file.name);
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) return false;

    if (ext === "md") {
        const mime = (file.type || "").toLowerCase();
        return mime === "" || MARKDOWN_MIME_TYPES.has(mime);
    }

    return true;
}
