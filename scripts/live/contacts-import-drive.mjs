/**
 * S15 · C3–C5 · THE IMPORT DIALOG, DRIVEN — every real-world file through the REAL dialog on a local dev server, at
 * 1280×800 and 360×780, every step asserted before it is photographed.          (2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4)
 *
 * WHAT IT PROVES, with HeadlessChrome in the UA and the in-memory twin behind the server:
 *   · EVERY FILE `scripts/contacts-import/real-world-files.mts` writes (its manifest read defensively — the generator may
 *     still be landing): Excel's CSV UTF-8 and its semicolon windows-1252, Google's and Outlook's exports, a headerless
 *     numbers-only file (S15-5: "Your file starts with a contact"), Excel's Unicode Text, a messy real-life CSV, two
 *     workbooks (read by the server), an iPhone and an Android vCard and a truncated one, and a WhatsApp list through the
 *     PASTE box — each: the entrance, the columns, the upload, the check (its five boxes ADD UP), and at 1280 the import
 *     to its result (four tiles), at 360 a Discard from the check (nothing written);
 *   · THE REFUSALS — an old .xls, an .ods, an empty file, a file that is not a CSV, a renamed file — each said at the
 *     entrance with its fix, never a dead end (a file whose CONTENT is readable is read: content beats the name);
 *   · NUMBERS ALREADY IN THE BOOK (the `?u30=1` world): "Use the file's version", ONE row set apart, the label moving by
 *     exactly that row, the overwrite asked once more, and the result;
 *   · A RELOAD MID-IMPORT: the second commit step's RESPONSE held (fetched, held, never aborted), the bar photographed in
 *     flight, the page reloaded — the dialog opens ON the unfinished import (`import-adopt`), Resume, done;
 *   · STOP → paused → RESUME → done; and STOP → CANCEL THE REST → a cancelled result that says what stayed;
 *   · S15-3 · the same file's result as GROWTH (no kept split) and as ADMIN (the split by reason);
 *   · no horizontal page overflow at 360, the dialog a full-height sheet there.
 * Every capture is a viewport tile (never full page), with Next's dev overlay hidden. The check's five counts and the
 * result's four tiles of every file land in `.qa-shots/contacts-screen/C3/summary.json`.
 *
 * Run:  BASE=http://localhost:3101 node scripts/live/contacts-import-drive.mjs
 * Boot (in-memory, zero prod risk; remove .next first — a stale .next 404s every /api/dev-test route; localhost, never
 * 127.0.0.1, which never hydrates):
 *   SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> DISABLE_ADMIN_TOTP=true npx next dev -p 3101
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3101";
const FILES = join(".qa-shots", "contacts-screen", "files");
const OUT = join(".qa-shots", "contacts-screen", "C3");
mkdirSync(OUT, { recursive: true });

const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const HIDE_OVERLAY = "nextjs-portal{display:none !important}";

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  ok   ${label}`);
  } else {
    fail++;
    console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`);
  }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const summary = { base: BASE, at: new Date().toISOString(), files: [], flows: [] };

/* ═══ THE FILES — the generator's manifest, read defensively ═══════════════════════════════════════════════ */

/** The brief's files — driven whether or not the manifest lists them (a missing one FAILS). */
const READABLE = [
  "excel-csv-utf8.csv", "excel-semicolon-1252.csv", "google-contacts.csv", "outlook-contacts.csv", "numbers-only.csv",
  "excel-unicode-text.txt", "messy-real-life.csv", "excel-basic.xlsx", "excel-number-cells.xlsx", "iphone-export.vcf",
  "android-export.vcf", "truncated.vcf", "paste-whatsapp.txt",
];
const REFUSED = ["legacy-97.xls", "libreoffice.ods", "empty.csv", "not-really-csv.csv", "renamed-csv.xlsx"];
/** Files driven through the paste box, not the file control. */
const PASTED = new Set(["paste-whatsapp.txt"]);

