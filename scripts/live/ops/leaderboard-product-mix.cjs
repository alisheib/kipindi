#!/usr/bin/env node
/**
 * READ-ONLY. `npm run ops:leaderboard-mix`
 *
 * ⭐ WHAT QUESTION THIS ANSWERS, AND WHY IT HAD TO BE MEASURED. `/leaderboard` ranks players on
 * ONE ROI computed from `select … from "Position" where "status" <> 'OPEN' group by "userId"` —
 * a single-table aggregate with NO product filter. So a player's rank mixes their long-form poll
 * results with their Up & Down results, and `docs/PLAYER-QUERY-CAMPAIGN.md` §12 ① filed that for
 * Ali rather than guessing at it. His instruction was: MEASURE FIRST.
 *
 * ⛔ AND THE NUMBERS ALREADY IN THE REPO CANNOT ANSWER IT. Three priors exist and all three are
 * about the WRONG POPULATION:
 *   · `market-dal.ts:443` and `market-service.ts:1658` — "~20×" Up & Down rows
 *   · `scripts/live/ops/README.md` — "~12:1"
 *   · the campaign docs' "99.4%"
 * Every one of those counts MARKET ROWS. An Up & Down chain emits a row every few minutes while a
 * poll is created a few times a day, so of course the ROUNDS dominate the market table — that says
 * nothing about how many BETS players placed on each product, which is the only thing that decides
 * whether one combined ROI is defensible. ⭐ A true measurement over the wrong population is the
 * most convincing way to be wrong, so this probe counts POSITIONS.
 *
 * ⛔ IT REPORTS, IT DOES NOT DECIDE. The product decision is Ali's; this prints the evidence.
 *
 * ── Reading it ────────────────────────────────────────────────────────────────────────────────
 * §1  the split over the leaderboard's OWN population (`status <> 'OPEN'`) — the aggregate's only
 *     WHERE, so this is exactly the rows that build a rank, not "all positions".
 * §2  platform ROI per product, in the board's own formula, so the two cannot disagree.
 * §3  the part that actually settles it: how many RANKED players hold BOTH products, and how far
 *     their combined ROI sits from their poll-only ROI. If almost nobody mixes, one board is
 *     honest and cheap. If the mixers are the top of the board, the rank is answering a question
 *     no player asked.
 *
 * ⚠️ `now()` IS POSTGRES', never this laptop's, and every Decimal is `::text` — `Decimal(18,2)`
 * through the JS driver is a float waiting to lie. Both rules are the ops README's.
 */
const fs = require("node:fs");
const path = require("node:path");
// ⚠️ PLAIN require, resolved from THIS file upward — never a machine's checkout path. The
// `KP_REPO`-joined form threw MODULE_NOT_FOUND on the F: checkout; see poll-census.cjs's note.
const { Client } = require("pg");

