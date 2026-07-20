import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { TippingBar } from "@/components/brand";
import { Countdown } from "@/components/markets/countdown";
import { ShareButton } from "@/components/markets/share-button";
import { WatchStar } from "@/components/markets/watch-star";
import { isWatching } from "@/lib/server/watchlist-service";
import { resolveWinShareToken } from "@/lib/server/share-token";
import { SidePicker } from "@/components/markets/side-picker";
import { ChartToggle } from "@/components/markets/chart-toggle";
import { SellButton } from "@/components/markets/sell-button";
import { ResolutionPanel } from "@/components/markets/resolution-panel";
import { Chip } from "@/components/ui/chip";
import { cashOutValue, getMarket, impliedYesPct, isClosedByTime, isSelectionClosed, listPositionsForUser, ratesFor } from "@/lib/server/market-service";
import { poolFee } from "@/lib/payout";
import { getEffectiveConfig } from "@/lib/server/market-config";
import { getProbabilityChart } from "@/lib/server/market-history";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { ensureAffiliateAccount } from "@/lib/server/affiliate-service";
import { listComments } from "@/lib/server/comments-store";
import { CommentsThread } from "@/components/markets/comments-thread";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { formatDateTime, formatTzsCompact, formatTzs, fill, pctNum } from "@/lib/utils";
import { appUrl } from "@/lib/app-url";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/localized";


export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ w?: string }> },
): Promise<Metadata> {
  const { id } = await params;
  let m: Awaited<ReturnType<typeof getMarket>> | null = null;
  try { m = await getMarket(id); } catch { /* graceful */ }
  if (!m) notFound();
  const { locale } = await getServerT();
  const yes = impliedYesPct(m);

  // F5 — a shared WIN link carries a signed token. When it validates, the share
  // preview becomes the win card. The token only names the position; the amount
  // is re-read from the ledger by the OG renderer, so it can't be faked.
  const { w } = await searchParams;
  let win: Awaited<ReturnType<typeof resolveWinShareToken>> = null;
  if (w) { try { win = await resolveWinShareToken(w); } catch { /* graceful */ } }
  const isWin = !!win && win.marketId === id;

  const desc = isWin
    ? `Won ${formatTzs(win!.payout)} on ${win!.side} · ${m.titleEn}`
    : `YES ${yes}% · NO ${100 - yes}%. Predict on 50pick.`;
  const ogImage = isWin
    ? `/api/og/market/${id}?w=${encodeURIComponent(w!)}`
    : `/api/og/market/${id}`;

  return {
    // Browser-tab title follows the viewer's language; OG/Twitter cards stay
    // English (canonical — crawlers/share previews carry no locale cookie).
    title: pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh),
    description: desc,
    openGraph: {
      title: isWin ? `Won ${formatTzs(win!.payout)} on 50pick` : m.titleEn,
      description: desc,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: isWin ? `Won ${formatTzs(win!.payout)} on 50pick` : m.titleEn,
      description: desc,
      images: [ogImage],
    },
  };
}

const fmtTime = formatDateTime;

