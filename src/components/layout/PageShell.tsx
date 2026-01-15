import * as React from "react";

export function PageShell({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`w-full px-6 2xl:px-10 py-8 ${className}`.trim()}>
            {children}
        </div>
    );
}
