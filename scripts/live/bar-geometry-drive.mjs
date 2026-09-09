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
 * ── THREE ASSERTIONS, PER SURFACE × WIDTH × LOCALE ───────────────────────────────────────────
 *   1 · NO OVERLAP  — no two visible controls on the same visual row share pixels.
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
 * ⭐ RUN IT AGAINST THE REFERENCE FIRST. If `/markets` fails, the instrument is the defect.
 *
 *   node scripts/live/bar-geometry-drive.mjs [baseUrl] [--only=/watchlist] [--widths=360,768,1280]
 *                                            [--locales=sw,en,zh] [--shots=<dir>]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

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
  { id: "/markets", path: "/markets", minControls: 8 },
  { id: "/results", path: "/results", minControls: 12 },
  { id: "/positions", path: "/positions", minControls: 8 },
  { id: "/wallet", path: "/wallet", minControls: 8 },
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
     nowhere to hide a collision. */
  { id: "/positions/performance", path: "/positions/performance", minControls: 3 },
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
let measured = 0;

const browser = await chromium.launch();
for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: width < 500 ? 900 : 1000 },
      deviceScaleFactor: 2,
    });
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();
    const auth = await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => null);
    if (!auth || auth.status() >= 400) {
      console.error("🔴 could not sign in at /auth/demo — a run asked to sign in and unable to has measured nothing.");
      await browser.close();
      process.exit(2);
    }

    for (const s of surfaces) {
      await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 40_000 });
      const rail = await page.waitForSelector("[data-filter-rail]", { timeout: 20_000 }).catch(() => null);
      if (!rail) { problems.push(`${s.id} ${locale} ${width}: NO [data-filter-rail]`); continue; }
      await page.waitForTimeout(400);

      // ⛔ Refuse the wrong language rather than shoot it — evidence that LOOKS right is worse
      //    than none. Same rule as `player-query-shots.mjs`.
      const lang = await page.getAttribute("html", "lang");
      if (lang !== LANG[locale]) { problems.push(`${s.id} ${locale} ${width}: <html lang="${lang}">`); continue; }

      await rail.screenshot({ path: `${SHOTS}/${s.id.replace(/\W+/g, "-").replace(/^-|-$/g, "")}-${width}-${locale}.png` });

      const boxes = await page.$$eval(
        "[data-filter-rail] a, [data-filter-rail] button, [data-filter-rail] summary",
        (els) =>
          els.map((e) => {
            const r = e.getBoundingClientRect();
            const cs = getComputedStyle(e);
            // EXEMPTION 1 — inside a SHUT disclosure. Its own <summary> is not inside it.
            //
            // 🔴 AND FOR A DAY IT WAS, WHICH BLINDED THE ASSERTION THIS DRIVER WAS BUILT FOR.
            // The walk began at `e.parentElement`, and a <summary>'s parent IS the <details> it
            // opens — so every summary on every bar (the sort control AND the `Filters` trigger)
            // was exempted from all three measurements. The line above has always claimed the
            // opposite; the code did not implement it. ⛔ The cost was exact: assertion 1 (NO
            // OVERLAP) was structurally incapable of failing on the sort summary — the very
            // control whose 44px collision with the direction button is the reason this driver
            // exists — and the red mutation written to prove it kept reporting NOT CAUGHT while
            // the mutation was working perfectly. A guard that exempts what it polices.
            //
            // ⚠️ The walk still starts ABOVE that one disclosure rather than skipping the rule:
            // a sort menu nested inside a shut `Filters` sheet must stay exempt, because Chrome
            // lays a closed <details> out and neither paints nor hit-tests it.
            let n = e.tagName === "SUMMARY" ? (e.parentElement && e.parentElement.parentElement) : e.parentElement;
            let inClosed = false;
            while (n) {
              if (n.tagName === "DETAILS" && !n.open) { inClosed = true; break; }
              n = n.parentElement;
            }
            // EXEMPTION 2 — the nearest ancestor that actually scrolls horizontally is the frame
            // this control must fit inside; only with none does the viewport apply.
            let sc = e.parentElement, scrolls = false;
            while (sc) {
              const st = getComputedStyle(sc);
              if (/(auto|scroll)/.test(st.overflowX) && sc.scrollWidth > sc.clientWidth + 1) { scrolls = true; break; }
              sc = sc.parentElement;
            }
            return {
              text: (e.textContent || "").trim().slice(0, 24),
              x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
              inClosed, scrolls,
              vis: cs.visibility !== "hidden" && cs.display !== "none" && r.width > 0 && r.height > 0,
            };
          }),
      );
      const vis = boxes.filter((b) => b.vis && !b.inClosed);
      if (vis.length < s.minControls && width >= 1280) {
        problems.push(`${s.id} ${locale} ${width}: only ${vis.length} visible controls, floor ${s.minControls} — a rail is missing and every check below is vacuous`);
        continue;
      }
      measured += vis.length;

      for (let i = 0; i < vis.length; i++) {
        for (let j = i + 1; j < vis.length; j++) {
          const a = vis[i], b = vis[j];
          // Same visual row: their vertical spans genuinely intersect by more than a hair.
          const vOv = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          const hOv = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          if (vOv > Math.min(a.h, b.h) / 2 && hOv > 1) {
            problems.push(`${s.id} ${locale} ${width}: OVERLAP ${hOv}px "${a.text}"(${a.x}→${a.x + a.w}) vs "${b.text}"(${b.x}→${b.x + b.w})`);
          }
        }
      }
      for (const b of vis) {
        if (!b.scrolls && (b.x < -1 || b.x + b.w > width + 1)) {
          problems.push(`${s.id} ${locale} ${width}: CLIPPED "${b.text}" ${b.x}→${b.x + b.w} vs viewport ${width}`);
        }
        if (b.h < 44) problems.push(`${s.id} ${locale} ${width}: SHORT ${b.h}px "${b.text}"`);
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
       *
       * 🔴 ② NOT EVERY BAR PROMISES A PAGE-LEVEL OFFSET. `/profile/account`'s rail filters ONE
       * table inside one of five panels; a sticky band there would follow the reader down and
       * hover over *Close account*, a one-way ceremony. It uses `QUERY_BAR_CLASS_PANEL` and
       * declares `sticky: false` — ⛔ the declaration is what keeps this assertion sharp for the
       * bars that DO promise the offset, instead of being loosened for all of them.
       */
      if (width >= 1280 && s.sticky !== false) {
        await page.evaluate(() => window.scrollTo(0, 1200));
        await page.waitForTimeout(450);
        const scrolled = await page.evaluate(() => Math.round(window.scrollY));
        if (scrolled < 200) {
          console.log(`  🔶 ${s.id} ${locale} ${width}: STICK NOT MEASURED — the page scrolled ${scrolled}px, so nothing was proved. Seed more rows.`);
          notMeasured.push(`${s.id} ${locale} ${width} (page scrolled only ${scrolled}px)`);
          await page.evaluate(() => window.scrollTo(0, 0));
          continue;
        }
        const stuck = await page.evaluate(() => {
          const bar = document.querySelector("[data-filter-rail]");
          if (!bar) return null;
          const rb = bar.getBoundingClientRect();
          const hits = [];
          for (const e of document.querySelectorAll("body *")) {
            if (e === bar || bar.contains(e) || e.contains(bar)) continue;
            const cs = getComputedStyle(e);
            if (cs.position !== "sticky" && cs.position !== "fixed") continue;
            const r = e.getBoundingClientRect();
            if (r.width < 200 || r.height < 8) continue;
            const v = Math.min(rb.bottom, r.bottom) - Math.max(rb.top, r.top);
            const h = Math.min(rb.right, r.right) - Math.max(rb.left, r.left);
            if (v > 2 && h > 2) hits.push(`${e.tagName.toLowerCase()}.${String(e.className).trim().split(/\s+/).slice(0, 2).join(".")} by ${Math.round(v)}px`);
          }
          return { top: Math.round(rb.top), hits };
        });
        if (stuck) {
          // ⚠️ A bar ABOVE the viewport has scrolled away — it did not stick. The tolerance is
          //    generous (0 ≤ top ≤ 200) because the exact offset is the shell's business, not this
          //    driver's; what is being asserted is that the bar is still ON SCREEN.
          if (stuck.top < 0 || stuck.top > 200) {
            problems.push(`${s.id} ${locale} ${width}: THE BAR DID NOT STICK — after scrolling it sits at top ${stuck.top}. A sticky element only sticks within its PARENT's box; check the wrapper's height.`);
          }
          for (const h of stuck.hits) {
            problems.push(`${s.id} ${locale} ${width}: ANOTHER STICKY SURFACE IS DRAWN THROUGH THE BAR — ${h}. Two sticky surfaces cannot share one offset.`);
          }
        }
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    }
    await ctx.close();
  }
}
await browser.close();

console.log(`\n${measured} control box${measured === 1 ? "" : "es"} measured across ${surfaces.length} surface(s) × ${WIDTHS.length} width(s) × ${LOCALES.length} locale(s) → ${SHOTS}`);
if (problems.length) {
  console.error("\n🔴 problems:");
  problems.forEach((p) => console.error("  ✗ " + p));
  process.exit(1);
}
// ⛔ Zero boxes is a skipped run, not a pass.
if (measured === 0) { console.error("🔴 ZERO controls measured — a skipped run, not a pass."); process.exit(3); }
// ⚠️ NAMED IN THE SUMMARY, not swallowed — an unexercisable assertion that prints nothing reads
//    as one that passed.
if (notMeasured.length) {
  console.log(`\n🔶 ${notMeasured.length} stick assertion(s) NOT MEASURED — the fixture could not pose them:`);
  notMeasured.forEach((n) => console.log("   " + n));
}
console.log("✅ no two controls overlap, nothing is clipped, nothing is under 44px.");
