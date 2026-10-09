/**
 * S15 · C3–C5 · THE IMPORT DIALOG, DRIVEN — every real-world file through the REAL dialog on a local dev server, at
 * 1280×800 and 360×780, every step asserted before it is photographed.          (2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4)
 *
 * WHAT IT PROVES, with HeadlessChrome in the UA and the in-memory twin behind the server:
 *   · EVERY FILE `scripts/lib/real-world-contact-files.mts` writes (its manifest read defensively — the generator may
 *     still be landing): Excel's CSV UTF-8 and its semicolon windows-1252, Google's and Outlook's exports, a headerless
 *     numbers-only file (S15-5: "Your file starts with a contact"), Excel's Unicode Text, a messy real-life CSV, two
 *     workbooks (read by the server), an iPhone and an Android vCard and a truncated one, and a WhatsApp list through the
 *     PASTE box — each: the entrance, the columns, the upload, the check (its five boxes ADD UP), and at 1280 the import
 *     to its result (four tiles), at 360 a Discard from the check (nothing written);
 *   · ⭐ C3b · THE FOUR READER GAPS, CLOSED — each asserted against the generator's ground truth (`c3bExpectations`, the
 *     rule restated over the manifest, never read back): messy-real-life.csv reads, its one broken quote ONE record "could
 *     not be read" with its row and its way out (G1); excel-multi-sheet.xlsx reads its contacts sheet past the cover page,
 *     the note naming it (G2); and — as the review round C3b-fix decided (D2, D3) — a record whose main phone cell yields
 *     no mobile while the person's OWN other phone columns hold exactly one (G4 — ONE added column read as Phone) is never
 *     listed invalid in google-contacts.csv and outlook-contacts.csv, while a record holding two or more distinct mobiles
 *     (in one cell, or across those columns) always is; no value on the columns holds seven digits (D9); the big files
 *     the generator writes with --big are never driven here (`qa:contacts-import-big` owns them);
 *   · THE REFUSALS — an old .xls, an .ods, an empty file, a file that is not a CSV, a renamed file — each said at the
 *     entrance with its fix, never a dead end (a file whose CONTENT is readable is read: content beats the name);
 *   · NUMBERS ALREADY IN THE BOOK (the `?u30=1` world): S15-10 · GROWTH (not a reader) sees no choices and no changes —
 *     one line, "kept as they are", with its why — and imports with nothing updated; R14 · the fourth box reads "Can't be
 *     imported as written"; an ADMIN (a reader) gets the three choices, "Use the file's version", ONE row set apart (the
 *     promise moving by exactly that row) and a new list named — then R7 · the book moves under that check (GROWTH adds
 *     the one number the ADMIN's file holds as new), the start is refused, the file is checked again WITH the choice, the
 *     row set apart, the list and its name all kept, and the import ends with the promise's numbers and the split by
 *     reason (S15-3);
 *   · A RELOAD MID-IMPORT: the second commit step's RESPONSE held (fetched, held, never aborted), the bar photographed in
 *     flight, the page reloaded — the dialog opens ON the unfinished import (`import-adopt`), Resume, done;
 *   · STOP → paused → RESUME → done; and STOP → CANCEL THE REST → a cancelled result that says what stayed — R5: written
 *     is added + updated, the rows not imported are the cancel's own count, four tiles, the sum = the file's rows;
 *   · S15-12 (R2b) · an ADMIN finds another officer's paused import at the entrance, Resumes it, and it ends; a GROWTH
 *     officer's entrance shows no such list;
 *   · V1 · at 360 the start button's words stay inside it and nothing sticks out of the dialog sideways (measured on the
 *     dialog's own panel — a fixed overlay never shows in the page's width); the promise is its own line above a short
 *     button; no horizontal page overflow at 360, the dialog a full-height sheet there;
 *   · ⭐ C8c — NEW, WRITTEN WITHOUT A RUN (its builder may not run Playwright on OMEGA): every check it adds carries
 *     "[C8c new]" in its label, so the integrator's first run reads them apart. (a) C3b-fix's D2/D5/D6/D7 restated over
 *     the generator's four new files (28–31: a quote broken mid-file, Outlook's assistant and switchboard phones, a staff
 *     sheet before a titled customers sheet, a hand-typed CSV under a bare title) — and D5 over messy-real-life.csv too:
 *     the reader note, the record's sentence and both sum lines name the lines a quote swallowed; the title rows leave
 *     with ONE note, never quoted, the rows keeping their real numbers; the sheet with the most mobiles is read and the
 *     staff sheet named not read; Assistant's Phone and Company Main Phone are never read as the person's number. (b) #12,
 *     the dialog paths never driven before: ✕ and Escape during a commit (Escape is ignored, ✕ asks, the run stays
 *     resumable and the reopened dialog says so), Stop during an upload, Stop during a busy wait (the step's answer
 *     rewritten into the bet queue's busy: Stop pauses at once), an EXISTING list chosen (and its name typed in other
 *     capitals IS that list), an exception under KEEP forged for a masked officer and refused, the failures list's "Show
 *     more", and "Show the contacts this import added".
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
/**
 * ⛔ THE BIG FILES ARE NOT THIS DRIVE'S (the integrator, 2026-10-09): written only with `--big`, they belong to
 * `qa:contacts-import-big` alone — driven here they took 660 s instead of ~500 and failed "refused only where it must be"
 * four times (big-row-cap.csv and big-50k.xlsx at both widths). So every manifest entry the generator marks `big`, and
 * defensively any name starting "big-", is skipped.
 */
const isBigEntry = (e) => e.big === true || e.name.startsWith("big-");
const MANIFEST = manifestEntries().filter((e) => !isBigEntry(e));
const truthOf = (name) => MANIFEST.find((e) => e.name === name) ?? null;
/** Every file to drive: the brief's, then every other one the generator wrote (the prod-check files, the extra vCards…). */
const ALL_FILES = [...new Set([...READABLE, ...REFUSED, ...MANIFEST.map((e) => e.name)])];
/** The file must be refused whole at the entrance (`format: "unsupported"` or a `refusal` kind in the manifest). */
const mustRefuse = (name, truth) => (truth ? truth.format === "unsupported" || truth.refusal !== null : REFUSED.includes(name) && name !== "renamed-csv.xlsx");
/** ⭐ C3b · G1 · a CSV is refused WHOLE for a broken record (a quotation mark never closed) only when NOTHING before it
 *  was a record — no header row, and the broken record the file's first. Any other broken record costs that record alone:
 *  the file reads, and the check lists the record "could not be read" (asserted below). */
const mayRefuseWhole = (truth) => {
  if (truth === null || truth.format !== "csv" || truth.brokenAtByte === null || truth.header !== null) return false;
  const first = (Array.isArray(truth.people) ? truth.people : []).find((p) => p && !p.blank);
  return first !== undefined && first.broken === true;
};
/** The records the generator built — what the check's five boxes must add up to. */
const recordsOf = (truth) => (truth && truth.aggregate && typeof truth.aggregate.records === "number" ? truth.aggregate.records : null);

/* ═══ C3b · THE FOUR READER GAPS, CLOSED — what the ground truth says the importer now reads ═══════════════════ */

/** The files C3b changed what is importable in, and the column each one names as THE phone (G4's main column). */
const C3B_FILES = new Map([
  ["messy-real-life.csv", null],
  ["excel-multi-sheet.xlsx", null],
  ["google-contacts.csv", "Phone 1 - Value"],
  ["outlook-contacts.csv", "Mobile Phone"],
  // ⭐ [C8c new] · the four files C3b-fix's review asked the generator for (28–31): the same ground-truth lists — every
  // record with no mobile listed, none read through G4 listed, exactly the broken records unreadable — run over them too.
  ["broken-quote-mid-file.csv", null],
  ["outlook-assistant-phones.csv", "Mobile Phone"],
  ["excel-title-staff.xlsx", null],
  ["hand-typed-title.csv", null],
]);
/** Files whose ground truth holds a record the importer reads only through G4 (the person's other phone column) — the
 *  "never listed invalid" assertion must not be vacuous for them. ⛔ C3b-fix · D3: a cell of two DISTINCT mobiles (G3) is
 *  refused now, so the messy file's two-number row is no longer an improvement. ⭐ [C8c new] · the Outlook file whose
 *  Business / Home Phone holds the person's one mobile beside the assistant's or the switchboard's (D2). */
const C3B_IMPROVES = new Set(["google-contacts.csv", "outlook-contacts.csv", "outlook-assistant-phones.csv"]);
/** ⭐ C3b-fix · D2 · the person's OWN phone columns G4 may read beside the main one (Outlook's and Google's spellings). */
const OWN_PHONE_COLUMNS = new Set([
  "Mobile Phone", "Business Phone", "Business Phone 2", "Home Phone", "Home Phone 2", "Other Phone", "Primary Phone", "Car Phone",
]);
const isOwnPhoneColumn = (header) => OWN_PHONE_COLUMNS.has(header) || /^Phone \d+ - Value$/.test(header);

/**
 * ⭐ THE RULE RESTATED OVER THE GROUND TRUTH — never read back from the importer (C3b-fix · D2, D3): a phone value's
 * mobiles are its `key`, or the keys of the numbers a two-number cell `holds`. The record's number is the MAIN column's
 * when its values hold exactly ONE distinct mobile ("main"); else — the main column yielding none — the person's OWN
 * other phone columns are read, and the record has a number only when the main and those together hold exactly ONE
 * distinct mobile ("g4"). Any other record — none, or two and more (D3: never one person's number taken out of two) —
 * must be listed "not a mobile"; a "g4" record must NOT be; the broken records (G1) are exactly the "could not be read"
 * list. (A record with a number may still be invalid for another field — a bad email, a 300-character name — so only
 * these two lists are held.)
 */
