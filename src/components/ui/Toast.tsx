"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: "success" | "error" | "info";
  duration?: number;
}

export function Toast({ message, isVisible, onClose, type = "success", duration = 3000 }: ToastProps) {
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
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className={`${bgClass} border border-white/10 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black text-sm uppercase tracking-widest min-w-[300px]`}>
        {icon}
        <span className="flex-1">{message}</span>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-4 h-4 opacity-50 hover:opacity-100" />
        </button>
      </div>
    </div>
  );
}
