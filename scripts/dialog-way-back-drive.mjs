/**
 * qa:dialog-way-back — A DIALOG'S WAY BACK NEVER MOVES THE PAGE (lead 2026-10-21, the 10/10 pass; DESIGN_AUTHORITY §M8a
 * item 13; MASWALI-BUILD S5-DESIGN-SLIP). At 360, a dialog is opened from a STICKY control and closed again; the page must
 * stand where it stood (scrollY unchanged) and focus must be back on the opener.
 *
 *   BASE=http://localhost:<port> node scripts/dialog-way-back-drive.mjs              # the guard
 *   BASE=http://localhost:<port> node scripts/dialog-way-back-drive.mjs --prove-red  # …and its plant must be caught
 *
 * ⭐ WHY IT CAN FAIL. While a dialog is open `useModalLock` sets `overflow: hidden` on <html> AND <body>; that makes the
 *    body a scroll box, so a sticky opener stops sticking and stands at its place in the document. The way back
 *    (`leaveLayer` → modal.tsx `PAGE.focus`) used to focus it there, and the browser scrolled the page to it: to the top
 *    of the page for the classic bar's balance capsule, ~2,700px down for the Millionea slip's pay rail.
 * The two openers (both on the kit Modal, both sticky at 360):
 *   · CLASSIC — the top bar's balance capsule (`wallet-balance-capsule`) opens the wallet sheet; closed by ✕.
 *   · MILLIONEA — the slip's pay rail (`millionea-slip-pay`) opens the confirm sheet; closed by "Back".
 * Each from deep in the page, by a tap and by the keyboard (the opener focused, Enter; closed by Escape) — a tap focuses
 * a button in Chromium but not in WebKit, and the way back can only return to what had focus, so focus is asked of a
 * tap only where the tap gave it.
 * ⛔ THE PLANT (--prove-red) is in the browser, not the source: an init script makes every `focus()` scroll
 *    (`preventScroll: false`) — the way back as it was — and every scroll check must then fail.
 * Engines: Chromium, and WebKit when Playwright's WebKit is installed (preventScroll is Safari 15+). WebKit's first-visit
 * primer is dismissed in an init script, as every Firefox/WebKit drive here does.
 * ⚠️ PREMISE: a FRESH in-memory `next dev` (FEATURE_MILLIONEA=ACTIVE, DISABLE_ADMIN_TOTP=true): it seeds the Millionea weeks
 *    and signs in the demo player; never beside another drive on the same demo player.
 */
import { chromium, webkit } from "playwright";
import { premise, demoSession, DEMO_PHONE, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3560";
const PROVE_RED = process.argv.includes("--prove-red");
const pre = await premise(BASE);
if (pre.refuse || pre.health?.millionea?.state !== "ACTIVE") {
  console.error(`PREMISE ABSENT — ${pre.refuse ?? "Millionea is not ACTIVE in this local in-memory server"}`);
  process.exit(2);
}

let pass = 0, fail = 0, caught = 0, planted = 0;
const ok = (name, cond, detail = "") => { if (cond) pass++; else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); } };
const log = (...a) => console.log(...a);

// The week and the player, through the product's own dev routes.
const seeder = await chromium.launch();
const owner = await seeder.newContext();
await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000091", name: "Millionea Owner" }, timeout: 240_000 });
const seeded = await owner.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
ok("the weeks are seeded", seeded.ok() || seeded.status() === 409, String(seeded.status()));
const dev = async (data) => (await owner.request.post(`${BASE}/api/dev-test/seed-maswali-slip`, { data, timeout: 120_000 })).json().catch(() => ({}));
const WEEK = (await dev({})).weekId ?? "";
ok("the selling week is read", !!WEEK, WEEK);
const session = await demoSession(seeder, BASE, { query: "?deposit=0", balance: 50_000 });
await dev({ cancelFor: DEMO_PHONE });
await owner.close();
await seeder.close();

const YES15 = Array.from({ length: 15 }, () => "YES");
/** A focus() that always scrolls — the way back before the ruling. */
const PLANT = () => {
  const focus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (options) { return focus.call(this, { ...(options ?? {}), preventScroll: false }); };
};

