"use client";

import React from "react";
import { createPortal } from "react-dom";

interface ModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string; // e.g. "max-w-2xl" or "max-w-4xl"
    hideBackdrop?: boolean;
    closeOnOutsideClick?: boolean;
}

// Global list to track open modals in mount order
let modalList: string[] = [];

export function isAnyModalOpen() {
    return modalList.length > 0;
}

export function Modal(props: ModalProps) {
    const { isOpen, title, onClose, children, maxWidth = "max-w-2xl", hideBackdrop = false, closeOnOutsideClick = true } = props;
    const [mounted, setMounted] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const modalId = React.useId();

    React.useEffect(() => {
        setMounted(true);
        if (!isOpen) return;

        // Add to stack only if not already present (stable mount order)
        if (!modalList.includes(modalId)) {
            modalList.push(modalId);
        }

        // Prevent body scroll
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        // Focus trap initial focus
        setTimeout(() => containerRef.current?.focus(), 10);

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                // Only the topmost modal in the stack handles Escape
                if (modalList[modalList.length - 1] === modalId) {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                }
            }
        };

        window.addEventListener("keydown", handleEsc, true);
        return () => {
            modalList = modalList.filter(id => id !== modalId);
            
            window.removeEventListener("keydown", handleEsc, true);
            document.body.style.overflow = originalOverflow || "unset";
        };
    }, [isOpen, onClose, modalId]);

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 text-neutral-900">
            {/* Overlay - High contrast glassmorphism */}
            {!hideBackdrop && (
                <div 
                    className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xl animate-in fade-in duration-300" 
                    onClick={(e) => {
                        if (!closeOnOutsideClick) return;
                        e.stopPropagation();
                        onClose();
                    }} 
                />
            )}
            
            {/* Modal Content - Compact Premium Design */}
            <div 
                ref={containerRef}
                tabIndex={-1}
                className={`relative w-full ${maxWidth} rounded-[24px] border border-white/20 bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh] outline-none`}
            >
                {/* Header - Compact */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-between gap-3 shrink-0">
                    <div className="text-2xl font-black text-neutral-900 tracking-tight">{title}</div>
                    <button 
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-100 hover:text-black transition-all active:scale-90" 
                        onClick={onClose}
                        title="Close (Esc)"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                {/* Scrollable Body - Compact */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

// export default Modal;
