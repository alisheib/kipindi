/**
 * Visual QA for /admin/ai-usage — seeds volume, then captures the page across
 * mobile / tablet / desktop plus filtered + paginated states (dark theme).
 *   BASE=http://localhost:3009 OUT=/path node scripts/ai-usage-shots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3009";
const OUT = process.env.OUT || join(process.cwd(), "docs", "shots-ai-usage");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });

// Boot demo session → promote to ADMIN → seed AI usage volume.
const boot = await ctx.newPage();
await boot.goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
await boot.request.post(`${BASE}/api/dev-test/promote-admin`, { data: { phone: "+255700000000" } });
const seed = await boot.request.post(`${BASE}/api/dev-test/seed-ai-usage`, { data: { count: 320 } });
console.log("seed:", await seed.json().catch(() => "(no json)"));
await boot.close();

const shots = [
  { name: "desktop-1440", w: 1440, h: 1000, url: "/admin/ai-usage" },
  { name: "tablet-768", w: 768, h: 1024, url: "/admin/ai-usage" },
  { name: "mobile-360", w: 360, h: 800, url: "/admin/ai-usage" },
  { name: "desktop-filtered", w: 1440, h: 1000, url: "/admin/ai-usage?feature=sentinel&status=error" },
  { name: "desktop-page2", w: 1440, h: 1000, url: "/admin/ai-usage?page=2" },
  { name: "mobile-filters", w: 360, h: 800, url: "/admin/ai-usage?feature=polls" },
];

for (const s of shots) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width: s.w, height: s.h });
  try {
    await page.goto(`${BASE}${s.url}`, { waitUntil: "networkidle", timeout: 30_000 });
    await page.evaluate(() => {
      try { localStorage.setItem("kp-theme", "dark"); } catch {}
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, `${s.name}.png`), fullPage: true });
    console.log(`  ✓ ${s.name}  ${s.url}`);
  } catch (e) {
    console.log(`  ✗ ${s.name}  ${e?.message ?? e}`);
  } finally {
    await page.close();
  }
}

await ctx.close();
await browser.close();
console.log(`\nShots → ${OUT}`);
process.exit(0);
