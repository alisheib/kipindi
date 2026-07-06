/**
 * Live retest of /admin/ai-polls and /admin/candidates — search/filter round-trip,
 * refresh control, clean console, responsive.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000000" } });
const seedPolls = await ctx.request.post(`${BASE}/api/dev-test/seed-ai-polls`, { data: {} }).catch(() => null);
const seedCands = await ctx.request.post(`${BASE}/api/dev-test/seed-candidates`, { data: {} }).catch(() => null);
console.log("seed-ai-polls:", seedPolls?.status(), " seed-candidates:", seedCands?.status());

const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(`${page.url()} :: ${m.text()}`); });
page.on("pageerror", (e) => errs.push(String(e)));

async function grid(path, name, searchPh) {
  errs.length = 0;
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  ok(`${name}: landed`, page.url().includes(path), page.url());
  const box = page.getByPlaceholder(searchPh);
  ok(`${name}: search box present`, (await box.count()) > 0);
  ok(`${name}: refresh button present`, (await page.getByRole("button", { name: "Refresh" }).count()) > 0);
  // Search round-trip via Enter
  await box.fill("zzznomatchxyz");
  await box.press("Enter");
  await page.waitForTimeout(700);
  ok(`${name}: search updates URL ?q=`, page.url().toLowerCase().includes("q="), page.url());
  // Clear
  const clearBtn = page.getByRole("button", { name: "Clear" });
  if (await clearBtn.count()) { await clearBtn.click(); await page.waitForTimeout(600); }
  ok(`${name}: cleared back`, !page.url().includes("q="), page.url());
  // Refresh
  await page.getByRole("button", { name: "Refresh" }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  ok(`${name}: no console errors`, errs.length === 0, errs.slice(0, 3).join(" | "));
  // Responsive
  for (const w of [320, 360, 768, 1280, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(150);
    const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`${name}: no overflow @${w}w`, of <= 1, `overflow=${of}px`);
  }
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `.50pick-shots/${name}-1280.png`, fullPage: true });
}

await grid("/admin/ai-polls", "ai-polls", "Search polls by title, category, ID, or criterion...");
await grid("/admin/candidates", "candidates", "Search candidates by title, category, or ID...");

await browser.close();
console.log(`\npolls-candidates-retest: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
