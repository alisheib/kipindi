/**
 * Live retest of the admin Resolver-queue screen — functional + responsive + clean.
 * Seeds an admin session + a live market, then drives the real page in a browser.
 * Screenshots (gitignored .50pick-shots/) for visual inspection.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// Admin session (dev-only) + a live market to populate the queue.
await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000000" } });
await ctx.request.post(`${BASE}/api/dev-test/stress-money`, { data: {} });

const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push(String(e)));

await page.goto(`${BASE}/admin/resolver-queue?window=all`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Resolver queue", { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(700);
// Requires the server booted with DISABLE_ADMIN_TOTP=true so the admin area renders.
ok("landed on resolver queue (not TOTP/login)", page.url().includes("/admin/resolver-queue"), page.url());

// ── Functional / UI ──────────────────────────────────────────────────────────
ok("page title renders", (await page.locator("text=Resolver queue").count()) > 0);
ok("triage summary shows 'pending'", (await page.locator("text=pending").first().count()) > 0);
ok("search box present", (await page.getByPlaceholder("Search title…").count()) > 0);
ok("a market card rendered", (await page.locator("text=Two-officer rule").count()) > 0);
ok("Resolve YES button visible", await page.getByRole("button", { name: "Resolve YES" }).first().isVisible().catch(() => false));
ok("Resolve NO button visible", await page.getByRole("button", { name: "Resolve NO" }).first().isVisible().catch(() => false));
ok("Void button visible", await page.getByRole("button", { name: "Void" }).first().isVisible().catch(() => false));
ok("Stage 1 / Stage 2 boxes present", (await page.locator("text=Stage 1").count()) > 0 && (await page.locator("text=Stage 2").count()) > 0);
ok("no console/page errors", errs.length === 0, errs.slice(0, 3).join(" | "));

// ── Responsiveness — no horizontal overflow ──────────────────────────────────
for (const w of [320, 360, 393, 768, 1024, 1280]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(200);
  const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`no horizontal overflow @${w}w`, of <= 1, `overflow=${of}px`);
}

// ── Screenshots for visual inspection ────────────────────────────────────────
await page.setViewportSize({ width: 1280, height: 1200 });
await page.waitForTimeout(200);
await page.screenshot({ path: ".50pick-shots/resolver-queue-1280.png", fullPage: true });
await page.setViewportSize({ width: 360, height: 1200 });
await page.waitForTimeout(200);
await page.screenshot({ path: ".50pick-shots/resolver-queue-360.png", fullPage: true });

await browser.close();
console.log(`\nresolver-queue-retest: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