/**
 * The generator's manifest (`scripts/lib/real-world-contact-files.mts`, `writeManifest`): `{ generator, seed, big, files:
 * FileTruth[] }`, each `{ name, format, refusal, brokenAtByte, aggregate: { records, … }, … }`. ⚠️ Read defensively — a
 * plain JSON read (this drive runs under plain node, which does not load a .mts) — and anything absent is only skipped.
 */
function manifestEntries() {
  const path = join(FILES, "manifest.json");
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.files) ? raw.files : [];
    return list.filter((e) => e && typeof e === "object" && typeof e.name === "string");
  } catch {
    return [];
  }
}
const MANIFEST = manifestEntries();
const truthOf = (name) => MANIFEST.find((e) => e.name === name) ?? null;
/** Every file to drive: the brief's, then every other one the generator wrote (the prod-check files, the extra vCards…). */
const ALL_FILES = [...new Set([...READABLE, ...REFUSED, ...MANIFEST.map((e) => e.name)])];
/** The file must be refused whole at the entrance (`format: "unsupported"` or a `refusal` kind in the manifest). */
const mustRefuse = (name, truth) => (truth ? truth.format === "unsupported" || truth.refusal !== null : REFUSED.includes(name) && name !== "renamed-csv.xlsx");
/** ⚠️ A KNOWN READER GAP the dialog must lead through, not hide: a CSV with a broken record (a quotation mark never
 *  closed) is refused WHOLE by U25's reader — the reader's sentence and the dialog's way on are what is checked. */
const mayRefuseWhole = (truth) => truth !== null && truth.format === "csv" && truth.brokenAtByte !== null;
/** The records the generator built — what the check's five boxes must add up to. */
const recordsOf = (truth) => (truth && truth.aggregate && typeof truth.aggregate.records === "number" ? truth.aggregate.records : null);

/* ═══ SESSIONS AND THE WORLD (copied from the U20 drive) ═══════════════════════════════════════════════════ */

const browser = await chromium.launch();

