/**
 * THE IMPORTER'S TEST WORLD — the memory twin emptied around each run and put back after it, and the files the `check`
 * and `commit` sections of `test:contacts-import` stage. (S15, 2026-10-09 · `scripts/contacts-import/{check,commit}.mts`)
 *
 * ⭐ WHY A SHARED MODULE. Both sections drive the REAL services over the REAL memory twin — staging (U29b), the check and
 * the commit (S15) — on the same files: a 40-row file with at least one row in each of the check's five boxes, a
 * deterministic 5,000-row file whose counts are built into it, and a 30-row file whose every row is a change. The runner
 * forbids any module under `scripts/contacts-import/` that is not a section ("helpers shared by sections belong in
 * scripts/lib/"), so the world lives here and each section asserts its own facts about it.
 *
 * ⛔ THE MEMORY TWIN, BEFORE ANYTHING BINDS TO A DATABASE (operator-error.test.mts' convention): these sections WRITE
 * staged runs, book rows, stops and ledger rows. The environment is set BEFORE the store is loaded — every module that
 * reaches the store is imported DYNAMICALLY below, after it — and `onMemoryTwin()` lets a section refuse to run if a
 * database is reachable anyway.
 * ⛔ IN-PROCESS: this module makes no file-writing call, comments included — `test:red-anchors` counts the runner's red
 * proof as in-process only while that holds.
 */
process.env.USE_PRISMA_DAL = "false";
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;

import type { StoredContactImport, StoredContactImportRow, StoredMarketingContact, StoredUser } from "../../src/lib/server/store.ts";
import type { audit as auditFn } from "../../src/lib/server/audit.ts";
import type { ImportStagingDeps } from "../../src/lib/server/contacts/import-staging.ts";
import { parseTzNumber } from "../../src/lib/tz-msisdn.ts";
import { ERASURE_EVIDENCE } from "../../src/lib/marketing/erasure-mark.ts";

const prismaModule = await import("../../src/lib/server/prisma.ts");
const storeModule = await import("../../src/lib/server/store.ts");
export const staging = await import("../../src/lib/server/contacts/import-staging.ts");
export const checkModule = await import("../../src/lib/server/contacts/import-check.ts");
export const commitModule = await import("../../src/lib/server/contacts/import-commit.ts");
export const db = storeModule.db;

/** True only when this process is on the memory twin — a section refuses to write anything otherwise. */
export const onMemoryTwin = (): boolean => !prismaModule.hasDatabase();

/* ═══ THE OFFICERS, THE CLOCK, THE AUDIT CAPTURE ═══════════════════════════════════════════════════════════════ */

/** Two GROWTH officers (identity.contact masked — S15-10: they import with KEEP alone), one COMPLIANCE officer (a READER:
 *  identity.contact read, so they may update contacts already in the book from a file, and drive only their own runs)
 *  and one ADMIN (read; may drive any run — X18). */
export const OFFICER = "usr_imp_officer";
export const OTHER = "usr_imp_other";
export const READER = "usr_imp_reader";
export const ADMIN = "usr_imp_admin";
export const NOW = new Date("2026-10-09T09:00:00.000Z");

/** ⭐ Every audit row a run writes is CAPTURED here instead of joining the chain. */
export const captured: Array<Record<string, unknown>> = [];
export const captureAudit = (async (entry: unknown) => {
  captured.push(entry as Record<string, unknown>);
  return { recorded: true } as never;
}) as unknown as typeof auditFn;

export const STAGING_DEPS: ImportStagingDeps = { ...staging.IMPORT_STAGING_DEPS, audit: captureAudit, now: () => NOW };

/* ═══ THE FRESH STORE ══════════════════════════════════════════════════════════════════════════════════════════ */

type AnyMap = Map<unknown, unknown>;
type Mem = Record<string, AnyMap> & { contactImportRows: Map<string, Map<number, StoredContactImportRow>> };
const FLAT = [
  "contactImports", "marketingContacts", "contactsByMsisdn", "messagingConsents", "suppressions", "users", "usersByPhone",
  "contactLists", "contactListMembers", "contactListBases",
] as const;

