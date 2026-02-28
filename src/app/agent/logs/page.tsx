"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AuditLog = {
    id: string;
    agent_key_id: string;
    action_type: string;
    payload_json: string;
    result_json: string;
    created_at: string;
};

export default function AgentLogsPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Filters
    const [limit, setLimit] = useState<number>(100);
    const [actionType, setActionType] = useState<string>("");
    const [agentKeyId, setAgentKeyId] = useState<string>("");

    // Detail Panel
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push("/dashboard");
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const params = new URLSearchParams();
            params.append("limit", limit.toString());
            if (actionType) params.append("action_type", actionType.trim());
            if (agentKeyId) params.append("agent_key_id", agentKeyId.trim());

            const res = await fetch(`/api/agent/logs?${params.toString()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setLogs(data.logs || []);
        } catch (e: any) {
            setErrorMsg(e.message || "Failed to load logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [limit, actionType, agentKeyId]);

    const isErrorLog = (log: AuditLog) => {
        try {
            const parsed = JSON.parse(log.result_json);
            return parsed.ok === false || !!parsed.error;
        } catch {
            return true; // if unparsable, likely an error format issue
        }
    };

    const tryParseJson = (str: string) => {
        try {
            return JSON.stringify(JSON.parse(str), null, 2);
        } catch {
            return str;
        }
    };

    return (
        <div className="w-full px-6 2xl:px-10 py-8 max-w-7xl mx-auto">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <button onClick={handleBack} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 bg-white border border-neutral-200/70 rounded-md px-3 py-1.5 shadow-sm hover:bg-neutral-50 transition-colors mb-6 md:mb-4 block w-max">
                        <span aria-hidden="true">&larr;</span> Back
                    </button>
                    <h1 className="text-3xl font-bold font-display tracking-tight text-neutral-900">Agent Audit Logs</h1>
                    <div className="text-sm text-neutral-500 font-medium mt-1">
                        View execution history and payloads from <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs text-neutral-700">agent_audit_log</code>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-neutral-200/70 shadow-sm">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Action Type</label>
                        <select
                            value={actionType}
                            onChange={(e) => setActionType(e.target.value)}
                            className="text-xs bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1.5 min-w-[120px] outline-none focus:border-blue-500"
                        >
                            <option value="">All Actions</option>
                            <option value="task.create">task.create</option>
                            <option value="task.update">task.update</option>
                            <option value="doc.create">doc.create</option>
                            <option value="doc.update">doc.update</option>
                            <option value="event.create">event.create</option>
                            <option value="attachment.create">attachment.create</option>
                            <option value="request.error">request.error</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Agent Key ID</label>
                        <input
                            type="text"
                            placeholder="Exact ID"
                            value={agentKeyId}
                            onChange={(e) => setAgentKeyId(e.target.value)}
                            onBlur={fetchLogs}
                            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                            className="text-xs bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1.5 w-[140px] outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Limit</label>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="text-xs bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1.5 outline-none focus:border-blue-500"
                        >
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                            <option value={500}>500</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1 self-end w-full sm:w-auto">
                        <button
                            onClick={fetchLogs}
                            className="text-xs bg-neutral-900 text-white font-medium px-4 py-1.5 rounded-md hover:bg-neutral-800 transition shadow-sm h-full"
                        >
                            {loading ? "..." : "Refresh"}
                        </button>
                    </div>
                </div>
            </div>

            {errorMsg && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-800 font-medium mb-6 shadow-sm">
                    {errorMsg}
                </div>
            )}

            <div className="bg-white border border-neutral-200/70 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                {loading && logs.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 text-sm">Loading logs...</div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 text-sm flex flex-col items-center">
                        <span className="text-2xl mb-2 opacity-50">📭</span>
                        No audit logs found for the selected filters.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50/80 border-b border-neutral-100 uppercase text-[10px] font-bold tracking-wider text-neutral-500">
                                    <th className="px-4 py-3 whitespace-nowrap">Time</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Action Type</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Agent ID</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 text-sm">
                                {logs.map((log) => {
                                    const isError = isErrorLog(log);
                                    const isExpanded = expandedLogId === log.id;

                                    return (
                                        <React.Fragment key={log.id}>
                                            <tr className="hover:bg-neutral-50 transition-colors group">
                                                <td className="px-4 py-3 whitespace-nowrap text-neutral-600 tabular-nums text-xs">
                                                    {new Date(log.created_at).toLocaleString("th-TH", {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        second: '2-digit',
                                                    })}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-800">
                                                    {log.action_type}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-neutral-500 font-mono text-xs">
                                                    {log.agent_key_id.split("-")[0]}...
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isError ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                                        {isError ? 'Error' : 'Success'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                                    <button
                                                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline-offset-4 hover:underline"
                                                    >
                                                        {isExpanded ? 'Hide' : 'View JSON'}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expandable Details Row */}
                                            {isExpanded && (
                                                <tr className="bg-neutral-50/50">
                                                    <td colSpan={5} className="p-0">
                                                        <div className="p-4 border-t border-b border-neutral-100">
                                                            <div className="grid md:grid-cols-2 gap-4">
                                                                <div>
                                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Payload JSON</div>
                                                                    <pre className="p-3 bg-neutral-900 text-neutral-300 text-xs font-mono rounded-xl overflow-x-auto max-h-[300px] shadow-inner">
                                                                        {tryParseJson(log.payload_json)}
                                                                    </pre>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Result JSON</div>
                                                                    <pre className={`p-3 text-xs font-mono rounded-xl overflow-x-auto max-h-[300px] shadow-inner ${isError ? 'bg-[#2A1B1B] text-[#E0A8A8] border-l-2 border-red-500' : 'bg-neutral-900 text-neutral-300'}`}>
                                                                        {tryParseJson(log.result_json)}
                                                                    </pre>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
