/**
 * THE ADMIN GUIDE · Contacts and SMS campaigns, as a PDF (S10, 2026-10-03).
 * Ali: "create a pdf to guide admins how to use it … where they see balance … types of warnings they could get" and
 * "include screenshots on which pages the admin should go for each step". So EVERY step carries the menu path, what to
 * do, and a viewport screenshot of THAT page — taken here, on a local in-memory server (zero production risk), with
 * seeded, made-up contacts. ⛔ Every message the guide quotes is checked against the source first: a guide that quotes
 * a sentence the platform no longer says refuses to build (the build fails, naming it).
 *
 * Run (one boot, in-memory; remove .next first — a stale .next 404s every /api/dev-test route). The live-closed boot
 * shows what production shows today: the SMS switch closed, a real carrier configured.
 *   SMS_PROVIDER=blackball BLACKBALL_CLIENT_ID=dummy-not-a-key BLACKBALL_CLIENT_SECRET=dummy-not-a-key
 *     SMS_SENDER_ID=50pick BLACKBALL_API_URL=http://127.0.0.1:9/ SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true
 *     npx next dev -p 3010
 *   BASE=http://localhost:3010 node scripts/live/admin-guide.mjs
 * Writes docs/guides/50pick-admin-guide-contacts-and-sms-campaigns.pdf (and the screenshots in .qa-shots/admin-guide/).
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const OUT = process.env.OUT || join("docs", "guides");
const SHOTS = join(".qa-shots", "admin-guide");
const PDF = join(OUT, "50pick-admin-guide-contacts-and-sms-campaigns.pdf");
const VERSION = process.env.GUIDE_VERSION || "v1";
const DATE = process.env.GUIDE_DATE || new Date().toISOString().slice(0, 10);
mkdirSync(SHOTS, { recursive: true });
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const shots = new Map();

/* ═══ THE MESSAGES — each checked against the source before the guide may build ═══════════════════════════════════ */

/** Every source the quoted messages may live in. */
const SOURCE_DIRS = [
  "src/app/admin/contacts", "src/lib/contacts", "src/lib/server/contacts", "src/lib/server/marketing", "src/lib/marketing",
  "src/app/admin/campaigns", "src/app/admin/system", "src/lib/tz-msisdn.ts", "src/lib/server/staff-roles.ts",
  // v1.1 · the lapsed 2-step sentence the number lookup says (batch 7's softCheckStaff).
  "src/lib/server/rbac-guard.ts",
];
function readTree(path) {
  const st = statSync(path);
  if (st.isFile()) return /[.]tsx?$/.test(path) ? readFileSync(path, "utf8") : "";
  return readdirSync(path).map((f) => readTree(join(path, f))).join("\n");
}
const SOURCE = SOURCE_DIRS.map(readTree).join("\n");

import { MESSAGES } from "./admin-guide-messages.mjs";
const stale = MESSAGES.filter((m) => !SOURCE.includes(m.check ?? m.message));
if (stale.length > 0) {
  console.log("⛔ the guide quotes messages the platform no longer says — fix admin-guide-messages.mjs:");
  for (const m of stale) console.log(`   · [${m.area}] ${m.check ?? m.message}`);
  process.exit(1);
}

/* ═══ THE CAPTURES ════════════════════════════════════════════════════════════════════════════════════════════════ */

const browser = await chromium.launch();

async function shoot(page, id) {
  const path = join(SHOTS, `${id}.png`);
  await page.screenshot({ path });
  shots.set(id, path);
}
/** v1.1 · the contact dialog is taller than an 800-high window, so its Save — and, since batch 7, the reason beside a
 *  waiting Save — fell below the picture while the step said to press it. Shoot the dialog in a taller window, whole. */