/** The memory twin's maps — reached ONLY to empty them before a run and put them back after it, and to count. */
export function mem(): Mem {
  const m = (globalThis as unknown as { __50PICK_STORE?: Mem }).__50PICK_STORE;
  if (!m || !(m.contactImports instanceof Map) || !(m.contactImportRows instanceof Map)) {
    throw new Error("the memory store is not loaded with its staging maps — these sections run on the memory twin only");
  }
  return m;
}

function makeUser(id: string, phoneE164: string, role: StoredUser["role"], displayName: string | null = null): StoredUser {
  const at = "2026-01-01T08:00:00.000Z";
  return {
    id, phoneE164, email: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE",
    locale: "EN", displayName, dob: "1990-01-01", region: null, acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false,
    twoFactorEnabled: role !== "PLAYER", avatarDataUrl: null, emailVerifiedAt: null, createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null,
  } as StoredUser;
}

/** Runs `fn` on EMPTY staging, book, ledger, stop-list, user and list maps — the four officers seeded — and puts every
 *  map back afterwards, whatever `fn` did or threw. The audit capture starts empty. */
export async function inFreshStore<T>(fn: () => Promise<T>): Promise<T> {
  if (!onMemoryTwin()) throw new Error("a database is reachable — the import sections write and run on the memory twin only");
  const m = mem();
  const flat = FLAT.map((k) => new Map(m[k] ?? new Map()));
  const rows = new Map([...m.contactImportRows].map(([k, inner]) => [k, new Map(inner)]));
  for (const k of FLAT) m[k]?.clear();
  m.contactImportRows.clear();
  captured.length = 0;
  try {
    await db.user.create(makeUser(OFFICER, "+255754900101", "GROWTH", "Amina Officer"));
    await db.user.create(makeUser(OTHER, "+255754900102", "GROWTH", "Baraka Officer"));
    await db.user.create(makeUser(READER, "+255754900104", "COMPLIANCE", "Rehema Reader"));
    await db.user.create(makeUser(ADMIN, "+255754900103", "ADMIN", "Owner"));
    return await fn();
  } finally {
    FLAT.forEach((k, i) => {
      const target = m[k];
      if (!target) return;
      target.clear();
      for (const [key, v] of flat[i]) target.set(key, v);
    });
    m.contactImportRows.clear();
    for (const [k, inner] of rows) m.contactImportRows.set(k, inner);
  }
}

/** How many rows the ledger and the stop list hold — an import must change neither. */
export const truthCounts = (): { ledger: number; stops: number } => ({ ledger: mem().messagingConsents.size, stops: mem().suppressions.size });

/* ═══ NUMBERS, BOOK ROWS, STOPS, LEDGER WORDS, PLAYERS ═════════════════════════════════════════════════════════ */

/** ⛔ Every fixture number goes through the real parser — one that does not parse is a broken fixture. */
export function keyOf(local: string): string {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn) throw new Error(`import fixture ${local} does not parse`);
  return p.msisdn;
}

export function bookRow(id: string, local: string, o: Partial<StoredMarketingContact> = {}): StoredMarketingContact {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn || !p.ndc) throw new Error(`import fixture ${local} does not parse`);
  return {
    id, msisdn: p.msisdn, rawInput: local, displayName: null, email: null, ndc: p.ndc, operator: null, source: "OPERATOR",
    sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null, importId: null,
    createdAt: "2026-09-01T08:00:00.000Z", createdBy: null, updatedAt: "2026-09-01T08:00:00.000Z", updatedBy: null, ...o,
  };
}

export async function seedBook(row: StoredMarketingContact): Promise<void> {
  if ((await db.marketingContact.create(row)) === null) throw new Error("import fixture: the book refused a seed row");
}

export async function seedStop(msisdn: string, id: string, lifted = false): Promise<void> {
  await db.suppression.create({
    id, channel: "SMS", identifier: msisdn, category: "MARKETING", reason: "WITHDRAWN", evidence: "fixture", recordedBy: null,
    createdAt: "2026-09-02T08:00:00.000Z", liftedAt: lifted ? "2026-09-03T08:00:00.000Z" : null, liftedReason: lifted ? "fixture" : null,
  });
}

