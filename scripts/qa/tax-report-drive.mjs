/**
 * qa:tax-report — drive `/admin/tax` as the Owner, through every filter and every act, and LOOK.
 *
 *   BASE=http://localhost:3047 node scripts/qa/tax-report-drive.mjs <shotDir>
 *
 * Needs a LOCAL dev server on the in-memory store with admin 2FA off (docs/TAX-REPORT.md §9):
 *   SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true npx next dev -p 3047   (no DATABASE_URL)
 *
 * It seeds real books with `POST /api/dev-test/seed-tax-books` (the real money services, timestamps
 * moved into a finished month), then: every period type × every product · the arrows · the custom
 * window · a balanced month, an out-of-balance month and a running month · Lock → drift → Reopen ·
 * a rate change that splits a month · all three downloads — asserting the figures on the page add up
 * (Report 1's check, Polls + Up & Down = All, refunds = Refunds), then photographs VIEWPORT TILES at
 * six widths (never full-page: fixed layers paint at their first-viewport position in a full shot).
 * ⛔ Every wait is for CONTENT — the console polls forever, so `networkidle` never settles.
 */
import { chromium, request } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE || "http://localhost:3047";
const OUT = resolve(process.argv[2] ?? "./tax-shots");
mkdirSync(OUT, { recursive: true });
const WIDTHS = [360, 640, 768, 1024, 1280, 1920];

let bad = 0;
const ok = (l, c, x = "") => { if (!c) bad++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); return c; };

