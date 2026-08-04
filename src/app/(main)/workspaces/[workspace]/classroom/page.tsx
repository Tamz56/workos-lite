import React from "react";
import BaClassroomClient from "@/components/workspaces/content/classroom/BaClassroomClient";

export const metadata = {
    title: "BA Classroom | ArborDesk",
    description: "Business Analyst Sprint Learning Classroom for ArborDesk",
};

interface ClassroomPageProps {
    params: Promise<{ workspace: string }>;
}

export default async function ClassroomPage({ params }: ClassroomPageProps) {
    const { workspace } = await params;
    return <BaClassroomClient workspaceId={workspace} />;
}
