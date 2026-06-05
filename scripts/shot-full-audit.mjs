/**
 * Full visual audit — captures the new hero v3 across viewports and
 * walks key routes for any obvious layout regressions.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = resolve(process.cwd(), ".50pick-shots/v3-audit");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

const SHOTS = [
  // Landing — hero v3 across viewports
  { route: "/", w: 1440, h: 900, label: "landing-desktop-1440" },
  { route: "/", w: 1280, h: 800, label: "landing-desktop-1280" },
  { route: "/", w: 1024, h: 768, label: "landing-tablet-1024" },
  { route: "/", w: 768,  h: 1024, label: "landing-tablet-portrait" },
  { route: "/", w: 393,  h: 852, label: "landing-mobile-393" },

  // Other key routes (1280 desktop)
  { route: "/markets", w: 1280, h: 800, label: "markets" },
  { route: "/live", w: 1280, h: 800, label: "live" },
  { route: "/leaderboard", w: 1280, h: 800, label: "leaderboard" },
  { route: "/help", w: 1280, h: 800, label: "help" },
  { route: "/legal/terms", w: 1280, h: 800, label: "legal-terms" },
  { route: "/auth/login", w: 1280, h: 800, label: "auth-login" },
  { route: "/auth/register", w: 1280, h: 800, label: "auth-register" },
];

for (const s of SHOTS) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
  const p = await ctx.newPage();
  try {
    await p.goto(`${BASE}${s.route}`, { waitUntil: "networkidle", timeout: 15_000 });
    await p.waitForTimeout(900);
    await p.screenshot({ path: resolve(OUT, `${s.label}.png`), fullPage: false });
    console.log(`✓ ${s.label}`);
  } catch (e) {
    console.log(`✗ ${s.label}: ${String(e?.message ?? e).slice(0, 80)}`);
  }
  await p.close();
  await ctx.close();
}

// Also capture the hero with the verdict tape mid-cycle — wait 6s + 3.5s
// for cycle 1 to swap then capture again to verify the rotation works.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  await p.screenshot({ path: resolve(OUT, "verdict-frame-1.png") });
  console.log("✓ verdict-frame-1");
  await p.waitForTimeout(6500);
  await p.screenshot({ path: resolve(OUT, "verdict-frame-2.png") });
  console.log("✓ verdict-frame-2");
  await p.close();
  await ctx.close();
}

await browser.close();
console.log(`\nfiles in: ${OUT}`);
