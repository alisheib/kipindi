import { chromium } from "playwright";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE || "http://localhost:3000";
const OUT = resolve(process.cwd(), ".50pick-shots/v3-audit");
mkdirSync(OUT, { recursive: true });
const phoneTail = (off = 0) => "7" + String((Date.now() + off) % 100_000_000).padStart(8, "0");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const tail = phoneTail();
const pwd = "Audit!2026";

// register + promote to admin
{
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail); await p.fill('input[name="dob"]', "1990-01-15");
  await p.fill('input[name="password"]', pwd); await p.fill('input[name="passwordConfirm"]', pwd);
  await p.check('input[name="acceptAge"]', { force: true }); await p.check('input[name="acceptTerms"]', { force: true });
  await p.click('button[type="submit"]');
  await p.waitForTimeout(900); await p.close();
}
await fetch(`${BASE}/api/dev-test/promote-admin`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ phone: "+255" + tail }),
});
{
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail); await p.fill('input[name="password"]', pwd);
  await p.click('button[type="submit"]'); await p.waitForTimeout(900); await p.close();
}

// Inject a couple of candidate fixtures by hitting an internal endpoint?
// No endpoint yet — capture the empty-state pages anyway.
const routes = [
  ["/admin/candidates", "admin-candidates-empty"],
  ["/admin", "admin-overview"],
  ["/admin/markets", "admin-markets"],
  ["/admin/system", "admin-system"],
];
for (const [route, label] of routes) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(700);
  await p.screenshot({ path: resolve(OUT, `${label}.png`), fullPage: false });
  console.log(`✓ ${label}`);
  await p.close();
}

// Also market detail with the conviction dial visible
{
  const probe = await ctx.newPage();
  await probe.goto(`${BASE}/markets`, { waitUntil: "networkidle" });
  const href = await probe.locator('a[href^="/markets/mkt_"]').first().getAttribute("href").catch(() => null);
  await probe.close();
  if (href) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(700);
    await p.screenshot({ path: resolve(OUT, "market-detail.png"), fullPage: false });
    console.log(`✓ market-detail`);
    await p.close();
  }
}

await ctx.close();
await browser.close();
