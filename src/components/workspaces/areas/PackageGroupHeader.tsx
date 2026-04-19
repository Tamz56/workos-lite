import React from "react";
import { 
    ChevronRight, 
    ChevronDown, 
    Calendar, 
    Paperclip, 
    Copy, 
    Check, 
    Search, 
    ExternalLink,
    Play,
    Layout,
    ShieldCheck,
    Send,
    CloudUpload,
    FileEdit,
    Rocket,
    Facebook,
    Instagram,
    Globe,
    Smartphone,
    ShoppingBag,
    AlertCircle,
    TrendingUp,
    X
} from "lucide-react";
import { resolveNextSuggestedAction } from "../../../lib/smart/next/resolveNextSuggestedAction";
import { Task } from "@/lib/types";


const CHANNELS = [
    { id: 'facebook', label: 'FB', color: 'bg-[#1877F2]', icon: Facebook },
    { id: 'tiktok', label: 'TT', color: 'bg-black', icon: Smartphone },
    { id: 'instagram', label: 'IG', color: 'bg-[#E4405F]', icon: Instagram },
    { id: 'website', label: 'WEB', color: 'bg-emerald-600', icon: Globe },
    { id: 'marketplace', label: 'MP', color: 'bg-orange-500', icon: ShoppingBag },
];


interface PackageGroupHeaderProps {
    topicId: string;
    templateKey?: string | null;
    packageDone?: number;
    packageTotal?: number;
    scheduledDate?: string | null;
    docId?: string | null;
    nextTaskId?: string | null; // RC24
    isCollapsed: boolean;
    isFullyComplete?: boolean; // RC25
    reviewStatus?: string; // RC26
    readyToPublish?: boolean; // RC27
    onToggle: () => void;
    onOpenNote?: () => void;
    onCopyId?: () => void;
    onFocus?: () => void;
    onNextStep?: (taskId: string) => void; // RC24
    onOpenWorkspace?: () => void; // RC24
    onReschedule?: (newDate: string) => void; // RC24
    onUpdateReviewStatus?: (newStatus: string) => void; // RC26
    onPublish?: () => void; // RC28
    publishedAt?: string | null; // RC28
    channels?: string[]; // RC29
    isChannelsInconsistent?: boolean; // RC29
    onUpdateChannels?: (channels: string[]) => void; // RC29
    performanceMetrics?: Record<string, any>; // RC30
    isMetricsInconsistent?: boolean; // RC30
    onUpdateMetrics?: (metrics: Record<string, any>) => void; // RC30
    isBestPerformer?: boolean; // RC31
    bestChannelHint?: string; // RC31
    onQuickAdd?: () => void; // RC36
    tasks?: Task[]; // RC39
}