function c3bExpectations(truth, main) {
  if (!truth || !Array.isArray(truth.people)) return null;
  const isMain = (ph) => ph.source === undefined || ph.source === main;
  const mobilesOf = (phones) => {
    const keys = new Set();
    for (const ph of phones) {
      if (typeof ph.key === "string") keys.add(ph.key);
      else if (Array.isArray(ph.holds)) for (const k of ph.holds) keys.add(k);
    }
    return keys;
  };
  const mustBeInvalid = [];
  const improved = [];
  const unreadable = [];
  for (const person of truth.people) {
    if (!person || person.blank) continue;
    if (person.broken) {
      unreadable.push(person.line);
      continue;
    }
    const phones = Array.isArray(person.phones) ? person.phones : [];
    const fromMain = mobilesOf(phones.filter(isMain));
    if (fromMain.size === 1) continue;
    const fromOwn = mobilesOf(phones.filter((ph) => isMain(ph) || (typeof ph.source === "string" && isOwnPhoneColumn(ph.source))));
    if (fromMain.size === 0 && fromOwn.size === 1) improved.push(person.line);
    else mustBeInvalid.push(person.line);
  }
  return { mustBeInvalid, improved, unreadable };
}

/* ═══ ⭐ [C8c new] · C3b-fix's D2, D5, D6 and D7 RESTATED OVER THE GROUND TRUTH — written without a run ═════════════
 * Each takes a manifest entry and returns what the readers must say, or null when the file holds no such shape. The
 * truth is the generator's (`swallowedLines`, `titleRows`, `sheets`, each phone's `source`) — never read back. */

const C8C = "[C8c new]";
const QUOTE_MARK = String.fromCharCode(34);
const OPEN_QUOTE = String.fromCharCode(0x201c);
const CLOSE_QUOTE = String.fromCharCode(0x201d);
const EN_DASH = String.fromCharCode(0x2013);
/** ⛔ D5d · the claim no sum line may make once a quotation mark never closed swallowed lines. */
const EVERY_ROW_CLAIM = "every row of your file is counted once";
/** A count as the readers' sentences group it ("1,234"). */
const groupedNumber = (n) => {
  const s = String(Math.trunc(n));
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s.charAt(i);
  }
  return out;
};

/**
 * ⭐ D5 · a CSV the reader keeps (G1 — not refused whole) whose broken record's truth says how many physical lines its
 * open quotation mark swallowed: the row, the lines, and the words D5 decides — the reader note on the columns step
 * (D5c), the record's sentence on the check (D5b: its digits kept within the six a staged reason may carry — past them
 * the lines are said in words, `STAGED_REASON_DIGITS_MAX`), and how both sum lines end (D5d).
 */
function d5Expectation(truth) {
  if (truth === null || truth.format !== "csv" || !Array.isArray(truth.people) || mayRefuseWhole(truth)) return null;
  const broken = truth.people.find((p) => p && p.broken === true);
  if (broken === undefined || typeof broken.line !== "number" || typeof broken.swallowedLines !== "number") return null;
  const row = broken.line;
  const lines = broken.swallowedLines;
  const after = lines === 1 ? "the line after it" : `the ${groupedNumber(lines)} lines after it`;
  const digits = String(row).length + (lines > 0 ? String(lines).length : 0);
  const what = lines <= 0 ? "it" : digits > 6 ? "it and every line after it" : `it and ${after}`;
  return {
    row,
    lines,
    note: `Row ${row} opens a quote (${QUOTE_MARK}) that is never closed, so ${lines <= 0 ? "it was" : `it and ${after} were`} not read.`,
    sentence: `Row ${row} opens a quote (${QUOTE_MARK}) that is never closed, so ${what} could not be read.`,
    sumTail: lines <= 0
      ? null
      : `every row of your file up to row ${groupedNumber(row)} is counted once; the ${groupedNumber(lines)} ${lines === 1 ? "line" : "lines"} after it ${lines === 1 ? "was" : "were"} not read, because a quote in that row is never closed.`,
  };
}

/**
 * ⭐ D7 · a file whose truth lists rows ABOVE its column names: the ONE note the reader writes for them, first row to last
 * ("Row 1, …, was not read — a title." / "Rows 1–2, …, were not read — a title."), their texts — which nothing on the
 * columns step may quote — and the real column names Phone must be read from.
 */
function d7Expectation(truth) {
  const rows = truth !== null && Array.isArray(truth.titleRows) ? truth.titleRows.filter((r) => r && typeof r.line === "number") : [];
  if (rows.length === 0) return null;
  const first = rows[0].line;
  const last = rows[rows.length - 1].line;
  return {
    note: first === last
      ? `Row ${first}, above the column names, was not read — a title.`
      : `Rows ${first}${EN_DASH}${last}, above the column names, were not read — a title.`,
    texts: rows.map((r) => String(r.text ?? "").trim()).filter((t) => t !== ""),
    header: Array.isArray(truth.header) ? truth.header.filter((h) => typeof h === "string" && h.trim() !== "") : [],
  };
}

/**
 * ⭐ D6 · a workbook whose truth lists its sheets: the VISIBLE sheet with the most mobile cells is read (a tie → the
 * earlier); the note names it and its place among the visible sheets, and every other visible sheet holding mobiles as
 * NOT read with its way (as many → move it first, or save it alone; fewer → save it alone); a hidden sheet is never named.
 */
function d6Expectation(truth) {
  if (truth === null || truth.format !== "xlsx" || !Array.isArray(truth.sheets)) return null;
  const visible = truth.sheets.filter((s) => s && s.visible === true && typeof s.name === "string" && typeof s.mobiles === "number");
  if (visible.length < 2) return null;
  let read = visible[0];
  for (const s of visible) if (s.mobiles > read.mobiles) read = s;
  const quoted = (n) => `${OPEN_QUOTE}${n}${CLOSE_QUOTE}`;
  const tied = visible.filter((s) => s !== read && s.mobiles > 0 && s.mobiles === read.mobiles);
  const fewer = visible.filter((s) => s !== read && s.mobiles > 0 && s.mobiles < read.mobiles);
  const sentences = [`Read the sheet ${quoted(read.name)} (sheet ${visible.indexOf(read) + 1} of ${visible.length}).`];
  if (tied.length === 1) sentences.push(`The sheet ${quoted(tied[0].name)} holds as many mobile numbers and was not read: to import it, move it to the first place in Excel, or save it as its own file.`);
  if (fewer.length === 1) sentences.push(`The sheet ${quoted(fewer[0].name)} also holds mobile numbers and was not read: to import it, save it as its own file.`);
  return {
    sheet: read.name,
    sentences,
    unread: [...tied, ...fewer].map((s) => quoted(s.name)),
    hidden: truth.sheets.filter((s) => s && s.visible !== true && typeof s.name === "string").map((s) => s.name),
  };
}

/** ⭐ D2 · the columns NO reader may take as the person's number — another person's line, or a shared one. */
const NEVER_OWN_COLUMNS = [
  "Assistant's Phone", "Company Main Phone", "Callback", "Pager", "Radio Phone", "ISDN", "Telex", "TTY/TDD Phone", "Business Fax",
  "Home Fax", "Other Fax",
];
/** The never-own columns a file's truth holds a phone value in (by `source`) — the ones D2 is asked about. */
function neverOwnHeld(truth) {
  if (truth === null || !Array.isArray(truth.people)) return [];
  const held = new Set();
  for (const p of truth.people) {
    for (const ph of Array.isArray(p?.phones) ? p.phones : []) {
      if (typeof ph?.source === "string" && NEVER_OWN_COLUMNS.includes(ph.source)) held.add(ph.source);
    }
  }
  return [...held];
}

/** Every column on the columns step: its first cell's words (its letter, then its header) and what it is read as. */
const columnsShown = (page) => page.$$eval("[data-import-columns] tr[data-import-column]", (trs) => trs.map((tr) => ({
  readAs: tr.getAttribute("data-read-as") ?? "",
  text: ((tr.querySelector("td") && tr.querySelector("td").innerText) || "").replace(/\s+/g, " ").trim(),
})));

/** The rows a check list names, by its `data-import-row` stamps. */
const listedRows = (page, list) =>
  page.$$eval(`${block("import-preflight")} [data-import-list="${list}"] [data-import-row]`, (els) => els.map((e) => Number(e.getAttribute("data-import-row"))));

/** ⭐ C3b-fix · D9 · every value the columns step shows, one by one — the panel joins a column's first values with " · ". */
const sampleValues = (page) =>
  page.$$eval("[data-import-columns] tr[data-import-column] td:nth-child(2)", (tds) =>
    tds.flatMap((td) => (td.innerText || "").split(" · ").map((v) => v.trim()).filter((v) => v !== "" && v !== "Empty")));
/** How many digits a text holds, in any script — the separators between them never count. */
const digitsIn = (text) => Array.from(String(text)).filter((ch) => /^\p{Nd}$/u.test(ch)).length;

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
/** ⛔ V1 · what sticks out of the dialog's own panel sideways — a fixed overlay never shows in the page's width, so the
 *  page check above cannot see it (the start button's words ran past both its edges at 360 with that check green). */
