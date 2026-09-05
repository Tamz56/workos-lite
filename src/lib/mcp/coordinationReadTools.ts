import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
    COORDINATION_READ_SCHEMA_VERSION,
    type CoordinationReadAdapter,
    type CoordinationReadResult,
    type CoordinationReadSelector,
} from "@/lib/coordination/readAdapter";
import {
    PROJECT_RECOVERY_SCHEMA_VERSION,
    type ProjectRecoveryAdapter,
    type ProjectRecoveryResult,
} from "@/lib/coordination/projectRecoveryAdapter";
import { MCP_REQUIRED_SCOPE } from "./config";

export const COORDINATION_TOOL_NAMES = [
    "coordination_checkpoint_lookup",
    "coordination_checkpoint_history",
    "coordination_checkpoint_current",
    "coordination_checkpoint_resume",
] as const;

export type CoordinationToolName = (typeof COORDINATION_TOOL_NAMES)[number];

const identityInput = {
    projectSlug: z.string().min(1).max(200),
    laneKey: z.string().min(1).max(200),
};

const lookupInput = z.object({
    ...identityInput,
    selector: z.discriminatedUnion("by", [
        z.object({ by: z.literal("checkpoint_id"), checkpointId: z.string().min(1).max(4_096) }).strict(),
        z.object({ by: z.literal("seq"), seq: z.number().int().positive() }).strict(),
    ]),
}).strict();

const laneInput = z.object(identityInput).strict();

const OAUTH_SCHEMES = [{ type: "oauth2" as const, scopes: [MCP_REQUIRED_SCOPE] }];
const READ_ONLY_ANNOTATIONS = {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
};

