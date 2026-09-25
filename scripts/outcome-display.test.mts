/**
 * Settlement-outcome display guard.
 *
 * The bug this exists to prevent (reported by real users 2026-07-20):
 *
 *   market-card.tsx rendered the settled result as
 *       isResolved ? (yesPct >= 50 ? YES : NO)
 *
 *   `yesPct` is `impliedYesPct()` = yesPool / (yesPool + noPool) — the crowd's MONEY
 *   SPLIT. It has nothing to do with how the market actually settled. On any upset
 *   (crowd 70% on YES, market resolves NO) the board showed the OPPOSITE of the truth,
 *   while the detail page — which reads the real `resolvedOutcome` — showed the correct
 *   one. Users clicked a card marked "RESOLVED YES" and landed on a page saying NO.
 *
 * On a real-money platform the settled side is not something you may ever infer.
 * It comes from `PredictionMarket.resolvedOutcome` or it is not displayed at all.
 *
 * Two rules:
 *   1. No component derives a YES/NO side from a probability/percentage variable.
 *   2. Every MarketCard call site that can render a RESOLVED card passes
 *      `resolvedOutcome`.
 *
 * Run: npm run test:outcome
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment } from "./lib/decomment.mts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}
const rel = (f: string) => relative(ROOT, f).replace(/\\/g, "/");

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("settlement-outcome display guard\n");
const files = walk(SRC);

// ---------------------------------------------------------------------------
// 1. No YES/NO side inferred from a probability.
//    Catches: `yesPct >= 50 ? t.common.yes : t.common.no`
//             `pct > 50 ? "YES" : "NO"`, `impliedYesPct(m) >= 50 ? ...`
// ---------------------------------------------------------------------------
// Anything that could stand in for "which side is ahead": an explicit probability
// variable, a raw percentage, or a direct pool comparison. All of them are the crowd's
// money — none of them is the settled result.
const PROB = new RegExp(
  "\\b(?:" +
    "yesPct|impliedYesPct\\([^)]*\\)|yesPercent|yesProb|probability|percent|pct" +   // probability-ish
    "|yesPool|noPool" +                                                              // raw pools
  ")\\b\\s*(?:>=|>|<=|<|===|!==|==)\\s*(?:\\d+(?:\\.\\d+)?|yesPool|noPool)\\s*\\?",
  "i",
);
const SIDE = /(t\.common\.(yes|no)|["'`](YES|NO)["'`])/;
const inferred: string[] = [];
for (const f of files) {
  const body = decomment(readFileSync(f, "utf8"));
  body.split("\n").forEach((line, i) => {
    if (!PROB.test(line)) return;
    // Only a violation when the ternary actually yields a YES/NO side.
    const after = line.slice(line.search(PROB));
    if (SIDE.test(after)) inferred.push(`${rel(f)}:${i + 1}  ${line.trim().slice(0, 100)}`);
  });
}
check(
  "no YES/NO outcome inferred from a probability",
  inferred.length === 0,
  inferred.length ? `${inferred.length}\n      ${inferred.join("\n      ")}` : "",
);

// ---------------------------------------------------------------------------
// 2. Every MarketCard usage that can be RESOLVED passes resolvedOutcome.
// ---------------------------------------------------------------------------
const missing: string[] = [];
for (const f of files) {
  if (/market-card\.tsx$/.test(f)) continue;
  const body = decomment(readFileSync(f, "utf8"));
  if (!body.includes("<MarketCard")) continue;
  // Split into individual <MarketCard ... /> elements.
  for (const m of body.matchAll(/<MarketCard\b[\s\S]*?\/>/g)) {
    const el = m[0];
    const canResolve = /status\s*=\s*(\{[^}]*RESOLVED[^}]*\}|["']RESOLVED["'])/.test(el)
      // a pass-through `status={m.status}` can also be RESOLVED at runtime
      || /status\s*=\s*\{\s*[a-z]\w*\.status\s*\}/i.test(el);
    if (canResolve && !/resolvedOutcome\s*=/.test(el)) {
      const line = body.slice(0, m.index).split("\n").length;
      missing.push(`${rel(f)}:${line}`);
    }
  }
}
check(
  "every resolvable <MarketCard> passes resolvedOutcome",
  missing.length === 0,
  missing.length ? missing.join(", ") : "",
);

// ---------------------------------------------------------------------------
// 3. The card must not fabricate a side when the outcome is unknown.
//    (Guards the fallback: no side is better than a wrong side.)
// ---------------------------------------------------------------------------
const card = readFileSync(join(SRC, "components/markets/market-card.tsx"), "utf8");
/**
 * 🔴 REWRITTEN 2026-08-19 (`E-169`) — THIS CHECK USED TO REQUIRE THE DEFECT.
 *
 * It asserted that `resolvedOutcome === "YES"` was PRESENT in the card, which pinned a private
 * word-map in the POLL vocabulary into a component rendered by MIXED books (`/results` after
 * #10, `/watchlist` already). Routing the card through the lexicon therefore turned this suite
 * RED — so the correct fix read as a regression, and *"Up & Down says YES won"* was declared
 * fixed twice while this guard held it in place.
 *
 * ⭐ THE RULE IT WAS ACTUALLY FOR IS KEPT, AND IT IS THE ONLY THING ASSERTED NOW: the card must
 * take its side from the stored outcome and never from the crowd's money split (`yesPct`), and
 * an unknown outcome must render NO side rather than a guessed one. Both survive below. What is
 * no longer asserted is HOW the word is looked up — that belongs to the lexicon, which is the
 * one place allowed to know it.
 *
 * ⛔ Note the inversion this is the antidote to: §5 trap 1 asks *"would this still pass if the
 * feature were absent?"*. This one would have FAILED IF THE FEATURE WERE PRESENT.
 */
