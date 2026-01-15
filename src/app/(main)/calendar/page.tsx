import { Suspense } from "react";
import CalendarClient from "./CalendarClient";

export default function CalendarPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading calendar...</div>}>
            <CalendarClient />
        </Suspense>
    );
}
