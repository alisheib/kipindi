/**
 * Capture screenshots for the player + admin user manuals.
 *
 *   docs/screenshots/player/<name>.png  — what a player sees
 *   docs/screenshots/admin/<name>.png   — what an admin sees
 *
 * Run: node scripts/capture-manual-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT  = resolve(process.cwd(), "docs/screenshots");
mkdirSync(resolve(OUT, "player"), { recursive: true });
mkdirSync(resolve(OUT, "admin"),  { recursive: true });

await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});

const browser = await chromium.launch();

async function shot(page, name, area = "player", clip) {
  const path = resolve(OUT, area, `${name}.png`);
  await page.waitForTimeout(700);
  // Viewport-only capture — never fullPage. Long pages produce
  // 2000-3000 px tall images that, even at 78 mm wide in a print
  // layout, balloon to 100 mm+ tall and blow the page budget.
  await page.screenshot({ path, clip, fullPage: false });
  console.log(`  ✓ ${area}/${name}.png`);
}

async function fillRegister(p, opts) {
  await p.fill('#phone', opts.tail);
  await p.fill('input[name="dob"]', opts.dob ?? "1990-01-15");
  await p.fill('input[name="password"]', opts.password ?? "DemoPlayer!2026");
  await p.fill('input[name="passwordConfirm"]', opts.password ?? "DemoPlayer!2026");
  await p.check('input[name="acceptAge"]', { force: true });
  await p.check('input[name="acceptTerms"]', { force: true });
}

const phoneTail = (offset = 0) => "7" + String((Date.now() + offset) % 100_000_000).padStart(8, "0");

// ─────────────────────────────────────────────────────────────
// PLAYER manual screenshots
// ─────────────────────────────────────────────────────────────
{
  console.log("\nPLAYER:");
  // 1280×800 viewport — desktop framing, sane 1.6:1 aspect ratio so the
  // shots scale cleanly into a 78 mm column at ~50 mm tall.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const me = { tail: phoneTail(), pwd: "DemoPlayer!2026" };

  // 1 · Register page
  let p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await shot(p, "01-register-empty");
  await fillRegister(p, { tail: me.tail, password: me.pwd });
  await shot(p, "02-register-filled");
  await Promise.all([
    p.waitForURL(u => !/auth\/register$/.test(u.toString()), { timeout: 10_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  await p.waitForTimeout(1500);
  await shot(p, "03-after-register-kyc");

  // 4 · Markets list
  await p.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  await shot(p, "04-markets");

  // 5 · Market detail (live)
  const href = await p.locator('a[href^="/markets/mkt_"]').first().getAttribute("href");
  if (href) {
    await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await shot(p, "05-market-detail");
  }

  // 6 · Wallet
  await p.goto(`${BASE}/wallet`, { waitUntil: "networkidle" }).catch(() => {});
  await shot(p, "06-wallet");

  // 7 · Positions (empty + after first bet)
  await p.goto(`${BASE}/positions`, { waitUntil: "networkidle" }).catch(() => {});
  await shot(p, "07-positions");

  // 8 · Profile
  await p.goto(`${BASE}/profile`, { waitUntil: "networkidle" }).catch(() => {});
  await shot(p, "08-profile");

  // 9 · Responsible gambling
  await p.goto(`${BASE}/profile/responsible-gambling`, { waitUntil: "networkidle" }).catch(() => {});
  await shot(p, "09-responsible-gambling");

  // 10 · Login screen (sign-out + reload)
  await p.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" }).catch(() => {});
  await shot(p, "10-login");

  await ctx.close();
}

// ─────────────────────────────────────────────────────────────
// ADMIN manual screenshots — requires dev-test promotion
// ─────────────────────────────────────────────────────────────
{
  console.log("\nADMIN:");
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const tail = phoneTail();
  const e164 = "+255" + tail;
  const pwd = "AdminDemo!2026Strong";

  // Register
  let p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await fillRegister(p, { tail, password: pwd });
  await Promise.all([
    p.waitForURL(u => !/auth\/register$/.test(u.toString()), { timeout: 10_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  await p.waitForTimeout(1200);
  await p.close();

  // Promote
  await fetch(`${BASE}/api/dev-test/promote-admin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: e164 }),
  });

  // Login as admin
  p = await ctx.newPage();
  await p.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  await p.fill('#phone', tail);
  await p.fill('input[name="password"]', pwd);
  await Promise.all([
    p.waitForURL(/\/admin/, { timeout: 10_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  await p.waitForTimeout(1500);

  // Walk admin pages
  const admin = [
    ["01-overview",       "/admin"],
    ["02-finance",        "/admin/finance"],
    ["03-players",        "/admin/players"],
    ["04-markets",        "/admin/markets"],
    ["05-resolver-queue", "/admin/resolver-queue"],
    ["06-aml",            "/admin/aml"],
    ["07-self-exclusions","/admin/self-exclusions"],
    ["08-audit",          "/admin/audit"],
    ["09-system",         "/admin/system"],
  ];
  for (const [name, route] of admin) {
    await p.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" }).catch(() => {});
    await p.waitForTimeout(900);
    await shot(p, name, "admin");
  }

  await ctx.close();
}

await browser.close();
console.log("\n  Done.");
