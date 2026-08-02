/**
 * THE TRADING CALENDAR — finding E-36.
 *
 *   npx tsx scripts/market-calendar.test.mts     (npm run test:market-calendar)
 *
 * ── WHAT THIS EXISTS TO STOP ─────────────────────────────────────────────────
 * Real money settled on a price no market made.
 *
 * Until 2026-08-02 the platform had no calendar at all, on the documented reasoning that a
 * shut market stops advancing its quote timestamp (so the staleness gate refuses it) and, if
 * it did not, that `minMoveTicks` would void the round as a no-move. Measured against the
 * live provider, both premises are false: `last_quote_at` advanced every minute for XAU/USD
 * and EUR/USD **on a Sunday**, `is_market_open` returned `true`, and the weekend 1-minute
 * bars move. Through the real `computeTargets`, 20-22% of gold and 90-95% of EUR/USD
 * 5-minute weekend windows would have RESOLVED rather than voided — paying real money on a
 * tape the named market did not produce.
 *
 * ⚠️ What is deliberately NOT asserted: that those prints are fabricated. That was the first
 * reading and it did not survive testing — see the note in `market-calendar.ts`. The defect
 * stands without it: spot XAU/USD is shut, and the platform would settle on it anyway.
 *
 * ── THE ONE CASE THAT MATTERS MOST ───────────────────────────────────────────
 * §5 replays REAL Saturday bars and asserts they would have RESOLVED a round — it reproduces
 * the defect — then asserts the calendar refuses that boundary. A case that only checked
 * "Saturday is closed" would pass against a calendar the money path never consults.
 *
 * ⚠️ PROVEN RED BEFORE THE FIX. With `marketSessionAt` returning `{open:true}`
 * unconditionally — precisely the pre-E-36 platform — 10 cases fail, §5.4 among them.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import {
  marketSessionAt, isMarketOpenAt, sessionKindFor, describeClosure, nextOpenAfter,
} from "../src/lib/server/market-calendar.ts";
import { computeTargets } from "../src/lib/server/updown-config.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

// 2026-08-01 is a Saturday, 2026-08-02 a Sunday, 2026-07-31 a Friday. Verified rather than
// assumed — a test built on the wrong weekday would assert the opposite of what it claims.
const dow = (iso: string) => new Date(iso).getUTCDay();
ok("0.1 · the fixture dates really are Fri/Sat/Sun",
   dow("2026-07-31T14:00:00Z") === 5 && dow("2026-08-01T12:00:00Z") === 6 && dow("2026-08-02T12:00:00Z") === 0,
   `${dow("2026-07-31T14:00:00Z")}/${dow("2026-08-01T12:00:00Z")}/${dow("2026-08-02T12:00:00Z")}`);

// ── 1 · crypto never closes ──────────────────────────────────────────────────
{
  ok("1.1 · crypto is 'always'", sessionKindFor("crypto") === "always");
  for (const at of ["2026-08-01T12:00:00Z", "2026-08-02T03:00:00Z", "2026-07-31T21:30:00Z"]) {
    ok(`1.2 · crypto is open at ${at}`, isMarketOpenAt("crypto", at));
  }
}

// ── 2 · the FX/metals week ───────────────────────────────────────────────────
{
  ok("2.1 · macro follows the FX/metals week", sessionKindFor("macro") === "fx-metals");
  ok("2.2 · SATURDAY is shut — the case that produced E-36",
     marketSessionAt("macro", "2026-08-01T12:00:00Z").open === false);
  ok("2.3 · Saturday's refusal is reported as the WEEKEND, not as a missing price",
     (marketSessionAt("macro", "2026-08-01T12:00:00Z") as { reason: string }).reason === "weekend");
  ok("2.4 · Sunday 12:00 is shut — the week has not opened",
     !isMarketOpenAt("macro", "2026-08-02T12:00:00Z"));
  ok("2.5 · Sunday 21:59 is still shut", !isMarketOpenAt("macro", "2026-08-02T21:59:00Z"));
  ok("2.6 · Sunday 22:00 is OPEN — the week starts", isMarketOpenAt("macro", "2026-08-02T22:00:00Z"));
  ok("2.7 · Wednesday midday is open", isMarketOpenAt("macro", "2026-08-05T12:00:00Z"));
  ok("2.8 · Friday 20:59 is still open", isMarketOpenAt("macro", "2026-07-31T20:59:00Z"));
  ok("2.9 · Friday 21:00 is shut — the week ends", !isMarketOpenAt("macro", "2026-07-31T21:00:00Z"));
}

// ── 3 · unknown input never becomes a licence to trade ───────────────────────
{
  ok("3.1 · an unrecognised category gets the CONSERVATIVE calendar, not 'always'",
     sessionKindFor("weather") === "fx-metals" && !isMarketOpenAt("weather", "2026-08-01T12:00:00Z"));
  ok("3.2 · an unparseable instant is REFUSED rather than allowed",
     !isMarketOpenAt("macro", "not-a-date"));
  ok("3.3 · the closure sentence names the calendar as the cause",
     /market closed/i.test(describeClosure(marketSessionAt("macro", "2026-08-01T12:00:00Z"))) &&
     /refunded in full/i.test(describeClosure(marketSessionAt("macro", "2026-08-01T12:00:00Z"))));
}

// ── 4 · nextOpenAfter tells an operator WHEN, not just "no" ──────────────────
{
  ok("4.1 · from Saturday noon, the next open is Sunday 22:00 UTC",
     nextOpenAfter("macro", "2026-08-01T12:00:00Z") === "2026-08-02T22:00:00.000Z",
     nextOpenAfter("macro", "2026-08-01T12:00:00Z"));
  ok("4.2 · from an instant already open, it returns that instant",
     nextOpenAfter("macro", "2026-08-05T12:34:00Z") === "2026-08-05T12:34:00.000Z",
     nextOpenAfter("macro", "2026-08-05T12:34:00Z"));
  ok("4.3 · crypto is always already open",
     nextOpenAfter("crypto", "2026-08-01T12:00:00Z") === "2026-08-01T12:00:00.000Z");
}

// ── 5 · ⛔ REPRODUCE THE DEFECT, then show the calendar refuses it ───────────
// REAL bars read from the live provider for XAU/USD on Saturday 2026-08-01, a day on which
// spot metals are shut. GOLD's live asset row is decimals 2, minMoveTicks 15 → a $0.15 floor,
// which is the "safety net" E-36's premise 2 relied on.
//
// ⚠️ These five bars were CHOSEN because they are the first Saturday 5-minute window that
// CLEARS that floor — 83 of 288 do (28.8%). An arbitrary window would not have, and a case
// built on one that voids anyway would look like a reproduction while proving nothing. The
// first draft of this section did exactly that: it asserted `Math.abs(close - open) > 0`,
// which cannot fail, over a window the tick floor would have voided.
const GOLD = { decimals: 2, minMoveTicks: 15 };
//
// ⚠️ Prices are rounded to the asset's 2 decimals, because that is what the money path
// actually stores (`quoteAsset` returns `Number(price.toFixed(decimals))`). Feeding the raw
// 5-decimal provider values in made the band read ±0.15357 instead of ±0.15 — the round-trip
// through `toFixed` on the target but not the base. A fixture that is not in the form the
// engine stores is testing a case the engine never sees.
const SAT_BARS = [
  { t: "2026-08-01T00:00:00.000Z", o: 4030.40, c: 4027.55 },
  { t: "2026-08-01T00:01:00.000Z", o: 4028.11, c: 4027.36 },
  { t: "2026-08-01T00:02:00.000Z", o: 4027.31, c: 4030.04 },
  { t: "2026-08-01T00:03:00.000Z", o: 4028.23, c: 4031.25 },
  { t: "2026-08-01T00:04:00.000Z", o: 4030.76, c: 4031.66 },
];
{
  const open = SAT_BARS[0]!.o, close = SAT_BARS[4]!.c;
  const { upTarget, downTarget } = computeTargets(open, 0, GOLD);
  const outcome = close >= upTarget ? "UP" : close <= downTarget ? "DOWN" : "VOID";

  ok("5.1 · the tick floor really is $0.15 on the live GOLD row",
     Math.abs(upTarget - open - 0.15) < 1e-9, `band ±${(upTarget - open).toFixed(5)}`);
  ok("5.2 · ⛔ THE DEFECT: this shut-market window RESOLVES UP, it does not void",
     outcome === "UP", `moved ${(close - open).toFixed(5)} → ${outcome}`);
  ok("5.3 · …and the amount is not marginal — it clears the floor 8x over",
     Math.abs(close - open) > 8 * 0.15, `moved ${(close - open).toFixed(5)} vs floor 0.15`);
  ok("5.4 · ⛔ the calendar refuses that boundary, so nothing can settle on it",
     !isMarketOpenAt("macro", SAT_BARS[4]!.t) && !isMarketOpenAt("macro", SAT_BARS[0]!.t));
  ok("5.5 · and the same instant on a CRYPTO asset is still open — the gate is per class",
     isMarketOpenAt("crypto", SAT_BARS[4]!.t));
}

// ── 6 · the known limit, pinned so it cannot be forgotten ────────────────────
// A cash equity index trades ~13:30-20:00 UTC, NOT the FX week — and the platform files it
// under the same `macro` category as gold. This case does not assert correct behaviour; it
// asserts that the SHORTFALL is what the code says it is, so a future index feed cannot
// quietly inherit the wrong calendar.
{
  ok("6.1 · KNOWN LIMIT — an index under `macro` is called open at 03:00 UTC, outside cash hours",
     isMarketOpenAt("macro", "2026-08-05T03:00:00Z"),
     "documented in market-calendar.ts: an index needs its own session kind before it is fed");
}

console.log(`\n${fail === 0 ? "✅" : "❌"} market calendar (E-36): ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