const dialogOverflow = (page) => page.evaluate(() => {
  const panel = document.querySelector('[role="dialog"][aria-modal="true"] [data-rung="modal"]');
  return panel ? Math.max(0, panel.scrollWidth - panel.clientWidth) : -1;
});
/** What runs out of one element sideways — a button's words wider than the button. -1 when it is not on screen. */
const boxOverflow = (page, sel) => page.locator(sel).first().evaluate((n) => Math.max(0, n.scrollWidth - n.clientWidth)).catch(() => -1);

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
      // ⛔ C3b-fix · D9 · counted by DIGITS, never by punctuation: no value the columns step shows holds seven or more digits
      // in total, whatever separates them — Excel's "255,757,300,014" and an office's "0712/345/678" included.
      const shownValues = await sampleValues(page);
      const whole = shownValues.filter((v) => digitsIn(v) >= 7);
      ok(`${vp.name} · ${name} · no value on the columns holds seven or more digits (D9: a number is never shown whole, whatever separates its digits)`,
        whole.length === 0, `${shownValues.length} value(s) · ${whole.length} with 7+ digits`);
      // ⭐ C3b · what the columns now say for the four files whose readers changed.
      if (C3B_FILES.get(name) !== undefined && C3B_FILES.get(name) !== null) {
        const phoneRow = await textOf(page, '[data-import-columns] tr[data-read-as="phone"]');
        ok(`${vp.name} · ${name} · C3b · G4 · ONE added column, "Phone (read from: …)", is read as Phone`, /Phone \(read from: /.test(phoneRow)
          && (await count(page, '[data-import-columns] tr[data-read-as="phone"]')) === 1, phoneRow.slice(0, 160));
      }
      if (name === "excel-multi-sheet.xlsx") {
        const notes = await textOf(page, "[data-import-notes]");
        // C3b-fix · D6 · chosen by what it holds (Wateja holds the mobiles; the hidden Hesabu is never counted: 2 of 2).
        ok(`${vp.name} · ${name} · C3b · G2 · the workbook is read from the sheet with the mobiles, and the note names it`,
          /Read the sheet .Wateja. \(sheet 2 of 2\)/.test(notes), notes.slice(0, 200));
      }
      if (truth !== null && truth.format === "csv" && truth.brokenAtByte !== null) {
        const said = await textOf(page, "[data-import-summary]");
        ok(`${vp.name} · ${name} · C3b · G1 · one broken quote costs ONE record, said on the columns — never the file`, /1 record couldn.t be read/.test(said), said.slice(0, 200));
      }
      // ═══ ⭐ [C8c new] · C3b-fix's D5c, D7, D6 and D2 on the columns step, restated over the truth (unrun on OMEGA) ═══
      const d5 = d5Expectation(truth);
      const d7 = d7Expectation(truth);
      const d6 = d6Expectation(truth);
      const neverOwn = neverOwnHeld(truth);
      const notesSaid = await textOf(page, "[data-import-notes]");
      if (d5 !== null) {
        ok(`${vp.name} · ${name} · ${C8C} · C3b-fix · D5c · ONE reader note on the columns says the row and the ${d5.lines} line(s) its open quote swallowed`,
          notesSaid.includes(d5.note) && notesSaid.split(d5.note).length === 2, notesSaid.slice(0, 260));
      }
      if (d7 !== null) {
        const mappingSaid = await textOf(page, block("import-mapping"));
        const phoneHead = await textOf(page, '[data-import-columns] tr[data-read-as="phone"] td:first-child');
        ok(`${vp.name} · ${name} · ${C8C} · C3b-fix · D7 · the rows above the column names leave the data with ONE note naming them`,
          notesSaid.includes(d7.note) && notesSaid.split(d7.note).length === 2, notesSaid.slice(0, 260));
        ok(`${vp.name} · ${name} · ${C8C} · C3b-fix · D7 · a title is never quoted — not in a note, a column's name or its values`,
          d7.texts.length > 0 && d7.texts.every((t) => !mappingSaid.includes(t)), `${d7.texts.length} title row(s) in the truth`);
        ok(`${vp.name} · ${name} · ${C8C} · C3b-fix · D7 · Phone is read from the REAL column names below the title`,
          (await count(page, '[data-import-columns] tr[data-read-as="phone"]')) === 1 && d7.header.some((h) => phoneHead.endsWith(h)), phoneHead);
      }
      if (d6 !== null) {
        ok(`${vp.name} · ${name} · ${C8C} · C3b-fix · D6 · the visible sheet holding the most mobiles is read — the truth's sheet — and the note says which, and its place`,
          truth.sheet === d6.sheet && notesSaid.includes(d6.sentences[0]), `restated ${d6.sheet} · the truth's ${truth.sheet} · ${notesSaid.slice(0, 260)}`);
        ok(`${vp.name} · ${name} · ${C8C} · C3b-fix · D6 · every other visible sheet holding mobiles is named NOT read, with the way that works; no hidden sheet is named`,
          d6.unread.length > 0 && d6.unread.every((n) => notesSaid.includes(n)) && d6.sentences.every((s) => notesSaid.includes(s))
            && d6.hidden.every((n) => !notesSaid.includes(n)), notesSaid.slice(0, 300));
      }
      if (neverOwn.length > 0) {
        const shown = await columnsShown(page);
        const phoneCols = shown.filter((c) => c.readAs === "phone");
        const neverRows = shown.filter((c) => neverOwn.some((h) => c.text.endsWith(h)));
        ok(`${vp.name} · ${name} · ${C8C} · C3b-fix · D2 · the column read as Phone never reads ${neverOwn.join(" or ")}`,
          phoneCols.length === 1 && neverOwn.every((h) => !phoneCols[0].text.includes(h)), phoneCols.map((c) => c.text).join(" | ").slice(0, 200));
        ok(`${vp.name} · ${name} · ${C8C} · C3b-fix · D2 · ${neverOwn.join(" and ")} — each on the columns step, read as nothing`,
          neverRows.length === neverOwn.length && neverRows.every((c) => c.readAs === "none"), JSON.stringify(neverRows.map((c) => [c.text, c.readAs])).slice(0, 220));
      }
      if (vp.name === "360") {
        ok(`${vp.name} · ${name} · no horizontal page overflow on the columns`, (await overflowOf(page)) === 0);
        ok(`${vp.name} · ${name} · nothing sticks out of the dialog sideways on the columns (V1)`, (await dialogOverflow(page)) === 0,
          `panel ${await dialogOverflow(page)}px · Next ${await boxOverflow(page, block("import-mapping-next"))}px`);
      }
      const nextDisabled = await page.locator(block("import-mapping-next")).first().isDisabled();
      if (nextDisabled) {
        record.outcome = "held at the columns";
        record.held = await textOf(page, "[data-import-held]");
        ok(`${vp.name} · ${name} · Next is held WITH its reason on screen`, record.held.length > 0, record.held);
        // ⭐ C3b · G2 · none of the files whose readers C3b changed is held here — the cover-page workbook's contacts sheet is
        // found and read (C3b-fix · D6: by the mobiles it holds).
        ok(`${vp.name} · ${name} · C3b · none of the C3b files is held at the columns`, !C3B_FILES.has(name), record.held);
        if (/[.]xlsx$/i.test(name) && (await count(page, "[data-import-sheet-hint]")) > 0) {
          // C3b-fix · D8 · the sheet hint is the READER's word (no visible sheet holds a mobile), said with its way on.
          ok(`${vp.name} · ${name} · a workbook whose sheets hold no mobile says which sheet is read and how to fix it`,
            /first visible sheet was read/.test(await textOf(page, "[data-import-sheet-hint]")));
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
      // ⭐ C3b · the four gaps, asserted against the ground truth (`c3bExpectations` — the rule restated, never read back).
      if (C3B_FILES.has(name)) {
        const expect = c3bExpectations(truth, C3B_FILES.get(name) ?? null);
        if (expect === null) {
          ok(`${vp.name} · ${name} · C3b · the generator's ground truth lists the file's records`, false, "manifest entry or its people missing");
        } else {
          const invalidRows = await listedRows(page, "invalid");
          const unreadableRows = await listedRows(page, "unreadable");
          record.c3b = { ...expect, invalidRows, unreadableRows };
          const missing = expect.mustBeInvalid.filter((l) => !invalidRows.includes(l));
          ok(`${vp.name} · ${name} · C3b · every record with no Tanzanian mobile in any phone cell is listed "not a mobile"`,
            missing.length === 0 && check.invalid >= expect.mustBeInvalid.length, `missing ${JSON.stringify(missing)} · listed ${JSON.stringify(invalidRows)}`);
          const wronglyListed = expect.improved.filter((l) => invalidRows.includes(l));
          ok(`${vp.name} · ${name} · C3b · G3/G4 · no record whose mobile is now read — a second number in its cell, another phone column — is listed invalid`,
            wronglyListed.length === 0 && (!C3B_IMPROVES.has(name) || expect.improved.length > 0),
            `improved ${JSON.stringify(expect.improved)} · listed invalid ${JSON.stringify(wronglyListed)}`);
          ok(`${vp.name} · ${name} · C3b · G1 · "could not be read" lists exactly the broken records`,
            JSON.stringify(unreadableRows) === JSON.stringify(expect.unreadable) && check.unreadable === expect.unreadable.length,
            `listed ${JSON.stringify(unreadableRows)} · the truth ${JSON.stringify(expect.unreadable)} · box ${check.unreadable}`);
          if (expect.unreadable.length > 0) {
            const sentence = await textOf(page, `${block("import-preflight")} [data-import-list="unreadable"] [data-import-row="${expect.unreadable[0]}"]`);
            ok(`${vp.name} · ${name} · C3b · G1 · the broken record's sentence names its row and the way out, never a cell`,
              new RegExp(`Row ${expect.unreadable[0]} opens a quote`).test(sentence) && /Close or remove that quote, or delete the row/.test(sentence) && !/\d{9}/.test(sentence.replace(/\s/g, "")),
              sentence.slice(0, 220));
          }
        }
      }
      // ═══ ⭐ [C8c new] · C3b-fix's D5b, D5d and D7's real row numbers on the check (unrun on OMEGA) ═══
      if (d5 !== null) {
        const recordSaid = await textOf(page, `${block("import-preflight")} [data-import-list="unreadable"] [data-import-row="${d5.row}"]`);
        ok(`${vp.name} · ${name} · ${C8C} · C3b-fix · D5b · the broken record's sentence counts the lines its quote swallowed (the truth's ${d5.lines})`,
          recordSaid.includes(d5.sentence), recordSaid.slice(0, 260));
        const cutSaid = await page.locator("[data-import-sum]").first().getAttribute("data-import-sum-cut").catch(() => null);
        ok(`${vp.name} · ${name} · ${C8C} · C3b-fix · D5d · the check's sum line says the lines after row ${d5.row} were not read — never "${EVERY_ROW_CLAIM}"`,
          d5.sumTail === null ? cutSaid === "0" : cutSaid === String(d5.lines) && sumLine.includes(d5.sumTail) && !sumLine.includes(EVERY_ROW_CLAIM),
          `cut ${cutSaid} · "${sumLine.slice(0, 260)}"`);
      }
      if (d7 !== null) {
        const repeatedShown = await page.$$eval(`${block("import-preflight")} [data-import-list="repeated"] [data-import-row]`, (els) =>
          els.map((e) => ({ line: Number(e.getAttribute("data-import-row")), text: (e.innerText || "").replace(/\s+/g, " ").trim() })));
        const repeatsTruth = (truth.people ?? []).filter((p) => p && !p.blank && !p.broken && p.duplicateOf !== null);
        ok(`${vp.name} · ${name} · ${C8C} · C3b-fix · D7 · below a title every row keeps its REAL number: each repeat listed under its own row, naming the row it repeats`,
          repeatsTruth.length > 0 && repeatsTruth.every((p) => repeatedShown.some((r) => r.line === p.line && r.text.includes(`repeats row ${p.duplicateOf}`))),
          `the truth ${JSON.stringify(repeatsTruth.map((p) => [p.line, p.duplicateOf]))} · listed ${JSON.stringify(repeatedShown.map((r) => r.line))}`);
      }
      await shoot(page, dir, `${vp.name}-3-check`, block("import-preflight"), "Check before importing", block("import-preflight"));
      await shoot(page, dir, `${vp.name}-4-decision`, block("import-apply"), "Check before importing", block("import-decision"));
      if (vp.name === "360") {
        ok(`${vp.name} · ${name} · no horizontal page overflow on the check`, (await overflowOf(page)) === 0);
        const panelOver = await dialogOverflow(page);
        const applyOver = await boxOverflow(page, block("import-apply"));
        ok(`${vp.name} · ${name} · V1 · the start button's words stay inside it, and nothing sticks out of the dialog`, panelOver === 0 && applyOver === 0,
          `panel ${panelOver}px · start button ${applyOver}px · "${await textOf(page, block("import-apply"))}"`);
      }
      ok(`${vp.name} · ${name} · V1 · the promise is its own line above a short start button`,
        /^This import: [\d,]+ new · [\d,]+ updated · [\d,]+ kept as (it is|they are)\.$/.test(await textOf(page, "[data-import-apply-tally]"))
          && /^Import [\d,]+ rows?$/.test(await textOf(page, block("import-apply"))),
        `"${await textOf(page, "[data-import-apply-tally]")}" · "${await textOf(page, block("import-apply"))}"`);

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
      // ⭐ [C8c new] · C3b-fix · D5d on the RESULT: its sum line never claims every row of the file once lines were swallowed.
      if (d5 !== null && d5.sumTail !== null) {
        const doneSum = await textOf(page, `${block("import-done")} [data-import-sum]`);
        ok(`${vp.name} · ${name} · ${C8C} · C3b-fix · D5d · the result's sum line says the lines after row ${d5.row} were not read — never "${EVERY_ROW_CLAIM}"`,
          doneSum.includes(d5.sumTail) && !doneSum.includes(EVERY_ROW_CLAIM), doneSum.slice(0, 260));
      }
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

/* ═══ 2 · NUMBERS ALREADY IN THE BOOK — GROWTH keeps them (S15-10); ADMIN chooses, sets one apart, keeps it through a re-check (R7) ═══ */

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

/** ⭐ R7 · a number new on EVERY run of this drive (the in-memory server outlives a run): the one the book gains while the
 *  ADMIN's check stands, so the ADMIN's start is refused `check_again` and the dialog checks again. */
const R7_TAIL = String(Date.now() % 1_000_000).padStart(6, "0");
const R7_NUMBER = `0767 ${R7_TAIL.slice(0, 3)} ${R7_TAIL.slice(3)}`;
const U30_ADMIN_CSV = U30_CSV + `${R7_NUMBER},Zawadi Ali,,,` + CRLF;
const R7_CSV = ["Phone,Name", `${R7_NUMBER},Zawadi Ali`].join(CRLF) + CRLF;
/** The ADMIN's new list — letters only (a list name may not hold a run of digits), new on every run. */
const LIST_NAME = `Drive October ${[...R7_TAIL].map((d) => String.fromCharCode(97 + Number(d))).join("")}`;

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
  console.log(LF + "── duplicates · GROWTH keeps the book as it is (S15-10); ADMIN chooses, sets a row apart, and keeps it all through a re-check (R7)");
  const dir = join(OUT, "duplicates");
  mkdirSync(dir, { recursive: true });

  // ── S15-10 (R1) · GROWTH may not update contacts already in the book: no choices, no changes list — one line and its why ──
  const { ctx, page } = await staffCtx("GROWTH", "+255700003103", { width: 1280, height: 800 });
  await seed(page, "u30=1");
  await openContacts(page);
  await openImport(page);
  await importBuffer(page, "contacts-october.csv", U30_CSV);
  ok("duplicates · GROWTH: no choice cards and no changes list (S15-10)",
    (await count(page, "[data-import-choice]")) === 0 && (await count(page, "[data-import-change-row]")) === 0
      && (await page.locator(block("import-decision")).first().getAttribute("data-may-update")) === "no");
  const keptSection = await textOf(page, '[data-import-duplicates="kept"]');
  ok("duplicates · GROWTH: one line says the numbers in the book are kept as they are, with the why",
    /Numbers already in the book are kept as they are[.]/.test(keptSection) && /can see phone numbers/.test(keptSection), keptSection.slice(0, 220));
  const growthCounts = await applyCounts(page);
  const growthPromise = await textOf(page, "[data-import-apply-tally]");
  ok("duplicates · GROWTH: the promise is KEEP's — nothing updated — and the start button says only how many rows",
    growthCounts.update === 0 && /0 updated/.test(growthPromise) && /^Import [\d,]+ rows?$/.test(await textOf(page, block("import-apply"))),
    `${JSON.stringify(growthCounts)} · "${growthPromise}"`);
  ok(`duplicates · R14 · the fourth box reads "Can't be imported as written"`,
    /can.t be imported as written/i.test(await textOf(page, '[data-import-tile="invalid"]')), await textOf(page, '[data-import-tile="invalid"]'));
  await shoot(page, dir, "1-growth-kept", "[data-import-duplicates]", "Check before importing", "[data-import-duplicates]");
  await page.locator(block("import-apply")).first().click();
  if ((await page.waitForSelector(CONFIRM, { timeout: 1_500 }).catch(() => null)) !== null) await confirmTop(page);
  await page.waitForSelector(block("import-done"), { timeout: 120_000 });
  await wait(500);
  const growthResult = await tilesIn(page, block("import-done"));
  ok("duplicates · GROWTH's import updates nothing in the book, and reads ONE kept number (S15-3)",
    growthResult.update === 0 && growthResult.create === growthCounts.create && (await count(page, "[data-import-kept-split]")) === 0, JSON.stringify(growthResult));
  await shoot(page, dir, "2-done-growth", block("import-done"), "Import finished");
  summary.flows.push({ flow: "duplicates-growth", promise: growthCounts, result: growthResult });
  await closeDialog(page);
  // ⚠️ GROWTH's session stays open: it moves the book under the ADMIN's check below (R7).

  // ── ADMIN (a reader): the three choices, "Use the file's version", one row set apart, a new list named ──
  const adm = await staffCtx("ADMIN", "+255700003104", { width: 1280, height: 800 });
  await openContacts(adm.page);
  await openImport(adm.page);
  await importBuffer(adm.page, "contacts-october-admin.csv", U30_ADMIN_CSV);
  ok("duplicates · ADMIN: the three choices are offered", (await count(adm.page, "[data-import-choice]")) === 3);
  await shoot(adm.page, dir, "3-admin-choices", "[data-import-duplicates]", "Check before importing", "[data-import-duplicates]");
  const keepCounts = await applyCounts(adm.page);
  await adm.page.locator('[data-import-choice="TAKE_FILE"]').first().click();
  await wait(300);
  const takeCounts = await applyCounts(adm.page);
  ok(`duplicates · ADMIN: "Use the file's version" moves the promise (more updated, fewer kept)`, takeCounts.update > keepCounts.update,
    `${JSON.stringify(keepCounts)} → ${JSON.stringify(takeCounts)}`);
  await adm.page.waitForSelector("[data-import-change-row]", { timeout: 30_000 });
  await adm.page.locator("[data-import-change-row] label").first().click();
  await wait(300);
  const apartCounts = await applyCounts(adm.page);
  ok("duplicates · ADMIN: one row set apart moves the promise by exactly that row", apartCounts.update === takeCounts.update - 1 && apartCounts.keep === takeCounts.keep + 1,
    `${JSON.stringify(takeCounts)} → ${JSON.stringify(apartCounts)}`);
  ok("duplicates · ADMIN: the row reads as set apart", (await count(adm.page, '[data-import-change-row][data-apart="yes"]')) === 1);
  const apartLine = await adm.page.locator('[data-import-change-row][data-apart="yes"]').first().getAttribute("data-import-change-row");
  await adm.page.locator('[data-import-list-option="new"]').first().click();
  await adm.page.locator('[data-field="listName"] input').first().fill(LIST_NAME);
  await wait(300);
  await shoot(adm.page, dir, "4-set-apart", "[data-import-changes]", "Check before importing", "[data-import-changes]");

  // ── R7 · the book moves under the ADMIN's check: GROWTH imports the one number the ADMIN's file holds as new ──
  await openContacts(page);
  await openImport(page);
  await importBuffer(page, "one-more.csv", R7_CSV);
  await page.locator(block("import-apply")).first().click();
  await page.waitForSelector(block("import-done"), { timeout: 120_000 });
  ok("duplicates · R7 · the book moved: GROWTH added the number the ADMIN's file holds as new", (await tilesIn(page, block("import-done"))).create === 1);
  await closeDialog(page);
  await ctx.close();

  // ── the ADMIN presses Import: refused (the book changed), checked again — and nothing the ADMIN chose is lost ──
  const NOTE = `${block("import-decision")} [data-import-alert]:has-text("changed since this file was checked")`;
  await adm.page.locator(block("import-apply")).first().click();
  await adm.page.waitForSelector(NOTE, { timeout: 120_000 }).catch(() => null);
  await adm.page.waitForSelector('[data-import-change-row][data-apart="yes"]', { timeout: 60_000 }).catch(() => null);
  await wait(500);
  const note = await textOf(adm.page, NOTE);
  const againCounts = await applyCounts(adm.page);
  const takeStill = await adm.page.locator('[data-import-choice="TAKE_FILE"] input[type="radio"]').first().isChecked().catch(() => false);
  const apartStill = await adm.page.locator('[data-import-change-row][data-apart="yes"]').first().getAttribute("data-import-change-row").catch(() => null);
  const listStill = await adm.page.locator('[data-import-list-option="new"] input[type="radio"]').first().isChecked().catch(() => false);
  const nameStill = await adm.page.locator('[data-field="listName"] input').first().inputValue().catch(() => "");
  ok("duplicates · R7 · the start was refused because the book changed, and said so", /changed since this file was checked/.test(note), note);
  ok("duplicates · R7 · checked again WITHOUT losing the decision: the choice, the row set apart, the new list and its name",
    takeStill && apartStill === apartLine && listStill && nameStill === LIST_NAME,
    `choice ${takeStill} · apart ${apartStill} (was ${apartLine}) · list ${listStill} · name "${nameStill}"`);
  ok("duplicates · R7 · the new promise moved by exactly the one number the book gained", againCounts.create === apartCounts.create - 1 && againCounts.update === apartCounts.update,
    `${JSON.stringify(apartCounts)} → ${JSON.stringify(againCounts)}`);
  await shoot(adm.page, dir, "5-rechecked", NOTE, "Check before importing", NOTE);
  await adm.page.locator(block("import-apply")).first().click();
  if ((await adm.page.waitForSelector(CONFIRM, { timeout: 3_000 }).catch(() => null)) !== null) {
    ok("duplicates · replacing details asks once more, naming how many", /replace/i.test(await textOf(adm.page, CONFIRM)));
    await adm.page.screenshot({ path: join(dir, "6-overwrite-confirm.png") });
    await confirmTop(adm.page);
  }
  await adm.page.waitForSelector(block("import-done"), { timeout: 120_000 });
  await wait(500);
  const adminResult = await tilesIn(adm.page, block("import-done"));
  const split = await textOf(adm.page, "[data-import-kept-split]");
  const listSaid = await textOf(adm.page, "[data-import-list-result]");
  ok("duplicates · ADMIN: the result's updates are the promise's (one row set apart)", adminResult.update === againCounts.update && adminResult.create === againCounts.create,
    `${JSON.stringify(adminResult)} vs ${JSON.stringify(againCounts)}`);
  ok("duplicates · ADMIN reads the kept rows split by reason (S15-3)", adminResult.keep === 0 || /Kept:/.test(split), split);
  ok("duplicates · ADMIN: the contacts went on the new list, and the result says its basis is owed", listSaid.includes(LIST_NAME), listSaid.slice(0, 200));
  await shoot(adm.page, dir, "7-done-admin", block("import-done"), "Import finished");
  summary.flows.push({ flow: "duplicates-admin", keep: keepCounts, takeFile: takeCounts, setApart: apartCounts, afterRecheck: againCounts, result: adminResult, keptSplit: split });
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
    ok("stop-cancel · the confirmation names both numbers — the contacts written, and the rows not reached yet (R5)",
      (ask.match(/\d[\d,]*/g) ?? []).length >= 2 && /written to the book/.test(ask) && /not reached yet/.test(ask), ask.slice(0, 200));
    await page.screenshot({ path: join(dir, "2-cancel-confirm.png") });
    await confirmTop(page);
    await page.waitForSelector(block("import-done"), { timeout: 60_000 });
    await wait(500);
    const status = await page.locator(block("import-done")).first().getAttribute("data-run-status");
    const said = await textOf(page, block("import-done"));
    ok("stop-cancel · the result is the cancelled run, saying what stayed", status === "CANCELLED" && /cancelled/i.test(said) && /stay/.test(said), said.slice(0, 200));
    // ⭐ R5 · written = added + updated (never the cursor); the rows never reached = the cancel's own count; no tile for the
    // unsettled rows (a cancel deletes them, so it always read 0); and the sum counts every row of the FILE once.
    const cancelTiles = await tilesIn(page, block("import-done"));
    const notImported = Number(await page.locator(block("import-done")).first().getAttribute("data-not-imported"));
    const sumAttr = await page.locator("[data-import-sum]").first().getAttribute("data-import-sum").catch(() => null);
    const sumText = await textOf(page, "[data-import-sum]");
    const writtenSaid = /The import was cancelled[.] ([\d,]+) contacts? (?:was|were) written/.exec(said)?.[1]?.replace(/,/g, "") ?? null;
    ok("stop-cancel · R5 · four tiles — no tile for the rows a cancel deletes", Object.keys(cancelTiles).sort().join(",") === "create,fail,keep,update", JSON.stringify(cancelTiles));
    ok(`stop-cancel · R5 · "written" is the contacts added plus updated`, writtenSaid === String(cancelTiles.create + cancelTiles.update), `${writtenSaid} vs ${JSON.stringify(cancelTiles)}`);
    ok("stop-cancel · R5 · the rows not imported are the ones the pause left, and the sum counts every row of the file once",
      notImported > 0 && notImported === paused.total - paused.done && sumAttr === "3000" && /not imported/.test(sumText)
        && cancelTiles.create + cancelTiles.update + cancelTiles.keep + cancelTiles.fail + notImported === 3_000,
      `${notImported} not imported (paused at ${paused.done} of ${paused.total}) · ${JSON.stringify(cancelTiles)} · "${sumText}"`);
    ok("stop-cancel · no horizontal page overflow at 360", (await overflowOf(page)) === 0);
    ok("stop-cancel · nothing sticks out of the dialog sideways on the result at 360", (await dialogOverflow(page)) === 0, `${await dialogOverflow(page)}px`);
    await shoot(page, dir, "3-cancelled", block("import-done"), "Import cancelled");
    summary.flows.push({ flow: "stop-cancel", paused, result: await tilesIn(page, block("import-done")) });
  }
  await closeDialog(page);
  await ctx.close();
}

/* ═══ 4 · S15-12 (R2b) · AN ADMIN CARRIES ON ANOTHER OFFICER'S UNFINISHED IMPORT ═════════════════════════════ */

{
  console.log(LF + "── an admin resumes another officer's paused import");
  const dir = join(OUT, "admin-adopt");
  mkdirSync(dir, { recursive: true });
  // GROWTH starts the big file and stops it after a step: the run is PAUSED on the server, and the window is closed.
  const g = await staffCtx("GROWTH", "+255700003108", { width: 1280, height: 800 });
  await openContacts(g.page);
  await openImport(g.page);
  await importBuffer(g.page, "drive-big-adopt.csv", BIG_CSV);
  const hold = await holdStep(g.page, 2);
  await g.page.locator(block("import-apply")).first().click();
  await hold.held;
  await g.page.locator(`${block("import-commit")} [data-import-act="stop"]`).first().click();
  await wait(200);
  hold.release();
  await hold.stop();
  await g.page.waitForSelector(`${block("import-commit")}[data-state="paused"]`, { timeout: 60_000 });
  const paused = await commitState(g.page);
  await closeDialog(g.page);

  // An ADMIN opens the importer: the entrance lists that run — who started it, when, how far — with Resume.
  const a = await staffCtx("ADMIN", "+255700003109", { width: 1280, height: 800 });
  await openContacts(a.page);
  await openImport(a.page);
  const OTHER = "[data-import-others] [data-import-other-run]";
  await a.page.waitForSelector(OTHER, { timeout: 30_000 }).catch(() => null);
  const item = a.page.locator(OTHER).first();
  const itemText = (await count(a.page, OTHER)) > 0 ? ((await item.innerText()) || "").replace(/\s+/g, " ").trim() : "";
  ok("admin-adopt · the entrance lists another officer's unfinished import: who started it, and how far it got (S15-12)",
    /Started by (?!you)/.test(itemText) && /rows done/.test(itemText) && (await item.getAttribute("data-run-status").catch(() => null)) === "PAUSED",
    itemText.slice(0, 200));
  await shoot(a.page, dir, "1-others", "[data-import-others]", "Import contacts", "[data-import-others]");
  await item.locator('[data-import-act="other-resume"]').click();
  await a.page.waitForSelector(block("import-done"), { timeout: 300_000 });
  await wait(500);
  const result = await tilesIn(a.page, block("import-done"));
  ok("admin-adopt · resumed by the admin from the server's cursor to the end: every row of the file counted once",
    result.create + result.update + result.keep + result.fail === 3_000, JSON.stringify(result));
  await shoot(a.page, dir, "2-done", block("import-done"), "Import finished");
  summary.flows.push({ flow: "admin-adopt", paused, result });
  await closeDialog(a.page);
  await a.ctx.close();

  // ⭐ …and the list is the ADMIN's alone: a GROWTH officer's entrance shows none of it.
  await openContacts(g.page);
  await openImport(g.page);
  await wait(1_500);
  ok("admin-adopt · a GROWTH officer's entrance shows no other officers' imports", (await count(g.page, "[data-import-others]")) === 0);
  await closeDialog(g.page);
  await g.ctx.close();
}

/* ═══ 5 · ⭐ [C8c new] · #12 · THE DIALOG PATHS THE DRIVE NEVER EXECUTED ═══════════════════════════════════════
 * ⚠️ WRITTEN WITHOUT A RUN: the C8c builder may not run Playwright on OMEGA, so the integrator's first run is these
 * flows' first. Every label carries "[C8c new]"; each flow is wrapped so a fault in one is ONE failed check and the
 * flows after it still run. Each step is asserted before it is photographed, as above. Fresh officers (+255700003110…)
 * so no flow meets another's run; new numbers in ranges nothing else uses (07 63/64/65 + this run's tail). */

/** The dialog's ✕ — the panel's own close button, found by its place (its label is the locale's word for Close). */
const CLOSE_X = `${DIALOG} [data-rung="modal"] > button[aria-label]`;

/** A staging batch's request: the batch's rows and the run's file digest (no other action posts both). */
const isStageBody = (body) => body.includes('"rows":[') && body.includes('"fileDigest"');

/** Hold the RESPONSE of the n-th POST whose body passes `test` — fetched, held until released, then fulfilled (`holdStep`'s
 *  way, for any action: never an aborted request). */
async function holdPost(page, n, test) {
  let seen = 0;
  let release = () => {};
  const released = new Promise((r) => { release = r; });
  let markHeld = () => {};
  const held = new Promise((r) => { markHeld = r; });
  const pattern = `${BASE}/admin/contacts**`;
  await page.route(pattern, async (route) => {
    const req = route.request();
    if (req.method() !== "POST" || !test(req.postData() ?? "")) return route.continue();
    seen++;
    if (seen !== n) return route.continue();
    const response = await route.fetch();
    markHeld();
    await released;
    await route.fulfill({ response }).catch(() => {});
  });
  return { held, release: () => release(), stop: () => page.unroute(pattern).catch(() => {}) };
}

/** The bet queue's own sentence for a busy step (import-flow.ts, `IMPORT_REFUSAL_SENTENCES.busy`). */
const BUSY_SENTENCE = "The platform is busy right now — bets come first. The import carries on by itself as soon as it is free.";

/**
 * The n-th commit step answered BUSY. The server DOES the step (its response is fetched); the answer the page reads is
 * rewritten into the bet queue's `busy` refusal carrying the run's view AS THE STEP LEFT IT — so the page's next ask
 * starts from the server's real cursor — and `retryAfterSec`. ⚠️ Only the action's flight row holding the answer (a
 * JSON object with `ok: true` and a `view`) is replaced; every other row stays as Next wrote it. `rewritten` resolves
 * false when no such row was found, and the flow then FAILS saying so — never a busy wait that was not one.
 */
async function busyStep(page, n, retryAfterSec) {
  let seen = 0;
  let settled = () => {};
  const rewritten = new Promise((r) => { settled = r; });
  const pattern = `${BASE}/admin/contacts**`;
  await page.route(pattern, async (route) => {
    const req = route.request();
    if (req.method() !== "POST" || !(req.postData() ?? "").includes("fromCursor")) return route.continue();
    seen++;
    if (seen !== n) return route.continue();
    const response = await route.fetch();
    const text = await response.text();
    let changed = false;
    const rows = text.split(LF).map((row) => {
      if (changed) return row;
      const colon = row.indexOf(":");
      if (colon <= 0 || !/^[0-9a-f]+$/.test(row.slice(0, colon))) return row;
      let answer = null;
      try {
        answer = JSON.parse(row.slice(colon + 1));
      } catch {
        return row;
      }
      if (answer === null || typeof answer !== "object" || answer.ok !== true || !("view" in answer)) return row;
      changed = true;
      return `${row.slice(0, colon)}:${JSON.stringify({ ok: false, reason: "busy", message: BUSY_SENTENCE, view: answer.view, retryAfterSec })}`;
    });
    // The body is handed over whole and decoded: its old length, encoding and chunking no longer describe it.
    const headers = { ...response.headers() };
    for (const h of ["content-length", "content-encoding", "transfer-encoding"]) delete headers[h];
    await route.fulfill({ status: response.status(), headers, body: changed ? rows.join(LF) : text }).catch(() => {});
    settled(changed);
  });
  return { rewritten, stop: () => page.unroute(pattern).catch(() => {}) };
}

/** Wait until `sel` matches exactly `n` elements (or `ms` passes); true when it does. */
async function waitForCount(page, sel, n, ms = 30_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if ((await count(page, sel)) === n) return true;
    await wait(250);
  }
  return (await count(page, sel)) === n;
}