async function staffCtx(role, phone, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role, phone, name: `QA ${role}` } });
  if (!r.ok()) throw new Error(`seed-admin ${role} failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}

const seed = async (page, query) => {
  const r = await page.request.post(`${BASE}/api/dev-test/marketing-contacts-seed?${query}`);
  if (!r.ok()) throw new Error(`seed ${query} failed: ${r.status()}`);
  return r.json();
};

/* ═══ THE DIALOG, read by its own stamps — never a class string ════════════════════════════════════════════ */

const DIALOG = '[role="dialog"][aria-modal="true"]';
const CONFIRM = '[role="alertdialog"][aria-modal="true"]';
const block = (name) => `[data-block="${name}"]`;
const count = (page, sel) => page.locator(sel).count();
const textOf = async (page, sel) => ((await count(page, sel)) > 0 ? ((await page.locator(sel).first().innerText()) || "").replace(/\s+/g, " ").trim() : "");
const heading = (page) => textOf(page, `${DIALOG} h2`);
const overflowOf = (page) => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));

async function openContacts(page) {
  await page.goto(`${BASE}/admin/contacts`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(block("contacts-import"), { timeout: 30_000 });
  await page.addStyleTag({ content: HIDE_OVERLAY });
  await wait(700);
}

/** The ConfirmModal on top: its confirm is the form's submit button. */
async function confirmTop(page) {
  await page.waitForSelector(CONFIRM, { timeout: 10_000 });
  await page.locator(`${CONFIRM} button[type="submit"]`).first().click();
  await page.waitForSelector(CONFIRM, { state: "detached", timeout: 10_000 }).catch(() => {});
}

/** A run left by an earlier step (an adopt panel on open): discard it, or cancel its rest, so this file starts clean. */
async function clearLeftover(page) {
  for (let i = 0; i < 3 && (await count(page, block("import-adopt"))) > 0; i++) {
    const act = (await count(page, `${block("import-adopt")} [data-import-act="discard"]`)) > 0 ? "discard" : "cancel-rest";
    await page.locator(`${block("import-adopt")} [data-import-act="${act}"]`).first().click();
    await confirmTop(page);
    await page.waitForSelector(`${block("import-entrance")}, ${block("import-done")}`, { timeout: 60_000 });
    if ((await count(page, block("import-done"))) > 0) {
      await closeDialog(page);
      await page.locator(block("contacts-import")).first().click();
      await page.waitForSelector(`${block("import-entrance")}, ${block("import-adopt")}`, { timeout: 30_000 });
    }
  }
}

async function openImport(page) {
  await page.locator(block("contacts-import")).first().click();
  await page.waitForSelector(`${block("import-entrance")}, ${block("import-adopt")}`, { timeout: 30_000 });
  await wait(300);
  await clearLeftover(page);
}

async function closeDialog(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 10_000 }).catch(() => {});
  if ((await count(page, DIALOG)) > 0) {
    await page.locator(`${DIALOG} [data-import-act="close"]`).first().click().catch(() => {});
    await page.waitForSelector(DIALOG, { state: "detached", timeout: 10_000 }).catch(() => {});
  }
}

/** ⛔ Every capture asserts what it shows first: the block on screen and the dialog's own heading. */
async function shoot(page, dir, name, mustShow, wantHeading, scrollTo = null) {
  const shows = (await count(page, mustShow)) > 0;
  const h = await heading(page);
  ok(`${name} · the capture shows ${mustShow}${wantHeading ? ` under "${wantHeading}"` : ""}`, shows && (!wantHeading || h === wantHeading), `heading "${h}"`);
  if (scrollTo) await page.locator(scrollTo).first().evaluate((n) => n.scrollIntoView({ block: "start" })).catch(() => {});
  await wait(250);
  await page.screenshot({ path: join(dir, `${name}.png`) });
}

const tilesIn = (page, scope) => page.$$eval(`${scope} [data-import-tile]`, (els) =>
  Object.fromEntries(els.map((e) => [e.getAttribute("data-import-tile"), Number(e.getAttribute("data-value"))])));

/** Choose a file, or paste one, and wait for the next state: the columns, or a refusal at the entrance. */
async function feed(page, name) {
  const path = join(FILES, name);
  if (PASTED.has(name)) {
    await page.locator('[data-import-act="toggle-paste"]').first().click();
    await page.locator("[data-import-paste-box]").first().fill(readFileSync(path, "utf8"));
    await page.locator('[data-import-act="read-paste"]').first().click();
  } else {
    await page.setInputFiles(`input${block("import-file")}`, path);
  }
  await page.waitForSelector(`${block("import-mapping")}, ${block("import-entrance")} [data-import-alert]`, { timeout: 120_000 });
  await wait(300);
  return (await count(page, block("import-mapping"))) > 0 ? "mapping" : "refused";
}

/* ═══ 1 · EVERY FILE, AT BOTH WIDTHS ═══════════════════════════════════════════════════════════════════════ */

const VIEWPORTS = [
  { name: "1280", width: 1280, height: 800, finish: true },
  { name: "360", width: 360, height: 780, finish: false },
];

for (const vp of VIEWPORTS) {
  console.log(`${LF}── ${vp.name} · every file`);
  const { ctx, page } = await staffCtx("GROWTH", vp.name === "1280" ? "+255700003101" : "+255700003102", { width: vp.width, height: vp.height });
  const ua = await page.evaluate(() => navigator.userAgent);
  ok(`${vp.name} · UA carries HeadlessChrome`, /HeadlessChrome/.test(ua));
  await seed(page, "count=45");
  await openContacts(page);
  ok(`${vp.name} · the page head carries Import contacts beside Add contact`, (await count(page, block("contacts-import"))) === 1 && (await count(page, block("contacts-add"))) === 1);

  for (const name of ALL_FILES) {
    const dir = join(OUT, name.replace(/[^\w.-]+/g, "_"));
    mkdirSync(dir, { recursive: true });
    const present = existsSync(join(FILES, name));
    ok(`${vp.name} · ${name} · the generated file is on disk`, present, join(FILES, name));
    if (!present) {
      summary.files.push({ file: name, viewport: vp.name, outcome: "missing" });
      continue;
    }
    const truth = truthOf(name);
    const record = { file: name, viewport: vp.name, outcome: "", mimics: truth?.mimics, records: recordsOf(truth) };
    try {
      await openContacts(page);
      await openImport(page);
      await shoot(page, dir, `${vp.name}-1-entrance`, block("import-entrance"), "Import contacts");
      const next = await feed(page, name);
      if (next === "refused") {
        const sentence = await textOf(page, `${block("import-entrance")} [data-import-alert]`);
        record.outcome = "refused";
        record.sentence = sentence;
        ok(`${vp.name} · ${name} · refused at the entrance with a sentence that says what to do`,
          sentence.length > 20 && /choose|save|open|split/i.test(sentence) && !/\d{9}/.test(sentence), sentence);
        ok(`${vp.name} · ${name} · the entrance stays open below the refusal (the way on)`,
          (await count(page, `${block("import-entrance")} [data-import-act="choose-file"]`)) > 0);
        ok(`${vp.name} · ${name} · refused only where it must be (a format no reader takes, or a CSV the reader refuses whole)`,
          mustRefuse(name, truth) || mayRefuseWhole(truth), `manifest: format ${truth?.format} · refusal ${truth?.refusal} · brokenAtByte ${truth?.brokenAtByte}`);
        if (mayRefuseWhole(truth)) {
          ok(`${vp.name} · ${name} · a CSV refused whole names its row and BOTH ways on (the row's fix, and saving it again)`,
            /row \d+/i.test(sentence) && /save it again as CSV UTF-8/.test(sentence), sentence);
        }
        await shoot(page, dir, `${vp.name}-2-refused`, `${block("import-entrance")} [data-import-alert]`, "Import contacts");
        await closeDialog(page);
        summary.files.push(record);
        continue;
      }
      // ⭐ CONTENT BEATS THE NAME: a file whose bytes are readable (a CSV renamed .xlsx) is read, never refused for its name.
      ok(`${vp.name} · ${name} · reached the columns because a reader takes it`, !mustRefuse(name, truth), `manifest: format ${truth?.format} · refusal ${truth?.refusal}`);

      // ── the columns ──
      await shoot(page, dir, `${vp.name}-2-columns`, block("import-mapping"), "The columns");
      if (name === "numbers-only.csv") {
        const said = await textOf(page, block("import-mapping"));
        ok(`${vp.name} · ${name} · S15-5 · a headerless file is read, and said so`,
          (await page.locator(block("import-mapping")).first().getAttribute("data-headerless")) === "yes" && /starts with a contact/.test(said), said.slice(0, 160));
      }
      const values = await textOf(page, "[data-import-columns]");
      ok(`${vp.name} · ${name} · no phone number is shown whole in the columns`, !/(?:\+?255|0)[67]\d{8}/.test(values.replace(/[\s().-]/g, "")), values.slice(0, 160));
      if (vp.name === "360") ok(`${vp.name} · ${name} · no horizontal page overflow on the columns`, (await overflowOf(page)) === 0);
      const nextDisabled = await page.locator(block("import-mapping-next")).first().isDisabled();
      if (nextDisabled) {
        record.outcome = "held at the columns";
        record.held = await textOf(page, "[data-import-held]");
        ok(`${vp.name} · ${name} · Next is held WITH its reason on screen`, record.held.length > 0, record.held);
        if (/[.]xlsx$/i.test(name) && /Phone column/.test(record.held)) {
          // ⚠️ A KNOWN READER GAP: the server reads the FIRST visible sheet (a cover sheet here) — said, with the way on.
          ok(`${vp.name} · ${name} · a workbook read from a sheet with no phone column says which sheet is read and how to fix it`,
            /first visible sheet/.test(await textOf(page, block("import-mapping"))));
        }
        await shoot(page, dir, `${vp.name}-3-held`, "[data-import-held]", "The columns");
        await closeDialog(page);
        summary.files.push(record);
        continue;
      }

      // ── the upload and the check ──
      await page.locator(block("import-mapping-next")).first().click();
      await page.waitForSelector(block("import-preflight"), { timeout: 60_000 });
      await page.waitForSelector(block("import-apply"), { timeout: 180_000 });
      await wait(500);
      const check = await tilesIn(page, block("import-preflight"));
      const sum = Object.values(check).reduce((a, b) => a + b, 0);
      const sumLine = await textOf(page, "[data-import-sum]");
      record.check = check;
      ok(`${vp.name} · ${name} · the check's five boxes add up to the rows, and the sum is written out`,
        Object.keys(check).length === 5 && /=/.test(sumLine) && sumLine.replace(/,/g, "").includes(`= ${sum} `), `${JSON.stringify(check)} · ${sumLine}`);
      ok(`${vp.name} · ${name} · "Nothing has been written to the book yet."`, (await count(page, "[data-import-nothing-written]")) === 1);
      const statedRows = recordsOf(truth);
      if (statedRows !== null) ok(`${vp.name} · ${name} · the check counts every record the generator wrote`, sum === statedRows, `${sum} vs ${statedRows}`);
      await shoot(page, dir, `${vp.name}-3-check`, block("import-preflight"), "Check before importing", block("import-preflight"));
      await shoot(page, dir, `${vp.name}-4-decision`, block("import-apply"), "Check before importing", block("import-decision"));
      if (vp.name === "360") ok(`${vp.name} · ${name} · no horizontal page overflow on the check`, (await overflowOf(page)) === 0);

      if (!vp.finish) {
        // ── 360: discarded from the check — nothing written ──
        await page.locator(`${block("import-decision")} [data-import-act="discard"]`).first().click();
        await confirmTop(page);
        await page.waitForSelector(block("import-entrance"), { timeout: 30_000 });
        record.outcome = "checked, then discarded";
        ok(`${vp.name} · ${name} · Discard from the check returns to the entrance`, (await count(page, block("import-entrance"))) === 1);
        await closeDialog(page);
        summary.files.push(record);
        continue;
      }

      // ── 1280: imported to the result ──
      await page.locator(block("import-apply")).first().click();
      if ((await page.waitForSelector(CONFIRM, { timeout: 1_500 }).catch(() => null)) !== null) await confirmTop(page);
      await page.waitForSelector(`${block("import-commit")}, ${block("import-done")}`, { timeout: 60_000 });
      await page.waitForSelector(block("import-done"), { timeout: 300_000 });
      await wait(600);
      const result = await tilesIn(page, block("import-done"));
      record.result = result;
      record.outcome = "imported";
      ok(`${vp.name} · ${name} · the result's four tiles are on screen`, ["create", "update", "keep", "fail"].every((k) => typeof result[k] === "number"), JSON.stringify(result));
      await shoot(page, dir, `${vp.name}-5-done`, block("import-done"), "Import finished");
      await closeDialog(page);
    } catch (e) {
      record.outcome = `drive error: ${String(e?.message ?? e).slice(0, 200)}`;
      ok(`${vp.name} · ${name} · driven to its end without a drive error`, false, record.outcome);
      await page.screenshot({ path: join(dir, `${vp.name}-error.png`) }).catch(() => {});
      await closeDialog(page).catch(() => {});
    }
    summary.files.push(record);
  }
  await ctx.close();
}

