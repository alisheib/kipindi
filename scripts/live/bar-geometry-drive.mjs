#!/usr/bin/env node
/**
 * `npm run qa:bar-geometry` — do two controls in a query bar ever sit ON TOP OF each other, and
 * does any control fall off the screen?
 *
 * 🔴 THE DEFECT THIS EXISTS FOR SHIPPED, AND EVERY EXISTING CHECK WAS GREEN OVER IT. Measured on
 * `/markets` at 360 during this campaign's stage 2:
 *
 *     route            summary      direction button   overlap
 *     /markets  sw     16→255       154→198            44px
 *     /markets  en     16→218       166→210            44px
 *     /markets  zh     16→162       162→206            0  (short labels escape)
 *
 * ⛔ The 44×44 direction button was drawn on top of the sort label, in two of three languages, and
 * nothing caught it: the DOCUMENT does not overflow (`scrollWidth === clientWidth === 360`), so
 * `test:responsive` passed, and the pill radius and 44px floor were untouched, so `qa:filter-scan`
 * passed. ⭐ Neither instrument asks whether two controls occupy the same pixels — which is the
 * one question a person answers instantly from a screenshot and no assertion here was asking.
 *
 * ⚠️ AND THE FIRST FIX WAS WRONG: `shrink` changed nothing, because the summary is not a flex item
 * (its parent `<details>` is a plain block). `w-full` is what binds it. **Re-measure, never
 * re-reason.**
 *
 * ── FOUR ASSERTIONS, PER SURFACE × WIDTH × LOCALE ────────────────────────────────────────────
 *   1 · NO OVERLAP  — no two visible controls on the same visual row share PAINTED pixels.
 *   2 · NO CLIPPING — no control runs past the viewport, unless it lives in a strip that scrolls.
 *   3 · NO SHORT CONTROL — every one reaches the 44px tap floor.
 *   4 · THE BAR ACTUALLY STICKS, AND NOTHING IS DRAWN THROUGH IT. Two defects, one measurement,
 *       both found by this driver on 2026-09-08 and both invisible until the page was SCROLLED:
 *         · `/results`, `/watchlist` and `/proposals` each stuck a search band at `top-[56px]` —
 *           the offset `QUERY_BAR_CLASS` already occupies — so the two surfaces overlapped by
 *           **91px**, one drawn straight through the other. ⛔ Two sticky surfaces cannot share
 *           one offset.
 *         · `/updown/history` reported `bar@-252` while every other surface reported `bar@56`:
 *           its bar sat inside a 247px wrapper, and a sticky element only sticks within its
 *           PARENT'S box, so it unpinned after a quarter of a screen — on the one route that can
 *           render four hundred rows.
 *       ⚠️ NEITHER IS VISIBLE AT SCROLL 0, which is where every screenshot in this campaign was
 *       taken until this assertion existed.
 *
 * ── TWO EXEMPTIONS, ADOPTED FROM `scripts/live/clip.mjs` RATHER THAN RE-DERIVED ───────────────
 * ⛔ The first draft of this driver invented its own and reported EIGHTEEN false defects on
 * `/markets`, the reference bar:
 *   1 · A CLOSED `<details>` still has layout boxes. Chrome lays the subtree out and neither
 *       paints nor hit-tests it, so every sort option reported an identical box and "overlapped"
 *       every other one. `clip.mjs` records the same trap on `LanguageMenu`.
 *   2 · A control inside a horizontally SCROLLING strip is not clipped when it runs past the
 *       viewport — that is what the strip is FOR. Measure against the scroll container.
 *
 * ── ROUND 5 OF THE VISUAL PASS (R5-F, 2026-10-09) · THE DRIVE WAS RED ON MAIN, AND EVERY LINE WAS THE INSTRUMENT ──
 * 🔴 88 failures at main a6331ca1 (92 on the visual-pass tip), so its red twin refused to run and for a round neither
 * proved anything. Three causes, each now a rule in `bar-geometry-rules.mjs` (shared with the red twin and pinned by
 * `test:visual-pass-r5f`):
 *   ① NO FIXTURE (63 lines, "NO [data-filter-rail]"). Seven routes withhold their bar on an EMPTY book by design (§A5 —
 *     every guard dates from 2026-09-08, the day those routes were declared below), and the run had no rows: a fresh
 *     in-memory store, no `npm run fixture:player`. ⭐ Rows and no bar is still a failure; NO ROWS AND NO BAR is the
 *     third outcome — BAR NOT MEASURED, printed and named — and a declared surface measured NOWHERE makes the whole run a
 *     SKIPPED one (exit 3), never a green one.
 *   ② OVERLAP OF THINGS NOBODY CAN SEE (14 lines, /markets at 360). Since U4 (2c9380e00, 2026-09-23) the phone bar is
 *     one grid line — the lens strip, `overflow-x: auto` and masked, beside sort and Filters — and a chip past the strip's
 *     edge is scrolled away: clipped, unpainted, untappable there. ⭐ Assertion 1 now compares PAINTED boxes (each layout
 *     box cut by every ancestor that clips its overflow — `clip.mjs`'s reach rule, applied to sight). Exemption 2 still
 *     covers clipping by the viewport; this is the same fact about the strip, asked by the overlap instead.
 *   ③ A STICK MEASURED PAST ITS OWN RANGE (11 lines at 1280 on main, 15 on the tip). `scrollTo(0, 1200)` on a thin page
 *     lands on the page's end,
 *     where each bar's PARENT has already ended and pushed the bar up under the header — correct sticky behaviour, read
 *     as "did not stick" and "header drawn through the bar" (measured: bar bottom = parent content bottom on /markets,
 *     /results and /notifications, `S/runs/wm16e-stick-*.log`). ⭐ Assertion 4 now scrolls INSIDE the range where the
 *     bar must sit on its own offset, or reports STICK NOT MEASURED; and rows below the bar's parent fail it outright.
 *
 * ⛔ THE FIXTURE IS A PRECONDITION, NOT A FORMALITY. Build it once per fresh server, BEFORE this driver:
 *     npm run fixture:player -- <baseUrl>
 *   (positions, Up & Down bets, stars, an ACTIVE proposals board, a settled archive — `scripts/live/up-fixture.mjs`). The
 *   receipts book `/wallet` and `/wallet/receipts` need is built by this driver's own sign-in (`/auth/demo?receipts=1`,
 *   idempotent: fifteen receipts once, through the real deposit and withdraw doors).
 *
 * ⭐ RUN IT AGAINST THE REFERENCE FIRST. If `/markets` fails, the instrument is the defect.
 *
 *   node scripts/live/bar-geometry-drive.mjs [baseUrl] [--only=/watchlist] [--widths=360,768,1280]
 *                                            [--locales=sw,en,zh] [--shots=<dir>]
 *   exit 0 green where measured (🔶 lines name what was not) · 1 a failure · 3 a skipped run (nothing measured, or a
 *   declared surface measured nowhere — build the fixture)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import {
  BOOK_PROBE,
  CONTROL_PROBE,
  STICK_AFTER_PROBE,
  STICK_PROBE,
  findOverlaps,
  judgeMissingRail,
  judgeStick,
  overlapLine,
  planStick,
} from "./bar-geometry-rules.mjs";

const BASE = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3031";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(BASE)) {
  console.error(`REFUSED — localhost-only, got ${BASE}`);
  process.exit(1);
}
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const ONLY = arg("only", null);
const WIDTHS = arg("widths", "360,768,1280").split(",").map(Number);
/** ⚠️ SWAHILI FIRST AND ALWAYS. It runs 35–40% longer than English and is where a rail breaks. */
const LOCALES = arg("locales", "sw,en,zh").split(",");
const SHOTS = arg("shots", ".50pick-shots/bar-geometry");
mkdirSync(SHOTS, { recursive: true });