export default async function MarketDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ side?: "YES" | "NO"; w?: string }>;
}) {
  const { t, locale } = await getServerT();
  const { id } = await params;
  const { side } = await searchParams;
  let m: Awaited<ReturnType<typeof getMarket>> | null = null;
  try { m = await getMarket(id); } catch { /* graceful */ }
  if (!m) notFound();

  const yesPct = impliedYesPct(m);

  // THIS POLL'S OWN RATES — frozen onto the market at creation and loaded with it.
  //
  // No config read, and therefore NO FALLBACK TO GUESS AT. The old code did
  // `try { getEffectiveConfig(m.id) } catch { …commissionRate: 0.03, reserveRate: 0.01… }`,
  // and that catch branch summed to a 4% fee — while settlement used the real 9%.
  // So if the config read ever threw, every player on this page was quietly shown
  // a 4% platform fee and a 4%-based projection, and then paid at 9%. It failed
  // silently, in the player's favour on screen and against them in the wallet.
  //
  // It cannot happen now: the rates ride on the market row. There is nothing to
  // fetch, nothing to fail, and nothing to invent.
  const marketRates = ratesFor(m);
  const marketFee = poolFee(m.yesPool, m.noPool, marketRates);
  // Stake BOUNDS are entry-time, so they correctly read LIVE config (a poll does
  // not freeze how much you may stake) — and buyPosition re-validates them
  // server-side anyway, so the dial showing a stale bound cannot cost anyone
  // money. Only the FEE is frozen to the poll. Deliberately un-caught: if config
  // is unreadable we fail loudly rather than invent a limit.
  const stakeCfg = await getEffectiveConfig(m.id);
  const session = await currentSession();
  let myPositions: Awaited<ReturnType<typeof listPositionsForUser>> = [];
  try { myPositions = session ? (await listPositionsForUser(session.userId)).filter((p) => p.marketId === m!.id) : []; } catch { /* graceful */ }
  const myRefCode = session ? await ensureAffiliateAccount(session.userId).then((a) => a.code).catch(() => undefined) : undefined;
  // F3 — is this market on the signed-in player's watchlist?
  let watching = false;
  if (session) { try { watching = await isWatching(m.id, session.userId); } catch { /* graceful */ } }
  const isResolved = m.status === "RESOLVED" || m.status === "VOIDED";

  // F11 — decide the viewer's objection standing HERE, on the server, so the panel
  // never dangles a control the service would refuse. The same rules are re-checked
  // under the market lock when they actually file.
  let objectionState: React.ComponentProps<typeof ResolutionPanel>["objection"] = { state: "SIGNED_OUT" };
  if (isResolved && session) {
    const { objectionEligibility, listObjectionsForUser } = await import("@/lib/server/objections-service");
    const mine = (await listObjectionsForUser(session.userId)).find(
      (o) => o.marketId === m!.id && o.status === "OPEN",
    );
    if (mine) {
      objectionState = { state: "OPEN", objectionId: mine.id };
    } else {
      const elig = await objectionEligibility(session.userId, m.id);
      objectionState = elig.eligible
        ? { state: "ELIGIBLE" }
        : elig.why === "NO_POSITION" ? { state: "NO_POSITION" }
        : elig.why === "WINDOW_CLOSED" ? { state: "WINDOW_CLOSED" }
        : elig.why === "ALREADY_SETTLED" ? { state: "ALREADY_SETTLED" }
        : { state: "SIGNED_OUT" };
    }
  }

  // Two-officer attestation is claimed ONLY for genuinely distinct human officers
  // — never synthetic/auto (demo, sentinel) resolution whose ids are "system_*".
  const _s1 = m.resolutionStage1By, _s2 = m.resolutionStage2By;
  const twoOfficer = !!(_s1 && _s2 && _s1 !== _s2 && !_s1.startsWith("system") && !_s2.startsWith("system"));
  // One-sided: all bets are on the same side — winners would win their own money.
  // Platform rule: full refund at 0% fee at resolution. Surface a disclaimer so
  // players know before they place or hold a bet.
  const isOneSided = !isResolved && ((m.yesPool > 0 && m.noPool === 0) || (m.yesPool === 0 && m.noPool > 0));
  // closed-by-time = the resolutionAt clock has elapsed but no resolver
  // has run yet. The dial cannot accept a bet here (server enforces),
  // so the page swaps it out for an "awaiting settlement" card.
  const closedByTime = isClosedByTime(m) && !isResolved;
  const selectionClosed = isSelectionClosed(m) && !isResolved;

  // ── C1a hero lifecycle state — open · closing · waiting · resolved ──
  // Server-computed (page is force-dynamic + RefreshPoller re-fetches every 15s,
  // so the "<1h closing" window and the minute readout stay fresh).
  const settling = closedByTime || (m.status === "CLOSED" && !selectionClosed);
  const nextDeadlineIso = m.selectionClosedAt && !selectionClosed ? m.selectionClosedAt : m.resolutionAt;
  const msToDeadline = nextDeadlineIso ? Date.parse(nextDeadlineIso) - Date.now() : Number.POSITIVE_INFINITY;
  const closingSoon = !isResolved && m.status === "LIVE" && !selectionClosed && !closedByTime && msToDeadline > 0 && msToDeadline <= 3600_000;
  const minsToDeadline = Math.max(1, Math.ceil(msToDeadline / 60_000));
  const heroState: "open" | "closing" | "waiting" | "resolved" = isResolved
    ? "resolved"
    : selectionClosed || closedByTime || m.status === "CLOSED"
      ? "waiting"
      : closingSoon
        ? "closing"
        : "open";

  // Pre-compute cash-out values for positions (cashOutValue is async). `sellable`
  // is false once the exit window has passed — the sell control must then show
  // "selling closed" rather than a price the server would refuse.
  const positionCashOutValues = new Map<string, number | null>();
  const positionSellable = new Map<string, boolean>();
  for (const p of myPositions) {
    if (!isResolved && (m.status === "LIVE" || m.status === "CLOSED") && p.status === "OPEN") {
      try {
        const co = await cashOutValue({ side: p.side, stake: p.stake, placedAt: p.placedAt }, { id: m.id, yesPool: m.yesPool, noPool: m.noPool, resolutionAt: m.resolutionAt, selectionClosedAt: m.selectionClosedAt, feeSnapshot: m.feeSnapshot });
        positionCashOutValues.set(p.id, co.sellable ? co.value : null);
        positionSellable.set(p.id, co.sellable);
      } catch { positionCashOutValues.set(p.id, null); positionSellable.set(p.id, false); }
    } else {
      positionCashOutValues.set(p.id, null);
      positionSellable.set(p.id, false);
    }
  }

  // History — REAL snapshots only. This used to call seedHistory() first, which
  // fabricated a random walk whenever history was empty; since history lived in
  // a Map wiped on every deploy, that meant every market, every time. Deleted.
  // A market without enough real points renders no chart (A-5 no-fabrication).
  let probChart: Awaited<ReturnType<typeof getProbabilityChart>> = { series: {}, ranges: [] };
  try { probChart = await getProbabilityChart(m.id); } catch { /* graceful */ }
  let comments: Awaited<ReturnType<typeof listComments>> = [];
  try { comments = await listComments(m.id, session?.userId ?? null); } catch { /* graceful */ }

  // Pre-fetch wallet balance so we don't have an unguarded await in JSX
  let myBalance = 0;
  if (session) { try { myBalance = (await db.wallet.findByUserId(session.userId))?.balance ?? 0; } catch { /* graceful */ } }

  // Pre-compute hedge-warning for the aside
  const openPositions = myPositions.filter((p) => p.status === "OPEN");
  const heldSides = new Set(openPositions.map((p) => p.side));
  const hedgeBoth = heldSides.has("YES") && heldSides.has("NO");
  const hedgeOpposite = (side === "YES" && heldSides.has("NO")) || (side === "NO" && heldSides.has("YES"));
  const heldLabel = [...heldSides].join(" + ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: m.titleEn,
    description: `YES ${yesPct}% · NO ${100 - yesPct}%. Prediction market on 50pick.`,
    startDate: m.createdAt,
    endDate: m.resolutionAt,
    eventStatus: isResolved ? "https://schema.org/EventCompleted" : "https://schema.org/EventScheduled",
    organizer: { "@type": "Organization", name: "50pick", url: appUrl() },
    location: { "@type": "VirtualLocation", url: `${appUrl()}/markets/${id}` },
  };

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6">
      {/* Escape `<` → <: JSON.stringify does NOT escape it, so a proposal
          title containing `</script>` would break out of this block (stored XSS,
          audit H1). Titles also reject `<`/`>` at submission (proposals-service). */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {/* Auto-refresh every 15s on the detail page — tighter than the
          grid because a player on this page is about to bet and needs
          the freshest possible odds/pool/status. */}
      <RefreshPoller intervalMs={15_000} />
      {/* ── Back link ── */}
      <BackLink fallbackHref="/markets" label={t.common.markets} />

      {/* ── Page header — title, badges, share ──
          A7: faint 96px category-glyph watermark behind the question (isolate
          keeps the -z-10 mark above the header bg but below the content). */}
      <header className="relative isolate mt-3 mb-5">
        {(() => {
          const Cat = I[categoryGlyph(m.category)];
          return (
            <span aria-hidden className="pointer-events-none absolute right-1 bottom-0 -z-10 text-text opacity-[0.07]">
              <Cat s={96} />
            </span>
          );
        })()}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Chip variant="cat" size="lg">{m.category}</Chip>
          {/* C1a hero state — LIVE only while actually accepting predictions
              (open/closing); waiting & resolved carry their own state chips. */}
          {(heroState === "open" || heroState === "closing") && m.status === "LIVE" && (
            <Chip variant="live" size="lg" dot>{t.common.live}</Chip>
          )}
          {heroState === "closing" && (
            <span className="closing-pill inline-flex items-center gap-1.5 rounded-full border h-[26px] px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.10em] tabular-nums">
              <I.hourglassHalf s={13} />
              {t.market.closingSoon} · {minsToDeadline} {t.common.minsUnit}
            </span>
          )}
          {heroState === "waiting" && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border h-[26px] px-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.10em] ${
              settling ? "border-warning-border bg-warning-bg/30 text-warning-fg" : "border-gold-500/40 bg-gold-500/10 text-gold-300"
            }`}>
              <I.hourglassOff s={13} />
              {settling ? t.market.closedAwaitingSettlement : t.market.selectionClosedWaiting}
            </span>
          )}
          {isResolved && m.resolvedOutcome && (
            <Chip variant="resolved" size="lg">{t.market.resolvedOutcome} · {m.resolvedOutcome}</Chip>
          )}
          <a
            href={m.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 ml-auto text-[12px] font-mono text-text-muted hover:text-text"
          >
            {t.common.source}
            <I.ext s={12} />
          </a>
          <WatchStar marketId={m.id} initial={watching} signedIn={!!session} />
          <ShareButton marketId={m.id} title={m.titleEn} refCode={myRefCode} />
        </div>
        {/* C1a — slim gilt hairline framing the question ("seal of the real") */}
        <div aria-hidden className="gilt-hairline mb-3" />
        <h1 className="font-display text-[26px] md:text-[34px] font-bold leading-tight tracking-[-0.02em] text-text">{pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}</h1>
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
            <KPI label={t.market.volume}     value={formatTzsCompact(m.yesPool + m.noPool)} icon={<I.chart s={14} />} />
            <KPI label={t.market.predictors} value={String(m.predictorCount)}     icon={<I.users s={14} />} />
            <KPI label={t.market.resolves}   value={fmtTime(m.resolutionAt)} mono />
          </div>

          {/* 2b. Resolution panel — outcome, attestation, pool + fee (resolved only) */}
          {isResolved && m.resolvedOutcome && (
            <ResolutionPanel
              marketId={m.id}
              outcome={m.resolvedOutcome}
              resolvedAt={m.resolutionStage2At ?? m.updatedAt}
              twoOfficer={twoOfficer}
              sourceUrl={m.sourceUrl}
              objectionsClosedAt={m.objectionsClosedAt}
              serverNow={Date.now()}
              yesPool={m.yesPool}
              noPool={m.noPool}
              fee={marketFee}
              rates={marketRates}
              evidence={m.resolutionEvidence}
              settledAt={m.settledAt}
              objection={objectionState}
            />
          )}

          {/* 3a. One-sided disclaimer — shown when all bets are on one side */}
          {isOneSided && (
            <div className="rounded-lg border border-warning-border bg-warning-bg/30 px-4 py-3 flex items-start gap-2.5">
              <I.warning s={15} className="shrink-0 mt-0.5 text-warning-fg" />
              <div>
                <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-warning-fg mb-1">
                  {t.market.oneSidedMarket}
                </p>
                <p className="text-[12px] leading-relaxed text-text-muted">
                  {t.market.oneSidedBody}
                </p>
              </div>
            </div>
          )}

          {/* 3b. Countdown — selection close + resolution (live only) */}
          {!isResolved && (
            <div className="glass-panel p-4 space-y-2.5">
              {m.selectionClosedAt && !isSelectionClosed(m) && (
                <Countdown to={m.selectionClosedAt} label={t.market.selectionClosesIn} />
              )}
              {m.selectionClosedAt && isSelectionClosed(m) && m.status === "LIVE" && (
                <div className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: "var(--gold-300)" }}>
                  <I.hourglassOff s={14} />
                  {t.market.selectionClosedWaiting}
                </div>
              )}
              <Countdown to={m.resolutionAt} label={m.selectionClosedAt ? t.market.resultsIn : t.market.closesIn} />
            </div>
          )}

          {/* 4. Your open positions — relevant context before reading the criterion */}
          {session && (
            <section className="rounded-xl border border-border bg-bg-elevated p-5 space-y-3">
              <h2 className="font-display text-[15px] font-semibold text-text flex items-center gap-2">
                <I.portfolio s={15} />
                {t.market.yourPositions}
              </h2>
              {myPositions.length === 0 && (
                <p className="text-[12.5px] text-text-subtle italic">
                  {t.market.noBetYet}
                </p>
              )}
              {myPositions.map((p) => {
                const liveValue = positionCashOutValues.get(p.id) ?? null;
                const sellShut = p.status === "OPEN" && (isSelectionClosed(m) || positionSellable.get(p.id) === false);
                return (
                  <div key={p.id} className="rounded-md border border-border bg-bg-overlay/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 font-mono text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${p.side === "YES" ? "text-yes-300" : "text-no-300"}`}>{p.side}</span>
                        <span className={`text-[10px] uppercase tracking-[0.10em] font-semibold ${
                          p.status === "OPEN" ? "text-info-fg" : p.status === "WIN" ? "text-gold-300" : p.status === "LOSS" ? "text-no-300" : "text-text-subtle"
                        }`}>{p.status === "CASHED_OUT" ? "CASHED" : p.status}</span>
                      </div>
                      <span className="font-bold tabular-nums text-text">{formatTzs(p.stake)}</span>
                    </div>
                    {p.status !== "OPEN" && (
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-text-muted">{t.market.paidLabel}</span>
                        <span className="font-bold tabular-nums text-gold-300">{formatTzs(p.finalPayout ?? 0)}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <p className="font-mono text-[10px] tracking-[0.06em] text-text-muted tabular-nums">
                        <I.ticket s={10} className="inline -mt-px mr-0.5 opacity-60" />
                        {p.id}
                      </p>
                      <p className="flex items-center gap-1 font-mono text-[10px] tracking-[0.04em] text-text-faint tabular-nums">
                        <I.clock s={10} className="opacity-70 shrink-0" />
                        {t.market.opened} {fmtTime(p.placedAt)}
                      </p>
                    </div>
                    {(liveValue !== null || sellShut) && (
                      <SellButton
                        positionId={p.id}
                        stake={p.stake}
                        value={liveValue ?? 0}
                        placedAt={p.placedAt}
                        closesAt={m.selectionClosedAt ?? m.resolutionAt}
                        alreadyClosed={sellShut}
                        serverNow={Date.now()}
                      />
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* 5. Resolution criterion — the rules of the bet */}
          <section className="glass-panel p-5">
            <h2 className="font-display text-[15px] font-semibold text-text mb-2 flex items-center gap-2">
              <I.fileCheck s={15} className="text-text-subtle" />
              {t.market.resolutionCriterion}
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
          {!isResolved && m.status === "LIVE" && !closedByTime && !selectionClosed ? (
            session ? (
              <>
              {/* Hedge warning — shown when player already has a position */}
              {openPositions.length > 0 && (
                <div className="rounded-lg border border-warning-border bg-warning-bg/30 px-3.5 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-warning-fg">
                    {t.market.youAlreadyHold} {heldLabel} {t.market.here}
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-text-muted">
                    {hedgeBoth
                      ? fill(t.market.hedgeBothBody, { pct: pctNum(marketRates.commissionRate) })
                      : hedgeOpposite
                        ? fill(t.market.hedgeOppositeBody, { pct: pctNum(marketRates.commissionRate) })
                        : t.market.hedgeAddBody}
                  </p>
                </div>
              )}
              <SidePicker
                marketId={m.id}
                marketTitle={pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}
                yesPool={m.yesPool}
                noPool={m.noPool}
                yesPct={yesPct}
                resolutionAt={m.resolutionAt}
                balance={myBalance}
                initialSide={side === "YES" || side === "NO" ? side : undefined}
                rates={marketRates}
                minStake={stakeCfg.minStake}
                maxStake={stakeCfg.maxStake}
              />
              </>
            ) : (
              /* Sign-in CTA — styled to invite prediction */
              <div
                className="rounded-xl border border-border bg-bg-elevated p-6 text-center"
                style={{
                  background:
                    "radial-gradient(420px 160px at 50% 0%, oklch(45% 0.10 240 / 0.20), transparent 60%), " +
                    "var(--hero-panel-grad)",
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
                  {t.market.signInToPredict}
                </p>
                <h3 className="mt-1.5 font-display text-[18px] font-bold text-text leading-tight">
                  {t.market.placeYourStake}
                </h3>
                <p className="mt-1.5 text-[12.5px] text-text-muted leading-snug">
                  {t.market.browseForFree}
                </p>
                {(() => {
                  const betNext = "/markets/" + m.id + (side === "YES" || side === "NO" ? `?side=${side}` : "");
                  const q = `?next=${encodeURIComponent(betNext)}`;
                  return (
                    <div className="mt-4 grid grid-cols-1 xs:grid-cols-2 gap-2">
                      <a href={`/auth/register${q}`} className="btn btn-primary btn-md btn-pill">
                        {t.common.signUp}
                      </a>
                      <a href={`/auth/login${q}`} className="btn btn-ghost btn-md btn-pill">
                        {t.common.signIn}
                      </a>
                    </div>
                  );
                })()}
              </div>
            )
          ) : selectionClosed && !closedByTime ? (
            <div className="rounded-xl border border-border bg-bg-elevated p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <I.hourglassOff s={18} className="text-gold-300" />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
                {t.market.selectionClosedBadge}
              </p>
              <h3 className="mt-1.5 font-display text-[15px] font-bold text-text">{t.market.waitingForResultsAside}</h3>
              <p className="mt-3 text-[12px] text-text-muted leading-snug">
                {t.market.newPredictionsNotAccepted}
                {m.resolutionAt && ` ${t.market.resultsExpectedBy} ${new Date(m.resolutionAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`}
              </p>
            </div>
          ) : closedByTime ? (
            <div className="rounded-xl border border-warning-border bg-warning-bg/30 p-6 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-warning-fg">
                {t.market.closedAwaitingSettlement}
              </p>
              <h3 className="mt-1.5 font-display text-[15px] font-bold text-text">{t.market.noMoreBets}</h3>
              <p className="mt-1 text-[13px] italic text-text-subtle">{t.market.closedWaitSubtitle}</p>
              <p className="mt-3 text-[12px] text-text-muted leading-snug">
                {t.market.countdownEndedBody}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-bg-elevated p-6 text-center">
              <p className="font-display text-[15px] font-semibold text-text">{t.market.marketClosedForPredictions}</p>
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
