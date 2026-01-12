import type { ScheduleBucket } from "@/lib/types";

export function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export function defaultBucketForWorkspace(workspace: string): ScheduleBucket | undefined {
    const w = String(workspace).toLowerCase();

    if (w === "content") return "afternoon";
    if (w === "system") return "morning";
    if (w === "ops") return "morning";
    if (w === "personal") return "evening";
    if (w === "avacrm") return "morning";

    return undefined;
}