export async function seedWord(msisdn: string, id: string, status: "GIVEN" | "WITHDRAWN", evidence: string | null = "fixture"): Promise<void> {
  await db.messagingConsent.create({
    id, channel: "SMS", identifier: msisdn, category: "MARKETING", status, source: "OPERATOR", wording: "fixture wording",
    locale: "EN", evidence, recordedBy: null, createdAt: "2026-09-02T08:00:00.000Z",
  });
}

/** A PLAYER — the account, and (every client is a contact) its REGISTRATION book row, linked. */
export async function seedPlayer(local: string, userId: string, contactId: string, name: string): Promise<void> {
  await db.user.create(makeUser(userId, `+${keyOf(local)}`, "PLAYER", name));
  await seedBook(bookRow(contactId, local, { source: "REGISTRATION", sourceRef: userId, userId, displayName: name }));
}

/** A PLAYER's account and NO book row — the person an erasure is run for in R9's race (`eraseMarketingFor`). */
export async function seedAccount(local: string, userId: string, name: string): Promise<StoredUser> {
  const user = makeUser(userId, `+${keyOf(local)}`, "PLAYER", name);
  await db.user.create(user);
  return user;
}

/* ═══ STAGING A FILE ═══════════════════════════════════════════════════════════════════════════════════════════ */

export const HEADERS = ["Phone", "Name", "Email", "Tags", "Notes"];
export const MAPPING = { phone: 0, name: 1, email: 2, tags: 3, notes: 4 };
/** A sha-256 as the browser writes it — letters only, so no answer carrying it can hold a digit run. */
export const DIGEST = "a".repeat(64);

export type StageRow = { line: number; cells: string[] } | { line: number; readError: string };
const cellsOf = (line: number, phone: string, name = "", email = "", tags = "", notes = ""): StageRow => ({ line, cells: [phone, name, email, tags, notes] });

/** Opens a run for `rows` and stages every one through the REAL service (batches of 1,000) — the run is STAGED after.
 *  `stopShort` leaves the last batch unstaged, so the run is still STAGING. */
export async function stageFile(officerId: string, rows: readonly StageRow[], stopShort = false): Promise<string> {
  const unreadable = rows.filter((r) => "readError" in r).length;
  const opened = await staging.openContactImport(officerId, {
    format: "csv", fileName: "fixture.csv", fileDigest: DIGEST, headers: HEADERS, mapping: MAPPING, totalRows: rows.length, unreadable,
  }, STAGING_DEPS);
  if (!opened.ok) throw new Error(`import fixture: open refused (${opened.reason})`);
  const id = opened.view.id;
  let from = 1;
  for (let i = 0; i < rows.length; i += 1000) {
    const batch = rows.slice(i, i + 1000);
    if (stopShort && i + 1000 >= rows.length) break;
    const r = await staging.stageContactRows(officerId, { importId: id, fileDigest: DIGEST, from, rows: batch }, STAGING_DEPS);
    if (!r.ok) throw new Error(`import fixture: stage refused (${r.reason})`);
    from += batch.length;
  }
  return id;
}

export async function runOf(id: string): Promise<StoredContactImport> {
  const run = await db.contactImport.find(id);
  if (run === null) throw new Error("import fixture: the run is gone");
  return run;
}

/** Every staged row of a run, by the keyset. */
export async function stagedRows(importId: string): Promise<StoredContactImportRow[]> {
  const out: StoredContactImportRow[] = [];
  let after = 0;
  for (;;) {
    const page = await db.contactImportRow.after({ importId, afterOrdinal: after, limit: 2000 });
    if (page.length === 0) return out;
    out.push(...page);
    after = page[page.length - 1].ordinal;
  }
}

/* ═══ THE 40-ROW FILE — at least one row in every box, its counts known ═════════════════════════════════════════ */

