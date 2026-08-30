import Link from "next/link";
import { SentinelSourceChip } from "@/components/admin/sentinel-source-chip";
import { sentinelSourceVerdict } from "@/lib/server/market-sentinel";
import { parseQuery, matchesQuery, fieldNames, MARKET_SEARCH } from "@/lib/search";
import { AdminPageHead, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { RefreshButton } from "@/components/admin/refresh-button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { Select } from "@/components/ui/select";
import { listMarkets, impliedYesPct, type MarketCategory } from "@/lib/server/market-service";
import { formatTzs } from "@/lib/utils";
import { ProbabilityBar } from "@/components/markets/probability-bar";
import { CircularProgress } from "@/components/markets/circular-progress";
import { ResolveControls } from "./resolve-controls";
import { TwoAdminToggle } from "./two-admin-toggle";
import { RecheckButton } from "./recheck-button";
import { getRequireTwoOfficerResolution } from "@/lib/server/resolution-policy";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { getEffectiveConfig, getEffectiveResolutionMode } from "@/lib/server/market-config";
import { listSources, sourceMatchesAny, listDisabledCategories } from "@/lib/server/source-registry";
import { resolvePublishCategory } from "@/lib/server/market-service";
import { bulkVerdictFor } from "@/lib/server/bulk-resolve-eligibility";
import { BulkSelectionProvider } from "./bulk-selection";
import { BulkResolveBar } from "./bulk-resolve-bar";
import { RowCheck, RowVerdict } from "./row-select";
import type { BulkRow } from "./bulk-resolve-types";
import { ControlLocked } from "@/components/admin/control-locked";
import { formatDateTime } from "@/lib/utils";
import { CEREMONY, SELECTION } from "@/lib/admin-status-lexicon";
import { AdminBody } from "@/components/admin/admin-body";
import { SORT_OPTIONS, parseSort, compareBy } from "./queue-order";

export const metadata = { title: "Admin · Resolver queue" };
export const dynamic = "force-dynamic";

const fmtTime = formatDateTime;

const WINDOW_OPTIONS = [
  { value: "24h", label: "Next 24 hours" },
  { value: "48h", label: "Next 48 hours" },
  { value: "7d", label: "Next 7 days" },
  { value: "all", label: "All pending" },
] as const;

const CATEGORY_OPTIONS: readonly MarketCategory[] = ["sports", "macro", "weather", "crypto", "culture", "tech", "other"];


/**
 * A duration in the largest sensible unit — minutes, then hours, then days.
 *
 * ⚠️ E-38. The overdue branch used to be `${minutes}m overdue`, with NO rollover, while the
 * not-yet-due branch rolled m → h → d correctly. So a market 16 hours late rendered
 * **"966m overdue"**, which the admin CSS uppercases to **"966M OVERDUE"** — on a badge whose
 * whole job is to convey urgency about real money being held, and in a console where "M"
 * means millions everywhere else (`formatTzs`, `admin-charts`, the conviction dial). Measured
 * on production 2026-08-02: TZS 59,450 of REAL player money on 8 positions, 16h overdue,
 * announced as "966M". The one direction that matters — already late — was the one direction
 * that did not scale its unit.
 */
export function humanDuration(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 0 ? `${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : `${Math.floor(d / 7)}w`;
}

function timeUntil(iso: string): { label: string; tone: "default" | "soon" | "overdue" } {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return { label: `${humanDuration(Math.abs(ms))} overdue`, tone: "overdue" };
  const m = Math.floor(ms / 60_000);
  if (m < 60) return { label: `${m}m`, tone: "soon" };
  const h = Math.floor(m / 60);
  if (h < 24) return { label: `${h}h`, tone: m < 60 * 24 ? "soon" : "default" };
  return { label: `${Math.floor(h / 24)}d`, tone: "default" };
}

export default async function ResolverQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; category?: string; q?: string; page?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const windowFilter = (WINDOW_OPTIONS as readonly { value: string }[]).some((o) => o.value === sp.window) ? sp.window! : "24h";

  const sortKey = parseSort(sp.sort);
  const categoryFilter = (CATEGORY_OPTIONS as readonly string[]).includes(sp.category ?? "") ? sp.category as MarketCategory : "";
  const query = (sp.q ?? "").trim().toLowerCase();
  const parsedQ = parseQuery(query, { fields: fieldNames(MARKET_SEARCH) });

  const now = Date.now();
  const windowMs = windowFilter === "48h" ? 48 * 3600_000
    : windowFilter === "7d" ? 7 * 24 * 3600_000
    : windowFilter === "all" ? Infinity
    : 24 * 3600_000;

  // A-5: distinguish a FAILED market read from a genuinely-clear queue, so a
  // backend error never renders "Queue is clear" and hides pending settlements.
  let marketsFailed = false;
  const allMarkets = await listMarkets().catch(() => { marketsFailed = true; return []; });
  const pending = allMarkets.filter((m) => {
    const due = Date.parse(m.resolutionAt);
    if (m.status === "CLOSED") return true;
    if (m.status === "LIVE") return windowMs === Infinity || due - now < windowMs;
    return false;
  }).filter((m) => {
    if (categoryFilter && m.category !== categoryFilter) return false;
    // Shared grammar — was a single contiguous `.includes()` on two title columns.
    return matchesQuery(parsedQ, m as unknown as Record<string, string | null | undefined>, MARKET_SEARCH);
  }).sort(compareBy(sortKey));

  // Triage counts for the header summary.
  const overdueCount = pending.filter((m) => Date.parse(m.resolutionAt) <= now).length;
  const awaitingStage2 = pending.filter((m) => !!m.resolutionStage1By).length;
  const windowLabel = (WINDOW_OPTIONS.find((o) => o.value === windowFilter)?.label ?? "").toLowerCase();
  // Two-admin authorization: OFF (default) = single admin resolves in one action;
  // ON = two-officer ceremony. This is the ONE place it is controlled.
  const requireTwoOfficer = await getRequireTwoOfficerResolution().catch(() => false);

  // E-18: this page is the `trading` domain, but two of its three controls demand
  // `compliance` — disjoint sets under DEFAULT_GRANTS. Ask the SAME question the
  // actions will ask (one definition, control-gates.ts) and render a read-only state
  // instead of a control that refuses and logs the click as a SECURITY event.
  // Mirrors admin/objections' `canDecide`.
  const session = await currentSession();
  const [canRecheck, canSetPolicy, canResolve, canBulk, canOverride] = await Promise.all([
    canUseControl(session?.role, "recheckMarketNow"),
    canUseControl(session?.role, "setTwoAdminAuth"),
    canUseControl(session?.role, "resolveMarket"),
    canUseControl(session?.role, "bulkResolveMarkets"),
    // ⭐ The two halves of the bulk bar are two different decisions and they need two
    // different grants. Asked HERE with the same function the action will use, so a
    // trading officer sees a locked override instead of a box the server refuses (E-18).
    canUseControl(session?.role, "bulkResolveOverride"),
  ]);
  // NOTE: the AI resolution pause + auto-resolve toggles live ONLY in the admin
  // top-bar "AI toolkit" dropdown (one place, no redundancy). This page owns the
  // two-admin authorization toggle + the per-market re-check.

  // Paginate
  const page = parsePage(sp.page, pending.length);
  const paged = pending.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  /* ⛔ THE PAGER MUST CARRY THE ORDER. Every param the page reads has to be rebuilt into the
     pager's links, or clicking "2" silently reverts to the default order — and the officer
     is then paging through a DIFFERENT queue than the one they were reading, with the rows
     they had already triaged scattered somewhere behind them. */
  const baseHref = buildBaseHref("/admin/resolver-queue", { window: sp.window, category: sp.category, q: sp.q, sort: sp.sort });
  const hasFilter = windowFilter !== "24h" || !!categoryFilter || !!query || sortKey !== "due";

  /**
   * ⭐ THE AUTO-RESOLVE VERDICT FOR EVERY ROW ON THIS PAGE — the answer to *"why is this
   * 99%-confidence market still sitting here?"*, which this page has never given.
   *
   * ⛔ COMPUTED HERE, ON THE SERVER, AND NOWHERE ELSE. It needs the trusted-source
   * registry, the per-market effective config and `decideAutoResolve` itself; a client
   * component asking the same question would drag Prisma and the lock manager into the
   * browser bundle, and a verdict the browser computed is a verdict an attacker chose.
   * The action re-derives every one of these before it seals anything — what is handed
   * down is for PAINT.
   *
   * ⛔ THE REGISTRY IS READ ONCE. `isSourceTrusted` re-reads the whole store per call, so
   * asking it per row would be a 20× store read for one answer that cannot change
   * mid-render — which is why `sourceMatchesAny` exists and why the host rule has exactly
   * one definition site.
   */
  const trustedSources = await listSources({ enabledOnly: true }).catch(() => []);
  /**
   * ⛔ THE DISABLED-CATEGORY ARM, WITHOUT WHICH THIS READING IS MORE PERMISSIVE THAN THE
   * ENGINE'S — and "more permissive" here means the queue paints a green ELIGIBLE chip on a
   * market `decideAutoResolve` refuses, and the bulk bar seals it in one press with no
   * override, no typed reason and no compliance audit row.
   *
   * The engine's second arm is `isSourceTrusted`, which fails closed on a disabled category
   * FIRST. `sourceMatchesAny` deliberately has no such check — its own docstring says the
   * category gate "stays in isSourceTrusted where it belongs" — so the caller owes it.
   *
   * ⛔ Hoisted, like the source list: `isSourceTrusted` re-reads the whole store per call, so
   * asking it per row would be a 20× read of an answer that cannot change mid-render. Same
   * reason `sourceMatchesAny` exists at all. `.catch(() => [])` reads as "nothing disabled",
   * which matches the failure direction of the registry read beside it.
   */
  const disabledCategories = new Set(await listDisabledCategories().catch(() => []));
  const bulkRows: BulkRow[] = await Promise.all(paged.map(async (m) => {
    const cfg = await getEffectiveConfig(m.id);
    const mode = await getEffectiveResolutionMode(m.resolutionMode);
    const sv = sentinelSourceVerdict(m.sentinelSourceUrl, m.sourceUrl);
    // ⛔ BOTH ARMS, exactly as `resolveDueMarket` computes `sourceMatches`. A market that
    // names NO approved source is gated by the registry instead; rendering only
    // `sentinelSourceVerdict` would show "no approved source" on a row the engine considers
    // fully matched, and the badge would then contradict the gate it is explaining.
    const sourceMatches =
      sv === "match" ||
      (sv === "no-approved-source" && !!m.sentinelSourceUrl &&
        !disabledCategories.has(resolvePublishCategory(m.category)) &&
        sourceMatchesAny(trustedSources, m.sentinelSourceUrl, resolvePublishCategory(m.category)));
    const v = bulkVerdictFor({
      market: m, mode, threshold: cfg.resolveConfidenceThreshold,
      sourceMatches, requireTwoOfficer, officerId: session?.userId ?? null,
    });
    return {
      marketId: m.id,
      title: m.titleEn,
      pool: m.yesPool + m.noPool,
      verdict: {
        eligible: v.eligible, outcome: v.outcome, reason: v.reason, all: v.all,
        overridable: v.overridable, stage: v.stage, modeIsAuto: v.modeIsAuto,
        stagedByMe: v.stagedByMe,
        confidence: v.confidence, citedHost: v.citedHost, approvedHost: v.approvedHost,
      },
    };
  }));
  const verdictById = new Map(bulkRows.map((r) => [r.marketId, r]));
  // The floor is a per-market config value; the queue-wide one is only for the copy that
  // says "floor 90%" beside a refused row, so the global read is the right one here.
  const globalCfg = await getEffectiveConfig();
  const displayThreshold = globalCfg.resolveConfidenceThreshold;
  // ⛔ READ, NEVER ASSUMED. 0 is a legal setting, and at 0 the settle timer pays every
  // winner within milliseconds of the seal — so the confirmation's "no money moves yet"
  // has to change with it rather than being a constant.
  const objectionWindowHours = globalCfg.objectionWindowHours;

  return (
    <>
      <AdminPageHead
        title="Resolver queue"
        sw="Foleni ya utatuzi"
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {canSetPolicy ? (
              <TwoAdminToggle enabled={requireTwoOfficer} />
            ) : (
              // Still shows WHICH mode is live — a trading officer needs to know
              // whether a resolution will take one officer or two — but does not
              // offer the switch, which is a compliance decision (POCA §16).
              <ControlLocked
                what={requireTwoOfficer ? "Two-admin auth" : "Single-admin"}
                need={CONTROL_DOMAIN.setTwoAdminAuth}
              />
            )}
            <div className="flex items-center gap-2.5 font-mono text-micro tracking-[0.14em] uppercase text-text-subtle">
              <span>{pending.length} pending</span>
              {overdueCount > 0 && <><span className="text-border">·</span><span className="text-claret-300">{overdueCount} overdue</span></>}
              {requireTwoOfficer && awaitingStage2 > 0 && <><span className="text-border">·</span><span className="text-warning">{awaitingStage2} awaiting 2nd</span></>}
            </div>
          </div>
        }
      />
      <AdminBody>
        {/* Filters */}
        <AdminCard>
          <form className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
              <I.search s={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Search title…"
                aria-label="Search resolver queue"
                /* ⚠️ LITERAL, not `h-8` (48px on the overridden scale) — 32px = --h-control-xs,
                   the one admin-search height, matching the xs Selects beside it. */
                className="h-[32px] w-full rounded-md border border-border bg-bg-overlay pl-9 pr-3 text-[12.5px] text-text outline-none admin-focus transition-colors placeholder:text-text-subtle"
              />
            </div>
            <div className="w-full sm:w-[160px]">
              <Select name="window" defaultValue={windowFilter} size="xs" placeholder="Time window"
                options={WINDOW_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </div>
            <div className="w-full sm:w-[150px]">
              <Select name="category" defaultValue={categoryFilter} size="xs" placeholder="All categories"
                options={[{ value: "", label: "All categories" }, ...CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))]} />
            </div>
            <div className="w-full sm:w-[185px]">
              <Select name="sort" defaultValue={sortKey} size="xs" placeholder="Order"
                ariaLabel="Order the queue"
                options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </div>
            <button type="submit" className="btn btn-primary btn-xs">Filter</button>
            {hasFilter && <a href="/admin/resolver-queue" className="btn btn-ghost btn-xs">Clear</a>}
            <RefreshButton className="ml-auto" />
          </form>
        </AdminCard>

        {marketsFailed ? (
          <AdminLoadError what="the resolver queue" />
        ) : (
          <BulkSelectionProvider pageIds={bulkRows.map((r) => r.marketId)}>
          {/* ⭐ THE BULK BAR — its OWN card, in normal flow, directly under the filters and
              above the grid, and OUTSIDE the empty-state branch.
              ⛔ OUTSIDE, because it carries the batch RESULT PANEL. A batch that seals the
              last rows in the queue flips this page to "Queue is clear" on the very refresh
              that follows — and with the bar inside the non-empty branch, the five-bucket
              report of what was just sealed, skipped and failed unmounted with it. The one
              moment an officer most needs that panel is the moment it used to vanish.
              ⛔ NOT in `AdminCard action=`: that slot is `shrink-0` against a growing title
              and a summary strip has already measured wider than its own card at 360 there.
              ⛔ NOT sticky, and that is a decision rather than an omission. The admin top bar
              in this console is deliberately not sticky either (the SIDEBAR is the sticky
              element), so a bar that floated here would be the only thing on the page that
              did — and a scroll-driven bar is a feedback loop this platform has already paid
              for: a header once oscillated 30 times a second under 9,311 green checks. In
              normal flow it cannot overlap the nav, the cards or the pager, because it is a
              sibling of all three. */}
          <AdminCard>
            {canBulk ? (
              <BulkResolveBar
                rows={bulkRows}
                totalPending={pending.length}
                requireTwoOfficer={requireTwoOfficer}
                canOverride={canOverride}
                objectionWindowHours={objectionWindowHours}
              />
            ) : (
              <ControlLocked what="Resolve selected markets" need={CONTROL_DOMAIN.bulkResolveMarkets} block />
            )}
          </AdminCard>
          {pending.length === 0 ? (
          <EmptyState
            kind="audit"
            title={hasFilter ? "No markets match" : "Queue is clear"}
            titleSw={hasFilter ? "Hakuna soko" : "Foleni ni tupu"}
            body={windowFilter === "all"
              ? "No markets are pending resolution."
              : `No markets resolving in the ${windowLabel}.`}
          />
        ) : (
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
            {paged.map((m) => {
              const t = timeUntil(m.resolutionAt);
              const yes = impliedYesPct(m);
              const stage1 = !!m.resolutionStage1By;
              return (
                <AdminCard key={m.id} padding="p-0" data-market-id={m.id}>
                  <div className="flex items-start gap-4 p-4 border-b border-border">
                    {/* ⛔ THE TICK BOX ONLY — 44px, `shrink-0`, and nothing in it that can
                        widen a track. A grid item's `min-content` forces its track, and the
                        VERDICT SENTENCE used to live here: a chip reading "The AI read a
                        different site from this market's approved source" in a shrink-0
                        column pushed the whole card past its `lg:grid-cols-2` track. The
                        sentence is now `<RowVerdict>`, full width, in the card body.
                        It sits FIRST so the tick box is the leftmost thing on the card at
                        every width, which is where a reader looks for one. */}
                    {canBulk && verdictById.has(m.id) && (
                      <div className="shrink-0">
                        <RowCheck marketId={m.id} title={m.titleEn} />
                      </div>
                    )}
                    {/* B6: the dial shows the CROWD's YES lean (impliedYesPct) — nothing more.
                        It previously showed pool "lopsidedness" fed into a YES-green/NO-rose
                        ConfidenceDial, so a 90%-NO market rendered a YES-leaning needle labelled
                        "80%" — a false directional signal on the resolution surface. The verdict
                        is decided from the source, never from crowd sentiment. */}
                    <CircularProgress
                      value={yes}
                      size={64}
                      label="crowd"
                    />
                    <div className="flex-1 min-w-0">
                      {/* ⛔ G-6 (2026-08-02). Measured at 360 on production: the three
                          items are 95 + 44 + 55 = 194px and the box is exactly 194px —
                          it is the two 12px `gap-2` gutters, and nothing else, that
                          overflow it by 24px. `nowrap` meant the Source link was simply
                          drawn outside the card. Wrapping costs nothing at any width
                          where it fits, and `ml-auto` keeps Source right-aligned on
                          whichever line it lands on. */}
                      <div className="flex flex-wrap items-baseline gap-2">
                        <Chip size="sm" variant={
                          t.tone === "overdue" ? "danger"
                          : t.tone === "soon" ? "warning"
                          : "neutral"
                        }>{t.label}</Chip>
                        <span className="font-mono text-micro uppercase tracking-[0.14em] text-text-subtle">{m.category}</span>
                        <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-royal-300 hover:text-royal-200">
                          Source
                          <I.ext s={11} />
                        </a>
                      </div>
                      <h3 className="mt-1 font-display text-[15px] font-semibold leading-tight text-text line-clamp-2">{m.titleEn}</h3>
                      <p className="text-body-sm italic text-text-subtle line-clamp-1">{m.titleSw}</p>
                      {m.titleZh && <p className="text-body-sm italic text-text-subtle line-clamp-1">{m.titleZh}</p>}
                      <p className="mt-1 font-mono text-[11px] text-text-subtle">{SELECTION.betsClosed.en} {fmtTime(m.selectionClosedAt ?? m.resolutionAt)} · Resolves {fmtTime(m.resolutionAt)}</p>
                    </div>
                  </div>

                  {canBulk && verdictById.has(m.id) && (
                    <RowVerdict
                      marketId={m.id}
                      verdict={verdictById.get(m.id)!.verdict}
                      threshold={displayThreshold}
                      canOverride={canOverride}
                    />
                  )}

                  <div className="px-4 py-3 border-b border-border">
                    <ProbabilityBar yesPct={yes} size="micro" />
                    {/* ⛔ `flex-wrap` — MEASURED AT 360 ON PRODUCTION 2026-08-28, and it is the
                        MONEY that was being clipped. Three `whitespace-nowrap` items (the crowd
                        split, the predictor link, the pool chip) in a 320px card: the pool chip
                        ran 217→345 against a card ending at 340, so **"TZS 5,000 held" was
                        painted 5px outside its own card on every row.** That chip is E-38's fix
                        for the queue hiding the amount at stake — clipped, it hides it again.
                        ⚠️ Pre-existing (the row is from 2026-06-22) and found only because the
                        bulk-bar drive compares RECTANGLES rather than reading text: `innerText`
                        returns the full string whatever the paint does. Same remedy as G-6 two
                        blocks up — wrapping costs nothing at any width where it already fits. */}
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-[10px] text-text-subtle">Crowd: {yes}% YES · {100 - yes}% NO</p>
                      <Link
                        href={`/admin/markets/${m.id}` as never}
                        className="inline-flex min-h-[var(--tap-min)] items-center gap-1 rounded-md border border-border bg-bg-overlay px-2 py-0.5 font-mono text-[10.5px] text-text-muted hover:border-brand-500 hover:text-text transition-colors whitespace-nowrap"
                      >
                        <I.users s={10} />
                        {m.predictorCount} {m.predictorCount === 1 ? "predictor" : "predictors"}
                      </Link>
                      {/* ⭐ E-38 · THE MONEY HELD, which is the actual urgency signal and was
                          absent. "8 predictors" says how many people are waiting; it does not
                          say that TZS 59,450 of their money is held while this sits unresolved.
                          §0.1b's lesson on the rounds page was the same shape: a queue that
                          hides the amount at stake gets triaged in the wrong order. Read off
                          the pools the market already carries — no extra query. */}
                      {m.yesPool + m.noPool > 0 && (
                        <span
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-overlay px-2 py-0.5 font-mono text-[10.5px] font-semibold text-text-muted whitespace-nowrap"
                          title="Player money held on this market until it resolves"
                        >
                          <I.wallet s={10} />
                          {formatTzs(m.yesPool + m.noPool)} held
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI Sentinel recommendation (if this market was closed by AI) */}
                  {m.sentinelOutcome && (
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <I.sparkle s={14} className="text-brand-300" />
                        <span className="font-mono text-micro uppercase eyebrow font-semibold text-brand-300">AI recommendation</span>
                        {m.sentinelConfidence != null && (
                          <span className="font-mono text-[10px] tabular-nums text-text-subtle">{m.sentinelConfidence}% confidence</span>
                        )}
                      </div>
                      <div className={`rounded-md border p-3 ${
                        m.sentinelOutcome === "YES" ? "border-yes-700/50 bg-yes-500/10" : "border-no-700/50 bg-no-500/10"
                      }`}>
                        <p className="font-display text-[14px] font-bold text-text">
                          Sentinel says: <span className={m.sentinelOutcome === "YES" ? "text-yes-300" : "text-no-300"}>{m.sentinelOutcome}</span>
                        </p>
                        {m.sentinelEvidence && (
                          <p className="mt-1 text-body-sm text-text-secondary leading-snug">{m.sentinelEvidence}</p>
                        )}
                        {m.sentinelSourceUrl && (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <a href={m.sentinelSourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-royal-300 hover:text-royal-200">
                              AI source <I.ext s={10} />
                            </a>
                            {/* Whether the AI read the market's OWN approved source. Derived, never
                                stored, so it cannot go stale against an edited market. In human mode
                                this is INFORMATION, never a suppression: the officer is about to open
                                that link themselves, and hiding a read from the wrong site is exactly
                                what would let them seal on it unaware. */}
                            <SentinelSourceChip
                              verdict={sentinelSourceVerdict(m.sentinelSourceUrl, m.sourceUrl)}
                              approved={m.sourceUrl}
                            />
                          </div>
                        )}
                        {m.sentinelReasoning && (
                          <details className="mt-2">
                            <summary className="cursor-pointer font-mono text-micro uppercase eyebrow text-text-subtle hover:text-text-muted">
                              AI reasoning
                            </summary>
                            <p className="mt-1 text-body-sm text-text-muted leading-relaxed pl-2 border-l-2 border-border">
                              {m.sentinelReasoning}
                            </p>
                          </details>
                        )}
                      </div>
                      {m.sentinelClosedAt && (
                        <p className="mt-1 font-mono text-[10px] text-text-subtle">
                          Closed by sentinel at {fmtTime(m.sentinelClosedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* The two-officer ceremony status only applies when two-admin
                      authorization is ON. In single-admin mode (the default) one
                      officer resolves in one action, so there is no stage-1/stage-2. */}
                  {requireTwoOfficer ? (
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <I.users s={14} />
                        <span className="font-mono text-micro uppercase eyebrow font-semibold text-text-muted">{CEREMONY.twoOfficerRule.en}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[12px]">
                        <div className={`rounded-md border p-2 ${
                          stage1
                            ? (m.resolvedOutcome === "NO" ? "border-no-700 bg-no-500/10" : m.resolvedOutcome === "VOID" ? "border-claret-700 bg-claret-500/10" : "border-yes-700 bg-yes-500/10")
                            : "border-border bg-bg-overlay"
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <I.shieldcheck s={12} />
                            <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{CEREMONY.stage1.en}</span>
                          </div>
                          <p className={`mt-1 font-mono text-[11px] ${stage1 ? "text-text-muted" : "text-text-subtle"}`}>
                            {stage1 ? `${m.resolutionStage1By?.slice(0, 14)}…` : "awaiting"}
                          </p>
                          {stage1 && m.resolvedOutcome && (
                            <p className="mt-0.5 font-mono text-micro uppercase tracking-[0.12em] text-text-subtle">
                              staged <span className={`font-bold ${m.resolvedOutcome === "YES" ? "text-yes-300" : m.resolvedOutcome === "NO" ? "text-no-300" : "text-claret-300"}`}>{m.resolvedOutcome}</span>
                            </p>
                          )}
                        </div>
                        <div className="rounded-md border border-border bg-bg-overlay p-2">
                          <div className="flex items-center gap-1.5">
                            <I.alertCircle s={12} />
                            <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{CEREMONY.stage2.en}</span>
                          </div>
                          <p className="mt-1 font-mono text-[11px] text-text-subtle">{stage1 ? `confirm ${m.resolvedOutcome}` : "unlocks after stage 1"}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-1.5">
                        <I.shieldcheck s={12} className="text-text-subtle" />
                        {/* DG-A-14 · "Single-admin resolution · one action seals it" is a sentence about
                            how settlement works — the " · " here joins English to English, so it is not one
                            of the console's bilingual labels. It was wearing the section-eyebrow recipe
                            (uppercase + 0.14em tracking at 10px) while being reading copy, so the dressing
                            is gone and the size is text-body-sm, the smallest rung above the 12.5px
                            reading floor (DESIGN_AUTHORITY §T4/§T7). Colour and spacing are untouched. */}
                        <span className="font-mono text-body-sm text-text-subtle">Single-admin resolution · one action seals it</span>
                      </div>
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    {canResolve ? (
                      <ResolveControls marketId={m.id} stage={stage1 ? "stage2" : "stage1"} stagedOutcome={m.resolvedOutcome} twoAdmin={requireTwoOfficer} />
                    ) : (
                      <ControlLocked what="Resolve YES / NO / VOID" need={CONTROL_DOMAIN.resolveMarket} block />
                    )}
                    {/* Per-market AI re-check (replaces the old global sentinel sweep). */}
                    {canRecheck ? (
                      <RecheckButton marketId={m.id} />
                    ) : (
                      <ControlLocked what="Re-check this market now" need={CONTROL_DOMAIN.recheckMarketNow} block />
                    )}
                    {/* Full evidence-first ceremony (evidence excerpt + typed-SEAL). */}
                    <Link
                      href={`/admin/resolver/${m.id}` as never}
                      className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-bg-overlay py-2 font-mono text-caption tracking-[0.08em] uppercase text-text-muted hover:border-brand-500 hover:text-text transition-colors"
                    >
                      <I.shieldcheck s={12} /> Open resolution ceremony
                    </Link>
                  </div>
                </AdminCard>
              );
            })}
          </div>
          )}
          </BulkSelectionProvider>
        )}
        <AdminPagination total={pending.length} page={page} baseHref={baseHref} />
      </AdminBody>
    </>
  );
}
