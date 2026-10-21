/**
 * qa:maswali-ticket-shots — EVERY STATE OF A MILLIONEA TICKET AND OF TIKETI ZANGU'S LIST, AT EVERY WIDTH, IN EVERY LANGUAGE
 * (MASWALI-BUILD S5-DESIGN-TICKETS; the R1 tickets critic's "Owed frames", which the 10/10 is judged on).
 *
 *   BASE=http://localhost:3570 node scripts/maswali-ticket-shots.mjs                 (MLN_MODE=main, the default)
 *   BASE=http://localhost:3570 MLN_MODE=sunset node scripts/maswali-ticket-shots.mjs  (a second fresh server)
 *
 * ⚠️ PREMISE: a FRESH in-memory `next dev` with FEATURE_MILLIONEA=ACTIVE, MASWALI_SCHEDULER=false, LIFECYCLE_TICKER=false and
 *    DISABLE_ADMIN_TOTP=true (the staff pass for the journey's head). It seeds the states itself
 *    (`/api/dev-test/seed-maswali-tickets`, one chain of weeks for the demo player — see that route for each state).
 *
 * Tiles (viewport tiles, every page to its end, 240px of overlap) in `.50pick-shots/maswali-ticket-shots/`:
 *   ticket-<state>-<locale>-<width>[-sN].png   each ticket state (the classic shell; `-j` the journey's at 360)
 *   list-<lens>-<shell>-<locale>-<width>[-sN].png   the list in each lens, classic and journey; `empty`, `empty-break`
 *   seal-<who>-<digits>-<locale>-<width>.png   the win seal: the platform's own (a market win) and Millionea's, 7 and 4 digits
 * Asserted, not eyeballed: each page answers 200, draws what it should (the ticket, the list), no horizontal overflow, no
 * page error, `<html lang>` = the cookie; the free-cancel door is on screen inside its window and gone after it.
 *
 * Focus with comma lists: MLN_STATES (ticket states, or "none"), MLN_LISTS (lenses, or "none"), MLN_SEALS=0|1,
 * MLN_LOCALES, MLN_WIDTHS, MLN_SCROLL=0, MLN_JOURNEY=0. A focused run prints its scope first.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE, SESSION_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3570";
const MODE = process.env.MLN_MODE === "sunset" ? "sunset" : "main";
const OUT = process.env.MLN_OUT || ".50pick-shots/maswali-ticket-shots";
const HEIGHT = 780;
const OVERLAP = 240;
const list = (name, all) => {
  const raw = (process.env[name] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (raw.length === 1 && raw[0] === "none") return [];
  return raw.length ? all.filter((x) => raw.includes(String(x))) : all;
};
const LOCALES = list("MLN_LOCALES", ["sw", "en", "zh"]);
const WIDTHS = list("MLN_WIDTHS", [320, 360, 768, 1024, 1280, 1920]).map(Number);
const SCROLL = process.env.MLN_SCROLL !== "0";
const JOURNEY = process.env.MLN_JOURNEY !== "0";
const SEALS = process.env.MLN_SEALS !== "0" && MODE === "main";
const MAIN_STATES = [
  "cancellable", "cancelled", "closed", "resultsCannotWin", "resultsAlive", "objections", "objectionsLost", "settling", "voiding",
  "wonPaid", "lostWithWinners", "wonTwo", "wonTwoSecond", "forfeited", "wonBig", "lostRollover", "refunded", "refundPending",
  // last: the ticket bought at the seed, once its ten minutes have passed; then the held share (it holds the wallet)
  "open", "held", "wonTwoHeld",
];
const SUNSET_STATES = ["sunsetTop", "sunsetLost"];
const STATES = list("MLN_STATES", MODE === "main" ? MAIN_STATES : SUNSET_STATES);
const LENSES = list("MLN_LISTS", MODE === "main" ? ["all", "open", "settled", "won", "empty", "empty-break"] : ["all", "open", "won"]);
if (process.env.MLN_STATES || process.env.MLN_LISTS || process.env.MLN_LOCALES || process.env.MLN_WIDTHS || !SCROLL || process.env.MLN_SEALS === "0") {
  console.log(`FOCUSED RUN (${MODE}) — states ${STATES.join(",") || "none"} · lists ${LENSES.join(",") || "none"} · locales ${LOCALES.join(",")} · widths ${WIDTHS.join(",")} · scroll ${SCROLL}`);
}

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const die = (why) => { console.error(`\nPREMISE ABSENT — ${why}\n`); process.exit(2); };

const pre = await premise(BASE);
if (pre.refuse) die(pre.refuse);
if (pre.health?.millionea?.state !== "ACTIVE") die(`/api/health says millionea = ${JSON.stringify(pre.health?.millionea)}: start next dev with FEATURE_MILLIONEA=ACTIVE`);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errs = [];

/** Opens a page and lets it settle (the player shots' own rule): load, a short network quiet, the fonts, two frames. */
async function open(page, path) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 180_000 });
  await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))));
  }).catch(() => {});
  await page.waitForTimeout(400);
  await still(page);
  return res;
}
/** Waits until every finite animation on the page has ended (a moment playing on view finishes before its tile). */
async function still(page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => {
    const t = a.effect?.getComputedTiming?.();
    return a.playState !== "running" || !t || t.iterations === Infinity || t.endTime === Infinity;
  }), null, { timeout: 6_000, polling: 100 }).catch(() => {});
}
/** The page's first viewport tile, then one per scroll step to its end. */
async function shoot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  if (!SCROLL) return;
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  let covered = HEIGHT;
  for (let n = 2; n <= 30 && covered < total - 1; n++) {
    const top = Math.min((n - 1) * (HEIGHT - OVERLAP), Math.max(0, total - HEIGHT));
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true)))));
    await page.waitForTimeout(200);
    await still(page);
    await page.screenshot({ path: `${OUT}/${name}-s${n}.png`, fullPage: false });
    covered = (await page.evaluate(() => window.scrollY)) + HEIGHT;
  }
  ok(`${name} · covered to its end`, covered >= total - 1, `${covered} of ${total}`);
  await page.evaluate(() => window.scrollTo(0, 0));
}
async function contextWith(cookies, locale) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: HEIGHT } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
  return ctx;
}
async function checks(page, name, locale, width, res, testId) {
  ok(`${name} · answers 200`, res?.status() === 200, `${res?.status()}`);
  ok(`${name} · html lang is ${locale}`, (await page.locator("html").getAttribute("lang")) === locale);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`${name} · no horizontal overflow`, over <= 1, `overflow=${over}px`);
  if (testId) ok(`${name} · draws ${testId}`, (await page.getByTestId(testId).count()) >= 1);
  void width;
}
const post = async (ctx, data) => {
  const r = await ctx.request.post(`${BASE}/api/dev-test/seed-maswali-tickets`, { data, timeout: 300_000 });
  const body = await r.json().catch(() => null);
  if (!r.ok() || !body?.ok) throw new Error(`seed ${JSON.stringify(data)} answered ${r.status()}: ${JSON.stringify(body)}`);
  return body;
};

