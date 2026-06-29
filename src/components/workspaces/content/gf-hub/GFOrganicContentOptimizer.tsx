"use client";

import React, { useState, useEffect } from "react";
import { 
    Wand2, 
    TrendingUp, 
    Globe, 
    Share2, 
    ExternalLink, 
    MessageSquare, 
    CheckCircle, 
    Clock, 
    AlertCircle, 
    HelpCircle, 
    Copy,
    Check,
    ArrowRight,
    Award,
    Activity,
    Video,
    FileText,
    Image as ImageIcon,
    HelpCircle as InfoIcon
} from "lucide-react";
import Link from "next/link";

interface GFOrganicContentOptimizerProps {
    projects: any[];
}

type CandidateTab = "repost" | "infographic" | "followup" | "explainer" | "videoscript" | "improve" | "evergreen" | "needsreview";

export default function GFOrganicContentOptimizer({ projects }: GFOrganicContentOptimizerProps) {
    const [activeTab, setActiveTab] = useState<CandidateTab>("repost");
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [copied, setCopied] = useState<boolean>(false);

    // Safe number parsing
    const parseMetricNumber = (val: any): number => {
        if (val === undefined || val === null) return 0;
        if (typeof val === "number") return val;
        const cleanStr = String(val).replace(/,/g, "").trim();
        if (!cleanStr) return 0;
        const parsed = Number(cleanStr);
        return isNaN(parsed) ? 0 : parsed;
    };

    const formatMetric = (val: any): string => {
        const num = parseMetricNumber(val);
        if (num === 0) return "—";
        return num.toLocaleString();
    };

    // Latest snapshot helper (Priority: 30d > 7d > 24h)
    const getLatestSnapshot = (snapshots: any) => {
        if (!snapshots) return null;
        
        const hasData = (snap: any) => {
            if (!snap) return false;
            return !!(
                snap.views || snap.users || snap.events || snap.engagementTime ||
                snap.sourceMedium || snap.fbReach || snap.fbReactions ||
                snap.fbComments || snap.fbShares || snap.fbClicks || snap.notes
            );
        };

        if (hasData(snapshots.snap30d)) {
            return { type: "30d", ...snapshots.snap30d };
        }
        if (hasData(snapshots.snap7d)) {
            return { type: "7d", ...snapshots.snap7d };
        }
        if (hasData(snapshots.snap24h)) {
            return { type: "24h", ...snapshots.snap24h };
        }
        return null;
    };

    // Parse projects defensively
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
            // legacy notes or malformed -> skip defensively
        }
        return null;
    }).filter((p): p is any => p !== null);

    // Grouping candidates based on nextDecision.decision
    const filterCandidates = (tab: CandidateTab) => {
        return analyticsProjects.filter(p => {
            const decision = p.pf.nextDecision?.decision;
            switch(tab) {
                case "repost":
                    return decision === "Repost later";
                case "infographic":
                    return decision === "Make infographic";
                case "followup":
                    return decision === "Write follow-up article";
                case "explainer":
                    return decision === "Create short explainer";
                case "videoscript":
                    return decision === "Create video script";
                case "improve":
                    return decision === "Improve headline" || decision === "Improve image";
                case "evergreen":
                    return decision === "Keep as evergreen";
                case "needsreview":
                    return !decision || decision === "" || decision === "Review later";
                default:
                    return false;
            }
        });
    };

    const repostCandidates = filterCandidates("repost");
    const infographicCandidates = filterCandidates("infographic");
    const followupCandidates = filterCandidates("followup");
    const explainerCandidates = filterCandidates("explainer");
    const videoscriptCandidates = filterCandidates("videoscript");
    const improveCandidates = filterCandidates("improve");
    const evergreenCandidates = filterCandidates("evergreen");
    const needsReviewCandidates = filterCandidates("needsreview");

    const currentCandidates = filterCandidates(activeTab);

    // Auto-select first project in the tab
    useEffect(() => {
        const candidates = filterCandidates(activeTab);
        if (candidates.length > 0) {
            setSelectedProjectId(candidates[0].id);
        } else {
            setSelectedProjectId(null);
        }
    }, [activeTab, projects]); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedProject = analyticsProjects.find(p => p.id === selectedProjectId);

    // Build the Prompt-ready text
    const handleCopyPrompt = () => {
        if (!selectedProject) return;
        const p = selectedProject;
        const latest = getLatestSnapshot(p.pf.snapshots);
        const pRec = p.pf.publishingRecord || {};
        const fBack = p.pf.notableFeedback || {};
        const insight = p.pf.arborInsight || {};
        const dec = p.pf.nextDecision || {};

        let prompt = `คุณคือ Green Fineness Organic Content Optimizer. หน้าที่ของคุณคือวิเคราะห์ข้อมูลผลลัพธ์เพื่อนำมาแนะนำแผนการปรับแต่ง Hook, CTA และต่อยอดเนื้อหาชุดถัดไป\n\n`;
        prompt += `หัวข้อบทความ: ${p.title}\n`;
        prompt += `ลิงก์เผยแพร่: ${pRec.publishedUrl || "Not available"}\n`;
        prompt += `UTM Campaign: ${pRec.utmCampaign || "Not available"}\n`;
        
        if (p.social_caption) {
            prompt += `แคปชันโพสต์โซเชียลดั้งเดิม: ${p.social_caption}\n`;
        }

        prompt += `\n--- สถิติประสิทธิภาพการตลาดล่าสุด (${latest?.type || "No Snapshot"}) ---\n`;
        prompt += `- GA4 Page Views: ${formatMetric(latest?.views)}\n`;
        prompt += `- GA4 Active Users: ${formatMetric(latest?.users)}\n`;
        prompt += `- Facebook Reach: ${formatMetric(latest?.fbReach)}\n`;
        prompt += `- Facebook Comments: ${formatMetric(latest?.fbComments)}\n`;
        prompt += `- Facebook Shares: ${formatMetric(latest?.fbShares)}\n`;
        prompt += `- Facebook Clicks: ${formatMetric(latest?.fbClicks)}\n`;
        if (latest?.notes) {
            prompt += `- หมายเหตุสถิติ: ${latest.notes}\n`;
        }

        prompt += `\n--- สัญญาณผลตอบรับลูกค้า (Notable Feedback) ---\n`;
        prompt += `- ความเห็นเด่นของผู้อ่าน: ${fBack.comments || "Not available"}\n`;
        prompt += `- คำถามของกลุ่มเป้าหมาย: ${fBack.questions || "Not available"}\n`;
        prompt += `- จุดที่ลูกค้าสับสนเข้าใจผิด: ${fBack.confusion || "Not available"}\n`;
        prompt += `- คำศัพท์เฉพาะ/ภาษาที่ลูกค้าใช้จริง: ${fBack.language || "Not available"}\n`;

        prompt += `\n--- ผลวิเคราะห์วิจารณ์เบื้องต้น (Arbor Insight) ---\n`;
        prompt += `- สิ่งที่ได้ผลดี: ${insight.whatWorked || "Not available"}\n`;
        prompt += `- สิ่งที่ควรปรับปรุง: ${insight.whatDidNotWork || "Not available"}\n`;
        prompt += `- Topic Signal (ความต้องการหัวข้อ): ${insight.topicSignal || "Not available"}\n`;
        prompt += `- แผน Action แนะนำ: ${insight.recommendedAction || "Not available"}\n`;

        prompt += `\n--- การประมวลผลต่อยอดที่เลือกไว้ (Next Content Decision) ---\n`;
        prompt += `- สรุปทางเลือก: ${dec.decision || "Not available"}\n`;
        prompt += `- ลำดับความสำคัญ: ${dec.priority || "Not available"}\n`;
        prompt += `- วันกำหนดเป้าหมาย: ${dec.targetDate || "Not available"}\n`;
        if (dec.notes) {
            prompt += `- บันทึกเพิ่มเติม: ${dec.notes}\n`;
        }

        prompt += `\n--- โจทย์วิเคราะห์เพื่อสร้าง Content แนะนำ (Requested Tasks) ---\n`;
        prompt += `โปรดใช้ข้อมูลประสิทธิภาพเชิงประจักษ์ข้างต้นเพื่อสรุปเนื้อหาต่อยอดดังนี้:\n`;
        prompt += `1. Hook Optimization: เสนอแนะพาดหัว/พาดเปิดหัว (Hooks) สำหรับเฟซบุ๊กโพสต์ใหม่ 3 แบบเพื่อปรับปรุง Reach\n`;
        prompt += `2. CTA Optimization: ปรับปรุงส่วนท้ายแคปชันและกระตุ้นการคลิกลิงก์ (Call-to-Action) เพื่อเพิ่มอัตรา Click-Through Rate\n`;
        prompt += `3. Content Explainer Idea: ออกแบบร่างเนื้อหาขนาดสั้น (Short Explainer Outline) เจาะประเด็นคำถามยอดนิยมของผู้ชม\n`;
        prompt += `4. Video Script Outline: ร่างบทเขียนสำหรับคลิปสั้นความยาว 1 นาที (Reels/TikTok) เพื่อเข้าถึงผู้ชมกลุ่มกว้างขึ้น\n`;
        prompt += `5. Next Content Recommendation: เสนอชื่อตอน/ประเด็นขยายบทความชิ้นถัดไปที่แนะแนวให้แชร์ร่วมกันได้ดีที่สุด`;

        navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (analyticsProjects.length === 0) {
        return (
            <div className="py-24 text-center bg-white border border-neutral-200 rounded-[32px] space-y-4">
                <div className="w-16 h-16 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-center mx-auto">
                    <Wand2 className="w-8 h-8 text-neutral-400" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                    <h3 className="text-base font-black text-neutral-900">ไม่มีข้อมูล Organic Optimization</h3>
                    <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                        บทความในระบบยังไม่มีการบันทึกสถิติและข้อมูลประเมิน Organic กรุณากรอกข้อมูลใน Performance / Feedback ในหน้า Writing Studio ก่อนเข้าใช้งานเครื่องมือปรับปรุงเนื้อหา
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in-50 duration-300">
            {/* Top Candidate Bar */}
            <div className="bg-white border border-neutral-200 p-6 rounded-[32px] shadow-sm space-y-4">
                <div>
                    <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Wand2 size={16} className="text-indigo-500 animate-pulse" />
                        Organic Content Optimizer Candidates
                    </h3>
                    <p className="text-[10px] font-bold text-neutral-400 mt-0.5">กรองบทความออกตามหมวดหมู่ผลลัพธ์และแผนการนำมาต่อยอดการตลาดออร์แกนิก</p>
                </div>

                <div className="flex flex-wrap gap-2 border-b border-neutral-100 pb-4">
                    <button 
                        onClick={() => setActiveTab("repost")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            activeTab === "repost" 
                                ? "bg-purple-500 border-purple-500 text-white shadow-sm" 
                                : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                        }`}
                    >
                        Repost ({repostCandidates.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab("infographic")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            activeTab === "infographic" 
                                ? "bg-indigo-500 border-indigo-500 text-white shadow-sm" 
                                : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                        }`}
                    >
                        Infographic ({infographicCandidates.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab("followup")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            activeTab === "followup" 
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                                : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                        }`}
                    >
                        Follow-up Article ({followupCandidates.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab("explainer")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            activeTab === "explainer" 
                                ? "bg-amber-500 border-amber-500 text-white shadow-sm" 
                                : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                        }`}
                    >
                        Short Explainer ({explainerCandidates.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab("videoscript")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            activeTab === "videoscript" 
                                ? "bg-pink-500 border-pink-500 text-white shadow-sm" 
                                : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                        }`}
                    >
                        Video Script ({videoscriptCandidates.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab("improve")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            activeTab === "improve" 
                                ? "bg-red-500 border-red-500 text-white shadow-sm" 
                                : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                        }`}
                    >
                        Improve Headline/Image ({improveCandidates.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab("evergreen")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            activeTab === "evergreen" 
                                ? "bg-blue-500 border-blue-500 text-white shadow-sm" 
                                : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                        }`}
                    >
                        Evergreen ({evergreenCandidates.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab("needsreview")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            activeTab === "needsreview" 
                                ? "bg-neutral-800 border-neutral-800 text-white shadow-sm" 
                                : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                        }`}
                    >
                        Needs Review ({needsReviewCandidates.length})
                    </button>
                </div>

                {/* Candidate Selection List */}
                {currentCandidates.length === 0 ? (
                    <div className="py-6 text-center text-xs text-neutral-400 font-bold bg-neutral-50 rounded-2xl">
                        ไม่มีบทความที่อยู่ในหมวดหมู่นี้ในขณะนี้
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {currentCandidates.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedProjectId(c.id)}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                    selectedProjectId === c.id 
                                        ? "bg-black text-white border-black" 
                                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                                }`}
                            >
                                <span className="max-w-[180px] truncate">{c.title}</span>
                                <span className="text-[10px] font-mono opacity-60">
                                    ({c.pf.publishingRecord?.publishStatus || "Draft"})
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Split Screen Layout for Diagnosis Panel */}
            {selectedProject && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    {/* Diagnostic Summary & Actions */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white border border-neutral-200 p-6 rounded-[32px] shadow-sm space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                                <div>
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                        Content Diagnosis Panel
                                    </span>
                                    <h3 className="text-lg font-black text-neutral-900 mt-0.5">{selectedProject.title}</h3>
                                </div>

                                <button
                                    onClick={handleCopyPrompt}
                                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-4.5 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/10 flex items-center gap-1.5 transition-all"
                                >
                                    {copied ? (
                                        <>
                                            <Check size={14} />
                                            Prompt Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={14} />
                                            Copy Optimizer Prompt
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Diagnosis Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div className="bg-neutral-50/60 p-3 rounded-2xl border border-neutral-100/80">
                                    <div className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">GA4 Views</div>
                                    <div className="text-base font-black text-neutral-800 mt-1">
                                        {formatMetric(getLatestSnapshot(selectedProject.pf.snapshots)?.views)}
                                    </div>
                                </div>
                                <div className="bg-neutral-50/60 p-3 rounded-2xl border border-neutral-100/80">
                                    <div className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">GA4 Users</div>
                                    <div className="text-base font-black text-neutral-800 mt-1">
                                        {formatMetric(getLatestSnapshot(selectedProject.pf.snapshots)?.users)}
                                    </div>
                                </div>
                                <div className="bg-neutral-50/60 p-3 rounded-2xl border border-neutral-100/80">
                                    <div className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">FB Reach</div>
                                    <div className="text-base font-black text-neutral-800 mt-1">
                                        {formatMetric(getLatestSnapshot(selectedProject.pf.snapshots)?.fbReach)}
                                    </div>
                                </div>
                                <div className="bg-neutral-50/60 p-3 rounded-2xl border border-neutral-100/80">
                                    <div className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">FB Comments</div>
                                    <div className="text-base font-black text-neutral-800 mt-1">
                                        {formatMetric(getLatestSnapshot(selectedProject.pf.snapshots)?.fbComments)}
                                    </div>
                                </div>
                                <div className="bg-neutral-50/60 p-3 rounded-2xl border border-neutral-100/80">
                                    <div className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">FB Shares</div>
                                    <div className="text-base font-black text-neutral-800 mt-1">
                                        {formatMetric(getLatestSnapshot(selectedProject.pf.snapshots)?.fbShares)}
                                    </div>
                                </div>
                            </div>

                            {/* Core Diagnostics */}
                            <div className="space-y-4 text-xs leading-relaxed">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-neutral-50 p-4.5 rounded-2xl space-y-1">
                                        <div className="text-[9px] font-black text-purple-600 uppercase flex items-center gap-1">
                                            <Activity size={12} />
                                            Topic Signal
                                        </div>
                                        <p className="text-neutral-800 font-bold mt-1">
                                            {selectedProject.pf.arborInsight?.topicSignal || "Not available"}
                                        </p>
                                    </div>

                                    <div className="bg-neutral-50 p-4.5 rounded-2xl space-y-1">
                                        <div className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1">
                                            <Award size={12} />
                                            Recommended Next Action
                                        </div>
                                        <p className="text-neutral-800 font-bold mt-1">
                                            {selectedProject.pf.arborInsight?.recommendedAction || "Not available"}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-neutral-50 p-4.5 rounded-2xl space-y-2">
                                    <div className="text-[9px] font-black text-neutral-500 uppercase">Hook Diagnosis & Caption Copy</div>
                                    {selectedProject.social_caption ? (
                                        <div className="space-y-2">
                                            <p className="text-neutral-700 bg-white p-3 rounded-xl border border-neutral-200/60 font-mono text-[11px] whitespace-pre-wrap">
                                                {selectedProject.social_caption}
                                            </p>
                                            <p className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
                                                <InfoIcon size={12} className="text-neutral-300" />
                                                ข้อมูลจาก Social Caption ดั้งเดิมในห้องเขียนร่าง. ใช้ปุ่ม Copy Prompt เพื่อประเมินและแต่ง Hook ใหม่ใน Arbor/ChatGPT
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-neutral-400 font-bold italic">Not available (Missing social caption in draft)</p>
                                    )}
                                </div>

                                <div className="bg-neutral-50 p-4.5 rounded-2xl space-y-2">
                                    <div className="text-[9px] font-black text-neutral-500 uppercase">Call-To-Action (CTA) & UTM Configuration</div>
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between text-neutral-700 bg-white p-3 rounded-xl border border-neutral-200/60">
                                            <span className="font-bold">Published URL:</span>
                                            {selectedProject.pf.publishingRecord?.publishedUrl ? (
                                                <a 
                                                    href={selectedProject.pf.publishingRecord.publishedUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 font-black inline-flex items-center gap-0.5 hover:underline"
                                                >
                                                    Open URL
                                                    <ExternalLink size={10} />
                                                </a>
                                            ) : (
                                                <span className="text-neutral-400 italic">Not available</span>
                                            )}
                                        </div>
                                        {selectedProject.pf.publishingRecord?.utmCampaign && (
                                            <div className="flex items-center justify-between text-neutral-700 bg-white p-3 rounded-xl border border-neutral-200/60">
                                                <span className="font-bold">UTM Campaign:</span>
                                                <span className="font-mono text-[11px] bg-neutral-50 px-2 py-0.5 rounded border">
                                                    {selectedProject.pf.publishingRecord.utmCampaign}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Insights & Feedbacks Panel */}
                    <div className="bg-white border border-neutral-200 p-6 rounded-[32px] shadow-sm space-y-6">
                        <div>
                            <h4 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                                <MessageSquare size={16} className="text-emerald-500" />
                                Reader Response Diagnosis
                            </h4>
                            <p className="text-[10px] font-bold text-neutral-400 mt-0.5">การรับความคิดเห็นและสิ่งที่ลูกค้ายอดฮิตถามในบทความตอนนี้</p>
                        </div>

                        <div className="space-y-4 text-xs leading-normal">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Notable Feedback</span>
                                <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-neutral-700 font-bold">
                                    {selectedProject.pf.notableFeedback?.comments || <span className="text-neutral-300 italic">No comments recorded</span>}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Audience Questions</span>
                                <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-neutral-700 font-bold">
                                    {selectedProject.pf.notableFeedback?.questions || <span className="text-neutral-300 italic">No questions recorded</span>}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Reader Confusion / Misunderstanding</span>
                                <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-neutral-700 font-bold">
                                    {selectedProject.pf.notableFeedback?.confusion || <span className="text-neutral-300 italic">No misunderstandings recorded</span>}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Customer Voice & Terms</span>
                                <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl text-neutral-700 font-bold font-mono">
                                    {selectedProject.pf.notableFeedback?.language || <span className="text-neutral-300 italic">No user terms recorded</span>}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-neutral-100 flex items-center justify-end">
                            <Link 
                                href={`/workspaces/content/writing-lab?project_id=${selectedProject.id}`}
                                className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase flex items-center gap-1"
                            >
                                Open in Writing Lab
                                <ArrowRight size={12} />
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Next Content Queue preview (Read-only) */}
            <div className="bg-white border border-neutral-200 rounded-[32px] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp size={16} className="text-purple-500" />
                            Next Content Queue Preview
                        </h4>
                        <p className="text-[10px] font-bold text-neutral-400 mt-0.5">บทวิเคราะห์แผนการสร้างบทความ/โพสต์ขยายผลต่อจากข้อมูลสถิติล่าสุด (Read-only)</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-100 text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                                <th className="py-3.5 px-6">Source Article</th>
                                <th className="py-3.5 px-4">Proposed Action</th>
                                <th className="py-3.5 px-4">Proposed Next Content Decision</th>
                                <th className="py-3.5 px-4 text-center">Priority</th>
                                <th className="py-3.5 px-4">Suggested Format</th>
                                <th className="py-3.5 px-4">Target Date</th>
                                <th className="py-3.5 px-4">Reason / Strategic Note</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {analyticsProjects.filter(p => p.pf.nextDecision?.decision && p.pf.nextDecision.decision !== "No action").length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-neutral-400 font-bold bg-neutral-50/20">
                                        ไม่มีการประเมินคิวสถิติงานต่อยอดถัดไปในระบบ
                                    </td>
                                </tr>
                            ) : (
                                analyticsProjects
                                    .filter(p => p.pf.nextDecision?.decision && p.pf.nextDecision.decision !== "No action")
                                    .map((p) => {
                                        // Infer suggested format based on nextDecision.decision
                                        let suggestedFormat = "Article";
                                        let formatIcon = <FileText size={12} className="text-emerald-500" />;
                                        
                                        if (p.pf.nextDecision.decision === "Make infographic") {
                                            suggestedFormat = "Infographic";
                                            formatIcon = <ImageIcon size={12} className="text-indigo-500" />;
                                        } else if (p.pf.nextDecision.decision === "Create video script") {
                                            suggestedFormat = "Short Video";
                                            formatIcon = <Video size={12} className="text-pink-500" />;
                                        } else if (p.pf.nextDecision.decision === "Repost later") {
                                            suggestedFormat = "Repost Caption";
                                            formatIcon = <Share2 size={12} className="text-purple-500" />;
                                        }

                                        return (
                                            <tr key={p.id} className="hover:bg-neutral-50/30 transition-colors">
                                                <td className="py-4 px-6 font-bold text-neutral-900 max-w-xs truncate">
                                                    <Link 
                                                        href={`/workspaces/content/writing-lab?project_id=${p.id}`}
                                                        className="hover:text-blue-600 transition-colors inline-flex items-center gap-0.5"
                                                    >
                                                        {p.title}
                                                        <ExternalLink size={10} className="text-neutral-300" />
                                                    </Link>
                                                </td>
                                                <td className="py-4 px-4 font-bold text-indigo-600">
                                                    {p.pf.arborInsight?.recommendedAction || "Evaluate & Improve"}
                                                </td>
                                                <td className="py-4 px-4 font-black text-neutral-800">
                                                    {p.pf.nextDecision.decision}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                        p.pf.nextDecision.priority === "High"
                                                            ? "bg-red-50 text-red-600"
                                                            : p.pf.nextDecision.priority === "Medium"
                                                            ? "bg-amber-50 text-amber-600"
                                                            : "bg-neutral-100 text-neutral-500"
                                                    }`}>
                                                        {p.pf.nextDecision.priority || "Medium"}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className="inline-flex items-center gap-1 font-bold text-neutral-700">
                                                        {formatIcon}
                                                        {suggestedFormat}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 font-bold text-neutral-500">
                                                    {p.pf.nextDecision.targetDate || "—"}
                                                </td>
                                                <td className="py-4 px-4 text-neutral-500 max-w-sm truncate">
                                                    {p.pf.nextDecision.notes || "—"}
                                                </td>
                                            </tr>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
