/**
 * Visual + a11y check for the loser-share fee-model surfaces.
 * Screenshots at 360/768/1280/1920, asserts no console errors, no horizontal
 * overflow, and that the new fee-model admin controls actually render.
 * Shots → .50pick-shots/.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.setDefaultNavigationTimeout(90000);
page.setDefaultTimeout(20000);
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push(String(e)));

await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000000" } });

async function shoot(pathname, name, checks) {
  await page.goto(`${BASE}${pathname}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  ok(`${name}: on ${pathname} (not redirected)`, page.url().includes(pathname.split("?")[0]), page.url());
  if (checks) await checks();
  for (const w of [360, 768, 1280, 1920]) {
    await page.setViewportSize({ width: w, height: 1000 });
    await page.waitForTimeout(200);
    const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`${name}: no horizontal overflow @${w}w`, of <= 1, `overflow=${of}px`);
    await page.screenshot({ path: `.50pick-shots/loser-share-${name}-${w}.png`, fullPage: false });
  }
}

// 1 · /admin/config — the fee-model section.
await shoot("/admin/config", "config", async () => {
  const section = await page.getByText(/Fee model/i).count();
  ok("config: 'Fee model' section present", section >= 1, `count=${section}`);
  const lsOpt = await page.getByText(/Loser-share|losing pool/i).count();
  ok("config: loser-share option/KPI present", lsOpt >= 1, `count=${lsOpt}`);
});

// 2 · /admin/markets/new — the frozen-fee banner.
await shoot("/admin/markets/new", "wizard", async () => {
  const banner = await page.getByText(/Fee model frozen at creation/i).count();
  ok("wizard: fee-model banner present", banner >= 1, `count=${banner}`);
});

// 3 · /admin/finance — the per-poll settlement-fees (accountant) card renders.
await shoot("/admin/finance", "finance", async () => {
  const card = await page.getByText(/Settlement fees by poll/i).count();
  ok("finance: settlement-fees-by-poll card present", card >= 1, `count=${card}`);
});

ok("no console errors", errs.length === 0, errs.slice(0, 3).join(" | "));

await browser.close();
console.log(`\nloser-share-fee-shots: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
