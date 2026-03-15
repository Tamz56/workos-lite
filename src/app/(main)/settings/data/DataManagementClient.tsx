"use client";

import { useState } from "react";
import { ResetDemoDataDialog } from "@/components/ResetDemoDataDialog";
import { BUTTON_DANGER } from "@/lib/styles";
import { RefreshCcw, CheckCircle2 } from "lucide-react";

export default function DataManagementClient() {
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-red-100 bg-red-50/30 p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-800 mb-2 flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4" />
                    Danger Zone
                </h3>
                <p className="text-sm text-neutral-600 mb-4">
                    Reset your workspace to clear demo content or start fresh with a clean slate.
                </p>
                <button 
                    onClick={() => setIsResetOpen(true)}
                    className={BUTTON_DANGER}
                >
                    Reset Demo Data...
                </button>
            </div>

            <ResetDemoDataDialog
                isOpen={isResetOpen}
                onClose={() => setIsResetOpen(false)}
                onSuccess={() => {
                    setIsResetOpen(false);
                    setShowSuccessToast(true);
                    setTimeout(() => {
                        setShowSuccessToast(false);
                        window.location.href = "/dashboard";
                    }, 2000);
                }}
            />

            {showSuccessToast && (
                <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Reset Successful! Redirecting...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