/** Digits as letters (a list name, or a contact's, may not hold a run of digits). */
const lettersOf = (digits) => [...String(digits)].map((d) => String.fromCharCode(97 + Number(d))).join("");
/** `n` new contacts on a range nothing else uses — this run's tail keeps a re-run's numbers new to the in-memory book. */
const freshCsv = (ndc, n, from = 0) => ["Phone,Name", ...Array.from({ length: n }, (_, i) =>
  `${ndc} ${R7_TAIL.slice(0, 3)} ${String(from + i).padStart(3, "0")},Mteja ${lettersOf(from + i)}`)].join(CRLF) + CRLF;

/** One #12 flow: a fault is ONE failed check with its capture, and the flows after it still run. */
async function c8cFlow(title, dirName, role, phone, viewport, body) {
  console.log(`${LF}── ${C8C} · ${title}`);
  const dir = join(OUT, dirName);
  mkdirSync(dir, { recursive: true });
  const { ctx, page } = await staffCtx(role, phone, viewport);
  try {
    await body(page, dir);
  } catch (e) {
    ok(`${dirName} · ${C8C} · driven to its end without a drive error`, false, String(e?.message ?? e).slice(0, 200));
    await page.screenshot({ path: join(dir, "error.png") }).catch(() => {});
  }
  await ctx.close().catch(() => {});
}

