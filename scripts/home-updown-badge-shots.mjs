/** Visual check: the home Up & Down discovery band + the toned-down "coming soon" badge. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = join(process.cwd(), "docs", "shots-final");
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push(String(e)));

// Seed some data so home has a live section + updown rounds for the band count.
await page.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000001", name: "Ali" } }).catch(() => {});
await page.request.post(`${BASE}/api/dev-test/seed-real-markets`, { data: {} }).catch(() => {});
await page.request.post(`${BASE}/api/dev-test/updown-seed`, { data: { durations: [5, 15] } }).catch(() => {});
await page.request.post(`${BASE}/api/dev-test/updown-advance`, { data: {} }).catch(() => {});

for (const w of [390, 1280]) {
  await page.setViewportSize({ width: w, height: 1000 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(800);
  // Scroll past the 75vh hero so the Up & Down discovery band is in frame.
  await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 0.7)));
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `home-updown-band-${w}.png`), fullPage: false });
}
// Proposals page — shows the "coming soon" badge prominently when that's the state.
await page.setViewportSize({ width: 1280, height: 1000 });
await page.goto(`${BASE}/proposals/new`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(600);
await page.screenshot({ path: join(OUT, `coming-soon-badge.png`), fullPage: false });

console.log(errs.length ? `console errors: ${errs.slice(0, 2).join(" | ")}` : "no console errors");
await browser.close();
console.log("home/badge shots done");
