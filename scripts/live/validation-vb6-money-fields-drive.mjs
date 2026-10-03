/**
 * VALIDATION BATCH 6 · A WHOLE-NUMBER MONEY BOX NEVER MULTIPLIES, DRIVEN (S10, 2026-10-03) — the round-2 report's steps,
 * on the console's most direct money mover: a player's Adjust balance (Players → a player → Adjust balance).
 *
 *   1  "9,500.00" pasted → the box holds 9500, the Field says the part after the dot was dropped, the button reads
 *      "Credit TZS 9,500" — never 950,000 (the raw box this replaced read it as 950000);
 *   2  1 2 . 5 0 typed key by key → 12, the line only once a digit is actually dropped;
 *   3  12500, ".", select all, paste 125000 → 125000 (a replacement while the dot is held is never swallowed);
 *   4  12500, ".", the caret moved between 12 and 500, 7 typed → 127500 (the hold ends where the caret went);
 *   5  "12500。00" pasted (the ideographic full stop) → 12500 and the line;
 *   6  in 125000 a "." typed after 12 → no line (nothing dropped); a 3 typed straight after → dropped, and the line;
 *   7  1000000 typed → the two-person ceremony: the typed word asked, the button off until the word and a reason;
 *   8  the notice region is always in the DOM, empty and unnamed before an edit, named once it speaks;
 *   9  a REAL credit of 9,500 on the in-memory store: the player's balance moves by exactly 9,500;
 *  10  /auth/register at 390: 712.345.678 typed into the phone box keeps all nine digits (a tel box reads dots as
 *      separators, never as a decimal point).
 *   Viewport tiles of the dialog at 1280 and 390.
 *
 * Run: BASE=http://localhost:3010 node scripts/live/validation-vb6-money-fields-drive.mjs
 * Boot (in-memory, zero prod risk; remove .next first): SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true npx next dev -p 3010
 */
import { chromium, request as pwRequest } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const SHOTS = join(".qa-shots", "marketing-setup", "vb6");
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DOT_LINE = "Whole numbers only — the part after the dot was dropped.";
const IDEOGRAPHIC_STOP = String.fromCharCode(0x3002);

const browser = await chromium.launch();

