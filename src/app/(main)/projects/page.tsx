import { Suspense } from "react";
import ProjectsClient from "./ProjectsClient";

export const metadata = { title: "Projects | WorkOS" };

export default function ProjectsPage() {
    return (
        <Suspense fallback={<div className="p-10 flex justify-center items-center gap-3 text-neutral-400"><span className="animate-spin text-xl">⏳</span> Loading Projects...</div>}>
            <ProjectsClient />
        </Suspense>
    );
}
