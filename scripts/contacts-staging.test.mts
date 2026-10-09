/**
 * test:contacts-staging — U29b's guard: the ONE staging model, DRIVEN (decisions X2 · X18 · X19 · X20 · X23 · X28 · X29;
 * the plan's OD26 · OD29 · OD30).
 *
 * ⭐ DRIVEN, NOT READ: the REAL service (`src/lib/server/contacts/import-staging.ts`) over the REAL memory twin, its
 * erasure, access-export and sweep arms, and the pure packer (`src/lib/contacts/import-limits.ts`):
 *   O1–O6  open — a run, every refusal writing nothing, the same digest adopting, another file refused, a file read
 *          differently refused, ownership (X18), two tabs converging on one run;
 *   T1–T8  stage — the key derived on the server, a field over its limit REPORTED (never clipped), each unreadable record
 *          staged, both caps, the order, two tabs on one batch, STAGED;
 *   A1–A3  ⭐ the Accept, executed: a closed tab or a reload resumes at stagedThrough + 1 with totals equal to a recount;
 *          a 40-row file is one open plus one stage call; staging 5,000 rows writes no contact;
 *   D1–D3  the primitives the commit will lean on: the keyset across an erased row, the status compare-and-set, discard;
 *   P1–P3  the privacy arms: erasure by every number, the access export bounded to the account, the sweep (X29);
 *   L1–L3  the limits and the packer; S1–S3 what only the source can show.
 * The redeploy half of the Accept — a fresh process on real Postgres — is `test:contacts-staging-db`.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY — a swapped dependency of the service, or one
 * member of the memory twin wrapped for one case and put back in a `finally` — and requires the MATCHING assertion to
 * fail. This file makes no file-modifying call. Each check runs on emptied staging, book, ledger, stop-list and user maps,
 * copied before and put back after.
 *
 * Run:  npm run test:contacts-staging
 * Red:  npm run red:contacts-staging
 */
process.exitCode = 1;

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import type {
  ContactImportRowWindow, ContactImportStageBatch, ContactImportStageResult, ContactImportStatus, StoredContactImport,
  StoredContactImportRow, StoredMarketingContact, StoredUser,
} from "../src/lib/server/store.ts";
import {
  openContactImport, stageContactRows, contactImportView, discardContactImport, sweepStaleContactImports, stagedRowFrom,
  IMPORT_STAGING_DEPS, STAGING_SENTENCES,
} from "../src/lib/server/contacts/import-staging.ts";
import type { ImportStagingDeps, StageContactRowsResult } from "../src/lib/server/contacts/import-staging.ts";
import { refusalAuditGate } from "../src/lib/server/contacts/refusal-audit.ts";
import {
  IMPORT_MAX_ROWS, STAGE_BATCH_BODY_MARGIN, STAGE_BATCH_MAX_BYTES, STAGE_BATCH_MAX_ROWS, STAGE_ROW_TOO_LARGE,
  packStageBatches, stageBatchBytes, stageFigures, stageRowFor, stageRowsOf, utf8Length,
} from "../src/lib/contacts/import-limits.ts";
import type { StageRowInput } from "../src/lib/contacts/import-limits.ts";
import { NEXT_ACTION_BODY_LIMIT_BYTES, XLSX_MAX_ROWS } from "../src/lib/contacts/xlsx-limits.ts";
import type { ParsedContactsFile } from "../src/lib/contacts/parsed-file.ts";
import { eraseMarketingFor } from "../src/lib/server/marketing/erase.ts";
import { marketingDsarView } from "../src/lib/server/marketing/dsar.ts";
import { parseTzNumber } from "../src/lib/tz-msisdn.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8")).replace(/\r\n/g, "\n");
const rawRead = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

type Sources = { service: string; serviceRaw: string; limits: string; cgs: string; pkg: string; retention: string; dal: string };
const SRC: Sources = {
  service: read("src/lib/server/contacts/import-staging.ts"),
  serviceRaw: rawRead("src/lib/server/contacts/import-staging.ts"),
  limits: read("src/lib/contacts/import-limits.ts"),
  cgs: rawRead("scripts/client-graph-safe.test.mjs"),
  pkg: rawRead("package.json"),
  retention: read("src/lib/server/retention.ts"),
  dal: read("src/lib/server/prisma-dal.ts"),
};

/* ═══ THE IMPLEMENTATION UNDER TEST — swappable, so a red case can plant one piece ═══════════════════════════════ */

/** ⭐ Every audit row a check writes is CAPTURED here instead of joining the chain. */
const captured: Array<Record<string, unknown>> = [];
const captureAudit = (async (entry: unknown) => {
  captured.push(entry as Record<string, unknown>);
  return { recorded: true } as never;
}) as unknown as ImportStagingDeps["audit"];

const OFFICER = "usr_stage_officer";
const OTHER = "usr_stage_other";
const ADMIN = "usr_stage_admin";
const NOW = new Date("2026-10-02T09:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();
/** ⭐ C8c · #14a · the refusal-audit gate on the suite's FIXED clock — reset by every fresh store, so no check's refusal row
 *  is kept out by another check's (production's gate is one per process, on the wall clock). */
const TEST_REFUSAL_AUDIT = refusalAuditGate(() => NOW.getTime());
const TEST_DEPS: ImportStagingDeps = { ...IMPORT_STAGING_DEPS, audit: captureAudit, refusalAudit: TEST_REFUSAL_AUDIT, now: () => NOW };

type Impl = { deps: ImportStagingDeps };
const REAL: Impl = { deps: TEST_DEPS };

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
/** One assertion whose evidence is computed by `fn` — a throw is a FAIL of that assertion, never a crashed run. */
async function check(label: string, fn: () => Promise<[boolean, string?]> | [boolean, string?]): Promise<void> {
  try {
    const [c, x] = await fn();
    ok(label, c, x ?? "");
  } catch (err) {
    ok(label, false, `threw: ${(err as Error)?.message ?? String(err)}`);
  }
}

/* ═══ THE FRESH STORE — the maps a check touches, emptied before and put back after ══════════════════════════════ */

type Mem = {
  contactImports: Map<string, StoredContactImport>;
  contactImportRows: Map<string, Map<number, StoredContactImportRow>>;
  marketingContacts: Map<string, unknown>;
  contactsByMsisdn: Map<string, unknown>;
  messagingConsents: Map<string, unknown>;
  suppressions: Map<string, unknown>;
  users: Map<string, unknown>;
  usersByPhone: Map<string, unknown>;
  contactLists: Map<string, unknown>;
  contactListMembers: Map<string, unknown>;
};
const memory = (globalThis as unknown as { __50PICK_STORE?: Mem }).__50PICK_STORE;
const FLAT = [
  "contactImports", "marketingContacts", "contactsByMsisdn", "messagingConsents", "suppressions", "users", "usersByPhone",
  "contactLists", "contactListMembers",
] as const;
function mem(): Mem {
  if (!memory || !(memory.contactImports instanceof Map) || !(memory.contactImportRows instanceof Map)) {
    throw new Error("the memory store is not loaded with its staging maps — this suite runs on the memory twin only");
  }
  return memory;
}

function makeUser(id: string, phoneE164: string, role: StoredUser["role"], createdAt = "2026-01-01T08:00:00.000Z"): StoredUser {
  return {
    id, phoneE164, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE",
    locale: "EN", displayName: null, dob: "1990-01-01", region: null, acceptedTermsVersion: "v1", acceptedTermsAt: createdAt,
    marketingOptIn: false, twoFactorEnabled: role !== "PLAYER", avatarDataUrl: null, createdAt, updatedAt: createdAt,
    lastLoginAt: createdAt, closedAt: null,
  } as StoredUser;
}

async function inFreshStore(fn: () => Promise<void>): Promise<void> {
  const m = mem();
  const flat = FLAT.map((k) => new Map(m[k] as Map<string, unknown>));
  const rows = new Map([...m.contactImportRows].map(([k, inner]) => [k, new Map(inner)]));
  for (const k of FLAT) (m[k] as Map<string, unknown>).clear();
  m.contactImportRows.clear();
  captured.length = 0;
  TEST_REFUSAL_AUDIT.reset();
  try {
    await db.user.create(makeUser(OFFICER, "+255754900001", "GROWTH"));
    await db.user.create(makeUser(OTHER, "+255754900002", "GROWTH"));
    await db.user.create(makeUser(ADMIN, "+255754900003", "ADMIN"));
    await fn();
  } finally {
    FLAT.forEach((k, i) => {
      const target = m[k] as Map<string, unknown>;
      target.clear();
      for (const [key, v] of flat[i]) target.set(key, v);
    });
    m.contactImportRows.clear();
    for (const [k, inner] of rows) m.contactImportRows.set(k, inner);
  }
}

/* ═══ FIXTURES ════════════════════════════════════════════════════════════════════════════════════════════════════ */

const HEADERS = ["Phone", "Name", "Email", "Tags", "Notes"];
const MAPPING = { phone: 0, name: 1, email: 2, tags: 3, notes: 4 };
const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
/** 0713500000, 0713500001 … — a sendable range no other fixture here uses. */
const numberOf = (i: number) => `07135${String(i).padStart(5, "0")}`;
const keyOf = (local: string): string => {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn) throw new Error(`fixture ${local} does not parse`);
  return p.msisdn;
};
const cellsRow = (line: number, phone: string, name = "", email = "", tags = "", notes = ""): StageRowInput =>
  ({ line, cells: [phone, name, email, tags, notes] });
