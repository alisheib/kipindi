/**
 * qa:maswali-slip-shots — EVERY STATE OF THE SLIP, its confirm and its stamp (MASWALI-BUILD S5-DESIGN-SLIP; Ali 2026-10-21:
 * "move it to 10/10"), at 320 · 360 · 768 · 1024 · 1280 · 1920 in Swahili, English and Chinese — viewport tiles in
 * `.50pick-shots/maswali-slip-shots/<state>-<locale>-<width>[-sN].png`, read one by one.
 *
 *   BASE=http://localhost:<port> node scripts/maswali-slip-shots.mjs
 *
 * ⚠️ PREMISE: a FRESH in-memory `next dev` with FEATURE_MILLIONEA=ACTIVE and DISABLE_ADMIN_TOTP=true (MASWALI_SCHEDULER=false
 *    and LIFECYCLE_TICKER=false keep the seeded weeks still), FIRST on it: the no-week state is drawn before any week is
 *    seeded (MASWALI_SLIP_ONLY=noweek draws that state alone). The run ends on the demo player's break: one run per server.
 * The states the critics listed as owed, each set up through the product (the tab's kept draft, the player's own presses,
 * the dev routes' product services): no week · empty (the whole page) · partial · refusal · ready · two tickets · "finish
 * ticket 2" · two tickets armed · the remove confirm · the confirm (single, at 360×640 and 320×568 too, two tickets folded
 * and open, short of main balance) · in flight · the stamp (single, two tickets) · the loading ghost · the cap reached · a
 * staff account · the journey shell's rail and confirm · the last hour and sales closing while the player looks (the whole
 * slip after it, and an open confirm), on the browser's clock (§7 says why) · a break. MASWALI_SLIP_LOCALES /
 * MASWALI_SLIP_WIDTHS narrow a run (printed first).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { premise, mintStaffPass, demoSession, DEMO_PHONE, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3560";
const OUT = ".50pick-shots/maswali-slip-shots";
const only = (name, all) => {
  const raw = (process.env[name] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return raw.length ? all.filter((x) => raw.includes(String(x))) : all;
};
const LOCALES = only("MASWALI_SLIP_LOCALES", ["sw", "en", "zh"]);
const WIDTHS = only("MASWALI_SLIP_WIDTHS", [320, 360, 768, 1024, 1280, 1920]).map(Number);
const HEIGHT = 780;
if (LOCALES.length < 3 || WIDTHS.length < 6) console.log(`FOCUSED RUN — locales ${LOCALES.join(",")} · widths ${WIDTHS.join(",")}`);

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const T0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s]`, ...a);
const pre = await premise(BASE);
if (pre.refuse) { console.error(`PREMISE ABSENT — ${pre.refuse}`); process.exit(2); }
if (pre.health?.millionea?.state !== "ACTIVE") { console.error("PREMISE ABSENT — start next dev with FEATURE_MILLIONEA=ACTIVE"); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const errs = [];

async function ctxFor(cookies, { width = 360, height = HEIGHT, locale = "sw" } = {}) {
  const touch = width < 1024;
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch, colorScheme: "dark" });
  // The dev server's own indicator ("N", bottom left) is no part of the page: hidden, as the motion critic's capture hid it.
  await ctx.addInitScript(() => {
    const hide = () => { const s = document.createElement("style"); s.textContent = "nextjs-portal{display:none!important}"; document.documentElement.appendChild(s); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hide); else hide();
  });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
  return ctx;
}
async function settle(page, ms = 450) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const once = document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity);
    await Promise.race([Promise.all(once.map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 2500))]);
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))));
  }).catch(() => {});
  await page.waitForTimeout(ms);
}
/** The slip's answers are React's own: the first radio carries React's props (its onClick). */
async function hydrated(page) {
  await page.waitForFunction(() => {
    if (document.querySelector('[data-testid="millionea-slip-none"]')) return true;
    const radio = document.querySelector('[data-testid="millionea-slip"] [role="radio"]');
    return !!radio && Object.keys(radio).some((k) => k.startsWith("__reactProps$"));
  }, null, { timeout: 180_000 });
  await settle(page, 300);
}
async function open(page, path) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 240_000 });
  await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});
  return res;
}
async function openSlip(page, draft = null) {
  await open(page, "/millionea/slip");
  await hydrated(page);
  if (draft) {
    await page.evaluate(([k, v]) => {
      sessionStorage.setItem(k, v);
      // The reality check (RG, `reality-check.tsx`) times the session from the browser's clock, which §7 moves weeks on
      // to the seeded close: its last showing is set past that, or "you've been playing for 63,414 minutes" covers the
      // slip mid-shot (the motion run's close-rest still). Nothing else reads these keys.
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith("kp_session_started_at:")) sessionStorage.setItem(key.replace("kp_session_started_at:", "kp_reality_check_last:"), String(Date.now() + 120 * 86_400_000));
      }
    }, [`kp-millionea-slip:${WEEK}`, JSON.stringify(draft)]);
    await page.reload({ waitUntil: "load" });
    await hydrated(page);
  } else {
    await page.evaluate(() => { for (const k of Object.keys(sessionStorage)) if (k.startsWith("kp-millionea-slip:")) sessionStorage.removeItem(k); });
  }
  await settle(page, 300);
}
const tile = (state, locale, width, suffix = "") => `${OUT}/${state}-${locale}-${width}${suffix}.png`;
async function shoot(page, state, locale, width) {
  const lang = await page.locator("html").getAttribute("lang");
  ok(`${state} · ${locale} @${width} · html language`, lang === locale, `lang=${lang}`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`${state} · ${locale} @${width} · no horizontal overflow`, over <= 1, `overflow=${over}px`);
  await page.screenshot({ path: tile(state, locale, width), fullPage: false });
}
/** The whole page, one viewport after another (240px overlap), never a full-page capture. */
async function shootPage(page, state, locale, width, height = HEIGHT) {
  await shoot(page, state, locale, width);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  let covered = height;
  for (let n = 2; n <= 24 && covered < total - 1; n++) {
    const top = Math.min((n - 1) * (height - 240), Math.max(0, total - height));
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(250);
    await page.screenshot({ path: tile(state, locale, width, `-s${n}`), fullPage: false });
    covered = (await page.evaluate(() => window.scrollY)) + height;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}
const devPost = async (ctx, data) => {
  const r = await ctx.request.post(`${BASE}/api/dev-test/seed-maswali-slip`, { data, timeout: 120_000 });
  const j = await r.json().catch(() => ({}));
  if (!r.ok()) log(`dev route ${JSON.stringify(data)} → ${r.status()} ${JSON.stringify(j)}`);
  return j;
};
const pay = (page) => page.locator('[data-testid="millionea-slip-pay"]:visible').first();
const sheet = (page) => page.locator('[role="dialog"]').filter({ has: page.locator('[data-testid="millionea-confirm-body"], .kp-mln-confirm') }).last();
const YES = (n) => Array.from({ length: 15 }, (_, i) => (i < n ? (i % 3 === 1 ? "NO" : "YES") : null));
const one = (n) => ({ v: 2, active: 0, slips: [YES(n)] });
const each = async (fn) => {
  for (const locale of LOCALES) for (const width of WIDTHS) {
    try { await fn(locale, width); } catch (e) { ok(`${locale} @${width}`, false, String(e?.message ?? e).split("\n")[0].slice(0, 240)); }
  }
};

// ── 0 · before any week: the slip says there is none ──────────────────────────────────────────────────────────────────
let WEEK = "";
let session = await demoSession(browser, BASE, { query: "?deposit=0", balance: 50_000 });
log("demo session (TZS 50,000)");
// MASWALI_SLIP_SKIP=noweek leaves this state to a run of its own (MASWALI_SLIP_ONLY=noweek) on the same fresh server.
if (process.env.MASWALI_SLIP_SKIP !== "noweek") await each(async (locale, width) => {
  const ctx = await ctxFor([session], { width, locale });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(`noslip ${locale}@${width}: ${e}`));
  await open(page, "/millionea/slip");
  await hydrated(page);
  ok(`noslip-noweek · ${locale} @${width} · the slip says no week is on sale, with its one way back`, (await page.getByTestId("millionea-slip-none").count()) === 1);
  await shoot(page, "noslip-noweek", locale, width);
  await ctx.close();
});
// MASWALI_SLIP_ONLY=noweek stops here, before any week is seeded (a server that ran another drive first has one on sale).
if (process.env.MASWALI_SLIP_ONLY === "noweek") {
  await browser.close();
  console.log(`\nmaswali-slip-shots (no week only): ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
  process.exit(fail === 0 ? 0 : 1);
}

// ── the weeks ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const owner = await browser.newContext();
await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000091", name: "Millionea Owner" }, timeout: 240_000 });
const seeded = await owner.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
ok("the weeks are seeded", seeded.ok() || seeded.status() === 409, String(seeded.status()));
WEEK = (await devPost(owner, {})).weekId ?? "";
ok("the selling week is read", !!WEEK, WEEK);
log(`week ${WEEK}`);
// Tickets a drive before this one bought for the demo player go back: the cap is a state this run sets itself.
await devPost(owner, { cancelFor: DEMO_PHONE });

// ── 1 · the slip at rest, answered, refused, ready; two tickets; the remove confirm ───────────────────────────────────────
await each(async (locale, width) => {
  const ctx = await ctxFor([session], { width, locale });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(`slip ${locale}@${width}: ${e}`));
  await openSlip(page);
  await shootPage(page, "empty", locale, width);
  ok(`empty · ${locale} @${width} · one ticket draws no switcher (H2)`, (await page.getByTestId("millionea-ticket-drafts").count()) === 0);
  if (width <= 768) {
    const box = await pay(page).boundingBox();
    ok(`empty · ${locale} @${width} · the pay control is on screen without a scroll`, !!box && box.y >= 0 && box.y + box.height <= HEIGHT, JSON.stringify(box));
  }
  await openSlip(page, one(9));
  await shoot(page, "partial", locale, width);
  await openSlip(page, one(12));
  await pay(page).click();
  await page.waitForTimeout(900);
  await settle(page, 200);
  ok(`refusal · ${locale} @${width} · the first unanswered question holds the focus (M8)`, (await page.evaluate(() => document.activeElement?.closest("li")?.id)) === "q-A3");
  ok(`refusal · ${locale} @${width} · one line above the pay control says which (M2)`, (await page.locator('[data-testid="millionea-slip-refusal"]:visible').count()) === 1);
  await shoot(page, "refusal", locale, width);
  await openSlip(page, one(15));
  ok(`ready · ${locale} @${width} · armed`, (await pay(page).getAttribute("data-armed")) === "true");
  await shoot(page, "ready", locale, width);
  await openSlip(page, { v: 2, active: 1, slips: [YES(15), YES(7)] });
  ok(`multi · ${locale} @${width} · the switcher under the head (H2)`, (await page.getByTestId("millionea-ticket-drafts").count()) === 1);
  await shoot(page, "multi", locale, width);
  await page.getByTestId("millionea-ticket-remove").click();
  await page.locator('[role="alertdialog"]').waitFor({ timeout: 30_000 });
  await settle(page, 300);
  await shoot(page, "remove-ask", locale, width);
  await page.keyboard.press("Escape");
  await openSlip(page, { v: 2, active: 0, slips: [YES(15), YES(7)] });
  ok(`finish · ${locale} @${width} · not armed while ticket 2 is incomplete (H3)`, (await pay(page).getAttribute("data-armed")) === null);
  await shoot(page, "finish", locale, width);
  // Both complete: the control arms with the batch's count and total, its words on one line at every width.
  await openSlip(page, { v: 2, active: 1, slips: [YES(15), YES(15)] });
  ok(`multi-ready · ${locale} @${width} · armed once every ticket is complete (H3)`, (await pay(page).getAttribute("data-armed")) === "true");
  const tall = await pay(page).evaluate((b) => Math.round(b.getBoundingClientRect().height));
  ok(`multi-ready · ${locale} @${width} · the armed words stand on one line`, tall <= 52, `height=${tall}px`);
  await shoot(page, "multi-ready", locale, width);
  await ctx.close();
});

// ── 2 · the confirm, the purchase in flight, the stamp — each purchase cancelled again (the cap is the cap's own state) ──
await each(async (locale, width) => {
  const ctx = await ctxFor([session], { width, locale });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(`confirm ${locale}@${width}: ${e}`));
  await openSlip(page, one(15));
  await pay(page).click();
  await sheet(page).waitFor({ timeout: 60_000 });
  await settle(page, 400);
  await shoot(page, "confirm", locale, width);
  const commit = page.getByTestId("millionea-confirm-commit");
  const box = await commit.boundingBox();
  ok(`confirm · ${locale} @${width} · the commit is on screen (M3)`, !!box && box.y + box.height <= HEIGHT, JSON.stringify(box));
  // In flight: the purchase answers four seconds late, so its moment can be read.
  await page.route(`${BASE}/millionea/slip`, async (route) => {
    if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 4_000));
    await route.continue();
  });
  await commit.click();
  await page.waitForTimeout(700);
  await shoot(page, "inflight", locale, width);
  const stamp = page.locator('[role="dialog"]').filter({ has: page.locator(".orm-crest") });
  await stamp.waitFor({ timeout: 120_000 });
  await page.waitForTimeout(1_100);
  await shoot(page, "stamp", locale, width);
  await page.unroute(`${BASE}/millionea/slip`);
  await devPost(owner, { cancelFor: DEMO_PHONE });
  // Two tickets: the folded review, one open, the batch stamp.
  await openSlip(page, { v: 2, active: 1, slips: [YES(15), YES(15).map((p) => (p === "YES" ? "NO" : "YES"))] });
  await pay(page).click();
  await sheet(page).waitFor({ timeout: 60_000 });
  await settle(page, 400);
  await shoot(page, "confirm-multi", locale, width);
  await sheet(page).locator("details summary").first().click();
  await page.waitForTimeout(400);
  await shoot(page, "confirm-multi-open", locale, width);
  await page.getByTestId("millionea-confirm-commit").click();
  await stamp.waitFor({ timeout: 120_000 });
  await page.waitForTimeout(1_100);
  await shoot(page, "stamp-multi", locale, width);
  await devPost(owner, { cancelFor: DEMO_PHONE });
  await ctx.close();
});
// The confirm on the short phones the fit rule is for (M3): 360×640 and 320×568.
for (const [w, hgt] of [[360, 640], [320, 568]]) for (const locale of LOCALES) {
  try {
    const ctx = await ctxFor([session], { width: w, height: hgt, locale });
    const page = await ctx.newPage();
    await openSlip(page, one(15));
    await pay(page).click();
    await sheet(page).waitFor({ timeout: 60_000 });
    await settle(page, 400);
    const box = await page.getByTestId("millionea-confirm-commit").boundingBox();
    ok(`confirm · ${locale} @${w}×${hgt} · the commit and its way back stand on the screen (M3)`, !!box && box.y + box.height <= hgt, JSON.stringify(box));
    await page.screenshot({ path: `${OUT}/confirm-${locale}-${w}x${hgt}.png` });
    await ctx.close();
  } catch (e) { ok(`confirm ${locale} ${w}x${hgt}`, false, String(e).slice(0, 200)); }
}

// ── 3 · short of main balance (TZS 400): the bet sheet's low frame and its deposit door ─────────────────────────────────
session = await demoSession(browser, BASE, { query: "?deposit=0", balance: 400 });
log("demo session (TZS 400)");
await each(async (locale, width) => {
  const ctx = await ctxFor([session], { width, locale });
  const page = await ctx.newPage();
  await openSlip(page, one(15));
  await pay(page).click();
  await sheet(page).waitFor({ timeout: 60_000 });
  await settle(page, 400);
  ok(`confirm-low · ${locale} @${width} · the door offers the minimum deposit, TZS 1,000, never TZS 600 (H4)`,
    /TZS 1,000/.test((await page.getByTestId("millionea-slip-deposit").innerText()).replace(/\s+/g, " ")));
  await shoot(page, "confirm-low", locale, width);
  await ctx.close();
});
for (const [w, hgt] of [[360, 640], [320, 568]]) {
  const ctx = await ctxFor([session], { width: w, height: hgt, locale: "sw" });
  const page = await ctx.newPage();
  await openSlip(page, one(15));
  await pay(page).click();
  await sheet(page).waitFor({ timeout: 60_000 });
  await settle(page, 400);
  await page.screenshot({ path: `${OUT}/confirm-low-sw-${w}x${hgt}.png` });
  await ctx.close();
}
session = await demoSession(browser, BASE, { query: "?deposit=0", balance: 50_000 });
log("demo session (TZS 50,000) again");

// ── 4 · the loading ghost: the hub's door pressed on a slow line, so the route's loading state stands while the slip's
//    answer streams in. (Holding the whole answer back shows nothing: the dev server never prefetches, so the router learns
//    the loading state from the answer's own first rows — run 1 shot the finished page three times that way.)
await each(async (locale, width) => {
  const ctx = await ctxFor([session], { width, locale });
  const page = await ctx.newPage();
  await open(page, "/millionea");
  await settle(page, 300);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 24 * 1024, uploadThroughput: -1 });
  const door = page.getByTestId("millionea-hub-fill");
  await door.scrollIntoViewIfNeeded();
  await door.click();
  const ghost = page.getByTestId("slip-ghost");
  await ghost.waitFor({ timeout: 90_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  ok(`ghost · ${locale} @${width} · the slip's loading state stands, not the page`, (await ghost.count()) === 1 && (await page.getByTestId("millionea-slip").count()) === 0);
  await shoot(page, "ghost", locale, width);
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => {});
  await ctx.close();
});

