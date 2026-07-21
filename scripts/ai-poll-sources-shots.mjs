/**
 * Visual + a11y check for the source-driven AI-poll generation UI:
 *   - /admin/ai-polls  — generate form only offers generatable categories
 *     (non-generatable pills disabled) + the Sources & categories hint.
 *   - /admin/sources   — "Generatable categories" KPI + per-category
 *     "AI can generate" / "no enabled source" indicator.
 * Screenshots at 360 + 1280, asserts no console errors, no horizontal overflow.
 * Shots → .50pick-shots/. Run against a dev server with DISABLE_ADMIN_TOTP=true.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log(`ok  ${n}`); } else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.setDefaultNavigationTimeout(90000);
page.setDefaultTimeout(25000);
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push(String(e)));

await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000000" } });

// ── /admin/ai-polls ──
await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
ok("on /admin/ai-polls (not redirected)", page.url().includes("/admin/ai-polls"), page.url());
ok("generate button present", (await page.getByRole("button", { name: /Generate poll/i }).count()) >= 1);
ok("source hint present", (await page.getByText(/enabled trusted source/i).count()) >= 1);
// A generatable pill (Macro) should be enabled; the non-generatable 'Other' pill disabled.
const macroBtn = page.getByRole("button", { name: /^Macro/i }).first();
const otherBtn = page.getByRole("button", { name: /^Other$/i }).first();
ok("Macro pill enabled (has seeded source)", (await macroBtn.count()) >= 1 && !(await macroBtn.isDisabled()));
ok("Other pill disabled (no seeded source)", (await otherBtn.count()) >= 1 && (await otherBtn.isDisabled()), "expected disabled");

for (const w of [360, 1280]) {
  await page.setViewportSize({ width: w, height: 1100 });
  await page.waitForTimeout(200);
  const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`ai-polls no horizontal overflow @${w}w`, of <= 1, `overflow=${of}px`);
  await page.screenshot({ path: `.50pick-shots/ai-polls-sources-${w}.png`, fullPage: false });
}

// ── /admin/sources ──
await page.goto(`${BASE}/admin/sources`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
ok("on /admin/sources (not redirected)", page.url().includes("/admin/sources"), page.url());
ok("Generatable-categories KPI present", (await page.getByText(/Generatable categories/i).count()) >= 1);
ok("'AI can generate' indicator present", (await page.getByText(/AI can generate/i).count()) >= 1);
ok("'not generatable' indicator present for empty category", (await page.getByText(/not generatable/i).count()) >= 1);

for (const w of [360, 1280]) {
  await page.setViewportSize({ width: w, height: 1400 });
  await page.waitForTimeout(200);
  const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`sources no horizontal overflow @${w}w`, of <= 1, `overflow=${of}px`);
  await page.screenshot({ path: `.50pick-shots/sources-generatable-${w}.png`, fullPage: false });
}

ok("no console errors", errs.length === 0, errs.slice(0, 3).join(" | "));

await browser.close();
console.log(`\nai-poll-sources-shots: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