/**
 * ⚠️ `minControls` IS THE PER-ROUTE VACUITY CONTROL. A bar that renders nothing measures nothing
 * and would report a cheerful "no overlap" — the exact shape of green-over-an-empty-page this
 * programme keeps finding. Re-derive by counting the VISIBLE controls at 1280.
 */
const SURFACES = [
  /* ⛔ `/updown` IS DELIBERATELY **NOT** HERE, AND THE REASON IS A CORRECTION OF MY OWN CHANGE.
     🔴 It was added on 2026-09-09 on the (correct) finding that the route players complained
     about was in NO gate's population. But this gate asserts a STICKY QUERY BAR contract, and
     `/updown` does not have one: its two rails are plain `hidden sm:flex` `<nav data-filter-rail>`
     elements sitting in page flow, with no `.kp-discovery-bar` wrapper and no `top-[56px]`.
     Declaring it here made the gate assert an offset the surface never promised — measured
     immediately: *"NO [data-filter-rail]"* at 360 (the rails are `sm:`-gated, so below `sm`
     the hook legitimately does not render) and *"THE BAR DID NOT STICK — top -308"* at 1280.
     ⚠️ Three locales × two widths of permanent red, on a page that is behaving exactly as
     designed. **A gate that fails a correct surface is worse than the gap it was closing**,
     because the next person reads past it.
     ⭐ THE POPULATION GAP IS REAL AND IS CLOSED ELSEWHERE: `/updown` is the FIRST surface in
     `qa:tap-truth`, which asks the question that actually applies to it — does a tap land on
     the control it was aimed at — and which opens the phone sheet its chips live in. */
  { id: "/markets", path: "/markets", minControls: 8 },
  { id: "/results", path: "/results", minControls: 12 },
  { id: "/positions", path: "/positions", minControls: 8 },
  { id: "/wallet", path: "/wallet", minControls: 8 },
  /**
   * DECLARED 2026-10-09 (round 5 of the visual pass, R5-F). ⛔ THE ONE STICKY QUERY BAR NO LIVE GATE MEASURED: it shipped
   * on 2026-10-07 (012cccbc9) with `QUERY_BAR_CLASS` — `sticky top-[56px]`, the wallet's own arrangement — and this list
   * was last edited on 2026-09-10, so the route list no longer matched the app.
   * ⭐ `minControls: 13` IS COUNTED FROM THE MARKUP, NOT FROM A FIXTURE: 3 lens pills (all · in · out) + 5 state pills +
   * 5 window pills, every one a `<FilterPill>`, which renders a `<Link>` whatever its count (`aria-disabled` when blocked,
   * never a removed href). ⚠️ Reasoned, so the first lock-turn run re-measures it — the `/leaderboard` note below is what
   * a floor written from a guess looks like when the vacuity control catches it.
   * Its rows come from the sign-in's receipts book (`/auth/demo?receipts=1`); `fixture:player` makes none.
   */
  { id: "/wallet/receipts", path: "/wallet/receipts", minControls: 13 },
  { id: "/updown/history", path: "/updown/history", minControls: 8 },
  { id: "/proposals", path: "/proposals", minControls: 10 },
  { id: "/notifications", path: "/notifications", minControls: 6 },
  { id: "/watchlist", path: "/watchlist", minControls: 6 },
  /* DECLARED 2026-09-08 (PLAYER QUERY, task 4.6). ⛔ This SURFACES list is one of the four
     declaration places §6 of the campaign doc does not name — see the note in
     `count-truth-drive.mjs`, which says it once for all four.
     ⚠️ `minControls: 6` is deliberately below what the bar renders at 1280 (all + ≥1 category, the
     sort summary, the direction button, and five window pills), because this route's lens
     population is the PLAYER's own audit categories and varies per persona. A floor tuned to one
     fixture would fail a correct page for a player with a short history. */
  /**
   * ⛔ `sticky: false` — AND IT IS A DECLARATION, NOT AN EXEMPTION. This rail filters ONE table
   * inside one of five panels on the page (profile · activity · export · privacy · close account).
   * A page-level sticky band would follow the reader down and hover over *Close account*, a
   * one-way ceremony — a filter for a table you can no longer see, on top of the most dangerous
   * control on the page. It takes `QUERY_BAR_CLASS_PANEL` and promises no offset.
   *
   * 🔴 THIS DRIVER FOUND THAT, on its first run against the bar: `bar@-93` at 1280. The bar was
   * inside a bounded `glass-panel` and a sticky element only sticks within its PARENT's box — the
   * same sentence that explains `/updown/history`'s `bar@-252`. ⚠️ The fix was NOT to hoist it out
   * of the panel; it was to stop claiming an offset it cannot hold, and to say so here.
   */
  { id: "/profile/account", path: "/profile/account", minControls: 6, sticky: false },
  /* DECLARED 2026-09-08 (PLAYER QUERY, task 4.7). ⚠️ THE ONE SIGNED-OUT SURFACE THIS DRIVER
     MEASURES, which makes it the cheapest to run and the easiest to forget. Four outcome pills +
     sort + direction + five window pills at 1280. */
  { id: "/fairness", path: "/fairness", minControls: 8 },
  /* DECLARED 2026-09-08 (PLAYER QUERY, task 4.10). Three pills and no second row — the smallest
     bar in this list, and worth measuring precisely because it is small: a three-pill strip has
     nowhere to hide a collision.
     ⚠️ `withheld` (R5-F, 2026-10-09) — THE ONE BAR THIS FIXTURE MAY LEGITIMATELY NOT DRAW. The page withholds it unless
     the player has SETTLED positions in two products (`positions/performance/page.tsx:191`, `lenses.length > 2`), and a
     local store settles no Up & Down round (`up-fixture.mjs` records why: no price feed). The page renders no
     `[data-row-id]` either, so a withheld bar and a missing one look alike here: it is reported BAR NOT MEASURED with this
     reason and does not make the run a skipped one. Its presence is held by `test:filter-language`, which declares
     `performance-bar.tsx`. */
  {
    id: "/positions/performance",
    path: "/positions/performance",
    minControls: 3,
    withheld: "the page draws its product lens only when the player has settled positions in two products (positions/performance/page.tsx:191), and this store settles no Up & Down round",
  },
  /**
   * DECLARED 2026-09-09 (PLAYER QUERY §12 ①). `/leaderboard`'s FIRST filter — a product lens, on a
   * page whose own source used to say in writing that it must never declare a rail because a sort
   * narrows nothing. That was true until the board's population was measured: 72.19% of ranked
   * positions are Up & Down and 17 of 41 board rows mix both products.
   *
   * ⚠️ `minControls: 3` — THE THREE PRODUCT PILLS, AND THE FIRST DRAFT SAID 5.
   *
   * 🔴 That 5 was reasoned, not measured: it counted the sort summary and the fused direction
   * button, which sit in a SIBLING row OUTSIDE `data-filter-rail` — deliberately, because a sort
   * is not a filter and must stay out of the count instruments. This driver only measures
   * `[data-filter-rail] a|button|summary`, so it correctly reported *"only 3 visible controls,
   * floor 5 — a rail is missing"* on the very first run. ⭐ The vacuity control caught a floor
   * written from a guess, which is exactly the job it was given.
   *
   * ⛔ So 3 is the whole measurable population here, and it is EXACT rather than padded — the same
   * shape as `/positions/performance`. A three-pill strip has nowhere to hide a collision, which
   * is what makes measuring it worthwhile.
   *
   * ⛔ `sticky: false` — A DECLARATION, NOT AN EXEMPTION, and the same shape as
   * `/profile/account`'s. This rail is a plain `<nav>` above the sort row; it does not take
   * `QUERY_BAR_CLASS` and promises no page-level offset. ⚠️ It would be wrong to claim one: the
   * board is a paginated table whose header row is the thing worth pinning, and a sticky lens over
   * a public 50-row board buys nothing while risking the `bar@-93` failure this driver found on
   * `/profile/account`.
   */
  { id: "/leaderboard", path: "/leaderboard", minControls: 3, sticky: false },
];

