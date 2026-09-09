/**
 * /leaderboard — top predictors of the rolling window.
 *
 * Uses VolumeSparkline for each row's recent activity and the kit's
 * tier-badge palette for rank tiers. In production the board shows ONLY real
 * ranked players (a genuine empty state until players settle predictions);
 * sample data is generated for the empty demo store in non-production only.
 */
import { fill } from "@/lib/utils";
import { db } from "@/lib/server/store";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { listPositionsForUser } from "@/lib/server/market-service";
import { positionStore, roiOf } from "@/lib/server/market-dal";
import { VolumeSparkline } from "@/components/charts/volume-spark";
import { Tooltip } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, TierBadge as KitTierBadge } from "@/components/ui/avatar";
import { PageRibbon } from "@/components/layout/page-ribbon";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { ScrollX } from "@/components/ui/scroll-x";
import { getServerT, type Dict } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { QUERY_BAR_ROW2_CLASS, QuerySort } from "@/components/ui/query-bar";
import { FilterPill } from "@/components/ui/filter-pill";
import {
  LEADER_NATURAL_DIR,
  LEADER_PRODUCTS,
  LEADER_SORTS,
  buildLeaderHref,
  leaderDir,
  leaderProduct,
  parseLeaderParams,
  type LeaderProductId,
  type LeaderSortId,
  type LeaderState,
} from "@/lib/leaderboard/board";

export async function generateMetadata() {
  const { t } = await getServerT();
  const title = t.leaderboard.title;
  const og = `/api/og/page?title=${encodeURIComponent(title)}`;
  return {
    title,
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}
export const dynamic = "force-dynamic";

type Tier = "sovereign" | "diamond" | "gold" | "silver" | "bronze";

type Row = {
  userId: string;
  handle: string;
  resolved: number;
  staked: number;
  paidOut: number;
  roi: number;
  tier: Tier;
  streak: number;
  /** 14-day activity sparkline in TZS staked per day. */
  spark: number[];
};

/**
 * The tier thresholds, written ONCE.
 *
 * 🔴 FOUND BY `test:rate-copy` ON ITS FIRST RUN, 2026-08-14. The classifier tested
 * `roi >= 60` and the dictionary string said "≥60% ROI" — the same number written twice,
 * in three languages, with nothing tying them together. Whoever tuned a tier would have
 * moved one and left the other, and the board would have awarded a badge its own caption
 * denied. That is the exact defect class F5 exists to close, and the guard found an
 * instance nobody had listed.
 *
 * ⛔ The copy interpolates from THIS table. Do not restate a threshold in a string.
 */
export const TIER_THRESHOLDS = {
  sovereign: { resolved: 50, roi: 60 },
  diamond:   { resolved: 20, roi: 30 },
  gold:      { resolved: 10, roi: 15 },
  silver:    { resolved: 5,  roi: 0 },
} as const;

function tierFor(roi: number, resolved: number): Tier {
  // Sovereign sits above Diamond — heraldic top-of-board honour.
  const T = TIER_THRESHOLDS;
  if (resolved >= T.sovereign.resolved && roi >= T.sovereign.roi) return "sovereign";
  if (resolved >= T.diamond.resolved   && roi >= T.diamond.roi)   return "diamond";
  if (resolved >= T.gold.resolved      && roi >= T.gold.roi)      return "gold";
  if (resolved >= T.silver.resolved    && roi >= T.silver.roi)    return "silver";
  return "bronze";
}

/** Deterministic pseudo-random walk seeded from a string — no Math.random
 *  in render, so the SSR + hydration values stay identical. */
function seededWalk(seed: string, length: number, max = 100_000): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out.push(Math.round((h % 1000) / 1000 * max));
  }
  return out;
}

/** How many rows the board shows. The aggregate is LIMITed to this, so the cost of the
 *  page no longer depends on how many players the platform has. */
const BOARD_SIZE = 50;

