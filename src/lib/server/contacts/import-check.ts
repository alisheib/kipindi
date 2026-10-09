/**
 * S15 · C3 · THE IMPORT'S CHECK — the pre-flight, the changes an import would make to contacts already in the book, the
 * facts every decision reads, and the run as the browser sees it.     (S15, 2026-10-09 · docs/CONTACTS-SCREEN-PLAN.md §4)
 *
 * ⭐ WHAT IT IS FOR. Once a file is STAGED (U29b), the officer is shown FIVE boxes that add up to the file — new to the
 * book · already in the book · repeated in this file (the FIRST row wins, OD33) · not a mobile number · could not be read
 * — and, for numbers already in the book, what each of the three choices would do, with the changed rows listed a page
 * at a time. "Nothing has been written to the book yet": ⛔ THIS MODULE WRITES NOTHING — no run write, no book row, no
 * ledger row, no stop — but ONE `contacts.import.checked` audit row (counts only) and a `contacts.import.check_refused`
 * row for a refusal. The check is advisory: the commit decides again at write time (`import-commit.ts`).
 *
 * ⭐ EVERY NUMBER ON THE SCREEN COMES FROM decide() (U31-A). The walk reads the run's staged rows by KEYSET (2,000 a page,
 * in ordinal order), keeps a RUNNING map of each number's first DECIDABLE line — lines increase with ordinals, so the
 * first seen is the smallest — and hands each page to `planImportRows` with the facts of its numbers. So a number first
 * on line 4 and again on line 31,000 is "repeated" whatever page each falls on, and an invalid or unreadable first
 * occurrence never claims a number (`firstLines`' own rule, import-decide.ts).
 *   · unreadable — the record carries a read error (X19);
 *   · invalid — a field problem (X20), a cell that yields no Tanzanian mobile (`phoneCellRefusal` — `parseTzNumber`'s
 *     sentence; for a cell of several numbers none of which is a mobile, its first number's — C3b · G3; for a cell holding
 *     two or more distinct mobiles, the words that say so — D3), or one of the sample sheet's example numbers
 *     (`SAMPLE_ROW_SENTENCE`, M2) — ⛔ the sentence never repeats the cell;
 *   · repeated — a decidable row whose number an EARLIER decidable row carries;
 *   · new — decide() creates it; in the book — anything else decide() reads (a player's number, a stopped one, an
 *     erased one disguised as the ordinary contact it reads as — X22) — ⭐ S15-2: there is NO "has an account" box.
 * The five counts must add up to the rows staged (`bucketsAdd`), or the answer is `server_error` — never a partial view.
 *
 * ⛔ D19 / X22 BY SHAPE. An answer carries masked numbers (`maskPhone`'s `+255••••NN`), line numbers, sentences, counts
 * and decide()'s browser-safe previews — never a contact id, a consent fact, a stop per row, a player flag or an erasure.
 *
 * ⭐ THE FACTS ARE THE AUTHORITY'S, NEVER A CACHE (`loadImportFacts`): the book rows behind the numbers, erased
 * tombstones included and each row's account link (`marketingContact.snapshotsAmong`), the stops in force
 * (`suppression.findActiveAmong`), each number's latest ledger word (`messagingConsent.latestAmong`) and — C8a — whether
 * an erasure STANDS on it (`messagingConsent.erasureStandsAmong`, the ONE rule of `erasure-mark.ts`: a later opt-out
 * never lifts an erasure, a GIVEN does) — §25's bulk reads, a chunk of `BULK_KEYED_READ_MAX` at a time. The commit's
 * re-decision reads the SAME loader (`import-commit.ts`). ⚠️ No account read: the accounts behind the numbers fed only the
 * consent seam S15-1 retired (X5), so `heldByPlayer` is false here (the review round's R16 — one query fewer per page);
 * a book row's own link is what keeps a player's row unchanged (S15-11). Every number asked is answered from those
 * reads; a number nobody asked about has NO facts and decide() throws on it — never a default.
 *
 * ⛔ S15-10 · ONLY A READER UPDATES THE BOOK FROM A FILE. A viewer whose identity.contact cell is not `read` (the matrix,
 * never a role name) is shown KEEP's label under all three choices, every keep folded into one count (`keepOnlyTally`),
 * `changing` zero and `mayUpdateInBook` false — and the changes pages refuse them `update_needs_reader`: "0 contacts
 * change" for a one-line file would otherwise say whether that one number is stopped or erased (OD54 · OD65).
 *
 * ⭐ THE CHANGES PAGES. The in-book rows that would change under ANY of the three choices — and (C8c · #13) every one whose
 * new tags a choice could not add because the contact is full of tags (`listedInChanges`) — in FILE order after a line,
 * `CHANGES_PAGE_ROWS` a page, each with its masked number and its preview under all three choices (D19: no contact id).
 * A page finds where to start by bisecting the keyset on the line (lines strictly increase with ordinals), reads each
 * number's first decidable line in ONE grouped read (`contactImportRow.firstLinesAmong`, S15-7), and walks at most
 * `changesWalkRows` staged rows per request — so a page can hold fewer rows than asked while `nextAfterLine` is not null.
 *
 * ⭐ C8c · N4 · BETS COME FIRST. The walk asks the bet admission queue before every page — the commit step's question,
 * asked the same way — and waits while a bet is queued, inside its own deadline (`yieldToBets`; never a second clock).
 * ⭐ C8c · #14a · A REFUSAL ROW IS BOUNDED (`refusal-audit.ts`): a "moved" is never written, any other refusal at most once
 * a minute per officer, run and reason (`auditImportRefusal`, the one writer of every refusal row here and in the commit).
 * ⛔ OWNERSHIP IS STAGING'S RULE (`mayDriveImport`, X18): the run's creator, or an ADMIN read off the STORED role.
 * ⛔ SERVER-ONLY, NO DIRECTIVE, NO ACTION. Its one caller is `import-actions.ts`, which gates and rate-limits first.
 * Guard: `test:contacts-import` (section `check`, in-process red) · `test:dal-parity` §29 (the DAL members it reads).
 */
