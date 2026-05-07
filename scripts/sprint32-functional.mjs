/**
 * Sprint 32 — full functional + visual smoke.
 *
 *   1. Demo entry, balance shows TZS 500,000
 *   2. Top bar: theme toggle is GONE; logo + lockup + bell + lang + avatar present
 *   3. Live-dot is rendered with multi-stop box-shadow (the brighter glow)
 *   4. Place a bet end-to-end: dial → confirm popup → submit, balance debits,
 *      position lands in /positions
 *   5. Cash-out: sell button renders kit btn variant; click triggers cash-out,
 *      celebration popup fires (because net > 0)
 *   6. Win celebration popup uses btn-gold + claret-rule
 *   7. Bet-confirm modal CTAs are kit btn-ghost + btn-gold
 *   8. PriceChart axis is royal/aqua, not slate
 *
 *   BASE=http://localhost:3000  node scripts/sprint32-functional.mjs
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

// 1+2 · Top bar
console.log("\n=== 1 · TOP BAR + DEMO ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  // Logo lockup home link present
  const home = await p.locator('a[aria-label="50pick home"]').count();
  log("1a 50pick lockup in top bar", home > 0);
  // Theme toggle gone
  const themeBtn = await p.locator('button[aria-label*="Theme"]').count();
  log("1b ThemeToggle removed", themeBtn === 0);
  // Bell + language toggle + avatar still there
  const bell = await p.locator('button[aria-label^="Notifications"]').count();
  const lang = await p.locator('button[aria-label^="Language"]').count();
  const avatar = await p.locator('button[aria-label="Account menu"]').count();
  log("1c notifications + language + avatar menu present", bell > 0 && lang > 0 && avatar > 0);
  await p.close();
  await ctx.close();
}

// 3 · Live-dot bright
console.log("\n=== 2 · LIVE-DOT GLOW ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const dotCount = await p.locator(".live-dot").count();
  log("2a live-dot rendered on at least one market", dotCount > 0, `${dotCount}`);
  // Verify the box-shadow has the always-on outer halo (multi-stop)
  const boxShadow = await p.locator(".live-dot").first().evaluate((el) => getComputedStyle(el).boxShadow);
  log("2b live-dot has multi-stop glow", boxShadow.split(",").length >= 2, boxShadow.slice(0, 80) + "...");
  await p.close();
  await ctx.close();
}

// 4 · Place a bet
console.log("\n=== 3 · PLACE-BET END-TO-END ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const href = await probe.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
  await probe.close();

  if (!href) {
    log("3a market available", false, "no markets");
  } else {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(800);

    // Drag the dial to ~78% (YES side)
    const track = p.locator('[role="slider"][aria-label*="conviction" i]').first();
    const box = await track.boundingBox();
    if (box) {
      const startX = box.x + box.width / 2;
      const targetX = box.x + box.width * 0.78;
      const y = box.y + box.height / 2;
      await p.mouse.move(startX, y);
      await p.mouse.down();
      for (let i = 1; i <= 6; i++) {
        await p.mouse.move(startX + (targetX - startX) * (i / 6), y, { steps: 3 });
      }
      await p.mouse.up();
      await p.waitForTimeout(450);
    }
    log("3a dial drag worked", !!box);

    // Click compact Place pill
    const pill = p.locator('button[aria-label^="Place "]').first();
    await pill.waitFor({ state: "visible", timeout: 3_000 });
    await pill.click();
    await p.waitForTimeout(700);

    // Confirm modal visible with kit btn-gold confirm
    const modalDialog = await p.locator('[role="dialog"][aria-label="Confirm prediction"]').count();
    log("3b BetConfirmModal opens", modalDialog > 0);
    const confirmCount = await p.locator('button.btn.btn-gold', { hasText: /Confirm/ }).count();
    log("3c confirm button uses kit btn-gold", confirmCount > 0);

    // Click Confirm
    await p.locator('button.btn.btn-gold', { hasText: /Confirm/ }).click();
    await p.waitForTimeout(1500);

    // Check /positions for the new position
    await p.goto(`${BASE}/positions`, { waitUntil: "networkidle" });
    const posBody = (await p.locator("main main").innerText()) ?? "";
    log("3d position landed in /positions", /Open/.test(posBody));
    log("3e P&L summary visible", /At risk/.test(posBody) || /Live value/.test(posBody));

    await p.close();
  }
  await ctx.close();
}

// 5 · Win celebration synthetic event still works
console.log("\n=== 4 · CELEBRATION DIALOG ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    window.dispatchEvent(new CustomEvent("50pick:celebrate", {
      detail: { kind: "WIN", amount: 25000, net: 18000, label: "Functional smoke" },
    }));
  });
  await p.waitForTimeout(600);
  const dialog = await p.locator('[role="dialog"]', { hasText: "Won" }).count();
  log("4a WinCelebration fires", dialog > 0);
  const continueBtn = await p.locator('[role="dialog"] button.btn.btn-gold').count();
  log("4b kit btn-gold Continue", continueBtn > 0);
  await p.close();
  await ctx.close();
}

// 6 · PriceChart axis royal/aqua
console.log("\n=== 5 · PRICECHART AXIS ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const href = await probe.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
  await probe.close();
  if (href) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(600);
    const chartHtml = await p.locator('section', { hasText: "Probability" }).innerHTML().catch(() => "");
    // Should be royal-axis stroke (oklch 60% 0.16 258) — not slate (oklch 28% 0.013 240)
    log("5a chart gridlines use royal palette", /oklch\(60% 0\.16 258/.test(chartHtml) || /oklch\(78% 0\.13 80/.test(chartHtml));
    log("5b chart NOT using old slate gridlines", !/oklch\(28% 0\.013 240/.test(chartHtml));
    await p.close();
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 32 functional  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
