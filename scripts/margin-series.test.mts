/**
 * `npm run test:margin-series` — the /admin/finance "Operator margin" chart is a margin.
 *
 * 🔴 WHAT THIS PROTECTS (finding A6). `marginSeries` bucketed stakes, payouts and refunds by
 * the day the money MOVED. Settlement lags the stake by days in a prediction market, so the
 * numerator and denominator described different bets. Measured on the live DB across 23 days:
 * **five days read exactly 100.0%** (nothing had settled yet — impossible in a pari-mutuel,
 * where the operator takes a commission and the rest of the pool belongs to the winners) and
 * one read **−1183.3%** (that day's refunds were 12.8× its stakes). The card was subtitled
 * "band 7–10%".
 *
 * ⛔ THE ASSERTION THAT MATTERS IS §3, THE AGREEMENT. The same page prints a scalar
 * "Operator margin" KPI over the same window. Two surfaces, one name, different denominators
 * — and they disagreed visibly. A cumulative series' LAST point is that scalar by
 * construction, so the guard asserts they are equal rather than asserting the series "looks
 * reasonable".
 *
 * ⚠️ Pure arithmetic over a synthetic ledger, so it runs anywhere with no DB and no clock
 * dependence — the shape of the defect is in the algebra, not in the data.
 */
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = ""): boolean => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

type Day = { stakes: number; payouts: number; refunds: number };

/** The shipped algorithm, in the small: cumulative hold% per bucket. */
function cumulativeMargins(days: Day[]): number[] {
  let s = 0, p = 0, r = 0;
  return days.map((d) => {
    s += d.stakes; p += d.payouts; r += d.refunds;
    return s === 0 ? 0 : ((s - p - r) / s) * 100;
  });
}
/** The OLD algorithm, kept so the guard can show the two disagree on real-shaped data. */
function perBucketMargins(days: Day[]): number[] {
  return days.map((d) => (d.stakes === 0 ? 0 : ((d.stakes - d.payouts - d.refunds) / d.stakes) * 100));
}
/** The scalar KPI: hold% over the whole window. */
function aggregateMargin(days: Day[]): number {
  const s = days.reduce((a, d) => a + d.stakes, 0);
  const p = days.reduce((a, d) => a + d.payouts, 0);
  const r = days.reduce((a, d) => a + d.refunds, 0);
  return s === 0 ? 0 : ((s - p - r) / s) * 100;
}

/**
 * ⭐ THE FIXTURE IS THE REAL PRODUCTION SHAPE, not an invented one — these are four of the
 * 23 days measured off the live database on 2026-08-11, including the two that produced the
 * impossible readings. A guard written against made-up numbers proves the algebra; written
 * against the numbers that actually broke, it proves the defect.
 */
const LIVE_SHAPE: Day[] = [
  { stakes: 4_000,   payouts: 0,       refunds: 0 },       // 2026-07-20 → old: 100.0%
  { stakes: 79_000,  payouts: 1_000,   refunds: 0 },       // 2026-07-21
  { stakes: 13_000,  payouts: 58_097,  refunds: 0 },       // 2026-07-28 → old: −346.9%
  { stakes: 7_500,   payouts: 0,       refunds: 96_250 },  // 2026-07-30 → old: −1183.3%
  { stakes: 825_600, payouts: 362_927, refunds: 379_450 }, // 2026-08-05
];

console.log("\ntest:margin-series — the operator-margin chart is a margin\n");

// ── §1 · the impossible readings are gone ─────────────────────────────────────────
console.log("§1 impossible readings");
{
  const cum = cumulativeMargins(LIVE_SHAPE);
  const old = perBucketMargins(LIVE_SHAPE);

  // ⛔ A CONTROL FIRST: the OLD algorithm must actually produce the defect on this fixture,
  // or §1 is asserting something about data that never had the problem.
  ok("§1 CONTROL — the per-bucket algorithm DOES produce 100% on this live-shaped data",
    old.some((m) => Math.abs(m - 100) < 0.05), `old=[${old.map((m) => m.toFixed(1)).join(", ")}]`);
  ok("§1 CONTROL — and it DOES produce a reading below −300%",
    old.some((m) => m < -300), `min=${Math.min(...old).toFixed(1)}`);

  // A 100% margin means the operator kept the entire pool. It is not a rounding artefact.
  ok("§1 no cumulative point reads 100% once anything has settled",
    !cum.slice(1).some((m) => Math.abs(m - 100) < 0.05), `cum=[${cum.map((m) => m.toFixed(1)).join(", ")}]`);
  ok("§1 no cumulative point swings below −100%",
    !cum.some((m) => m < -100), `min=${Math.min(...cum).toFixed(1)}`);
}

