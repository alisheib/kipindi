/**
 * Visual proof for the platform DateTimeRangeFilter on the money/reporting surfaces:
 * presets + the custom date+hour+minute panel, at mobile + desktop, asserting no
 * horizontal overflow and no console errors.
 *
 *   BASE=http://localhost:3000 node scripts/datetime-filter-shots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = join(process.cwd(), "docs", "shots-final");
const WIDTHS = [390, 1280];
mkdirSync(OUT, { recursive: true });

let failures = 0;
const fail = (m) => { failures++; console.log(`  ✗ ${m}`); };
const pass = (m) => console.log(`  ✓ ${m}`);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push(String(e)));
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

console.log("=== seeding admin + data ===");
await page.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000001", name: "Ali Admin" } });
await page.request.post(`${BASE}/api/dev-test/seed-real-markets`, { data: {} }).catch(() => {});
await page.request.post(`${BASE}/api/dev-test/updown-seed`, { data: { durations: [5, 15] } }).catch(() => {});
await page.request.post(`${BASE}/api/dev-test/updown-advance`, { data: {} }).catch(() => {});

const routes = [
  ["reports", "/admin/reports"],
  ["transactions", "/admin/transactions"],
  ["finance", "/admin/finance"],
  ["updown-admin", "/admin/updown"],
];

for (const [name, path] of routes) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width < 768 ? 1100 : 1100 });
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(700);
    if (page.url().includes("/auth/")) { fail(`${name} ${width}px redirected to auth (no admin session)`); continue; }
    let o = await overflow();
    o <= 1 ? pass(`${name} ${width}px idle no overflow`) : fail(`${name} ${width}px OVERFLOW ${o}px`);
    await page.screenshot({ path: join(OUT, `dtf-${name}-${width}.png`), fullPage: false });

    // Open the Custom panel on desktop for the flagship reports + transactions.
    if (width === 1280 && (name === "reports" || name === "transactions")) {
      const custom = page.getByRole("button", { name: "Custom", exact: true }).first();
      if (await custom.count()) {
        await custom.click();
        await page.waitForTimeout(300);
        o = await overflow();
        o <= 1 ? pass(`${name} custom-open no overflow`) : fail(`${name} custom-open OVERFLOW ${o}px`);
        await page.screenshot({ path: join(OUT, `dtf-${name}-custom.png`), fullPage: false });
      } else { fail(`${name} · Custom chip not found`); }
    }
  }
}

errs.length ? fail(`console errors: ${errs.slice(0, 2).join(" | ").slice(0, 220)}`) : pass("no console errors");
await browser.close();
console.log(failures ? `\n✗ ${failures} issue(s) — READ the shots` : "\n✓ datetime-filter shots OK — READ docs/shots-final/dtf-*.png");
process.exit(failures ? 1 : 0);
