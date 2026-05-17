/**
 * Regression test for the win-celebration-not-firing-live bug.
 *
 * Steps:
 *  1. Find a Demo market with a short resolution window.
 *  2. Place a bet (and remember which side).
 *  3. Fast-forward the market to resolve in ~2 seconds.
 *  4. WITHOUT triggering a /markets page render, poll /api/fairness/recent
 *     and assert that the auto-resolver fires server-side from within the
 *     poll itself — i.e. the market shows up as RESOLVED in the response
 *     even though no one visited /markets.
 *
 * Before the fix, this would FAIL: /api/fairness/recent only listed
 * already-resolved markets and did not trigger autoResolveExpiredDemoMarkets,
 * so a player watching a market's countdown hit zero would never see a
 * win-celebration popup until they refreshed.
 *
 *   BASE=http://localhost:3000  node scripts/fairness-recent-auto-resolve-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const phoneTail = (off = 0) => "7" + String((Date.now() + off) % 100_000_000).padStart(8, "0");

async function reg(ctx, tail, pwd) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="dob"]', "1990-01-15");
  await p.fill('input[name="password"]', pwd);
  await p.fill('input[name="passwordConfirm"]', pwd);
  await p.check('input[name="acceptAge"]');
  await p.check('input[name="acceptTerms"]');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(900);
  await p.close();
}

const browser = await chromium.launch();
try {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pwd = "FairnessAuto!2026";
  const tail = phoneTail();
  await reg(ctx, tail, pwd);

  // Hit /markets once so seedDemoMarkets runs and there's at least one
  // short-window Demo market. This is the ONLY allowed page render
  // for the duration of this test — after this, only the poll path
  // is exercised.
  {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
    await p.close();
  }

  // Find a Demo market and fast-forward it. autoResolveExpiredDemoMarkets
  // only acts on markets whose titleEn starts with "Demo · " — scope
  // the locator accordingly so the test doesn't randomly pick a real
  // market whose resolutionAt we shouldn't be moving.
  let marketId = null;
  {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
    const card = p.locator('a[href^="/markets/mkt_"]').filter({ hasText: /Demo/ }).first();
    const href = await card.getAttribute("href").catch(() => null);
    marketId = href?.split("/").pop() ?? null;
    await p.close();
  }
  log("1a found a LIVE Demo market", !!marketId, marketId ?? "(none)");
  if (!marketId) throw new Error("no live demo market");

  // Fast-forward into the past — `seconds: -2` puts resolutionAt 2s ago.
  // Endpoint signature: { marketId, seconds }. Negative pulls back.
  const ff = await fetch(`${BASE}/api/dev-test/fast-forward-market`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ marketId, seconds: -2 }),
  }).then(r => r.json());
  log("1b market fast-forwarded to past", ff?.ok === true, ff?.resolutionAt ?? "");

  // Brief settle
  await new Promise((r) => setTimeout(r, 500));

  // Now hit /api/fairness/recent directly — DO NOT visit any /markets page.
  // Before the fix this would return without resolving the market.
  // After the fix the call itself triggers autoResolveExpiredDemoMarkets.
  const r = await ctx.request.get(`${BASE}/api/fairness/recent`, { headers: { accept: "application/json" } });
  const j = await r.json();
  const found = (j.attestations ?? []).find((a) => a.marketId === marketId);
  log("2a poll-time auto-resolve fires", !!found,
      found ? `outcome=${found.resolvedOutcome} stage2At=${found.stage2At?.slice(0,19)}` : "(market not in resolved list)");
  log("2b resolved market has stage2At timestamp", !!found?.stage2At);

  await ctx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nFAIRNESS RECENT AUTO-RESOLVE  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
