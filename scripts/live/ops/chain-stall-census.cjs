#!/usr/bin/env node
/**
 * chain-stall-census.cjs — READ-ONLY. Which Up & Down chains have stopped producing rounds,
 * and whether each one is PINNED to a boundary it can never advance past.
 *
 *   node scripts/live/ops/chain-stall-census.cjs
 *
 * ⭐ WHY THIS EXISTS. `docs/FINDING-GOLD-CHAINS-STALLED.md`: `advanceChain`'s market-hours
 * gate returned BEFORE the re-arm, so a chain whose session closed stayed pinned to a boundary
 * inside that closed session, and every later tick re-evaluated the gate at that same stale
 * instant. Deterministic, and immune only for crypto (`sessionKindFor` → "always"). Fixed
 * 2026-08-14; this is the instrument that proves the three stranded chains actually recovered,
 * because ⛔ a deploy alone does NOT recover them — `nextBoundaryAt` is persisted.
 *
 * ⛔ A CHAIN THAT READS `RUNNING` IS NOT A CHAIN THAT IS RUNNING. The state column is an
 * operator's intent; the evidence is `nextBoundaryAt` against `now()` and the age of the last
 * round it opened. This prints all three side by side so the two can be told apart.
 *
 * 🔴 EVERY TIMESTAMP IS READ AS `::text`, AND THAT IS NOT A STYLE CHOICE. Prisma maps
 * `DateTime` to `timestamp(3)` **without time zone**, and node-postgres parses a naive
 * timestamp in the CLIENT's local zone. On this laptop (EAT, UTC+3) the first version of this
 * script shifted every value three hours and reported all sixteen chains — including the
 * healthy ones — as stalled by three hours. The product was fine; the instrument was lying.
 * `::text` returns the stored digits, and `Date.parse(t + "Z")` reads them as the UTC they are.
 *
 * 🔴 THIS PROBE REPORTED **GREEN OVER A LIVE OUTAGE** (2026-08-15 to 08-18, E-167 /
 * `FAILURE-INVENTORY.md` §7.4) and it was right to, which is the problem. Two chains had been
 * failing every tick for three days; by the time anyone ran this they had been STOPPED BY HAND,
 * and a STOPPED chain is excluded below by design. ⛔ **The remedy silenced the instrument.**
 * Two things are therefore different now:
 *
 *   ① a chain STOPPED while holding a `nextBoundaryAt` is CALLED OUT rather than folded into
 *     "operator decision" — it is the fingerprint of a chain that was stopped to stop it
 *     failing, or of a manual Generate writing a schedule onto a chain nothing will fire;
 *   ② a RUNNING chain past ONE span is RED, not just one past two. Past its own span no round
 *     can open at that boundary at all — `createMarket` refuses a past close — so one span is
 *     the exact line between "a tick is in flight" and "this chain cannot produce anything".
 *
 * 🔴 AND THE SPAN ARITHMETIC HERE WAS WRONG FOR EVERY DURATION ABOVE FIVE MINUTES. It read
 * `(dur + 1) * 60_000`, but a round's span is its betting window PLUS a result phase of
 * `max(1, ceil(20% of the window / 60))` minutes — so 3+1=4, 5+1=6, 10+2=12, 15+3=18, 30+6=36,
 * 60+12=72. A 60-minute chain's span was being read as 61 minutes against a real 72, and the
 * threshold doubles the error. The lattice is duplicated here ON PURPOSE (this file must run
 * with no repo import), so it is asserted against the real numbers rather than derived.
 *
 * ⚠️ It reports non-RUNNING chains separately and never counts them as stalled: BTC 30m/60m
 * are STOPPED by an operator decision and have no `nextBoundaryAt` at all. Folding those into
 * the stall count would make the census go red on a setting that is working as designed.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || path.resolve(__dirname, "..", "..", ".."), "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const q = (c, sql, params) => c.query(sql, params).then((r) => r.rows);

/**
 * A round's SPAN in minutes — betting window + result phase — for every duration the
 * catalogue allows. ⛔ NOT `dur + 1`: see the header. Every value divides 1440, which is the
 * lattice rule, and that is the cheapest check that this table has not drifted.
 */