/* ═══ 2 · NUMBERS ALREADY IN THE BOOK — "Use the file's version", one row set apart ══════════════════════════ */

/** The world `?u30=1` makes: 001 in the book with a name the file replaces, 002 on the stop list, 003 a player's number,
 *  004 erased, 010 and 011 new; a repeat, a row with no number, one too short. */
const U30_CSV = [
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
].join(CRLF) + CRLF;

async function importBuffer(page, fileName, text) {
  await page.setInputFiles(`input${block("import-file")}`, { name: fileName, mimeType: "text/csv", buffer: Buffer.from(text, "utf8") });
  await page.waitForSelector(block("import-mapping"), { timeout: 60_000 });
  await page.locator(block("import-mapping-next")).first().click();
  await page.waitForSelector(block("import-apply"), { timeout: 120_000 });
  await wait(500);
}

const applyCounts = async (page) => {
  const b = page.locator(block("import-apply")).first();
  return { create: Number(await b.getAttribute("data-create")), update: Number(await b.getAttribute("data-update")), keep: Number(await b.getAttribute("data-keep")) };
};

{
  console.log(LF + "── duplicates · the file's version, one row set apart");
  const dir = join(OUT, "duplicates");
  mkdirSync(dir, { recursive: true });
  const { ctx, page } = await staffCtx("GROWTH", "+255700003103", { width: 1280, height: 800 });
  await seed(page, "u30=1");
  await openContacts(page);
  await openImport(page);
  await importBuffer(page, "contacts-october.csv", U30_CSV);
  ok("duplicates · the three choices are offered", (await count(page, "[data-import-choice]")) === 3);
  await shoot(page, dir, "1-choices", "[data-import-duplicates]", "Check before importing", "[data-import-duplicates]");
  const keepCounts = await applyCounts(page);
  await page.locator('[data-import-choice="TAKE_FILE"]').first().click();
  await wait(300);
  const takeCounts = await applyCounts(page);
  ok("duplicates · \"Use the file's version\" moves the label (more updated, fewer kept)", takeCounts.update > keepCounts.update, `${JSON.stringify(keepCounts)} → ${JSON.stringify(takeCounts)}`);
  await page.waitForSelector("[data-import-change-row]", { timeout: 30_000 });
  const rowBox = page.locator('[data-import-change-row] label').first();
  await rowBox.click();
  await wait(300);
  const apartCounts = await applyCounts(page);
  ok("duplicates · one row set apart moves the label by exactly that row", apartCounts.update === takeCounts.update - 1 && apartCounts.keep === takeCounts.keep + 1,
    `${JSON.stringify(takeCounts)} → ${JSON.stringify(apartCounts)}`);
  ok("duplicates · the row reads as set apart", (await count(page, '[data-import-change-row][data-apart="yes"]')) === 1);
  await shoot(page, dir, "2-set-apart", "[data-import-changes]", "Check before importing", "[data-import-changes]");
  await page.locator(block("import-apply")).first().click();
  if ((await page.waitForSelector(CONFIRM, { timeout: 3_000 }).catch(() => null)) !== null) {
    ok("duplicates · replacing details asks once more, naming how many", /replace/i.test(await textOf(page, CONFIRM)));
    await page.screenshot({ path: join(dir, "3-overwrite-confirm.png") });
    await confirmTop(page);
  }
  await page.waitForSelector(block("import-done"), { timeout: 120_000 });
  await wait(500);
  const result = await tilesIn(page, block("import-done"));
  ok("duplicates · the result's updates are the label's (one row set apart)", result.update === apartCounts.update, `${JSON.stringify(result)} vs ${JSON.stringify(apartCounts)}`);
  ok("duplicates · GROWTH reads ONE kept number — no split by reason (S15-3)", (await count(page, "[data-import-kept-split]")) === 0);
  await shoot(page, dir, "4-done-growth", block("import-done"), "Import finished");
  summary.flows.push({ flow: "duplicates", keep: keepCounts, takeFile: takeCounts, setApart: apartCounts, result });
  await closeDialog(page);
  await ctx.close();

  // ── S15-3 · the same file as ADMIN: the kept rows split by reason ──
  const adm = await staffCtx("ADMIN", "+255700003104", { width: 1280, height: 800 });
  await openContacts(adm.page);
  await openImport(adm.page);
  await importBuffer(adm.page, "contacts-october.csv", U30_CSV);
  await adm.page.locator(block("import-apply")).first().click();
  if ((await adm.page.waitForSelector(CONFIRM, { timeout: 1_500 }).catch(() => null)) !== null) await confirmTop(adm.page);
  await adm.page.waitForSelector(block("import-done"), { timeout: 120_000 });
  await wait(500);
  const adminResult = await tilesIn(adm.page, block("import-done"));
  const split = await textOf(adm.page, "[data-import-kept-split]");
  ok("duplicates · ADMIN reads the kept rows split by reason (S15-3)", adminResult.keep === 0 || /Kept:/.test(split), split);
  await shoot(adm.page, dir, "5-done-admin", block("import-done"), "Import finished");
  summary.flows.push({ flow: "duplicates-admin", result: adminResult, keptSplit: split });
  await closeDialog(adm.page);
  await adm.ctx.close();
}

