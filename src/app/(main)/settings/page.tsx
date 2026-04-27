"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, Database, Laptop, Moon, Sun } from "lucide-react";

import { useTheme, type ThemePreference } from "@/components/ThemeProvider";
import { PageShell } from "@/components/layout/PageShell";

const themeOptions: {
    value: ThemePreference;
    label: string;
    description: string;
    icon: ReactNode;
}[] = [
    {
        value: "system",
        label: "System",
        description: "Follow your device appearance.",
        icon: <Laptop className="h-5 w-5" />,
    },
    {
        value: "light",
        label: "Light",
        description: "Clean bright workspace.",
        icon: <Sun className="h-5 w-5" />,
    },
    {
        value: "dark",
        label: "Dark",
        description: "Low-glare focused workspace.",
        icon: <Moon className="h-5 w-5" />,
    },
];

export default function SettingsPage() {
    const { theme, resolvedTheme, setTheme } = useTheme();

    return (
        <PageShell className="max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-theme-primary">Settings</h1>
                    <p className="mt-1 text-sm font-medium text-theme-secondary">
                        Tune ArborDesk to match your working environment.
                    </p>
                </div>
                <Link
                    href="/settings/data"
                    className="inline-flex w-fit items-center gap-2 rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-xs font-black uppercase tracking-widest text-theme-secondary shadow-sm transition-theme hover:border-theme-accent/50 hover:text-theme-primary"
                >
                    <Database className="h-4 w-4" />
                    Data Management
                </Link>
            </div>

            <section className="rounded-3xl border border-theme-border bg-theme-card p-5 shadow-theme-soft transition-theme sm:p-6">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xs font-black uppercase tracking-widest text-theme-muted">Appearance</h2>
                    <p className="text-sm font-medium text-theme-secondary">
                        Choose how the app should look. Changes apply immediately and stay after refresh.
                    </p>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {themeOptions.map((option) => {
                        const isActive = theme === option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setTheme(option.value)}
                                className={`group flex min-h-32 flex-col justify-between rounded-2xl border p-4 text-left shadow-sm transition-theme active:scale-[0.99] ${
                                    isActive
                                        ? "border-theme-accent bg-theme-accent/10 text-theme-primary"
                                        : "border-theme-border bg-theme-panel text-theme-secondary hover:border-theme-accent/40 hover:bg-theme-hover"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className={isActive ? "text-theme-accent" : "text-theme-muted group-hover:text-theme-primary"}>
                                        {option.icon}
                                    </div>
                                    {isActive ? <CheckCircle2 className="h-5 w-5 text-theme-accent" /> : null}
                                </div>
                                <div>
                                    <div className="font-black text-theme-primary">{option.label}</div>
                                    <div className="mt-1 text-sm font-medium text-theme-secondary">{option.description}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-4 rounded-2xl border border-theme-border bg-theme-input/50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-theme-muted">
                    Active: {theme} / resolved {resolvedTheme}
                </div>
            </section>

            <section className="rounded-3xl border border-theme-border bg-theme-card p-5 shadow-theme-soft transition-theme sm:p-6">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xs font-black uppercase tracking-widest text-theme-muted">Preview</h2>
                    <p className="text-sm font-medium text-theme-secondary">A quick look at core surfaces in the selected theme.</p>
                </div>

                <div className="mt-5 overflow-hidden rounded-3xl border border-theme-border bg-theme-app shadow-theme-soft">
                    <div className="grid min-h-72 grid-cols-[88px_1fr] sm:grid-cols-[160px_1fr]">
                        <div className="border-r border-theme-border bg-theme-sidebar p-4">
                            <div className="h-3 w-20 rounded-full bg-white/80" />
                            <div className="mt-6 space-y-2">
                                <div className="h-8 rounded-xl bg-white/15" />
                                <div className="h-8 rounded-xl bg-white/10" />
                                <div className="h-8 rounded-xl bg-white/10" />
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            <div className="mb-5 flex items-center justify-between gap-4">
                                <div>
                                    <div className="h-3 w-24 rounded-full bg-theme-muted/50" />
                                    <div className="mt-2 h-6 w-40 rounded-full bg-theme-primary/90" />
                                </div>
                                <div className="h-9 w-20 rounded-xl bg-theme-primary" />
                            </div>

                            <div className="rounded-2xl border border-theme-border bg-theme-card p-4 shadow-theme-soft">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="h-4 w-32 rounded-full bg-theme-primary/90" />
                                        <div className="mt-3 h-3 w-full max-w-sm rounded-full bg-theme-muted/45" />
                                        <div className="mt-2 h-3 w-2/3 rounded-full bg-theme-muted/35" />
                                    </div>
                                    <div className="h-10 w-10 rounded-2xl bg-theme-accent/15" />
                                </div>

                                <div className="mt-5 flex flex-wrap items-center gap-3">
                                    <div className="rounded-xl bg-theme-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-theme-app">
                                        Button
                                    </div>
                                    <div className="text-sm font-medium text-theme-secondary">
                                        Text stays clear across surfaces.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </PageShell>
    );
}
