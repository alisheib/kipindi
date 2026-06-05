/**
 * Sprint 17 — banners, popups, modes test.
 *
 * Verifies every overlay / banner / modal / popup renders correctly in the
 * states it should (and does NOT render when it shouldn't).
 *
 *   BASE=http://localhost:3000  node scripts/banners-popups-test.mjs
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

// ============================================================
// SECTION 1 — Demo banner
// ============================================================
console.log("\n=== 1 · DEMO BANNER ===");
{
  // 1a: Demo banner visible when in demo mode
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const body = (await p.locator("body").textContent()) ?? "";
  log("1a demo banner shows in demo mode", /DEMO MODE/i.test(body) || /sandbox account/i.test(body));
  await p.close();
  await ctx.close();
}
{
  // 1b: Demo banner NOT visible in unauthed mode
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const body = (await p.locator("body").textContent()) ?? "";
  log("1b demo banner NOT shown when unauthed", !/DEMO MODE/i.test(body));
  await p.close();
  await ctx.close();
}

// ============================================================
// SECTION 2 — Confidential band (admin only)
// ============================================================
console.log("\n=== 2 · CONFIDENTIAL BAND ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  const body = (await p.locator("body").textContent()) ?? "";
  log("2a confidential band on admin page", /STAFF\s*·\s*CONFIDENTIAL/i.test(body));
  await p.close();

  // Not on player pages
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  const body2 = (await p2.locator("body").textContent()) ?? "";
  log("2b confidential band NOT on player pages", !/STAFF\s*·\s*CONFIDENTIAL/i.test(body2));
  await p2.close();
  await ctx.close();
}

// ============================================================
// SECTION 3 — Notifications panel
// ============================================================
console.log("\n=== 3 · NOTIFICATIONS PANEL ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  // Bell button has aria-label starting "Notifications"
  const bell = p.locator('button[aria-label^="Notifications"]').first();
  log("3a bell button visible", await bell.isVisible());

  // Click → panel opens
  await bell.click().catch(() => {});
  await p.waitForTimeout(400);
  const dialog = p.locator('[role="dialog"][aria-label="Notifications"]').first();
  log("3b notifications dialog opens on click", await dialog.isVisible());

  // Press Escape → panel closes
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  log("3c notifications dialog closes on Escape", !(await dialog.isVisible().catch(() => false)));

  await p.close();
  await ctx.close();
}

// ============================================================
// SECTION 4 — BetSlip success state
// ============================================================
console.log("\n=== 4 · BET-SLIP SUCCESS ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/match/m1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  const placeBtn = p.locator('button').filter({ hasText: /^Place bet ·/ }).first();
  if (await placeBtn.isVisible().catch(() => false)) await placeBtn.click().catch(() => {});
  await p.waitForTimeout(2_500);
  const body = (await p.locator("body").textContent()) ?? "";
  log("4a bet-placed success card visible", /Bet placed|Dau limewekwa/i.test(body));
  log("4b 'Place another' button rendered", /Place another|Weka tena/i.test(body));
  log("4c 'View my bets' link rendered", /View my bets/i.test(body));
  await p.close();
  await ctx.close();
}

// ============================================================
// SECTION 5 — Toast notification
// ============================================================
console.log("\n=== 5 · TOAST ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/match/m1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  const placeBtn = p.locator('button').filter({ hasText: /^Place bet ·/ }).first();
  if (await placeBtn.isVisible().catch(() => false)) await placeBtn.click().catch(() => {});
  // Toast fires immediately after place
  await p.waitForTimeout(800);
  const toast = p.locator('[role="status"]').first();
  log("5a toast appears after bet place", await toast.isVisible().catch(() => false));
  await p.close();
  await ctx.close();
}

// ============================================================
// SECTION 6 — Win celebration (Mapigo)
// ============================================================
console.log("\n=== 6 · WIN CELEBRATION ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.request.get(`${BASE}/auth/demo-mapigo-reset`).catch(() => {});
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/mapigo`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  const sp = p.locator('button[aria-pressed]').filter({ hasText: /Spike/i }).first();
  await sp.click().catch(() => {});
  await p.waitForTimeout(250);
  const pl = p.locator('button').filter({ hasText: /^Place SPIKE/ }).first();
  if (await pl.isVisible().catch(() => false)) await pl.click().catch(() => {});
  await p.waitForTimeout(2_500);
  const settle = p.locator('button').filter({ hasText: /^SPIKE wins$/ }).first();
  if (await settle.isVisible().catch(() => false)) await settle.click().catch(() => {});
  await p.waitForTimeout(1_500);
  const body = (await p.locator("body").textContent()) ?? "";
  log("6a win celebration overlay shows after Mapigo win", /You won|Umeshinda/i.test(body));
  await p.close();
  await ctx.close();
}

// ============================================================
// SECTION 7 — Reality-check banner (configurable interval)
// ============================================================
console.log("\n=== 7 · REALITY CHECK ===");
{
  // The reality check fires after `intervalMin` minutes. To test we manipulate
  // sessionStorage's lastPromptAt to force-fire on next render.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  // Force trigger by setting lastPromptAt to 1 hour ago + sessionStartAt to 1h ago
  await p.evaluate(() => {
    sessionStorage.setItem("kp_session_started_at", String(Date.now() - 60 * 60_000));
    sessionStorage.setItem("kp_reality_check_last", String(Date.now() - 60 * 60_000));
  });
  // Reload to remount with the manipulated state
  await p.reload({ waitUntil: "networkidle" });
  await p.waitForTimeout(1_500); // allow tick interval (30s) — maybe shorter window check
  // Look for the dialog by id
  const dialog = p.locator('[role="dialog"][aria-labelledby="reality-check-title"]').first();
  const fired = await dialog.isVisible().catch(() => false);
  log("7a reality-check fires after configured interval", fired);
  if (fired) {
    // Continue button dismisses
    const cont = p.locator('button').filter({ hasText: /Continue playing/i }).first();
    await cont.click().catch(() => {});
    await p.waitForTimeout(400);
    const stillVisible = await dialog.isVisible().catch(() => false);
    log("7b reality-check dismisses on Continue click", !stillVisible);
  } else {
    log("7b reality-check dismiss flow", false, "could not trigger");
  }
  await p.close();
  await ctx.close();
}

// ============================================================
// SECTION 8 — Cross-page win toast (sessionStorage)
// ============================================================
console.log("\n=== 8 · CROSS-PAGE WIN TOAST ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  // Manually queue a win toast via sessionStorage
  await p.evaluate(() => {
    sessionStorage.setItem(
      "kp_pending_win_toast",
      JSON.stringify({ title: "You won!", amount: 5000, label: "Test", ts: Date.now() }),
    );
  });
  // Navigate to a fresh page → the host effect should fire toast
  await p.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  const body = (await p.locator("body").textContent()) ?? "";
  log("8a queued win toast fires on next page load", /You won/.test(body));
  await p.close();
  await ctx.close();
}

// ============================================================
// SECTION 9 — Theme toggle works
// ============================================================
console.log("\n=== 9 · THEME TOGGLE ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  const themeBtn = p.locator('button[aria-label^="Theme:"]').first();
  log("9a theme toggle button visible", await themeBtn.isVisible());
  // Click → cycles through themes
  await themeBtn.click().catch(() => {});
  await p.waitForTimeout(400);
  const cls1 = await p.evaluate(() => document.documentElement.className);
  await themeBtn.click().catch(() => {});
  await p.waitForTimeout(400);
  const cls2 = await p.evaluate(() => document.documentElement.className);
  log("9b theme toggle changes html class", cls1 !== cls2, `${cls1} → ${cls2}`);
  await p.close();
  await ctx.close();
}

// ============================================================
// SECTION 10 — Language dropdown
// ============================================================
console.log("\n=== 10 · LANGUAGE DROPDOWN ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  const langBtn = p.locator('button[aria-label^="Language:"]').first();
  log("10a language dropdown button visible", await langBtn.isVisible());
  await langBtn.click().catch(() => {});
  await p.waitForTimeout(300);
  const menu = p.locator('div[role="menu"][aria-label="Language"]').first();
  log("10b dropdown opens with menu role", await menu.isVisible().catch(() => false));
  // Pick French
  const fr = p.locator('button[role="menuitem"]').filter({ hasText: /Français/ }).first();
  await fr.click().catch(() => {});
  await p.waitForTimeout(400);
  const lang = await p.evaluate(() => document.documentElement.lang);
  log("10c selecting French sets <html lang=fr>", lang === "fr", `lang=${lang}`);
  await p.close();
  await ctx.close();
}

// ============================================================
// SECTION 11 — Empty states render properly
// ============================================================
console.log("\n=== 11 · EMPTY STATES ===");
{
  const ctx = await browser.newContext();
  // Unauthed user visiting /bets sees mock bets (NOT empty); but /admin/aml typically empty.
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/admin/aml`, { waitUntil: "networkidle" });
  const body = (await p.locator("body").textContent()) ?? "";
  log("11a /admin/aml empty state visible when no transactions", /No transactions awaiting review|empty/i.test(body) || /\d+ pending/.test(body));
  await p.close();
  await ctx.close();
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nBANNERS-POPUPS  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
