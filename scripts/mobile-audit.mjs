/**
 * Mobile audit — captures iPhone Pro Max-sized screenshots of every key page
 * AND reports horizontal overflow per page (the #1 cause of "things hidden to right").
 *
 * Run against the live Railway URL or local dev server:
 *   BASE=https://kipindi-production.up.railway.app node scripts/mobile-audit.mjs
 *   BASE=http://localhost:3000                     node scripts/mobile-audit.mjs
 */
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT  = "C:/kipindi/scripts/mobile-audit";

// iPhone 17 Pro Max approx (Apple spec 430×932 logical pixels, dpr 3)
const viewport = { width: 430, height: 932 };

const PAGES = [
  { name: "01-landing",          url: "/" },
  { name: "02-login",            url: "/auth/login" },
  { name: "03-mapigo-public",    url: "/mapigo" },
  { name: "04-live",             url: "/live" },
  { name: "05-leaderboard",      url: "/leaderboard" },
  { name: "06-games",            url: "/games" },
  { name: "07-legal-terms",      url: "/legal/terms" },
  { name: "08-legal-privacy",    url: "/legal/privacy" },
  { name: "09-legal-rg",         url: "/legal/responsible-gambling" },
  { name: "10-legal-aml",        url: "/legal/aml" },
];

const AUTHED_PAGES = [
  { name: "20-home-authed",      url: "/" },
  { name: "21-wallet",           url: "/wallet" },
  { name: "22-deposit",          url: "/wallet/deposit" },
  { name: "23-withdraw",         url: "/wallet/withdraw" },
  { name: "24-bets",             url: "/bets" },
  { name: "25-mapigo-authed",    url: "/mapigo" },
  { name: "26-match-detail",     url: "/match/m1" },
  { name: "27-profile",          url: "/profile" },
  { name: "28-kyc",              url: "/profile/kyc" },
  { name: "29-rg-settings",      url: "/profile/responsible-gambling" },
  { name: "30-admin",            url: "/admin" },
  { name: "31-admin-audit",      url: "/admin/audit" },
  { name: "32-admin-aml",        url: "/admin/aml" },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function audit(ctx, label, urlPath) {
  const page = await ctx.newPage();
  await page.setViewportSize(viewport);
  let overflowReport = null;
  try {
    await page.goto(`${BASE}${urlPath}`, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(800);
    // Detect horizontal overflow: any element with scrollWidth > viewport
    overflowReport = await page.evaluate((vw) => {
      const offenders = [];
      const html = document.documentElement;
      if (html.scrollWidth > vw) offenders.push({ tag: "html", scrollWidth: html.scrollWidth });
      const body = document.body;
      if (body && body.scrollWidth > vw) offenders.push({ tag: "body", scrollWidth: body.scrollWidth });
      // Find specific offending elements
      const all = document.querySelectorAll("*");
      let count = 0;
      for (const el of all) {
        if (count > 8) break;
        const rect = el.getBoundingClientRect();
        if (rect.right > vw + 1 && rect.width > 50) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className || "").toString().slice(0, 80),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          });
          count++;
        }
      }
      return { docWidth: html.scrollWidth, viewportWidth: vw, offenders };
    }, viewport.width);
    await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: true });
  } catch (e) {
    console.log(`  ! ${label} → ${e?.message ?? e}`);
  } finally {
    await page.close();
  }
  if (overflowReport && overflowReport.docWidth > viewport.width + 1) {
    console.log(`  ✗ ${label} — doc=${overflowReport.docWidth}px (vp=${overflowReport.viewportWidth})`);
    for (const o of overflowReport.offenders.slice(0, 6)) {
      console.log(`      ${o.tag} ${o.cls ? `.${o.cls}` : ""} right=${o.right ?? o.scrollWidth}`);
    }
  } else if (overflowReport) {
    console.log(`  ✓ ${label}`);
  }
  return overflowReport;
}

const results = {};

console.log(`\n=== PUBLIC pages (${BASE}) ===`);
{
  const ctx = await browser.newContext({ viewport });
  for (const p of PAGES) {
    results[p.name] = await audit(ctx, p.name, p.url);
  }
  await ctx.close();
}

console.log(`\n=== AUTHED pages (demo session) ===`);
{
  const ctx = await browser.newContext({ viewport });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  for (const p of AUTHED_PAGES) {
    results[p.name] = await audit(ctx, p.name, p.url);
  }
  await ctx.close();
}

console.log(`\nScreenshots in: ${OUT}`);

const offenders = Object.entries(results).filter(([_, r]) => r && r.docWidth > viewport.width + 1);
console.log(`\n${"=".repeat(60)}\n${offenders.length} pages with horizontal overflow on iPhone Pro Max viewport\n${"=".repeat(60)}`);

await browser.close();
process.exit(0);
