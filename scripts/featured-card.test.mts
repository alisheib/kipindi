/**
 * test:featured-card — the landing's featured card and the market meta line (landing v3 WP3 + WP4, gate V18).
 *
 * WHAT IT HOLDS, each with a control that shows the matcher can say no:
 *   §1 · BEHAVIOUR of the pure rules the card reads — SOON on milliseconds (L17), the 24h mark's position
 *        (`dayAgoYesPct`), the predictor floor (R7), the source NAME (`sourceNameFor`, one host rule — a
 *        look-alike domain never borrows a name), and the 24h move measured only between two prices and
 *        two readings (`cardChartFrom`, C1 + WP3).
 *   §2 · the CARD's source: SOON asks `closesWithinTheHour`, the mark and the bar's reading are featured
 *        and priced only, the time sits top-right on the featured card, the featured meta line comes
 *        before the pick in the reading order, the floor withholds the count and says so, and the card
 *        never reads the registry or parses a URL.
 *   §3 · the CALL SITES: `sourceName` and `closesOn` are the landing's only (so /markets' card geometry is
 *        untouched), and every live countdown passes `msLeft`.
 *   §4 · the bar: the mark is drawn only on the priced rail, before the needle, hidden from a screen reader.
 *   §5 · the words, in all three languages.
 *   §6 · ⭐ V18's instrumentation contract: every part the gate reads exists on the card and on the board
 *        row — `qa:landing-ten` is not in the pipeline, so without this a dropped attribute would only be
 *        caught at the next gate run.
 *   §7 · the gate's two ruled exceptions stay FEATURED-ONLY and stay as narrow as they were ruled.
 *
 * Run: npm run test:featured-card   (in predeploy, right after test:one-sided)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { decomment } from "./lib/decomment.mts";
import { closesWithinTheHour, HOUR_MS } from "../src/lib/markets/time-left.ts";
import { dayAgoYesPct, priceState } from "../src/lib/markets/price-state.ts";
import { FEATURED_PREDICTOR_FLOOR, featuredShowsPredictors } from "../src/lib/markets/featured.ts";
import { sourceHost } from "../src/lib/markets/source-host.ts";
import { sourceNameFor, type TrustedSource } from "../src/lib/server/source-registry.ts";
import { recordSnapshot, getCardChart, type MarketSnapshot } from "../src/lib/server/market-history.ts";
import { dict } from "../src/lib/i18n-dict.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const rel = (f: string) => relative(ROOT, f).replace(/\\/g, "/");

let fail = 0, pass = 0;
const log = (m: string) => console.log(m);
function check(label: string, cond: boolean, detail = "") {
  if (cond) { pass++; log(`  PASS ${label}`); }
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
}

log("the featured card and the market meta line (landing v3 WP3 + WP4 · V18)\n");

// ── §1 · behaviour ──────────────────────────────────────────────────────────────────────────────────
log("── §1 · the pure rules");
{
  check("1.1 SOON fires the last millisecond under an hour", closesWithinTheHour(3_599_999) === true);
  check("1.2 SOON fires at one millisecond left", closesWithinTheHour(1) === true);
  check("1.3 ⛔ not at exactly an hour (the label reads hours there)", closesWithinTheHour(3_600_000) === false);
  check("1.4 ⛔ not once closed, not unknown, not NaN",
    [0, -1, undefined, Number.NaN, Number.POSITIVE_INFINITY].every((v) => closesWithinTheHour(v) === false));
  check("1.5 the band is the label's own hour", HOUR_MS === 3_600_000);

  const p = priceState(20_000, 10_000);
  check("1.6 the mark sits at the printed price minus the move (20k/10k prints 67, +5 → 62)",
    p.kind === "priced" && p.yesPct === 67 && dayAgoYesPct(20_000, 10_000, 5) === 62, JSON.stringify(p));
  check("1.7 ⛔ no mark on a one-sided pool, whatever the move", dayAgoYesPct(1_000, 0, 5) === null && dayAgoYesPct(0, 9_000, -3) === null);
  check("1.8 ⛔ no mark on an empty pool", dayAgoYesPct(0, 0, 5) === null);
  check("1.9 ⛔ no mark without a measured move", dayAgoYesPct(20_000, 10_000, undefined) === null && dayAgoYesPct(20_000, 10_000, Number.NaN) === null);
  check("1.10 the mark is kept within 1–99 like every printed price",
    dayAgoYesPct(99_000, 1_000, -50) === 99 && dayAgoYesPct(1_000, 99_000, 40) === 1);
  check("1.10-control an ordinary move is not clamped", dayAgoYesPct(10_000, 10_000, -7) === 57);

  check("1.11 the predictor floor is one constant, 10", FEATURED_PREDICTOR_FLOOR === 10);
  check("1.12 below the floor the featured card withholds its count (\"2 watabiri\" reads as a dead market)",
    featuredShowsPredictors(2, false) === false && featuredShowsPredictors(FEATURED_PREDICTOR_FLOOR - 1, false) === false);
  check("1.13 at the floor and above it states it", featuredShowsPredictors(FEATURED_PREDICTOR_FLOOR, false) && featuredShowsPredictors(250, false));
  check("1.14 a fresh card keeps its invitation (it is not a count)", featuredShowsPredictors(0, true));

  const at = new Date().toISOString();
  const src = (domain: string, label: string, category: TrustedSource["category"], enabled = true): TrustedSource =>
    ({ id: `src_${domain}`, domain, label, category, rationale: "test", enabled, addedBy: "test", addedAt: at });
  const REG: TrustedSource[] = [
    src("go.tz", "Government of Tanzania", "macro"),
    src("kitco.com", "Kitco", "crypto"),
    src("bot.go.tz", "Bank of Tanzania", "macro"),
    src("meteo.go.tz", "Tanzania Meteorological Authority", "weather", false),
    src("tff.or.tz", "Tanzania Football Federation", "sports"),
  ];
  check("1.15 a registered host is named by its label", sourceNameFor(REG, "https://kitco.com/gold", "crypto") === "Kitco");
  check("1.16 …with or without www", sourceNameFor(REG, "https://www.kitco.com/gold", "crypto") === "Kitco");
  check("1.17 ⛔ a look-alike domain prints as ITSELF, never as the name it imitates",
    sourceNameFor(REG, "https://evilkitco.com/gold", "crypto") === "evilkitco.com", String(sourceNameFor(REG, "https://evilkitco.com/gold", "crypto")));
  check("1.18 a source switched off after publishing is still the one the market settles on",
    sourceNameFor(REG, "https://www.meteo.go.tz/forecast", "weather") === "Tanzania Meteorological Authority");
  check("1.19 a market re-categorised after publishing still names its source",
    sourceNameFor(REG, "https://tff.or.tz/results", "other") === "Tanzania Football Federation");
  check("1.20 the MOST SPECIFIC registered domain wins, whatever the registry's order",
    sourceNameFor(REG, "https://www.bot.go.tz/rates", "macro") === "Bank of Tanzania", String(sourceNameFor(REG, "https://www.bot.go.tz/rates", "macro")));
  check("1.20-control the parent domain still names its own hosts", sourceNameFor(REG, "https://nbs.go.tz/cpi", "macro") === "Government of Tanzania");
  check("1.21 an unregistered host prints as the host, without www", sourceNameFor(REG, "https://www.boomplay.com/charts", "culture") === "boomplay.com");
  check("1.22 ⛔ an unparseable or absent URL names nothing (never the raw string)",
    sourceNameFor(REG, "not a url", "macro") === null && sourceNameFor(REG, undefined, "macro") === null && sourceNameFor([], "", "macro") === null);
  check("1.23 the display host is one helper (and never the raw URL)", sourceHost("https://WWW.Example.org/x?y=1") === "example.org" && sourceHost("::") === null);
}

log("\n── §1b · the 24h move is measured between two PRICES and two READINGS");
{
  const id = (s: string) => `mkt_guard_wp3_${s}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const move = async (steps: [number, number][]) => {
    const m = id("seq");
    for (const [y, n] of steps) await recordSnapshot(m, y, n);
    return (await getCardChart(m)).move24h;
  };
  check("1.24 two priced readings give a real move (500/500 → 700/300 = +20)", (await move([[500, 500], [700, 300]])) === 20);
  check("1.25 ⛔ no move from an empty baseline (0/0 → 700/300)", (await move([[0, 0], [700, 300]])) === undefined);
  check("1.26 ⛔ no move from a one-sided baseline (1000/0 → 1000/500)", (await move([[1000, 0], [1000, 500]])) === undefined);
  check("1.27 ⛔ no move onto a one-sided present (500/500 → 1000/0)", (await move([[500, 500], [1000, 0]])) === undefined);
  check("1.29 ⛔ no move from a baseline that had no price, even with two prices after it (1000/0 → 600/400 → 700/300)",
    (await move([[1000, 0], [600, 400], [700, 300]])) === undefined);

  // The in-memory store is the process's own Map (no database in a test run), so a reading can be placed
  // in the past exactly as a day of real trading would leave it.
  const store = (globalThis as { __50PICK_MARKET_HISTORY?: Map<string, MarketSnapshot[]> }).__50PICK_MARKET_HISTORY;
  const H = 3600_000;
  const snap = (agoMs: number, y: number, n: number): MarketSnapshot =>
    ({ t: new Date(Date.now() - agoMs).toISOString(), yes: y / (y + n), yesPool: y, noPool: n, volume: y + n });
  check("1.28-fixture the in-memory history store is reachable", store instanceof Map);
  if (store instanceof Map) {
    const one = id("one");
    store.set(one, [snap(30 * H, 500, 500), snap(0, 700, 300)]);
    const oneChart = await getCardChart(one);
    check("1.28 ⛔ one reading inside the window is not a move (it printed ±0 while the price had moved)",
      oneChart.move24h === undefined, JSON.stringify(oneChart));
    const two = id("two");
    store.set(two, [snap(30 * H, 600, 400), snap(2 * H, 500, 500), snap(0, 700, 300)]);
    const twoChart = await getCardChart(two);
    check("1.28-control two readings inside the window DO give a move (+20 from the first of them)", twoChart.move24h === 20, JSON.stringify(twoChart));
  }
}

// ── §2 · the card ──────────────────────────────────────────────────────────────────────────────────
log("\n── §2 · the card's source");
const card = decomment(read("src/components/markets/market-card.tsx"));
{
  const SOON_OK = /if \(closesWithinTheHour\(msLeft\)\) return \{ kind: "soon"/;
  const SOON_OLD = /m left\$\/|\.test\(timeLeft\)/;
  check("2.1 SOON asks the milliseconds (`closesWithinTheHour(msLeft)`)", SOON_OK.test(card));
  check("2.2 ⛔ no label-shaped SOON test remains (it never fired in sw or zh)", !SOON_OLD.test(card));
  check("2.2-control the pre-fix SOON test IS detected", SOON_OLD.test("if (/^\\d+m left$/.test(timeLeft)) return"));

  const DAYAGO = /const dayAgo = featured && live && showPrice \? dayAgoYesPct\(yesPool, noPool, move24h\) : null;/;
  check("2.3 the 24h mark is featured, live and priced only", DAYAGO.test(card));
  check("2.3-control a mark on every card IS detected", !DAYAGO.test("const dayAgo = dayAgoYesPct(yesPool, noPool, move24h);"));
  check("2.4 the delta prints the mark's own number (`yesPct - dayAgo`), and the bar draws that mark",
    /<DayAgoMove move=\{yesPct - dayAgo\} label=\{t\.market\.h24Ago\} keyed \/>/.test(card) && /mark=\{dayAgo\}/.test(card));
  check("2.5 the featured bar is an IMAGE of the split, named by the whole reading",
    /as=\{featured \? "img" : undefined\}/.test(card) && /probabilityLabel=\{barReading \?\? /.test(card)
    && /const barReading = featured && showPrice\s*\?/.test(card));
  const top = card.slice(card.indexOf('<div className="mcardp-top">'), card.indexOf('<div className="mcardp-head">'));
  check("2.6 the featured time sits in the TOP row, and the meta row drops it there",
    /\{featured && <span className="mcardp-closes" data-market-part="time">\{timeLeft\}<\/span>\}/.test(top) && /\{!featured && timeLeft\}/.test(card));
  check("2.6-control the slice is the real top row (it holds the status chip)", top.includes("statusLabel") && top.length < 3_000, String(top.length));
  const lineAt = card.indexOf('className="mcardp-src mcardp-src--featured"');
  const pickAt = card.indexOf('className="mcardp-actions" data-market-part="pick"');
  check("2.7 ⭐ the featured meta line comes BEFORE the pick in the reading order (K36; below 640 CSS only SHOWS it under)",
    lineAt > 0 && pickAt > lineAt, `line @${lineAt}, pick @${pickAt}`);
  check("2.8 a grid card's source line sits in its question column", /\{!featured && metaLine && <p className="mcardp-src">\{metaLine\}<\/p>\}/.test(card));
  check("2.9 the source NAME is its own part inside the dictionary's sentence",
    /<span className="mcardp-srcname" data-market-part="source">\{sourceName\}<\/span>/.test(card) && /t\.market\.settlesOn\.split\("\{source\}"\)/.test(card));
  const FLOOR = /const showDepth = !featured \|\| featuredShowsPredictors\(predictors, fresh\);/;
  check("2.10 the predictor floor is the featured card's only, read from the ONE constant", FLOOR.test(card)
    && /\{showDepth && \(\s*<div className=\{fresh \? "mcardp-traders/.test(card));
  check("2.11 a card that withholds its count SAYS so (the gate reads the count and the floor)",
    /\.\.\.\(showDepth \? \{\} : \{ "data-market-predictors": predictors, "data-market-depth-floor": FEATURED_PREDICTOR_FLOOR \}\)/.test(card));
  check("2.10-control a floor applied to every card IS detected", !FLOOR.test("const showDepth = featuredShowsPredictors(predictors, fresh);"));
  check("2.12 ⛔ the card never reads the registry and never parses a URL",
    !/source-registry/.test(card) && !/new URL\(/.test(card) && !/sourceHost\(/.test(card));
  check("2.13 a cashed-out live card names its empty pool (the D29 word, never 'No bets yet')",
    /\{live && noPrice && !neverBet && <div className="mcardp-nobets" data-market-part="state">\{t\.market\.noPoolYet\}<\/div>\}/.test(card));
}

// ── §3 · call sites ────────────────────────────────────────────────────────────────────────────────
log("\n── §3 · the call sites");
{
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(e) ? [p] : [];
  });
  const sites: { at: string; el: string }[] = [];
  for (const f of walk(SRC)) {
    if (/market-card\.tsx$/.test(f)) continue;
    const body = decomment(readFileSync(f, "utf8"));
    for (const m of body.matchAll(/<MarketCard\b[\s\S]*?\/>/g)) sites.push({ at: rel(f), el: m[0] });
  }
  // ⚠️ SIX SINCE WP9 (2026-09-28, R15): the landing's `.market-grid` card in `src/app/page.tsx` is
  // deleted, so this fixture precondition counts six. `scripts/one-sided.test.mts` §2.4 holds the
  // NAMED census of the same six; this one stays a count because every assertion below it is about a
  // property of the set rather than its membership.
  check("3.0 fixture · every <MarketCard> call site was found (a scan that finds none proves nothing)", sites.length === 6, String(sites.length));
  const LANDING = "src/components/home/landing-hero.tsx";
  const named = sites.filter((s) => /\bsourceName=\{/.test(s.el));
  // ⭐ POSITIVE AND NEGATIVE, BECAUSE ONE OF THEM IS NOW A SET OF SIZE ONE. `named.length >= 2` was the
  // floor that kept `named.every(...)` from being an empty-filter pass; with the grid card gone only
  // the featured card names a source, so the arm has to say WHICH site that is as well as which sites
  // it must not be. Otherwise a landing that stopped naming its source at all would pass.
  check("3.1 `sourceName` is passed by the landing's featured card ONLY (the /markets card geometry is untouched)",
    named.length === 1 && named[0]?.at === LANDING, named.map((s) => s.at).join(", ") || "none");
  const closes = sites.filter((s) => /\bclosesOn=\{/.test(s.el));
  check("3.2 `closesOn` is the featured card's only", closes.length === 1 && closes[0].at === "src/components/home/landing-hero.tsx"
    && /\bfeatured\b/.test(closes[0].el), closes.map((s) => s.at).join(", "));
  const RESOLVED_ONLY = /status="RESOLVED"|status=\{m\.status === "VOIDED" \? "VOIDED" : "RESOLVED"\}/;
  const live = sites.filter((s) => !RESOLVED_ONLY.test(s.el));
  const noMs = live.filter((s) => !/\bmsLeft=\{/.test(s.el));
  // ⚠️ FOUR SINCE WP9, AND THE EXCLUDED SET IS NAMED. `live.length >= 5` was the floor that kept
  // `noMs.length === 0` from being a trivially-true empty filter; with the landing's grid card gone it
  // is four. ⭐ Stating WHICH two sites are resolved-only is stronger than any count: a live site that
  // silently became resolved-only would otherwise just lower the number.
  const resolvedOnly = sites.filter((s) => RESOLVED_ONLY.test(s.el)).map((s) => s.at).sort();
  check("3.3 every card that can be live passes `msLeft` (SOON in every locale)",
    live.length === 4 && noMs.length === 0
    && JSON.stringify(resolvedOnly) === JSON.stringify(["src/app/markets/page.tsx", "src/app/results/page.tsx"]),
    `${live.length} live-capable; resolved-only: ${resolvedOnly.join(", ")}; missing msLeft: ${noMs.map((s) => s.at).join(", ")}`);
  check("3.3-control a live call site without `msLeft` IS detected",
    !/\bmsLeft=\{/.test('<MarketCard productLine={"MARKET"} timeLeft={timeLeftStr(x)} status="LIVE" yesPool={a} noPool={b} />'));
  const page = decomment(read("src/app/page.tsx"));
  check("3.4 the page reads the registry ONCE and resolves each row through `sourceNameFor`",
    (page.match(/listSources\(/g) ?? []).length === 1 && /sourceName: sourceNameFor\(sources, m\.sourceUrl, resolvePublishCategory\(m\.category\)\)/.test(page));
}

// ── §4 · the bar ───────────────────────────────────────────────────────────────────────────────────
log("\n── §4 · TippingBar's 24h mark");
{
  const brand = decomment(read("src/components/brand.tsx"));
  const emptyAt = brand.indexOf("if (empty) {");
  const markAt = brand.indexOf('className="tipbar-mark"');
  const needleAt = brand.indexOf('className="tipbar-needle"');
  check("4.1 the mark is drawn only on the PRICED rail (after the empty return)", emptyAt > 0 && markAt > emptyAt, `empty @${emptyAt}, mark @${markAt}`);
  check("4.2 …before the needle, so the needle wins where they coincide", needleAt > markAt);
  check("4.3 …hidden from a screen reader (the bar's name carries the reading)", /className="tipbar-mark" style=\{\{ left: `\$\{Math\.max\(6, Math\.min\(94, mark\)\)\}%` \}\} aria-hidden/.test(brand));
  const css = read("src/app/globals.css");
  const rule = css.match(/\.tipbar-mark \{([^}]*)\}/)?.[1] ?? "";
  check("4.4 the mark is `--text` (3:1 on both fills, `test:contrast`) and never animated", /background: var\(--text\);/.test(rule) && !/transition|animation/.test(rule), rule.trim().slice(0, 120));
}

// ── §5 · the words ─────────────────────────────────────────────────────────────────────────────────
log("\n── §5 · the dictionary");
{
  const L = ["en", "sw", "zh"] as const;
  for (const l of L) {
    const m = (dict[l] as { market: Record<string, string> }).market;
    check(`5.${l} closesOn · settlesOn · h24Ago · barReading exist, placeholders intact`,
      /\{date\}/.test(m.closesOn ?? "") && /\{source\}/.test(m.settlesOn ?? "") && !!m.h24Ago
      && ["{yesPct}", "{noPct}", "{yesWord}", "{noWord}"].every((k) => (m.barReading ?? "").includes(k)),
      JSON.stringify({ c: m.closesOn, s: m.settlesOn, h: m.h24Ago, b: m.barReading }));
  }
  const sw = (dict.sw as { market: Record<string, string> }).market;
  check("5.sw-review the meta line agrees with its subject (soko, li-) in both halves", /^Litafungwa /.test(sw.closesOn) && /^Linatatuliwa kwa /.test(sw.settlesOn));
}

// ── §6 · V18's instrumentation contract ────────────────────────────────────────────────────────────
log("\n── §6 · every part the gate reads exists (V18)");
{
  const PARTS = ["price", "state", "time", "pool", "predictors", "source", "pick"];
  const hero = decomment(read("src/components/home/landing-hero.tsx"));
  const qrow = hero.slice(hero.indexOf("function QuestionRow("), hero.indexOf("export function LandingHero("));
  const has = (src: string, part: string) =>
    new RegExp(`data-market-part="${part}"`).test(src) || new RegExp(`data-market-part=\\{[^}]*"${part}"`).test(src);
  const missCard = PARTS.filter((p) => !has(card, p));
  const missRow = PARTS.filter((p) => !has(qrow, p));
  check("6.1 the card carries every part", missCard.length === 0, missCard.join(", "));
  check("6.2 the board row carries every part", missRow.length === 0, missRow.join(", "));
  check("6.3 both carry their surface", /data-market-surface=\{featured \? "featured" : "card"\}/.test(card) && /data-market-surface="board"/.test(qrow));
  check("6.0-control the row slice is the real row", /<li className="kp-qrow"/.test(qrow) && qrow.length > 1_000 && qrow.length < 12_000, String(qrow.length));
  check("6.1-control a dropped part IS detected", PARTS.filter((p) => !has(card.replace(/data-market-part="pool"/g, ""), p)).join() === "pool");
}

// ── §7 · the gate's ruled exceptions ───────────────────────────────────────────────────────────────
log("\n── §7 · V18's two exceptions stay featured-only");
{
  const gate = read("scripts/qa/landing-ten.mjs");
  check("7.1 the predictor floor is excused only on the featured card, only when the card states n < floor",
    /const withheld = kind === "featured" && s\.hasAttribute\("data-market-predictors"\) && s\.hasAttribute\("data-market-depth-floor"\)/.test(gate)
    && /heldN < heldFloor/.test(gate) && /if \(p === "predictors" && withheld\) continue;/.test(gate));
  check("7.2 the source may sit under the pick ON SCREEN only on the featured card below 640, and never after it in the DOM",
    /const srcUnder = kind === "featured" && vw < 640;/.test(gate) && /if \(el === src && srcUnder && follows\(el, pick\)\) continue;/.test(gate));
  check("7.2-control a waiver without the DOM half IS detected",
    !/if \(el === src && srcUnder && follows\(el, pick\)\) continue;/.test("if (el === src && srcUnder) continue;"));
}

log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — featured-card: ${pass} passed, ${fail} failed`);
if (pass + fail < 50) { console.error(`!! only ${pass + fail} checks ran`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
