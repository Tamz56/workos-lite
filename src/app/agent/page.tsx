"use client";

import { useState } from "react";
import { nanoid } from "nanoid";

const DEFAULT_PAYLOAD = `{
  "actions": [
    { 
      "type": "doc.create", 
      "saveAs": "doc1", 
      "data": { 
        "title": "Agent Research Doc", 
        "content_md": "# Research Results\\n\\nGathering data..." 
      } 
    },
    { 
      "type": "task.create", 
      "data": { 
        "title": "Review Agent Output", 
        "workspace": "avacrm", 
        "status": "inbox", 
        "doc_id_ref": "doc1" 
      } 
    }
  ]
}`;

export default function AgentDebuggerPage() {
    const [jsonInput, setJsonInput] = useState(DEFAULT_PAYLOAD);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleRun = async (isDryRun: boolean) => {
        setLoading(true);
        setErrorMsg(null);
        setResult(null);

        try {
            // Validate JSON format first
            let parsedPayload;
            try {
                parsedPayload = JSON.parse(jsonInput);
            } catch (e) {
                throw new Error("Invalid JSON format");
            }

            // Force dry_run behavior based on button click
            parsedPayload.dry_run = isDryRun;

            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };

            // Use UUID/nanoid for idempotency on real execution
            if (!isDryRun) {
                headers["X-Idempotency-Key"] = nanoid();
            }

            // Calls our safe server-side proxy which holds the key
            const res = await fetch("/api/agent/proxy", {
                method: "POST",
                headers,
                body: JSON.stringify(parsedPayload),
            });

            const data = await res.json();

            if (!res.ok) {
                // If it's a 4xx or 5xx, still show the JSON as it contains `error` / `details`
                setResult(data);
                setErrorMsg(data.error || `HTTP ${res.status}`);
            } else {
                setResult(data);
            }

        } catch (err: any) {
            setErrorMsg(err.message || "Failed to execute request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full px-6 2xl:px-10 py-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-display tracking-tight text-neutral-900">Agent Debugger</h1>
                <div className="text-sm text-neutral-500 font-medium mt-1">
                    Securely preview and execute JSON payloads against <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs text-neutral-700">/api/agent/execute</code>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Editor Column */}
                <div className="flex flex-col h-full rounded-2xl border border-neutral-200/70 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-neutral-50/50">
                        <div className="text-sm font-semibold uppercase tracking-wide text-neutral-800">Payload Builder</div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleRun(true)}
                                disabled={loading}
                                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                            >
                                {loading ? '...' : 'Preview Build (Dry Run)'}
                            </button>
                            <button
                                onClick={() => handleRun(false)}
                                disabled={loading}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                            >
                                {loading ? '...' : 'Execute Now'}
                            </button>
                        </div>
                    </div>
                    <textarea
                        className="flex-1 w-full min-h-[500px] p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/50 bg-[#1e1e1e] text-[#d4d4d4]"
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder="Paste actions JSON here..."
                        spellCheck={false}
                    />
                </div>

                {/* Response Column */}
                <div className="flex flex-col h-full rounded-2xl border border-neutral-200/70 bg-white shadow-sm overflow-hidden min-h-[500px]">
                    <div className="flexItems-center justify-between p-4 border-b border-neutral-100 bg-neutral-50/50 flex flex-wrap gap-2">
                        <div className="text-sm font-semibold uppercase tracking-wide text-neutral-800">System Response</div>

                        {result && (
                            <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${errorMsg
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : (result.preview_only ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-green-100 text-green-700 border border-green-200')
                                }`}>
                                {errorMsg ? '⚠️ ERROR' : (result.preview_only ? '🔍 DRY RUN' : '✅ SUCCESS')}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto bg-neutral-50">
                        {!result && !errorMsg && (
                            <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                                <span className="text-3xl mb-2 opacity-30">🤖</span>
                                <span className="text-xs italic">Awaiting instructions...</span>
                            </div>
                        )}

                        {errorMsg && !result && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-800 font-medium mb-4">
                                {errorMsg}
                            </div>
                        )}

                        {result && (
                            <pre className="font-mono text-xs overflow-x-auto p-4 rounded-xl bg-neutral-900 text-neutral-300 shadow-inner">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