import { db, BULK_KEYED_READ_MAX, CONTACT_IMPORT_ROW_PAGE_MAX } from "@/lib/server/store";
import type {
  ContactImportFirstLine, ContactImportFirstLinesQuery, ContactImportRowWindow, ContactImportTotals, MarketingContactSnapshot,
  StoredContactImport, StoredContactImportRow, StoredMessagingConsent, StoredSuppression,
} from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { admissionSnapshot } from "@/lib/server/admission";
import { mayReveal } from "@/lib/server/rbac";
import { IMPORT_REFUSAL_AUDIT } from "./refusal-audit";
import type { RefusalAuditGate } from "./refusal-audit";
import { IMPORT_STAGING_DEPS, STAGING_SENTENCES, isImportRunId, mayDriveImport } from "./import-staging";
import type { ContactImportView, StagingRefusal } from "./import-staging";
import { phoneCellRefusal } from "@/lib/contacts/phone-cell";
import { maskPhone } from "@/lib/phone-normalize";
import { SAMPLE_ROW_SENTENCE, isSampleMsisdn } from "@/lib/contacts/sample-sheet";
import { cleanDisplayName, holdsPhoneRun } from "@/lib/contacts/contact-fields";
import {
  IMPORT_CHOICES, SHOWN_KEEP_REASONS, addTallies, byEveryChoice, parseImportChoice, planImportRows, previewFor,
} from "@/lib/contacts/import-decide";
import type {
  DecisionPreview, FactsByNumber, ImportCandidate, ImportChoice, ImportPlan, NumberFacts, ShownKeepReason, ShownTally,
} from "@/lib/contacts/import-decide";
import { CHANGES_PAGE_ROWS, IMPORT_REFUSAL_SENTENCES, PREFLIGHT_LIST_CAP, bucketsAdd } from "@/lib/contacts/import-flow";
import type {
  ChangesPageRow, ChangesResult, ImportRefusal, ImportRefusalReason, ImportRunDecision, ImportRunView, PreflightBucket,
  PreflightResult, PreflightView,
} from "@/lib/contacts/import-flow";

/* ═══ THE PERIODS AND THE BOUNDS ═══════════════════════════════════════════════════════════════════════ */

/** How long one check — or one start's re-decision — may walk before it answers `too_slow` (nothing written either way). */
export const IMPORT_CHECK_DEADLINE_MS = 75_000;
/** How many staged rows one changes request walks at most; past it the page ends early and says where to go on. */
export const CHANGES_WALK_ROWS = 10_000;
/** ⭐ C8c · N4 · while a bet waits for an admission slot, the walk asks the queue again this often — inside its deadline. */
export const BET_YIELD_WAIT_MS = 250;
/** ⛔ A line, an ordinal and a cursor are Postgres INTEGERs (staging's review F2): a larger one is refused here. */
const INT4_MAX = 2_147_483_647;
/** Who started (or stopped) a run, when it is not the viewer and their name cannot be shown. */
export const ANOTHER_OFFICER = "another officer";
/** Who started (or stopped) a run, when it is the viewer (X18). */
export const YOU = "you";

/* ═══ THE DEPENDENCIES — swappable for the suite's in-process red plants; production never passes them ═══════════ */

/** The bulk reads `loadImportFacts` asks — §25's three, and C8a's standing erasure — the authority, never the book's
 *  caches. (R16 · the accounts behind the numbers are not read: they fed only the consent seam S15-1 retired.) */
export type ImportFactsReads = {
  snapshots: (msisdns: string[]) => Promise<MarketingContactSnapshot[]>;
  activeStops: (msisdns: string[]) => Promise<StoredSuppression[]>;
  latestWords: (msisdns: string[]) => Promise<StoredMessagingConsent[]>;
  /** ⛔ C8a · the numbers among these on which an erasure STANDS — the ONE rule (`erasure-mark.ts`), ONE grouped read. */
  erasureStands: (msisdns: string[]) => Promise<string[]>;
};

export const IMPORT_FACTS_READS: ImportFactsReads = {
  snapshots: async (msisdns) => db.marketingContact.snapshotsAmong(msisdns),
  activeStops: async (msisdns) => db.suppression.findActiveAmong({ channel: "SMS", category: "MARKETING", identifiers: msisdns }),
  latestWords: async (msisdns) => db.messagingConsent.latestAmong({ channel: "SMS", category: "MARKETING", identifiers: msisdns }),
  erasureStands: async (msisdns) => db.messagingConsent.erasureStandsAmong({ channel: "SMS", category: "MARKETING", identifiers: msisdns }),
};

/**
 * ⛔ S15-10 · THE NON-READER'S LABEL: a tally with every keep folded into `chosen_keep` — no stop, account, repeat or
 * no-change split — and no update or overwrite (a non-reader imports with KEEP alone). Built from the reasons list, so a
 * new keep reason is folded too.
 */
export function keepOnlyTally(t: ShownTally): ShownTally {
  const keepBy = Object.fromEntries(SHOWN_KEEP_REASONS.map((r) => [r, 0])) as Record<ShownKeepReason, number>;
  keepBy.chosen_keep = t.keep;
  return { create: t.create, update: 0, keep: t.keep, overwrites: 0, keepBy };
}

