/**
 * ⭐ C8b (B8) · "ADDED" IS WHEN THE ROW ENTERED THE BOOK — the audited door that puts right the rows the backfill of
 * 2026-10-03 dated with each client's SIGN-UP. Run as `ops:contacts-added-redate` (`scripts/ops/contacts-added-redate.mts`),
 * which has no logic of its own: every decision is made here.
 *
 * ⭐ THE RULING (Ali, 2026-10-09, question 3 (a) — `docs/COMPLIANCE-DECISIONS.md` § "2026-10-09 · An erased number stays
 * blocked, a test SMS to a typed number is for Admin and Compliance, and the back-filled contacts are re-dated"): "The 54
 * contacts back-filled on 2026-10-03 are re-dated 'Added 3 Oct 2026' — a production data fix through an audited door, so
 * the 'Added' date never tells a masked officer who is a player."
 *
 * 🔴 THE DEFECT IT PUTS RIGHT. Until C8b the registration writer (`registration-contact.ts`) gave each client's row the
 * ACCOUNT's own `createdAt` as "Added". At sign-up the two instants are milliseconds apart; the backfill (STEP 23, the day
 * the writer went live — 2026-10-03 12:22:46 UTC) reached clients who had signed up long before, so each of its rows says
 * the day that person signed up, before the book had any writer at all, and a masked officer reads it off the Added
 * column, its sort, the `?to=` window, the edit dialog and the masked export. C8b's writer takes the clock, so every NEW
 * row is right; this door puts the old ones right, once.
 *
 * ⭐ WHICH ROWS — found from the code that wrote them and the shape it left, never from a list typed by hand. A live row
 * of the book (the erased tombstone is in no audience, C3) is RE-DATED when all four hold:
 *   · its source is REGISTRATION and its provenance is its link — `userId` set, `sourceRef` the same account
 *     (`registrationRow`'s shape; no other writer makes a REGISTRATION row);
 *   · the writer's OWN record of the write — the SYSTEM `contacts.contact.registered` row (or, since C8b, `.revived`) it
 *     left on `MarketingContact#<this id>`, naming THIS account in `payload.account`, the earliest if there were several —
 *     says `via: "backfill"`;
 *   · its "Added" is EXACTLY its account's `createdAt`, compared as instants (the old writer's `registrationInstant`);
 *   · and that "Added" is EARLIER than the record.
 * Its new "Added" is the record's own instant: the moment the backfill wrote it, as the clock of the process that ran it
 * stamped it — the same write, so for the run of 2026-10-03 the EAT day is that one, which is what Ali approved.
 * ⛔ EVERY OTHER LINKED SIGN-UP ROW IS LEFT, and counted: a row the sign-up itself wrote (its record says `via: "signup"`:
 * its "Added" IS when it entered the book); a row already right (re-dated before, or written by C8b's clock); a row whose
 * record cannot be found or read, or whose account cannot be — NEVER an instant invented for it: counted, so the
 * developer is told; and a row whose provenance is not its link.
 *
 * ⛔ STATUS ONLY READS, and prints counts and EAT days — never an id, a number or a name — and the exact apply line.
 * ⛔ APPLY, in this order, and every refusal before the record writes nothing at all:
 *   1 · `by` and `reason` screened (`screenOpsText`, and six numerals across the two) → bad_ops_text;
 *   2 · a database → no_database (exit 2);
 *   3 · `--expect` a whole number → bad_expect;
 *   4 · the rows read again, by the same rule as status → unreadable;
 *   5 · their count is the one `--expect` names → expect_mismatch: Ali approves a NUMBER that status printed, and a book
 *       that moved since is never written to a count nobody saw;
 *   6 · none to re-date → NOTHING TO DO (exit 0, nothing written, nothing recorded) — so the door is IDEMPOTENT: a re-dated
 *       row is no longer earlier than its record, and a second apply finds nothing;
 *   7 · more rows than one write takes (`ADDED_REDATE_MAX`) → too_many: refused, never cut;
 *   8 · ⛔ RECORD FIRST — COMPLIANCE `contacts.added_redate_applying`, awaited, with every row's id and its "Added" before
 *       and after, so the change can be read, and undone, from the record alone; not recorded → record_failed;
 *   9 · THE ONE WRITE — `marketingContact.redateAdded`: all or nothing (ONE transaction on Postgres), each row only while its
 *       "Added" is still the one read → `changed`: recorded `_refused`, NOTHING was written, run status again; a write
 *       that throws → recorded `_failed` (whether it committed is not known: run status, never apply again blind);
 *  10 · READ BACK, fresh — every row's "Added" is its new instant and its `updatedAt` is not before it → else recorded
 *       `_failed` (read_back_mismatch);
 *  11 · `contacts.added_redate_applied` recorded, the queue flushed with nothing left pending → DONE (exit 0), else
 *       done_unconfirmed (exit 1: written, but its record was not confirmed — tell the developer).
 * ⛔ WHAT IT WRITES: `createdAt`, and `updatedAt` only where it is earlier than the new "Added" (the backfill copied the
 * sign-up into both, and a row never reads as changed before it was added; an officer's later edit stands). `updatedBy`,
 * every field an officer typed, the link and the lists are untouched. An officer's edit dialog open on such a row at that
 * moment is refused as changed and reloads — apply at a quiet time.
 * ⛔ THE RECORD READER IS HANDED IN (`addedRedateDeps`): this module calls no audit-row reader of its own, so the console
 * guard that classifies every such caller in `src/` (`test:house-bot-reports` 0.260.1) has nothing new to classify — the
 * owner-save door's rule.
 * ⛔ ITS OWN ROWS ARE COMPLIANCE, so the /admin overview feed shows them to compliance readers only
 * (`admin-overview-feed.ts`). They name contact ids and instants — never a number, a name or an email — and a write's
 * error by its name and code, never its message.
 *
 * Guard: `npm run test:registration-contact` §7 (executed on the memory twin; red: `npm run red:registration-contact`) ·
 * on Postgres, `scripts/live/registration-contact-pg-probe.mts` §6 (db-scratch, run by the integrator).
 */