/* ═══ 3 · A RELOAD MID-IMPORT, STOP → RESUME, STOP → CANCEL THE REST ═════════════════════════════════════════ */

/** 3,000 contacts in a range nothing else uses — six commit steps of 500. */
const BIG_CSV = ["Phone,Name", ...Array.from({ length: 3_000 }, (_, i) => `0769 ${String(200_000 + i).slice(0, 3)} ${String(200_000 + i).slice(3)},Drive ${i + 1}`)].join(CRLF) + CRLF;

/**
 * Hold the RESPONSE of the n-th commit step (a POST whose body names `fromCursor`): fetched — so the server has done the
 * step — then held until released, then fulfilled. ⛔ Never an aborted request: aborting cuts Next's RSC body.
 */
async function holdStep(page, n) {
  let seen = 0;
  let release = () => {};
  const released = new Promise((r) => { release = r; });
  let markHeld = () => {};
  const held = new Promise((r) => { markHeld = r; });
  const pattern = `${BASE}/admin/contacts**`;
  await page.route(pattern, async (route) => {
    const req = route.request();
    if (req.method() !== "POST" || !(req.postData() ?? "").includes("fromCursor")) return route.continue();
    seen++;
    if (seen !== n) return route.continue();
    const response = await route.fetch();
    markHeld();
    await released;
    await route.fulfill({ response }).catch(() => {});
  });
  return { held, release: () => release(), stop: () => page.unroute(pattern).catch(() => {}) };
}

