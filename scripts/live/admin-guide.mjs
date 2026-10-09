/**
 * THE ADMIN GUIDE v2 · Contacts and SMS campaigns — the whole flow, as a PDF (S10, 2026-10-03; v2 2026-10-09).
 * Ali: "include screenshots on which pages the admin should go for each step" and (v2) "no unneeded titles and comments, only
 * perfect straightforward guidance on the whole flow from contacts … to all … contacts import directions … recommendation for
 * the first couple of tests before huge bulks … how much to import each time". So EVERY step carries the menu path, what to
 * do, and a picture of THAT page — taken here, on a local in-memory server (zero production risk), with made-up people.
 * ⛔ Every message the guide quotes is checked against the source first: a guide that quotes a sentence the platform no
 * longer says refuses to build (naming it).
 *
 * THREE RUNS, in this order — each on a fresh in-memory server (remove .next first: a stale .next 404s every /api/dev-test
 * route), DISABLE_ADMIN_TOTP=true, SESSION_SECRET and OTP_PEPPER set:
 *   a · PRODUCTION'S LOOK — SMS_PROVIDER=blackball, dummy keys, SMS_SENDER_ID=50pick and BLACKBALL_API_URL at this script's
 *       own stand-in (http://127.0.0.1:${GUIDE_VENDOR_PORT:-3997}/api/sms/send): its balance endpoint answers TZS 250,000 and
 *       it REFUSES every send, so nothing can leave. The contact book, the import, the System page and the composer.
 *   b · A CAMPAIGN, DRIVEN END TO END on the console stub (SMS_PROVIDER=console: messages go to the server log, never to a
 *       phone; the live seed refuses any other rail): tag, write, confirm, start, wait, pause, resume, finish, receipts and
 *       results; the staged campaigns for the figures, a system pause, a stop and a copy.
 *   pdf · the document, from the pictures of a and b.
 *     BASE=http://localhost:3010 node scripts/live/admin-guide.mjs a|b|pdf
 * Writes docs/guides/50pick-admin-guide-contacts-and-sms-campaigns.pdf (pictures in .qa-shots/admin-guide/).
 */
import { chromium } from "playwright";
import http from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { IMPORT_STEPS, SECTIONS, BALANCE_STATES, MESSAGES } from "./admin-guide-messages.mjs";

const PHASE = process.argv[2] || "";
if (!["a", "b", "pdf"].includes(PHASE)) {
  console.log("usage: node scripts/live/admin-guide.mjs a|b|pdf");
  process.exit(2);
}
const BASE = process.env.BASE || "http://localhost:3010";
const OUT = process.env.OUT || join("docs", "guides");
const SHOTS = join(".qa-shots", "admin-guide");
const PDF = join(OUT, "50pick-admin-guide-contacts-and-sms-campaigns.pdf");
const VERSION = process.env.GUIDE_VERSION || "v2";
const DATE = process.env.GUIDE_DATE || new Date().toISOString().slice(0, 10);
const VENDOR_PORT = Number(process.env.GUIDE_VENDOR_PORT || 3997);
/** The pictures shot whole as a dialog (printed tall), kept across the three runs. */
const DIALOG_FILE = join(SHOTS, "dialogs.json");
mkdirSync(SHOTS, { recursive: true });
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const taken = [];
const DIALOG_SHOTS = new Set(existsSync(DIALOG_FILE) ? JSON.parse(readFileSync(DIALOG_FILE, "utf8")) : []);

/* ═══ THE MESSAGES — each checked against the source before the guide may build ═══════════════════════════════════ */

const SOURCE_DIRS = [
  "src/app/admin/contacts", "src/lib/contacts", "src/lib/server/contacts", "src/lib/server/marketing", "src/lib/marketing",
  "src/app/admin/campaigns", "src/app/admin/system", "src/lib/tz-msisdn.ts", "src/lib/server/staff-roles.ts", "src/lib/server/rbac-guard.ts",
];
function readTree(path) {
  const st = statSync(path);
  if (st.isFile()) return /[.]tsx?$/.test(path) ? readFileSync(path, "utf8") : "";
  return readdirSync(path).map((f) => readTree(join(path, f))).join("\n");
}
const SOURCE = SOURCE_DIRS.filter((p) => existsSync(p)).map(readTree).join("\n");
const stale = MESSAGES.filter((m) => !SOURCE.includes(m.check ?? m.message));
if (stale.length > 0) {
  console.log("⛔ the guide quotes messages the platform no longer says — fix admin-guide-messages.mjs:");
  for (const m of stale) console.log(`   · [${m.area}] ${m.check ?? m.message}`);
  process.exit(1);
}

/* ═══ THE PICTURES ════════════════════════════════════════════════════════════════════════════════════════════════ */

