/**
 * Phase D — performance smoke. Loads the public top pages under a low-end-device
 * CPU throttle (the Tanzanian mid-range mobile the market runs on) against a
 * REAL production build and reports First-Load-JS payload + Web Vitals (FCP/LCP)
 * + load timing, checked against a budget. Reusable baseline harness.
 *
 *   BASE=https://kipindi-production.up.railway.app node scripts/perf-smoke.mjs
 *   CPU=4 NET=1 node scripts/perf-smoke.mjs   # CPU throttle ×4, +Slow-3G network
 *
 * Defaults to the live prod URL (minified bundles, real CDN/Postgres). Auth'd
 * pages are skipped in prod (no /auth/demo there) — measures the public set.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "https://kipindi-production.up.railway.app";
const CPU = Number(process.env.CPU || 4);          // CPU slowdown multiplier
const NET = process.env.NET === "1";               // add Slow-3G network on top

// Budgets (First-Load JS transferred + LCP under throttle). Generous first pass —
// tighten once the baseline is known.
const BUDGET = { jsKB: 500, lcpMs: 4000, fcpMs: 3000 }; // jsKB = over-the-wire (gzip)

const PAGES = [
  { path: "/", name: "landing" },
  { path: "/markets", name: "markets board" },
  { path: "/leaderboard", name: "leaderboard" },
  { path: "/proposals", name: "proposals" },
  { path: "/results", name: "results" },
  { path: "/fairness", name: "fairness" },
];

const browser = await chromium.launch();
const rows = [];
for (const pg of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // mobile
  // Record LCP/FCP via buffered observers before the page scripts run.
  await ctx.addInitScript(() => {
    window.__perf = { lcp: 0, fcp: 0 };
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = Math.round(e.startTime); }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__perf.fcp = Math.round(e.startTime); }).observe({ type: "paint", buffered: true });
    } catch { /* unsupported */ }
  });
  const page = await ctx.newPage();
  const client = await ctx.newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  await client.send("Network.enable");
  if (NET) {
    // Slow 3G-ish (a pessimistic stand-in for 2G bursts)
    await client.send("Network.emulateNetworkConditions", {
      offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8,
    });
  }
  // True over-the-wire bytes (gzip/brotli) via CDP — the metric Next/Lighthouse report.
  const meta = new Map();
  let jsWire = 0, totalWire = 0;
  client.on("Network.responseReceived", (e) => meta.set(e.requestId, { url: e.response.url, mime: e.response.mimeType || "" }));
  client.on("Network.loadingFinished", (e) => {
    const m = meta.get(e.requestId); if (!m) return;
    totalWire += e.encodedDataLength || 0;
    if (/javascript|ecmascript/.test(m.mime) || /\.js(\?|$)/.test(m.url)) jsWire += e.encodedDataLength || 0;
  });
  let jsBytes = 0, totalBytes = 0;
  const pending = [];
  page.on("response", (res) => {
    pending.push((async () => {
      try {
        const ct = (res.headers()["content-type"] || "");
        const buf = await res.body();           // decoded bytes (standard payload metric)
        totalBytes += buf.length;
        if (/javascript|ecmascript/.test(ct) || /\.js(\?|$)/.test(res.url())) jsBytes += buf.length;
      } catch { /* redirect/204/no-body */ }
    })());
  });
  const t0 = Date.now();
  let status = 0;
  try {
    const resp = await page.goto(`${BASE}${pg.path}`, { waitUntil: "load", timeout: 60000 });
    status = resp?.status() ?? 0;
  } catch (e) { status = -1; }
  await page.waitForTimeout(2000); // let LCP settle
  const vitals = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    return {
      fcp: window.__perf?.fcp || null,
      lcp: window.__perf?.lcp || null,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      load: nav ? Math.round(nav.loadEventEnd) : null,
    };
  });
  await Promise.all(pending);
  rows.push({
    name: pg.name, path: pg.path, status, wall: Date.now() - t0,
    jsKB: Math.round(jsWire / 1024),               // wire (gzip) — the budget metric
    jsDecodedKB: Math.round(jsBytes / 1024),        // decoded (parse cost)
    totalKB: Math.round(totalWire / 1024),
    ...vitals,
  });
  await ctx.close();
}
await browser.close();

console.log(`\nPhase D perf smoke · BASE=${BASE} · CPU×${CPU}${NET ? " · Slow-3G" : ""} · mobile 390px\n`);
console.log("page               status  wall  JSwire(kB) JSparse total(kB) FCP    LCP    DCL");
let fails = 0;
for (const r of rows) {
  const jsBad = r.jsKB > BUDGET.jsKB, lcpBad = (r.lcp ?? 0) > BUDGET.lcpMs;
  if (r.status !== 200 || jsBad || lcpBad) fails++;
  const f = (v) => (v == null ? "  —" : String(v).padStart(4));
  console.log(
    `${r.name.padEnd(18)} ${String(r.status).padStart(3)}   ${String(r.wall).padStart(5)}   ${String(r.jsKB).padStart(5)}${jsBad ? "!" : " "}   ${String(r.jsDecodedKB).padStart(5)}  ${String(r.totalKB).padStart(6)}   ${f(r.fcp)}  ${f(r.lcp)}${lcpBad ? "!" : " "} ${f(r.domContentLoaded)}`,
  );
}
console.log(`\nBudget: JS-wire ≤${BUDGET.jsKB}kB (gzip) · LCP ≤${BUDGET.lcpMs}ms (mobile CPU×${CPU}). ${fails === 0 ? "ALL WITHIN BUDGET ✓" : `${fails} page(s) over budget / errored ✗`}`);
process.exit(fails === 0 ? 0 : 1);
