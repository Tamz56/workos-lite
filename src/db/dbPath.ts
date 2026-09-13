import path from "path";

export function resolveWorkosDbPath(
    cwd: string,
    override: string | undefined,
): string {
    const normalizedOverride = override?.trim();

    if (!normalizedOverride) {
        return path.resolve(cwd, "data/workos.db");
    }

    if (!path.isAbsolute(normalizedOverride)) {
        throw new Error("WORKOS_DB_PATH must be an absolute path");
    }

    return path.normalize(normalizedOverride);
}
