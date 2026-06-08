import React from "react";
import PromptStudioClient from "@/components/workspaces/prompt-studio/PromptStudioClient";

export const metadata = {
    title: "Prompt Studio | ArborDesk",
    description: "Manage, version and preview structured prompt templates for content creation",
};

export default function PromptStudioPage() {
    return <PromptStudioClient />;
}
