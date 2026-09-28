/**
 * The landing page's composition, derived from ONE board read.
 *
 * ⭐ WHY THIS IS PURE, AND WHY IT REUSES `discovery.ts`. Same contract as `hero.ts`: no server
 * imports, so `test:board-discovery` and the landing gate can prove every rule below with no
 * database and no browser. And every ordering and predicate is the BOARD's — `matchesStatus`,
 * `sortRows` — so the landing cannot drift from `/markets` about what "open" means or what
 * "closing soonest" returns. Two surfaces disagreeing about someone's money is the defect B6
 * exists for.
 *
 * ⚠️ WHAT THIS FILE USED TO DECIDE, AND WHERE IT WENT (WP9 · R15, 2026-09-28). It owned TWO things.
 * The first — 🔴 **THE PAGE MUST NOT STATE THE SAME MARKETS TWICE** (batch 2 shipped a hero that
 * named its lead market twice, and the re-validation pass then found the PAGE repeating: the hero's
 * four questions were also the first four cards of the grid below, because both were closing-soonest
 * over the same book) — was answered by giving the grid a different lens and subtracting the hero's
 * ids from it. **WP9 deletes the grid from `/` entirely**, so there is nothing left to be disjoint
 * FROM: the page has ONE list, and the law now lives where that list is built, as `boardOrdering` plus
 * `HeroFigures.board`'s exclusion of the featured card (`hero.ts`). `landingGrid`, `LANDING_GRID_SIZE`,
 * `GridLens` and `gridLensFor` left with it — the last as `boardMoneyLens`, with its reasoning intact.
 * ⛔ Do not re-add a second market list here without re-reading that law first.
 *
 * So this file now decides ONE thing:
 *
 * **THE TOPIC TILES MUST RECONCILE TO THE HERO.** The kit is explicit that per-topic counts and
 * pools "must reconcile to the header or the page contradicts itself". They do so BY CONSTRUCTION
 * here — both are folds over the same `open` set — rather than by two queries that agree today.
 * `landingTopicsReconcile` is the assertion, and the gate runs it. ⭐ R15 KEPT THE TILES that the v4
 * delivery would have deleted with the grid: they list TOPICS, a different axis, and repeat no
 * market, so the delivery's own reason ("three lists of one thing") does not reach them.
 */
import { matchesStatus, pricedYesPct } from "./discovery";
import type { HeroRow } from "./hero";

/**
 * ⛔ THE MARKET BUDGET, AND WHERE IT IS SPENT NOW (WP9 · R15, 2026-09-28).
 *
 * `LANDING_GRID_SIZE` lived here and was **3**, chosen from a phone screen: at 6 the grid was six
 * rows of ONE on a phone — 1815px, 22% of the whole landing page, measured at 360 SW on production —
 * and the six-card version also put ELEVEN markets in front of a visitor before the trust band, the
 * same markets in two formats, under an eyebrow claiming "biggest pool first". A superlative shown
 * six times stops being one. Ali delegated the number on 2026-09-23.
 *
 * ⭐ WP9 SPENDS THE SAME BUDGET IN ONE SHAPE. `/` drew 1 featured card + 4 board rows + 3 grid cards
 * = 8 markets; it now draws 1 featured card + `QUESTION_BOARD_SIZE` (7) rows = the same 8, in one
 * list instead of three. The ceiling is unchanged and is not re-argued here — `hero.ts` carries it.
 * ⛔ `HERO_MARKETS` went with them: it was exported, read by nothing in `src/` or `scripts/`, and at
 * 1 + 7 its value (5) was about to become quietly wrong as well as unread.
 */

export type TopicAggregate = {
  /** A `MarketCategory` id. */
  id: string;
  /** Open markets in this topic. */
  count: number;
  /** Σ of their pools, TZS. */
  poolTzs: number;
  /**
   * The topic's crowd lean as a YES percentage, or **null when nothing in it is staked** — a
   * 50%-wide bar over an empty topic would be the same fabricated claim as a "50%" label, drawn
   * instead of written. `pricedYesPct` is the one rule. ⚠️ Since landing v3 (2026-09-26) the tile
   * no longer DRAWS it (an unlabelled bar); it stays computed because it is a real fact about the topic.
   */
  leanYesPct: number | null;
};

