/**
 * Manager-review screenshot pack.
 *
 * Captures every page the manager will scrutinise, in two viewports:
 *   - web:    1440 × 900 (desktop)
 *   - phone:  393 × 852  (iPhone-class mobile)
 *
 * Shots are framed (single-screen, not full-page) so the manager can flip
 * through them like slides. Output lands in `.50pick-shots/manager/`.
 *
 *   BASE=http://localhost:3000  node scripts/manager-shots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT  = ".50pick-shots/manager";
await mkdir(OUT, { recursive: true });

const VIEWPORTS = {
  web:   { width: 1440, height: 900 },
  phone: { width: 393,  height: 852 },
};

const PAGES = [
  // Public marketing
  { slug: "01-landing",               url: "/" },
  { slug: "01b-landing-grid",         url: "/",                              scrollTo: 720 },
  // Auth
  { slug: "02-login",                 url: "/auth/login" },
  { slug: "03-register",              url: "/auth/register" },
  { slug: "04-otp",                   url: "/auth/otp?purpose=register&phone=%2B255712345678" },
  // Markets
  { slug: "05-markets",               url: "/markets",                        auth: true },
  { slug: "06-market-detail",         url: null,            dynamic: "first", auth: true },
  { slug: "07-market-detail-chart",   url: null,            dynamic: "first", auth: true, scrollTo: 580 },
  // Wallet
  { slug: "08-wallet",                url: "/wallet",                         auth: true },
  { slug: "09-wallet-deposit",        url: "/wallet/deposit",                 auth: true },
  { slug: "10-wallet-withdraw",       url: "/wallet/withdraw",                auth: true },
  // Profile
  { slug: "11-profile",               url: "/profile",                        auth: true },
  { slug: "12-profile-kyc",           url: "/profile/kyc",                    auth: true },
  { slug: "13-profile-rg",            url: "/profile/responsible-gambling",   auth: true },
  { slug: "14-profile-account",       url: "/profile/account",                auth: true },
  { slug: "15-profile-sof",           url: "/profile/source-of-funds",        auth: true },
  // Positions + leaderboard
  { slug: "16-positions",             url: "/positions",                      auth: true },
  { slug: "17-leaderboard",           url: "/leaderboard",                    auth: true },
  // Help + legal
  { slug: "18-help",                  url: "/help" },
  { slug: "19-legal-terms",           url: "/legal/terms" },
  { slug: "20-legal-privacy",         url: "/legal/privacy" },
  { slug: "21-legal-aml",             url: "/legal/aml" },
  { slug: "22-legal-rg",              url: "/legal/responsible-gambling" },
  // Admin (for the manager to see operator side)
  { slug: "23-admin",                 url: "/admin",                          auth: true },
  { slug: "24-admin-config",          url: "/admin/config",                   auth: true },
  { slug: "25-admin-finance",         url: "/admin/finance",                  auth: true },
  { slug: "26-admin-resolver",        url: "/admin/resolver-queue",           auth: true },
];

const browser = await chromium.launch();

// Set up an authenticated session via the dev OTP peek so the auth-only
// pages render with real user data + TZS 10,000 starter.
async function ensureAuth(ctx) {
  const tail = "7" + String((Date.now() + Math.floor(Math.random() * 1e6)) % 1e8).padStart(8, "0");
  const phoneE164 = "+255" + tail;
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill('input[name="phone"]', tail);
  await p.fill('input[name="dob"]', "1990-01-15");
  await p.check('input[name="acceptAge"]');
  await p.check('input[name="acceptTerms"]');
  await p.click('button[type="submit"]');
  await p.waitForURL(/\/auth\/otp/, { timeout: 10_000 });
  const r = await fetch(`${BASE}/api/dev-test/last-otp?phone=${encodeURIComponent(phoneE164)}`);
  const j = await r.json();
  if (!j.ok) throw new Error("OTP fetch failed: " + JSON.stringify(j));
  await p.fill('input[name="code"]', String(j.code));
  await p.click('button[type="submit"]');
  await p.waitForLoadState("networkidle");
  await p.close();
}

async function pickFirstMarket(ctx) {
  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const href = await probe.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
  await probe.close();
  return href;
}

for (const [vp, dims] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: dims, deviceScaleFactor: 1.6 });
  await ensureAuth(ctx);

  for (const meta of PAGES) {
    let url = meta.url;
    if (!url && meta.dynamic === "first") {
      url = await pickFirstMarket(ctx);
      if (!url) continue;
    }
    try {
      const p = await ctx.newPage();
      await p.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 30_000 });
      if (meta.scrollTo) {
        await p.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), meta.scrollTo);
      }
      await p.waitForTimeout(700);
      const file = `${OUT}/${meta.slug}.${vp}.png`;
      await p.screenshot({ path: file, fullPage: false });
      console.log(`✓ ${file}`);
      await p.close();
    } catch (e) {
      console.log(`✗ ${meta.slug}.${vp}  →  ${(e?.message ?? e).toString().slice(0, 120)}`);
    }
  }
  await ctx.close();
}

await browser.close();
console.log(`\nDone. ${PAGES.length} pages × ${Object.keys(VIEWPORTS).length} viewports → ${OUT}/`);