const browser = PHASE === "pdf" ? null : await chromium.launch();

async function shoot(page, id) {
  await page.screenshot({ path: join(SHOTS, `${id}.png`) });
  DIALOG_SHOTS.delete(id);
  taken.push(id);
}
/** THE DIALOG ALONE, in a tall window so all of it is laid out, printed tall so its words read at a normal size. */
async function shootTall(page, id, root = DIALOG) {
  const vp = page.viewportSize();
  await page.setViewportSize({ width: vp.width, height: 1240 });
  await wait(350);
  // The PANEL (`.mat-modal`, the kit Modal's box) — `[role=dialog]` itself is the full-screen layer with its scrim.
  const panel = page.locator(root === DIALOG ? inDialog(".mat-modal") : `${root} .mat-modal`).first();
  const dialog = (await panel.count()) > 0 ? panel : page.locator(root).first();
  if ((await dialog.count()) > 0) {
    await dialog.screenshot({ path: join(SHOTS, `${id}.png`) });
    DIALOG_SHOTS.add(id);
    taken.push(id);
  } else {
    await shoot(page, id);
  }
  await page.setViewportSize(vp);
  await wait(200);
}
/** The officer's page of the run: a step that fails leaves its picture as FAIL-<id>.png beside the others (never in the PDF) and
 *  the words of any open dialog in its failure line, so a failure is read without a re-run. */