export type ImportCheckDeps = {
  reads: ImportFactsReads;
  findRun: (id: string) => Promise<StoredContactImport | null>;
  rowsAfter: (w: ContactImportRowWindow) => Promise<StoredContactImportRow[]>;
  firstLines: (q: ContactImportFirstLinesQuery) => Promise<ContactImportFirstLine[]>;
  totals: (importId: string) => Promise<ContactImportTotals>;
  /** X18 · an ADMIN may drive any run — staging's own reader of the STORED role. */
  isAdmin: (userId: string) => Promise<boolean>;
  /** S15-3 · S15-10 · OD54 · may this viewer read numbers? The read matrix's identity.contact cell, off the STORED role.
   *  A reader may update contacts already in the book from a file and is shown the kept rows split by reason. */
  readsNumbers: (userId: string) => Promise<boolean>;
  /** S15-10 · the label a non-reader is shown for every choice (`keepOnlyTally`). A red plant leaks the split to prove it. */
  keepOnly: (t: ShownTally) => ShownTally;
  /** The stored display name of an officer, or null. */
  userName: (userId: string) => Promise<string | null>;
  /** A list's name, or null when it is gone. */
  listName: (listId: string) => Promise<string | null>;
  /** decide() over a page — `planImportRows`, the ONE route to a count. */
  plan: typeof planImportRows;
  /** decide() under all three choices for one row — `previewFor`. */
  preview: typeof previewFor;
  /** ⭐ C8c · #13 · is this preview a changes-page row (`listedInChanges`) — the pages and the check's `listed` count. */
  listed: (p: DecisionPreview) => boolean;
  /** M2 · the sample sheet's example numbers are invalid. */
  isSample: (msisdn: string) => boolean;
  /** ⛔ D19 · the ONE mask a number leaves the server through. */
  mask: (msisdn: string) => string;
  /** The ordinal to walk AFTER so the first row read is the first one whose line is past `afterLine`. */
  locate: (importId: string, afterLine: number, stagedThrough: number, rowsAfter: ImportCheckDeps["rowsAfter"]) => Promise<number>;
  /** ⛔ OD33 · the first-line map is the WHOLE run's: carried from page to page. A red plant sets false to prove it. */
  firstLinesAcrossPages: boolean;
  audit: typeof audit;
  /** ⭐ C8c · #14a · which refusals get a row (`refusal-audit.ts`): never a "moved", at most one a minute per officer, run
   *  and reason. Production's one gate per process; a suite's own over its fixed clock. */
  refusalAudit: RefusalAuditGate;
  now: () => Date;
  deadlineMs: number;
  /** The keyset page the walk reads — one staging batch's worth. */
  windowRows: number;
  changesWalkRows: number;
  /** ⭐ Bets come first: how many bets wait for an admission slot right now (`admissionSnapshot`) — the commit step's own
   *  question, asked by the walk between pages too (C8c · N4). */
  queueDepth: () => number;
  /** C8c · N4 · wait this long (ms) — the walk's only timer: what it waits by is always `now` against its one deadline. */
  pause: (ms: number) => Promise<void>;
  /** C8c · N4 · how long the walk waits before it asks the bet queue again. */
  betWaitMs: number;
};

/* ═══ THE ONE BISECTION — where a changes page starts ═════════════════════════════════════════════════ */

/**
 * The smallest ordinal whose row (the first row AT or after it — erasure can leave a gap) has a line past `afterLine`,
 * less one: the `afterOrdinal` a keyset walk starts from. ⭐ Lines strictly increase with ordinals (staging holds the
 * file's order), so "the first row from here on is past the line" is monotone and a bisection finds it in ~18 one-row
 * reads for 200,000 rows — never a walk from the file's top for every page.
 */
export async function firstOrdinalAfterLine(
  importId: string, afterLine: number, stagedThrough: number, rowsAfter: ImportCheckDeps["rowsAfter"],
): Promise<number> {
  if (afterLine <= 0) return 0;
  let lo = 1;
  let hi = stagedThrough + 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const [probe] = await rowsAfter({ importId, afterOrdinal: mid - 1, limit: 1 });
    if (probe === undefined || probe.line > afterLine) hi = mid;
    else lo = mid + 1;
  }
  return lo - 1;
}

export const IMPORT_CHECK_DEPS: ImportCheckDeps = {
  reads: IMPORT_FACTS_READS,
  findRun: async (id) => db.contactImport.find(id),
  rowsAfter: async (w) => db.contactImportRow.after(w),
  firstLines: async (q) => db.contactImportRow.firstLinesAmong(q),
  totals: async (importId) => db.contactImport.totals(importId),
  isAdmin: IMPORT_STAGING_DEPS.isAdmin,
  readsNumbers: async (userId) => {
    const role = (await db.user.findById(userId))?.role;
    return role ? mayReveal(role, "identity.contact") : false;
  },
  keepOnly: keepOnlyTally,
  userName: async (userId) => (await db.user.findById(userId))?.displayName ?? null,
  listName: async (listId) => (await db.contactList.find(listId))?.name ?? null,
  plan: planImportRows,
  preview: previewFor,
  listed: listedInChanges,
  isSample: isSampleMsisdn,
  mask: (msisdn) => maskPhone(msisdn),
  locate: firstOrdinalAfterLine,
  firstLinesAcrossPages: true,
  audit,
  refusalAudit: IMPORT_REFUSAL_AUDIT,
  now: () => new Date(),
  deadlineMs: IMPORT_CHECK_DEADLINE_MS,
  windowRows: CONTACT_IMPORT_ROW_PAGE_MAX,
  changesWalkRows: CHANGES_WALK_ROWS,
  queueDepth: () => admissionSnapshot().queueDepth,
  pause: (ms) => new Promise<void>((resolve) => { setTimeout(resolve, ms); }),
  betWaitMs: BET_YIELD_WAIT_MS,
};

