export const dynamic = "force-dynamic";
export const revalidate = 0;

import WorkspacesClient from "@/components/workspaces/WorkspacesClient";

export const metadata = {
    title: "Workspaces | WorkOS",
};

export default function WorkspacesPage() {
    return <WorkspacesClient />;
}
