import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { TippingBar } from "@/components/brand";
import { ConvictionDial } from "@/components/markets/conviction-dial";
import { Countdown } from "@/components/markets/countdown";
import { ShareButton } from "@/components/markets/share-button";
import { NotifyPrompt } from "@/components/markets/notify-prompt";
import { ProbabilityChart } from "@/components/markets/probability-chart";
import { SellButton } from "@/components/markets/sell-button";
import { cashOutValue, getMarket, impliedYesPct, isClosedByTime, listPositionsForMarket, listPositionsForUser, seedDemoMarkets } from "@/lib/server/market-service";
import { getProbabilityChart, seedHistory } from "@/lib/server/market-history";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { listComments } from "@/lib/server/comments-store";
import { CommentsThread } from "@/components/markets/comments-thread";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  seedDemoMarkets();
  const { id } = await params;
  const m = getMarket(id);
  // Throwing notFound() here too — not just inside the page render —
  // because the `/markets` segment has a loading.tsx, which means the
  // page renders inside a Suspense boundary. When notFound() fires
  // mid-stream the rendered UI swaps to not-found.tsx but the HTTP
  // status header has already been sent as 200 and can't be changed.
  // Calling notFound() during metadata generation gets us a real 404
  // because metadata runs before the streaming response starts.
  if (!m) notFound();
  const yes = impliedYesPct(m);
  const desc = `YES ${yes}% · NO ${100 - yes}%. Predict on 50pick.`;
  return {
    title: m.titleEn,
    description: desc,
    openGraph: {
      title: m.titleEn,
      description: desc,
      images: [{ url: `/api/og/market/${id}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: m.titleEn,
      description: desc,
      images: [`/api/og/market/${id}`],
    },
  };
}

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
  // closed-by-time = the resolutionAt clock has elapsed but no resolver
  // has run yet. The dial cannot accept a bet here (server enforces),
  // so the page swaps it out for an "awaiting settlement" card.
  const closedByTime = isClosedByTime(m) && !isResolved;

  // History — seed if empty (legacy demo markets), then build the signature
  // ProbabilityChart's range-keyed series from real snapshots.
  seedHistory(m.id, m.yesPool, m.noPool);
  const probChart = getProbabilityChart(m.id);
  const comments = listComments(m.id, session?.userId ?? null);

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
            <I.ext s={12} />
          </a>
          <ShareButton marketId={m.id} title={m.titleEn} />
        </div>
        <h1 className="font-display text-[28px] md:text-[34px] font-bold leading-tight tracking-[-0.02em] text-text">{m.titleEn}</h1>
        {m.titleSw && <p className="mt-2 text-[15px] italic text-text-subtle">{m.titleSw}</p>}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <section>
          {/* TippingBar carries its own YES / TIPPING / NO labels — the
              older page-level duplicate row was removed to avoid the
              "YES 50%  YES 50%" double-line that appeared on market detail. */}
          <TippingBar yesPct={yesPct} height={28} showLabels resolved={isResolved} />

          {!isResolved && (
            <div className="mt-7 rounded-lg glass-panel p-5">
              <Countdown to={m.resolutionAt} label="Closes in · Inafungwa baada ya" />
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            <KPI label="Volume"     value={fmtTzs(m.yesPool + m.noPool)} icon={<I.chart s={14} />} />
            <KPI label="Predictors" value={String(totalPredictorCount)}  icon={<I.users s={14} />} />
            <KPI label="Resolves"   value={fmtTime(m.resolutionAt)} mono />
          </div>

          {/* Probability over time — the signature "tipping line" chart */}
          {probChart.ranges.length > 0 && (
            <section className="mt-8 rounded-lg glass-panel p-4 lg:p-5">
              <div className="w-full overflow-hidden">
                <ProbabilityChart
                  series={probChart.series as Record<string, { t: string; p: number }[]>}
                  ranges={probChart.ranges}
                  defaultRange={probChart.ranges[probChart.ranges.length - 1]}
                  height={260}
                />
              </div>
            </section>
          )}

          <section className="mt-8 rounded-lg glass-panel p-5">
            <h2 className="font-display text-[17px] font-semibold text-text mb-2">Resolution criterion</h2>
            <p className="text-[14px] leading-relaxed text-text-muted whitespace-pre-line">{m.resolutionCriterion}</p>
            <p className="mt-3 font-mono text-[12px] text-text-subtle">
              Source · <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text underline break-all">{m.sourceUrl}</a>
            </p>
          </section>

          {myPositions.length > 0 && (
            <section className="mt-6 rounded-xl border border-border bg-bg-elevated p-5 space-y-3">
              <h2 className="font-display text-[15px] font-semibold text-text">Your positions</h2>
              {myPositions.map((p) => {
                const liveValue = !isResolved && m.status === "LIVE" && p.status === "OPEN"
                  ? cashOutValue({ side: p.side, stake: p.stake }, { id: m.id, yesPool: m.yesPool, noPool: m.noPool }).value
                  : null;
                return (
                  <div key={p.id} className="rounded-md border border-border bg-bg-overlay/40 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px]">
                      <span className={p.side === "YES" ? "text-yes-300 font-bold" : "text-no-300 font-bold"}>{p.side}</span>
                      <span className="text-text-muted">stake {fmtTzs(p.stake)}</span>
                      <span className="text-gold-300">→ {fmtTzs(p.finalPayout ?? p.potentialPayout)}</span>
                      <span className="text-text-subtle ml-auto">[{p.status === "CASHED_OUT" ? "CASHED" : p.status}]</span>
                    </div>
                    {liveValue !== null && (
                      <SellButton
                        positionId={p.id}
                        stake={p.stake}
                        value={liveValue}
                        resolutionAt={m.resolutionAt}
                      />
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </section>

        <aside className="space-y-3">
          {!isResolved && m.status === "LIVE" && !closedByTime ? (
            session ? (
              <>
                <ConvictionDial marketId={m.id} yesPool={m.yesPool} noPool={m.noPool} marketTitle={m.titleEn} resolutionAt={m.resolutionAt} balance={(await db.wallet.findByUserId(session.userId))?.balance ?? 0} />
                <NotifyPrompt marketId={m.id} marketTitle={m.titleEn} />
              </>
            ) : (
              // Public visitors see the market read-only — pool, history,
              // resolution criterion are all visible above. The conviction
              // dial is gated behind a clear "sign in to bet" CTA so the
              // mutation surface only opens for an authenticated session.
              <div
                className="rounded-xl border border-border bg-bg-elevated p-6 text-center"
                style={{
                  background:
                    "radial-gradient(420px 160px at 50% 0%, oklch(45% 0.10 240 / 0.20), transparent 60%), " +
                    "linear-gradient(135deg, oklch(22% 0.140 268) 0%, oklch(28% 0.165 268) 100%)",
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
                  Sign in to predict
                </p>
                <h3 className="mt-1.5 font-display text-[18px] font-bold text-text leading-tight">
                  Place your stake on this market
                </h3>
                <p className="mt-1.5 text-[12.5px] text-text-muted leading-snug">
                  Browse for free, but a verified phone is required before any bet can be placed.
                  <span className="block italic text-text-subtle text-[11.5px] mt-0.5">
                    Andika namba ya simu ili kuweka dau.
                  </span>
                </p>
                <div className="mt-4 grid grid-cols-1 xs:grid-cols-2 gap-2">
                  <a
                    href={`/auth/register?next=${encodeURIComponent("/markets/" + m.id)}`}
                    className="btn btn-gold btn-md"
                    style={{ borderRadius: "var(--r-pill)" }}
                  >
                    Sign up
                  </a>
                  <a
                    href={`/auth/login?next=${encodeURIComponent("/markets/" + m.id)}`}
                    className="btn btn-ghost btn-md"
                    style={{ borderRadius: "var(--r-pill)" }}
                  >
                    Sign in
                  </a>
                </div>
              </div>
            )
          ) : closedByTime ? (
            // Countdown elapsed but the resolver hasn't recorded an
            // outcome yet. For Demo · markets this state is brief —
            // the next /markets hit auto-resolves on the server. For
            // production markets it lasts until the human resolver
            // queue confirms. Either way, no more bets accepted.
            <div className="rounded-xl border border-warning-border bg-warning-bg/30 p-6 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-warning-fg">
                Closed · Awaiting settlement
              </p>
              <h3 className="mt-1.5 font-display text-[16px] font-bold text-text">No more bets</h3>
              <p className="mt-1 text-[13px] italic text-text-subtle">Soko limefungwa · subiri matokeo.</p>
              <p className="mt-3 text-[12px] text-text-muted leading-snug">
                The countdown ended. The market is closed for predictions while the outcome is recorded — refresh in a moment to see your win or loss.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-bg-elevated p-6 text-center">
              <p className="font-display text-[16px] font-semibold text-text">Market closed for predictions</p>
              <p className="mt-1 text-[13px] italic text-text-subtle">Soko limefungwa kwa utabiri.</p>
            </div>
          )}
        </aside>
      </div>

      <CommentsThread
        marketId={m.id}
        initialComments={comments}
        canPost={!!session}
        signInHref={`/auth/login?next=${encodeURIComponent("/markets/" + m.id)}`}
      />
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
