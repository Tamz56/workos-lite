"use client";

import { useState } from "react";
import { ResetDemoDataDialog } from "@/components/ResetDemoDataDialog";
import { BUTTON_DANGER } from "@/lib/styles";
import { RefreshCcw } from "lucide-react";
import { Toast } from "@/components/ui/Toast";

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
                        window.location.href = "/dashboard";
                    }, 2500);
                }}
            />

            <Toast 
                isVisible={showSuccessToast} 
                message="Reset Successful! Redirecting..." 
                onClose={() => setShowSuccessToast(false)} 
            />
        </div>
    );
}
