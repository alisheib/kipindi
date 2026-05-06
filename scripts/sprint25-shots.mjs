/**
 * Sprint 25 — framed web shots for the wallet/positions rebuild.
 * 1440×900 viewport. Screenshots are NOT full-page so each is one screen.
 *
 *   BASE=http://localhost:3000  node scripts/sprint25-shots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT  = ".50pick-shots";
await mkdir(OUT, { recursive: true });

const VIEWPORT = { width: 1440, height: 900 };

const PAGES = [
  { slug: "wallet",                  url: "/wallet",          scrollTo: 0,    auth: true },
  { slug: "wallet-methods",          url: "/wallet",          scrollTo: 0,    auth: true, click: { tab: "Methods" } },
  { slug: "wallet-limits",           url: "/wallet",          scrollTo: 0,    auth: true, click: { tab: "Limits" } },
  { slug: "wallet-deposit",          url: "/wallet/deposit",  scrollTo: 0,    auth: true },
  { slug: "wallet-withdraw",         url: "/wallet/withdraw", scrollTo: 0,    auth: true },
  { slug: "positions",               url: "/positions",       scrollTo: 0,    auth: true },
  { slug: "positions-detail",        url: "/positions",       scrollTo: 200,  auth: true },
];

const browser = await chromium.launch();

async function ensureAuth(ctx) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  await p.close();
}

for (const meta of PAGES) {
  try {
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1.5,
      colorScheme: "dark",
    });
    await ctx.addCookies([{ name: "kp-theme", value: "dark", url: BASE }]);
    if (meta.auth) await ensureAuth(ctx);

    const p = await ctx.newPage();
    await p.goto(`${BASE}${meta.url}`, { waitUntil: "networkidle" });

    if (meta.click?.tab) {
      const btn = p.locator('button[role="tab"]', { hasText: meta.click.tab }).first();
      await btn.click();
      await p.waitForTimeout(450);
    }
    if (meta.scrollTo) {
      await p.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), meta.scrollTo);
    }
    await p.waitForTimeout(800);
    const file = `${OUT}/${meta.slug}.web.png`;
    await p.screenshot({ path: file, fullPage: false });
    console.log(`✓ ${file}`);
    await p.close();
    await ctx.close();
  } catch (e) {
    console.log(`✗ ${meta.slug}  →  ${(e?.message ?? e).toString().slice(0, 120)}`);
  }
}

await browser.close();
console.log("\nDone.  Screenshots in", OUT);