async function shootTall(page, id) {
  const vp = page.viewportSize();
  await page.setViewportSize({ width: vp.width, height: 1240 });
  await wait(350);
  await shoot(page, id);
  await page.setViewportSize(vp);
  await wait(200);
}
async function step(id, fn) {
  try { await fn(); } catch (err) { failures.push(`${id}: ${err?.message ?? err}`); }
}
/** A real paste, dispatched on the focused box. */
const paste = (page, text) => page.evaluate((t) => {
  const el = document.activeElement;
  const dt = new DataTransfer();
  dt.setData("text/plain", t);
  const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
  // ⭐ A paste nobody took over gets the browser's own default — the text inserted at the caret, as typing (maxlength
  // included). A scripted event never does that by itself, and PhoneInput leaves a short clean paste to the browser.
  if (el.dispatchEvent(ev)) document.execCommand("insertText", false, t);
}, text);
/** On every page this script opens: the dev badge hidden (it is not on the live site) and the guide's red mark. */
const GUIDE_CSS = "nextjs-portal{display:none !important} .kp-guide-mark{outline:3px solid #ff3b30 !important;outline-offset:3px !important;border-radius:8px}";
async function guideContext(viewport) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript((css) => {
    const add = () => {
      if (document.getElementById("kp-guide-css")) return;
      const el = document.createElement("style");
      el.id = "kp-guide-css";
      el.textContent = css;
      (document.head || document.documentElement).appendChild(el);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
    else add();
  }, GUIDE_CSS);
  return ctx;
}
/** Outline what the step is about; `unmark` takes every outline off again. */
const mark = (page, selector) => page.evaluate((sel) => document.querySelectorAll(sel).forEach((e) => e.classList.add("kp-guide-mark")), selector);
const unmark = (page) => page.evaluate(() => document.querySelectorAll(".kp-guide-mark").forEach((e) => e.classList.remove("kp-guide-mark")));
/** Outline the card that carries a label (the System page's KPI tiles have no stamp of their own). */
const markCardByLabel = async (page, label) => {
  const el = page.locator("main").getByText(label, { exact: true }).first();
  if ((await el.count()) === 0) return false;
  return el.evaluate((node) => {
    const card = node.closest("[class*='rounded']");
    if (card) card.classList.add("kp-guide-mark");
    return card !== null;
  });
};
/** Leftover toasts from an earlier step never sit in a later step's picture. */
async function clearToasts(page) {
  for (const b of await page.locator("button[data-toast-dismiss]").all()) await b.click({ timeout: 2000 }).catch(() => {});
  await wait(350);
}
async function staff(viewport) {
  const ctx = await guideContext(viewport);
  const page = await ctx.newPage();
  page.on("dialog", (d) => { d.accept().catch(() => {}); });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: "ADMIN", phone: "+255700000301", name: "Asha Admin" } });
  if (!r.ok()) throw new Error(`seed-admin failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}
const DIALOG = '[role="dialog"][aria-modal="true"]';
const ADD_FORM = '[data-contact-form="add"]';
const NUMBER = `${ADD_FORM} input[autocomplete="tel-national"]`;
const SAVE = '[data-contact-form] button[type="submit"]';
const textButton = (page, scope, label) => page.locator(scope).locator("button", { hasText: label }).first();
async function closeDialog(page) {
  await textButton(page, DIALOG, "Cancel").click().catch(() => {});
  // v1.1 · batch 7: Cancel with typing in the form ASKS first ("Discard what you typed?") — answer it, as an admin would.
  const ask = page.locator(`${DIALOG} [data-discard-ask]`);
  if (await ask.isVisible().catch(() => false)) await textButton(page, DIALOG, "Discard").click().catch(() => {});
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 10_000 }).catch(() => {});
}
async function openAdd(page) {
  await page.locator('[data-block="contacts-add"]').first().click();
  await page.waitForSelector(`${DIALOG} ${ADD_FORM}`, { timeout: 15_000 });
  await wait(300);
}
const field = (page, key) => page.locator(`${DIALOG} [data-field="${key}"] input, ${DIALOG} [data-field="${key}"] textarea`).first();

// 1 · signing in, signed out.
await step("01-sign-in", async () => {
  const ctx = await guideContext({ width: 1280, height: 800 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle" });
  await shoot(page, "01-sign-in");
  await ctx.close();
});

const { ctx, page } = await staff({ width: 1280, height: 800 });
await page.request.post(`${BASE}/api/dev-test/marketing-contacts-seed?count=45`);

await step("02-menu", async () => {
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.locator('a[href="/admin/campaigns"]').first().scrollIntoViewIfNeeded();
  await mark(page, 'aside a[href="/admin/contacts"], aside a[href="/admin/campaigns"], nav a[href="/admin/contacts"], nav a[href="/admin/campaigns"]');
  await shoot(page, "02-menu");
  await unmark(page);
});
await step("03-contacts", async () => {
  await page.goto(`${BASE}/admin/contacts`, { waitUntil: "networkidle" });
  await shoot(page, "03-contacts");
});
await step("04-add", async () => {
  await mark(page, '[data-block="contacts-add"]');
  await shoot(page, "04a-add-button");
  await unmark(page);
  await openAdd(page);
  await shootTall(page, "04-add-empty");
  await page.locator(NUMBER).first().focus();
  await paste(page, "0754 321 987");
  await wait(1200);
  await field(page, "displayName").fill("Neema Mushi");
  await field(page, "email").fill("neema@example.com");
  await field(page, "tags").fill("vip, dar");
  await wait(300);
  await shootTall(page, "05-add-filled");
  await page.locator(SAVE).first().click();
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 20_000 });
  await wait(700);
  await shoot(page, "06-added");
});
await step("07-duplicate", async () => {
  await clearToasts(page);
  await openAdd(page);
  await page.locator(NUMBER).first().focus();
  await paste(page, "0754 321 987");
  await page.waitForSelector('[data-number-lookup="duplicate"]', { timeout: 15_000 });
  await wait(300);
  await mark(page, "[data-open-existing]");
  await shootTall(page, "07-duplicate");
  await unmark(page);
  await closeDialog(page);
});
await step("08-form-errors", async () => {
  await clearToasts(page);
  await openAdd(page);
  await page.locator(NUMBER).first().focus();
  await paste(page, "0765 432 109");
  await wait(1000);
  await field(page, "displayName").fill("Juma 0712 345 678");
  await field(page, "email").fill("juma@example");
  await field(page, "email").press("Tab");
  // v1.1 · batch 7: the problems show AS YOU TYPE and Save waits, its reason written beside it — nothing to press.
  await wait(700);
  await clearToasts(page);
  await mark(page, "[data-save-reason]");
  await shootTall(page, "08-form-errors");
  await closeDialog(page);
});
await step("09-edit", async () => {
  await clearToasts(page);
  await page.locator("[data-contact-row] a[data-edit-contact]").first().click();
  await page.waitForSelector(`${DIALOG} [data-contact-form="edit"]`, { timeout: 15_000 });
  await wait(400);
  await shootTall(page, "09-edit");
  await closeDialog(page);
});
await step("10-search", async () => {
  await page.goto(`${BASE}/admin/contacts?q=Neema`, { waitUntil: "networkidle" });
  await mark(page, 'main input[type="search"], main [role="searchbox"]');
  await shoot(page, "10-search-name");
  await unmark(page);
  await page.goto(`${BASE}/admin/contacts?q=${encodeURIComponent("0754 321 987")}`, { waitUntil: "networkidle" });
  await shoot(page, "11-search-number");
});
await step("12-filter", async () => {
  await page.goto(`${BASE}/admin/contacts`, { waitUntil: "networkidle" });
  const pill = page.locator('[data-filter-rail="contacts"] a', { hasText: "Vodacom" }).first();
  await pill.click();
  await page.waitForLoadState("networkidle");
  await wait(400);
  await mark(page, '[data-block="contacts-filtered"]');
  await shoot(page, "12-filter");
  await unmark(page);
});
await step("13-bulk", async () => {
  await page.goto(`${BASE}/admin/contacts`, { waitUntil: "networkidle" });
  const boxes = page.locator('[data-contact-row] td:first-child input[type="checkbox"]');
  for (let i = 0; i < 3; i++) await boxes.nth(i).check({ force: true });
  await page.waitForSelector('[data-block="contacts-bulk-bar"]', { timeout: 10_000 });
  await wait(300);
  await mark(page, '[data-block="contacts-bulk-bar"]');
  await shoot(page, "13-bulk-bar");
  await unmark(page);
  await page.locator('[data-block="contacts-bulk-bar"] button', { hasText: /^Tag$/ }).first().click();
  await page.locator('[data-field="tag"] input').first().fill("event-oct");
  await page.locator(DIALOG).locator("button", { hasText: "Continue" }).first().click();
  await wait(1200);
  await shoot(page, "14-bulk-confirm");
  await page.locator('[role="alertdialog"], [role="dialog"]').last().locator("button", { hasText: /^Tag/ }).last().click().catch(() => {});
  await wait(1500);
  await shoot(page, "15-bulk-done");
});
await step("16-export", async () => {
  await page.goto(`${BASE}/admin/contacts`, { waitUntil: "networkidle" });
  await page.locator('[data-block="contacts-export"]').first().scrollIntoViewIfNeeded();
  await mark(page, '[data-block="contacts-export"]');
  await shoot(page, "16-export");
  await unmark(page);
});

const SEL = {
  name: 'label[data-field="name"] input',
  bodySw: 'label[data-field="bodySw"] textarea',
  save: "[data-compose-save]",
  saved: "[data-compose-saved]",
  audience: '[data-block="compose-audience"]',
  test: '[data-block="compose-test"]',
};
await step("17-campaigns", async () => {
  await page.goto(`${BASE}/admin/campaigns`, { waitUntil: "networkidle" });
  await mark(page, 'main a[href="/admin/campaigns/new"]');
  await shoot(page, "17-campaigns");
  await unmark(page);
});
await step("18-compose", async () => {
  await page.goto(`${BASE}/admin/campaigns/new`, { waitUntil: "networkidle" });
  await shoot(page, "18-compose-empty");
  await page.locator(SEL.name).first().fill("October welcome");
  await page.locator(SEL.bodySw).first().fill("50pick: Karibu! Bashiri mechi za wikendi hii na ushinde.");
  await wait(500);
  await shoot(page, "19-compose-filled");
  await page.locator(SEL.bodySw).first().fill("50pick: Karibu! Bashiri mechi za wikendi hii na ushinde “leo”.");
  await wait(500);
  await shoot(page, "20-compose-warning");
  await page.locator(SEL.bodySw).first().fill("50pick: Karibu! Bashiri mechi za wikendi hii na ushinde.");
  await page.locator(SEL.audience).first().scrollIntoViewIfNeeded();
  await wait(300);
  await mark(page, SEL.audience);
  await shoot(page, "21-audience");
  await unmark(page);
  await page.locator(SEL.save).first().click();
  await page.waitForSelector(SEL.saved, { timeout: 20_000 });
  await wait(500);
  await clearToasts(page);
  await mark(page, `${SEL.save}, ${SEL.saved}`);
  await shoot(page, "22-saved");
  await unmark(page);
  await page.locator(SEL.test).first().scrollIntoViewIfNeeded();
  await wait(300);
  await mark(page, SEL.test);
  await shoot(page, "25-test-send");
  await unmark(page);
});
await step("23-draft", async () => {
  await page.goto(`${BASE}/admin/campaigns`, { waitUntil: "networkidle" });
  await mark(page, 'main table tbody a');
  await shoot(page, "23-campaigns-draft");
  await unmark(page);
  await page.locator("main a", { hasText: "October welcome" }).first().click();
  await page.waitForURL((u) => u.pathname.endsWith("/admin/campaigns/new"), { timeout: 20_000 });
  await page.waitForLoadState("networkidle");
  await wait(400);
  await shoot(page, "24-reopen");
});
await step("26-sms-credit", async () => {
  await page.goto(`${BASE}/admin/system`, { waitUntil: "networkidle" });
  await page.getByText("SMS credit").first().scrollIntoViewIfNeeded();
  await wait(300);
  await markCardByLabel(page, "SMS credit");
  await shoot(page, "26-sms-credit");
  await unmark(page);
});
await ctx.close();

await step("27-phone", async () => {
  const phone = await staff({ width: 390, height: 844 });
  await phone.page.goto(`${BASE}/admin/contacts`, { waitUntil: "networkidle" });
  await shoot(phone.page, "27-phone-contacts");
  await phone.page.goto(`${BASE}/admin/campaigns/new`, { waitUntil: "networkidle" });
  await shoot(phone.page, "28-phone-compose");
  await phone.ctx.close();
});

/* ═══ THE DOCUMENT ════════════════════════════════════════════════════════════════════════════════════════════════ */

import { SECTIONS, INTRO, BALANCE_STATES } from "./admin-guide-messages.mjs";
const img = (id) => (shots.has(id) ? `<img src="data:image/png;base64,${readFileSync(shots.get(id)).toString("base64")}" alt="">` : `<div class="missing">Screenshot ${id} could not be taken</div>`);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const stepHtml = (s, n) => `
  <section class="step">
    <h3><span class="n">${n}</span>${esc(s.title)}</h3>
    <p class="where"><b>Where:</b> ${esc(s.where)}</p>
    ${s.do.length ? `<ol>${s.do.map((d) => `<li>${esc(d)}</li>`).join("")}</ol>` : ""}
    ${(s.shots ?? []).map((id) => `<figure>${img(id)}</figure>`).join("")}
    ${s.phoneShots ? `<figure class="phones">${s.phoneShots.map((id) => img(id)).join("")}</figure>` : ""}
    ${(s.notes ?? []).map((t) => `<p class="note">${esc(t)}</p>`).join("")}
  </section>`;
let n = 0;
const body = SECTIONS.map((sec) => `<h2>${esc(sec.title)}</h2>${sec.lead ? `<p class="lead">${esc(sec.lead)}</p>` : ""}${sec.steps.map((s) => stepHtml(s, ++n)).join("")}`).join("");
const messages = `<h2>Messages you may see</h2><p class="lead">Every message below is copied from the platform as it is today. Find the message, then do what the last column says.</p>
  <table><thead><tr><th>Where</th><th>Message</th><th>What it means</th><th>What to do</th></tr></thead><tbody>
  ${MESSAGES.map((m) => `<tr><td>${esc(m.area)}</td><td class="msg">${esc(m.message)}</td><td>${esc(m.meaning)}</td><td>${esc(m.action)}</td></tr>`).join("")}
  </tbody></table>`;
const balance = `<h2>The SMS balance — what the tile can show</h2><table><thead><tr><th>The tile shows</th><th>What it means</th><th>What to do</th></tr></thead><tbody>
  ${BALANCE_STATES.map((b) => `<tr><td class="msg">${esc(b.shows)}</td><td>${esc(b.meaning)}</td><td>${esc(b.action)}</td></tr>`).join("")}</tbody></table>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>50pick admin guide</title><style>
  @page { size: A4; margin: 16mm 14mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1c1f26; font-size: 10.5pt; line-height: 1.45; }
  .cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; }
  .cover h1 { font-size: 30pt; margin: 0 0 6mm; } .cover .sub { font-size: 14pt; color: #4a5160; }
  .cover .meta { margin-top: 12mm; color: #6b7280; font-size: 10pt; }
  h2 { font-size: 16pt; margin: 9mm 0 3mm; padding-bottom: 2mm; border-bottom: 2px solid #c9a227; page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 0 0 2mm; } h3 .n { display: inline-block; min-width: 7mm; color: #c9a227; }
  .step { page-break-inside: avoid; margin: 0 0 7mm; }
  .where { margin: 0 0 2mm; color: #374151; } ol { margin: 0 0 3mm 5mm; padding-left: 4mm; }
  figure { margin: 2mm 0; text-align: center; } figure img { width: 84%; border: 1px solid #d1d5db; border-radius: 2mm; }
  figure.phones img { width: 38%; margin: 0 2%; vertical-align: top; }
  .note { background: #fdf8e7; border-left: 3px solid #c9a227; padding: 2mm 3mm; margin: 2mm 0; }
  .lead { color: #374151; } .missing { padding: 8mm; border: 1px dashed #b91c1c; color: #b91c1c; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; page-break-inside: auto; }
  th, td { border: 1px solid #d1d5db; padding: 1.6mm 2mm; vertical-align: top; text-align: left; }
  th { background: #f3f4f6; } tr { page-break-inside: avoid; } td.msg { font-style: italic; }
  .intro li { margin-bottom: 1.5mm; }
</style></head><body>
  <div class="cover"><h1>50pick admin guide</h1><div class="sub">Contacts and SMS campaigns — step by step, with the page for every step</div>
  <div class="meta">${esc(VERSION)} · ${esc(DATE)} · for staff with the Admin or Growth role · https://50pick.tz/admin</div></div>
  <h2>Before you start</h2><ul class="intro">${INTRO.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
  ${body}${balance}${messages}
</body></html>`;
writeFileSync(join(SHOTS, "guide.html"), html);
const pdfPage = await (await browser.newContext()).newPage();
await pdfPage.setContent(html, { waitUntil: "load" });
await pdfPage.pdf({ path: PDF, format: "A4", printBackground: true, margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" } });
await browser.close();

const missing = SECTIONS.flatMap((s) => s.steps).flatMap((s) => [...(s.shots ?? []), ...(s.phoneShots ?? [])]).filter((id) => !shots.has(id));
console.log(`guide: ${shots.size} screenshots · ${MESSAGES.length} messages checked against the source · ${failures.length} step failure(s) · ${missing.length} missing screenshot(s)`);
for (const f of failures) console.log(`  FAIL ${f}`);
for (const m of missing) console.log(`  MISSING ${m}`);
console.log(`PDF: ${PDF}`);
process.exit(failures.length === 0 && missing.length === 0 ? 0 : 1);