const OUTPUT_SCHEMA = {
    type: "object" as const,
    properties: {
        schemaVersion: { type: "string", const: COORDINATION_READ_SCHEMA_VERSION },
        operation: { type: "string" },
        status: { type: "string" },
        authorityClass: {
            type: "string",
            enum: ["NONE", "HISTORICAL_ONLY", "CURRENT", "AUTHORITATIVE_RESUME"],
        },
        identity: {
            type: "object",
            properties: {
                projectSlug: { type: "string" },
                laneKey: { type: "string" },
                laneId: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
            required: ["projectSlug", "laneKey", "laneId"],
            additionalProperties: false,
        },
        data: { type: "object", additionalProperties: true },
        detail: { type: "string" },
    },
    required: ["schemaVersion", "operation", "status", "authorityClass", "identity"],
    additionalProperties: false,
};

type OpenAiTool = Tool & { securitySchemes: typeof OAUTH_SCHEMES };

function tool(
    name: CoordinationToolName,
    title: string,
    description: string,
    inputSchema: Tool["inputSchema"],
): OpenAiTool {
    return {
        name,
        title,
        description,
        inputSchema,
        outputSchema: OUTPUT_SCHEMA,
        annotations: READ_ONLY_ANNOTATIONS,
        securitySchemes: OAUTH_SCHEMES,
        _meta: { securitySchemes: OAUTH_SCHEMES },
    };
}

export const COORDINATION_READ_TOOLS: readonly OpenAiTool[] = [
    tool(
        "coordination_checkpoint_lookup",
        "Look up a WorkOS Coordination checkpoint",
        "Read one exact historical Coordination checkpoint by checkpoint ID or Lane-local seq. This operation never asserts CURRENT.",
        {
            type: "object",
            properties: {
                projectSlug: { type: "string", minLength: 1, maxLength: 200 },
                laneKey: { type: "string", minLength: 1, maxLength: 200 },
                selector: {
                    oneOf: [
                        {
                            type: "object",
                            properties: {
                                by: { type: "string", const: "checkpoint_id" },
                                checkpointId: { type: "string", minLength: 1, maxLength: 4_096 },
                            },
                            required: ["by", "checkpointId"],
                            additionalProperties: false,
                        },
                        {
                            type: "object",
                            properties: {
                                by: { type: "string", const: "seq" },
                                seq: { type: "integer", minimum: 1 },
                            },
                            required: ["by", "seq"],
                            additionalProperties: false,
                        },
                    ],
                },
            },
            required: ["projectSlug", "laneKey", "selector"],
            additionalProperties: false,
        },
    ),
    tool(
        "coordination_checkpoint_history",
        "Read WorkOS Coordination checkpoint history",
        "Read the ordered historical checkpoint evidence for one WorkOS Project Lane. Historical access never asserts CURRENT.",
        {
            type: "object",
            properties: {
                projectSlug: { type: "string", minLength: 1, maxLength: 200 },
                laneKey: { type: "string", minLength: 1, maxLength: 200 },
            },
            required: ["projectSlug", "laneKey"],
            additionalProperties: false,
        },
    ),
    tool(
        "coordination_checkpoint_current",
        "Resolve the current WorkOS Coordination checkpoint",
        "Resolve CURRENT only through the canonical G6B U2 checkpoint-lineage service. No timestamp, Chat, Session, or adapter currentness is used.",
        {
            type: "object",
            properties: {
                projectSlug: { type: "string", minLength: 1, maxLength: 200 },
                laneKey: { type: "string", minLength: 1, maxLength: 200 },
            },
            required: ["projectSlug", "laneKey"],
            additionalProperties: false,
        },
    ),
    tool(
        "coordination_checkpoint_resume",
        "Resume from the validated current WorkOS Coordination checkpoint",
        "Read the authoritative validated-current-only Coordination resume snapshot. No historical checkpoint override is accepted and the operation is side-effect free.",
        {
            type: "object",
            properties: {
                projectSlug: { type: "string", minLength: 1, maxLength: 200 },
                laneKey: { type: "string", minLength: 1, maxLength: 200 },
            },
            required: ["projectSlug", "laneKey"],
            additionalProperties: false,
        },
    ),
];

export const PROJECT_RECOVERY_TOOL_NAME = "project_recovery" as const;

export const PROJECT_RECOVERY_TOOL_NAMES = [PROJECT_RECOVERY_TOOL_NAME] as const;

export type ProjectRecoveryToolName = (typeof PROJECT_RECOVERY_TOOL_NAMES)[number];

const projectRecoveryInput = z.object({ projectSlug: z.string().min(1).max(200) }).strict();

const PROJECT_RECOVERY_OUTPUT_SCHEMA = {
    type: "object" as const,
    properties: {
        schemaVersion: { type: "string", const: PROJECT_RECOVERY_SCHEMA_VERSION },
        operation: { type: "string", const: "PROJECT_RECOVERY" },
        status: { type: "string" },
        projectId: { anyOf: [{ type: "string" }, { type: "null" }] },
        projectSlug: { type: "string" },
        projectState: {
            type: "object",
            properties: {
                value: { type: "null" },
                source: { type: "null" },
                authorityClass: { type: "string", const: "NONE" },
                currentness: { type: "string", const: "NOT_PROVEN" },
            },
            required: ["value", "source", "authorityClass", "currentness"],
            additionalProperties: false,
        },
        candidates: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    projectSlug: { type: "string" },
                    laneId: { type: "string" },
                    laneKey: { type: "string" },
                },
                required: ["projectSlug", "laneId", "laneKey"],
                additionalProperties: false,
            },
        },
        coordinationResume: { anyOf: [{ type: "object" }, { type: "null" }] },
        detail: { anyOf: [{ type: "string" }, { type: "null" }] },
    },
    required: ["schemaVersion", "operation", "status", "projectId", "projectSlug", "projectState"],
    additionalProperties: false,
};

export const PROJECT_RECOVERY_TOOLS: readonly OpenAiTool[] = [
    {
        name: PROJECT_RECOVERY_TOOL_NAME,
        title: "Resolve WorkOS Project recovery resume",
        description:
            "Resolve Project recovery through the single owned Coordination Lane. Rejects Projects without a Lane or with multiple Lanes and never asserts CANONICAL_PROJECT_STATE.",
        inputSchema: {
            type: "object",
            properties: { projectSlug: { type: "string", minLength: 1, maxLength: 200 } },
            required: ["projectSlug"],
            additionalProperties: false,
        },
        outputSchema: PROJECT_RECOVERY_OUTPUT_SCHEMA,
        annotations: READ_ONLY_ANNOTATIONS,
        securitySchemes: OAUTH_SCHEMES,
        _meta: { securitySchemes: OAUTH_SCHEMES },
    },
];