check(
  "market-card takes its outcome from resolvedOutcome, through the lexicon, and shows no side when unknown",
  // ① the word comes from the lexicon, in THIS CARD'S product — not a private map
  /outcomeWord\(\s*t\s*,\s*resolvedOutcome\s*,\s*productLine\s*\)/.test(card)
  // ② …and the product is a required prop, so no call site can default it
  && /productLine:\s*LabelProductLine;/.test(card)
  // ③ unknown outcome still renders no side at all (the rule the old pin was really for)
  && /resolvedOutcome\s*\?\s*outcomeWord/.test(card)
  // ④ and the side is STILL never inferred from the pool split. Comments stripped both ways:
  //    the prop docs discuss yesPct on purpose, and a doc must not be able to fail a code rule.
  && !PROB.test(card.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")),
  "",
);

// ---------------------------------------------------------------------------
// 4. THE LANDING'S TRUST BAND — law 25 on the surface that was bypassing it.
//
// 🔴 `SettlementRow.outcome` is `"YES" | "NO" | "VOID" | null`, and `trust-band.tsx` had a
//    two-armed dictionary ternary on the YES token — so an UNRECORDED outcome fell through to
//    the NO arm and rendered "NO", IN RED, on a panel headed "THE OUTCOME IS READ, NEVER
//    INFERRED". `ticker.ts` rule 5 drops null rows; `page.tsx` feeds this band from
//    `recentSettlements` DIRECTLY and never saw that filter.
//
// ⛔ BOTH ENDS ARE PINNED, because either alone can rot. The feed must drop the row, AND the
//    component must refuse to describe an outcome it does not have — the previous version was
//    also written when null "could not happen".
// ---------------------------------------------------------------------------
const band = readFileSync(join(SRC, "components/home/trust-band.tsx"), "utf8");
check(
  "the trust band refuses to name an outcome it does not have",
  /if \(row\.outcome === null\) return null;/.test(band),
  "an absent outcome must render nothing — never the NO arm of a two-armed ternary",
);
check(
  "…and it reads the word from the ONE lexicon, not a private map",
  /outcomeWord\(t, row\.outcome, "MARKET"\)/.test(band),
  "",
);
const stats = readFileSync(join(SRC, "lib/server/platform-stats.ts"), "utf8");
check(
  "…and the feed drops an unrecorded outcome before it can reach a surface (ticker rule 5)",
  /\.filter\(\(r\) => r\.outcome === "YES" \|\| r\.outcome === "NO" \|\| r\.outcome === "VOID"\)/.test(stats),
  "recentSettlements must apply the same rule the ticker does",
);

// ---------------------------------------------------------------------------
// D29 · A TERMINAL CARD MAY NOT PAINT A CROWD PRICE NOBODY PAID.
//
// 🔴 The sibling of rule 1 above. That rule says the settled SIDE may never be inferred;
// this one says the crowd PRICE may never be fabricated. `noPrice` was
// `live && (isNew ?? volume === 0)` — a question about the PHASE — so on a resolved or void
// card it was false, and `TippingBar` drew `yesPct`, which `impliedYesPct` returns as a
// hardcoded 50 for an empty pool. A market that was emergency-voided and refunded every
// stake showed a serene 50/50 split nobody had paid.
//
// ⛔ AND THE OBVIOUS ONE-TOKEN FIX IS A REGRESSION, which is why these checks exist in pairs:
// deleting `live &&` alone leaves TWO absence claims behind — the price slot's `aria-label`
// and the bar's own accessible name — both reading "no bets yet" on a market that took real
// money and refunded it. It also destroyed the outcome readout on resolved cards, because that
// was gated on `isResolved` while the absence branch came first. The gate is the POOL; the
// absence claim is about HISTORY; they are different questions and must be asked separately.
//
// ⛔ WHY SOURCE AND NOT A LIVE SWEEP: today's board may hold no resolved-empty and no void
// card for days, so a driver would be green about THIS BOARD and silent about the code
// (MOBILE-VISUAL-PLAN §0 trap 3). The population here is the one file, always present.
// ---------------------------------------------------------------------------
{
  const card = decomment(readFileSync(join(SRC, "components/markets/market-card.tsx"), "utf8"));

  check("D29 the price gate is the POOL, not the phase",
    /const noPrice = isNew \?\? volume === 0;/.test(card) && !/const noPrice = live &&/.test(card),
    "`live && (...)` is the defect verbatim — it shipped until 2026-09-24");

  check("D29 …and 'nobody ever bet' is asked of the predictor count, never of the pool",
    /const neverBet = predictors === 0;/.test(card),
    "`volume` is a claim about NOW; whether anyone ever bet is a claim about HISTORY");

  check("D29 the settled outcome is read before any absence branch, so a VOID is not an absence",
    card.indexOf("{resolvedOutcome ? (") > 0
    && card.indexOf("{resolvedOutcome ? (") < card.indexOf("mcardp-pct--empty"),
    "gated on `isResolved` a VOIDED market falls through to the percentage arm — status is VOIDED, not RESOLVED");

  // ⭐ EVERY PLACE THE CLAIM IS MADE, not just the visible one. Two of the three reach a
  //    screen reader only, which is exactly how the one-token fix looked complete.
  check("D29 the price slot only NAMES an absence of bets where nobody ever bet",
    /neverBet \? \{ "aria-label": t\.market\.noBetsYet \} : \{\}/.test(card),
    "an unconditional aria-label tells a refunded player nobody bet");
  check("D29 the empty rail is named by what is KNOWN — the outcome, else 'no bets yet'",
    /emptyLabel=\{outcomeLabel \?\? t\.market\.noBetsYet\}/.test(card),
    "`\"\"` would leave a role=progressbar with no name at all on every voided card");
  check("D29 the visible 'no bets yet' caption is gated on the history test too",
    /\{noPrice && neverBet && <div className="mcardp-nobets">/.test(card),
    "the caption is the one claim a sighted player can check — it must be true");

  // ⭐ CONTROLS — each matcher shown able to say no, against the pre-fix spelling.
  check("D29 control · the pre-fix phase gate IS detected",
    /const noPrice = live &&/.test("  const noPrice = live && (isNew ?? volume === 0);"));
  check("D29 control · an unconditional aria-label IS detected",
    !/neverBet \? \{ "aria-label": t\.market\.noBetsYet \} : \{\}/
      .test('<div className="mcardp-pct mcardp-pct--empty" aria-label={t.market.noBetsYet}>—</div>'));
  check("D29 control · an ungated caption IS detected",
    !/\{noPrice && neverBet && <div className="mcardp-nobets">/
      .test('{noPrice && <div className="mcardp-nobets">{t.market.noBetsYet}</div>}'));
}

// ---------------------------------------------------------------------------
// D42 · EVERY ARC THE RING PAINTS MUST HAVE A WORD.
//
// 🔴 `OutcomeDonut` divides by `yes + no + voided` and strokes all three, while the legend
// printed only the two SIDES. Measured on production 2026-09-25: 210 markets, arcs
// 118.29° / 188.57° / 53.14°, legend "YES 69 · NO 110" = 179 — so 31 markets, 14.76% of the
// circle, were painted and named nowhere.
//
// 🔴 AND THE VOID FILTER WAS WORSE. `linesShown` keeps a product only when it has a YES or a
// NO, so `/results?out=void` dropped EVERY legend row: 31 results, a full 360° grey circle,
// and not one word on screen. The parts of a ring are a claim about a settled book; a ring
// with an unnamed arc is the same class of defect as an inferred outcome above.
// ---------------------------------------------------------------------------
{
  const res = decomment(readFileSync(join(SRC, "app/results/page.tsx"), "utf8"));

  check("D42 the donut still divides by all three parts",
    /const total = yes \+ no \+ voided \|\| 1;/.test(res),
    "if the denominator loses a term the ring stops being a whole");

  check("D42 …and the legend names the third one",
    /\{voidCount > 0 && \(/.test(res) && /\{t\.market\.statusVoid\} \{voidCount\}/.test(res),
    "an arc with no word is a part of the book the page refuses to account for");

  check("D42 the void word comes from the lexicon, never a literal",
    !/>\s*(Void|Batili|已作废)\s*\{voidCount\}/.test(res),
    "a typed-out word here is the §3b defect in a new place");

  // ⭐ THE VOID-ONLY VIEW IS THE ONE THAT WAS EMPTY. The row must be a SIBLING of the
  //    per-product map, not a child of it, or it disappears exactly when it is the only
  //    thing left to say.
  const mapAt = res.indexOf("linesShown.map(");
  const mapEnd = res.indexOf("))}", mapAt);
  const voidAt = res.indexOf("{voidCount > 0 && (");
  check("D42 the void row survives a view where no product settled a side",
    mapAt > 0 && mapEnd > mapAt && voidAt > mapEnd,
    "inside `linesShown.map` it renders zero times on /results?out=void — the empty-legend bug");

  // ⭐ CONTROLS.
  check("D42 control · a two-term denominator IS detected",
    !/const total = yes \+ no \+ voided \|\| 1;/.test("  const total = yes + no || 1;"));
  check("D42 control · a legend with no void row IS detected",
    !/\{voidCount > 0 && \(/.test("{linesShown.map((line) => (<span key={line}>…</span>))}"));
  check("D42 control · a typed-out void word IS detected",
    />\s*(Void|Batili|已作废)\s*\{voidCount\}/.test('<span className="x">Void {voidCount}</span>'));
}

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — scanned ${files.length} ts/tsx files`);
process.exit(fail === 0 ? 0 : 1);
