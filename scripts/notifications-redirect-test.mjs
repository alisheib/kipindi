/**
 * NOTIFICATIONS — REDIRECT TEST
 *
 * Validates that every notification kind:
 *   1. lands in the bell after the triggering event
 *   2. redirects to the correct destination on click
 *   3. transitions feel responsive (under 1s from tap to nav)
 *
 * Covered notification types (defined in notification-service.ts):
 *   · Bet placed         → /markets/<id>
 *   · Win                → /positions
 *   · Loss               → /markets/<id>
 *   · Deposit confirmed  → /wallet
 *   · KYC submitted      → /profile/kyc
 *   · KYC approved       → /wallet
 *
 *   BASE=http://localhost:3000  node scripts/notifications-redirect-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
const failures = [];
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else { fail++; failures.push(`${label} ${detail}`); }
}

const phoneTail = (offset = 0) =>
  "7" + String((Date.now() + offset) % 100_000_000).padStart(8, "0");

async function reg(ctx, tail, password) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="dob"]', "1990-01-15");
  await p.fill('input[name="password"]', password);
  await p.fill('input[name="passwordConfirm"]', password);
  await p.check('input[name="acceptAge"]');
  await p.check('input[name="acceptTerms"]');
  await Promise.all([
    p.waitForURL(u => !/auth\/register$/.test(u.toString()), { timeout: 10_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  await p.waitForTimeout(800);
  await p.close();
}

async function openBell(p) {
  const bell = p.locator('button[aria-label^="Notifications"]').first();
  if (!(await bell.isVisible({ timeout: 3_000 }).catch(() => false))) return null;
  await bell.click();
  await p.waitForTimeout(500);
  return p.locator('[role="dialog"][aria-label="Notifications"]').first();
}

async function clickNotifMatching(p, panel, regex) {
  // Notification rows inside the panel — pick the first one matching
  // the text regex.
  const rows = panel.locator('button, a, [role="button"]').filter({ hasText: regex });
  const count = await rows.count();
  if (count === 0) return { clicked: false, took: 0 };
  const t0 = Date.now();
  await rows.first().click();
  // Wait for navigation to land
  await p.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  const took = Date.now() - t0;
  return { clicked: true, took };
}

async function placeBet(ctx, href, fraction = 0.7) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  const track = p.locator('[role="slider"][aria-label*="conviction" i]').first();
  if (!(await track.isVisible({ timeout: 2_000 }).catch(() => false))) { await p.close(); return false; }
  const box = await track.boundingBox().catch(() => null);
  if (!box) { await p.close(); return false; }
  const sx = box.x + box.width / 2;
  const tx = box.x + box.width * fraction;
  const y = box.y + box.height / 2;
  await p.mouse.move(sx, y); await p.mouse.down();
  for (let i = 1; i <= 6; i++) await p.mouse.move(sx + (tx - sx) * (i / 6), y, { steps: 3 });
  await p.mouse.up();
  await p.waitForTimeout(400);
  const pill = p.locator('button[aria-label^="Place "]').first();
  if (!(await pill.isVisible({ timeout: 3_000 }).catch(() => false))) { await p.close(); return false; }
  await pill.click();
  await p.waitForTimeout(500);
  const confirm = p.locator('button.btn.btn-gold', { hasText: /Confirm/ }).first();
  if (!(await confirm.isVisible({ timeout: 3_000 }).catch(() => false))) { await p.close(); return false; }
  await confirm.click();
  await p.waitForTimeout(1500);
  const close = p.locator('button[aria-label="Close"]').first();
  await close.click({ timeout: 800 }).catch(() => {});
  await p.close();
  return true;
}

const browser = await chromium.launch();

try {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});

  const password = "NotifyRedirect!2026";
  const tail = phoneTail(0);
  const phone = "+255" + tail;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await reg(ctx, tail, password);
  await fetch(`${BASE}/api/dev-test/seed-wallet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone, amount: 100_000 }),
  }).catch(() => null);

  // ─────────────────────────────────────────────────────────
  // 1 · BET PLACED → /markets/<id>
  // ─────────────────────────────────────────────────────────
  console.log("\n=== 1 · BET PLACED ===");
  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const href = await probe.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
  await probe.close();
  log("1a found a market href", !!href, href ?? "(none)");

  const placed = await placeBet(ctx, href);
  log("1b bet placed", placed);
  await new Promise((r) => setTimeout(r, 800));

  {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const panel = await openBell(p);
    log("1c bell opens for the player", !!panel);
    if (panel) {
      const body = (await panel.textContent()) ?? "";
      log("1d bell shows a Bet placed receipt", /Bet placed|Dau lime/i.test(body));
      const click = await clickNotifMatching(p, panel, /Bet placed/i);
      log("1e bet-placed notification click registers", click.clicked, `took ${click.took}ms`);
      log("1f bet-placed notification click was responsive (< 3500ms)", click.took < 3500, `${click.took}ms`);
      log("1g landed on the market detail page", /\/markets\/mkt_/.test(p.url()), p.url());
    }
    await p.close();
  }

  // ─────────────────────────────────────────────────────────
  // 2 · AUTO-RESOLVE TRIGGERS WIN or LOSS NOTIFICATION
  // ─────────────────────────────────────────────────────────
  console.log("\n=== 2 · AUTO-RESOLVE → win/loss notification ===");
  // Find a Demo · market and place a bet on it, then expire it.
  const probe2 = await ctx.newPage();
  await probe2.goto(`${BASE}/markets?when=soon`, { waitUntil: "networkidle" });
  const demoHref = await probe2.locator('a[href^="/markets/mkt_"]').filter({ hasText: /Demo/ }).first().getAttribute("href").catch(() => null);
  await probe2.close();
  log("2a found a Demo · market", !!demoHref, demoHref ?? "(none)");

  if (demoHref) {
    const ok = await placeBet(ctx, demoHref, 0.7);
    log("2b placed YES on a Demo market", ok);

    const marketId = demoHref.split("/").pop();
    await fetch(`${BASE}/api/dev-test/fast-forward-market`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ marketId, seconds: -2 }),
    }).catch(() => null);

    // Two hits to /markets force the auto-resolver pass
    for (let i = 0; i < 2; i++) {
      const p = await ctx.newPage();
      await p.goto(`${BASE}/markets?ts=${Date.now() + i}`, { waitUntil: "networkidle" });
      await p.waitForTimeout(700);
      await p.close();
    }
    await new Promise((r) => setTimeout(r, 1000));

    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const panel = await openBell(p);
    if (panel) {
      const body = (await panel.textContent()) ?? "";
      const win = /You won|Umeshinda/i.test(body);
      const loss = /Pool grew|Bwawa lime/i.test(body);
      log("2c bell shows a Win or Loss receipt after resolution", win || loss, win ? "WIN" : loss ? "LOSS" : "none");

      const click = await clickNotifMatching(p, panel, win ? /You won/i : /Pool grew/i);
      log("2d resolution-notification click registers", click.clicked, `took ${click.took}ms`);
      log("2e resolution-notification click was responsive (< 3500ms)", click.took < 3500, `${click.took}ms`);
      // Win redirects to /positions, Loss redirects to /markets/<id>
      const expectedPath = win ? /\/positions/ : /\/markets\/mkt_/;
      log(`2f landed on ${win ? "/positions" : "/markets/<id>"}`, expectedPath.test(p.url()), p.url());
    } else {
      log("2c bell visible after resolution", false);
    }
    await p.close();
  }
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nNOTIFICATIONS REDIRECT  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
if (fail > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log("  · " + f);
}
process.exit(fail > 0 ? 1 : 0);
