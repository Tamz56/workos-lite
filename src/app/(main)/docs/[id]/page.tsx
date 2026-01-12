// src/app/(main)/docs/[id]/page.tsx
import DocClient from "./DocClient";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <DocClient id={id} />;
}
