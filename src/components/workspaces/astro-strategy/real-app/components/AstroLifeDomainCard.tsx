import * as React from "react";

type AstroLifeDomainCardProps = {
  title: string;
  state: string;
  authority?: string;
  children: React.ReactNode;
  tone?: "governed" | "limited" | "unavailable";
};

function toneClass(tone: AstroLifeDomainCardProps["tone"]): string {
  switch (tone) {
    case "governed":
      return "border-emerald-500/25 bg-emerald-950/10";
    case "limited":
      return "border-amber-500/25 bg-amber-950/10";
    case "unavailable":
      return "border-slate-700/80 bg-slate-950/40";
    default:
      return "border-slate-700/80 bg-slate-900/60";
  }
}

export function AstroLifeDomainCard({
  title,
  state,
  authority,
  children,
  tone,
}: AstroLifeDomainCardProps) {
  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${toneClass(tone)}`}
    >
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          {authority ? (
            <p className="mt-1 text-xs text-slate-500">
              Authority: {authority}
            </p>
          ) : null}
        </div>

        <span className="w-fit rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold text-slate-300">
          {state}
        </span>
      </div>

      <div className="space-y-3 text-sm leading-6 text-slate-300">
        {children}
      </div>
    </section>
  );
}
