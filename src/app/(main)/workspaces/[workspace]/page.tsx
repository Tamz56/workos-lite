
import WorkspaceDetailClient from "@/components/workspaces/WorkspaceDetailClient";

// Force dynamic since we use searchParams if needed, but here we use params
export const dynamic = "force-dynamic";

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ workspace: string }> }) {
    const { workspace } = await params;
    return <WorkspaceDetailClient workspaceId={workspace} />;
}
