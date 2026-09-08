/**
 * Market + Position DAL — feature-flagged switch between in-memory Maps
 * and Prisma tables for PredictionMarket + Position.
 *
 * Same pattern as store.ts Phase 2: USE_PRISMA_DAL=true flips to Prisma.
 * Until then, the Map-backed implementation runs (zero behavioral change).
 */
import { prisma } from "./prisma";
import { hasDatabase } from "./prisma";
import type { Prisma } from "@prisma/client";
import type { StoredMarket, StoredPosition, MarketStatus, MarketCategory, Side, ProductLine, ProductLineFilter } from "./market-service";

/**
 * The four market columns a MONEY ATTRIBUTION read actually uses — see
 * `MarketStore.attribution()` for why the projection exists.
 *
 * `titleEn` is here for ONE reason and it is load-bearing: `isDemoMarket()`
 * (market-service.ts:346) decides what a demo row is by reading `titleEn`, and
 * `categoryBreakdown` excludes demo rows from the revenue breakdown. Drop the
 * column and that exclusion silently stops happening — which changes a reported
 * money figure while every number still reconciles with itself.
 */
export type MarketAttribution = {
  id: string;
  titleEn: string;
  category: MarketCategory;
  productLine: ProductLine;
};

/**
 * What `/admin/house` needs about a market to close its book — see `MarketStore.bookByIds()`.
 *
 * ⚠️ `resolvedOutcome` is `null` for a market that has not settled AND for one whose row the
 * purge ceremony redacted. Both are real arms: the house window is ENTRY-TIME, so a live poll
 * whose player took an early exit appears in the book having genuinely moved money. ⛔ The page
 * renders the word through `outcomeWord`, never a literal — Up & Down stores `YES`/`NO` here and
 * a reader must see Up and Down.
 */
export type MarketBook = {
  id: string;
  titleEn: string;
  productLine: ProductLine;
  status: MarketStatus;
  resolvedOutcome: string | null;
  settledAt: string | null;
  yesPool: number;
  noPool: number;
  /**
   * The market's own FROZEN rates, coerced exactly as `toStoredMarket` coerces them so this
   * projection and a full row cannot disagree about the same column.
   * ⛔ Read it through `ratesFor()` (which is `snapshotOrLegacy`) and ask `hasOwnSnapshot()`
   * whether the game has its own — never inspect `stampedAt`, which two paths produce.
   */
  feeSnapshot: StoredMarket["feeSnapshot"];
};

/**
 * What a position card needs to know about its market — twelve columns, not the whole row.
 *
 * ⚠️ EVERY FIELD IS HERE BECAUSE THE PAGE READS IT, and the list is worth stating so nobody adds
 * a thirteenth by habit: the three titles (the card's headline, localised), `category` (the topic
 * filter), `status` (whether a cash-out is even possible), the two pools + `feeSnapshot`
 * (`cashOutValue`'s inputs), both deadlines (`isSelectionClosed` and the countdown ring), and
 * `selectionClosedNotifiedAt` — which is the only honest witness that the payout figure was
 * restamped, and without which the card would present a stale projection as an exact amount.
 */
export type PositionCardMarket = {
  id: string;
  titleEn: string;
  titleSw: string | null;
  titleZh: string | null;
  category: string;
  status: MarketStatus;
  yesPool: number;
  noPool: number;
  resolutionAt: string;
  selectionClosedAt: string | null;
  selectionClosedNotifiedAt: string | null;
  feeSnapshot: StoredMarket["feeSnapshot"];
};

/** The two position columns a money attribution read uses. See `PositionStore.attribution()`. */
export type PositionAttribution = { id: string; marketId: string };

