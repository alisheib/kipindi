/**
 * Demo walkthrough — captures the end-to-end manager flow.
 * 1. Sign in via demo (cookie set)
 * 2. Open match detail
 * 3. Click Place bet, wait long enough for the success card
 * 4. Open /wallet (debited)
 * 5. Open /bets (active bet shows)
 * 6. Open /mapigo, click SPIKE, click Place
 * 7. Click "SPIKE wins" demo settle
 * 8. Re-open /wallet (credited)
 *
 * Each step takes a screenshot to docs/shots-demo-flow/
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "docs/shots-demo-flow";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 1440, height: 1024 },
});
await ctx.addInitScript(() => { try { localStorage.setItem("kp-theme", "dark"); } catch {} });

async function snap(page, label) {
  const file = `${OUT}/${label}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`✓ ${label} → ${file} (${Math.round(fs.statSync(file).size / 1024)}KB)`);
}

const page = await ctx.newPage();

// 1. Demo session
await page.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await snap(page, "01-after-demo-redirect");

// 2. Match detail
await page.goto(`${BASE}/match/m1`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await snap(page, "02-match-detail-before-bet");

// 3. Click Place bet
const placeBtn = page.locator('button').filter({ hasText: /^Place bet ·/ }).first();
await placeBtn.click();
await page.waitForTimeout(3500);
await snap(page, "03-after-place-bet-click");

// 4. /wallet
await page.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await snap(page, "04-wallet-after-bet");

// 5. /bets
await page.goto(`${BASE}/bets`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await snap(page, "05-bets-active");

// 6. Mapigo
await page.goto(`${BASE}/mapigo`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const spikeBtn = page.locator('button').filter({ hasText: /Spike/i }).first();
await spikeBtn.click();
await page.waitForTimeout(500);
await snap(page, "06-mapigo-spike-selected");

const placeMg = page.locator('button').filter({ hasText: /^Place SPIKE/ }).first();
const placeMgVisible = await placeMg.isVisible().catch(() => false);
if (placeMgVisible) await placeMg.click();
await page.waitForTimeout(3000);
await snap(page, "07-mapigo-after-place");

// 7. Settle SPIKE wins
const winBtn = page.locator('button').filter({ hasText: "SPIKE wins" }).first();
const winBtnVisible = await winBtn.isVisible().catch(() => false);
if (winBtnVisible) {
  await winBtn.click();
  await page.waitForTimeout(2500);
}
await snap(page, "08-mapigo-after-settle");

// 8. Final wallet check
await page.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await snap(page, "09-wallet-final");

// 9. Final bets
await page.goto(`${BASE}/bets`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await snap(page, "10-bets-final");

await browser.close();
console.log(`\nWalkthrough complete → ${OUT}`);
