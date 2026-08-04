export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import ArborPlannerClient from "@/app/(main)/arbor-planner/ArborPlannerClient";

export const metadata = {
    title: "Arbor Planner | WorkOS",
    description: "Daily Capacity, Focus Blocks and Action Planning",
};

export default function PlannerPage() {
    return (
        <Suspense fallback={<div className="p-6 text-slate-400">Loading Arbor Planner…</div>}>
            <ArborPlannerClient />
        </Suspense>
    );
}
