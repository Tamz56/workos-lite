import { Task } from "@/lib/types";
import { AreasViewState } from "./useAreasState";
import { WORKSPACES_LIST } from "@/lib/workspaces";

export interface GroupedTasks {
    key: string;
    tasks: Task[];
    // RC22: Package metadata for headers
    topicId?: string | null;
    templateKey?: string | null;
    packageDone?: number;
    packageTotal?: number;
    scheduledDate?: string | null;
    docId?: string | null;
    isPackage?: boolean;
    isFullyComplete?: boolean; // RC25
    nextTaskId?: string | null; // RC24
    reviewStatus?: string; // RC26
    readyToPublish?: boolean; // RC27
    publishedAt?: string | null; // RC28
    channels?: string[]; // RC29
    isChannelsInconsistent?: boolean; // RC29
    performanceMetrics?: Record<string, any>; // RC30
    isMetricsInconsistent?: boolean; // RC30
    performanceScore?: number; // RC31
    isBestPerformer?: boolean; // RC31
    bestChannelHint?: string; // RC31
    listId?: string | null;
    title?: string;
}




export function selectGroupedTasks(tasks: Task[], state: AreasViewState, workspaceId: string): GroupedTasks[] {
    let filtered = tasks;

    // RCRestruct: Global Filter for hidden workspaces if in global view
    const isExplicitWorkspace = !!workspaceId && workspaceId !== 'global' && workspaceId !== 'all';
    if (!isExplicitWorkspace) {
        const activeWorkspaces = new Set(WORKSPACES_LIST.filter(w => !w.isHidden).map(w => w.id));
        filtered = filtered.filter(t => activeWorkspaces.has(t.workspace));
    }

    // 1. Search Match
    if (state.search) {
        const q = state.search.toLowerCase();
        filtered = filtered.filter(t => 
            t.title.toLowerCase().includes(q) || 
            t.notes?.toLowerCase().includes(q)
        );
    }

    // 2-4. Filters (Status, Workspace, List, Sprint) - unchanged
    if (state.statusFilter.length > 0) filtered = filtered.filter(t => state.statusFilter.includes(t.status));
    if (state.workspaceFilter.length > 0) filtered = filtered.filter(t => state.workspaceFilter.includes(t.workspace));
    if (state.listFilter.length > 0) {
        filtered = filtered.filter(t => state.listFilter.includes(t.list_id || "unassigned"));
    }
    if (state.sprintFilter.length > 0) {
        filtered = filtered.filter(t => state.sprintFilter.includes(t.sprint_id || "backlog"));
    }
    if (state.reviewStatusFilter.length > 0) {
        filtered = filtered.filter(t => state.reviewStatusFilter.includes(t.review_status || "draft"));
    }

    // 5. Sort
    filtered.sort((a, b) => {
        // Deterministic Workflow Order (Topic-aware)
        if (a.topic_id && b.topic_id && a.topic_id === b.topic_id) {
            const extractOrder = (notes: string | null | undefined) => {
                if (!notes) return null;
                const match = notes.match(/workflow_order:\s*(\d+)/);
                return match ? parseInt(match[1], 10) : null;
            };
            const aOrder = extractOrder(a.notes);
            const bOrder = extractOrder(b.notes);
            if (aOrder !== null && bOrder !== null && aOrder !== bOrder) {
                return aOrder - bOrder;
            }
        }

        let res = 0;
        switch (state.sortBy) {
            case "scheduled_date":
                if (!a.scheduled_date && !b.scheduled_date) res = 0;
                else if (!a.scheduled_date) res = 1;
                else if (!b.scheduled_date) res = -1;
                else res = a.scheduled_date.localeCompare(b.scheduled_date);
                break;
            case "priority": res = (b.priority ?? 2) - (a.priority ?? 2); break;
            case "updated_at": res = (b.updated_at || "").localeCompare(a.updated_at || ""); break;
            case "created_at": res = (b.created_at || "").localeCompare(a.created_at || ""); break;
            case "performance": {
                const getScore = (t: Task) => {
                    if (!t.performance_metrics) return 0;
                    try {
                        const m = JSON.parse(t.performance_metrics);
                        let s = 0;
                        Object.keys(m).forEach(ch => {
                            const v = m[ch].views || 0;
                            const f = m[ch].engagement || m[ch].likes || 0;
                            s += (v * 1000) + f;
                        });
                        return s;
                    } catch (e) { return 0; }
                };
                res = getScore(b) - getScore(a);
                break;
            }
        }

        return state.sortDir === "asc" ? res : -res;
    });

    // 6. Grouping Logic (RC22)
    // V5: Strict 1:1 mapping. 
    // RC65: Enhanced content code detection (GF-CONTENT-### > TOPIC-###)
    const isContentWorkspace = workspaceId === 'content';
    // RC: Force package grouping for Content unless specifically overridden by status/list/sprint/none
    const isPackageGroup = state.groupBy === "package" || (isContentWorkspace && !["status", "list", "sprint", "none"].includes(state.groupBy));

    const groups: Record<string, Task[]> = {};
    const groupMeta: Record<string, any> = {};

    // Helper: Code extraction (GF-CONTENT-###, GF-STORY-###, TOPIC-###, or any GF-*)
    const extractCode = (t: Task) => {
        // Match any GF-<WORD>-<NUMBER> format (GF-CONTENT-001, GF-STORY-01, etc.)
        const gfPattern = /GF-[A-Z]+-\d+/g;
        const topicPattern = /TOPIC-\d+/g;

        // 1. Check explicit topic_id field - canonical grouping key for Content.
        if (t.topic_id) {
            const gfMatch = t.topic_id.match(gfPattern);
            if (gfMatch) return gfMatch[0];
            const topicMatch = t.topic_id.match(topicPattern);
            if (topicMatch) return topicMatch[0];
        }

        // 2. Check metadata (notes)
        if (t.notes) {
            const gfMatch = t.notes.match(gfPattern);
            if (gfMatch) return gfMatch[0];
            const topicMatch = t.notes.match(topicPattern);
            if (topicMatch) return topicMatch[0];
        }

        // 3. Check list title/name for legacy package lists
        if (t.list_name) {
            const gfMatch = t.list_name.match(gfPattern);
            if (gfMatch) return gfMatch[0];
            const topicMatch = t.list_name.match(topicPattern);
            if (topicMatch) return topicMatch[0];
        }

        // 4. Check title - Fallback
        const gfMatchTitle = t.title.match(gfPattern);
        if (gfMatchTitle) return gfMatchTitle[0];
        const topicMatchTitle = t.title.match(topicPattern);
        if (topicMatchTitle) return topicMatchTitle[0];

        return null;
    };

    filtered.forEach(t => {
        let key = "Uncategorized";

        if (isPackageGroup) {
            const extractedCode = extractCode(t);
            // Canonical Key resolution: topic_id/code first. list_id is only a legacy fallback.
            const topicKey = extractedCode || t.topic_id || (isContentWorkspace ? null : t.list_id) || (isContentWorkspace ? "legacy-topic" : null);
            
            // Name resolution: if we extracted a code, try to find a nice name from the title
            const topicName = t.list_name || t.topic_id || (isContentWorkspace ? "Legacy / Needs Topic Mapping" : "Uncategorized");
            
            if (topicKey) {
                key = isContentWorkspace ? `topic:${topicKey}` : `package:${topicKey}`;
                
                // RC65: Resolve canonical title (Prefer Metadata > episode_title from notes > Topic Title > Topic Name)
                // 1) Try topic_title field
                // 2) Try episode_title inside notes frontmatter
                // 3) Fallback to topicName/list_name/topic_id
                const notesEpisodeMatch = t.notes ? t.notes.match(/episode_title:\s*([^\n\r]+)/i) : null;
                const notesEpisodeTitle = notesEpisodeMatch ? notesEpisodeMatch[1].trim() : null;
                const metadataTitle = t.topic_title || notesEpisodeTitle;
                // NOTE: Do NOT use the right-hand side of `t.title.split(" — ")` (stage/task role) as package title.
                const canonicalName = metadataTitle || topicName;

                if (!groupMeta[key]) {
                    groupMeta[key] = {
                        key,
                        title: (extractedCode && canonicalName !== extractedCode) ? `${extractedCode} — ${canonicalName}` : canonicalName,
                        topicId: extractedCode || t.topic_id,
                        listId: t.list_id,
                        templateKey: t.template_key,
                        packageDone: t.package_done,
                        packageTotal: t.package_total,
                        scheduledDate: t.scheduled_date, 
                        docId: t.doc_id,
                        reviewStatus: t.review_status,
                        publishedAt: t.published_at,
                        isPackage: true,
                        _allApproved: t.review_status === 'approved',
                        _hasDifferentReview: false,
                        _channelsRaw: t.distribution_channels,
                        _hasDifferentChannels: false,
                        _metricsRaw: t.performance_metrics
                    };
                } else {
                    // Title recovery: prefer explicit topic_title over stage/task-derived labels.
                    const currentTitle = groupMeta[key].title;
                    if (metadataTitle && extractedCode) {
                        groupMeta[key].title = `${extractedCode} — ${metadataTitle}`;
                    }
                    const isCurrentGeneric = currentTitle === "Legacy / Needs Topic Mapping" || !currentTitle.includes(" — ");
                    if (!metadataTitle && isCurrentGeneric && canonicalName && canonicalName !== topicName) {
                        groupMeta[key].title = extractedCode ? `${extractedCode} — ${canonicalName}` : canonicalName;
                    }

                    // Consistency Checks
                    if (t.review_status !== groupMeta[key].reviewStatus) groupMeta[key]._hasDifferentReview = true;
                    if (t.review_status !== 'approved') groupMeta[key]._allApproved = false;
                    if (!groupMeta[key].publishedAt && t.published_at) groupMeta[key].publishedAt = t.published_at;
                    if (t.distribution_channels !== groupMeta[key]._channelsRaw) groupMeta[key]._hasDifferentChannels = true;
                }
                
                if (t.title.toLowerCase().includes("publish") && t.scheduled_date) {
                    groupMeta[key].scheduledDate = t.scheduled_date;
                }
            }
        } else {
            // Default non-content grouping
            if (state.groupBy === "status") {
                key = t.status || "inbox";
                key = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            } else if (state.groupBy === "list") {
                key = t.list_name || t.workspace || "Unassigned";
            } else if (state.groupBy === "sprint") {
                key = t.sprint_name || "Backlog";
            } else if (state.groupBy === "none") {
                key = "none";
            }
        }
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
    });

    // RC24: Step Priority for Next Action
    const stepOrder = [
        "Brief Approved",
        "Script & Caption",
        "Assets / Canva",
        "Publish",
        "Archive"
    ];

    // RC31: Calculate performance scores for Top Performer detection
    let maxPerformanceScore = 0;
    if (isPackageGroup) {
        Object.keys(groupMeta).forEach(k => {
            const meta = groupMeta[k];
            try {
                const metrics = meta._metricsRaw ? JSON.parse(meta._metricsRaw) : {};
                let s = 0;
                Object.keys(metrics).forEach(ch => {
                    const v = metrics[ch].views || 0;
                    const f = metrics[ch].engagement || metrics[ch].likes || 0;
                    s += (v * 1000) + f;
                });
                meta.performanceScore = s;
                if (s > maxPerformanceScore) maxPerformanceScore = s;
            } catch (e) {
                meta.performanceScore = 0;
            }
        });
    }

    // 7. Sort Groups & Finalize Package Metadata
    const sortedKeys = Object.keys(groups).sort((k1, k2) => {
        const isContent = isContentWorkspace;
        const legacyKey = "Legacy / Needs Topic Mapping";

        if (isPackageGroup) {
            // "Other Tasks" / "Legacy..." always last
            if (k1 === "Other Tasks" || k1 === legacyKey) return 1;
            if (k2 === "Other Tasks" || k2 === legacyKey) return -1;
            
            // Sort packages by their earliest scheduled date
            const d1 = groupMeta[k1]?.scheduledDate || "9999-99-99";
            const d2 = groupMeta[k2]?.scheduledDate || "9999-99-99";
            
            if (state.sortBy === "performance") {
                const s1 = groupMeta[k1]?.performanceScore || 0;
                const s2 = groupMeta[k2]?.performanceScore || 0;
                if (s1 !== s2) return s2 - s1; // Descending by default for performance
            }
            
            return d1.localeCompare(d2);
        }


        if (state.groupBy === "status") {
            const order = ["Inbox", "Planned", "In Progress", "Done"];
            const i1 = order.indexOf(k1), i2 = order.indexOf(k2);
            if (i1 >= 0 && i2 >= 0) return i1 - i2;
            if (i1 >= 0) return -1;
            if (i2 >= 0) return 1;
        }
        return k1.localeCompare(k2);
    });

    const finalGroups = sortedKeys.map(key => {
        const groupTasks = groups[key];
        const meta = groupMeta[key] || {};
        
        // RC24: Compute Next Task ID for packages
        if (meta.isPackage) {
            const pendingTasks = groupTasks.filter(t => t.status !== 'done');
            if (pendingTasks.length > 0) {
                // Find task with lowest index in stepOrder
                let bestTask = pendingTasks[0];
                let bestIdx = 99;
                
                pendingTasks.forEach(t => {
                    const idx = stepOrder.findIndex(s => t.title.toLowerCase().includes(s.toLowerCase()));
                    if (idx !== -1 && idx < bestIdx) {
                        bestIdx = idx;
                        bestTask = t;
                    }
                });
                meta.nextTaskId = bestTask.id;
            }

            // RC25: Finalize completion state
            meta.isFullyComplete = meta.packageDone > 0 && meta.packageDone === meta.packageTotal;

            // RC27: Finalize Ready-to-Publish state
            // Only READY if fully complete AND every task is explicitly 'approved' AND no mixed states
            meta.readyToPublish = meta.isFullyComplete && meta._allApproved && !meta._hasDifferentReview;

            // RC29: Finalize Channels
            meta.isChannelsInconsistent = meta._hasDifferentChannels;
            try {
                meta.channels = meta._channelsRaw ? JSON.parse(meta._channelsRaw) : [];
            } catch (e) {
                meta.channels = [];
            }

            // RC30: Finalize Metrics
            meta.isMetricsInconsistent = meta._hasDifferentMetrics;
            try {
                meta.performanceMetrics = meta._metricsRaw ? JSON.parse(meta._metricsRaw) : {};
                
                // RC31: Top Performer & Best Channel Hint
                const s = meta.performanceScore || 0;
                if (s > 0 && s === maxPerformanceScore) {
                    meta.isBestPerformer = true;
                }
                
                // Identify dominant channel
                let bestCh = "";
                let bestChScore = -1;
                Object.keys(meta.performanceMetrics).forEach(ch => {
                    const v = meta.performanceMetrics[ch].views || 0;
                    const f = meta.performanceMetrics[ch].engagement || meta.performanceMetrics[ch].likes || 0;
                    const chScore = (v * 1000) + f;
                    if (chScore > bestChScore) {
                        bestChScore = chScore;
                        bestCh = ch;
                    }
                });
                
                if (s > 0 && bestChScore > (s * 0.6)) {
                    const labels: Record<string, string> = {
                        facebook: "Facebook", tiktok: "TikTok", instagram: "Instagram", website: "Website", marketplace: "Marketplace"
                    };
                    meta.bestChannelHint = labels[bestCh] || bestCh;
                }
            } catch (e) {
                meta.performanceMetrics = {};
            }
        }




        return {
            key,
            tasks: groupTasks,
            ...meta
        };
    });

    // 9. RC55: Auto-collapse Legacy for Content Workspace
    // This is a UI-level intervention. We set a flag or handle it in the component.
    // For simplicity, we ensure the groups correctly identify themselves.
    
    return finalGroups;
}
