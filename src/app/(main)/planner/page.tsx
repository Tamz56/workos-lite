import { Suspense } from "react";
import PlannerClient from "./PlannerClient";

export default function PlannerPage() {
    return (
        <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
            <PlannerClient />
        </Suspense>
    );
}
