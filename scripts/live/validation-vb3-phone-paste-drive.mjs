/**
 * VALIDATION BATCH 3 · ONE PHONE RULE AND A PASTE THAT REPLACES, DRIVEN (S10, 2026-10-03) — the batch report's DRIVE 1
 * and DRIVE 2, on the kit PhoneInput where people actually paste.
 *
 *   /admin/contacts → Add contact, at 1280 and at 360:
 *     (a) 712 345 678 typed, the caret at the end, "0755 000 111" pasted → the box is 755 000 111 (a whole number REPLACES);
 *     (b) the caret after "712 ", a plain "755000111" pasted → 755 000 111;
 *     (c) the caret at the start of 755 000 111, "0712 345 67" pasted → 712 345 67, "8 of 9 digits", Save off (the paste
 *         would overflow the box, so it replaces — never a mix of two numbers);
 *     (e) 712 678 typed, the caret after 712, "345" pasted → 712 345 678 (a short paste that fits still INSERTS; the caret
 *         is recorded — PhoneInput keeps none through its reformat, an older nicety owed);
 *     (f) "+255 0712 345 67" pasted into an empty box → 712 345 67; on leaving the box: "…this one has 8. Check whether
 *         some digits were cut off." (the trunk zero after +255 dropped, a digit missing — never the 007 range);
 *     (g) a single "8" pasted at the end of a full box → the box is 8 (overflow replaces — accepted, OD58 tracker note);
 *     (d) "+255 0712 345 678" pasted into an empty box → 712 345 678, the verdict OK on Yas; saved;
 *     (h) the list searched for "+255 0712 345 678" finds exactly that contact (the parser reads the trunk spelling).
 *   /auth/login and /auth/register, signed out, at 360 — the same PhoneInput: a whole number pasted over a typed one
 *     replaces it, and "+255 0712 345 678" lands as 712 345 678, the hidden input carrying the nine digits.
 *
 * Run: BASE=http://localhost:3010 node scripts/live/validation-vb3-phone-paste-drive.mjs
 * Boot (in-memory, zero prod risk; remove .next first — a stale .next 404s every /api/dev-test route):
 *   SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> DISABLE_ADMIN_TOTP=true npx next dev -p 3010
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const SHOTS = join(".qa-shots", "marketing-setup", "vb3");
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const DIALOG = '[role="dialog"][aria-modal="true"]';
const ADD_FORM = '[data-contact-form="add"]';
const NUMBER = `${ADD_FORM} input[autocomplete="tel-national"]`;
const SAVE = '[data-contact-form] button[type="submit"]';
const CUT_OFF = "this one has 8. Check whether some digits were cut off.";

const browser = await chromium.launch();

async function adminPage(viewport, phone) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: "ADMIN", phone, name: "QA VB3 Admin" } });
  if (!r.ok()) throw new Error(`seed-admin failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}

/** A real paste: a ClipboardEvent carrying the text, dispatched on the focused box — what a person's paste sends. */
const paste = (page, text) => page.evaluate((t) => {
  const el = document.activeElement;
  const dt = new DataTransfer();
  dt.setData("text/plain", t);
  const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
  // ⭐ A paste nobody took over gets the browser's own default — the text inserted at the caret, as typing (maxlength
  // included). A scripted event never does that by itself, and PhoneInput leaves a short clean paste to the browser.
  if (el.dispatchEvent(ev)) document.execCommand("insertText", false, t);
}, text);
const caretAt = (box, pos) => box.evaluate((el, p) => { el.focus(); el.setSelectionRange(p, p); }, pos);
const caretOf = (box) => box.evaluate((el) => el.selectionStart);
async function clearBox(box) {
  await box.focus();
  await box.press("Control+A");
  await box.press("Backspace");
  await wait(120);
}
async function typeInto(box, digits) {
  await clearBox(box);
  await box.pressSequentially(digits, { delay: 25 });
  await wait(200);
}
const verdict = async (page) => {
  const v = page.locator("[data-number-verdict]").first();
  if ((await v.count()) === 0) return { stage: null, text: "" };
  return { stage: await v.getAttribute("data-number-verdict"), text: ((await v.innerText()) || "").replace(/ +/g, " ").trim() };
};
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