const surfaces = ONLY ? SURFACES.filter((s) => s.id === ONLY || s.path === ONLY) : SURFACES;
if (surfaces.length === 0) {
  console.error(`🔴 --only=${ONLY} matched no surface — refusing to report a clean run over nothing.`);
  process.exit(3);
}

const LANG = { en: "en", sw: "sw", zh: "zh" };
const problems = [];
/**
 * ⛔ THE THIRD OUTCOME, borrowed from `qa:player-filters` which invented it for the same reason.
 * An assertion the FIXTURE cannot pose is neither a pass nor a failure: reporting it as passed is
 * vacuous green, and reporting it as failed is a false finding about working code. It is printed
 * loudly, counted separately, never added to `measured`, and named in the summary.
 */
const notMeasured = [];
const notMeasure = (tag, why) => {
  console.log(`  🔶 ${tag}: ${why}`);
  notMeasured.push(`${tag}: ${why}`);
};
/** ⛔ A declared surface measured at no width and in no locale is a SKIPPED surface — see the exit below. */
const measuredSurfaces = new Set();
let measured = 0;

/**
 * ⭐ `?receipts=1` — the receipts book (fifteen deposits and withdrawals through the real doors), so `/wallet/receipts`
 * has rows to filter. Idempotent: an account that already holds fifteen is left alone (`auth/demo/route.ts`).
 */
