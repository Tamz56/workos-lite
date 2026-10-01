type AstroWellbeingCapacityCardProps = {
  source: string;
  dimensions: readonly string[];
  rule: string;
};

export function AstroWellbeingCapacityCard({
  source,
  dimensions,
  rule,
}: AstroWellbeingCapacityCardProps) {
  return (
    <section className="rounded-2xl border border-violet-500/20 bg-violet-950/10 p-5 sm:p-6 space-y-4">
      <div className="border-b border-slate-800/80 pb-4">
        <h2 className="text-base font-semibold text-slate-100">
          Wellbeing &amp; Capacity
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Source: {source}
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
          Reality precedence
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-100">
          {rule}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          ข้อมูลส่วนนี้เป็นการรายงานสภาวะโดยผู้ใช้ ไม่ได้อนุมานจากโหราศาสตร์
          และไม่ใช้เพื่อการวินิจฉัยหรือคาดการณ์ผลทางการแพทย์
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-slate-400">
          Human-reported dimensions
        </p>
        <div className="flex flex-wrap gap-2">
          {dimensions.map((dimension) => (
            <span
              key={dimension}
              className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1.5 text-xs text-slate-300"
            >
              {dimension}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