/* ═══ THE FACTS — the authority's, per number ════════════════════════════════════════════════════════ */

/**
 * ⭐ THE FACTS LOADER (U31-B). Every distinct number asked is answered from four bulk reads, a chunk of
 * `BULK_KEYED_READ_MAX` at a time, one read after another (bets come first: never four connections at once): its book
 * row — the erased tombstone INCLUDED, so an erased number reads as in the book (X22), and the row's account link
 * (S15-11) — whether a stop is in force, its latest ledger word, and (C8a) whether an erasure STANDS on it by the ONE
 * rule — so a number with no book row whose marker an opt-out tap has since covered still reads erased, and a number an
 * opted-out person is erased on carries the marker `erase.ts` now writes over an opt-out too. `heldByPlayer` is false:
 * the account read fed only the consent seam S15-1 retired (R16). ⛔ A number that was not asked about is absent, and
 * decide() throws on it: there is no default.
 */
export async function loadImportFacts(msisdns: readonly string[], reads: ImportFactsReads = IMPORT_FACTS_READS): Promise<FactsByNumber> {
  const keys = Array.from(new Set(msisdns));
  const out = new Map<string, NumberFacts>();
  for (let at = 0; at < keys.length; at += BULK_KEYED_READ_MAX) {
    const chunk = keys.slice(at, at + BULK_KEYED_READ_MAX);
    const book = new Map<string, MarketingContactSnapshot>();
    for (const row of await reads.snapshots(chunk)) book.set(row.msisdn, row);
    const stopped = new Set<string>();
    for (const stop of await reads.activeStops(chunk)) stopped.add(stop.identifier);
    const latest = new Map<string, StoredMessagingConsent>();
    for (const word of await reads.latestWords(chunk)) latest.set(word.identifier, word);
    const erased = new Set(await reads.erasureStands(chunk));
    for (const m of chunk) {
      const row = book.get(m);
      const word = latest.get(m);
      out.set(m, {
        book: row === undefined ? null : {
          id: row.id, displayName: row.displayName, email: row.email, notes: row.notes, tags: [...row.tags],
          sourceRef: row.sourceRef, importId: row.importId, updatedAt: row.updatedAt, userId: row.userId,
        },
        suppressed: stopped.has(m),
        ledgerLatest: word === undefined ? null : { status: word.status, evidence: word.evidence },
        erasureStands: erased.has(m),
        heldByPlayer: false,
      });
    }
  }
  return out;
}

/* ═══ ONE STAGED ROW, CLASSIFIED ═════════════════════════════════════════════════════════════════════ */

/** What a staged row is to the check and the commit. A decidable row carries decide()'s candidate. */
export type StagedRowClass =
  | { kind: "unreadable"; line: number; sentence: string }
  | { kind: "invalid"; line: number; sentence: string }
  | { kind: "decidable"; line: number; msisdn: string; candidate: ImportCandidate };

/**
 * ⭐ THE ONE CLASSIFIER — the check's buckets and the commit's `fail('invalid')` read it, so the two cannot disagree.
 * A read error (X19) → unreadable; a field problem (X20) → invalid with its sentence; no number → invalid with the
 * ONE phone-cell rule's sentence for the cell (`phoneCellRefusal`: `parseTzNumber`'s, or — C3b · G3 — for a cell of
 * several numbers none of which is a Tanzanian mobile, its first number's, and — D3 — for a cell holding two or more
 * distinct mobiles, `SEVERAL_MOBILES_SENTENCE`); a sample-sheet number (M2) → invalid with
 * `SAMPLE_ROW_SENTENCE`; else decidable. ⛔ Every sentence names the problem, never the cell. The key itself is staging's
 * (`stagedRowFrom`, through the same rule's `firstMobileIn`) — never derived again here.
 */
export function classifyStagedRow(row: StoredContactImportRow, isSample: (msisdn: string) => boolean): StagedRowClass {
  if (row.readError !== null) return { kind: "unreadable", line: row.line, sentence: row.readError };
  const problem = row.problems[0];
  if (problem !== undefined) return { kind: "invalid", line: row.line, sentence: problem.sentence };
  if (row.msisdn === null || row.msisdn === "") return { kind: "invalid", line: row.line, sentence: phoneCellRefusal(row.rawPhone) };
  if (isSample(row.msisdn)) return { kind: "invalid", line: row.line, sentence: SAMPLE_ROW_SENTENCE };
  return {
    kind: "decidable",
    line: row.line,
    msisdn: row.msisdn,
    candidate: { line: row.line, msisdn: row.msisdn, displayName: row.displayName, email: row.email, notes: row.notes, tags: [...row.tags] },
  };
}

/* ═══ THE WALK — every staged row of a run, a keyset page at a time, with decide()'s plan per page ═════════════ */

/** One page of the walk: its rows, their classes, the decidable rows' candidates and decide()'s plan for them
 *  (`plan.previews[i]` is `candidates[i]`'s), and the first-line map as it stands after this page. */
export type RunWalkPage = {
  rows: readonly StoredContactImportRow[];
  classes: readonly StagedRowClass[];
  candidates: readonly ImportCandidate[];
  plan: ImportPlan;
  firstLines: ReadonlyMap<string, number>;
};

/**
 * ⭐ C8c · N4 · BETS COME FIRST BETWEEN THE WALK'S PAGES TOO. The commit step asks the admission queue before it writes and
 * refuses `busy` while a bet waits (`import-commit.ts`); the walk — the check's and the start's, a 200,000-row run is ~100
 * page reads, each with four bulk fact reads — never asked, so a big check competed with bets for the database. Now,
 * before every page, it asks THE SAME QUEUE THE SAME WAY (`queueDepth`, admission's own count) and, while a bet waits,
 * WAITS (`betWaitMs` at a time) and asks again. ⛔ NEVER A SECOND CLOCK: the wait is measured by the walk's own `now`
 * against its own deadline, so a check that bets keep waiting past its deadline answers `too_slow` exactly as a slow one
 * does (nothing written either way — the officer checks again). True when the queue is clear; false when the deadline
 * passed while bets waited.
 */
