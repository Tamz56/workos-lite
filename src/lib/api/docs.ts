import { DocListRow, DocRow } from "@/lib/types/docs";

export async function getDocs(q: string = "", opts?: { signal?: AbortSignal }): Promise<DocListRow[]> {
    const params = new URLSearchParams();
    if (q) params.set("q", q);

    const res = await fetch(`/api/docs?${params.toString()}`, {
        cache: "no-store",
        signal: opts?.signal
    });
    if (!res.ok) throw new Error(`GET /api/docs failed: ${res.status}`);
    const data = await res.json();
    return (data?.docs ?? []) as DocListRow[];
}

export async function getDoc(id: string): Promise<DocRow | null> {
    const res = await fetch(`/api/docs/${id}`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GET /api/docs/${id} failed: ${res.status}`);
    const data = await res.json();
    return (data?.doc ?? null) as DocRow | null;
}
