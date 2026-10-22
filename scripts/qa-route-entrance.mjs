/**
 * qa:route-entrance — A CLASSIC ROUTE CHANGE MOVES THE PAGE, NOT THE CHROME, AND LANDS AT THE TOP BEFORE ITS FIRST PAINT
 * (MASWALI-BUILD S5-FIX-PLATFORM D10; the motion critic's M7, 2026-10-21).
 *
 *   BASE=http://localhost:3501 node scripts/qa-route-entrance.mjs
 *
 * A classic reader's route change was a View Transition of the ROOT: it cross-faded the header and the rail with the
 * page (the critic measured the rail's luminance 32 → 24.4 at +120 ms), and the scroll reset ran only inside the
 * transition's callback, so leaving a deep-scrolled page showed the footer for ~300 ms before the next page. Both
 * readers now take the journey's path (R4-J): the CSS entrance on the content wrapper, the scroll reset before paint.
 * On a guest's classic shell, in Chromium (the engine that has View Transitions), at 1280 (the header) and at 360 (the
 * header and the rail):
 *   1. a pushed move from the foot of a long page (/markets) to a short one (/help, by the footer's link): no View
 *      Transition is started; every frame that shows the new address is at the top (y 0); the header and the rail run
 *      no animation while the page changes; the wrapper's entrance (`m-settle-in`) runs;
 *   2. the same under the OS's reduced motion and under the in-app switch (`html.kp-reduce-motion`): the entrance is
 *      clamped to nothing (§M6);
 *   3. Back keeps its place (B-19): a traversal is not sent to the top;
 *   4. a window resized while a move runs raises no page error (the aborted-transition fix, c129888f5, had nothing left
 *      to guard once no transition starts — this holds it so).
 * Read-only: it navigates the site as a guest.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0;
const fails = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label} ${extra}`); }
  else { fails.push(`${label} ${extra}`); console.log(`  ✗ ${label} ${extra}`); }
};

/** Counts View Transitions and records every frame (address, scroll, the animations running on the chrome). */
const RECORDER = () => {
  window.__kpVT = 0;
  const vt = Document.prototype.startViewTransition;
  if (vt) Document.prototype.startViewTransition = function (...args) { window.__kpVT++; return vt.apply(this, args); };
  window.__kpFrames = [];
  window.__kpRecord = (ms) => {
    window.__kpFrames = [];
    const until = performance.now() + ms;
    const chrome = () => [...document.querySelectorAll("header, nav[aria-label], [data-testid=bottom-nav], .kp-rail")];
    const step = () => {
      const docAnims = document.getAnimations().map((a) => a.animationName || a.constructor.name);
      // Only what RUNS: a finished entrance with a `both` fill (the top bar's own `kp-fade` at load) stays listed by
      // getAnimations() for as long as its fill holds, and is not motion.
      const chromeAnims = chrome().flatMap((el) => el.getAnimations().filter((a) => a.playState === "running").map((a) => a.animationName || "transition"));
      const wrap = document.querySelector(".route-enter");
      window.__kpFrames.push({ t: Math.round(performance.now()), path: location.pathname, y: Math.round(scrollY), docAnims, chromeAnims,
        wrapAnims: wrap ? wrap.getAnimations().map((a) => ({ name: a.animationName, dur: a.effect?.getComputedTiming().duration })) : [] });
      if (performance.now() < until) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
};

/** From the foot of /markets, the footer's link to /help, recorded for `ms`. */
async function moveFromFoot(page, ms = 900) {
  await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  const fromY = await page.evaluate(() => Math.round(scrollY));
  await page.evaluate((m) => window.__kpRecord(m), ms);
  const link = page.locator('footer a[href="/help"]').first();
  // A phone's shell may keep the footer's links out of view; the link's own click is the same client move.
  if (await link.isVisible()) await link.click();
  else await link.evaluate((a) => a.click());
  await page.waitForURL(/\/help$/, { timeout: 60_000 });
  await page.waitForTimeout(ms + 100);
  const frames = await page.evaluate(() => window.__kpFrames);
  const vt = await page.evaluate(() => window.__kpVT);
  return { fromY, frames, vt };
}

const errors = [];
const browser = await chromium.launch();
try {
  // ── 1 · a classic guest, full motion: a desktop (the header) and a phone (the header and the rail) ──
  for (const [where, viewport] of [["1280", { width: 1280, height: 700 }], ["360", { width: 360, height: 740 }]]) {
    const ctx = await browser.newContext({ viewport });
    await ctx.addInitScript(RECORDER);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`full ${where}: ${e.message}`));
    const { fromY, frames, vt } = await moveFromFoot(page);
    const arrived = frames.filter((f) => f.path === "/help");
    const offTop = arrived.filter((f) => f.y !== 0);
    ok(`PREMISE ${where} · the move starts at the foot of a long page, well down it, and lands on the short one`, fromY >= 300 && arrived.length > 0, `(from y ${fromY}; ${arrived.length} frames at /help)`);
    ok(`1.1 ${where} · no View Transition is started for a classic reader's route change`, vt === 0, `(startViewTransition × ${vt})`);
    ok(`1.2 ${where} · every frame that shows the new address is at the top — the scroll reset ran before its first paint (no footer of the old scroll)`,
      offTop.length === 0, offTop.length ? `(${offTop.length} of ${arrived.length} frames off the top; first: ${JSON.stringify(offTop[0])})` : `(${arrived.length} frames, all y 0)`);
    const vtAnims = frames.filter((f) => f.docAnims.some((n) => /vt-fade/.test(n)));
    const chromeMoved = frames.filter((f) => f.chromeAnims.some((n) => n !== "transition"));
    ok(`1.3 ${where} · the chrome holds still: no cross-fade of the root, no animation running on the header or the rail while the page changes`,
      vtAnims.length === 0 && chromeMoved.length === 0, `(cross-fade frames ${vtAnims.length}; chrome animation frames ${chromeMoved.length}${chromeMoved.length ? `: ${JSON.stringify(chromeMoved[0].chromeAnims)}` : ""})`);
    const entrance = arrived.find((f) => f.wrapAnims.some((a) => a.name === "m-settle-in"));
    ok(`1.4 ${where} · the content wrapper's entrance runs (m-settle-in), as every other engine already had it`, !!entrance, entrance ? `(${JSON.stringify(entrance.wrapAnims)})` : "");
    // ── 3 · Back keeps its place ──
    await page.evaluate(() => window.__kpRecord(900));
    await page.goBack();
    await page.waitForURL(/\/markets$/, { timeout: 60_000 });
    await page.waitForTimeout(1200);
    const backY = await page.evaluate(() => Math.round(scrollY));
    ok(`3.1 ${where} · Back to the long page keeps its place (B-19): a traversal is not sent to the top`, backY > 200, `(y ${backY}, left at ${fromY})`);
    await ctx.close();
  }
  // ── 2 · reduced motion: the OS preference, then the in-app switch ──
  for (const [label, opts, init] of [
    ["the OS preference", { reducedMotion: "reduce" }, null],
    // The app's own switch (Sound & feedback → Reduce motion): its stored choice, which the shell applies as
    // `html.kp-reduce-motion` and `data-motion="minimal"` (theme-provider.tsx).
    ["the in-app switch", {}, () => { try { localStorage.setItem("50pick:feedback", JSON.stringify({ haptics: true, motion: "off" })); } catch { /* none */ } }],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 700 }, ...opts });
    await ctx.addInitScript(RECORDER);
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
    const { frames, vt } = await moveFromFoot(page, 600);
    const arrived = frames.filter((f) => f.path === "/help");
    const long = arrived.flatMap((f) => f.wrapAnims).filter((a) => a.name === "m-settle-in" && a.dur > 1);
    ok(`2 · reduced motion (${label}): no View Transition, the entrance clamped to nothing, still at the top`,
      vt === 0 && long.length === 0 && arrived.every((f) => f.y === 0), `(vt ${vt}; unclamped entrance frames ${long.length})`);
    await ctx.close();
  }
  // ── 4 · a resize while a move runs ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 700 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`resize: ${e.message}`));
    await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.locator('footer a[href="/help"]').first().click();
    await page.setViewportSize({ width: 900, height: 700 });
    await page.waitForURL(/\/help$/, { timeout: 60_000 });
    await page.waitForTimeout(800);
    await ctx.close();
  }
  ok("4.1 · no page error on any move (a resize mid-move included)", errors.length === 0, errors.slice(0, 2).join(" | "));
} finally {
  await browser.close();
}
console.log(`\nqa:route-entrance: ${pass} passed, ${fails.length} failed`);
process.exitCode = fails.length ? 1 : 0;
