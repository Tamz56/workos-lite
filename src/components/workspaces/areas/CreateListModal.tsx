"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { INPUT_BASE, LABEL_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/lib/styles";

interface CreateListModalProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    onCreated: (title: string) => Promise<void>;
}

export default function CreateListModal({ isOpen, onClose, workspaceId, onCreated }: CreateListModalProps) {
    const [title, setTitle] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTitle("");
            setError(null);
            setShowDiscardConfirm(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        if (showDiscardConfirm) {
            setShowDiscardConfirm(false);
            return;
        }

        if (title.trim() && !isSubmitting) {
            setShowDiscardConfirm(true);
        } else {
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onCreated(title.trim());
            onClose();
        } catch (error: any) {
            console.error("Failed to create list:", error);
            setError(error.message || "Failed to create list. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="New List / Topic">
            <div className="relative">
                {/* Discard Confirmation Overlay */}
                {showDiscardConfirm && (
                    <div className="absolute inset-0 z-[100] bg-white/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="max-w-xs text-center space-y-6 p-6">
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-neutral-900">Discard List?</h3>
                                <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                                    Are you sure you want to discard this draft?
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={onClose} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-sm">Discard</button>
                                <button onClick={() => setShowDiscardConfirm(false)} className="w-full py-3 bg-neutral-100 text-neutral-600 rounded-xl font-bold text-sm">Keep Editing</button>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>×</button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className={LABEL_BASE}>Title</label>
                    <input
                        autoFocus
                        className={INPUT_BASE}
                        placeholder={workspaceId === 'content' ? "GF-CONTENT-XXX — Topic Title" : "List Title"}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={isSubmitting}
                    />
                    {workspaceId === 'content' && (
                        <p className="mt-2 text-[10px] text-neutral-400 font-medium">
                            Tip: For Content workspace, use the format: <code className="bg-neutral-100 px-1 rounded">GF-CONTENT-XXX — Title</code>
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                    <button
                        type="button"
                        onClick={handleClose}
                        className={BUTTON_SECONDARY}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={BUTTON_PRIMARY}
                        disabled={!title.trim() || isSubmitting}
                    >
                        {isSubmitting ? "Creating..." : "Create List"}
                    </button>
                </div>
            </form>
        </div>
    </Modal>
    );
}