const rowsFrom = (firstLine: number, n: number, start = 0): StageRowInput[] =>
  Array.from({ length: n }, (_, k) => cellsRow(firstLine + k, numberOf(start + k), `Contact ${start + k}`));
const openBody = (o: Record<string, unknown> = {}): Record<string, unknown> => ({
  format: "csv", fileName: "list.csv", fileDigest: DIGEST_A, headers: HEADERS, mapping: MAPPING, totalRows: 10, unreadable: 0, ...o,
});
const stageBody = (importId: string, from: number, rows: readonly unknown[], fileDigest = DIGEST_A): Record<string, unknown> =>
  ({ importId, fileDigest, from, rows });
function bookRow(id: string, local: string, o: Partial<StoredMarketingContact> = {}): StoredMarketingContact {
  const p = parseTzNumber(local);
  if (p.verdict !== "ok" || !p.msisdn || !p.ndc) throw new Error(`fixture ${local} does not parse`);
  return {
    id, msisdn: p.msisdn, rawInput: local, displayName: null, email: null, ndc: p.ndc, operator: null, source: "IMPORT",
    sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null, importId: null,
    createdAt: "2026-09-01T08:00:00.000Z", createdBy: null, updatedAt: "2026-09-01T08:00:00.000Z", updatedBy: null, ...o,
  };
}
/** Every staged row of a run, walked by the keyset in pages of `page` — the recount the totals must equal. */
async function recount(importId: string, page = 7): Promise<StoredContactImportRow[]> {
  const out: StoredContactImportRow[] = [];
  let after = 0;
  for (;;) {
    const rows = await db.contactImportRow.after({ importId, afterOrdinal: after, limit: page });
    if (rows.length === 0) return out;
    out.push(...rows);
    after = rows[rows.length - 1].ordinal;
  }
}
const reasonOf = (r: { ok: boolean } & Record<string, unknown>): string => (r.ok ? "ok" : String(r.reason));

/* ═══ THE LABELS, ONCE — the assertions and the red cases both read them ══════════════════════════════════════════ */

const L = {
  s0: "S0 · CONTROL · the memory twin carries both staging maps, a fixture number parses, and the three officers exist (two GROWTH, one ADMIN) in an empty staging store",
  o1: "O1 · open creates a STAGING run — an id ci_ and twenty letters, both cursors 0, nextFrom 1, the browser's two figures kept, U28's mapping stored, the officer its creator — and ONE contacts.import.opened audit row naming no file and no number",
  o2: "O2 · every open refusal writes NOTHING and says why: 200,001 rows is too_many_rows (naming 200,000 and splitting), 0 is empty_file, a short digest bad_digest, more unreadable than rows bad_counts, no phone mapped no_phone_column (U28's own sentence), an .xls bad_format — each audited as stage_refused",
  o3: "O3 · ⭐ THE SAME DIGEST ADOPTS: the same officer opening the same file again gets the SAME run (adopted, nextFrom where staging left off, still one run) — and a different file is refused unfinished_run carrying the open run's server figures",
  o4: "O4 · the same file read differently (another row count) is refused read_differently, never adopted onto misaligned ordinals",
  o5: "O5 · X18 · another officer opening the same file gets a run of their OWN; a non-admin cannot see, stage or discard the first officer's run (not_yours, shown nothing) — and an ADMIN can view and stage it, the view naming who started it",
  o6: "O6 · two tabs opening one file AT ONCE end on ONE run: both answers carry the same id, one adopted, and the officer holds one open run",
  t1: "T1 · ⭐ THE SERVER DERIVES THE KEY: 0712 345 678 stages as 255712345678 whatever msisdn, verdict or outcome the row carried; a 064 number and an empty phone keep no key; every row lands unsettled",
  t2: "T2 · ⛔ A FIELD OVER ITS LIMIT IS REPORTED, NEVER CLIPPED (X20): a 1,001-character note is stored whole with a notes problem naming the limit, and a malformed email is kept with an email problem that never quotes it",
  t3: "T3 · X19 · each unreadable record is staged as a row with its read error, counted unreadable by the server — and a reason carrying a number-like run of digits is withheld, never stored",
  t4: "T4 · ⛔ THE ROW CAP: 2,001 rows is batch_too_many_rows and stages nothing; the same 2,000 rows land",
  t5: "T5 · ⛔ THE BYTE CAP: three rows carrying 210 KiB of notes are batch_too_large and stage nothing — though far under the row cap",
  t6: "T6 · the order is the server's: a skipped batch is out_of_order (nextFrom said), a replay already_staged, a line that does not increase across or within a batch bad_rows, a batch past the file's total too_many_rows_for_run — each writing nothing",
  t7: "T7 · ⭐ TWO TABS, ONE BATCH: two stage calls for the same rows at once — exactly one lands, the other is already_staged, every row staged once and the cursor where one batch put it",
  t8: "T8 · the last batch moves the run to STAGED (nextFrom null, ONE contacts.import.staged audit row with the server's count); another file's digest is different_file; a later batch not_staging; another officer not_yours",
  a1: "A1 · ⭐ THE ACCEPT · a closed tab or a reload: after 2 of 4 batches a call with ONLY the officer id returns the run at stagedThrough 20, nextFrom 21 and totals.staged equal to the rows held; staging resumes there and finishes STAGED with every ordinal once, in file order, the totals equal to a recount over the keyset",
  a2: "A2 · ⭐ THE ACCEPT · a 40-row file is ONE open plus ONE stage call: stageRowsOf and packStageBatches give one batch, and the run is STAGED with 40 rows counted",
  a3: "A3 · ⭐ THE ACCEPT · staging 5,000 rows writes NO contact, no consent and no stop: the book, the ledger and the stop list are unchanged and nothing but contacts.import.* is audited",
  d1: "D1 · after() is a KEYSET: page 1 is ordinals 1,2; erasure deletes ordinal 2; after(2) is 3,4 and the tail 5 — no row skipped (an offset walk reads 4,5)",
  d2: "D2 · transition is a compare-and-set: STAGED→COMMITTING wins once and the second answers null; PAUSED records who and when, a resume clears both, DONE stamps finishedAt",
  d3: "D3 · discard: CANCELLED with finishedAt, its unsettled rows deleted and a settled row kept — and a run that has started committing is refused committing, its rows untouched",
  p1: "P1 · ⭐ ERASURE deletes the staged rows holding every number the person is known by — the account's and a linked row's, in every officer's run — keeps the strangers' rows, and reports the count",
  p2: "P2 · the ACCESS export carries the person's staged rows staged since the account's creation — number, name, email, tags, outcome, when — and no notes, no file name, no officer, no row key, nor a previous holder's row",
  p3: "P3 · ⭐ THE SWEEP (X29 · S15-12): idle 15 days, a STAGING and a STAGED run are CANCELLED with their unsettled rows deleted; a PAUSED and a COMMITTING run idle as long are CANCELLED too (the second rule) — the row a commit already settled KEPT, the unsettled ones deleted — and a PAUSED run idle 13 days is untouched; a fresh run is untouched; a run finished 91 days ago is purged with its rows, one finished 89 days ago kept; each cancel one expired row naming its period; a second pass does nothing",
  l1: "L1 · the limits: 2,000 rows and 200 KiB a batch, 5.12 times under Next's 1 MB action body; 200,000 records a run — xlsx-limits' constant itself (X28); 2,000 rows × the 12 columns staging writes, under Postgres' 65,535 bind parameters",
  l2: "L2 · packStageBatches over 150,000 synthetic records: every batch within both caps and filled greedily, the order kept, the concatenation the input itself — and stageBatchBytes measures exactly the UTF-8 that JSON.stringify writes",
  l3: "L3 · stageRowsOf interleaves the rows and the unreadable records by line and skips the header row; only the mapped cells cross the wire; a row too large for any batch is sent as unreadable — never cut",
  s1: "S1 · import-staging.ts carries no directive and exports no action (they ship with U30), imports nothing that sends or writes consent, and writes no book row, no ledger row, no stop and no list",
  s2: "S2 · import-limits.ts is pure — two constants from xlsx-limits.ts and types from contact-fields.ts and parsed-file.ts, nothing else — and pinned in client-graph-safe",
  s3: "S3 · the wiring: the suite and its red key in package.json, the suite on predeploy beside test:erasure, test:read-tiers and test:client-graph-safe (M10, each once); the Postgres probe keyed and kept OFF predeploy; the nightly retention pass runs the sweep",
  t9: "T9 · ⭐ ONE BAD BYTE CANNOT WEDGE A RUN (review F2): a NUL inside the phone, the email and a tag cell and a lone surrogate in the name are read out BEFORE drafting — the row stages with its server key and no NUL or broken character anywhere in it, where Postgres would refuse the whole batch for ever — and a line past the 32-bit integer is refused bad_rows, never sent to the database",
  t10: "T10 · the byte cap is MEASURED WITH A STOP (review F9): the measure equals stageBatchBytes on a real batch, and on twenty rows sharing ONE 1,000-cell array it stops after reading fewer cells than a single row holds — never building the whole batch as one string first",
  t11: "T11 · ⛔ A SUPERSEDED RUN IS REFUSED (review F4): an officer holding two open runs — the two-tab race on Postgres — cannot stage into the later one (superseded, with the EARLIEST run's view), and the earliest still stages",
  t12: "T12 · a forged run id never reaches the audit chain (review F1): a batch_too_large refusal for an id that is not a run id is audited with NO target and nothing number-shaped, and a cursor past the run cap is bad_request",
  o7: "O7 · the same file MAPPED differently is refused read_differently (review F3) — a resumed run never drafts its next rows through a mapping the officer did not choose — while the same mapping in another key order (JSONB's) is adopted",
  p4: "P4 · the access export reads a number's staged rows NEWEST first (review F5): two runs staging one number a day apart hand back the newer first, so older rows cannot crowd out the rows the export may show",
} as const;