// ---------------------------------------------------------------------------
// Globals — same Maps as before, just accessed through this DAL
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_MARKETS: Map<string, StoredMarket> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_POSITIONS: Map<string, StoredPosition> | undefined;
}
const markets: Map<string, StoredMarket> = globalThis.__50PICK_MARKETS ?? (globalThis.__50PICK_MARKETS = new Map());
const positions: Map<string, StoredPosition> = globalThis.__50PICK_POSITIONS ?? (globalThis.__50PICK_POSITIONS = new Map());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}
function num(d: unknown): number {
  if (d == null) return 0;
  return Number(d);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredMarket(r: any): StoredMarket {
  return {
    id: r.id,
    titleEn: r.titleEn,
    titleSw: r.titleSw,
    titleZh: r.titleZh ?? null,
    category: r.category as MarketCategory,
    sourceUrl: r.sourceUrl,
    resolutionCriterion: r.resolutionCriterion,
    resolutionCriterionSw: r.resolutionCriterionSw ?? null,
    resolutionCriterionZh: r.resolutionCriterionZh ?? null,
    resolutionAt: iso(r.resolutionAt)!,
    selectionClosedAt: iso(r.selectionClosedAt) ?? null,
    status: r.status as MarketStatus,
    yesPool: num(r.yesPool),
    noPool: num(r.noPool),
    predictorCount: r.predictorCount,
    // The poll's frozen rates. Settlement prices against this, never live config.
    feeSnapshot: (r.feeSnapshot as StoredMarket["feeSnapshot"]) ?? null,
    resolvedOutcome: r.resolvedOutcome as Side | "VOID" | null,
    resolutionStage1By: r.resolutionStage1By,
    resolutionStage1At: iso(r.resolutionStage1At),
    resolutionStage2By: r.resolutionStage2By,
    resolutionStage2At: iso(r.resolutionStage2At),
    objectionsClosedAt: iso(r.objectionsClosedAt),
    settledAt: iso(r.settledAt),
    resolutionEvidence: r.resolutionEvidence ?? null,
    resolutionNotifiedAt: iso(r.resolutionNotifiedAt) ?? null,
    selectionClosedNotifiedAt: iso(r.selectionClosedNotifiedAt) ?? null,
    closingSoonNotifiedAt: iso(r.closingSoonNotifiedAt) ?? null,
    sentinelOutcome: r.sentinelOutcome ?? null,
    sentinelEvidence: r.sentinelEvidence ?? null,
    sentinelReasoning: r.sentinelReasoning ?? null,
    sentinelSourceUrl: r.sentinelSourceUrl ?? null,
    sentinelConfidence: r.sentinelConfidence ?? null,
    sentinelClosedAt: iso(r.sentinelClosedAt) ?? null,
    // ⛔ `?? null`, never `?? false`. NULL means the flag was never recorded (every row
    // assessed before the column existed); `false` means the AI actively said the outcome
    // is NOT locked. The resolver queue's auto-resolve verdict blocks on both but names
    // them differently — coercing here would erase that distinction at the one place that
    // still knows it, and "the AI refused" is not a thing we may say about a row that was
    // never asked.
    sentinelDetermined: r.sentinelDetermined ?? null,
    resolutionMode: (r.resolutionMode as StoredMarket["resolutionMode"]) ?? null,
    resolveClaimedAt: iso(r.resolveClaimedAt) ?? null,
    // Coerced, not trusted: a row read before the column existed (or through an old
    // client) has no value, and every such row is a long-form poll.
    productLine: r.productLine === "UPDOWN" ? "UPDOWN" : "MARKET",
    proposedBy: r.proposedBy,
    createdAt: iso(r.createdAt)!,
    updatedAt: iso(r.updatedAt)!,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStoredPosition(r: any): StoredPosition {
  return {
    id: r.id,
    userId: r.userId,
    marketId: r.marketId,
    side: r.side as Side,
    stake: num(r.stake),
    bonusStakeTzs: r.bonusStakeTzs != null ? num(r.bonusStakeTzs) : 0,
    potentialPayout: num(r.potentialPayout),
    status: r.status as StoredPosition["status"],
    finalPayout: r.finalPayout != null ? num(r.finalPayout) : null,
    placedAt: iso(r.placedAt)!,
    settledAt: iso(r.settledAt),
    idempotencyKey: r.idempotencyKey ?? null,
  };
}

// ---------------------------------------------------------------------------
// Market store interface
// ---------------------------------------------------------------------------

export interface MarketStore {
  // tx: read THROUGH the enclosing lock's transaction. The bet path holds one
  // transaction for the whole bet (see locks.ts); reading on a separate pool
  // connection would both cost an extra connection and miss this transaction's
  // own uncommitted writes.
  get(id: string, tx?: Prisma.TransactionClient | null): Promise<StoredMarket | null>;
  // tx (bet-stake single-tx): pass a Prisma transaction client to persist the
  // pool mutation in the SAME transaction as the stake's wallet/txn/ledger
  // movement, so a mid-bet failure rolls the pool increment back with the debit.
  // Ignored by the in-memory store (same contract as PositionStore.set below).
  set(m: StoredMarket, tx?: Prisma.TransactionClient | null): Promise<void>;
  /**
   * Narrow UPDATE of ONLY the named columns.
   *
   * `set` is a FULL-ROW upsert whose update block rewrites yesPool/noPool/
   * predictorCount unconditionally. Every sweep that merely stamps a timestamp on
   * a LIVE market used to read the row, spread it, and write the whole thing
   * back — so a bet that incremented the pool between that read and that write
   * had its stake ERASED. The market advisory lock was the only thing preventing
   * it. Stamping narrowly removes the lost-update window itself, which is what
   * makes it safe to stop taking the market lock on the bet path.
   */
  stamp(id: string, fields: Partial<StoredMarket>, tx?: Prisma.TransactionClient | null): Promise<void>;
  /**
   * Atomic pool delta — `yesPool`/`noPool`/`predictorCount` by increment, never
   * by read-modify-write. Mirrors db.wallet.adjust: the database computes the new
   * value, so concurrent writers cannot clobber each other.
   */
  addToPool(
    id: string,
    deltas: { yesPool?: number; noPool?: number; predictorCount?: number },
    tx?: Prisma.TransactionClient | null,
  ): Promise<{ yesPool: number; noPool: number } | null>;
  delete(id: string): Promise<void>;
  has(id: string): Promise<boolean>;
  values(): Promise<StoredMarket[]>;
  /**
   * Just the two pool columns, for many markets, in ONE query (E-90).
   *
   * ⭐ The chain-health cell has to know whether each resolved round found a counterparty,
   * and that fact lives on the market, not the round. `get()` per round is N round-trips
   * over a 7-day window; `values()` is the whole table. This is the narrow middle: one
   * indexed `findMany` over the ids the caller already holds, selecting two columns.
   *
   * Absent ids are simply absent from the map — a caller must decide what a missing market
   * means rather than inherit a zero that reads exactly like an empty pool.
   */
  poolsByIds(ids: readonly string[]): Promise<Map<string, { yesPool: number; noPool: number }>>;
  /**
   * THE POSITION-CARD PROJECTION — the columns `/positions` needs, for the ids it already holds.
   *
   * 🔴 WHY IT EXISTS, AND IT IS NOT AN OPTIMISATION. `/positions` issued **one `getMarket` per
   * rendered position, awaited in series** — and `get()` is a full-row `findUnique` over the same
   * very wide `PredictionMarket` table the note on `attribution()` above measures at 2,534 ms for
   * ONE such read. Re-derive the loop it replaced:
   *
   *     git log -S "marketMap.set(mid, await getMarket(mid))" -- src/app/positions/page.tsx
   *
   * ⭐ AND THE PLAYER QUERY CAMPAIGN MADE IT LOAD-BEARING RATHER THAN MERELY SLOW. Searching and
   * sorting by market TITLE needs titles for **every** position a player holds, not only the
   * twelve on screen — and the old loop was fed from `open + pagedSettled`, i.e. the rows that
   * survived paging. A filter computed over the rendered page is not a filter.
   *
   * ⚠️ IT IS NOT CALLED `titlesByIds`, which is what the campaign's plan provisionally named it.
   * It returns pools and a fee snapshot too, because the page prices a live cash-out from them; a
   * function called `titles…` that hands back money inputs is the §L1 defect — a name that does
   * not describe the thing — in the data layer instead of the UI.
   *
   * Absent ids are absent from the map, exactly as `poolsByIds` and `bookByIds` do: a caller must
   * decide what a missing market means rather than inherit a default that reads like data.
   */
  positionCardsByIds(ids: readonly string[]): Promise<Map<string, PositionCardMarket>>;
  /**
   * WHOLE MARKET ROWS for the ids a caller already holds.
   *
   * 🔴 WHY IT EXISTS. `/watchlist` hydrated a handful of starred cards by reading the ENTIRE
   * board — `listMarkets({ productLine: "ALL" })`, which has no limit and no status filter — and
   * then threw away every row the player had not starred. That is the same very wide table
   * `attribution()` below measures at ~13,000 rows and 2,534 ms for ONE such read, and the
   * watchlist re-paid it every 20 SECONDS because the page polls.
   *
   * ⚠️ IT RETURNS FULL ROWS, unlike `positionCardsByIds`' twelve columns, and that is deliberate:
   * a market CARD reads a wide slice (both pools, predictor count, both deadlines, outcome,
   * product line, all three titles, source URL) and a projection that missed one would fail at the
   * call site rather than here. The saving being bought is the ROW COUNT, which is the half that
   * grows; the column count for a dozen starred markets is not the problem.
   *
   * ⛔ THERE IS NO `productLine` PARAMETER AND NO DEMO FILTER. This is the raw store read; the
   * player-facing rule that hides `Demo · ` fixtures lives one layer up in
   * `market-service.playerMarketsByIds`, so a money read can still see every row it is owed.
   *
   * Absent ids are absent from the map, exactly as `poolsByIds` and `positionCardsByIds` do.
   */
  marketsByIds(ids: readonly string[]): Promise<Map<string, StoredMarket>>;
  /**
   * THE MONEY-ATTRIBUTION PROJECTION — every market row, four columns.
   *
   * 🔴 WHY IT EXISTS, measured on production 2026-08-29. `categoryBreakdown()` and
   * `moneyByGame()` both need a `marketId → (category | productLine)` lookup, and both got
   * it by reading the WHOLE market row: `listMarkets({ productLine: "ALL" })` and
   * `values()`. `PredictionMarket` is a very wide table — three titles, three resolution
   * criteria, `resolutionEvidence`/`sentinelEvidence`/`sentinelReasoning`/`purgeReason` all
   * `@db.Text`, plus a `feeSnapshot` JSON blob — and there are ~13,000 rows because every
   * Up & Down round is one. `/admin/reports` did that read TWICE per render.
   *
   * Measured, best of three, `loadEventEnd` on production: `/admin/roles` (a shell-only
   * admin page) **292 ms**, `/admin/insights` (ONE such read) **2,534 ms**,
   * `/admin/reports` (TWO) **4,615 ms** — and `/admin/reports` moved by under 500 ms
   * between a `today` window and a `30d` one, so the cost is NOT the transaction query.
   * It is the columns.
   *
   * ⛔ THERE IS NO `productLine` PARAMETER, AND THAT IS THE DESIGN. This read is only ever
   * used to attribute money, and a money read that could exclude Up & Down is the exact
   * defect `npm run test:product-line` exists to prevent (see the READ-PATH RULE on
   * `listMarkets`). Being unable to filter is what makes it safe; do not add one.
   */
  attribution(): Promise<MarketAttribution[]>;
  /**
   * THE HOUSE-BOOK PROJECTION — the columns `/admin/house` needs, for the ids it already holds.
   *
   * ⭐ THE LEDGER IS THE LEFT SIDE OF THIS JOIN. `readGameRows()` returns every `marketId` that
   * moved money in the window; this fills in what each one is CALLED and how it settled. So the
   * caller never asks the market table which games to show — it asks the books, and the market
   * table only supplies names. A game whose row is gone still has its money.
   *
   * ⛔ THERE IS NO `productLine` PARAMETER, FOR EXACTLY THE REASON `attribution()` HAS NONE.
   * Up & Down rounds are 353 of the 467 named markets that have moved money on production, so a
   * filter here could silently delete three quarters of the owner's book — and every number
   * would still reconcile with itself. Being unable to filter is what makes it safe.
   *
   * ⛔ AND DO NOT REACH FOR `listMarkets()` INSTEAD. It defaults to `productLine: "MARKET"` AND
   * drops `Demo · ` rows, so it would do both halves of that damage at once; `test:product-line`
   * would then require an opt-in entry, and its trap is a hand-written list — a page that never
   * calls it is safe by construction rather than by remembering.
   *
   * Absent ids are absent from the map. The page renders those as a labelled row carrying the
   * raw id: on production the SECOND-largest earner in the whole book (22,321 TZS) has no market
   * row, so dropping the unmatched ids would break the reconciliation identity by that much.
   */
  bookByIds(ids: readonly string[]): Promise<Map<string, MarketBook>>;
  /**
   * Every market with a PENDING time-based transition — i.e. what the per-market
   * scheduler must arm a timer for: LIVE markets (closing-soon / selection-closed /
   * resolve triggers) and adjudicated-but-unsettled markets (settle trigger).
   *
   * A TARGETED, INDEXED query — never `values()`. The scheduler hydrates + reconciles
   * off this, so on a board with thousands of settled markets it reads only the
   * handful still in flight (status is indexed; settledAt filters the small residue).
   *
   * `productLine` defaults to `"MARKET"`: Up & Down rounds are driven by their own
   * per-CHAIN scheduler, so the per-market scheduler must not arm timers for them.
   */
  pending(productLine?: ProductLineFilter): Promise<StoredMarket[]>;
  /**
   * THE BOARD QUERY — an INDEXED `findMany`, pushed down to Postgres.
   *
   * This replaces `values()` on every listing path. `values()` reads the ENTIRE table
   * and the caller filters in JS; that was survivable while the table held tens of
   * long-form polls, and stops being survivable the moment Up & Down starts emitting
   * a row every few minutes (~300k rows/year). Served by
   * `@@index([productLine, status, resolutionAt])`.
   *
   * `productLine` is REQUIRED here on purpose — a caller must state which product it
   * means rather than inheriting a silent default at this layer. `listMarkets()` in
   * market-service.ts is where the `"MARKET"` default lives, in one place, next to
   * the rule that explains it.
   */
  listBoard(q: {
    productLine: ProductLineFilter;
    status?: MarketStatus;
    category?: MarketCategory;
    /** Cap the rows returned. Omit for "all of them" (the historical behaviour). */
    limit?: number;
  }): Promise<StoredMarket[]>;
}

export interface PositionStore {
  get(id: string): Promise<StoredPosition | null>;
  // tx (audit C3): pass a Prisma transaction client to persist the position in
  // the SAME transaction as its wallet/txn/ledger movement (settlement), so a
  // credit and its "paid" mark commit together — no double-pay on resume, no
  // ledger loss. Ignored by the in-memory store.
  set(p: StoredPosition, tx?: Prisma.TransactionClient | null): Promise<void>;
  values(): Promise<StoredPosition[]>;
  /**
   * Every OPEN position, pushed down to the database.
   *
   * 🔴 EXISTS BECAUSE `values()` RUNS ON EVERY BOOT. `repairOrphanedPositions()` loaded the
   * whole Position table and filtered `status !== "OPEN"` in JS — 919 rows to reach 129 on
   * production 2026-08-20, and the table grows by one row per bet forever, on a product
   * whose Up & Down side creates rounds all day. A boot-path whole-table read is the shape
   * that already exhausted the connection pool once, on /leaderboard.
   *
   * ⛔ Do NOT widen this into a general `listByStatus`. The repair is the only caller that
   * wants every open position across every market regardless of user, and an open-ended
   * status query is how a whole-table read comes back wearing a narrower name.
   */
  listOpen(): Promise<StoredPosition[]>;
  /**
   * A user's positions, newest first. `productLine` filters to ONE game via the
   * market relation — `"MARKET"` for the Bets page (long-form polls), `"UPDOWN"` for
   * the Up & Down history, omitted for everything (both games), which is the historical
   * behaviour. The two games are separate portfolios (Ali, 2026-07-25), and doing the
   * filter as an indexed JOIN here keeps a heavy Up & Down player's Bets page from
   * loading — and then discarding — thousands of round positions.
   */
  listForUser(userId: string, limit?: number, productLine?: ProductLineFilter): Promise<StoredPosition[]>;
  /**
   * The public leaderboard, aggregated in the database.
   *
   * 🔴 WHY THIS EXISTS. `/leaderboard` loaded EVERY user with no `where` or `take`, then
   * fired one positions query per user "in parallel" — a comment in the page claimed
   * "N+1 → 1", but making an N+1 parallel does not remove it, it just points all of it at
   * the connection pool at once. Measured on 1,000 users
   * (`scripts/load/s13-scale-ceilings.mts`): ~2,270 ms, and the run **exhausted the pool**
   * and started failing mid-sweep. On a PUBLIC page, on a product whose pitch is live
   * odds, where the trigger is somebody sharing the link.
   *
   * One GROUP BY instead. Only settled positions count, ordered by ROI, limited — the
   * same rows the page rendered, chosen by the database rather than by loading the
   * platform into memory and sorting it there.
   */
  /**
   * ⛔ `opts` IS NOT A CONVENIENCE — THE ORDER BY *IS* THE SELECTION ON THIS BOARD.
   *
   * 🔴 The aggregate returns the top `limit` rows chosen BY the ordering, so a JS sort applied
   * afterwards would answer a different question from the one its label asks. "Most staked" over
   * a ROI-selected fifty means *the biggest staker among the fifty best ROIs* — a player with the
   * platform's largest book and a poor ROI is not in the fifty, never appears, and nothing on the
   * page says so. That is §3 rule 4's own failure ("the number was true and the board was still a
   * lie") with the promise moved from a count into a sort label.
   *
   * ⚠️ The direction matters for the same reason: `?sort=roi&dir=asc` over a JS re-sort would read
   * "the worst predictors" and in fact be "the 50th- through 1st-BEST".
   *
   * ⛔ THE URL NEVER REACHES THE SQL. `sort` and `dir` are closed sets narrowed by `oneOf` before
   * they get here, and they select a LITERAL fragment from a table — no interpolation of request
   * text, at any point.
   */
  leaderboard(limit: number, opts?: { sort: LeaderSortKey; dir: "asc" | "desc" }): Promise<Array<{
    userId: string;
    resolved: number;
    staked: number;
    paidOut: number;
  }>>;
  listForMarket(marketId: string): Promise<StoredPosition[]>;
  /**
   * Positions across a KNOWN SET of markets, in one indexed query.
   *
   * ⛔ THE REASON THIS EXISTS. `traderSeedsByMarket()` — the crest-stack on every card —
   * used `values()`, i.e. the ENTIRE Position table, on every render of the board, the
   * homepage and the watchlist, and again on each 30-second auto-refresh. It was
   * commented "cheap: O(positions), not O(markets × positions)", which is true and is
   * the wrong comparison: the board needs positions for the ~12 markets it is drawing,
   * not for every market that ever existed. Position rows are financial records and are
   * never pruned (privacy.ts refuses erasure), so that scan only ever grows, and the Up
   * & Down rounds share the table — on production it is already ~20× the poll rows.
   *
   * Served by `@@index([marketId, status])`. Never call this with an unbounded id list;
   * the board passes exactly the page it is rendering.
   */
  listForMarkets(marketIds: string[]): Promise<StoredPosition[]>;
  /**
   * The money-attribution twin of `MarketStore.attribution()` — every position row, two
   * columns, so a caller can build `positionId → marketId` without hydrating stakes,
   * payouts, decimals and timestamps it never reads.
   *
   * ⚠️ It is still a WHOLE-TABLE read, and it is deliberate: the callers are the platform
   * money aggregates, which attribute every bet transaction in a window and cannot know
   * which positions those are without the map. `listForMarkets` is the right primitive
   * when the caller already holds the ids; this one is for when it does not.
   */
  attribution(): Promise<PositionAttribution[]>;
  /**
   * One player's positions on one market.
   *
   * ⛔ NOT `listForMarket(...).filter(...)`. The one-side-per-round rule reads this INSIDE the
   * wallet lock on the money path, and on a busy market that would pull every player's
   * positions across the wire to answer a question about one of them — a per-bet cost that
   * grows with the market's popularity. `tx` so it joins the bet's own transaction rather
   * than taking a second pool connection, exactly like the idempotency probe above.
   */
  listForUserAndMarket(userId: string, marketId: string, tx?: Prisma.TransactionClient | null): Promise<StoredPosition[]>;
  // tx: see MarketStore.get — the idempotency probe runs inside the bet's
  // transaction so it costs no extra pool connection.
  findByIdempotencyKey(key: string, tx?: Prisma.TransactionClient | null): Promise<StoredPosition | null>;
  /**
   * Per-player settled totals for ONE product line inside a half-open window
   * `[fromIso, toIso)`. The aggregation the Up & Down **daily digest** is built
   * from (E-37) — one row per player who had a round settle that day.
   *
   * ⚠️ AGGREGATED IN THE DATABASE, deliberately, and for the reason spelled out
   * on `leaderboard()` above: the digest runs over EVERY player who played that
   * day, and loading a day of rounds into the app to count them in JS is the
   * same N+1 shape that exhausted the pool on `/leaderboard`. A busy day is
   * thousands of rounds and a handful of players; this returns the handful.
   *
   * ⛔ The window is on `settledAt`, NOT on the round's boundary — and that is
   * what makes the digest exactly-once. `settledAt` is stamped `new Date()` at
   * the moment settlement commits (`market-service.ts`, never backdated), so
   * once an EAT day is over nothing can appear inside it retroactively. A round
   * healed hours late lands in the digest for the day it actually settled: late,
   * but stated, and counted exactly once.
   *
   * Only terminal, money-moved states count. Measured on production 2026-08-02:
   * Up & Down positions have only ever held `WIN`, `LOSS`, `VOID` — there is no
   * cash-out on a 5-minute round — so those three are the complete set, not a
   * guess.
   */
  dailyTotalsByUser(q: {
    fromIso: string;
    toIso: string;
    productLine: "MARKET" | "UPDOWN";
  }): Promise<DailySettledTotals[]>;
}

/**
 * One player's settled day, as the digest states it.
 *
 * `returned` is what actually reached the wallet across all three outcomes —
 * winnings, plus refunded stakes. `staked − returned` is therefore the day's net
 * in the player's own terms, and the digest prints it that way round: a losing
 * day reads as a loss, plainly.
 */
export type DailySettledTotals = {
  userId: string;
  rounds: number;
  wins: number;
  losses: number;
  refunds: number;
  /** Total staked across every settled round in the window. */
  staked: number;
  /** Total returned to the wallet: winnings + refunds. Losses return 0. */
  returned: number;
  /** Payout on WIN rounds only — the number a winner wants to see. */
  wonPayout: number;
  /** Stake on LOSS rounds only — the number LCCP requires stated plainly. */
  lostStake: number;
  /** Stake returned on VOID rounds only. */
  refundedStake: number;
};

// ---------------------------------------------------------------------------
// Memory implementations (current behavior, sync but wrapped in Promise)
// ---------------------------------------------------------------------------

const memoryMarkets: MarketStore = {
  async get(id, _tx) { return markets.get(id) ?? null; },
  async set(m, _tx) { markets.set(m.id, m); },
  async stamp(id, fields, _tx) {
    const cur = markets.get(id);
    if (cur) markets.set(id, { ...cur, ...fields });
  },
  async addToPool(id, deltas, _tx) {
    const cur = markets.get(id);
    if (!cur) return null;
    // The in-memory Map is single-process and every caller is serialized by the
    // in-memory mutex, so a read-modify-write is safe HERE (it is not on Postgres).
    cur.yesPool += deltas.yesPool ?? 0;
    cur.noPool += deltas.noPool ?? 0;
    cur.predictorCount += deltas.predictorCount ?? 0;
    cur.updatedAt = new Date().toISOString();
    return { yesPool: cur.yesPool, noPool: cur.noPool };
  },
  async delete(id) { markets.delete(id); },
  async has(id) { return markets.has(id); },
  async values() { return Array.from(markets.values()); },
  async attribution() {
    // The projection is free in memory; it exists so a test that passes here means the
    // same thing in production — the Prisma twin returns exactly these four fields.
    return Array.from(markets.values()).map((m) => ({
      id: m.id,
      titleEn: m.titleEn,
      category: m.category,
      productLine: m.productLine ?? "MARKET",
    }));
  },
  async poolsByIds(ids) {
    const out = new Map<string, { yesPool: number; noPool: number }>();
    for (const id of ids) {
      const m = markets.get(id);
      if (m) out.set(id, { yesPool: m.yesPool, noPool: m.noPool });
    }
    return out;
  },
  async marketsByIds(ids) {
    const out = new Map<string, StoredMarket>();
    for (const id of ids) {
      const m = markets.get(id);
      if (m) out.set(id, m);
    }
    return out;
  },
  async positionCardsByIds(ids) {
    // Same twelve fields as the Prisma twin, so a suite that passes here means the same thing
    // in production. ⛔ BOTH HALVES EXIST OR NEITHER DOES.
    const out = new Map<string, PositionCardMarket>();
    for (const id of ids) {
      const m = markets.get(id);
      if (!m) continue;
      out.set(id, {
        id: m.id,
        titleEn: m.titleEn,
        titleSw: m.titleSw ?? null,
        titleZh: m.titleZh ?? null,
        category: m.category,
        status: m.status,
        yesPool: m.yesPool,
        noPool: m.noPool,
        resolutionAt: m.resolutionAt,
        selectionClosedAt: m.selectionClosedAt ?? null,
        selectionClosedNotifiedAt: m.selectionClosedNotifiedAt ?? null,
        feeSnapshot: m.feeSnapshot ?? null,
      });
    }
    return out;
  },
  async bookByIds(ids) {
    // Same nine fields as the Prisma twin, so a test that passes here means the same thing
    // in production. ⛔ No product filter — see the interface comment.
    const out = new Map<string, MarketBook>();
    for (const id of ids) {
      const m = markets.get(id);
      if (!m) continue;
      out.set(id, {
        id: m.id,
        titleEn: m.titleEn,
        productLine: (m.productLine === "UPDOWN" ? "UPDOWN" : "MARKET") as ProductLine,
        status: m.status,
        resolvedOutcome: m.resolvedOutcome ?? null,
        settledAt: m.settledAt ?? null,
        yesPool: m.yesPool,
        noPool: m.noPool,
        feeSnapshot: m.feeSnapshot ?? null,
      });
    }
    return out;
  },
  async pending(productLine = "MARKET") {
    return Array.from(markets.values())
      .filter((m) => productLine === "ALL" || (m.productLine ?? "MARKET") === productLine)
      .filter((m) => m.status === "LIVE" || ((m.status === "RESOLVED" || m.status === "VOIDED") && !m.settledAt));
  },
  async listBoard(q) {
    const rows = Array.from(markets.values())
      .filter((m) => q.productLine === "ALL" || (m.productLine ?? "MARKET") === q.productLine)
      .filter((m) => !q.status || m.status === q.status)
      .filter((m) => !q.category || m.category === q.category)
      // Same ordering as the Prisma implementation, so a test that passes in memory
      // means the same thing in production.
      .sort((a, b) => a.resolutionAt.localeCompare(b.resolutionAt));
    return q.limit != null ? rows.slice(0, q.limit) : rows;
  },
};

const memoryPositions: PositionStore = {
  async get(id) { return positions.get(id) ?? null; },
  async set(p, _tx) { positions.set(p.id, p); },
  async values() { return Array.from(positions.values()); },
  async attribution() {
    return Array.from(positions.values()).map((p) => ({ id: p.id, marketId: p.marketId }));
  },
  async listOpen() { return Array.from(positions.values()).filter((p) => p.status === "OPEN"); },
  async listForUser(userId, limit = 100, productLine) {
    const pl = productLine && productLine !== "ALL" ? productLine : null;
    return Array.from(positions.values())
      .filter((p) => p.userId === userId)
      .filter((p) => !pl || (markets.get(p.marketId)?.productLine ?? "MARKET") === pl)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
      .slice(0, limit);
  },
  async listForMarket(marketId) {
    return Array.from(positions.values()).filter((p) => p.marketId === marketId);
  },
  async listForMarkets(marketIds) {
    if (marketIds.length === 0) return [];
    const want = new Set(marketIds);
    return Array.from(positions.values()).filter((p) => want.has(p.marketId));
  },
  async listForUserAndMarket(userId, marketId) {
    return Array.from(positions.values()).filter((p) => p.userId === userId && p.marketId === marketId);
  },
  async leaderboard(limit, opts) {
    // Same shape as the SQL below, so the page renders identical rows either way.
    const acc = new Map<string, { resolved: number; staked: number; paidOut: number }>();
    for (const p of positions.values()) {
      if (p.status === "OPEN") continue;
      const e = acc.get(p.userId) ?? { resolved: 0, staked: 0, paidOut: 0 };
      e.resolved += 1;
      e.staked += p.stake;
      e.paidOut += p.finalPayout ?? 0;
      acc.set(p.userId, e);
    }
    // ⛔ THROUGH THE SHARED COMPARATOR, not a local `roiOf(b) - roiOf(a)`. The ordering CHOOSES
    //    the rows here (`.slice(limit)` below), so the two stores disagreeing about it would mean
    //    two different boards — and `test:dal-parity` exists because they have disagreed before.
    return Array.from(acc, ([userId, v]) => ({ userId, ...v }))
      .sort((a, b) => leaderboardCompare(opts, a, b))
      .slice(0, limit);
  },
  async findByIdempotencyKey(key, _tx) {
    for (const p of positions.values()) if (p.idempotencyKey === key) return p;
    return null;
  },
  async dailyTotalsByUser({ fromIso, toIso, productLine }) {
    // Same shape as the SQL below, so the digest a behaviour test observes in
    // memory is the digest production sends. The two must not drift.
    const acc = new Map<string, DailySettledTotals>();
    for (const p of positions.values()) {
      if (!DIGESTED_STATUSES.includes(p.status as (typeof DIGESTED_STATUSES)[number])) continue;
      if (!p.settledAt || p.settledAt < fromIso || p.settledAt >= toIso) continue;
      if ((markets.get(p.marketId)?.productLine ?? "MARKET") !== productLine) continue;
      const e = acc.get(p.userId) ?? {
        userId: p.userId, rounds: 0, wins: 0, losses: 0, refunds: 0,
        staked: 0, returned: 0, wonPayout: 0, lostStake: 0, refundedStake: 0,
      };
      e.rounds += 1;
      e.staked += p.stake;
      e.returned += p.finalPayout ?? 0;
      if (p.status === "WIN") { e.wins += 1; e.wonPayout += p.finalPayout ?? 0; }
      else if (p.status === "LOSS") { e.losses += 1; e.lostStake += p.stake; }
      else { e.refunds += 1; e.refundedStake += p.finalPayout ?? 0; }
      acc.set(p.userId, e);
    }
    return Array.from(acc.values()).sort((a, b) => b.rounds - a.rounds);
  },
};

/** The only three states an Up & Down position has ever reached — measured on
 *  production 2026-08-02, not assumed. Shared by both stores so the memory
 *  mirror and the SQL cannot disagree about what "settled" means. */
const DIGESTED_STATUSES = ["WIN", "LOSS", "VOID"] as const;

/** ROI as the leaderboard defines it, in ONE place so the two stores and the page
 *  cannot drift into ranking by three slightly different numbers. */
export function roiOf(r: { staked: number; paidOut: number }): number {
  return r.staked > 0 ? ((r.paidOut - r.staked) / r.staked) * 100 : 0;
}

/**
 * The four orderings the leaderboard can be selected by. ⛔ A CLOSED SET, and the only thing the
 * URL contributes is which member of it — the fragments themselves are literals in this file.
 *
 * ⚠️ `streak` IS DELIBERATELY ABSENT and the page's own note says why: it is not in this aggregate
 * and cannot be pushed down, so offering it would mean re-ordering an already-chosen fifty — the
 * exact defect this whole seam exists to prevent.
 */
export type LeaderSortKey = "roi" | "net" | "staked" | "resolved";

/**
 * The ORDER BY for one leaderboard sort, as literal SQL.
 *
 * ⛔ `nulls last` IS WRITTEN ON BOTH DIRECTIONS, EXPLICITLY, AND THAT IS NOT NOISE. Postgres
 * defaults to `nulls first` for `desc` and `nulls last` for `asc` — so a player whose ROI is NULL
 * (a zero-stake group, which `nullif(sum("stake"), 0)` produces) would sit at the TOP of an
 * ascending board and the BOTTOM of a descending one. `lib/query/sort.ts` states the same rule for
 * the JS comparator in its own words: rows with no value for this sort go last in BOTH directions,
 * because coercing them lands them last one way and FIRST the moment the reader flips the arrow.
 * The two halves of the product must agree about it.
 *
 * ⭐ EVERY SORT CARRIES ITS TIE-BREAK IN THE SQL, mirroring the contract's `tieBreak` record. Two
 * players with an identical ROI are not interchangeable, and without a tie-break their order is
 * whatever the plan happened to produce — on a public board that re-reads every 30 seconds, that
 * is a ranking that reshuffles under the reader for no reason they can see.
 */
const LEADERBOARD_ORDER: Record<LeaderSortKey, string> = {
  roi: `(coalesce(sum("finalPayout"), 0) - coalesce(sum("stake"), 0)) / nullif(sum("stake"), 0)`,
  net: `(coalesce(sum("finalPayout"), 0) - coalesce(sum("stake"), 0))`,
  staked: `coalesce(sum("stake"), 0)`,
  resolved: `count(*)`,
};

/** The secondary keys, per sort — identical in intent to the contract's `tieBreak`. */
const LEADERBOARD_TIE: Record<LeaderSortKey, string> = {
  roi: `count(*) desc`,
  net: `coalesce(sum("stake"), 0) desc`,
  staked: `count(*) desc`,
  resolved: `(coalesce(sum("finalPayout"), 0) - coalesce(sum("stake"), 0)) / nullif(sum("stake"), 0) desc nulls last`,
};

export function leaderboardOrderBy(opts?: { sort: LeaderSortKey; dir: "asc" | "desc" }): string {
  // ⛔ The default is ROI descending — byte-identical to the ordering this board shipped with, so
  //    `/leaderboard` with no params renders exactly the page a player already knows.
  const sort: LeaderSortKey = opts?.sort ?? "roi";
  const dir = opts?.dir === "asc" ? "asc" : "desc";
  // ⛔ `"userId" asc` LAST, ALWAYS — the total order. Without a final unique key the tie-break
  //    itself can tie, and the board reshuffles between two polls.
  return `${LEADERBOARD_ORDER[sort]} ${dir} nulls last, ${LEADERBOARD_TIE[sort]}, "userId" asc`;
}

/** The in-memory twin of one leaderboard ordering. ⛔ Must agree with `LEADERBOARD_ORDER`. */
export function leaderboardCompare(
  opts: { sort: LeaderSortKey; dir: "asc" | "desc" } | undefined,
  a: { userId: string; resolved: number; staked: number; paidOut: number },
  b: { userId: string; resolved: number; staked: number; paidOut: number },
): number {
  const sort: LeaderSortKey = opts?.sort ?? "roi";
  const dir = opts?.dir === "asc" ? "asc" : "desc";
  // ⛔ `null` FOR A ZERO-STAKE ROI, mirroring `nullif(sum("stake"), 0)`. `roiOf` returns 0 there,
  //    and 0 is a POSITION on this scale rather than an absence — the memory store used to rank
  //    such a row as "exactly break-even" while the SQL excluded it from the ordering entirely.
  const key = (r: { resolved: number; staked: number; paidOut: number }): number | null => {
    switch (sort) {
      case "roi": return r.staked > 0 ? roiOf(r) : null;
      case "net": return r.paidOut - r.staked;
      case "staked": return r.staked;
      case "resolved": return r.resolved;
    }
  };
  const ka = key(a), kb = key(b);
  // Nulls last in BOTH directions — the same rule the SQL writes as `nulls last` twice.
  if (ka == null && kb == null) return 0;
  if (ka == null) return 1;
  if (kb == null) return -1;
  const primary = dir === "asc" ? ka - kb : kb - ka;
  if (primary !== 0) return primary;
  const tie =
    sort === "net" ? b.staked - a.staked
    : sort === "resolved" ? (b.staked > 0 ? roiOf(b) : -Infinity) - (a.staked > 0 ? roiOf(a) : -Infinity)
    : b.resolved - a.resolved;
  return tie !== 0 ? tie : (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Prisma implementations
// ---------------------------------------------------------------------------

function pc() {
  const c = prisma();
  if (!c) throw new Error("market-dal: DATABASE_URL required");
  return c;
}

/** Columns `stamp` is allowed to write, and how to coerce each to a DB value.
 *  An allowlist rather than a spread so `stamp` can never be handed a whole
 *  StoredMarket and quietly become the full-row write it exists to replace. */
const STAMPABLE: Record<string, (v: unknown) => unknown> = {
  status: (v) => v,
  resolvedOutcome: (v) => v,
  resolutionEvidence: (v) => v,
  resolutionStage1By: (v) => v,
  resolutionStage2By: (v) => v,
  settledAt: (v) => (v ? new Date(v as string) : null),
  resolutionStage1At: (v) => (v ? new Date(v as string) : null),
  resolutionStage2At: (v) => (v ? new Date(v as string) : null),
  objectionsClosedAt: (v) => (v ? new Date(v as string) : null),
  resolutionNotifiedAt: (v) => (v ? new Date(v as string) : null),
  selectionClosedNotifiedAt: (v) => (v ? new Date(v as string) : null),
  closingSoonNotifiedAt: (v) => (v ? new Date(v as string) : null),
  selectionClosedAt: (v) => (v ? new Date(v as string) : null),
  sentinelOutcome: (v) => v,
  sentinelEvidence: (v) => v,
  sentinelReasoning: (v) => v,
  sentinelSourceUrl: (v) => v,
  sentinelConfidence: (v) => v,
  sentinelClosedAt: (v) => (v ? new Date(v as string) : null),
  sentinelDetermined: (v) => v,
  resolutionMode: (v) => v,
  resolveClaimedAt: (v) => (v ? new Date(v as string) : null),
  updatedAt: (v) => (v ? new Date(v as string) : new Date()),
};

const prismaMarkets: MarketStore = {
  async get(id, tx) {
    const r = await (tx ?? pc()).predictionMarket.findUnique({ where: { id } });
    return r ? toStoredMarket(r) : null;
  },
  async stamp(id, fields, tx) {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      const coerce = STAMPABLE[k];
      if (!coerce) throw new Error(`marketStore.stamp: '${k}' is not a stampable column (pool/title fields must not be written this way)`);
      data[k] = coerce(v);
    }
    if (Object.keys(data).length === 0) return;
    if (!("updatedAt" in data)) data.updatedAt = new Date();
    await (tx ?? pc()).predictionMarket.update({ where: { id }, data });
  },
  async addToPool(id, deltas, tx) {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (deltas.yesPool !== undefined) data.yesPool = { increment: deltas.yesPool };
    if (deltas.noPool !== undefined) data.noPool = { increment: deltas.noPool };
    if (deltas.predictorCount !== undefined) data.predictorCount = { increment: deltas.predictorCount };
    // RETURNING, not updateMany: recordSnapshot and the SSE odds push need the
    // TRUE committed pools, not the values this caller believed it was writing.
    const row = await (tx ?? pc()).predictionMarket.update({
      where: { id }, data, select: { yesPool: true, noPool: true },
    });
    return { yesPool: num(row.yesPool), noPool: num(row.noPool) };
  },
  async set(m, tx) {
    await (tx ?? pc()).predictionMarket.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        titleEn: m.titleEn, titleSw: m.titleSw, titleZh: m.titleZh,
        category: m.category, sourceUrl: m.sourceUrl,
        resolutionCriterion: m.resolutionCriterion,
        // ⚠️ BOTH ARMS OF THIS UPSERT, ALWAYS. A column added to `create` only is
        // silently dropped the first time anything writes an EXISTING poll — the
        // market is born with its translations and loses them on the next touch,
        // which reads as green everywhere because nothing ever errors.
        resolutionCriterionSw: m.resolutionCriterionSw,
        resolutionCriterionZh: m.resolutionCriterionZh,
        resolutionAt: new Date(m.resolutionAt),
        selectionClosedAt: m.selectionClosedAt ? new Date(m.selectionClosedAt) : null,
        status: m.status, yesPool: m.yesPool, noPool: m.noPool,
        predictorCount: m.predictorCount,
        feeSnapshot: (m.feeSnapshot ?? undefined) as never,
        resolvedOutcome: m.resolvedOutcome,
        resolutionStage1By: m.resolutionStage1By,
        resolutionStage1At: m.resolutionStage1At ? new Date(m.resolutionStage1At) : null,
        resolutionStage2By: m.resolutionStage2By,
        resolutionStage2At: m.resolutionStage2At ? new Date(m.resolutionStage2At) : null,
        objectionsClosedAt: m.objectionsClosedAt ? new Date(m.objectionsClosedAt) : null,
        settledAt: m.settledAt ? new Date(m.settledAt) : null,
        resolutionEvidence: m.resolutionEvidence ?? null,
        resolutionNotifiedAt: m.resolutionNotifiedAt ? new Date(m.resolutionNotifiedAt) : null,
        selectionClosedNotifiedAt: m.selectionClosedNotifiedAt ? new Date(m.selectionClosedNotifiedAt) : null,
        closingSoonNotifiedAt: m.closingSoonNotifiedAt ? new Date(m.closingSoonNotifiedAt) : null,
        sentinelOutcome: m.sentinelOutcome ?? null,
        sentinelEvidence: m.sentinelEvidence ?? null,
        sentinelReasoning: m.sentinelReasoning ?? null,
        sentinelSourceUrl: m.sentinelSourceUrl ?? null,
        sentinelConfidence: m.sentinelConfidence ?? null,
        sentinelClosedAt: m.sentinelClosedAt ? new Date(m.sentinelClosedAt) : null,
        sentinelDetermined: m.sentinelDetermined ?? null,
        resolutionMode: m.resolutionMode ?? null,
        resolveClaimedAt: m.resolveClaimedAt ? new Date(m.resolveClaimedAt) : null,
        productLine: m.productLine ?? "MARKET",
        proposedBy: m.proposedBy,
        createdAt: new Date(m.createdAt),
      },
      update: {
        titleEn: m.titleEn, titleSw: m.titleSw, titleZh: m.titleZh,
        category: m.category, sourceUrl: m.sourceUrl,
        resolutionCriterion: m.resolutionCriterion,
        // ⚠️ BOTH ARMS OF THIS UPSERT, ALWAYS. A column added to `create` only is
        // silently dropped the first time anything writes an EXISTING poll — the
        // market is born with its translations and loses them on the next touch,
        // which reads as green everywhere because nothing ever errors.
        resolutionCriterionSw: m.resolutionCriterionSw,
        resolutionCriterionZh: m.resolutionCriterionZh,
        resolutionAt: new Date(m.resolutionAt),
        selectionClosedAt: m.selectionClosedAt ? new Date(m.selectionClosedAt) : null,
        status: m.status, yesPool: m.yesPool, noPool: m.noPool,
        predictorCount: m.predictorCount,
        feeSnapshot: (m.feeSnapshot ?? undefined) as never,
        resolvedOutcome: m.resolvedOutcome,
        resolutionStage1By: m.resolutionStage1By,
        resolutionStage1At: m.resolutionStage1At ? new Date(m.resolutionStage1At) : null,
        resolutionStage2By: m.resolutionStage2By,
        resolutionStage2At: m.resolutionStage2At ? new Date(m.resolutionStage2At) : null,
        objectionsClosedAt: m.objectionsClosedAt ? new Date(m.objectionsClosedAt) : null,
        settledAt: m.settledAt ? new Date(m.settledAt) : null,
        resolutionEvidence: m.resolutionEvidence ?? null,
        resolutionNotifiedAt: m.resolutionNotifiedAt ? new Date(m.resolutionNotifiedAt) : null,
        selectionClosedNotifiedAt: m.selectionClosedNotifiedAt ? new Date(m.selectionClosedNotifiedAt) : null,
        closingSoonNotifiedAt: m.closingSoonNotifiedAt ? new Date(m.closingSoonNotifiedAt) : null,
        sentinelOutcome: m.sentinelOutcome ?? null,
        sentinelEvidence: m.sentinelEvidence ?? null,
        sentinelReasoning: m.sentinelReasoning ?? null,
        sentinelSourceUrl: m.sentinelSourceUrl ?? null,
        sentinelConfidence: m.sentinelConfidence ?? null,
        sentinelClosedAt: m.sentinelClosedAt ? new Date(m.sentinelClosedAt) : null,
        sentinelDetermined: m.sentinelDetermined ?? null,
        resolutionMode: m.resolutionMode ?? null,
        resolveClaimedAt: m.resolveClaimedAt ? new Date(m.resolveClaimedAt) : null,
        // `productLine` is deliberately ABSENT from the update block: a row's product
        // is fixed at creation. Allowing an update would let a stale in-memory copy
        // silently reclassify a settled Up & Down round as a long-form poll, moving
        // its money between product lines in every report after the fact.
      },
    });
  },
  async delete(id) {
    await pc().predictionMarket.delete({ where: { id } }).catch(() => {});
  },
  async has(id) {
    const r = await pc().predictionMarket.findUnique({ where: { id }, select: { id: true } });
    return !!r;
  },
  async values() {
    const rows = await pc().predictionMarket.findMany();
    return rows.map(toStoredMarket);
  },
  async attribution() {
    // ⛔ NO `where`. See the interface comment: a money attribution read that could exclude
    // a product line is the defect test:product-line exists to catch.
    const rows = await pc().predictionMarket.findMany({
      select: { id: true, titleEn: true, category: true, productLine: true },
    });
    return rows.map((r) => ({
      id: r.id,
      titleEn: r.titleEn,
      category: r.category as MarketCategory,
      // Same coercion as `toStoredMarket` (line 86) — an unknown or absent value is MARKET,
      // never UPDOWN, so a bad row cannot invent Up & Down turnover.
      productLine: (r.productLine === "UPDOWN" ? "UPDOWN" : "MARKET") as ProductLine,
    }));
  },
  async poolsByIds(ids) {
    const out = new Map<string, { yesPool: number; noPool: number }>();
    if (ids.length === 0) return out;
    const rows = await pc().predictionMarket.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, yesPool: true, noPool: true },
    });
    for (const r of rows) out.set(r.id, { yesPool: Number(r.yesPool), noPool: Number(r.noPool) });
    return out;
  },
  async marketsByIds(ids) {
    const out = new Map<string, StoredMarket>();
    if (ids.length === 0) return out;
    // ⛔ ONE indexed read of exactly the ids — never the whole board filtered down.
    const rows = await pc().predictionMarket.findMany({ where: { id: { in: [...ids] } } });
    for (const r of rows) out.set(r.id, toStoredMarket(r));
    return out;
  },
  async positionCardsByIds(ids) {
    const out = new Map<string, PositionCardMarket>();
    if (ids.length === 0) return out;
    // ⛔ TWELVE COLUMNS, NAMED. A `findUnique` per position reads every column of a very wide
    //    table — see the interface note and `attribution()`'s measurements above.
    const rows = await pc().predictionMarket.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true, titleEn: true, titleSw: true, titleZh: true, category: true, status: true,
        yesPool: true, noPool: true, resolutionAt: true, selectionClosedAt: true,
        selectionClosedNotifiedAt: true, feeSnapshot: true,
      },
    });
    for (const r of rows) {
      out.set(r.id, {
        id: r.id,
        titleEn: r.titleEn,
        titleSw: r.titleSw ?? null,
        titleZh: r.titleZh ?? null,
        category: r.category,
        status: r.status as MarketStatus,
        // ⚠️ Decimal → number, exactly as `poolsByIds` and `bookByIds` do. A Decimal reaching
        //    `cashOutValue` would price a player's exit through string arithmetic.
        yesPool: Number(r.yesPool),
        noPool: Number(r.noPool),
        resolutionAt: r.resolutionAt.toISOString(),
        selectionClosedAt: r.selectionClosedAt ? r.selectionClosedAt.toISOString() : null,
        selectionClosedNotifiedAt: r.selectionClosedNotifiedAt ? r.selectionClosedNotifiedAt.toISOString() : null,
        feeSnapshot: (r.feeSnapshot as StoredMarket["feeSnapshot"]) ?? null,
      });
    }
    return out;
  },
  async bookByIds(ids) {
    const out = new Map<string, MarketBook>();
    if (ids.length === 0) return out;
    // ⛔ NO `productLine` IN THE `where`, and none is reachable — see the interface comment.
    // One indexed `findMany` over the ids the ledger already named, selecting nine columns of
    // a very wide table (`attribution()`'s measurements are why the projection is narrow).
    const rows = await pc().predictionMarket.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true, titleEn: true, productLine: true, status: true,
        resolvedOutcome: true, settledAt: true, yesPool: true, noPool: true, feeSnapshot: true,
      },
    });
    for (const r of rows) {
      out.set(r.id, {
        id: r.id,
        titleEn: r.titleEn,
        // Same coercion as `attribution()` — an unknown value is MARKET, never UPDOWN, so a
        // bad row cannot invent Up & Down turnover.
        productLine: (r.productLine === "UPDOWN" ? "UPDOWN" : "MARKET") as ProductLine,
        status: r.status as MarketStatus,
        resolvedOutcome: r.resolvedOutcome ?? null,
        settledAt: r.settledAt ? r.settledAt.toISOString() : null,
        yesPool: Number(r.yesPool),
        noPool: Number(r.noPool),
        feeSnapshot: (r.feeSnapshot as StoredMarket["feeSnapshot"]) ?? null,
      });
    }
    return out;
  },
  async pending(productLine = "MARKET") {
    // Indexed on status; the OR keeps the settle candidates (adjudicated, money not
    // yet moved) without a second query. The residue is tiny relative to the table.
    const rows = await pc().predictionMarket.findMany({
      where: {
        ...(productLine === "ALL" ? {} : { productLine }),
        OR: [
          { status: "LIVE" },
          { status: { in: ["RESOLVED", "VOIDED"] }, settledAt: null },
        ],
      },
    });
    return rows.map(toStoredMarket);
  },
  async listBoard(q) {
    const rows = await pc().predictionMarket.findMany({
      where: {
        ...(q.productLine === "ALL" ? {} : { productLine: q.productLine }),
        ...(q.status ? { status: q.status } : {}),
        ...(q.category ? { category: q.category } : {}),
      },
      // Matches the old in-JS `sort((a,b) => a.resolutionAt.localeCompare(b.resolutionAt))`
      // so callers see byte-identical ordering — this change is a query-plan change,
      // not a behaviour change.
      orderBy: { resolutionAt: "asc" },
      ...(q.limit != null ? { take: q.limit } : {}),
    });
    return rows.map(toStoredMarket);
  },
};

