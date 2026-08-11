// ---------------------------------------------------------------------------
// WorkOS-Lite canonical backlog create schema
// AUTOMATION-001-P1B.0
// Pure extraction of the route-local schema from
// src/app/api/projects/[slug]/items/route.ts (semantics unchanged).
// ---------------------------------------------------------------------------

import { z } from "zod";

export const CreateProjectItemSchema = z.object({
    title: z.string().min(1),
    status: z.enum(["inbox", "planned", "done"]).default("planned"),
    priority: z.number().int().nullable().optional(),
    schedule_bucket: z.enum(["morning", "afternoon", "evening", "none"]).nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    is_milestone: z.union([z.boolean(), z.number()]).transform(v => (v ? 1 : 0)).optional(),
    workstream: z.string().nullable().optional(),
    dod_text: z.string().nullable().optional(),
    notes: z.string().nullable().optional()
});
