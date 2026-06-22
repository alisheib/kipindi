import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { TippingBar } from "@/components/brand";
import { Countdown } from "@/components/markets/countdown";
import { ShareButton } from "@/components/markets/share-button";
import { SidePicker } from "@/components/markets/side-picker";
import { ChartToggle } from "@/components/markets/chart-toggle";
import { SellButton } from "@/components/markets/sell-button";
import { cashOutValue, getMarket, impliedYesPct, isClosedByTime, listPositionsForMarket, listPositionsForUser } from "@/lib/server/market-service";
import { getProbabilityChart, seedHistory } from "@/lib/server/market-history";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { listComments } from "@/lib/server/comments-store";
import { CommentsThread } from "@/components/markets/comments-thread";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const m = await getMarket(id);
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
const fmtTime = formatDateTime;
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
  const { id } = await params;
  const { side } = await searchParams;
  const m = await getMarket(id);
  if (!m) notFound();

  const yesPct = impliedYesPct(m);
  const session = await currentSession();
  const myPositions = session ? (await listPositionsForUser(session.userId)).filter((p) => p.marketId === m.id) : [];
  const totalPredictorCount = (await listPositionsForMarket(m.id)).length;
  const isResolved = m.status === "RESOLVED" || m.status === "VOIDED";
  // closed-by-time = the resolutionAt clock has elapsed but no resolver
  // has run yet. The dial cannot accept a bet here (server enforces),
  // so the page swaps it out for an "awaiting settlement" card.
  const closedByTime = isClosedByTime(m) && !isResolved;

  // Pre-compute cash-out values for positions (cashOutValue is async)
  const positionCashOutValues = new Map<string, number | null>();
  for (const p of myPositions) {
    if (!isResolved && m.status === "LIVE" && p.status === "OPEN") {
      positionCashOutValues.set(p.id, (await cashOutValue({ side: p.side, stake: p.stake }, { id: m.id, yesPool: m.yesPool, noPool: m.noPool })).value);
    } else {
      positionCashOutValues.set(p.id, null);
    }
  }

  // History — seed if empty (legacy demo markets), then build the signature
  // ProbabilityChart's range-keyed series from real snapshots.
  await seedHistory(m.id, m.yesPool, m.noPool);
  const probChart = await getProbabilityChart(m.id);
  const comments = await listComments(m.id, session?.userId ?? null);

  // Pre-compute hedge-warning for the aside
  const openPositions = myPositions.filter((p) => p.status === "OPEN");
  const heldSides = new Set(openPositions.map((p) => p.side));
  const hedgeBoth = heldSides.has("YES") && heldSides.has("NO");
  const hedgeOpposite = (side === "YES" && heldSides.has("NO")) || (side === "NO" && heldSides.has("YES"));
  const heldLabel = [...heldSides].join(" + ");

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6">
      {/* ── Back link ── */}
      <a href="/markets" className="text-[12px] font-mono uppercase tracking-[0.16em] text-text-subtle hover:text-text">← Markets</a>

      {/* ── Page header — title, badges, share ── */}
      <header className="mt-3 mb-5">
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
        <h1 className="font-display text-[26px] md:text-[34px] font-bold leading-tight tracking-[-0.02em] text-text">{m.titleEn}</h1>
        {m.titleSw && <p className="mt-1.5 text-[14px] italic text-text-subtle">{m.titleSw}</p>}
      </header>

      {/* ── Main two-column layout ──
          On mobile (flex-col): aside renders first (order-1) so the
          betting widget is above-the-fold, then content below (order-2).
          On desktop (lg:grid): left=content, right=sticky aside. ── */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">

        {/* ══ LEFT — market information & analysis ══
            order-2 on mobile (below the bet widget), order-1 on desktop (left col) */}
        <section className="order-2 lg:order-1 min-w-0 space-y-5">

          {/* 1. Probability bar — current crowd signal */}
          <TippingBar yesPct={yesPct} height={28} showLabels resolved={isResolved} />

          {/* 2. KPI strip — volume, participation, timing at a glance */}
          <div className="grid grid-cols-3 gap-3">
            <KPI label="Volume"     value={fmtTzs(m.yesPool + m.noPool)} icon={<I.chart s={14} />} />
            <KPI label="Predictors" value={String(totalPredictorCount)}  icon={<I.users s={14} />} />
            <KPI label="Resolves"   value={fmtTime(m.resolutionAt)} mono />
          </div>

          {/* 3. Countdown — urgency signal (live only) */}
          {!isResolved && (
            <div className="rounded-lg glass-panel p-4">
              <Countdown to={m.resolutionAt} label="Closes in · Inafungwa baada ya" />
            </div>
          )}

          {/* 4. Your open positions — relevant context before reading the criterion */}
          {myPositions.length > 0 && (
            <section className="rounded-xl border border-border bg-bg-elevated p-5 space-y-3">
              <h2 className="font-display text-[15px] font-semibold text-text flex items-center gap-2">
                <I.portfolio s={15} />
                Your positions
              </h2>
              {myPositions.map((p) => {
                const liveValue = positionCashOutValues.get(p.id) ?? null;
                return (
                  <div key={p.id} className="rounded-md border border-border bg-bg-overlay/40 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px]">
                      <span className={p.side === "YES" ? "text-yes-300 font-bold" : "text-no-300 font-bold"}>{p.side}</span>
                      <span className="text-text-muted">stake {fmtTzs(p.stake)}</span>
                      {p.status !== "OPEN" && (
                        <span className="text-gold-300">paid {fmtTzs(p.finalPayout ?? 0)}</span>
                      )}
                      <span className="text-text-subtle ml-auto">[{p.status === "CASHED_OUT" ? "CASHED" : p.status}]</span>
                    </div>
                    <p className="flex items-center gap-1 font-mono text-[10px] tracking-[0.04em] text-text-faint tabular-nums">
                      <I.clock s={10} className="opacity-70 shrink-0" />
                      Opened {fmtTime(p.placedAt)}
                    </p>
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

          {/* 5. Resolution criterion — the rules of the bet */}
          <section className="rounded-lg glass-panel p-5">
            <h2 className="font-display text-[16px] font-semibold text-text mb-2 flex items-center gap-2">
              <I.fileCheck s={15} className="text-text-subtle" />
              Resolution criterion
            </h2>
            <p className="text-[14px] leading-relaxed text-text-muted whitespace-pre-line">{m.resolutionCriterion}</p>
            <p className="mt-3 pt-3 border-t border-border/50 font-mono text-[11px] text-text-subtle flex items-center gap-1.5">
              <I.ext s={11} />
              <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text underline break-all">{m.sourceUrl}</a>
            </p>
          </section>

          {/* 6. Probability chart — collapsible, collapsed by default so it
              doesn't distract from the primary bet intent above */}
          {probChart.ranges.length > 0 && (
            <ChartToggle
              series={probChart.series as Record<string, { t: string; p: number }[]>}
              ranges={probChart.ranges}
              defaultRange={probChart.ranges[probChart.ranges.length - 1]}
              height={240}
            />
          )}
        </section>

        {/* ══ RIGHT ASIDE — betting widget ══
            order-1 on mobile (above-the-fold, first thing seen),
            order-2 + sticky on desktop (stays in view while scrolling) */}
        <aside className="order-1 lg:order-2 space-y-3 lg:sticky lg:top-6">
          {!isResolved && m.status === "LIVE" && !closedByTime ? (
            session ? (
              <>
              {/* Hedge warning — shown when player already has a position */}
              {openPositions.length > 0 && (
                <div className="rounded-lg border border-warning-border bg-warning-bg/30 px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-warning-fg">
                    You already hold {heldLabel} here
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-text-muted">
                    {hedgeBoth
                      ? "You're backing both sides — the 9% margin applies to each, so hedging here locks in a loss."
                      : hedgeOpposite
                        ? `Backing the other side now hedges against your ${heldLabel} — you'd pay the 9% margin on both and only one can win.`
                        : `Placing again adds to your ${heldLabel} stake on this market.`}
                  </p>
                </div>
              )}
              <SidePicker
                marketId={m.id}
                marketTitle={m.titleEn}
                yesPool={m.yesPool}
                noPool={m.noPool}
                yesPct={yesPct}
                resolutionAt={m.resolutionAt}
                balance={(await db.wallet.findByUserId(session.userId))?.balance ?? 0}
                initialSide={side === "YES" || side === "NO" ? side : undefined}
              />
              </>
            ) : (
              /* Sign-in CTA — styled to invite prediction */
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
                {(() => {
                  const betNext = "/markets/" + m.id + (side === "YES" || side === "NO" ? `?side=${side}` : "");
                  const q = `?next=${encodeURIComponent(betNext)}`;
                  return (
                    <div className="mt-4 grid grid-cols-1 xs:grid-cols-2 gap-2">
                      <a href={`/auth/register${q}`} className="btn btn-gold btn-md" style={{ borderRadius: "var(--r-pill)" }}>
                        Sign up
                      </a>
                      <a href={`/auth/login${q}`} className="btn btn-ghost btn-md" style={{ borderRadius: "var(--r-pill)" }}>
                        Sign in
                      </a>
                    </div>
                  );
                })()}
              </div>
            )
          ) : closedByTime ? (
            <div className="rounded-xl border border-warning-border bg-warning-bg/30 p-6 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-warning-fg">
                Closed · Awaiting settlement
              </p>
              <h3 className="mt-1.5 font-display text-[16px] font-bold text-text">No more bets</h3>
              <p className="mt-1 text-[13px] italic text-text-subtle">Soko limefungwa · subiri matokeo.</p>
              <p className="mt-3 text-[12px] text-text-muted leading-snug">
                The countdown ended. The market is closed for predictions while the outcome is being recorded — refresh in a moment to see your result.
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

      {/* ── Comments — full width, below both columns ── */}
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
