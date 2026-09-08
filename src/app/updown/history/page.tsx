/**
 * /updown/history — the player's OWN Up & Down portfolio.
 *
 * A SEPARATE game from long-form polls (Ali, 2026-07-25), so it has its own history
 * surface rather than mixing into /positions. Reads the money settlement already wrote
 * (position status + finalPayout) — no new money logic. Redirects a signed-out visitor
 * to sign-in, then back here.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
// E-101b · a fragment names a row; this is what actually scrolls to it.
import { HashFocus } from "@/components/ui/hash-focus";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { STATUS_TONE, TONE_CHIP } from "@/lib/status-tone";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { currentSession } from "@/lib/server/auth-service";
import { getMyUpDownHistory, type MyRoundRow } from "@/lib/server/updown-board";
import { getServerT } from "@/lib/i18n-server";
import { eatDayWindow, isInEatDay, eatDayKey, formatEatDay } from "@/lib/eat-day";
import { pickLocalized } from "@/lib/localized";
import { formatTzs, formatTzsSigned } from "@/lib/utils";
import { SearchBox } from "@/components/ui/search-box";
import { fieldNames, matchesQuery, parseQuery, UD_ROUND_SEARCH } from "@/lib/search";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { HistoryBar, type UdCounts } from "./history-bar";
import {
  buildUdHref,
  filterUd,
  parseUdParams,
  sortUd,
  udCounts,
  udEmptyCause,
  udExits,
  type HistoryRow,
} from "@/lib/updown/history-query";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.market.udHistoryTitle };
}

// UD-19 · EAST AFRICA TIME, stated — the settlement proof on the round page speaks
// EAT, and a player comparing their history row to the proof must not have to
// convert time zones between two screens describing one bet.
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
  return `${s} EAT`;
};
import { usd } from "@/lib/usd-price"; // the ONE spelling (session 80)

/**
 * ⭐ `DAY_PICKER_DAYS` RETIRED 2026-09-08 WITH THE RAIL IT SIZED. Its whole reason was that a
 * seven-day rail is what fits on ONE line at 360 in Swahili — a real constraint, and the right
 * answer for a rail of literal dates. The shared WINDOW replaces it with five spans that say the
 * same thing in the vocabulary `/wallet` and `/positions` use, so "last 7 days" now means one
 * span across the product instead of seven pills that only exist here.
 * ⛔ `?day=` ITSELF DID NOT RETIRE — the digest deep-links to an exact day and those links are
 * already delivered. See `lib/updown/history-query.ts`.
 */

/**
 * How many of the player's most recent Up & Down positions this page reads.
 *
 * ⚠️ It is a REAL limit and the page states it when it bites (see `capped` below). Named
 * here rather than inlined at the call site so the number the page reads and the number it
 * reports to the player can never be two different literals.
 */
const UD_HISTORY_LIMIT = 400;