const SIGN_IN = `${BASE}/auth/demo?receipts=1`;

const browser = await chromium.launch();
for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: width < 500 ? 900 : 1000 },
      deviceScaleFactor: 2,
    });
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();
    const auth = await page.goto(SIGN_IN, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
    if (!auth || auth.status() >= 400) {
      console.error("🔴 could not sign in at /auth/demo — a run asked to sign in and unable to has measured nothing.");
      await browser.close();
      process.exit(2);
    }

    for (const s of surfaces) {
      const tag = `${s.id} ${locale} ${width}`;
      await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 40_000 });
      // ⭐ The page settles on ONE of three things — its bar, its rows, or its empty state. Wait for any, then ask for
      //    the bar: an empty book no longer costs twenty seconds per width and locale, and a bar that arrives late still
      //    gets its own wait.
      await page.waitForSelector("[data-filter-rail], [data-row-id], [data-empty-state]", { timeout: 20_000 }).catch(() => null);
      const rail = await page.waitForSelector("[data-filter-rail]", { timeout: 3_000 }).catch(() => null);
      if (!rail) {
        const verdict = judgeMissingRail(await page.evaluate(BOOK_PROBE), s);
        if (verdict.kind === "fail") problems.push(`${tag}: ${verdict.why}`);
        else notMeasure(tag, verdict.why);
        continue;
      }
      await page.waitForTimeout(400);

      // ⛔ Refuse the wrong language rather than shoot it — evidence that LOOKS right is worse
      //    than none. Same rule as `player-query-shots.mjs`.
      const lang = await page.getAttribute("html", "lang");
      if (lang !== LANG[locale]) { problems.push(`${tag}: <html lang="${lang}">`); continue; }

      await rail.screenshot({ path: `${SHOTS}/${s.id.replace(/\W+/g, "-").replace(/^-|-$/g, "")}-${width}-${locale}.png` });

      // `CONTROL_PROBE` (bar-geometry-rules.mjs) carries both exemptions and the painted box. ⛔ A real function, never a
      // string — `clip.mjs` records what a string `pageFunction` silently returns.
      const boxes = await page.$$eval(
        "[data-filter-rail] a, [data-filter-rail] button, [data-filter-rail] summary",
        CONTROL_PROBE,
      );
      const vis = boxes.filter((b) => b.vis && !b.inClosed);
      if (vis.length < s.minControls && width >= 1280) {
        problems.push(`${tag}: only ${vis.length} visible controls, floor ${s.minControls} — a rail is missing and every check below is vacuous`);
        continue;
      }
      measured += vis.length;
      measuredSurfaces.add(s.id);

      // 1 · NO OVERLAP, over PAINTED boxes — see the R5-F note in the header and `findOverlaps`.
      for (const o of findOverlaps(vis)) problems.push(`${tag}: ${overlapLine(o)}`);
      for (const b of vis) {
        if (!b.scrolls && (b.x < -1 || b.x + b.w > width + 1)) {
          problems.push(`${tag}: CLIPPED "${b.text}" ${b.x}→${b.x + b.w} vs viewport ${width}`);
        }
        if (b.h < 44) problems.push(`${tag}: SHORT ${b.h}px "${b.text}"`);
      }

      /**
       * 4 · SCROLL, THEN LOOK AGAIN — see the header. ⛔ Only the widest width is checked, and
       * deliberately: below `lg` the bar is one of several stacked surfaces and the app shell's
       * own bars legitimately share the band. The desktop layout is where a second sticky element
       * at the same offset is a defect rather than a design.
       */
      /**
       * ⛔ TWO PRECONDITIONS, BOTH ADDED 2026-09-08 AFTER THIS ASSERTION REPORTED TWO FALSE
       * DEFECTS ON ITS FIRST RUN AGAINST A SPARSE FIXTURE.
       *
       * 🔴 ① A PAGE THAT CANNOT SCROLL CANNOT PROVE A STICK. `scrollTo(0, 1200)` on a short page
       * does NOTHING, so the bar is measured at its natural offset and reported as "did not
       * stick" — a defect invented by the instrument out of a thin fixture. `/notifications`
       * reported `top 237` for exactly this reason. ⚠️ It is reported as NOT MEASURED rather than
       * skipped silently: an unexercisable assertion that prints nothing reads as a pass.
       * 🔴 ①b (R5-F, 2026-10-09) — AND A PAGE THAT SCROLLS PAST THE BAR'S OWN RANGE CANNOT PROVE ONE EITHER. On a thin
       * page `1200` clamps to the page's end, where the bar's PARENT has already ended and pushed it up — correct sticky
       * behaviour, reported as "did not stick" and as the header "drawn through" it. `planStick` scrolls INSIDE the range
       * where the bar must sit on its own `top` (rows below its parent fail it outright: the 247px-wrapper shape).
       *
       * 🔴 ② NOT EVERY BAR PROMISES A PAGE-LEVEL OFFSET. `/profile/account`'s rail filters ONE
       * table inside one of five panels; a sticky band there would follow the reader down and
       * hover over *Close account*, a one-way ceremony. It uses `QUERY_BAR_CLASS_PANEL` and
       * declares `sticky: false` — ⛔ the declaration is what keeps this assertion sharp for the
       * bars that DO promise the offset, instead of being loosened for all of them.
       */
      if (width >= 1280 && s.sticky !== false) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.waitForTimeout(150);
        const g = await page.evaluate(STICK_PROBE);
        if (!g) { problems.push(`${tag}: THE BAR DID NOT STICK — the bar was gone from the page before the scroll`); continue; }
        const plan = planStick(g);
        if (plan.kind === "fail") problems.push(`${tag}: ${plan.why}`);
        else if (plan.kind === "not-measured") notMeasure(tag, plan.why);
        else {
          await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), plan.y);
          await page.waitForTimeout(450);
          const verdict = judgeStick(g, plan, await page.evaluate(STICK_AFTER_PROBE));
          for (const p of verdict.problems) problems.push(`${tag}: ${p}`);
          if (verdict.notMeasured) notMeasure(tag, verdict.notMeasured);
        }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      }
    }
    await ctx.close();
  }
}
await browser.close();

