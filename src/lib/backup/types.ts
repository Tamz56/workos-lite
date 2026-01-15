// Shared types for backup validation (FE/BE)

export type ValidateRes = {
    ok: boolean;
    kind: "backup" | "metadata" | "zip" | null;
    format: "v1" | "legacy" | "metadata" | null;
    summary: {
        tasks: number;
        events: number;
        docs: number;
        attachments: number;
        clips?: number;
    } | null;
    warnings: string[];
    errors: string[];
};

export type RestoreState = "idle" | "validating" | "valid" | "invalid";