/** Real TZS staked per day over the trailing `days`, oldest → newest — bucketed
 *  from positions already in memory. NOT a fabrication path: every shilling in a
 *  bucket is a position the ranking itself is built from (A-5). */
function dailyStakes(positions: Array<{ stake: number; placedAt: string }>, days: number): number[] {
  const out = new Array<number>(days).fill(0);
  const dayMs = 24 * 3600_000;
  const now = Date.now();
  for (const p of positions) {
    const age = now - Date.parse(p.placedAt);
    if (!Number.isFinite(age) || age < 0 || age >= days * dayMs) continue;
    out[days - 1 - Math.floor(age / dayMs)] += p.stake;
  }
  return out;
}

async function buildLeaderboard(state: LeaderState): Promise<{ rows: Row[]; capped: boolean }> {
  // 🔴 This used to load EVERY user with no `where` or `take`, then fire one positions
  // query per user. The old comment said "N+1 → 1"; running them in parallel does not
  // remove an N+1, it aims all of it at the connection pool at once. Measured at 1,000
  // users (scripts/load/s13-scale-ceilings.mts): ~2,270 ms, and it EXHAUSTED THE POOL
  // mid-run — on a public page whose trigger is somebody sharing the link.
  //
  // Now: one GROUP BY, ordered and limited by the database.
  // B-1 — no swallow: a failed aggregate must throw to leaderboard/error.tsx.
  // The old `catch { return [] }` rendered an empty board (or, worse, the
  // non-production SYNTHETIC board) whenever the read failed.
  /**
   * ⛔ THE SORT GOES INTO THE QUERY, NOT OVER ITS RESULT. On this board the ORDER BY chooses the
   * rows, so a JS sort would leave the SELECTION on ROI and change only the label — "most staked"
   * would mean *the biggest staker among the fifty best ROIs*. See `lib/leaderboard/board.ts`.
   *
   * ⭐ AND `BOARD_SIZE + 1` IS HOW THE CAP IS DETECTED. ⛔ Never `ranked.length === BOARD_SIZE`,
   * which tells a platform with EXACTLY fifty ranked players that its board was truncated when it
   * was complete. One extra row is fetched, the extra is dropped, and its existence is the answer.
   */
  const over = await positionStore.leaderboard(BOARD_SIZE + 1, { sort: state.sort, dir: leaderDir(state), productLine: leaderProduct(state) });
  const capped = over.length > BOARD_SIZE;
  const ranked = over.slice(0, BOARD_SIZE);
  if (ranked.length === 0) return { rows: [], capped: false };

  // Only the rows actually being rendered need a name and a streak, so this is bounded
  // by BOARD_SIZE — 50 — no matter how large the platform grows.
  const detail = await Promise.all(
    ranked.map(async (r) => ({
      // ⚠️ Promise.resolve(), not a bare .catch() — the dev in-memory store's
      // db.user.* return VALUES, not Promises (CLAUDE.md gotcha §9), so calling
      // .catch() on the raw return crashed /leaderboard on every memory-store
      // boot while working fine against Prisma. Found live 2026-08-08.
      // B-1 — deliberate degrade: per-row detail (name/streak) failing drops
      // only that row's decoration, bounded at BOARD_SIZE; the ranking is real.
      user: await Promise.resolve(db.user.findById(r.userId)).catch(() => null),
      // ⭐ THE LENS REACHES THE PER-ROW READ TOO, AND IT HAD TO. This call passed no
      // `productLine` for its whole life — the third argument has always been available
      // (`market-service.ts`) — so the streak, the best-win market and the 14-day sparkline
      // aggregated BOTH products while the ROI beside them was about to be narrowed to one.
      // ⛔ A row whose rank says "Up & Down" and whose streak counts poll wins is the same lie
      // as a count that is not cross-filtered (§K 6c rule 4), just spread across two columns.
      positions: await Promise.resolve(listPositionsForUser(r.userId, 200, leaderProduct(state))).catch(() => [] as Awaited<ReturnType<typeof listPositionsForUser>>),
    })),
  );

  const out: Row[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const r = ranked[i];
    const u = detail[i].user;
    if (!u) continue; // a deleted user cannot be ranked
    const roi = roiOf(r);
    // Streak = consecutive wins from the most recent settled position. Unchanged
    // semantics; it just reads a bounded slice instead of every position ever placed.
    let streak = 0;
    for (const p of detail[i].positions.filter((p) => p.status !== "OPEN")) {
      if (p.status === "WIN") streak++;
      else break;
    }
    const handle = (u.displayName ?? `pred_${u.id.slice(-4)}`).split(" ")[0];
    out.push({
      userId: u.id,
      handle,
      resolved: r.resolved,
      staked: r.staked,
      paidOut: r.paidOut,
      roi,
      tier: tierFor(roi, r.resolved),
      streak,
      // CHART-SPRINT C · REAL activity at last: the 14-day series is derived from
      // the SAME bounded positions read the streak walks — true stakes bucketed by
      // placement day, zero extra queries. This row spent its whole life empty
      // under a "we don't yet snapshot per-day staking" note, but no snapshot was
      // ever needed: the positions in hand ARE the record. Bounded at the same 200
      // recent positions as the streak, so a hyper-active player's oldest days can
      // undercount — the identical honest bound the streak already accepts. A
      // quiet fortnight renders the sparkline's clean zero baseline, not a blank.
      spark: dailyStakes(detail[i].positions, 14),
    });
  }
  return { rows: out, capped };
}