export type LandingComposition = {
  /** Every category with at least one open market, biggest count first. */
  topics: TopicAggregate[];
  /** Open markets in no listed category — 0 unless a category id ever falls out of the enum. */
  uncategorised: number;
  /** Σ pool of those markets, TZS. Tracked so the reconciliation below is exact arithmetic
   *  rather than a special case: money that cannot appear on a tile is not claimed by one. */
  uncategorisedPoolTzs: number;
};

/** Per-topic counts and pools over the OPEN book — the same set the hero's figures describe. */
export function landingTopics(rows: readonly HeroRow[], nowMs: number, categories: readonly string[]): {
  topics: TopicAggregate[];
  uncategorised: number;
  uncategorisedPoolTzs: number;
} {
  const known = new Set(categories);
  const acc = new Map<string, { count: number; yes: number; no: number }>();
  let uncategorised = 0;
  let uncategorisedPoolTzs = 0;

  for (const r of rows) {
    if (!matchesStatus(r, "open", nowMs)) continue;
    if (!known.has(r.category)) {
      uncategorised++;
      uncategorisedPoolTzs += r.yesPool + r.noPool;
      continue;
    }
    const a = acc.get(r.category) ?? { count: 0, yes: 0, no: 0 };
    a.count++;
    a.yes += r.yesPool;
    a.no += r.noPool;
    acc.set(r.category, a);
  }

  const topics = categories
    .filter((id) => acc.has(id))
    .map((id) => {
      const a = acc.get(id)!;
      return {
        id,
        count: a.count,
        poolTzs: a.yes + a.no,
        // ⛔ Summed shillings, never a mean of the per-market percentages: a topic holding one
        // TZS 200,000 market and one TZS 1,000 market is not the average of their two leans.
        leanYesPct: pricedYesPct(a.yes, a.no),
      };
    })
    // Biggest topic first — the kit gives row 1 to `All` and the largest topic, and "largest"
    // has to be measured rather than assumed to be Sports.
    .sort((a, b) => b.count - a.count || b.poolTzs - a.poolTzs || (a.id < b.id ? -1 : 1));

  return { topics, uncategorised, uncategorisedPoolTzs };
}

export function landingComposition(
  rows: readonly HeroRow[],
  nowMs: number,
  opts: { categories: readonly string[] },
): LandingComposition {
  // ⚠️ It took `openPoolTzs` and `heroIds` until WP9, both only to build the grid. They are gone
  // rather than kept "in case": an unread parameter is the shape a caller passes the wrong value to.
  return landingTopics(rows, nowMs, opts.categories);
}

/**
 * Do the tiles add up to what the hero claims?
 *
 * The kit: per-topic counts and pools "must reconcile to the header or the page contradicts
 * itself". They reconcile by construction — both are folds over the same `open` set — and this
 * function is how that stops being an argument and becomes an assertion the gate runs. It is
 * exported rather than inlined in the test so the property travels with the code that has to keep
 * it true.
 */
export function landingTopicsReconcile(
  comp: Pick<LandingComposition, "topics" | "uncategorised" | "uncategorisedPoolTzs">,
  hero: { openCount: number; poolTzs: number },
): { ok: boolean; countDelta: number; poolDelta: number } {
  const count = comp.topics.reduce((s, t) => s + t.count, 0) + comp.uncategorised;
  const pool = comp.topics.reduce((s, t) => s + t.poolTzs, 0) + comp.uncategorisedPoolTzs;
  const countDelta = count - hero.openCount;
  const poolDelta = pool - hero.poolTzs;
  // ⚠️ `uncategorised` is counted on BOTH sides rather than excused. An open market whose category
  // has fallen out of `MARKET_CATEGORIES` is invisible on the tiles and still real in the hero's
  // total, so folding it in here is what keeps a drifting enum a visible failure instead of a
  // silently absorbed one — the tiles then genuinely do not add up, which is the truth.
  return { ok: countDelta === 0 && poolDelta === 0, countDelta, poolDelta };
}