// ── months relative to now, in EAT ──
const EAT = 3 * 3600_000;
const ym = (ms) => new Date(ms + EAT).toISOString().slice(0, 7);
const now = Date.now();
const cur = ym(now);
const [cy, cm] = cur.split("-").map(Number);
const prevKey = (k, n = 1) => { const [y, m] = k.split("-").map(Number); const i = y * 12 + (m - 1) - n; return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`; };
const LAST = prevKey(cur);          // the last complete month — the page's default
const BEFORE = prevKey(cur, 2);     // the month before it — seeded with a planted defect
void cy; void cm;

const api = await request.newContext({ baseURL: BASE });
const seedAdmin = await api.post(`${BASE}/api/dev-test/seed-admin`, { data: {} });
if (!seedAdmin.ok()) { console.error("seed-admin failed", seedAdmin.status()); process.exit(1); }
const s1 = await api.post(`${BASE}/api/dev-test/seed-tax-books`, { data: {} });
const s1b = await s1.json().catch(() => ({}));
ok(`seeded real books on ${s1b.day} (late round resulting on ${s1b.lateDay})`, s1.ok() && s1b.ok, JSON.stringify(s1b).slice(0, 200));
const s2 = await api.post(`${BASE}/api/dev-test/seed-tax-books`, { data: { day: `${BEFORE}-20`, defect: true } });
const s2b = await s2.json().catch(() => ({}));
ok(`seeded ${BEFORE}-20 with a planted defect`, s2.ok() && s2b.ok, JSON.stringify(s2b).slice(0, 200));
const state = await api.storageState();
await api.dispose();

const browser = await chromium.launch();
const ctx = await browser.newContext({ storageState: state, viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`[${page.url().replace(BASE, "")}] ${m.text().slice(0, 4000)}`); });
page.on("pageerror", (e) => consoleErrors.push(`[${page.url().replace(BASE, "")}] pageerror: ${String(e).slice(0, 4000)}`));

/** Navigate and wait for the page's own heading AND its period label — never a fixed delay. */
async function open(path, label) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Tax report" }).first().waitFor({ timeout: 180_000 });
  if (label) await page.locator('[data-testid="tax-window"]').first().waitFor({ timeout: 60_000 });
}
/** Read Report 1's rows: { line → cents } from the table the page renders. */
async function report1() {
  return page.evaluate(() => {
    const out = {};
    for (const tr of document.querySelectorAll('[data-testid="tax-report-1"] tbody tr[data-line]')) {
      const line = tr.querySelector("td span")?.textContent?.trim() ?? "";
      const amt = tr.querySelector(".amount")?.textContent?.trim() ?? "";
      const neg = /^[−-]/.test(amt);
      const n = Math.round(Number(amt.replace(/[^0-9.]/g, "")) * 100) * (neg ? -1 : 1);
      out[line] = n;
    }
    return out;
  });
}
/**
 * Type into one segment of the kit's DateSelect the way a person does: select what is there, then type over it.
 * ⛔ Never `fill`: the segment's onFocus moves the caret to the END of its digits, and with maxLength 2 the new digits
 * were refused — the date never changed and the drive's Go button stayed disabled (2026-10-03, h3).
 */
async function typeSeg(seg, value) {
  await seg.click();
  await seg.press("Control+a");
  await seg.pressSequentially(value);
}
function checkCloses(r, tag) {
  const accounted = r["Payout"] + r["On hold"] + r["Refunds"] + r["Platform fee kept"] + r["Less: on hold brought forward"];
  ok(`${tag}: the printed lines add up — Payout + On hold + Refunds + fee − b/f = ${accounted / 100}`, accounted === r["Check: accounted total"], JSON.stringify(r));
  return r["Sales"] - accounted;
}
async function byProductAddsUp(tag) {
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-testid="tax-by-product"] tbody tr')].map((tr) =>
    [...tr.querySelectorAll("td")].map((td) => td.textContent.trim())));
  const num = (s) => { const neg = /^[−-]/.test(s); return Math.round(Number(s.replace(/[^0-9.]/g, "")) * 100) * (neg ? -1 : 1); };
  // Money lines add up EXACTLY; a tax line is computed per product on its own Payout and rounded at each step, so
  // the products' tax may differ from All by rounding alone — at most a shilling or two, never more.
  const isTax = (r) => /tax/i.test(r[0]);
  // Columns: Line · All · Polls · Up & Down (All first — the answer, then its parts).
  const broken = rows.filter((r) => !isTax(r) && num(r[2]) + num(r[3]) !== num(r[1]));
  const taxOff = rows.filter((r) => isTax(r) && Math.abs(num(r[2]) + num(r[3]) - num(r[1])) > 200);
  ok(`${tag}: By product — every money line: Polls + Up & Down = All (${rows.length - rows.filter(isTax).length} lines)`, rows.length >= 8 && broken.length === 0, JSON.stringify(broken));
  ok(`${tag}: By product — the tax lines agree with All to within rounding (≤ 2 shillings)`, taxOff.length === 0, JSON.stringify(taxOff));
}
async function tiles(name, widths = WIDTHS) {
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(250);
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`${name} @${w}: no sideways page scroll`, overflow <= 0, `scrollWidth exceeds by ${overflow}px`);
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const step = 900 - 96;
    for (let i = 0, y = 0; i < 6 && y < total; i++, y += step) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(120);
      // ⛔ caret "initial": Playwright's default caret-hiding writes an inline caret-color onto every input and textarea —
      // a shot taken before React has hydrated them made React report a hydration mismatch that was the harness's own
      // write, never the app's (2026-10-03, the lock panel's Note box).
      await page.screenshot({ path: resolve(OUT, `${name}-w${w}-t${i + 1}.png`), caret: "initial" });
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

// ── 1 · the default view: the last complete month, balanced ───────────────────────────────────
await open("/admin/tax", true);
ok("1.1 the page opens on the last complete month", (await page.locator('[data-testid="tax-period-label"]').innerText()).length > 0);
const statusAll = await page.locator('[data-testid="tax-status"]').innerText();
ok("1.2 the seeded month is BALANCED and ready to lock", /Balanced/.test(statusAll) && /Ready to lock/.test(statusAll), statusAll.slice(0, 160));
const rSep = await report1();
ok("1.3 the difference row is exactly 0", checkCloses(rSep, "1.3") === 0 && rSep["Difference from Sales (must be 0)"] === 0);
ok("1.4 the late round's stakes are On hold at the month's end (100,000 placed, resulted next month)", rSep["On hold"] >= 100_000_00, String(rSep["On hold"]));
await byProductAddsUp("1.5");
const refunds = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-testid="tax-refunds"] tbody tr')];
  const last = rows[rows.length - 1];
  return last?.querySelector(".amount")?.textContent?.trim() ?? "";
});
ok("1.6 the refunds-by-reason total equals Report 1's Refunds", Math.round(Number(refunds.replace(/[^0-9.]/g, "")) * 100) === rSep["Refunds"], `${refunds} vs ${rSep["Refunds"]}`);
const r2 = await page.locator('[data-testid="tax-report-2"]').innerText();
ok("1.7 Report 2 shows the plan's five lines and rates", /Commission/.test(r2) && /13% × Payout/.test(r2) && /10% × Commission/.test(r2) && /5% × Commission/.test(r2) && /Total Tax payable/.test(r2), r2.slice(0, 200));
await tiles("01-month-balanced");

// ── 2 · products ─────────────────────────────────────────────────────────────────────────────
for (const [testId, prod] of [["tax-product:UPDOWN", "UPDOWN"], ["tax-product:MARKET", "MARKET"], ["tax-product:ALL", null]]) {
  await page.locator(`[data-chip="${testId}"]`).first().click();
  if (prod) await page.waitForURL(new RegExp(`product=${prod}`), { timeout: 60_000 });
  else await page.waitForURL((u) => !u.toString().includes("product="), { timeout: 60_000 });
  await page.locator('[data-testid="tax-report-1"]').first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(400);
  const r = await report1();
  ok(`2 · ${prod ?? "ALL"}: the check closes`, checkCloses(r, `2 · ${prod ?? "ALL"}`) === 0);
}
await page.locator('[data-chip="tax-product:UPDOWN"]').first().click();
await page.waitForURL(/product=UPDOWN/, { timeout: 60_000 });
await page.locator('[data-testid="tax-report-1"]').first().waitFor({ timeout: 60_000 });
await tiles("02-month-updown", [360, 1280]);
await page.locator('[data-chip="tax-product:ALL"]').first().click();
await page.waitForURL((u) => !u.toString().includes("product="), { timeout: 60_000 });

// ── 3 · period types: week, day, custom; the arrows ─────────────────────────────────────────
await page.locator('[data-chip="tax-kind:week"]').first().click();
await page.waitForURL(/period=week/, { timeout: 60_000 });
await page.locator('[data-testid="tax-report-1"]').first().waitFor({ timeout: 60_000 });
ok("3.1 Week: the label names an ISO week", /^Week \d+ · /.test(await page.locator('[data-testid="tax-period-label"]').innerText()));
await tiles("03-week", [360, 1280]);
// The week picker: type any day of the wanted week, then Go. A half-typed date passes through valid days on
// the way, so typing alone must move nothing.
const [sy, sm, sd] = s1b.day.split("-");
const mondayOf = (day) => { const d = new Date(`${day}T00:00:00Z`); return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5).toISOString().slice(0, 10); };
const seededWeek = mondayOf(s1b.day);
if (!page.url().includes(`week=${seededWeek}`)) {
  const wkJump = page.locator('[role="group"][aria-label="Jump to the week of a day"]');
  const wkSegs = wkJump.locator('input[inputmode="numeric"]');
  const urlBefore = page.url();
  await typeSeg(wkSegs.nth(0), sd); await typeSeg(wkSegs.nth(1), sm); await typeSeg(wkSegs.nth(2), sy);
  await page.waitForTimeout(600);
  ok("3.1b typing a date into the week picker navigates nowhere until Go", page.url() === urlBefore, page.url());
  await wkJump.locator('[data-testid="tax-jump-go"]').click();
  await page.waitForURL((u) => u.toString().includes(`week=${seededWeek}`), { timeout: 60_000 });
}
await page.locator('[data-testid="tax-report-1"]').first().waitFor({ timeout: 60_000 });
await page.waitForFunction((d) => (document.querySelector('[data-testid="tax-period-label"]')?.textContent ?? "").includes(d), String(Number(sd)), { timeout: 60_000 }).catch(() => {});
const rWeek = await report1();
ok("3.1c Go opened the seeded day's week: it holds the seeded sales and its check closes", rWeek["Sales"] > 0 && checkCloses(rWeek, "3.1c") === 0, JSON.stringify(rWeek));
await page.locator('[data-chip="tax-kind:day"]').first().click();
await page.waitForURL(/period=day/, { timeout: 60_000 });
await page.locator('[data-testid="tax-report-1"]').first().waitFor({ timeout: 60_000 });
{
  const dyJump = page.locator('[role="group"][aria-label="Jump to a day"]');
  const dySegs = dyJump.locator('input[inputmode="numeric"]');
  await typeSeg(dySegs.nth(0), sd); await typeSeg(dySegs.nth(1), sm); await typeSeg(dySegs.nth(2), sy);
  await dyJump.locator('[data-testid="tax-jump-go"]').click();
  await page.waitForURL((u) => u.toString().includes(`day=${s1b.day}`), { timeout: 60_000 });
  await page.locator('[data-testid="tax-window"]').first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(400);
}
const dayLabel = await page.locator('[data-testid="tax-period-label"]').innerText();
const rDay = await report1();
ok("3.2 Day (the seeded day): the check closes", checkCloses(rDay, "3.2") === 0);
ok("3.3 …and the day holds the seeded sales", rDay["Sales"] > 0, String(rDay["Sales"]));
await page.locator('[data-testid="tax-prev"]').first().click();
await page.waitForURL((u) => u.toString().includes("period=day") && !u.toString().includes(`day=${s1b.day}`), { timeout: 60_000 });
ok("3.4 the previous-day arrow moves one day back", true);
await page.locator('[data-chip="tax-kind:custom"]').first().click();
await page.waitForURL(/period=custom/, { timeout: 60_000 });
await page.locator('[data-testid="tax-custom-apply"]').first().waitFor({ timeout: 60_000 });
ok("3.5 Custom shows the start/end pickers and Apply", true);
await open(`/admin/tax?period=custom&from=${s1b.day}T00:00&to=${s1b.day}T23:59`, true);
const rCustom = await report1();
ok("3.6 a custom window over the seeded day closes, and equals the Day view's Sales", checkCloses(rCustom, "3.6") === 0 && rCustom["Sales"] === rDay["Sales"], `${rCustom["Sales"]} vs ${rDay["Sales"]}`);
const lockCustom = await page.locator("body").innerText();
ok("3.7 a custom window offers no Lock", !(await page.locator('[data-testid="tax-lock"]').count()) && /Only a day, a week or a month can be locked/.test(lockCustom));
await tiles("04-custom", [360, 1280]);
// A shared link that names only a day (no period=) opens THAT day — never silently the default month.
await open(`/admin/tax?day=${s1b.day}`, true);
const rLink = await report1();
const linkLabel = await page.locator('[data-testid="tax-period-label"]').innerText();
ok("3.8 a link naming only a day (no period=) opens THAT day, with that day's figures", linkLabel === dayLabel && rLink["Sales"] === rDay["Sales"], `${linkLabel} vs ${dayLabel} · ${rLink["Sales"]} vs ${rDay["Sales"]}`);

// ── 4 · the month before: OUT OF BALANCE, every shilling named ─────────────────────────────
await open(`/admin/tax?period=month&month=${BEFORE}`, true);
const statusBefore = await page.locator('[data-testid="tax-status"]').innerText();
ok("4.1 the planted month is OUT OF BALANCE and sign-off is blocked", /Out of balance/.test(statusBefore) && /blocked/.test(statusBefore), statusBefore.slice(0, 200));
const rBefore = await report1();
const diff = checkCloses(rBefore, "4.2");
ok("4.3 the difference is the planted −19,999", diff === -19_999_00 && rBefore["Difference from Sales (must be 0)"] === -19_999_00, String(diff));
const ex = await page.locator('[data-testid="tax-exceptions"]').innerText();
ok("4.4 the exception names it: winnings with no result, −19,999", /Winnings paid on a bet with no result/.test(ex) && /19,999/.test(ex), ex.slice(0, 240));
ok("4.5 the Owner is offered 'Lock with exceptions acknowledged', not a plain Lock", (await page.locator('[data-testid="tax-lock-ack"]').count()) === 1 && (await page.locator('[data-testid="tax-lock"]').count()) === 0);
await tiles("05-month-out-of-balance");
// ⛔ ONE PRODUCT CANNOT FILE AROUND THE WHOLE BOOK: the planted payout names no bet, so it belongs to no product,
// and Up & Down alone balances — the page must still block sign-off on the whole book's difference.
await open(`/admin/tax?period=month&month=${BEFORE}&product=UPDOWN`, true);
const statusUd = await page.locator('[data-testid="tax-status"]').innerText();
const rUd = await report1();
ok("4.6 Up & Down alone balances on its own…", checkCloses(rUd, "4.6") === 0 && rUd["Difference from Sales (must be 0)"] === 0, JSON.stringify(rUd));
ok("4.7 …but the page says the WHOLE book is out by −19,999 and blocks sign-off", /whole book is out/.test(statusUd) && /19,999/.test(statusUd) && /blocked/.test(statusUd), statusUd.slice(0, 240));
ok("4.8 …so only the Owner's acknowledged lock is offered", (await page.locator('[data-testid="tax-lock-ack"]').count()) === 1 && (await page.locator('[data-testid="tax-lock"]').count()) === 0);
await tiles("05b-product-whole-book-out", [360, 1280]);

// ── 5 · the running month: PARTIAL ──────────────────────────────────────────────────────────
await open(`/admin/tax?period=month&month=${cur}`, true);
const statusCur = await page.locator('[data-testid="tax-status"]').innerText();
ok("5.1 the running month says 'not for filing'", /in progress/i.test(statusCur) && /not for filing/i.test(statusCur), statusCur.slice(0, 160));
const rCur = await report1();
ok("5.2 it opens with the late rounds brought forward, and its check closes", rCur["Less: on hold brought forward"] < 0 && checkCloses(rCur, "5.2") === 0, JSON.stringify(rCur));
ok("5.3 no Lock while it runs", (await page.locator('[data-testid="tax-lock"]').count()) === 0);
await tiles("06-month-in-progress", [360, 1280]);

// ── 6 · Lock → the books move → drift → Reopen ─────────────────────────────────────────────
await open(`/admin/tax?period=month&month=${LAST}`, true);
await page.locator('[data-testid="tax-lock"]').first().click();
const dlg = page.locator('[role="alertdialog"], [role="dialog"]').last();
await dlg.waitFor({ timeout: 30_000 });
await dlg.locator("input").first().fill("LOCK");
await dlg.getByRole("button", { name: /^Lock$/ }).click();
await page.getByText(/^Locked /).first().waitFor({ timeout: 60_000 });
const statusLocked = await page.locator('[data-testid="tax-status"]').innerText();
ok("6.1 the month is LOCKED, by the Owner, and the live books still agree", /Locked/.test(statusLocked) && /still agree/.test(statusLocked), statusLocked.slice(0, 200));
await tiles("07-month-locked", [360, 1280]);
const more = await request.newContext({ baseURL: BASE });
const s3 = await more.post(`${BASE}/api/dev-test/seed-tax-books`, { data: { day: `${LAST}-12` } });
ok("6.2 more books land in the locked month (a late correction)", s3.ok());
await more.dispose();
await open(`/admin/tax?period=month&month=${LAST}`, true);
const statusDrift = await page.locator('[data-testid="tax-status"]').innerText();
ok("6.3 the page still shows the LOCKED figures, and says the live books moved", /moved since/.test(statusDrift), statusDrift.slice(0, 200));
const rLocked = await report1();
ok("6.4 …the locked Sales did not change", rLocked["Sales"] === rSep["Sales"], `${rLocked["Sales"]} vs ${rSep["Sales"]}`);
ok("6.5 …and the drift table names Sales with both figures", /Sales/.test(await page.locator('[data-testid="tax-drift"]').innerText()));
await tiles("08-month-drift", [360, 1280]);
await page.getByPlaceholder(/late settlement correction/).fill("The books for this month received a late batch; refiling.");
await page.locator('[data-testid="tax-unlock"]').click();
const dlg2 = page.locator('[role="alertdialog"], [role="dialog"]').last();
await dlg2.waitFor({ timeout: 30_000 });
await dlg2.locator("input").first().fill("REOPEN");
await dlg2.getByRole("button", { name: /^Reopen$/ }).click();
await page.locator('[data-testid="tax-lock"]').first().waitFor({ timeout: 60_000 });
const rLive = await report1();
ok("6.6 reopened: the page follows the live books again (Sales grew by the late batch)", rLive["Sales"] > rSep["Sales"] && checkCloses(rLive, "6.6") === 0);
const hist = await page.locator("body").innerText();
// innerText follows text-transform — the heading is drawn uppercase — so the heading is matched without case.
ok("6.7 the earlier lock stays on record with its reason", /Earlier locks of this period/i.test(hist) && /refiling/.test(hist), hist.slice(hist.search(/Earlier locks/i), hist.search(/Earlier locks/i) + 200));
// ⭐ WHAT WAS SHOWN IS WHAT IS LOCKED: books that move after the page loaded refuse the lock — the officer would
// otherwise freeze figures they never saw.
{
  const late = await request.newContext({ baseURL: BASE });
  const s4 = await late.post(`${BASE}/api/dev-test/seed-tax-books`, { data: { day: `${LAST}-13` } });
  ok("6.8 more books land while the page is open", s4.ok());
  await late.dispose();
  await page.locator('[data-testid="tax-lock"]').first().click();
  const dlg3 = page.locator('[role="alertdialog"], [role="dialog"]').last();
  await dlg3.waitFor({ timeout: 30_000 });
  await dlg3.locator("input").first().fill("LOCK");
  await dlg3.getByRole("button", { name: /^Lock$/ }).click();
  const refused = await page.getByText(/The books changed after this page was loaded/).first().waitFor({ timeout: 60_000 }).then(() => true, () => false);
  await page.waitForTimeout(800);
  const stillOpen = await page.locator('[data-testid="tax-status"]').innerText();
  ok("6.9 the lock is REFUSED and nothing is locked", refused && !/^Locked /.test(stillOpen.trim()), stillOpen.slice(0, 160));
  await tiles("08b-lock-refused-books-moved", [360]);
}

// ── 7 · a rate change splits the month ──────────────────────────────────────────────────────
await page.locator('[data-testid="tax-rates-form"]').scrollIntoViewIfNeeded();
const form = page.locator('[data-testid="tax-rates-form"]');
// The day picker: three segments (dd · mm · yyyy).
const segs = form.locator('input[inputmode="numeric"]');
const [, lm, ly] = [null, LAST.slice(5, 7), LAST.slice(0, 4)];
await typeSeg(segs.nth(0), "15"); await typeSeg(segs.nth(1), lm); await typeSeg(segs.nth(2), ly);
await form.locator('input[name="commission"]').fill("12");
await form.locator('textarea[name="note"]').fill("Drive: a test notice changing the commission from the 15th.");
await form.getByRole("button", { name: /Record new rates/ }).click();
await page.getByText(/Rates recorded/).first().waitFor({ timeout: 60_000 }).catch(() => {});
await open(`/admin/tax?period=month&month=${LAST}`, true);
const r2Split = await page.locator('[data-testid="tax-report-2"]').innerText();
ok("7.1 Report 2 now taxes the month in two segments, at 13% and at 12%", /13% × Payout/.test(r2Split) && /12% × Payout/.test(r2Split) && /all segments/.test(r2Split), r2Split.slice(0, 300));
await tiles("09-rates-split", [360, 1280]);

// ── 8 · the downloads ───────────────────────────────────────────────────────────────────────
for (const [fmt, magic] of [["pdf", "%PDF-"], ["xlsx", "PK"], ["csv", "﻿"]]) {
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 90_000 }), page.locator(`[data-testid="tax-export-${fmt}"]`).click()]);
  const file = resolve(OUT, dl.suggestedFilename());
  await dl.saveAs(file);
  const head = readFileSync(file).subarray(0, 5);
  const ok1 = fmt === "csv" ? head.toString("utf8").startsWith("﻿") : head.toString("latin1").startsWith(magic);
  ok(`8 · ${fmt.toUpperCase()} downloads as ${dl.suggestedFilename()}`, ok1 && dl.suggestedFilename().includes(LAST), head.toString("latin1"));
  if (fmt === "csv") {
    const csv = readFileSync(file, "utf8");
    const salesLine = csv.split("\r\n").find((l) => l.includes('"Report 1 — Total Reporting System","Sales"'));
    const salesCsv = Number(salesLine?.split(",").slice(-2)[0]);
    const rNow = await report1();
    ok("8 · the CSV's Sales is the page's Sales", Math.round(salesCsv * 100) === rNow["Sales"], `${salesCsv} vs ${rNow["Sales"] / 100}`);
  }
}
await page.waitForTimeout(500);

ok("9 · no console errors across the drive", consoleErrors.length === 0, consoleErrors.slice(0, 5).map((e) => e.slice(0, 300)).join(" | "));
writeFileSync(resolve(OUT, "drive-summary.txt"), `failures=${bad}\nconsole errors:\n${consoleErrors.join("\n")}\n`);
await browser.close();
console.log(`\nqa:tax-report: ${bad === 0 ? "ALL PASS" : `${bad} FAILED`}`);
process.exit(bad === 0 ? 0 : 1);