const WIDE = { width: 1280, height: 800 };

// ── #12a · ✕ and Escape during a commit: Escape is ignored, ✕ ASKS, the run stays resumable — and the reopened dialog says so ──
await c8cFlow("✕ and Escape during a commit", "c8c-close-during-commit", "GROWTH", "+255700003110", WIDE, async (page, dir) => {
  await openContacts(page);
  await openImport(page);
  await importBuffer(page, "drive-big-close.csv", BIG_CSV);
  const hold = await holdStep(page, 2);
  await page.locator(block("import-apply")).first().click();
  await hold.held;
  await wait(300);
  await page.keyboard.press("Escape");
  await wait(700);
  const afterEscape = await commitState(page);
  ok(`c8c-close-during-commit · ${C8C} · Escape during the commit is ignored: the dialog stays open and importing, nothing asked`,
    (await count(page, DIALOG)) === 1 && (await count(page, CONFIRM)) === 0 && afterEscape.state === "importing", JSON.stringify(afterEscape));
  await shoot(page, dir, "1-escape-ignored", block("import-commit"), "Importing contacts");
  await page.locator(CLOSE_X).first().click();
  await page.waitForSelector(`${CONFIRM} [data-import-confirm="stop"]`, { timeout: 10_000 }).catch(() => null);
  const ask = await textOf(page, `${CONFIRM} [data-import-confirm="stop"]`);
  ok(`c8c-close-during-commit · ${C8C} · ✕ during the commit ASKS first — and says the run can be resumed from Import contacts`,
    /stops after the rows being written now/.test(ask) && /resume it from Import contacts/.test(ask), ask.slice(0, 200));
  await page.screenshot({ path: join(dir, "2-close-asks.png") });
  await confirmTop(page);
  hold.release();
  await hold.stop();
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 60_000 }).catch(() => null);
  ok(`c8c-close-during-commit · ${C8C} · "Stop the import" closes the dialog once the rows being written are done`, (await count(page, DIALOG)) === 0);
  await page.locator(block("contacts-import")).first().click();
  await page.waitForSelector(block("import-adopt"), { timeout: 30_000 }).catch(() => null);
  const adoptSaid = await textOf(page, block("import-adopt"));
  const adoptStatus = await page.locator(block("import-adopt")).first().getAttribute("data-run-status").catch(() => null);
  ok(`c8c-close-during-commit · ${C8C} · reopened, the dialog opens ON the run — paused by you, how far it got, with Resume`,
    adoptStatus === "PAUSED" && /Paused by you/.test(adoptSaid) && /rows done/.test(adoptSaid)
      && (await count(page, `${block("import-adopt")} [data-import-act="resume"]`)) === 1, `${adoptStatus} · ${adoptSaid.slice(0, 200)}`);
  await shoot(page, dir, "3-reopened-paused", block("import-adopt"), "An import isn't finished");
  await page.locator(`${block("import-adopt")} [data-import-act="resume"]`).first().click();
  await page.waitForSelector(block("import-done"), { timeout: 300_000 });
  await wait(500);
  const result = await tilesIn(page, block("import-done"));
  ok(`c8c-close-during-commit · ${C8C} · resumed to the end: every row of the file counted once`,
    result.create + result.update + result.keep + result.fail === 3_000, JSON.stringify(result));
  await shoot(page, dir, "4-done", block("import-done"), "Import finished");
  summary.flows.push({ flow: "c8c-close-during-commit", afterEscape, adoptStatus, result });
  await closeDialog(page);
});