async function seedPlayer(phone, name) {
  const api = await pwRequest.newContext({ baseURL: BASE });
  try {
    const r = await api.post("/api/dev-test/seed-admin", { data: { phone, name, role: "PLAYER", balance: 0 }, timeout: 120_000 });
    const j = await r.json();
    if (!r.ok() || !j.ok) throw new Error(`seed PLAYER failed: ${r.status()}`);
    return j.userId;
  } finally { await api.dispose(); }
}
async function adminPage(viewport, phone) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: "ADMIN", phone, name: "QA VB6 Owner" } });
  if (!r.ok()) throw new Error(`seed-admin failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}
/** A real paste: the ClipboardEvent, then the browser's own default when nobody took it over. */
const paste = (page, text) => page.evaluate((t) => {
  const el = document.activeElement;
  const dt = new DataTransfer();
  dt.setData("text/plain", t);
  const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
  if (el.dispatchEvent(ev)) document.execCommand("insertText", false, t);
}, text);
const DIALOG = '[role="dialog"]';
async function openAdjust(page, playerId) {
  await page.goto(`${BASE}/admin/players/${playerId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Adjust balance" }).first().click();
  await page.waitForSelector(`${DIALOG} [data-field="amount"] input`, { timeout: 15_000 });
  await wait(300);
  return {
    box: page.locator(`${DIALOG} [data-field="amount"] input`).first(),
    field: page.locator(`${DIALOG} [data-field="amount"]`).first(),
    submit: page.locator(`${DIALOG} button`, { hasText: /^(Credit|Debit) TZS/ }).first(),
  };
}
async function clearBox(box) {
  await box.focus();
  await box.press("Control+A");
  await box.press("Backspace");
  await wait(120);
}
const fieldText = async (field) => ((await field.innerText().catch(() => "")) || "").replace(/ +/g, " ");
const submitText = async (submit) => ((await submit.innerText().catch(() => "")) || "").replace(/ +/g, " ").trim();

const playerId = await seedPlayer("+255710009661", "VB6 Player");
const { ctx, page } = await adminPage({ width: 1280, height: 800 }, "+255700000661");
const { box, field, submit } = await openAdjust(page, playerId);

// 8 (before any edit) · the notice region is mounted, empty, and not named by the box.
const status0 = await page.evaluate(() => {
  const f = document.querySelector('[role="dialog"] [data-field="amount"]');
  const p = f?.querySelector('p[role="status"]');
  const input = f?.querySelector("input");
  const named = (input?.getAttribute("aria-describedby") ?? "").split(" ").includes(p?.id ?? "-");
  return { present: p !== null && p !== undefined, empty: (p?.textContent ?? "x") === "", named };
});
ok("8 · before an edit the notice region is in the DOM, empty, and not named by the box", status0.present && status0.empty && !status0.named, JSON.stringify(status0));

// 1 · "9,500.00" pasted.
await box.focus();
await paste(page, "9,500.00");
await wait(400);
const v1 = await box.inputValue();
const s1 = await submitText(submit);
ok("1 · a pasted 9,500.00 holds 9500, says the part after the dot was dropped, and the button reads Credit TZS 9,500",
  v1.replace(/,/g, "") === "9500" && (await fieldText(field)).includes(DOT_LINE) && s1.includes("Credit TZS 9,500") && !s1.includes("950,000"),
  `box "${v1}" · button "${s1}"`);
const status1 = await page.evaluate(() => {
  const f = document.querySelector('[role="dialog"] [data-field="amount"]');
  const p = f?.querySelector('p[role="status"]');
  const input = f?.querySelector("input");
  return { text: p?.textContent ?? "", named: (input?.getAttribute("aria-describedby") ?? "").split(" ").includes(p?.id ?? "-") };
});
ok("8 · once it speaks, the notice holds the line and the box names it", status1.text.includes("Whole numbers only") && status1.named, JSON.stringify(status1));
await page.locator(DIALOG).first().screenshot({ path: join(SHOTS, "1280-adjust-pasted.png") }).catch(() => {});

// 2 · 12.50 typed key by key.
await clearBox(box);
await box.pressSequentially("12.", { delay: 40 });
await wait(200);
const lineAtDot = (await fieldText(field)).includes(DOT_LINE);
await box.pressSequentially("50", { delay: 40 });
await wait(300);
ok("2 · 1 2 . 5 0 typed → 12; no line at the dot itself, the line once a digit is dropped; Credit TZS 12",
  (await box.inputValue()) === "12" && !lineAtDot && (await fieldText(field)).includes(DOT_LINE) && (await submitText(submit)).includes("Credit TZS 12"),
  `box "${await box.inputValue()}" · line at dot ${lineAtDot} · button "${await submitText(submit)}"`);

// 3 · a select-all replacement while the dot is held.
await clearBox(box);
await box.pressSequentially("12500.", { delay: 40 });
await box.press("Control+A");
await paste(page, "125000");
await wait(300);
ok("3 · 12500, a dot, select all, paste 125000 → 125000", (await box.inputValue()).replace(/,/g, "") === "125000", await box.inputValue());

// 4 · the caret moved, then a digit.
await clearBox(box);
await box.pressSequentially("12500.", { delay: 40 });
await box.evaluate((el) => el.setSelectionRange(2, 2));
await box.press("7");
await wait(300);
ok("4 · 12500, a dot, the caret moved between 12 and 500, 7 typed → 127500", (await box.inputValue()).replace(/,/g, "") === "127500", await box.inputValue());

// 5 · the ideographic full stop.
await clearBox(box);
await paste(page, `12500${IDEOGRAPHIC_STOP}00`);
await wait(300);
ok("5 · 12500。00 pasted → 12500 and the line", (await box.inputValue()).replace(/,/g, "") === "12500" && (await fieldText(field)).includes(DOT_LINE), await box.inputValue());

// 6 · a stray dot that keeps its tail says nothing; a digit straight after it is dropped and said.
await clearBox(box);
await box.pressSequentially("125000", { delay: 30 });
await box.evaluate((el) => el.setSelectionRange(2, 2));
await box.press(".");
await wait(200);
const noLine = !(await fieldText(field)).includes(DOT_LINE);
await box.press("3");
await wait(300);
ok("6 · a dot typed after 12 in 125000 → no line; a 3 typed straight after → dropped, the box still 125000, and the line",
  noLine && (await box.inputValue()).replace(/,/g, "") === "125000" && (await fieldText(field)).includes(DOT_LINE),
  `no line first ${noLine} · box "${await box.inputValue()}"`);

// 7 · the two-person ceremony at 1,000,000.
await clearBox(box);
await box.pressSequentially("1000000", { delay: 30 });
await wait(400);
const word = page.locator(`${DIALOG} input[aria-label^="Type "]`).first();
ok("7 · 1000000 asks for the typed word, and the button is off without it", (await word.count()) === 1 && (await submit.isDisabled()), `word box ${await word.count()} · disabled ${await submit.isDisabled()}`);

// 9 · a REAL credit of 9,500: the balance moves by exactly that.
await clearBox(box);
await box.focus();
await paste(page, "9,500.00");
await page.locator(`${DIALOG} [data-field="reason"] textarea`).first().fill("drive: a pasted 9,500.00 credits 9,500");
await wait(300);
await submit.click();
await page.waitForSelector(`${DIALOG} [data-field="amount"]`, { state: "detached", timeout: 20_000 }).catch(() => {});
await wait(1200);
await page.reload({ waitUntil: "networkidle" });
const main = await page.locator("main").first().innerText();
ok("9 · the credit lands as exactly TZS 9,500 on the player's balance (never 950,000)",
  main.includes("9,500") && !main.includes("950,000"), main.slice(0, 200).replace(/ +/g, " "));
await ctx.close();

// The dialog at 390, after a paste.
const narrow = await adminPage({ width: 390, height: 844 }, "+255700000662");
const n = await openAdjust(narrow.page, playerId);
await n.box.focus();
await paste(narrow.page, "9,500.00");
await wait(400);
await narrow.page.screenshot({ path: join(SHOTS, "390-adjust-pasted.png") });
ok("390 · the dialog says the same at a phone's width, with no sideways scroll",
  (await submitText(n.submit)).includes("Credit TZS 9,500") && (await narrow.page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)));
await narrow.ctx.close();

// 10 · a tel box reads dots as separators.
const out = await browser.newContext({ viewport: { width: 390, height: 844 } });
const pg = await out.newPage();
await pg.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
const phone = pg.locator('form input[autocomplete="tel-national"]').first();
await phone.focus();
await phone.pressSequentially("712.345.678", { delay: 40 });
await wait(300);
ok("10 · 712.345.678 typed into the register phone box keeps all nine digits", (await phone.inputValue()) === "712 345 678", await phone.inputValue());
await out.close();

await browser.close();
console.log(`\nvalidation vb6 money fields drive: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
