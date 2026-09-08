/**
 * `npm run test:leaderboard-order` — the leaderboard's ORDER BY is its SELECTION, so the two
 * stores must agree about it and neither may put a no-value row first.
 *
 * 🔴 WHY THIS GUARD EXISTS, AND WHY IT HAD TO LAND WITH THE CODE. `/leaderboard` renders
 * `positionStore.leaderboard(limit)` — `order by … limit 50`. The database CHOOSES the fifty rows
 * by the ordering, so the obvious implementation of the campaign's "add a sort" (a JS `.sort()`
 * over the result) would have left the SELECTION on ROI and changed only the label: "most staked"
 * would mean *the biggest staker among the fifty best ROIs*. A player with the platform's largest
 * book and a poor ROI is not in the fifty, never appears under a sort named for exactly them, and
 * nothing on the page says so.
 *
 * ⛔ That is §3 rule 4's own failure with the promise moved from a count into a sort label — "the
 * number was true and the board was still a lie". The fix pushes the ORDER BY down, which creates
 * a NEW risk this file is here to police: two stores, two orderings, one board.
 *
 * ── WHAT IT ASSERTS ──────────────────────────────────────────────────────────────────────────
 *   §1 the SQL fragment for each sort names the aggregate that sort claims to order by
 *   §2 `nulls last` appears on BOTH directions, and the order is TOTAL (ends in "userId")
 *   §3 the in-memory store really re-selects — a different sort returns a different top row
 *   §4 nulls (a zero-stake ROI) go LAST in BOTH directions, in the comparator
 *   §5 CONTROLS — the fixture is discriminating, and §3 could actually fail
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import {
  positionStore,
  leaderboardOrderBy,
  leaderboardCompare,
  type LeaderSortKey,
} from "../src/lib/server/market-dal.ts";
import { LEADER_SORTS, LEADER_NATURAL_DIR } from "../src/lib/leaderboard/board.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

const SORTS = LEADER_SORTS as readonly LeaderSortKey[];

/* ── §1 · the fragment orders by what its name claims ───────────────────────────────────── */
console.log("\n── 1 · each sort's SQL fragment names its own aggregate ─────────");
{
  // ⛔ The point is that a fragment cannot be silently pointed at the wrong column. `staked`
  //    ordering by `count(*)` would produce a plausible board that answers another question.
  const MUST_MENTION: Record<LeaderSortKey, RegExp> = {
    roi: /nullif\(sum\("stake"\), 0\)/,
    net: /sum\("finalPayout"\).*-.*sum\("stake"\)/,
    staked: /^coalesce\(sum\("stake"\), 0\)/,
    resolved: /^count\(\*\)/,
  };
  for (const s of SORTS) {
    const frag = leaderboardOrderBy({ sort: s, dir: "desc" });
    ok(`1.${s} the fragment orders by the aggregate its name claims`,
      MUST_MENTION[s].test(frag), frag.slice(0, 90));
  }
  // ⚠️ `net` and `roi` share a numerator, so a fragment that confused them would pass §1.net.
  //    This separates them on the thing that actually differs: the divisor.
  ok("1.x roi DIVIDES and net does not — the two are not the same fragment",
    /nullif/.test(leaderboardOrderBy({ sort: "roi", dir: "desc" }))
      && !/nullif\(sum\("stake"\), 0\)\s+desc/.test(leaderboardOrderBy({ sort: "net", dir: "desc" })));
}