// ── #12b · Stop during an upload: it stops after the batch being sent, the run waits on its adopt panel, Resume carries on ──
await c8cFlow("Stop during an upload", "c8c-stop-upload", "GROWTH", "+255700003111", WIDE, async (page, dir) => {
  await openContacts(page);
  await openImport(page);
  await page.setInputFiles(`input${block("import-file")}`, { name: "drive-big-upload.csv", mimeType: "text/csv", buffer: Buffer.from(BIG_CSV, "utf8") });
  await page.waitForSelector(block("import-mapping"), { timeout: 60_000 });
  const hold = await holdPost(page, 1, isStageBody);
  await page.locator(block("import-mapping-next")).first().click();
  await hold.held;
  await wait(300);
  ok(`c8c-stop-upload · ${C8C} · the upload is running, its bar on screen and its Stop live`,
    (await count(page, "[data-import-uploading]")) === 1 && (await page.locator('[data-import-act="stop-upload"]').first().isEnabled().catch(() => false)));
  await shoot(page, dir, "1-uploading", "[data-import-uploading]", "Check before importing");
  await page.locator('[data-import-act="stop-upload"]').first().click();
  await wait(200);
  ok(`c8c-stop-upload · ${C8C} · Stop says it stops after the rows being sent now`, /Stopping after the rows being sent now/.test(await textOf(page, block("import-preflight"))));
  hold.release();
  await hold.stop();
  await page.waitForSelector(block("import-adopt"), { timeout: 60_000 }).catch(() => null);
  const said = await textOf(page, block("import-adopt"));
  const status = await page.locator(block("import-adopt")).first().getAttribute("data-run-status").catch(() => null);
  ok(`c8c-stop-upload · ${C8C} · stopped: still uploading on the server, how far it got, nothing in the book yet — and Resume`,
    status === "STAGING" && /Uploading stopped after [0-9,]+ of 3,000 rows/.test(said) && /Nothing is in the contact book yet/.test(said)
      && (await count(page, `${block("import-adopt")} [data-import-act="resume"]`)) === 1, `${status} · ${said.slice(0, 220)}`);
  await shoot(page, dir, "2-stopped", block("import-adopt"), "An import isn't finished");
  await page.locator(`${block("import-adopt")} [data-import-act="resume"]`).first().click();
  await page.waitForSelector(block("import-apply"), { timeout: 180_000 });
  await wait(500);
  const check = await tilesIn(page, block("import-preflight"));
  const rows = Object.values(check).reduce((a, b) => a + b, 0);
  ok(`c8c-stop-upload · ${C8C} · resumed: the upload carried on to the check, and every row of the file is counted once`, rows === 3_000, JSON.stringify(check));
  await shoot(page, dir, "3-resumed-check", block("import-preflight"), "Check before importing", block("import-preflight"));
  await page.locator(`${block("import-decision")} [data-import-act="discard"]`).first().click();
  await confirmTop(page);
  await page.waitForSelector(block("import-entrance"), { timeout: 30_000 });
  summary.flows.push({ flow: "c8c-stop-upload", status, check });
  await closeDialog(page);
});