const commitState = async (page) => ({
  state: await page.locator(block("import-commit")).first().getAttribute("data-state").catch(() => null),
  done: Number(await page.locator(block("import-commit")).first().getAttribute("data-done").catch(() => "-1")),
  total: Number(await page.locator(block("import-commit")).first().getAttribute("data-total").catch(() => "-1")),
});

{
  console.log(LF + "── a reload mid-import → adopt → resume");
  const dir = join(OUT, "reload");
  mkdirSync(dir, { recursive: true });
  const { ctx, page } = await staffCtx("GROWTH", "+255700003105", { width: 1280, height: 800 });
  await openContacts(page);
  await openImport(page);
  await importBuffer(page, "drive-big.csv", BIG_CSV);
  const hold = await holdStep(page, 2);
  await page.locator(block("import-apply")).first().click();
  await hold.held;
  await wait(300);
  const inFlight = await commitState(page);
  ok("reload · the bar in flight shows the SERVER's count (one step done of 3,000)", inFlight.state === "importing" && inFlight.done > 0 && inFlight.done < inFlight.total && inFlight.total === 3_000,
    JSON.stringify(inFlight));
  ok("reload · no spinner beside the running bar", (await count(page, `${block("import-commit")} .animate-spin`)) === 0);
  await shoot(page, dir, "1-in-flight", block("import-commit"), "Importing contacts");
  await hold.stop();
  hold.release();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(block("contacts-import"), { timeout: 30_000 });
  await page.addStyleTag({ content: HIDE_OVERLAY });
  await wait(700);
  await page.locator(block("contacts-import")).first().click();
  await page.waitForSelector(block("import-adopt"), { timeout: 30_000 });
  const adoptText = await textOf(page, block("import-adopt"));
  ok("reload · the dialog opens ON the unfinished import, who started it and how far", /Started by you/.test(adoptText) && /rows done/.test(adoptText), adoptText.slice(0, 200));
  await shoot(page, dir, "2-adopt", block("import-adopt"), "An import isn't finished");
  await page.locator(`${block("import-adopt")} [data-import-act="resume"]`).first().click();
  await page.waitForSelector(block("import-done"), { timeout: 300_000 });
  await wait(500);
  const result = await tilesIn(page, block("import-done"));
  ok("reload · resumed to the end: every row of the file is counted once", result.create + result.update + result.keep + result.fail === 3_000, JSON.stringify(result));
  await shoot(page, dir, "3-done", block("import-done"), "Import finished");
  summary.flows.push({ flow: "reload-adopt-resume", inFlight, result });
  await closeDialog(page);
  await ctx.close();
}

