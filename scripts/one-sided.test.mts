/**
 * test:one-sided — a market with money on ONE side states no price, on every card (landing v3 WP6).
 *
 * 🔴 THE DEFECT. Production, 2026-09-26/27: the landing's "Pick a side now" grid led with two markets
 * whose money sat on one side only, and each card read "YES 100% · NO @ 0%" — a certainty nobody's
 * money stated, in the default language, on the page every new visitor sees (the gate's V17, 66
 * findings across 33 cells). The card could not tell a one-sided pool from a 99.6% one, because it was
 * handed a finished, rounded percentage: five callers passed `impliedYesPct(m)`, two `yesPct ?? 0` —
 * the "tripwire" whose 0 renders exactly like the defect (MOBILE-VISUAL ruling 13).
 *
 * THE RULE (ruling 13 + INHERIT-MANIFEST L14), in one pure function, `priceState`:
 *   · nothing staked      → no price (the em-dash, "No bets yet")
 *   · money on one side   → no price: "One side only", the dashed rail, buttons without a figure,
 *                           and the refund rule
 *   · money on both sides → a price, shown within 1–99, the NO figure always 100 − YES
 * and the card takes the POOLS so no caller can hand it a price that disagrees with them.
 *
 * ⭐ THE NOTE IS A MONEY CLAIM, SO ITS TRUTH IS PINNED HERE TOO (§6). "If betting closes one-sided,
 * every stake is refunded in full" is true because `settleMarket` refunds every open position at its
 * full stake with no fee whenever one pool is empty — whatever the verdict — and the published rules
 * say so (§7). If that branch is ever removed or narrowed, this suite fails before the card lies.
 *
 * ⛔ EVERY REFUSAL IS PAIRED WITH A CONTROL that shows the matcher can say no.
 *
 * Run: npm run test:one-sided
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment } from "./lib/decomment.mts";
import { priceState, priceTier } from "../src/lib/markets/price-state.ts";
import { dict } from "../src/lib/i18n-dict.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const rel = (f: string) => relative(ROOT, f).replace(/\\/g, "/");

let fail = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) log(`  PASS ${label}`);
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("one-sided markets state no price (landing v3 WP6 · MOBILE-VISUAL ruling 13 · L14)\n");

// ── 1 · the rule itself ──────────────────────────────────────────────────────────────────────
log("── 1 · priceState: three states, read from the pools");
{
  const s = (y: number, n: number) => JSON.stringify(priceState(y, n));
  check("1.1 nothing staked has no price", s(0, 0) === '{"kind":"none"}', s(0, 0));
  check("1.2 money on YES only is one-sided, and names NO as the empty side",
    s(25_000, 0) === '{"kind":"oneSided","emptySide":"NO"}', s(25_000, 0));
  check("1.3 money on NO only is one-sided, and names YES as the empty side",
    s(0, 9_000) === '{"kind":"oneSided","emptySide":"YES"}', s(0, 9_000));
  check("1.4 a single stake is one-sided, not a 100% price", priceState(1_000, 0).kind === "oneSided", s(1_000, 0));
  check("1.5 ⛔ a lopsided TWO-SIDED pool (25,000 vs 100) is shown at 99, never 100", s(25_000, 100) === '{"kind":"priced","yesPct":99}', s(25_000, 100));
  check("1.6 ⛔ and its mirror image at 1, never 0", s(100, 25_000) === '{"kind":"priced","yesPct":1}', s(100, 25_000));
  check("1.7 199 vs 1 (rounds to 100) is 99", s(199, 1) === '{"kind":"priced","yesPct":99}', s(199, 1));
  check("1.8 an ordinary split is untouched", s(13_000, 12_000) === '{"kind":"priced","yesPct":52}', s(13_000, 12_000));
  // ⭐ CONTROLS — the clamp is not a constant, and the rounding it corrects is real.
  check("1.8-control an even pool reads 50, so priced figures are not pinned", s(10_000, 10_000) === '{"kind":"priced","yesPct":50}', s(10_000, 10_000));
  check("1.5-control the unclamped share of 25,000 vs 100 DOES round to 100",
    Math.round((25_000 / 25_100) * 100) === 100);
  check("1.9 the tier follows the state: 0 priced · 1 one-sided · 2 empty",
    priceTier({ yesPool: 25_000, noPool: 100 }) === 0 && priceTier({ yesPool: 0, noPool: 5 }) === 1
    && priceTier({ yesPool: 0, noPool: 0 }) === 2);
  // Every priced figure lies in 1..99 across a sweep — the NO figure is 100 − YES, so it does too.
  let outOfRange = "";
  for (const y of [1, 2, 5, 100, 199, 200, 1_000, 99_999, 1_000_000]) {
    for (const n of [1, 2, 5, 100, 199, 200, 1_000, 99_999, 1_000_000]) {
      const p = priceState(y, n);
      if (p.kind !== "priced" || p.yesPct < 1 || p.yesPct > 99) outOfRange += ` ${y}/${n}→${JSON.stringify(p)}`;
    }
  }
  check("1.10 every two-sided pool in a 9×9 sweep is priced within 1–99", outOfRange === "", outOfRange);
}

// ── 2 · the card takes the POOLS, required, from every caller ─────────────────────────────────
log("\n── 2 · the card's contract: pools in, never a finished price");
const cardRaw = read("src/components/markets/market-card.tsx");
const card = decomment(cardRaw);
{
  const props = card.slice(card.indexOf("type Props = {"), card.indexOf("};", card.indexOf("type Props = {")));
  check("2.1 `yesPool` and `noPool` are REQUIRED props (no `?`, no default)",
    /\byesPool: number;/.test(props) && /\bnoPool: number;/.test(props), "a default lets a caller that does not know its pools compile");
  check("2.2 the card no longer accepts a finished `yesPct` or `volume`",
    !/\byesPct\??:/.test(props) && !/\bvolume\??:/.test(props));
  check("2.2-control the props slice is the real type (it names productLine)", /productLine: LabelProductLine;/.test(props));

  const sites: string[] = [];
  const bad: string[] = [];
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(e) ? [p] : [];
  });
  const siteProblem = (el: string) =>
    !/\byesPool=\{/.test(el) ? "no yesPool" : !/\bnoPool=\{/.test(el) ? "no noPool"
      : /\byesPct=\{/.test(el) ? "passes yesPct" : /\bvolume=\{/.test(el) ? "passes volume"
      : /\b(?:yesPool|noPool)=\{[^}]*\?\?\s*0\s*\}/.test(el) ? "a pool with a `?? 0` fallback" : "";
  for (const f of walk(SRC)) {
    if (/market-card\.tsx$/.test(f)) continue;
    const body = decomment(readFileSync(f, "utf8"));
    for (const m of body.matchAll(/<MarketCard\b[\s\S]*?\/>/g)) {
      const at = `${rel(f)}:${body.slice(0, m.index).split("\n").length}`;
      sites.push(at);
      const why = siteProblem(m[0]);
      if (why) bad.push(`${at} (${why})`);
    }
  }
  check("2.3 every <MarketCard> passes both pools, and no price or `?? 0`", bad.length === 0, bad.join(", "));
  check("2.4 all seven call sites were found (a scan that finds none proves nothing)", sites.length >= 7, `${sites.length}: ${sites.join(", ")}`);
  // ⭐ CONTROL — the site check can say no to the pre-fix shape.
  check("2.3-control the pre-fix call site IS flagged",
    siteProblem("<MarketCard productLine={\"MARKET\"} yesPct={r.yesPct ?? 0} volume={r.pool} />") === "no yesPool");
  check("2.3-control a zero-defaulted pool IS flagged, an unrelated `?? 0` is not",
    siteProblem("<MarketCard yesPool={r.yesPool ?? 0} noPool={r.noPool} />") === "a pool with a `?? 0` fallback"
    && siteProblem("<MarketCard yesPool={m.yesPool} noPool={m.noPool} comments={c.get(m.id) ?? 0} />") === "");
}

// ── 3 · the card renders the three states honestly ─────────────────────────────────────────────
log("\n── 3 · the card's one-sided state");
{
  check("3.1 the card decides from the pools, once", /const price = priceState\(yesPool, noPool\);/.test(card));
  check("3.2 a price is shown only where both pools hold money",
    /const showPrice = !noPrice && price\.kind === "priced";/.test(card));
  const suffixes = card.match(/\{showPrice && <span className="font-mono text-\[11\.5px\]"> @ \{(?:yesPct|100 - yesPct)\}%<\/span>\}/g) ?? [];
  check("3.3 ⛔ neither YES nor NO button carries '@ n%' without a price (both suffixes gated)", suffixes.length === 2, `${suffixes.length} gated suffixes`);
  const arias = card.match(/aria-label=\{\(showPrice \? t\.market\.backSideAria\.replace\("\{pct\}"/g) ?? [];
  check("3.4 ⛔ nor does either button's accessible name", arias.length === 2, `${arias.length} gated names`);
  check("3.5 the one-sided rail is the dashed empty rail, never a full pill",
    /empty=\{noPrice \|\| oneSided\}/.test(card));
  check("3.6 the rail and the label say 'One side only', never 'No bets yet' (money IS on it)",
    /oneSided \? t\.market\.oneSideOnly : t\.market\.noBetsYet/.test(card)
    && /<span className="mcardp-oneside">\{t\.market\.oneSideOnly\}<\/span>/.test(card));
  check("3.7 no 24h sparkline on a one-sided card (its history is a line pinned at 100)",
    /const showSpark = !fresh && !oneSided && /.test(card));
  check("3.8 the note names the empty side in the card's own product vocabulary",
    /\.replace\("\{side\}", sideWord\(t, emptySide, productLine\)\)/.test(card));
  check("3.9 the note is withheld once the market is settled (the card cannot see what was paid)",
    /const oneSidedNote = !emptySide \|\| settled \? null/.test(card)
    && /const settled = !!resolvedOutcome \|\| isResolved \|\| status === "VOIDED";/.test(card));
  check("3.10 the TIPPING badge is never computed from a one-sided or empty pool",
    /getSignalBadge\(live, showPrice \? yesPct : null,/.test(card));
  // ⭐ CONTROLS — against the pre-fix spellings.
  check("3.3-control an ungated suffix IS detected",
    !/\{showPrice && <span className="font-mono text-\[11\.5px\]"> @ \{yesPct\}%<\/span>\}/
      .test('{!noPrice && <span className="font-mono text-[11.5px]"> @ {yesPct}%</span>}'));
  check("3.5-control the pre-fix rail IS detected", !/empty=\{noPrice \|\| oneSided\}/.test("empty={noPrice}"));
}

// ── 4 · the hero board row, and the landing's price floor ────────────────────────────────────────
log("\n── 4 · the hero board row and the landing tiers");
{
  const hero = decomment(read("src/components/home/landing-hero.tsx"));
  const qrow = hero.slice(hero.indexOf("function QuestionRow("), hero.indexOf("export function LandingHero("));
  check("4.1 the board row reads its state from its pools", /const price = priceState\(row\.yesPool, row\.noPool\);/.test(qrow));
  check("4.2 ⛔ the row never prints or draws the rounded share (`row.yesPct`)", !/row\.yesPct/.test(qrow), "row.yesPct reads 100 on a one-sided pool");
  check("4.3 a one-sided row is labelled 'One side only', not 'No bets yet'",
    /price\.kind === "oneSided" \? t\.market\.oneSideOnly : t\.home\.heroNoPrice/.test(qrow));
  check("4.2-control the slice is the real row (it renders .kp-qrow)", /className="kp-qrow"/.test(qrow));

  const heroTs = decomment(read("src/lib/markets/hero.ts"));
  const landingTs = decomment(read("src/lib/markets/landing.ts"));
  check("4.4 the hero's floor is read from the pools (`priceTier`), not the rounded 0/100",
    /priceTier\(r\) === tier/.test(heroTs) && !/yesPct === 0 \|\| r\.yesPct === 100/.test(heroTs));
  check("4.5 the landing grid seats priced markets first (`priceTier`)", /priceTier\(r\) === tier/.test(landingTs));
  check("4.4-control the rounded tier IS detected",
    /yesPct === 0 \|\| r\.yesPct === 100/.test("r.yesPct == null ? 2 : (r.yesPct === 0 || r.yesPct === 100) ? 1 : 0"));
}

// ── 5 · the words, in all three languages ─────────────────────────────────────────────────────────
log("\n── 5 · the dictionary");
{
  const L = ["en", "sw", "zh"] as const;
  for (const loc of L) {
    const m = dict[loc].market as Record<string, string>;
    check(`5.1 ${loc} has the label and both notes`, !!m.oneSideOnly && !!m.oneSidedNote && !!m.oneSidedClosedNote);
    check(`5.2 ${loc} names the empty side in the open-market note`, (m.oneSidedNote ?? "").includes("{side}"), m.oneSidedNote);
    // ⛔ A "100%" or "0%" in the note would be the very figure the card withholds (and `test:rate-copy`).
    check(`5.3 ${loc} states no percentage`, !/\d\s*%/.test(`${m.oneSideOnly} ${m.oneSidedNote} ${m.oneSidedClosedNote}`));
  }
  const en = dict.en.market as Record<string, string>;
  check("5.4 the English note says the refund is in full, and conditions it on betting closing one-sided",
    /refunded in full/.test(en.oneSidedNote) && /If betting closes one-sided/.test(en.oneSidedNote));
  // ⛔ "No one has picked {side}" (the delivery's wording) is false after a cash-out empties a side a
  // player DID pick; the note speaks about the pool.
  check("5.5 the note speaks about stakes, not about who picked", /^No stake on \{side\} yet\./.test(en.oneSidedNote), en.oneSidedNote);
}

// ── 6 · the claim is TRUE: the settlement branch and the published rule it restates ───────────────
log("\n── 6 · the refund the note promises is the one settlement pays");
{
  const svc = decomment(read("src/lib/server/market-service.ts"));
  const settleAt = svc.indexOf("export async function settleMarket(");
  const branch = svc.slice(svc.indexOf("const isOneSided = opts.outcome !== \"VOID\"", settleAt), svc.indexOf("winnersPaid: 0", settleAt));
  check("6.0 the one-sided branch lives inside settleMarket", settleAt > 0 && branch.length > 0, `settleAt=${settleAt} branch=${branch.length}`);
  // The predicate is the POOL's shape and ignores the verdict — so a refund "whatever the result".
  check("6.1 settlement treats a pool with one empty side as one-sided, whichever side won",
    /const isOneSided = opts\.outcome !== "VOID"\s*&& \(\(m\.yesPool > 0 && m\.noPool === 0\) \|\| \(m\.yesPool === 0 && m\.noPool > 0\)\);/.test(branch));
  check("6.2 every open position gets its FULL stake back", /p\.status = "VOID"; p\.finalPayout = p\.stake;/.test(branch));
  check("6.3 as a BET_REFUND with no fee", /type: "BET_REFUND"/.test(branch) && /fee: 0,/.test(branch));
  const rules = read("src/app/legal/rules/_content-yes-no.tsx");
  check("6.4 the published rules state the same rule the note restates (en §7)",
    /if only one side holds any stake at closing, every stake is refunded in full/.test(rules));
  // ⭐ CONTROL — the branch slice is real code, not an empty or whole-file slice.
  check("6.1-control the branch slice is bounded (it is not the whole file)", branch.length > 200 && branch.length < 20_000, String(branch.length));
}

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — one-sided markets`);
process.exit(fail === 0 ? 0 : 1);
