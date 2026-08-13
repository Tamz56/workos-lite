import { HumanLoginForm } from "@/components/operations-review/HumanLoginForm";

export default async function HumanLoginPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string | string[] }>;
}) {
    const params = await searchParams;
    const next = typeof params.next === "string" ? params.next : undefined;
    return <HumanLoginForm next={next} />;
}
