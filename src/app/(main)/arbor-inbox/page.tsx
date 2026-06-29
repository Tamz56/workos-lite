export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import ArborInboxClient from "./ArborInboxClient";

export const metadata = {
    title: "Arbor Inbox | ArborDesk",
    description: "Validate and import structured work data from Arbor or ChatGPT",
};

export default function ArborInboxPage() {
    return (
        <Suspense fallback={<div className="p-6 text-neutral-400">Loading Arbor Inbox…</div>}>
            <ArborInboxClient />
        </Suspense>
    );
}