// ⛔ The public-proxy URL, minted by `mkenv.cjs`. `railway run` injects
// `postgres.railway.internal`, which resolves nowhere off-platform and returns DEFAULTS with no
// error — a whole session was lost to that once.
for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const q = (c, sql, params) => c.query(sql, params).then((r) => r.rows);
const n = (v) => Number(v ?? 0);
const tzs = (v) => n(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = (v) => (v === null ? "n/a" : `${n(v) >= 0 ? "+" : ""}${n(v).toFixed(2)}%`);

/**
 * ⭐ THE BOARD'S OWN ROI, COPIED FROM `market-dal.ts:753` RATHER THAN RE-DERIVED.
 * `nullif` is what keeps a zero-stake player from dividing by zero instead of being excluded —
 * if this probe wrote `/ sum(stake)` it could disagree with the page about the same player.
 */
const ROI = `((coalesce(sum(p."finalPayout"),0) - coalesce(sum(p.stake),0)) / nullif(sum(p.stake),0) * 100)`;
// The leaderboard's ONLY filter. Kept as one constant so no query below can quietly widen it.
const RANKED = `p."status" <> 'OPEN'`;

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // ⛔ A probe that cannot prove WHICH database it read is not evidence.
  const [meta] = await q(c, `select current_database() as db, inet_server_addr()::text as addr, now()::text as server_now`);
  console.log("=== IDENTITY ===");
  console.log(`db=${meta.db}  server=${meta.addr}  server_now=${meta.server_now}`);

  /* ── §1 · the split, over the leaderboard's own population ───────────────────────────────── */
  console.log("\n=== §1 · POSITIONS BY PRODUCT (ranked population = status <> 'OPEN') ===");
  const split = await q(c, `
    select coalesce(m."productLine", 'MARKET')                              as product,
           count(*)::int                                                    as positions_all,
           count(*) filter (where ${RANKED})::int                           as positions_ranked,
           count(distinct p."userId")::int                                  as players_all,
           count(distinct p."userId") filter (where ${RANKED})::int          as players_ranked,
           coalesce(sum(p.stake)         filter (where ${RANKED}), 0)::text  as staked,
           coalesce(sum(p."finalPayout") filter (where ${RANKED}), 0)::text  as paid_out
      from "Position" p
      join "PredictionMarket" m on m.id = p."marketId"
     group by 1
     order by positions_ranked desc`);

  if (split.length === 0) {
    console.log("NO ROWS — the join returned nothing. Refusing to report a mix over an empty set.");
    await c.end();
    process.exit(1);
  }
  const totalRanked = split.reduce((a, r) => a + r.positions_ranked, 0);
  for (const r of split) {
    const share = totalRanked ? ((r.positions_ranked / totalRanked) * 100).toFixed(2) : "0.00";
    console.log(
      `${String(r.product).padEnd(7)} ranked=${String(r.positions_ranked).padStart(7)} (${share.padStart(6)}% of ranked)` +
      `  all=${String(r.positions_all).padStart(7)}  players_ranked=${String(r.players_ranked).padStart(5)}` +
      `  staked=${tzs(r.staked).padStart(14)}  paid=${tzs(r.paid_out).padStart(14)}`,
    );
  }
  console.log(`TOTAL ranked positions: ${totalRanked}`);

  /* ── §2 · platform ROI per product, in the board's formula ───────────────────────────────── */
  console.log("\n=== §2 · PLATFORM ROI PER PRODUCT (the board's own expression) ===");
  const roi = await q(c, `
    select coalesce(m."productLine",'MARKET') as product, ${ROI} as roi
      from "Position" p join "PredictionMarket" m on m.id = p."marketId"
     where ${RANKED}
     group by 1 order by 1`);
  for (const r of roi) console.log(`${String(r.product).padEnd(7)} ROI=${pct(r.roi)}`);
  const combined = await q(c, `
    select ${ROI} as roi from "Position" p join "PredictionMarket" m on m.id = p."marketId" where ${RANKED}`);
  console.log(`COMBINED (what the board prints today) ROI=${pct(combined[0]?.roi ?? null)}`);

  /* ── §3 · the players, and the ones who mix ──────────────────────────────────────────────── */
  console.log("\n=== §3 · RANKED PLAYERS — how many mix, and how far the mix moves their ROI ===");
  const players = await q(c, `
    with per as (
      select p."userId"                                             as uid,
             coalesce(m."productLine",'MARKET')                     as product,
             count(*)::int                                          as resolved,
             coalesce(sum(p.stake),0)                               as staked,
             coalesce(sum(p."finalPayout"),0)                       as paid
        from "Position" p join "PredictionMarket" m on m.id = p."marketId"
       where ${RANKED}
       group by 1, 2
    ), agg as (
      select uid,
             count(*)::int                                                          as products,
             sum(staked)                                                            as staked_all,
             sum(paid)                                                              as paid_all,
             sum(staked) filter (where product = 'MARKET')                          as staked_poll,
             sum(paid)   filter (where product = 'MARKET')                          as paid_poll,
             sum(resolved)::int                                                     as resolved_all
        from per group by uid
    )
    select count(*)::int                                                            as ranked_players,
           count(*) filter (where products > 1)::int                                as mixed_players,
           coalesce(max(abs(
             ((paid_all - staked_all) / nullif(staked_all,0) * 100)
             - ((paid_poll - staked_poll) / nullif(staked_poll,0) * 100)
           )) filter (where products > 1), 0)::text                                 as worst_roi_gap_pp
      from agg`);
  const p0 = players[0] ?? {};
  console.log(`ranked players=${n(p0.ranked_players)}  holding BOTH products=${n(p0.mixed_players)}`);
  console.log(`worst combined-vs-poll ROI gap among mixed players: ${n(p0.worst_roi_gap_pp).toFixed(2)} percentage points`);

  // ⚠️ The top of the board is what a player actually SEES, so the mix is reported there too —
  //    a 0.1% platform-wide mix that is concentrated in the top 50 is still a lying board.
  console.log("\n--- top 50 by combined ROI (the board), and whether each row is mixed ---");
  const top = await q(c, `
    with per as (
      select p."userId" as uid, coalesce(m."productLine",'MARKET') as product,
             coalesce(sum(p.stake),0) as staked, coalesce(sum(p."finalPayout"),0) as paid, count(*)::int as resolved
        from "Position" p join "PredictionMarket" m on m.id = p."marketId"
       where ${RANKED} group by 1,2
    ), agg as (
      select uid, count(*)::int as products, sum(resolved)::int as resolved,
             sum(staked) as staked, sum(paid) as paid
        from per group by uid
    )
    select uid, products, resolved,
           ((paid - staked) / nullif(staked,0) * 100)::text as roi
      from agg
     order by ((paid - staked) / nullif(staked,0) * 100) desc nulls last, resolved desc, uid
     limit 50`);
  const mixedTop = top.filter((r) => r.products > 1).length;
  console.log(`${top.length} rows on the board · ${mixedTop} of them mix both products`);
  for (const r of top.slice(0, 10)) {
    console.log(`  ${r.uid.padEnd(28)} products=${r.products}  resolved=${String(r.resolved).padStart(4)}  ROI=${pct(r.roi)}`);
  }
  if (top.length > 10) console.log(`  … ${top.length - 10} more`);

  console.log("\n=== VERDICT INPUTS ===");
  console.log("⛔ This probe does not decide. Read §3 first: if `holding BOTH products` is ~0 and no");
  console.log("   board row is mixed, ONE combined ROI is honest and the filing can be closed as");
  console.log("   'measured, no change needed'. If the board's top rows mix, the rank is comparing");
  console.log("   two different games and the lens (or a split board) is owed.");

  await c.end();
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
