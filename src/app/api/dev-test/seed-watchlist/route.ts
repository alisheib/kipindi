/**
 * /api/dev-test/seed-watchlist — dev-only. Stars a spread of markets for the SIGNED-IN player so
 * `/watchlist` can be driven against a list that actually spans the lifecycle.
 *
 * ⭐ WHY IT IS A SEPARATE FIXTURE FROM `seed-player-portfolio`. That one seeds POSITIONS — money
 * the player has staked. A star is a different fact entirely: a player can follow a market they
 * never bet on, and the watchlist's whole contract is "the markets you asked to follow", not "the
 * markets you have money on". Seeding stars off the back of positions would produce a watchlist
 * that is a projection of the portfolio, and every lens on it would then be proved against a
 * population the product does not actually produce.
 *
 * ⛔ IT STARS THROUGH `toggleWatch`, THE PRODUCT'S OWN DOOR, and checks `isWatching` first because
 * that function is a TOGGLE — calling it twice unstars. A fixture that wrote `db.watchlist.add`
 * directly would skip the audit row the real path writes, and a re-run would silently empty the
 * list it is supposed to fill.
 *
 * 🔴 IT MANUFACTURES THE `progress` ROW RATHER THAN HOPING FOR ONE, AND THAT IS THE POINT OF THE
 * FIXTURE. "Betting has stopped, no verdict yet" is a WINDOW — often hours wide — so a store
 * seeded a minute ago holds none, and the one lens whose absence the campaign's complaint names
 * most directly would go untested while the run reported green. `stamp`ing `selectionClosedAt`
 * into the past puts a real market in that state through the same column the product reads.
 *
 * ⛔ CLASSIFIED BY THE PAGE'S OWN PREDICATES (`isFollowOpen` / `matchesFollowLens`), never by a
 * status list written here. A fixture that re-implements the rule it is testing can agree with
 * itself while both are wrong — and the `byLens` block below is read back FROM THE STORE after
 * the stars are written, so it reports what the product holds rather than what this file intended.
 *
 * ⛔ 404 in production, double-gated at the edge by `proxy.ts`.
 *
 *   POST { perLens?: number }  →  { ok, starred, byLens, forcedProgress, refusals }
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/session";
import { marketStore } from "@/lib/server/market-dal";
import {
  isClosedByTime,
  isDemoMarket,
  isSelectionClosed,
  listMarkets,
  playerMarketsByIds,
} from "@/lib/server/market-service";
import { isWatching, listWatchedMarketIds, toggleWatch } from "@/lib/server/watchlist-service";
import {
  FOLLOW_LENSES,
  matchesFollowLens,
  type FollowLens,
  type FollowRow,
} from "@/lib/watchlist/following";

/**
 * The row shape the contract reasons about, built from a stored market exactly as
 * `/watchlist/page.tsx` builds it. ⚠️ Only the fields the LENS predicates read are populated —
 * the sort keys are irrelevant to classifying a fixture, and filling them with plausible-looking
 * values would invite someone to trust them.
 */
