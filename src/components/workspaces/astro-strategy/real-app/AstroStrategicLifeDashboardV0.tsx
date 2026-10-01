import { AstroLifeDomainCard } from "./components/AstroLifeDomainCard";
import { AstroWellbeingCapacityCard } from "./components/AstroWellbeingCapacityCard";
import { astroStrategicLifeDashboardV0 as data } from "./data/astroStrategicLifeDashboardV0";

export function AstroStrategicLifeDashboardV0() {
  const { domains } = data;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/30 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-violet-500/20 bg-violet-950/30 px-3 py-1 text-violet-200">
              VALIDATION-ONLY
            </span>
            <span>Thai-Primary</span>
            <span>•</span>
            <span>ASTRO-DASH-002-I001</span>
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            {data.identity.title}
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            {data.identity.subtitle}
          </p>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300">
            {data.currentInsights.body}
          </p>
        </header>

        <section className="mt-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <MethodItem label="Tradition" value={data.methodContext.primaryTradition} />
          <MethodItem label="Zodiac" value={data.methodContext.zodiacReference} />
          <MethodItem label="House" value={data.methodContext.implementationLabel} />
          <MethodItem label="Planets" value={data.methodContext.planetBaseline} />
        </section>

        <section className="mt-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Current governed insights
          </p>
          <h2 className="text-xl font-semibold text-slate-100">
            {data.currentInsights.headline}
          </h2>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <AstroLifeDomainCard
            title={domains.work.key}
            state={domains.work.displayState}
            authority={domains.work.authority}
            tone="governed"
          >
            <p>{domains.work.interpretation}</p>
            <p className="text-slate-400">{domains.work.strategicGuidance}</p>

            <details className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <summary className="cursor-pointer font-semibold text-slate-200">
                Why this reading?
              </summary>
              <div className="mt-3 space-y-2 text-xs text-slate-400">
                <p>House chain: {domains.work.explainability.houseChain}</p>
                <p>Modifiers: {domains.work.explainability.modifiers}</p>
                <p>Synthesis: {domains.work.explainability.synthesisClass}</p>
              </div>
            </details>
          </AstroLifeDomainCard>

          <AstroLifeDomainCard
            title={domains.money.key}
            state={domains.money.displayState}
            authority={domains.money.authority}
            tone="limited"
          >
            <p>{domains.money.interpretation}</p>
            <p className="text-amber-200/80">
              {domains.money.strategicGuidance}
            </p>

            <details className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <summary className="cursor-pointer font-semibold text-slate-200">
                Why this reading?
              </summary>
              <div className="mt-3 space-y-2 text-xs text-slate-400">
                <p>House chain: {domains.money.explainability.houseChain}</p>
                <p>Modifiers: {domains.money.explainability.modifiers}</p>
                <p>Synthesis: {domains.money.explainability.synthesisClass}</p>
              </div>
            </details>
          </AstroLifeDomainCard>
        </div>

        <div className="mt-5">
          <AstroWellbeingCapacityCard
            source={domains.wellbeing.source}
            dimensions={domains.wellbeing.dimensions}
            rule={domains.wellbeing.rule}
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <AstroLifeDomainCard
            title={domains.relationships.key}
            state={domains.relationships.displayState}
            tone="unavailable"
          >
            <p>
              ยังไม่มี governed interpretation สำหรับ domain นี้
              จึงไม่เติมคำอ่านเพื่อให้การ์ดดูสมบูรณ์
            </p>
          </AstroLifeDomainCard>

          <AstroLifeDomainCard
            title={domains.homeFamily.key}
            state={domains.homeFamily.displayState}
            tone="unavailable"
          >
            <p>
              ยังไม่มี governed interpretation สำหรับ domain นี้
              จึงแสดงสถานะ unavailable อย่างตรงไปตรงมา
            </p>
          </AstroLifeDomainCard>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-100">
            Strategic Translation
          </h2>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <TranslationItem
              label="Natal Interpretation"
              value={data.strategicTranslation.natalInterpretation}
            />
            <TranslationItem
              label="Strategic Guidance"
              value={data.strategicTranslation.strategicGuidance}
            />
            <TranslationItem
              label="Human Decision"
              value={data.strategicTranslation.humanDecision}
            />
          </div>

          <p className="mt-4 font-mono text-xs text-violet-300">
            {data.strategicTranslation.separationRule}
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-950/10 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-300">
            Project Motion
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">
            {data.projectMotion.state}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {data.projectMotion.disclosure}
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-100">
            What is not yet known / omitted
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.omissions.map((item) => (
              <span
                key={item}
                className="rounded-lg border border-amber-500/20 bg-slate-950/50 px-2.5 py-1.5 text-xs text-amber-200"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current Timing / Watch
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-100">
              {data.timing.state}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {data.timing.disclosure}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-100">
              {data.currentClose.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {data.currentClose.body}
            </p>
          </div>
        </section>

        <details className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
          <summary className="cursor-pointer text-base font-semibold text-slate-100">
            Method / Source
          </summary>

          <div className="mt-4 grid gap-4 text-sm text-slate-400 lg:grid-cols-2">
            <div>
              <p className="font-semibold text-slate-200">Method</p>
              <ul className="mt-2 space-y-1">
                <li>{data.methodContext.primaryTradition}</li>
                <li>{data.methodContext.zodiacReference}</li>
                <li>{data.methodContext.ayanamsha}</li>
                <li>{data.methodContext.houseModel}</li>
                <li>{data.methodContext.planetBaseline}</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-slate-200">Authority refs</p>
              <ul className="mt-2 space-y-1">
                {data.sources.map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}

function MethodItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function TranslationItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <p className="text-xs font-semibold text-violet-300">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{value}</p>
    </div>
  );
}
