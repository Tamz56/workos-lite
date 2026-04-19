// src/components/workspaces/WorkspaceSwitcher.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Search, History, Globe, Check, X, Command } from 'lucide-react';
import { WORKSPACES_LIST } from '@/lib/workspaces';

interface WorkspaceSwitcherProps {
    isOpen: boolean;
    onClose: () => void;
    currentWorkspaceId: string;
    onSelect: (workspaceId: string) => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
    isOpen,
    onClose,
    currentWorkspaceId,
    onSelect
}) => {
    const [search, setSearch] = useState('');
    const [recentIds, setRecentIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem('workos-recent-workspaces');
            if (saved) {
                try {
                    const ids = JSON.parse(saved) as string[];
                    setRecentIds(ids.slice(0, 3)); // Requirement: Show 3 initially
                } catch (e) {
                    console.warn("Failed to load recents", e);
                }
            }
            setSearch('');
        }
    }, [isOpen]);

    const filteredWorkspaces = useMemo(() => {
        return WORKSPACES_LIST.filter(ws => 
            ws.label.toLowerCase().includes(search.toLowerCase()) ||
            ws.id.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    const recentWorkspaces = useMemo(() => {
        return recentIds
            .map(id => WORKSPACES_LIST.find(ws => ws.id === id))
            .filter((ws): ws is typeof WORKSPACES_LIST[number] => !!ws);
    }, [recentIds]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden relative animate-in zoom-in-95 duration-200">
                {/* Search Bar */}
                <div className="p-4 border-b border-neutral-100 flex items-center gap-3">
                    <Search size={20} className="text-neutral-400" />
                    <input 
                        autoFocus
                        className="flex-1 bg-transparent border-none outline-none text-base font-medium text-neutral-800 placeholder:text-neutral-400"
                        placeholder="Search workspaces... (Cmd+Shift+J)"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Escape') onClose();
                            if (e.key === 'Enter' && filteredWorkspaces.length > 0) {
                                onSelect(filteredWorkspaces[0].id);
                            }
                        }}
                    />
                    <button onClick={onClose} className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-400 Transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pb-2">
                    {/* Recent Workspaces */}
                    {search === '' && recentWorkspaces.length > 0 && (
                        <div className="p-2">
                            <div className="px-3 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                <History size={12} />
                                ประวัติล่าสุด (Recent)
                            </div>
                            <div className="grid grid-cols-1 gap-1">
                                {recentWorkspaces.map(ws => (
                                    <button
                                        key={`recent-${ws.id}`}
                                        onClick={() => onSelect(ws.id)}
                                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${
                                            ws.id === currentWorkspaceId 
                                                ? 'bg-indigo-50 text-indigo-700' 
                                                : 'hover:bg-neutral-50 text-neutral-600'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                                ws.id === currentWorkspaceId ? 'bg-indigo-100' : 'bg-neutral-100 group-hover:bg-white'
                                            }`}>
                                                {ws.label[0]}
                                            </div>
                                            <span className="font-bold text-sm">{ws.label}</span>
                                        </div>
                                        {ws.id === currentWorkspaceId && <Check size={16} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Workspaces */}
                    <div className="p-2">
                        <div className="px-3 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                            <Globe size={12} />
                            พื้นที่ทำงานทั้งหมด (All Workspaces)
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                            {filteredWorkspaces.map(ws => (
                                <button
                                    key={ws.id}
                                    onClick={() => onSelect(ws.id)}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${
                                        ws.id === currentWorkspaceId 
                                            ? 'bg-indigo-50 text-indigo-700' 
                                            : 'hover:bg-neutral-50 text-neutral-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                            ws.id === currentWorkspaceId ? 'bg-indigo-100' : 'bg-neutral-100 group-hover:bg-white'
                                        }`}>
                                            {ws.label[0]}
                                        </div>
                                        <span className="font-bold text-sm">{ws.label}</span>
                                    </div>
                                    {ws.id === currentWorkspaceId && <Check size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredWorkspaces.length === 0 && (
                        <div className="p-12 text-center text-neutral-400 font-medium text-sm">
                            ไม่พบ Workspace ที่ค้นหา
                        </div>
                    )}
                </div>

                <div className="p-3 bg-neutral-50 border-t border-neutral-100 text-[10px] text-neutral-400 font-medium flex items-center justify-center gap-4 italic uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                        <kbd className="bg-white border border-neutral-200 px-1 rounded text-[9px] font-bold">↑↓</kbd> navigate
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="bg-white border border-neutral-200 px-1 rounded text-[9px] font-bold">Enter</kbd> select
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="bg-white border border-neutral-200 px-1 rounded text-[9px] font-bold">⌘⇧J</kbd> switcher
                    </div>
                </div>
            </div>
        </div>
    );
};
