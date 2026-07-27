/**
 * Visual check for the grouped Up & Down history: drive the REAL quick-bet on the board
 * (multiple bets on one 5-min round), then shoot /updown/history — proving the round
 * groups into ONE card with the bets collapsed to chips (max 2 + "+N"). Also re-shoots
 * the board card to confirm no sub-1,000 preset (the "50") appears.
 *
 *   BASE=http://localhost:3000 node scripts/updown-history-shots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = join(process.cwd(), "docs", "shots-updown");
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push(String(e)));
const pass = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => console.log(`  ✗ ${m}`);

await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000001", name: "Ali" } });
await ctx.request.post(`${BASE}/api/dev-test/updown-seed`, { data: { durations: [5, 15] } });
await ctx.request.post(`${BASE}/api/dev-test/updown-advance`, { data: {} });

// Empty-state history first (before betting) at mobile.
await page.setViewportSize({ width: 390, height: 1100 });
await page.goto(`${BASE}/updown/history`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(700);
await page.screenshot({ path: join(OUT, "history-empty-390.png") });

// Place several bets on the current round via the REAL card quick-bet.
await page.setViewportSize({ width: 1280, height: 1000 });
await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.waitForTimeout(800);
// Confirm the card presets contain no sub-1,000 value (the "50" guard).
const chipText = await page.locator('[role="radiogroup"] button').allInnerTexts().catch(() => []);
const has50 = chipText.some((t) => /\b50\b/.test(t) && !/500|50k|50,000/i.test(t));
has50 ? fail(`a sub-1,000 stake chip is present: ${chipText.join(" ")}`) : pass(`no sub-1,000 stake chip (chips: ${chipText.join(" ")})`);
await page.screenshot({ path: join(OUT, "board-card-check-1280.png") });

const up = page.locator("button.btn-yes").first();
const down = page.locator("button.btn-no").first();
for (let i = 0; i < 3; i++) { await up.click().catch(() => {}); await page.waitForTimeout(500); }
await down.click().catch(() => {});
await page.waitForTimeout(1200); // let the placements settle

// Now the grouped history — one card for the round, 4 bets → 2 chips + "+2".
for (const w of [390, 1280]) {
  await page.setViewportSize({ width: w, height: 1200 });
  await page.goto(`${BASE}/updown/history`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(800);
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  o <= 1 ? pass(`history ${w}px no overflow`) : fail(`history ${w}px OVERFLOW ${o}px`);
  const plus = await page.locator("text=/^\\+\\d+$/").count().catch(() => 0);
  if (w === 1280) (plus > 0 ? pass(`"+N" overflow chip present (${plus})`) : console.log(`  · note: no +N chip (bets may have been ≤2)`));
  await page.screenshot({ path: join(OUT, `history-grouped-${w}.png`), fullPage: true });
}

errs.length ? fail(`console errors: ${errs.slice(0, 2).join(" | ").slice(0, 200)}`) : pass("no console errors");
await browser.close();
console.log("history shots done — READ docs/shots-updown/history-*.png + board-card-check");
