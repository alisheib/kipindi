#!/usr/bin/env node
/**
 * chain-stall-census.cjs — READ-ONLY. Which Up & Down chains have stopped producing rounds,
 * and whether each one is PINNED to a boundary it can never advance past.
 *
 *   KP_REPO=F:/kipindi-main node scripts/live/ops/chain-stall-census.cjs
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
 * ⚠️ It reports non-RUNNING chains separately and never counts them as stalled: BTC 30m/60m
 * are STOPPED by an operator decision and have no `nextBoundaryAt` at all. Folding those into
 * the stall count would make the census go red on a setting that is working as designed.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const q = (c, sql, params) => c.query(sql, params).then((r) => r.rows);
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
  const stalled = [];
  for (const ch of chains) {
    console.log(
      `${String(ch.symbol).padEnd(7)} ${String(ch.category).padEnd(10)} ${String(ch.dur).padStart(3)}  ` +
      `${String(ch.state).padEnd(8)} ${String(ch.nb ?? "—").padEnd(22)} ${String(ch.last_open ?? "—").padEnd(22)} ` +
      `${String(ch.rounds).padStart(5)}   nb ${ago(ch.nb, nowMs)} / last ${ago(ch.last_open, nowMs)}`,
    );
    // A stall: RUNNING, asset enabled, next boundary more than TWO round-spans in the past.
    // Two spans of slack so a chain mid-tick, or one waiting for a bar to publish, is not
    // miscounted — the shortest real stall this has ever seen was 19.9 hours.
    const spanMs = (Number(ch.dur) + 1) * 60_000;
    if (ch.state === "RUNNING" && ch.enabled && ch.nb && nowMs - utc(ch.nb) > 2 * spanMs) {
      stalled.push(ch);
    }
  }

  console.log("\n=== VERDICT ===");
  const notRunning = chains.filter((x) => x.state !== "RUNNING").length;
  console.log(`${chains.length} chains · ${chains.length - notRunning} RUNNING · ${notRunning} not RUNNING (operator decision, not a stall)`);
  if (stalled.length === 0) {
    console.log("✅ GREEN — every RUNNING chain's next boundary is current.");
  } else {
    console.log(`🔴 RED — ${stalled.length} RUNNING chain(s) pinned to a stale boundary:`);
    for (const s of stalled) {
      console.log(`   ${s.symbol} ${s.dur}m — nextBoundaryAt ${s.nb} UTC (${ago(s.nb, nowMs)}), last round opened ${ago(s.last_open, nowMs)}`);
    }
  }
  await c.end();
  process.exit(stalled.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
