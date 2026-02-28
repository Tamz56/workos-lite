"use client";

import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";

const DEFAULT_PAYLOAD_RAW = `{
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

const getTemplates = (): Record<string, any> => {
    const today = new Date().toISOString().split("T")[0];
    return {
        "Daily Brief + 3 Tasks": {
            dry_run: true,
            actions: [
                {
                    type: "doc.create",
                    saveAs: "doc_brief",
                    data: {
                        title: "Daily Brief: <Topic>",
                        content_md: "# Objective\\n\\nOutline goals for the day..."
                    }
                },
                {
                    type: "task.create",
                    data: { title: "Task 1", workspace: "avacrm", status: "planned", scheduled_date: today, schedule_bucket: "morning", priority: 1, doc_id_ref: "doc_brief" }
                },
                {
                    type: "task.create",
                    data: { title: "Task 2", workspace: "avacrm", status: "planned", scheduled_date: today, schedule_bucket: "afternoon", priority: 2 }
                },
                {
                    type: "task.create",
                    data: { title: "Task 3", workspace: "avacrm", status: "inbox", schedule_bucket: "none", priority: 3 }
                }
            ]
        },
        "Customer Call Note + Follow-up": {
            dry_run: true,
            actions: [
                {
                    type: "doc.create",
                    saveAs: "doc_call",
                    data: {
                        title: "Call: <Customer Name>",
                        content_md: "# Notes\\n\\nDiscussed X, Y, Z..."
                    }
                },
                {
                    type: "task.create",
                    data: { title: "Send follow-up email to <Customer Name>", workspace: "avacrm", status: "inbox", doc_id_ref: "doc_call", priority: 2, schedule_bucket: "none" }
                }
            ]
        },
        "Content Brief + Script Task": {
            dry_run: true,
            actions: [
                {
                    type: "doc.create",
                    saveAs: "doc_script",
                    data: {
                        title: "Content: <Topic>",
                        content_md: "# Script Outline\\n\\nIntro -> Body -> Outro"
                    }
                },
                {
                    type: "task.create",
                    data: { title: "Record video for <Topic>", workspace: "content", status: "planned", scheduled_date: today, doc_id_ref: "doc_script", priority: 1, schedule_bucket: "morning" }
                }
            ]
        }
    };
};

const DEFAULT_PAYLOAD = DEFAULT_PAYLOAD_RAW;

export default function AgentDebuggerPage() {
    const router = useRouter();
    const [jsonInput, setJsonInput] = useState(DEFAULT_PAYLOAD);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [uiPassword, setUiPassword] = useState("");

    useEffect(() => {
        const saved = localStorage.getItem("agent_ui_password");
        if (saved) setUiPassword(saved);
    }, []);

    const handlePasswordChange = (val: string) => {
        setUiPassword(val);
        localStorage.setItem("agent_ui_password", val);
    };

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push("/dashboard");
        }
    };

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
                setErrorMsg("Invalid JSON format. Please check for syntax errors.");
                setLoading(false);
                return;
            }

            // Force dry_run behavior based on button click
            parsedPayload.dry_run = isDryRun;

            const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "x-agent-password": uiPassword
            };

            // Only send idempotency key for real executions (not dry runs)
            if (!isDryRun) {
                headers["X-Idempotency-Key"] = nanoid();
            }

            // Calls the server-side proxy or execute route directly
            // Previously proxying to bypass CORS/keys, now we hit execute directly since we use x-agent-password
            const res = await fetch("/api/agent/execute", {
                method: "POST",
                headers,
                body: JSON.stringify(parsedPayload),
            });

            const data = await res.json();

            if (!res.ok) {
                // If it's a 4xx or 5xx, still show the JSON as it contains `error` / `details`
                setResult(data);
                if (res.status === 409) {
                    setErrorMsg("Idempotency conflict: A request with this key already ran but with a different payload.");
                } else {
                    setErrorMsg(data.error || `HTTP ${res.status}`);
                }
            } else {
                setResult(data);
            }

        } catch (err: any) {
            setErrorMsg(err.message || "Failed to execute request");
        } finally {
            setLoading(false);
        }
    };

    const formatJson = () => {
        try {
            const parsed = JSON.parse(jsonInput);
            setJsonInput(JSON.stringify(parsed, null, 2));
            setErrorMsg(null);
        } catch {
            setErrorMsg("Cannot format: Invalid JSON syntax");
        }
    };

    const copyResponse = () => {
        if (result) {
            navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        }
    };

    return (
        <div className="w-full px-6 2xl:px-10 py-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <button onClick={handleBack} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 bg-white border border-neutral-200/70 rounded-md px-3 py-1.5 shadow-sm hover:bg-neutral-50 transition-colors mb-6">
                    <span aria-hidden="true">&larr;</span> Back
                </button>
                <h1 className="text-3xl font-bold font-display tracking-tight text-neutral-900">Agent Debugger</h1>
                <div className="text-sm text-neutral-500 font-medium mt-1">
                    Securely preview and execute JSON payloads against <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs text-neutral-700">/api/agent/execute</code>
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Admin Password
                    </label>
                    <input
                        type="password"
                        placeholder="Enter UI Password"
                        value={uiPassword}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        className="bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500 max-w-[250px] font-mono"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Editor Column */}
                <div className="flex flex-col h-full rounded-2xl border border-neutral-200/70 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-neutral-50/50">
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-semibold uppercase tracking-wide text-neutral-800">Payload Builder</div>
                            <select
                                className="text-xs bg-white border border-neutral-200 rounded-md px-2 py-1 text-neutral-700 outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px] truncate"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const templates = getTemplates();
                                        setJsonInput(JSON.stringify(templates[e.target.value], null, 2));
                                        e.target.value = ""; // reset so they can repeatedly select same template
                                    }
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>Load Template...</option>
                                {Object.keys(getTemplates()).map(key => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                                <button onClick={formatJson} className="text-[10px] text-neutral-500 hover:text-neutral-800 transition-colors uppercase font-bold tracking-wider mr-2">Format JSON</button>
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
                            <div className="text-[10px] text-neutral-400">
                                <span>Preview only (<code className="bg-neutral-100 px-0.5 rounded text-neutral-500">dry_run:true</code>) or Will write + idempotency enabled (<code className="text-blue-500 px-0.5 rounded bg-blue-50">dry_run:false</code>)</span>
                            </div>
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
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-semibold uppercase tracking-wide text-neutral-800">System Response</div>
                            {result && (
                                <button onClick={copyResponse} className="text-[10px] text-neutral-500 hover:text-neutral-800 transition-colors uppercase font-bold tracking-wider">Copy</button>
                            )}
                        </div>

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