async function contextFor(browser, engine, { plant }) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: "dark" });
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch { /* storage blocked */ } });
  if (plant) await ctx.addInitScript(PLANT);
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: "sw", url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined }]);
  return ctx;
}
const settle = (page, ms = 500) => page.evaluate(async () => {
  await document.fonts.ready;
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))));
}).catch(() => {}).then(() => page.waitForTimeout(ms));
const where = (page) => page.evaluate(() => ({ y: Math.round(window.scrollY), max: Math.round(document.documentElement.scrollHeight - innerHeight) }));
const isFocused = (loc) => loc.evaluate((el) => document.activeElement === el);
const dialogs = (page) => page.locator('[role="dialog"]:not([data-exiting]), [role="alertdialog"]');

/**
 * One opener, one way of opening: from `atY`, open, wait for the dialog, close it, and read the page.
 * `open` / `close` are the case's own presses; `keyboard` opens with Enter on the focused opener and closes with Escape.
 */
async function wayBack(page, label, { opener, atY, open, close, dialog, keyboard }) {
  await page.evaluate((y) => window.scrollTo(0, y), atY);
  await page.waitForTimeout(400);
  const before = await where(page);
  if (keyboard) {
    await opener.evaluate((el) => el.focus({ preventScroll: true }));
    await page.keyboard.press("Enter");
  } else {
    await open();
  }
  await dialog().waitFor({ timeout: 60_000 });
  await settle(page, 600);
  const openerHeldFocus = keyboard ? true : await page.evaluate(() => window.__openerFocused === true).catch(() => false);
  if (keyboard) await page.keyboard.press("Escape"); else await close();
  await page.waitForTimeout(900);
  const after = await where(page);
  const backOnOpener = await isFocused(opener);
  return { label, before, after, backOnOpener, openerHeldFocus };
}
/** Notes, on the opener itself, whether the coming tap gives it focus (a tap focuses a button in Chromium, not in WebKit). */
const watchFocus = (opener) => opener.evaluate((el) => {
  window.__openerFocused = document.activeElement === el;
  el.addEventListener("focus", () => { window.__openerFocused = true; }, { once: true });
});

async function runEngine(engineName, launcher, plant) {
  let browser;
  try { browser = await launcher.launch(); } catch (e) { log(`${engineName}: not available here (${String(e).split("\n")[0].slice(0, 120)})`); return null; }
  const results = [];
  const ctx = await contextFor(browser, engineName, { plant });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  try {
    // ── MILLIONEA · the slip's pay rail (sticky above the tab bar) → the confirm sheet → "Back" ─────────────────────────
    await page.goto(`${BASE}/millionea/slip`, { waitUntil: "load", timeout: 240_000 });
    await page.waitForFunction(() => {
      const r = document.querySelector('[data-testid="millionea-slip"] [role="radio"]');
      return !!r && Object.keys(r).some((k) => k.startsWith("__reactProps$"));
    }, null, { timeout: 180_000 });
    await page.evaluate(([k, v]) => sessionStorage.setItem(k, v), [`kp-millionea-slip:${WEEK}`, JSON.stringify({ v: 2, active: 0, slips: [YES15] })]);
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => {
      const b = document.querySelector('[data-testid="millionea-slip-pay"][data-armed]');
      return !!b && Object.keys(b).some((k) => k.startsWith("__reactProps$"));
    }, null, { timeout: 180_000 });
    await settle(page, 600);
    const pay = page.locator('[data-testid="millionea-slip-pay"]:visible').first();
    const sheet = () => page.locator('[role="dialog"]').filter({ has: page.getByTestId("millionea-confirm-commit") });
    const back = () => sheet().getByRole("button", { name: "Rudi" });
    const deep = Math.min(1200, (await where(page)).max - 120);
    await watchFocus(pay);
    results.push(await wayBack(page, "slip pay rail · tap · Back", { opener: pay, atY: deep, open: () => pay.tap(), close: () => back().tap(), dialog: sheet }));
    await watchFocus(pay);
    results.push(await wayBack(page, "slip pay rail · keyboard · Escape", { opener: pay, atY: deep, keyboard: true, dialog: sheet }));

    // ── CLASSIC · the top bar's balance capsule (sticky at the top) → the wallet sheet → "Funga" — on the slip's long page
    //    and on a classic page, /markets, when its board is long enough to scroll ───────────────────────────────────────
    // The opener is the capsule's BUTTON (`aria-haspopup="dialog"`): the test id sits on its wrapper, which takes no focus.
    const capsule = page.getByTestId("wallet-balance-capsule").locator('button[aria-haspopup="dialog"]');
    const wallet = () => page.locator('[role="dialog"]').filter({ has: page.getByTestId("wallet-sheet") });
    const funga = () => wallet().getByRole("button", { name: "Funga" });
    for (const [where_, path] of [["the slip", null], ["/markets", "/markets"]]) {
      if (path) {
        await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 240_000 });
        await page.waitForFunction(() => {
          const c = document.querySelector('[data-testid="wallet-balance-capsule"]');
          return !!c && Object.keys(c).some((k) => k.startsWith("__reactProps$"));
        }, null, { timeout: 180_000 });
        await settle(page, 600);
      }
      const max = (await where(page)).max;
      if (max < 400) { log(`${engineName}: ${where_} scrolls ${max}px only — the capsule case runs on the slip's page`); continue; }
      const at = Math.min(1200, max - 120);
      await watchFocus(capsule);
      results.push(await wayBack(page, `classic balance capsule on ${where_} · tap · Funga`, { opener: capsule, atY: at, open: () => capsule.tap(), close: () => funga().tap(), dialog: wallet }));
      await watchFocus(capsule);
      results.push(await wayBack(page, `classic balance capsule on ${where_} · keyboard · Escape`, { opener: capsule, atY: at, keyboard: true, dialog: wallet }));
    }
  } catch (e) {
    ok(`${engineName}${plant ? " (planted)" : ""} · the drive ran to its end`, false, String(e).split("\n")[0].slice(0, 240));
  }
  await ctx.close();
  await browser.close();
  return results;
}

