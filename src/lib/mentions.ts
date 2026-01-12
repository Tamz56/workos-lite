export function processMentionsToMarkdown(input: string) {
    // [[doc:ID|Title]] -> [Title](/docs/ID)
    return input.replace(/\[\[doc:([^\|\]]+)\|([^\]]+)\]\]/g, (_m, id, title) => {
        const safeTitle = String(title ?? "").trim() || "Untitled";
        const safeId = String(id ?? "").trim();
        return `[${safeTitle}](/docs/${safeId})`;
    });
}

export function findActiveMentionQuery(text: string, cursor: number) {
    // returns { start, query } or null
    // start = index of the "[[" that began this mention
    const left = text.slice(0, cursor);

    // only look at last line (simpler + predictable)
    // If no newline found, lastIndexOf returns -1, so lineStart is 0, which is correct
    const lineStart = left.lastIndexOf("\n") + 1;
    const line = left.slice(lineStart);

    const openIdx = line.lastIndexOf("[[");
    if (openIdx === -1) return null;

    // if there is a closing "]]" after the open within the left side, ignore
    // e.g. "[[done]] [[curr" -> we want the second one. 
    // The lastIndexOf("[[") gets the last one.
    // We just need to check if between openIdx and cursor there is a "]]".
    // line is the text from start of line to cursor.
    // openIdx is relative to line start.
    const afterOpen = line.slice(openIdx + 2);
    if (afterOpen.includes("]]")) return null;

    const query = afterOpen; // raw text after [[ up to cursor
    const globalStart = lineStart + openIdx;
    return { start: globalStart, query };
}


export function replaceRange(text: string, start: number, end: number, insert: string) {
    return text.slice(0, start) + insert + text.slice(end);
}

export function extractMentionTargets(text: string): { id: string, title?: string }[] {
    const matches = [...text.matchAll(/\[\[doc:([^\|\]]+)\|([^\]]+)\]\]/g)];
    return matches.map(m => ({ id: m[1], title: m[2] }));
}

export function safeSlug(text: string): string {
    // Remove invalid filename chars (Windows/Unix)
    const slug = text.replace(/[\\/:*?"<>|]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();

    // Fallback or truncate
    if (!slug) return "untitled";
    // Limit length to ~50-80 chars
    return slug.slice(0, 80);
}