console.log(`\n${measured} control box${measured === 1 ? "" : "es"} measured across ${surfaces.length} surface(s) × ${WIDTHS.length} width(s) × ${LOCALES.length} locale(s) → ${SHOTS}`);
// ⚠️ NAMED IN THE SUMMARY, not swallowed — an unexercisable assertion that prints nothing reads as one that passed.
if (notMeasured.length) {
  console.log(`\n🔶 ${notMeasured.length} assertion(s) NOT MEASURED — the fixture could not pose them, and green does not cover them:`);
  notMeasured.forEach((n) => console.log("   " + n));
}
/** ⛔ A SKIPPED SURFACE IS NOT A PASS: declared, asked for, and measured at no width in no locale (and not one that
 *  declares its bar may be withheld on this fixture). The usual cause is a run without `npm run fixture:player`.
 *  ⚠️ A surface that already FAILED is not listed here too — its ✗ line says what is wrong, and "build the fixture"
 *  beside it would send the reader to the wrong place. Every ✗ line opens with its surface's id. */
const failed = new Set(problems.map((p) => p.split(" ")[0]));
const skipped = surfaces.filter((s) => !s.withheld && !measuredSurfaces.has(s.id) && !failed.has(s.id)).map((s) => s.id);
const skippedLine = `🔴 SKIPPED SURFACE(S) — ${skipped.join(", ")}: no bar measured at any width or locale. A skipped surface is not a pass; build the fixture first:  npm run fixture:player -- ${BASE}`;
if (problems.length) {
  console.error("\n🔴 problems:");
  problems.forEach((p) => console.error("  ✗ " + p));
  if (skipped.length) console.error("\n" + skippedLine);
  process.exit(1);
}
// ⛔ Zero boxes is a skipped run, not a pass.
if (measured === 0) {
  console.error("🔴 ZERO controls measured — a skipped run, not a pass.");
  if (skipped.length) console.error(skippedLine);
  process.exit(3);
}
if (skipped.length) { console.error("\n" + skippedLine); process.exit(3); }
console.log(notMeasured.length
  ? "✅ where measured: no two controls overlap, nothing is clipped, nothing is under 44px, every bar sticks — 🔶 the lines above were not measured."
  : "✅ no two controls overlap, nothing is clipped, nothing is under 44px, and every sticky bar holds its offset.");
