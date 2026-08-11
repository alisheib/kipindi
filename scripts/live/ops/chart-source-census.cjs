#!/usr/bin/env node
/**
 * chart-source-census.cjs — do the admin charts' EDGE cases actually occur on production?
 *
 * ⭐ WHY. `npm run test:admin-charts` proves what the primitives DO at the edges by
 * rendering them. That is a fact about the components. Whether those edges are REACHED is
 * a fact about the live data, and asserting reachability without measuring it is how a
 * finding gets filed against code that can never run — the trap `POLL-OPEN-FINDINGS.md`
 * records for F2. So this recomputes each chart's series from raw SQL and reports which
 * edge each one is sitting in right now.
 *
 * The two proven primitive defects whose reachability this measures:
 *   A4 — AdminAreaChart's y-tick labels are `compact()`-rounded to whole numbers, so a
 *        series whose max is ≤ 3 (with the forced 0 baseline) gives DIFFERENT gridlines
 *        IDENTICAL labels.
 *   A5 — AdminStackedBars paints `Math.max(0.5, segH)`, so a provider with NO volume in a
 *        bucket still shows a sliver — and unlike the bar-list and the meter, this chart
 *        prints no number beside it, so nothing discloses the zero.
 *
 * READ-ONLY. No writes, no login, no session touched.
 *   railway run -s 50pick -- node scripts/live/ops/mkenv.cjs
 *   node scripts/live/ops/chart-source-census.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}
const q = (c, sql, p) => c.query(sql, p).then((r) => r.rows);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const [meta] = await q(c, `select current_database() as db, inet_server_addr()::text as addr, now()::text as server_now`);
  console.log("=== IDENTITY ===");
  console.log(`db=${meta.db}  server=${meta.addr}  server_now=${meta.server_now}`);

  const tables = (await q(c, `select table_name from information_schema.tables where table_schema='public'`)).map((r) => r.table_name);
  if (!tables.includes("Transaction")) {
    console.log("⛔ no Transaction table — refusing to report on a series I cannot compute.");
    await c.end(); process.exit(2);
  }

  // ── A5 · provider mix over time — /admin/finance, 14 daily buckets ────────────────
  // `providerStackedSeries` takes the DISTINCT providers over the whole window (max 5) as
  // the legend, then emits one segment per provider per bucket. A provider with no
  // deposits in a bucket therefore contributes a 0 — which paints 0.5px.
  console.log("\n=== A5 · /admin/finance 'Provider mix over time' (14 daily buckets, CONFIRMED deposits) ===");
  const provs = await q(c, `
    select coalesce(provider::text, 'OTHER') as provider, count(*)::int as n
      from "Transaction"
     where type = 'DEPOSIT' and status = 'CONFIRMED'
       and "createdAt" >= now() - interval '28 days'
     group by 1 order by n desc limit 5`);
  console.log(`legend (distinct providers in window, max 5): ${provs.length ? provs.map((p) => `${p.provider}=${p.n}`).join("  ") : "(none)"}`);

  if (provs.length === 0) {
    console.log("⚪ no confirmed deposits in the window — the chart renders its honest 'No data' state, so A5 is NOT reachable today.");
  } else {
    const grid = await q(c, `
      select to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') as day,
             coalesce(provider::text,'OTHER') as provider, count(*)::int as n
        from "Transaction"
       where type='DEPOSIT' and status='CONFIRMED'
         and "createdAt" >= now() - interval '14 days'
       group by 1,2`);
    const legend = provs.map((p) => p.provider);
    const days = [...new Set(grid.map((g) => g.day))].sort();
    let zeroCells = 0, totalCells = 0;
    for (const d of days) for (const p of legend) {
      totalCells++;
      if (!grid.find((g) => g.day === d && g.provider === p)) zeroCells++;
    }
    console.log(`buckets with data: ${days.length}   legend size: ${legend.length}   cells: ${totalCells}`);
    console.log(zeroCells > 0
      ? `🔴 A5 IS REACHABLE — ${zeroCells} of ${totalCells} (provider × day) cells have ZERO volume and each paints a 0.5px sliver with no number beside it.`
      : `⚪ every provider has volume in every bucket — A5 not currently firing.`);
  }

  // ── A4 · area-chart y-axis label collision ───────────────────────────────────────
  // Fires when the series max is ≤ 3, because `minY` is forced to ≤ 0 and the five ticks
  // (0, .25, .5, .75, 1 × range) all round to whole numbers.
  console.log("\n=== A4 · AdminAreaChart y-tick label collision (fires when series max ≤ 3) ===");
  const labelsFor = (min, max) => {
    const lo = Math.min(min, 0), hi = Math.max(max, 1), range = Math.max(hi - lo, 1);
    const compact = (n) => {
      const a = Math.abs(n);
      if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
      if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
      if (a >= 1e3) return `${Math.round(n / 1e3)}K`;
      return Math.round(n).toString();
    };
    return [0, .25, .5, .75, 1].map((t) => compact(lo + t * range));
  };
  const report = (name, min, max) => {
    const l = labelsFor(min, max);
    const uniq = new Set(l).size;
    console.log(`  ${name.padEnd(38)} min=${String(min).padEnd(12)} max=${String(max).padEnd(12)} labels=[${l.join(", ")}] ${uniq < 5 ? `🔴 only ${uniq}/5 distinct` : "✅ 5/5 distinct"}`);
  };

  // 24h hourly NET flow — /admin (overview) and /admin/live
  const flow = await q(c, `
    select date_trunc('hour', "createdAt") as hr,
           sum(case when type='DEPOSIT' then abs(amount)
                    when type in ('WITHDRAWAL','BET_PAYOUT') then -abs(amount) else 0 end)::bigint as net
      from "Transaction"
     where status='CONFIRMED' and "createdAt" >= now() - interval '24 hours'
     group by 1 order by 1`);
  if (flow.length === 0) {
    console.log("  24h net flow                           (no confirmed transactions in 24h — every bucket is 0)");
    report("24h net flow (all-zero series)", 0, 0);
  } else {
    const ys = flow.map((f) => Number(f.net));
    report("24h net flow · /admin + /admin/live", Math.min(...ys), Math.max(...ys));
  }

  // 28-day operator margin (hold %) — /admin/finance
  const marg = await q(c, `
    select to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') as day,
           sum(case when type='BET_PLACED' then abs(amount) else 0 end)::bigint as stakes,
           sum(case when type in ('BET_PAYOUT','CASHOUT') then abs(amount) else 0 end)::bigint as payouts,
           sum(case when type='BET_REFUND' then abs(amount) else 0 end)::bigint as refunds
      from "Transaction"
     where status='CONFIRMED' and "createdAt" >= now() - interval '28 days'
     group by 1 order by 1`);
  const margins = marg.map((m) => {
    const s = Number(m.stakes);
    return s === 0 ? 0 : ((s - Number(m.payouts) - Number(m.refunds)) / s) * 100;
  });
  if (margins.length === 0) report("28d operator margin (empty)", 0, 0);
  else report("28d operator margin · /admin/finance", Math.round(Math.min(...margins)), Math.round(Math.max(...margins)));

  console.log(`\n⚠️ The margin figure is recomputed here from the SAME definition as analytics.ts:359`);
  console.log(`   (stakes − payouts − refunds) / stakes × 100 — so it is a cross-check of the page, not a copy of it.`);

  await c.end();
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