/* ═══ THE ASSERTIONS ══════════════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  const deps = impl.deps;
  const fresh = (label: string, fn: () => Promise<[boolean, string?]>) => inFreshStore(() => check(p(label), fn));
  /** Open a run or throw — a fixture step, never the thing a check measures. */
  const open = async (officer: string, o: Record<string, unknown> = {}, d: ImportStagingDeps = deps): Promise<string> => {
    const r = await openContactImport(officer, openBody(o), d);
    if (!r.ok) throw new Error(`the fixture open was refused: ${r.reason} — ${r.message}`);
    return r.view.id;
  };

  /* ── S0 ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
  await fresh(L.s0, async () => {
    const m = mem();
    const officer = await db.user.findById(OFFICER);
    const admin = await db.user.findById(ADMIN);
    return [m.contactImports.size === 0 && m.contactImportRows.size === 0 && keyOf("0712 345 678") === "255712345678"
      && officer?.role === "GROWTH" && admin?.role === "ADMIN", `${officer?.role}/${admin?.role}`];
  });

  /* ── OPEN ──────────────────────────────────────────────────────────────────────────────────────────────────── */
  await fresh(L.o1, async () => {
    const r = await openContactImport(OFFICER, openBody({ totalRows: 12, unreadable: 2, fileName: "Asha Juma list.csv" }), deps);
    if (!r.ok) return [false, `${r.reason}: ${r.message}`];
    const run = await db.contactImport.find(r.view.id);
    const opened = captured.filter((a) => a.action === "contacts.import.opened");
    const payload = JSON.stringify(opened[0]?.payload ?? null);
    return [/^ci_[a-z]{20}$/.test(r.view.id) && !r.adopted && r.view.status === "STAGING" && r.view.stagedThrough === 0
      && r.view.committedThrough === 0 && r.view.nextFrom === 1 && r.view.totalRows === 12 && r.view.unreadable === 2
      && r.view.totals.staged === 0 && r.view.mine && JSON.stringify(run?.mapping) === JSON.stringify(MAPPING)
      && run?.createdBy === OFFICER && run?.fileName === "Asha Juma list.csv" && run?.decisionChoice === null
      && opened.length === 1 && opened[0].actorId === OFFICER && opened[0].targetId === r.view.id
      && !payload.includes("Asha") && !payload.includes("list.csv") && !/[0-9]{9}/.test(payload),
      `${r.view.id} · ${payload}`];
  });

  await fresh(L.o2, async () => {
    const tries: Array<[string, Record<string, unknown>]> = [
      ["too_many_rows", openBody({ totalRows: IMPORT_MAX_ROWS + 1 })],
      ["empty_file", openBody({ totalRows: 0 })],
      ["bad_digest", openBody({ fileDigest: "abc123" })],
      ["bad_counts", openBody({ totalRows: 5, unreadable: 6 })],
      ["no_phone_column", openBody({ mapping: { name: 1, email: 2 } })],
      ["bad_format", openBody({ format: "xls" })],
    ];
    const got: string[] = [];
    let sentences = true;
    for (const [want, body] of tries) {
      const r = await openContactImport(OFFICER, body, deps);
      got.push(r.ok ? `OPENED(${want})` : r.reason);
      if (!r.ok && want === "too_many_rows" && !(r.message.includes("200,000") && /split/i.test(r.message))) sentences = false;
      if (!r.ok && want === "no_phone_column" && r.message !== "Choose the column that holds the phone numbers.") sentences = false;
    }
    const refused = captured.filter((a) => a.action === "contacts.import.stage_refused").length;
    return [got.join(",") === tries.map(([w]) => w).join(",") && sentences && mem().contactImports.size === 0 && refused === tries.length,
      `${got.join(",")} · ${refused} audited`];
  });

  await fresh(L.o3, async () => {
    const id = await open(OFFICER, { totalRows: 10 });
    const staged = await stageContactRows(OFFICER, stageBody(id, 1, rowsFrom(2, 3)), deps);
    const again = await openContactImport(OFFICER, openBody({ totalRows: 10 }), deps);
    const other = await openContactImport(OFFICER, openBody({ fileDigest: DIGEST_B, totalRows: 10 }), deps);
    return [staged.ok && again.ok && again.adopted && again.view.id === id && again.view.nextFrom === 4 && mem().contactImports.size === 1
      && !other.ok && other.reason === "unfinished_run" && other.view?.id === id && other.view?.totals.staged === 3
      && other.view?.stagedThrough === 3,
      `again ${again.ok ? `${again.adopted ? "adopted" : "NEW"} ${again.view.id}` : again.reason} · other ${other.ok ? `ADOPTED ${other.view.id}` : other.reason}`];
  });

  await fresh(L.o4, async () => {
    const id = await open(OFFICER, { totalRows: 10 });
    const b = await openContactImport(OFFICER, openBody({ totalRows: 11 }), deps);
    return [!b.ok && b.reason === "read_differently" && b.view?.id === id && mem().contactImports.size === 1, b.ok ? "ADOPTED" : b.reason];
  });

  await fresh(L.o5, async () => {
    const id = await open(OFFICER, { totalRows: 10 });
    const theirs = await openContactImport(OTHER, openBody({ totalRows: 10 }), deps);
    const peek = await contactImportView(OTHER, id, deps);
    const push = await stageContactRows(OTHER, stageBody(id, 1, rowsFrom(2, 2)), deps);
    const drop = await discardContactImport(OTHER, id, deps);
    const adminView = await contactImportView(ADMIN, id, deps);
    const adminPush = await stageContactRows(ADMIN, stageBody(id, 1, rowsFrom(2, 2)), deps);
    const notYours = captured.filter((x) => x.action === "contacts.import.stage_refused" && (x.payload as { reason?: string })?.reason === "not_yours");
    // ⭐ C8c · #14a · the push and the discard are ONE officer refused not_yours on ONE run in one minute: one row.
    return [theirs.ok && !theirs.adopted && theirs.view.id !== id
      && peek === null && !push.ok && push.reason === "not_yours" && push.view === null
      && !drop.ok && drop.reason === "not_yours" && drop.view === null
      && adminView !== null && !adminView.mine && adminView.createdBy === OFFICER
      && adminPush.ok && adminPush.view.stagedThrough === 2 && !adminPush.view.mine && notYours.length === 1,
      `peek ${peek === null ? "null" : "SEEN"} · push ${reasonOf(push)} · admin ${adminPush.ok ? adminPush.view.stagedThrough : adminPush.reason}`];
  });

  await fresh(L.o6, async () => {
    const [a, b] = await Promise.all([openContactImport(OFFICER, openBody(), deps), openContactImport(OFFICER, openBody(), deps)]);
    const openRun = await db.contactImport.findOpenFor(OFFICER);
    const mine = [...mem().contactImports.values()].filter((r) => r.createdBy === OFFICER);
    const live = mine.filter((r) => r.status === "STAGING");
    return [a.ok && b.ok && a.view.id === b.view.id && openRun?.id === a.view.id && live.length === 1 && a.adopted !== b.adopted,
      `${a.ok ? a.view.id : reasonOf(a)} / ${b.ok ? b.view.id : reasonOf(b)} · ${mine.map((r) => r.status).join(",")}`];
  });

  /* ── STAGE ─────────────────────────────────────────────────────────────────────────────────────────────────── */
  await fresh(L.t1, async () => {
    const id = await open(OFFICER, { totalRows: 4 });
    const r = await stageContactRows(OFFICER, stageBody(id, 1, [
      { line: 2, cells: ["0712 345 678", "Asha"], msisdn: "255754000001", verdict: "ok", outcome: "create" },
      { line: 3, cells: ["0640 000 001", "Unallocated"] },
      { line: 4, cells: ["", "No Phone"] },
      { line: 5, cells: ["+255 754 000 002"], msisdn: "255712345678" },
    ]), deps);
    const rows = await recount(id);
    const keys = rows.map((x) => x.msisdn ?? "null").join(",");
    return [r.ok && keys === "255712345678,null,null,255754000002" && rows[0].rawPhone === "0712 345 678"
      && rows.every((x) => x.outcome === null && x.outcomeReason === null && x.readError === null), keys];
  });

  await fresh(L.t2, async () => {
    const id = await open(OFFICER, { totalRows: 2 });
    const longNote = "n".repeat(1001);
    const r = await stageContactRows(OFFICER, stageBody(id, 1, [
      { line: 2, cells: ["0712 345 678", "Asha", "", "", longNote] },
      { line: 3, cells: ["0712 345 679", "Baraka", "not-an-email"] },
    ]), deps);
    const rows = await recount(id);
    const p0 = rows[0]?.problems ?? [];
    const p1 = rows[1]?.problems ?? [];
    return [r.ok && rows[0]?.notes === longNote && p0.length === 1 && p0[0].field === "notes" && p0[0].sentence.includes("1000")
      && rows[1]?.email === "not-an-email" && p1.some((x) => x.field === "email")
      && !JSON.stringify(rows.map((x) => x.problems)).includes("not-an-email"),
      `notes ${rows[0]?.notes?.length} · ${JSON.stringify(p0)} · ${JSON.stringify(p1)}`];
  });

  await fresh(L.t3, async () => {
    const id = await open(OFFICER, { format: "vcard", totalRows: 3, unreadable: 2 });
    const r = await stageContactRows(OFFICER, stageBody(id, 1, [
      { line: 1, cells: ["0712 345 678", "Asha"] },
      { line: 2, readError: "This card is cut off before its end, so it was not read." },
      { line: 3, readError: "Card for 0712 345 999 could not be read" },
    ]), deps);
    const rows = await recount(id);
    return [r.ok && r.view.status === "STAGED" && r.view.totals.staged === 3 && r.view.totals.unreadable === 2
      && rows[1]?.readError === "This card is cut off before its end, so it was not read." && rows[1]?.msisdn === null && rows[1]?.rawPhone === ""
      && rows[2]?.readError === STAGING_SENTENCES.readErrorWithheld && !JSON.stringify(rows).includes("345 999"),
      JSON.stringify(rows.map((x) => x.readError))];
  });

  await fresh(L.t4, async () => {
    const id = await open(OFFICER, { totalRows: 5000 });
    const big = rowsFrom(2, STAGE_BATCH_MAX_ROWS + 1);
    const refused = await stageContactRows(OFFICER, stageBody(id, 1, big), deps);
    const heldAfterRefusal = (await recount(id, 2000)).length;
    const landed = await stageContactRows(OFFICER, stageBody(id, 1, big.slice(0, STAGE_BATCH_MAX_ROWS)), deps);
    return [stageBatchBytes(big) < STAGE_BATCH_MAX_BYTES && !refused.ok && refused.reason === "batch_too_many_rows" && heldAfterRefusal === 0
      && landed.ok && landed.view.stagedThrough === STAGE_BATCH_MAX_ROWS && landed.view.totals.staged === STAGE_BATCH_MAX_ROWS,
      `${reasonOf(refused)} · then ${landed.ok ? landed.view.stagedThrough : landed.reason}`];
  });

  await fresh(L.t5, async () => {
    const id = await open(OFFICER, { totalRows: 10 });
    const note = "x".repeat(70 * 1024);
    const heavy = [0, 1, 2].map((k) => cellsRow(2 + k, numberOf(k), `Heavy ${k}`, "", "", note));
    const bytes = stageBatchBytes(heavy);
    const r = await stageContactRows(OFFICER, stageBody(id, 1, heavy), deps);
    return [bytes > STAGE_BATCH_MAX_BYTES && heavy.length < STAGE_BATCH_MAX_ROWS && !r.ok && r.reason === "batch_too_large"
      && (await db.contactImport.find(id))?.stagedThrough === 0 && (await recount(id)).length === 0, `${bytes} bytes · ${reasonOf(r)}`];
  });

  await fresh(L.t6, async () => {
    const id = await open(OFFICER, { totalRows: 6 });
    const first = await stageContactRows(OFFICER, stageBody(id, 1, rowsFrom(2, 2)), deps);
    const skip = await stageContactRows(OFFICER, stageBody(id, 4, rowsFrom(5, 2)), deps);
    const replay = await stageContactRows(OFFICER, stageBody(id, 1, rowsFrom(2, 2)), deps);
    const across = await stageContactRows(OFFICER, stageBody(id, 3, [cellsRow(3, numberOf(9)), cellsRow(9, numberOf(10))]), deps);
    const within = await stageContactRows(OFFICER, stageBody(id, 3, [cellsRow(8, numberOf(8)), cellsRow(7, numberOf(7))]), deps);
    const past = await stageContactRows(OFFICER, stageBody(id, 3, rowsFrom(4, 5)), deps);
    const rows = await recount(id);
    return [first.ok && !skip.ok && skip.reason === "out_of_order" && skip.view?.nextFrom === 3
      && !replay.ok && replay.reason === "already_staged" && !across.ok && across.reason === "bad_rows"
      && !within.ok && within.reason === "bad_rows" && !past.ok && past.reason === "too_many_rows_for_run"
      && rows.length === 2 && (await db.contactImport.find(id))?.stagedThrough === 2,
      [first, skip, replay, across, within, past].map(reasonOf).join(",")];
  });

  await fresh(L.t7, async () => {
    const id = await open(OFFICER, { totalRows: 20 });
    const body = stageBody(id, 1, rowsFrom(2, 10));
    const [x, y] = await Promise.all([stageContactRows(OFFICER, body, deps), stageContactRows(OFFICER, body, deps)]);
    const reasons = [x, y].map(reasonOf).sort().join(",");
    const rows = await recount(id);
    const run = await db.contactImport.find(id);
    return [reasons === "already_staged,ok" && rows.length === 10 && new Set(rows.map((r) => r.line)).size === 10 && run?.stagedThrough === 10,
      `${reasons} · ${rows.length} rows · stagedThrough ${run?.stagedThrough}`];
  });

  await fresh(L.t8, async () => {
    const id = await open(OFFICER, { totalRows: 4 });
    const s1 = await stageContactRows(OFFICER, stageBody(id, 1, rowsFrom(2, 2)), deps);
    const wrongFile = await stageContactRows(OFFICER, stageBody(id, 3, rowsFrom(4, 2), DIGEST_B), deps);
    const s2 = await stageContactRows(OFFICER, stageBody(id, 3, rowsFrom(4, 2)), deps);
    const later = await stageContactRows(OFFICER, stageBody(id, 5, rowsFrom(6, 1)), deps);
    const other = await stageContactRows(OTHER, stageBody(id, 5, rowsFrom(6, 1)), deps);
    const done = captured.filter((x) => x.action === "contacts.import.staged");
    return [s1.ok && s1.view.status === "STAGING" && !wrongFile.ok && wrongFile.reason === "different_file"
      && s2.ok && s2.view.status === "STAGED" && s2.view.nextFrom === null && s2.view.totals.staged === 4
      && !later.ok && later.reason === "not_staging" && !other.ok && other.reason === "not_yours"
      && done.length === 1 && (done[0].payload as { staged?: number })?.staged === 4,
      [s1, wrongFile, s2, later, other].map(reasonOf).join(",")];
  });

  /* ── ⭐ THE ACCEPT ─────────────────────────────────────────────────────────────────────────────────────────── */
  await fresh(L.a1, async () => {
    const id = await open(OFFICER, { totalRows: 40 });
    const all = rowsFrom(2, 40);
    for (let b = 0; b < 2; b++) {
      const r = await stageContactRows(OFFICER, stageBody(id, 1 + b * 10, all.slice(b * 10, b * 10 + 10)), deps);
      if (!r.ok) return [false, `batch ${b + 1}: ${r.reason}`];
    }
    // ── the tab closes; a new page knows only who the officer is ──
    const back = await contactImportView(OFFICER, null, deps);
    if (!back) return [false, "no open run came back"];
    const held = await recount(back.id);
    const resumedAt = back.nextFrom;
    for (let from = back.nextFrom ?? 41; from <= 40; from += 10) {
      const r = await stageContactRows(OFFICER, stageBody(back.id, from, all.slice(from - 1, from + 9)), deps);
      if (!r.ok) return [false, `resume at ${from}: ${r.reason}`];
    }
    const done = await contactImportView(OFFICER, back.id, deps);
    const recounted = await recount(back.id);
    return [back.id === id && back.stagedThrough === 20 && resumedAt === 21 && back.totals.staged === held.length && held.length === 20
      && done?.status === "STAGED" && done.totals.staged === 40 && done.totals.staged === recounted.length
      && recounted.map((r) => r.ordinal).join(",") === Array.from({ length: 40 }, (_, k) => k + 1).join(",")
      && recounted.every((r, k) => r.line === k + 2),
      `back at ${back.stagedThrough}, next ${resumedAt} · done ${done?.status} ${done?.totals.staged} / recount ${recounted.length}`];
  });

  await fresh(L.a2, async () => {
    const file: ParsedContactsFile = {
      format: "csv", fileName: "forty.csv", width: 5, blankRows: 0, notes: [], unreadable: [],
      rows: [{ line: 1, cells: HEADERS }, ...Array.from({ length: 40 }, (_, k) => ({ line: k + 2, cells: [numberOf(k), `Forty ${k}`, "", "", ""] }))],
    };
    const sequence = stageRowsOf(file, MAPPING, 1);
    const figures = stageFigures(sequence);
    const batches = packStageBatches(sequence);
    let calls = 0;
    const opened = await openContactImport(OFFICER, openBody({ totalRows: figures.totalRows, unreadable: figures.unreadable }), deps);
    calls++;
    if (!opened.ok) return [false, opened.reason];
    let last: StageContactRowsResult | null = null;
    let from = 1;
    for (const batch of batches) {
      last = await stageContactRows(OFFICER, stageBody(opened.view.id, from, batch), deps);
      calls++;
      from += batch.length;
    }
    return [batches.length === 1 && calls === 2 && figures.totalRows === 40 && last !== null && last.ok
      && last.view.status === "STAGED" && last.view.totals.staged === 40, `${batches.length} batch(es), ${calls} calls`];
  });

  await fresh(L.a3, async () => {
    await db.marketingContact.create(bookRow("mc_stage_1", numberOf(0)));
    await db.marketingContact.create(bookRow("mc_stage_2", numberOf(1)));
    await db.messagingConsent.create({
      id: "stg_l1", channel: "SMS", identifier: keyOf(numberOf(2)), category: "MARKETING", status: "GIVEN", source: "IMPORT",
      wording: "fixture", locale: "EN", evidence: "fixture", recordedBy: null, createdAt: iso(NOW.getTime() - DAY),
    });
    await db.suppression.create({
      id: "stg_s1", channel: "SMS", identifier: keyOf(numberOf(3)), category: "MARKETING", reason: "WITHDRAWN", evidence: "fixture",
      recordedBy: null, createdAt: iso(NOW.getTime() - DAY), liftedAt: null, liftedReason: null,
    });
    const m = mem();
    const counts = () => [m.marketingContacts.size, m.contactsByMsisdn.size, m.messagingConsents.size, m.suppressions.size].join("/");
    const before = counts();
    const id = await open(OFFICER, { totalRows: 5000 });
    let from = 1;
    let allOk = true;
    for (const batch of packStageBatches(rowsFrom(2, 5000))) {
      const r = await stageContactRows(OFFICER, stageBody(id, from, batch), deps);
      allOk = allOk && r.ok;
      from += batch.length;
    }
    const view = await contactImportView(OFFICER, id, deps);
    const foreign = captured.filter((x) => !String(x.action).startsWith("contacts.import."));
    return [before === "2/2/1/1" && counts() === before && allOk && view?.status === "STAGED" && view.totals.staged === 5000 && foreign.length === 0,
      `${before} → ${counts()} · ${view?.totals.staged} staged`];
  });

  /* ── THE PRIMITIVES ────────────────────────────────────────────────────────────────────────────────────────── */
  await fresh(L.d1, async () => {
    const id = await open(OFFICER, { totalRows: 5 });
    const r = await stageContactRows(OFFICER, stageBody(id, 1, rowsFrom(2, 5)), deps);
    const page1 = await db.contactImportRow.after({ importId: id, afterOrdinal: 0, limit: 2 });
    const gone = await db.contactImportRow.deleteByMsisdn(keyOf(numberOf(1)));
    const page2 = await db.contactImportRow.after({ importId: id, afterOrdinal: 2, limit: 2 });
    const tail = await db.contactImportRow.after({ importId: id, afterOrdinal: 4, limit: 10 });
    const totals = await db.contactImport.totals(id);
    const ords = (rows: StoredContactImportRow[]) => rows.map((x) => x.ordinal).join(",");
    return [r.ok && ords(page1) === "1,2" && gone === 1 && ords(page2) === "3,4" && ords(tail) === "5" && totals.staged === 4,
      `${ords(page1)} | erased ${gone} | ${ords(page2)} | ${ords(tail)}`];
  });

  await fresh(L.d2, async () => {
    const id = await open(OFFICER, { totalRows: 2 });
    await stageContactRows(OFFICER, stageBody(id, 1, rowsFrom(2, 2)), deps);
    const at = (h: number) => iso(NOW.getTime() + h * 3_600_000);
    const go1 = await db.contactImport.transition({ importId: id, from: ["STAGED"], to: "COMMITTING", by: OFFICER, at: at(1), updatedBefore: null });
    const go2 = await db.contactImport.transition({ importId: id, from: ["STAGED"], to: "COMMITTING", by: OFFICER, at: at(1), updatedBefore: null });
    const paused = await db.contactImport.transition({ importId: id, from: ["COMMITTING"], to: "PAUSED", by: ADMIN, at: at(2), updatedBefore: null });
    const resumed = await db.contactImport.transition({ importId: id, from: ["PAUSED"], to: "COMMITTING", by: OFFICER, at: at(3), updatedBefore: null });
    const done = await db.contactImport.transition({ importId: id, from: ["COMMITTING"], to: "DONE", by: OFFICER, at: at(4), updatedBefore: null });
    return [go1?.status === "COMMITTING" && go2 === null && paused?.status === "PAUSED" && paused.pausedBy === ADMIN && paused.pausedAt === at(2)
      && resumed?.status === "COMMITTING" && resumed.pausedAt === null && resumed.pausedBy === null
      && done?.status === "DONE" && done.finishedAt === at(4) && done.updatedAt === at(4),
      `${go1?.status}/${go2 === null ? "null" : go2.status}/${paused?.pausedBy}/${resumed?.pausedBy}/${done?.finishedAt}`];
  });

  await fresh(L.d3, async () => {
    const id = await open(OFFICER, { totalRows: 4 });
    await stageContactRows(OFFICER, stageBody(id, 1, rowsFrom(2, 4)), deps);
    // A commit (U32's, here written straight into the twin) has settled ordinal 1 — a settled row is the commit's record.
    const held = mem().contactImportRows.get(id);
    const first = held?.get(1);
    if (!held || !first) return [false, "no staged rows to settle"];
    held.set(1, { ...first, outcome: "create" });
    const r = await discardContactImport(OFFICER, id, deps);
    const run = await db.contactImport.find(id);
    const left = await recount(id);
    const busy = await open(OFFICER, { fileDigest: DIGEST_B, totalRows: 1 });
    await stageContactRows(OFFICER, stageBody(busy, 1, rowsFrom(2, 1), DIGEST_B), deps);
    await db.contactImport.transition({ importId: busy, from: ["STAGED"], to: "COMMITTING", by: OFFICER, at: NOW.toISOString(), updatedBefore: null });
    const refused = await discardContactImport(OFFICER, busy, deps);
    return [r.ok && r.rowsDeleted === 3 && run?.status === "CANCELLED" && run.finishedAt === NOW.toISOString()
      && left.map((x) => x.ordinal).join(",") === "1" && !refused.ok && refused.reason === "committing" && (await recount(busy)).length === 1,
      `${r.ok ? r.rowsDeleted : r.reason} · ${run?.status} · left ${left.map((x) => x.ordinal)} · ${reasonOf(refused)}`];
  });

  /* ── THE PRIVACY ARMS ──────────────────────────────────────────────────────────────────────────────────────── */
  await fresh(L.p1, async () => {
    const PERSON = "usr_stage_person";
    const PHONE = "+255712000501";
    await db.user.create(makeUser(PERSON, PHONE, "PLAYER", iso(NOW.getTime() - 300 * DAY)));
    // A book row LINKED to the account carries the number the person had before.
    await db.marketingContact.create(bookRow("mc_stage_old", "0754 000 501", { userId: PERSON, displayName: "Zawadi" }));
    const x = await open(OFFICER, { totalRows: 3 });
    const y = await open(OTHER, { fileDigest: DIGEST_B, totalRows: 2 });
    await stageContactRows(OFFICER, stageBody(x, 1, [
      cellsRow(2, "0712 000 501", "Zawadi"), cellsRow(3, "0754 000 601", "Stranger A"), cellsRow(4, "0754 000 501", "Zawadi"),
    ]), deps);
    await stageContactRows(OTHER, stageBody(y, 1, [cellsRow(2, "0754 000 602", "Stranger B"), cellsRow(3, "+255 712 000 501", "Zawadi M")], DIGEST_B), deps);
    const before = (await recount(x)).length + (await recount(y)).length;
    const counts = await eraseMarketingFor({ userId: PERSON, phoneE164: PHONE, officerId: ADMIN });
    const leftX = await recount(x);
    const leftY = await recount(y);
    return [before === 5 && counts.marketingStagedRowsDeleted === 3 && leftX.map((r) => r.displayName).join(",") === "Stranger A"
      && leftY.map((r) => r.displayName).join(",") === "Stranger B" && !JSON.stringify([...leftX, ...leftY]).includes("Zawadi"),
      `${counts.marketingStagedRowsDeleted} deleted · left ${leftX.map((r) => r.displayName)} | ${leftY.map((r) => r.displayName)}`];
  });

  await fresh(L.p2, async () => {
    const PERSON = "usr_stage_dsar";
    const PHONE = "+255712000502";
    const created = iso(NOW.getTime() - 30 * DAY);
    await db.user.create(makeUser(PERSON, PHONE, "PLAYER", created));
    // A copy staged BEFORE the account existed — a previous holder's — and one staged since.
    const early: ImportStagingDeps = { ...deps, now: () => new Date(NOW.getTime() - 60 * DAY) };
    const e = await open(OTHER, { fileDigest: DIGEST_B, totalRows: 1 }, early);
    await stageContactRows(OTHER, stageBody(e, 1, [cellsRow(2, "0712 000 502", "Previous Holder", "prev@example.com", "old", "about the previous holder")], DIGEST_B), early);
    const n = await open(OFFICER, { totalRows: 1 });
    await stageContactRows(OFFICER, stageBody(n, 1, [cellsRow(2, "0712 000 502", "Neema Juma", "neema@example.com", "vip, dar", "met at the stadium — staff note")]), deps);
    const view = await marketingDsarView({ id: PERSON, phoneE164: PHONE, createdAt: created });
    const json = JSON.stringify(view.staged);
    const first = view.staged[0];
    const keys = first ? Object.keys(first).sort().join(",") : "";
    return [view.staged.length === 1 && first?.displayName === "Neema Juma" && first.email === "neema@example.com"
      && first.tags.join(",") === "vip,dar" && first.outcome === null && first.stagedAt === NOW.toISOString() && first.msisdn === "255712000502"
      && keys === "displayName,email,msisdn,outcome,stagedAt,tags" && !json.includes("staff note") && !json.includes("list.csv")
      && !json.includes(OFFICER) && !json.includes("Previous Holder") && !json.includes(n),
      json];
  });

  await fresh(L.p3, async () => {
    const ago = (days: number) => iso(NOW.getTime() - days * DAY);
    const runOf = (id: string, at: string): StoredContactImport => ({
      id, status: "STAGING", format: "csv", fileName: null, fileDigest: DIGEST_A, mapping: MAPPING, totalRows: 2, unreadable: 0,
      stagedThrough: 0, committedThrough: 0, decisionChoice: null, decisionOverrides: {}, decisionConfirmedAt: null,
      decisionConfirmedBy: null, consentBasis: null, consentWording: null, consentProofNote: null, adultAttestedAt: null,
      consentBasisSetBy: null, consentBasisSetAt: null, pausedAt: null, pausedBy: null, finishedAt: null, createdAt: at,
      createdBy: OFFICER, updatedAt: at,
    });
    const rowOf = (id: string, ordinal: number, at: string): StoredContactImportRow => ({
      importId: id, ordinal, line: ordinal + 1, rawPhone: numberOf(ordinal), msisdn: keyOf(numberOf(ordinal)), displayName: `Sweep ${ordinal}`,
      email: null, tags: [], notes: null, problems: [], readError: null, outcome: null, outcomeReason: null, stagedAt: at,
    });
    /** A run in a given state, every write stamped `at` — staged with one row (still STAGING) or two (STAGED), then moved. */
    const seed = async (id: string, at: string, rows: 1 | 2, moves: ContactImportStatus[]): Promise<void> => {
      await db.contactImport.create(runOf(id, at));
      await db.contactImport.stageRows({ importId: id, from: 1, rows: rows === 2 ? [rowOf(id, 1, at), rowOf(id, 2, at)] : [rowOf(id, 1, at)], completes: rows === 2, at });
      let from: ContactImportStatus = rows === 2 ? "STAGED" : "STAGING";
      for (const to of moves) {
        await db.contactImport.transition({ importId: id, from: [from], to, by: OFFICER, at, updatedBefore: null });
        from = to;
      }
    };
    await seed("run_staging_idle", ago(15), 1, []);
    await seed("run_staged_idle", ago(15), 2, []);
    await seed("run_paused_idle", ago(15), 2, ["COMMITTING", "PAUSED"]);
    await seed("run_committing_idle", ago(15), 2, ["COMMITTING"]);
    // S15-12 · the commit above had settled its first row before it was left: that row is the record of a contact written.
    await db.contactImport.commitBatch({
      importId: "run_committing_idle", fromCursor: 0, toCursor: 1, at: ago(15), by: OFFICER, creates: [], updates: [],
      outcomes: [{ ordinal: 1, outcome: "keep", reason: "chosen_keep" }], sentences: [], listId: null, members: [],
    });
    await seed("run_paused_recent", ago(13), 2, ["COMMITTING", "PAUSED"]);
    await seed("run_fresh", ago(1), 1, []);
    await seed("run_done_old", ago(91), 2, ["COMMITTING", "DONE"]);
    await seed("run_done_recent", ago(89), 2, ["COMMITTING", "DONE"]);
    const swept = await sweepStaleContactImports(NOW.getTime(), deps);
    const again = await sweepStaleContactImports(NOW.getTime(), deps);
    const statusOf = async (id: string) => (await db.contactImport.find(id))?.status ?? "GONE";
    const rowsOf = (id: string) => mem().contactImportRows.get(id)?.size ?? -1;
    const ids = ["run_staging_idle", "run_staged_idle", "run_paused_idle", "run_committing_idle", "run_paused_recent", "run_fresh", "run_done_old", "run_done_recent"];
    const states: string[] = [];
    for (const id of ids) states.push(`${await statusOf(id)}:${rowsOf(id)}`);
    const want = ["CANCELLED:0", "CANCELLED:0", "CANCELLED:0", "CANCELLED:1", "PAUSED:2", "STAGING:1", "GONE:-1", "DONE:2"];
    const expired = captured.filter((x) => x.action === "contacts.import.expired");
    const periods = expired.map((x) => `${(x.payload as Record<string, unknown>).status}:${(x.payload as Record<string, unknown>).idleDays}`).sort();
    const settledKept = mem().contactImportRows.get("run_committing_idle")?.get(1)?.outcome === "keep";
    return [swept.cancelled === 4 && swept.rowsDeleted === 6 && swept.runsPurged === 1 && states.join(",") === want.join(",")
      && (await db.contactImport.find("run_staged_idle"))?.finishedAt === NOW.toISOString() && expired.length === 4 && settledKept
      && periods.join(",") === "COMMITTING:14,PAUSED:14,STAGED:14,STAGING:14"
      && again.cancelled === 0 && again.rowsDeleted === 0 && again.runsPurged === 0,
      `${JSON.stringify(swept)} · ${states.join(",")} · periods ${periods.join(",")} · settled kept ${settledKept} · again ${JSON.stringify(again)}`];
  });

  /* ── THE LIMITS AND THE PACKER ─────────────────────────────────────────────────────────────────────────────── */
  await check(p(L.l1), () => {
    const start = SRC.dal.indexOf("data: b.rows.map((row) => ({");
    const end = SRC.dal.indexOf("})),", start);
    const columns = start > 0 && end > start ? (SRC.dal.slice(start, end).match(/^\s+\w+:/gm) ?? []).length : 0;
    return [STAGE_BATCH_MAX_ROWS === 2000 && STAGE_BATCH_MAX_BYTES === 204800 && NEXT_ACTION_BODY_LIMIT_BYTES === 1048576
      && STAGE_BATCH_BODY_MARGIN >= 5 && Math.abs(STAGE_BATCH_BODY_MARGIN - 5.12) < 1e-9
      && IMPORT_MAX_ROWS === XLSX_MAX_ROWS && IMPORT_MAX_ROWS === 200000 && /IMPORT_MAX_ROWS: number = XLSX_MAX_ROWS;/.test(SRC.limits)
      && columns === 12 && STAGE_BATCH_MAX_ROWS * columns < 65535,
      `margin ${STAGE_BATCH_BODY_MARGIN} · ${columns} columns × ${STAGE_BATCH_MAX_ROWS} = ${STAGE_BATCH_MAX_ROWS * columns}`];
  });

  await check(p(L.l2), () => {
    const rows: StageRowInput[] = [];
    for (let i = 0; i < 150_000; i++) {
      if (i % 997 === 0) rows.push({ line: i + 2, readError: "This card has no phone number." });
      else {
        rows.push({
          line: i + 2,
          cells: [
            numberOf(i % 99_999),
            i % 3 === 0 ? `Mwanaisha ${i} — ${"ß".repeat(i % 40)}` : `C${i}`,
            i % 5 === 0 ? `user${i}@example.com` : "",
            i % 7 === 0 ? "vip, dar" : "",
            i % 11 === 0 ? "ñ".repeat(i % 300) : "",
          ],
        });
      }
    }
    const batches = packStageBatches(rows);
    const within = batches.every((b) => b.length >= 1 && b.length <= STAGE_BATCH_MAX_ROWS && stageBatchBytes(b) <= STAGE_BATCH_MAX_BYTES);
    const flat = batches.flat();
    const same = flat.length === rows.length && flat.every((r, i) => r === rows[i]);
    const filled = batches.slice(0, -1).every((b, i) => b.length === STAGE_BATCH_MAX_ROWS || stageBatchBytes([...b, batches[i + 1][0]]) > STAGE_BATCH_MAX_BYTES);
    const samples = ["plain", "Swahili: habari za asubuhi", "Chinese: 你好世界", `emoji: ${String.fromCodePoint(0x1f600)}`, `lone: ${String.fromCharCode(0xd800)}`];
    const measured = samples.every((s) => utf8Length(s) === Buffer.byteLength(s, "utf8"));
    const exact = batches.slice(0, 3).every((b) => stageBatchBytes(b) === Buffer.byteLength(JSON.stringify(b), "utf8"));
    return [within && same && filled && measured && exact && batches.length >= 75,
      `${batches.length} batches · within ${within} · same ${same} · filled ${filled} · measured ${measured} · exact ${exact}`];
  });

  await check(p(L.l3), () => {
    const vcard: ParsedContactsFile = {
      format: "vcard", fileName: "c.vcf", width: 2, blankRows: 0, notes: [],
      rows: [{ line: 1, cells: ["0712 345 678", "Asha"] }, { line: 2, cells: ["0712 345 679", "Baraka"] }, { line: 4, cells: ["0712 345 680", "Neema"] }],
      unreadable: [{ line: 3, reason: "This card is cut off before its end, so it was not read." }],
    };
    const v = stageRowsOf(vcard, MAPPING, 0);
    const csv: ParsedContactsFile = {
      format: "csv", fileName: "c.csv", width: 5, blankRows: 1, notes: [], unreadable: [],
      rows: [{ line: 1, cells: HEADERS }, { line: 2, cells: ["0712 345 678", "Asha", "a@x.tz", "vip", "a note"] }, { line: 4, cells: ["0712 345 679", "", "", "", ""] }],
    };
    const c = stageRowsOf(csv, { phone: 0, notes: 4 }, 1);
    const huge = stageRowFor({ line: 9, cells: ["0712 345 678", "x".repeat(STAGE_BATCH_MAX_BYTES)] }, MAPPING);
    const unmappedHuge = stageRowFor({ line: 10, cells: ["0712 345 678", "Asha", "", "", "", "y".repeat(STAGE_BATCH_MAX_BYTES)] }, MAPPING);
    const figures = stageFigures(v);
    return [v.map((r) => r.line).join(",") === "1,2,3,4" && "readError" in v[2] && figures.totalRows === 4 && figures.unreadable === 1
      && c.length === 2 && JSON.stringify(c[0]) === JSON.stringify({ line: 2, cells: ["0712 345 678", "", "", "", "a note"] })
      && JSON.stringify(c[1]) === JSON.stringify({ line: 4, cells: ["0712 345 679"] })
      && "readError" in huge && huge.readError === STAGE_ROW_TOO_LARGE
      && "cells" in unmappedHuge && unmappedHuge.cells.length === 2,
      `${JSON.stringify(v.map((r) => r.line))} · ${JSON.stringify(c)}`];
  });

  /* ── WHAT ONLY THE SOURCE CAN SHOW ─────────────────────────────────────────────────────────────────────────── */
  await check(p(L.s1), () => {
    const svc = SRC.service;
    const imports = [...svc.matchAll(/^import\s[^;]*?from\s+"([^"]+)";/gm)].map((m) => m[1]);
    const sends = imports.filter((s) => /sms|dispatch|consent-ledger|optout-service|ledger-stamp|contact-cache|marketing\/consent/.test(s));
    const writes = /db\.(?:marketingContact|messagingConsent|suppression|contactList|contactListMember)\.(?:create|update|updateIfUnchanged|add|remove|lift|\w+Where)\s*\(/.exec(svc);
    return [!/^\s*["']use (?:client|server)["']/m.test(svc) && sends.length === 0 && writes === null
      && !/export\s+(?:async\s+)?function\s+\w+Action(?![\w$])/.test(svc) && SRC.serviceRaw.startsWith("/**")
      // C3b · G3 · the key is derived through the ONE phone-cell rule (`firstMobileIn`), which reads tz-msisdn itself.
      && imports.includes("@/lib/server/store") && imports.includes("@/lib/contacts/contact-fields") && imports.includes("@/lib/contacts/phone-cell"),
      `imports [${imports.join(", ")}]${writes ? ` · writes ${writes[0]}` : ""}`];
  });

  await check(p(L.s2), () => {
    const lim = SRC.limits;
    const imports = [...lim.matchAll(/^import\s[^;]*?from\s+"([^"]+)";/gm)].map((m) => m[1]).sort();
    const typeOnly = [...lim.matchAll(/^import\s+type\s[^;]*?from\s+"([^"]+)";/gm)].map((m) => m[1]).sort();
    return [imports.join(",") === "./contact-fields,./parsed-file,./xlsx-limits" && typeOnly.join(",") === "./contact-fields,./parsed-file"
      && !/["']use (?:client|server)["']/.test(lim) && /^\s*"lib\/contacts\/import-limits\.ts",/m.test(SRC.cgs),
      `imports [${imports.join(", ")}] · type-only [${typeOnly.join(", ")}]`];
  });

  await check(p(L.s3), () => {
    const scripts = (JSON.parse(SRC.pkg) as { scripts: Record<string, string> }).scripts;
    const pre = scripts.predeploy ?? "";
    const commands = pre.split("&&").map((c) => c.trim());
    const once = (k: string) => commands.filter((c) => c === `npm run ${k}`).length === 1;
    return [scripts["test:contacts-staging"] === "tsx scripts/contacts-staging.test.mts"
      && scripts["red:contacts-staging"] === "tsx scripts/contacts-staging.test.mts --prove-red"
      && once("test:contacts-staging") && once("test:erasure") && once("test:read-tiers") && once("test:client-graph-safe")
      && (scripts["test:contacts-staging-db"] ?? "").includes("scripts/live/contacts-staging-pg-probe.mts") && !pre.includes("test:contacts-staging-db")
      && /sweepStaleContactImports\(now\)/.test(SRC.retention),
      `staging ${once("test:contacts-staging")} · erasure ${once("test:erasure")} · read-tiers ${once("test:read-tiers")} · cgs ${once("test:client-graph-safe")}`];
  });

  /* ── THE ADVERSARIAL REVIEW'S FIXES (2026-10-02) ────────────────────────────────────────────────────────────── */
  const NULC = String.fromCharCode(0);
  const hasNul = (v: string | null | undefined): boolean => (v ?? "").includes(NULC);
  await fresh(L.t9, async () => {
    const id = await open(OFFICER, { totalRows: 3 });
    const lone = String.fromCharCode(0xd800);
    const dirty = [cellsRow(2, "0712" + NULC + " 345 678", "Asha" + lone, "asha" + NULC + "@example.tz", "vip" + NULC)];
    const r = await stageContactRows(OFFICER, stageBody(id, 1, dirty), deps);
    const [row] = await recount(id);
    const big = await stageContactRows(OFFICER, stageBody(id, 2, [cellsRow(2_147_483_648, numberOf(1))]), deps);
    const clean = !!row && !hasNul(row.rawPhone) && !hasNul(row.email) && !hasNul(row.displayName) && !row.tags.some(hasNul)
      && (row.displayName ?? "").isWellFormed();
    return [r.ok && clean && row.msisdn === "255712345678" && row.email === "asha@example.tz" && row.tags.join(",") === "vip"
      && !big.ok && big.reason === "bad_rows" && (await db.contactImport.find(id))?.stagedThrough === 1,
      `${reasonOf(r)} · clean ${clean} · ${row?.msisdn} · ${reasonOf(big)}`];
  });
  await check(p(L.t10), () => {
    const realBatch = rowsFrom(2, 50);
    const equal = deps.measureBatch(realBatch, STAGE_BATCH_MAX_BYTES) === stageBatchBytes(realBatch);
    let reads = 0;
    const cell = "x".repeat(1000);
    const shared = new Proxy(Array.from({ length: 1000 }, () => cell), {
      get(t, k, r) { if (typeof k === "string" && /^[0-9]+$/.test(k)) reads++; return Reflect.get(t, k, r); },
    });
    const forged = Array.from({ length: 20 }, (_, i) => ({ line: i + 2, cells: shared }));
    const measured = deps.measureBatch(forged, STAGE_BATCH_MAX_BYTES);
    return [equal && measured > STAGE_BATCH_MAX_BYTES && reads < 1000, `equal ${equal} · measured ${measured} · cells read ${reads}`];
  });
  await fresh(L.t11, async () => {
    const first = await open(OFFICER, { totalRows: 4 });
    // The two-tab race on Postgres, by hand: a SECOND open run for the same officer, created a second later.
    const base = await db.contactImport.find(first);
    if (!base) throw new Error("the fixture run is missing");
    const laterAt = iso(NOW.getTime() + 1000);
    const made = await db.contactImport.create({ ...base, id: "ci_bbbbbbbbbbbbbbbbbbbb", createdAt: laterAt, updatedAt: laterAt });
    const refused = await stageContactRows(OFFICER, stageBody("ci_bbbbbbbbbbbbbbbbbbbb", 1, rowsFrom(2, 2)), deps);
    const landed = await stageContactRows(OFFICER, stageBody(first, 1, rowsFrom(2, 2)), deps);
    return [!!made && !refused.ok && refused.reason === "superseded" && refused.view?.id === first && landed.ok,
      `${reasonOf(refused)} · view ${refused.ok ? "-" : refused.view?.id} · ${reasonOf(landed)}`];
  });
  await fresh(L.t12, async () => {
    const before = captured.length;
    const heavy = [0, 1, 2].map((k) => cellsRow(2 + k, numberOf(k), "", "", "", "x".repeat(70 * 1024)));
    const r = await stageContactRows(OFFICER, stageBody("Juma 0712345678", 1, heavy), deps);
    const rows = captured.slice(before) as Array<{ targetId?: unknown }>;
    const far = await stageContactRows(OFFICER, stageBody("ci_aaaaaaaaaaaaaaaaaaaa", IMPORT_MAX_ROWS + 2, rowsFrom(2, 1)), deps);
    return [!r.ok && r.reason === "batch_too_large" && rows.length === 1 && rows[0].targetId === null
      && !JSON.stringify(rows).includes("0712345678") && !far.ok && far.reason === "bad_request",
      `${reasonOf(r)} · target ${JSON.stringify(rows[0]?.targetId)} · ${reasonOf(far)}`];
  });
  await fresh(L.o7, async () => {
    const id = await open(OFFICER, { totalRows: 6 });
    await stageContactRows(OFFICER, stageBody(id, 1, rowsFrom(2, 2)), deps);
    const remapped = await openContactImport(OFFICER, openBody({ totalRows: 6, mapping: { phone: 0, name: 1, email: 2, tags: 3 } }), deps);
    const reordered = await openContactImport(OFFICER, openBody({ totalRows: 6, mapping: { notes: 4, tags: 3, email: 2, name: 1, phone: 0 } }), deps);
    return [!remapped.ok && remapped.reason === "read_differently" && reordered.ok && reordered.adopted && reordered.view.id === id,
      `${reasonOf(remapped)} · ${reordered.ok ? `adopted ${reordered.adopted}` : reasonOf(reordered)}`];
  });
  await fresh(L.p4, async () => {
    const dayBefore = { ...deps, now: () => new Date(NOW.getTime() - DAY) };
    const older = await open(OFFICER, { totalRows: 1 }, dayBefore);
    await stageContactRows(OFFICER, stageBody(older, 1, [cellsRow(2, "0712 345 678")]), dayBefore);
    const newer = await open(OTHER, { totalRows: 1, fileDigest: DIGEST_B }, deps);
    await stageContactRows(OTHER, stageBody(newer, 1, [cellsRow(2, "0712 345 678")], DIGEST_B), deps);
    const list = await db.contactImportRow.listByMsisdn("255712345678");
    return [list.length === 2 && list[0].importId === newer && list[1].importId === older, list.map((x) => `${x.importId.slice(0, 7)}@${x.stagedAt}`).join(" · ")];
  });
}

/* ═══ THE RUN — and, with --prove-red, every plant on its own assertion ═══════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`\ncontacts-staging: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline: ${pass} passed, ${fail} failed\n`);

  /** Swap one member of a memory-twin namespace for one case; the returned function puts it back. */
  const swap = (ns: object, key: string, plant: unknown): (() => void) => {
    const target = ns as Record<string, unknown>;
    const real = target[key];
    target[key] = plant;
    return () => { target[key] = real; };
  };
  /** 🔴 The memory stageRows with its compare-and-set forgotten: the run is put back to "expecting this batch" first. */
  const casless = (): (() => void) => {
    const ns = db.contactImport as unknown as { stageRows: (b: ContactImportStageBatch) => ContactImportStageResult };
    const real = ns.stageRows;
    return swap(ns, "stageRows", (b: ContactImportStageBatch): ContactImportStageResult => {
      const run = memory?.contactImports.get(b.importId);
      if (run) memory?.contactImports.set(b.importId, { ...run, status: "STAGING", stagedThrough: b.from - 1 });
      return real(b);
    });
  };
  /** 🔴 after() by offset: the window counts rows instead of reading past an ordinal. */
  const offsetAfter = (): (() => void) =>
    swap(db.contactImportRow, "after", (w: ContactImportRowWindow): StoredContactImportRow[] =>
      Array.from(memory?.contactImportRows.get(w.importId)?.values() ?? [])
        .sort((a, b) => a.ordinal - b.ordinal)
        .slice(w.afterOrdinal, w.afterOrdinal + w.limit));
  /** 🔴 A field over its limit clipped to the limit, its problem dropped — the spec's clip that X20 removed. */
  const clipper: ImportStagingDeps["rowFrom"] = (raw, ordinal, run, at) => {
    const row = stagedRowFrom(raw, ordinal, run, at);
    if (!row || row.notes === null || row.notes.length <= 1000) return row;
    return { ...row, notes: row.notes.slice(0, 1000), problems: row.problems.filter((x) => x.field !== "notes") };
  };
  /** 🔴 The posted key trusted: the row keeps whatever msisdn the request carried. */
  const trusting: ImportStagingDeps["rowFrom"] = (raw, ordinal, run, at) => {
    const row = stagedRowFrom(raw, ordinal, run, at);
    const posted = (raw as { msisdn?: unknown } | null)?.msisdn;
    return row && typeof posted === "string" ? { ...row, msisdn: posted } : row;
  };

  /** 🔴 The cells drafted as posted: a NUL in the phone survives into the stored row (review F2). */
  const uncleaned: ImportStagingDeps["rowFrom"] = (raw, ordinal, run, at) => {
    const row = stagedRowFrom(raw, ordinal, run, at);
    const cells = (raw as { cells?: unknown } | null)?.cells;
    const phoneAt = run.mapping.phone;
    return row && Array.isArray(cells) && typeof phoneAt === "number" ? { ...row, rawPhone: String(cells[phoneAt] ?? "").trim() } : row;
  };
  /** 🔴 A line past the 32-bit integer let through — Prisma would throw on it, the batch never staged (review F2). */
  const unbounded: ImportStagingDeps["rowFrom"] = (raw, ordinal, run, at) => {
    const line = (raw as { line?: unknown } | null)?.line;
    if (typeof line !== "number" || line <= 2_147_483_647) return stagedRowFrom(raw, ordinal, run, at);
    const row = stagedRowFrom({ ...(raw as object), line: 1 }, ordinal, run, at);
    return row ? { ...row, line } : row;
  };
  type Case = { name: string; expect: string; impl: () => Impl; setup?: () => () => void };
  const CASES: Case[] = [
    /* ── the plan's RED line, each in memory ── */
    { name: "R1 · a posted msisdn trusted — the row builder keeps the key the request carried", expect: L.t1,
      impl: () => ({ deps: { ...TEST_DEPS, rowFrom: trusting } }) },
    { name: "R2 · the byte cap removed — any batch under the row cap is staged, however large", expect: L.t5,
      impl: () => ({ deps: { ...TEST_DEPS, maxBatchBytes: Number.MAX_SAFE_INTEGER } }) },
    { name: "R3 · any digest adopted — open adopts the officer's open run whatever file it came from", expect: L.o3,
      impl: () => ({ deps: { ...TEST_DEPS, sameFile: () => true } }) },
    { name: "R4 · deleteByMsisdn a no-op — erasure reaches no staged row", expect: L.p1,
      impl: () => REAL, setup: () => swap(db.contactImportRow, "deleteByMsisdn", () => 0) },
    { name: "R5 · S15-12's second rule never runs — a commit left paused or writing for 15 days is never ended (the run stuck for good)", expect: L.p3,
      impl: () => ({ deps: { ...TEST_DEPS, stuck: [] } }) },
    { name: "R5b · the second rule ignores its period — a commit paused 13 days ago is ended as if idle 14", expect: L.p3,
      impl: () => ({ deps: { ...TEST_DEPS, stuckDays: 0 } }) },
    /* ── and the rest of the unit, each on its own assertion ── */
    { name: "R6 · the row cap removed — 2,001 rows in one batch", expect: L.t4,
      impl: () => ({ deps: { ...TEST_DEPS, maxBatchRows: Number.MAX_SAFE_INTEGER } }) },
    { name: "R7 · the memory stageRows without its compare-and-set — a racing second tab is let through", expect: L.t7,
      impl: () => REAL, setup: casless },
    { name: "R8 · after() by offset — a row erased between two pages shifts the walk", expect: L.d1,
      impl: () => REAL, setup: offsetAfter },
    { name: "R9 · a field over its limit CLIPPED and its problem dropped (the spec's clip, X20)", expect: L.t2,
      impl: () => ({ deps: { ...TEST_DEPS, rowFrom: clipper } }) },
    { name: "R10 · any officer adopts any run — the ADMIN rule read as everyone (X18)", expect: L.o5,
      impl: () => ({ deps: { ...TEST_DEPS, isAdmin: async () => true } }) },
    /* ── the adversarial review's fixes (2026-10-02), each on its own assertion ── */
    { name: "R11 · the cells drafted as posted — a NUL in the phone is stored, and Postgres would refuse the batch for ever", expect: L.t9,
      impl: () => ({ deps: { ...TEST_DEPS, rowFrom: uncleaned } }) },
    { name: "R12 · a line past the 32-bit integer let through to the database", expect: L.t9,
      impl: () => ({ deps: { ...TEST_DEPS, rowFrom: unbounded } }) },
    { name: "R13 · the byte cap measured by building the whole batch as one string", expect: L.t10,
      impl: () => ({ deps: { ...TEST_DEPS, measureBatch: (rows) => stageBatchBytes(rows) } }) },
    { name: "R14 · the canonical run never asked at stage — the later of two open runs stages beside the earliest", expect: L.t11,
      impl: () => REAL, setup: () => swap(db.contactImport, "findOpenFor", () => null) },
    { name: "R15 · adoption reads the figures only — a different mapping is adopted onto the run", expect: L.o7,
      impl: () => ({ deps: { ...TEST_DEPS, sameMapping: () => true } }) },
    { name: "R16 · the access export reads oldest first — a number's older rows crowd out the newer", expect: L.p4,
      impl: () => REAL, setup: () => {
        const ns = db.contactImportRow as unknown as { listByMsisdn: (m: string) => StoredContactImportRow[] };
        const real = ns.listByMsisdn;
        return swap(ns, "listByMsisdn", (m: string) => real(m).slice().reverse());
      } },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    let restore: (() => void) | null = null;
    try {
      restore = c.setup ? c.setup() : null;
      await runAssertions(c.impl(), tag);
    } catch (err) {
      problems.push(`case ${i + 1} (${c.name}): the plant could not be planted — ${(err as Error)?.message ?? String(err)}`);
      continue;
    } finally {
      if (restore !== null) restore();
    }
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(`${tag}${c.expect}`)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
