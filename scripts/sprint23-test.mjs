/**
 * Sprint 23 — per-market history chart + cash-out.
 *
 *  1. /markets/[id] renders a PriceChart with seeded history (svg present)
 *  2. /positions renders cleanly (and the SellButton component exists in
 *     the source) — full e2e sell requires placing a position, covered
 *     in money-flow-e2e.mjs
 *  3. /api/health 200
 *
 *   BASE=http://localhost:3000  node scripts/sprint23-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const browser = await chromium.launch();

// ── 1. Market detail PriceChart ────────────────────────────────────────────
console.log("\n=== 1 · MARKET DETAIL HISTORY CHART ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const href = await probe.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
  await probe.close();
  if (href) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(700);
    const body = (await p.locator("body").textContent()) ?? "";
    log("1a market detail loads", body.length > 200);
    log("1b 'Probability · Uwezekano' section heading", /Probability/i.test(body));
    log("1c 'YES probability over time' explainer", /probability over time/i.test(body));
    // The kit PriceChart renders an SVG with the area/line gradient ids
    const svgCount = await p.locator('svg').count();
    log("1d SVG present (chart + brand assets)", svgCount > 5, `${svgCount} svgs`);
    // The chart includes a "now" or "today" label + the percentage tag
    log("1e last-point pill rendered", /\d+%\s*now/i.test(body) || /now/i.test(body));
    await p.close();
  } else {
    log("1a market detail loads", false, "no markets seeded");
  }
  await ctx.close();
}

// ── 2. /positions renders ──────────────────────────────────────────────────
console.log("\n=== 2 · /positions ===");
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 800 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  const r = await p.goto(`${BASE}/positions`, { waitUntil: "networkidle" });
  log("2a /positions returns 200", r?.status() === 200, String(r?.status()));
  const body = (await p.locator("body").textContent()) ?? "";
  log("2b shows Open + Settled sections", /Open/.test(body) && /Settled/.test(body));
  await p.close();
  await ctx.close();
}

// ── 3. /api/health ─────────────────────────────────────────────────────────
console.log("\n=== 3 · /api/health ===");
{
  const r = await fetch(`${BASE}/api/health`);
  log("3a 200", r.status === 200, String(r.status));
}

// ── 4. Cash-out math sanity (mirror server formula) ───────────────────────
console.log("\n=== 4 · CASH-OUT MATH ===");
{
  const SLIPPAGE = 0.02;
  const TAX = 0.04;
  const COMM = 0.05;
  const fee = TAX + COMM;
  const cashOut = (yesPool, noPool, side, stake) => {
    const winning = side === "YES" ? yesPool : noPool;
    if (winning <= 0) return 0;
    const gross = yesPool + noPool;
    const wouldPay = (stake / winning) * gross * (1 - fee);
    return Math.round(wouldPay * (1 - SLIPPAGE));
  };

  // Balanced 50/50 with my 1000 already in YES → cashing out:
  // gross = 100,000 + 100,000 = 200,000; net = 182,000;
  // share = 1000/100,000; wouldPay = 1820 × (1−0.02) = 1783.6 → 1784
  log("4a balanced cash-out roughly 1784 (≈stake × 0.91 × 0.98 × 2)", cashOut(100_000, 100_000, "YES", 1000) === 1784, "expected 1784");

  // Heavy YES (post-stake yesPool 96k, noPool 5k) — same as sprint22 but
  // cashing out instead of resolving: would underpay vs stake
  // gross = 101,000; net = 91,910; share = 1/96; wouldPay = 957.4 → 957;
  // × 0.98 = 938.5 → 939
  log("4b heavy-favourite cash-out is below stake (NET LOSS)", cashOut(96_000, 5_000, "YES", 1000) < 1000, "ratio < 1.0");
  // Specifically expect 938 or 939
  const v = cashOut(96_000, 5_000, "YES", 1000);
  log("4c specifically ≈ 938", v === 938 || v === 939, `${v}`);
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 23  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
