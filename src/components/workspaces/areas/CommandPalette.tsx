import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, Command as CmdIcon, ArrowRight } from "lucide-react";

export interface CommandOption {
  id: string;
  label: string;
  description?: string;
  action: () => void;
  category?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandOption[];
}

export default function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands by search
  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    const s = search.toLowerCase();
    return commands.filter(c => 
      c.label.toLowerCase().includes(s) || 
      c.description?.toLowerCase().includes(s)
    );
  }, [commands, search]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        selected.action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-200"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px]" 
        onClick={onClose}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col animate-in slide-in-from-top-4 duration-300">
        {/* Search Header */}
        <div className="flex items-center px-4 py-4 border-b border-neutral-100 gap-3">
          <Search className="text-neutral-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-medium text-neutral-800 placeholder:text-neutral-300"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="text-[10px] font-bold text-neutral-300 border border-neutral-200 px-1.5 py-0.5 rounded leading-none shrink-0 uppercase tracking-widest">
            Esc
          </div>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="max-h-[45vh] overflow-y-auto custom-scrollbar py-2"
        >
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  className={`px-4 py-3 cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected ? "bg-indigo-50/80" : "hover:bg-neutral-50"
                  }`}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`p-1.5 rounded-md ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-neutral-100 text-neutral-500'}`}>
                        <CmdIcon size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-neutral-700'}`}>
                        {cmd.label}
                      </span>
                      {cmd.description && (
                        <span className={`text-[10px] truncate ${isSelected ? 'text-indigo-400' : 'text-neutral-400'}`}>
                          {cmd.description}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-indigo-100 text-indigo-500 animate-in fade-in slide-in-from-right-1 duration-200">
                        <span className="text-[9px] font-black uppercase tracking-widest">Execute</span>
                        <ArrowRight size={10} />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-6 py-10 text-center text-neutral-400 text-sm">
              No commands found for "{search}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-100 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-neutral-400">
                <div className="border border-neutral-200 px-1 py-0.5 rounded leading-none text-[9px] bg-white text-neutral-500">↑↓</div>
                <span className="text-[9px] font-bold uppercase tracking-widest">Navigate</span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400">
                <div className="border border-neutral-200 px-1 py-0.5 rounded leading-none text-[9px] bg-white text-neutral-500">Enter</div>
                <span className="text-[9px] font-bold uppercase tracking-widest">Select</span>
            </div>
        </div>
      </div>
    </div>
  );
}
