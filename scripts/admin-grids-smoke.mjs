/**
 * Broad smoke test across every admin screen: asserts the global refresh glyph
 * renders, no console/page errors, and no horizontal overflow at 360 + 1280.
 * Seeds admin + a spread of data so grids have rows.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000000" } });
for (const ep of ["stress-money", "proposals-seed", "seed-candidates", "seed-ai-polls", "seed-kyc"]) {
  await ctx.request.post(`${BASE}/api/dev-test/${ep}`, { data: {} }).catch(() => {});
}

const ROUTES = [
  "/admin", "/admin/live", "/admin/markets", "/admin/resolver-queue", "/admin/ai-polls",
  "/admin/candidates", "/admin/proposals", "/admin/sources", "/admin/config", "/admin/finance",
  "/admin/reports", "/admin/players", "/admin/affiliate", "/admin/bonuses", "/admin/invites",
  "/admin/compliance", "/admin/moderation", "/admin/aml", "/admin/self-exclusions",
  "/admin/privacy", "/admin/retention", "/admin/audit", "/admin/system", "/admin/ai-usage",
  "/admin/approvals",
];

for (const route of ROUTES) {
  const errs = [];
  const onErr = (m) => { if (m.type && m.type() === "error") errs.push(m.text()); };
  page.on("console", onErr);
  page.on("pageerror", (e) => errs.push(String(e)));

  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(500);

  ok(`${route}: not redirected to login/TOTP`, page.url().includes(route.split("?")[0]), page.url());
  const refreshCount = await page.getByRole("button", { name: "Refresh" }).count();
  ok(`${route}: has a refresh control`, refreshCount >= 1, `count=${refreshCount}`);

  for (const w of [360, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(120);
    const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`${route}: no overflow @${w}w`, of <= 1, `overflow=${of}px`);
  }
  ok(`${route}: no console errors`, errs.length === 0, errs.slice(0, 2).join(" | "));

  page.off("console", onErr);
}

await browser.close();
console.log(`\nadmin-grids-smoke: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