/** New numbers on 0757 100 0NN, book numbers on 0757 200 0NN — ranges no other fixture uses. */
export const N = (k: number): string => `07571000${String(k).padStart(2, "0")}`;
export const B = (k: number): string => `07572000${String(k).padStart(2, "0")}`;
export const UNREADABLE_SENTENCE = "This card was cut off before its end.";
export const UNREADABLE_SENTENCE_2 = "This record could not be read.";

/**
 * Lines 2–41 (line 1 is the header): 22 NEW (one of them — line 40 — on a number whose first row, line 39, is invalid),
 * 6 IN THE BOOK (B1 differs from the file, B2 lacks the file's email, B3 is stopped, B4 is erased, B5 is a player's —
 * linked to the account, its file row a DIFFERENT name and an email the book lacks, so only S15-11 keeps it unchanged —
 * B6 is identical), 3 REPEATED (line 8 repeats 2, line 17 repeats 3, line 28 repeats 16), 7 INVALID (a bad email, too
 * short, the sample sheet's number, a landline, a Kenyan number, no number, a name holding a phone number) and 2
 * UNREADABLE.
 */
export function fortyRows(): StageRow[] {
  return [
    cellsOf(2, N(1), "Neema Mushi"),
    cellsOf(3, B(1), "Asha Mwakalinga", "asha.m@example.com"),
    cellsOf(4, N(2), "Baraka"),
    cellsOf(5, N(3), "Bad Email", "not-an-email"),
    cellsOf(6, B(2), "Bahati", "bahati@example.com"),
    cellsOf(7, N(4), "Chiku"),
    cellsOf(8, N(1), "Neema M."),
    { line: 9, readError: UNREADABLE_SENTENCE },
    cellsOf(10, B(3), "Chausiku New"),
    cellsOf(11, "12345", "Short"),
    cellsOf(12, N(5), "Daudi"),
    cellsOf(13, B(4), "Eva Peter"),
    cellsOf(14, "0745 100 200", "Sample Row"),
    cellsOf(15, B(5), "Juma Imported", "juma.file@example.com"),
    cellsOf(16, N(6), "Faraja"),
    cellsOf(17, B(1), "Asha Again"),
    cellsOf(18, "022 211 0000", "Office"),
    cellsOf(19, B(6), "Same Name"),
    cellsOf(20, N(7), "Gift"),
    cellsOf(21, "+254 712 345 678", "Kenya"),
    cellsOf(22, N(8), "Halima"),
    { line: 23, readError: UNREADABLE_SENTENCE_2 },
    cellsOf(24, N(9), "Imani"),
    cellsOf(25, "", "No Number"),
    cellsOf(26, N(10), "Jabari"),
    cellsOf(27, N(11), "Kesi"),
    cellsOf(28, N(6), "Faraja Again"),
    ...Array.from({ length: 10 }, (_, k) => cellsOf(29 + k, N(12 + k), `Contact ${12 + k}`)),
    cellsOf(39, N(99), "Call 0712 345 678"),
    cellsOf(40, N(99), "Mosi"),
    cellsOf(41, N(22), "Nuru"),
  ];
}

/** The book behind the 40-row file — and three facts about NEW numbers: N1 said yes once (a ledger word), N4 is on the
 *  stop list (a new number on it is still created — owner decision 5), N2's stop was lifted (it refuses nobody). */
export async function seedFortyWorld(): Promise<void> {
  await seedBook(bookRow("mc_w_b1", B(1), { displayName: "Asha", email: "asha@example.com", tags: ["vip"] }));
  await seedBook(bookRow("mc_w_b2", B(2), { displayName: "Bahati" }));
  await seedBook(bookRow("mc_w_b3", B(3), { displayName: "Chausiku" }));
  await seedStop(keyOf(B(3)), "sup_w_b3");
  await seedBook(bookRow("mc_w_b4", B(4), { source: "IMPORT", sourceRef: ERASURE_EVIDENCE }));
  await seedWord(keyOf(B(4)), "led_w_b4a", "GIVEN");
  await seedWord(keyOf(B(4)), "led_w_b4b", "WITHDRAWN", ERASURE_EVIDENCE);
  await seedPlayer(B(5), "usr_w_player", "mc_w_b5", "Juma Said");
  await seedBook(bookRow("mc_w_b6", B(6), { displayName: "Same Name" }));
  await seedWord(keyOf(N(1)), "led_w_n1", "GIVEN");
  await seedStop(keyOf(N(4)), "sup_w_n4");
  await seedStop(keyOf(N(2)), "sup_w_n2", true);
}