export default async function UpDownHistoryPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t, locale } = await getServerT();
  const session = await currentSession();
  if (!session) redirect(`/auth/login?next=${encodeURIComponent("/updown/history")}`);

  // ── The digest's deep link (`?day=YYYY-MM-DD`), one EAT calendar day ──────
  //
  // ⚠️ This must actually filter. `updown-digest.ts` sends every player a link to
  // the day it is telling them about, and a link that says "your 2 Aug" and lands
  // on an unfiltered list of 400 rounds is a small lie inside the one message the
  // player receives about real money. It also gives this grid the filtering that
  // §0.1b rule 2 requires of every grid, player side included.
  //
  // ⛔ The day arithmetic is IMPORTED, not re-derived. The digest bins rounds into
  // EAT days; this page must cut on the identical boundary or the two disagree for
  // the three hours either side of midnight. `test:updown-digest` asserts that this
  // file imports the shared helper rather than growing its own copy.
  // 🔴 ONE VALIDATED VALUE DRIVES ALL THREE USES — the filter, the day rail and the empty
  // state. The first version validated for the chip but filtered on the RAW param, so
  // `?day=lol` matched no round, hid every card, and then — because the chip only
  // renders for a VALID day — showed "no rounds" with no indication of what had been
  // filtered and no control to clear it. A dead end reached by one typo. Caught by
  // `live-updown-digest.mjs` against production, not by reasoning about it.
  // ⭐ Batch 5 made that dead end structurally impossible rather than merely fixed: the day
  // rail below renders from the player's OWN rounds and always offers "All days", so an
  // unparseable `?day=` now lands on a page whose way out is a control, not just a link.
  const sp = (await searchParams) ?? {};

  // ⛔ UD-15 · no swallow: a failed read must never render as "you have no bets"
  // (B-1's exact defect class, on a money history). Throws reach error.tsx.
  const allRows = await getMyUpDownHistory(session.userId, UD_HISTORY_LIMIT);
  // ⛔ AND THE CAP IS NOW SAID OUT LOUD. `getMyUpDownHistory` takes the most recent
  // `UD_HISTORY_LIMIT` positions and this page renders them as though they were the player's
  // whole Up & Down record — including the P&L strip, whose "net return" is then a real
  // shilling figure computed over an unstated subset. That is the same class of defect as the
  // `+N` chip one section down: not a wrong number, a number whose scope is concealed. A
  // player past the cap is now told what they are looking at.
  const capped = allRows.length >= UD_HISTORY_LIMIT;
  // Filter on `settledAt` when the round has settled, and on `placedAt` while it
  // has not — the digest bins by settlement, and a still-open round has no
  // settlement to bin by but is still part of the day the player was playing.
  /**
   * ⭐ THE ROUND IS THE ROW. A player who quick-bet the same round three times played ONE round —
   * the day counts already folded that way, with the reason written beside them. Everything the
   * bar filters, counts and sorts is therefore a round, and grouping happens BEFORE filtering so
   * a lens can never split a round's bets across two answers.
   */
  const preGroups = new Map<string, { row: MyRoundRow; bets: MyRoundRow[]; stake: number; returned: number; anyOpen: boolean; latest: number; binned: number }>();
  for (const r of allRows) {
    const g = preGroups.get(r.marketId) ?? { row: r, bets: [], stake: 0, returned: 0, anyOpen: false, latest: 0, binned: 0 };
    g.bets.push(r);
    g.stake += r.stake;
    g.returned += r.payout ?? 0;
    if (r.status === "OPEN") g.anyOpen = true;
    const at = Date.parse(r.placedAt) || 0;
    if (at >= g.latest) g.latest = at;
    // The clock the day filter and the digest both bin by — settlement when there is one, and
    // the placement while there is not, because an open round is still part of the day it was
    // played in.
    const binned = Date.parse(r.settledAt ?? r.placedAt) || 0;
    if (binned >= g.binned) g.binned = binned;
    preGroups.set(r.marketId, g);
  }

  /** The asset and duration pills a player is offered — derived from THEIR rounds, never typed. */
  const assetIds = [...new Set(allRows.map((r) => r.assetKey))].sort();
  const durIds = [...new Set(allRows.map((r) => String(r.durationMinutes)))]
    .sort((a, b) => Number(a) - Number(b));

  /**
   * 🔴 ONE VALIDATED VALUE DRIVES THE FILTER, THE BAR AND THE EMPTY STATE — the rule this page
   * paid for. The first version validated `?day=` for the chip but filtered on the RAW param, so
   * `?day=lol` matched no round, hid every card, and rendered no control to clear it: a dead end
   * reached by one typo. The parser owns it now, for every axis at once.
   */
  const state = parseUdParams(sp, assetIds, durIds, (d) => !!d && !!eatDayWindow(d));
  const dayKey = state.day || null;

  const udRows: HistoryRow[] = [...preGroups.values()].map((g) => ({
    id: g.row.marketId,
    assetKey: g.row.assetKey,
    durationMinutes: g.row.durationMinutes,
    anyOpen: g.anyOpen,
    outcome: g.row.outcome,
    stake: g.stake,
    returned: g.returned,
    latestMs: g.latest,
    binnedAtMs: g.binned,
    assetName: pickLocalized(locale, g.row.assetNameEn, g.row.assetNameSw, g.row.assetNameZh),
  }));

  // ⛔ The EAT day arithmetic is the shared one — re-deriving it here is how a digest deep link
  //    and the page it lands on start disagreeing about which rounds belong to a day.
  const inDay = (row: HistoryRow, day: string) => isInEatDay(new Date(row.binnedAtMs).toISOString(), day);
  /**
   * ⛔ THE SHARED GRAMMAR, NOT A SUBSTRING MATCH. The first version of this line was
   * `assetName.toLowerCase().includes(q)` and `test:search-adoption` refused it — correctly:
   * this platform has ONE search grammar, and re-implementing it here would lose quoted
   * phrases, `-exclude` and `field:` while creating a second definition of what searching means.
   */
  const parsedQ = parseQuery(state.q, { fields: fieldNames(UD_ROUND_SEARCH) });
  const matchesText = (row: HistoryRow) =>
    matchesQuery(parsedQ, row as unknown as Record<string, string | null | undefined>, UD_ROUND_SEARCH);

  const nowMs = Date.now();
  const collate = new Intl.Collator(locale).compare;
  const counts = udCounts(udRows, state, nowMs, matchesText, inDay, assetIds, durIds) as UdCounts;
  const matched = sortUd(filterUd(udRows, state, nowMs, matchesText, inDay), state, collate);

  const pageNum = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const totalPages = Math.max(1, Math.ceil(matched.length / PLAYER_PER_PAGE));
  const safePage = Math.min(pageNum, totalPages);
  const pagedIds = new Set(matched.slice((safePage - 1) * PLAYER_PER_PAGE, safePage * PLAYER_PER_PAGE).map((r) => r.id));

  const cause = udEmptyCause(state, nowMs, matchesText, inDay, matched.length, udRows.length);
  const exits = cause && cause !== "no-rows" ? udExits(udRows, state, nowMs, matchesText, inDay) : [];
  const EXIT_LABEL: Record<string, string> = {
    asset: t.market.udAssets, dur: t.market.udDurations, when: t.common.rangeAll,
    q: t.common.clearSearch, tab: t.common.all,
  };

  // The bets the P&L strip reasons over — still every bet, so the figures describe the whole
  // filtered view rather than the twelve rounds on screen.
  const rows = allRows.filter((r) => matched.some((m) => m.id === r.marketId));

  /* ⭐ THE DAY PICKER — batch 5. Until now this page had a FILTER WITH NO CONTROL: `?day=` was
     reachable only from the daily digest's deep link, so a player who cleared it could never
     get back to a single day, and the page's own comment above cites the rule ("§0.1b rule 2")
     that every grid should filter.
     ⛔ IT IS DERIVED, NOT QUERIED. `allRows` is already in hand and `eatDayKey` is the SAME
     shared arithmetic the filter and the digest use, so both the day list and its counts cost
     zero extra I/O — and a day can never be offered that pressing it would not deliver,
     because the option only exists if a round produced it.
     ⚠️ It lists the days inside the most recent 400 positions — `getMyUpDownHistory`'s cap —
     not all time. That is a real limit and it is why the rail is capped at a week rather than
     pretending to be a calendar. */
  const dayRounds = new Map<string, Set<string>>();
  for (const r of allRows) {
    const at = Date.parse(r.settledAt ?? r.placedAt);
    if (!Number.isFinite(at)) continue;
    const k = eatDayKey(at);
    // Count ROUNDS, not bets — the cards below are one per round, so a count of positions
    // would promise 9 and deliver 3 on a day the player quick-bet the same round three times.
    const seen = dayRounds.get(k) ?? new Set<string>();
    seen.add(r.marketId);
    dayRounds.set(k, seen);
  }

  // GROUP BY ROUND. Up & Down is a fast game — placing many bets on one 5-minute round is
  // normal, so a per-position list reads as a redundant cluster and miscounts "rounds".
  // One card per round: EVERY bet on it renders as its own chip, and the round shows the
  // player's aggregate stake / return / net across all their positions on it.
  const groups = new Map<string, {
    row: MyRoundRow;               // representative (asset/duration/outcome/prices/round)
    bets: MyRoundRow[];            // every position on this round, newest first
    stake: number; returned: number;
    anyOpen: boolean; latest: number;
  }>();
  for (const r of rows) {
    const g = groups.get(r.marketId) ?? { row: r, bets: [], stake: 0, returned: 0, anyOpen: false, latest: 0 };
    g.bets.push(r);
    g.stake += r.stake;
    g.returned += r.payout ?? 0;
    if (r.status === "OPEN") g.anyOpen = true;
    const at = Date.parse(r.placedAt) || 0;
    if (at >= g.latest) { g.latest = at; }
    groups.set(r.marketId, g);
  }
  // ⛔ ORDERED BY THE BAR'S SORT, PAGED BY THE BAR'S PAGER. It was hardcoded newest-placement
  //    first with no control and no paging; a player with 400 rounds got all 400 in one DOM.
  const rounds = matched
    .filter((m) => pagedIds.has(m.id))
    .map((m) => groups.get(m.id)!)
    .filter(Boolean);

  // P&L strip — ROUND-level now. A round counts once; a round is "won" when the player's
  // net on it is positive (settled, non-void). Open rounds carry no realised result.
  const settledRounds = rounds.filter((g) => !g.anyOpen && g.row.outcome !== "VOID");
  const staked = settledRounds.reduce((s, g) => s + g.stake, 0);
  const returned = settledRounds.reduce((s, g) => s + g.returned, 0);
  const net = returned - staked;
  const decided = settledRounds.length;
  const wins = settledRounds.filter((g) => g.returned > g.stake).length;
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : null;

  // UD-19 · a history that lists LIVE rounds must move when they settle. Rule-shaped
  // enablement, like `refreshCadence`: poll only while an in-play round is on screen;
  // a page of finished rounds registers nothing.
  const anyLive = rounds.some((g) => g.anyOpen);

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-6">
      <RefreshPoller intervalMs={20_000} enabled={anyLive} />
      {/* E-101b · a `#pos_…` fragment names one card in this grid; this is what scrolls to it.
          Without it the anchors render, the ring applies, and the player still lands at the top. */}
      <HashFocus />
      <BackLink fallbackHref="/updown" label={t.market.udBackToBoard} />
      <div className="mt-3">
        <PageHeader eyebrow={t.market.udTitle} title={t.market.udHistoryTitle} subtitle={t.market.udHistoryBody} />
      </div>

      {/* The day rail — the filter's state AND the way in and out of it, in one control.
          ⚠️ IT REPLACES A CHIP THAT ONLY REPORTED. The old row was a `chip-pending` badge
          naming the active day beside a `btn-ghost` clear link: it could say which day was in
          force and it could clear it, but it could not CHOOSE one. The selected pill now says
          both — which is the whole point of the one filter language, and it is why the group
          key reads "Showing": the rail is a sentence.
          ⛔ No `?day=` link may ever match `a[href^="/updown/udr_"]` — that is how
          `live-updown-digest.mjs` counts round cards. Query links are safe by construction. */}
      {/* ⭐ Search sits outside the sheet at every width — a player who can see the box knows
          the page is searchable. The asset name is the only word on one of these cards. */}
      {/* 🔴 THE BAR IS NOT INSIDE THIS WRAPPER, AND IT USED TO BE — WHICH UNPINNED IT.
          `QUERY_BAR_CLASS` is `sticky top-[56px]`, but a sticky element only sticks WITHIN its
          parent's box, and this wrapper holds the search and the bar and nothing else: measured
          2026-09-08 at 1280, it is **247px tall**, while the rows it is meant to filter live
          outside it. So the bar pinned for a quarter of a screen and then scrolled away — on the
          one route that can render four hundred rows.
          ⛔ Measured, not reasoned: `qa:bar-geometry` reported `bar@-252` here while every other
          surface reported `bar@56`. ⭐ The bar is now a direct child of the page container, which
          spans the list — the same shape the other six query surfaces already had. */}
      {allRows.length > 0 && (
        <>
        <div className="mt-4">
          <SearchBox
            placeholder={t.market.udSearchPlaceholder}
            ariaLabel={t.market.udSearchPlaceholder}
          />
        </div>
          <HistoryBar
            state={state}
            counts={counts}
            resultCount={matched.length}
            assets={[
              { id: "all", label: t.common.all },
              ...assetIds.map((a) => ({
                id: a,
                label: pickLocalized(
                  locale,
                  allRows.find((r) => r.assetKey === a)?.assetNameEn ?? a,
                  allRows.find((r) => r.assetKey === a)?.assetNameSw ?? a,
                  allRows.find((r) => r.assetKey === a)?.assetNameZh ?? null,
                ),
              })),
            ]}
            durations={["all", ...durIds]}
            dayLabel={dayKey ? formatEatDay(dayKey, t.common.monthsShort, locale) : null}
            t={t}
          />
        </>
      )}

      {matched.length === 0 ? (
        <div className="mt-6">
          {/* ⛔ FIVE CAUSES, NEVER ONE MESSAGE. It had two — "no rounds that day" and "no history
              yet" — which was right for one axis and becomes a lie the moment there are five:
              a player who filtered to `Up wins` and saw nothing would have been told they had
              never played. Each exit carries a REAL cross-filtered count, so none of them leads
              to another empty page. */}
          <EmptyState
            title={
              cause === "no-rows" ? t.market.udNoHistory
              : cause === "search-miss" ? t.market.udNoRoundsThatDay
              : cause === "window-miss" ? t.market.udNoRoundsThatDay
              : t.market.udNoRoundsThatDay
            }
            body={cause === "no-rows" ? t.market.udNoHistoryBody : t.market.udHistoryBody}
            action={
              cause === "no-rows" ? (
                <Link href="/updown" className="btn btn-primary btn-md">{t.market.udTitle}</Link>
              ) : exits.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {exits.map((e) => (
                    <Link key={e.id} href={buildUdHref(state, e.patch) as never} replace scroll={false} className="btn btn-ghost btn-sm">
                      {`${EXIT_LABEL[e.id] ?? e.id} (${e.count})`}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link href="/updown/history" className="btn btn-primary btn-md">{t.market.udAllDays}</Link>
              )
            }
          />
        </div>
      ) : (
        <>
          {/* ── P&L strip (settled rounds) ─────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-bg-elevated p-3.5">
              <div className="font-mono text-micro uppercase eyebrow text-text-faint">{t.market.udNetReturn}</div>
              <div className="mt-0.5 font-mono text-[19px] font-bold tabular-nums"
                   style={{ color: net > 0 ? "var(--yes-300)" : net < 0 ? "var(--no-300)" : "var(--text)" }}>
                {net === 0 ? formatTzs(0) : formatTzsSigned(net)}
              </div>
              <div className="amount text-micro text-text-subtle">{formatTzs(staked)} → {formatTzs(returned)}</div>
            </div>
            <div className="rounded-xl border border-border bg-bg-elevated p-3.5">
              <div className="font-mono text-micro uppercase eyebrow text-text-faint">{t.market.udRoundsPlayed}</div>
              <div className="mt-0.5 font-mono text-[19px] font-bold tabular-nums text-text">{rounds.length}</div>
              <div className="font-mono text-[10px] text-text-subtle">{rows.length} {t.market.udBets}</div>
            </div>
            <div className="rounded-xl border border-border bg-bg-elevated p-3.5 col-span-2 sm:col-span-1">
              <div className="font-mono text-micro uppercase eyebrow text-text-faint">{t.market.udWinRate}</div>
              <div className="mt-0.5 font-mono text-[19px] font-bold tabular-nums text-text">{winRate == null ? "—" : `${winRate}%`}</div>
              <div className="font-mono text-[10px] text-text-subtle">{wins}/{decided} decided</div>
            </div>
          </div>

          {/* The cap, stated — faint factual register (a fact about the list, not an alarm),
              directly under the figures it qualifies so it cannot be read in isolation. */}
          {capped && (
            <p className="mt-3 flex items-start gap-1.5 text-body-sm leading-[1.5] text-text-faint">
              <I.info s={11} className="mt-[2px] shrink-0" />
              <span>{t.market.udHistoryCapped.replace("{n}", String(UD_HISTORY_LIMIT))}</span>
            </p>
          )}

          {/* ── Rounds — one card per round; EVERY bet on it rendered as its own chip. ── */}
          <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {rounds.map((g) => {
              const r = g.row;
              const name = pickLocalized(locale, r.assetNameEn, r.assetNameSw, r.assetNameZh);
              const net = g.returned - g.stake;
              // Round outcome (what happened) — factual; the player's own result is the net.
              // ⭐ §B11 (D4) — THREE OF THESE FIVE ARMS ARE DICTIONARY WORDS AND READ IT.
              // The word a player sees here is Up & Down's own vocabulary, and the dictionary
              // is keyed on the STATE that word names, not on its spelling: "In play" IS LIVE
              // (the round is open and taking money — it even carries the live-dot), and
              // "Confirming price" IS PENDING (waiting on a queue is not a warning). The
              // UP/DOWN arms are OUTCOME words carrying the betting pair for its own meaning
              // (§B2a) and stay where they are.
              const result =
                g.anyOpen ? { variant: TONE_CHIP[STATUS_TONE.LIVE.player], label: t.market.udInPlay, live: true }
                : r.outcome === "VOID" ? { variant: TONE_CHIP[STATUS_TONE.VOID.player], label: t.market.udVoided, live: false }
                : r.outcome === "UP" ? { variant: "yes" as const, label: t.market.udUpWins, live: false }
                : r.outcome === "DOWN" ? { variant: "no" as const, label: t.market.udDownWins, live: false }
                : { variant: TONE_CHIP[STATUS_TONE.PENDING.player], label: t.market.udConfirmingPrice, live: false };
              const roundLink = r.roundId ? `/updown/${r.roundId}` : null;
              // ⛔ UD-18 · next/link, NOT a raw <a>. The anchor form made every click out
              // of history a full document reload — the slowest navigation in the
              // section, skipping the router cache and RouteTransition, with NavProgress
              // firing over a white MPA reload (a double signal). The div fallback stays
              // for rows whose round row is gone.
              const CardTag = (roundLink ? Link : "div") as React.ElementType;
              return (
                <CardTag
                  key={r.marketId}
                  /* The row's machine-readable identity — the ROUND is the row here, so the id is
                     the market, not a position. See `position-card.tsx` for the contract. */
                  data-row-id={r.marketId}
                  {...(roundLink ? { href: roundLink } : {})}
                  className={"ticket-scope block scroll-mt-24 rounded-xl border border-border bg-bg-elevated p-3.5 transition-colors" + (roundLink ? " hover:border-brand-400" : "")}
                >
                  {/* ⭐ E-101 · one anchor per bet on this round, so `/updown/history#pos_…`
                      lands on the card that holds it. A round card groups several bets, so the
                      card cannot carry a single position id — and a fragment naming nothing
                      scrolls nowhere while looking exactly like a working deep link. */}
                  {g.bets.map((b) => (
                    <span key={b.positionId} id={b.positionId} className="ticket-anchor block scroll-mt-24" aria-hidden="true" />
                  ))}
                  {/* Header: asset + duration + when · round outcome */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-display text-[14px] font-semibold text-text">
                        {/* PV-13c (2026-09-03) — was a raw `<span className="chip">`; the
                            legacy CSS family <Chip> exists to replace. `variant` defaults to
                            "neutral", the same SLATE ink/fill `.chip`'s own base rule painted. */}
                        {name} <Chip className="align-middle">{r.durationMinutes} {t.market.udMin}</Chip>
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-text-subtle">{r.assetKey} · {fmtDate(r.placedAt)}</div>
                    </div>
                    {/* `shrink-0` is kept explicitly: the kit only implies it at `size="xs"`,
                        and this row is `md`. */}
                    <Chip className="shrink-0" variant={result.variant} dot={result.live}>{result.label}</Chip>
                  </div>

                  {/* Bets on this round — EVERY position, one chip each.
                      🔴 This rendered `g.bets.slice(0, 2)` and collapsed the rest into a bare
                      `+N`. A player holding six positions on one round saw two of them and the
                      number four, on the only surface that lists their Up & Down money — and the
                      `+N` chip was not a control, so there was nowhere to go to see the rest.
                      Ali, 2026-08-15: "make it show, no matter how much position I have."
                      ⛔ THE COUNT LEADS THE ROW, it does not trail it. With ten chips the row
                      wraps to four lines at 360px in SW/ZH and a trailing count lands alone on
                      the last line, reading as a stray figure rather than a label for the group.
                      ⛔ No `max-h` and no scroll container here: clipping the row would be the
                      same defect wearing a different mechanism. The card is allowed to grow —
                      the grid's rows auto-size, and the money block below stays inside it. */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-micro uppercase tracking-[0.10em] text-text-faint">
                      {g.bets.length} {t.market.udBets}
                    </span>
                    {g.bets.map((b) => (
                      <Chip key={b.positionId} className="tabular-nums" variant={b.side === "UP" ? "yes" : "no"}>
                        {b.side === "UP" ? "↑" : "↓"} {formatTzs(b.stake)}
                      </Chip>
                    ))}
                  </div>

                  {/* Money: staked → return + net; prices. */}
                  <div className="mt-3 flex items-end justify-between gap-2 border-t border-border-subtle/60 pt-2.5">
                    <div className="font-mono text-[10.5px] text-text-subtle tabular-nums">
                      <div>{formatTzs(g.stake)}{g.anyOpen ? "" : <> → {formatTzs(g.returned)}</>}</div>
                      <div className="mt-0.5 text-[10px] text-text-faint">{usd(r.openPrice, r.decimals)} → {usd(r.closePrice, r.decimals)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-micro uppercase eyebrow text-text-faint">{t.market.udNetReturn}</div>
                      <div className="font-mono text-[15px] font-bold tabular-nums"
                           style={{ color: g.anyOpen ? "var(--text-subtle)" : net > 0 ? "var(--yes-300)" : net < 0 ? "var(--no-300)" : "var(--text)" }}>
                        {g.anyOpen ? "—" : net === 0 ? formatTzs(0) : formatTzsSigned(net)}
                      </div>
                    </div>
                  </div>
                </CardTag>
              );
            })}
          </div>
          {/* ⛔ IT WAS UNPAGED. A player with 400 rounds got all 400 in one DOM — the
              player-facing half of the no-grid-without-paging rule. The base carries every
              ACTIVE filter, so page 2 of "Up wins" is page 2 of "Up wins". */}
          {totalPages > 1 && (
            <div className="mt-4 rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
              <Pagination
                total={matched.length}
                page={safePage}
                perPage={PLAYER_PER_PAGE}
                baseHref={buildUdHref(state)}
                ofLabel={t.common.of}
                prevLabel={t.common.previousPage}
                nextLabel={t.common.nextPage}
                firstLabel={t.common.firstPage}
                lastLabel={t.common.lastPage}
              />
            </div>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-body-sm text-text-subtle">
            <I.info s={12} />
            {t.market.udHistoryBody}
          </p>
        </>
      )}
    </div>
  );
}
