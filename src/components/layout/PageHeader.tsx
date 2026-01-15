import * as React from "react";

export function PageHeader({
    title,
    subtitle,
    actions,
    rightMeta,
}: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    rightMeta?: React.ReactNode; // optional (e.g. version badge)
}) {
    return (
        <div className="flex items-start justify-between gap-4 mb-6">
            <div className="min-w-0">
                <div className="text-2xl font-bold font-display tracking-tight text-neutral-900 truncate">{title}</div>
                {subtitle ? (
                    <div className="text-sm text-neutral-500 font-medium mt-1">{subtitle}</div>
                ) : null}
            </div>

            <div className="flex items-center gap-3">
                {rightMeta ? <div className="shrink-0">{rightMeta}</div> : null}
                {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}
            </div>
        </div>
    );
}