function lensRow(m: Awaited<ReturnType<typeof playerMarketsByIds>> extends Map<string, infer T> ? T : never): FollowRow {
  const resolved = m.status === "RESOLVED" || m.status === "VOIDED";
  return {
    id: m.id,
    category: m.category,
    status: m.status,
    selectionClosed: !resolved && (isSelectionClosed(m) || isClosedByTime(m)),
    volume: m.yesPool + m.noPool,
    predictors: m.predictorCount,
    resolutionAtMs: Date.parse(m.resolutionAt) || 0,
    starRank: 0,
    titleEn: m.titleEn,
    titleSw: m.titleSw ?? "",
    titleZh: m.titleZh ?? "",
    criterion: m.resolutionCriterion ?? "",
  };
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "sign in first (/auth/demo)" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { perLens?: number };
  const PER = Math.max(1, Math.min(8, body.perLens ?? 3));
  const uid = session.userId;
  const refusals: string[] = [];

  // ⚠️ THE WHOLE BOARD, ON PURPOSE, AND ONLY HERE. This is the read `/watchlist` was just
  //    relieved of — but a fixture that must find a market in each of four lifecycle states has
  //    to look at all of them. It runs once, by hand, on a dev store; the page runs every 20s in
  //    front of a player. ⛔ Do not cite this line as precedent for a product read.
  const board = (await listMarkets({ productLine: "ALL" }).catch(() => [])).filter((m) => !isDemoMarket(m));
  if (board.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no non-demo markets — POST /api/dev-test/seed-real-markets first" },
      { status: 400 },
    );
  }

  /** Bucket the board by the page's own lens rule, so the fixture cannot disagree with the page. */
  const bucket = (lens: FollowLens) => board.filter((m) => matchesFollowLens(lensRow(m), lens));

  /**
   * 🔴 MANUFACTURE THE `progress` ROW IF THE BOARD HOLDS NONE. See the header: that state is a
   * time window, so a freshly seeded store almost never contains one, and the lens the campaign's
   * complaint names most directly would go unexercised.
   *
   * ⚠️ `stamp` WRITES THE REAL COLUMN — it is the same door `resolveMarket` and the scheduler use,
   * so the market is genuinely selection-closed rather than decorated to look it. `isSelectionClosed`
   * then reports true for the ordinary reason, on the ordinary path.
   */
  let forcedProgress: string[] = [];
  if (bucket("progress").length === 0) {
    const donors = bucket("open").slice(PER, PER + Math.min(2, PER));
    for (const m of donors) {
      // One minute ago — comfortably past, and still obviously a fixture value to anyone reading
      // the row. ⛔ NOT the resolution clock: pulling THAT into the past would also make the
      // market auto-resolvable, which is a different state than the one being seeded.
      await marketStore.stamp(m.id, { selectionClosedAt: new Date(Date.now() - 60_000).toISOString() });
      forcedProgress.push(m.id);
    }
    if (forcedProgress.length === 0) refusals.push("progress: no open market available to close selection on");
  }

  // Re-read: `stamp` changed the board under us, and classifying stale rows would star markets
  // into lenses they are no longer in.
  const after = (await listMarkets({ productLine: "ALL" }).catch(() => [])).filter((m) => !isDemoMarket(m));
  const freshBucket = (lens: FollowLens) => after.filter((m) => matchesFollowLens(lensRow(m), lens));

  const wanted: string[] = [];
  for (const lens of FOLLOW_LENSES) {
    if (lens === "all") continue; // `all` is the parent, not a thing to seed toward.
    const found = freshBucket(lens).slice(0, PER);
    if (found.length === 0) refusals.push(`${lens}: no market on the board is in this state`);
    for (const m of found) wanted.push(m.id);
  }

  // ⛔ `isWatching` FIRST — `toggleWatch` is a toggle, so a re-run would unstar everything.
  let starred = 0;
  for (const id of new Set(wanted)) {
    if (await isWatching(id, uid)) continue;
    await toggleWatch(id, uid);
    starred++;
  }

  /**
   * ⛔ READ BACK FROM THE STORE, THROUGH THE SAME DOOR THE PAGE USES. `playerMarketsByIds` is what
   * `/watchlist` calls, `isDemoMarket` and all — so if the door drops a row, this reports the drop
   * rather than papering over it with the ids the loop above intended to star.
   */
  const ids = await listWatchedMarketIds(uid);
  const rows = [...(await playerMarketsByIds(ids)).values()].map(lensRow);
  const byLens: Record<string, number> = {};
  for (const lens of FOLLOW_LENSES) byLens[lens] = rows.filter((r) => matchesFollowLens(r, lens)).length;

  /**
   * ⭐ THE PARTITION, ASSERTED BY THE FIXTURE ITSELF. `qa:player-filters` proves DISJOINT +
   * COVERING over the rendered DOM; this proves it over the STORE, before a browser is opened —
   * so a fixture that cannot exercise the invariant says so instead of handing the driver a
   * population where the defect could not appear.
   */
  const parts = FOLLOW_LENSES.filter((l) => l !== "all");
  const partSum = parts.reduce((s, l) => s + byLens[l], 0);
  if (partSum !== byLens.all) {
    refusals.push(`COVERING BROKEN: parts sum to ${partSum}, "all" holds ${byLens.all}`);
  }

  return NextResponse.json({
    ok: refusals.length === 0,
    starred,
    watching: ids.length,
    byLens,
    forcedProgress,
    refusals,
  });
}