async function contactsDialog(vp, phone) {
  const { ctx, page } = await adminPage(vp, phone);
  await page.goto(`${BASE}/admin/contacts`, { waitUntil: "networkidle" });
  await page.locator('[data-block="contacts-add"]').first().click();
  await page.waitForSelector(`${DIALOG} ${ADD_FORM}`, { timeout: 15_000 });
  await wait(300);
  return { ctx, page, box: page.locator(NUMBER).first() };
}

for (const vp of [{ name: "1280", width: 1280, height: 800 }, { name: "360", width: 360, height: 800 }]) {
  const { ctx, page, box } = await contactsDialog(vp, vp.name === "1280" ? "+255700000231" : "+255700000232");
  const at = (s) => `${vp.name} · ${s}`;

  // (a) a whole number pasted at the end of a typed one REPLACES it.
  await typeInto(box, "712345678");
  await caretAt(box, (await box.inputValue()).length);
  await paste(page, "0755 000 111");
  await wait(400);
  ok(at("(a) 712 345 678 + a pasted 0755 000 111 at the end → the box is 755 000 111"), (await box.inputValue()) === "755 000 111", await box.inputValue());

  // (b) a plain nine-digit paste in the middle REPLACES too.
  await typeInto(box, "712345678");
  await caretAt(box, 4);
  await paste(page, "755000111");
  await wait(300);
  ok(at("(b) the caret after “712 ” and a plain 755000111 pasted → 755 000 111"), (await box.inputValue()) === "755 000 111", await box.inputValue());

  // (c) a near-whole paste that would overflow REPLACES — never a mix of two numbers.
  await caretAt(box, 0);
  await paste(page, "0712 345 67");
  await wait(400);
  const c = await verdict(page);
  ok(at("(c) 0712 345 67 pasted at the start of 755 000 111 → 712 345 67, “8 of 9 digits”, Save off"),
    (await box.inputValue()) === "712 345 67" && c.text.includes("8 of 9 digits") && (await page.locator(SAVE).first().isDisabled()),
    `${await box.inputValue()} · ${c.text}`);
  await page.locator(`${DIALOG}`).first().screenshot({ path: join(SHOTS, `${vp.name}-c-near-whole-paste.png`) }).catch(() => {});

  // (e) a short paste that fits still INSERTS at the caret.
  await typeInto(box, "712678");
  await caretAt(box, 3);
  await paste(page, "345");
  await wait(300);
  const eValue = await box.inputValue();
  const eCaret = await caretOf(box);
  // ⚠️ The caret is RECORDED, not asserted: PhoneInput reformats on every change and keeps no caret, so after any edit
  // mid-number the caret goes to the end — older than vb3, owed (tracker); the paste's own rule (insert, not replace) is.
  ok(at("(e) 712 678 with “345” pasted after 712 → 712 345 678 (a short paste that fits is INSERTED)"), eValue === "712 345 678", `${eValue} caret ${eCaret}`);
  console.log(`  info ${at(`(e) the caret after the reformat: ${eCaret} of ${eValue.length}`)}`);

  // (f) the trunk zero after +255, a digit missing → eight digits, and the honest sentence once the box is left.
  await clearBox(box);
  await paste(page, "+255 0712 345 67");
  await wait(300);
  const fValue = await box.inputValue();
  await box.press("Tab");
  await wait(400);
  const f = await verdict(page);
  ok(at("(f) +255 0712 345 67 → 712 345 67, and on leaving: …this one has 8. Check whether some digits were cut off."),
    fValue === "712 345 67" && f.text.includes(CUT_OFF), `${fValue} · ${f.text}`);
  await page.locator(`${DIALOG}`).first().screenshot({ path: join(SHOTS, `${vp.name}-f-cut-off.png`) }).catch(() => {});

  // (g) a single digit pasted into a full box: overflow replaces (accepted — the box shows it, Save stays off).
  await typeInto(box, "712345678");
  await caretAt(box, (await box.inputValue()).length);
  await paste(page, "8");
  await wait(300);
  ok(at("(g) a single 8 pasted at the end of a full box → the box is 8 and Save is off"),
    (await box.inputValue()) === "8" && (await page.locator(SAVE).first().isDisabled()), await box.inputValue());

  if (vp.name === "1280") {
    // (d) the trunk spelling pasted whole → 712 345 678, OK on Yas — then saved, for (h).
    await clearBox(box);
    await paste(page, "+255 0712 345 678");
    await wait(900);
    const d = await verdict(page);
    const chip = ((await page.locator("[data-operator-chip]").first().innerText().catch(() => "")) || "").trim();
    ok("1280 · (d) +255 0712 345 678 → 712 345 678, the verdict OK and the chip Yas",
      (await box.inputValue()) === "712 345 678" && d.stage === "ok" && chip.toLowerCase().includes("yas"), `${await box.inputValue()} · ${d.stage} · chip "${chip}"`);
    await page.locator(SAVE).first().click();
    await page.waitForSelector(DIALOG, { state: "detached", timeout: 20_000 }).catch(() => {});
    await wait(600);
    // (h) the list searched with the trunk spelling finds exactly that contact.
    await page.goto(`${BASE}/admin/contacts?q=${encodeURIComponent("+255 0712 345 678")}`, { waitUntil: "networkidle" });
    const rows = await page.locator("main table tbody tr").count();
    const main = await page.locator("main").first().innerText();
    ok("1280 · (h) a search for +255 0712 345 678 finds exactly the contact stored as 0712345678, described as Number +255••••78",
      rows === 1 && main.includes("+255••••78"), `rows ${rows}`);
  }
  ok(at("the dialog has no sideways scroll"), await noSideScroll(page));
  await ctx.close();
}

