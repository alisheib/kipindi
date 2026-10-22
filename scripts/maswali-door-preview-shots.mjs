/**
 * qa:maswali-door-preview — THE MILLIONEA DOORS AT STAFF_PREVIEW (MASWALI-BUILD S5-DESIGN-DOORS round 2, 2026-10-22; the
 * staff preview's one bar is S5-FIX-PLATFORM D12's).
 *
 *   A FRESH in-memory `next dev` with FEATURE_MILLIONEA=STAFF_PREVIEW and DISABLE_ADMIN_TOTP=true, then:
 *   BASE=http://localhost:3530 node scripts/maswali-door-preview-shots.mjs
 *   (MASWALI_SHOTS_LOCALES=sw,en / MASWALI_SHOTS_WIDTHS=360,1280 narrow it — a focused run.)
 *
 * The seed is asked for weeks (`/api/dev-test/seed-maswali`, dev only) and refuses on this server (409: a preview does not
 * sell), so the doors are drawn with no week — the real card is the next week's presale, /results' section its empty state;
 * a staff session is signed in (`seed-admin`) and the journey's own pass held beside it on "/" (`mintStaffPass`, as the
 * doors' drive holds it). What it checks and shoots is
 * `shootDoorPreview` (scripts/lib/maswali-door-shots.mjs): the real card's preview chip and no bar on "/" and /markets, H1 at
 * STAFF_PREVIEW against every loading picture (the root loading's "/" included, which knows no preview), and /results under
 * D12's bar. Tiles: .50pick-shots/maswali-door-preview/. The player's ACTIVE pages are `qa:maswali-player-shots`'.
 * Read-only on the site but for the dev endpoints that seed the weeks and the staff accounts.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { premise, mintStaffPass, LOCALE_COOKIE } from "./live/journey-pass.mjs";
import { shootDoorPreview } from "./lib/maswali-door-shots.mjs";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = ".50pick-shots/maswali-door-preview";
const ALL_WIDTHS = [320, 360, 768, 1024, 1280, 1920];
const ALL_LOCALES = ["sw", "en", "zh"];
const pick = (env, all) => (process.env[env] ? process.env[env].split(",").map((s) => s.trim()).filter((s) => all.map(String).includes(s)) : all.map(String));
const WIDTHS = pick("MASWALI_SHOTS_WIDTHS", ALL_WIDTHS).map(Number);
const LOCALES = pick("MASWALI_SHOTS_LOCALES", ALL_LOCALES);
const HEIGHT = 780;

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const die = (why) => { console.error(`\nPREMISE ABSENT — ${why}\n`); process.exit(2); };

const pre = await premise(BASE);
if (pre.refuse) die(pre.refuse);
const ml = pre.health?.millionea;
if (!ml || ml.state !== "STAFF_PREVIEW") die(`/api/health says millionea = ${JSON.stringify(ml)}: start next dev with FEATURE_MILLIONEA=STAFF_PREVIEW`);
mkdirSync(OUT, { recursive: true });
if (WIDTHS.length < ALL_WIDTHS.length || LOCALES.length < ALL_LOCALES.length) console.log(`FOCUSED RUN — locales ${LOCALES.join(",")} · widths ${WIDTHS.join(",")}`);

const browser = await chromium.launch();
try {
  async function contextWith(cookies, locale) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: HEIGHT } });
    await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
    return ctx;
  }
  /** The page settled as the player shots settle it: load, a short network quiet, the webfonts, two frames and a beat. */
  async function open(page, path) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 180_000 });
    await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))));
    }).catch(() => {});
    await page.waitForTimeout(500);
    return res;
  }
  /** A staff session's cookies (an ADMIN seeded and signed in by the dev endpoint), read from a throwaway context. */
  async function staffCookies() {
    const ctx = await browser.newContext();
    try {
      const seeded = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: {}, timeout: 240_000 });
      ok("PREMISE · a staff session (seed-admin)", seeded.ok(), `${seeded.status()}`);
      return await ctx.cookies(BASE);
    } finally {
      await ctx.close().catch(() => {});
    }
  }

  // The weeks: ⚠️ the seed refuses on a STAFF_PREVIEW server (409 — its ticket arm reads the real rollout, and a preview
  // does not sell), so this pass draws the doors with no week: the real card is the next week's presale, /results' section
  // its empty state. The H1 comparisons set the preview card itself (the fixture's), so they hold whatever the store holds.
  const owner = await browser.newContext();
  await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000091", name: "Millionea Owner" }, timeout: 240_000 });
  const seed = await owner.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
  console.log(`weeks: the seed answered ${seed.status()}${seed.status() === 409 ? " (a preview does not sell: the doors are drawn with no week)" : ""}`);
  await owner.close();

  await shootDoorPreview({ browser, BASE, OUT, WIDTHS, LOCALES, HEIGHT, ok, open, contextWith, mintStaffPass, staffCookies });
} finally {
  await browser.close();
}
console.log(`maswali-door-preview: ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
