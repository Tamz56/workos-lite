import React, { useId, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
} from "lucide-react";
import type {
  RoseTrialComparisonReport,
  TrialComparisonItem,
} from "../../../../lib/rose-trial-domain/types";

interface TrialComparisonPanelProps {
  report: RoseTrialComparisonReport;
}

export function TrialComparisonPanel({ report }: TrialComparisonPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const comparisonId = useId();
  const regionId = `trial-comparison-${comparisonId.replace(/:/g, "")}`;
  const detailsId = `${regionId}-details`;

  const {
    overallStatus,
    summaryText,
    items,
    planChangeCount,
    actualDeviationCount,
    dataIssueCount,
  } = report;

  // Render nothing or neutral message if no actual day 0 exists
  if (overallStatus === "no_actual") {
    return (
      <div
        id={regionId}
        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/10 p-4 flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400 w-full min-w-0"
        role="region"
        aria-label="รายงานการเปรียบเทียบข้อมูลปฏิบัติจริง"
      >
        <Info className="h-5 w-5 text-neutral-400 flex-shrink-0" />
        <span className="font-semibold break-words leading-relaxed">
          {summaryText}
        </span>
      </div>
    );
  }

  // Determine styles and icons based on status
  let containerBorderClass = "border-neutral-200 dark:border-neutral-800";
  let containerBgClass = "bg-white dark:bg-neutral-950";
  let icon = <Info className="h-5 w-5 text-neutral-500 flex-shrink-0" />;

  if (overallStatus === "match") {
    containerBorderClass = "border-emerald-200 dark:border-emerald-900/40";
    containerBgClass = "bg-emerald-50/20 dark:bg-emerald-950/5";
    icon = <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />;
  } else if (overallStatus === "differs" || overallStatus === "incomplete") {
    containerBorderClass = "border-amber-200 dark:border-amber-900/40";
    containerBgClass = "bg-amber-50/10 dark:bg-amber-950/5";
    icon = <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />;
  } else if (overallStatus === "corrupt") {
    containerBorderClass = "border-rose-200 dark:border-rose-900/40";
    containerBgClass = "bg-rose-50/10 dark:bg-rose-950/5";
    icon = <ShieldAlert className="h-5 w-5 text-rose-500 flex-shrink-0" />;
  }

  // Filter items by type for grouped rendering
  const planChangeItems = items.filter((item) => item.status === "plan_changed");
  const deviationItems = items.filter((item) => item.status === "actual_deviation");
  const qualityItems = items.filter((item) => item.status === "incomplete");

  const hasIssues = items.length > 0;

  return (
    <div
      id={regionId}
      className={`rounded-2xl border ${containerBorderClass} ${containerBgClass} shadow-sm overflow-hidden transition-all duration-200 w-full min-w-0`}
      role="region"
      aria-label="รายงานการเปรียบเทียบข้อมูลปฏิบัติจริง"
    >
      {/* Header Panel (Collapsed state summary) */}
      <div className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          {icon}
          <div className="space-y-0.5 min-w-0">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              รายงานเปรียบเทียบแผน Snapshot และข้อมูล Day 0
            </h4>
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 leading-snug break-words">
              {summaryText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          {/* Quick Stat Badges */}
          {hasIssues && (
            <div className="flex items-center gap-1.5 text-[10px] font-bold">
              {planChangeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                  แผนเปลี่ยน {planChangeCount}
                </span>
              )}
              {actualDeviationCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                  ทำจริงต่าง {actualDeviationCount}
                </span>
              )}
              {dataIssueCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-100 dark:border-rose-900/30">
                  ข้อมูลไม่ครบ {dataIssueCount}
                </span>
              )}
            </div>
          )}

          {overallStatus !== "corrupt" && hasIssues && (
            <button
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-controls={detailsId}
              className="flex items-center gap-1 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all select-none active:scale-95"
            >
              <span>{expanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียดเปรียบเทียบ"}</span>
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Details Section */}
      {expanded && overallStatus !== "corrupt" && hasIssues && (
        <div
          id={detailsId}
          className="border-t border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/10 p-4 md:p-5 space-y-5 text-xs w-full min-w-0"
        >
          {/* Group 1: Plan Changes */}
          {planChangeItems.length > 0 && (
            <div className="space-y-2.5 min-w-0">
              <h5 className="font-bold text-blue-800 dark:text-blue-400 flex items-center gap-1.5 border-b border-neutral-200/50 dark:border-neutral-800 pb-1 w-full">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                การปรับเปลี่ยนในแผนปัจจุบัน (Plan Changed after Day 0)
              </h5>
              <div className="space-y-3">
                {planChangeItems.map((item) => (
                  <ComparisonItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Group 2: Actual Deviations */}
          {deviationItems.length > 0 && (
            <div className="space-y-2.5 min-w-0">
              <h5 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 border-b border-neutral-200/50 dark:border-neutral-800 pb-1 w-full">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                ความต่างของการปฏิบัติจริง (Actual Deviation from Snapshot Plan)
              </h5>
              <div className="space-y-3">
                {deviationItems.map((item) => (
                  <ComparisonItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Group 3: Data Quality Issues */}
          {qualityItems.length > 0 && (
            <div className="space-y-2.5 min-w-0">
              <h5 className="font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1.5 border-b border-neutral-200/50 dark:border-neutral-800 pb-1 w-full">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                ปัญหาคุณภาพความครบถ้วนของข้อมูล (Data Quality Issues)
              </h5>
              <div className="space-y-3">
                {qualityItems.map((item) => (
                  <ComparisonItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Sub-component for rendering a single comparison item row */
interface ComparisonItemRowProps {
  item: TrialComparisonItem;
}

export function ComparisonItemRow({ item }: ComparisonItemRowProps) {
  const isDeviation = item.status === "actual_deviation";
  const isIncomplete = item.status === "incomplete";

  let statusBadgeClass = "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  let statusText = "แผนงานเปลี่ยน";

  if (isDeviation) {
    statusBadgeClass = item.severity === "warning"
      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-900/50 dark:text-neutral-400";
    statusText = item.changeType === "added" ? "ปฏิบัติเพิ่มจริง" : item.changeType === "removed" ? "ปฏิบัติขาดหาย" : "ปฏิบัติเบี่ยงเบน";
  } else if (isIncomplete) {
    statusBadgeClass = "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400";
    statusText = "ข้อมูลไม่สมบูรณ์";
  }

  return (
    <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 bg-white dark:bg-neutral-950 p-3.5 space-y-2.5 shadow-xs w-full min-w-0">
      {/* Label and Badge */}
      <div className="flex items-center justify-between gap-3 w-full min-w-0">
        <span className="font-bold text-neutral-800 dark:text-neutral-200 break-words min-w-0">
          {item.label}
        </span>
        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClass}`}>
          {statusText}
        </span>
      </div>

      {/* 3-Way Values Stack (Responsive Grid/Flex without horizontal table overflow) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-neutral-50/50 dark:bg-neutral-900/20 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-900 w-full min-w-0">
        <div className="min-w-0">
          <span className="block text-[10px] text-neutral-400 font-semibold mb-0.5 uppercase tracking-wider">
            แผนงานปัจจุบัน (Current Plan)
          </span>
          <span className="font-bold text-neutral-700 dark:text-neutral-300 break-words">
            {item.currentPlanValue !== null ? item.currentPlanValue : "—"}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] text-neutral-400 font-semibold mb-0.5 uppercase tracking-wider">
            แผนเริ่ม ณ วัน Day 0 (Snapshot)
          </span>
          <span className="font-bold text-neutral-700 dark:text-neutral-300 break-words">
            {item.snapshotValue !== null ? item.snapshotValue : "—"}
          </span>
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] text-neutral-400 font-semibold mb-0.5 uppercase tracking-wider">
            ข้อมูลปฏิบัติจริง (Actual Day 0)
          </span>
          <span className="font-bold text-neutral-800 dark:text-neutral-100 break-words">
            {item.actualValue !== null ? item.actualValue : "—"}
          </span>
        </div>
      </div>

      {/* Explanation Text */}
      <p className="text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed break-words pl-1">
        {item.explanation}
      </p>
    </div>
  );
}
