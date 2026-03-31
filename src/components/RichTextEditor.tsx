"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { 
    Bold, 
    Italic, 
    List as ListIcon, 
    ListOrdered, 
    Heading1, 
    Heading2, 
    Quote, 
    Undo, 
    Redo 
} from "lucide-react";

interface RichTextEditorProps {
    content: string; // JSON string or HTML depending on usage, Tiptap handles both but JSON is canonical
    onChange: (data: { json: string; html: string; text: string }) => void;
    placeholder?: string;
    readOnly?: boolean;
    className?: string;
}

const MenuButton = ({ 
    onClick, 
    isActive, 
    disabled, 
    children, 
    title 
}: { 
    onClick: () => void; 
    isActive?: boolean; 
    disabled?: boolean; 
    children: React.ReactNode;
    title: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`p-1.5 rounded-md transition-all ${
            isActive 
                ? "bg-neutral-900 text-white" 
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
        {children}
    </button>
);

export default function RichTextEditor({ 
    content, 
    onChange, 
    placeholder = "Start writing...", 
    readOnly = false,
    className = "" 
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2],
                },
            }),
        ],
        content: content ? (content.startsWith("{") ? JSON.parse(content) : content) : "",
        editable: !readOnly,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange({
                json: JSON.stringify(editor.getJSON()),
                html: editor.getHTML(),
                text: editor.getText(),
            });
        },
        editorProps: {
            attributes: {
                class: `prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4 text-neutral-800 ${readOnly ? "cursor-default" : "cursor-text"}`,
            },
        },
    });

    // Update content if it changes externally (and it's not what we already have)
    useEffect(() => {
        if (editor && content !== editor.getHTML() && content !== JSON.stringify(editor.getJSON())) {
            // Only set if content is significantly different to avoid cursor jumps
            // In a real app, we might want a more sophisticated check or use a ref
        }
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div className={`border border-neutral-200 rounded-xl bg-white overflow-hidden flex flex-col transition-all focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-100 ${className}`}>
            {!readOnly && (
                <div className="flex items-center gap-1 p-1.5 border-b border-neutral-100 bg-neutral-50/50 flex-wrap">
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive("bold")}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive("italic")}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </MenuButton>
                    
                    <div className="w-[1px] h-4 bg-neutral-200 mx-1" />
                    
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        isActive={editor.isActive("heading", { level: 1 })}
                        title="Heading 1"
                    >
                        <Heading1 className="w-4 h-4" />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        isActive={editor.isActive("heading", { level: 2 })}
                        title="Heading 2"
                    >
                        <Heading2 className="w-4 h-4" />
                    </MenuButton>
                    
                    <div className="w-[1px] h-4 bg-neutral-200 mx-1" />
                    
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive("bulletList")}
                        title="Bullet List"
                    >
                        <ListIcon className="w-4 h-4" />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive("orderedList")}
                        title="Ordered List"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </MenuButton>
                    
                    <div className="w-[1px] h-4 bg-neutral-200 mx-1" />
                    
                    <MenuButton
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        isActive={editor.isActive("blockquote")}
                        title="Quote"
                    >
                        <Quote className="w-4 h-4" />
                    </MenuButton>
                    
                    <div className="flex-1" />
                    
                    <MenuButton
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Undo"
                    >
                        <Undo className="w-4 h-4" />
                    </MenuButton>
                    <MenuButton
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Redo"
                    >
                        <Redo className="w-4 h-4" />
                    </MenuButton>
                </div>
            )}
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <EditorContent editor={editor} />
                {editor.isEmpty && !readOnly && (
                    <div className="absolute top-[52px] left-4 text-neutral-400 text-sm pointer-events-none italic">
                        {placeholder}
                    </div>
                )}
            </div>
            
            <style jsx global>{`
                .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                }
                .prose h1 { font-size: 1.25rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; }
                .prose h2 { font-size: 1.1rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.4rem; }
                .prose p { margin-bottom: 0.5rem; line-height: 1.6; }
                .prose ul { list-style-type: disc; padding-left: 1.25rem; margin-bottom: 0.5rem; }
                .prose ol { list-style-type: decimal; padding-left: 1.25rem; margin-bottom: 0.5rem; }
                .prose blockquote { border-left: 3px solid #e5e5e5; padding-left: 1rem; italic; color: #666; margin-bottom: 0.5rem; }
            `}</style>
        </div>
    );
}
