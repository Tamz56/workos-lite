export const dynamic = "force-dynamic";
export const revalidate = 0;

import WorkspaceDetailClient from "@/components/workspaces/WorkspaceDetailClient";


export default async function WorkspaceDetailPage({ params }: { params: Promise<{ workspace: string }> }) {
    const { workspace } = await params;
    return <WorkspaceDetailClient workspaceId={workspace} />;
}