/* ── §2 · nulls last in both directions, and a TOTAL order ──────────────────────────────── */
console.log("\n── 2 · nulls last on both arms, and the order is total ──────────");
{
  for (const s of SORTS) {
    for (const dir of ["asc", "desc"] as const) {
      const frag = leaderboardOrderBy({ sort: s, dir });
      /**
       * ⛔ POSTGRES DEFAULTS `desc` TO `nulls first`. Without an explicit `nulls last` a player
       * whose ROI is NULL — which `nullif(sum("stake"), 0)` produces for a zero-stake group —
       * would sit at the TOP of a descending board: the least-known row presented as the best.
       * `lib/query/sort.ts` states the same rule for the JS side in its own words.
       */
      ok(`2.${s}.${dir} the primary key carries an explicit \`nulls last\``,
        new RegExp(`${dir}\\s+nulls last`).test(frag), frag.slice(0, 90));
    }
    // ⛔ A tie-break that can itself tie is not a tie-break. Without a final unique key the board
    //    reshuffles between two 30-second polls for no reason the reader can see.
    ok(`2.${s} the order ends in a UNIQUE key, so it is total`,
      /"userId" asc\s*$/.test(leaderboardOrderBy({ sort: s, dir: "desc" })));
  }
  // The natural direction the contract publishes must be a direction this fragment can take.
  ok("2.nat every contract natural direction is one the fragment renders",
    SORTS.every((s) => leaderboardOrderBy({ sort: s, dir: LEADER_NATURAL_DIR[s] })
      .includes(`${LEADER_NATURAL_DIR[s]} nulls last`)));
}

/* ── §3 · the store RE-SELECTS, it does not re-label ────────────────────────────────────── */
console.log("\n── 3 · a different sort chooses different rows ───────────────────");
{
  /**
   * ⭐ THE FIXTURE IS BUILT SO THAT EVERY SORT HAS A DIFFERENT WINNER. That is the whole
   * discrimination: if one player topped every ordering, all four calls would return the same row
   * and a JS-re-label implementation would pass.
   *
   *   u_roi     tiny book, huge ratio        → best ROI, worst staked
   *   u_net     large book, large profit     → best net
   *   u_staked  largest book, thin margin    → most staked
   *   u_many    many small settled bets      → most resolved
   */
  const mk = (id: string, userId: string, stake: number, payout: number) => ({
    id, userId, marketId: `m_${id}`, side: "YES" as const, stake,
    potentialPayout: payout, status: "WIN" as const, finalPayout: payout,
    placedAt: "2026-09-01T00:00:00.000Z", settledAt: "2026-09-02T00:00:00.000Z",
  });

  await positionStore.set(mk("p_roi", "u_roi", 1_000, 9_000));            // roi +800%
  await positionStore.set(mk("p_net", "u_net", 100_000, 400_000));        // net +300k, roi +300%
  await positionStore.set(mk("p_stk", "u_staked", 900_000, 990_000));     // staked 900k, roi +10%
  for (let i = 0; i < 6; i++) {
    await positionStore.set(mk(`p_many_${i}`, "u_many", 2_000, 2_200));   // 6 settled, roi +10%
  }

  /**
   * ⛔ `limit: 1`, AND THAT IS THE WHOLE DISCRIMINATION — found by attacking this gate rather than
   * by writing it. The first draft probed with `limit: 10` over a four-player fixture, so the
   * limit never bound: a JS-re-label implementation (order by ROI, slice, THEN sort the slice)
   * would have kept all four rows and re-ordered them correctly, and §3.1–§3.5 would have passed
   * over the exact defect they exist to catch.
   *
   * ⭐ A limit BELOW the population is what makes the selection observable. With `limit: 1` a
   * re-label can only ever return the ROI leader, whatever the sort is called.
   */
  const top = async (sort: LeaderSortKey) =>
    (await positionStore.leaderboard(1, { sort, dir: LEADER_NATURAL_DIR[sort] }))[0]?.userId;

  const winners = {
    roi: await top("roi"),
    net: await top("net"),
    staked: await top("staked"),
    resolved: await top("resolved"),
  };

  ok("3.1 `roi` selects the tiny-book, huge-ratio player", winners.roi === "u_roi", String(winners.roi));
  ok("3.2 `net` selects the biggest absolute profit", winners.net === "u_net", String(winners.net));
  ok("3.3 `staked` selects the biggest book — NOT the best ROI among a ROI-chosen set",
    winners.staked === "u_staked", String(winners.staked));
  ok("3.4 `resolved` selects the most settled bets", winners.resolved === "u_many", String(winners.resolved));

  /**
   * ⛔ THE ASSERTION THAT WOULD HAVE CAUGHT THE DEFECT. A JS re-label leaves the SELECTION on ROI,
   * so `limit 1` returns the same row for every sort. Four distinct winners is the proof that the
   * ordering reached the selection.
   */
  ok("3.5 ⭐ all four sorts choose DIFFERENT rows, so the ordering reached the SELECTION",
    new Set(Object.values(winners)).size === 4, JSON.stringify(winners));

  // ⛔ AND THE LIMIT IS APPLIED AFTER THE ORDER, not before. `limit 1` under `staked` must be the
  //    biggest staker, not the first row of a ROI-ordered page truncated to one.
  const one = await positionStore.leaderboard(1, { sort: "staked", dir: "desc" });
  ok("3.6 a limit of ONE under `staked` is the biggest staker",
    one.length === 1 && one[0].userId === "u_staked", JSON.stringify(one));

  /* ── §5 · controls ───────────────────────────────────────────────────────────────────── */
  console.log("\n── 5 · controls ─────────────────────────────────────────────────");
  const all = await positionStore.leaderboard(10, { sort: "roi", dir: "desc" });
  ok("5.1 CONTROL the fixture really produced four ranked players",
    new Set(all.map((r) => r.userId)).size >= 4, `${all.length} rows`);
  ok("5.2 CONTROL flipping the direction reverses the top row, so `dir` is not ignored",
    (await positionStore.leaderboard(10, { sort: "roi", dir: "asc" }))[0]?.userId !== winners.roi);
  ok("5.3 CONTROL omitting opts reproduces the board's shipped default (ROI desc)",
    (await positionStore.leaderboard(1))[0]?.userId === "u_roi");
}

