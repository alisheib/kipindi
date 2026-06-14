/**
 * Admin dashboard screenshots.
 * Captures a clean full-page shot of every admin route under a fresh demo
 * session, on 1440 desktop, in dark theme (the canonical brand).
 *
 *   BASE=http://localhost:3000   node scripts/admin-screenshots.mjs
 *   BASE=https://kipindi-...     node scripts/admin-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, rmSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT  = join(process.cwd(), "docs", "shots-admin");
const DARK_DIR  = join(OUT, "dark");
const LIGHT_DIR = join(OUT, "light");

const PAGES = [
  { name: "01-overview",          url: "/admin" },
  { name: "02-live-ops",          url: "/admin/live" },
  { name: "03-finance",           url: "/admin/finance" },
  { name: "04-reports",           url: "/admin/reports" },
  { name: "05-players",           url: "/admin/players" },
  { name: "06-players-cohorts",   url: "/admin/players/cohorts" },
  { name: "07-games-match",       url: "/admin/games/match" },
  { name: "08-games-window",      url: "/admin/games/window" },
  { name: "09-games-mapigo",      url: "/admin/games/mapigo" },
  { name: "10-compliance",        url: "/admin/compliance" },
  { name: "11-aml",               url: "/admin/aml" },
  { name: "12-self-exclusions",   url: "/admin/self-exclusions" },
  { name: "13-audit",             url: "/admin/audit" },
  { name: "14-system",            url: "/admin/system" },
  { name: "15-approvals",         url: "/admin/approvals" },
  { name: "16-2fa-setup",         url: "/admin/2fa/setup" },
];

// Reset and recreate split folders so the layout is always clean
mkdirSync(DARK_DIR, { recursive: true });
mkdirSync(LIGHT_DIR, { recursive: true });
// Drop any flat-named legacy files from the parent shots-admin folder
if (existsSync(OUT)) {
  for (const f of readdirSync(OUT)) {
    if (f === "dark" || f === "light") continue;
    if (f.endsWith(".png")) {
      try { unlinkSync(join(OUT, f)); } catch { /* ignore */ }
    }
  }
}

const browser = await chromium.launch();

// Capture in BOTH dark and light for the design record
for (const theme of ["dark", "light"]) {
  console.log(`\n=== ${theme.toUpperCase()} theme ===`);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
  });
  // Boot demo session AND promote it to ADMIN — without this the demo user is a
  // PLAYER, so every /admin/* route silently redirects to the public site and we
  // captured the homepage instead of the admin pages. The admin layout reads the
  // role from the DB, so promoting via the dev endpoint (same context cookies)
  // unlocks the admin surfaces. (Dev-only route; 404 in production.)
  const boot = await ctx.newPage();
  await boot.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  await boot.request.post(`${BASE}/api/dev-test/promote-admin`, { data: { phone: "+255700000000" } });
  await boot.close();

  // Drill down — pick the demo user as the per-player target
  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/admin/players`, { waitUntil: "networkidle" });
  const firstUserLink = await probe.locator('a[href^="/admin/players/usr_"]').first().getAttribute("href").catch(() => null);
  await probe.close();
  const playerDetailUrl = firstUserLink ?? "/admin/players";

  const fullList = [...PAGES, { name: "17-player-detail", url: playerDetailUrl }];

  for (const p of fullList) {
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}${p.url}`, { waitUntil: "networkidle", timeout: 30_000 });
      // Force theme
      await page.evaluate((t) => {
        try { localStorage.setItem("kp-theme", t); } catch {}
        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(t);
      }, theme);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const targetDir = theme === "dark" ? DARK_DIR : LIGHT_DIR;
      const file = join(targetDir, `${p.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`  ✓ ${p.url}  →  ${theme}/${p.name}.png`);
    } catch (e) {
      console.log(`  ✗ ${p.url}  →  ${e?.message ?? e}`);
    } finally {
      await page.close();
    }
  }
  await ctx.close();
}

await browser.close();
console.log(`\nScreenshots: ${DARK_DIR}\n             ${LIGHT_DIR}`);
process.exit(0);
