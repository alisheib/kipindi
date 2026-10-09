/**
 * qa:contacts-import-roundtrip — C7 · U34b · THE BOOK'S OWN EXPORT, READ BACK THROUGH THE IMPORTER.   (S15, 2026-10-09)
 *
 * WHY. An export and an import that do not agree on their own format are two products. U34a writes the book as CSV
 * (`contactsExportDoor`: the full file for a viewer who may read numbers, the MASKED one for everyone else); the importer
 * (C3–C5) reads CSV. The plan's U34b promise is the round trip: an export imported back changes NOTHING — every row is
 * "already in the book", and even under "use the file's version" nothing differs, so nothing is updated and nothing is
 * created (decide()'s `no_change`, U34's "export → re-import returns 0 changed"). And a MASKED export must never import:
 * its numbers are `+255••••NN`, so the mapping refuses the whole file in words (CONTACT_MASKED_FILE).
 *
 *   BASE=http://localhost:3101 npm run qa:contacts-import-roundtrip
 * A fresh in-memory dev server (no DATABASE_URL), DISABLE_ADMIN_TOTP=true, `rm -rf .next` first; heavy — under the lock.
 * Shots and the downloaded files go to `.qa-shots/contacts-screen/C7/` (git-ignored).
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3101";
const OUT = join(".qa-shots", "contacts-screen", "C7");
mkdirSync(OUT, { recursive: true });
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
const textOf = async (page, sel) => ((await page.locator(sel).count()) > 0 ? ((await page.locator(sel).first().innerText()) || "").replace(/\s+/g, " ").trim() : "");

const browser = await chromium.launch();
async function staff(role, phone) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role, phone, name: `QA ${role}` } });
  if (!r.ok()) throw new Error(`seed-admin ${role}: ${r.status()}`);
  return { ctx, page };
}
async function openBook(page) {
  await page.goto(`${BASE}/admin/contacts`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(block("contacts-card"), { timeout: 180_000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" }).catch(() => {});
}
async function exportFile(page, name) {
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.locator(`a${block("contacts-export")}`).first().click()]);
  const path = join(OUT, name);
  await d.saveAs(path);
  return path;
}
/** Data rows in a CSV this export wrote: its non-blank lines after the header (a cell never holds a raw line break here
 *  except inside quotes — the export quotes every cell, so a quoted break is counted by the quote parity). */
function dataRows(path) {
  const raw = readFileSync(path, "utf8");
  const BOM = String.fromCharCode(0xfeff);
  const text = raw.startsWith(BOM) ? raw.slice(1) : raw;
  let rows = 0; let inQuote = false; let lineHasText = false; let header = true;
  for (const ch of text) {
    if (ch === "\"") inQuote = !inQuote;
    if (!inQuote && (ch === "\n")) { if (lineHasText) { if (header) header = false; else rows++; } lineHasText = false; continue; }
    if (ch !== "\r" && ch !== "\n") lineHasText = true;
  }
  if (lineHasText && !header) rows++;
  return rows;
}