export interface CoordinationReadToolset {
    readonly tools: readonly OpenAiTool[];
    handles(name: string): boolean;
    call(name: string, args: unknown): CallToolResult;
}

function successResult(output: CoordinationReadResult | ProjectRecoveryResult): CallToolResult {
    return {
        structuredContent: output as unknown as Record<string, unknown>,
        content: [{ type: "text", text: JSON.stringify(output) }],
    };
}

function toolError(code: string, message: string): CallToolResult {
    const error = { schemaVersion: COORDINATION_READ_SCHEMA_VERSION, code, message };
    return {
        isError: true,
        structuredContent: { error },
        content: [{ type: "text", text: JSON.stringify({ error }) }],
    };
}

function projectAllowed(projectSlug: string, allowedProjectSlugs: readonly string[]): boolean {
    return allowedProjectSlugs.includes(projectSlug);
}

export function createCoordinationReadToolset(
    adapter: CoordinationReadAdapter,
    allowedProjectSlugs: readonly string[],
    recovery?: ProjectRecoveryAdapter,
): CoordinationReadToolset {
    const names = new Set<string>(COORDINATION_TOOL_NAMES);
    names.add(PROJECT_RECOVERY_TOOL_NAME);
    return {
        tools: [...COORDINATION_READ_TOOLS, ...PROJECT_RECOVERY_TOOLS],
        handles: (name) => names.has(name) || name.startsWith("coordination_checkpoint_"),
        call(name, args) {
            try {
                if (name === PROJECT_RECOVERY_TOOL_NAME) {
                    const input = projectRecoveryInput.parse(args ?? {});
                    if (!projectAllowed(input.projectSlug, allowedProjectSlugs)) {
                        return toolError("PROJECT_NOT_ALLOWED", "Project is not available through this MCP resource");
                    }
                    if (!recovery) {
                        return toolError("EVIDENCE_UNAVAILABLE", "Project recovery is not configured on this server");
                    }
                    return successResult(recovery.recover(input.projectSlug));
                }
                if (name === "coordination_checkpoint_lookup") {
                    const input = lookupInput.parse(args ?? {});
                    if (!projectAllowed(input.projectSlug, allowedProjectSlugs)) {
                        return toolError("PROJECT_NOT_ALLOWED", "Project is not available through this MCP resource");
                    }
                    const selector = input.selector as CoordinationReadSelector;
                    return successResult(adapter.lookup(input.projectSlug, input.laneKey, selector));
                }
                if (name === "coordination_checkpoint_history") {
                    const input = laneInput.parse(args ?? {});
                    if (!projectAllowed(input.projectSlug, allowedProjectSlugs)) {
                        return toolError("PROJECT_NOT_ALLOWED", "Project is not available through this MCP resource");
                    }
                    return successResult(adapter.history(input.projectSlug, input.laneKey));
                }
                if (name === "coordination_checkpoint_current") {
                    const input = laneInput.parse(args ?? {});
                    if (!projectAllowed(input.projectSlug, allowedProjectSlugs)) {
                        return toolError("PROJECT_NOT_ALLOWED", "Project is not available through this MCP resource");
                    }
                    return successResult(adapter.current(input.projectSlug, input.laneKey));
                }
                if (name === "coordination_checkpoint_resume") {
                    const input = laneInput.parse(args ?? {});
                    if (!projectAllowed(input.projectSlug, allowedProjectSlugs)) {
                        return toolError("PROJECT_NOT_ALLOWED", "Project is not available through this MCP resource");
                    }
                    return successResult(adapter.resume(input.projectSlug, input.laneKey));
                }
                return toolError("UNSUPPORTED_OPERATION", `Unsupported Coordination MCP operation ${name}`);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    return toolError("INVALID_ARGUMENT", "Coordination MCP arguments are invalid");
                }
                return toolError("EVIDENCE_UNAVAILABLE", "Coordination read request failed");
            }
        },
    };
}
