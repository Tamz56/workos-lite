import { Task } from "@/lib/types";
import { AreasViewState } from "./useAreasState";

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
}




export function selectGroupedTasks(tasks: Task[], state: AreasViewState): GroupedTasks[] {
    let filtered = tasks;

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

    // 5. Sort - unchanged
    filtered.sort((a, b) => {
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
    const isPackageGroup = state.groupBy === "package";

    // RC32: Handle Flat List Mode Intervention (Modified for RC33: Simple Grouping)
    if (state.viewMode === "list") {
        const todo = filtered.filter(t => t.status !== 'done');
        const completed = filtered.filter(t => t.status === 'done');
        
        const listGroups: GroupedTasks[] = [];
        if (todo.length > 0) {
            listGroups.push({
                key: "To-Do",
                tasks: todo,
                isPackage: false
            });
        }
        if (completed.length > 0) {
            listGroups.push({
                key: "Completed",
                tasks: completed,
                isPackage: false
            });
        }
        return listGroups;
    }

    const groups: Record<string, Task[]> = {};


    const groupMeta: Record<string, any> = {};

    filtered.forEach(t => {
        let key = "Uncategorized";

        if (isPackageGroup) {
            if (t.topic_id) {
                key = `package:${t.topic_id}`;
                if (!groupMeta[key]) {
                    groupMeta[key] = {
                        topicId: t.topic_id,
                        templateKey: t.template_key,
                        packageDone: t.package_done,
                        packageTotal: t.package_total,
                        scheduledDate: t.scheduled_date, // Default to first seen
                        docId: t.doc_id,
                        reviewStatus: t.review_status, // RC26
                        publishedAt: t.published_at, // RC28
                        isPackage: true,
                        _allApproved: t.review_status === 'approved', // Internal RC27 tracker
                        _hasDifferentReview: false, // Internal RC27 tracker
                        _channelsRaw: t.distribution_channels, // Internal RC29 tracker
                        _hasDifferentChannels: false // Internal RC29 tracker
                    };
                } else {
                    // RC27: Review Consistency Check
                    if (t.review_status !== groupMeta[key].reviewStatus) {
                        groupMeta[key]._hasDifferentReview = true;
                    }
                    if (t.review_status !== 'approved') {
                        groupMeta[key]._allApproved = false;
                    }
                    if (!groupMeta[key].publishedAt && t.published_at) {
                        groupMeta[key].publishedAt = t.published_at;
                    }

                    // RC29: Channels Consistency Check
                    if (t.distribution_channels !== groupMeta[key]._channelsRaw) {
                        groupMeta[key]._hasDifferentChannels = true;
                    }

                    // RC30: Metrics Consistency Check
                    if (t.performance_metrics !== groupMeta[key]._metricsRaw) {
                        groupMeta[key]._hasDifferentMetrics = true;
                    }
                }

                if (!groupMeta[key]._metricsRaw && t.performance_metrics) {
                    groupMeta[key]._metricsRaw = t.performance_metrics;
                }


                
                // RC24: If this task is the 'Publish' task, prioritize its date for the header
                if (t.title.toLowerCase().includes("publish") && t.scheduled_date) {
                    groupMeta[key].scheduledDate = t.scheduled_date;
                }
            } else {
                key = "Other Tasks";
            }
        } else {
            // Default non-content grouping
            if (state.groupBy === "status") key = t.status || "inbox";
            else if (state.groupBy === "list") key = t.list_name || "Unassigned";
            else if (state.groupBy === "sprint") key = t.sprint_name || "Backlog";
            key = key.charAt(0).toUpperCase() + key.slice(1);
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

        if (isPackageGroup) {
            // "Other Tasks" always last
            if (k1 === "Other Tasks") return 1;
            if (k2 === "Other Tasks") return -1;
            
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
            const order = ["Inbox", "Planned", "Done"];
            const i1 = order.indexOf(k1), i2 = order.indexOf(k2);
            if (i1 >= 0 && i2 >= 0) return i1 - i2;
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

    // 8. RC27: Filter by Ready-to-Publish if requested
    if (state.onlyReadyToPublish) {
        return finalGroups.filter(g => g.readyToPublish);
    }

    return finalGroups;
}
