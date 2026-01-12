"use client";

import { useState } from "react";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: (e?: React.MouseEvent) => void | Promise<void>;
    onCancel: (e?: React.MouseEvent) => void;
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
}: ConfirmDialogProps) {
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async (e: React.MouseEvent) => {
        setLoading(true);
        try {
            await onConfirm(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onCancel}>
            <div
                className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <h3 className={`text-lg font-semibold mb-2 ${danger ? "text-red-600" : "text-gray-900"}`}>
                        {title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                        {message}
                    </p>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading}
                        autoFocus
                        aria-label={confirmText}
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed ${danger
                            ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                            : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                            }`}
                    >
                        {loading ? "Processing..." : confirmText}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        aria-label={cancelText}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
}