export default function PackageGroupHeader({
    topicId,
    templateKey,
    packageDone,
    packageTotal,
    scheduledDate,
    docId,
    nextTaskId,
    isCollapsed,
    isFullyComplete,
    onToggle,
    onOpenNote,
    onCopyId,
    onFocus,
    onNextStep,
    onOpenWorkspace,
    onReschedule,
    onUpdateReviewStatus,
    onPublish, // RC28
    reviewStatus = "draft",
    readyToPublish = false,
    publishedAt, // RC28
    channels = [], // RC29
    isChannelsInconsistent = false, // RC29
    onUpdateChannels, // RC29
    performanceMetrics = {}, // RC30
    isMetricsInconsistent = false, // RC30
    onUpdateMetrics, // RC30
    isBestPerformer = false, // RC31
    bestChannelHint, // RC31
    onQuickAdd, // RC36
    tasks = [] // RC39
}: PackageGroupHeaderProps) {



    const today = new Date().toISOString().split("T")[0];
    const isOverdue = scheduledDate && scheduledDate < today && (packageDone || 0) < (packageTotal || 0);
    const [copied, setCopied] = React.useState(false);
    const [isRescheduling, setIsRescheduling] = React.useState(false);
    const dateInputRef = React.useRef<HTMLInputElement>(null);
    const [isEditingMetrics, setIsEditingMetrics] = React.useState(false);

    // RC39: Smart Next Action
    const suggestedAction = React.useMemo(() => {
        return resolveNextSuggestedAction({ tasks: tasks as any });
    }, [tasks]);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCopyId?.();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatNum = (num: number) => {
        if (!num) return "0";
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "m";
        if (num >= 1000) return (num / 1000).toFixed(1) + "k";
        return num.toString();
    };

    const getChannelSummary = (chId: string) => {
        const m = performanceMetrics[chId];
        if (!m) return null;
        if (chId === 'facebook') return `${formatNum(m.views)}v / ${formatNum(m.engagement)}e`;
        if (chId === 'instagram') return `${formatNum(m.likes)}l`;
        return `${formatNum(m.views)}v`;
    };


    const isActivePerformance = Object.keys(performanceMetrics).length > 0;

    const handleRescheduleClick = (e: React.MouseEvent) => {

        e.stopPropagation();
        if (!scheduledDate) return;
        setIsRescheduling(!isRescheduling);
        // Focus date input after a mini timeout to ensure it's rendered
        setTimeout(() => dateInputRef.current?.showPicker?.(), 50);
    };

    // RC25: Calm completed state colors
    const bgClass = isFullyComplete 
        ? "bg-emerald-50/80 hover:bg-emerald-100/80 border-l-emerald-500" 
        : "bg-neutral-50/90 hover:bg-neutral-100 border-l-neutral-300";

    return (
        <div 
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            className={`group py-2.5 px-4 flex items-center border-b border-neutral-200 cursor-pointer select-none transition-all duration-300 border-l-4 sticky top-0 z-30 backdrop-blur ${bgClass} active:opacity-80`}
        >
            <div className="w-6 h-6 flex items-center justify-center text-neutral-400 group-hover:text-neutral-600 mr-2">
                {isCollapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronDown size={16} strokeWidth={2.5} />}
            </div>

            <div className="flex-1 flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-sm tracking-tight uppercase ${isFullyComplete ? 'bg-emerald-600' : 'bg-neutral-800'} text-white`}>
                        {topicId}
                    </span>
                    
                    {/* RC27: Ready to Publish Signal */}
                    {readyToPublish && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-sm bg-indigo-600 text-white animate-in fade-in zoom-in duration-300">
                            READY
                        </span>
                    )}

                    {packageTotal !== undefined && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isCollapsed) onToggle();
                                
                                // RC46C: Resolve next actionable task in group
                                const targetId = suggestedAction?.taskId || tasks.find(t => t.status !== 'done')?.id;
                                if (targetId && onNextStep) {
                                    onNextStep(targetId);
                                }
                            }}
                            title={isFullyComplete ? "ครบถ้วนแล้ว!" : "คลิกเพื่อไปที่ขั้นตอนถัดไปในกลุ่มนี้"}
                            className={`text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1.5 transition-all active:scale-95 group/prog ${
                                isFullyComplete 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-neutral-200 hover:bg-indigo-600 hover:text-white text-neutral-600 shadow-sm'
                            }`}
                        >
                            {isFullyComplete ? (
                                <Check size={10} strokeWidth={4} />
                            ) : (
                                <Play size={8} fill="currentColor" className="opacity-0 group-hover/prog:opacity-100 transition-opacity" />
                            )}
                            {packageDone}/{packageTotal}
                        </button>
                    )}

                    {/* RC26: Review Status Badge */}
                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border ${
                        reviewStatus === 'in_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        reviewStatus === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        reviewStatus === 'published' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-neutral-50 text-neutral-500 border-neutral-200'
                    }`}>
                        {reviewStatus === 'in_review' && <Send size={10} />}
                        {reviewStatus === 'approved' && <ShieldCheck size={10} />}
                        {reviewStatus === 'published' && <CloudUpload size={10} />}
                        {reviewStatus === 'draft' && <FileEdit size={10} />}
                        <span className="uppercase tracking-tight">
                            {reviewStatus === 'draft' ? 'ร่าง' :
                             reviewStatus === 'in_review' ? 'รอรีวิว' :
                             reviewStatus === 'approved' ? 'อนุมัติ' :
                             reviewStatus === 'published' ? 'โพสต์แล้ว' : reviewStatus}
                        </span>
                    </div>

                    {/* RC31: BEST Performer Badge */}
                    {isBestPerformer && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200 shadow-sm animate-pulse shrink-0">
                            <span className="text-[9px] font-black italic tracking-tighter uppercase whitespace-nowrap">🔥 BEST</span>
                        </div>
                    )}


                    {/* RC28: Published Log */}
                    {reviewStatus === 'published' && publishedAt && (
                        <span className="text-[10px] text-blue-600 font-medium italic">
                            เผยแพร่เมื่อ {new Date(publishedAt).toLocaleString('th-TH', { 
                                day: 'numeric', 
                                month: 'short', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })}
                        </span>
                    )}

                    {/* RC29: Distribution Channels Tracking */}
                    {reviewStatus === 'published' && onUpdateChannels && (
                        <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-blue-200/50 animate-in fade-in slide-in-from-left-2 duration-500">
                            {CHANNELS.map(ch => {
                                const isActive = channels.includes(ch.id);
                                const Icon = ch.icon;
                                const summary = getChannelSummary(ch.id);
                                return (
                                    <div key={ch.id} className="flex flex-col items-center gap-0.5">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newChannels = isActive 
                                                    ? channels.filter(c => c !== ch.id)
                                                    : [...channels, ch.id];
                                                onUpdateChannels(newChannels);
                                            }}
                                            title={`${isActive ? 'ยกเลิก' : 'ทำเครื่องหมายว่า'}เผยแพร่ไปยัง ${ch.label}`}
                                            className={`group/ch flex items-center gap-1.5 px-1.5 py-0.5 rounded-full transition-all duration-300 border ${
                                                isActive 
                                                    ? `${ch.color} text-white border-transparent shadow-sm scale-110` 
                                                    : 'bg-white text-neutral-400 border-neutral-200 hover:border-neutral-300 hover:text-neutral-500 scale-90 hover:scale-100 grayscale-[0.8] hover:grayscale-0'
                                            }`}
                                        >
                                            <Icon size={9} strokeWidth={isActive ? 3 : 2} />
                                            <span className="text-[8px] font-black tracking-tight">{ch.label}</span>
                                        </button>
                                        {isActive && summary && (
                                            <span className="text-[7px] font-black text-blue-600 bg-blue-100/60 px-0.5 rounded-sm tabular-nums whitespace-nowrap animate-in fade-in zoom-in duration-300">
                                                {summary}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}

                            
                            {/* Inconsistent State Warning */}
                            {isChannelsInconsistent && (
                                <div title="พบข้อมูลช่องทางไม่ตรงกัน คลิกเพื่อเขียนทับและซิงค์ข้อมูลใหม่" className="ml-1 text-orange-500 animate-pulse">
                                    <AlertCircle size={12} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* RC30: Performance Metrics Trigger */}
                    {reviewStatus === 'published' && onUpdateMetrics && (
                        <div className="relative ml-2 pr-1 h-8 flex items-center border-l border-blue-200/50">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsEditingMetrics(!isEditingMetrics); }}
                                className={`p-1.5 ml-2 rounded-full transition-all ${isEditingMetrics ? 'bg-indigo-600 text-white shadow-md scale-110' : 'hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600'}`}
                                title="บันทึกสถิติ (Performance)"
                            >
                                <TrendingUp size={13} strokeWidth={isActivePerformance ? 3 : 2} />
                                {(isMetricsInconsistent || isChannelsInconsistent) && (
                                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white animate-pulse" />
                                )}
                            </button>

                            {isEditingMetrics && (
                                <div 
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute top-full right-0 mt-3 z-50 bg-white border border-neutral-200 shadow-2xl rounded-xl p-4 w-64 animate-in fade-in zoom-in slide-in-from-top-2 duration-200"
                                >
                                    <div className="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
                                        <h4 className="text-[10px] font-black uppercase text-neutral-800 tracking-wider flex items-center gap-2">
                                            <TrendingUp size={12} className="text-indigo-600" /> สถิติผลลัพธ์
                                        </h4>
                                        <button onClick={() => setIsEditingMetrics(false)} className="text-neutral-400 hover:text-neutral-600 p-1">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                        {CHANNELS.filter(ch => channels.includes(ch.id)).map(ch => (
                                            <div key={ch.id} className="space-y-2 p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${ch.color}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-tight text-neutral-700">{ch.label}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {(ch.id === 'facebook' || ch.id === 'tiktok' || ch.id === 'website' || ch.id === 'marketplace') && (
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black text-neutral-400 uppercase">Views</label>
                                                            <input 
                                                                type="number"
                                                                value={performanceMetrics[ch.id]?.views || ''}
                                                                placeholder="0"
                                                                className="w-full text-[11px] p-1.5 border border-neutral-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-bold tabular-nums"
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    onUpdateMetrics({
                                                                        ...performanceMetrics,
                                                                        [ch.id]: { ...(performanceMetrics[ch.id] || {}), views: val }
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                    {ch.id === 'facebook' && (
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black text-neutral-400 uppercase">Engagement</label>
                                                            <input 
                                                                type="number"
                                                                value={performanceMetrics[ch.id]?.engagement || ''}
                                                                placeholder="0"
                                                                className="w-full text-[11px] p-1.5 border border-neutral-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-bold tabular-nums"
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    onUpdateMetrics({
                                                                        ...performanceMetrics,
                                                                        [ch.id]: { ...(performanceMetrics[ch.id] || {}), engagement: val }
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                    {ch.id === 'instagram' && (
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-black text-neutral-400 uppercase">Likes</label>
                                                            <input 
                                                                type="number"
                                                                value={performanceMetrics[ch.id]?.likes || ''}
                                                                placeholder="0"
                                                                className="w-full text-[11px] p-1.5 border border-neutral-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-bold tabular-nums"
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    onUpdateMetrics({
                                                                        ...performanceMetrics,
                                                                        [ch.id]: { ...(performanceMetrics[ch.id] || {}), likes: val }
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {channels.length === 0 && (
                                            <p className="text-[10px] text-neutral-400 text-center py-6 italic font-medium">โปรดระบุช่องทางเผยแพร่ก่อน</p>
                                        )}
                                    </div>
                                    <p className="mt-4 text-[8px] text-neutral-400 leading-tight italic border-t border-neutral-100 pt-3">
                                        ข้อมูลสถิติจะถูกบันทึกลงในงานทุกชิ้นภายใต้ Topic นี้โดยอัตโนมัติ
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* RC31: Best Channel Hint */}
                    {bestChannelHint && (
                        <div className="ml-1 flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-100/50 text-neutral-500 border border-transparent">
                            <span className="text-[8px] font-black uppercase tracking-wider leading-none">เด่นบน {bestChannelHint}</span>
                        </div>
                    )}
                </div>




                {/* Actions group - visible on hover */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity ml-2">
                    {/* RC36: Quick Add Trigger */}
                    {onQuickAdd && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
                            title="Add Task to Package"
                            className="p-1 px-1.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-1 border border-indigo-200/50"
                        >
                            <span className="text-[9px] font-black uppercase pr-0.5">+ Task</span>
                        </button>
                    )}

                    {/* RC39: Smart Suggested Action Cue */}
                    {suggestedAction && onNextStep && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNextStep(suggestedAction.taskId); }}
                            className={`flex items-center gap-2 px-3 py-1 rounded-xl font-bold text-xs transition-all animate-in zoom-in slide-in-from-right-4 duration-500 shadow-sm border ${
                                suggestedAction.type === 'overdue' ? 'bg-red-50 text-red-600 border-red-200 shadow-red-100 hover:bg-red-100' :
                                suggestedAction.type === 'publish-today' ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-100 hover:bg-indigo-700' :
                                'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                            }`}
                        >
                            <span className="shrink-0">
                                {suggestedAction.type === 'overdue' ? '🚩' : 
                                 suggestedAction.type === 'publish-today' ? '🚀' : '✨'}
                            </span>
                            <span className="truncate max-w-[120px]">{suggestedAction.label}</span>
                        </button>
                    )}

                    {/* RC24: Default Next Step (Hide if smart suggestion is already showing the same task) */}
                    {nextTaskId && onNextStep && (!suggestedAction || suggestedAction.taskId !== nextTaskId) && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onNextStep(nextTaskId); }}
                            title="ขั้นตอนถัดไป"
                            className="p-1 px-1.5 rounded bg-blue-600/80 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                            <Play size={10} fill="currentColor" />
                            <span className="text-[9px] font-black uppercase pr-0.5">Next</span>
                        </button>
                    )}

                    {/* RC24: Open Workspace */}
                    {onOpenWorkspace && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onOpenWorkspace(); }}
                            title="เปิดพื้นที่ทำงาน"
                            className="p-1 px-1.5 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                            <Layout size={12} />
                        </button>
                    )}

                    {/* RC26: Quick Review Actions */}
                    {onUpdateReviewStatus && (
                        <div className="flex items-center gap-1 px-1 border-l border-neutral-200 ml-1">
                            {/* Send to Review */}
                            {reviewStatus === 'draft' && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateReviewStatus('in_review'); }}
                                    className="p-1 px-1.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-1"
                                    title="ส่งให้รีวิว"
                                >
                                    <Send size={10} />
                                    <span className="text-[9px] font-black uppercase">Review</span>
                                </button>
                            )}

                            {/* Approve - Hide if Ready (Constraint 3) */}
                            {reviewStatus === 'in_review' && !readyToPublish && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateReviewStatus('approved'); }}
                                    className="p-1 px-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1"
                                    title="อนุมัติแพ็กเกจ"
                                >
                                    <ShieldCheck size={10} />
                                    <span className="text-[9px] font-black uppercase">Approve</span>
                                </button>
                            )}

                            {/* RC28: Primary Publish Action (Prominent) */}
                            {readyToPublish && reviewStatus !== 'published' && onPublish && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onPublish(); }}
                                    className="p-1 px-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 animate-pulse-subtle"
                                    title="เผยแพร่คอนเทนต์ทันที"
                                >
                                    <Rocket size={11} fill="currentColor" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Publish Now</span>
                                </button>
                            )}

                            {/* Mark Published (Fallback for non-READY or override) */}
                            {reviewStatus === 'approved' && !readyToPublish && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateReviewStatus('published'); }}
                                    className="p-1 px-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
                                    title="โพสต์แล้ว"
                                >
                                    <CloudUpload size={10} />
                                    <span className="text-[9px] font-black uppercase">Publish</span>
                                </button>
                            )}

                            {/* Reset to Draft (Fallback Action) */}
                            {reviewStatus !== 'draft' && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onUpdateReviewStatus('draft'); }}
                                    className="p-1 px-1.5 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition-colors"
                                    title="กลับไปเป็นร่าง"
                                >
                                    <FileEdit size={10} />
                                </button>
                            )}
                        </div>
                    )}

                    <button 
                        onClick={handleCopy}
                        title="คัดลอก Topic ID"
                        className="p-1 px-1.5 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                        {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    </button>
                    
                    {onFocus && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onFocus(); }}
                            title="โฟกัสที่กลุ่มนี้"
                            className="p-1 px-1.5 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                            <Search size={12} />
                        </button>
                    )}
                    
                    {docId && onOpenNote && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onOpenNote(); }}
                            title="เปิด Hub Note"
                            className="p-1 px-1.5 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors"
                        >
                            <ExternalLink size={12} />
                        </button>
                    )}

                    {/* RC24: Reschedule */}
                    {scheduledDate && onReschedule && (
                        <div className="relative">
                            <button 
                                onClick={handleRescheduleClick}
                                title="เลื่อนกำหนดการทั้งแพ็กเกจ"
                                className={`p-1 px-1.5 rounded transition-colors ${isRescheduling ? 'bg-orange-100 text-orange-600' : 'hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600'}`}
                            >
                                <Calendar size={12} />
                            </button>
                            {isRescheduling && (
                                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-neutral-200 shadow-xl rounded-lg p-2 flex flex-col gap-2 w-40 animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-black uppercase text-neutral-400">วันที่เผยแพร่ใหม่</span>
                                        <button onClick={() => setIsRescheduling(false)} className="text-neutral-400 hover:text-neutral-600 text-xs">✕</button>
                                    </div>
                                    <input 
                                        type="date"
                                        ref={dateInputRef}
                                        defaultValue={scheduledDate}
                                        className="text-xs p-1.5 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full cursor-pointer"
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            if (e.target.value) {
                                                onReschedule(e.target.value);
                                                setIsRescheduling(false);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            // Delay blur to allow date selection in some browsers
                                            setTimeout(() => setIsRescheduling(false), 200);
                                        }}
                                    />
                                    <p className="text-[9px] text-neutral-400 px-1 leading-tight">งานอื่นๆ จะเลื่อนตามโดยอัตโนมัติ</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="hidden sm:flex items-center gap-2 overflow-hidden ml-auto">
                    {templateKey && (
                        <div className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${
                            templateKey === 'article' ? 'bg-blue-100 text-blue-700' :
                            templateKey === 'short_video' ? 'bg-red-100 text-red-700' :
                            templateKey === 'carousel' ? 'bg-orange-100 text-orange-700' :
                            'bg-neutral-200 text-neutral-700'
                        }`}>
                            {templateKey.replace('_', ' ')}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-6 shrink-0 text-neutral-500 ml-4">
                {/* Linked Note Indicator */}
                {docId && (
                    <div title="Linked Hub Note" className="flex items-center gap-1">
                        <Paperclip size={13} className="text-blue-500" />
                    </div>
                )}

                {/* Publish Date */}
                <div className={`flex items-center gap-1.5 text-[11px] font-bold ${
                    !scheduledDate ? 'text-neutral-300' : 
                    isOverdue ? 'text-red-500' : 'text-neutral-600'
                }`}>
                    <Calendar size={13} />
                    <span className="hidden md:inline">{scheduledDate || "No Date"}</span>
                    {isOverdue && <span className="text-[9px] bg-red-50 text-red-600 px-1 rounded border border-red-100 uppercase">เลยกำหนด</span>}
                </div>
            </div>
        </div>
    );
}
