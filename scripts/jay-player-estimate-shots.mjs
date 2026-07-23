/**
 * Visual check for the loser-share PLAYER estimate: the fixed "possible winnings"
 * (stake × 1.5) + disclaimer shown on a loser-share market's dial before betting.
 * Seeds the demo market board (loser-share default), opens a market, drives the
 * conviction dial off-centre to reveal the estimate, asserts the copy, screenshots.
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

// Seed a player session + fund it, and the demo market board (loser-share default).
await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000000" } });
const seed = await ctx.request.post(`${BASE}/api/dev-test/seed-markets`);
const body = await seed.json();
ok("seeded live markets", body.ok && body.ids?.length > 0, JSON.stringify(body).slice(0, 120));
const marketId = body.ids?.[0]?.id;

await page.goto(`${BASE}/markets/${marketId}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
ok("on the market page", page.url().includes(`/markets/${marketId}`), page.url());

// Pick a side (the button's accessible name is "Back YES at N%") → the conviction
// dial appears with a stake → the estimate renders.
const pick = page.getByRole("button", { name: /Back YES at/i }).first();
ok("side-pick button present", (await pick.count()) >= 1);
if (await pick.count()) { await pick.click(); await page.waitForTimeout(1000); }
// Nudge the dial off-centre to be sure a stake is set.
const dial = page.getByRole("slider").first();
if (await dial.count()) {
  await dial.focus();
  for (let i = 0; i < 6; i++) { await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(60); }
}
await page.waitForTimeout(500);

const label = await page.getByText(/Possible winnings/i).count();
ok("estimate label 'Possible winnings' present", label >= 1, `count=${label}`);
const disc = await page.getByText(/Estimate only/i).count();
ok("estimate disclaimer present", disc >= 1, `count=${disc}`);

for (const w of [360, 768, 1280]) {
  await page.setViewportSize({ width: w, height: 1100 });
  await page.waitForTimeout(200);
  const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`no horizontal overflow @${w}w`, of <= 1, `overflow=${of}px`);
  await page.screenshot({ path: `.50pick-shots/jay-player-estimate-${w}.png`, fullPage: false });
}

ok("no console errors", errs.length === 0, errs.slice(0, 3).join(" | "));

await browser.close();
console.log(`\njay-player-estimate-shots: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
