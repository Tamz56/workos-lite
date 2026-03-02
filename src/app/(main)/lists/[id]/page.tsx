export const dynamic = "force-dynamic";
export const revalidate = 0;

import ListDetailClient from "./ListDetailClient";

export default function ListDetailPage({ params }: { params: { id: string } }) {
    return <ListDetailClient listId={params.id} />;
}