// ── 5 · the cap reached, a staff account ─────────────────────────────────────────────────────────────────────────────────
await devPost(owner, { buyFor: DEMO_PHONE, tickets: 10 });
await each(async (locale, width) => {
  const ctx = await ctxFor([session], { width, locale });
  const page = await ctx.newPage();
  await open(page, "/millionea/slip");
  await hydrated(page);
  ok(`noslip-cap · ${locale} @${width} · the cap stands down the slip`, (await page.getByTestId("millionea-slip-none").count()) === 1);
  await shoot(page, "noslip-cap", locale, width);
  await ctx.close();
});
await devPost(owner, { cancelFor: DEMO_PHONE });
const ownerCookies = (await owner.cookies(BASE)).filter((c) => c.name === "kp_session");
await each(async (locale, width) => {
  const ctx = await ctxFor(ownerCookies, { width, locale });
  const page = await ctx.newPage();
  await open(page, "/millionea/slip");
  await hydrated(page);
  await shoot(page, "noslip-staff", locale, width);
  await ctx.close();
});

// ── 6 · the journey shell: the rail on the journey's tab bar, and its confirm ────────────────────────────────────────────
let pass_ = null;
try { pass_ = await mintStaffPass(browser, BASE); } catch (e) { ok("a staff preview pass", false, String(e).slice(0, 160)); }
if (pass_) {
  session = await demoSession(browser, BASE, { query: "?deposit=0", balance: 50_000 });
  await each(async (locale, width) => {
    const ctx = await ctxFor([session, pass_], { width, locale });
    const page = await ctx.newPage();
    await openSlip(page, one(9));
    ok(`journey · ${locale} @${width} · the journey shell`, (await page.locator('html[data-shell="journey"]').count()) === 1);
    await shoot(page, "journey-partial", locale, width);
    await openSlip(page, one(15));
    await pay(page).click();
    await sheet(page).waitFor({ timeout: 60_000 });
    await settle(page, 400);
    await shoot(page, "journey-confirm", locale, width);
    await ctx.close();
  });
}

