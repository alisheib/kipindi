// PRODUCTION, READ-ONLY: what /admin/players?q=712000110 lists, and how the first player page names its player.
process.env.LIVE_BASE = "https://www.50pick.tz";
import { createRequire } from "node:module";
const ROOT = "F:/kipindi-c5docs";
const req = createRequire(ROOT + "/package.json");
const { chromium } = req("playwright");
const H = await import("file:///F:/kipindi-c5docs/scripts/live/harness.mjs");
const b = await chromium.launch({ headless: true });
try {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await H.login(page, "admin");
  for (const q of ["712000110", "QA Mobile"]) {
    await page.goto(`${H.BASE}/admin/players?q=${encodeURIComponent(q)}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(2500);
    const links = await page.locator('a[href^="/admin/players/"]').evaluateAll((as) => as.map((a) => `${a.getAttribute("href")} :: ${a.innerText.replace(/\s+/g, " ").slice(0, 80)}`));
    console.log(`search "${q}": ${links.length} link(s)`);
    links.filter((l) => !/cohorts/.test(l)).slice(0, 8).forEach((l) => console.log("   " + l));
  }
  const first = page.locator('a[href^="/admin/players/"]').filter({ hasNotText: /cohort/i }).first();
  const href = await first.getAttribute("href").catch(() => null);
  if (href && /^\/admin\/players\/[A-Za-z0-9_-]+$/.test(href)) {
    await page.goto(`${H.BASE}${href}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(2500);
    const body = (await page.locator("main").first().innerText().catch(() => "")).replace(/\s+/g, " ");
    console.log(`player page ${href}: ${body.slice(0, 500)}`);
  }
} catch (e) { console.log(`STOPPED: ${String(e.message).slice(0, 300)}`); }
finally { await b.close(); }
