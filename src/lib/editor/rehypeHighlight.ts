import { defaultSchema } from "rehype-sanitize";

type HastNode = {
    type: string;
    value?: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: HastNode[];
};

function parseHighlightText(value: string): HastNode[] {
    const nodes: HastNode[] = [];
    const highlightPattern = /==([^=\n]+?)==/g;
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = highlightPattern.exec(value)) !== null) {
        if (match.index > cursor) {
            nodes.push({ type: "text", value: value.slice(cursor, match.index) });
        }

        nodes.push({
            type: "element",
            tagName: "mark",
            children: [{ type: "text", value: match[1] }],
        });

        cursor = match.index + match[0].length;
    }

    if (cursor < value.length) {
        nodes.push({ type: "text", value: value.slice(cursor) });
    }

    return nodes;
}

function transformNode(node: HastNode) {
    if (!node.children) return;

    for (let i = 0; i < node.children.length; i += 1) {
        const child = node.children[i];

        if (child.type === "element" && (child.tagName === "code" || child.tagName === "pre")) {
            continue;
        }

        if (child.type === "text" && child.value?.includes("==")) {
            const nextNodes = parseHighlightText(child.value);
            node.children.splice(i, 1, ...nextNodes);
            i += nextNodes.length - 1;
            continue;
        }

        transformNode(child);
    }
}

export function rehypeHighlight() {
    return (tree: HastNode) => {
        transformNode(tree);
    };
}

export const highlightSanitizeSchema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames ?? []), "mark"],
};
