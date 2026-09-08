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
  { id: "/watchlist", path: "/watchlist", minControls: 6 },
];

const surfaces = ONLY ? SURFACES.filter((s) => s.id === ONLY || s.path === ONLY) : SURFACES;
if (surfaces.length === 0) {
  console.error(`🔴 --only=${ONLY} matched no surface — refusing to report a clean run over nothing.`);
  process.exit(3);
}

const LANG = { en: "en", sw: "sw", zh: "zh" };
const problems = [];
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
            let n = e.parentElement, inClosed = false;
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
console.log("✅ no two controls overlap, nothing is clipped, nothing is under 44px.");