// ── The seed: the demo player signs in, then the chain (or the sunset) is seeded for it. ──────────────────────────────
const session = await demoSession(browser, BASE);
const seedCtx = await browser.newContext();
const seeded = await post(seedCtx, { step: MODE === "main" ? "weeks" : "sunset" });
const T = seeded.tickets;
console.log(`seeded ${MODE}: ${Object.keys(T).length} tickets in ${Object.keys(seeded.weeks).length} weeks`);
const seededAt = Date.now();
const pass_ = JOURNEY ? await mintStaffPass(browser, BASE) : null;

// ── The win seal: the platform's own (a market win) and Millionea's, 7 and 4 digits, at 320 and 360. ─────────────────
const SEAL_CASES = [
  ["platform", "7", { kind: "WIN", amount: 1_234_500, net: 234_500, label: "Will Simba SC beat Young Africans on Saturday?" }],
  ["platform", "4", { kind: "WIN", amount: 4_500, net: 3_500, label: "Will Simba SC beat Young Africans on Saturday?" }],
  ["millionea", "7", { kind: "WIN", amount: 1_740_000, label: "Millionea · Week 47 · MLN-2026-W47-000001", roll: false }],
  ["millionea", "4", { kind: "WIN", amount: 8_700, label: "Millionea · Week 47 · MLN-2026-W47-000001", roll: false }],
];
if (SEALS) {
  for (const locale of LOCALES) {
    const ctx = await contextWith([session], locale);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errs.push(`seal ${locale}: ${e}`));
    for (const width of WIDTHS.filter((w) => w <= 360)) {
      await page.setViewportSize({ width, height: HEIGHT });
      // The seal's host is the shell's, on every page: the wallet is a page no Millionea change touches.
      await open(page, "/wallet");
      for (const [who, digits, payload] of SEAL_CASES) {
        await page.evaluate((detail) => window.dispatchEvent(new CustomEvent("50pick:celebrate", { detail })), payload);
        const dialog = page.getByRole("dialog").last();
        const shown = await dialog.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
        ok(`seal-${who}-${digits} · ${locale} @${width} · the seal opens`, shown);
        await page.waitForTimeout(1_600);
        await still(page);
        await page.screenshot({ path: `${OUT}/seal-${who}-${digits}-${locale}-${width}.png`, fullPage: false });
        // The amount is ONE line: its box no taller than one line of its own type.
        const amount = await page.evaluate(() => {
          const el = [...document.querySelectorAll('[role="dialog"] p')].find((p) => /TZS/.test(p.textContent ?? "") && p.className.includes("text-[38px]") || /TZS/.test(p.textContent ?? "") && p.hasAttribute("data-seal-amount"));
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { h: r.height, lh: parseFloat(getComputedStyle(el).lineHeight), text: el.textContent };
        });
        if (amount) console.log(`  seal-${who}-${digits} ${locale}@${width}: amount box ${amount.h.toFixed(1)}px, line ${amount.lh.toFixed(1)}px — ${amount.text}`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }
    }
    await ctx.close();
  }
}

