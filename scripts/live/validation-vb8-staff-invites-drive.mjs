/**
 * VALIDATION BATCH 8 · THE STAFF AND INVITES SCREENS, DRIVEN (S10, 2026-10-03) — the batch report's steps D1–D14.
 *
 *   /admin/staff — the add form: a refused form opens NO confirmation and raises NO toast; every problem is said under its
 *     own field and the first one is focused (D1); a pasted +255 number is reduced by the kit PhoneInput and its error
 *     clears (D2); a short number (D3), a reason holding a phone number (D4) and a 501-character reason (D5, the box keeps
 *     every character — refused, never cut) each say their own sentence; a seeded player is added after typing SUPPORT
 *     (D6: "Staff added", the form resets, the reason is in the member's role history); a number with no account is told
 *     so under Phone after the confirmation, focused, no toast (D7).
 *   /admin/staff/[id] — the role change: a reason with the role unchanged is "Pick a different role first." under Role
 *     (D8); FINANCE with reason "x" is the short-reason sentence under Reason (D9); a second tab confirming the role the
 *     first tab already set is "Already Finance." under Role, focused, no toast (D10).
 *   /admin/invites/[id] — the contact entry: a trailing dot is the ONE email rule's sentence on blur (D11); both boxes
 *     empty is "Enter an email or a phone number…" under Email, focused, and typing a phone clears it (D12); five digits
 *     are "Enter all 9 digits…" under Phone (D13); "Jane@Example.com" is staged as jane@example.com (D14).
 *   Viewport tiles (never full-page) of both refused forms at 1280×800 and 360×800, with no sideways scroll at 360.
 *
 * Every expected sentence is the source's own (staff-roles.ts, staff/actions.ts, staff-forms.tsx, invite-admin-client.tsx,
 * contact-fields.ts), copied here as literals: a drive that computed them would agree with any wording.
 *
 * Run: BASE=http://localhost:3010 node scripts/live/validation-vb8-staff-invites-drive.mjs
 * Boot (in-memory, zero prod risk; remove .next first — a stale .next 404s every /api/dev-test route):
 *   SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> DISABLE_ADMIN_TOTP=true npx next dev -p 3010
 */
import { chromium, request as pwRequest } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const SHOTS = join(".qa-shots", "marketing-setup", "vb8");
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SAY = {
  phoneEmpty: "Enter the phone number of their 50pick account.",
  phoneInvalid: "Enter a valid Tanzanian mobile number: 9 digits after +255, starting with 6 or 7.",
  reasonShort: "A reason is required (≥ 5 characters).",
  reasonLong: "A reason can be at most 500 characters.",
  reasonPhone: "A reason can't hold a phone number — remove the number and save again.",
  noAccount: "No account with that phone.",
  roleUnchanged: "Pick a different role first.",
  alreadyFinance: "Already Finance.",
  emailShape: "This doesn't look like an email address (name@example.com).",
  needEmailOrPhone: "Enter an email or a phone number — a contact needs at least one.",
  phoneIncomplete: "Enter all 9 digits of a Tanzanian mobile number, starting with 6 or 7.",
};
const ADMIN_PHONE = "+255700000181";
const PLAYER_PHONE = "+255710009181";
const PLAYER_NAME = "VB8 Player";
const NO_ACCOUNT_NATIONAL = "719999181";

const browser = await chromium.launch();

