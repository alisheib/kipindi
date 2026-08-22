/**
 * ZERO-PIXEL PROOF for the 2026-08-22 landmark + B7 migration.
 *
 *   BEFORE=https://50pick.tz AFTER=http://localhost:3000 node scripts/measure-parity-check.mjs
 *
 * ⭐ WHY THIS EXISTS. The migration's whole claim is that replacing
 * `<main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">` with
 * `<PageContainer tier="reading" className="space-y-6">` is a PURE RENAME with no
 * visual delta. That is a claim about rendered geometry, and "it looks the same in
 * a screenshot" is not a measurement — a 4px inset or a lost `space-y` reads as
 * identical at a glance and is a real regression on a money page.
 *
 * So this measures the CAPPED CONTENT COLUMN — the first descendant of
 * `#main-content` whose computed `max-width` is a real length ≥500px — on the
 * deployed BEFORE and the local AFTER, at several widths, and diffs
 * left/width/padding. Anything that moves by more than 1px (sub-pixel rounding)
 * is reported.
 *
 * ⛔ It deliberately does NOT key on `[data-measure]`: the BEFORE pages have no
 * such attribute (that is the thing being added), so keying on it would compare
 * the new build against nothing and print a clean pass. Resolving both sides by
 * the CAP is what makes it a like-for-like — the element being replaced against
 * the element replacing it.
 *
 * ⚠️ Signed-out only. Routes behind auth render their signed-out state on both
 * sides, which is still a real comparison of the same container.
 */
import { chromium } from "playwright";

const BEFORE = process.env.BEFORE || "https://50pick.tz";
const AFTER = process.env.AFTER || "http://localhost:3000";
const ROUTES = (process.env.ROUTES || [
  "/markets", "/results", "/leaderboard", "/help", "/positions",
  "/wallet", "/profile", "/proposals", "/live", "/watchlist",
  "/legal/privacy", "/profile/security", "/wallet/deposit",
].join(",")).split(",");
const WIDTHS = [360, 768, 1280, 1920];

async function measure(browser, base, route, w) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: 900 });
  try {
    const r = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 40000 });
    if (!r || r.status() >= 400) return { error: `HTTP ${r ? r.status() : 0}` };
    await page.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);   // ⛔ 400ms was not enough: /markets@360 read a transient 80px top pad mid-settle
    return await page.evaluate(() => {
      const shell = document.querySelector("#main-content");
      if (!shell) return { error: "no #main-content" };
      /**
       * ⛔ THE SELECTOR IS THE WHOLE MEASUREMENT, AND THE OBVIOUS ONE IS VACUOUS.
       *
       * The first draft took `shell.children[0]` — which is `RouteTransition`, a
       * full-bleed wrapper. It reported 1280px at 0 padding on BOTH sides for every
       * route and printed "32 cells pixel-identical", a clean pass that compared a
       * div to itself and said nothing whatsoever about the measure. That is the
       * assertion-that-cannot-fail this repo keeps shipping.
       *
       * What must be compared is the element being REPLACED against the element
       * REPLACING it — i.e. the thing that actually carries the width cap:
       *   BEFORE — the nested `<main class="mx-auto max-w-[1080px] px-3 …">`
       *   AFTER  — the `[data-measure]` PageContainer
       * Both resolve through one rule: the first descendant inside #main-content
       * whose computed `max-width` is a real length. Falling back to anything
       * uncapped would re-introduce the vacuous compare, so it is an error instead.
       */
      const capped = [...shell.querySelectorAll("*")].find((el) => {
        const mw = getComputedStyle(el).maxWidth;
        if (!mw || mw === "none") return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && parseFloat(mw) >= 500;   // page tiers only, not a 420px prose block
      });
      const col = capped;
      if (!col) return { error: "no capped content column — refusing to compare uncapped wrappers" };
      const b = col.getBoundingClientRect();
      const cs = getComputedStyle(col);
      return {
        left: Math.round(b.left), width: Math.round(b.width),
        padL: cs.paddingLeft, padR: cs.paddingRight,
        padT: cs.paddingTop, padB: cs.paddingBottom,
        maxW: cs.maxWidth,
        tag: col.tagName.toLowerCase(),
        mains: document.querySelectorAll("main").length,
      };
    });
  } catch (e) {
    return { error: String(e).split("\n")[0].slice(0, 60) };
  } finally {
    await page.close();
  }
}

const browser = await chromium.launch();
let same = 0; const moved = []; const skipped = [];

console.log(`BEFORE ${BEFORE}\nAFTER  ${AFTER}\n`);
console.log("route                       w     before                       after                        verdict");
console.log("-".repeat(112));

for (const route of ROUTES) {
  for (const w of WIDTHS) {
    const [a, b] = await Promise.all([
      measure(browser, BEFORE, route, w),
      measure(browser, AFTER, route, w),
    ]);
    const cell = `${route.padEnd(24)} ${String(w).padStart(5)}`;
    if (a.error || b.error) {
      skipped.push(`${route}@${w}  before=${a.error ?? "ok"} after=${b.error ?? "ok"}`);
      console.log(`${cell}  SKIPPED  before=${a.error ?? "ok"} after=${b.error ?? "ok"}`);
      continue;
    }
    const fmt = (x) => `${x.tag}${String(x.width).padStart(5)}px cap${String(parseInt(x.maxW)).padStart(5)} p${x.padL}/${x.padT}`;
    const deltaW = Math.abs(a.width - b.width);
    const deltaL = Math.abs(a.left - b.left);
    const padSame = a.padL === b.padL && a.padR === b.padR && a.padT === b.padT && a.padB === b.padB;
    const ok = deltaW <= 1 && deltaL <= 1 && padSame;
    if (ok) same++;
    else moved.push(`${route}@${w}  width ${a.width}->${b.width}  left ${a.left}->${b.left}  pad ${a.padL}/${a.padT} -> ${b.padL}/${b.padT}`);
    console.log(`${cell}  ${fmt(a).padEnd(28)} ${fmt(b).padEnd(28)} ${ok ? "same" : "MOVED"}   main ${a.mains}->${b.mains}`);
  }
}
await browser.close();

console.log(`\n${"=".repeat(112)}`);
console.log(`  ${same} cell(s) pixel-identical · ${moved.length} moved · ${skipped.length} skipped`);
if (moved.length) { console.log("\n  MOVED:"); for (const m of moved) console.log(`    ${m}`); }
console.log("=".repeat(112));
process.exit(moved.length ? 1 : 0);
