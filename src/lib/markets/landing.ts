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
 * The two things this file decides:
 *
 * 1. 🔴 **THE PAGE MUST NOT STATE THE SAME MARKETS TWICE.** Batch 2 shipped a hero that named its
 *    lead market twice and 30 gates were green over it; the re-validation pass fixed the hero and
 *    recorded that the PAGE still repeated — the hero's four questions were also the first four
 *    cards of the grid below, because both were closing-soonest over the same book. So the grid
 *    gets a DIFFERENT LENS and is disjoint from the hero by construction (see `landingGrid`).
 *
 * 2. **THE TOPIC TILES MUST RECONCILE TO THE HERO.** The kit is explicit that per-topic counts and
 *    pools "must reconcile to the header or the page contradicts itself". They do so BY
 *    CONSTRUCTION here — both are folds over the same `open` set — rather than by two queries that
 *    agree today. `landingTopicsReconcile` is the assertion, and the gate runs it.
 */
import { matchesStatus, sortRows, pricedYesPct, type SortId } from "./discovery";
import type { HeroRow } from "./hero";

/** Cards on the landing grid. Six is two rows of three at desktop, three rows of two at 768. */
export const LANDING_GRID_SIZE = 6;

/** Markets the hero itself draws: the featured card plus the question board. */
export const HERO_MARKETS = 5;

/**
 * The lens the grid is ordered by — and it is STATED in the heading, per the kit's own rule that
 * "the heading states the sort order, so the grid is a claim rather than a sample".
 *
 * ⛔ `new` IS NOT A FALLBACK, IT IS THE HONEST LENS FOR A COLD BOOK. On a platform where nothing
 * has been staked every pool is 0, `pool` ties everywhere, and the documented tie-break
 * (`bettableUntil` asc) IS closing order — so a grid headed "Biggest pools" would be ordered by a
 * number that is zero on every row, and ordered *identically to the hero*. That exact trap was
 * paid for in batch 1: an assertion that `sort=closing` and `sort=pool` produce different lead
 * cards passed only while the fixture happened to have varied pools. So when there is no money on
 * the book, the grid says what a cold platform actually has to say — these markets just opened —
 * and orders by that. Same instinct as `pricedYesPct`: do not state a figure nobody produced.
 */
export type GridLens = Extract<SortId, "pool" | "new">;

export function gridLensFor(openPoolTzs: number): GridLens {
  return openPoolTzs > 0 ? "pool" : "new";
}

export type TopicAggregate = {
  /** A `MarketCategory` id. */
  id: string;
  /** Open markets in this topic. */
  count: number;
  /** Σ of their pools, TZS. */
  poolTzs: number;
  /**
   * The topic's crowd lean as a YES percentage, or **null when nothing in it is staked** — the
   * tile draws a 2px underline at this width, and a 50%-wide bar over an empty topic is the same
   * fabricated claim as a "50%" label, drawn instead of written. `pricedYesPct` is the one rule.
   */
  leanYesPct: number | null;
};

export type LandingComposition = {
  /** The six cards below the hero, disjoint from it — see `landingGrid`. */
  grid: HeroRow[];
  /** Which lens `grid` is ordered by. The heading must state this. */
  lens: GridLens;
  /** Every category with at least one open market, biggest count first. */
  topics: TopicAggregate[];
  /** Open markets in no listed category — 0 unless a category id ever falls out of the enum. */
  uncategorised: number;
  /** Σ pool of those markets, TZS. Tracked so the reconciliation below is exact arithmetic
   *  rather than a special case: money that cannot appear on a tile is not claimed by one. */
  uncategorisedPoolTzs: number;
};

/**
 * The grid: `LANDING_GRID_SIZE` open markets under `lens`, **excluding every market the hero
 * already drew**.
 *
 * ⛔ THE EXCLUSION IS THE POINT, AND IT IS NOT A SECOND QUERY. It is a set difference over the
 * same rows the hero ordered, so it costs nothing and makes the repetition defect structurally
 * impossible at EVERY data state — including the cold one, where a lens change alone would not
 * have been enough. A visitor scrolling two screens now reads ten different markets instead of
 * five markets twice.
 *
 * ⚠️ The trade, stated: if the single biggest pool on the platform is also the soonest to close,
 * the hero shows it and this grid does not. That is the lesser cost — the alternative is the
 * defect — and the section's "see all" link goes to the board sorted by the same lens, where it is
 * present and first.
 */
export function landingGrid(
  rows: readonly HeroRow[],
  nowMs: number,
  opts: { lens: GridLens; excludeIds: readonly string[]; size?: number },
): HeroRow[] {
  const excluded = new Set(opts.excludeIds);
  const open = rows.filter((r) => matchesStatus(r, "open", nowMs) && !excluded.has(r.id));
  return sortRows(open, { sort: opts.lens, dir: null }).slice(0, opts.size ?? LANDING_GRID_SIZE);
}

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
  opts: { openPoolTzs: number; heroIds: readonly string[]; categories: readonly string[] },
): LandingComposition {
  const lens = gridLensFor(opts.openPoolTzs);
  const { topics, uncategorised, uncategorisedPoolTzs } = landingTopics(rows, nowMs, opts.categories);
  return {
    grid: landingGrid(rows, nowMs, { lens, excludeIds: opts.heroIds }),
    lens,
    topics,
    uncategorised,
    uncategorisedPoolTzs,
  };
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