for (const end of ["resume", "cancel"]) {
  console.log(`${LF}── stop → ${end}`);
  const dir = join(OUT, `stop-${end}`);
  mkdirSync(dir, { recursive: true });
  const { ctx, page } = await staffCtx("GROWTH", end === "resume" ? "+255700003106" : "+255700003107", { width: end === "resume" ? 1280 : 360, height: end === "resume" ? 800 : 780 });
  await openContacts(page);
  await openImport(page);
  await importBuffer(page, `drive-big-${end}.csv`, BIG_CSV);
  const hold = await holdStep(page, 2);
  await page.locator(block("import-apply")).first().click();
  await hold.held;
  await page.locator(`${block("import-commit")} [data-import-act="stop"]`).first().click();
  await wait(200);
  ok(`stop-${end} · Stop says it stops after the rows being written`, /Stopping after/.test(await textOf(page, block("import-commit"))));
  hold.release();
  await hold.stop();
  await page.waitForSelector(`${block("import-commit")}[data-state="paused"]`, { timeout: 60_000 });
  const paused = await commitState(page);
  ok(`stop-${end} · paused on the server, the bar where the server stopped`, paused.state === "paused" && paused.done > 0 && paused.done < paused.total, JSON.stringify(paused));
  await shoot(page, dir, "1-paused", block("import-commit"), "Import paused");
  if (end === "resume") {
    await page.locator(`${block("import-commit")} [data-import-act="resume"]`).first().click();
    await page.waitForSelector(block("import-done"), { timeout: 300_000 });
    await wait(500);
    const result = await tilesIn(page, block("import-done"));
    ok("stop-resume · resumed to the end", result.create + result.update + result.keep + result.fail === 3_000, JSON.stringify(result));
    await shoot(page, dir, "2-done", block("import-done"), "Import finished");
    summary.flows.push({ flow: "stop-resume", paused, result });
  } else {
    await page.locator(`${block("import-commit")} [data-import-act="cancel-rest"]`).first().click();
    await page.waitForSelector(CONFIRM, { timeout: 10_000 });
    const ask = await textOf(page, CONFIRM);
    ok("stop-cancel · the confirmation names both numbers", (ask.match(/\d[\d,]*/g) ?? []).length >= 2, ask.slice(0, 200));
    await page.screenshot({ path: join(dir, "2-cancel-confirm.png") });
    await confirmTop(page);
    await page.waitForSelector(block("import-done"), { timeout: 60_000 });
    await wait(500);
    const status = await page.locator(block("import-done")).first().getAttribute("data-run-status");
    const said = await textOf(page, block("import-done"));
    ok("stop-cancel · the result is the cancelled run, saying what stayed", status === "CANCELLED" && /cancelled/i.test(said) && /stay/.test(said), said.slice(0, 200));
    ok("stop-cancel · no horizontal page overflow at 360", (await overflowOf(page)) === 0);
    await shoot(page, dir, "3-cancelled", block("import-done"), "Import cancelled");
    summary.flows.push({ flow: "stop-cancel", paused, result: await tilesIn(page, block("import-done")) });
  }
  await closeDialog(page);
  await ctx.close();
}

/* ═══ THE SUMMARY ═══════════════════════════════════════════════════════════════════════════════════════════ */

summary.pass = pass;
summary.fail = fail;
writeFileSync(join(OUT, "summary.json"), JSON.stringify(summary, null, 2) + LF);
await browser.close();
console.log(`${LF}contacts-import-drive: ${pass} passed, ${fail} failed · summary in ${join(OUT, "summary.json")}`);
process.exit(fail === 0 ? 0 : 1);
