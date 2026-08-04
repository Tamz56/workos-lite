export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import ArborDeskClient from "@/app/(main)/arbor-desk/ArborDeskClient";

export const metadata = {
    title: "ArborDesk Command Center | WorkOS",
    description: "Your simple, action-first work surface",
};

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="p-6 text-slate-400">Loading ArborDesk Command Center…</div>}>
            <ArborDeskClient />
        </Suspense>
    );
}