// ── 7 · the last hour and the close, on the browser's clock ──────────────────────────────────────────────────────────────
// ⚠️ The seeded week sells weeks ahead of the calendar (seed-maswali: "two to seven weeks ahead"): its close cannot be moved
// within the hour, its open being later (MaswaliCycle_close_after_open_check — run 1). The slip counts from the server's
// instant plus the BROWSER's elapsed time (`useServerNowGated`, `useTickSeconds`), so the browser's clock moved on
// (Playwright `clock`: Date jumps, the page's second ticks on) draws the last hour, and the close arriving while the player
// looks, exactly as the real instant would. (The pill's server-drawn first paint: `test:maswali-slip-design` §4 and 10.7.)
const CLOSE = Date.parse((await devPost(owner, {})).closesAt ?? "");
ok("the week's close is read", Number.isFinite(CLOSE));
async function clockedSlip(locale, width, draft, withSheet = false) {
  const ctx = await ctxFor([session], { width, locale });
  await ctx.clock.install();
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(`clocked ${locale}@${width}: ${e}`));
  await openSlip(page, draft);
  if (withSheet) { await pay(page).click(); await sheet(page).waitFor({ timeout: 60_000 }); await settle(page, 300); }
  return { ctx, page };
}
/** The browser's clock set to `at`; the page's next second draws it (the tick, the control's exit beat, the reveal). */
async function moveClock(page, at) {
  await page.clock.setSystemTime(at);
  await page.waitForTimeout(1_600);
  await settle(page, 600);
}
await each(async (locale, width) => {
  const { ctx, page } = await clockedSlip(locale, width, one(9));
  await moveClock(page, CLOSE - 45 * 60_000);
  ok(`last-hour · ${locale} @${width} · the pill counts the last hour down`, (await page.locator(".closing-pill:visible").count()) >= 1);
  await shoot(page, "last-hour", locale, width);
  await ctx.close();
});

