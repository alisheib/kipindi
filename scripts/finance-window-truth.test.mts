/**
 * FINANCE WINDOW TRUTH — the /admin/finance defects of 2026-09-25, each with a control that
 * proves the check can fail.
 *
 * 🔴 WHAT THIS EXISTS FOR. The finance page resolves ONE window and then handed it to functions
 * that ignored it, re-bucketed it into something the card's own subtitle contradicted, or
 * labelled it in the wrong timezone. Every section below pins one of those, and every section
 * also asserts the OLD behaviour would have failed it — a check that passes on both the broken
 * and the fixed code is not a check.
 *
 * ⛔ §2 REFUSES TO PASS ON AN EAT MACHINE. The whole defect is that a label was rendered in the
 * container's zone; on a UTC+3 box the wrong code and the right code print the same string, so
 * the assertion would be vacuous. It reports BLIND and fails the run instead of printing green.
 */
/* ⛔ PINNED TO UTC, AND THE RUN IS VACUOUS WITHOUT IT. §2's whole subject is a label that was
   rendered in the PROCESS's zone instead of the platform's, so on a UTC+3 machine the broken
   code and the fixed code print the same string and the section proves nothing. Node re-reads
   `process.env.TZ` on assignment (verified on v24), and §2 still checks the effective offset and
   reports BLIND rather than green if this ever stops working. ⚠️ No `cross-env` in this repo and
   a bare `TZ=… ` prefix does not survive npm's cmd.exe on Windows, so it is set here. */
process.env.TZ = "UTC";

import { db } from "../src/lib/server/store.ts";
import type { StoredTxn } from "../src/lib/server/store.ts";
import { providerStackedSeries, bucketGrain, activePlayers } from "../src/lib/server/analytics.ts";
import { dailyKpiSeries, lastEatDays, moneyForWindow } from "../src/lib/server/report-money.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const DAY = 86_400_000;
/* A window far from every other suite's fixtures — `db.txn` has no delete. */
const WIN_START = Date.UTC(2027, 2, 1, 0, 0, 0);
const WIN_END = WIN_START + 14 * DAY;

function txn(id: string, atMs: number, over: Partial<StoredTxn> = {}): StoredTxn {
  return {
    id, userId: `usr_${id}`, walletId: `wlt_${id}`,
    type: "DEPOSIT", status: "CONFIRMED", amount: 1000, fee: 0,
    createdAt: new Date(atMs).toISOString(),
    ...over,
  } as StoredTxn;
}

console.log("\n── 1 · The provider legend and the provider bars are ONE derivation ──");
/* The population split that shipped: the legend came from every type and every status, the
   bars from confirmed deposits only, and the chart paired them BY INDEX. */
const seeded: StoredTxn[] = [
  // Six real depositors, deliberately NOT in volume order of first appearance.
  txn("fw_small", WIN_START + 1 * DAY, { provider: "HALOPESA", amount: 10 }),
  txn("fw_mpesa", WIN_START + 2 * DAY, { provider: "MPESA", amount: 900_000 }),
  txn("fw_airtel", WIN_START + 3 * DAY, { provider: "AIRTEL_MONEY", amount: 700_000 }),
  txn("fw_tigo", WIN_START + 4 * DAY, { provider: "TIGO_PESA", amount: 500_000 }),
  txn("fw_mixx", WIN_START + 5 * DAY, { provider: "MIXX", amount: 300_000 }),
  txn("fw_azam", WIN_START + 6 * DAY, { provider: "AZAMPESA", amount: 100_000 }),
  // ⭐ THE TWO ROWS THAT BROKE IT. Neither is a confirmed deposit, so neither has a bar —
  // but the old legend query counted both and handed each a swatch.
  txn("fw_wd_only", WIN_START + 7 * DAY, { provider: "SELCOM", type: "WITHDRAWAL", amount: -50_000 }),
  txn("fw_failed", WIN_START + 8 * DAY, { provider: "CRDB", status: "FAILED", amount: 400_000 }),
  // A bookkeeping leg — never a payment provider.
  txn("fw_internal", WIN_START + 9 * DAY, { provider: "INTERNAL", type: "BONUS_CREDIT", amount: 5_000 }),
];
for (const t of seeded) await db.txn.create(t);

const series = await providerStackedSeries({ start: WIN_START, end: WIN_END }, 14);
ok("CONTROL · the fixture actually reached the binner",
  series.providers.length > 0 && series.bars.length === 14,
  `${series.providers.length} provider(s), ${series.bars.length} bucket(s)`);

ok("every bar has exactly one segment per legend entry",
  series.bars.every((b) => b.segments.length === series.providers.length),
  `legend ${series.providers.length} vs segments ${series.bars[0]?.segments.length}`);

ok("a provider seen only on a WITHDRAWAL takes no swatch",
  !series.providers.includes("SELCOM"), series.providers.join(","));
ok("a provider seen only on a FAILED deposit takes no swatch",
  !series.providers.includes("CRDB"), series.providers.join(","));
ok("INTERNAL is not a payment provider here either",
  !series.providers.includes("INTERNAL"));

ok("the cap keeps the LARGEST five, not the first five seen",
  series.providers[0] === "MPESA" && !series.providers.includes("HALOPESA"),
  series.providers.join(" > "));
ok("and what the cap left out is reported, not dropped in silence",
  series.otherCount === 1, `otherCount=${series.otherCount}`);

/* ⭐ THE DELTA. This reproduces the legend query that shipped — every type, every status,
   minus INTERNAL, first-seen order, capped at five — and asserts it DISAGREES with the bars.
   If this ever matches, the two derivations have grown back together and §1 above is vacuous. */