const SPAN_MINUTES = { 3: 4, 5: 6, 10: 12, 15: 18, 30: 36, 60: 72 };
const spanMinutes = (dur) => SPAN_MINUTES[Number(dur)] ?? Number(dur) + Math.max(1, Math.ceil(Number(dur) * 0.2));
for (const [dur, span] of Object.entries(SPAN_MINUTES)) {
  if (1440 % span !== 0) throw new Error(`span table drifted: ${dur}m -> ${span}m does not divide 1440`);
}
/** A naive `timestamp` rendered by `::text`, read as the UTC it is stored as. */
const utc = (t) => (t == null ? null : Date.parse(t.replace(" ", "T") + (/[+-]\d\d(:?\d\d)?$/.test(t) ? "" : "Z")));
const ago = (t, nowMs) => {
  const ms = utc(t) == null ? null : nowMs - utc(t);
  if (ms == null || !Number.isFinite(ms)) return "—";
  const abs = Math.abs(ms);
  const s = abs < 90_000 ? `${Math.round(abs / 1000)}s`
    : abs < 5_400_000 ? `${Math.round(abs / 60_000)}m`
    : abs < 172_800_000 ? `${(abs / 3_600_000).toFixed(1)}h`
    : `${(abs / 86_400_000).toFixed(1)}d`;
  return ms >= 0 ? `${s} ago` : `in ${s}`;
};

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // ⛔ "Now" comes from the DATABASE, not this laptop — whose clock has been measured 93s slow,
  // an error every age below would silently inherit.
  const [meta] = await q(c, `select current_database() as db, (now() at time zone 'utc')::text as utc_now`);
  const nowMs = utc(meta.utc_now);
  console.log("=== IDENTITY ===");
  console.log(`db ${meta.db}   server now ${meta.utc_now} UTC`);
  console.log("⚠️  cross-check users/marketsLive against https://www.50pick.tz/api/health before believing any of it");

  const chains = await q(c, `
    select ch.id, ch.state, ch."durationMinutes" as dur, a.symbol, a.category, a.enabled,
           ch."nextBoundaryAt"::text as nb,
           (select max(r."opensAt") from "UpDownRound" r where r."chainId" = ch.id)::text as last_open,
           (select count(*) from "UpDownRound" r where r."chainId" = ch.id)::int as rounds
      from "UpDownChain" ch
      join "UpDownAsset" a on a.id = ch."assetId"
     order by a.symbol, ch."durationMinutes"`);

  console.log("\n=== CHAINS (all times UTC) ===");
  console.log("symbol  cat        dur  state    nextBoundaryAt         lastRoundOpened        rounds  age");
  const stalled = [];      // RUNNING and cannot open a round at its armed boundary
  const stoppedStale = []; // not RUNNING, yet still holding a boundary
  for (const ch of chains) {
    console.log(
      `${String(ch.symbol).padEnd(7)} ${String(ch.category).padEnd(10)} ${String(ch.dur).padStart(3)}  ` +
      `${String(ch.state).padEnd(8)} ${String(ch.nb ?? "—").padEnd(22)} ${String(ch.last_open ?? "—").padEnd(22)} ` +
      `${String(ch.rounds).padStart(5)}   nb ${ago(ch.nb, nowMs)} / last ${ago(ch.last_open, nowMs)}`,
    );
    // ⭐ ONE SPAN IS THE LINE, and it is not a tolerance — it is arithmetic. `openRound` derives
    // a round's close as boundary + span, and `createMarket` refuses a close that has already
    // passed. So a RUNNING chain more than one span past its boundary cannot open a round there
    // however many times it fires. Under one span it is simply a tick in flight (measured on
    // production: 4 of 14 chains at any moment, 68-188s late, all healthy).
    const spanMs = spanMinutes(ch.dur) * 60_000;
    const ageMs = ch.nb ? nowMs - utc(ch.nb) : null;
    if (ch.state === "RUNNING" && ch.enabled && ageMs != null && ageMs > spanMs) {
      stalled.push({ ...ch, spanMs, ageMs });
    }
    // ⛔ AND THE SHAPE THAT HID THE OUTAGE. `setChainState` nulls `nextBoundaryAt` on PAUSE and
    // STOP, so a non-RUNNING chain holding one did not get there by being stopped — either it
    // was stopped to stop it failing, or a manual Generate wrote a schedule onto it afterwards
    // (both happened, 2026-08-18). Not a stall; not silence either.
    if (ch.state !== "RUNNING" && ch.nb) {
      stoppedStale.push({ ...ch, ageMs });
    }
  }

  console.log("\n=== VERDICT ===");
  const notRunning = chains.filter((x) => x.state !== "RUNNING").length;
  console.log(`${chains.length} chains · ${chains.length - notRunning} RUNNING · ${notRunning} not RUNNING (operator decision, not a stall)`);
  if (stalled.length === 0) {
    console.log("✅ GREEN — no RUNNING chain is past its own span, so every one of them can still open a round.");
  } else {
    console.log(`🔴 RED — ${stalled.length} RUNNING chain(s) past their own span; no round can open at that boundary:`);
    for (const s of stalled) {
      console.log(`   ${s.symbol} ${s.dur}m — nextBoundaryAt ${s.nb} UTC (${ago(s.nb, nowMs)}), ` +
        `${Math.round((s.ageMs - s.spanMs) / 1000)}s past its ${s.spanMs / 60_000}m span, last round opened ${ago(s.last_open, nowMs)}`);
    }
  }
  // ⛔ REPORTED WHATEVER THE VERDICT, and never as a pass: this is the state the outage was
  // wearing when this probe last called it GREEN.
  if (stoppedStale.length > 0) {
    console.log(`\n⚠️  ${stoppedStale.length} chain(s) are NOT RUNNING yet still hold a nextBoundaryAt — a stop clears it, so something wrote it back:`);
    for (const s of stoppedStale) {
      console.log(`   ${s.symbol} ${s.dur}m [${s.state}] — nextBoundaryAt ${s.nb} UTC (${ago(s.nb, nowMs)}), last round opened ${ago(s.last_open, nowMs)}`);
    }
    console.log("   Cause on record (E-167): a manual Generate does not check chain.state and writes a schedule onto a chain nothing will fire.");
  }
  await c.end();
  process.exit(stalled.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
