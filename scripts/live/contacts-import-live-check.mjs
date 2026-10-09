/**
 * qa:contacts-import-live — THE IMPORTER'S LIVE CHECK, ON PRODUCTION, AND ITS CLEAN-UP.        (S15, 2026-10-09)
 *
 * WHY. Every suite and drive before this ran on a local server (`qa:contacts-import`, 761 checks over 28 files) and
 * on a scratch PostgreSQL (`test:contacts-import-db`). Ali, 2026-10-09: "create your file, use it, then delete the data
 * you imported" — so this drives the REAL dialog on www.50pick.tz with the 40-row production set the generator writes
 * (`prod-check-40.csv`: every row tagged `qa-import-check`, names "QA Import — …", numbers on +255 710 000 0NN), reads
 * the check and the result off the screen, and then REMOVES every contact the import added through the product's own
 * bulk Remove (the import's own filter, `?import=<run>`, select all, the typed count) — leaving the book as it found it.
 *
 * ⛔ SAFETY, in order: (1) it refuses to run unless LIVE_IMPORT_CHECK=1; (2) it signs in as the TEMPORARY GROWTH login
 * made for this check (`ops:provision-staff --secrets-file`), read from a git-ignored env file, never printed; (3) it
 * imports ONLY when the check reads exactly the file's known shape — 34 new, 0 already in the book, 3 repeated,
 * 3 invalid, 0 unreadable — so a number already in the live book (a real contact) stops the run and the import is
 * DISCARDED with nothing written; (4) it adds the contacts to NO list (a list cannot be deleted); (5) it removes only
 * what this import created; the live switch is CLOSED, so nothing is ever sent to these numbers.
 *
 *   LIVE_IMPORT_CHECK=1 QA_IMPORT_SECRETS=<git-ignored .env with QA_IMPORT_PHONE, QA_IMPORT_PASSWORD> npm run qa:contacts-import-live
 * The files come from `npm run qa:contacts-import-files` (git-ignored, `.qa-shots/contacts-screen/files`). Shots go to
 * `.qa-shots/contacts-screen/LIVE/` (git-ignored). Exit 0 only when the import AND the clean-up both proved out.
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.LIVE_BASE ?? "https://www.50pick.tz";
const FILE = join(".qa-shots", "contacts-screen", "files", "prod-check-40.csv");
const SHOTS = join(".qa-shots", "contacts-screen", "LIVE");
/** The file's known shape (the generator's ground truth for prod-check-40): anything else and nothing is imported. */
const EXPECT_CHECK = { new: 34, inBook: 0, repeated: 3, invalid: 3, unreadable: 0 };
const EXPECT_DONE = { create: 34, update: 0, keep: 3, fail: 3 };

if (process.env.LIVE_IMPORT_CHECK !== "1") {
  console.error("✖ refusing: this writes to the live contact book (then removes what it wrote). Set LIVE_IMPORT_CHECK=1 to run it.");
  process.exit(2);
}
if (!existsSync(FILE)) {
  console.error(`✖ ${FILE} is missing — run npm run qa:contacts-import-files first.`);
  process.exit(2);
}
const secretsPath = process.env.QA_IMPORT_SECRETS ?? "";
if (!secretsPath || !existsSync(secretsPath)) {
  console.error("✖ QA_IMPORT_SECRETS must name the git-ignored env file ops:provision-staff wrote (QA_IMPORT_PHONE, QA_IMPORT_PASSWORD).");
  process.exit(2);
}
const secrets = Object.fromEntries(readFileSync(secretsPath, "utf8").split(/\r?\n/)
  .map((l) => l.trim()).filter((l) => l && !l.startsWith("#") && l.includes("="))
  .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"(.*)"$/, "$1")]));
const phone9 = String(secrets.QA_IMPORT_PHONE ?? "").replace(/\D/g, "").slice(-9);
const password = String(secrets.QA_IMPORT_PASSWORD ?? "");
if (phone9.length !== 9 || password === "") {
  console.error("✖ the secrets file lacks QA_IMPORT_PHONE or QA_IMPORT_PASSWORD.");
  process.exit(2);
}

mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const block = (name) => `[data-block="${name}"]`;
let fails = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) fails++;
  return cond;
};
const tilesIn = (page, scope) => page.$$eval(`${scope} [data-import-tile]`, (els) =>
  Object.fromEntries(els.map((e) => [e.getAttribute("data-import-tile"), Number(e.getAttribute("data-value"))])));