const prismaPositions: PositionStore = {
  async get(id) {
    const r = await pc().position.findUnique({ where: { id } });
    return r ? toStoredPosition(r) : null;
  },
  async set(p, tx) {
    await (tx ?? pc()).position.upsert({
      where: { id: p.id },
      create: {
        id: p.id, userId: p.userId, marketId: p.marketId,
        side: p.side, stake: p.stake, bonusStakeTzs: p.bonusStakeTzs ?? 0,
        potentialPayout: p.potentialPayout,
        status: p.status, finalPayout: p.finalPayout,
        placedAt: new Date(p.placedAt),
        settledAt: p.settledAt ? new Date(p.settledAt) : null,
        idempotencyKey: p.idempotencyKey ?? null,
      },
      // Mirror the full mutable field set so this DAL matches the in-memory
      // store's full-replace semantics (positions.set(p.id, p)). Previously only
      // status/finalPayout/settledAt were written, so a future mutation of any
      // other field would persist in tests but silently no-op in production.
      update: {
        userId: p.userId, marketId: p.marketId,
        side: p.side, stake: p.stake, bonusStakeTzs: p.bonusStakeTzs ?? 0,
        potentialPayout: p.potentialPayout,
        status: p.status, finalPayout: p.finalPayout,
        placedAt: new Date(p.placedAt),
        settledAt: p.settledAt ? new Date(p.settledAt) : null,
        idempotencyKey: p.idempotencyKey ?? null,
      },
    });
  },
  async values() {
    const rows = await pc().position.findMany();
    return rows.map(toStoredPosition);
  },
  async attribution() {
    return pc().position.findMany({ select: { id: true, marketId: true } });
  },
  async listOpen() {
    // Pushed down. See the interface comment: this runs on every boot and the table only
    // grows.
    //
    // ⚠️ NO INDEX SERVES THIS, and saying otherwise would be worse than saying nothing.
    // Position has @@index([marketId, status]) — `status` is not a leading column, so
    // Postgres seq-scans. Measured on production 2026-08-20: 921 rows scanned, 131 returned,
    // 26 shared buffers, 0.163 ms. The win is not the scan, it is that 790 rows stop being
    // streamed to the app and hydrated into objects the caller immediately discards.
    //
    // An @@index([status]) is NOT worth adding at this size — 26 buffers is nothing, and an
    // index on a low-cardinality column where one value holds 86% of the table would mostly
    // not be chosen anyway. Revisit if Position passes ~100k rows; `scripts/load/
    // s13-scale-ceilings.mts` is the harness that would show it.
    const rows = await pc().position.findMany({ where: { status: "OPEN" } });
    return rows.map(toStoredPosition);
  },
  async listForUser(userId, limit = 100, productLine) {
    const pl = productLine && productLine !== "ALL" ? productLine : null;
    const rows = await pc().position.findMany({
      // Indexed JOIN on the market relation — the DB filters by game, not the app.
      where: { userId, ...(pl ? { market: { productLine: pl } } : {}) },
      orderBy: { placedAt: "desc" },
      take: limit,
    });
    return rows.map(toStoredPosition);
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async leaderboard(limit, opts) {
    // ONE aggregate. Raw SQL rather than Prisma groupBy because the ORDER BY is a
    // computed ratio (ROI), not a column, and `nullif` keeps a zero-stake row from
    // dividing by zero instead of excluding it.
    // ⛔ The ORDER BY moves with the sort — see the interface note: on this board the
    //    ordering chooses the rows, so a JS sort would relabel a ROI-selected fifty.
    const rows = await pc().$queryRawUnsafe<
      Array<{ userId: string; resolved: bigint; staked: string; paidOut: string }>
    >(
      `select "userId",
              count(*)                                   as "resolved",
              coalesce(sum("stake"), 0)::text            as "staked",
              coalesce(sum("finalPayout"), 0)::text      as "paidOut"
         from "public"."Position"
        where "status" <> 'OPEN'
        group by "userId"
        order by ${leaderboardOrderBy(opts)}
        limit $1`,
      limit,
    );
    return rows.map((r) => ({
      userId: r.userId,
      resolved: Number(r.resolved),
      staked: Number(r.staked),
      paidOut: Number(r.paidOut),
    }));
  },
  async listForMarket(marketId) {
    const rows = await pc().position.findMany({ where: { marketId } });
    return rows.map(toStoredPosition);
  },
  async listForMarkets(marketIds) {
    // ⛔ Guard the empty case: `{ in: [] }` is a valid Prisma filter that matches
    // nothing, but issuing the round-trip at all is pure waste on a board with no
    // cards. Served by @@index([marketId, status]).
    if (marketIds.length === 0) return [];
    const rows = await pc().position.findMany({ where: { marketId: { in: marketIds } } });
    return rows.map(toStoredPosition);
  },
  async listForUserAndMarket(userId, marketId, tx) {
    // Served by @@index([userId, marketId]) — see the schema note beside it.
    const rows = await (tx ?? pc()).position.findMany({ where: { userId, marketId } });
    return rows.map(toStoredPosition);
  },
  async findByIdempotencyKey(key, tx) {
    const r = await (tx ?? pc()).position.findUnique({ where: { idempotencyKey: key } });
    return r ? toStoredPosition(r) : null;
  },
  async dailyTotalsByUser({ fromIso, toIso, productLine }) {
    // ONE aggregate, like `leaderboard()`. Raw SQL rather than Prisma `groupBy`
    // because the counts are conditional (`filter (where …)`) — groupBy would
    // need one row per (user, status) and a fold in JS, which is the same answer
    // for three times the rows and a second place for the two stores to drift.
    //
    // ⚠️ `settledAt` is `timestamp WITHOUT time zone` holding UTC (verified on
    // production 2026-08-02, and the DB's own TimeZone is Etc/UTC). So the bounds
    // are cast `::timestamp` — passing a JS `Date` would let node-postgres
    // serialise it in the CONTAINER's zone, which is the §3 trap that has already
    // shifted this campaign's readings by three hours. An ISO-8601 string cast
    // here is unambiguous: Postgres drops the `Z` and compares UTC to UTC.
    //
    // ⚠️ Sums are cast `::text` and parsed in JS: `stake`/`finalPayout` are
    // `Decimal(18,2)`, and letting the driver hand back a Decimal object turns
    // `a + b` into string concatenation somewhere downstream.
    const rows = await pc().$queryRawUnsafe<Array<{
      userId: string; rounds: number; wins: number; losses: number; refunds: number;
      staked: string; returned: string; wonPayout: string; lostStake: string; refundedStake: string;
    }>>(
      `select p."userId",
              count(*)::int                                                                    as "rounds",
              (count(*) filter (where p."status" = 'WIN'))::int                                as "wins",
              (count(*) filter (where p."status" = 'LOSS'))::int                               as "losses",
              (count(*) filter (where p."status" = 'VOID'))::int                               as "refunds",
              coalesce(sum(p."stake"), 0)::text                                                as "staked",
              coalesce(sum(p."finalPayout"), 0)::text                                          as "returned",
              coalesce(sum(p."finalPayout") filter (where p."status" = 'WIN'), 0)::text        as "wonPayout",
              coalesce(sum(p."stake") filter (where p."status" = 'LOSS'), 0)::text             as "lostStake",
              coalesce(sum(p."finalPayout") filter (where p."status" = 'VOID'), 0)::text       as "refundedStake"
         from "public"."Position" p
         join "public"."PredictionMarket" m on m."id" = p."marketId"
        where m."productLine"::text = $3
          and p."status" in ('WIN', 'LOSS', 'VOID')
          and p."settledAt" >= $1::timestamp
          and p."settledAt" <  $2::timestamp
        group by p."userId"
        order by count(*) desc`,
      fromIso, toIso, productLine,
    );
    return rows.map((r) => ({
      userId: r.userId,
      rounds: Number(r.rounds), wins: Number(r.wins), losses: Number(r.losses), refunds: Number(r.refunds),
      staked: Number(r.staked), returned: Number(r.returned),
      wonPayout: Number(r.wonPayout), lostStake: Number(r.lostStake), refundedStake: Number(r.refundedStake),
    }));
  },
};

// ---------------------------------------------------------------------------
// Feature-flagged exports
// ---------------------------------------------------------------------------

// Prisma whenever a DATABASE_URL is configured (always in prod) — matches
// store.ts. No longer requires the USE_PRISMA_DAL flag, so forgetting it can't
// silently revert markets to in-memory. (store.ts holds the prod hard-lock that
// refuses to boot production without a database; this module loads alongside it.)
const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false";

export const marketStore: MarketStore = usePrisma ? prismaMarkets : memoryMarkets;
export const positionStore: PositionStore = usePrisma ? prismaPositions : memoryPositions;
