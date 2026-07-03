"use client";

import React from "react";
import { 
    Wand2, 
    Sparkles, 
    Save, 
    Inbox, 
    Copy, 
    BarChart2, 
    CheckCircle, 
    AlertCircle, 
    ExternalLink, 
    Globe, 
    FileText,
    Activity
} from "lucide-react";
import Link from "next/link";

interface ArticleCommandPanelProps {
    activeProject: any;
    saving: boolean;
    onSave: () => void;
    onGeneratePackage: () => void;
    generatedPackageText: string;
    onSendToInbox: () => void;
    onCopyInsightPrompt: () => void;
    
    // Live states for checklist computation
    workingTitle: string;
    slug: string;
    narrativeSlug: string;
    knowledgeSlug: string;
    heroSubtitle: string;
    narrativeHeroSubtitle: string;
    knowledgeHeroSubtitle: string;
    shortSummary: string;
    narrativeShortSummary: string;
    knowledgeShortSummary: string;
    metaTitle: string;
    narrativeMetaTitle: string;
    knowledgeMetaTitle: string;
    metaDescription: string;
    narrativeMetaDescription: string;
    knowledgeMetaDescription: string;
    narrativeBody: string;
    knowledgeBody: string;
    shortCaption: string;
    facebookGroupPost: string;
    facebookPagePost: string;
    personalPost: string;
    campaignName: string;
    publishStatus: string;
    decision: string;
}