// ── #12c · Stop during a busy wait: the wait (30 s here) never holds a Stop back — the run pauses at once ──
await c8cFlow("Stop during a busy wait", "c8c-stop-busy", "GROWTH", "+255700003112", WIDE, async (page, dir) => {
  await openContacts(page);
  await openImport(page);
  await importBuffer(page, "drive-big-busy.csv", BIG_CSV);
  const busy = await busyStep(page, 2, 30);
  await page.locator(block("import-apply")).first().click();
  const rewrote = await Promise.race([busy.rewritten, wait(120_000).then(() => false)]);
  ok(`c8c-stop-busy · ${C8C} · the second step's answer became the bet queue's busy (its flight row found and rewritten)`, rewrote === true);
  const BUSY = `${block("import-commit")} [data-import-busy]`;
  await page.waitForSelector(BUSY, { timeout: 30_000 }).catch(() => null);
  const busyLine = await textOf(page, BUSY);
  const waitSec = await page.locator(BUSY).first().getAttribute("data-wait-sec").catch(() => null);
  ok(`c8c-stop-busy · ${C8C} · the wait is said in the server's own sentence — it carries on by itself — and Stop is live`,
    busyLine.includes(BUSY_SENTENCE) && /You can still stop it here/.test(busyLine) && waitSec === "30"
      && (await page.locator(`${block("import-commit")} [data-import-act="stop"]`).first().isEnabled().catch(() => false)), `${waitSec} s · ${busyLine.slice(0, 200)}`);
  await shoot(page, dir, "1-busy-wait", BUSY, "Importing contacts");
  const pressed = Date.now();
  await page.locator(`${block("import-commit")} [data-import-act="stop"]`).first().click();
  await page.waitForSelector(`${block("import-commit")}[data-state="paused"]`, { timeout: 60_000 }).catch(() => null);
  const tookMs = Date.now() - pressed;
  const paused = await commitState(page);
  const runStatus = await page.locator(block("import-commit")).first().getAttribute("data-run-status").catch(() => null);
  ok(`c8c-stop-busy · ${C8C} · Stop during the busy wait pauses the run at once — never after the 30 s wait`,
    paused.state === "paused" && runStatus === "PAUSED" && tookMs < 15_000 && paused.done > 0 && paused.done < paused.total,
    `${tookMs} ms · ${runStatus} · ${JSON.stringify(paused)}`);
  await shoot(page, dir, "2-paused", block("import-commit"), "Import paused");
  await busy.stop();
  await page.locator(`${block("import-commit")} [data-import-act="resume"]`).first().click();
  await page.waitForSelector(block("import-done"), { timeout: 300_000 });
  await wait(500);
  const result = await tilesIn(page, block("import-done"));
  ok(`c8c-stop-busy · ${C8C} · resumed to the end from the server's cursor: every row counted once`,
    result.create + result.update + result.keep + result.fail === 3_000, JSON.stringify(result));
  await shoot(page, dir, "3-done", block("import-done"), "Import finished");
  summary.flows.push({ flow: "c8c-stop-busy", tookMs, paused, result });
  await closeDialog(page);
});

