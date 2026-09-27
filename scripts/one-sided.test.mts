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
import { priceState, priceTier, shownYesPct, isTipping, TIPPING_BAND } from "../src/lib/markets/price-state.ts";
import { liveContest } from "../src/lib/markets/live-contest.ts";
import { leanWords } from "../src/lib/side-label.ts";
import { isNotableResult } from "../src/lib/results/archive.ts";
import { matchesOdds, type DiscoveryRow } from "../src/lib/markets/discovery.ts";
import { dict } from "../src/lib/i18n-dict.ts";
import { poolFee } from "../src/lib/payout.ts";

/** §14 · the files that may still call the old price helpers. ⛔ It only shrinks (C1: B, C, G each remove entries). */
const ALLOW_OLD_PRICE: readonly string[] = [
  "src/app/admin/markets/page.tsx",
  "src/app/admin/markets/[id]/page.tsx",
  "src/app/admin/resolver-queue/page.tsx",
  "src/app/admin/resolver/[id]/page.tsx",
];

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
    /emptyLabel=\{outcomeLabel \?\? \(oneSided \? t\.market\.oneSideOnly : neverBet \? t\.market\.noBetsYet : t\.market\.noPoolYet\)\}/.test(card)
    && /<span className="mcardp-oneside">\{t\.market\.oneSideOnly\}<\/span>/.test(card));
  // ⛔ THE HEADLINE SLOT (WP6 review): without its own one-sided arm a one-sided card falls through to
  // the priced arm and prints `{yesPct}%` — 0 there, "YES 0%" on a market whose money is all on YES.
  const armAt = card.search(/\) : oneSided \? \(\s*<div className="mcardp-pct mcardp-pct--empty" aria-hidden>—<\/div>/);
  const pricedAt = card.indexOf('<div className="mcardp-pct">{yesPct}');
  check("3.11 ⛔ the price slot has a one-sided arm (the dash), and it comes before the priced arm",
    armAt > 0 && pricedAt > armAt, `oneSided arm @${armAt}, priced arm @${pricedAt}`);
  // The label is the only word that explains the dash on a CLOSED or SETTLED one-sided card.
  check("3.12 the 'One side only' row renders on one-sided cards in EVERY phase, not only live ones",
    /\{\(live \|\| oneSided\) && \(\s*<div className="mcardp-moveline">/.test(card));
  // One conditional sentence in every unsettled phase — never a closed-phase promise (a sentinel-CLOSED
  // market can be reopened by `adminReopenMarket`, and one stake on the empty side ends the refund).
  check("3.13 the note is the one conditional sentence, whatever the phase",
    /t\.market\.oneSidedNote\.replace\("\{side\}", sideWord\(t, emptySide, productLine\)\)/.test(card)
    && !/oneSidedClosedNote/.test(card));
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
  check("3.12-control a live-only gate IS detected",
    !/\{\(live \|\| oneSided\) && \(\s*<div className="mcardp-moveline">/.test('{live && (\n        <div className="mcardp-moveline">'));
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
    check(`5.1 ${loc} has the label and the note`, !!m.oneSideOnly && !!m.oneSidedNote);
    check(`5.1b ${loc} has NO closed-phase "will be refunded" promise (a reopened market would break it)`, !("oneSidedClosedNote" in m));
    check(`5.2 ${loc} names the empty side in the open-market note`, (m.oneSidedNote ?? "").includes("{side}"), m.oneSidedNote);
    // ⛔ A "100%" or "0%" in the note would be the very figure the card withholds (and `test:rate-copy`).
    check(`5.3 ${loc} states no percentage`, !/\d\s*%/.test(`${m.oneSideOnly} ${m.oneSidedNote}`));
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

// ── 7 · the board, the hero rows and the detail page print the SAME price as the card ───────────
log("\n── 7 · one rule for every row and the page the card links to");
{
  const board = decomment(read("src/app/markets/page.tsx"));
  const landing = decomment(read("src/app/page.tsx"));
  const detail = decomment(read("src/app/markets/[id]/page.tsx"));
  check("7.1 the /markets row's price is the printable one (`shownYesPct`), not the raw share",
    /yesPct: shownYesPct\(m\.yesPool, m\.noPool\)/.test(board) && !/yesPct: pricedYesPct\(/.test(board));
  check("7.2 the landing's hero rows too", /yesPct: shownYesPct\(m\.yesPool, m\.noPool\)/.test(landing));
  check("7.3 the detail page prints a price as the card does — 1–99 only where both sides hold money, and no fallback helper",
    /const yesPct = price\.kind === "priced" \? price\.yesPct : null;/.test(detail) && !/impliedYesPct|shownYesPct\(/.test(detail));
  // Behaviour: a NO-only market is in no odds bucket (its card says "One side only"), a real long shot is.
  const row = (yesPool: number, noPool: number) => ({ yesPct: shownYesPct(yesPool, noPool) }) as unknown as DiscoveryRow;
  const noOnly = row(0, 20_000);
  check("7.4 ⛔ a one-sided market is filed under no price bucket — not 'Longshots' at 0%",
    !matchesOdds(noOnly, "long") && !matchesOdds(noOnly, "call") && !matchesOdds(noOnly, "cont") && matchesOdds(noOnly, "any"));
  check("7.4-control a real two-sided long shot (1,000 vs 20,000 → 5%) IS a long shot", matchesOdds(row(1_000, 20_000), "long"));
}

// ── 8 · the market DETAIL page, its side picker and its resolution panel (landing v3 C1, commit A) ─
log("\n── 8 · the detail page reads the card's rule (C1)");
{
  const detail = decomment(read("src/app/markets/[id]/page.tsx"));
  const fnAt = detail.indexOf("export default async function MarketDetail(");
  check("8.0 slice sanity: the detail page's component is found", fnAt > 0, `at ${fnAt}`);
  check("8.1 the page decides its price from the pools, once, and prints none without two sides",
    /const price = priceState\(m\.yesPool, m\.noPool\);/.test(detail)
    && /const yesPct = price\.kind === "priced" \? price\.yesPct : null;/.test(detail));
  check("8.2 the bar's empty rail is keyed on the price, and named like the card's (outcome · one side · never bet · no pool)",
    /empty=\{yesPct === null\}/.test(detail)
    && /emptyLabel=\{outcomeLabel \?\? \(emptySide \? t\.market\.oneSideOnly : neverBet \? t\.market\.noBetsYet : t\.market\.noPoolYet\)\}/.test(detail));
  check("8.3 the JSON-LD reads the share preview's one string, never a `YES ${…}%` template",
    /description: sharePreviewDescription\(sharePrice/.test(detail) && !/`YES \$\{/.test(detail));
  // The rail's caption and label: ONE 11px caption element (the type-scale ratchet), the label row keyed on the pool.
  const railAt = detail.indexOf("yesPct={yesPct ?? undefined}");
  const rail = railAt > 0 ? detail.slice(railAt, detail.indexOf("<Stat ", railAt)) : "";
  check("8.4-slice the rail slice is the real bar block (it holds the TippingBar props and ends before the KPI strip)",
    rail.length > 200 && rail.length < 3_000 && /probabilityLabel=/.test(rail), String(rail.length));
  check("8.4 'No bets yet' only where nobody ever bet, 'Be the first' only while open; one caption element; the label row on a one-sided pool",
    /const railCaption = price\.kind === "none" && neverBet \? \(freshMarket \? `\$\{t\.market\.noBetsYet\} · \$\{t\.market\.beFirst\}` : t\.market\.noBetsYet\) : null;/.test(detail)
    && (rail.match(/text-\[11px\]/g) ?? []).length === 1
    && /\{emptySide && <p className="-mt-3 flex justify-center"><span className="mcardp-oneside">\{t\.market\.oneSideOnly\}<\/span><\/p>\}/.test(rail));
  const asideAt = detail.indexOf("<aside ");
  const aside = asideAt > 0 ? detail.slice(asideAt, detail.indexOf("</aside>", asideAt)) : "";
  const sectionAt = detail.indexOf('<section className="order-2');
  const section = sectionAt > 0 ? detail.slice(sectionAt, detail.indexOf("</section>", sectionAt)) : "";
  check("8.5-slice the aside and the content section are real slices", aside.length > 1_000 && section.length > 1_000,
    `aside ${aside.length} · section ${section.length}`);
  check("8.5 the refund note is the card's ONE conditional sentence, withheld once settled, at the money control while open and under the rail once closed; no 'One-sided win' body",
    /const oneSidedNote = emptySide && !settled \? t\.market\.oneSidedNote\.replace\("\{side\}", sideWord\(t, emptySide, "MARKET"\)\) : null;/.test(detail)
    && /const settled = !!m\.resolvedOutcome \|\| isResolved;/.test(detail)
    && section.includes("{!bettingOpen && oneSidedCallout}")
    && (aside.match(/\{oneSidedCallout\}/g) ?? []).length === 2
    && !/oneSidedBody|oneSidedMarket/.test(detail));
  // The picker: no price prop, the pools decide, both figures gated.
  const picker = decomment(read("src/components/markets/side-picker.tsx"));
  const props = picker.slice(picker.indexOf("type Props = {"), picker.indexOf("};", picker.indexOf("type Props = {")));
  const figures = picker.match(/\{yesPct !== null && <span className="font-mono text-\[12\.5px\]">@ \{(?:yesPct|100 - yesPct)\}%<\/span>\}/g) ?? [];
  check("8.6 the side picker takes NO price prop, prices from the pools, and gates both '@ n%' figures",
    props.includes("yesPool: number;") && !/\byesPct\??:/.test(props)
    && /const price = priceState\(yesPool, noPool\);/.test(picker)
    && /const yesPct = price\.kind === "priced" \? price\.yesPct : null;/.test(picker)
    && !/hasPool/.test(picker)
    && figures.length === 2 && (picker.match(/@ \{/g) ?? []).length === 2
    && !/<SidePicker[^>]*\byesPct=/.test(detail), `${figures.length} gated figures`);
  check("8.6-control an ungated figure IS detected",
    !/\{yesPct !== null && <span className="font-mono text-\[12\.5px\]">@ \{yesPct\}%<\/span>\}/.test('{hasPool && <span className="font-mono text-[12.5px]">@ {yesPct}%</span>}'));
  const en = dict.en.market as Record<string, string>;
  check("8.7 the panel's pending refund sentence says the refund is in full and carries no fee",
    /refunded in full/.test(en.resOneSidedPending ?? "") && /no fee/.test(en.resOneSidedPending ?? ""), en.resOneSidedPending);
  // The panel: a refund (void, or one side only) shows no fee row and no fee-capped callout.
  const panel = decomment(read("src/components/markets/resolution-panel.tsx"));
  check("8.8 the resolution panel treats a one-sided pool as the refund it is (no fee row, no capped callout, no payout note)",
    /const refundedAll = isVoid \|\| priceState\(yesPool, noPool\)\.kind === "oneSided";/.test(panel)
    && /\{refundedAll \? \(/.test(panel) && /\{!refundedAll && fee\.capped && \(/.test(panel)
    && /\{!refundedAll && <p/.test(panel)
    && !/\{isVoid \? \(/.test(panel) && !/!isVoid &&/.test(panel));
  // ⭐ CONTROL — the display guard is NEEDED: under loser-share, the fee helper really does price a
  // one-sided pool resolved against its money (the phantom fee C1 found on production's panel).
  check("8.8-control poolFee DOES price a fee on a YES-only pool resolved NO (why the panel must not print it)",
    poolFee(35_000, 0, { feeModel: "loser-share", platformFeeRate: 0.03, operatorFeeRate: 0.10, commissionRate: 0.1, feeCeilingRate: 1 / 3 }, "NO").fee > 0);
  // R6(1) · "One-sided win" is retired everywhere a player reads it.
  const L = ["en", "sw", "zh"] as const;
  const stale = L.filter((loc) => "oneSidedMarket" in (dict[loc].market as object) || "oneSidedBody" in (dict[loc].market as object));
  const walkSrc = (dir: string): string[] => readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walkSrc(p) : /\.tsx?$/.test(e) ? [p] : [];
  });
  const users = walkSrc(SRC).filter((f) => /\b(?:oneSidedMarket|oneSidedBody)\b/.test(decomment(readFileSync(f, "utf8")))).map(rel);
  check("8.9 R6(1): no `oneSidedMarket`/`oneSidedBody` key in any locale, and no reader in src/", stale.length === 0 && users.length === 0,
    `${stale.join(",")} ${users.join(",")}`);
  // §10 · a settled card's result word wears its own side's ink.
  const css = read("src/app/globals.css");
  const baseAt = css.indexOf(".mcardp-pct {");
  const noAt = css.indexOf(".mcardp-pct--no { color: var(--no-400); }");
  const voidAt = css.indexOf(".mcardp-pct--void { color: var(--text-muted); }");
  check("8.10 ⛔ a NO result takes the no ink and a void the neutral muted ink (never the slot's YES ink)",
    /const resultInk = resolvedOutcome === "NO" \? "mcardp-pct--no" : resolvedOutcome === "VOID" \? "mcardp-pct--void" : null;/.test(card)
    && /<div className=\{cn\("mcardp-pct", resultInk\)\}>\{outcomeLabel\}<\/div>/.test(card)
    && baseAt > 0 && noAt > baseAt && voidAt > baseAt, `base@${baseAt} no@${noAt} void@${voidAt}`);
  check("8.10-control the pre-fix result slot (the YES ink inherited) IS detected",
    !/<div className=\{cn\("mcardp-pct", resultInk\)\}>\{outcomeLabel\}<\/div>/.test('<div className="mcardp-pct">{outcomeLabel}</div>'));
}

// ── 9 · /live: the pulse wall, its count and its carousel (landing v3 C1, commit B) — and R6(2) ─────
log("\n── 9 · /live reads the pools, and 'tipping' is ONE rule (C1 · R6(2))");
{
  const live = decomment(read("src/app/live/page.tsx"));
  check("9.1 /live hands the wall the POOLS and builds its count and carousel with `liveContest`, never an old helper",
    /yesPool: m\.yesPool,/.test(live) && /noPool: m\.noPool,/.test(live) && /liveContest\(markets\)/.test(live)
    && !/\b(?:pricedYesPct|impliedYesPct)\(/.test(live));
  const grid = decomment(read("src/app/live/pulse-grid.tsx"));
  const cardAt = grid.indexOf("function PulseCard(");
  const pulse = cardAt > 0 ? grid.slice(cardAt) : "";
  check("9.2 the pulse card decides its state from the pools (slice control: it is the real card, it rises)",
    /kp-rise/.test(pulse) && /const price = priceState\(market\.yesPool, market\.noPool\);/.test(pulse) && pulse.length < 8_000,
    String(pulse.length));
  check("9.3 a one-sided pool is named 'One side only' on the rail and in the caption, never a price",
    /const noPriceWord = price\.kind === "oneSided" \? t\.market\.oneSideOnly/.test(pulse)
    && /empty emptyLabel=\{noPriceWord\}/.test(pulse) && /\{noPriceWord\}<\/div>/.test(pulse)
    && /\{price\.kind !== "priced" \? \(/.test(pulse));
  check("9.4 'No bets yet' only where nobody ever bet; a cash-out-emptied pool is 'No pool yet'",
    /: market\.predictors === 0 \? t\.market\.noBetsYet : t\.market\.noPoolYet;/.test(pulse));
  check("9.5 the refund rule (L22) on every one-sided wall card, in the card's own side words",
    /\{price\.kind === "oneSided" && \(\s*<p className="mcardp-onesided-note mt-2">\{t\.market\.oneSidedNote\.replace\("\{side\}", sideWord\(t, price\.emptySide, productLine\)\)\}<\/p>/.test(pulse));
  // Behaviour: the thin wall. A one-sided pool (either side) and an empty one are no contest; a lopsided
  // two-sided market IS one, at its 1–99 price.
  const row = (id: string, yesPool: number, noPool: number) => ({ id, yesPool, noPool });
  const thin = [row("yesOnly", 25_000, 0), row("noOnly", 0, 9_000), row("empty", 0, 0), row("lopsided", 200_000, 1_000)];
  const a = liveContest(thin);
  check("9.6 ⛔ a thin wall features ONLY the priced market, at 99 — never a one-sided or empty one — and counts none as tipping",
    JSON.stringify(a.mostContested.map((x) => [x.row.id, x.yesPct])) === '[["lopsided",99]]' && a.tipping === 0,
    JSON.stringify({ featured: a.mostContested.map((x) => [x.row.id, x.yesPct]), tipping: a.tipping }));
  const b = liveContest([...thin, row("close", 10_000, 9_000)]);
  check("9.6-control a real contest (10,000 v 9,000 → 53) IS featured first and IS counted tipping",
    b.mostContested[0]?.row.id === "close" && b.mostContested[0]?.yesPct === 53 && b.tipping === 1,
    JSON.stringify({ featured: b.mostContested.map((x) => [x.row.id, x.yesPct]), tipping: b.tipping }));
  const fc = decomment(read("src/app/live/featured-contest.tsx"));
  check("9.7 the carousel links an Up & Down slide to its round (one href), and leans in the product's own words",
    /const href = m\.productLine === "UPDOWN" \? \(m\.roundId \? `\/updown\/\$\{m\.roundId\}` : "\/updown"\) : `\/markets\/\$\{m\.id\}`;/.test(fc)
    && (fc.match(/href=\{href as Route\}/g) ?? []).length === 2 && !/`\/markets\/\$\{m\.id\}` as Route/.test(fc)
    && /\.\.\.leanWords\(t, m\.productLine\)/.test(fc));
  const lw = leanWords(dict.en as never, "UPDOWN");
  check("9.7b an Up & Down round leans 'up'/'down' in every locale, never 'yes'/'no'",
    lw.leansYes === "leans up" && lw.leansNo === "leans down"
    && (["sw", "zh"] as const).every((loc) => {
      const w = leanWords(dict[loc] as never, "UPDOWN");
      const m = dict[loc].market as Record<string, string>;
      return !!w.leansYes && w.leansYes !== m.leansYes && w.leansNo !== m.leansNo;
    }));
  // ⭐ R6(2) · ONE tipping rule — the constant, and every surface reads it through `isTipping`.
  const TIPPING_READERS = ["src/components/brand.tsx", "src/components/markets/market-card.tsx", "src/lib/markets/share-preview.ts", "src/lib/markets/live-contest.ts"];
  const ownRule = /Math\.abs\(\s*[\w.]+\s*-\s*50\s*\)\s*<=?\s*\d/;
  const readers = TIPPING_READERS.map((f) => ({ f, src: decomment(read(f)) }));
  const bad = readers.filter(({ src }) => !/\bisTipping\(/.test(src) || ownRule.test(src)).map(({ f }) => f);
  check("9.8 ⛔ R6(2): ONE tipping rule, |YES − 50| ≤ 3 — the bar's lean word, the card badge, the share preview and /live all read `isTipping`, none keeps its own threshold",
    TIPPING_BAND === 3 && isTipping(53) && isTipping(47) && !isTipping(54) && !isTipping(46) && bad.length === 0, bad.join(", "));
  check("9.8-control a surface keeping its own threshold IS detected (the bar's old `< 3`, /live's old `< 8`)",
    ownRule.test("{Math.abs(target - 50) < 3 ? labels.tipping : x}") && ownRule.test("Math.abs(m.yesPct - 50) < 8"));
}

// ── 10 · /results: the notable spotlight — who wears the crown, and how it is drawn (C1, commit C) ────
log("\n── 10 · /results' notable result (C1)");
{
  const res = decomment(read("src/app/results/page.tsx"));
  const fnAt = res.indexOf("function FeaturedResult(");
  const featured = fnAt > 0 ? res.slice(fnAt, res.indexOf("\nfunction ", fnAt + 10)) : "";
  check("10.0 slice sanity: FeaturedResult is the real spotlight (it names the notable result) and a bounded slice",
    featured.includes("t.results.notableResult") && featured.length > 500 && featured.length < 8_000, String(featured.length));
  check("10.1 the spotlight decides its state from the pools", /const price = priceState\(m\.yesPool, m\.noPool\);/.test(featured));
  check("10.2 no old helper anywhere on the page", !/pricedYesPct/.test(res));
  check("10.3 a price only where both pools hold money", /\{price\.kind === "priced" \? \(/.test(featured) && /yesPct=\{price\.yesPct\}/.test(featured));
  check("10.4 the empty rail is named by the verdict first, then the pool's shape",
    featured.includes("empty emptyLabel={outcomeLabel ?? railWords ?? t.market.noPoolYet}"));
  check("10.5 a one-sided spotlight says 'One side only' under its rail",
    /const railWords = price\.kind === "oneSided" \? t\.market\.oneSideOnly : m\.predictorCount === 0 \? t\.market\.noBetsYet : null;/.test(featured)
    && /className="mcardp-oneside"/.test(featured));
  check("10.6 no refund sentence on a SETTLED card (WP6's settled rule)", !/oneSidedNote/.test(featured));
  check("10.7 a settled split reads 'Final pool', never a lean", /leansYes: t\.market\.resFinalPool/.test(featured)
    && /tipping: t\.market\.resFinalPool/.test(featured) && /leansNo: t\.market\.resFinalPool/.test(featured));
  // Behaviour: who may wear the crown.
  check("10.8 ⛔ a one-sided market (every stake refunded) is NOT notable, whichever side it resolved",
    !isNotableResult({ status: "RESOLVED", resolvedOutcome: "YES", yesPool: 35_000, noPool: 0 })
    && !isNotableResult({ status: "RESOLVED", resolvedOutcome: "NO", yesPool: 35_000, noPool: 0 }));
  check("10.9 a priced VOID and an empty pool are not notable either",
    !isNotableResult({ status: "VOIDED", resolvedOutcome: "VOID", yesPool: 20_000, noPool: 5_000 })
    && !isNotableResult({ status: "RESOLVED", resolvedOutcome: "VOID", yesPool: 20_000, noPool: 5_000 })
    && !isNotableResult({ status: "RESOLVED", resolvedOutcome: "YES", yesPool: 0, noPool: 0 }));
  check("10.10 RESOLVED with no recorded verdict is not notable (no side is better than a wrong side)",
    !isNotableResult({ status: "RESOLVED", resolvedOutcome: null, yesPool: 20_000, noPool: 5_000 }));
  check("10.8-control a verdict over a two-sided pool, even a lopsided one (25,000 v 100), IS notable",
    isNotableResult({ status: "RESOLVED", resolvedOutcome: "NO", yesPool: 25_000, noPool: 100 }));
  check("10.11 the page picks its notables through that rule", /paged\.filter\(isNotableResult\)/.test(res));
  check("10.12 the spotlight's topic chip is translated, never the stored enum",
    /<Chip variant="cat" size="sm">\{marketCategoryLabel\(t, m\.category\)\}<\/Chip>/.test(featured));
  // ⭐ CONTROLS — the pre-C1 spellings ARE detected.
  check("10-control the pre-C1 price line and rail label ARE detected",
    /pricedYesPct/.test("const yesPct = pricedYesPct(m.yesPool, m.noPool);")
    && !"empty emptyLabel={t.market.noBetsYet} />".includes("empty emptyLabel={outcomeLabel ?? railWords ?? t.market.noPoolYet}"));
}

// ── 11 · chart history: the detail chart, the card sparkline, the 24h move (C1, commit D · source pins) ─
log("\n── 11 · a chart point needs a price (C1; behaviour in test:history §5)");
{
  const hist = decomment(read("src/lib/server/market-history.ts"));
  check("11.1 one helper drops every unpriced snapshot (an empty or one-sided point is never plotted)",
    /function pricedPoints</.test(hist) && /return p\.kind === "priced" \? \[\{ s, pct: p\.yesPct \}\] : \[\];/.test(hist));
  const probAt = hist.indexOf("export async function getProbabilityChart(");
  const cardAt = hist.indexOf("function cardChartFrom(");
  const prob = probAt > 0 ? hist.slice(probAt, hist.indexOf("export async function getCardChart(", probAt)) : "";
  const cardFn = cardAt > 0 ? hist.slice(cardAt, hist.indexOf("const CARD_WINDOW_MS", cardAt)) : "";
  check("11.2 the detail chart AND the card sparkline both read it (slice control: both bodies found and bounded)",
    /pricedPoints\(/.test(prob) && /pricedPoints\(/.test(cardFn) && prob.length > 100 && prob.length < 3_000 && cardFn.length > 100 && cardFn.length < 4_000,
    `prob ${prob.length} · card ${cardFn.length}`);
  check("11.3 the batched board read carries the pools the rule needs", /select: \{ marketId: true, t: true, yes: true, yesPool: true, noPool: true \}/.test(hist));
  check("11.4 ⛔ no chart value is the raw stored share any more", !/Math\.round\(\s*\w+\.yes \* 100\)/.test(hist));
  check("11.4-control the pre-C1 spelling IS detected", /Math\.round\(\s*\w+\.yes \* 100\)/.test("p: Math.round(s.yes * 100)"));
}

// ── 14 · the sweep: no page or component prints the old price helpers (C1; the list only shrinks) ─
log("\n── 14 · no surface calls impliedYesPct/pricedYesPct any more, except the declared remainder");
{
  // ⛔ The ALLOW list may only SHRINK: after C1-A it held /live, /results and the four admin files; B took
  // /live, C took /results, G takes the admin four. A stale entry (no call left) fails too.
  const ALLOW = new Set<string>(ALLOW_OLD_PRICE);
  const OLD = /\b(?:impliedYesPct|pricedYesPct)\(/;
  const walkDir = (dir: string): string[] => readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walkDir(p) : /\.tsx?$/.test(e) ? [p] : [];
  });
  const files = [...walkDir(join(SRC, "app")), ...walkDir(join(SRC, "components"))];
  const callers = files.filter((f) => OLD.test(decomment(readFileSync(f, "utf8")))).map(rel);
  const unexpected = callers.filter((f) => !ALLOW.has(f));
  const staleAllow = [...ALLOW].filter((f) => !callers.includes(f));
  check("14.0 the sweep reads the real tree (it walked the app and component folders)", files.length > 200, String(files.length));
  check("14.1 ⛔ no page or component calls impliedYesPct/pricedYesPct outside the declared remainder", unexpected.length === 0, unexpected.join(", "));
  check("14.2 every declared remainder still calls one (a stale entry is a list that stopped shrinking)", staleAllow.length === 0, staleAllow.join(", "));
  check("14.1-control a planted call IS detected, a mention in prose is not",
    OLD.test(decomment("const y = impliedYesPct(m);")) && !OLD.test(decomment("// impliedYesPct(m) returned 50")));
}

log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILED`} — one-sided markets`);
process.exit(fail === 0 ? 0 : 1);
