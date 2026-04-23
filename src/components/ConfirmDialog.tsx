import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: (e?: React.MouseEvent) => void | Promise<void>;
    onCancel: (e?: React.MouseEvent) => void;
    children?: React.ReactNode;
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    danger = false,
    onConfirm,
    onCancel,
    children,
}: ConfirmDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async (e: React.MouseEvent) => {
        setLoading(true);
        try {
            await onConfirm(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} title={title} onClose={onCancel} maxWidth="max-w-md">
            <div className="space-y-6">
                <p className="text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {message}
                </p>
                
                {children}
                
                <div className="flex flex-row-reverse gap-3 pt-4 border-t border-neutral-50">
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading}
                        className={`px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${
                            danger
                            ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200"
                            : "bg-black text-white hover:bg-neutral-800 shadow-lg shadow-black/10"
                        }`}
                    >
                        {loading ? "Processing..." : confirmText}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-all"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
