import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { I, categoryGlyph } from "@/components/ui/glyphs";
// E-101b · a fragment names a row; this is what actually scrolls to it.
import { HashFocus } from "@/components/ui/hash-focus";
import { BackLink } from "@/components/ui/back-link";
import { TippingBar } from "@/components/brand";
import { Countdown } from "@/components/markets/countdown";
import { ShareButton } from "@/components/markets/share-button";
import { WatchStar } from "@/components/markets/watch-star";
import { isWatching } from "@/lib/server/watchlist-service";
import { resolveWinShareToken } from "@/lib/server/share-token";
import { SidePicker } from "@/components/markets/side-picker";
import { MarketCard } from "@/components/markets/market-card";
import { getSimilarMarkets } from "@/lib/server/market-service";
import { ChartToggle } from "@/components/markets/chart-toggle";
import { SellButton } from "@/components/markets/sell-button";
import { ResolutionPanel } from "@/components/markets/resolution-panel";
import { Chip } from "@/components/ui/chip";
import { cashOutValue, getMarket, impliedYesPct, isClosedByTime, isSelectionClosed, listPositionsForUser, ratesFor } from "@/lib/server/market-service";
import { timeLeftLabel } from "@/lib/markets/time-left";
import { poolFee } from "@/lib/payout";
import { getEffectiveConfig } from "@/lib/server/market-config";
import { getProbabilityChart } from "@/lib/server/market-history";
import { roundStore } from "@/lib/server/updown-dal";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { ensureAffiliateAccount } from "@/lib/server/affiliate-service";
import { listComments } from "@/lib/server/comments-store";
import { CommentsThread } from "@/components/markets/comments-thread";
import { RefreshPoller } from "@/components/ui/refresh-poller";
// ⛔ `pctNum` went with `feeHeadlinePct` (B3) — its only consumer here was the hedge copy,
// which no longer interpolates a rate. An import kept "just in case" is how a deleted rate
// quietly comes back. ⚠️ `fill` STAYS: `similarTimeLeft` passes it to `timeLeftLabel`, a use
// tsc caught the moment the import was removed on the strength of a grep for `fill(`.
import { formatDateTime, formatDayTime, formatTzsCompact, formatTzs, fill } from "@/lib/utils";
import { appUrl } from "@/lib/app-url";
import { getServerT } from "@/lib/i18n-server";
import { pickLocalized, pickCriterion, marketCategoryLabel } from "@/lib/localized";


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
  // B-1 — no swallow on the PRIMARY read: a failed query must throw to
  // markets/error.tsx (retry), never 404 a market that may be holding money.
  // notFound() fires only when the query succeeded and the row is absent.
  // (generateMetadata's own catch above deliberately stays — title garnish.)
  const m = await getMarket(id);
  if (!m) notFound();

  // Up & Down is a SEPARATE game with its own detail surface (countdown, price,
  // quick-bet). This route renders the long-form-poll detail, which is the wrong UI
  // for a 5-minute price round — so any link that lands an Up & Down market here
  // (a shared /live card, an old bookmark, a search result) is bounced to the round
  // page. Fixing it at the destination means every caller routes correctly, not just
  // the ones we remembered to special-case.
  if (m.productLine === "UPDOWN") {
    const round = await roundStore.getByMarketId(m.id).catch(() => null);
    redirect(round ? `/updown/${round.id}${side ? `?side=${side}` : ""}` : "/updown");
  }

  const yesPct = impliedYesPct(m);

  // The resolution criterion FOR THIS READER, and the fact of whether we had it.
  // ⛔ Not `pickLocalized`: that helper discards the fallback, which is right for a
  // title and wrong for the sentence the payout turns on. See src/lib/localized.ts.
  const criterion = pickCriterion(locale, m.resolutionCriterion, m.resolutionCriterionSw, m.resolutionCriterionZh);

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
  // Used only by the RESOLVED panel below, where the outcome is known — pass it so a
  // loser-share poll shows the fee actually charged (a slice of the side that lost).
  const marketFee = poolFee(
    m.yesPool,
    m.noPool,
    marketRates,
    m.resolvedOutcome === "YES" || m.resolvedOutcome === "NO" ? m.resolvedOutcome : undefined,
  );
  // ⛔ `feeHeadlinePct` WAS REMOVED HERE (2026-08-14, B3). It existed for exactly one
  // consumer — the two hedge bodies — and those now quote no rate at all, because the fee
  // is stated by the payout projection in the same panel and RULES.md §7 exists to keep a
  // rate from being written twice. A computed rate with no reader is the next inline number
  // waiting to go stale; it is deleted rather than left for tsc to ignore.
  // Stake BOUNDS are entry-time, so they correctly read LIVE config (a poll does
  // not freeze how much you may stake) — and buyPosition re-validates them
  // server-side anyway, so the dial showing a stale bound cannot cost anyone
  // money. Only the FEE is frozen to the poll. Deliberately un-caught: if config
  // is unreadable we fail loudly rather than invent a limit.
  const stakeCfg = await getEffectiveConfig(m.id);
  const session = await currentSession();
  // B-1: a swallowed positions read rendered "You haven't bet yet" to a player
  // whose stake is IN this market. Fail loudly to markets/error.tsx instead.
  const myPositions = session ? (await listPositionsForUser(session.userId)).filter((p) => p.marketId === m!.id) : [];
  const myRefCode = session ? await ensureAffiliateAccount(session.userId).then((a) => a.code).catch(() => undefined) : undefined;
  // F3 — is this market on the signed-in player's watchlist?
  let watching = false;
  if (session) { try { watching = await isWatching(m.id, session.userId); } catch { /* graceful */ } }
  const isResolved = m.status === "RESOLVED" || m.status === "VOIDED";

  // "Similar markets" rail — other genuinely bettable markets so a confirmed bet
  // flows into another instead of a dead end. This page is MARKET-only (Up & Down was
  // redirected to /updown above), so it always fills. Best-effort — a failure here
  // must never take down the market page.
  // 3 fills one clean row at desktop (the detail-page grid is 3-across); a 4th would
  // strand a single card on a second row.
  const similar = await getSimilarMarkets(m, 3).catch(() => []);

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
  // Single-admin (the default authorization): ONE genuine human officer sealed it
  // (s1===s2, both real). Distinct from auto/system resolution (ids "system_*"),
  // which claims neither line. Lets the panel state honestly how it resolved.
  const singleOfficer = !twoOfficer && !!(_s1 && !_s1.startsWith("system"));
  // One-sided: all bets are on the same side — winners would win their own money.
  // Platform rule: full refund at 0% fee at resolution. Surface a disclaimer so
  // players know before they place or hold a bet.
  const isOneSided = !isResolved && ((m.yesPool > 0 && m.noPool === 0) || (m.yesPool === 0 && m.noPool > 0));
  // closed-by-time = the resolutionAt clock has elapsed but no resolver
  // has run yet. The dial cannot accept a bet here (server enforces),
  // so the page swaps it out for an "awaiting settlement" card.
  const closedByTime = isClosedByTime(m) && !isResolved;
  const selectionClosed = isSelectionClosed(m) && !isResolved;
  // COLD-START — the same rule the board and the card use (volume 0 +
  // predictors 0 on a live, still-open market), so the three surfaces can never
  // disagree about whether a market has a crowd price. One rule, one meaning.
  const freshMarket =
    m.status === "LIVE" && !selectionClosed && !closedByTime && !isResolved &&
    m.yesPool + m.noPool === 0 && m.predictorCount === 0;
  // ⚠️ "Nobody has touched this" (freshMarket) and "there is no crowd price"
  // (noPriceMarket) are DIFFERENT questions, and the card splits them the same way.
  // A price is a statement about the POOL alone: `impliedYesPct` returns a hardcoded
  // 50 when both pools are zero, and a market whose only bettor cashed out sits at
  // pool 0 with predictorCount 1 (the count is never decremented), so ANDing the two
  // let the default 50 render as a real price. Keeping the two definitions in step
  // across the card, the bar and the side-picker is what the comment above demands.
  const noPriceMarket =
    m.status === "LIVE" && !selectionClosed && !closedByTime && !isResolved &&
    m.yesPool + m.noPool === 0;

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
        // ⛔ `bonusStakeTzs` is load-bearing, not decorative: cashOutValue returns
        // `sellable: false` for a bonus-funded position because the server refuses
        // to sell one. Drop it here and the button prices a sale that always fails.
        const co = await cashOutValue({ side: p.side, stake: p.stake, placedAt: p.placedAt, bonusStakeTzs: p.bonusStakeTzs }, { id: m.id, yesPool: m.yesPool, noPool: m.noPool, resolutionAt: m.resolutionAt, selectionClosedAt: m.selectionClosedAt, feeSnapshot: m.feeSnapshot });
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
  // B-1 — deliberate degrade: chart + comments are enrichment on the market
  // detail; a failed read renders no chart / no thread, which the page already
  // does for genuinely-sparse markets.
  let probChart: Awaited<ReturnType<typeof getProbabilityChart>> = { series: {}, ranges: [] };
  try { probChart = await getProbabilityChart(m.id); } catch { /* graceful */ }
  let comments: Awaited<ReturnType<typeof listComments>> = [];
  try { comments = await listComments(m.id, session?.userId ?? null); } catch { /* graceful */ }

  // Pre-fetch wallet balance so we don't have an unguarded await in JSX.
  // B-1: a failed read used to render balance=0 → the dial fired "insufficient
  // balance" at a FUNDED player on the commit screen. On failure pass undefined
  // — the dial's `balance !== undefined` guard suppresses the warning and the
  // server remains the real gate.
  // 🔴 THE DIAL MUST BE GIVEN THE **SPENDABLE** BALANCE, NOT THE CASH ONE.
  // `buyPosition` funds a stake from `balance` FIRST and then from `bonusBalance`
  // (market-service.ts:745-749), so the money a player can actually stake is the sum.
  // Passing `balance` alone made the CLIENT gate stricter than the SERVER gate: a
  // player holding a bonus grant had Place disabled and read "insufficient balance"
  // over a stake the server would have funded without complaint — the platform
  // refusing to spend the bonus it had just given them.
  let myBalance: number | undefined;
  if (session) {
    try {
      const w = await db.wallet.findByUserId(session.userId);
      myBalance = (w?.balance ?? 0) + (w?.bonusBalance ?? 0);
    } catch { myBalance = undefined; }
  }

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
      <HashFocus />
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
          <Chip variant="cat" size="lg">{marketCategoryLabel(t, m.category)}</Chip>
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
            <Chip variant="resolved" size="lg">{t.market.resolvedOutcome} · {m.resolvedOutcome === "YES" ? t.common.yes : m.resolvedOutcome === "NO" ? t.common.no : t.market.statusVoid}</Chip>
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
      {/* Desktop is an explicit 2-col x 2-row grid so the right column can carry a
          SECOND block under the sticky bet widget (Step 4). The left column spans
          both rows. Mobile is untouched: it stays a flex column and every child
          keeps the order it had. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_360px] lg:grid-rows-[auto_auto] lg:items-start lg:gap-6">

        {/* ══ LEFT — market information & analysis ══
            order-2 on mobile (below the bet widget), order-1 on desktop (left col) */}
        <section className="order-2 lg:order-1 lg:col-start-1 lg:row-start-1 lg:row-span-2 min-w-0 space-y-5">

          {/* 1. Probability bar — current crowd signal, or an honest empty rail.
              COLD-START (2026-07-29): with an empty pool `impliedYesPct()` returns
              the DEFAULT 50, and this bar rendered it as a real, fully-coloured
              50/50 split with a centred needle and the word "TIPPING" — on a
              market with TZS 0 and zero predictors. Step 2 removed that lie from
              the card; it was still here, on the page where a player is actually
              about to stake. Same law (RULES 5), bigger surface. */}
          <TippingBar
            yesPct={yesPct}
            height={28}
            showLabels
            resolved={isResolved}
            empty={noPriceMarket}
            emptyLabel={t.market.noBetsYet}
          />
          {freshMarket && (
            <p className="-mt-3 text-center font-mono text-[11px] tracking-[0.06em] text-text-faint">
              {t.market.noBetsYet} · {t.market.beFirst}
            </p>
          )}

          {/* 2. KPI strip — volume, participation, timing at a glance */}
          <div className="grid grid-cols-3 gap-3">
            {/* "TZS 0" is factually true, but on a fresh market it reads as
                failure rather than as an opening. Same words the card uses, so
                the two surfaces say the same thing about the same state. */}
            <KPI label={t.market.volume}     value={freshMarket ? t.market.noPoolYet : formatTzsCompact(m.yesPool + m.noPool)} icon={<I.chart s={14} />} />
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
              singleOfficer={singleOfficer}
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
                <Countdown to={m.selectionClosedAt} label={t.market.selectionClosesIn} serverNow={Date.now()} />
              )}
              {m.selectionClosedAt && isSelectionClosed(m) && m.status === "LIVE" && (
                <div className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: "var(--gold-300)" }}>
                  <I.hourglassOff s={14} />
                  {t.market.selectionClosedWaiting}
                </div>
              )}
              <Countdown to={m.resolutionAt} label={m.selectionClosedAt ? t.market.resultsIn : t.market.closesIn} serverNow={Date.now()} />
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
                  /* ⭐ E-101 · THE LANDING TARGET for `/positions/<id>`. The fragment IS the
                     position id, so this card is what the browser scrolls to — and `scroll-mt`
                     keeps the sticky header off the row it just landed on. Without the id the
                     fragment matches nothing, the page silently opens at the top, and the deep
                     link is indistinguishable from the generic `/positions` href it replaced. */
                  <div key={p.id} id={p.id} className="ticket-target scroll-mt-24 rounded-md border border-border bg-bg-overlay/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 font-mono text-[12px]">
                      <div className="flex items-center gap-2">
                        {/* ⛔ RAW PRISMA ENUMS, ON THE ROW ABOUT THIS PLAYER'S OWN MONEY.
                            The side printed `p.side` ("YES"/"NO") and the state printed
                            `p.status` ("OPEN"/"WIN"/"LOSS"/"VOID") plus a hardcoded
                            English "CASHED" — untranslated in every locale, while the
                            status chip in the same header three hundred lines above was
                            fully localised. A Swahili player reading "NDIO" on the card
                            they arrived from met "YES" here. */}
                        <span className={`font-bold ${p.side === "YES" ? "text-yes-300" : "text-no-300"}`}>{p.side === "YES" ? t.common.yes : t.common.no}</span>
                        <span className={`text-[10px] uppercase tracking-[0.10em] font-semibold ${
                          p.status === "OPEN" ? "text-info-fg" : p.status === "WIN" ? "text-gold-300" : p.status === "LOSS" ? "text-no-300" : "text-text-subtle"
                        }`}>{
                          p.status === "OPEN" ? t.market.posOpen
                          : p.status === "WIN" ? t.market.posWin
                          : p.status === "LOSS" ? t.market.posLoss
                          : p.status === "CASHED_OUT" ? t.market.posCashed
                          : t.market.posVoid
                        }</span>
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
            {/* `lang` names the language the text is ACTUALLY in, which on a fallback
                is not the page's language — so a screen reader stops reading English
                with Swahili phonetics. That is the same fact the note below states,
                spent twice: once for a reader, once for a listener. */}
            <p lang={criterion.shownIn} className="text-[14px] leading-relaxed text-text-muted whitespace-pre-line">{criterion.text}</p>

            {/* ⭐ F6 · THE PAGE SAYS WHICH LANGUAGE THIS IS, BECAUSE THIS PARAGRAPH IS
                THE RULE THE PAYOUT TURNS ON. It used to render `m.resolutionCriterion`
                raw into all three locales: a Swahili player got an English paragraph
                under a Swahili heading, with nothing to distinguish "we wrote it this
                way" from "we have not translated it". A player who cannot read the
                criterion cannot check that the rule which took their stake is the rule
                they agreed to.
                ⛔ Both notes are non-English-only by construction — `fellBack` is false
                for `en`, and the binding note is gated on the locale — so an English
                reader sees exactly what they saw before. */}
            {criterion.fellBack ? (
              <p className="mt-2.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-text-subtle">
                <I.globe s={12} className="mt-[3px] shrink-0 opacity-70" />
                <span>{t.market.criterionNoTranslation}</span>
              </p>
            ) : locale !== "en" ? (
              // A translation is on screen — so the player is told, plainly, that the
              // English is the version officers resolve against, and is given it. It
              // is one tap away rather than absent: the binding text must never be
              // something a player has to change language to read.
              <details className="mt-2.5 group">
                <summary className="flex cursor-pointer list-none items-start gap-1.5 text-[12px] leading-relaxed text-text-subtle hover:text-text-muted">
                  <I.globe s={12} className="mt-[3px] shrink-0 opacity-70" />
                  <span>
                    {t.market.criterionEnglishBinding}{" "}
                    <span className="underline underline-offset-2">{t.market.criterionShowEnglish}</span>
                  </span>
                </summary>
                <p className="mt-2 border-l-2 border-border/60 pl-3 text-[13px] leading-relaxed text-text-muted whitespace-pre-line" lang="en">
                  {m.resolutionCriterion}
                </p>
              </details>
            ) : null}

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
        {/* z-10: this panel STICKS while the similar-markets rail (row 2 of the SAME
            column) scrolls up past it. With z-index:auto the rail's cards — later in
            the DOM, and each its own stacking context via `.mcardp:hover{transform}`
            — painted OVER the stuck panel and clipped the Sign up / Sign in buttons.
            Reproduced on production at 1040–1200px wide: the band just above the `lg`
            breakpoint where row 1 is still short enough for the panel to be pinned
            while row 2 has already scrolled into it.
            Stays well under the nav (z-40) and the Needle (z-45). */}
        <aside className="order-1 lg:order-2 lg:col-start-2 lg:row-start-1 space-y-3 lg:sticky lg:top-6 lg:z-10">
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
                    {/* ⛔ NO `fill({pct})` HERE ANY MORE. Both hedge bodies stated the
                        RETIRED capped-commission rule and were unreachable behind the
                        2026-08-04 guard; RULES.md §2.4 makes them live. They now quote no
                        rate at all — the fee is stated by the payout projection directly
                        below, and RULES.md §7 exists because a number written twice is a
                        number that will disagree with itself. */}
                    {hedgeBoth
                      ? t.market.hedgeBothBody
                      : hedgeOpposite
                        ? t.market.hedgeOppositeBody
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
                closesAt={m.selectionClosedAt ?? m.resolutionAt}
                serverNow={Date.now()}
                balance={myBalance}
                initialSide={side === "YES" || side === "NO" ? side : undefined}
                rates={marketRates}
                minStake={stakeCfg.minStake}
                maxStake={stakeCfg.maxStake}
                boardHref="/markets"
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
                      <Link href={`/auth/register${q}` as never} className="btn btn-primary btn-md btn-pill">
                        {t.common.signUp}
                      </Link>
                      <Link href={`/auth/login${q}` as never} className="btn btn-ghost btn-md btn-pill">
                        {t.common.signIn}
                      </Link>
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
                {m.resolutionAt && ` ${t.market.resultsExpectedBy} ${formatDayTime(m.resolutionAt)}.`}
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
        {/* ══ RIGHT, SECOND BLOCK — related markets (Step 4) ══
            Fills the column under the sticky bet widget, which was dead space
            from `lg:` up while the left column ran on for another 1,500px.

            This is the SAME similar-markets rail that used to sit full-width
            below both columns — MOVED, never duplicated. On mobile it keeps the
            identical position it had (order-3: after the two columns, before
            comments), so the phone layout is byte-for-byte what it was.

            Only content that already rendered LAST on mobile can move into this
            rail without reordering the phone. That is why the criterion, the
            source and the KPI facts stay in the left column: relocating them
            would have been exactly the mobile change this step forbids. */}
        {similar.length > 0 && (
          <section
            className="order-3 lg:col-start-2 lg:row-start-2 min-w-0"
            aria-labelledby="similar-markets-heading"
          >
            <div className="mb-3 flex items-center gap-2">
              <I.sparkle s={15} />
              <h2 id="similar-markets-heading" className="font-display text-[16px] font-bold text-text">
                {t.market.similarMarkets}
              </h2>
            </div>
            <p className="mb-4 text-[12.5px] text-text-muted">{t.market.similarMarketsBody}</p>
            {/* One column inside the 360px rail; the shared grid everywhere else. */}
            <div className="market-grid lg:!grid-cols-1">
              {similar.map((s) => (
                <MarketCard
                  key={s.id}
                  id={s.id}
                  titleEn={s.titleEn}
                  titleSw={s.titleSw}
                  titleZh={s.titleZh}
                  category={s.category}
                  yesPct={impliedYesPct(s)}
                  volume={s.yesPool + s.noPool}
                  predictors={s.predictorCount}
                  // ⚠️ Counts down to BETTING CLOSE, not to resolution. This rail is a
                  // "place another prediction" invitation, so a countdown to the
                  // settlement instant promises betting time the market will not
                  // accept — on a sports poll, hours of it. Matches the board and the
                  // card, which both show `selectionClosedAt ?? resolutionAt`.
                  timeLeft={isSelectionClosed(s) ? t.market.waitingForResults : similarTimeLeft(s.selectionClosedAt ?? s.resolutionAt, t)}
                  status="LIVE"
                  selectionClosed={isSelectionClosed(s)}
                  sourceUrl={s.sourceUrl}
                />
              ))}
            </div>
          </section>
        )}
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

/** Compact "time left" for a similar-market card — mirrors the board's phrasing so a
 *  card reads the same here as it does on /markets.
 *  This copy already floored at `Math.max(1, …)`, i.e. it was the CORRECT one of the four and the
 *  reason the drift was visible at all: it disagreed with three boards that rendered "0m left".
 *  Pointed at `src/lib/markets/time-left.ts` in batch 4 — behaviour-identical, one definition. */
function similarTimeLeft(iso: string, t: Awaited<ReturnType<typeof getServerT>>["t"]): string {
  return timeLeftLabel(Date.parse(iso), Date.now(), {
    closed: t.market.closed,
    days: t.market.timeLeftD,
    hours: t.market.timeLeftH,
    minutes: t.market.timeLeftM,
  }, fill);
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