/* ═══ DRIVE 2 · /auth/login and /auth/register, signed out, at 360 ═════════════════════════════════════════ */

const out = await browser.newContext({ viewport: { width: 360, height: 800 } });
const pg = await out.newPage();
await pg.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
const loginBox = pg.locator('form input[autocomplete="tel-national"]').first();
const loginHidden = pg.locator('form input[type="hidden"][name="identifier"]').first();
ok("LOGIN · the phone box is the kit PhoneInput, its nine digits on a hidden identifier", (await loginBox.count()) === 1 && (await loginHidden.count()) === 1);
await typeInto(loginBox, "712345678");
await caretAt(loginBox, (await loginBox.inputValue()).length);
await paste(pg, "0755 000 111");
await wait(300);
ok("LOGIN · 712 345 678 + a pasted 0755 000 111 → 755 000 111 shown, 755000111 submitted",
  (await loginBox.inputValue()) === "755 000 111" && (await loginHidden.inputValue()) === "755000111", `${await loginBox.inputValue()} / ${await loginHidden.inputValue()}`);
await clearBox(loginBox);
await paste(pg, "+255 0712 345 678");
await wait(300);
ok("LOGIN · +255 0712 345 678 pasted → 712 345 678 shown, 712345678 submitted",
  (await loginBox.inputValue()) === "712 345 678" && (await loginHidden.inputValue()) === "712345678", `${await loginBox.inputValue()} / ${await loginHidden.inputValue()}`);
await pg.screenshot({ path: join(SHOTS, "360-login-paste.png") });

await pg.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
const regBox = pg.locator('form input[autocomplete="tel-national"]').first();
const regHidden = pg.locator('form input[type="hidden"][name="phone"]').first();
await clearBox(regBox);
await paste(pg, "+255 0712 345 678");
await wait(300);
ok("REGISTER · +255 0712 345 678 pasted → 712 345 678 shown, 712345678 submitted",
  (await regBox.inputValue()) === "712 345 678" && (await regHidden.inputValue()) === "712345678", `${await regBox.inputValue()} / ${await regHidden.inputValue()}`);
ok("REGISTER · no sideways scroll at 360", await noSideScroll(pg));
await pg.screenshot({ path: join(SHOTS, "360-register-paste.png") });
await out.close();

await browser.close();
console.log(`\nvalidation vb3 phone paste drive: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