/** Demo-mode filler — synthesizes a believable leaderboard so the UI is
 *  never empty in a fresh demo session. Uses real Tanzanian first names
 *  via deterministic seeds. */
function syntheticLeaderboard(): Row[] {
  const handles = ["asha", "juma", "neema", "kiongozi", "nyota", "rehema", "baraka", "tumaini", "siri", "imani", "amani", "zawadi"];
  return handles.map((handle, i) => {
    const seed = `${handle}-${i}`;
    const w = seededWalk(seed, 14, 200_000);
    const staked = w.reduce((a, b) => a + b, 0);
    const paidOut = Math.round(staked * (1 + (Math.cos(i) * 0.4)));
    const roi = staked > 0 ? ((paidOut - staked) / staked) * 100 : 0;
    const resolved = 8 + (i % 12);
    return {
      userId: `synth_${handle}`,
      handle,
      resolved,
      staked,
      paidOut,
      roi,
      tier: tierFor(roi, resolved),
      streak: i < 3 ? 4 - (i % 3) : 0,
      spark: w,
    };
  }).sort((a, b) => b.roi - a.roi);
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { t } = await getServerT();
  const sp = await searchParams;
  const state = parseLeaderParams(sp);
  /**
   * ⛔ THE PILL COUNTS ARE READ FROM THE DAL, NEVER DERIVED FROM `rows`. §K 6c rule 4: a pill's
   * number must be what pressing it would actually SHOW. `rows` is one lens's board capped at
   * fifty, so counting it would print "50" on every pill regardless of the product — a number
   * that is true about the page and false about the control. These are `count(distinct userId)`
   * over the board's own population (`status <> 'OPEN'`) per product.
   * ⚠️ `all` is counted DISTINCTLY and is NOT `market + updown`: 17 of 41 ranked players hold
   * both products on production, so summing would print more players than the platform has.
   */
  const [{ rows: real, capped }, playerCounts] = await Promise.all([
    buildLeaderboard(state),
    positionStore.leaderboardPlayerCounts(),
  ]);
  // Show REAL players from the very first one so a player can always see
  // themselves ranked. The synthetic sample board is a NON-PRODUCTION demo
  // convenience only — a licensed real-money site must never present
  // fabricated players/rankings to real users, so in production an empty
  // board renders a genuine empty state instead.
  const isSynthetic = real.length === 0 && process.env.NODE_ENV !== "production";
  const rows = isSynthetic ? syntheticLeaderboard() : real;
  // Paginate the ranking the same way every other list on the platform paginates.
  // ⛔ `baseHref` CARRIES THE SORT. It was the bare string "/leaderboard", so turning a page
  //    silently dropped the ordering and put the reader back on ROI without saying so.
  const baseHref = buildLeaderHref(state);
  const totalPages = Math.max(1, Math.ceil(rows.length / PLAYER_PER_PAGE));
  const safePage = Math.min(Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1), totalPages);
  const offset = (safePage - 1) * PLAYER_PER_PAGE;
  const pagedRows = rows.slice(offset, offset + PLAYER_PER_PAGE);

  // Tier display name from the dict (first word of the tier description)
  const tierDisplayName = (tier: Tier) => t.leaderboard[`tier${tier.charAt(0).toUpperCase()}${tier.slice(1)}` as keyof typeof t.leaderboard].split(" ")[0];

  /**
   * ⛔ EVERY SORT LABEL IS A NUMBER THIS TABLE PRINTS, or the figure the page leads with. A sort
   * named for something the reader cannot see is ordering by an invisible key — the defect
   * `/results` shipped when it sorted on a clock its cards were not showing.
   */
  const sortLabel = (s: LeaderSortId) => {
    switch (s) {
      case "roi": return t.leaderboard.bestRoi;
      case "net": return t.leaderboard.sortNet;
      case "staked": return t.leaderboard.sortStaked;
      case "resolved": return t.leaderboard.tableResolved;
    }
  };
  const dir = leaderDir(state);
  /**
   * ⛔ THE LENS LABELS ARE THE PRODUCT'S OWN WORDS, not new ones. `t.nav.upDown` is the name the
   * platform gives that game everywhere else, so a player reading "Up & Down" on this pill and in
   * the top bar is reading the same product. Inventing "Rounds" or "Price" here would be a second
   * vocabulary for a thing that already has one (§L, the label law).
   */
  const productLabel = (p: LeaderProductId) => {
    switch (p) {
      // `t.common.all` is the word every other lens rail on the platform uses for its All pill —
      // NOT `rangeAll` ("All time"), which is a WINDOW word and would promise a date range.
      case "all": return t.common.all;
      case "polls": return t.common.markets;
      case "updown": return t.market.udTitle;
    }
  };

  return (
    <PageContainer tier="reading" className="space-y-6">
      <RefreshPoller intervalMs={30_000} />
      <PageHeader eyebrow={t.leaderboard.title} title={t.leaderboard.topPredictors} />

      {rows.length === 0 ? (
        <EmptyState
          kind="leaderboard"
          title={t.leaderboard.emptyTitle}
          body={t.leaderboard.emptyBody}
          action={<Link href={"/markets" as never} className="btn btn-primary btn-sm">{t.positions.browseMarkets}</Link>}
        />
      ) : (
        <>
      <PageRibbon
        stats={[
          { label: t.leaderboard.topTier, value: tierDisplayName(rows[0]?.tier ?? "bronze"), accent: "gold" },
          { label: t.leaderboard.bestRoi, value: `${rows[0]?.roi.toFixed(1) ?? "0"}%`, accent: "yes" },
          /**
           * 🔴 THIS PRINTED THE BOARD SIZE UNDER THE LABEL "PREDICTORS". `rows` is the ranking,
           * capped at BOARD_SIZE, so a platform with a thousand ranked players advertised **50** —
           * a false public figure on the page a player checks to see how they compare, and it got
           * *less* true the more the platform grew. ⛔ It is now stated as what it is: the number
           * of players ON the board, with the cap named when it bites.
           */
          {
            label: capped ? t.leaderboard.rankedShown : t.leaderboard.predictorsCount,
            value: rows.length.toLocaleString("en-US"),
          },
        ]}
      />

      {/**
        * ⭐ THE PRODUCT LENS — this page's FIRST filter, added 2026-09-09 on a measurement.
        *
        * ⛔ THE NOTE THAT USED TO SIT HERE SAID THIS PAGE HAS NO FILTER AND MUST NOT DECLARE A
        * RAIL, and it was right until the board's population was measured.
        * `npm run ops:leaderboard-mix` on production: **72.19% of ranked positions are Up & Down**,
        * **17 of 41 ranked players hold both products**, and **17 of the 41 rows on this very
        * board mix them**. One ROI over two different games is the §K 6c rule 4 failure with the
        * promise moved out of a count and into a RANK.
        *
        * 🎯 The per-player number is what decided it: platform ROI is −5.06% for polls and −5.04%
        * for Up & Down, near-identical — and the same query shows one player's ROI moving by
        * **145.91 percentage points** depending on whether their Up & Down bets count. A board
        * ranks INDIVIDUALS, so a platform mean cannot answer its question.
        *
        * ⛔ THE LENS IS PUSHED INTO THE STORE, exactly like the sort, and for the same reason: the
        * aggregate's `limit` means the SELECTION is what has to narrow. Filtering the returned
        * fifty would make "Up & Down" mean *the Up & Down players among the fifty best COMBINED
        * ROIs* — a player excellent at one game and poor at the other never appears under the lens
        * named for them, and nothing on the page says so.
        *
        * ⚠️ NOW THAT A REAL FILTER EXISTS, THIS RAIL IS DECLARED IN ALL EIGHT PLACES (§6) — and
        * six of the eight fail SILENTLY when a route is missing, reporting a clean pass over a
        * page they never opened.
        */}
      <nav className="flex flex-wrap items-center gap-1.5 -mx-1 px-1" aria-label={t.leaderboard.productAria} data-filter-rail>
        {LEADER_PRODUCTS.map((p) => (
          <FilterPill
            key={p}
            href={buildLeaderHref(state, { product: p })}
            label={productLabel(p)}
            count={playerCounts[p === "all" ? "all" : p === "polls" ? "market" : "updown"]}
            on={state.product === p}
            semantics="tab"
            rank="primary"
            /* ⛔ `testId` IS WHAT MAKES THE COUNT CHECKABLE, not decoration. `FilterPill` emits
               `data-chip`/`data-count` only when it is given one, and `qa:count-truth` reads
               `[data-filter-rail] [data-chip]` — so without it the driver found "0 distinct pill
               destinations, floor is 3" and refused to report a vacuous pass over a rail it could
               not see. The `product:` prefix matches the `tab:`/`side:`/`when:` convention
               `/positions` uses. */
            testId={`product:${p}`}
          />
        ))}
      </nav>

      {/**
        * ⚠️ THE SORT IS STILL NOT A FILTER, and it keeps its own row. A sort narrows nothing —
        * every ranked row is still on the board — so it stays outside `data-filter-rail` and out
        * of the count instruments, which is why `hasActiveLeaderFilters` excludes `sort`/`dir` as
        * view state while counting `product` as a filter.
        *
        * ⭐ IT IS THE SHARED CONTROL, so the sort a player learned on `/positions` behaves
        * identically here — same fused direction button, same tri-state, same reset-to-natural on
        * choosing a new key.
        */}
      <div className={QUERY_BAR_ROW2_CLASS}>
        <QuerySort
          label={t.common.sort}
          value={sortLabel(state.sort)}
          ariaLabel={t.leaderboard.topPredictors}
          options={LEADER_SORTS.map((s) => ({
            id: s,
            label: sortLabel(s),
            href: buildLeaderHref(state, { sort: s, dir: null }),
            on: state.sort === s,
            naturalDir: LEADER_NATURAL_DIR[s],
          }))}
          dir={dir}
          dirHref={buildLeaderHref(state, { dir: dir === "asc" ? "desc" : "asc" })}
          ascLabel={t.market.sortedAsc}
          descLabel={t.market.sortedDesc}
        />
      </div>

      {/* ⛔ THE CAP, STATED WHEN IT BITES — detected by reading BOARD_SIZE + 1, never by
          `rows.length === BOARD_SIZE`, which tells a platform with exactly fifty ranked players
          that its board was truncated when it was complete. */}
      {/* ⚠️ `text-body-sm`, NOT `text-[11px]`. This is a SENTENCE — §T4's 12.5px reading floor
          applies, and `text-caption`/`text-label` sit below it and do not count as a fix.
          `test:type-scale` §3 caught it as a NEW offender the moment it was written. */}
      {capped && (
        <p className="text-body-sm text-text-subtle">
          {fill(t.leaderboard.boardCapped, { n: String(rows.length) })}
        </p>
      )}

      {/* A10 podium — top-3, #1 raised in a gilt ring + crown. Real players
          from row 1; only shown with a genuine top-3. */}
      {rows.length >= 3 && <Podium top={rows} t={t} />}

      <ScrollX label="Leaderboard" className="rounded-xl glass-panel">
        {isSynthetic && (
          <div className="px-4 py-2.5 border-b border-border bg-bg-overlay/40 flex items-center gap-2">
            <span className="inline-flex items-center rounded-pill border border-border bg-bg-overlay px-2 py-0.5 font-mono text-micro font-bold uppercase tracking-[0.10em] text-text-subtle">{t.leaderboard.demo}</span>
            <p className="text-body-sm text-text-muted">{t.leaderboard.sampleData}</p>
          </div>
        )}
        <table className="admin-tbl min-w-[640px]">
          <thead className="border-b border-border bg-bg-overlay">
            <tr className="font-mono text-micro uppercase eyebrow text-text-subtle">
              <th className="text-left p-3 w-14">#</th>
              <th className="text-left p-3">{t.leaderboard.tablePredictor}</th>
              <th className="text-right p-3">{t.leaderboard.tableRoi}</th>
              <th className="text-left p-3 hidden md:table-cell">{t.leaderboard.tableStakes}</th>
              <th className="text-right p-3 hidden md:table-cell">{t.leaderboard.tableStreak}</th>
              <th className="text-right p-3">{t.leaderboard.tableResolved}</th>
            </tr>
          </thead>
          <tbody>
              {/* ⭐ DG-A-09 · §B8 — `hover:bg-bg-overlay/40` DELETED; it never painted, and the
                  reason is one worth knowing: **`.admin-tbl` IS NOT ADMIN-ONLY.** This player
                  table carries it (:240), so the canon `.admin-tbl tbody tr:hover` — specificity
                  (0,2,2) — beat this utility's (0,2,0) on every hover, and the `/40` requested
                  here has never rendered: what a player sees is the canon's 50%.
                  ⛔ `transition-colors` STAYS. The background still changes on hover — it just
                  comes from the canon — and this class is what eases it. */}
            {pagedRows.map((r, i) => (
              <tr key={r.userId} data-row-id={r.userId} className="border-b border-border last:border-b-0 transition-colors">
                <td className="p-3 font-mono font-bold tabular-nums">
                  <span className={offset + i < 3 ? "text-brand-300" : "text-text-subtle"}>{offset + i + 1}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Avatar initials={r.handle.slice(0, 2)} size="sm" seed={r.userId} />
                    <span className="font-medium text-text">@{r.handle}</span>
                    <TierBadge tier={r.tier} t={t} />
                  </div>
                </td>
                <td
                  className={`p-3 text-right font-mono tabular-nums font-bold ${
                    r.roi >= 0 ? "text-yes-300" : "text-no-300"
                  }`}
                >
                  {r.roi >= 0 ? "+" : ""}{r.roi.toFixed(1)}%
                </td>
                <td className="p-3 hidden md:table-cell">
                  {r.spark.length > 0
                    ? <VolumeSparkline data={r.spark} width={140} height={32} ariaLabel={t.market.volumeSparkline} />
                    : <span className="text-text-subtle text-[11px]">—</span>}
                </td>
                <td className="p-3 text-right hidden md:table-cell font-mono tabular-nums text-text-muted">
                  {r.streak > 0 ? (
                    <span className="inline-flex items-center gap-1"><HotChip streak={r.streak} t={t} /></span>
                  ) : "—"}
                </td>
                <td className="p-3 text-right font-mono tabular-nums text-text-muted">{r.resolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>

      {totalPages > 1 && (
        <div className="rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
          <Pagination total={rows.length} page={safePage} perPage={PLAYER_PER_PAGE} baseHref={baseHref} ofLabel={t.common.of} prevLabel={t.common.previousPage} nextLabel={t.common.nextPage} firstLabel={t.common.firstPage} lastLabel={t.common.lastPage} />
        </div>
      )}
        </>
      )}
    </PageContainer>
  );
}

/** Hot-streak chip — flame glyph + win count. Gold is principled on the
 *  leaderboard (earned standing). */
function HotChip({ streak, t }: { streak: number; t: Dict }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill border border-gold-700/50 bg-gold-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-gold-300">
      <I.hot s={11} />
      {streak} {streak > 1 ? t.leaderboard.winsLabel : t.leaderboard.winLabel}
    </span>
  );
}

/** A10 top-3 podium. Order [#2, #1, #3] so #1 sits center-raised; gilt ring +
 *  crown on #1, muted-ink rings on #2/#3. Avatars rise in staggered (kp-rise). */
function Podium({ top, t }: { top: Row[]; t: Dict }) {
  const slots: { r: Row; rank: 1 | 2 | 3 }[] = [
    { r: top[1], rank: 2 },
    { r: top[0], rank: 1 },
    { r: top[2], rank: 3 },
  ];
  return (
    <section className="rounded-xl glass-panel px-4 pt-6 pb-4">
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {slots.map(({ r, rank }, i) => {
          const first = rank === 1;
          const ring = first ? "var(--gold-400)" : "var(--text-muted)";
          return (
            <div
              key={r.userId}
              className={`kp-rise flex min-w-0 flex-col items-center text-center ${first ? "-translate-y-3" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {first ? (
                <span className="mb-1 text-gold-300 podium-crown" aria-hidden><I.crown s={22} /></span>
              ) : (
                <span className="mb-1 block h-[22px]" aria-hidden />
              )}
              {/* Identity arrival on the hero placement (spec §8): the crest settles
                  first (.crest-arrive), the honours ring reveals second
                  (.crest-ring-reveal) — so the ring is its OWN layer now; painting
                  it on the wrapper would hide the crest through its own arrival. */}
              <div className="relative rounded-full" style={{ padding: 3 }}>
                <span
                  aria-hidden
                  className="crest-ring-reveal absolute inset-0 rounded-full"
                  style={{ background: ring, boxShadow: first ? "0 0 16px color-mix(in oklab, var(--gold-400) 45%, transparent)" : "none" }}
                />
                <Avatar className="crest-arrive relative" initials={r.handle.slice(0, 2)} size={first ? "xl" : "lg"} seed={r.userId} />
                <span
                  className="absolute -bottom-1 -right-1 grid place-items-center rounded-full font-mono text-[10px] font-bold"
                  style={{
                    width: 18, height: 18,
                    background: first ? "var(--gold-400)" : "var(--bg-overlay)",
                    color: first ? "var(--gold-950)" : "var(--text-muted)",
                    border: "1px solid var(--border-strong)",
                  }}
                >
                  {rank}
                </span>
              </div>
              {/* DG-P-08 · A PLAYER'S OWN NAME IS THE ONE STRING THE PODIUM IS FOR.
                  Chain at 390: PageContainer tier="reading" px-3 → 358; this section's
                  glass-panel border + px-4 → 358 − 2 − 40 = 316; `grid-cols-3 gap-2` (12px on
                  the overridden scale) → 97.3px per column, less this row's gap-1.5 (8px) and
                  the `.tier-badge` (globals.css:1876-1882), which is 22px but is itself a
                  shrinkable flex item. MEASURED in a real browser over the compiled stylesheet
                  and the real fonts, at 390: the handle's box is 72.7px against 75px of
                  `@kiongozi` and 99px of `@Christopher` — both clipped. The handle is
                  `(displayName ?? …).split(" ")[0]` (:142) at the inherited 15px (`--type-body`,
                  globals.css:213 — NOT the Tailwind `text-body` 14, §T7), so it runs out at
                  about eight characters. At 1440 the same box is 99.5px and nothing clips.
                  §A5 offers WRAP or ellipsise, and here wrap is free: `items-end` bottom-aligns
                  the three columns, so a second line grows this one upward and the podium's base
                  stays flat. The file already says this string should be read whole — the table
                  at :267 renders the same handles with no truncate at all.
                  ⚠️ That table was also the only thing making the clip survivable, and it is an
                  ACCIDENT: the podium is always rows[0..2] while the table paginates, so the
                  disclosure evaporated on page 2. Nothing recorded it; now nothing needs to.
                  ⛔ `break-words`, not `break-all`: a handle has no space in it, so ordinary
                  wrapping cannot act on it, but it is a NAME being read rather than a token being
                  transcribed — the `break-all` ruling (operation-result-modal.tsx:455-466) is for
                  the latter. `overflow-wrap` breaks the word only when it genuinely cannot fit.
                  ⛔ AND `min-w-0` TRAVELS WITH IT, or the fix is worse than the defect. `truncate`
                  was setting `overflow:hidden`, which is what zeroed this flex item's automatic
                  minimum size; `overflow-wrap: break-word` explicitly does NOT reduce min-content,
                  so dropping the one without adding the other would restore `min-width:auto`, and
                  the handle would shove the tier badge out of a 97px column instead of wrapping
                  inside it. Same box model as E-30 (admin-clip.test.mts) and the 2026-07-29
                  ruling — `min-w-0` restores shrinkability, the break mode does the rest.
                  That is MEASURED, not argued: driven as a red control, `break-words` alone puts
                  `@Christopher` 2.1px past its own row's right edge at 390, while `min-w-0
                  break-words` wraps it to two lines inside the column and leaves `@asha` on one. */}
              <div className="mt-2 flex max-w-full items-center gap-1.5">
                <span className="min-w-0 break-words font-medium text-text">@{r.handle}</span>
                <TierBadge tier={r.tier} t={t} />
              </div>
              <span className={`mt-0.5 font-mono text-[13px] font-bold tabular-nums ${r.roi >= 0 ? "text-yes-300" : "text-no-300"}`}>
                {r.roi >= 0 ? "+" : ""}{r.roi.toFixed(1)}%
              </span>
              {r.streak > 0 && <span className="mt-1"><HotChip streak={r.streak} t={t} /></span>}
              <span className="mt-1 font-mono text-[10px] text-text-subtle">
                {r.resolved} {t.leaderboard.tableResolved.toLowerCase()}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Uses the canonical <TierBadge> atom (one heraldic look platform-wide), wrapped
// in the leaderboard's richer tooltip describing each tier's threshold.
function TierBadge({ tier, t }: { tier: Tier; t: Dict }) {
  const desc = {
    sovereign: fill(t.leaderboard.tierSovereign, TIER_THRESHOLDS.sovereign),
    diamond:   fill(t.leaderboard.tierDiamond, TIER_THRESHOLDS.diamond),
    gold:      fill(t.leaderboard.tierGold, TIER_THRESHOLDS.gold),
    silver:    t.leaderboard.tierSilver,
    bronze:    t.leaderboard.tierBronze,
  }[tier];
  return (
    <Tooltip label={desc}>
      <span aria-label={tier}>
        <KitTierBadge tier={tier} />
      </span>
    </Tooltip>
  );
}
