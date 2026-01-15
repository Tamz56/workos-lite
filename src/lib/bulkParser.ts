import { WORKSPACES, Workspace, normalizeWorkspace } from "./workspaces";
import { toYmd } from "@/lib/dates";

export interface ParsedTask {
    title: string;
    workspace: Workspace;
    scheduled_date: string | null; // YYYY-MM-DD
    raw_line: string;
    notes: string; // Store tags, project, stage here
    isValid: boolean;
    validationError?: string;
    // Metadata for UI flags
    meta: {
        project?: string;
        stage?: string;
        tags: string[];
    };
}

export interface ParseOptions {
    defaultWorkspace: Workspace;
    defaultSchedule: 'none' | 'today' | 'tomorrow' | 'upcoming';
}

function getTodayYMD(): string {
    return new Date().toISOString().split('T')[0];
}

export function parseBulkTasks(text: string, options: ParseOptions): ParsedTask[] {
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    return lines.map(line => {
        let cleanLine = line.trim();

        // 1. Extract Workspace [xxx]
        let workspace = options.defaultWorkspace;
        const workspaceMatch = cleanLine.match(/^\[([a-zA-Z0-9_]+)\]/);

        if (workspaceMatch) {
            // Robust Normalization for [crm]/[ops] etc.
            const raw = workspaceMatch[1];
            workspace = normalizeWorkspace(raw);

            // Remove [workspace] from line
            cleanLine = cleanLine.replace(/^\[([a-zA-Z0-9_]+)\]/, '').trim();
        }

        // 2. Split by pipe for Modifiers
        // Example: "Title... | today | due:..."
        const parts = cleanLine.split('|').map(p => p.trim());
        const title = parts[0];
        const modifiers = parts.slice(1);

        let scheduled_date: string | null = null;
        let project: string | undefined;
        let stage: string | undefined;
        const tags: string[] = [];
        let error: string | undefined;

        // Apply Default Schedule
        if (options.defaultSchedule === 'today') {
            scheduled_date = toYmd(new Date());
        }

        // 3. Process Modifiers
        modifiers.forEach(mod => {
            const lower = mod.toLowerCase();

            if (lower === 'today') {
                // If due was NOT already set by a 'due:' command (which wins), set today
                // Wait, user rule: "If both today and due: exist, due: wins"
                // So we can set it, and if 'due:' comes later it overwrites. 
                // If 'due:' came first, we shouldn't overwrite? No, let's parse all then resolve priority.
                // Actually easier: modifiers loop.
                // But 'due:' implies a specific intent. Let's just track if we saw 'due'.
            } else if (lower.startsWith('due:')) {
                const datePart = lower.replace('due:', '').trim();
                if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                    scheduled_date = datePart;
                } else {
                    error = `Invalid due date format: ${datePart}`;
                }
            } else if (lower.startsWith('project:')) {
                project = mod.substring(8).trim(); // Keep original case
            } else if (lower.startsWith('stage:')) {
                stage = mod.substring(6).trim();
            } else if (lower.startsWith('#')) {
                // could be multiple tags "#tag1 #tag2"
                // split by space
                const foundTags = mod.split(/\s+/).filter(t => t.startsWith('#'));
                tags.push(...foundTags);
            } else {
                // Treat as ordinary tag or just ignore? User example "#tag" used pipe.
                // "project:stock | stage:script | #tag1 #tag2"
                // But user also said "#tag -> insert as tag".
                // If it doesn't match known prefixes, treat as tag? 
                // Let's assume tags strictly start with #.
                const foundTags = mod.split(/\s+/).filter(t => t.startsWith('#'));
                if (foundTags.length > 0) {
                    tags.push(...foundTags);
                }
            }
        });

        // 3.5 Re-scan Title for inline tags/project/stage?
        // User said: "project:stock -> tag project:stock". 
        // User example format shows pipes: "... | project:xxx". 
        // But what if they type "[ops] Do thing #urgent"?
        // Let's scan Title for inline #tags too.
        const titleTags = title.match(/#[a-zA-Z0-9_]+/g);
        if (titleTags) {
            tags.push(...titleTags);
            // Optionally remove from title? "Do thing #urgent" -> "Do thing"?
            // Usually nice to remove.
            // title = title.replace(/#[a-zA-Z0-9_]+/g, '').trim();
        }

        // 4. Resolve "today" modifier specifically if it didn't use 'due:'
        // We do this by checking if 'today' string is in modifiers
        const hasToday = modifiers.some(m => m.toLowerCase() === 'today');
        const hasDue = modifiers.some(m => m.toLowerCase().startsWith('due:'));

        if (hasToday && !hasDue) {
            scheduled_date = toYmd(new Date());
        }
        // If hasDue, we already extracted it in loop.

        // 5. Build Notes
        // "project:xxx | stage:xxx | #tag" -> User said "Add tag project:xxx".
        // This implies he wants these searchable.
        // I will construct a `notes` string that looks like YAML frontmatter or just readable lines.
        const noteLines: string[] = [];
        if (project) noteLines.push(`Project: ${project}`);
        if (stage) noteLines.push(`Stage: ${stage}`);
        if (tags.length > 0) noteLines.push(`Tags: ${tags.join(' ')}`);

        return {
            title: title || "[No Title]",
            workspace,
            scheduled_date,
            raw_line: line,
            notes: noteLines.join('\n'),
            isValid: !error && title.length > 0,
            validationError: error,
            meta: { project, stage, tags }
        };
    });
}