/* ── §4 · nulls last in the comparator, in BOTH directions ──────────────────────────────── */
console.log("\n── 4 · a zero-stake ROI ranks LAST in both directions ───────────");
{
  const withRoi = { userId: "a", resolved: 3, staked: 1_000, paidOut: 2_000 };
  const noStake = { userId: "b", resolved: 1, staked: 0, paidOut: 0 };
  /**
   * ⛔ `roiOf` RETURNS 0 FOR A ZERO-STAKE GROUP, and 0 is a POSITION on this scale rather than an
   * absence — a player who staked nothing would rank as "exactly break-even", ahead of every
   * losing player, while the SQL's `nullif` excluded them from the ordering entirely. The two
   * halves of the product must agree, so the comparator treats it as null.
   */
  ok("4.1 desc · a zero-stake row sorts after a real one",
    leaderboardCompare({ sort: "roi", dir: "desc" }, withRoi, noStake) < 0);
  ok("4.2 asc · it STILL sorts after it — the direction does not lift it to the top",
    leaderboardCompare({ sort: "roi", dir: "asc" }, withRoi, noStake) < 0);
  ok("4.3 and the reverse argument order agrees, so the comparator is antisymmetric",
    leaderboardCompare({ sort: "roi", dir: "asc" }, noStake, withRoi) > 0);
  // ⛔ `net` MUST NOT DO THIS. A net of exactly zero is a real fact — "broke even" — and coercing
  //    it to null would be the mirror-image error, getting the same rule wrong in the other
  //    direction.
  const evenA = { userId: "c", resolved: 2, staked: 5_000, paidOut: 5_000 };
  const lossB = { userId: "d", resolved: 2, staked: 5_000, paidOut: 1_000 };
  ok("4.4 `net` treats a break-even row as a VALUE, not an absence — it beats a loss",
    leaderboardCompare({ sort: "net", dir: "desc" }, evenA, lossB) < 0);
}

console.log(`\nleaderboard-order: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.error(
    "\n✗ LEADERBOARD ORDER FAILED.\n" +
    "  On this board the ORDER BY chooses the rows. If §3 failed, the sort has probably been\n" +
    "  moved into JavaScript over an already-selected fifty — which relabels the board instead\n" +
    "  of re-selecting it. Push the ordering into BOTH stores; do not sort the result.\n",
  );
  process.exit(1);
}
console.log("leaderboard-order: OK — the ordering selects the rows, in both stores, nulls last");
