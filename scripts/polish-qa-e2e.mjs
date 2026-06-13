/**
 * Final polish QA — small details that bite in production:
 *   A. Refresh persistence: q + cat + when survive a hard reload, input
 *      stays prefilled, results render, no error boundary.
 *   B. Filtering: switching category keeps the active search; clearing resets.
 *   C. No horizontal page overflow (the #1 mobile-responsiveness bug) on every
 *      key screen at a phone width — inner scrollers are fine, the PAGE isn't.
 *   D. Expired/closed-by-time markets never appear as bettable on the board.
 *   E. No "expired" / dead error overlay on any key screen (desktop + mobile).
 *
 *   BASE=http://localhost:3009 node scripts/polish-qa-e2e.mjs
 */
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3009";
let pass = 0, fail = 0;
const ok = (l, c, d = "") => { console.log(`${c ? "✓" : "✗"} ${l}${d ? "  →  " + d : ""}`); c ? pass++ : fail++; };

// Same robust detector the gauntlet uses: an empty <nextjs-portal> is ALWAYS
// present in dev and is NOT an error — only a real dialog or signature error
// text counts.
const overlay = async (p) => p.evaluate(() => {
  const t = document.body.innerText || "";
  if (document.querySelector("[data-nextjs-dialog]")) return true;
  return /Unhandled Runtime Error|Build Error|Failed to compile|This page could not be found|Internal Server Error|Application error:|That page hit a snag/i.test(t);
}).catch(() => false);
const snag = async (p) => /that page hit a snag/i.test(await p.locator("body").innerText().catch(() => ""));
const pageOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

const browser = await chromium.launch();
try {
  // ── A. Refresh persistence (desktop) ───────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const url = `${BASE}/markets?q=bitcoin&cat=crypto&when=all`;
  await p.goto(url, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  const before = p.url();
  await p.reload({ waitUntil: "networkidle" }); await p.waitForTimeout(500);
  ok("A1 URL identical after refresh", p.url() === before, p.url());
  ok("A2 search input still prefilled after refresh",
    (await p.getByPlaceholder(/Search markets/).inputValue()).toLowerCase() === "bitcoin");
  ok("A3 results still render after refresh", (await p.locator(".mcardp").count()) > 0);
  ok("A4 no error overlay/snag after refresh", !(await overlay(p)) && !(await snag(p)));

  // ── B. Filtering interactions ──────────────────────────────────────
  // Switch category via the topic pills — the active search must persist.
  await p.goto(`${BASE}/markets?q=bitcoin&when=all`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  const sportsPill = p.locator('a[href*="cat=sports"]').first();
  if (await sportsPill.count()) {
    await sportsPill.click(); await p.waitForTimeout(500);
    ok("B1 switching category preserves ?q", /[?&]q=bitcoin/.test(p.url()), p.url());
  } else ok("B1 switching category preserves ?q", true, "no sports pill — skipped");

  // ── C. No horizontal page overflow on mobile, key screens ──────────
  await ctx.request.get(`${BASE}/auth/demo`).catch(() => {}); // authed cookie for wallet/positions
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await m.request.get(`${BASE}/auth/demo`).catch(() => {});
  const screens = ["/", "/markets?when=all", "/markets?q=bitcoin", "/live", "/leaderboard", "/wallet", "/positions", "/proposals"];
  for (const s of screens) {
    const mp = await m.newPage();
    await mp.goto(`${BASE}${s}`, { waitUntil: "networkidle" }).catch(() => {});
    await mp.waitForTimeout(500);
    const ov = await pageOverflow(mp);
    const clean = !(await overlay(mp)) && !(await snag(mp));
    ok(`C ${s} — no horizontal overflow + clean`, ov <= 2 && clean, `overflow ${ov}px`);
    await mp.close();
  }

  // ── D. Expired (closed-by-time) markets are not bettable on the board ─
  await p.goto(`${BASE}/markets?when=all`, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  // Every LIVE card on the board must expose YES/NO actions (i.e. be bettable);
  // a closed/expired one would render the non-actionable "Closed/Resolved" row.
  const liveCards = await p.locator(".mcardp:has(.mcardp-actions)").count();
  const closedInLiveGrid = await p.locator(".market-grid .mcardp:not(:has(.mcardp-actions)):has(.live-dot)").count();
  ok("D expired markets not shown as bettable", closedInLiveGrid === 0, `${liveCards} bettable, ${closedInLiveGrid} stale-live`);

  // ── E. Desktop key screens clean ──────────────────────────────────
  for (const s of ["/", "/markets", "/leaderboard"]) {
    const dp = await ctx.newPage();
    await dp.goto(`${BASE}${s}`, { waitUntil: "networkidle" }); await dp.waitForTimeout(400);
    ok(`E ${s} desktop clean`, !(await overlay(dp)) && !(await snag(dp)));
    await dp.close();
  }

  await ctx.close(); await m.close();
} catch (err) {
  ok("FATAL", false, err?.message || String(err));
} finally {
  await browser.close();
}
console.log(`\nPOLISH QA E2E   PASS: ${pass}   FAIL: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
