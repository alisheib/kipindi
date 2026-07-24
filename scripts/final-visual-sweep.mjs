/**
 * FINAL visual consistency sweep — every surface touched today, at the full
 * responsiveness matrix, asserting 0 horizontal overflow and 0 console errors, and
 * capturing a PNG of each so a human can READ it.
 *
 *   BASE=http://localhost:3000 node scripts/final-visual-sweep.mjs
 *
 * A green run is the floor, not the goal — the images are the point.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = join(process.cwd(), "docs", "shots-final");
const WIDTHS = [360, 768, 1280, 1920];
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

// Seed: admin, real markets, an updown chain + a round.
await page.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000001", name: "Ali" } });
const real = await page.request.post(`${BASE}/api/dev-test/seed-real-markets`, { data: {} });
const realJson = await real.json().catch(() => ({}));
const marketId = realJson?.live?.[0]?.id ?? null;
await page.request.post(`${BASE}/api/dev-test/updown-seed`, { data: { durations: [5, 15] } }).catch(() => {});
await page.request.post(`${BASE}/api/dev-test/updown-advance`, { data: {} }).catch(() => {});
console.log(`seeded — market ${marketId}`);

const routes = [
  ["home", "/"],
  ["markets", "/markets"],
  ["updown", "/updown"],
  ["live", "/live"],
  ["results", "/results"],
  ["market-detail", marketId ? `/markets/${marketId}` : "/markets"],
];

for (const [name, path] of routes) {
  console.log(`\n=== ${name} (${path}) ===`);
  for (const width of WIDTHS) {
    errs.length = 0;
    await page.setViewportSize({ width, height: width < 768 ? 820 : 1000 });
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(700);
    const o = await overflow();
    if (o > 1) fail(`${name} ${width}px OVERFLOW ${o}px`);
    // Fabricated-price honesty check on any board.
    const zero = await page.locator("text=/\\$0\\.00(?!\\d)/").count();
    if (zero > 0) fail(`${name} ${width}px shows a fabricated $0.00`);
    if (errs.length) fail(`${name} ${width}px console: ${errs[0].slice(0, 120)}`);
    if (o <= 1 && zero === 0 && !errs.length) pass(`${name} ${width}px clean`);
    await page.screenshot({ path: join(OUT, `${name}-${width}.png`), fullPage: false });
  }
}

// Admin console (needs the admin session already minted above).
console.log(`\n=== admin/updown ===`);
for (const width of WIDTHS) {
  errs.length = 0;
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(700);
  const o = await overflow();
  (o <= 1 && !errs.length) ? pass(`admin/updown ${width}px clean`) : fail(`admin/updown ${width}px overflow ${o} / console ${errs[0]?.slice(0,80) ?? "-"}`);
  await page.screenshot({ path: join(OUT, `admin-updown-${width}.png`), fullPage: false });
}

await browser.close();
console.log(`\n${failures === 0 ? "✓ final-visual-sweep: OK" : `✗ ${failures} failure(s)`}`);
console.log(`  PNGs in ${OUT} — READ THEM.`);
process.exit(failures === 0 ? 0 : 1);
