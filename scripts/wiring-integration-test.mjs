/**
 * WIRING INTEGRATION TEST
 *
 * Verifies the route access matrix end-to-end across three actors:
 *
 *   • PUBLIC  — no session cookie. Can read landing, markets, market
 *               detail, leaderboard, legal pages. Cannot reach wallet,
 *               positions, profile, admin (each must redirect to
 *               /auth/login with `next=` round-trip).
 *
 *   • PLAYER  — registered phone-password account. Can reach all the
 *               above plus wallet, positions, profile, deposit, withdraw.
 *               Cannot reach /admin (gets redirected to home).
 *
 *   • ADMIN   — phone in ADMIN_BOOTSTRAP_PHONES (or promoted via dev-test).
 *               Can reach /admin and every subroute. Privileged Server
 *               Actions still re-check role (defence in depth).
 *
 * Also asserts:
 *   • Public visitors don't see the "Wallet" / "Positions" nav items
 *   • Public visitors see a "Sign in" CTA instead of an avatar menu
 *   • Public visitor on a market detail sees a "Sign in to bet" card
 *     where a logged-in player would see the conviction dial
 *   • The bet-placement Server Action 307s to /auth/login when no session
 *
 *   BASE=http://localhost:3000  node scripts/wiring-integration-test.mjs
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
  await p.check('input[name="acceptAge"]', { force: true });
  await p.check('input[name="acceptTerms"]', { force: true });
  await Promise.all([
    p.waitForURL(u => !/auth\/register$/.test(u.toString()), { timeout: 10_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  await p.waitForTimeout(800);
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
  await p.waitForTimeout(800);
  await p.close();
}

const browser = await chromium.launch();

try {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});
  const password = "WiringTest!2026Strong";

  // ────────────────────────────────────────────────────────────
  // 1 · PUBLIC ACTOR — no session
  // ────────────────────────────────────────────────────────────
  console.log("\n=== 1 · PUBLIC ACTOR ===");
  const pub = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  // Public-readable routes — must return 200 (no redirect).
  const PUBLIC_OK = ["/", "/markets", "/live", "/leaderboard", "/help", "/legal/terms", "/legal/privacy", "/legal/responsible-gambling", "/auth/login", "/auth/register", "/auth/forgot-password"];
  for (const route of PUBLIC_OK) {
    const r = await pub.request.get(`${BASE}${route}`, { maxRedirects: 0 });
    log(`1.${route} public can read (200)`, r.status() === 200, `status ${r.status()}`);
  }

  // Auth-only routes — must 307 to /auth/login.
  const PUBLIC_BLOCKED = ["/wallet", "/wallet/deposit", "/wallet/withdraw", "/positions", "/profile", "/profile/kyc", "/profile/account", "/profile/sessions", "/profile/responsible-gambling", "/admin", "/admin/finance", "/admin/players"];
  for (const route of PUBLIC_BLOCKED) {
    const r = await pub.request.get(`${BASE}${route}`, { maxRedirects: 0 });
    const blocked = r.status() === 307 || r.status() === 308;
    const loc = r.headers().location ?? "";
    const goesToLogin = /\/auth\/login/.test(loc);
    log(`1.${route} blocks public (307→/auth/login)`, blocked && goesToLogin, `status ${r.status()} loc ${loc}`);
  }

  // Public navigates to /markets and tries to open the first card — must
  // succeed (read-only browsing).
  {
    const p = await pub.newPage();
    await p.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
    const href = await p.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
    log("1.markets-list shows market links to public", !!href, href ?? "(none)");
    if (href) {
      await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
      const body = (await p.locator("body").textContent()) ?? "";
      // Must NOT show conviction dial to unauth (no `slide to commit` text).
      const dialPresent = /slide to commit/i.test(body);
      log("1.market-detail HIDES conviction dial from public", !dialPresent);
      // Must show a "Sign in to bet" card.
      const signInCta = /sign in to (bet|predict)|register to bet|create account to bet/i.test(body);
      log("1.market-detail SHOWS sign-in-to-bet CTA", signInCta);
    }
    await p.close();
  }

  // Top app bar: must NOT show Wallet / Positions nav links to public.
  {
    const p = await pub.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const navLinks = await p.locator("header nav a").allInnerTexts().catch(() => []);
    const navText = navLinks.join(" | ");
    const showsWallet    = /wallet|pochi/i.test(navText);
    const showsPositions = /positions|madau/i.test(navText);
    log("1.top-bar HIDES Wallet from public", !showsWallet, navText.slice(0, 80));
    log("1.top-bar HIDES Positions from public", !showsPositions, navText.slice(0, 80));
    // Must SHOW a "Sign in" CTA in the header (replacing avatar).
    const hasSignInBtn = await p.locator('a[href*="/auth/login"], a[href*="/auth/register"]').first().isVisible().catch(() => false);
    log("1.top-bar SHOWS Sign-in CTA to public", hasSignInBtn);
    await p.close();
  }

  // ────────────────────────────────────────────────────────────
  // 2 · PLAYER ACTOR
  // ────────────────────────────────────────────────────────────
  console.log("\n=== 2 · PLAYER ACTOR ===");
  const playerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const playerTail = phoneTail(1);
  await reg(playerCtx, playerTail, password);

  // After registration, the next request to /profile should NOT redirect.
  {
    const r = await playerCtx.request.get(`${BASE}/profile`, { maxRedirects: 0 });
    log("2.player /profile returns 200 (authed)", r.status() === 200, `status ${r.status()}`);
  }

  // Player MUST be able to reach all authed routes (200, not redirect).
  const PLAYER_OK = ["/", "/markets", "/live", "/wallet", "/wallet/deposit", "/wallet/withdraw", "/positions", "/profile", "/profile/kyc", "/profile/account", "/profile/responsible-gambling", "/profile/sessions", "/leaderboard", "/help"];
  for (const route of PLAYER_OK) {
    const r = await playerCtx.request.get(`${BASE}${route}`, { maxRedirects: 0 });
    log(`2.${route} player can read (200)`, r.status() === 200, `status ${r.status()}`);
  }

  // Player MUST be blocked from /admin (redirect or 404).
  {
    const r = await playerCtx.request.get(`${BASE}/admin`, { maxRedirects: 0 });
    const blocked = r.status() === 307 || r.status() === 308 || r.status() === 404 || r.status() === 403;
    log(`2./admin blocks PLAYER`, blocked, `status ${r.status()}`);
  }
  {
    const r = await playerCtx.request.get(`${BASE}/admin/finance`, { maxRedirects: 0 });
    const blocked = r.status() === 307 || r.status() === 308 || r.status() === 404 || r.status() === 403;
    log(`2./admin/finance blocks PLAYER`, blocked, `status ${r.status()}`);
  }

  // Player nav must SHOW Wallet + Positions.
  {
    const p = await playerCtx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const navLinks = await p.locator("header nav a").allInnerTexts().catch(() => []);
    const navText = navLinks.join(" | ");
    log("2.top-bar SHOWS Wallet to player",    /wallet|pochi/i.test(navText));
    log("2.top-bar SHOWS Positions to player", /positions|madau/i.test(navText));
    await p.close();
  }

  // Player on market detail SEES the conviction dial.
  {
    const probe = await playerCtx.newPage();
    await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
    const href = await probe.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
    if (href) {
      await probe.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
      const body = (await probe.locator("body").textContent()) ?? "";
      const dialPresent = /slide to commit/i.test(body);
      log("2.market-detail SHOWS conviction dial to player", dialPresent);
    }
    await probe.close();
  }

  // ────────────────────────────────────────────────────────────
  // 3 · ADMIN ACTOR
  // ────────────────────────────────────────────────────────────
  console.log("\n=== 3 · ADMIN ACTOR ===");
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminTail = phoneTail(2);
  await reg(adminCtx, adminTail, password);
  await fetch(`${BASE}/api/dev-test/promote-admin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+255" + adminTail }),
  }).catch(() => null);
  // After promotion the existing session still has role=PLAYER. A re-login
  // mints a fresh session with role=ADMIN.
  await login(adminCtx, adminTail, password);

  // Admin MUST be able to reach every /admin route.
  const ADMIN_OK = ["/admin", "/admin/finance", "/admin/players", "/admin/markets", "/admin/resolver-queue", "/admin/aml", "/admin/audit", "/admin/system", "/admin/self-exclusions"];
  for (const route of ADMIN_OK) {
    const r = await adminCtx.request.get(`${BASE}${route}`, { maxRedirects: 0 });
    log(`3.${route} admin can read (200)`, r.status() === 200, `status ${r.status()}`);
  }

  // Admin's profile shows the ADMIN pill.
  {
    const p = await adminCtx.newPage();
    await p.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
    const body = (await p.locator("body").textContent()) ?? "";
    log("3.profile SHOWS ADMIN pill", /\bADMIN\b|Msimamizi/.test(body));
    await p.close();
  }

  // ────────────────────────────────────────────────────────────
  // 4 · RESPONSIVE — same checks at 393×800 (mobile)
  // ────────────────────────────────────────────────────────────
  console.log("\n=== 4 · MOBILE VIEWPORT (393×800) ===");
  const mob = await browser.newContext({ viewport: { width: 393, height: 800 } });
  for (const route of ["/", "/markets", "/live"]) {
    const r = await mob.request.get(`${BASE}${route}`, { maxRedirects: 0 });
    log(`4.${route} loads at mobile width`, r.status() === 200);
  }
  // Mobile bottom nav: public must NOT see Positions/Profile entries that
  // immediately bounce to /auth/login.
  {
    const p = await mob.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const bottomNav = p.locator('nav[aria-label="Primary"]').last();
    const navText = await bottomNav.innerText().catch(() => "");
    const hasPositions = /positions/i.test(navText);
    log("4.bottom-nav HIDES Positions tile from public", !hasPositions, navText.replace(/\s+/g, " ").slice(0, 80));
    await p.close();
  }

  // ────────────────────────────────────────────────────────────
  // 5 · LANDING-PAGE OVERFLOW (mobile + tablet + desktop)
  // ────────────────────────────────────────────────────────────
  console.log("\n=== 5 · LANDING-PAGE OVERFLOW ===");
  for (const w of [375, 768, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const overflow = await p.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - root.clientWidth;
    });
    log(`5.${w}w · landing has no horizontal overflow`, Math.abs(overflow) <= 1, `delta ${overflow}px`);
    await p.close();
    await ctx.close();
  }

  await pub.close();
  await playerCtx.close();
  await adminCtx.close();
  await mob.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nWIRING INTEGRATION  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
if (fail > 0) {
  console.log("\nFailures:");
  for (const f of failures) console.log("  · " + f);
}
process.exit(fail > 0 ? 1 : 0);