export async function yieldToBets(
  deps: Pick<ImportCheckDeps, "queueDepth" | "pause" | "now" | "betWaitMs">, deadline: number,
): Promise<boolean> {
  while (deps.queueDepth() > 0) {
    if (deps.now().getTime() > deadline) return false;
    await deps.pause(deps.betWaitMs);
  }
  return true;
}

/**
 * ⭐ THE ONE WALK — the check's and the start's. Pages of `windowRows` staged rows in ordinal order; the running map of
 * each number's first DECIDABLE line, updated BEFORE the page is decided (the first row of a number on this page maps
 * to itself, so decide() calls it first); the facts of the page's numbers; decide() under all three choices. A deadline
 * passed between pages answers "too_slow" — nothing is ever written, so stopping is free. ⭐ C8c · N4 · before every page
 * the walk yields to queued bets (`yieldToBets`), inside the same deadline.
 */
export async function walkStagedRun(
  run: StoredContactImport, deps: ImportCheckDeps, deadline: number, visit: (page: RunWalkPage) => void,
): Promise<"done" | "too_slow"> {
  const running = new Map<string, number>();
  const pageRows = keysetPageRows(deps.windowRows);
  let after = 0;
  for (;;) {
    if (deps.now().getTime() > deadline) return "too_slow";
    if (!(await yieldToBets(deps, deadline))) return "too_slow";
    const rows = await deps.rowsAfter({ importId: run.id, afterOrdinal: after, limit: pageRows });
    if (rows.length === 0) return "done";
    const first = deps.firstLinesAcrossPages ? running : new Map<string, number>();
    const classes = rows.map((row) => classifyStagedRow(row, deps.isSample));
    const candidates: ImportCandidate[] = [];
    for (const c of classes) {
      if (c.kind !== "decidable") continue;
      if (!first.has(c.msisdn)) first.set(c.msisdn, c.line);
      candidates.push(c.candidate);
    }
    const facts = await loadImportFacts(candidates.map((c) => c.msisdn), deps.reads);
    if (deps.now().getTime() > deadline) return "too_slow";
    const plan = deps.plan({ runId: run.id, candidates, facts, firstLines: first });
    if (plan.previews.length !== candidates.length) throw new Error("walkStagedRun: decide() did not answer every decidable row");
    visit({ rows, classes, candidates, plan, firstLines: first });
    after = rows[rows.length - 1].ordinal;
    if (rows.length < pageRows) return "done";
  }
}

/**
 * ⛔ THE PAGE ASKED FOR IS THE PAGE THE STORE GIVES: both twins clamp a keyset page at `CONTACT_IMPORT_ROW_PAGE_MAX`, so a
 * walk that asked for more and read "fewer than asked" as THE END would stop 2,000 rows into the file. Every walk here —
 * the check's, the start's, a changes page's and a commit step's — asks for a page no larger than the store hands back.
 */
export function keysetPageRows(asked: number): number {
  return Math.max(1, Math.min(Math.floor(asked), CONTACT_IMPORT_ROW_PAGE_MAX));
}

/* ═══ THE RUN AS THE BROWSER SEES IT ═════════════════════════════════════════════════════════════════ */

/** The deps a view needs — a subset every caller's deps satisfy. */
export type ImportViewDeps = Pick<ImportCheckDeps, "findRun" | "totals" | "userName" | "listName">;

/**
 * Who started or stopped a run, as the screen names them (X18): "you", their stored display name, or "another officer"
 * — ⛔ never an id, and never a name that holds a phone number (a name prints in full to every role).
 */
export async function officerLabel(viewerId: string, userId: string | null, deps: Pick<ImportCheckDeps, "userName">): Promise<string | null> {
  if (userId === null) return null;
  if (userId === viewerId) return YOU;
  const name = cleanDisplayName((await deps.userName(userId)) ?? "");
  return name === null || holdsPhoneRun(name) ? ANOTHER_OFFICER : name;
}

/** The frozen decision as the screen shows it (a resumed or finished run): the choice, how many rows were excepted,
 *  and the list by name. Null before the start. */
async function decisionOf(run: StoredContactImport, deps: Pick<ImportCheckDeps, "listName">): Promise<ImportRunDecision | null> {
  const choice = parseImportChoice(run.decisionChoice);
  if (choice === null) return null;
  const exceptions = Object.keys(run.decisionOverrides ?? {}).length;
  const listId = run.targetListId ?? null;
  return { choice, exceptions, listName: listId === null ? null : await deps.listName(listId) };
}

/** ⭐ A stored run → `ImportRunView`, its totals COUNTED from its rows now (OD26). */
export async function importRunView(viewerId: string, run: StoredContactImport, deps: ImportViewDeps = IMPORT_CHECK_DEPS): Promise<ImportRunView> {
  const totals = await deps.totals(run.id);
  return {
    id: run.id,
    status: run.status,
    format: run.format,
    fileName: run.fileName,
    fileDigest: run.fileDigest,
    mapping: { ...run.mapping },
    totalRows: run.totalRows,
    unreadable: run.unreadable,
    stagedThrough: run.stagedThrough,
    committedThrough: run.committedThrough,
    nextFrom: run.status === "STAGING" ? run.stagedThrough + 1 : null,
    totals: { ...totals },
    startedBy: (await officerLabel(viewerId, run.createdBy, deps)) ?? ANOTHER_OFFICER,
    mine: run.createdBy === viewerId,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    pausedAt: run.pausedAt,
    pausedBy: await officerLabel(viewerId, run.pausedBy, deps),
    finishedAt: run.finishedAt,
    decision: await decisionOf(run, deps),
  };
}

