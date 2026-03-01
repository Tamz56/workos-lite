import { Workspace } from "./workspaces";

export interface List {
    id: string;
    workspace: Workspace;
    slug: string;
    title: string;
    description: string;
    created_at: string;
    updated_at: string;
}

// In terms of creating Lists, the payload follows this structure:
export interface CreateListInput {
    workspace: Workspace;
    slug: string;
    title: string;
    description?: string;
}
