export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import ArborDeskClient from "./ArborDeskClient";

export const metadata = {
    title: "Today Desk | ArborDesk",
    description: "Your simple, action-first work surface",
};

export default function ArborDeskPage() {
    return (
        <Suspense fallback={<div className="p-6 text-neutral-400">Loading ArborDesk…</div>}>
            <ArborDeskClient />
        </Suspense>
    );
}
