import { notFound } from "next/navigation";
import { ExternalLink, Users, TrendingUp } from "lucide-react";
import { TippingBar } from "@/components/brand";
import { ConvictionSlider } from "@/components/markets/conviction-slider";
import { Countdown } from "@/components/markets/countdown";
import { getMarket, impliedYesPct, listPositionsForMarket, listPositionsForUser, seedDemoMarkets } from "@/lib/server/market-service";
import { currentSession } from "@/lib/server/auth-service";

export const dynamic = "force-dynamic";

const fmtTzs = (n: number) => `TZS ${n.toLocaleString("en-US")}`;
const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
function timeLeftStr(iso: string): string {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / (24 * 3600_000));
  if (d > 0) return `${d}d left`;
  const h = Math.floor(ms / 3600_000);
  if (h > 0) return `${h}h left`;
  const m = Math.floor(ms / 60_000);
  return `${m}m left`;
}

export default async function MarketDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ side?: "YES" | "NO" }>;
}) {
  seedDemoMarkets();
  const { id } = await params;
  const { side } = await searchParams;
  const m = getMarket(id);
  if (!m) notFound();

  const yesPct = impliedYesPct(m);
  const session = await currentSession();
  const myPositions = session ? listPositionsForUser(session.userId).filter((p) => p.marketId === m.id) : [];
  const totalPredictorCount = listPositionsForMarket(m.id).length;
  const isResolved = m.status === "RESOLVED" || m.status === "VOIDED";

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6">
      <a href="/markets" className="text-[12px] font-mono uppercase tracking-[0.16em] text-text-subtle hover:text-text">← Markets</a>

      <header className="mt-3 mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-pill border border-border bg-bg-elevated px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted">
            {m.category}
          </span>
          {m.status === "LIVE" && (
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-danger-border bg-danger-bg/40 px-3 py-1 text-[12px] font-semibold text-danger-fg">
              <span className="live-dot" style={{ width: 6, height: 6 }} />
              Live
            </span>
          )}
          {isResolved && m.resolvedOutcome && (
            <span className="inline-flex items-center rounded-pill border border-gold-subtleHover bg-gold-subtle px-3 py-1 text-[12px] font-bold text-gold-300">
              Resolved · {m.resolvedOutcome}
            </span>
          )}
          <a
            href={m.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 ml-auto text-[12px] font-mono text-text-muted hover:text-text"
          >
            Source
            <ExternalLink size={12} aria-hidden />
          </a>
        </div>
        <h1 className="font-display text-[28px] md:text-[34px] font-bold leading-tight tracking-[-0.02em] text-text">{m.titleEn}</h1>
        {m.titleSw && <p className="mt-2 text-[15px] italic text-text-subtle">{m.titleSw}</p>}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          <TippingBar yesPct={yesPct} height={28} showLabels resolved={isResolved} />
          <div className="mt-2 flex items-baseline justify-between font-mono text-[13px]">
            <span className="text-yes-300 font-semibold">YES {yesPct}%</span>
            <span className="text-no-300 font-semibold">{100 - yesPct}% NO</span>
          </div>

          {!isResolved && (
            <div className="mt-7 rounded-lg border border-border bg-bg-elevated p-5">
              <Countdown to={m.resolutionAt} label="Closes in · Inafungwa baada ya" />
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            <KPI label="Volume"     value={fmtTzs(m.yesPool + m.noPool)} icon={<TrendingUp size={14} />} />
            <KPI label="Predictors" value={String(totalPredictorCount)}   icon={<Users size={14} />} />
            <KPI label="Resolves"   value={fmtTime(m.resolutionAt)} mono />
          </div>

          <section className="mt-8 rounded-lg border border-border bg-bg-elevated p-5">
            <h2 className="font-display text-[17px] font-semibold text-text mb-2">Resolution criterion</h2>
            <p className="text-[14px] leading-relaxed text-text-muted whitespace-pre-line">{m.resolutionCriterion}</p>
            <p className="mt-3 font-mono text-[12px] text-text-subtle">
              Source · <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text underline">{m.sourceUrl}</a>
            </p>
          </section>

          {myPositions.length > 0 && (
            <section className="mt-6 rounded-lg border border-teal-700 bg-teal-900/20 p-5">
              <h2 className="font-display text-[15px] font-semibold text-text mb-2">Your positions</h2>
              <div className="space-y-2 text-[13px]">
                {myPositions.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 font-mono">
                    <span className={p.side === "YES" ? "text-yes-300" : "text-no-300"}>{p.side}</span>
                    <span className="text-text-muted">stake {fmtTzs(p.stake)}</span>
                    <span className="text-gold-300">→ {fmtTzs(p.finalPayout ?? p.potentialPayout)}</span>
                    <span className="text-text-subtle">[{p.status}]</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>

        <aside>
          {!isResolved && m.status === "LIVE" ? (
            <ConvictionSlider marketId={m.id} yesPool={m.yesPool} noPool={m.noPool} initialYesPct={yesPct} />
          ) : (
            <div className="rounded-lg border border-border bg-bg-elevated p-6 text-center">
              <p className="font-display text-[16px] font-semibold text-text">Market closed for predictions</p>
              <p className="mt-1 text-[13px] italic text-text-subtle">Soko limefungwa kwa utabiri.</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function KPI({ label, value, icon, mono }: { label: string; value: string; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-bg-elevated p-3">
      <div className="flex items-center gap-1.5 text-text-subtle">
        {icon}
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold">{label}</p>
      </div>
      <p className={`mt-1 ${mono ? "font-mono text-[13px]" : "font-display text-[18px] font-bold"} tabular-nums text-text leading-tight`}>{value}</p>
    </div>
  );
}
