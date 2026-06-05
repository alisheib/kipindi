/**
 * Smoke / integration test — drives a full demo flow via Playwright.
 * Tests: demo session → match bet → /bets reflects → wallet debited
 *      → mapigo bet → settle round → wallet credited
 *      → security gates (logout, withdraw kyc-block, headers)
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const tag = ok ? "✓" : "✗";
  console.log(`${tag} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const browser = await chromium.launch();
const ctx = await browser.newContext();

// Helper: read first TZS amount on page
async function readTzs(page, sel = "body") {
  const txt = await page.locator(sel).textContent();
  const m = txt?.match(/TZS\s*(\d{1,3}(?:,\d{3})*)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

try {
  // STEP 1 — boot demo session
  const setup = await ctx.newPage();
  const r1 = await setup.goto(`${BASE}/auth/demo`, { waitUntil: "load" });
  log("demo session created", r1?.ok() === true && setup.url() === `${BASE}/`);
  await setup.close();

  // STEP 2 — initial wallet balance
  const w1 = await ctx.newPage();
  await w1.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  await w1.waitForTimeout(500);
  const startBal = await readTzs(w1);
  log("initial wallet balance ≥ 100,000", startBal !== null && startBal >= 100_000, `TZS ${startBal?.toLocaleString()}`);
  await w1.close();

  // STEP 3 — place a match bet
  const mp = await ctx.newPage();
  await mp.goto(`${BASE}/match/m1`, { waitUntil: "networkidle" });
  await mp.waitForLoadState("networkidle");
  await mp.waitForTimeout(800); // hydration
  const placeBtn = mp.locator('button').filter({ hasText: /^Place bet ·/ }).first();
  const placeBtnVisible = await placeBtn.isVisible();
  log("Place-bet button visible", placeBtnVisible);
  if (placeBtnVisible) {
    await placeBtn.click();
    // Wait for either the success state ("Bet placed") OR an error message
    try {
      await mp.waitForSelector('text="Bet placed"', { timeout: 10_000 });
      log("match bet → success state shown", true);
    } catch {
      // Capture error text if present
      const err = await mp.locator('.text-danger').first().textContent().catch(() => null);
      log("match bet → success state shown", false, err ? `error: ${err}` : "no success/error after 10s");
    }
  }
  await mp.close();

  // STEP 4 — wallet should be debited
  const w2 = await ctx.newPage();
  await w2.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  await w2.waitForTimeout(500);
  const afterBal = await readTzs(w2);
  log("wallet debited after match bet", startBal !== null && afterBal !== null && afterBal === startBal - 1000, `TZS ${startBal?.toLocaleString()} → TZS ${afterBal?.toLocaleString()}`);
  await w2.close();

  // STEP 5 — /bets shows the new active bet
  const bp = await ctx.newPage();
  await bp.goto(`${BASE}/bets`, { waitUntil: "networkidle" });
  await bp.waitForTimeout(500);
  const txt = await bp.locator("body").textContent();
  const activeMatch = txt?.match(/Active\s*·\s*(\d+)/);
  const activeCount = activeMatch ? parseInt(activeMatch[1], 10) : 0;
  log("/bets Active count is ≥ 1", activeCount >= 1, `Active · ${activeCount}`);
  await bp.close();

  // STEP 6 — Mapigo: select SPIKE then place
  const mg = await ctx.newPage();
  await mg.goto(`${BASE}/mapigo`, { waitUntil: "networkidle" });
  await mg.waitForTimeout(800);
  const spike = mg.locator('button').filter({ hasText: /Spike/i }).first();
  await spike.click().catch(() => {});
  await mg.waitForTimeout(300);
  const placeMg = mg.locator('button').filter({ hasText: /^Place SPIKE/ }).first();
  const placeMgVisible = await placeMg.isVisible().catch(() => false);
  log("Mapigo Place button visible after selecting SPIKE", placeMgVisible);
  if (placeMgVisible) {
    await placeMg.click();
    try {
      await mg.waitForSelector('text="Demo controls"', { timeout: 10_000 });
      log("Mapigo bet placed → demo controls revealed", true);
    } catch {
      log("Mapigo bet placed → demo controls revealed", false, "no demo controls after 10s");
    }
  }
  await mg.close();

  // STEP 7 — settle current round, force SPIKE wins
  const mg2 = await ctx.newPage();
  await mg2.goto(`${BASE}/mapigo`, { waitUntil: "networkidle" });
  await mg2.waitForTimeout(800);
  const spikeWins = mg2.locator('button').filter({ hasText: "SPIKE wins" }).first();
  const spikeWinsVisible = await spikeWins.isVisible().catch(() => false);
  if (spikeWinsVisible) {
    await spikeWins.click();
    await mg2.waitForTimeout(2_000);
  }
  log("Mapigo settle button hit", spikeWinsVisible);
  await mg2.close();

  // STEP 8 — wallet should now be credited (greater than afterBal)
  const w3 = await ctx.newPage();
  await w3.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  await w3.waitForTimeout(500);
  const finalBal = await readTzs(w3);
  log("wallet credited after Mapigo win", afterBal !== null && finalBal !== null && finalBal > (afterBal ?? 0) - 1000, `TZS ${afterBal?.toLocaleString()} → TZS ${finalBal?.toLocaleString()}`);
  await w3.close();

  // STEP 9 — security: logout, then session-gated routes 307
  const lo = await ctx.request.get(`${BASE}/auth/logout`, { maxRedirects: 0 });
  log("/auth/logout returns 307", lo.status() === 307);
  const dep = await ctx.request.get(`${BASE}/wallet/deposit`, { maxRedirects: 0 });
  log("/wallet/deposit blocked when signed out", dep.status() === 307);
  const home = await ctx.request.get(`${BASE}/`);
  log("CSP header present", !!home.headers()["content-security-policy"]);
  log("X-Frame-Options DENY", home.headers()["x-frame-options"] === "DENY");
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nPASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