/* ═══ THE 5,000-ROW FILE — deterministic, its counts built in ════════════════════════════════════════════════════ */

const pad6 = (i: number): string => String(i).padStart(6, "0");

/**
 * Row i (0–4,999) is on line i + 2, by i mod 10: 0–5 a NEW number (0758 0…); 6 a REPEAT — of the row six back below
 * i = 2,500, of the row 2,006 back above it (another staged page); 7 a number IN THE BOOK below i = 2,500 (0759 0…, its
 * file name the book's when i mod 20 is 7, another when it is 17) and above it a REPEAT of the row 2,000 back, with a
 * name of its own; 8 an INVALID row (a bad email); 9 an UNREADABLE record.
 * ⭐ So: 3,000 new · 250 in the book · 750 repeated · 500 invalid · 500 unreadable; 125 in-book rows that change (under
 * TAKE_FILE only), each 20 rows apart.
 */
export function numberOfRow(i: number): string {
  const r = i % 10;
  if (r === 6) return numberOfRow(i < 2500 ? i - 6 : i - 2006);
  if (r === 7) return i < 2500 ? `0759${pad6(i)}` : numberOfRow(i - 2000);
  return `0758${pad6(i)}`;
}
export function fiveThousandRows(): StageRow[] {
  return Array.from({ length: 5000 }, (_, i): StageRow => {
    const line = i + 2;
    const r = i % 10;
    if (r === 9) return { line, readError: UNREADABLE_SENTENCE_2 };
    if (r === 8) return cellsOf(line, numberOfRow(i), `Bad ${i}`, "bad-email");
    if (r === 7) return cellsOf(line, numberOfRow(i), i >= 2500 ? `Repeat ${i}` : i % 20 === 7 ? `Book ${i}` : `File ${i}`);
    if (r === 6) return cellsOf(line, numberOfRow(i), `Again ${i}`);
    return cellsOf(line, numberOfRow(i), `New ${i}`);
  });
}
export const FIVE_THOUSAND_COUNTS = { new: 3000, inBook: 250, repeated: 750, invalid: 500, unreadable: 500 } as const;
/** The lines of the 125 in-book rows whose file name differs from the book's. */
export const FIVE_THOUSAND_CHANGING_LINES: readonly number[] = Array.from({ length: 125 }, (_, k) => 17 + 20 * k + 2);
export async function seedFiveThousandBook(): Promise<void> {
  for (let i = 7; i < 2500; i += 10) await seedBook(bookRow(`mc_k_${i}`, numberOfRow(i), { displayName: `Book ${i}` }));
}

/* ═══ THE 30-ROW FILE — every row a change ════════════════════════════════════════════════════════════════════════ */

export const thirtyNumber = (i: number): string => `0756${pad6(i)}`;
export function thirtyRows(): StageRow[] {
  return Array.from({ length: 30 }, (_, i) => cellsOf(i + 2, thirtyNumber(i), `New ${i}`));
}
export async function seedThirtyBook(): Promise<void> {
  for (let i = 0; i < 30; i++) await seedBook(bookRow(`mc_t_${i}`, thirtyNumber(i), { displayName: `Old ${i}` }));
}

/* ═══ SMALL READERS ════════════════════════════════════════════════════════════════════════════════════════════ */

/** A run of seven or more digits — what a whole phone number (or most of one) looks like in an answer. */
export const holdsDigitRun = (text: string): boolean => /[0-9]{7,}/.test(text);
/** The masked shape `maskPhone` prints: +255, four bullets, two digits. */
export const isMasked = (text: string): boolean => /^[+]255•{4}[0-9]{2}$/.test(text);
