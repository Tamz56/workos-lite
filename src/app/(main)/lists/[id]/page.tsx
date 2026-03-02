import ListDetailClient from "./ListDetailClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <ListDetailClient listId={id} />;
}
