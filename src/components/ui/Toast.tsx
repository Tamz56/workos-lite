"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: "success" | "error" | "info";
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function Toast({ message, isVisible, onClose, type = "success", duration = 3000, action }: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const bgClass = type === "success" ? "bg-neutral-900" : type === "error" ? "bg-red-600" : "bg-blue-600";
  const icon = type === "success" ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-none">
      <div className={`${bgClass} border border-white/10 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-4 font-bold text-sm max-w-md pointer-events-auto`}>
        <div className="shrink-0">{icon}</div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="uppercase tracking-[0.15em] text-[9px] opacity-40 font-black truncate">System Notification</span>
            <span className="text-white leading-snug font-bold">{message}</span>
        </div>
        
        {action && (
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                    onClose();
                }}
                className="bg-white text-black px-4 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-neutral-200 transition-all active:scale-90 shrink-0 shadow-lg border-2 border-transparent hover:border-black/5"
            >
                {action.label}
            </button>
        )}

        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0 ml-1">
          <X className="w-4 h-4 opacity-40 hover:opacity-100" />
        </button>
      </div>
    </div>
  );
}
