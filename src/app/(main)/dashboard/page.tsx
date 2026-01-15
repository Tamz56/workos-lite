import { Suspense } from "react";
import DashboardClient from "./DashboardClient";

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="p-6 text-neutral-400">Loading dashboard…</div>}>
            <DashboardClient />
        </Suspense>
    );
}
