/**
 * Quick visual probe of Sprint 1 surfaces.
 *  - First-visit primer renders after a fresh visit
 *  - Wallet pill rolls + flashes when balance changes
 *  - Notifications panel empty state shows the new illustration
 *  - Loading skeletons exist on /live + /leaderboard + /markets/[id]
 */
import { chromium } from "playwright";

const SHOTS = "C:\\kipindi\\50pick-logo-for-claude-design\\screenshots\\s1\\";
import { mkdirSync } from "node:fs";
try { mkdirSync(SHOTS, { recursive: true }); } catch {}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// 1. Authed visit + clear primer flag so we see the overlay
await page.goto("http://localhost:3000/auth/demo", { waitUntil: "load" });
await page.waitForTimeout(800);
await page.evaluate(() => { try { localStorage.removeItem("50pick-primer-seen"); } catch {} });
await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.waitForTimeout(1400);
await page.screenshot({ path: SHOTS + "primer-card-1.png" });
console.log("primer card 1 captured");

// Advance step 2
const nextBtn = page.locator('button:has-text("Next")').first();
if (await nextBtn.count() > 0) {
  await nextBtn.click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: SHOTS + "primer-card-2.png" });
  console.log("primer card 2 captured");
  await nextBtn.click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: SHOTS + "primer-card-3.png" });
  console.log("primer card 3 captured");
}

// Dismiss + ensure flag is set so subsequent visits don't show it
const gotIt = page.locator('button:has-text("Got it")').first();
if (await gotIt.count() > 0) await gotIt.click();
await page.waitForTimeout(500);

// 2. Wallet pill before/during a bet
await page.goto("http://localhost:3000/wallet", { waitUntil: "load" });
await page.waitForTimeout(800);
const pillBefore = await page.locator('[data-testid="wallet-balance-pill"]').first().boundingBox();
if (pillBefore) {
  await page.screenshot({
    path: SHOTS + "wallet-pill-resting.png",
    clip: { x: pillBefore.x - 4, y: pillBefore.y - 8, width: pillBefore.width + 200, height: pillBefore.height + 16 },
  });
}

// Place a bet to trigger the pill flash
await page.goto("http://localhost:3000/markets", { waitUntil: "load" });
await page.waitForTimeout(700);
const mlink = page.locator('a[href^="/markets/mkt_"]').first();
const href = await mlink.getAttribute("href").catch(() => null);
if (href) {
  await page.goto("http://localhost:3000" + href, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const slider = page.locator("[role='slider']").first();
  const sb = await slider.boundingBox();
  if (sb) {
    await page.mouse.move(sb.x + sb.width * 0.3, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + sb.width * 0.2, sb.y + sb.height / 2);
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
  const place = page.locator('button:has-text("Place")').first();
  if (await place.count() > 0 && await place.isVisible() && !await place.isDisabled()) {
    await place.click();
    await page.waitForTimeout(400);
    const confirm = page.locator('button:has-text("Confirm")').first();
    if (await confirm.count() > 0) {
      await confirm.click();
      // Capture during flash
      await page.waitForTimeout(180);
      const pillBox = await page.locator('[data-testid="wallet-balance-pill"]').first().boundingBox();
      if (pillBox) {
        await page.screenshot({
          path: SHOTS + "wallet-pill-flashing.png",
          clip: { x: pillBox.x - 4, y: pillBox.y - 8, width: pillBox.width + 200, height: pillBox.height + 16 },
        });
        console.log("wallet pill flash captured");
      }
    }
  }
}

// 3. Notifications panel empty state — bell click
await page.goto("http://localhost:3000/help", { waitUntil: "load" });
await page.waitForTimeout(800);
const bell = page.locator('button[aria-label*="otification" i]').first();
if (await bell.count() > 0) {
  await bell.click();
  await page.waitForTimeout(400);
  const panel = page.locator('[role="menu"], [role="dialog"]').last();
  const pb = await panel.boundingBox().catch(() => null);
  if (pb) {
    await page.screenshot({
      path: SHOTS + "notifications-empty.png",
      clip: { x: pb.x - 4, y: pb.y - 4, width: pb.width + 8, height: pb.height + 8 },
    });
    console.log("notifications empty captured");
  }
}

await browser.close();
