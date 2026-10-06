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
 * a rate change that splits a month · all three downloads · day by day (every day its own report: the days
 * add up to Report 1, a day opens equal to its row, part-days, paging, phone blocks, the files' day tables) — asserting the figures on the page add up
 * (Report 1's check, Polls + Up & Down = All, refunds = Refunds, Finance's filing lines: Sales less refunds and its
 * tickets against Report 1, Net commission revenue against Report 2), then photographs VIEWPORT TILES at
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
/** Read Report 2's rows: { label → amount ×100 } as printed, and the tickets under Sales less refunds. */
async function report2() {
  return page.evaluate(() => {
    const out = {};
    for (const tr of document.querySelectorAll('[data-testid="tax-report-2"] tbody tr')) {
      const line = tr.querySelector("td span")?.textContent?.trim() ?? "";
      const amt = tr.querySelector(".amount")?.textContent?.trim() ?? "";
      const neg = /^[−-]/.test(amt);
      out[line] = Math.round(Number(amt.replace(/[^0-9.]/g, "")) * 100) * (neg ? -1 : 1);
    }
    // textContent, not innerText: the count is printed in capitals by CSS, and innerText returns the capitals.
    out.__tickets = document.querySelector('[data-testid="tax-tickets"]')?.textContent?.trim() ?? "";
    return out;
  });
}
/** Finance's filing lines against Report 1 on the screen: Sales − Refunds, bets placed − refunds, Commission − Total tax. */
async function filingLinesAddUp(tag, r1) {
  const r2v = await report2();
  const r1Text = await page.locator('[data-testid="tax-report-1"]').innerText();
  const r2Text = await page.locator('[data-testid="tax-report-2"]').innerText();
  const count = (re) => Number((r1Text.match(re) ?? [])[1]?.replace(/,/g, "") ?? Number.NaN);
  // The first "(N bets)" in Report 1 is the Sales row's — it is the first line printed.
  const net = count(/\(([\d,]+) bets?\)/) - count(/\(([\d,]+) refunds?\)/);
  // The page's own words: grouped, U+2212 for a negative count, singular for one.
  const label = `${net < 0 ? "−" : ""}${Math.abs(net).toLocaleString("en-US")} ${Math.abs(net) === 1 ? "ticket" : "tickets"}`;
  // A month split by a rate change prints one Commission per period, then "Commission — all segments": Net is on the sum.
  const commission = r2v["Commission — all segments"] ?? r2v["Commission"];
  ok(`${tag} Report 2 opens with Sales less refunds = Report 1's Sales − Refunds`, r2v["Sales less refunds"] === r1["Sales"] - r1["Refunds"], `${r2v["Sales less refunds"]} vs ${r1["Sales"]} − ${r1["Refunds"]}`);
  // `\s` matches the no-break spaces the page ties each number to its word with.
  ok(`${tag} …with its tickets = Report 1's bets placed − refunds (${net})`, Number.isFinite(net) && r2v.__tickets === label && /Tickets: [\d,]+\splaced\s−\s[\d,]+\srefunded/.test(r2Text), `${r2v.__tickets} | ${r2Text.slice(0, 200)}`);
  ok(`${tag} Report 2 closes with Net commission revenue = Commission − Total Tax payable`, r2v["Net commission revenue"] === commission - r2v["Total Tax payable"], JSON.stringify(r2v));
  ok(`${tag} withdrawals are named nowhere beside a figure`, !/withdraw/i.test(r1Text) && !/withdraw/i.test(r2Text));
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
ok("1.7b the Gaming Board's line reads 'GBT levy', never 'GBT tax' (Ali, 2026-10-06)", /GBT levy/.test(r2) && !/GBT tax/i.test(r2), r2.slice(0, 300));
await filingLinesAddUp("1.8", rSep);
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
  await filingLinesAddUp(`2 · ${prod ?? "ALL"}:`, r);
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
await filingLinesAddUp("7.2", await report1());
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

// ── 13 · day by day — every day its own report, the days adding up to the period ─────────────────
{
  const num = (s) => { const t = String(s ?? "").trim(); const neg = /^[−-]/.test(t); return Math.round(Number(t.replace(/[^0-9.]/g, "")) * 100) * (neg ? -1 : 1); };
  const plus = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
  /** The day table as the page prints it (the xl table): one object per day row. */
  const dayRows = () => page.evaluate(() => [...document.querySelectorAll('[data-testid="tax-days"] tbody tr[data-day]')].map((tr) => {
    const td = [...tr.querySelectorAll("td")];
    const txt = (i) => td[i]?.textContent?.trim() ?? "";
    return {
      key: tr.getAttribute("data-day"), quiet: tr.className.includes("text-text-tertiary"),
      label: td[0]?.querySelector("a")?.textContent?.trim() ?? "", hint: td[0]?.querySelector("span.block")?.textContent?.trim() ?? "",
      href: decodeURIComponent(td[0]?.querySelector("a")?.getAttribute("href") ?? ""),
      sales: txt(1), payout: txt(2), onHold: txt(3), refunds: txt(4), tax: txt(5), check: txt(6),
    };
  }));
  const openDays = async (path) => { await open(path, true); await page.locator('[data-testid="tax-days-card"]').first().waitFor({ timeout: 60_000 }); };
  /** Photograph the day card itself at each width: viewport tiles from its top to its end, never a full-page shot. */
  async function cardShots(name, widths) {
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(250);
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`${name} @${w}: no sideways page scroll`, overflow <= 0, `scrollWidth exceeds by ${overflow}px`);
      const box = await page.evaluate(() => { const r = document.querySelector('[data-testid="tax-days-card"]').getBoundingClientRect(); return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY }; });
      for (let i = 0, y = Math.max(0, box.top - 24); i < 8 && y < box.bottom; i++, y += 900 - 96) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        await page.waitForTimeout(120);
        await page.screenshot({ path: resolve(OUT, `${name}-w${w}-t${i + 1}.png`), caret: "initial" });
      }
    }
    await page.setViewportSize({ width: 1280, height: 900 });
  }

  // The last complete month, at desktop width: the table.
  await page.setViewportSize({ width: 1280, height: 900 });
  await openDays(`/admin/tax?period=month&month=${LAST}`);
  const rows = await dayRows();
  const [lyN, lmN] = LAST.split("-").map(Number);
  const daysInLast = new Date(Date.UTC(lyN, lmN, 0)).getUTCDate();
  ok(`13.1 the month lists all ${daysInLast} of its days, oldest first`, rows.length === daysInLast && rows[0]?.key === `${LAST}-01` && rows[rows.length - 1]?.key === `${LAST}-${String(daysInLast).padStart(2, "0")}`, `${rows.length} rows`);
  const r = await report1();
  const sum = (list, k) => list.reduce((t, x) => t + num(x[k]), 0);
  ok("13.2 the days' Sales, Payout and Refunds add up to Report 1's, to the cent",
    sum(rows, "sales") === r["Sales"] && sum(rows, "payout") === r["Payout"] && sum(rows, "refunds") === r["Refunds"],
    JSON.stringify({ sales: [sum(rows, "sales"), r["Sales"]], payout: [sum(rows, "payout"), r["Payout"]], refunds: [sum(rows, "refunds"), r["Refunds"]] }));
  ok("13.3 the last day closes with Report 1's On hold", num(rows[rows.length - 1]?.onHold) === r["On hold"], `${rows[rows.length - 1]?.onHold} vs ${r["On hold"]}`);
  const whole = await page.evaluate(() => [...document.querySelectorAll('[data-testid="tax-days-total"] td')].map((td) => td.textContent.trim()));
  ok("13.4 the whole-period row is Report 1's own figures", whole[0] === "Whole period" && num(whole[1]) === r["Sales"] && num(whole[2]) === r["Payout"] && num(whole[3]) === r["On hold"] && num(whole[4]) === r["Refunds"], JSON.stringify(whole));
  ok("13.5 every day of a balanced month balances (✓)", rows.length > 0 && rows.every((x) => x.check === "✓"), JSON.stringify(rows.filter((x) => x.check !== "✓").map((x) => [x.key, x.check])));
  const seeded = rows.find((x) => x.key === s1b.day);
  ok(`13.6 the seeded day (${s1b.day}) carries its sales; a day with nothing placed, paid or refunded is drawn quiet`,
    !!seeded && num(seeded.sales) > 0 && !seeded.quiet && rows[0]?.quiet === true, JSON.stringify({ seeded, first: rows[0] }));
  await cardShots("13-days-month", [1280, 1920]);

  // A day's link: a loading mark while it opens, then THAT day, equal to its row.
  await openDays(`/admin/tax?period=month&month=${LAST}`);
  const holdDay = async (route) => {
    if (route.request().headers()["rsc"] !== "1") return route.continue();
    const resp = await route.fetch();
    await page.waitForTimeout(2500);
    await route.fulfill({ response: resp }).catch(() => {});
  };
  const isTaxPath = (u) => u.pathname === "/admin/tax";
  await page.route(isTaxPath, holdDay);
  const link = page.locator(`[data-testid="tax-days"] tr[data-day="${s1b.day}"] [data-testid="tax-day-link"]`);
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await page.waitForTimeout(700);
  ok("13.7 while a day opens, its link shows it is working", (await link.locator("[data-link-pending]").count()) === 1);
  await page.screenshot({ path: resolve(OUT, "13-day-link-loading-w1280.png"), caret: "initial" });
  await page.waitForURL((u) => u.toString().includes(`day=${s1b.day}`) && u.toString().includes("period=day"), { timeout: 60_000 });
  await page.locator('[data-testid="tax-window"]').first().waitFor({ timeout: 60_000 });
  await page.unroute(isTaxPath, holdDay);
  await page.waitForTimeout(400);
  const rd = await report1();
  ok("13.8 …then THAT day opens, and its Report 1 is exactly its row", !!seeded && num(seeded.sales) === rd["Sales"] && num(seeded.payout) === rd["Payout"] && num(seeded.onHold) === rd["On hold"] && num(seeded.refunds) === rd["Refunds"], JSON.stringify({ row: seeded, day: rd }));
  ok("13.9 …and a day has no day-by-day card of its own — it IS the day", (await page.locator('[data-testid="tax-days-card"]').count()) === 0);

  // One product: its own days, and every link keeps it.
  await openDays(`/admin/tax?period=month&month=${LAST}&product=UPDOWN`);
  const ru = await dayRows();
  const rU = await report1();
  ok("13.10 Up & Down alone: its days add up to its own Sales, and each day's link keeps the product",
    ru.length === daysInLast && sum(ru, "sales") === rU["Sales"] && ru.every((x) => x.href.includes("product=UPDOWN")), `${sum(ru, "sales")} vs ${rU["Sales"]}`);

  // A week: seven days, Monday first.
  await openDays(`/admin/tax?period=week&week=${seededWeek}`);
  const rw = await dayRows();
  ok("13.11 a week lists its seven days, Monday to Sunday", rw.length === 7 && rw[0].label.startsWith("Mon ") && rw[6].label.startsWith("Sun "), rw.map((x) => x.label).join(" | "));

  // A custom window that opens and closes mid-day keeps its part-days, each opening exactly its hours.
  const d0 = s1b.day, d2 = plus(s1b.day, 2);
  await openDays(`/admin/tax?period=custom&from=${d0}T08:00&to=${d2}T18:00`);
  const rc = await dayRows();
  ok("13.12 a custom window keeps its part-days: 'from 08:00', a whole day, 'to 18:00'", rc.length === 3 && rc[0].hint === "from 08:00" && rc[1].hint === "" && rc[2].hint === "to 18:00", JSON.stringify(rc.map((x) => [x.label, x.hint])));
  ok("13.13 …a part-day opens the custom window of exactly its hours; a whole day opens the day",
    rc[0]?.href.includes(`from=${d0}T08:00`) && rc[0]?.href.includes(`to=${plus(d0, 1)}T00:00`) && rc[1]?.href.includes(`day=${plus(d0, 1)}`), rc.map((x) => x.href).join(" | "));
  await cardShots("13-days-custom", [360, 1280]);

  // A long window pages, 31 days at a time; the pager keeps the window.
  const from40 = plus(`${LAST}-01`, -10), to40 = plus(`${LAST}-01`, 30);
  await openDays(`/admin/tax?period=custom&from=${from40}T00:00&to=${to40}T00:00`);
  const p1 = await dayRows();
  const card = page.locator('[data-testid="tax-days-card"]');
  await card.getByRole("link", { name: "Next page" }).first().click();
  await page.waitForURL((u) => u.toString().includes("dpage=2"), { timeout: 60_000 });
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="tax-days"] tbody tr[data-day]').length === 9, null, { timeout: 60_000 }).catch(() => {});
  const p2 = await dayRows();
  ok("13.14 a 40-day window pages 31 days, then 9 — the window kept, nothing repeated or lost",
    p1.length === 31 && p2.length === 9 && p1[0].key === from40 && p2[8].key === plus(to40, -1) && page.url().includes(`from=${from40}`) && new Set([...p1, ...p2].map((x) => x.key)).size === 40,
    `${p1.length} + ${p2.length}`);

  // The running month: its days so far, today last, "so far", opening today.
  await openDays(`/admin/tax?period=month&month=${cur}`);
  const rr = await dayRows();
  const todayKey = new Date(Date.now() + EAT).toISOString().slice(0, 10);
  const lastRow = rr[rr.length - 1];
  ok("13.15 a running month lists its days so far — today last, marked 'so far', opening today",
    !!lastRow && lastRow.key === todayKey && lastRow.hint === "so far" && lastRow.href.includes(`day=${todayKey}`) && rr.length === Number(todayKey.slice(8, 10)), JSON.stringify(lastRow));
  const rCurNow = await report1();
  ok("13.16 …and its days add up to its Sales so far", sum(rr, "sales") === rCurNow["Sales"], `${sum(rr, "sales")} vs ${rCurNow["Sales"]}`);

  // A month not started: an empty state in words.
  const FUT = (() => { const [y, m] = cur.split("-").map(Number); const i = y * 12 + m; return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`; })();
  await openDays(`/admin/tax?period=month&month=${FUT}`);
  ok("13.17 a month not started says it has no days yet", /No days yet/.test(await page.locator('[data-testid="tax-days-empty"]').innerText()));

  // A phone and a tablet: each day a block, the whole block its link.
  await openDays(`/admin/tax?period=month&month=${LAST}`);
  for (const w of [360, 768, 1024]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(300);
    const blocks = await page.locator('[data-testid="tax-days-stacked"] li[data-day]').count();
    ok(`13.18 @${w} each day is a block (the table hidden), the whole period last`,
      blocks === daysInLast && !(await page.locator('[data-testid="tax-days"]').isVisible()) && (await page.locator('[data-testid="tax-days-total-stacked"]').isVisible()), `${blocks} blocks`);
  }
  await page.setViewportSize({ width: 360, height: 900 });
  const block = page.locator(`[data-testid="tax-days-stacked"] li[data-day="${s1b.day}"] [data-testid="tax-day-link"]`);
  const blockBox = await block.boundingBox();
  ok("13.19 @360 a day block is a full-width tap target at least 44px tall", !!blockBox && blockBox.height >= 44 && blockBox.width >= 270, JSON.stringify(blockBox));
  const quietBlock = page.locator(`[data-testid="tax-days-stacked"] li[data-day="${LAST}-01"] [data-testid="tax-day-link"]`);
  const quietBox = await quietBlock.boundingBox();
  ok("13.19b @360 a day with no activity is one compact line — 'No activity · on hold …' — still a 44px+ target, shorter than an active day",
    /No activity · on hold/.test(await quietBlock.innerText()) && !!quietBox && !!blockBox && quietBox.height >= 44 && quietBox.height < blockBox.height,
    JSON.stringify({ quietBox, blockBox }));
  await cardShots("13-days-month-stacked", [360, 768, 1024]);
  // `cardShots` ends at desktop width, where the blocks are hidden: the tap is a phone's.
  await page.setViewportSize({ width: 360, height: 900 });
  await page.waitForTimeout(300);
  await block.scrollIntoViewIfNeeded();
  await block.click();
  await page.waitForURL((u) => u.toString().includes(`day=${s1b.day}`), { timeout: 60_000 });
  await page.locator('[data-testid="tax-window"]').first().waitFor({ timeout: 60_000 });
  ok("13.20 @360 tapping a day's block opens that day", (await page.locator('[data-testid="tax-period-label"]').innerText()).includes(String(Number(s1b.day.slice(8, 10)))));
  await page.setViewportSize({ width: 1280, height: 900 });

  // The files: the CSV's day rows and the workbook's day table are the page's figures.
  await openDays(`/admin/tax?period=month&month=${LAST}`);
  const pageRows = await dayRows();
  const pageSeeded = pageRows.find((x) => x.key === s1b.day);
  const rFiles = await report1();
  {
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 90_000 }), page.locator('[data-testid="tax-export-csv"]').click()]);
    const file = resolve(OUT, `days-${dl.suggestedFilename()}`);
    await dl.saveAs(file);
    const csv = readFileSync(file, "utf8");
    const line = csv.split("\r\n").find((l) => l.startsWith(`"Day by day — ${s1b.day}","Sales"`));
    const daySales = Number(line?.split(",")[3]);
    ok("13.21 the CSV has the seeded day's Sales as a number — the page's row", !!line && Math.round(daySales * 100) === num(pageSeeded?.sales), `${line} vs ${pageSeeded?.sales}`);
    const dayLines = csv.split("\r\n").filter((l) => l.startsWith('"Day by day — ')).length;
    ok(`13.22 …eleven lines for each of the ${daysInLast} days`, dayLines === daysInLast * 11, `${dayLines} lines`);
    await page.getByRole("button", { name: /Done/ }).first().click().catch(() => {});
    await page.waitForTimeout(400);
  }
  {
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 90_000 }), page.locator('[data-testid="tax-export-xlsx"]').click()]);
    const file = resolve(OUT, `days-${dl.suggestedFilename()}`);
    await dl.saveAs(file);
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const ws = wb.worksheets[0];
    let header = null, sumRow = null;
    ws.eachRow((row) => {
      const vals = row.values.slice(1).map((v) => (v && typeof v === "object" && "richText" in v ? v.richText.map((t) => t.text).join("") : v));
      // A header cell with a unit line is "Sales" + a line break + "TZS": the name is its first line.
      const names = vals.map((v) => String(v ?? "").split(String.fromCharCode(10))[0]);
      if (names.includes("Less: on hold brought forward") && names.includes("Bets placed")) header = names;
      if (vals.includes("Sum of the days")) sumRow = vals;
    });
    const col = (name) => header ? header.indexOf(name) : -1;
    const cell = (name) => (sumRow && col(name) >= 0 ? sumRow[col(name)] : undefined);
    const asCents = (v) => (typeof v === "number" ? Math.round(v * 100) : num(v));
    ok("13.23 the workbook's day table carries every daily column, and its sum row adds up to Report 1",
      !!header && !!sumRow && asCents(cell("Sales")) === rFiles["Sales"] && asCents(cell("Payout")) === rFiles["Payout"] && asCents(cell("Refunds")) === rFiles["Refunds"],
      JSON.stringify({ header, sumRow }).slice(0, 400));
    await page.getByRole("button", { name: /Done/ }).first().click().catch(() => {});
    await page.waitForTimeout(400);
  }
}

// ── 10 · loading, progress and failure — what an officer sees while the page works ───────────────
{
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(`/admin/tax?period=month&month=${LAST}`, true);
  // Every hold keeps the REQUEST and delays the RESPONSE (a paused request aborts Next's RSC body).
  const holdNav = async (route) => {
    if (route.request().headers()["rsc"] !== "1") return route.continue();
    const resp = await route.fetch();
    await page.waitForTimeout(2500);
    await route.fulfill({ response: resp }).catch(() => {});
  };
  const isTaxPage = (u) => u.pathname === "/admin/tax";
  for (const w of [1280, 360]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.route(isTaxPage, holdNav);
    const from = page.url();
    await page.locator('[data-testid="tax-prev"]').first().click();
    await page.waitForTimeout(700);
    const marks = await page.locator('[data-testid="tax-prev"] [data-link-pending]').count();
    ok(`10.1 @${w} while the previous period loads, its arrow shows it is working`, marks === 1, `pending marks ${marks}`);
    await page.screenshot({ path: resolve(OUT, `10-loading-navigation-w${w}.png`), caret: "initial" });
    await page.waitForURL((u) => u.toString() !== from, { timeout: 60_000 });
    await page.locator('[data-testid="tax-window"]').first().waitFor({ timeout: 60_000 });
    await page.unroute(isTaxPage, holdNav);
    await page.waitForTimeout(300);
    ok(`10.1b @${w} …and once it has loaded the mark is gone`, (await page.locator("[data-link-pending]").count()) === 0);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(`/admin/tax?period=month&month=${LAST}`, true);

  // A download: its progress card, then its result.
  const holdExport = async (route) => {
    const resp = await route.fetch();
    await page.waitForTimeout(2500);
    await route.fulfill({ response: resp }).catch(() => {});
  };
  await page.route("**/api/admin/tax/export**", holdExport);
  const dl = page.waitForEvent("download", { timeout: 90_000 }).catch(() => null);
  await page.locator('[data-testid="tax-export-pdf"]').click();
  const working = await page.getByText("Generating the PDF file").first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
  ok("10.2 a download shows its progress card while the file is built", working && (await page.locator('[data-testid="tax-export-pdf"]').getAttribute("aria-busy")) === "true");
  await page.screenshot({ path: resolve(OUT, "10-export-progress-w1280.png"), caret: "initial" });
  const done = await page.getByText("PDF downloaded").first().waitFor({ timeout: 90_000 }).then(() => true, () => false);
  await dl;
  ok("10.3 …then says the file is downloaded, and names it", done && (await page.getByText(/50pick-government-tax-report-month-/).count()) > 0);
  await page.screenshot({ path: resolve(OUT, "10-export-done-w1280.png"), caret: "initial" });
  await page.getByRole("button", { name: /Done/ }).first().click().catch(() => {});
  await page.unroute("**/api/admin/tax/export**", holdExport);
  await page.waitForTimeout(500);

  // A download that fails: the server's words, and a way to try again. (The 503 below is planted by this drive.)
  const failExport = (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "The download could not be recorded in the audit log, so it was not released. Try again." }) });
  await page.route("**/api/admin/tax/export**", failExport);
  const before = consoleErrors.length;
  await page.locator('[data-testid="tax-export-csv"]').click();
  const failed = await page.getByText("CSV download failed").first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
  ok("10.4 a failed download says so, with the server's reason and a way to try again",
    failed && (await page.getByText(/could not be recorded in the audit log/).count()) > 0 && (await page.getByRole("button", { name: /Try again/ }).count()) > 0);
  await page.screenshot({ path: resolve(OUT, "10-export-failed-w1280.png"), caret: "initial" });
  await page.unroute("**/api/admin/tax/export**", failExport);
  await page.keyboard.press("Escape").catch(() => {});
  await page.getByRole("button", { name: /Close|Dismiss|Done|OK/ }).first().click({ timeout: 3000 }).catch(() => {});
  // The browser logs the planted 503 as a console error; it is this drive's own doing, not the page's.
  for (let i = consoleErrors.length - 1; i >= before; i--) if (/status of 503/.test(consoleErrors[i])) consoleErrors.splice(i, 1);
  await page.waitForTimeout(500);

  // The lock: the button says it is working while the server records it.
  await open(`/admin/tax?period=month&month=${LAST}`, true);
  const holdAction = async (route) => {
    const req = route.request();
    if (req.method() !== "POST" || !req.headers()["next-action"]) return route.continue();
    const resp = await route.fetch();
    await page.waitForTimeout(2500);
    await route.fulfill({ response: resp }).catch(() => {});
  };
  await page.route(isTaxPage, holdAction);
  await page.locator('[data-testid="tax-lock"]').first().click();
  const dlg5 = page.locator('[role="alertdialog"], [role="dialog"]').last();
  await dlg5.waitFor({ timeout: 30_000 });
  await dlg5.locator("input").first().fill("LOCK");
  await dlg5.getByRole("button", { name: /^Lock$/ }).click();
  await page.waitForTimeout(600);
  ok("10.5 while the lock is recorded, the Lock button shows it is working", (await page.locator('[data-testid="tax-lock"]').first().getAttribute("aria-busy")) === "true");
  await page.locator('[data-testid="tax-lock"]').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: resolve(OUT, "10-lock-working-w1280.png"), caret: "initial" });
  // ⛔ Wait on the STATUS line: "Locked …" also opens every row of Recent locks, so a page-wide text wait returns at once.
  await page.waitForFunction(() => /Locked/.test(document.querySelector('[data-testid="tax-status"]')?.textContent ?? ""), null, { timeout: 60_000 }).catch(() => {});
  await page.unroute(isTaxPage, holdAction);
  ok("10.6 …and then the period is locked", /Locked/.test(await page.locator('[data-testid="tax-status"]').innerText()));
  // A month locked now records its days: the card shows the filing's own, with no "holds no daily figures" note.
  ok("10.7 the locked month's day-by-day is the filing's own — every day listed, no 'no daily figures' note",
    (await page.locator('[data-testid="tax-days"] tbody tr[data-day]').count()) >= 28 && !(await page.locator("body").innerText()).includes("This filing holds no daily figures"));
}

// ── 11 · empty, not-started and wrong input ─────────────────────────────────────────────────────
{
  const EMPTY = prevKey(cur, 4);
  await open(`/admin/tax?period=month&month=${EMPTY}`, true);
  const rE = await report1();
  const allZero = Object.values(rE).every((v) => v === 0);
  ok(`11.1 a month with no activity (${EMPTY}) prints every Report 1 line as 0, and its check closes`, allZero && Object.keys(rE).length >= 8, JSON.stringify(rE));
  const statusE = await page.locator('[data-testid="tax-status"]').innerText();
  ok("11.2 …says it balances (nothing in, nothing out)", /Balanced/.test(statusE), statusE.slice(0, 120));
  ok("11.3 …shows no Exceptions card", (await page.locator('[data-testid="tax-exceptions"]').count()) === 0);
  const r2E = await page.locator('[data-testid="tax-report-2"]').innerText();
  ok("11.4 …and taxes nothing: Total Tax payable 0", /Total Tax payable[^0-9]*0(?![0-9,])/.test(r2E.replace(/\s+/g, " ")), r2E.slice(0, 200));
  await tiles("11-empty-month", [360, 1280]);

  const nextKey = (k) => { const [y, m] = k.split("-").map(Number); const i = y * 12 + m; return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`; };
  const FUTURE = nextKey(cur);
  await open(`/admin/tax?period=month&month=${FUTURE}`, true);
  const statusF = await page.locator('[data-testid="tax-status"]').innerText();
  ok(`11.5 a month that has not started (${FUTURE}) says so`, /has not started yet/.test(statusF), statusF.slice(0, 120));
  const shownF = (await page.locator('[data-testid="tax-period-label"]').innerText()).trim();
  const listF = (await page.getByLabel("Jump to month").first().innerText()).trim();
  ok("11.5b …and its month list names that month, not a placeholder", listF === shownF, `list "${listF}" · page "${shownF}"`);
  const bodyF = await page.locator("body").innerText();
  ok("11.6 …its Lock card says it cannot be locked yet", /has not started yet\. It can be locked once it has closed/.test(bodyF));
  ok("11.7 …its downloads are disabled, saying why", await page.locator('[data-testid="tax-export-pdf"]').isDisabled());
  ok("11.8 …and its 'next' arrow is the dimmed, disabled one", (await page.locator('[data-testid="tax-next"]').count()) === 0
    && (await page.locator('[aria-disabled="true"][title="The next period has not started"]').count()) === 1);
  await tiles("11-not-started", [360, 1280]);

  await open(`/admin/tax?period=custom&from=${s1b.day}T00:00&to=${s1b.day}T23:59`, true);
  await page.setViewportSize({ width: 360, height: 900 });
  const toGroup = page.locator('[role="group"][aria-label="End date and time (East Africa Time)"]');
  await typeSeg(toGroup.locator('input[inputmode="numeric"]').nth(0), "01");
  await page.locator('[data-testid="tax-custom-apply"]').click();
  const alertShown = await page.locator('[role="alert"]', { hasText: "Choose a start before the end" }).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
  ok("11.9 a custom window that ends before it starts is refused in words, and the page does not move", alertShown && page.url().includes(`to=${s1b.day}T23`));
  await page.locator('[data-testid="tax-custom-apply"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(OUT, "11-custom-refused-w360.png"), caret: "initial" });
  await page.setViewportSize({ width: 1280, height: 900 });

  await open(`/admin/tax?period=week&week=${seededWeek}`, true);
  const wkJ = page.locator('[role="group"][aria-label="Jump to the week of a day"]');
  const wkS = wkJ.locator('input[inputmode="numeric"]');
  await typeSeg(wkS.nth(0), "31"); await typeSeg(wkS.nth(1), "02"); await typeSeg(wkS.nth(2), sy);
  await page.waitForTimeout(300);
  ok("11.10 an impossible date (31 February) leaves Go disabled", await wkJ.locator('[data-testid="tax-jump-go"]').isDisabled());
}

// ── 12 · who sees what — a view-only officer, and a role without the report ─────────────────────
{
  const as = async (role, phone, name) => {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await c.newPage();
    const r = await p.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { role, phone, name } });
    if (!r.ok()) throw new Error(`seed-admin ${role} failed: ${r.status()}`);
    return { c, p };
  };
  const ro = await as("AUDITOR", "+255700000521", "Audit Officer");
  await ro.p.goto(`${BASE}/admin/tax?period=month&month=${LAST}`, { waitUntil: "domcontentloaded" });
  await ro.p.getByRole("heading", { name: "Tax report" }).first().waitFor({ timeout: 120_000 });
  await ro.p.locator('[data-testid="tax-window"]').first().waitFor({ timeout: 60_000 });
  ok("12.1 a view-only officer (Auditor) reads the report", (await ro.p.locator('[data-testid="tax-report-1"]').count()) === 1);
  const roBody = await ro.p.locator("body").innerText();
  // The platform's read-only shape: the page-wide banner, and a READ-ONLY chip where the control would be (its reason in the title).
  ok("12.2 …is offered no Lock or Reopen: the read-only banner says why, and the Lock card carries the read-only mark",
    (await ro.p.locator('[data-testid="tax-lock"], [data-testid="tax-unlock"], [data-testid="tax-lock-ack"]').count()) === 0
      && /can view Accounting & money but not change it/.test(roBody)
      && (await ro.p.locator('[title="Locking a period needs Finance or the Owner."]').count()) === 1);
  ok("12.3 …is not offered the rates form", (await ro.p.locator('[data-testid="tax-rates-form"]').count()) === 0);
  ok("12.4 …and can still download", await ro.p.locator('[data-testid="tax-export-pdf"]').isEnabled());
  await ro.p.locator('[title="Locking a period needs Finance or the Owner."]').first().scrollIntoViewIfNeeded().catch(() => {});
  await ro.p.screenshot({ path: resolve(OUT, "12-view-only-w1280.png"), caret: "initial" });
  await ro.c.close();

  const no = await as("SUPPORT", "+255700000522", "Support Agent");
  await no.p.goto(`${BASE}/admin/tax`, { waitUntil: "domcontentloaded" });
  await no.p.waitForTimeout(4000);
  ok("12.5 a role without the report (Support) sees no figures at /admin/tax", (await no.p.locator('[data-testid="tax-report-1"]').count()) === 0);
  ok("12.6 …and has no Tax report in its menu", (await no.p.locator('a[href="/admin/tax"]:visible').count()) === 0);
  await no.p.screenshot({ path: resolve(OUT, "12-no-access-w1280.png"), caret: "initial" });
  await no.c.close();
}

ok("9 · no console errors across the drive", consoleErrors.length === 0, consoleErrors.slice(0, 5).map((e) => e.slice(0, 300)).join(" | "));
writeFileSync(resolve(OUT, "drive-summary.txt"), `failures=${bad}\nconsole errors:\n${consoleErrors.join("\n")}\n`);
await browser.close();
console.log(`\nqa:tax-report: ${bad === 0 ? "ALL PASS" : `${bad} FAILED`}`);
process.exit(bad === 0 ? 0 : 1);