const inWin = (await db.txn.listInRange(WIN_START, WIN_END));
const oldLegend = Array.from(new Set(inWin.map((t) => t.provider ?? "OTHER").filter((p) => p !== "INTERNAL"))).slice(0, 5);
ok("CONTROL · the legend that shipped really did name different providers than the bars sum",
  JSON.stringify(oldLegend) !== JSON.stringify(series.providers),
  `shipped [${oldLegend.join(",")}] vs binned [${series.providers.join(",")}]`);

console.log("\n── 2 · Chart bucket labels are EAT, not the container's zone ──");
const offsetMin = -new Date(WIN_START).getTimezoneOffset(); // minutes east of UTC
if (offsetMin === 180) {
  fail++;
  console.log(`FAIL BLIND · this process is already at UTC+3, so a local-zone label and an EAT label are identical here. Re-run with TZ=UTC — otherwise this section proves nothing.`);
} else {
  ok("CONTROL · the process zone differs from EAT, so the assertion can discriminate",
    true, `local offset ${offsetMin >= 0 ? "+" : ""}${offsetMin}min vs EAT +180min`);
  /* 21:30 UTC on 1 Mar 2027 is 00:30 EAT on 2 Mar — the label must say the 2nd. */
  const edgeStart = Date.UTC(2027, 2, 1, 21, 30, 0);
  const edge = await providerStackedSeries({ start: edgeStart, end: edgeStart + 2 * 3600_000 }, 2);
  ok("a bucket opening at 21:30 UTC is labelled as the EAT day that has already begun",
    edge.bars[0]?.label === "2/3",
    `label=${edge.bars[0]?.label} (EAT expects 2/3; a UTC reader prints 1/3)`);
}

console.log("\n── 3 · A daily series returns the number of days it was asked for ──");
const NOW = Date.UTC(2027, 2, 10, 14, 37, 0); // deliberately NOT an EAT midnight
const win7 = lastEatDays(7, NOW);
const k = await dailyKpiSeries(win7, NOW);
ok("lastEatDays(7) yields exactly 7 daily points", k.ggr.length === 7, `${k.ggr.length} point(s)`);
ok("…and its window opens exactly on an EAT midnight",
  (win7.start + 3 * 3600_000) % DAY === 0,
  new Date(win7.start).toISOString());
/* ⭐ THE DELTA — the rolling preset this replaced. */
const rolling = { start: NOW - 7 * DAY, end: NOW };
const kOld = await dailyKpiSeries(rolling, NOW);
ok("CONTROL · the rolling 7d window really did return EIGHT points, with a short first day",
  kOld.ggr.length === 8, `${kOld.ggr.length} point(s)`);

console.log("\n── 4 · A card can state what a bucket actually is ──");
const g7 = bucketGrain(NOW - 7 * DAY, NOW, 28);
ok("28 buckets over 7 days is six-HOURLY, not daily", g7.grain === "6-hour", g7.grain);
ok("…which is exactly why '28-day daily series' was false on the default window", g7.buckets === 28);
const g28 = bucketGrain(NOW - 28 * DAY, NOW, 28);
ok("28 buckets over 28 days really is daily", g28.grain === "daily", g28.grain);

console.log("\n── 5 · An 'active player' is one whose money actually MOVED ──");
/* `summarise()` filtered every money figure to CONFIRMED and then counted active players over
   the UNFILTERED rows — so a declined deposit made someone active. Both halves are asserted from
   the SAME window so the negative cannot pass by looking at nothing. */
{
  const W = Date.UTC(2027, 5, 1);
  const w = { start: W, end: W + DAY };
  const before = (await moneyForWindow(w.start, w.end)).activePlayers;

  // A player whose ONLY transaction in the window FAILED. Money never moved.
  await db.txn.create(txn("ap_failed", W + 3600_000, {
    userId: "usr_ap_failed", type: "DEPOSIT", status: "FAILED", amount: 250_000,
  }));
  const afterFailed = (await moneyForWindow(w.start, w.end)).activePlayers;
  ok("a FAILED-only player does not become active",
    afterFailed === before, `${before} → ${afterFailed}`);

  // CONTROL, from the same query: a CONFIRMED transaction MUST move it by exactly one.
  await db.txn.create(txn("ap_ok", W + 7200_000, {
    userId: "usr_ap_ok", type: "DEPOSIT", status: "CONFIRMED", amount: 10_000,
  }));
  const afterOk = (await moneyForWindow(w.start, w.end)).activePlayers;
  ok("CONTROL · a CONFIRMED player moves it by exactly one",
    afterOk === afterFailed + 1, `${afterFailed} → ${afterOk}`);

  /* ⭐ THE DELTA. This is what the shipped code counted — every status — and it must DISAGREE
     with the figure above, or §5 is measuring nothing. */
  const all = await db.txn.listInRange(w.start, w.end);
  const oldWay = new Set(all.map((t) => t.userId)).size;
  ok("CONTROL · the all-status count that shipped really is higher",
    oldWay === afterOk + 1, `all-status ${oldWay} vs confirmed ${afterOk}`);

  // `analytics.activePlayers` must not be a second opinion.
  const viaAnalytics = await activePlayers(w);
  ok("analytics.activePlayers agrees with summarise, because it delegates to it",
    viaAnalytics === afterOk, `analytics ${viaAnalytics} vs summarise ${afterOk}`);
}

console.log(`\nfinance-window-truth: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
