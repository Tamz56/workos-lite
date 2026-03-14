"use client";

import React from "react";

interface ModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

export function Modal({ isOpen, title, onClose, children }: ModalProps) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="text-lg font-medium text-neutral-900">{title}</div>
                    <button className="rounded-lg px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-50 hover:text-black transition-colors" onClick={onClose}>
                        Close
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