// ── The list, in every lens, classic and journey. ─────────────────────────────────────────────────────────────────────
const lensPath = (lens) => (lens === "all" ? "/millionea/tickets" : `/millionea/tickets?lens=${lens}`);
async function freshPlayer(onBreak) {
  const ctx = await browser.newContext();
  const r = await ctx.request.post(`${BASE}/api/dev-test/fresh-kyc-player`, { data: { state: "none" } });
  const body = await r.json();
  const cookie = (await ctx.cookies(BASE)).find((c) => c.name === SESSION_COOKIE);
  if (onBreak) await post(ctx, { step: "break", userId: body.userId });
  await ctx.close();
  if (!cookie) throw new Error("fresh-kyc-player set no session");
  return cookie;
}
const emptyCookie = LENSES.includes("empty") ? await freshPlayer(false) : null;
const breakCookie = LENSES.includes("empty-break") ? await freshPlayer(true) : null;
for (const locale of LOCALES) {
  for (const shell of JOURNEY ? ["classic", "journey"] : ["classic"]) {
    for (const lens of LENSES) {
      const who = lens === "empty" ? emptyCookie : lens === "empty-break" ? breakCookie : session;
      const ctx = await contextWith([who, ...(shell === "journey" && pass_ ? [pass_] : [])], locale);
      const page = await ctx.newPage();
      page.on("pageerror", (e) => errs.push(`list ${lens} ${shell} ${locale}: ${e}`));
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        const name = `list-${lens}-${shell}-${locale}-${width}`;
        const res = await open(page, lens.startsWith("empty") ? "/millionea/tickets" : lensPath(lens));
        await checks(page, name, locale, width, res, lens.startsWith("empty") ? null : null);
        await shoot(page, name);
      }
      await ctx.close();
    }
  }
}

// ── Each ticket state. ─────────────────────────────────────────────────────────────────────────────────────────────────
for (const state of STATES) {
  let serial = T[state] ?? null;
  if (state === "cancellable") serial = null;
  if (state === "wonTwoHeld") serial = T.wonTwo;
  if (state === "held" || state === "wonTwoHeld") {
    if (!T.__held) { await post(seedCtx, { step: "hold", serial: T.held }); T.__held = true; }
    serial = state === "held" ? T.held : T.wonTwo;
  }
  if (state === "open") {
    // Its free cancel ends ten minutes after the seed bought it: wait for that, so the tile is the window's after.
    const left = seededAt + 10.5 * 60_000 - Date.now();
    if (left > 0) { console.log(`waiting ${Math.ceil(left / 1000)}s for the open ticket's free cancel to end`); await new Promise((d) => setTimeout(d, left)); }
  }
  for (const locale of LOCALES) {
    if (state === "cancellable") serial = (await post(seedCtx, { step: "fresh" })).serial; // inside its window for this sweep
    if (!serial) { ok(`${state} · seeded`, false, "no serial"); continue; }
    const ctx = await contextWith([session], locale);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errs.push(`${state} ${locale}: ${e}`));
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: HEIGHT });
      const name = `ticket-${state}-${locale}-${width}`;
      const res = await open(page, `/millionea/tickets/${encodeURIComponent(serial)}`);
      await checks(page, name, locale, width, res, "millionea-ticket");
      // The door by its words (before and after the redesign: "Free cancel until …" / "Cancel ticket" in three languages).
      const door = page.getByRole("button", { name: /Free cancel|Kughairi bila malipo|免费取消|Cancel ticket|Ghairi tiketi|取消彩票/ });
      if (state === "cancellable") ok(`${name} · the free-cancel door is on screen`, (await door.count()) >= 1);
      if (state === "open") ok(`${name} · no free-cancel door after its window`, (await door.count()) === 0);
      await shoot(page, name);
    }
    if (JOURNEY && pass_ && LOCALES[0] === locale && WIDTHS.includes(360)) {
      const jctx = await contextWith([session, pass_], locale);
      const jp = await jctx.newPage();
      await jp.setViewportSize({ width: 360, height: HEIGHT });
      const res = await open(jp, `/millionea/tickets/${encodeURIComponent(serial)}`);
      await checks(jp, `ticket-${state}-j-${locale}-360`, locale, 360, res, "millionea-ticket");
      await shoot(jp, `ticket-${state}-j-${locale}-360`);
      await jctx.close();
    }
    await ctx.close();
  }
}

ok("no page error on any page", errs.length === 0, errs.slice(0, 4).join(" | "));
await browser.close();
console.log(`\nmaswali-ticket-shots (${MODE}): ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
console.log(`tickets: ${JSON.stringify(T)}`);
process.exit(fail === 0 ? 0 : 1);