const ENGINES = [["chromium", chromium], ["webkit", webkit]];
for (const [name, launcher] of ENGINES) {
  const results = await runEngine(name, launcher, false);
  if (results === null) continue;
  for (const r of results) {
    log(`${name} · ${r.label}: scrollY ${r.before.y} → ${r.after.y} (of ${r.after.max}) · focus back on the opener: ${r.backOnOpener} (the tap focused it: ${r.openerHeldFocus})`);
    ok(`${name} · ${r.label} · the page stands where it stood (scrollY unchanged)`, Math.abs(r.after.y - r.before.y) <= 1, `${r.before.y} → ${r.after.y}`);
    // The way back returns focus to what had it: the keyboard's opener always, a tap's only where the tap focused it.
    if (r.openerHeldFocus) ok(`${name} · ${r.label} · focus is back on the opener`, r.backOnOpener);
  }
  if (PROVE_RED) {
    // ⚠️ THE JUMP IS BLINK'S. Chromium scrolls a focused element that the lock has unstuck into view, in every case here;
    // WebKit, measured 2026-10-21, mostly keeps the page still even with the plant (1 of 6 cases jumped in one run — the
    // capsule on /markets by the keyboard — and 0 of 6 in the next). So Chromium is held to catching every planted case,
    // and WebKit's planted cases are reported as what that engine does — the fix (`preventScroll`) is held in both by the
    // checks above. Last run (1ba838d86, 15:52Z): 24 passed, 0 failed; Chromium 6/6 planted cases jumped.
    const red = await runEngine(name, launcher, true);
    let jumpedHere = 0;
    for (const r of red ?? []) {
      const jumped = Math.abs(r.after.y - r.before.y) > 1;
      log(`${name} · PLANT (every focus scrolls) · ${r.label}: scrollY ${r.before.y} → ${r.after.y} · ${jumped ? "CAUGHT" : "no jump in this engine"} · focus back on the opener: ${r.backOnOpener}`);
      if (jumped) jumpedHere++;
    }
    if (name === "chromium") {
      planted += (red ?? []).length;
      caught += jumpedHere;
      ok(`${name} · RED CONTROL · every planted case jumps (${jumpedHere}/${(red ?? []).length})`, red !== null && jumpedHere === red.length && red.length > 0);
    } else {
      log(`${name} · RED CONTROL (reported, not held) · ${jumpedHere}/${(red ?? []).length} planted cases moved the page in this engine`);
    }
  }
}

log(`\nqa:dialog-way-back: ${pass} passed, ${fail} failed${PROVE_RED ? ` · RED CONTROL — Chromium ${caught}/${planted} planted cases jumped` : ""}`);
process.exit(fail === 0 && (!PROVE_RED || (planted > 0 && caught === planted)) ? 0 : 1);