/** ⭐ Staging's view (U29b) → `ImportRunView`: its counted totals kept, the starter named, and — once the run has started
 *  — the frozen decision read off the run row. */
export async function importRunViewOf(viewerId: string, view: ContactImportView, deps: ImportViewDeps = IMPORT_CHECK_DEPS): Promise<ImportRunView> {
  const run = view.status === "STAGING" || view.status === "STAGED" ? null : await deps.findRun(view.id);
  return {
    id: view.id,
    status: view.status,
    format: view.format,
    fileName: view.fileName,
    fileDigest: view.fileDigest,
    mapping: { ...view.mapping },
    totalRows: view.totalRows,
    unreadable: view.unreadable,
    stagedThrough: view.stagedThrough,
    committedThrough: view.committedThrough,
    nextFrom: view.nextFrom,
    totals: { ...view.totals },
    startedBy: (await officerLabel(viewerId, view.createdBy, deps)) ?? ANOTHER_OFFICER,
    mine: view.mine,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
    pausedAt: view.pausedAt,
    pausedBy: await officerLabel(viewerId, view.pausedBy, deps),
    finishedAt: view.finishedAt,
    decision: run === null ? null : await decisionOf(run, deps),
  };
}

/* ═══ THE REFUSALS — one shape, one sentence each ═════════════════════════════════════════════════════ */

/** The sentence for a reason this module or `import-commit.ts` refuses with — staging's own words for the three it
 *  shares with staging, the contract's table for the rest. ⛔ None quotes a cell, a number or a file name. */
export function importRefusalSentence(reason: ImportRefusalReason): string {
  switch (reason) {
    case "not_found": return STAGING_SENTENCES.notFound;
    case "not_yours": return STAGING_SENTENCES.notYours;
    case "bad_request": return STAGING_SENTENCES.badRequest;
    case "forbidden": case "rate_limited": case "server_error": case "xlsx_busy": case "not_staged": case "too_slow":
    case "bad_choice": case "bad_exceptions": case "bad_list": case "list_name_taken": case "list_gone": case "already_started":
    case "check_again": case "check_stale": case "update_needs_reader": case "paused": case "cancelled": case "done":
    case "moved": case "busy": case "db_paused":
      return IMPORT_REFUSAL_SENTENCES[reason];
    default:
      return IMPORT_REFUSAL_SENTENCES.server_error;
  }
}

/** A refusal in the contract's shape. `message` defaults to the reason's own sentence. */
export function importRefusal(
  reason: ImportRefusalReason, view: ImportRunView | null = null, message: string = importRefusalSentence(reason), retryAfterSec?: number,
): ImportRefusal {
  return retryAfterSec === undefined ? { ok: false, reason, message, view } : { ok: false, reason, message, view, retryAfterSec };
}

/** ⭐ Staging's refusal (U29b) passed through BY NAME with its OWN sentence; its view mapped. */
export async function importRefusalOf(viewerId: string, r: StagingRefusal, deps: ImportViewDeps = IMPORT_CHECK_DEPS): Promise<ImportRefusal> {
  return { ok: false, reason: r.reason, message: r.message, view: r.view === null ? null : await importRunViewOf(viewerId, r.view, deps) };
}

/**
 * The audit row of a refusal — ⛔ ids, counts and the reason: never a number, a name, a cell or the file's name (X23).
 * ⭐ C8c · #14a · BOUNDED (`refusal-audit.ts`): a "moved" is never written, and any other refusal at most once a minute for
 * one officer, one run and one reason — the next row written for that key carries how many it stands for (`repeats`).
 */
export async function auditImportRefusal(
  deps: Pick<ImportCheckDeps, "audit" | "refusalAudit">, action: string, officerId: string, importId: string | null, reason: ImportRefusalReason,
  detail: Record<string, number | string | boolean> = {},
): Promise<void> {
  const verdict = deps.refusalAudit.admit({ action, officerId, importId, reason });
  if (!verdict.write) return;
  await deps.audit({
    category: "ADMIN", action, actorId: officerId, targetType: "ContactImport", targetId: importId,
    payload: verdict.repeats > 0 ? { reason, ...detail, repeats: verdict.repeats } : { reason, ...detail },
  });
}

/** A run the officer may drive — found, and theirs or an ADMIN's (X18) — or the refusal, audited. Only a WELL-FORMED
 *  run id ever reaches an audit row (staging's review F1). */
export async function openImportRun(
  officerId: string, runId: unknown, deps: Pick<ImportCheckDeps, "findRun" | "isAdmin" | "audit" | "refusalAudit">, refusedAction: string,
): Promise<{ ok: true; run: StoredContactImport } | { ok: false; refusal: ImportRefusal }> {
  const run = isImportRunId(runId) ? await deps.findRun(runId) : null;
  if (run === null) {
    await auditImportRefusal(deps, refusedAction, officerId, null, "not_found");
    return { ok: false, refusal: importRefusal("not_found") };
  }
  if (!(await mayDriveImport(run.createdBy, officerId, deps.isAdmin))) {
    await auditImportRefusal(deps, refusedAction, officerId, run.id, "not_yours");
    return { ok: false, refusal: importRefusal("not_yours") };
  }
  return { ok: true, run };
}