// ── #12d · an EXISTING list chosen — and (R12, N3) its name typed in other capitals IS that list ──
await c8cFlow("choosing an EXISTING list", "c8c-existing-list", "ADMIN", "+255700003113", WIDE, async (page, dir) => {
  const EXISTING = `Drive Existing ${lettersOf(R7_TAIL)}`;
  const OPTION = `[data-import-list-option]:has-text("${EXISTING}")`;
  // 1 · a first import makes the list.
  await openContacts(page);
  await openImport(page);
  await importBuffer(page, "existing-list-1.csv", freshCsv("0765", 3, 0));
  await page.locator('[data-import-list-option="new"]').first().click();
  await page.locator('[data-field="listName"] input').first().fill(EXISTING);
  await page.locator(block("import-apply")).first().click();
  if ((await page.waitForSelector(CONFIRM, { timeout: 1_500 }).catch(() => null)) !== null) await confirmTop(page);
  await page.waitForSelector(block("import-done"), { timeout: 120_000 });
  ok(`c8c-existing-list · ${C8C} · a first import made the list`, (await textOf(page, "[data-import-list-result]")).includes(EXISTING));
  await closeDialog(page);
  // 2 · the second import CHOOSES it among the lists.
  await openContacts(page);
  await openImport(page);
  await importBuffer(page, "existing-list-2.csv", freshCsv("0765", 3, 3));
  await page.waitForSelector(OPTION, { timeout: 30_000 }).catch(() => null);
  const optionSaid = await textOf(page, OPTION);
  ok(`c8c-existing-list · ${C8C} · the list is offered among the lists, with its members counted`, /3 members/.test(optionSaid), optionSaid.slice(0, 200));
  await page.locator(OPTION).first().click();
  await wait(300);
  const picked = await page.locator(`${OPTION} input[type="radio"]`).first().isChecked().catch(() => false);
  ok(`c8c-existing-list · ${C8C} · the existing list is chosen — no new name asked`, picked && (await count(page, '[data-field="listName"]')) === 0);
  await shoot(page, dir, "1-existing-chosen", "[data-import-list-step]", "Check before importing", "[data-import-list-step]");
  await page.locator(block("import-apply")).first().click();
  if ((await page.waitForSelector(CONFIRM, { timeout: 1_500 }).catch(() => null)) !== null) await confirmTop(page);
  await page.waitForSelector(block("import-done"), { timeout: 120_000 });
  await wait(500);
  const listSaid = await textOf(page, "[data-import-list-result]");
  ok(`c8c-existing-list · ${C8C} · the result says the contacts went on the EXISTING list`, listSaid.includes(EXISTING), listSaid.slice(0, 200));
  await shoot(page, dir, "2-done-existing", "[data-import-list-result]", "Import finished");
  await closeDialog(page);
  // 3 · typed as a NEW list in other capitals, the name IS that list: the panel says so, and the contacts go on it.
  await openContacts(page);
  await openImport(page);
  await importBuffer(page, "existing-list-3.csv", freshCsv("0765", 3, 6));
  await page.locator('[data-import-list-option="new"]').first().click();
  await page.locator('[data-field="listName"] input').first().fill(EXISTING.toUpperCase());
  await wait(400);
  const hint = await textOf(page, '[data-field="listName"]');
  ok(`c8c-existing-list · ${C8C} · R12 · the same name in other capitals IS the existing list, and the panel says so`,
    /A list with this name already exists, so the contacts are added to it/.test(hint), hint.slice(0, 200));
  await shoot(page, dir, "3-same-name-other-case", '[data-field="listName"]', "Check before importing", "[data-import-list-step]");
  await page.locator(block("import-apply")).first().click();
  if ((await page.waitForSelector(CONFIRM, { timeout: 1_500 }).catch(() => null)) !== null) await confirmTop(page);
  await page.waitForSelector(block("import-done"), { timeout: 120_000 });
  await wait(500);
  const sameSaid = await textOf(page, "[data-import-list-result]");
  ok(`c8c-existing-list · ${C8C} · N3 · the contacts went on the existing list, under its own spelling — no second list`,
    sameSaid.includes(EXISTING) && !sameSaid.includes(EXISTING.toUpperCase()), sameSaid.slice(0, 200));
  await shoot(page, dir, "4-done-same-name", "[data-import-list-result]", "Import finished");
  summary.flows.push({ flow: "c8c-existing-list", list: EXISTING, optionSaid, listSaid, sameSaid });
  await closeDialog(page);
});

// ── #12e · an exception under KEEP, refused for a masked officer (S15-10): forged into the start, refused by the server ──
await c8cFlow("an exception under KEEP refused for a masked officer", "c8c-masked-exception", "GROWTH", "+255700003114", WIDE, async (page, dir) => {
  await seed(page, "u30=1");
  await openContacts(page);
  await openImport(page);
  await importBuffer(page, "contacts-october-forged.csv", U30_CSV);
  ok(`c8c-masked-exception · ${C8C} · GROWTH is offered no choice and no row to set apart (S15-10) — so the exception is forged`,
    (await count(page, "[data-import-choice]")) === 0 && (await count(page, "[data-import-change-row]")) === 0
      && (await page.locator(block("import-decision")).first().getAttribute("data-may-update")) === "no");
  // The start's request is rewritten: one row (line 3 — the u30 world's contact 001, in the book) taken from the file
  // under KEEP. The server must refuse it before it reads a row (S15-10: a non-reader starts with KEEP and no exception).
  let forged = false;
  const pattern = `${BASE}/admin/contacts**`;
  await page.route(pattern, async (route) => {
    const req = route.request();
    const sent = req.postData() ?? "";
    if (req.method() !== "POST" || forged || !sent.includes('"checkedAt"') || !sent.includes('"expected"')) return route.continue();
    let args = null;
    try {
      args = JSON.parse(sent);
    } catch {
      return route.continue();
    }
    if (!Array.isArray(args) || args[0] === null || typeof args[0] !== "object" || args[0].choice !== "KEEP") return route.continue();
    args[0].exceptions = { 3: "TAKE_FILE" };
    forged = true;
    return route.continue({ postData: JSON.stringify(args) });
  });
  await page.locator(block("import-apply")).first().click();
  const REFUSED = `${block("import-decision")} [data-import-alert]:has-text("can only be updated from a file by a role that can see phone numbers")`;
  await page.waitForSelector(REFUSED, { timeout: 60_000 }).catch(() => null);
  await page.unroute(pattern).catch(() => {});
  const said = await textOf(page, REFUSED);
  ok(`c8c-masked-exception · ${C8C} · the forged start carried ONE exception under KEEP`, forged);
  ok(`c8c-masked-exception · ${C8C} · refused in its own words: the file was checked again and nothing was imported`,
    said.length > 0 && (await count(page, block("import-apply"))) === 1 && (await count(page, block("import-commit"))) === 0
      && (await count(page, "[data-import-nothing-written]")) === 1, said.slice(0, 200));
  await shoot(page, dir, "1-refused", REFUSED, "Check before importing", block("import-decision"));
  await page.locator(`${block("import-decision")} [data-import-act="discard"]`).first().click();
  await confirmTop(page);
  await page.waitForSelector(block("import-entrance"), { timeout: 30_000 });
  summary.flows.push({ flow: "c8c-masked-exception", forged, said });
  await closeDialog(page);
});

// ── #12f · the failures list's "Show more", and "Show the contacts this import added" ──
await c8cFlow("the failures page's Show more, and Show the contacts this import added", "c8c-failures-and-added", "GROWTH", "+255700003115", WIDE, async (page, dir) => {
  const ADDED = 5;
  const FAILED = 120;
  const landlines = Array.from({ length: FAILED }, (_, i) => {
    const rest = String(2_110_000 + i);
    return `022 ${rest.slice(0, 3)} ${rest.slice(3)},Ofisi ${lettersOf(i)}`;
  });
  const csv = freshCsv("0763", ADDED, 0) + landlines.join(CRLF) + CRLF;
  await openContacts(page);
  await openImport(page);
  await importBuffer(page, "failures-and-added.csv", csv);
  await page.locator(block("import-apply")).first().click();
  if ((await page.waitForSelector(CONFIRM, { timeout: 1_500 }).catch(() => null)) !== null) await confirmTop(page);
  await page.waitForSelector(block("import-done"), { timeout: 120_000 });
  await wait(500);
  const result = await tilesIn(page, block("import-done"));
  ok(`c8c-failures-and-added · ${C8C} · the result: ${ADDED} added, ${FAILED} couldn't be imported`, result.create === ADDED && result.fail === FAILED, JSON.stringify(result));
  const ROWS = "[data-import-failures] tr[data-import-row]";
  const MORE = '[data-import-act="failures-more"]';
  const page1 = await waitForCount(page, ROWS, 50);
  ok(`c8c-failures-and-added · ${C8C} · the failures list shows its first page of 50, with Show more`, page1 && (await count(page, MORE)) === 1, `${await count(page, ROWS)} rows`);
  await shoot(page, dir, "1-failures-first-page", "[data-import-failures]", "Import finished", "[data-import-failures]");
  await page.locator(MORE).first().click();
  const page2 = await waitForCount(page, ROWS, 100);
  ok(`c8c-failures-and-added · ${C8C} · Show more adds the next 50, in file order, none twice`, page2 && (await count(page, MORE)) === 1, `${await count(page, ROWS)} rows`);
  await page.locator(MORE).first().click();
  const page3 = await waitForCount(page, ROWS, FAILED);
  const lines = await page.$$eval(ROWS, (els) => els.map((e) => Number(e.getAttribute("data-import-row"))));
  const ordered = lines.every((l, i) => i === 0 || l > lines[i - 1]);
  ok(`c8c-failures-and-added · ${C8C} · the last page ends the list: all ${FAILED} rows, ascending, and Show more is gone`,
    page3 && ordered && new Set(lines).size === FAILED && (await count(page, MORE)) === 0
      && (await textOf(page, "[data-import-failures]")).includes(`Showing ${FAILED} of ${FAILED}`), `${lines.length} rows`);
  await shoot(page, dir, "2-failures-all", "[data-import-failures]", "Import finished", "[data-import-failures]");
  ok(`c8c-failures-and-added · ${C8C} · "Show the contacts this import added" is offered`, (await count(page, '[data-import-act="show-added"]')) === 1);
  await page.locator('[data-import-act="show-added"]').first().click();
  await page.waitForURL((u) => u.searchParams.has("import"), { timeout: 30_000 }).catch(() => null);
  await page.waitForSelector(DIALOG, { state: "detached", timeout: 10_000 }).catch(() => null);
  await page.waitForSelector('[data-rail-group="import"]', { timeout: 30_000 }).catch(() => null);
  await wait(500);
  const shownRows = await count(page, "tr[data-contact-row]");
  ok(`c8c-failures-and-added · ${C8C} · the book opens filtered to this import — its pill, and exactly the ${ADDED} contacts it added`,
    new URL(page.url()).searchParams.has("import") && (await count(page, '[data-rail-group="import"]')) === 1 && shownRows === ADDED,
    `${page.url()} · ${shownRows} rows`);
  await shoot(page, dir, "3-book-filtered", '[data-rail-group="import"]', null);
  summary.flows.push({ flow: "c8c-failures-and-added", result, shownRows });
});

/* ═══ THE SUMMARY ═══════════════════════════════════════════════════════════════════════════════════════════ */

summary.pass = pass;
summary.fail = fail;
writeFileSync(join(OUT, "summary.json"), JSON.stringify(summary, null, 2) + LF);
await browser.close();
console.log(`${LF}contacts-import-drive: ${pass} passed, ${fail} failed · summary in ${join(OUT, "summary.json")}`);
process.exit(fail === 0 ? 0 : 1);
