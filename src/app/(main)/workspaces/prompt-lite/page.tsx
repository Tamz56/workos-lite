import React from "react";
import PromptLiteClient from "@/components/workspaces/prompt-lite/PromptLiteClient";

export const metadata = {
    title: "Prompt Lite | ArborDesk",
    description: "Universal Prompt Helper for generating custom prompts for external AI models",
};

export default function PromptLitePage() {
    return <PromptLiteClient />;
}
