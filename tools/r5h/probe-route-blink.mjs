// node probe-route-blink.mjs <base> <label> <out.json>   (cwd: the tree under test — its playwright and journey-pass)
// R5-H's route-transition question, measured in a browser: does the page go transparent AFTER the new route painted
// (a blink on a journey tab tap), and does the entrance replay at hydration (the page the reader is reading fades out
// and in again, and jumps to the top)? Samples the RouteTransition wrapper's computed opacity on every frame.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { writeFileSync } from "node:fs";

const [BASE, LABEL, OUT] = process.argv.slice(2);
const CWD = process.cwd();
const require = createRequire(join(CWD, "package.json"));
const { chromium } = require("playwright");
const { mintStaffPass, LOCALE_COOKIE } = await import(pathToFileURL(join(CWD, "scripts", "live", "journey-pass.mjs")).href);

const SAMPLER = () => {
  const w = document.querySelector(".route-enter");
  if (w) w.setAttribute("data-probe-wrap", "");
  window.__frames = [];
  window.__sampling = true;
  const t0 = performance.now();
  const tick = () => {
    if (!window.__sampling) return;
    const el = document.querySelector("[data-probe-wrap]") || document.querySelector(".route-enter");
    window.__frames.push({
      t: Math.round(performance.now() - t0),
      path: location.pathname,
      op: el ? Number(getComputedStyle(el).opacity) : null,
      cls: el ? el.className : null,
      y: Math.round(scrollY),
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const result = { label: LABEL, base: BASE, taps: [], cold: null };
const browser = await chromium.launch();
try {
  await (await browser.newContext()).request.post(`${BASE}/api/dev-test/seed-markets`, { data: {} }).catch(() => {});
  const pass = await mintStaffPass(browser, BASE);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  await ctx.addCookies([pass, { name: LOCALE_COOKIE, value: "en", url: BASE }]);

  // 1 · tab taps: every journey tab link that is not the current page, from "/"
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 300_000 });
  await page.waitForTimeout(2500);
  const hrefs = await page.$$eval('[data-testid="journey-tabs"] a[href]', (as) => as.map((a) => a.getAttribute("href")));
  result.tabs = hrefs;
  for (const href of hrefs) {
    if (!href || href === new URL(page.url()).pathname) continue;
    for (const warm of [true, false]) {           // the first hop compiles the route on a dev server; the second is real
      await page.evaluate(SAMPLER);
      await page.click(`[data-testid="journey-tabs"] a[href="${href}"]`);
      await page.waitForURL((u) => new URL(u).pathname === href, { timeout: 240_000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const frames = await page.evaluate(() => { window.__sampling = false; return window.__frames; });
      // the blink: after the new path is current, a frame at (near) full opacity followed later by a frame ≤ 0.5
      const after = frames.filter((f) => f.path === href && f.op !== null);
      let fullAt = -1, blink = null;
      for (let i = 0; i < after.length; i++) {
        if (after[i].op >= 0.95 && fullAt < 0) fullAt = i;
        if (fullAt >= 0 && i > fullAt && after[i].op <= 0.5) { blink = { fullAtMs: after[fullAt].t, lowAtMs: after[i].t, low: after[i].op }; break; }
      }
      const first = after[0] ?? null;
      result.taps.push({ href, warm, frames: frames.length, firstFrameOnNewPath: first, blink,
        series: after.slice(0, 40).map((f) => `${f.t}:${f.op}`).join(" ") });
      // back to "/" for the next tab
      await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 300_000 });
      await page.waitForTimeout(1500);
    }
  }
  await page.close();

  // 2 · a cold load on a throttled network: does the entrance replay at hydration, and does the page jump to the top?
  const cold = await ctx.newPage();
  const cdp = await ctx.newCDPSession(cold);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 300, downloadThroughput: 200 * 1024, uploadThroughput: 100 * 1024 });
  await cold.addInitScript(SAMPLER.toString().replace(/^\(\) => \{/, "document.addEventListener('DOMContentLoaded', () => {").replace(/\}$/, "});"));
  // scroll down as soon as the server's HTML is there (before hydration), then wait for everything
  await cold.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 300_000 });
  await cold.evaluate(() => window.scrollTo(0, 600));
  const yBefore = await cold.evaluate(() => Math.round(scrollY));
  await cold.waitForLoadState("networkidle", { timeout: 300_000 }).catch(() => {});
  await cold.waitForTimeout(3000);
  const frames = await cold.evaluate(() => { window.__sampling = false; return window.__frames || []; });
  let seenFull = -1, replay = null;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (f.op === null) continue;
    if (f.op >= 0.95 && seenFull < 0) seenFull = i;
    if (seenFull >= 0 && i > seenFull && f.op <= 0.5) { replay = { fullAtMs: frames[seenFull].t, lowAtMs: f.t, low: f.op }; break; }
  }
  const yAfter = await cold.evaluate(() => Math.round(scrollY));
  result.cold = { frames: frames.length, replay, yBefore, yAfter, jumpedToTop: yBefore > 100 && yAfter < 20 };
  await cold.close();

  // 3 · a deep link with a #hash on a throttled cold load (S14's finding, 2026-10-09: /legal/privacy's §5 scrolled into
  // view, then found at y≈4900 at capture): after hydration, is the anchor still where the reader landed?
  const scout = await ctx.newPage();
  await scout.goto(`${BASE}/legal/privacy`, { waitUntil: "networkidle", timeout: 300_000 });
  const anchor = await scout.evaluate(() => {
    const els = [...document.querySelectorAll("main [id], #main-content [id]")].filter((e) => e.getBoundingClientRect().top + scrollY > 1500);
    return els[0]?.id ?? null;
  });
  await scout.close();
  if (anchor) {
    const deep = await ctx.newPage();
    const cdp2 = await ctx.newCDPSession(deep);
    await cdp2.send("Network.enable");
    await cdp2.send("Network.emulateNetworkConditions", { offline: false, latency: 300, downloadThroughput: 200 * 1024, uploadThroughput: 100 * 1024 });
    await deep.goto(`${BASE}/legal/privacy#${anchor}`, { waitUntil: "domcontentloaded", timeout: 300_000 });
    const landed = await deep.evaluate(() => Math.round(scrollY));
    await deep.waitForLoadState("networkidle", { timeout: 300_000 }).catch(() => {});
    await deep.waitForTimeout(3000);
    const after = await deep.evaluate((id) => {
      const el = document.getElementById(id);
      return { y: Math.round(scrollY), anchorTop: el ? Math.round(el.getBoundingClientRect().top) : null };
    }, anchor);
    result.hash = { anchor, landedY: landed, afterY: after.y, anchorTopInViewport: after.anchorTop,
      lost: after.anchorTop === null || after.anchorTop < -50 || after.anchorTop > 400 };
    await deep.close();
  } else {
    result.hash = { anchor: null, note: "no anchor below 1500px on /legal/privacy" };
  }
  await ctx.close();
} finally {
  await browser.close();
}
writeFileSync(OUT, JSON.stringify(result, null, 2));
const blinks = result.taps.filter((x) => !x.warm && x.blink).length;
console.log(`${LABEL}: ${result.taps.filter((x) => !x.warm).length} real tab taps, ${blinks} with a blink · cold load: replay ${result.cold?.replay ? "YES" : "no"}, jumped to top ${result.cold?.jumpedToTop ? "YES" : "no"} (y ${result.cold?.yBefore} → ${result.cold?.yAfter}) · #hash deep link: ${result.hash?.anchor ? (result.hash.lost ? "LOST" : "kept") + ` (#${result.hash.anchor}, y ${result.hash.landedY} → ${result.hash.afterY}, anchor at ${result.hash.anchorTopInViewport}px)` : result.hash?.note}`);
