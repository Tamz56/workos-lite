"use client";

import React from "react";
import { ThaiPlanetPlacementRuntimeAdapterV01 } from "../../data/astroRealAppTypes";

interface ThaiPlanetPlacementDebugPanelProps {
  runtimeResult: ThaiPlanetPlacementRuntimeAdapterV01;
  isVisible?: boolean;
  className?: string;
}

export function ThaiPlanetPlacementDebugPanel({
  runtimeResult,
  isVisible = true,
  className = "",
}: ThaiPlanetPlacementDebugPanelProps) {
  if (!isVisible) {
    return null;
  }

  const {
    adapterStatus,
    inputStatus,
    generatedAt,
    safetySummary,
    results,
  } = runtimeResult;

  return (
    <div
      className={`border border-neutral-700 bg-neutral-900 text-neutral-100 rounded-lg p-4 font-mono text-xs ${className}`}
      id="thai-planet-placement-debug-panel"
    >
      {/* 2. Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <h3 className="text-sm font-semibold tracking-wide text-neutral-200">
          Thai Planet Placement Diagnostics
        </h3>
        <div className="flex gap-2">
          <span className="bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded border border-neutral-700 font-bold uppercase tracking-wider text-[10px]">
            {adapterStatus}
          </span>
          <span className="bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded border border-neutral-700 font-bold uppercase tracking-wider text-[10px]">
            Not validated
          </span>
        </div>
      </div>

      {/* 3. Safety Notice */}
      <div className="mt-3 bg-amber-950/20 border border-amber-900/50 rounded p-3 text-amber-500 leading-relaxed">
        <p className="font-semibold mb-1">⚠️ Safety Notice & Guardrails:</p>
        <ul className="list-disc pl-4 space-y-0.5 text-neutral-400">
          <li>Diagnostic only</li>
          <li>Pending reference validation</li>
          <li>Not used for interpretation</li>
          <li>No real Thai planet placement is displayed</li>
        </ul>
      </div>

      {/* 4. Adapter Metadata */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 border border-neutral-800 bg-neutral-950/40 rounded p-3 text-neutral-400">
        <div>
          <span className="text-neutral-500">Adapter Status:</span>{" "}
          <span className="text-neutral-300 font-semibold">{adapterStatus}</span>
        </div>
        <div>
          <span className="text-neutral-500">Input Status:</span>{" "}
          <span className="text-neutral-300 font-semibold">{inputStatus}</span>
        </div>
        <div>
          <span className="text-neutral-500">Generated At (Metadata):</span>{" "}
          <span className="text-neutral-300 font-semibold">{generatedAt}</span>
        </div>
      </div>

      {/* 5. Safety Summary */}
      <div className="mt-4 border border-neutral-800 bg-neutral-950/40 rounded p-3">
        <h4 className="font-semibold text-neutral-300 mb-2 border-b border-neutral-800 pb-1">
          Safety Harness Summary
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
            <p className="text-neutral-500 text-[10px] uppercase">Pending</p>
            <p className="text-base font-bold text-neutral-300">
              {safetySummary.pendingCount}
            </p>
          </div>
          <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
            <p className="text-neutral-500 text-[10px] uppercase">Comparable</p>
            <p className="text-base font-bold text-neutral-300">
              {safetySummary.comparableCount}
            </p>
          </div>
          <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
            <p className="text-neutral-500 text-[10px] uppercase">Not Comparable</p>
            <p className="text-base font-bold text-neutral-300">
              {safetySummary.notComparableCount}
            </p>
          </div>
          <div className="bg-neutral-900 p-2 rounded border border-neutral-800">
            <p className="text-neutral-500 text-[10px] uppercase">Validated</p>
            <p className="text-base font-bold text-neutral-300">
              {safetySummary.validatedCount}
            </p>
          </div>
          <div className="bg-neutral-900 p-2 rounded border border-neutral-800 col-span-2 sm:col-span-1">
            <p className="text-neutral-500 text-[10px] uppercase">Issues</p>
            <p className="text-base font-bold text-neutral-300">
              {safetySummary.issues.length}
            </p>
          </div>
        </div>
      </div>

      {/* 6. Planet Table */}
      <div className="mt-4 overflow-x-auto border border-neutral-800 rounded">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400">
              <th className="p-2 font-semibold">Planet ID</th>
              <th className="p-2 font-semibold">Sign/Rasi</th>
              <th className="p-2 font-semibold">Degree</th>
              <th className="p-2 font-semibold">Confidence</th>
              <th className="p-2 font-semibold">Validation Status</th>
              <th className="p-2 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {results.map((result) => (
              <tr key={result.planetId} className="hover:bg-neutral-950/20">
                <td className="p-2 font-bold text-neutral-300">{result.planetId}</td>
                <td className="p-2 text-neutral-400">{result.signRasi}</td>
                <td className="p-2 text-neutral-400">{result.degree}</td>
                <td className="p-2 text-neutral-400">{result.confidence}</td>
                <td className="p-2 text-neutral-400">{result.validationStatus}</td>
                <td className="p-2 text-neutral-500 max-w-[200px] truncate" title={result.notes}>
                  {result.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 7. Footer Guardrail */}
      <div className="mt-4 border-t border-neutral-800 pt-3 text-[10px] text-neutral-500 leading-normal">
        Development diagnostics only. This output is not persisted and is not used for interpretation.
      </div>
    </div>
  );
}
