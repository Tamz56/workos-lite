"use client";

import type { ReactNode, RefObject } from "react";
import { Bold, Highlighter, Italic, List, Heading2 } from "lucide-react";

import {
    applyBold,
    applyBullet,
    applyHeading2,
    applyHighlight,
    applyItalic,
    type MarkdownTransformResult,
} from "@/lib/editor/markdownTransforms";

type MarkdownToolbarProps = {
    value: string;
    onChange: (value: string) => void;
    textareaRef: RefObject<HTMLTextAreaElement | null>;
    disabled?: boolean;
    className?: string;
};

type ToolbarAction = {
    key: string;
    label: string;
    title: string;
    icon: ReactNode;
    transform: (value: string, start: number, end: number) => MarkdownTransformResult;
};

const buttonClass = "h-8 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg border border-theme-border bg-theme-card px-2.5 text-xs font-black text-theme-secondary transition-all hover:border-theme-accent/50 hover:bg-theme-hover hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-40";

const actions: ToolbarAction[] = [
    {
        key: "bold",
        label: "B",
        title: "ตัวหนา",
        icon: <Bold className="h-3.5 w-3.5" />,
        transform: applyBold,
    },
    {
        key: "italic",
        label: "I",
        title: "ตัวเอียง",
        icon: <Italic className="h-3.5 w-3.5" />,
        transform: applyItalic,
    },
    {
        key: "bullet",
        label: "•",
        title: "บูลเลต",
        icon: <List className="h-3.5 w-3.5" />,
        transform: applyBullet,
    },
    {
        key: "highlight",
        label: "ไฮไลท์",
        title: "ไฮไลท์",
        icon: <Highlighter className="h-3.5 w-3.5" />,
        transform: applyHighlight,
    },
    {
        key: "heading2",
        label: "H2",
        title: "หัวข้อย่อย",
        icon: <Heading2 className="h-3.5 w-3.5" />,
        transform: applyHeading2,
    },
];

export function MarkdownToolbar({
    value,
    onChange,
    textareaRef,
    disabled = false,
    className = "",
}: MarkdownToolbarProps) {
    const runAction = (action: ToolbarAction) => {
        const textarea = textareaRef.current;
        if (!textarea || disabled) return;

        const result = action.transform(value, textarea.selectionStart, textarea.selectionEnd);
        onChange(result.value);

        requestAnimationFrame(() => {
            textarea.focus();
            textarea.selectionStart = result.selectionStart;
            textarea.selectionEnd = result.selectionEnd;
        });
    };

    return (
        <div className={`overflow-x-auto border border-theme-border bg-theme-panel/70 px-2 py-1.5 scrollbar-hide-until-hover ${className}`}>
            <div className="flex w-max min-w-full items-center gap-1.5">
                {actions.map((action) => (
                    <button
                        key={action.key}
                        type="button"
                        title={action.title}
                        aria-label={action.title}
                        disabled={disabled}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => runAction(action)}
                        className={buttonClass}
                    >
                        {action.icon}
                        <span>{action.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