let stepPage = null;
async function step(id, fn) {
  try { await fn(); } catch (err) {
    let seen = "";
    if (stepPage) {
      await stepPage.screenshot({ path: join(SHOTS, `FAIL-${id}.png`) }).catch(() => {});
      seen = await stepPage.evaluate(() => {
        const d = document.querySelector('[role="dialog"], [role="alertdialog"]');
        return d ? ` · open dialog (${d.getAttribute("role")}, aria-modal ${d.getAttribute("aria-modal")}): ${(d.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 300)}` : " · no dialog open";
      }).catch(() => "");
    }
    failures.push(`${id}: ${err?.message ?? err}${seen}`);
  }
}
/** A real paste, dispatched on the focused box. */
const paste = (page, text) => page.evaluate((t) => {
  const el = document.activeElement;
  const dt = new DataTransfer();
  dt.setData("text/plain", t);
  const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
  if (el.dispatchEvent(ev)) document.execCommand("insertText", false, t);
}, text);
/** On every page: the dev badge hidden (it is not on the live site), and the guide's red outline. */
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
const mark = (page, selector) => page.evaluate((sel) => document.querySelectorAll(sel).forEach((e) => e.classList.add("kp-guide-mark")), selector);
const unmark = (page) => page.evaluate(() => document.querySelectorAll(".kp-guide-mark").forEach((e) => e.classList.remove("kp-guide-mark")));
const markCardByLabel = (page, label) => page.evaluate((want) => {
  const leaves = [...document.querySelectorAll("main *")].filter((el) => el.children.length === 0 && (el.textContent ?? "").trim().toLowerCase() === want.toLowerCase());
  for (const leaf of leaves) {
    for (let n = leaf.parentElement; n && n.tagName !== "MAIN"; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (parseFloat(cs.borderTopLeftRadius) >= 8 && cs.borderTopWidth !== "0px") { n.classList.add("kp-guide-mark"); return true; }
    }
  }
  return false;
}, label);
async function clearToasts(page) {
  for (const b of await page.locator("button[data-toast-dismiss]").all()) await b.click({ timeout: 2000 }).catch(() => {});
  await wait(350);
}
async function staff(viewport, phone = "+255700000301", name = "Asha Admin") {
  const ctx = await guideContext(viewport);
  const page = await ctx.newPage();
  page.on("dialog", (d) => { d.accept().catch(() => {}); });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: "ADMIN", phone, name } });
  if (!r.ok()) throw new Error(`seed-admin failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  stepPage = page;
  return { ctx, page };
}
/** A POST to a dev-test route, outside any page. */
async function post(path, data) {
  const ctx = await browser.newContext();
  try {
    const r = await ctx.request.post(`${BASE}${path}`, data === undefined ? {} : { data });
    if (!r.ok()) throw new Error(`${path} failed: ${r.status()} ${(await r.text()).slice(0, 200)}`);
    return await r.json().catch(() => ({}));
  } finally {
    await ctx.close().catch(() => {});
  }
}
/** Any open dialog — the kit's Modal (`dialog`) and its ConfirmModal (`alertdialog`, for Start, Stop, the switch, Confirm audience). */
const DIALOG_ROLES = ['[role="dialog"][aria-modal="true"]', '[role="alertdialog"][aria-modal="true"]'];
const DIALOG = DIALOG_ROLES.join(", ");
/** `sub` inside any open dialog. */
const inDialog = (sub) => DIALOG_ROLES.map((d) => `${d} ${sub}`).join(", ");
const ADD_FORM = '[data-contact-form="add"]';
const NUMBER = `${ADD_FORM} input[autocomplete="tel-national"]`;
const SAVE = '[data-contact-form] button[type="submit"]';
const textButton = (page, scope, label) => page.locator(scope).locator("button", { hasText: label }).first();
async function closeDialog(page) {
  await textButton(page, DIALOG, "Cancel").click().catch(() => {});
  const ask = page.locator(inDialog("[data-discard-ask]"));
  if (await ask.isVisible().catch(() => false)) await textButton(page, DIALOG, "Discard").click().catch(() => {});
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 10_000 }).catch(() => {});
}
async function openAdd(page) {
  await page.locator('[data-block="contacts-add"]').first().click();
  await page.waitForSelector(inDialog(ADD_FORM), { timeout: 15_000 });
  await wait(300);
}
const field = (page, key) => page.locator(`${inDialog(`[data-field="${key}"] input`)}, ${inDialog(`[data-field="${key}"] textarea`)}`).first();
const SEL = {
  name: 'label[data-field="name"] input',
  bodySw: 'label[data-field="bodySw"] textarea',
  fallbackSw: 'label[data-field="nameFallbackSw"] input',
  save: "[data-compose-save]",
  saved: "[data-compose-saved]",
  audience: '[data-block="compose-audience"]',
  test: '[data-block="compose-test"]',
};

/* ═══ RUN a · production's look ═══════════════════════════════════════════════════════════════════════════════════ */

async function runA() {
  // The stand-in SMS company: a live balance, and every send refused — nothing can leave this machine.
  const vendor = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c)).on("end", () => {
      res.setHeader("content-type", "application/json");
      if (req.url?.includes("/api/account/balance")) {
        res.end(JSON.stringify({ status: true, message: "Account balance", data: { currency: "TZS" }, balance: 250000 }));
        return;
      }
      res.statusCode = 400;
      res.end(JSON.stringify({ status: false, message: "the guide's stand-in sends nothing", data: null, balance: 0 }));
    });
  });
  await new Promise((r) => vendor.listen(VENDOR_PORT, "127.0.0.1", r));
  try {
    await step("a-owner-world", ownerWorld);
    await step("01-sign-in", async () => {
      const ctx = await guideContext({ width: 1280, height: 800 });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle" });
      await shoot(page, "01-sign-in");
      await ctx.close();
    });

    const { ctx, page } = await staff({ width: 1280, height: 800 });
    await post("/api/dev-test/marketing-contacts-seed?count=45");
    // The pictures are of a working day: the send window judged at 12:00 EAT on this server.
    await pinWindow(12);

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
      await wait(700);
      await clearToasts(page);
      await mark(page, "[data-save-reason]");
      await shootTall(page, "08-form-errors");
      await closeDialog(page);
    });
    await step("09-edit", async () => {
      await clearToasts(page);
      await page.locator("[data-contact-row] a[data-edit-contact]").first().click();
      await page.waitForSelector(inDialog('[data-contact-form="edit"]'), { timeout: 15_000 });
      await wait(400);
      await shootTall(page, "09-edit");
      await closeDialog(page);
    });
    await step("10-search", async () => {
      await page.goto(`${BASE}/admin/contacts?q=Neema`, { waitUntil: "networkidle" });
      await mark(page, 'main input[type="search"], main [role="searchbox"]');
      await shoot(page, "10-search-name");
      await unmark(page);
    });
    await step("12-filter", async () => {
      await page.goto(`${BASE}/admin/contacts`, { waitUntil: "networkidle" });
      await page.locator('[data-filter-rail="contacts"] a', { hasText: "Vodacom" }).first().click();
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
    });
    await step("16-export", async () => {
      await page.goto(`${BASE}/admin/contacts`, { waitUntil: "networkidle" });
      await page.locator('[data-block="contacts-export"]').first().scrollIntoViewIfNeeded();
      await mark(page, '[data-block="contacts-export"]');
      await shoot(page, "16-export");
      await unmark(page);
    });
    // ⭐ The importer is S15's and LIVE (2026-10-09), built to `importShots`' data-block names: its pictures are always taken, so
    //    a missing Import button is a failed step, never a chapter quietly left without pictures.
    await importShots(page);
    await step("26-sms-credit", async () => {
      await page.goto(`${BASE}/admin/system`, { waitUntil: "networkidle" });
      // The first render may still be reading the stand-in: one reload shows the figure.
      if ((await page.getByText("TZS 250,000").count()) === 0) { await wait(1500); await page.reload({ waitUntil: "networkidle" }); }
      await page.getByText("SMS credit").first().scrollIntoViewIfNeeded();
      await wait(300);
      await markCardByLabel(page, "SMS credit");
      await shoot(page, "26-sms-credit");
      await unmark(page);
    });
    await step("30-marketing-card", async () => {
      await page.goto(`${BASE}/admin/system`, { waitUntil: "networkidle" });
      const sw = page.locator("[data-live-switch]").first();
      if ((await sw.count()) === 0) throw new Error("the Marketing SMS switch is not on the System page");
      await sw.evaluate((n) => n.scrollIntoView({ block: "center" }));
      await wait(400);
      await mark(page, "[data-live-switch]");
      await shoot(page, "30-marketing-card");
      await unmark(page);
      await page.locator("[data-live-switch-on]").first().click();
      await page.waitForSelector("[data-live-switch-dialog='on']", { timeout: 10_000 });
      await wait(400);
      await shootTall(page, "31-switch-on");
      // Cancel — the guide never switches anything on.
      await textButton(page, DIALOG, "Cancel").click().catch(() => {});
      await page.waitForSelector(DIALOG, { state: "detached", timeout: 10_000 }).catch(() => {});
    });
    await step("32-marketing-settings", async () => {
      await page.goto(`${BASE}/admin/system?tab=marketing-sms`, { waitUntil: "networkidle" });
      const card = page.locator("main").getByText("Marketing SMS", { exact: true }).first();
      if ((await card.count()) === 0) throw new Error("the Marketing SMS settings are not on their tab");
      await card.evaluate((n) => n.scrollIntoView({ block: "start" }));
      await page.evaluate(() => window.scrollBy(0, -90));
      await wait(400);
      await shoot(page, "32-marketing-settings");
    });
    await step("17-campaigns", async () => {
      await page.goto(`${BASE}/admin/campaigns`, { waitUntil: "networkidle" });
      await mark(page, 'main a[href="/admin/campaigns/new"]');
      await shoot(page, "17-campaigns");
      await unmark(page);
    });
    await step("18-compose", async () => {
      await page.goto(`${BASE}/admin/campaigns/new`, { waitUntil: "networkidle" });
      await page.locator(SEL.name).first().fill("October welcome");
      await page.locator(SEL.bodySw).first().fill("50pick: Karibu {jina}! Bashiri mechi za wikendi.");
      await page.locator(SEL.fallbackSw).first().fill("rafiki");
      await wait(500);
      await shoot(page, "19-compose-filled");
      await page.locator(SEL.bodySw).first().fill("50pick: Karibu {jina}! Bashiri “leo”.");
      await wait(500);
      await shoot(page, "20-compose-warning");
      await page.locator(SEL.bodySw).first().fill("50pick: Karibu {jina}! Bashiri mechi za wikendi.");
      await wait(400);
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
    await ctx.close();
  } finally {
    vendor.close();
  }
}

/** The file the import pictures read — the world `marketing-contacts-seed?u30=1` makes: 0768 000 001 in the book (its name to
 *  replace), 002 in the book and on the stop list, 003 a player's number, 004 erased; 010 and 011 new; a repeat, a row with no
 *  number, one too short. */
const IMPORT_CSV = [
  "Phone,Name,Email,Tags,Notes",
  "0768 000 010,Neema Mushi,,dar,",
  '0768 000 001,Asha Mwakalinga,asha@example.com,"vip, dar",',
  "0768 000 002,Chausiku Ally,,,",
  "0768 000 003,Juma Said,,,",
  "0768 000 004,Eva Peter,,,",
  "+255 768 000 010,Neema M.,,arusha,",
  ",Hassani,,,",
  "12,Baraka,,,",
  "0768 000 011,Rehema John,,,",
].join(String.fromCharCode(13, 10)) + String.fromCharCode(13, 10);

/** ⭐ THE IMPORT'S PICTURES (U30–U32) — run a: the button, the columns, the check, the choice; then the bar and the result. */
async function importShots(page) {
  await post("/api/dev-test/marketing-contacts-seed?u30=1");
  await step("i1-import", async () => {
    await page.goto(`${BASE}/admin/contacts`, { waitUntil: "networkidle" });
    await mark(page, '[data-block="contacts-import"]');
    await shoot(page, "i1-import-button");
    await unmark(page);
    await page.locator('[data-block="contacts-import"]').first().click();
    await page.waitForSelector('[data-block="import-entrance"], [data-block="import-adopt"], [data-block="import-preflight"]', { timeout: 30_000 });
    await wait(400);
    await page.setInputFiles('input[data-block="import-file"]', { name: "contacts-october.csv", mimeType: "text/csv", buffer: Buffer.from(IMPORT_CSV, "utf8") });
    await page.waitForSelector('[data-block="import-mapping"]', { timeout: 30_000 });
    await wait(500);
    await shootTall(page, "i2-columns");
  });
  await step("i3-check", async () => {
    await page.locator('[data-block="import-mapping-next"]').first().click();
    await page.waitForSelector('[data-block="import-preflight"]', { timeout: 60_000 });
    await page.waitForSelector('[data-block="import-apply"]', { timeout: 60_000 });
    await wait(600);
    await page.locator('[data-block="import-preflight"]').first().evaluate((n) => n.scrollIntoView({ block: "start" }));
    await wait(300);
    await shootTall(page, "i3-check");
    await page.locator('[data-block="import-apply"]').first().evaluate((n) => n.scrollIntoView({ block: "center" }));
    await wait(300);
    await shootTall(page, "i4-decision");
  });
  await step("i5-import", async () => {
    // ⏳ U32 · the bar and the result: pressed once the commit is built; until then the step says so.
    const apply = page.locator('[data-block="import-apply"]').first();
    if (await apply.isDisabled().catch(() => true)) throw new Error(`the Import button is held: ${(await apply.getAttribute("title").catch(() => null)) ?? "no reason given"}`);
    await apply.click();
    await page.waitForSelector('[data-block="import-commit"], [data-block="import-done"]', { timeout: 30_000 });
    await shootTall(page, "i5-importing");
    await page.waitForSelector('[data-block="import-done"]', { timeout: 120_000 });
    await wait(600);
    await shootTall(page, "i6-done");
  });
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 10_000 }).catch(() => {});
}

/* ═══ RUN b · a campaign driven end to end (the console stub) ═════════════════════════════════════════════════════ */

const ctl = (act) => `[data-live-control="${act}"]`;
const statusIs = (page, status, timeout = 45_000) =>
  page.waitForSelector(`[data-live-status="${status}"]`, { timeout }).then(() => true).catch(() => false);
/** The send window judged at a fixed instant on this server: 12:00 EAT (open) or 22:00 EAT (shut), today. */
function eatInstant(hourEat) {
  const now = new Date(Date.now() + 3 * 3_600_000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourEat - 3, 0, 0)).toISOString();
}
const pinWindow = (hourEat) => post(`/api/dev-test/marketing-send-window?at=${encodeURIComponent(eatInstant(hourEat))}`);
const seedLive = (query) => post(`/api/dev-test/marketing-live-seed?${query}`);
/** ⭐ PRODUCTION'S OWNER SETTINGS, through the platform's own writers (`marketing-typed-test-seed`): the public policy lines
 *  (G10), the `adult.test` wording (G4), the campaign source line (G5) and licence outreach OPEN — what Ali's approvals saved
 *  on production on 2026-10-07/08. Without the source line a campaign to the contact book cannot be confirmed (STEP 54's
 *  lock turn: run b's Confirm was held by "… must carry its source line — and this campaign has none yet"). */
async function ownerWorld() {
  let last = {};
  for (const q of ["lines=1", "adult=1", "source=1", "open=1"]) last = await post(`/api/dev-test/marketing-typed-test-seed?${q}`);
  if (String(last.outreach ?? "").toUpperCase() !== "OPEN") throw new Error(`licence outreach is not open: ${JSON.stringify(last).slice(0, 300)}`);
}
async function openCampaign(page, id) {
  await page.goto(`${BASE}/admin/campaigns/${encodeURIComponent(id)}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-live-status]", { timeout: 30_000 });
  await wait(600);
}
/** A staged campaign's id by its name, from the campaigns list. */
async function campaignIdByName(page, name) {
  await page.goto(`${BASE}/admin/campaigns`, { waitUntil: "networkidle" });
  const href = await page.locator("main a", { hasText: name }).first().getAttribute("href").catch(() => null);
  const m = href ? href.match(/[/]admin[/]campaigns[/]([^/?#]+)/) : null;
  if (!m || m[1] === "new") throw new Error(`campaign “${name}” is not in the list`);
  return decodeURIComponent(m[1]);
}

async function runB() {
  const { ctx, page } = await staff({ width: 1280, height: 800 });
  await pinWindow(12);
  await step("b-owner-world", ownerWorld);
  // Ten people the engine can really message (eight agree, one stopped by their link, one never agreed), and the staged states.
  const seeded = await seedLive("run=guide");
  await seedLive("stages=guide");

  // ── tag the ten "weekend", as an officer would
  await step("b-tag", async () => {
    await page.goto(`${BASE}/admin/contacts?tag=${encodeURIComponent(seeded.tag)}`, { waitUntil: "networkidle" });
    if ((await page.locator("[data-contact-row]").count()) === 0) throw new Error("the seeded people are not on the contacts page");
    // The page's own select-all box, pressed once the page answers (a press before hydration is lost).
    let selected = false;
    for (let attempt = 0; attempt < 5 && !selected; attempt++) {
      await wait(800);
      await page.locator('main table thead input[type="checkbox"]').first().click({ force: true }).catch(() => {});
      selected = await page.locator('[data-block="contacts-bulk-bar"]').isVisible().catch(() => false);
    }
    if (!selected) throw new Error("the page's select-all box did not select the rows");
    await page.locator('[data-block="contacts-bulk-bar"] button', { hasText: /^Tag$/ }).first().click();
    await page.locator('[data-field="tag"] input').first().fill("weekend");
    await page.locator(DIALOG).locator("button", { hasText: "Continue" }).first().click();
    await wait(1200);
    await page.locator('[role="alertdialog"], [role="dialog"]').last().locator("button", { hasText: /^Tag/ }).last().click();
    await wait(1500);
  });

  // ── write it, choose "weekend", save, confirm
  let draftUrl = "";
  await step("40-confirm", async () => {
    // The audience first (the rail's own address, as its "weekend" pill writes it), then the words, then one save.
    await page.goto(`${BASE}/admin/campaigns/new?tag=weekend`, { waitUntil: "networkidle" });
    await page.locator(SEL.name).first().fill("Weekend offer");
    await page.locator(SEL.bodySw).first().fill("50pick: Habari {jina}! Bashiri mechi za wikendi.");
    await page.locator(SEL.fallbackSw).first().fill("rafiki");
    await wait(400);
    await page.locator(SEL.save).first().click();
    await page.waitForSelector(SEL.saved, { timeout: 20_000 });
    await wait(800);
    draftUrl = page.url();
    // The audience card with its counts, scrolled to the top (the message card above it names this server's console rail).
    await clearToasts(page);
    await page.locator(SEL.audience).first().evaluate((n) => n.scrollIntoView({ block: "start" }));
    await page.evaluate(() => window.scrollBy(0, -90));
    await page.waitForFunction(() => !/counts appear once you choose|Counting who will receive/.test(document.querySelector('[data-block="compose-audience"]')?.textContent ?? ""), null, { timeout: 30_000 }).catch(() => {});
    await wait(500);
    await mark(page, SEL.audience);
    await shoot(page, "21-audience");
    await unmark(page);
    await clearToasts(page);
    await page.locator("[data-confirm-trigger]").first().scrollIntoViewIfNeeded();
    await page.locator("[data-confirm-trigger]").first().click();
    await page.waitForSelector(`${inDialog("[data-confirm-figures]")}, ${inDialog("[data-confirm-body]")}`, { timeout: 30_000 });
    await wait(600);
    // ⭐ More than five people: the dialog asks for the number typed first (the kit's hard tier) — the word to type is the
    //    input's own placeholder. The picture is taken with the number in the box, as the officer will see it before pressing.
    const typed = page.locator(inDialog("input")).first();
    if ((await typed.count()) > 0) {
      await typed.fill((await typed.getAttribute("placeholder")) ?? "");
      await wait(400);
    }
    await shootTall(page, "40-confirm-dialog");
    await page.locator(DIALOG).getByRole("button", { name: "Confirm audience", exact: true }).first().click();
    await page.waitForSelector("[data-confirm-confirmed]", { timeout: 30_000 });
    await wait(600);
    await clearToasts(page);
    await page.locator("[data-confirm-confirmed]").first().scrollIntoViewIfNeeded();
    await mark(page, "[data-confirm-card]");
    await shoot(page, "41-confirmed");
    await unmark(page);
  });

  // ── start it with the window shut: it waits, then pause, resume in the window, finish
  let campaignId = null;
  await step("42-start", async () => {
    await page.locator("[data-confirm-start]").first().click();
    await page.waitForSelector("[data-live-status]", { timeout: 30_000 });
    campaignId = decodeURIComponent((page.url().match(/[/]admin[/]campaigns[/]([^/?#]+)/) ?? [])[1] ?? "");
    await pinWindow(22);
    await wait(600);
    await page.locator(ctl("start")).first().click();
    await page.waitForSelector(DIALOG, { timeout: 10_000 });
    await wait(500);
    await shootTall(page, "42-start-dialog");
    await page.getByRole("button", { name: "Start sending" }).first().click();
    await statusIs(page, "RUNNING");
    await page.waitForFunction(() => (document.querySelector("[data-live-wait]")?.textContent ?? "").length > 0, null, { timeout: 30_000 });
    await wait(800);
    await clearToasts(page);
    await shoot(page, "44-waiting");
  });
  await step("46-pause", async () => {
    await page.locator(ctl("pause")).first().click();
    await statusIs(page, "PAUSED", 20_000);
    await wait(1200);
    await clearToasts(page);
    await shoot(page, "46-paused");
  });
  await step("47-resume", async () => {
    await pinWindow(12);
    await page.locator(ctl("resume")).first().click();
    await statusIs(page, "RUNNING", 20_000);
    await wait(700);
    await shoot(page, "47-resumed");
    if (!(await statusIs(page, "DONE", 90_000))) throw new Error("the campaign did not finish");
    await wait(1200);
    await clearToasts(page);
    await shoot(page, "52-finished");
  });
  await step("53-results", async () => {
    if (!campaignId) throw new Error("no campaign id");
    const lines = (await seedLive(`lines=${encodeURIComponent(campaignId)}&n=8&status=DELIVRD`)).statuses ?? [];
    if (lines.length === 0) throw new Error("no receipt lines for the campaign");
    await post("/api/webhooks/blackball", { statuses: lines });
    await openCampaign(page, campaignId);
    const block = page.locator('[data-block="live-results"]').first();
    await block.scrollIntoViewIfNeeded();
    await wait(500);
    await mark(page, '[data-block="live-results"]');
    await shoot(page, "53-results");
    await unmark(page);
  });

  // ── the staged states: the window shut, so no step runs on them
  await pinWindow(22);
  await step("45-figures", async () => {
    const id = await campaignIdByName(page, "Weekend kick-off");
    await seedLive(`restamp=guide`).catch(() => {});
    await openCampaign(page, id);
    const fig = page.locator('[data-block="live-progress"]').first();
    if ((await fig.count()) > 0) { await fig.scrollIntoViewIfNeeded(); await wait(400); }
    await shoot(page, "45-running-figures");
    // ── stop it for good, then make a copy
    await page.locator(ctl("stop")).first().click();
    await page.waitForSelector(DIALOG, { timeout: 10_000 });
    await wait(500);
    await shootTall(page, "49-stop-dialog");
    await page.getByRole("button", { name: "Stop campaign" }).first().click();
    await statusIs(page, "CANCELLED", 20_000);
    await wait(1000);
    await clearToasts(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shoot(page, "50-stopped");
    await page.locator(ctl("copy")).first().click();
    await page.waitForURL((u) => u.pathname.endsWith("/admin/campaigns/new"), { timeout: 30_000 }).catch(() => {});
    await page.waitForLoadState("networkidle");
    await wait(900);
    await shoot(page, "51-copy");
  });
  await step("48-system-paused", async () => {
    await openCampaign(page, await campaignIdByName(page, "Payday special"));
    await mark(page, "[data-live-stop]");
    await shoot(page, "48-system-paused");
    await unmark(page);
  });
  await pinWindow(12).catch(() => {});
  await ctx.close();
  void draftUrl;
}

/* ═══ THE DOCUMENT ════════════════════════════════════════════════════════════════════════════════════════════════ */

function buildPdfHtml() {
  const sections = SECTIONS.map((sec) => (sec.steps === "IMPORT" ? { ...sec, steps: IMPORT_STEPS } : sec));
  const unresolved = sections.filter((s) => !Array.isArray(s.steps) || s.steps.length === 0).map((s) => s.title);
  if (unresolved.length > 0 && process.env.GUIDE_ALLOW_EMPTY !== "1") {
    console.log(`⛔ a chapter has no steps yet: ${unresolved.join(" · ")}`);
    process.exit(1);
  }
  const shotPath = (id) => join(SHOTS, `${id}.png`);
  const img = (id) => (existsSync(shotPath(id)) ? `<img src="data:image/png;base64,${readFileSync(shotPath(id)).toString("base64")}" alt="">` : `<div class="missing">Picture ${id} could not be taken</div>`);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const figureHtml = (id) => `<figure${DIALOG_SHOTS.has(id) ? ' class="dialog"' : ""}>${img(id)}</figure>`;
  /** A step's title, its "Where", its list and its FIRST picture are one block that never splits. */
  const stepHtml = (s, n) => {
    const shotsHtml = (s.shots ?? []).map(figureHtml);
    const first = shotsHtml.length > 0 ? shotsHtml[0] : "";
    return `
    <section class="step">
      <div class="lead-block">
        <h3><span class="n">${n}</span>${esc(s.title)}</h3>
        <p class="where">${esc(s.where)}</p>
        ${s.do.length ? `<ol>${s.do.map((d) => `<li>${esc(d)}</li>`).join("")}</ol>` : ""}
        ${first}
      </div>
      ${shotsHtml.slice(1).join("")}
      ${(s.notes ?? []).map((t) => `<p class="note">${esc(t)}</p>`).join("")}
    </section>`;
  };
  let n = 0;
  const body = sections.filter((s) => Array.isArray(s.steps)).map((sec) => `<h2>${esc(sec.title)}</h2>${sec.lead ? `<p class="lead">${esc(sec.lead)}</p>` : ""}${sec.steps.map((s) => stepHtml(s, ++n)).join("")}`).join("");
  const balance = `<h2>The SMS credit tile</h2><table><thead><tr><th>It shows</th><th>It means</th><th>Do this</th></tr></thead><tbody>
    ${BALANCE_STATES.map((b) => `<tr><td class="msg">${esc(b.shows)}</td><td>${esc(b.meaning)}</td><td>${esc(b.action)}</td></tr>`).join("")}</tbody></table>`;
  const messages = `<h2>Messages you may see</h2>
    <table><thead><tr><th>Where</th><th>Message</th><th>It means</th><th>Do this</th></tr></thead><tbody>
    ${MESSAGES.map((m) => `<tr><td>${esc(m.area)}</td><td class="msg">${esc(m.message)}</td><td>${esc(m.meaning)}</td><td>${esc(m.action)}</td></tr>`).join("")}
    </tbody></table>`;
  const missing = sections.filter((s) => Array.isArray(s.steps)).flatMap((s) => s.steps).flatMap((s) => s.shots ?? []).filter((id) => !existsSync(shotPath(id)));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>50pick admin guide</title><style>
    @page { size: A4; margin: 16mm 14mm; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #1c1f26; font-size: 10.5pt; line-height: 1.45; }
    .cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; }
    .cover h1 { font-size: 30pt; margin: 0 0 6mm; } .cover .sub { font-size: 14pt; color: #4a5160; }
    .cover .meta { margin-top: 12mm; color: #6b7280; font-size: 10pt; }
    h2 { font-size: 16pt; margin: 9mm 0 3mm; padding-bottom: 2mm; border-bottom: 2px solid #c9a227; break-after: avoid; page-break-after: avoid; }
    h3 { font-size: 12pt; margin: 0 0 2mm; } h3 .n { display: inline-block; min-width: 7mm; color: #c9a227; }
    .step { margin: 0 0 6mm; } h3 { break-after: avoid; page-break-after: avoid; }
    .where, ol, figure, .note, .lead-block { break-inside: avoid; page-break-inside: avoid; }
    .where { margin: 0 0 2mm; color: #374151; font-weight: 600; } ol { margin: 0 0 3mm 5mm; padding-left: 4mm; }
    figure { margin: 2mm 0; text-align: center; }
    figure img { max-width: 72%; max-height: 104mm; border: 1px solid #d1d5db; border-radius: 2mm; }
    figure.dialog img { max-width: 62%; max-height: 205mm; }
    .note { background: #fdf8e7; border-left: 3px solid #c9a227; padding: 2mm 3mm; margin: 2mm 0; }
    /* A chapter's lead stays with its first step: STEP 54's PDF left "9 · Your first campaigns" and its lead alone at a page's foot. */
    .lead { color: #374151; break-after: avoid; page-break-after: avoid; } .missing { padding: 8mm; border: 1px dashed #b91c1c; color: #b91c1c; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; page-break-inside: auto; }
    th, td { border: 1px solid #d1d5db; padding: 1.6mm 2mm; vertical-align: top; text-align: left; }
    th { background: #f3f4f6; } tr { page-break-inside: avoid; } td.msg { font-style: italic; }
  </style></head><body>
    <div class="cover"><h1>50pick admin guide</h1><div class="sub">Contacts and SMS campaigns, step by step</div>
    <div class="meta">${esc(VERSION)} · ${esc(DATE)} · https://50pick.tz/admin</div></div>
    ${body}${balance}${messages}
  </body></html>`;
  return { html, missing };
}

if (PHASE === "a") await runA();
if (PHASE === "b") await runB();
if (PHASE === "a" || PHASE === "b") {
  writeFileSync(DIALOG_FILE, JSON.stringify([...DIALOG_SHOTS]));
  await browser.close();
  console.log(`guide run ${PHASE}: ${taken.length} picture(s) · ${MESSAGES.length} messages checked against the source · ${failures.length} step failure(s)`);
  for (const f of failures) console.log(`  FAIL ${f}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

const { html, missing } = buildPdfHtml();
writeFileSync(join(SHOTS, "guide.html"), html);
const pdfBrowser = await chromium.launch();
const pdfPage = await (await pdfBrowser.newContext()).newPage();
await pdfPage.setContent(html, { waitUntil: "load" });
await pdfPage.pdf({ path: PDF, format: "A4", printBackground: true, margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" } });
await pdfBrowser.close();
console.log(`guide: ${MESSAGES.length} messages checked against the source · ${missing.length} missing picture(s)`);
for (const m of missing) console.log(`  MISSING ${m}`);
console.log(`PDF: ${PDF}`);
process.exit(missing.length === 0 ? 0 : 1);
