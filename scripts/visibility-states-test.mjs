/**
 * VISIBILITY · auth-state matrix
 *
 * Verifies that every element that depends on auth state shows or
 * hides correctly across the three actors:
 *
 *   · PUBLIC      — no session cookie
 *   · PLAYER      — registered player, role=PLAYER
 *   · ADMIN       — registered + promoted via /api/dev-test/promote-admin
 *
 * Covered surfaces:
 *   1. Top app bar:
 *        - Sign in pill         visible to public only
 *        - Sign up pill         visible to public only
 *        - Avatar menu          visible to player + admin
 *        - Wallet pill          visible to authed
 *        - Notifications bell   visible to all
 *        - Nav: Markets/Live/Top    visible to all
 *        - Nav: Positions/Wallet    visible to authed only
 *   2. Bottom nav (mobile):
 *        - Sign in tile         public only
 *        - Positions/Profile    authed only
 *   3. Landing hero CTAs:
 *        - Create account / Sign in           public only
 *        - Browse markets / My positions      authed only
 *   4. Market detail (/markets/<id>):
 *        - ConvictionDial (slide-to-commit)   authed only
 *        - "Sign in to predict" card          public only
 *   5. Profile page:
 *        - ADMIN pill (gold)    admin only
 *        - Player pill           non-admin authed only
 *        - Sign-out CTA in avatar menu (authed)
 *
 *   BASE=http://localhost:3000  node scripts/visibility-states-test.mjs
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
  await p.waitForTimeout(700);
  await p.close();
}

async function login(ctx, tail, password) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="password"]', password);
  await Promise.all([
    p.waitForURL(u => !/auth\/login$/.test(u.toString()), { timeout: 10_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  await p.waitForTimeout(700);
  await p.close();
}

async function visibleByText(p, text) {
  const loc = p.getByText(text, { exact: false }).first();
  return loc.isVisible({ timeout: 1500 }).catch(() => false);
}
async function visibleByLabel(p, ariaLabelPrefix) {
  const loc = p.locator(`[aria-label^="${ariaLabelPrefix}"]`).first();
  return loc.isVisible({ timeout: 1500 }).catch(() => false);
}
async function visibleBySelector(p, sel) {
  const loc = p.locator(sel).first();
  return loc.isVisible({ timeout: 1500 }).catch(() => false);
}

const browser = await chromium.launch();
try {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});

  // ─────────────────────────────────────────────────────────────
  // PUBLIC actor
  // ─────────────────────────────────────────────────────────────
  console.log("\n=== PUBLIC actor ===");
  const pubDesktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pubMobile  = await browser.newContext({ viewport: { width: 393, height: 800 } });

  // Top app bar (desktop)
  {
    const p = await pubDesktop.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    log("pub · top-bar Sign in pill visible",  await p.locator('a[href="/auth/login"][aria-label="Sign in"]').first().isVisible({ timeout: 1500 }).catch(() => false));
    log("pub · top-bar Sign up pill visible",  await p.locator('a[href="/auth/register"][aria-label="Create account"]').first().isVisible({ timeout: 1500 }).catch(() => false));
    log("pub · top-bar avatar HIDDEN",         !(await p.locator('button[aria-label="Account menu"]').first().isVisible({ timeout: 1000 }).catch(() => false)));
    log("pub · top-bar wallet pill HIDDEN",    !(await p.locator('a[aria-label^="Wallet · TZS"]').first().isVisible({ timeout: 1000 }).catch(() => false)));
    log("pub · top-bar notifications visible", await visibleByLabel(p, "Notifications"));
    const headerLinks = await p.locator("header nav a").allInnerTexts().catch(() => []);
    const t = headerLinks.join(" | ");
    log("pub · top-bar nav HIDES Wallet",      !/wallet|pochi/i.test(t), t.slice(0, 80));
    log("pub · top-bar nav HIDES Positions",   !/positions|madau/i.test(t), t.slice(0, 80));
    log("pub · top-bar nav SHOWS Markets",     /markets/i.test(t), t.slice(0, 80));
    await p.close();
  }

  // Bottom nav (mobile)
  {
    const p = await pubMobile.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const bottomText = await p.locator('nav[aria-label="Primary"]').last().innerText().catch(() => "");
    log("pub · bottom-nav HIDES Positions", !/positions/i.test(bottomText), bottomText.replace(/\s+/g, " ").slice(0, 80));
    log("pub · bottom-nav HIDES Profile",   !/profile/i.test(bottomText), bottomText.replace(/\s+/g, " ").slice(0, 80));
    log("pub · bottom-nav SHOWS Sign in",   /sign in/i.test(bottomText), bottomText.replace(/\s+/g, " ").slice(0, 80));
    await p.close();
  }

  // Landing hero CTAs
  {
    const p = await pubDesktop.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const main = p.locator("main");
    log("pub · hero Create-account CTA visible",  await main.locator('a[href="/auth/register"]').first().isVisible({ timeout: 1500 }).catch(() => false));
    log("pub · hero Sign-in CTA visible",         await main.locator('a[href="/auth/login"]').first().isVisible({ timeout: 1500 }).catch(() => false));
    log("pub · hero Browse-markets-first link visible", await visibleByText(p, "Browse markets first"));
    log("pub · hero \"My positions\" HIDDEN",      !(await visibleByText(p, "My positions")));
    await p.close();
  }

  // Market detail
  {
    const probe = await pubDesktop.newPage();
    await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
    const href = await probe.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
    await probe.close();
    if (href) {
      const p = await pubDesktop.newPage();
      await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
      const body = (await p.locator("body").textContent()) ?? "";
      log("pub · market-detail HIDES conviction dial", !/slide to commit/i.test(body));
      log("pub · market-detail SHOWS \"Sign in to predict\"", /sign in to predict/i.test(body));
      await p.close();
    } else {
      log("pub · market-detail probe — no market href", false);
    }
  }

  // Protected routes 307 to /auth/login
  for (const route of ["/wallet", "/positions", "/profile", "/admin"]) {
    const r = await pubDesktop.request.get(`${BASE}${route}`, { maxRedirects: 0 });
    const blocked = r.status() === 307 || r.status() === 308;
    const loc = r.headers().location ?? "";
    log(`pub · ${route} returns 307 → /auth/login`,
      blocked && /\/auth\/login/.test(loc),
      `status ${r.status()} loc ${loc.slice(0, 60)}`);
  }

  await pubDesktop.close();
  await pubMobile.close();

  // ─────────────────────────────────────────────────────────────
  // PLAYER actor
  // ─────────────────────────────────────────────────────────────
  console.log("\n=== PLAYER actor ===");
  const playerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const playerTail = phoneTail(1);
  const playerPwd = "VisibilityTest!2026";
  await reg(playerCtx, playerTail, playerPwd);

  {
    const p = await playerCtx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    log("player · top-bar avatar visible",          await p.locator('button[aria-label="Account menu"]').first().isVisible({ timeout: 1500 }).catch(() => false));
    log("player · top-bar Sign-in pill HIDDEN",     !(await p.locator('a[href="/auth/login"][aria-label="Sign in"]').first().isVisible({ timeout: 1000 }).catch(() => false)));
    log("player · top-bar Sign-up pill HIDDEN",     !(await p.locator('a[href="/auth/register"][aria-label="Create account"]').first().isVisible({ timeout: 1000 }).catch(() => false)));
    log("player · top-bar wallet pill visible",     await p.locator('a[aria-label^="Wallet · TZS"]').first().isVisible({ timeout: 1500 }).catch(() => false));
    log("player · top-bar notifications visible",   await visibleByLabel(p, "Notifications"));
    const headerLinks = await p.locator("header nav a").allInnerTexts().catch(() => []);
    const t = headerLinks.join(" | ");
    log("player · top-bar nav SHOWS Wallet",        /wallet|pochi/i.test(t), t.slice(0, 80));
    log("player · top-bar nav SHOWS Positions",     /positions|madau/i.test(t), t.slice(0, 80));
    await p.close();
  }

  // Landing hero CTAs for authed
  {
    const p = await playerCtx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    log("player · hero \"Browse markets\" CTA visible",       await visibleByText(p, "Browse markets"));
    log("player · hero \"My positions\" CTA visible",         await visibleByText(p, "My positions"));
    const main = p.locator("main");
    log("player · hero Create-account CTA HIDDEN",            !(await main.locator('a[href="/auth/register"]').first().isVisible({ timeout: 1000 }).catch(() => false)));
    log("player · hero Sign-in CTA HIDDEN",                   !(await main.locator('a[href="/auth/login"]').first().isVisible({ timeout: 1000 }).catch(() => false)));
    await p.close();
  }

  // Market detail
  {
    const probe = await playerCtx.newPage();
    await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
    const href = await probe.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
    await probe.close();
    if (href) {
      const p = await playerCtx.newPage();
      await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
      const body = (await p.locator("body").textContent()) ?? "";
      log("player · market-detail SHOWS conviction dial",       /slide to commit/i.test(body));
      log("player · market-detail HIDES \"Sign in to predict\"", !/sign in to predict/i.test(body));
      await p.close();
    } else {
      log("player · market-detail probe — no market href", false);
    }
  }

  // Profile pill
  {
    const p = await playerCtx.newPage();
    await p.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const body = (await p.locator("body").textContent()) ?? "";
    log("player · profile HIDES ADMIN pill",      !/ADMIN\s*·\s*Msimamizi/i.test(body));
    log("player · profile SHOWS Player pill",     /Player\s*·\s*Mtabiri/.test(body));
    await p.close();
  }

  // Avatar menu opens + Sign out present
  {
    const p = await playerCtx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    await p.locator('button[aria-label="Account menu"]').first().click();
    await p.waitForTimeout(400);
    log("player · avatar menu opens",          await p.locator('[role="menu"]').first().isVisible({ timeout: 1500 }).catch(() => false));
    log("player · avatar menu has Sign out",   await visibleByText(p, "Sign out"));
    log("player · avatar menu has Profile",    await visibleByText(p, "Profile"));
    log("player · avatar menu has Wallet",     await visibleByText(p, "Wallet"));
    await p.close();
  }

  await playerCtx.close();

  // ─────────────────────────────────────────────────────────────
  // ADMIN actor
  // ─────────────────────────────────────────────────────────────
  console.log("\n=== ADMIN actor ===");
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminTail = phoneTail(2);
  const adminPwd = "VisibilityTest!2026";
  await reg(adminCtx, adminTail, adminPwd);
  await fetch(`${BASE}/api/dev-test/promote-admin`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + adminTail }),
  }).catch(() => null);
  await login(adminCtx, adminTail, adminPwd);

  {
    const p = await adminCtx.newPage();
    await p.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
    await p.waitForTimeout(400);
    const body = (await p.locator("body").textContent()) ?? "";
    log("admin · profile SHOWS ADMIN pill",       /ADMIN\s*·\s*Msimamizi/i.test(body));
    log("admin · profile HIDES Player pill",       !/Player\s*·\s*Mtabiri/.test(body));
    await p.close();
  }

  // Admin can reach /admin
  {
    const p = await adminCtx.newPage();
    const r = await p.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    log("admin · /admin returns 200", (r?.status() ?? 0) === 200, `status ${r?.status()}`);
    const periodPills = await p.locator('a[href*="range="], a[href$="/admin"]').count();
    log("admin · period picker has clickable segments", periodPills >= 3, `${periodPills} segments`);
    await p.close();
  }

  await adminCtx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nVISIBILITY  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
if (fail > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log("  · " + f);
}
process.exit(fail > 0 ? 1 : 0);