/* ═══ SMALL READERS ═════════════════════════════════════════════════════════════════════════════════ */

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** A posted body as a bag of unknowns — never trusted to be the shape the dialog meant to send. */
export const bagOf = (v: unknown): Record<string, unknown> => (isRecord(v) ? v : {});
/** A line or a cursor as a request carries it: a whole number from 0 within Postgres' INTEGER. */
export const isRowCursor = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= INT4_MAX;

/* ═══ THE CHECK ═════════════════════════════════════════════════════════════════════════════════════ */

const CHECK_REFUSED = "contacts.import.check_refused";

/** Why a run that is not STAGED cannot be checked (or paged for its changes). */
function notCheckable(run: StoredContactImport): ImportRefusalReason {
  if (run.status === "STAGING") return "not_staged";
  if (run.status === "DONE") return "done";
  if (run.status === "CANCELLED") return "cancelled";
  return "already_started";
}

type Listed<T> = { total: number; rows: T[] };
const listed = <T>(): Listed<T> => ({ total: 0, rows: [] });
const push = <T>(l: Listed<T>, row: T): void => {
  l.total++;
  if (l.rows.length < PREFLIGHT_LIST_CAP) l.rows.push(row);
};

/**
 * ⭐ THE CHECK (U30) — the five boxes, the three choices' labels and how many in-book rows each would change, over the
 * WHOLE staged run. ⛔ Writes nothing but its audit row; a run that is not STAGED is refused by name; a walk past the
 * deadline is `too_slow`; five counts that do not add up to the rows are `server_error`, never a partial view.
 * ⛔ S15-10 · `mayUpdateInBook` is the viewer's identity.contact cell; for a non-reader the three labels are KEEP's, every
 * keep one count, and nothing changes — the same answer whatever the book says about any one number in the file.
 */
export async function checkContactImport(officerId: string, runId: unknown, deps: ImportCheckDeps = IMPORT_CHECK_DEPS): Promise<PreflightResult> {
  const startedAt = deps.now().getTime();
  const opened = await openImportRun(officerId, runId, deps, CHECK_REFUSED);
  if (!opened.ok) return opened.refusal;
  const run = opened.run;
  if (run.status !== "STAGED") {
    const reason = notCheckable(run);
    await auditImportRefusal(deps, CHECK_REFUSED, officerId, run.id, reason);
    return importRefusal(reason, await importRunView(officerId, run, deps));
  }

  // ⛔ S15-10 · asked once, off the matrix: a viewer who may not read numbers is shown KEEP's label alone (below).
  const mayUpdateInBook = await deps.readsNumbers(officerId);
  const counts: Record<PreflightBucket, number> = { new: 0, inBook: 0, repeated: 0, invalid: 0, unreadable: 0 };
  const invalid = listed<{ line: number; sentence: string }>();
  const unreadable = listed<{ line: number; sentence: string }>();
  const repeated = listed<{ line: number; firstLine: number; masked: string }>();
  const zeroKeepBy = (): Record<ShownKeepReason, number> => Object.fromEntries(SHOWN_KEEP_REASONS.map((r) => [r, 0])) as Record<ShownKeepReason, number>;
  let byChoice: Record<ImportChoice, ShownTally> = byEveryChoice((): ShownTally => ({
    create: 0, update: 0, keep: 0, overwrites: 0, keepBy: zeroKeepBy(),
  }));
  const changing: Record<ImportChoice, number> = byEveryChoice(() => 0);
  let listedRows = 0;
  let rows = 0;
  let broken = false;

  const walked = await walkStagedRun(run, deps, startedAt + deps.deadlineMs, (page) => {
    rows += page.rows.length;
    let j = 0;
    for (const c of page.classes) {
      if (c.kind === "unreadable") {
        counts.unreadable++;
        push(unreadable, { line: c.line, sentence: c.sentence });
        continue;
      }
      if (c.kind === "invalid") {
        counts.invalid++;
        push(invalid, { line: c.line, sentence: c.sentence });
        continue;
      }
      const preview: DecisionPreview | undefined = page.plan.previews[j];
      j++;
      const firstLine = page.firstLines.get(c.msisdn);
      if (preview === undefined || firstLine === undefined) {
        broken = true;
        continue;
      }
      if (firstLine < c.line) {
        counts.repeated++;
        push(repeated, { line: c.line, firstLine, masked: deps.mask(c.msisdn) });
      } else if (preview.kind === "create") {
        counts.new++;
      } else {
        counts.inBook++;
        if (preview.kind === "inBook") {
          for (const ch of IMPORT_CHOICES) if (preview.byChoice[ch].kind === "update") changing[ch]++;
          // ⭐ C8c · #13 · the changes pages' own rule, counted — the panel's total is the list it reads.
          if (deps.listed(preview)) listedRows++;
        }
      }
    }
    byChoice = byEveryChoice((ch) => addTallies(byChoice[ch], page.plan.byChoice[ch]) as ShownTally);
  });

  if (walked === "too_slow") {
    await auditImportRefusal(deps, CHECK_REFUSED, officerId, run.id, "too_slow", { rows, ms: deps.now().getTime() - startedAt });
    return importRefusal("too_slow", await importRunView(officerId, run, deps));
  }
  if (broken || !bucketsAdd({ rows, counts })) {
    // ⛔ Never a partial view: five boxes that do not add up to the file are not shown at all.
    await auditImportRefusal(deps, CHECK_REFUSED, officerId, run.id, "server_error", { rows, buckets: Object.values(counts).reduce((a, b) => a + b, 0) });
    return importRefusal("server_error", await importRunView(officerId, run, deps));
  }

  // ⛔ S15-10 · a non-reader's label: KEEP's, under every choice, every keep one count — and nothing changing.
  const keepOnly = deps.keepOnly(byChoice.KEEP);
  const preflight: PreflightView = {
    runId: run.id,
    rows,
    counts: { ...counts },
    invalid,
    unreadable,
    repeated,
    byChoice: mayUpdateInBook ? byChoice : byEveryChoice(() => ({ ...keepOnly, keepBy: { ...keepOnly.keepBy } })),
    changing: mayUpdateInBook ? changing : byEveryChoice(() => 0),
    checkedAt: deps.now().toISOString(),
    // ⛔ S15-10 · a viewer who may not update the book is listed no per-row change at all.
    listed: mayUpdateInBook ? listedRows : 0,
    mayUpdateInBook,
  };
  await deps.audit({
    category: "ADMIN", action: "contacts.import.checked", actorId: officerId, targetType: "ContactImport", targetId: run.id,
    payload: { rows, ...counts, ms: deps.now().getTime() - startedAt },
  });
  return { ok: true, preflight, view: await importRunView(officerId, run, deps) };
}

