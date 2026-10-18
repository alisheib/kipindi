/**
 * qa:maswali-player-shots — the player's Millionea at 320 / 360 / 768 / 1280 / 1920 in English, Swahili and Chinese
 * (MASWALI-BUILD S5 acceptance; the composition brief's item 7; MASWALI-PLAN §7b S5).
 *
 *   BASE=http://localhost:3410 node scripts/maswali-player-shots.mjs
 *
 * ⚠️ PREMISE — the drive's (`scripts/maswali-player-drive.mjs`): a FRESH in-memory `next dev` with
 *    FEATURE_MILLIONEA=ACTIVE, DISABLE_ADMIN_TOTP=true and the journey previewable. It seeds the weeks itself on a fresh
 *    server, or reads the ones a drive already seeded; the demo player cuts one ticket through the slip when it holds none.
 *
 * Every Millionea page (the hub, the slip, How to play, the register and one week of it, Tiketi zangu's list and one
 * ticket) and both card doors (the classic board, and the journey home with a staff pass) at five widths in three
 * languages — Swahili's are the longest strings — each: answered 200, no horizontal overflow, no page error, and a
 * viewport tile in `.50pick-shots/maswali-player-shots/` (tiles, never full-page captures, read one by one).
 * Rectangles asserted, not eyeballed: at 360 the hub's jackpot figure stands above the fold, and on the slip at 320,
 * 360 and 768 the pay control is on screen without a scroll (the rail docks above the tabs).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3410";
const OUT = ".50pick-shots/maswali-player-shots";
const WIDTHS = [320, 360, 768, 1280, 1920];
const LOCALES = ["en", "sw", "zh"];
const HEIGHT = 780;

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const die = (why) => { console.error(`\nPREMISE ABSENT — ${why}\n`); process.exit(2); };

const pre = await premise(BASE);
if (pre.refuse) die(pre.refuse);
const ml = pre.health?.millionea;
if (!ml || ml.state !== "ACTIVE") die(`/api/health says millionea = ${JSON.stringify(ml)}: start next dev with FEATURE_MILLIONEA=ACTIVE`);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errs = [];
async function contextWith(cookies, locale) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: HEIGHT } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
  return ctx;
}
async function open(page, path) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  return res;
}

// The weeks: seeded here on a fresh server, or a drive's already there (the seed answers 409 then).
const owner = await browser.newContext();
await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000091", name: "Millionea Owner" }, timeout: 240_000 });
const seed = await owner.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
ok("the weeks are seeded (or were, by a drive)", seed.ok() || seed.status() === 409, `${seed.status()}`);
await owner.close();

// The player, with one ticket to show.
const session = await demoSession(browser, BASE, { query: "?deposit=0", balance: 50_000 });
const setup = await contextWith([session], "en");
const sp = await setup.newPage();
await open(sp, "/millionea/tickets");
let serial = ((await sp.locator('[data-testid="millionea-tickets"] li').first().textContent().catch(() => "")) ?? "").match(/MLN-[A-Z0-9-]+|[0-9]{3,}/)?.[0] ?? null;
if (!serial) {
  await open(sp, "/millionea/slip");
  const groups = sp.getByRole("radiogroup");
  for (let i = 0; i < (await groups.count()); i++) await groups.nth(i).getByRole("radio").first().click();
  await sp.locator("button:visible", { hasText: "Continue" }).first().click();
  await sp.getByRole("button", { name: /^Cut ticket/ }).click();
  const view = sp.getByRole("button", { name: "View ticket" });
  await view.waitFor({ timeout: 120_000 });
  await Promise.all([sp.waitForURL(/\/millionea\/tickets\/[^/]+$/, { timeout: 120_000 }), view.click()]);
  serial = decodeURIComponent(sp.url().split("/").pop() ?? "");
}
ok("the demo player holds a ticket to show", !!serial, String(serial));
await open(sp, "/millionea/register");
const weekHref = await sp.locator('a[href^="/millionea/register/"]').first().getAttribute("href").catch(() => null);
ok("the register lists a week to open", !!weekHref, String(weekHref));
await setup.close();

const PAGES = [
  ["hub", "/millionea"],
  ["slip", "/millionea/slip"],
  ["how", "/millionea/how"],
  ["register", "/millionea/register"],
  ...(weekHref ? [["register-week", weekHref]] : []),
  ["tickets", "/millionea/tickets"],
  ...(serial ? [["ticket", `/millionea/tickets/${encodeURIComponent(serial)}`]] : []),
  ["markets-card", "/markets"],
];

for (const locale of LOCALES) {
  const fresh = await demoSession(browser, BASE);
  const ctx = await contextWith([fresh], locale);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(`${locale}: ${e}`));
  for (const [name, path] of PAGES) {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: HEIGHT });
      const res = await open(page, path);
      ok(`${name} · ${locale} @${width} · answers 200`, res?.status() === 200, `${res?.status()}`);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`${name} · ${locale} @${width} · no horizontal overflow`, over <= 1, `overflow=${over}px`);
      if (name === "hub" && width === 360) {
        const fig = await page.getByTestId("millionea-hub-pool").boundingBox().catch(() => null);
        ok(`hub · ${locale} @360 · the jackpot figure stands above the fold`, !!fig && fig.y < HEIGHT, JSON.stringify(fig));
      }
      if (name === "slip" && width <= 768) {
        const pay = page.locator("button:visible", { hasText: /Continue|Answer all|Endelea|Jibu|继续|回答/ }).last();
        const box = await pay.boundingBox().catch(() => null);
        ok(`slip · ${locale} @${width} · the pay control is on screen without a scroll`, !!box && box.y >= 0 && box.y + box.height <= HEIGHT, JSON.stringify(box));
      }
      if (name === "markets-card") ok(`markets · ${locale} @${width} · the card stands at the board's head`, (await page.getByTestId("millionea-home-card").count()) === 1);
      await page.screenshot({ path: `${OUT}/${name}-${locale}-${width}.png`, fullPage: false });
    }
  }
  await ctx.close();
}

// The journey home's card, with a staff preview pass beside the player.
const passCookie = await mintStaffPass(browser, BASE);
for (const locale of LOCALES) {
  const ctx = await contextWith([await demoSession(browser, BASE), passCookie], locale);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(`${locale} journey: ${e}`));
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: HEIGHT });
    const res = await open(page, "/");
    ok(`journey home · ${locale} @${width} · answers 200`, res?.status() === 200, `${res?.status()}`);
    ok(`journey home · ${locale} @${width} · the card stands after the head`, (await page.getByTestId("millionea-home-card").count()) === 1);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`journey home · ${locale} @${width} · no horizontal overflow`, over <= 1, `overflow=${over}px`);
    await page.screenshot({ path: `${OUT}/journey-home-${locale}-${width}.png`, fullPage: false });
  }
  await ctx.close();
}

ok("no page error on any page", errs.length === 0, errs.slice(0, 3).join(" | "));
await browser.close();
console.log(`\nmaswali-player-shots: ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
