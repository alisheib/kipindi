/**
 * qa:maswali-player-shots — the player's Millionea at 320 / 360 / 768 / 1024 / 1280 / 1920 in English, Swahili and
 * Chinese, every page shot down to its end (MASWALI-BUILD S5 acceptance; the composition brief's item 7; MASWALI-PLAN §7b S5).
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
/** A focused re-shoot of what a fix touched (the full run is the default and the acceptance): comma lists in
 *  MASWALI_SHOTS_PAGES (the page names below, plus "journey-home"), MASWALI_SHOTS_LOCALES and MASWALI_SHOTS_WIDTHS. A
 *  focused run prints its scope first, so it can never be mistaken for the full one. */
const only = (name, all) => {
  const raw = (process.env[name] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return raw.length ? all.filter((x) => raw.includes(String(x))) : all;
};
// ⭐ 1024 TOO (the lead, 2026-10-19): the lg breakpoint, where the classic top bar replaces the phone rail and the
// register's week switches from cards to its table — the five platform widths alone never shot that switch.
const WIDTHS = only("MASWALI_SHOTS_WIDTHS", [320, 360, 768, 1024, 1280, 1920]);
/** ⭐ THE WHOLE PAGE, NOT ITS FIRST SCREEN (the lead, 2026-10-19, after the tile read): a page longer than the viewport is
 *  shot again at each scroll step (`<name>-<locale>-<width>-s2.png`, -s3 …), 240px of overlap between steps so fixed top
 *  and bottom bars cannot hide a strip between tiles — viewport tiles, never a full-page capture.
 *  The two card doors (`markets-card`, `journey-home`) are about the card at their head, so they keep one screen.
 *  MASWALI_SHOTS_SCROLL=0 turns it off for a quick focused run. */
const SCROLL = process.env.MASWALI_SHOTS_SCROLL !== "0";
const SCROLL_PAGES = new Set(["hub", "slip", "how", "register", "register-week", "tickets", "ticket"]);
const OVERLAP = 240;
const MAX_STEPS = 24;
async function shootScrolled(page, name, locale, width) {
  if (!SCROLL || !SCROLL_PAGES.has(name)) return;
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  let coveredBottom = HEIGHT;
  for (let n = 2; n <= MAX_STEPS && coveredBottom < total - 1; n++) {
    const top = Math.min((n - 1) * (HEIGHT - OVERLAP), Math.max(0, total - HEIGHT));
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true)))));
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/${name}-${locale}-${width}-s${n}.png`, fullPage: false });
    coveredBottom = (await page.evaluate(() => window.scrollY)) + HEIGHT;
  }
  if (coveredBottom < total - 1) throw new Error(`${name} · ${locale} @${width}: full page was not covered by ${MAX_STEPS} viewport tiles`);
  await page.evaluate(() => window.scrollTo(0, 0));
}
const LOCALES = only("MASWALI_SHOTS_LOCALES", ["en", "sw", "zh"]);
const PAGE_FILTER = (process.env.MASWALI_SHOTS_PAGES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const wantPage = (name) => PAGE_FILTER.length === 0 || PAGE_FILTER.includes(name);
if (PAGE_FILTER.length || WIDTHS.length < 6 || LOCALES.length < 3 || !SCROLL) {
  console.log(`FOCUSED RUN — pages ${PAGE_FILTER.join(",") || "all"} · locales ${LOCALES.join(",")} · widths ${WIDTHS.join(",")} (not the acceptance run)`);
}
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
/** Opens a page and lets it settle before it is measured and shot: the load event, the network quiet for a beat (a
 *  signed-in page polls, so "networkidle" may never come — it is waited for 2s at most, never the 60s that made one
 *  run of 135 tiles take hours on OMEGA, 2026-10-19), the webfonts, two frames, and a short beat for the effects that
 *  commit after hydration (the balance capsule's mask lifts in its first render after hydration — journey-header-fit). */
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
async function verifyLocale(page, locale, name, width) {
  const rendered = await page.locator("html").getAttribute("lang");
  ok(`${name} · ${locale} @${width} · html language matches the cookie`, rendered === locale, `lang=${rendered}`);
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
// The serial from the first card's own link — the address the card opens — never from its text: the card reads its stake
// ("TZS 1,000") before its serial, so a digit-run match took "000" and every ticket tile shot a 404 (the first OMEGA read,
// 2026-10-19). The ticket tile below also asserts its page draws the ticket, so a wrong address can never pass again.
const firstHref = await sp.locator('[data-testid="millionea-tickets"] li a[href^="/millionea/tickets/"]').first().getAttribute("href").catch(() => null);
let serial = firstHref ? decodeURIComponent(firstHref.split("/").pop() ?? "") || null : null;
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
].filter(([name]) => wantPage(name));

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
      // Every page is itself, never the not-found page (its eyebrow reads "404 · …" in every language), and the ticket
      // page draws the ticket — a tile of the wrong page must fail here, not reach the reader.
      ok(`${name} · ${locale} @${width} · not the not-found page`, (await page.getByText(/^404 · /).count()) === 0);
      if (name === "ticket") ok(`ticket · ${locale} @${width} · the page draws the ticket`, (await page.getByTestId("millionea-ticket").count()) === 1);
      await verifyLocale(page, locale, name, width);
      await page.screenshot({ path: `${OUT}/${name}-${locale}-${width}.png`, fullPage: false });
      await shootScrolled(page, name, locale, width);
    }
  }
  await ctx.close();
}

// The journey home's card, with a staff preview pass beside the player.
const passCookie = wantPage("journey-home") ? await mintStaffPass(browser, BASE) : null;
for (const locale of passCookie ? LOCALES : []) {
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
    await verifyLocale(page, locale, "journey home", width);
    await page.screenshot({ path: `${OUT}/journey-home-${locale}-${width}.png`, fullPage: false });
  }
  await ctx.close();
}

ok("no page error on any page", errs.length === 0, errs.slice(0, 3).join(" | "));
await browser.close();
console.log(`\nmaswali-player-shots: ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