// ── §2 · it is still the canonical hold% definition ───────────────────────────────
console.log("\n§2 the definition is unchanged");
{
  // One bucket → cumulative and per-bucket must agree, because there is nothing to accumulate.
  const one: Day[] = [{ stakes: 1_000, payouts: 700, refunds: 0 }];
  ok("§2 with a single bucket, cumulative === the plain hold% (the definition did not change)",
    Math.abs(cumulativeMargins(one)[0] - perBucketMargins(one)[0]) < 1e-9,
    `${cumulativeMargins(one)[0]} vs ${perBucketMargins(one)[0]}`);
  // Refunds MUST net out — the original docstring's rule, still true.
  const noRefund: Day[] = [{ stakes: 1_000, payouts: 500, refunds: 0 }];
  const withRefund: Day[] = [{ stakes: 1_000, payouts: 500, refunds: 200 }];
  ok("§2 refunds still reduce the margin (a voided poll cannot inflate it)",
    cumulativeMargins(withRefund)[0] < cumulativeMargins(noRefund)[0]);
  ok("§2 an empty window is 0, not NaN",
    cumulativeMargins([{ stakes: 0, payouts: 0, refunds: 0 }])[0] === 0);
}

// ── §3 · THE AGREEMENT — the chart's last point IS the KPI tile ───────────────────
console.log("\n§3 the chart agrees with the tile beside it");
{
  for (const [name, days] of [
    ["the live-shaped fixture", LIVE_SHAPE],
    ["a settled window", [{ stakes: 100, payouts: 90, refunds: 0 }, { stakes: 200, payouts: 150, refunds: 10 }]],
    ["a window with an empty tail", [{ stakes: 500, payouts: 300, refunds: 0 }, { stakes: 0, payouts: 0, refunds: 0 }]],
  ] as const) {
    const cum = cumulativeMargins(days as Day[]);
    const agg = aggregateMargin(days as Day[]);
    ok(`§3 ${name}: the LAST cumulative point equals the aggregate KPI`,
      Math.abs(cum[cum.length - 1] - agg) < 1e-9, `series=${cum[cum.length - 1]} kpi=${agg}`);
  }

  // ⛔ AND THE OLD ALGORITHM MUST FAIL THAT SAME TEST, or §3 proves nothing about the fix.
  const oldLast = perBucketMargins(LIVE_SHAPE).at(-1)!;
  ok("§3 CONTROL — the per-bucket algorithm's last point does NOT equal the KPI",
    Math.abs(oldLast - aggregateMargin(LIVE_SHAPE)) > 1,
    `old-last=${oldLast.toFixed(1)} kpi=${aggregateMargin(LIVE_SHAPE).toFixed(1)}`);
}

// ── §4 · the source really is cumulative ──────────────────────────────────────────
console.log("\n§4 the shipped source");
{
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const src = readFileSync(join(import.meta.dirname, "../src/lib/server/analytics.ts"), "utf8");
  const i = src.indexOf("export async function marginSeries");
  const body = i < 0 ? "" : src.slice(i, src.indexOf("\n}", i));
  ok("§4 marginSeries was located", body.length > 0);
  // The accumulators must be declared OUTSIDE the bucket loop — that is the entire fix, and
  // a `let stakes = 0` inside the loop would restore the defect while keeping every name.
  const loopAt = body.indexOf("for (let i = 0");
  const declAt = body.indexOf("let stakes = 0");
  ok("§4 the running totals are declared BEFORE the bucket loop (that is the fix)",
    declAt > 0 && loopAt > 0 && declAt < loopAt, `decl@${declAt} loop@${loopAt}`);
  // ⛔ ANCHOR ON THE CARD, NOT ON THE PHRASE. `"Operator margin"` appears TWICE in this file
  // — once as the KPI tile's label at :145 and once as this card's title — so
  // `.split("Operator margin")[1]` read the 200 characters after the TILE and the check was
  // vacuous: a RED plant that restored the "band 7–10%" subtitle onto the card left it GREEN.
  // Anchoring on `<AdminCard title="Operator margin"` matches one element, and the assertion
  // below proves it found exactly one.
  const fin = readFileSync(join(import.meta.dirname, "../src/app/admin/finance/page.tsx"), "utf8");
  const cardAnchors = [...fin.matchAll(/<AdminCard\s+title="Operator margin"/g)];
  ok("§4 exactly ONE AdminCard is titled 'Operator margin' (an anchor matching twice is not an anchor)",
    cardAnchors.length === 1, `matches=${cardAnchors.length}`);
  const cardHead = cardAnchors.length === 1 ? fin.slice(cardAnchors[0].index, cardAnchors[0].index + 220) : "";
  ok("§4 that card no longer advertises a per-day band it cannot honour",
    cardHead.length > 0 && !/band 7[–-]10%/.test(cardHead), cardHead.slice(0, 120));
}

console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length > 0 ? 1 : 0);
