import { chromium } from "playwright";

const SHOTS = "C:\\kipindi\\50pick-logo-for-claude-design\\screenshots\\";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

await page.goto("http://localhost:3000/auth/demo", { waitUntil: "load" });
await page.waitForTimeout(800);

await page.goto("http://localhost:3000/markets", { waitUntil: "load" });
await page.waitForTimeout(700);

const firstLink = page.locator('a[href^="/markets/mkt_"]').first();
const href = await firstLink.getAttribute("href");
console.log("first market:", href);
await page.goto("http://localhost:3000" + href, { waitUntil: "load" });
await page.waitForTimeout(1500);

// TippingBar resting + hover screenshots
const bar = page.locator("[role=progressbar]").first();
if (await bar.count() > 0) {
  const box = await bar.boundingBox();
  if (box) {
    const clip = { x: Math.max(0, box.x - 4), y: Math.max(0, box.y - 8), width: box.width + 8, height: box.height + 32 };
    await page.screenshot({ path: SHOTS + "pbar-resting.png", clip });
    await bar.hover();
    await page.waitForTimeout(80);
    await page.screenshot({ path: SHOTS + "pbar-recast-mid.png", clip });
    await page.waitForTimeout(550);
    await page.screenshot({ path: SHOTS + "pbar-recast-end.png", clip });
    console.log("pbar screenshots captured");
  }
} else {
  console.log("no progressbar on this page");
}

// Drag the dial then click Place to open BetConfirmModal
const track = page.locator("[role=slider]").first();
if (await track.count() > 0) {
  const tb = await track.boundingBox();
  if (tb) {
    await page.mouse.move(tb.x + tb.width * 0.3, tb.y + tb.height / 2);
    await page.mouse.down();
    await page.mouse.move(tb.x + tb.width * 0.18, tb.y + tb.height / 2);
    await page.mouse.up();
    await page.waitForTimeout(400);
  }
  const placeBtn = page.locator('button:has-text("Place")').first();
  if (await placeBtn.count() > 0 && (await placeBtn.isVisible()) && !(await placeBtn.isDisabled())) {
    await placeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: SHOTS + "confirm-modal-corners.png",
      clip: { x: 380, y: 80, width: 540, height: 380 },
    });
    console.log("confirm modal screenshot captured");
  } else {
    console.log("place button not available");
  }
}

await browser.close();
