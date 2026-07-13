// GF-APP-077B — Trial Mode Summary UI Component

import React from "react";
import Link from "next/link";
import {
  FileText,
  FlaskConical,
  LineChart,
  AlertTriangle,
  ChevronRight,
  Info,
} from "lucide-react";
import type { TrialModeSummary } from "../../../../lib/rose-trial-domain/types";

interface TrialModeSummaryProps {
  summaries: TrialModeSummary[];
}

export function TrialModeSummary({ summaries }: TrialModeSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 w-full min-w-0" aria-label="โหมดและสถานะข้อมูลการปักชำกุหลาบ">
      {summaries.map((summary) => {
        const isPlanned = summary.mode === "planned";
        const isActual = summary.mode === "actual";
        const isSimulated = summary.mode === "simulated";

        // Determine Theme/Colors
        let borderClass = "border-neutral-200 dark:border-neutral-800";
        let bgClass = "bg-white dark:bg-neutral-950";
        let statusBadgeClass = "bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-300";
        let icon = <Info className="h-5 w-5 text-neutral-500" />;

        if (isPlanned) {
          borderClass = "border-blue-200 dark:border-blue-900/40";
          bgClass = "bg-white dark:bg-neutral-950";
          statusBadgeClass = "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30";
          icon = <FileText className="h-5 w-5 text-blue-500" />;
        } else if (isActual) {
          borderClass = "border-rose-200 dark:border-rose-900/40";
          bgClass = "bg-white dark:bg-neutral-950";
          statusBadgeClass = "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-100 dark:border-rose-900/30";
          icon = <FlaskConical className="h-5 w-5 text-rose-500" />;
        } else if (isSimulated) {
          borderClass = "border-neutral-200 dark:border-neutral-800";
          bgClass = "bg-neutral-50/50 dark:bg-neutral-900/20";
          statusBadgeClass = "bg-neutral-100 text-neutral-600 dark:bg-neutral-900/50 dark:text-neutral-400";
          icon = <LineChart className="h-5 w-5 text-neutral-400" />;
        }

        const cardContent = (
          <div className="flex flex-col h-full justify-between p-4 md:p-5 space-y-4">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-shrink-0">{icon}</div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                    {summary.label}
                  </h3>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadgeClass}`}>
                  {summary.status}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
                {summary.headline}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-2 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl p-3 border border-neutral-100 dark:border-neutral-900/40">
              {summary.details.map((detail: { label: string; value: string }, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-xs gap-4">
                  <span className="text-neutral-400 dark:text-neutral-500 font-medium">{detail.label}</span>
                  <span className="text-neutral-800 dark:text-neutral-200 font-bold truncate max-w-[150px]">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Warnings */}
            {summary.warnings.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
                {summary.warnings.map((warning: string, wIdx: number) => (
                  <div key={wIdx} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer / Navigation Indicator */}
            {summary.href ? (
              <div className="flex items-center text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:text-rose-700 pt-2 border-t border-neutral-100 dark:border-neutral-900">
                <span>เปิดดูรายละเอียด</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            ) : (
              <div className="text-[10px] text-neutral-400 font-semibold pt-2 border-t border-neutral-100 dark:border-neutral-900">
                *ยังไม่เปิดให้ทดลองเล่นจำลอง
              </div>
            )}
          </div>
        );

        return summary.href ? (
          <Link
            key={summary.mode}
            href={summary.href}
            className={`group block rounded-2xl border ${borderClass} ${bgClass} hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 min-w-0`}
          >
            {cardContent}
          </Link>
        ) : (
          <div
            key={summary.mode}
            className={`rounded-2xl border ${borderClass} ${bgClass} min-w-0`}
          >
            {cardContent}
          </div>
        );
      })}
    </div>
  );
}
