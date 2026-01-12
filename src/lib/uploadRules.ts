// src/lib/uploadRules.ts
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB = 26,214,400 bytes

export const BLOCKED_EXTENSIONS = new Set(["exe", "bat", "cmd"]);

export function getFileExtLower(fileName: string) {
    const parts = fileName.split(".");
    if (parts.length < 2) return "";
    return (parts.pop() ?? "").toLowerCase();
}
