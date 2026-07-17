/**
 * Visual + a11y check for the /admin/payments operations control-plane.
 * Screenshots at 360/768/1280/1920, asserts no console errors, no horizontal
 * overflow, tap targets ≥ 40px on the provider selector, and that the mode
 * indicator + provider radiogroup + toggles actually render. Shots → .50pick-shots/.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.setDefaultNavigationTimeout(90000); // first cold Turbopack compile of the route can be slow
page.setDefaultTimeout(20000);
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push(String(e)));

await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000000" } });

await page.goto(`${BASE}/admin/payments`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);

ok("on /admin/payments (not redirected)", page.url().includes("/admin/payments"), page.url());

// Control-plane renders
const modeBadge = await page.getByText(/REAL MONEY LIVE|TEST MODE/).count();
ok("mode indicator present", modeBadge >= 1, `count=${modeBadge}`);
const radiogroup = await page.getByRole("radiogroup", { name: /payment provider/i }).count();
ok("provider radiogroup present", radiogroup >= 1, `count=${radiogroup}`);
const switches = await page.getByRole("switch").count();
ok("toggle switches present (auto-settle + demo-async)", switches >= 2, `count=${switches}`);

// Provider option tap targets ≥ 40px
const radios = page.getByRole("radio");
const rc = await radios.count();
for (let i = 0; i < rc; i++) {
  const box = await radios.nth(i).boundingBox();
  ok(`provider option ${i} tap target ≥40px`, box && box.height >= 40, box ? `${Math.round(box.height)}px` : "no box");
}

for (const w of [360, 768, 1280, 1920]) {
  await page.setViewportSize({ width: w, height: 1000 });
  await page.waitForTimeout(180);
  const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`no horizontal overflow @${w}w`, of <= 1, `overflow=${of}px`);
  await page.screenshot({ path: `.50pick-shots/payments-control-${w}.png`, fullPage: false });
}

ok("no console errors", errs.length === 0, errs.slice(0, 3).join(" | "));

await browser.close();
console.log(`\npayments-control-shots: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
