/**
 * qa:contacts-import-big — C6 · THE IMPORTER AT THE SIZES ALI NAMED, THROUGH THE REAL DIALOG.        (S15, 2026-10-09)
 *
 * WHY. Ali, 2026-09-25: "it's 150k approx contacts, or VCF … it could be small and could be large." The 28-file drive
 * (`qa:contacts-import`) proves every SHAPE of file at a few dozen rows; the Postgres probe proves 20,000 rows through the
 * store. This drives the BIG files the generator writes with `--big` through the browser on a local server: a 150,000-row
 * CSV, a 150,000-card phone book, a 42 MB vCard full of photos (the file that rules out a direct upload), a file one row
 * past the 200,000-row cap (refused, never half-read), and a 50,000-row workbook (read, or refused with the save-as-CSV
 * remedy when it passes the Excel size limit). Each run is TIMED by phase (read, upload, check, import) and the counts are
 * asserted: the FIRST big file on an empty book must match the generator's ground truth exactly; every later one must ADD
 * UP to its own file (its numbers may already be in the book from an earlier file).
 *
 *   npm run qa:contacts-import-files -- --big        # once: writes the big files (git-ignored)
 *   BASE=http://localhost:3101 npm run qa:contacts-import-big
 * A fresh in-memory dev server (no DATABASE_URL), DISABLE_ADMIN_TOTP=true, `rm -rf .next` first; heavy — run it under the
 * heavy-node lock, alone. Shots and timings go to `.qa-shots/contacts-screen/C6/` (git-ignored).
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3101";
const FILES = join(".qa-shots", "contacts-screen", "files");
const SHOTS = join(".qa-shots", "contacts-screen", "C6");
mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const block = (name) => `[data-block="${name}"]`;
let fails = 0;
const results = [];
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) fails++;
  return cond;
};
const tilesIn = (page, scope) => page.$$eval(`${scope} [data-import-tile]`, (els) =>
  Object.fromEntries(els.map((e) => [e.getAttribute("data-import-tile"), Number(e.getAttribute("data-value"))])));
const sum = (o) => Object.values(o).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

function manifest() {
  const p = join(FILES, "manifest.json");
  if (!existsSync(p)) return [];
  try {
    const raw = JSON.parse(readFileSync(p, "utf8"));
    return Array.isArray(raw?.files) ? raw.files : Array.isArray(raw) ? raw : [];
  } catch { return []; }
}
const MANIFEST = manifest();
const truthOf = (name) => MANIFEST.find((e) => e && e.name === name) ?? null;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(60_000);
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
const signed = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: "GROWTH", phone: "+255700006601", name: "QA GROWTH big" } });
if (!signed.ok()) throw new Error(`seed-admin failed: ${signed.status()}`);

async function openDialog() {
  await page.goto(`${BASE}/admin/contacts`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(block("contacts-card"), { timeout: 180_000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" }).catch(() => {});
  await page.locator(block("contacts-import")).first().click();
  await page.waitForSelector(`${block("import-entrance")}, ${block("import-adopt")}`, { timeout: 60_000 });
}

/** One big file, end to end. Returns { name, read, upload, check, done, timings }. */
async function bigRun(name, { importIt, exact }) {
  const path = join(FILES, name);
  if (!existsSync(path)) { ok(`${name} · the file exists (run qa:contacts-import-files -- --big)`, false); return; }
  const bytes = statSync(path).size;
  const truth = truthOf(name);
  const t = {};
  await openDialog();
  const t0 = Date.now();
  await page.setInputFiles(`input${block("import-file")}`, path);
  // Reading (and an Excel file's server read) ends at the columns — or at a refusal at the entrance.
  await page.waitForSelector(`${block("import-mapping")}, ${block("import-entrance")} [data-import-alert]`, { timeout: 900_000 });
  t.read = Date.now() - t0;
  if ((await page.locator(block("import-mapping")).count()) === 0) {
    const said = ((await page.locator(`${block("import-entrance")} [data-import-alert]`).first().innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim();
    await page.screenshot({ path: join(SHOTS, `${name}-refused.png`) });
    results.push({ name, bytes, refused: said, timings: t });
    return { refused: said };
  }
  await page.screenshot({ path: join(SHOTS, `${name}-1-columns.png`) });
  const t1 = Date.now();
  await page.locator(block("import-mapping-next")).first().click();
  // The upload, then the check: both end when the check's start button is on screen.
  await page.waitForSelector(`${block("import-apply")}, ${block("import-preflight")} [data-import-alert]`, { timeout: 1_800_000 });
  t.uploadAndCheck = Date.now() - t1;
  await wait(800);
  const check = await tilesIn(page, block("import-preflight"));
  await page.screenshot({ path: join(SHOTS, `${name}-2-check.png`) });
  const records = truth?.aggregate?.records ?? null;
  ok(`${name} · the check's five boxes add up to the file (${records ?? "?"} records)`, records !== null && sum(check) === records, JSON.stringify(check));
  if (exact && truth?.aggregate) {
    const a = truth.aggregate;
    ok(`${name} · on an empty book the check matches the generator's truth: new ${a.validDistinct} · repeated ${a.duplicateRows} · invalid ${a.invalidRows}`,
      check.new === a.validDistinct && check.inBook === 0 && check.repeated === a.duplicateRows && check.invalid === a.invalidRows,
      JSON.stringify(check));
  }
  let done = null;
  if (importIt) {
    const t2 = Date.now();
    await page.locator(block("import-apply")).first().click();
    await page.waitForSelector(block("import-done"), { timeout: 3_600_000 });
    t.import = Date.now() - t2;
    await wait(800);
    done = await tilesIn(page, block("import-done"));
    const status = await page.locator(block("import-done")).first().getAttribute("data-run-status");
    await page.screenshot({ path: join(SHOTS, `${name}-3-done.png`) });
    const staged = records !== null ? records : sum(check);
    ok(`${name} · the import finished DONE and its four tiles add up to the rows staged`, status === "DONE" && sum(done) === staged, `${status} · ${JSON.stringify(done)}`);
    ok(`${name} · added = the check's new, kept = in the book + repeated (KEEP for a GROWTH viewer), failed = invalid + unreadable`,
      done.create === check.new && done.update === 0 && done.keep === check.inBook + check.repeated && done.fail === check.invalid + check.unreadable,
      `${JSON.stringify(check)} → ${JSON.stringify(done)}`);
  } else {
    // Leave the book unchanged: discard the staged run.
    await page.getByRole("button", { name: /Discard this import/ }).first().click();
    await page.waitForSelector('[role="alertdialog"]', { timeout: 20_000 }).catch(() => {});
    const confirm = page.locator('[role="alertdialog"] button').filter({ hasText: /Discard/ }).last();
    if (await confirm.count()) await confirm.click();
    await wait(1500);
  }
  const line = `${name} · ${(bytes / 1048576).toFixed(1)} MB · read ${(t.read / 1000).toFixed(1)} s · upload + check ${(t.uploadAndCheck / 1000).toFixed(1)} s${t.import !== undefined ? ` · import ${(t.import / 1000).toFixed(1)} s` : ""}`;
  console.log(`TIMING ${line}`);
  results.push({ name, bytes, check, done, timings: t });
  return { check, done };
}

try {
  console.log("\nqa:contacts-import-big — C6\n");
  // 1 · the 150,000-row CSV on an EMPTY book: exact counts, imported.
  await bigRun("big-150k.csv", { importIt: true, exact: true });
  // 2 · a whole phone book: 150,000 vCards — imported (some numbers may already be in the book from the CSV).
  await bigRun("big-150k-cards.vcf", { importIt: true, exact: false });
  // 3 · ~42 MB of vCards with photos — read in the browser, streamed; checked, then discarded (the size is the point).
  await bigRun("big-photos.vcf", { importIt: false, exact: false });
  // 4 · one row past the cap: refused, never half-read.
  const cap = await bigRun("big-row-cap.csv", { importIt: false, exact: false });
  ok("big-row-cap.csv · one row past 200,000 is REFUSED with the cap named — never half-read",
    typeof cap?.refused === "string" && /200,000/.test(cap.refused), cap?.refused ?? JSON.stringify(cap ?? null));
  // 5 · a 50,000-row workbook: read when it fits the Excel limit, else refused with the save-as-CSV remedy.
  const xl = await bigRun("big-50k.xlsx", { importIt: false, exact: false });
  if (typeof xl?.refused === "string") {
    ok("big-50k.xlsx · over the Excel size limit, refused with the way on — save it as CSV", /CSV/i.test(xl.refused), xl.refused);
  } else {
    ok("big-50k.xlsx · read by the server and checked", xl !== undefined && xl.check !== undefined, JSON.stringify(xl?.check ?? null));
  }
} catch (e) {
  fails++;
  console.log(`FAIL the big drive stopped — ${String(e?.message ?? e).split("\n")[0]}`);
  await page.screenshot({ path: join(SHOTS, "x-stopped.png") }).catch(() => {});
} finally {
  writeFileSync(join(SHOTS, "results.json"), JSON.stringify(results, null, 2));
  await browser.close();
}
console.log(`\ncontacts-import-big: ${fails === 0 ? "PASSED" : `${fails} failure(s)`} · ${SHOTS}`);
process.exit(fails === 0 ? 0 : 1);