import { audit, auditFlush, auditPending } from "@/lib/server/audit";
import { hasDatabase } from "@/lib/server/prisma";
import { db } from "@/lib/server/store";
import type {
  ContactAddedRedate, ContactAddedRedateResult, ContactSource, ContactWalk, StoredMarketingContact, StoredUser,
} from "@/lib/server/store";
import { WHOLE_BOOK, contactAudience } from "@/lib/server/marketing/audience";
import type { ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { opsClockProblem, readDatabaseClockMs, screenOpsText } from "@/lib/server/marketing/live-switch";
import { ADDED_REDATE_MAX } from "@/lib/server/contacts/added-redate-model";
import { eatDayKey } from "@/lib/eat-day";

/** The door's CLI loads ONE module after its proxy rewrite: the database check and the clock rule come through here. */
export { hasDatabase, opsClockProblem, readDatabaseClockMs };

/* ⛔ No pattern or text in this file holds a backslash (the owner-save door's rule): the one Unicode class is built from
   its code. */
const BACKSLASH = String.fromCharCode(92);
/** Every numeric character in any script — `screenOpsText`'s own count, held across `by` and `reason` together. */
const ANY_NUMERAL = new RegExp(`${BACKSLASH}p{N}`, "gu");
const numeralsIn = (t: string): number => (t.match(ANY_NUMERAL) ?? []).length;
/** At most six numerals across `by` and `reason` together — the live switch door's rule: no phone number, no date. */
const MAX_OPS_NUMERALS = 6;
/** `--expect`: a whole number, as status prints it. */
const WHOLE_NUMBER = /^[0-9]{1,6}$/;

/* ══ THE RECORDS AND THE ROWS ═════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ The writer's own records of a row entering the book for an account (`registration-contact.ts`, `recordWrite`). */
export const ENTRY_RECORD_ACTIONS: readonly string[] = Object.freeze(["contacts.contact.registered", "contacts.contact.revived"]);

/** No record of the registration writer is older than the writer, live on production from 2026-10-03 12:22:46 UTC
 *  (STEP 23): the read starts at that day's first EAT instant, so no machine's clock skew can put one before it. */
export const ENTRY_RECORDS_SINCE = "2026-10-02T21:00:00.000Z";

/** The door's own COMPLIANCE rows, every attempt on ONE target (a run's, as the bulk bar's rows are). */
export const ADDED_REDATE_ACTIONS = Object.freeze({
  applying: "contacts.added_redate_applying",
  applied: "contacts.added_redate_applied",
  refused: "contacts.added_redate_refused",
  failed: "contacts.added_redate_failed",
});
export const ADDED_REDATE_TARGET = Object.freeze({ targetType: "MarketingContact", targetId: "added-redate" });

const SIGNUP_SOURCES: ContactSource[] = ["REGISTRATION"];
/** ⭐ The population the rule reads: the book's linked sign-up rows (the erased tombstone is in no audience, C3). */
export const SIGNUP_ROWS: ContactAudienceFilter = Object.freeze({ ...WHOLE_BOOK, sources: SIGNUP_SOURCES, player: true });

/** Rows per page of the walk, ids per records read, and the records one row may carry before a read counts as cut
 *  short (a row has one per account that wrote it). */
const WALK_PAGE = 500;
const RECORD_CHUNK = 200;
const RECORDS_PER_ROW = 4;

/** A record as the door reads it — what `AuditEntry` holds that the rule needs. */
export type EntryRecord = {
  readonly id: string;
  readonly action: string;
  readonly targetId: string | null;
  readonly createdAt: string;
  readonly payload?: Record<string, unknown>;
};

/** One read of the records of a set of rows — the shape the audit log's durable reader takes. */
export type EntryRecordQuery = {
  readonly targetType: string;
  readonly targetIds: readonly string[];
  readonly actions: readonly string[];
  readonly sinceIso: string;
  readonly limit: number;
};

/** Everything the door reads and writes. */
export type AddedRedateDeps = {
  /** The book's linked sign-up rows, a keyset page at a time (`contactAudience(SIGNUP_ROWS).walk`). */
  readonly walk: (afterId: string | null, limit: number) => Promise<ContactWalk>;
  /** The accounts behind one page (`user.findByIds`). */
  readonly accounts: (ids: string[]) => Promise<ReadonlyArray<Pick<StoredUser, "id" | "createdAt">>>;
  /** The DURABLE records of a set of rows, newest first — handed in by the door's CLI. */
  readonly records: (q: EntryRecordQuery) => Promise<{ readonly entries: readonly EntryRecord[]; readonly truncated: boolean }>;
  /** ⛔ THE ONE WRITE (`marketingContact.redateAdded`): all or nothing. */
  readonly write: (rows: ContactAddedRedate[]) => Promise<ContactAddedRedateResult>;
  /** One row, read fresh (`marketingContact.find`). */
  readonly find: (id: string) => Promise<StoredMarketingContact | null>;
  /** `audit`, awaited; its `recorded` says whether the row exists. */
  readonly audit: (entry: Parameters<typeof audit>[0]) => Promise<unknown>;
  /** `auditFlush`. */
  readonly flush: () => Promise<unknown>;
  /** `auditPending` — appends queued and not yet written. */
  readonly pending: () => number;
  readonly hasDatabase: () => boolean;
  /** THE ONE RULE (`addedRedateVerdict`) — named here so a red case can plant one. */
  readonly rule: (row: StoredMarketingContact, records: readonly EntryRecord[], account: Pick<StoredUser, "id" | "createdAt"> | null) => AddedRedateVerdict;
};

/** ⭐ The shipped deps — the book through the resolver, the accounts, the ONE write, the audit queue, the ONE rule. The
 *  durable record reader is the caller's (the CLI hands in the audit module's), so this module names none. */
export function addedRedateDeps(records: AddedRedateDeps["records"]): AddedRedateDeps {
  return Object.freeze({
    walk: (afterId: string | null, limit: number) => contactAudience(SIGNUP_ROWS).walk(afterId, limit),
    accounts: (ids: string[]) => Promise.resolve(db.user.findByIds(ids)),
    records,
    write: (rows: ContactAddedRedate[]) => Promise.resolve(db.marketingContact.redateAdded(rows)),
    find: (id: string) => Promise.resolve(db.marketingContact.find(id)),
    audit: (entry: Parameters<typeof audit>[0]) => audit(entry),
    flush: auditFlush,
    pending: auditPending,
    hasDatabase,
    rule: addedRedateVerdict,
  });
}

/* ══ THE RULE, FOR ONE ROW ════════════════════════════════════════════════════════════════════════════════════════════ */

export type AddedRedateVerdict =
  | { readonly kind: "redate"; readonly fromMs: number; readonly toMs: number }
  | { readonly kind: "atSignup" | "alreadyRight" | "withoutRecord" | "withoutAccount" | "otherShape" };

/**
 * ⭐ THE ONE RULE — one row, the records read for it, its account (null when it could not be read). See the header's
 * "WHICH ROWS": the four conditions, in the order that names the most specific reason a row is left.
 */
export function addedRedateVerdict(
  row: StoredMarketingContact,
  records: readonly EntryRecord[],
  account: Pick<StoredUser, "id" | "createdAt"> | null,
): AddedRedateVerdict {
  if (row.source !== "REGISTRATION" || row.userId === null || row.sourceRef !== row.userId) return { kind: "otherShape" };
  const addedMs = Date.parse(String(row.createdAt));
  if (!Number.isFinite(addedMs)) return { kind: "otherShape" };
  // The EARLIEST readable record of THIS row entering the book for THIS account.
  let first: { readonly ms: number; readonly via: unknown } | null = null;
  for (const e of records) {
    if (e.targetId !== row.id || !ENTRY_RECORD_ACTIONS.includes(e.action) || e.payload?.account !== row.userId) continue;
    const ms = Date.parse(String(e.createdAt));
    if (!Number.isFinite(ms)) continue;
    if (first === null || ms < first.ms) first = { ms, via: e.payload?.via };
  }
  if (first === null) return { kind: "withoutRecord" };
  if (first.via === "signup") return { kind: "atSignup" };
  if (first.via !== "backfill") return { kind: "withoutRecord" };
  const signedMs = account !== null && account.id === row.userId ? Date.parse(String(account.createdAt)) : Number.NaN;
  if (!Number.isFinite(signedMs)) return { kind: "withoutAccount" };
  if (addedMs !== signedMs || addedMs >= first.ms) return { kind: "alreadyRight" };
  return { kind: "redate", fromMs: addedMs, toMs: first.ms };
}

/* ══ THE PLAN — the whole book, by the rule ═══════════════════════════════════════════════════════════════════════════ */

export type AddedRedateCounts = {
  /** Every linked sign-up row the walk read. */
  examined: number;
  /** ⭐ The backfill's, dated with its account's sign-up, earlier than its record. */
  toRedate: number;
  /** Written by the sign-up itself — its "Added" is when it entered the book. */
  atSignup: number;
  /** The backfill's and already right: re-dated before, or written by C8b's clock. */
  alreadyRight: number;
  /** No readable record of its write for its account — left: no instant is invented. */
  withoutRecord: number;
  /** Its account could not be read — left. */
  withoutAccount: number;
  /** Its provenance is not its link — not the writer's shape; left. */
  otherShape: number;
};

export type AddedRedatePlan = {
  readonly counts: AddedRedateCounts;
  /** Each row to re-date — its id, its "Added" now, the instant it entered the book — in the walk's order (by id). */
  readonly rows: readonly ContactAddedRedate[];
  /** The new "Added" by EAT day → how many rows. */
  readonly days: Readonly<Record<string, number>>;
  /** The EAT days the rows to re-date read as "Added" today (their accounts' sign-ups) — the first and the last. */
  readonly signedFrom: string | null;
  readonly signedTo: string | null;
};

export type AddedRedatePlanReading =
  | { readonly ok: true; readonly plan: AddedRedatePlan }
  | { readonly ok: false; readonly sentence: string };

/** Every record of these rows, by row id. ⛔ A read cut short is not a read: a row whose record was cut off would be
 *  counted "without a record", so it THROWS and the plan is unreadable. */
async function recordsOf(deps: AddedRedateDeps, ids: readonly string[]): Promise<Map<string, EntryRecord[]>> {
  const out = new Map<string, EntryRecord[]>();
  for (let i = 0; i < ids.length; i += RECORD_CHUNK) {
    const chunk = ids.slice(i, i + RECORD_CHUNK);
    const read = await deps.records({
      targetType: ADDED_REDATE_TARGET.targetType, targetIds: chunk, actions: ENTRY_RECORD_ACTIONS,
      sinceIso: ENTRY_RECORDS_SINCE, limit: chunk.length * RECORDS_PER_ROW,
    });
    if (read.truncated) throw new Error("the records were not read in full");
    for (const e of read.entries) {
      if (typeof e.targetId !== "string") continue;
      const list = out.get(e.targetId) ?? [];
      list.push(e);
      out.set(e.targetId, list);
    }
  }
  return out;
}

/** ⭐ THE PLAN — every linked sign-up row of the book, a page at a time, through the ONE rule. Reads only. */
export async function planAddedRedate(deps: AddedRedateDeps): Promise<AddedRedatePlanReading> {
  const counts: AddedRedateCounts = { examined: 0, toRedate: 0, atSignup: 0, alreadyRight: 0, withoutRecord: 0, withoutAccount: 0, otherShape: 0 };
  const rows: ContactAddedRedate[] = [];
  const days: Record<string, number> = {};
  let signedFirst = Number.POSITIVE_INFINITY;
  let signedLast = Number.NEGATIVE_INFINITY;
  try {
    let afterId: string | null = null;
    for (;;) {
      const page: ContactWalk = await deps.walk(afterId, WALK_PAGE);
      if (page.rows.length === 0) break;
      // A belt: the walk is the linked sign-up rows; a row of any other kind it hands over is not this door's.
      const linked = page.rows.filter((r) => r.source === "REGISTRATION" && r.userId !== null);
      const records = await recordsOf(deps, linked.map((r) => r.id));
      const owners = [...new Set(linked.map((r) => r.userId).filter((u): u is string => u !== null))];
      const found: ReadonlyArray<Pick<StoredUser, "id" | "createdAt">> = owners.length > 0 ? await deps.accounts(owners) : [];
      const accounts = new Map(found.map((u) => [u.id, u] as const));
      for (const r of linked) {
        counts.examined++;
        const v = deps.rule(r, records.get(r.id) ?? [], accounts.get(r.userId ?? "") ?? null);
        if (v.kind !== "redate") {
          counts[v.kind]++;
          continue;
        }
        counts.toRedate++;
        rows.push({ id: r.id, expectedCreatedAt: r.createdAt, createdAt: new Date(v.toMs).toISOString() });
        const day = eatDayKey(v.toMs);
        days[day] = (days[day] ?? 0) + 1;
        signedFirst = Math.min(signedFirst, v.fromMs);
        signedLast = Math.max(signedLast, v.fromMs);
      }
      // ⛔ A cursor that does not move would walk for ever: it ends the walk.
      if (page.nextAfterId === null || page.nextAfterId === afterId) break;
      afterId = page.nextAfterId;
    }
  } catch {
    return { ok: false, sentence: ADDED_REDATE_SENTENCE.unreadable };
  }
  return {
    ok: true,
    plan: {
      counts, rows, days,
      signedFrom: Number.isFinite(signedFirst) ? eatDayKey(signedFirst) : null,
      signedTo: Number.isFinite(signedLast) ? eatDayKey(signedLast) : null,
    },
  };
}

/* ══ THE WORDS ════════════════════════════════════════════════════════════════════════════════════════════════════════ */

export const ADDED_REDATE_SENTENCE = Object.freeze({
  unreadable: "the book, its accounts or the records of its writes couldn't be read in full, so nothing was counted and nothing was written. Run it again.",
  noDatabase: "no database — nothing can be read or written without it.",
  badOpsText: "--by and --reason must each be plain words on one line, at most 120 characters, and the two together hold at most six numerals (no phone number, no date).",
  badExpect: "--expect must be the whole number status printed: how many rows the apply re-dates.",
  expect: (counted: number, expected: number): string =>
    `status now counts ${counted} row(s) to re-date and the apply line says ${expected}, so the book moved since that status. Nothing was recorded or written: run status again and apply the line it prints.`,
  nothingToDo: "no row of the book reads its account's sign-up as Added any more, so nothing was written and nothing was recorded.",
  tooMany: `more rows than one write takes (${ADDED_REDATE_MAX}) — refused, never cut. Nothing was recorded or written: tell the developer.`,
  recordFailed: "its COMPLIANCE record couldn't be written first, so nothing was written at all. Run it again.",
  changed: "a row changed between the read and the write, so NOTHING was written (the write is all or nothing). Run status again.",
  writeFailed: "the write failed — whether it committed is not known.",
  readBack: "the rows do not read back as re-dated.",
  doNotRunAgain: "Do not run apply again: run status, and tell the developer.",
  unconfirmed: "Re-dated, but its record was not confirmed — tell the developer.",
});

export type AddedRedateCode =
  | "status" | "unreadable" | "bad_ops_text" | "no_database" | "bad_expect" | "expect_mismatch" | "nothing_to_do"
  | "too_many" | "record_failed" | "changed" | "write_failed" | "read_back_mismatch" | "done" | "done_unconfirmed";

export type AddedRedateOutcome = {
  readonly code: AddedRedateCode;
  /** 0 done, read or nothing to do · 1 refused, failed or not confirmed · 2 not run. */
  readonly exitCode: 0 | 1 | 2;
  readonly lines: readonly string[];
  /** The ids of the door's own COMPLIANCE rows (an apply that reached its record). */
  readonly records: { readonly applying: string | null; readonly ending: string | null };
};

const NO_RECORDS = Object.freeze({ applying: null, ending: null });
function outcome(code: AddedRedateCode, exitCode: 0 | 1 | 2, lines: readonly string[], records: AddedRedateOutcome["records"] = NO_RECORDS): AddedRedateOutcome {
  return { code, exitCode, lines, records };
}

const daysLine = (days: Readonly<Record<string, number>>): string =>
  Object.keys(days).sort().map((d) => `${d} ${days[d]}`).join(" · ") || "none";

/** ⭐ The apply line status prints — the count it read, and an operator's text inside the screen's limits. */
export function addedRedateApplyCommand(count: number): string {
  return `railway run --service 50pick npm run ops:contacts-added-redate -- apply --expect ${count} --by "Claude for Ali (B8)" --reason "approved by Ali in the Claude session"`;
}

/** The counts, in words — the same lines for status and every apply that read a plan. */
function countLines(plan: AddedRedatePlan): string[] {
  const c = plan.counts;
  const lines = [
    `  linked sign-up rows read: ${c.examined}`,
    `  to re-date: ${c.toRedate}${c.toRedate > 0 ? ` — each to the moment the backfill wrote it (EAT): ${daysLine(plan.days)}` : ""}`,
  ];
  if (c.toRedate > 0 && plan.signedFrom !== null && plan.signedTo !== null) {
    lines.push(`    today their Added reads their accounts' sign-ups: from ${plan.signedFrom} to ${plan.signedTo} (EAT)`);
  }
  lines.push(`  left as they are: ${c.atSignup} written at sign-up · ${c.alreadyRight} already right · ${c.withoutRecord} without a readable record of their write · ${c.withoutAccount} without a readable account · ${c.otherShape} not the writer's shape`);
  if (c.withoutRecord + c.withoutAccount > 0) {
    lines.push(`  ⚠️ ${c.withoutRecord + c.withoutAccount} row(s) could not be judged — no instant is invented for them: tell the developer.`);
  }
  return lines;
}

/* ══ STATUS ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ STATUS — the plan, in counts and EAT days, and the exact apply line. Writes nothing and records nothing. */
export async function addedRedateStatus(deps: AddedRedateDeps): Promise<AddedRedateOutcome> {
  const reading = await planAddedRedate(deps);
  if (!reading.ok) return outcome("unreadable", 1, [`UNREADABLE: ${reading.sentence}`]);
  const plan = reading.plan;
  const lines = [`STATUS — "Added" on the contact book's sign-up rows (C8b · B8), counts only:`, ...countLines(plan)];
  if (plan.rows.length === 0) lines.push("  nothing to re-date: every linked sign-up row's Added is when it entered the book (or it is left, as counted).");
  else lines.push("  apply (Ali approves this count; at a quiet time — an edit dialog open on one of these rows reloads):", `    ${addedRedateApplyCommand(plan.rows.length)}`);
  return outcome("status", 0, lines);
}

/* ══ APPLY ════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** Whether an awaited audit call left its row, and the row's id: a stand-in that throws, or a result without
 *  `recorded: true`, did not (the live switch door's rule). */
async function recordOf(deps: AddedRedateDeps, entry: Parameters<typeof audit>[0]): Promise<{ readonly recorded: boolean; readonly id: string | null }> {
  try {
    const r = await deps.audit(entry);
    if (r !== null && typeof r === "object" && (r as { recorded?: unknown }).recorded === true) {
      const id = (r as { id?: unknown }).id;
      return { recorded: true, id: typeof id === "string" ? id : null };
    }
    return { recorded: false, id: null };
  } catch {
    return { recorded: false, id: null };
  }
}

async function settle(deps: AddedRedateDeps): Promise<void> {
  try { await deps.flush(); } catch { /* what is left is counted by `pending` */ }
}

function pendingNow(deps: AddedRedateDeps): number {
  try { return deps.pending(); } catch { return Number.POSITIVE_INFINITY; }
}

/** The error's NAME and CODE — never its message (a database message can print the statement it refused). */
function failureKind(err: unknown): string {
  try {
    const e = (err ?? {}) as { name?: unknown; code?: unknown };
    const parts = [typeof e.name === "string" ? e.name : null, typeof e.code === "string" ? e.code : null].filter((x): x is string => x !== null);
    return (parts.join(" ") || typeof err).slice(0, 60);
  } catch {
    return "unreadable";
  }
}

export type AddedRedateApplyInput = {
  readonly expect: unknown;
  readonly by: unknown;
  readonly reason: unknown;
};

/** ⭐ APPLY — the header's eleven steps, in that order. */
export async function applyAddedRedate(input: AddedRedateApplyInput, deps: AddedRedateDeps): Promise<AddedRedateOutcome> {
  const by = screenOpsText(input.by);
  const why = screenOpsText(input.reason);
  if (by === null || why === null || numeralsIn(by) + numeralsIn(why) > MAX_OPS_NUMERALS) {
    return outcome("bad_ops_text", 1, [`REFUSED (bad_ops_text): ${ADDED_REDATE_SENTENCE.badOpsText}`]);
  }
  if (!deps.hasDatabase()) return outcome("no_database", 2, [`REFUSING: ${ADDED_REDATE_SENTENCE.noDatabase}`]);
  const expectText = typeof input.expect === "string" ? input.expect.trim() : "";
  if (!WHOLE_NUMBER.test(expectText)) return outcome("bad_expect", 1, [`REFUSED (bad_expect): ${ADDED_REDATE_SENTENCE.badExpect}`]);
  const expected = Number(expectText);
  const reading = await planAddedRedate(deps);
  if (!reading.ok) return outcome("unreadable", 1, [`REFUSED (unreadable): ${reading.sentence}`]);
  const plan = reading.plan;
  if (plan.rows.length !== expected) {
    return outcome("expect_mismatch", 1, [`REFUSED (expect_mismatch): ${ADDED_REDATE_SENTENCE.expect(plan.rows.length, expected)}`, ...countLines(plan)]);
  }
  if (plan.rows.length === 0) return outcome("nothing_to_do", 0, [`NOTHING TO DO — ${ADDED_REDATE_SENTENCE.nothingToDo}`]);
  if (plan.rows.length > ADDED_REDATE_MAX) return outcome("too_many", 1, [`REFUSED (too_many): ${ADDED_REDATE_SENTENCE.tooMany}`]);

  // ⛔ RECORD FIRST — every row, its Added before and after, on the chain before the write. Not recorded: nothing written.
  const base = { category: "COMPLIANCE" as const, actorId: null, ...ADDED_REDATE_TARGET };
  const story = {
    via: "ops",
    by,
    reason: why,
    ruling: "Ali, 2026-10-09, question 3 (a): the contacts back-filled on 2026-10-03 re-dated to when they entered the book",
    count: plan.rows.length,
    days: { ...plan.days },
  };
  const applying = await recordOf(deps, {
    ...base,
    action: ADDED_REDATE_ACTIONS.applying,
    payload: { ...story, rows: plan.rows.map((r) => ({ id: r.id, from: r.expectedCreatedAt, to: r.createdAt })) },
  });
  if (!applying.recorded) return outcome("record_failed", 1, [`REFUSED (record_failed): ${ADDED_REDATE_SENTENCE.recordFailed}`]);

  /** ⭐ Every ending after the record is recorded too, awaited: `refused` (nothing was written) or `failed` (what the rows
   *  hold is not known, or is not the re-dating). */
  const ended = async (
    kind: "refused" | "failed", code: AddedRedateCode, step: "write" | "read_back", details: Record<string, unknown>,
    lines: readonly string[], closing?: string,
  ): Promise<AddedRedateOutcome> => {
    const ending = await recordOf(deps, { ...base, action: ADDED_REDATE_ACTIONS[kind], payload: { ...story, step, ...details } });
    await settle(deps);
    const tail = ending.recorded
      ? `  records: COMPLIANCE ${applying.id ?? "?"} (applying) · ${ending.id ?? "?"} (${kind})`
      : `  ⚠️ its ending could not be recorded — tell the developer (the applying record ${applying.id ?? "?"} names the attempt).`;
    return outcome(code, 1, [...lines, tail, ...(closing !== undefined ? [closing] : [])], {
      applying: applying.id, ending: ending.recorded ? ending.id : null,
    });
  };

  // ⛔ THE ONE WRITE — all or nothing, each row only while its Added is still the one read.
  let res: ContactAddedRedateResult;
  try {
    res = await deps.write(plan.rows.map((r) => ({ id: r.id, expectedCreatedAt: r.expectedCreatedAt, createdAt: r.createdAt })));
  } catch (err) {
    return ended("failed", "write_failed", "write", { outcome: "unknown", error: failureKind(err) },
      [`FAILED (write_failed): ${ADDED_REDATE_SENTENCE.writeFailed}`], ADDED_REDATE_SENTENCE.doNotRunAgain);
  }
  if (!res.ok) {
    return ended("refused", "changed", "write", { refusal: "changed", contact: res.id },
      [`REFUSED (changed): ${ADDED_REDATE_SENTENCE.changed}`]);
  }

  // ⭐ READ BACK, FRESH — never the write's answer alone.
  const wrong: string[] = [];
  for (const r of plan.rows) {
    let back: StoredMarketingContact | null = null;
    try { back = await deps.find(r.id); } catch { back = null; }
    const to = Date.parse(r.createdAt);
    if (back === null || Date.parse(String(back.createdAt)) !== to || !(Date.parse(String(back.updatedAt)) >= to)) wrong.push(r.id);
  }
  if (res.written !== plan.rows.length || wrong.length > 0) {
    return ended("failed", "read_back_mismatch", "read_back", { written: res.written, notReadBack: wrong },
      [`FAILED (read_back_mismatch): ${ADDED_REDATE_SENTENCE.readBack} The write answered ${res.written} of ${plan.rows.length}; ${wrong.length} row(s) do not read back.`],
      ADDED_REDATE_SENTENCE.doNotRunAgain);
  }

  const applied = await recordOf(deps, { ...base, action: ADDED_REDATE_ACTIONS.applied, payload: { ...story, written: res.written, applyingRecord: applying.id } });
  await settle(deps);
  const pending = pendingNow(deps);
  const confirmed = applied.recorded && pending === 0;
  const lines: string[] = [
    `DONE — ${res.written} row(s) re-dated: each one's Added is now the moment the backfill wrote it (EAT): ${daysLine(plan.days)}.`,
    `  records: COMPLIANCE ${applying.id ?? "?"} (applying) · ${applied.recorded ? (applied.id ?? "?") : "NOT RECORDED"} (applied)`,
  ];
  if (!confirmed) {
    lines.push(`⚠️ ${ADDED_REDATE_SENTENCE.unconfirmed}`);
    if (!applied.recorded) lines.push("  · the record of the write's ending (contacts.added_redate_applied) was not written.");
    if (pending !== 0) lines.push(`  · ${Number.isFinite(pending) ? pending : "an unknown number of"} audit row(s) were still waiting to be written.`);
  }
  return outcome(confirmed ? "done" : "done_unconfirmed", confirmed ? 0 : 1, lines, {
    applying: applying.id, ending: applied.recorded ? applied.id : null,
  });
}