/* ═══ THE CHANGES — in-book rows a choice would change, a page at a time ════════════════════════════════════ */

/**
 * ⭐ C8c · #13 · THE ONE RULE FOR A CHANGES-PAGE ROW — the check's `listed` count and the pages themselves ask it, so the
 * total the panel shows is the list it reads: a row in the book that some choice would UPDATE, or whose new tags some
 * choice could not add (the contact already holds the most tags a contact can have — decide() keeps it `no_change` and
 * lists the tags, `tagsNotAdded`, as its header promises: "listed, never silently dropped").
 */
export function listedInChanges(p: DecisionPreview): boolean {
  return p.kind === "inBook" && IMPORT_CHOICES.some((ch) => p.byChoice[ch].kind === "update" || p.byChoice[ch].tagsNotAdded.length > 0);
}

/**
 * ⭐ ONE PAGE OF CHANGES, in FILE order after `afterLine`: every decidable, first-occurrence row that is in the book and
 * that at least one of the three choices would UPDATE — or (C8c · #13) leave new tags out of, the contact being full of
 * tags (`listedInChanges`) — with its masked number and its preview under all three (D19: no
 * contact id; X22: an erased number is previewed as the contact it reads as, which never changes). The first decidable
 * line of each number comes from ONE grouped read of the WHOLE run (S15-7), so a repeat on this page whose first row sits
 * pages earlier is never listed. ⛔ Writes nothing, and audits only a refusal.
 */
export async function contactImportChanges(officerId: string, input: unknown, deps: ImportCheckDeps = IMPORT_CHECK_DEPS): Promise<ChangesResult> {
  const body = bagOf(input);
  const afterLine = body.afterLine;
  if (!isRowCursor(afterLine)) {
    await auditImportRefusal(deps, CHECK_REFUSED, officerId, null, "bad_request");
    return importRefusal("bad_request");
  }
  const opened = await openImportRun(officerId, body.runId, deps, CHECK_REFUSED);
  if (!opened.ok) return opened.refusal;
  const run = opened.run;
  // ⛔ S15-10 · the changes are a reader's: for anyone else every contact in the book is kept, and a page of what WOULD
  // change is exactly the per-person fact OD54 keeps from them.
  if (!(await deps.readsNumbers(officerId))) {
    await auditImportRefusal(deps, CHECK_REFUSED, officerId, run.id, "update_needs_reader");
    return importRefusal("update_needs_reader", await importRunView(officerId, run, deps));
  }
  if (run.status !== "STAGED") {
    const reason = notCheckable(run);
    await auditImportRefusal(deps, CHECK_REFUSED, officerId, run.id, reason);
    return importRefusal(reason, await importRunView(officerId, run, deps));
  }

  const found: ChangesPageRow[] = [];
  const pageRows = keysetPageRows(deps.windowRows);
  let after = await deps.locate(run.id, afterLine, run.stagedThrough, deps.rowsAfter);
  let walked = 0;
  let lastLine = afterLine;
  for (;;) {
    const window = await deps.rowsAfter({ importId: run.id, afterOrdinal: after, limit: pageRows });
    if (window.length === 0) return { ok: true, page: { rows: found, nextAfterLine: null } };
    const classes = window.map((row) => classifyStagedRow(row, deps.isSample));
    const numbers = Array.from(new Set(classes.flatMap((c) => (c.kind === "decidable" ? [c.msisdn] : []))));
    const first = new Map<string, number>();
    for (const f of await deps.firstLines({ importId: run.id, msisdns: numbers })) first.set(f.msisdn, f.line);
    const facts = await loadImportFacts(numbers, deps.reads);
    for (const c of classes) {
      walked++;
      lastLine = c.line;
      if (c.kind !== "decidable") continue;
      const firstLine = first.get(c.msisdn);
      const f = facts.get(c.msisdn);
      // ⛔ Never a guess: a decidable row is its own number's first line at worst.
      if (firstLine === undefined || firstLine > c.line || f === undefined) throw new Error("contactImportChanges: a decidable row has no first line or no facts");
      if (firstLine < c.line) continue;
      const preview = deps.preview(c.candidate, { ...f, repeatOf: null }, run.id);
      // ⭐ C8c · #13 · a row some choice updates — or whose new tags a full contact cannot take (`listedInChanges`).
      if (preview.kind !== "inBook" || !deps.listed(preview)) continue;
      found.push({ line: c.line, masked: deps.mask(c.msisdn), preview });
      if (found.length >= CHANGES_PAGE_ROWS) return { ok: true, page: { rows: found, nextAfterLine: c.line } };
    }
    after = window[window.length - 1].ordinal;
    if (window.length < pageRows) return { ok: true, page: { rows: found, nextAfterLine: null } };
    if (walked >= deps.changesWalkRows) return { ok: true, page: { rows: found, nextAfterLine: lastLine } };
  }
}