async function adminPage(viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: "ADMIN", phone: ADMIN_PHONE, name: "QA VB8 Owner" } });
  if (!r.ok()) throw new Error(`seed-admin ADMIN failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}

/** A player to promote — seeded in a context of its own, so the admin's one session is never signed out. */
async function seedPlayer() {
  const api = await pwRequest.newContext({ baseURL: BASE });
  try {
    const r = await api.post("/api/dev-test/seed-admin", { data: { phone: PLAYER_PHONE, name: PLAYER_NAME, role: "PLAYER" }, timeout: 120_000 });
    return r.ok();
  } finally { await api.dispose(); }
}

const toasts = (page) => page.locator("button[data-toast-dismiss]").count();
const dialogs = (page) => page.locator('[role="alertdialog"]:visible, [role="dialog"]:visible').count();
const fieldText = (scope, key) => scope.locator(`[data-field="${key}"]`).first().innerText().catch(() => "");
const focusedIn = (page, key) => page.evaluate((k) => {
  const a = document.activeElement;
  return a !== null && a.closest(`[data-field="${k}"]`) !== null;
}, key);
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
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

async function pickRole(page, scope, label) {
  await scope.locator('[data-field="role"] [role="combobox"]').first().click();
  await page.getByRole("option", { name: label, exact: true }).first().click();
  await wait(150);
}

async function confirmTyped(page, word) {
  const dialog = page.locator('[role="alertdialog"]:visible, [role="dialog"]:visible').first();
  await dialog.waitFor({ state: "visible", timeout: 15_000 });
  await dialog.locator(`input[placeholder="${word}"]`).fill(word);
  const buttons = dialog.locator("button:not([disabled])");
  const n = await buttons.count();
  // The confirm button is the dialog's enabled primary action — the last enabled button that is not Cancel.
  for (let i = n - 1; i >= 0; i--) {
    const b = buttons.nth(i);
    const t = (await b.innerText()).trim();
    if (t !== "" && t.toLowerCase() !== "cancel") { await b.click(); return t; }
  }
  throw new Error("no confirm button in the dialog");
}

/* ═══ /admin/staff — THE ADD FORM ═════════════════════════════════════════════════════════════════════════ */

const playerSeeded = await seedPlayer();
ok("SETUP · the player to promote is seeded in a context of its own", playerSeeded);

const { ctx, page } = await adminPage({ width: 1280, height: 800 });
await page.goto(`${BASE}/admin/staff`, { waitUntil: "networkidle" });
// The add form is the one form on the page with a phone box (the kit PhoneInput).
const addForm = page.locator('main form:has(input[autocomplete="tel-national"])').first();
const phoneBox = addForm.locator('[data-field="phone"] input[autocomplete="tel-national"]');
const reasonBox = addForm.locator('input[name="reason"], textarea[name="reason"]').first();
const addButton = addForm.getByRole("button", { name: "Add as staff" }).first();
ok("SETUP · the add form, its phone box and its reason are on screen", (await addForm.count()) === 1 && (await phoneBox.count()) === 1 && (await reasonBox.count()) === 1);

// D1 · reason "abc", phone empty.
await reasonBox.fill("abc");
await addButton.click();
await wait(400);
const d1Phone = await fieldText(addForm, "phone");
const d1Reason = await fieldText(addForm, "reason");
ok("D1 · a refused add opens no confirmation and raises no toast", (await dialogs(page)) === 0 && (await toasts(page)) === 0);
ok("D1 · Phone says its empty-box sentence and Reason the short-reason sentence, each under its own field",
  d1Phone.includes(SAY.phoneEmpty) && d1Reason.includes(SAY.reasonShort), `phone: ${d1Phone} · reason: ${d1Reason}`);
ok("D1 · focus lands on the phone box — the first problem", await focusedIn(page, "phone"));
await page.locator('[data-field="phone"]').first().scrollIntoViewIfNeeded();
await page.screenshot({ path: join(SHOTS, "staff-add-refused-1280.png") });

// D2 · paste "+255 712 345 678".
await phoneBox.focus();
await paste(page, "+255 712 345 678");
await wait(300);
const d2Value = await phoneBox.inputValue();
const d2Phone = await fieldText(addForm, "phone");
ok("D2 · a pasted +255 712 345 678 reads 712 345 678 in the box and the phone error clears",
  d2Value === "712 345 678" && !d2Phone.includes(SAY.phoneEmpty), `box "${d2Value}" · field: ${d2Phone}`);

// D3 · a five-digit number.
await phoneBox.fill("71234");
await reasonBox.fill("valid reason text");
await addButton.click();
await wait(400);
const d3Phone = await fieldText(addForm, "phone");
ok("D3 · 71234 is the invalid-number sentence under Phone, no confirmation", d3Phone.includes(SAY.phoneInvalid) && (await dialogs(page)) === 0, d3Phone);

// D4 · a reason holding a phone number.
await phoneBox.fill("");
await phoneBox.focus();
await paste(page, "0712 345 678");
await reasonBox.fill("call 0712 345 678");
await addButton.click();
await wait(400);
const d4Reason = await fieldText(addForm, "reason");
ok("D4 · a reason holding 0712 345 678 says the phone-number sentence under Reason", d4Reason.includes(SAY.reasonPhone) && (await dialogs(page)) === 0, d4Reason);

// D5 · a 501-character reason.
const long = "r".repeat(501);
await reasonBox.fill(long);
await addButton.click();
await wait(400);
const d5Reason = await fieldText(addForm, "reason");
const d5Kept = (await reasonBox.inputValue()).length;
ok("D5 · 501 characters is the at-most-500 sentence, and the box keeps all 501 (refused, never cut)",
  d5Reason.includes(SAY.reasonLong) && d5Kept === 501, `kept ${d5Kept} · ${d5Reason.slice(0, 120)}`);

// D6 · the seeded player, reason "new support hire", confirmed by typing SUPPORT.
await phoneBox.fill("");
await phoneBox.focus();
await paste(page, PLAYER_PHONE);
await reasonBox.fill("new support hire");
await pickRole(page, addForm, "Support");
await addButton.click();
const d6Confirm = await confirmTyped(page, "SUPPORT").catch((e) => `none: ${e.message}`);
await page.locator("button[data-toast-dismiss]").first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
const d6Toast = await page.locator("body").innerText();
await wait(600);
const d6Reset = (await phoneBox.inputValue()) === "" && (await reasonBox.inputValue()) === "";
ok("D6 · the player is added after typing SUPPORT: “Staff added”, and the form resets",
  d6Toast.includes("Staff added") && d6Reset, `confirm "${d6Confirm}" · reset ${d6Reset}`);

// D7 · a number with no account.
await phoneBox.click();
await paste(page, NO_ACCOUNT_NATIONAL);
await wait(200);
ok("D7 · SETUP · the number is in the box before Add", (await phoneBox.inputValue()) === "719 999 181", await phoneBox.inputValue());
await reasonBox.fill("no such account here");
await pickRole(page, addForm, "Support");
const toastsBefore7 = await toasts(page);
await addButton.click();
await confirmTyped(page, "SUPPORT").catch(() => {});
await wait(1500);
const d7Phone = await fieldText(addForm, "phone");
ok("D7 · a number with no account is told so under Phone after the confirmation, focused, no new toast",
  d7Phone.includes(SAY.noAccount) && (await focusedIn(page, "phone")) && (await toasts(page)) <= toastsBefore7, d7Phone.slice(0, 160));

/* ═══ /admin/staff/[id] — THE ROLE CHANGE ═════════════════════════════════════════════════════════════════ */

await page.goto(`${BASE}/admin/staff`, { waitUntil: "networkidle" });
const memberLink = page.locator('a[href^="/admin/staff/"]', { hasText: PLAYER_NAME }).first();
const memberHref = (await memberLink.count()) === 1 ? await memberLink.getAttribute("href") : null;
ok("SETUP · the new member is listed with a link to their page", memberHref !== null);
if (memberHref !== null) {
  await page.goto(`${BASE}${memberHref}`, { waitUntil: "networkidle" });
  const history = await page.locator("main").innerText();
  ok("D6 · the member's role history shows the reason as typed", history.includes("new support hire"));

  const change = page.locator('main form:has(input[name="reason"])').first();
  const changeReason = change.locator('input[name="reason"], textarea[name="reason"]').first();
  // The form's own button reads "Change role" and stays disabled until a different role is picked; the unsaved bar's
  // Save submits the form the same way (requestSubmit), which is what D8 presses.
  const save = change.locator('button[type="submit"]').first();
  const barSave = (f) => f.evaluate((form) => form.requestSubmit());

  // D8 · a reason only, the role unchanged — the bar's Save.
  await changeReason.fill("reason without a new role");
  await wait(300);
  await barSave(change);
  await wait(400);
  const d8Role = await fieldText(change, "role");
  ok("D8 · a reason with the role unchanged is “Pick a different role first.” under Role, focused",
    d8Role.includes(SAY.roleUnchanged) && (await focusedIn(page, "role")), d8Role);

  // D9 · FINANCE with reason "x".
  await pickRole(page, change, "Finance");
  await changeReason.fill("x");
  await save.click();
  await wait(400);
  const d9Reason = await fieldText(change, "reason");
  ok("D9 · FINANCE with reason x is the short-reason sentence under Reason, no confirmation",
    d9Reason.includes(SAY.reasonShort) && (await dialogs(page)) === 0, d9Reason);

  // D10 · two tabs: A sets FINANCE; B, loaded before, confirms FINANCE too.
  const tabB = await ctx.newPage();
  await tabB.goto(`${BASE}${memberHref}`, { waitUntil: "networkidle" });
  await changeReason.fill("moved to the finance desk");
  await save.click();
  await confirmTyped(page, "FINANCE").catch(() => {});
  await wait(1500);
  const changeB = tabB.locator('main form:has(input[name="reason"])').first();
  await pickRole(tabB, changeB, "Finance");
  await changeB.locator('input[name="reason"], textarea[name="reason"]').first().fill("the same move from another tab");
  const toastsB = await toasts(tabB);
  await changeB.locator('button[type="submit"]').first().click();
  await confirmTyped(tabB, "FINANCE").catch(() => {});
  await wait(1500);
  const d10Role = await fieldText(changeB, "role");
  ok("D10 · the second tab's FINANCE is “Already Finance.” under Role, focused, no new toast",
    d10Role.includes(SAY.alreadyFinance) && (await focusedIn(tabB, "role")) && (await toasts(tabB)) <= toastsB, d10Role);
  await tabB.close();
}

/* ═══ /admin/invites/[id] — THE CONTACT ENTRY ═════════════════════════════════════════════════════════════ */

await page.goto(`${BASE}/admin/invites`, { waitUntil: "networkidle" });
await page.getByLabel("Campaign name").first().fill("VB8 drive campaign");
const bonus = page.getByLabel("Bonus per invitee").first();
if ((await bonus.count()) === 1) await bonus.fill("1000");
await page.getByRole("button", { name: "Create campaign" }).first().click();
await page.waitForURL((u) => /admin.invites.[a-z0-9_]+$/i.test(u.pathname), { timeout: 30_000 }).catch(() => {});
await page.waitForLoadState("networkidle");
const onDetail = new URL(page.url()).pathname.split("/").length === 4;
ok("SETUP · a campaign is created and its page opens", onDetail, page.url());
const emailBox = page.locator('[data-field="email"] input').first();
const invPhone = page.locator('[data-field="phone"] input[autocomplete="tel-national"]').first();
const addToList = page.getByRole("button", { name: "Add to list" }).first();
const main = page.locator("main").first();

// D11 · a trailing dot, then Tab.
await emailBox.fill("jane@example.com.");
await emailBox.press("Tab");
await wait(300);
const d11 = await fieldText(main, "email");
ok("D11 · jane@example.com. is the ONE email rule's sentence on blur", d11.includes(SAY.emailShape), d11);

// D12 · both boxes empty.
await emailBox.fill("");
await invPhone.fill("");
await addToList.click();
await wait(300);
const d12 = await fieldText(main, "email");
const d12Focus = await focusedIn(page, "email");
await page.locator('[data-field="email"]').first().scrollIntoViewIfNeeded();
await page.screenshot({ path: join(SHOTS, "invites-entry-refused-1280.png") });
await invPhone.focus();
await paste(page, "712345181");
await wait(300);
const d12Cleared = !(await fieldText(main, "email")).includes(SAY.needEmailOrPhone);
ok("D12 · both empty is the need-one sentence under Email, focused — and typing a phone clears it",
  d12.includes(SAY.needEmailOrPhone) && d12Focus && d12Cleared, `${d12} · focus ${d12Focus} · cleared ${d12Cleared}`);

// D13 · five digits.
await invPhone.fill("71234");
await addToList.click();
await wait(300);
const d13 = await fieldText(main, "phone");
ok("D13 · 71234 is the all-9-digits sentence under Phone", d13.includes(SAY.phoneIncomplete), d13);

// D14 · a mixed-case address is staged lower case.
await invPhone.fill("");
await emailBox.fill("Jane@Example.com");
await addToList.click();
await wait(400);
const staged = await main.innerText();
ok("D14 · Jane@Example.com is staged as jane@example.com", staged.includes("jane@example.com") && !staged.includes("Jane@Example.com"));
await ctx.close();

/* ═══ 360 × 800 — the two refused forms on a phone ═════════════════════════════════════════════════════════ */

const narrow = await adminPage({ width: 360, height: 800 });
await narrow.page.goto(`${BASE}/admin/staff`, { waitUntil: "networkidle" });
const nForm = narrow.page.locator('main form:has(input[autocomplete="tel-national"])').first();
await nForm.locator('input[name="reason"], textarea[name="reason"]').first().fill("abc");
await nForm.getByRole("button", { name: "Add as staff" }).first().click();
await wait(400);
await narrow.page.locator('[data-field="phone"]').first().scrollIntoViewIfNeeded();
await narrow.page.screenshot({ path: join(SHOTS, "staff-add-refused-360.png") });
ok("360 · the refused add form says both sentences with no sideways scroll",
  (await fieldText(nForm, "phone")).includes(SAY.phoneEmpty) && (await fieldText(nForm, "reason")).includes(SAY.reasonShort) && (await noSideScroll(narrow.page)));
await narrow.page.goto(`${BASE}/admin/invites`, { waitUntil: "networkidle" });
const firstCampaign = narrow.page.locator('a[href^="/admin/invites/"]').first();
if ((await firstCampaign.count()) === 1) {
  await firstCampaign.click();
  await narrow.page.waitForLoadState("networkidle");
  await narrow.page.getByRole("button", { name: "Add to list" }).first().click();
  await wait(300);
  await narrow.page.locator('[data-field="email"]').first().scrollIntoViewIfNeeded();
  await narrow.page.screenshot({ path: join(SHOTS, "invites-entry-refused-360.png") });
  ok("360 · the refused contact entry says the need-one sentence with no sideways scroll",
    (await fieldText(narrow.page.locator("main").first(), "email")).includes(SAY.needEmailOrPhone) && (await noSideScroll(narrow.page)));
} else ok("360 · a campaign to open at 360", false, "no campaign link on /admin/invites");
await narrow.ctx.close();

await browser.close();
console.log(`\nvalidation vb8 staff + invites drive: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