export default function ArticleCommandPanel({
    activeProject,
    saving,
    onSave,
    onGeneratePackage,
    generatedPackageText,
    onSendToInbox,
    onCopyInsightPrompt,
    
    workingTitle,
    slug,
    narrativeSlug,
    knowledgeSlug,
    heroSubtitle,
    narrativeHeroSubtitle,
    knowledgeHeroSubtitle,
    shortSummary,
    narrativeShortSummary,
    knowledgeShortSummary,
    metaTitle,
    narrativeMetaTitle,
    knowledgeMetaTitle,
    metaDescription,
    narrativeMetaDescription,
    knowledgeMetaDescription,
    narrativeBody,
    knowledgeBody,
    shortCaption,
    facebookGroupPost,
    facebookPagePost,
    personalPost,
    campaignName,
    publishStatus,
    decision
}: ArticleCommandPanelProps) {
    
    if (!activeProject) return null;

    // Checklist criteria evaluation
    const checks = {
        title: !!(workingTitle && workingTitle.trim()),
        slug: !!((slug && slug.trim()) || (narrativeSlug && narrativeSlug.trim()) || (knowledgeSlug && knowledgeSlug.trim())),
        heroSubtitle: !!((heroSubtitle && heroSubtitle.trim()) || (narrativeHeroSubtitle && narrativeHeroSubtitle.trim()) || (knowledgeHeroSubtitle && knowledgeHeroSubtitle.trim())),
        shortSummary: !!((shortSummary && shortSummary.trim()) || (narrativeShortSummary && narrativeShortSummary.trim()) || (knowledgeShortSummary && knowledgeShortSummary.trim())),
        metaTitle: !!((metaTitle && metaTitle.trim()) || (narrativeMetaTitle && narrativeMetaTitle.trim()) || (knowledgeMetaTitle && knowledgeMetaTitle.trim())),
        metaDescription: !!((metaDescription && metaDescription.trim()) || (narrativeMetaDescription && narrativeMetaDescription.trim()) || (knowledgeMetaDescription && knowledgeMetaDescription.trim())),
        bodyContent: !!((narrativeBody && narrativeBody.trim()) || (knowledgeBody && knowledgeBody.trim())),
        socialDrafts: !!((shortCaption && shortCaption.trim()) || (facebookGroupPost && facebookGroupPost.trim()) || (facebookPagePost && facebookPagePost.trim()) || (personalPost && personalPost.trim())),
        utmCampaign: !!(campaignName && campaignName.trim())
    };

    const missingFields: string[] = [];
    if (!checks.title) missingFields.push("Title");
    if (!checks.slug) missingFields.push("Slug");
    if (!checks.heroSubtitle) missingFields.push("Hero Subtitle");
    if (!checks.shortSummary) missingFields.push("Short Summary");
    if (!checks.metaTitle) missingFields.push("Meta Title");
    if (!checks.metaDescription) missingFields.push("Meta Description");
    if (!checks.bodyContent) missingFields.push("Body Content");
    if (!checks.socialDrafts) missingFields.push("Social Drafts");
    if (!checks.utmCampaign) missingFields.push("UTM Campaign");

    const isAllReady = missingFields.length === 0;
    const nextActionLabel = !checks.bodyContent
        ? "Paste Knowledge Article Body"
        : !(checks.metaTitle && checks.metaDescription && checks.slug && checks.heroSubtitle && checks.shortSummary)
            ? "Add SEO & Website Fields"
            : !checks.socialDrafts
                ? "Prepare Social Drafts"
                : !checks.utmCampaign
                    ? "Add UTM links"
                    : isAllReady
                        ? "Ready for Arbor Review"
                        : "Complete the current section or open Work Checklist.";

    const checklistLabels = [
        { key: "title", label: "Title Exists" },
        { key: "slug", label: "Slug Configured" },
        { key: "heroSubtitle", label: "Hero Subtitle" },
        { key: "shortSummary", label: "Short Summary" },
        { key: "metaTitle", label: "Meta Title" },
        { key: "metaDescription", label: "Meta Description" },
        { key: "bodyContent", label: "Body Content" },
        { key: "socialDrafts", label: "Social Drafts" },
        { key: "utmCampaign", label: "UTM Campaign" }
    ];

    return (
        <div className="bg-theme-card border border-theme-border rounded-[24px] p-4.5 shadow-sm space-y-4 text-xs">
            {/* Header */}
            <div>
                <h3 className="text-xs font-black text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={14} className="text-indigo-500 animate-pulse" />
                    Article Command Panel
                </h3>
                <p className="text-[9px] font-bold text-theme-muted mt-0.5">สรุปสถานะการเขียนและการเตรียมเผยแพร่แบบเรียลไทม์</p>
            </div>

            {/* Project Details metadata */}
            <div className="bg-theme-input/40 dark:bg-zinc-900/40 p-3 rounded-xl border border-theme-border/50 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-theme-muted uppercase">EP Code:</span>
                    <span className="font-black text-theme-primary">{activeProject.topic_id || "Not assigned"}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-theme-muted uppercase">Layer:</span>
                    <span className="font-black text-theme-primary">
                        {(narrativeBody && knowledgeBody) ? "Narrative & Knowledge" : narrativeBody ? "Narrative Only" : knowledgeBody ? "Knowledge Only" : "Draft"}
                    </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-theme-muted uppercase">Status:</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                        publishStatus === "Published" 
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/10" 
                            : publishStatus === "Feedback Pending"
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/10"
                            : publishStatus === "Reviewed"
                            ? "bg-blue-500/10 text-blue-600 border border-blue-500/10"
                            : "bg-neutral-500/10 text-neutral-500 border border-neutral-500/10"
                    }`}>
                        {publishStatus || "Draft"}
                    </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-theme-muted uppercase">Next Action:</span>
                    <span className="font-black text-indigo-600 truncate max-w-[130px]" title={decision || nextActionLabel}>
                        {decision && decision !== "No action" ? decision : nextActionLabel}
                    </span>
                </div>
            </div>

            {/* Publish Readiness Checklist */}
            <div className="space-y-2">
                <div className="text-[10px] font-black text-theme-muted uppercase tracking-wider">Publish Readiness</div>
                
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-bold text-theme-secondary">
                    {checklistLabels.map(item => {
                        const isOk = (checks as any)[item.key];
                        return (
                            <div key={item.key} className="flex items-center gap-1.5 py-0.5">
                                {isOk ? (
                                    <CheckCircle size={11} className="text-emerald-500 shrink-0" />
                                ) : (
                                    <div className="w-2.5 h-2.5 rounded-full bg-neutral-200 dark:bg-zinc-800 shrink-0" />
                                )}
                                <span className={isOk ? "text-theme-primary font-black" : "text-theme-muted font-medium"}>
                                    {item.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Missing Fields summary */}
            <div className="pt-2 border-t border-theme-border/20">
                {isAllReady ? (
                    <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold flex items-center gap-1.5 text-[10px]">
                        <CheckCircle size={13} className="shrink-0" />
                        <span>Ready to publish! (ข้อมูลครบถ้วน)</span>
                    </div>
                ) : (
                    <div className="p-2.5 bg-amber-500/5 border border-amber-500/25 text-amber-600 rounded-xl space-y-1 text-[10px]">
                        <div className="font-black flex items-center gap-1">
                            <AlertCircle size={13} className="shrink-0" />
                            <span>Missing Fields ({missingFields.length}):</span>
                        </div>
                        <div className="text-[9px] font-medium leading-relaxed max-w-[220px] truncate-3-lines">
                            {missingFields.join(", ")}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions Panel */}
            <div className="space-y-2 pt-2 border-t border-theme-border/20">
                <div className="text-[10px] font-black text-theme-muted uppercase tracking-wider">Quick Actions</div>
                
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-theme-border/40 rounded-xl font-bold text-center flex items-center justify-center gap-1 transition-all"
                        title="บันทึกเนื้อหาปัจจุบัน"
                    >
                        <Save size={12} className="text-theme-muted" />
                        Save Content
                    </button>

                    <button
                        onClick={onGeneratePackage}
                        className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-theme-border/40 rounded-xl font-bold text-center flex items-center justify-center gap-1 transition-all"
                        title="สร้าง Package นำเข้า"
                    >
                        <Sparkles size={12} className="text-blue-500 animate-pulse" />
                        Gen Package
                    </button>

                    <button
                        onClick={onSendToInbox}
                        disabled={!generatedPackageText}
                        className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-40 border border-theme-border/40 rounded-xl font-bold text-center flex items-center justify-center gap-1 transition-all col-span-2"
                        title="ส่งแพ็กเกจไปยัง Arbor Inbox (ต้องสร้าง Package ก่อน)"
                    >
                        <Inbox size={12} className="text-emerald-500" />
                        Send to Arbor Inbox
                    </button>

                    <button
                        onClick={onCopyInsightPrompt}
                        className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-theme-border/40 rounded-xl font-bold text-center flex items-center justify-center gap-1 transition-all col-span-2"
                        title="คัดลอก Insight Prompt สำหรับวิเคราะห์"
                    >
                        <Copy size={12} className="text-purple-500" />
                        Copy Insight Prompt
                    </button>
                </div>
            </div>

            {/* Links to Hub tabs */}
            <div className="pt-2 border-t border-theme-border/20 space-y-1.5">
                <Link
                    href="/workspaces/content/gf-hub?tab=analytics"
                    className="flex items-center justify-between p-2 hover:bg-theme-hover rounded-xl text-theme-secondary hover:text-theme-primary font-bold transition-all border border-transparent hover:border-theme-border/30"
                >
                    <span className="flex items-center gap-1">
                        <BarChart2 size={12} className="text-indigo-500" />
                        Open GF Analytics
                    </span>
                    <ExternalLink size={10} className="opacity-50" />
                </Link>

                <Link
                    href="/workspaces/content/gf-hub?tab=optimizer"
                    className="flex items-center justify-between p-2 hover:bg-theme-hover rounded-xl text-theme-secondary hover:text-theme-primary font-bold transition-all border border-transparent hover:border-theme-border/30"
                >
                    <span className="flex items-center gap-1">
                        <Wand2 size={12} className="text-amber-500" />
                        Open Organic Optimizer
                    </span>
                    <ExternalLink size={10} className="opacity-50" />
                </Link>
            </div>
        </div>
    );
}
