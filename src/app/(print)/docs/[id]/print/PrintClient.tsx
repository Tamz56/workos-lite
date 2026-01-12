"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

import { getDoc } from "@/lib/api/docs";
import { processMentionsToMarkdown } from "@/lib/mentions";
import { formatDate } from "@/lib/docsUtils";
import { toErrorMessage } from "@/lib/error";

export default function PrintClient({ docId }: { docId: string }) {
    const [content, setContent] = useState("");
    const [title, setTitle] = useState("Loading...");
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!docId) return;
        let mounted = true;

        (async () => {
            try {
                const d = await getDoc(docId);
                if (!mounted) return;

                if (!d) {
                    setError("Document not found.");
                    return;
                }

                setTitle(d.title ?? "Untitled");
                setContent(d.content_md ?? "");
                setUpdatedAt(d.updated_at ?? null);

                document.title = d.title ? `${d.title} (Print)` : "Untitled Doc (Print)";
            } catch (e: unknown) {
                console.error("PrintClient getDoc failed:", e);
                if (!mounted) return;
                setError(`Failed to load document: ${toErrorMessage(e)}`);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [docId]);

    const processed = useMemo(() => processMentionsToMarkdown(content), [content]);

    return (
        <div className="min-h-screen bg-white text-black">
            {/* Controls (hidden when printing) */}
            <div className="print:hidden border-b">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="text-sm text-gray-600 truncate">
                        Print View
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
                    >
                        Print / Save as PDF
                    </button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-10">
                {error ? (
                    <div className="text-red-600 text-center mt-10">{error}</div>
                ) : (
                    <article className="prose prose-slate">
                        <h1 className="mb-2">{title}</h1>
                        {updatedAt && (
                            <div className="text-sm text-gray-500 mb-8 border-b pb-4">
                                Last updated: {formatDate(updatedAt)}
                            </div>
                        )}

                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                            {processed || "*No content*"}
                        </ReactMarkdown>
                    </article>
                )}
            </div>

            {/* Print CSS */}
            <style jsx global>{`
        @media print {
          @page { margin: 2cm; }
          body { background: white !important; }
        }
      `}</style>
        </div>
    );
}