// ── 8 · sales close while the player is looking — the slip (the whole page after it), and an open confirm ─────────────────
await each(async (locale, width) => {
  const { ctx, page } = await clockedSlip(locale, width, one(9));
  await moveClock(page, CLOSE + 1_000);
  ok(`closed-now · ${locale} @${width} · the closed statement took the pay control's place, every answer resting (H5, H6)`,
    (await page.locator('[data-testid="millionea-slip-closed"]:visible').count()) === 1 && (await pay(page).count()) === 0
      && (await page.locator('[role="radio"]:not([disabled])').count()) === 0);
  await shootPage(page, "closed-now", locale, width);
  await ctx.close();
});
await each(async (locale, width) => {
  const { ctx, page } = await clockedSlip(locale, width, one(15), true);
  await moveClock(page, CLOSE + 1_000);
  ok(`confirm-closed · ${locale} @${width} · the open confirm stayed open on its closed frame (H6)`,
    (await page.getByTestId("millionea-confirm-commit").count()) === 0 && (await sheet(page).count()) === 1);
  await shoot(page, "confirm-closed", locale, width);
  await ctx.close();
});

// ── 9 · a break ───────────────────────────────────────────────────────────────────────────────────────────────────────────
await devPost(owner, { breakFor: DEMO_PHONE });
await each(async (locale, width) => {
  const ctx = await ctxFor([session], { width, locale });
  const page = await ctx.newPage();
  await open(page, "/millionea/slip");
  await hydrated(page);
  ok(`noslip-break · ${locale} @${width} · a break stands down the slip`, (await page.getByTestId("millionea-slip-break").count()) === 1);
  await shoot(page, "noslip-break", locale, width);
  await ctx.close();
});

ok("no page error on any page", errs.length === 0, errs.slice(0, 3).join(" | "));
await owner.close();
await browser.close();
console.log(`\nmaswali-slip-shots: ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
