import { z } from "zod";
import { AI_RESOURCE_AVAILABILITIES, AI_RESOURCE_COST_TIERS } from "./types";

const NullableText = z.preprocess(value => value === "" ? null : value, z.string().nullable().optional());
const NullableResetAt = z.preprocess(value => value === "" ? null : value, z.string().datetime({ offset: true }).nullable().optional());

export const CreateAIResourceProfileSchema = z.object({
    provider_key: z.string().trim().min(1).regex(/^[a-z0-9_-]+$/, "provider_key must use lowercase letters, numbers, hyphens, or underscores."),
    display_name: z.string().trim().min(1),
    availability: z.enum(AI_RESOURCE_AVAILABILITIES).default("unknown"),
    remaining_percent: z.number().int().min(0).max(100).nullable().optional(),
    reset_at: NullableResetAt,
    cost_tier: z.enum(AI_RESOURCE_COST_TIERS).nullable().optional(),
    notes: NullableText,
}).strict();

export const PatchAIResourceProfileSchema = z.object({
    display_name: z.string().trim().min(1).optional(),
    availability: z.enum(AI_RESOURCE_AVAILABILITIES).optional(),
    remaining_percent: z.number().int().min(0).max(100).nullable().optional(),
    reset_at: NullableResetAt,
    cost_tier: z.enum(AI_RESOURCE_COST_TIERS).nullable().optional(),
    notes: NullableText,
}).strict();
