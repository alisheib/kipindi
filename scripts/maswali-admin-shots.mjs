/**
 * qa:maswali-admin-shots — the Millionea console at 360 / 768 / 1280 / 1920 (MASWALI-BUILD S4 acceptance).
 *
 *   BASE=http://localhost:3410 node scripts/maswali-admin-shots.mjs     (a FRESH in-memory `next dev`, 2FA off,
 *                                                                        started with FEATURE_MILLIONEA=ACTIVE: the seed
 *                                                                        sells, and the ticket arm reads the real rollout)
 *
 * Signs in as the Owner (`/api/dev-test/seed-admin`), seeds one week in each state (`/api/dev-test/seed-maswali`), then
 * opens every console page at four widths: no console error, no horizontal overflow, the page's own heading on screen,
 * and a viewport tile per width in `.50pick-shots/maswali/` — tiles, never full-page captures, to be read one by one.
 * ⛔ Localhost only (`next dev` on 127.0.0.1 never hydrates on this machine).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3410";
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) { console.error("refusing: BASE must be a localhost dev server"); process.exit(2); }
const OUT = ".50pick-shots/maswali";
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.setDefaultNavigationTimeout(180000);
page.setDefaultTimeout(30000);
const errs = [];
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push(String(e)));

const admin = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000000" } });
ok("signed in as the Owner", admin.ok(), `${admin.status()}`);
const seed = await ctx.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300000 });
const seeded = await seed.json().catch(() => ({}));
ok("seeded a week in every state", seed.ok() && seeded.ok === true, JSON.stringify(seeded).slice(0, 300));
const w = seeded.weeks ?? {};

const PAGES = [
  ["weeks", "/admin/maswali", /Millionea/],
  ["new", "/admin/maswali/new", /Draft a week/],
  ["week-settled", `/admin/maswali/${w.settled}`, /MLN-/],
  ["week-ready", `/admin/maswali/${w.ready}`, /Seal the results/],
  ["week-selling", `/admin/maswali/${w.selling}`, /Move the sales close/],
  ["week-draft", `/admin/maswali/${w.draft}`, /Before it can open/],
  ["edit", `/admin/maswali/${w.draft}/edit`, /Edit MLN-/],
  ["pools", "/admin/maswali/pools", /Millionea · Pools/],
  ["integrity", "/admin/maswali/integrity", /Millionea · Integrity/],
];

for (const [name, path, heading] of PAGES) {
  errs.length = 0;
  await page.setViewportSize({ width: 1280, height: 900 });
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  ok(`${name} · answers 200`, res?.status() === 200, `${res?.status()}`);
  ok(`${name} · shows its heading`, (await page.getByText(heading).count()) > 0);
  for (const width of [360, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`${name} · no horizontal overflow @${width}`, over <= 1, `overflow=${over}px`);
    await page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: false });
  }
  ok(`${name} · no console error`, errs.length === 0, errs.slice(0, 3).join(" | "));
}

await browser.close();
console.log(`\nmaswali-admin-shots: ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
