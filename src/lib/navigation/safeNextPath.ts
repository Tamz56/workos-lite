// ---------------------------------------------------------------------------
// Internal-only redirect target normalization (P1E.1A)
// Prevents open redirects on /human/login?next=...
// Accepts only same-origin absolute paths, e.g. "/", "/projects", "/p?q=1".
// ---------------------------------------------------------------------------

const FORBIDDEN_PREFIXES = ["//", "/\\", "\\"] as const;
const FORBIDDEN_MARKERS = ["javascript:", "data:", "vbscript:", "file:", "://"] as const;

export function safeNextPath(raw: string | null | undefined, fallback: string): string {
    if (typeof raw !== "string" || raw.trim() === "") return fallback;
    const value = raw.trim();
    if (!value.startsWith("/")) return fallback;
    if (FORBIDDEN_PREFIXES.some((prefix) => value.startsWith(prefix))) return fallback;
    const lower = value.toLowerCase();
    if (FORBIDDEN_MARKERS.some((marker) => lower.includes(marker))) return fallback;
    if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
    return value;
}
