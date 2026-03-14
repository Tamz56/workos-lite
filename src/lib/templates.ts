import { Megaphone, Leaf, Code } from "lucide-react";

export interface Template {
    id: string;
    name: string;
    description: string;
    icon?: any;
    lists: { slug: string; title: string; tasks: string[] }[];
}

export const TEMPLATES: Template[] = [
    {
        id: "marketing",
        name: "Marketing Campaign",
        description: "Plan and track your marketing content and ads.",
        lists: [
            { slug: "creative", title: "Creative & Copy", tasks: ["Draft social media posts", "Design campaign banners", "Write ad copy"] },
            { slug: "execution", title: "Execution", tasks: ["Schedule posts", "Launch FB Ads", "Track conversions"] },
        ],
    },
    {
        id: "farm",
        name: "Farm Operations",
        description: "Manage planting, harvesting, and field tasks.",
        lists: [
            { slug: "planting", title: "Planting Schedule", tasks: ["Order seeds", "Prepare Soil", "Seedling Nursery"] },
            { slug: "maintenance", title: "Maintenance", tasks: ["Irrigation check", "Fertilization", "Pest control"] },
        ],
    },
    {
        id: "software",
        name: "Software Development",
        description: "Agile workflow for building applications.",
        lists: [
            { slug: "backlog", title: "Backlog", tasks: ["User authentication", "Database schema", "UI Mockups"] },
            { slug: "sprint", title: "Current Sprint", tasks: ["API Setup", "Frontend structure"] },
            { slug: "done", title: "Done", tasks: ["Project initialization"] },
        ],
    },
];
