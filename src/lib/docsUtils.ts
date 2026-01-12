import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(dateStr?: string | Date | null) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // Today HH:mm
    if (diffDays < 1 && d.toDateString() === now.toDateString()) {
        const time = d.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
        return `Today ${time}`;
    }

    // Jan 2, 12:34
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export function stripMarkdown(md: string): string {
    if (!md) return "";
    // Conservative strip:
    // 1. Remove headings markers (# )
    // 2. Remove bold/italic (*, _)
    // 3. Remove code blocks (```)
    // 4. Remove links [text](url) -> text
    // 5. Remove images ![alt](url) -> alt
    // 6. Collapse whitespace

    let text = md
        .replace(/^#+\s+/gm, "") // headings
        .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
        .replace(/(\*|_)(.*?)\1/g, "$2") // italic
        .replace(/`{3,}[\s\S]*?`{3,}/g, "") // code blocks
        .replace(/`([^`]+)`/g, "$1") // inline code
        .replace(/!\[(.*?)\]\(.*?\)/g, "$1") // images
        .replace(/\[(.*?)\]\(.*?\)/g, "$1") // links
        .replace(/^\s*[-*+]\s+/gm, "") // list items
        .replace(/\r\n|\r|\n/g, " "); // newlines to space

    // Collapse multiple spaces
    text = text.replace(/\s+/g, " ").trim();

    return text.slice(0, 160);
}
