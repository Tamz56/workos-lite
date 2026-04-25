export type MarkdownTransformResult = {
    value: string;
    selectionStart: number;
    selectionEnd: number;
};

export function wrapSelection(
    value: string,
    start: number,
    end: number,
    before: string,
    after: string,
    fallback: string
): MarkdownTransformResult {
    const selected = value.slice(start, end) || fallback;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    const selectionStart = start + before.length;

    return {
        value: next,
        selectionStart,
        selectionEnd: selectionStart + selected.length,
    };
}

export function toggleLinePrefix(
    value: string,
    start: number,
    end: number,
    prefix: string
): MarkdownTransformResult {
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEndIndex = value.indexOf("\n", end);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const selectedBlock = value.slice(lineStart, lineEnd);
    const lines = selectedBlock.split("\n");
    const shouldRemove = lines
        .filter((line) => line.trim().length > 0)
        .every((line) => line.startsWith(prefix));

    let deltaBeforeStart = 0;
    let deltaBeforeEnd = 0;
    let runningOffset = 0;

    const nextLines = lines.map((line) => {
        const originalOffset = runningOffset;
        const lineAbsoluteStart = lineStart + originalOffset;
        const lineAbsoluteEnd = lineAbsoluteStart + line.length;
        const shouldFormatLine = line.trim().length > 0 || (start === end && lineAbsoluteStart <= start && start <= lineAbsoluteEnd);

        runningOffset += line.length + 1;

        if (!shouldFormatLine) return line;

        const delta = shouldRemove && line.startsWith(prefix) ? -prefix.length : prefix.length;
        if (lineAbsoluteStart <= start) deltaBeforeStart += delta;
        if (lineAbsoluteStart <= end) deltaBeforeEnd += delta;

        return shouldRemove && line.startsWith(prefix)
            ? line.slice(prefix.length)
            : `${prefix}${line}`;
    });

    const nextBlock = nextLines.join("\n");

    return {
        value: value.slice(0, lineStart) + nextBlock + value.slice(lineEnd),
        selectionStart: Math.max(lineStart, start + deltaBeforeStart),
        selectionEnd: Math.max(lineStart, end + deltaBeforeEnd),
    };
}

export function applyBold(value: string, start: number, end: number) {
    return wrapSelection(value, start, end, "**", "**", "ข้อความตัวหนา");
}

export function applyItalic(value: string, start: number, end: number) {
    return wrapSelection(value, start, end, "*", "*", "ข้อความตัวเอียง");
}

export function applyBullet(value: string, start: number, end: number) {
    return toggleLinePrefix(value, start, end, "- ");
}

export function applyHighlight(value: string, start: number, end: number) {
    return wrapSelection(value, start, end, "==", "==", "ข้อความไฮไลท์");
}

export function applyHeading2(value: string, start: number, end: number) {
    return toggleLinePrefix(value, start, end, "## ");
}
