"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_BASE, LABEL_BASE } from "@/lib/styles";
import { Layout, CheckCircle2, ChevronRight, ChevronLeft, Plus, Box, Megaphone, Leaf, Code } from "lucide-react";
import { useRouter } from "next/navigation";
import { TEMPLATES, type Template } from "@/lib/templates";

// Map icons manually since they can't be easily serialized or passed from lib
const ICON_MAP: Record<string, any> = {
    marketing: Megaphone,
    farm: Leaf,
    software: Code,
};

interface CreateProjectWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateProjectWizard({ isOpen, onClose, onSuccess }: CreateProjectWizardProps) {
    const [step, setStep] = useState(1);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [projectName, setProjectName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleNext = () => {
        if (step === 1 && selectedTemplate) setStep(2);
        else if (step === 2 && projectName) setStep(3);
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleCreate = async () => {
        if (!selectedTemplate || !projectName) return;
        setLoading(true);
        setError(null);
        try {
            // In a real app, this would be an API call
            // Using a mock implementation for now as requested: "not write to DB until final confirmation"
            const res = await fetch("/api/admin/create-project-from-template", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectName,
                    templateId: selectedTemplate.id,
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={isOpen} title="Create New Project" onClose={onClose}>
            <div className="space-y-6">
                {/* Stepper */}
                <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    <div className={`flex items-center gap-2 ${step >= 1 ? 'text-black' : ''}`}>
                        <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${step >= 1 ? 'border-black bg-black text-white' : 'border-neutral-200'}`}>1</span>
                        Choose Template
                    </div>
                    <div className="h-px flex-1 bg-neutral-100 mx-4" />
                    <div className={`flex items-center gap-2 ${step >= 2 ? 'text-black' : ''}`}>
                        <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${step >= 2 ? 'border-black bg-black text-white' : 'border-neutral-200'}`}>2</span>
                        Project Name
                    </div>
                    <div className="h-px flex-1 bg-neutral-100 mx-4" />
                    <div className={`flex items-center gap-2 ${step >= 3 ? 'text-black' : ''}`}>
                        <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${step >= 3 ? 'border-black bg-black text-white' : 'border-neutral-200'}`}>3</span>
                        Review
                    </div>
                </div>

                {/* Step Content */}
                <div className="min-h-[300px]">
                    {step === 1 && (
                        <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-right-4">
                            {TEMPLATES.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(t)}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${selectedTemplate?.id === t.id ? 'border-black bg-neutral-50 shadow-sm' : 'border-neutral-100 hover:border-neutral-300'}`}
                                >
                                    <div className={`p-3 rounded-xl transition-colors ${selectedTemplate?.id === t.id ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200'}`}>
                                        {(() => {
                                            const Icon = ICON_MAP[t.id as keyof typeof ICON_MAP] || Layout;
                                            return <Icon className="w-5 h-5" />;
                                        })()}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-neutral-900">{t.name}</h4>
                                        <p className="text-xs text-neutral-500">{t.description}</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedTemplate?.id === t.id ? 'border-black bg-black text-white' : 'border-neutral-200'}`}>
                                        {selectedTemplate?.id === t.id && <CheckCircle2 className="w-3 h-3" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-2">
                                <label className={LABEL_BASE}>What should we call this project?</label>
                                <input
                                    autoFocus
                                    className={INPUT_BASE}
                                    placeholder="e.g. Q1 Marketing Kickoff"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                />
                                <p className="text-[11px] text-neutral-400">This will be the primary name used throughout the app.</p>
                            </div>
                            
                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                                <div className="text-blue-500">
                                    <Box className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-blue-900">Wait, where is the Area?</h4>
                                    <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                                        We'll automatically create this project in your "Inbox" area. You can move it to a specific Area later.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && selectedTemplate && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                            <div className="p-4 rounded-2xl border border-neutral-100 bg-neutral-50/50">
                                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Project Preview</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-black rounded-lg text-white">
                                            {(() => {
                                                const Icon = ICON_MAP[selectedTemplate.id as keyof typeof ICON_MAP] || Layout;
                                                return <Icon className="w-4 h-4" />;
                                            })()}
                                        </div>
                                        <span className="font-bold text-neutral-900">{projectName}</span>
                                    </div>
                                    
                                    <div className="pl-11 space-y-4">
                                        {selectedTemplate.lists.map((list: any) => (
                                            <div key={list.slug}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Layout className="w-3 h-3 text-neutral-400" />
                                                    <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{list.title}</span>
                                                </div>
                                                <ul className="space-y-1.5">
                                                    {list.tasks.map((task: string, i: number) => (
                                                        <li key={i} className="flex items-center gap-2 text-xs text-neutral-500 bg-white p-2 rounded-lg border border-neutral-100">
                                                            <CheckCircle2 className="w-3 h-3 text-neutral-200" />
                                                            {task}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                    <button
                        onClick={handleBack}
                        disabled={step === 1}
                        className={`${BUTTON_SECONDARY} ${step === 1 ? 'opacity-0' : ''}`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                    </button>

                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            disabled={(step === 1 && !selectedTemplate) || (step === 2 && !projectName)}
                            className={BUTTON_PRIMARY}
                        >
                            Continue
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleCreate}
                            disabled={loading}
                            className={BUTTON_PRIMARY}
                        >
                            {loading ? "Creating..." : "Confirm & Create"}
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 mt-4">{error}</p>}
            </div>
        </Modal>
    );
}