try {
  console.log("\nqa:contacts-import-roundtrip — C7 · U34b\n");
  const adm = await staff("ADMIN", "+255700007001");
  for (const q of ["count=45", "u34=1"]) {
    const r = await adm.page.request.post(`${BASE}/api/dev-test/marketing-contacts-seed?${q}`);
    if (!r.ok()) throw new Error(`seed ${q}: ${r.status()}`);
  }
  await openBook(adm.page);

  // ── 1 · the FULL export (a reader), read back ──
  const full = await exportFile(adm.page, "export-full.csv");
  const n = dataRows(full);
  ok("the reader's export downloaded with rows in it", n > 40, `${n} data rows`);
  await adm.page.locator(block("contacts-import")).first().click();
  await adm.page.waitForSelector(block("import-entrance"), { timeout: 60_000 });
  await adm.page.setInputFiles(`input${block("import-file")}`, full);
  await adm.page.waitForSelector(`${block("import-mapping")}, ${block("import-entrance")} [data-import-alert]`, { timeout: 120_000 });
  ok("the export is read as a file the importer understands (the columns step, not a refusal)", (await adm.page.locator(block("import-mapping")).count()) === 1,
    await textOf(adm.page, `${block("import-entrance")} [data-import-alert]`));
  await adm.page.screenshot({ path: join(OUT, "1-columns.png") });
  await adm.page.locator(block("import-mapping-next")).first().click();
  await adm.page.waitForSelector(block("import-apply"), { timeout: 300_000 });
  await wait(800);
  const check = await tilesIn(adm.page, block("import-preflight"));
  await adm.page.screenshot({ path: join(OUT, "2-check.png") });
  ok(`the check: EVERY exported row is already in the book (${n}) — nothing new, repeated, invalid or unreadable`,
    check.inBook === n && check.new === 0 && check.repeated === 0 && check.invalid === 0 && check.unreadable === 0, JSON.stringify(check));
  await adm.page.locator('[data-import-choice="TAKE_FILE"]').first().click();
  await wait(800);
  const changes = await adm.page.locator('[data-import-changes="none"]').count();
  const apply = adm.page.locator(block("import-apply")).first();
  const label = { create: Number(await apply.getAttribute("data-create")), update: Number(await apply.getAttribute("data-update")), keep: Number(await apply.getAttribute("data-keep")) };
  await adm.page.screenshot({ path: join(OUT, "3-take-file.png") });
  ok("under \"use the file's version\" NOTHING differs — no changes listed, the label 0 new · 0 updated · all kept", changes === 1 && label.create === 0 && label.update === 0 && label.keep === n,
    `${JSON.stringify(label)} · nothing-changes line ${changes}`);
  await apply.click();
  await adm.page.waitForSelector(block("import-done"), { timeout: 600_000 });
  await wait(800);
  const done = await tilesIn(adm.page, block("import-done"));
  await adm.page.screenshot({ path: join(OUT, "4-done.png") });
  ok("U34b · the round trip changes NOTHING: 0 added · 0 updated · every row kept · 0 failed", done.create === 0 && done.update === 0 && done.keep === n && done.fail === 0, JSON.stringify(done));
  await adm.ctx.close();

  // ── 2 · the MASKED export (a viewer who may not read numbers) is refused whole ──
  const g = await staff("GROWTH", "+255700007002");
  await openBook(g.page);
  const masked = await exportFile(g.page, "export-masked.csv");
  await g.page.locator(block("contacts-import")).first().click();
  await g.page.waitForSelector(block("import-entrance"), { timeout: 60_000 });
  await g.page.setInputFiles(`input${block("import-file")}`, masked);
  await g.page.waitForSelector(`${block("import-mapping")}, ${block("import-entrance")} [data-import-alert]`, { timeout: 120_000 });
  await wait(600);
  const said = (await textOf(g.page, block("import-mapping"))) + " " + (await textOf(g.page, `${block("import-entrance")} [data-import-alert]`));
  const nextHeld = (await g.page.locator(block("import-mapping-next")).count()) === 0
    || (await g.page.locator(block("import-mapping-next")).first().isDisabled().catch(() => true));
  await g.page.screenshot({ path: join(OUT, "5-masked-refused.png") });
  ok("a MASKED export never imports: the masked-number sentence, and no way on to the upload", /These numbers are masked/.test(said) && nextHeld, said.slice(0, 220));
  await g.ctx.close();
} catch (e) {
  fails++;
  console.log(`FAIL the round trip stopped — ${String(e?.message ?? e).split("\n")[0]}`);
} finally {
  await browser.close();
}
writeFileSync(join(OUT, "RESULT.txt"), `${fails} failure(s)\n`);
console.log(`\ncontacts-import-roundtrip: ${fails === 0 ? "PASSED" : `${fails} failure(s)`}`);
process.exit(fails === 0 ? 0 : 1);