const shot = async (page, name) => {
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" }).catch(() => {});
  await wait(300);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
};
const same = (a, b) => Object.keys(b).every((k) => a[k] === b[k]);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
try {
  // ── sign in as staff: fill the visible box until its hidden mirror agrees (the harness's own rule) ──
  await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle" });
  for (let round = 0; round < 8; round++) {
    await page.fill("#phone", phone9);
    const synced = await page.waitForFunction((want) => {
      const el = document.querySelector('input[name="phone"]');
      return el && el.value === want;
    }, phone9, { timeout: 1500 }).then(() => true).catch(() => false);
    if (synced) break;
  }
  await page.fill('input[name="password"]', password);
  await Promise.all([page.waitForURL(/\/admin(\/|$|\?)/, { timeout: 30_000 }).catch(() => {}), page.locator('button[type="submit"]').first().click()]);
  await page.goto(`${BASE}/admin/contacts`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(block("contacts-card"), { timeout: 60_000 });
  if (!ok("signed in as the temporary GROWTH login and on the contact book", (await page.locator(block("contacts-import")).count()) === 1, page.url())) {
    throw new Error("not on the contact book");
  }
  await shot(page, "0-book-before");

  // ── the import: the file, the columns, THE CHECK ──
  await page.locator(block("contacts-import")).first().click();
  await page.waitForSelector(`${block("import-entrance")}, ${block("import-adopt")}`, { timeout: 30_000 });
  if (await page.locator(block("import-adopt")).count()) throw new Error("an unfinished import is open for this login — resolve it by hand first");
  await page.setInputFiles(`input${block("import-file")}`, FILE);
  await page.waitForSelector(block("import-mapping"), { timeout: 60_000 });
  await shot(page, "1-columns");
  await page.locator(block("import-mapping-next")).first().click();
  await page.waitForSelector(block("import-apply"), { timeout: 120_000 });
  await wait(600);
  const check = await tilesIn(page, block("import-preflight"));
  await shot(page, "2-check");
  if (!ok("the check reads the file's known shape — 34 new, 0 already in the book, 3 repeated, 3 invalid, 0 unreadable", same(check, EXPECT_CHECK), JSON.stringify(check))) {
    // ⛔ Not the known shape (a real contact may hold one of these numbers): DISCARD, write nothing, stop.
    await page.getByRole("button", { name: /Discard this import/ }).first().click();
    await page.waitForSelector('[role="alertdialog"]', { timeout: 15_000 }).catch(() => {});
    const confirm = page.locator('[role="alertdialog"] button').filter({ hasText: /Discard/ }).last();
    if (await confirm.count()) await confirm.click();
    await wait(1500);
    throw new Error("the check did not read the known shape — the import was discarded, nothing written");
  }
  const apply = page.locator(block("import-apply")).first();
  const label = { create: Number(await apply.getAttribute("data-create")), update: Number(await apply.getAttribute("data-update")), keep: Number(await apply.getAttribute("data-keep")) };
  ok("the start's numbers are KEEP's for a GROWTH viewer (S15-10): 34 new · 0 updated · 3 kept as they are", label.create === 34 && label.update === 0 && label.keep === 3, JSON.stringify(label));

  // ── import (no list) and the result ──
  await apply.click();
  await page.waitForSelector(block("import-done"), { timeout: 240_000 });
  await wait(800);
  const done = await tilesIn(page, block("import-done"));
  const status = await page.locator(block("import-done")).first().getAttribute("data-run-status");
  await shot(page, "3-done");
  ok("the import finished: DONE, 34 added · 0 updated · 3 kept · 3 couldn't be imported", status === "DONE" && same(done, EXPECT_DONE), `${status} · ${JSON.stringify(done)}`);

  // ── the clean-up: this import's contacts, every one removed through the product's own bulk Remove ──
  const link = page.getByRole("link", { name: /Show the contacts this import added/ }).first();
  const href = (await link.count()) ? await link.getAttribute("href") : null;
  const runId = href ? new URL(href, BASE).searchParams.get("import") : null;
  if (!ok("the result links to this import's own contacts (?import=<run>)", typeof runId === "string" && /^ci_[a-z]{20}$/.test(runId ?? ""), href ?? "no link")) {
    throw new Error("no link to the import's contacts — remove the qa-import-check contacts by hand (tag filter)");
  }
  console.log(`run ${runId}`);
  await page.goto(`${BASE}/admin/contacts?import=${runId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(block("contacts-card"), { timeout: 60_000 });
  await wait(800);
  await shot(page, "4-this-import");
  await page.getByRole("checkbox", { name: "Select every contact on this page", exact: true }).first().check({ force: true });
  await wait(600);
  const matching = page.locator(`${block("contacts-bulk-bar")} [data-bulk-matching]`);
  if (await matching.count()) { await matching.first().click(); await wait(600); }
  await page.locator(`${block("contacts-bulk-bar")} [data-bulk-action="remove"]`).first().click();
  await page.waitForSelector('[role="alertdialog"]', { timeout: 30_000 });
  await wait(500);
  const typed = page.locator('[role="alertdialog"] input');
  if (await typed.count()) await typed.first().fill(String(EXPECT_DONE.create));
  await shot(page, "5-remove-confirm");
  await page.locator('[role="alertdialog"] button').filter({ hasText: new RegExp(`^Remove ${EXPECT_DONE.create}$`) }).first().click();
  await wait(4000);
  await page.goto(`${BASE}/admin/contacts?import=${runId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(block("contacts-card"), { timeout: 60_000 });
  await wait(800);
  const left = await page.locator("[data-contact-row]").count();
  await shot(page, "6-after-remove");
  ok("the clean-up: every contact this import added is removed — the import's filter lists none", left === 0, `${left} row(s) left`);
} catch (e) {
  fails++;
  console.log(`FAIL the live check stopped — ${String(e?.message ?? e).split("\n")[0]}`);
  await shot(page, "x-stopped").catch(() => {});
} finally {
  await browser.close();
}
console.log(`\ncontacts-import-live: ${fails === 0 ? "PASSED" : `${fails} failure(s)`} · shots in ${SHOTS}`);
process.exit(fails === 0 ? 0 : 1);
