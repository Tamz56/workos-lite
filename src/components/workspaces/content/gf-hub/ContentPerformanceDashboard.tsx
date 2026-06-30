"use client";

import React, { useState } from "react";
import { 
    BarChart2, 
    TrendingUp, 
    Globe, 
    Share2, 
    ExternalLink, 
    MessageSquare, 
    CheckCircle, 
    Clock, 
    AlertCircle, 
    HelpCircle, 
    Filter,
    Award,
    ArrowRight
} from "lucide-react";
import Link from "next/link";

interface ContentPerformanceDashboardProps {
    projects: any[];
}

export default function ContentPerformanceDashboard({ projects }: ContentPerformanceDashboardProps) {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [decisionFilter, setDecisionFilter] = useState<string>("all");

    // Safe metric number parsing helper (handles commas, empty values, invalid numbers)
    const parseMetricNumber = (val: any): number => {
        if (val === undefined || val === null) return 0;
        if (typeof val === "number") return val;
        const cleanStr = String(val).replace(/,/g, "").trim();
        if (!cleanStr) return 0;
        const parsed = Number(cleanStr);
        return isNaN(parsed) ? 0 : parsed;
    };

    // Format metric value for UI
    const formatMetric = (val: any): string => {
        const num = parseMetricNumber(val);
        if (num === 0) return "—";
        return num.toLocaleString();
    };

    // Merge helper to combine legacy combined snapshots, ga4Snapshots, and facebookSnapshots.
    const getMergedSnapshots = (pf: any) => {
        const merged: any = {};
        
        // Merge legacy/combined snapshots first
        if (pf.snapshots) {
            Object.keys(pf.snapshots).forEach(k => {
                merged[k] = { ...merged[k], ...pf.snapshots[k] };
            });
        }
        
        // Merge ga4Snapshots
        if (pf.ga4Snapshots) {
            Object.keys(pf.ga4Snapshots).forEach(k => {
                merged[k] = { ...merged[k], ...pf.ga4Snapshots[k] };
            });
        }
        
        // Merge facebookSnapshots
        if (pf.facebookSnapshots) {
            Object.keys(pf.facebookSnapshots).forEach(k => {
                const snap = pf.facebookSnapshots[k];
                // Map Facebook metric fields to table expectation (reach -> fbReach, reactions -> fbReactions, comments -> fbComments, shares -> fbShares, linkClicks -> fbClicks)
                merged[k] = { 
                    ...merged[k], 
                    ...snap,
                    fbReach: snap.reach !== undefined ? snap.reach : (merged[k]?.fbReach || snap.fbReach || ""),
                    fbReactions: snap.reactions !== undefined ? snap.reactions : (merged[k]?.fbReactions || snap.fbReactions || ""),
                    fbComments: snap.comments !== undefined ? snap.comments : (merged[k]?.fbComments || snap.fbComments || ""),
                    fbShares: snap.shares !== undefined ? snap.shares : (merged[k]?.fbShares || snap.fbShares || ""),
                    fbClicks: snap.linkClicks !== undefined ? snap.linkClicks : (merged[k]?.fbClicks || snap.fbClicks || "")
                };
            });
        }
        
        return merged;
    };

    // Helper to find latest snapshot based on date priority or window priority
    const getLatestSnapshotFromGroup = (snapshotsGroup: any) => {
        if (!snapshotsGroup) return null;
        
        // Find all non-empty snapshots
        const validSnaps = Object.entries(snapshotsGroup)
            .map(([windowKey, snap]: [string, any]) => {
                if (!snap) return null;
                const hasVal = !!(
                    snap.views || snap.activeUsers || snap.users || snap.events || snap.engagementTime ||
                    snap.sourceMedium || snap.fbReach || snap.fbReactions || snap.fbComments || 
                    snap.fbShares || snap.fbClicks || snap.reach || snap.reactions || snap.comments || 
                    snap.shares || snap.linkClicks || snap.notes || snap.platform
                );
                if (!hasVal) return null;
                return { windowKey, ...snap };
            })
            .filter((snap): snap is any => snap !== null);

        if (validSnaps.length === 0) return null;

        // Try sorting by snapshotDate latest first (Primary rule)
        const withDate = validSnaps.filter(s => s.snapshotDate && s.snapshotDate.trim());
        if (withDate.length > 0) {
            withDate.sort((a, b) => {
                const dateA = new Date(a.snapshotDate).getTime();
                const dateB = new Date(b.snapshotDate).getTime();
                if (!isNaN(dateA) && !isNaN(dateB)) {
                    return dateB - dateA; // descending (latest date first)
                }
                return 0;
            });
            const latest = withDate[0];
            const type = latest.windowKey.replace(/^snap/, "");
            return { type, ...latest };
        }

        // If no snapshotDate, fallback to window priority:
        // sincePublished / cumulative -> 90d -> 30d -> 15d -> 7d -> 3d -> 24h -> 12h -> customRange
        const windowPriorityOrder = [
            "snapSincePublished",
            "snapSince_published",
            "snapCumulative",
            "snap90d",
            "snap30d",
            "snap15d",
            "snap7d",
            "snap3d",
            "snap24h",
            "snap12h",
            "snapCustomRange",
            "snapCustom_range"
        ];

        for (const wk of windowPriorityOrder) {
            const found = validSnaps.find(s => s.windowKey.toLowerCase() === wk.toLowerCase());
            if (found) {
                const type = found.windowKey.replace(/^snap/, "");
                return { type, ...found };
            }
        }

        // Last fallback: return the first valid snapshot
        const first = validSnaps[0];
        const type = first.windowKey.replace(/^snap/, "");
        return { type, ...first };
    };

    // Helper to get latest GA4 snapshot specifically
    const getLatestGa4Snapshot = (pf: any) => {
        if (!pf) return null;
        const ga4Snaps = pf.ga4Snapshots || {};
        
        // Merge from legacy combined snapshots if they have views or sourceMedium
        const mergedGa4: any = {};
        if (pf.snapshots) {
            Object.keys(pf.snapshots).forEach(k => {
                const snap = pf.snapshots[k];
                if (snap && (snap.views || snap.users || snap.activeUsers || snap.sourceMedium)) {
                    mergedGa4[k] = { ...snap };
                }
            });
        }
        Object.keys(ga4Snaps).forEach(k => {
            if (ga4Snaps[k]) {
                mergedGa4[k] = { ...mergedGa4[k], ...ga4Snaps[k] };
            }
        });

        return getLatestSnapshotFromGroup(mergedGa4);
    };

    // Helper to get latest Facebook snapshot specifically
    const getLatestFacebookSnapshot = (pf: any) => {
        if (!pf) return null;
        const fbSnaps = pf.facebookSnapshots || {};
        
        // Merge from legacy combined snapshots if they have fbReach or similar
        const mergedFb: any = {};
        if (pf.snapshots) {
            Object.keys(pf.snapshots).forEach(k => {
                const snap = pf.snapshots[k];
                if (snap && (snap.fbReach || snap.fbReactions || snap.fbComments || snap.fbShares || snap.fbClicks || snap.reach || snap.platform)) {
                    mergedFb[k] = { 
                        ...snap,
                        reach: snap.fbReach !== undefined ? snap.fbReach : snap.reach,
                        reactions: snap.fbReactions !== undefined ? snap.fbReactions : snap.reactions,
                        comments: snap.fbComments !== undefined ? snap.fbComments : snap.comments,
                        shares: snap.fbShares !== undefined ? snap.fbShares : snap.shares,
                        linkClicks: snap.fbClicks !== undefined ? snap.fbClicks : snap.linkClicks
                    };
                }
            });
        }
        Object.keys(fbSnaps).forEach(k => {
            if (fbSnaps[k]) {
                mergedFb[k] = { ...mergedFb[k], ...fbSnaps[k] };
            }
        });

        return getLatestSnapshotFromGroup(mergedFb);
    };

    // Keep table compatibility by reading from all combined/merged snapshots
    const getLatestSnapshot = (pf: any) => {
        if (!pf) return null;
        const merged = getMergedSnapshots(pf);
        return getLatestSnapshotFromGroup(merged);
    };

    // Parse and filter projects with performance feedback defensively
    const analyticsProjects = projects.map(p => {
        if (!p.notes) return null;
        try {
            const parsed = JSON.parse(p.notes);
            if (parsed && parsed.performanceFeedback) {
                return {
                    ...p,
                    parsedNotes: parsed,
                    pf: parsed.performanceFeedback
                };
            }
        } catch {
            // legacy notes or malformed json -> skip defensively
        }
        return null;
    }).filter((p): p is any => p !== null);

    // Compute Summary counts
    const totalArticlesCount = analyticsProjects.length;
    const publishedCount = analyticsProjects.filter(p => p.pf.publishingRecord?.publishStatus === "Published").length;
    const pendingCount = analyticsProjects.filter(p => p.pf.publishingRecord?.publishStatus === "Feedback Pending").length;
    const reviewedCount = analyticsProjects.filter(p => p.pf.publishingRecord?.publishStatus === "Reviewed").length;
    
    const repostCount = analyticsProjects.filter(p => p.pf.nextDecision?.decision === "Repost later").length;
    const followupCount = analyticsProjects.filter(p => p.pf.nextDecision?.decision === "Write follow-up article").length;
    const infographicCount = analyticsProjects.filter(p => p.pf.nextDecision?.decision === "Make infographic").length;

    // Decision Buckets counts (only count projects with nextDecision.decision)
    const decisionBuckets = [
        "Repost later",
        "Make infographic",
        "Write follow-up article",
        "Improve headline",
        "Improve image",
        "Add internal links",
        "Update article",
        "Create short explainer",
        "Create video script",
        "Review later"
    ].map(dec => {
        const count = analyticsProjects.filter(p => p.pf.nextDecision?.decision === dec).length;
        return { name: dec, count };
    });

    // Website Traffic Sources Grouping
    const websiteTrafficMap: { [key: string]: { count: number; views: number; users: number } } = {};
    let totalWebsiteSourcesCount = 0;

    analyticsProjects.forEach(p => {
        const latestGa4 = getLatestGa4Snapshot(p.pf);
        if (latestGa4) {
            const rawSource = latestGa4.sourceMedium || "Unknown";
            const source = rawSource.trim() === "" ? "Unknown" : rawSource.trim();
            const views = parseMetricNumber(latestGa4.views || latestGa4.viewsCount || latestGa4.views);
            const users = parseMetricNumber(latestGa4.activeUsers || latestGa4.users);

            if (!websiteTrafficMap[source]) {
                websiteTrafficMap[source] = { count: 0, views: 0, users: 0 };
            }
            websiteTrafficMap[source].count++;
            websiteTrafficMap[source].views += views;
            websiteTrafficMap[source].users += users;
            totalWebsiteSourcesCount++;
        }
    });

    const websiteSourcesList = Object.entries(websiteTrafficMap)
        .map(([name, data]) => ({
            name,
            count: data.count,
            views: data.views,
            users: data.users,
            percentage: totalWebsiteSourcesCount > 0 ? Math.round((data.count / totalWebsiteSourcesCount) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

    // Facebook/Social Platform Sources Grouping
    const socialPlatformMap: { [key: string]: { count: number; reach: number; reactions: number; comments: number; shares: number } } = {};
    let totalSocialSourcesCount = 0;

    analyticsProjects.forEach(p => {
        const latestFb = getLatestFacebookSnapshot(p.pf);
        if (latestFb) {
            let platformRaw = latestFb.platform || p.pf.sourceMetadata?.sourceType || "facebook";
            
            // Normalize label
            let sourceLabel = "Facebook";
            if (platformRaw === "facebook_group_post" || platformRaw === "facebook_group") {
                sourceLabel = "Facebook Group";
            } else if (platformRaw === "facebook_page_post" || platformRaw === "facebook_page") {
                sourceLabel = "Facebook Page";
            } else if (platformRaw === "personal_profile_post" || platformRaw === "facebook_personal") {
                sourceLabel = "Personal Profile";
            }

            const reach = parseMetricNumber(latestFb.reach || latestFb.fbReach);
            const reactions = parseMetricNumber(latestFb.reactions || latestFb.fbReactions);
            const comments = parseMetricNumber(latestFb.comments || latestFb.fbComments);
            const shares = parseMetricNumber(latestFb.shares || latestFb.fbShares);

            if (!socialPlatformMap[sourceLabel]) {
                socialPlatformMap[sourceLabel] = { count: 0, reach: 0, reactions: 0, comments: 0, shares: 0 };
            }
            socialPlatformMap[sourceLabel].count++;
            socialPlatformMap[sourceLabel].reach += reach;
            socialPlatformMap[sourceLabel].reactions += reactions;
            socialPlatformMap[sourceLabel].comments += comments;
            socialPlatformMap[sourceLabel].shares += shares;
            totalSocialSourcesCount++;
        }
    });

    const socialSourcesList = Object.entries(socialPlatformMap)
        .map(([name, data]) => ({
            name,
            count: data.count,
            reach: data.reach,
            reactions: data.reactions,
            comments: data.comments,
            shares: data.shares,
            percentage: totalSocialSourcesCount > 0 ? Math.round((data.count / totalSocialSourcesCount) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count);

    // Apply Filter logic
    const filteredProjects = analyticsProjects.filter(p => {
        const statusMatch = statusFilter === "all" || p.pf.publishingRecord?.publishStatus === statusFilter;
        const decisionMatch = decisionFilter === "all" || p.pf.nextDecision?.decision === decisionFilter;
        return statusMatch && decisionMatch;
    });

    if (totalArticlesCount === 0) {
        return (
            <div className="py-24 text-center bg-white border border-neutral-200 rounded-[32px] space-y-4">
                <div className="w-16 h-16 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-center mx-auto">
                    <BarChart2 className="w-8 h-8 text-neutral-400" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-base font-black text-neutral-900">ไม่มีข้อมูลประสิทธิภาพเนื้อหา</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                        บทความในระบบยังไม่มีการบันทึกสถิติและข้อมูลตอบกลับ กรุณาเพิ่มสถิติในหน้า Writing Studio ของแต่ละตอนก่อนเข้ามาวิเคราะห์ผลลัพธ์
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-sm space-y-1">
                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Total Evaluated</div>
                    <div className="text-2xl font-black text-neutral-900">{totalArticlesCount}</div>
                    <div className="text-[9px] font-bold text-neutral-400">บทความที่มีสถิติ</div>
                </div>

                <div className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-sm space-y-1">
                    <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">Published</div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-500">{publishedCount}</div>
                    <div className="text-[9px] font-bold text-neutral-400">เผยแพร่แล้ว</div>
                </div>

                <div className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-sm space-y-1">
                    <div className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider">Pending Feed</div>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-500">{pendingCount}</div>
                    <div className="text-[9px] font-bold text-neutral-400">รอคำตอบรับ</div>
                </div>

                <div className="bg-white border border-neutral-200 p-4 rounded-2xl shadow-sm space-y-1">
                    <div className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-wider">Reviewed</div>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-500">{reviewedCount}</div>
                    <div className="text-[9px] font-bold text-neutral-400">ประเมินแล้ว</div>
                </div>

                <div className="bg-white border border-purple-200 p-4 rounded-2xl shadow-sm space-y-1 border-l-4 border-l-purple-500">
                    <div className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider">Repost Cands</div>
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{repostCount}</div>
                    <div className="text-[9px] font-bold text-neutral-400">เป้าหมายแชร์ซ้ำ</div>
                </div>

                <div className="bg-white border border-indigo-200 p-4 rounded-2xl shadow-sm space-y-1 border-l-4 border-l-indigo-500">
                    <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Follow-up</div>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{followupCount}</div>
                    <div className="text-[9px] font-bold text-neutral-400">เป้าเขียนต่อยอด</div>
                </div>

                <div className="bg-white border border-pink-200 p-4 rounded-2xl shadow-sm space-y-1 border-l-4 border-l-pink-500">
                    <div className="text-[10px] font-black text-pink-600 dark:text-pink-400 uppercase tracking-wider">Infographics</div>
                    <div className="text-2xl font-black text-pink-600 dark:text-pink-400">{infographicCount}</div>
                    <div className="text-[9px] font-bold text-neutral-400">เป้าสื่อรูปภาพ</div>
                </div>
            </div>

            {/* Mid Section: Traffic & Buckets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Traffic & Social Source Signals (Stacked vertically) */}
                <div className="space-y-6">
                    {/* Website Traffic Sources */}
                    <div className="bg-white border border-neutral-200 p-6 rounded-3xl shadow-sm space-y-4">
                        <div>
                            <h4 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Globe size={16} className="text-emerald-500" />
                                Website Traffic Sources
                            </h4>
                            <p className="text-[10px] font-bold text-neutral-400 mt-0.5">สัดส่วนช่องทางทราฟฟิกหลักบนเว็บไซต์จาก GA4 (latest snapshot)</p>
                        </div>

                        {websiteSourcesList.length === 0 ? (
                            <div className="py-8 text-center text-xs text-neutral-400 font-bold border border-dashed border-neutral-100 rounded-2xl bg-neutral-50/20">
                                ไม่มีข้อมูลแหล่งที่มาเว็บไซต์ (Empty State)
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {websiteSourcesList.map((source, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-neutral-700">{source.name}</span>
                                            <span className="font-black text-neutral-900">{source.count} ตอน ({source.percentage}%)</span>
                                        </div>
                                        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                                style={{ width: `${source.percentage}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-medium text-neutral-400">
                                            <span>Views: <strong className="text-neutral-600">{source.views.toLocaleString()}</strong></span>
                                            <span>•</span>
                                            <span>Users: <strong className="text-neutral-600">{source.users.toLocaleString()}</strong></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Social Platform Sources */}
                    <div className="bg-white border border-neutral-200 p-6 rounded-3xl shadow-sm space-y-4">
                        <div>
                            <h4 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Share2 size={16} className="text-blue-500" />
                                Social Platform Sources
                            </h4>
                            <p className="text-[10px] font-bold text-neutral-400 mt-0.5">ช่องทางสถิติบนเครือข่ายสังคมออนไลน์จาก Facebook (latest snapshot)</p>
                        </div>

                        {socialSourcesList.length === 0 ? (
                            <div className="py-8 text-center text-xs text-neutral-400 font-bold border border-dashed border-neutral-100 rounded-2xl bg-neutral-50/20">
                                ไม่มีข้อมูลสถิติช่องทางโซเชียล (Empty State)
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {socialSourcesList.map((source, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-neutral-700">{source.name}</span>
                                            <span className="font-black text-neutral-900">{source.count} โพสต์ ({source.percentage}%)</span>
                                        </div>
                                        <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                                                style={{ width: `${source.percentage}%` }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-medium text-neutral-400">
                                            <span>Reach/Views: <strong className="text-neutral-600">{source.reach.toLocaleString()}</strong></span>
                                            <span>Reactions: <strong className="text-neutral-600">{source.reactions.toLocaleString()}</strong></span>
                                            <span>Comments: <strong className="text-neutral-600">{source.comments.toLocaleString()}</strong></span>
                                            <span>Shares: <strong className="text-neutral-600">{source.shares.toLocaleString()}</strong></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Decision Buckets */}
                <div className="bg-white border border-neutral-200 p-6 rounded-3xl shadow-sm space-y-4 lg:col-span-2">
                    <div>
                        <h4 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp size={16} className="text-indigo-500" />
                            Decision Buckets (สัดส่วนแผนต่อยอดงานเขียน)
                        </h4>
                        <p className="text-[10px] font-bold text-neutral-400 mt-0.5">การนับจำนวนของเป้าหมายการประมวลผลต่อยอดถัดไปในแต่ละประเภท</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {decisionBuckets.map((bucket, i) => {
                            const hasActive = bucket.count > 0;
                            return (
                                <div 
                                    key={i} 
                                    className={`p-3 rounded-2xl border transition-all ${
                                        hasActive 
                                            ? "bg-indigo-500/5 border-indigo-200/60" 
                                            : "bg-neutral-50/40 border-neutral-100"
                                    }`}
                                >
                                    <div className={`text-[10px] font-bold truncate ${hasActive ? "text-indigo-600" : "text-neutral-400"}`}>
                                        {bucket.name}
                                    </div>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className={`text-xl font-black ${hasActive ? "text-neutral-900" : "text-neutral-300"}`}>
                                            {bucket.count}
                                        </span>
                                        <span className="text-[9px] font-bold text-neutral-400">ตอน</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-4 bg-neutral-50 border border-neutral-200/60 p-4 rounded-2xl">
                <div className="flex items-center gap-1 text-xs font-black text-neutral-500 uppercase">
                    <Filter size={14} />
                    <span>Filters:</span>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Publish Status</span>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-bold text-neutral-700 outline-none"
                    >
                        <option value="all">All Statuses</option>
                        <option value="Draft">Draft</option>
                        <option value="Ready for Website">Ready for Website</option>
                        <option value="Published">Published</option>
                        <option value="Posted to Facebook Group">Posted to Facebook Group</option>
                        <option value="Posted to Facebook Page">Posted to Facebook Page</option>
                        <option value="Feedback Pending">Feedback Pending</option>
                        <option value="Reviewed">Reviewed</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Next Decision</span>
                    <select 
                        value={decisionFilter}
                        onChange={(e) => setDecisionFilter(e.target.value)}
                        className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-bold text-neutral-700 outline-none"
                    >
                        <option value="all">All Decisions</option>
                        <option value="Keep as evergreen">Keep as evergreen</option>
                        <option value="Repost later">Repost later</option>
                        <option value="Make infographic">Make infographic</option>
                        <option value="Write follow-up article">Write follow-up article</option>
                        <option value="Improve headline">Improve headline</option>
                        <option value="Improve image">Improve image</option>
                        <option value="Add internal links">Add internal links</option>
                        <option value="Update article">Update article</option>
                        <option value="Create short explainer">Create short explainer</option>
                        <option value="Create video script">Create video script</option>
                        <option value="No action">No action</option>
                        <option value="Review later">Review later</option>
                    </select>
                </div>
            </div>

            {/* Main Table View */}
            <div className="bg-white border border-neutral-200 rounded-[32px] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                    <h4 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Article Performance Inventory</h4>
                    <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                        แสดง {filteredProjects.length} จากทั้งหมด {totalArticlesCount} รายการ
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-100 text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                                <th className="py-3.5 px-6">Article Title</th>
                                <th className="py-3.5 px-4">EP Code</th>
                                <th className="py-3.5 px-4">Publish Status</th>
                                <th className="py-3.5 px-4">Publish Date</th>
                                <th className="py-3.5 px-4 text-center">Snap</th>
                                <th className="py-3.5 px-4 text-right">GA4 Views</th>
                                <th className="py-3.5 px-4 text-right">GA4 Users</th>
                                <th className="py-3.5 px-4 text-right">FB Reach</th>
                                <th className="py-3.5 px-4 text-right">Comments</th>
                                <th className="py-3.5 px-4 text-right">Shares</th>
                                <th className="py-3.5 px-4">Next Decision</th>
                                <th className="py-3.5 px-4 text-center">Priority</th>
                                <th className="py-3.5 px-4">Target Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredProjects.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="py-12 text-center text-neutral-400 font-bold bg-neutral-50/20">
                                        ไม่มีข้อมูลบทความที่ผ่านเงื่อนไขการฟิลเตอร์
                                    </td>
                                </tr>
                            ) : (
                                filteredProjects.map((project) => {
                                     const latest = getLatestSnapshot(project.pf);
                                    return (
                                        <tr key={project.id} className="hover:bg-neutral-50/30 transition-colors">
                                            <td className="py-4 px-6 font-bold text-neutral-900 max-w-xs truncate">
                                                <Link 
                                                    href={`/workspaces/content/writing-lab?project_id=${project.id}`}
                                                    className="hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                                                >
                                                    {project.title}
                                                    <ExternalLink size={11} className="text-neutral-300 shrink-0" />
                                                </Link>
                                            </td>
                                            <td className="py-4 px-4 font-bold text-neutral-500">
                                                {project.parsedNotes?.performanceFeedback?.publishingRecord?.utmCampaign || "—"}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                    project.pf.publishingRecord?.publishStatus === "Published"
                                                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                        : project.pf.publishingRecord?.publishStatus === "Feedback Pending"
                                                        ? "bg-amber-50 text-amber-600 border border-amber-100"
                                                        : project.pf.publishingRecord?.publishStatus === "Reviewed"
                                                        ? "bg-blue-50 text-blue-600 border border-blue-100"
                                                        : "bg-neutral-50 text-neutral-500 border border-neutral-200"
                                                }`}>
                                                    {project.pf.publishingRecord?.publishStatus || "Draft"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 font-bold text-neutral-600">
                                                {project.pf.publishingRecord?.publishedDate || "—"}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {latest ? (
                                                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-black">
                                                        {latest.type}
                                                    </span>
                                                ) : "—"}
                                            </td>
                                            <td className="py-4 px-4 text-right font-black text-neutral-700">
                                                {latest ? formatMetric(latest.views) : "—"}
                                            </td>
                                            <td className="py-4 px-4 text-right font-bold text-neutral-600">
                                                {latest ? formatMetric(latest.users) : "—"}
                                            </td>
                                            <td className="py-4 px-4 text-right font-black text-neutral-700">
                                                {latest ? formatMetric(latest.fbReach) : "—"}
                                            </td>
                                            <td className="py-4 px-4 text-right font-medium text-neutral-600">
                                                {latest ? formatMetric(latest.fbComments) : "—"}
                                            </td>
                                            <td className="py-4 px-4 text-right font-medium text-neutral-600">
                                                {latest ? formatMetric(latest.fbShares) : "—"}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`font-bold ${
                                                    project.pf.nextDecision?.decision && project.pf.nextDecision.decision !== "No action"
                                                        ? "text-indigo-600"
                                                        : "text-neutral-400"
                                                }`}>
                                                    {project.pf.nextDecision?.decision || "—"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {project.pf.nextDecision?.priority ? (
                                                    <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                                                        project.pf.nextDecision.priority === "High"
                                                            ? "bg-red-50 text-red-600"
                                                            : project.pf.nextDecision.priority === "Medium"
                                                            ? "bg-amber-50 text-amber-600"
                                                            : "bg-neutral-100 text-neutral-500"
                                                    }`}>
                                                        {project.pf.nextDecision.priority}
                                                    </span>
                                                ) : "—"}
                                            </td>
                                            <td className="py-4 px-4 font-bold text-neutral-600">
                                                {project.pf.nextDecision?.targetDate || "—"}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Row: Recent Feedback cards */}
            <div className="space-y-4">
                <h4 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={16} className="text-blue-500" />
                    Recent Notable Feedback & Insights
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {analyticsProjects.slice(0, 4).map((project) => (
                        <div key={project.id} className="bg-white border border-neutral-200 p-6 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                                    <span className="font-black text-neutral-900 text-xs truncate max-w-[70%]">{project.title}</span>
                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded">
                                        {project.pf.nextDecision?.decision || "No Decision"}
                                    </span>
                                </div>

                                <div className="space-y-2 text-xs leading-normal">
                                    {project.pf.notableFeedback?.comments && (
                                        <div className="space-y-0.5">
                                            <span className="text-[9px] font-black text-neutral-400 uppercase">Notable Comments</span>
                                            <p className="text-neutral-700 bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-100">{project.pf.notableFeedback.comments}</p>
                                        </div>
                                    )}

                                    {project.pf.notableFeedback?.questions && (
                                        <div className="space-y-0.5">
                                            <span className="text-[9px] font-black text-neutral-400 uppercase">Audience Questions</span>
                                            <p className="text-neutral-700 bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-100">{project.pf.notableFeedback.questions}</p>
                                        </div>
                                    )}

                                    {project.pf.arborInsight?.recommendedAction && (
                                        <div className="space-y-0.5">
                                            <span className="text-[9px] font-black text-purple-500 uppercase flex items-center gap-1">
                                                <Award size={10} />
                                                Recommended Next Action
                                            </span>
                                            <p className="text-purple-700 bg-purple-500/5 p-2.5 rounded-xl border border-purple-100 font-bold">{project.pf.arborInsight.recommendedAction}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-neutral-100 flex items-center justify-end">
                                <Link 
                                    href={`/workspaces/content/writing-lab?project_id=${project.id}`}
                                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase flex items-center gap-1"
                                >
                                    Open in Writing Lab
                                    <ArrowRight size={12} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
