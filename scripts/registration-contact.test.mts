/**
 * test:registration-contact — EVERY CLIENT IS A CONTACT (the owner, 2026-10-03): every 50pick registrant is added to the
 * marketing contact book, and an idempotent backfill makes every existing client one (`registration-contact.ts`).
 *
 * ⭐ DRIVEN, NOT READ, wherever it can run in a script — over the MEMORY twin, in-process:
 *   §1 THE DOOR — the REAL `registerWithPassword`, the one sign-up door since 2026-10-06 (the one-time-code sign-up was
 *      deleted): it makes the new number a contact; sign-up records no consent since the SMS-offers box was REMOVED
 *      (2026-10-07), so a new number reads UNKNOWN with no ledger row — even when its page posts the old tick — and a
 *      number the ledger already holds reads the ledger's word; the bootstrap admin is never one; a THROWING book and a
 *      SILENT book each leave the sign-up finishing (the account and its wallet created); the failure is logged with no
 *      number in it.
 *   §2 THE RULE — `ensureRegistrationContact` on seeded accounts: the row's shape, the cache from the ledger, an officer's
 *      contact LINKED (not duplicated, not overwritten, its stamp kept — OD56), clients only, already-linked a read.
 *   §3 THE RECYCLED-NUMBER RULES — ⭐ C8b (B1): an erased tombstone REVIVED as the new client's own row (the sign-up's
 *      row, the clock as "Added", its old lists deleted, in ONE compare-and-set step that never overwrites a row that is
 *      no longer the tombstone); U18b: a row linked to another account never re-pointed.
 *   §4 THE AUDIT — the masked number, the account, field names; no whole number, name or email.
 *   §5 THE BACKFILL — the dry run writes nothing; every PLAYER on +255 visited once, in pages; counts exactly the world's;
 *      a second run changes nothing; no number or name in its counts or its report.
 * Then the SOURCE, for what only the source can show (§6): the door's one call and its place, the copy, the backfill
 * script's refusals, the wiring.
 *   §7 ⭐ C8b (B8) · THE "ADDED" DOOR (`contacts/added-redate.ts`, run as `ops:contacts-added-redate`) — driven on the
 *      memory twin in its own world: status counts the book by the ONE rule and writes nothing; every refusal comes before
 *      the record; apply re-dates the backfill's rows all at once, records FIRST and reads back; a second apply is nothing
 *      to do; a race is refused whole; every other ending is recorded; end to end through the REAL audit log's durable
 *      reader; and the CLI's source (the proxy before the import, the reader handed in, production's own environment).
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY — a door, the rule, the wrapper, the backfill,
 * a store member for the length of one call, or a source string — and requires the MATCHING assertion to fail. This file
 * makes no file-modifying call of any kind. Every store mutation goes through the store's own methods inside an empty
 * world whose maps are put back after each run, and every run takes numbers no other run uses (the rate rules are per
 * number).
 * ⚠️ About 2 s a run: §1.6 waits out the sign-up budget once, on purpose.
 *
 * Run:  npm run test:registration-contact
 * Red:  npm run red:registration-contact
 */
// ⛔ Captured, never sent: a successful registration mails a verification link.
process.env.EMAIL_OUTBOX_CAPTURE = "1";
process.exitCode = 1;

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import type { ContactAddedRedate, MessagingKey, PlayerWalk, PlayerWalkQuery, StoredMarketingContact, StoredUser } from "../src/lib/server/store.ts";
import { audit, auditFlush, getAuditForTargetsDurable, getAuditPage } from "../src/lib/server/audit.ts";
import {
  ADDED_REDATE_ACTIONS, ADDED_REDATE_TARGET, addedRedateApplyCommand, addedRedateDeps, addedRedateStatus, addedRedateVerdict,
  applyAddedRedate, planAddedRedate,
} from "../src/lib/server/contacts/added-redate.ts";
import type { AddedRedateApplyInput, AddedRedateDeps, AddedRedateOutcome, EntryRecord } from "../src/lib/server/contacts/added-redate.ts";
import { registerWithPassword } from "../src/lib/server/auth-service.ts";
import type { PasswordRegisterInput } from "../src/lib/server/auth-service.ts";
import { appendMarketingConsent } from "../src/lib/server/marketing/consent-ledger.ts";
import { parseTzNumber } from "../src/lib/tz-msisdn.ts";
import { maskPhone } from "../src/lib/phone-normalize.ts";
import { ERASURE_EVIDENCE } from "../src/lib/marketing/erasure-mark.ts";
import { mirrorContactCache } from "../src/lib/server/marketing/contact-cache.ts";
import { SOURCE_LABEL } from "../src/app/admin/contacts/contacts-copy.ts";
import {
  ensureRegistrationContact, registrationContactAtSignup, backfillRegistrationContacts, registrationBackfillReport,
  registrationDryRunDeps, REGISTRATION_BOOK,
} from "../src/lib/server/marketing/registration-contact.ts";
import type {
  RegistrationBackfillCounts, RegistrationBackfillDeps, RegistrationContactDeps, RegistrationContactResult, RegistrationContactUser,
} from "../src/lib/server/marketing/registration-contact.ts";

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const read = (rel: string) => decomment(readFileSync(join(ROOT, rel), "utf8")).split(CR + LF).join(LF);
const rawRead = (rel: string) => readFileSync(join(ROOT, rel), "utf8").split(CR + LF).join(LF);

/* ═══ THE MEMORY TWIN, AND ONLY IT ═══════════════════════════════════════════════════════════════ */

type WorldKey = "users" | "usersByPhone" | "marketingContacts" | "contactsByMsisdn" | "messagingConsents" | "suppressions"
  | "wallets" | "walletsByUser" | "otps" | "contactLists" | "contactListMembers";
const memory = (globalThis as unknown as { __50PICK_STORE?: Record<WorldKey, Map<string, unknown>> }).__50PICK_STORE;
if (!memory || (process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false")) {
  console.error("test:registration-contact runs on the MEMORY twin only — unset DATABASE_URL. Nothing was run.");
  process.exit(2);
}
const MEM = memory as Record<WorldKey, Map<string, unknown>>;
const WORLD: readonly WorldKey[] = [
  "users", "usersByPhone", "marketingContacts", "contactsByMsisdn", "messagingConsents", "suppressions", "wallets", "walletsByUser", "otps",
  "contactLists", "contactListMembers",
];

/** An EMPTY world for `fn` — the maps a run touches are copied, emptied, and put back afterwards, whatever happened. */
async function inEmptyWorld(fn: () => Promise<void>): Promise<void> {
  const saved = WORLD.map((k) => new Map(MEM[k]));
  for (const k of WORLD) MEM[k].clear();
  try {
    await fn();
  } finally {
    WORLD.forEach((k, i) => {
      MEM[k].clear();
      for (const [key, v] of saved[i]) MEM[k].set(key, v);
    });
  }
}

/** The book, the accounts and the evidence, serialised — a write anywhere in them moves it. */
const STATE: readonly WorldKey[] = ["users", "marketingContacts", "contactsByMsisdn", "messagingConsents", "suppressions", "contactLists", "contactListMembers"];
const snapshot = (): string => STATE.map((k) => `${k}=${JSON.stringify([...MEM[k].entries()])}`).join("|");

/** One member of the book's memory twin swapped for the length of `fn` — in memory, never on disk — and put back. */
async function withBookMember<T>(name: "create" | "update" | "findByMsisdn" | "redateAdded", planted: unknown, fn: () => Promise<T>): Promise<T> {
  const target = db.marketingContact as unknown as Record<string, unknown>;
  const real = target[name];
  target[name] = planted;
  try {
    return await fn();
  } finally {
    target[name] = real;
  }
}

async function withEnv<T>(key: string, value: string, fn: () => Promise<T>): Promise<T> {
  const had = Object.prototype.hasOwnProperty.call(process.env, key);
  const was = process.env[key];
  process.env[key] = value;
  try {
    return await fn();
  } finally {
    if (had) process.env[key] = was as string;
    else delete process.env[key];
  }
}

/** Every console.error line `fn` prints, collected instead of printed. */
async function capturingErrors<T>(fn: () => Promise<T>): Promise<{ value: T; lines: string[] }> {
  const lines: string[] = [];
  const real = console.error;
  console.error = (...a: unknown[]) => { lines.push(a.map((x) => String(x)).join(" ")); };
  try {
    return { value: await fn(), lines };
  } finally {
    console.error = real;
  }
}

/** `p`, or "still waiting" after `ms` — the timer always cleared, so nothing holds the process open. */
async function within<T>(p: Promise<T>, ms: number): Promise<{ settled: true; value: T } | { settled: false }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<{ settled: false }>((resolve) => { timer = setTimeout(() => resolve({ settled: false }), ms); });
  try {
    return await Promise.race([p.then((value) => ({ settled: true as const, value })), late]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

const settle = <T,>(p: Promise<T>) => p.then((value) => ({ ok: true as const, value }), (error: unknown) => ({ ok: false as const, error }));

/* ═══ VERDICTS ═══════════════════════════════════════════════════════════════════════════════════ */

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

/* ═══ FIXTURES ═══════════════════════════════════════════════════════════════════════════════════ */

let RUN = 0;
const pad = (n: number, w: number) => String(n).padStart(w, "0");
/** A number no other run uses: the prefix, the run in two digits, a five-digit slot (nine national digits). */
const num = (slot: number, ndc = "75") => `+255${ndc}${pad(RUN, 2)}${pad(slot, 5)}`;
const foreign = (slot: number) => `+2547${pad(RUN, 2)}${pad(slot, 5)}`;
const mail = (slot: number) => `rc${RUN}.${slot}@example.tz`;
const keyOf = (phone: string): string => parseTzNumber(phone).msisdn ?? "";
const nationalOf = (phone: string): string => (phone.startsWith("+255") ? phone.slice(4) : phone.replace(/[^0-9]/g, ""));
const mkey = (phone: string): MessagingKey => ({ channel: "SMS", identifier: keyOf(phone), category: "MARKETING" });
/** Every book row for a person's number, however it was keyed — a row keyed as typed is a second row for one person. */
const rowsFor = (phone: string): number =>
  [...MEM.marketingContacts.values()].filter((c) => String((c as StoredMarketingContact).msisdn).endsWith(nationalOf(phone))).length;
const ID_SHAPE = /^mc_[a-z]{16}$/;

function account(id: string, phoneE164: string, o: Partial<StoredUser> = {}): StoredUser {
  const at = "2026-09-20T08:00:00.000Z";
  return {
    id, phoneE164, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, createdAt: at, updatedAt: at, lastLoginAt: at, closedAt: null, ...o,
  } as StoredUser;
}

/** A book row written by hand — independent of the builder under test. */
function bookRow(id: string, phone: string, o: Partial<StoredMarketingContact> = {}): StoredMarketingContact {
  const n = parseTzNumber(phone);
  if (n.verdict !== "ok" || n.msisdn === null || n.ndc === null) throw new Error(`fixture number does not parse (${n.verdict})`);
  return {
    id, msisdn: n.msisdn, rawInput: phone, displayName: null, email: null, ndc: n.ndc, operator: null, source: "OPERATOR",
    sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null, importId: null,
    createdAt: "2026-09-01T08:00:00.000Z", createdBy: "usr_officer_rc", updatedAt: "2026-09-15T10:00:00.000Z", updatedBy: "usr_officer_rc",
    ...o,
  };
}

let ledgerSeq = 0;
async function ledger(phone: string, status: "GIVEN" | "WITHDRAWN", createdAt: string): Promise<void> {
  await db.messagingConsent.create({
    id: `rc_l_${RUN}_${pad(++ledgerSeq, 4)}`, channel: "SMS", identifier: keyOf(phone), category: "MARKETING", status,
    source: status === "GIVEN" ? "REGISTRATION" : "OPERATOR", wording: "fixture wording", locale: "SW", evidence: "fixture",
    recordedBy: null, createdAt,
  });
}

const REG_ACTIONS = new Set(["contacts.contact.registered", "contacts.contact.revived", "contacts.contact.linked"]);
/** ⭐ C8b (B8) · the rule's clock, injected: the moment a row enters the book in §2.1 and §3.1 — never an account's date. */
const CLOCK = "2026-10-09T09:30:00.000Z";
const atClock = (): Date => new Date(CLOCK);
const registrationAudits = () => getAuditPage({ limit: 10_000, category: "SYSTEM" }).filter((e) => REG_ACTIONS.has(e.action));
const registrationAuditCount = (): number => registrationAudits().length;

const eqCounts = (a: Record<string, number>, b: Record<string, number>): boolean =>
  Object.keys(a).length === Object.keys(b).length && Object.keys(b).every((k) => a[k] === b[k]);
const leaksIn = (text: string, secrets: readonly string[]): string[] => secrets.filter((s) => s.length > 0 && text.includes(s));

/** JSON with every plain object's keys sorted — two values compare by content, never by the order a writer spread them. */
const canon = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) => (x !== null && typeof x === "object" && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x as Record<string, unknown>).sort().map((k) => [k, (x as Record<string, unknown>)[k]]))
  : x));

/** ⭐ C8b (B8) · §7's record reader: the fixture's records, read exactly as the audit log's durable reader reads them —
 *  the target type, the ids, the actions and the floor honoured, newest first, cut at the limit and SAYING so. */
const fakeRecords = (list: readonly EntryRecord[]): AddedRedateDeps["records"] => async (q) => {
  const hit = list
    .filter((e) => q.targetType === "MarketingContact" && e.targetId !== null && q.targetIds.includes(e.targetId)
      && q.actions.includes(e.action) && Date.parse(e.createdAt) >= Date.parse(q.sinceIso))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { entries: hit.slice(0, q.limit), truncated: hit.length > q.limit };
};
const DOOR_ACTIONS = new Set<string>(Object.values(ADDED_REDATE_ACTIONS));
/** The "Added" door's own COMPLIANCE rows in the ring, newest first. */
const doorRows = () => getAuditPage({ limit: 10_000, category: "COMPLIANCE" }).filter((e) => DOOR_ACTIONS.has(e.action));
const payloadOf = (e: { payload?: Record<string, unknown> } | undefined): Record<string, unknown> => (e?.payload ?? {}) as Record<string, unknown>;

/* ═══ THE DOOR — the real auth-service, as far as a script can drive it ════════════════════════════ */

type DoorRun = { result: unknown; thrown: string };
const PASSWORD = "Str0ng!Passw0rd#2026";
/** A successful sign-up mints a session cookie, which needs a Next request scope — so its throw means "it got all the
 *  way" (the `marketing-consent-ledger` suite's reading), and the rows it wrote are read back.
 *  ⛔ `staleTick` hands the service the REMOVED SMS-offers box's field, ticked — what a page served before 2026-10-07
 *  would still post — so §1.2 measures that a stray tick records nothing. */
async function passwordDoor(phone: string, email: string, staleTick: boolean): Promise<DoorRun> {
  try {
    const result = await registerWithPassword({
      phone, email, password: PASSWORD, passwordConfirm: PASSWORD, dob: "1990-01-01",
      acceptTerms: true, acceptAge: true, locale: "EN",
      ...(staleTick ? ({ marketingOptIn: true } as Record<string, unknown>) : {}),
    } as PasswordRegisterInput);
    return { result, thrown: "" };
  } catch (err) {
    return { result: null, thrown: String((err as Error)?.message ?? err) };
  }
}

/* ═══ THE IMPLEMENTATION UNDER TEST — swappable, so a red case can plant one piece ═════════════════ */

type Sources = {
  auth: string; copy: string; exportSrc: string; loader: string; backfill: string; probe: string; pkg: string;
  /** C8b (B8) · the "Added" door and its CLI. */
  door: string; doorCli: string;
};
const REAL_SOURCES: Sources = {
  auth: read("src/lib/server/auth-service.ts"),
  copy: read("src/app/admin/contacts/contacts-copy.ts"),
  exportSrc: read("src/lib/server/contacts/export.ts"),
  loader: read("src/app/admin/contacts/contacts-loader.ts"),
  backfill: read("scripts/live/backfill-registration-contacts.mts"),
  probe: read("scripts/live/registration-contact-pg-probe.mts"),
  pkg: rawRead("package.json"),
  door: read("src/lib/server/contacts/added-redate.ts"),
  doorCli: read("scripts/ops/contacts-added-redate.mts"),
};

/** ⭐ C8b (B8) · the "Added" door as §7 drives it — a red case plants one piece. */
type Door = {
  status: typeof addedRedateStatus;
  apply: typeof applyAddedRedate;
  deps: typeof addedRedateDeps;
};
const REAL_DOOR: Door = { status: addedRedateStatus, apply: applyAddedRedate, deps: addedRedateDeps };

type Ensure = (user: RegistrationContactUser, deps?: RegistrationContactDeps) => Promise<RegistrationContactResult>;
type Impl = {
  password: (phone: string, email: string, staleTick: boolean) => Promise<DoorRun>;
  bootstrapDoor: (phone: string, email: string) => Promise<DoorRun>;
  ensure: Ensure;
  atSignup: Ensure;
  /** U24's mirror, which every sign-up now passes through — its failure line is on trial in §1.5. */
  mirror: typeof mirrorContactCache;
  backfill: (deps?: RegistrationBackfillDeps) => Promise<RegistrationBackfillCounts>;
  dryRunDeps: () => RegistrationContactDeps;
  report: typeof registrationBackfillReport;
  label: string;
  sources: Sources;
  /** ⭐ C8b (B1) · the store's ONE revival, as §3.3's racing book reaches it — a plant swaps it for a write without a compare. */
  revive: NonNullable<RegistrationContactDeps["book"]>["revive"];
  /** ⭐ C8b (B8) · the "Added" door (§7). */
  door: Door;
};
const REAL: Impl = {
  password: passwordDoor,
  bootstrapDoor: (phone, email) => withEnv("ADMIN_BOOTSTRAP_PHONES", phone, () => passwordDoor(phone, email, false)),
  ensure: ensureRegistrationContact,
  atSignup: registrationContactAtSignup,
  mirror: mirrorContactCache,
  backfill: backfillRegistrationContacts,
  dryRunDeps: registrationDryRunDeps,
  report: registrationBackfillReport,
  label: SOURCE_LABEL.REGISTRATION,
  sources: REAL_SOURCES,
  revive: REGISTRATION_BOOK.revive,
  door: REAL_DOOR,
};

/** A function's text: from `export async function <name>(` to the next top-level `export`. */
function fnBody(src: string, name: string): string {
  const at = src.indexOf(`export async function ${name}(`);
  if (at < 0) return "";
  const next = src.indexOf(`${LF}export `, at + 1);
  return src.slice(at, next < 0 ? src.length : next);
}

/* ═══ THE LABELS, ONCE — the assertions and the red cases both read them ════════════════════════════ */

const L = {
  d1: "1.1 · THE ONE DOOR makes the new number a contact: the password sign-up leaves exactly ONE book row for the account's number - source REGISTRATION, linked to the account, sourceRef the account id (EXECUTED through the real auth-service)",
  d2: "1.2 · ⭐ the cache is the ledger's and sign-up adds nothing to it: a new number reads UNKNOWN with NO ledger row though its page posted the removed SMS-offers box's tick (2026-10-07), and a number the ledger already holds as GIVEN reads GIVEN beside its ONE row — nothing invented (EXECUTED through the real password door)",
  d3: "1.3 · ⛔ the bootstrap admin is never a contact: a password sign-up on an ADMIN_BOOTSTRAP_PHONES number is created ADMIN and leaves the book without a row for it (EXECUTED)",
  d4: "1.4 · ⛔ A THROWING BOOK NEVER FAILS A SIGN-UP: with every book create throwing, the door still creates the account and its wallet (the only throw is the session cookie's, never the book's) and write no row — and the bounded wrapper answers failed, never rejecting",
  d5: "1.5 · ⛔ the failure is logged WITHOUT the number or the email: a book whose error message prints the whole row still yields one [registration-contact] line naming only the stage and the error's name and code — and the cache mirror every sign-up passes through logs its own failure the same way",
  d6: "1.6 · ⛔ A SILENT BOOK NEVER HOLDS A SIGN-UP: the wrapper gives up within its budget (timed_out) when the book never answers, and the real password door, its book read never answering, still finishes and creates the wallet",
  r1: "2.1 · the row's shape: the bare 255… key and its prefix from the ONE table, the account's number as rawInput, the account's name and email through the ONE field rule (cleaned; an over-long name and a malformed email DROPPED, never cut), no stored operator, no officer, no tags, notes or import, and ⭐ C8b (B8) THE RULE'S CLOCK as createdAt and updatedAt — the moment the row entered the book, never the account's own createdAt",
  r2: "2.2 · ⭐ the cache comes from the LEDGER: an account whose ledger says GIVEN reads GIVEN, one whose last word is WITHDRAWN reads WITHDRAWN, one with no ledger row reads UNKNOWN — and the rule writes NO ledger row of its own",
  r3: "2.3 · ⭐ an OFFICER'S contact is LINKED, not duplicated: one row for the number, the same id, now linked to the account, source OPERATOR kept, every field the officer typed untouched (name, email, notes, tags, sourceRef, createdBy, createdAt), the consent mirrored",
  r4: "2.4 · ⛔ OD56 · a link is not an edit: the linked row's own updatedAt and updatedBy are written back — an officer's open dialog stays valid, a masked viewer sees nothing move",
  r5: "2.5 · ⛔ CLIENTS ONLY: GROWTH, ADMIN and AGENT accounts, a +254 number, a 064 number, a landline, a CLOSED account, an erased account and a bootstrap-admin number are each skipped with their own reason, and the book, the ledger and the audit are untouched",
  r6: "2.6 · already linked to this account is a READ: already_linked with the row's id, no write, no audit row, the store byte-identical",
  t1: "3.1 · ⭐ C8b (B1) · AN ERASED TOMBSTONE IS REVIVED AS THE NEW CLIENT'S OWN ROW — the holder's own act lifts the block: the SAME row (one row for the number, its id kept) becomes exactly the row a sign-up writes — linked, source REGISTRATION, the account id as sourceRef, the account's name and email, no notes, tags, import or officer, the clock as Added — nothing of the erased person's kept, the cache mirrored from the ledger, its TWO old list memberships deleted (the lists and another contact's membership kept), and a second call is a read",
  t2: "3.2 · ⛔ U18b · A ROW LINKED TO ANOTHER ACCOUNT IS NOT THIS PERSON'S: it keeps its link and every field, nothing is created, and the answer carries no contact id",
  t3: "3.3 · ⛔ C8b (B1) · THE REVIVAL IS A COMPARE-AND-SET: a tombstone that stopped being one between the read and the write (another account's sign-up linked it first) is NOT overwritten — the store refuses, the rule reads the row again and keeps it as the other account's, nothing of this account written",
  a1: "4.1 · every write is audited like U22's: contacts.contact.registered, .revived and .linked with the MASKED number, the account, the field names and where it came from (a revival with how many list memberships it deleted) — and no whole number, name or email in any of this run's registration audit rows",
  b0: "5.0 · ⭐ the backfill's DRY RUN writes nothing (the store and the audit untouched) and predicts the real run's outcomes",
  b1: "5.1 · ⭐ THE BACKFILL walks every PLAYER account on a +255 number by id, in pages of two, each exactly ONCE, and its counts by outcome, skip reason and cache are exactly the world's (C8b: the erased number's tombstone REVIVED as its new client's row) — staff, an agent, an erased account and a foreign number never walked (the census counts them)",
  b2: "5.2 · ⭐ THE BACKFILL IS IDEMPOTENT: a second run creates, revives and links nothing, repairs no cache, writes no audit row, and leaves the store byte-identical",
  b3: "5.3 · ⛔ the backfill holds no number and no name: its counts and every line of its report carry none of the world's numbers, names or emails",
  s1: "6.1 · THE WIRING: the sign-up door calls registrationContactAtSignup(user) exactly ONCE - after its account row and after its wallet (the money first) - auth-service appends NO consent-ledger row (the SMS-offers box was removed 2026-10-07), creates an account at exactly ONE site, and never calls the unbounded ensureRegistrationContact",
  s2: '6.2 · the copy: SOURCE_LABEL.REGISTRATION reads "Signed up" in the ONE table the column, the rail, the edit dialog and the export read, and "Sign-up" is gone from it',
  s3: "6.3 · the backfill script refuses no DATABASE_URL, the memory twin, a non-loopback URL without --production, and a real-database write run without the app's own audit key — all BEFORE the store loads — runs the ONE walk and prints only the report's lines, naming no number, name or email; and its Postgres probe refuses any non-loopback URL before the store loads",
  s4: "6.4 · the suite is wired: test:registration-contact and red:registration-contact (--prove-red, in-process) exist, and predeploy runs the suite exactly once",
  k1: "7.1 · ⭐ C8b (B8) · STATUS COUNTS THE BOOK BY THE ONE RULE AND WRITES NOTHING: of the 10 linked sign-up rows, the 3 the backfill dated with their accounts' sign-ups are to re-date, each to its OWN record's instant (by EAT day 2026-10-03 ×2 and 2026-10-04 ×1; today they read 2026-08-01 to 2026-10-02) — the sign-up's own row, the 2 already right, the 2 with no record of their write for their account, the 1 without an account and the 1 not of the writer's shape are LEFT and counted (no instant invented, no record older than the writer read); an officer's linked row and the tombstone are not read; the store and the records untouched; the lines carry no id, number or name and end with the exact apply line (--expect 3)",
  k2: "7.2 · ⛔ every refusal BEFORE the record writes and records nothing: a phone number in --by, seven numerals split across --by and --reason (bad_ops_text), no database (exit 2), a missing or a non-numeric --expect (bad_expect), --expect 4 over 3 rows (expect_mismatch) — the store and the door's records unchanged",
  k3: "7.3 · ⭐ APPLY RE-DATES EXACTLY THE 3, ALL AT ONCE: each row's Added is its record's instant and its updatedAt the later of its own and that instant (the never-edited rows move with it; the officer-edited row keeps its edit's stamp and its officer), every other field and every other row byte-identical — DONE, exit 0",
  k4: "7.4 · ⭐ RECORD FIRST, AND THE ENDING RECORDED: COMPLIANCE contacts.added_redate_applying is on the chain when the store's write is called — on MarketingContact#added-redate, no actor, naming each row's id with its Added before and after, the count, the EAT days, the operator's by and reason and the ruling — and contacts.added_redate_applied follows, naming the applying record and the 3 written; the outcome names both; no number, name or email in either",
  k5: "7.5 · ⭐ IDEMPOTENT: after the apply, status counts 0 to re-date (the 3 now already right, 5 in all) and a second apply with --expect 0 is NOTHING TO DO, exit 0 — nothing written, nothing recorded, the store byte-identical",
  k6: "7.6 · ⛔ ALL OR NOTHING: when another run re-dates one of three rows between the plan and the write, the store refuses the whole write as changed — the other two keep their old Added — and the attempt is recorded contacts.added_redate_refused naming that row; exit 1",
  k7: "7.7 · ⛔ every other ending, honestly: an applying record that does not land writes nothing (record_failed); a write that throws is recorded _failed, its outcome unknown, with the error's name and code and never its message (write_failed); a write that answers done but moved nothing is caught by the fresh read-back (read_back_mismatch, recorded _failed) — the store byte-identical through all three",
  k8: "7.8 · ⭐ END TO END OVER THE REAL AUDIT LOG: a row in the old writer's shape whose contacts.contact.registered record the REAL audit() wrote with via backfill is found through the audit module's own durable reader (getAuditForTargetsDurable, the one the CLI hands in) and re-dated to exactly that record's instant",
  k9: "7.9 · THE DOOR'S SOURCE: the CLI rewrites the private database host BEFORE it loads the door (a dynamic import, no static one), refuses with no DATABASE_URL, hands the door the audit module's getAuditForTargetsDurable, answers status before the production checks, runs apply only with production's own environment, an audit key that is not the session's and a synced clock, and writes nothing itself; the door module calls no audit-row reader of its own and records before its one write; ops:contacts-added-redate is wired",
} as const;

/* ═══ THE RUN ════════════════════════════════════════════════════════════════════════════════════ */

async function runAssertions(impl: Impl, tag: string): Promise<void> {
  RUN++;
  const p = (n: string) => `${tag}${n}`;
  /** Every account this run makes — the audit scan's population. */
  const runAccounts = new Set<string>();
  const addAccount = async (phone: string) => {
    const u = await db.user.findByPhone(phone);
    if (u) runAccounts.add(u.id);
    return u;
  };

  await inEmptyWorld(async () => {
    /* ── §1 · THE DOORS ──────────────────────────────────────────────────────────────────────────── */
    const P = { pw: num(1), known: num(3), boot: num(4), throwPw: num(5), silent: num(7) };
    // ⛔ P.pw's page posts the removed box's tick (a page served before 2026-10-07); P.known said yes before signing up.
    const pwRun = await impl.password(P.pw, mail(1), true);
    await ledger(P.known, "GIVEN", "2026-09-20T08:00:01.000Z");
    const knownRun = await impl.password(P.known, mail(3), false);

    await check(p(L.d1), async () => {
      const u1 = await addAccount(P.pw);
      const c1 = await db.marketingContact.findByMsisdn(keyOf(P.pw));
      const good = (u: StoredUser | null, c: StoredMarketingContact | null, phone: string) =>
        u !== null && c !== null && c.source === "REGISTRATION" && c.userId === u.id && c.sourceRef === u.id && c.msisdn === keyOf(phone) && rowsFor(phone) === 1;
      const say = (u: StoredUser | null, c: StoredMarketingContact | null, run: DoorRun) =>
        u === null ? `NO ACCOUNT (${JSON.stringify(run.result)} ${run.thrown.slice(0, 60)})` : c === null ? "account, NO ROW" : `${c.source}, linked ${c.userId === u.id}`;
      return [good(u1, c1, P.pw), `password: ${say(u1, c1, pwRun)}`];
    });
    await check(p(L.d2), async () => {
      const knownUser = await addAccount(P.known);
      const fresh = await db.marketingContact.findByMsisdn(keyOf(P.pw));
      const freshRows = await db.messagingConsent.listFor(mkey(P.pw));
      const freshUser = await db.user.findByPhone(P.pw);
      const known = await db.marketingContact.findByMsisdn(keyOf(P.known));
      const knownRows = await db.messagingConsent.listFor(mkey(P.known));
      return [fresh !== null && fresh.consentState === "UNKNOWN" && freshRows.length === 0 && freshUser?.marketingOptIn === false
        && knownUser !== null && known !== null && known.consentState === "GIVEN" && knownRows.length === 1 && knownRows[0]?.status === "GIVEN",
        `new number ${fresh?.consentState ?? "no row"} (${freshRows.length} ledger row(s), switch ${freshUser?.marketingOptIn}) · known number ${known?.consentState ?? `no row ${knownRun.thrown.slice(0, 40)}`} (${knownRows.length} ledger row(s))`];
    });

    const bootRun = await impl.bootstrapDoor(P.boot, mail(4));
    await check(p(L.d3), async () => {
      const u = await addAccount(P.boot);
      const c = await db.marketingContact.findByMsisdn(keyOf(P.boot));
      return [u !== null && u.role === "ADMIN" && c === null && rowsFor(P.boot) === 0,
        `${u ? u.role : `no account ${bootRun.thrown.slice(0, 40)}`} · ${c ? "A BOOK ROW" : "no row"}`];
    });

    // ── a THROWING book: the store's create refuses for the length of the door ──
    const refuse = (row: StoredMarketingContact) => { throw new Error(`planted by test:registration-contact: the book refused ${row.msisdn}`); };
    const thrown = await capturingErrors(() => withBookMember("create", refuse, async () => ({
      pw: await impl.password(P.throwPw, mail(5), true),
    })));
    const wrapper = (await capturingErrors(() => settle(impl.atSignup(account(`rc${RUN}_w8`, num(8)), {
      book: { ...REGISTRATION_BOOK, create: async () => { throw new Error("planted by test:registration-contact"); } },
    })))).value;
    await check(p(L.d4), async () => {
      const finished = async (phone: string, run: DoorRun) => {
        const u = await addAccount(phone);
        const w = u ? await db.wallet.findByUserId(u.id) : null;
        return u !== null && w !== null && !run.thrown.includes("planted") && rowsFor(phone) === 0;
      };
      const a = await finished(P.throwPw, thrown.value.pw);
      const w = wrapper.ok ? wrapper.value : null;
      return [a && w !== null && w.outcome === "failed" && "stage" in w && w.stage === "create",
        `password finished ${a} · wrapper ${wrapper.ok ? JSON.stringify(wrapper.value) : `REJECTED (${String((wrapper.error as Error)?.message ?? wrapper.error)})`}`];
    });

    // ── the failure's log line, with a database message that prints the row ──
    const LEAK_MAIL = "leak.check@example.tz";
    const leakPhone = num(9);
    const loud = await capturingErrors(() => impl.ensure(account(`rc${RUN}_leak`, leakPhone, { email: LEAK_MAIL }), {
      book: {
        ...REGISTRATION_BOOK,
        create: async (row) => {
          throw Object.assign(new Error(`Invalid prisma.marketingContact.create() invocation: msisdn ${row.msisdn}, email ${row.email}`), { code: "P2010" });
        },
      },
    }));
    // …and the U24 mirror's own failure line, with a read whose message prints the key it was asked for
    const mirrorLoud = await capturingErrors(() => withBookMember("findByMsisdn", (m: string) => {
      throw new Error(`Invalid prisma.marketingContact.findUnique() invocation: where msisdn ${m}`);
    }, () => impl.mirror(keyOf(leakPhone))));
    await check(p(L.d5), () => {
      const ours = loud.lines.filter((l) => l.includes("[registration-contact]"));
      const dirty = loud.lines.filter((l) => l.includes(nationalOf(leakPhone)) || l.includes(LEAK_MAIL));
      const mirrorOurs = mirrorLoud.lines.filter((l) => l.includes("[contact-cache]"));
      const mirrorDirty = mirrorLoud.lines.filter((l) => l.includes(nationalOf(leakPhone)));
      return [loud.value.outcome === "failed" && ours.length >= 1 && dirty.length === 0
        && mirrorLoud.value === "failed" && mirrorOurs.length >= 1 && mirrorDirty.length === 0,
        `${loud.value.outcome} · ${ours.length} line(s) · ${dirty.length} carrying the number or the address · ${ours[0] ?? "no line"} · mirror ${mirrorLoud.value}: ${mirrorOurs[0] ?? "no line"} (${mirrorDirty.length} carrying the number)`];
    });

    // ── a SILENT book: the wrapper with a book that never answers, then the real password door with a read that never answers ──
    const t0 = Date.now();
    const quiet = (await capturingErrors(() => within(impl.atSignup(account(`rc${RUN}_slow`, num(10)), {
      book: { ...REGISTRATION_BOOK, findByMsisdn: () => new Promise<StoredMarketingContact | null>(() => undefined) },
      budgetMs: 50,
    }), 2_000))).value;
    const wrapperMs = Date.now() - t0;
    const t1 = Date.now();
    const door = await capturingErrors(() => withBookMember("findByMsisdn", () => new Promise(() => undefined), () => within(impl.password(P.silent, mail(7), false), 8_000)));
    const doorMs = Date.now() - t1;
    await check(p(L.d6), async () => {
      const u = await addAccount(P.silent);
      const w = u ? await db.wallet.findByUserId(u.id) : null;
      const wrapperOk = quiet.settled && quiet.value.outcome === "timed_out" && wrapperMs < 2_000;
      return [wrapperOk && door.value.settled && u !== null && w !== null,
        `wrapper ${quiet.settled ? quiet.value.outcome : "STILL WAITING"} after ${wrapperMs} ms · door ${door.value.settled ? "finished" : "STILL WAITING"} after ${doorMs} ms · wallet ${w !== null}`];
    });

    /* ── §2 · THE RULE ───────────────────────────────────────────────────────────────────────────── */
    const A1 = account(`rc${RUN}_a1`, num(11), { displayName: "  Asha   Mwakalinga ", email: "Asha.M@Example.TZ", createdAt: "2026-09-20T08:00:00.000Z" });
    const A2 = account(`rc${RUN}_a2`, num(12), { displayName: "x".repeat(121), email: "not-an-address" });
    for (const u of [A1, A2]) { await db.user.create(u); runAccounts.add(u.id); }
    // ⭐ C8b (B8) · the rule's clock is the moment the row enters the book — weeks after A1 signed up, as the backfill was.
    const rA1 = await impl.ensure(A1, { now: atClock });
    const rA2 = await impl.ensure(A2, { now: atClock });
    await check(p(L.r1), async () => {
      const row = await db.marketingContact.findByMsisdn(keyOf(A1.phoneE164));
      const row2 = await db.marketingContact.findByMsisdn(keyOf(A2.phoneE164));
      const q = parseTzNumber(A1.phoneE164);
      const shape = row !== null && row.msisdn === q.msisdn && row.msisdn.startsWith("255") && row.msisdn.length === 12 && row.ndc === q.ndc
        && row.operator === null && row.rawInput === A1.phoneE164 && row.displayName === "Asha Mwakalinga" && row.email === "asha.m@example.tz"
        && row.notes === null && row.tags.length === 0 && row.importId === null && row.createdBy === null && row.updatedBy === null
        && row.createdAt === CLOCK && row.createdAt !== A1.createdAt && row.updatedAt === row.createdAt && row.source === "REGISTRATION"
        && row.sourceRef === A1.id && row.userId === A1.id && ID_SHAPE.test(row.id)
        && rA1.outcome === "created" && "contactId" in rA1 && rA1.contactId === row.id;
      const dropped = row2 !== null && row2.displayName === null && row2.email === null && rA2.outcome === "created";
      return [shape && dropped,
        row ? `${row.id} ${row.msisdn} ndc ${row.ndc} op ${row.operator} "${row.displayName}" ${row.email} ${row.createdAt}/${row.updatedAt} · second "${row2?.displayName}" ${row2?.email}` : `no row (${JSON.stringify(rA1)})`];
    });

    const B1 = account(`rc${RUN}_b1`, num(13));
    const B2 = account(`rc${RUN}_b2`, num(14));
    const B3 = account(`rc${RUN}_b3`, num(15));
    for (const u of [B1, B2, B3]) { await db.user.create(u); runAccounts.add(u.id); }
    await ledger(B1.phoneE164, "GIVEN", "2026-09-20T08:00:01.000Z");
    await ledger(B2.phoneE164, "GIVEN", "2026-09-20T08:00:01.000Z");
    await ledger(B2.phoneE164, "WITHDRAWN", "2026-09-21T08:00:00.000Z");
    const ledgerBefore = MEM.messagingConsents.size;
    const rB = [await impl.ensure(B1), await impl.ensure(B2), await impl.ensure(B3)];
    await check(p(L.r2), async () => {
      const states: string[] = [];
      for (const u of [B1, B2, B3]) states.push((await db.marketingContact.findByMsisdn(keyOf(u.phoneE164)))?.consentState ?? "no row");
      const b3Rows = await db.messagingConsent.listFor(mkey(B3.phoneE164));
      return [states.join(",") === "GIVEN,WITHDRAWN,UNKNOWN" && MEM.messagingConsents.size === ledgerBefore && b3Rows.length === 0 && rB.every((r) => r.outcome === "created"),
        `${states.join(",")} · ledger ${ledgerBefore} → ${MEM.messagingConsents.size} · ${rB.map((r) => r.outcome).join(",")}`];
    });

    const D = account(`rc${RUN}_d`, num(21), { displayName: "Account Name", email: "account@example.tz" });
    await db.user.create(D);
    runAccounts.add(D.id);
    const X = bookRow(`mc_rc_x_${RUN}`, num(21), { displayName: "Mama Asha (typed)", email: "typed@example.tz", notes: "Met at the stand.", tags: ["vip"] });
    await db.marketingContact.create(X);
    await ledger(D.phoneE164, "GIVEN", "2026-09-10T08:00:00.000Z");
    const rD = await impl.ensure(D);
    await check(p(L.r3), async () => {
      const row = await db.marketingContact.find(X.id);
      const kept = row !== null && row.userId === D.id && row.source === "OPERATOR" && row.displayName === X.displayName && row.email === X.email
        && row.notes === X.notes && JSON.stringify(row.tags) === JSON.stringify(X.tags) && row.sourceRef === null && row.createdBy === X.createdBy
        && row.createdAt === X.createdAt && row.consentState === "GIVEN";
      return [kept && rD.outcome === "linked" && "contactId" in rD && rD.contactId === X.id && rowsFor(D.phoneE164) === 1,
        row ? `${rD.outcome} · ${row.source}, linked ${row.userId === D.id}, "${row.displayName}" ${row.email} · ${row.consentState} · ${rowsFor(D.phoneE164)} row(s)` : "the row is gone"];
    });
    await check(p(L.r4), async () => {
      const row = await db.marketingContact.find(X.id);
      return [row !== null && row.updatedAt === X.updatedAt && row.updatedBy === X.updatedBy, `${X.updatedAt} → ${row?.updatedAt} · by ${row?.updatedBy}`];
    });

    const bootNumber = num(39);
    const outsiders: Array<[StoredUser, string]> = [
      [account(`rc${RUN}_g1`, num(31), { role: "GROWTH" }), "not_a_player"],
      [account(`rc${RUN}_g2`, num(32), { role: "ADMIN" }), "not_a_player"],
      [account(`rc${RUN}_g3`, num(33), { role: "AGENT" }), "not_a_player"],
      [account(`rc${RUN}_f1`, foreign(34)), "not_tz_mobile"],
      [account(`rc${RUN}_f2`, num(35, "64")), "not_tz_mobile"],
      [account(`rc${RUN}_f3`, num(36, "22")), "not_tz_mobile"],
      [account(`rc${RUN}_c1`, num(37), { status: "CLOSED", closedAt: "2026-09-25T08:00:00.000Z" }), "closed"],
      [account(`rc${RUN}_x1`, `erased:rc${RUN}_x1`, { status: "CLOSED", closedAt: "2026-09-25T08:00:00.000Z" }), "erased"],
      [account(`rc${RUN}_ba`, bootNumber), "bootstrap_admin"],
    ];
    for (const [u] of outsiders) { await db.user.create(u); runAccounts.add(u.id); }
    await auditFlush();
    const before5 = snapshot();
    const audits5 = registrationAuditCount();
    const r5: RegistrationContactResult[] = [];
    for (const [u] of outsiders) r5.push(await impl.ensure(u, { bootstrapPhones: new Set([bootNumber]) }));
    await auditFlush();
    await check(p(L.r5), () => {
      const got = r5.map((r) => (r.outcome === "skipped" ? r.reason : r.outcome));
      const want = outsiders.map(([, w]) => w);
      return [got.join(",") === want.join(",") && snapshot() === before5 && registrationAuditCount() === audits5,
        `got ${got.join(",")} · store ${snapshot() === before5 ? "untouched" : "WRITTEN"} · audit ${audits5} → ${registrationAuditCount()}`];
    });

    await auditFlush();
    const before6 = snapshot();
    const audits6 = registrationAuditCount();
    const again = await impl.ensure(D);
    await auditFlush();
    await check(p(L.r6), () => [
      again.outcome === "already_linked" && "contactId" in again && again.contactId === X.id && snapshot() === before6 && registrationAuditCount() === audits6,
      `${again.outcome} · store ${snapshot() === before6 ? "unchanged" : "CHANGED"} · audit ${audits6} → ${registrationAuditCount()}`,
    ]);

    /* ── §3 · THE RECYCLED-NUMBER RULES ──────────────────────────────────────────────────────────── */
    const T = account(`rc${RUN}_t`, num(41), { displayName: "New Holder", email: "new.holder@example.tz" });
    await db.user.create(T);
    runAccounts.add(T.id);
    // The erased person's row, as erasure left it before C8b: emptied, marked — and still on two lists.
    const tomb = bookRow(`mc_rc_tomb_${RUN}`, num(41), {
      source: "IMPORT", sourceRef: ERASURE_EVIDENCE, rawInput: keyOf(num(41)), consentState: "WITHDRAWN", createdBy: "usr_officer_old",
      createdAt: "2026-08-01T08:00:00.000Z", updatedAt: "2026-08-20T08:00:00.000Z", updatedBy: "usr_dpo",
    });
    await db.marketingContact.create(tomb);
    const bystander = bookRow(`mc_rc_by_${RUN}`, num(44), { displayName: "Bystander" });
    await db.marketingContact.create(bystander);
    const LISTS = [`cl_rc_a_${RUN}`, `cl_rc_b_${RUN}`];
    for (const id of LISTS) {
      await db.contactList.create({ id, name: `List ${id}`, description: null, createdAt: "2026-08-01T08:00:00.000Z", createdBy: "usr_officer_rc", updatedAt: "2026-08-01T08:00:00.000Z", updatedBy: "usr_officer_rc" });
      await db.contactListMember.add({ listId: id, contactId: tomb.id, addedAt: "2026-08-05T08:00:00.000Z", addedBy: "usr_officer_rc" });
    }
    await db.contactListMember.add({ listId: LISTS[0], contactId: bystander.id, addedAt: "2026-08-05T08:00:00.000Z", addedBy: "usr_officer_rc" });
    await ledger(T.phoneE164, "GIVEN", "2026-08-02T08:00:00.000Z");
    await ledger(T.phoneE164, "WITHDRAWN", "2026-08-20T08:00:00.000Z");
    const rT = await impl.ensure(T, { now: atClock });
    await auditFlush();
    const beforeAgain = snapshot();
    const againT = await impl.ensure(T, { now: atClock });
    await auditFlush();
    await check(p(L.t1), async () => {
      const row = await db.marketingContact.find(tomb.id);
      const memberships = await db.contactListMember.listMemberships(tomb.id);
      const listsKept = (await Promise.all(LISTS.map((id) => db.contactList.find(id)))).every((l) => l !== null);
      const byKept = (await db.contactListMember.listMemberships(bystander.id)).length === 1;
      const shaped = row !== null && row.id === tomb.id && row.msisdn === tomb.msisdn && row.userId === T.id && row.source === "REGISTRATION"
        && row.sourceRef === T.id && row.displayName === "New Holder" && row.email === "new.holder@example.tz" && row.notes === null
        && row.tags.length === 0 && row.importId === null && row.createdBy === null && row.updatedBy === null
        && row.createdAt === CLOCK && row.updatedAt === CLOCK && row.rawInput === T.phoneE164 && row.consentState === "WITHDRAWN";
      return [rT.outcome === "revived" && "contactId" in rT && rT.contactId === tomb.id && shaped && rowsFor(T.phoneE164) === 1
        && memberships.length === 0 && listsKept && byKept && againT.outcome === "already_linked" && snapshot() === beforeAgain,
        `${JSON.stringify(rT)} · ${row ? `${row.source} linked ${row.userId === T.id} "${row.displayName}" added ${row.createdAt} by ${row.createdBy}` : "NO ROW"} · memberships ${memberships.length} · lists kept ${listsKept} · bystander ${byKept} · again ${againT.outcome}, store ${snapshot() === beforeAgain ? "unchanged" : "CHANGED"}`];
    });

    const O = account(`rc${RUN}_o`, num(42));
    const H = account(`rc${RUN}_h`, num(43));
    for (const u of [O, H]) { await db.user.create(u); runAccounts.add(u.id); }
    const other = bookRow(`mc_rc_other_${RUN}`, num(42), {
      source: "REGISTRATION", sourceRef: H.id, userId: H.id, displayName: "Previous holder", email: "previous@example.tz",
      createdBy: null, updatedBy: null, createdAt: "2026-07-01T08:00:00.000Z", updatedAt: "2026-07-01T08:00:00.000Z",
    });
    await db.marketingContact.create(other);
    const otherBefore = JSON.stringify(await db.marketingContact.find(other.id));
    const rO = await impl.ensure(O);
    await check(p(L.t2), async () => {
      const after = JSON.stringify(await db.marketingContact.find(other.id));
      return [rO.outcome === "kept_other_account" && !("contactId" in rO) && !JSON.stringify(rO).includes(other.id) && after === otherBefore && rowsFor(O.phoneE164) === 1,
        `${JSON.stringify(rO)} · the other account's row ${after === otherBefore ? "untouched" : `CHANGED to ${after}`}`];
    });

    // ⭐ C8b · THE REVIVAL'S COMPARE: between this sign-up's read and its revival, ANOTHER account's sign-up revives the
    // tombstone first (the backfill racing a sign-up) — the store must refuse the second write.
    const Q = account(`rc${RUN}_q`, num(45), { displayName: "Second Comer", email: "second.comer@example.tz" });
    const Q0 = account(`rc${RUN}_q0`, num(46));
    for (const u of [Q, Q0]) { await db.user.create(u); runAccounts.add(u.id); }
    const qTomb = bookRow(`mc_rc_qtomb_${RUN}`, num(45), {
      source: "IMPORT", sourceRef: ERASURE_EVIDENCE, rawInput: keyOf(num(45)), consentState: "UNKNOWN", createdBy: null,
      createdAt: "2026-08-01T08:00:00.000Z", updatedAt: "2026-08-20T08:00:00.000Z", updatedBy: "usr_dpo",
    });
    await db.marketingContact.create(qTomb);
    const firstComer = { ...bookRow(`mc_rc_qwin_${RUN}`, num(45)), source: "REGISTRATION" as const, sourceRef: Q0.id, userId: Q0.id,
      displayName: "First Comer", createdBy: null, updatedBy: null, createdAt: CLOCK, updatedAt: CLOCK };
    const racing: RegistrationContactDeps = {
      now: atClock,
      book: {
        ...REGISTRATION_BOOK,
        revive: async (tombstone, row) => {
          // The other sign-up lands first, through the store's own revival …
          await db.marketingContact.reviveTombstone({ id: tombstone.id, msisdn: tombstone.msisdn, row: { ...firstComer, id: tombstone.id } });
          // … and only then this one's — which must find the row no longer the tombstone.
          return impl.revive(tombstone, row);
        },
      },
    };
    const rQ = await impl.ensure(Q, racing);
    await check(p(L.t3), async () => {
      const row = await db.marketingContact.find(qTomb.id);
      return [rQ.outcome === "kept_other_account" && !("contactId" in rQ) && row !== null && row.userId === Q0.id
        && row.displayName === "First Comer" && row.email === null && rowsFor(Q.phoneE164) === 1,
        `${JSON.stringify(rQ)} · the row ${row ? `linked to ${row.userId === Q0.id ? "the first comer" : row.userId === Q.id ? "THIS account" : row.userId}, "${row.displayName}"` : "GONE"}`];
    });

    /* ── §4 · THE AUDIT ──────────────────────────────────────────────────────────────────────────── */
    const SECRETS: string[] = [];
    for (let s = 1; s <= 46; s++) SECRETS.push(nationalOf(num(s)));
    SECRETS.push(nationalOf(num(35, "64")), nationalOf(num(36, "22")), nationalOf(foreign(34)));
    for (let s = 1; s <= 7; s++) SECRETS.push(mail(s));
    SECRETS.push("Asha", "Mwakalinga", "Account Name", "New Holder", "Previous holder", "asha.m@example.tz", "Asha.M@Example.TZ",
      "account@example.tz", "typed@example.tz", "new.holder@example.tz", "previous@example.tz", LEAK_MAIL,
      "Second Comer", "second.comer@example.tz", "First Comer", "Bystander");
    await auditFlush();
    await check(p(L.a1), () => {
      const entries = registrationAudits();
      const createdId = "contactId" in rA1 ? rA1.contactId : "";
      const reg = entries.find((e) => e.action === "contacts.contact.registered" && e.targetId === createdId);
      const lnk = entries.find((e) => e.action === "contacts.contact.linked" && e.targetId === X.id);
      const rev = entries.find((e) => e.action === "contacts.contact.revived" && e.targetId === tomb.id);
      const pr = (reg?.payload ?? {}) as Record<string, unknown>;
      const pl = (lnk?.payload ?? {}) as Record<string, unknown>;
      const pv = (rev?.payload ?? {}) as Record<string, unknown>;
      const mine = entries.filter((e) => runAccounts.has(String(((e.payload ?? {}) as Record<string, unknown>).account ?? "")));
      const dirty = leaksIn(JSON.stringify(mine), SECRETS);
      return [!!reg && reg.actorId === A1.id && reg.targetType === "MarketingContact" && pr.number === maskPhone(keyOf(A1.phoneE164)) && pr.account === A1.id
        && pr.via === "signup" && JSON.stringify(pr.fields) === JSON.stringify(["displayName", "email"])
        && !!lnk && lnk.actorId === D.id && pl.keptSource === "OPERATOR" && pl.number === maskPhone(keyOf(D.phoneE164)) && pl.account === D.id
        && !!rev && rev.actorId === T.id && rev.targetType === "MarketingContact" && pv.number === maskPhone(keyOf(T.phoneE164)) && pv.account === T.id
        && pv.via === "signup" && JSON.stringify(pv.fields) === JSON.stringify(["displayName", "email"]) && pv.membershipsDeleted === 2
        && mine.length >= 4 && dirty.length === 0,
        `registered ${JSON.stringify(reg?.payload ?? null)} · linked ${JSON.stringify(lnk?.payload ?? null)} · revived ${JSON.stringify(rev?.payload ?? null)} · ${mine.length} row(s) · ${dirty.length ? `CARRY ${dirty.join(",")}` : "clean"}`];
    });

    /* ── §5 · THE BACKFILL — its own empty world ─────────────────────────────────────────────────── */
    await inEmptyWorld(async () => {
      const W = {
        w1: account(`rc${RUN}_w01`, num(51), { displayName: "Neema Kileo", email: "neema.k@example.tz", marketingOptIn: true }),
        w2: account(`rc${RUN}_w02`, num(52)),
        w3: account(`rc${RUN}_w03`, num(53), { displayName: "Baraka Juma", email: "baraka@example.tz" }),
        w4: account(`rc${RUN}_w04`, num(54)),
        w5: account(`rc${RUN}_w05`, num(55)),
        w6: account(`rc${RUN}_w06`, num(56)),
        w6x: account(`rc${RUN}_w07`, num(57), { status: "CLOSED", closedAt: "2026-09-20T08:00:00.000Z" }),
        w7: account(`rc${RUN}_w08`, num(58), { status: "CLOSED", closedAt: "2026-09-21T08:00:00.000Z" }),
        w8: account(`rc${RUN}_w09`, num(59, "64")),
        w9: account(`rc${RUN}_w10`, num(60)),
        s1: account(`rc${RUN}_w11`, num(61), { role: "GROWTH" }),
        a1: account(`rc${RUN}_w12`, num(62), { role: "AGENT" }),
        e1: account(`rc${RUN}_w13`, `erased:rc${RUN}_w13`, { status: "CLOSED", closedAt: "2026-09-22T08:00:00.000Z" }),
        f1: account(`rc${RUN}_w14`, foreign(63)),
      };
      for (const u of Object.values(W)) await db.user.create(u);
      await ledger(W.w1.phoneE164, "GIVEN", "2026-09-20T08:00:01.000Z");
      await db.marketingContact.create(bookRow(`mc_rc_b3_${RUN}`, W.w3.phoneE164, { displayName: "Baraka (typed)" }));
      await db.marketingContact.create(bookRow(`mc_rc_b4_${RUN}`, W.w4.phoneE164, { source: "REGISTRATION", sourceRef: W.w4.id, userId: W.w4.id, createdBy: null, updatedBy: null }));
      await db.marketingContact.create(bookRow(`mc_rc_b5_${RUN}`, W.w5.phoneE164, { source: "IMPORT", sourceRef: ERASURE_EVIDENCE, consentState: "WITHDRAWN", createdBy: null }));
      await ledger(W.w5.phoneE164, "WITHDRAWN", "2026-08-20T08:00:00.000Z");
      await db.marketingContact.create(bookRow(`mc_rc_b6_${RUN}`, W.w6.phoneE164, { source: "REGISTRATION", sourceRef: W.w6x.id, userId: W.w6x.id, displayName: "Previous holder", createdBy: null, updatedBy: null }));
      const bootstrapPhones = new Set([W.w9.phoneE164]);
      const WALKED = [W.w1, W.w2, W.w3, W.w4, W.w5, W.w6, W.w6x, W.w7, W.w8, W.w9].map((u) => u.id).sort();
      // ⭐ C8b (B1) · w5's tombstone is REVIVED as w5's own row (until C8b it was kept).
      const OUTCOMES = { created: 2, revived: 1, linked: 1, already_linked: 1, kept_other_account: 1, skipped: 4, failed: 0 };
      const SKIPS = { not_a_player: 0, bootstrap_admin: 1, closed: 2, erased: 0, not_tz_mobile: 1 };
      const WORLD_SECRETS = [
        ...[51, 52, 53, 54, 55, 56, 57, 58, 60, 61, 62].map((s) => nationalOf(num(s))), nationalOf(num(59, "64")), nationalOf(foreign(63)),
        "Neema", "Kileo", "neema.k@example.tz", "Baraka", "baraka@example.tz", "Previous holder",
      ];

      // 5.0 · the dry run — through the REAL walk, so only the dry deps are on trial
      await auditFlush();
      const beforeDry = snapshot();
      const auditsDry = registrationAuditCount();
      const dry = await backfillRegistrationContacts({ chunk: 2, contact: { ...impl.dryRunDeps(), bootstrapPhones } });
      await auditFlush();
      await check(p(L.b0), () => [
        snapshot() === beforeDry && registrationAuditCount() === auditsDry && eqCounts(dry.outcomes, OUTCOMES) && eqCounts(dry.skipped, SKIPS),
        `store ${snapshot() === beforeDry ? "unchanged" : "WRITTEN"} · audit ${auditsDry} → ${registrationAuditCount()} · ${JSON.stringify(dry.outcomes)}`,
      ]);

      // 5.1 · the first real run, every visit counted
      const visits: string[] = [];
      const counting: Ensure = async (u, d) => { visits.push(u.id); return ensureRegistrationContact(u, d); };
      const first = await impl.backfill({ chunk: 2, contact: { bootstrapPhones }, ensure: counting });
      await check(p(L.b1), async () => {
        const made = [await db.marketingContact.findByMsisdn(keyOf(W.w1.phoneE164)), await db.marketingContact.findByMsisdn(keyOf(W.w2.phoneE164))];
        const linked = await db.marketingContact.find(`mc_rc_b3_${RUN}`);
        const revived = await db.marketingContact.find(`mc_rc_b5_${RUN}`);
        const once = visits.length === WALKED.length && [...visits].sort().join(",") === WALKED.join(",");
        return [first.accounts === 14 && first.walked === 10 && first.missing === 0 && eqCounts(first.outcomes, OUTCOMES) && eqCounts(first.skipped, SKIPS)
          && eqCounts(first.cache, { none: 0, unchanged: 5, updated: 1, failed: 0 }) && once
          && made[0]?.userId === W.w1.id && made[0]?.consentState === "GIVEN" && made[1]?.userId === W.w2.id && linked?.userId === W.w3.id
          && revived?.userId === W.w5.id && revived.source === "REGISTRATION" && revived.sourceRef === W.w5.id,
          `accounts ${first.accounts} · walked ${first.walked} (${visits.length} visits) · ${JSON.stringify(first.outcomes)} · ${JSON.stringify(first.skipped)} · cache ${JSON.stringify(first.cache)}`];
      });

      // 5.2 · the second run
      await auditFlush();
      const before2 = snapshot();
      const audits2 = registrationAuditCount();
      const second = await impl.backfill({ chunk: 2, contact: { bootstrapPhones } });
      await auditFlush();
      await check(p(L.b2), () => [
        second.outcomes.created === 0 && second.outcomes.revived === 0 && second.outcomes.linked === 0 && second.outcomes.already_linked === 5
          && second.outcomes.failed === 0 && second.cache.updated === 0 && snapshot() === before2 && registrationAuditCount() === audits2,
        `${JSON.stringify(second.outcomes)} · cache ${JSON.stringify(second.cache)} · store ${snapshot() === before2 ? "unchanged" : "CHANGED"} · audit ${audits2} → ${registrationAuditCount()}`,
      ]);

      // 5.3 · counts only
      await check(p(L.b3), () => {
        const lines = [...impl.report(first, { production: false, dryRun: false }), ...impl.report(second, { production: true, dryRun: true })];
        const dirty = leaksIn([JSON.stringify(first), JSON.stringify(second), ...lines].join(LF), WORLD_SECRETS);
        return [dirty.length === 0 && lines.length >= 20, dirty.length ? `CARRIES ${dirty.join(",")}` : `${lines.length} report line(s), counts only`];
      });
    });
  });

  /* ── §6 · THE SOURCE ───────────────────────────────────────────────────────────────────────────── */
  const src = impl.sources;
  await check(p(L.s1), () => {
    const auth = src.auth;
    // ⭐ ONE account factory (2026-10-06): a second `db.user.create(` in auth-service is a second sign-up door.
    const factories = auth.split("db.user.create(").length - 1;
    const doors = ["registerWithPassword"].map((name) => {
      const body = fnBody(auth, name);
      const calls = body.split("registrationContactAtSignup(").length - 1;
      const iUser = body.indexOf("db.user.create(");
      const iHook = body.indexOf("await registrationContactAtSignup(user);");
      const iWallet = body.indexOf("wallet.create(");
      const placed = calls === 1 && iUser >= 0 && iWallet > iUser && iHook > iWallet;
      return { name, placed, at: [iUser, iWallet, iHook].join("/"), calls };
    });
    // ⛔ 2026-10-07 · the SMS-offers box is removed, and with it the door's ledger row: auth-service appends none.
    const ledgerAppends = auth.split("appendMarketingConsent(").length - 1;
    const imported = auth.includes('import { registrationContactAtSignup } from "@/lib/server/marketing/registration-contact";');
    const unbounded = auth.includes("ensureRegistrationContact");
    return [doors.every((d) => d.placed) && ledgerAppends === 0 && factories === 1 && imported && !unbounded,
      `${doors.map((d) => `${d.name} ${d.placed ? "placed" : "OFF"} (${d.calls} call(s) @${d.at})`).join(" · ")} · ledger appends ${ledgerAppends} · account factories ${factories} · imported ${imported} · unbounded call ${unbounded}`];
  });
  await check(p(L.s2), () => {
    const copy = src.copy;
    const one = copy.split("export const SOURCE_LABEL").length === 2;
    const declared = copy.includes('REGISTRATION: "Signed up",');
    const old = copy.includes('"Sign-up"');
    const readers = src.exportSrc.includes("SOURCE_LABEL[c.source]") && src.loader.includes("SOURCE_LABEL[row.source]");
    return [impl.label === "Signed up" && one && declared && !old && readers,
      `label "${impl.label}" · one table ${one} · declared ${declared} · old label ${old} · readers ${readers}`];
  });
  await check(p(L.s3), () => {
    const s = src.backfill;
    const iProd = s.indexOf('const PRODUCTION = ARGS.includes("--production");');
    const iUrl = s.indexOf("const GIVEN_URL = process.env.DATABASE_URL;");
    const iNoUrl = s.indexOf("if (!GIVEN_URL) {");
    const iTwin = s.indexOf('if (process.env.USE_PRISMA_DAL === "false") {');
    const iLoop = s.indexOf('const LOOPBACK = ["127.0.0.1", "localhost", "::1", "[::1]"];');
    const iRefuse = s.indexOf("if (!LOOPBACK.includes(host) && !PRODUCTION) {");
    // A real-database WRITE run signs audit rows: without the app's own key they would never verify on production.
    const iKey = s.indexOf("if (REAL_DATABASE && !DRY_RUN) {");
    const keyed = iKey >= 0 && s.indexOf("process.env.AUDIT_CHAIN_SECRET", iKey) > iKey;
    const iImport = s.indexOf("await import(");
    const staticImport = s.split(LF).some((line) => line.startsWith("import "));
    const walks = s.includes("backfillRegistrationContacts(") && s.includes("registrationBackfillReport(");
    const quiet = !/phoneE164|msisdn|displayName|[.]email/.test(s);
    const exits = s.split("process.exit(2)").length - 1;
    // The probe writes rows too: the same loopback refusal, before its store loads, and no value import above it.
    const q = src.probe;
    const qUrl = q.indexOf("if (!process.env.DATABASE_URL) {");
    const qLoop = q.indexOf('if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {');
    const qImport = q.indexOf("await import(");
    const qStatic = q.split(LF).some((line) => line.startsWith("import ") && !line.startsWith("import type "));
    const probeOk = qUrl >= 0 && qLoop > qUrl && qImport > qLoop && !qStatic;
    return [iProd >= 0 && iUrl > iProd && iNoUrl > iUrl && iTwin > iNoUrl && iLoop > iTwin && iRefuse > iLoop && iKey > iRefuse && keyed && iImport > iKey
      && !staticImport && walks && quiet && exits >= 6 && probeOk,
      `order ${[iProd, iUrl, iNoUrl, iTwin, iLoop, iRefuse, iKey, iImport].join("/")} · audit key ${keyed} · static import ${staticImport} · walks ${walks} · quiet ${quiet} · refusals ${exits} · probe ${probeOk ? "refuses first" : `OFF @${[qUrl, qLoop, qImport].join("/")} static ${qStatic}`}`];
  });
  await check(p(L.s4), () => {
    const scripts = (JSON.parse(src.pkg) as { scripts: Record<string, string> }).scripts;
    const chain = (scripts.predeploy ?? "").split("&&").map((x) => x.trim());
    const onChain = chain.filter((x) => x === "npm run test:registration-contact").length;
    return [scripts["test:registration-contact"] === "tsx scripts/registration-contact.test.mts"
      && scripts["red:registration-contact"] === "tsx scripts/registration-contact.test.mts --prove-red" && onChain === 1,
      `test ${scripts["test:registration-contact"] ?? "MISSING"} · red ${scripts["red:registration-contact"] ?? "MISSING"} · on predeploy ×${onChain}`];
  });

  /* ── §7 · ⭐ C8b (B8) · THE "ADDED" DOOR — its own empty world, on the memory twin ─────────────────── */
  await inEmptyWorld(async () => {
    // The accounts — each signed up long before its row entered the book, as the backfill's clients had.
    const K = {
      k1: account(`rc${RUN}_k01`, num(71), { createdAt: "2026-08-01T08:00:00.000Z" }),
      k2: account(`rc${RUN}_k02`, num(72), { createdAt: "2026-09-15T10:00:00.000Z" }),
      k3: account(`rc${RUN}_k03`, num(73), { createdAt: "2026-10-02T20:30:00.000Z" }),
      s1: account(`rc${RUN}_k04`, num(74), { createdAt: "2026-10-05T07:00:00.000Z" }),
      r1: account(`rc${RUN}_k05`, num(75), { createdAt: "2026-07-01T08:00:00.000Z" }),
      c1: account(`rc${RUN}_k06`, num(76), { createdAt: "2026-06-01T08:00:00.000Z" }),
      n1: account(`rc${RUN}_k07`, num(77), { createdAt: "2026-08-10T08:00:00.000Z" }),
      x1: account(`rc${RUN}_k08`, num(78), { createdAt: "2026-08-11T08:00:00.000Z" }),
      o1: account(`rc${RUN}_k10`, num(80), { createdAt: "2026-08-12T08:00:00.000Z" }),
      sh: account(`rc${RUN}_k11`, num(81), { createdAt: "2026-08-13T08:00:00.000Z" }),
    };
    /** An account the store does not hold (its row is linked to it). */
    const GONE = `rc${RUN}_k09_gone`;
    for (const u of Object.values(K)) await db.user.create(u);
    /** A row in the OLD writer's shape: REGISTRATION, the link as provenance, no officer, "Added" the account's sign-up. */
    const signupRow = (id: string, u: StoredUser, o: Partial<StoredMarketingContact> = {}): StoredMarketingContact => bookRow(id, u.phoneE164, {
      source: "REGISTRATION", sourceRef: u.id, userId: u.id, rawInput: u.phoneE164, createdBy: null, updatedBy: null,
      createdAt: u.createdAt, updatedAt: u.createdAt, ...o,
    });
    const ROW = {
      k1: signupRow(`mc_rc_k1_${RUN}`, K.k1),
      // An officer edited it after the backfill: that edit's stamp and officer stand.
      k2: signupRow(`mc_rc_k2_${RUN}`, K.k2, { displayName: "Officer Typed", updatedAt: "2026-10-05T09:00:00.000Z", updatedBy: "usr_officer_rc" }),
      k3: signupRow(`mc_rc_k3_${RUN}`, K.k3),
      s1: signupRow(`mc_rc_k4_${RUN}`, K.s1),
      // Re-dated before (its Added IS its record's instant).
      r1: signupRow(`mc_rc_k5_${RUN}`, K.r1, { createdAt: "2026-10-03T13:06:00.000Z", updatedAt: "2026-10-03T13:06:00.000Z" }),
      // Written by C8b's clock: its Added is milliseconds before its record, and not its account's sign-up.
      c1: signupRow(`mc_rc_k6_${RUN}`, K.c1, { createdAt: CLOCK, updatedAt: CLOCK }),
      n1: signupRow(`mc_rc_k7_${RUN}`, K.n1),
      x1: signupRow(`mc_rc_k8_${RUN}`, K.x1),
      a1: bookRow(`mc_rc_k9_${RUN}`, num(79), {
        source: "REGISTRATION", sourceRef: GONE, userId: GONE, createdBy: null, updatedBy: null,
        createdAt: "2026-08-14T08:00:00.000Z", updatedAt: "2026-08-14T08:00:00.000Z",
      }),
      sh: signupRow(`mc_rc_ka_${RUN}`, K.sh, { sourceRef: `rc${RUN}_someone_else` }),
      // An officer's row the sign-up LINKED, and the erased tombstone: neither is a linked sign-up row.
      o1: bookRow(`mc_rc_kb_${RUN}`, K.o1.phoneE164, { userId: K.o1.id }),
      tomb: bookRow(`mc_rc_kc_${RUN}`, num(82), { source: "REGISTRATION", sourceRef: ERASURE_EVIDENCE, userId: null }),
    };
    for (const r of Object.values(ROW)) await db.marketingContact.create(r);
    let recSeq = 0;
    /** One of the writer's own records, as `recordWrite` leaves it — the masked number, the account, `via`. */
    const rec = (row: StoredMarketingContact, accountId: string, via: string, createdAt: string, action = "contacts.contact.registered"): EntryRecord =>
      ({ id: `aud_rc_${RUN}_${++recSeq}`, action, targetId: row.id, createdAt, payload: { number: maskPhone(row.msisdn), account: accountId, via, fields: [] } });
    const RECORDS: EntryRecord[] = [
      rec(ROW.k1, K.k1.id, "backfill", "2026-10-03T13:05:00.000Z"),
      rec(ROW.k2, K.k2.id, "backfill", "2026-10-03T13:05:00.250Z"),
      // 21:10 UTC is 00:10 EAT the NEXT day: the days are EAT's.
      rec(ROW.k3, K.k3.id, "backfill", "2026-10-03T21:10:00.000Z"),
      rec(ROW.s1, K.s1.id, "signup", "2026-10-05T07:00:00.040Z"),
      rec(ROW.r1, K.r1.id, "backfill", "2026-10-03T13:06:00.000Z"),
      rec(ROW.c1, K.c1.id, "backfill", "2026-10-09T09:30:00.004Z"),
      // x1's only record names ANOTHER account (the number's earlier holder): no record of THIS account's write.
      rec(ROW.x1, `rc${RUN}_another_account`, "backfill", "2026-10-03T13:07:00.000Z"),
      rec(ROW.a1, GONE, "backfill", "2026-10-03T13:08:00.000Z"),
      rec(ROW.sh, K.sh.id, "backfill", "2026-10-03T13:09:00.000Z"),
      rec(ROW.o1, K.o1.id, "backfill", "2026-10-03T13:10:00.000Z", "contacts.contact.linked"),
      // ⛔ A record OLDER than the writer — a fixture only (none can exist): the reader's floor leaves it out, so k1 is
      // never dated by it.
      rec(ROW.k1, K.k1.id, "backfill", "2026-09-30T08:00:00.000Z"),
    ];
    const deps = (): AddedRedateDeps => ({ ...impl.door.deps(fakeRecords(RECORDS)), hasDatabase: () => true });
    const BY = `Claude for Ali (B8) run ${RUN}`;
    const WHY = "approved by Ali in the Claude session";
    const mine = () => doorRows().filter((e) => payloadOf(e).by === BY);
    const SECRET_7 = [...Object.values(K).map((u) => nationalOf(u.phoneE164)), nationalOf(num(79)), nationalOf(num(82)), "Officer Typed"];
    const IDS_7 = [...Object.values(ROW).map((r) => r.id), ...Object.values(K).map((u) => u.id), GONE];
    const fresh = async (id: string) => db.marketingContact.find(id);

    // 7.1 · status
    await auditFlush();
    const s71 = snapshot();
    const n71 = doorRows().length;
    const st = await impl.door.status(deps());
    await auditFlush();
    const plan71 = await planAddedRedate(deps());
    await check(p(L.k1), () => {
      const want = { examined: 10, toRedate: 3, atSignup: 1, alreadyRight: 2, withoutRecord: 2, withoutAccount: 1, otherShape: 1 };
      const wantRows = [
        { id: ROW.k1.id, expectedCreatedAt: K.k1.createdAt, createdAt: "2026-10-03T13:05:00.000Z" },
        { id: ROW.k2.id, expectedCreatedAt: K.k2.createdAt, createdAt: "2026-10-03T13:05:00.250Z" },
        { id: ROW.k3.id, expectedCreatedAt: K.k3.createdAt, createdAt: "2026-10-03T21:10:00.000Z" },
      ];
      const text = st.lines.join(LF);
      const dirty = leaksIn(text, [...IDS_7, ...SECRET_7]);
      const last = (st.lines[st.lines.length - 1] ?? "").trim();
      const planned = plan71.ok ? plan71.plan : null;
      return [planned !== null && canon(planned.counts) === canon(want) && canon(planned.rows) === canon(wantRows)
        && canon(planned.days) === canon({ "2026-10-03": 2, "2026-10-04": 1 }) && planned.signedFrom === "2026-08-01" && planned.signedTo === "2026-10-02"
        && st.code === "status" && st.exitCode === 0 && text.includes("to re-date: 3 ") && text.includes("2026-10-03 2 · 2026-10-04 1")
        && last === addedRedateApplyCommand(3) && snapshot() === s71 && doorRows().length === n71 && dirty.length === 0,
        `${planned ? `${canon(planned.counts)} · days ${canon(planned.days)} · signed ${planned.signedFrom} → ${planned.signedTo}` : "UNREADABLE"} · ${st.code} · store ${snapshot() === s71 ? "unchanged" : "WRITTEN"} · records ${n71} → ${doorRows().length} · ${dirty.length ? `CARRIES ${dirty.join(",")}` : "clean"}`];
    });

    // 7.2 · every refusal before the record
    await auditFlush();
    const s72 = snapshot();
    const n72 = doorRows().length;
    const tries: Array<[AddedRedateApplyInput, AddedRedateDeps]> = [
      [{ expect: "3", by: `Claude ${nationalOf(K.k1.phoneE164)}`, reason: WHY }, deps()],
      [{ expect: "3", by: "Claude 1234", reason: "run 567" }, deps()],
      [{ expect: "3", by: BY, reason: WHY }, { ...deps(), hasDatabase: () => false }],
      [{ expect: undefined, by: BY, reason: WHY }, deps()],
      [{ expect: "three", by: BY, reason: WHY }, deps()],
      [{ expect: "4", by: BY, reason: WHY }, deps()],
    ];
    const refusals: AddedRedateOutcome[] = [];
    for (const [input, d] of tries) refusals.push(await impl.door.apply(input, d));
    await auditFlush();
    await check(p(L.k2), () => {
      const got = refusals.map((o) => `${o.code}/${o.exitCode}`).join(",");
      return [got === "bad_ops_text/1,bad_ops_text/1,no_database/2,bad_expect/1,bad_expect/1,expect_mismatch/1" && snapshot() === s72 && doorRows().length === n72,
        `${got} · store ${snapshot() === s72 ? "unchanged" : "WRITTEN"} · records ${n72} → ${doorRows().length}`];
    });

    // 7.3 / 7.4 · the apply — the store's write watched for the record that must already be on the chain
    await auditFlush();
    const canonRows = new Map([...MEM.marketingContacts.entries()].map(([k, v]) => [k, canon(v)] as const));
    const realRedate = db.marketingContact.redateAdded as unknown as (rows: ContactAddedRedate[]) => unknown;
    const sawApplying: boolean[] = [];
    const applied = await withBookMember("redateAdded", (rows: ContactAddedRedate[]) => {
      sawApplying.push(mine().some((e) => e.action === ADDED_REDATE_ACTIONS.applying));
      return realRedate(rows);
    }, () => impl.door.apply({ expect: "3", by: BY, reason: WHY }, deps()));
    await auditFlush();
    const TO = { k1: "2026-10-03T13:05:00.000Z", k2: "2026-10-03T13:05:00.250Z", k3: "2026-10-03T21:10:00.000Z" };
    await check(p(L.k3), async () => {
      const moved = [...MEM.marketingContacts.entries()].filter(([k, v]) => canonRows.get(k) !== canon(v)).map(([k]) => k).sort();
      const [g1, g2, g3] = [await fresh(ROW.k1.id), await fresh(ROW.k2.id), await fresh(ROW.k3.id)];
      const rest = (row: StoredMarketingContact | null, base: StoredMarketingContact) =>
        row !== null && canon({ ...row, createdAt: null, updatedAt: null }) === canon({ ...base, createdAt: null, updatedAt: null });
      return [applied.code === "done" && applied.exitCode === 0 && moved.join(",") === [ROW.k1.id, ROW.k2.id, ROW.k3.id].sort().join(",")
        && g1?.createdAt === TO.k1 && g1.updatedAt === TO.k1 && rest(g1, ROW.k1)
        && g2?.createdAt === TO.k2 && g2.updatedAt === "2026-10-05T09:00:00.000Z" && g2.updatedBy === "usr_officer_rc" && rest(g2, ROW.k2)
        && g3?.createdAt === TO.k3 && g3.updatedAt === TO.k3 && rest(g3, ROW.k3),
        `${applied.code} (exit ${applied.exitCode}) · moved ${moved.length} · k1 ${g1?.createdAt}/${g1?.updatedAt} · k2 ${g2?.createdAt}/${g2?.updatedAt} by ${g2?.updatedBy} · k3 ${g3?.createdAt}/${g3?.updatedAt}`];
    });
    await check(p(L.k4), () => {
      const rows = mine();
      const applying = rows.find((e) => e.action === ADDED_REDATE_ACTIONS.applying);
      const done = rows.find((e) => e.action === ADDED_REDATE_ACTIONS.applied);
      const pa = payloadOf(applying);
      const pd = payloadOf(done);
      const wantRows = [
        { id: ROW.k1.id, from: K.k1.createdAt, to: TO.k1 },
        { id: ROW.k2.id, from: K.k2.createdAt, to: TO.k2 },
        { id: ROW.k3.id, from: K.k3.createdAt, to: TO.k3 },
      ];
      const dirty = leaksIn(JSON.stringify([applying ?? null, done ?? null]), SECRET_7);
      const targeted = (e: typeof applying) => !!e && e.category === "COMPLIANCE" && e.targetType === ADDED_REDATE_TARGET.targetType
        && e.targetId === ADDED_REDATE_TARGET.targetId && e.actorId === null;
      return [sawApplying.length === 1 && sawApplying[0] === true && targeted(applying) && targeted(done)
        && canon(pa.rows) === canon(wantRows) && pa.count === 3 && canon(pa.days) === canon({ "2026-10-03": 2, "2026-10-04": 1 })
        && pa.by === BY && pa.reason === WHY && typeof pa.ruling === "string" && pa.via === "ops"
        && pd.written === 3 && !!applying && pd.applyingRecord === applying.id
        && applied.records.applying === applying?.id && !!done && applied.records.ending === done.id && dirty.length === 0,
        `write saw the record: ${sawApplying.join(",") || "never called"} · applying ${applying ? `${Array.isArray(pa.rows) ? pa.rows.length : "no"} row(s) listed` : "MISSING"} · applied ${done ? canon(pd) : "MISSING"} · ${dirty.length ? `CARRIES ${dirty.join(",")}` : "clean"}`];
    });

    // 7.5 · idempotent
    await auditFlush();
    const s75 = snapshot();
    const n75 = doorRows().length;
    const st75 = await impl.door.status(deps());
    const plan75 = await planAddedRedate(deps());
    const again75 = await impl.door.apply({ expect: "0", by: BY, reason: WHY }, deps());
    await auditFlush();
    await check(p(L.k5), () => {
      const c = plan75.ok ? plan75.plan.counts : null;
      return [c !== null && c.toRedate === 0 && c.alreadyRight === 5 && st75.lines.join(LF).includes("to re-date: 0")
        && again75.code === "nothing_to_do" && again75.exitCode === 0 && snapshot() === s75 && doorRows().length === n75,
        `${c ? canon(c) : "UNREADABLE"} · second apply ${again75.code} (exit ${again75.exitCode}) · store ${snapshot() === s75 ? "unchanged" : "WRITTEN"} · records ${n75} → ${doorRows().length}`];
    });

    // 7.6 · all or nothing — three more of the old writer's rows, and another run that re-dates one of them first
    const M = {
      m1: account(`rc${RUN}_k21`, num(83), { createdAt: "2026-08-03T08:00:00.000Z" }),
      m2: account(`rc${RUN}_k22`, num(84), { createdAt: "2026-08-04T08:00:00.000Z" }),
      m3: account(`rc${RUN}_k23`, num(85), { createdAt: "2026-08-05T08:00:00.000Z" }),
    };
    for (const u of Object.values(M)) await db.user.create(u);
    const MROW = { m1: signupRow(`mc_rc_m1_${RUN}`, M.m1), m2: signupRow(`mc_rc_m2_${RUN}`, M.m2), m3: signupRow(`mc_rc_m3_${RUN}`, M.m3) };
    for (const r of Object.values(MROW)) await db.marketingContact.create(r);
    RECORDS.push(
      rec(MROW.m1, M.m1.id, "backfill", "2026-10-03T14:00:00.000Z"),
      rec(MROW.m2, M.m2.id, "backfill", "2026-10-03T14:00:01.000Z"),
      rec(MROW.m3, M.m3.id, "backfill", "2026-10-03T14:00:02.000Z"),
    );
    const base76 = deps();
    const raced = await impl.door.apply({ expect: "3", by: BY, reason: WHY }, {
      ...base76,
      write: async (rows) => {
        // ANOTHER run re-dates m2 first, through the store's own write …
        await Promise.resolve(db.marketingContact.redateAdded(rows.filter((r) => r.id === MROW.m2.id)));
        // … and only then this one's whole write.
        return base76.write(rows);
      },
    });
    await auditFlush();
    await check(p(L.k6), async () => {
      const [h1, h2, h3] = [await fresh(MROW.m1.id), await fresh(MROW.m2.id), await fresh(MROW.m3.id)];
      const ending = mine().find((e) => e.action === ADDED_REDATE_ACTIONS.refused);
      const pe = payloadOf(ending);
      return [raced.code === "changed" && raced.exitCode === 1 && h1?.createdAt === M.m1.createdAt && h3?.createdAt === M.m3.createdAt
        && h2?.createdAt === "2026-10-03T14:00:01.000Z" && !!ending && pe.contact === MROW.m2.id && pe.step === "write" && pe.refusal === "changed"
        && raced.records.ending === ending.id,
        `${raced.code} (exit ${raced.exitCode}) · m1 ${h1?.createdAt} · m2 ${h2?.createdAt} · m3 ${h3?.createdAt} · refused ${ending ? canon(pe.contact) : "NOT RECORDED"}`];
    });

    // 7.7 · every other ending — m1 and m3 are still the old writer's
    await auditFlush();
    const s77 = snapshot();
    const n77 = doorRows().length;
    const unrecorded = await impl.door.apply({ expect: "2", by: BY, reason: WHY }, { ...deps(), audit: async () => ({ recorded: false }) });
    await auditFlush();
    const n77a = doorRows().length;
    const LOUD = `Invalid invocation for ${MROW.m1.id} at ${nationalOf(M.m1.phoneE164)}`;
    const threw = await impl.door.apply({ expect: "2", by: BY, reason: WHY }, {
      ...deps(),
      write: async () => { throw Object.assign(new Error(LOUD), { code: "P2034" }); },
    });
    const hollow = await impl.door.apply({ expect: "2", by: BY, reason: WHY }, {
      ...deps(),
      write: async (rows) => ({ ok: true as const, written: rows.length }),
    });
    await auditFlush();
    await check(p(L.k7), () => {
      const failed7 = mine().filter((e) => e.action === ADDED_REDATE_ACTIONS.failed);
      const onWrite = failed7.find((e) => payloadOf(e).step === "write");
      const onRead = failed7.find((e) => payloadOf(e).step === "read_back");
      const pw = payloadOf(onWrite);
      return [unrecorded.code === "record_failed" && unrecorded.exitCode === 1 && n77a === n77
        && threw.code === "write_failed" && !!onWrite && pw.outcome === "unknown" && pw.error === "Error P2034" && !JSON.stringify(onWrite).includes("Invalid")
        && hollow.code === "read_back_mismatch" && !!onRead && snapshot() === s77,
        `${unrecorded.code} (records ${n77} → ${n77a}) · ${threw.code} error ${canon(pw.error)} · ${hollow.code} ${onRead ? "recorded" : "NOT RECORDED"} · store ${snapshot() === s77 ? "unchanged" : "WRITTEN"}`];
    });

    // 7.8 · end to end — the REAL audit() writes the record, the audit module's durable reader finds it
    const E = account(`rc${RUN}_k30`, num(86), { createdAt: "2026-08-06T08:00:00.000Z" });
    await db.user.create(E);
    const eRow = signupRow(`mc_rc_ke_${RUN}`, E);
    await db.marketingContact.create(eRow);
    const wrote = await audit({
      category: "SYSTEM", action: "contacts.contact.registered", actorId: null, targetType: "MarketingContact", targetId: eRow.id,
      payload: { number: maskPhone(eRow.msisdn), account: E.id, via: "backfill", fields: [] },
    });
    await auditFlush();
    const ringDeps = (): AddedRedateDeps => ({ ...impl.door.deps((q) => getAuditForTargetsDurable(q)), hasDatabase: () => true });
    const planE = await planAddedRedate(ringDeps());
    const doneE = await impl.door.apply({ expect: "1", by: BY, reason: WHY }, ringDeps());
    await auditFlush();
    await check(p(L.k8), async () => {
      const back = await fresh(eRow.id);
      const rowsE = planE.ok ? planE.plan.rows : [];
      return [wrote.recorded && rowsE.length === 1 && rowsE[0]?.id === eRow.id && rowsE[0]?.createdAt === wrote.createdAt
        && doneE.code === "done" && back?.createdAt === wrote.createdAt && back.updatedAt === wrote.createdAt,
        `record ${wrote.recorded ? wrote.createdAt : "NOT RECORDED"} · planned ${rowsE.length} (${rowsE[0]?.createdAt ?? "-"}) · ${doneE.code} · the row reads ${back?.createdAt}`];
    });
  });

  // 7.9 · the door's source
  await check(p(L.k9), () => {
    const cli = src.doorCli;
    const door = src.door;
    const iRewrite = cli.indexOf('process.env.DATABASE_URL = process.env.DATABASE_URL.replace(PRIVATE_DB_HOST, "@turntable.proxy.rlwy.net:40357");');
    const iNoUrl = cli.indexOf("if (!process.env.DATABASE_URL) {");
    const iImport = cli.indexOf('const DOOR = await import("../../src/lib/server/contacts/added-redate.ts");');
    const staticImport = cli.split(LF).some((line) => line.startsWith("import "));
    const handed = cli.includes("const deps = DOOR.addedRedateDeps((q) => AUDIT.getAuditForTargetsDurable(q));");
    const iStatus = cli.indexOf('if (command === "status") return say(await DOOR.addedRedateStatus(deps));');
    const iEnv = cli.indexOf('const viaRailway = process.env.RAILWAY_ENVIRONMENT_NAME === "production" && process.env.RAILWAY_SERVICE_NAME === "50pick";');
    const iKey = cli.indexOf('if (!viaRailway || auditKey.trim() === "" || auditKey === (process.env.SESSION_SECRET ?? "")) {');
    const iClock = cli.indexOf("const clockProblem = DOOR.opsClockProblem(dbMs, askedAt, Date.now());");
    const iApply = cli.indexOf("DOOR.applyAddedRedate(");
    const cliWrites = /db[.]|writeFile|appendFile|redateAdded|[^.A-Za-z]audit[(]/.test(cli);
    const doorReads = door.includes("getAudit");
    const iRecord = door.indexOf("const applying = await recordOf(deps, {");
    const iWrite = door.indexOf("res = await deps.write(");
    const writes = door.split("deps.write(").length - 1;
    const scripts = (JSON.parse(src.pkg) as { scripts: Record<string, string> }).scripts;
    const wired = scripts["ops:contacts-added-redate"] === "tsx scripts/ops/contacts-added-redate.mts";
    return [iRewrite >= 0 && iNoUrl > iRewrite && iImport > iNoUrl && !staticImport && handed && iStatus > iImport && iEnv > iStatus
      && iKey > iEnv && iClock > iKey && iApply > iClock && !cliWrites && !doorReads && iRecord > 0 && iWrite > iRecord && writes === 1 && wired,
      `cli order ${[iRewrite, iNoUrl, iImport, iStatus, iEnv, iKey, iClock, iApply].join("/")} · static import ${staticImport} · reader handed ${handed} · cli writes ${cliWrites} · door reads the log ${doorReads} · record ${iRecord} before write ${iWrite} (${writes} write call(s)) · wired ${wired}`];
  });
}

/* ═══ THE PLANTS — each a piece as somebody would write it wrongly, in memory ══════════════════════ */

const bookOf = (deps: RegistrationContactDeps) => deps.book ?? REGISTRATION_BOOK;

/** 🔴 The hook as somebody writes it in a hurry: the book asked directly, nothing caught, no budget. */
const uncaughtHook: Ensure = async (user, deps = {}) => {
  const book = bookOf(deps);
  const key = parseTzNumber(user.phoneE164).msisdn ?? "";
  if ((await book.findByMsisdn(key)) === null) await book.create({} as StoredMarketingContact);
  return { outcome: "created", contactId: "", cache: "none" };
};

/** 🔴 The failure logged with the error's MESSAGE — a database message prints the row, the number in it. */
const leakyLogEnsure: Ensure = (user, deps = {}) => {
  const book = bookOf(deps);
  return ensureRegistrationContact(user, {
    ...deps,
    book: {
      ...book,
      create: async (row) => {
        try {
          return await book.create(row);
        } catch (err) {
          console.error(`[registration-contact] create failed: ${(err as Error).message}`);
          throw err;
        }
      },
    },
  });
};

/** 🔴 The row shaped by hand: the brand stored as text, the account's name as it came — and (the reading C8b retired,
 *  B8) the ACCOUNT's own createdAt as "Added", so a backfilled client's row says the day they signed up. */
const handShapedRow: Ensure = (user, deps = {}) => {
  const book = bookOf(deps);
  return ensureRegistrationContact(user, {
    ...deps,
    book: {
      ...book,
      create: (row) => {
        const at = new Date(Date.parse(String(user.createdAt))).toISOString();
        return book.create({ ...row, operator: parseTzNumber(row.msisdn).operator?.brand ?? "Vodacom", displayName: user.displayName, createdAt: at, updatedAt: at });
      },
    },
  });
};

/** 🔴 C8b (B8) · only the timestamp planted: the account's own createdAt as "Added" — nothing else of the row moved. */
const signupDatedRow: Ensure = (user, deps = {}) => {
  const book = bookOf(deps);
  return ensureRegistrationContact(user, {
    ...deps,
    book: { ...book, create: (row) => book.create({ ...row, createdAt: String(user.createdAt), updatedAt: String(user.createdAt) }) },
  });
};

/** 🔴 The cache read from the account's own toggle when the ledger is silent — a switch never turned on recorded as a
 *  withdrawal. */
const inventingMirror: Ensure = (user, deps = {}) => ensureRegistrationContact(user, {
  ...deps,
  mirror: async (msisdn) => {
    const row = await db.marketingContact.findByMsisdn(msisdn);
    if (!row) return "none";
    const latest = await db.messagingConsent.latestFor({ channel: "SMS", identifier: msisdn, category: "MARKETING" });
    const consentState = latest ? latest.status : (user as StoredUser).marketingOptIn ? "GIVEN" : "WITHDRAWN";
    await db.marketingContact.update(row.id, { consentState }, row.updatedAt);
    return "updated";
  },
});

/** 🔴 The link copies the account over what the officer typed, and rewrites the source. */
const overwritingLink: Ensure = (user, deps = {}) => ensureRegistrationContact(user, {
  ...deps,
  book: {
    ...bookOf(deps),
    link: async (row, userId) => db.marketingContact.update(row.id, { userId, displayName: user.displayName, email: user.email ?? null, source: "REGISTRATION" }, row.updatedAt),
  },
});

/** 🔴 The link stamped with the wall clock — "a link is an edit". */
const clockedLink: Ensure = (user, deps = {}) => ensureRegistrationContact(user, {
  ...deps,
  book: { ...bookOf(deps), link: async (row, userId) => db.marketingContact.update(row.id, { userId }, new Date().toISOString()) },
});

/** 🔴 A gate that asks only the number: staff, an agent, a closed account and the bootstrap admin all pass. */
const anyAccount: Ensure = (user, deps = {}) =>
  ensureRegistrationContact({ ...user, role: "PLAYER", status: "ACTIVE", closedAt: null }, { ...deps, bootstrapPhones: new Set<string>() });

/** 🔴 An already-linked client linked again on every call, with a fresh stamp. */
const relinkEveryCall: Ensure = async (user, deps = {}) => {
  const r = await ensureRegistrationContact(user, deps);
  if (r.outcome === "already_linked") await db.marketingContact.update(r.contactId, { userId: user.id }, new Date().toISOString());
  return r;
};

/** 🔴 C8b · B1 not built — the rule before C8b: the erased tombstone KEPT, the recycled number's new client never a contact
 *  (and every officer told the number "can't be added", a disclosed erasure). */
const keepTombstones: Ensure = async (user, deps = {}) => {
  const key = parseTzNumber(user.phoneE164).msisdn;
  const row = key ? await db.marketingContact.findByMsisdn(key) : null;
  if (row !== null && row.sourceRef === ERASURE_EVIDENCE) return { outcome: "kept_other_account", cache: "none" };
  return ensureRegistrationContact(user, deps);
};

/** 🔴 C8b · the revival that keeps the tombstone's LISTS — the row written exactly right, and every membership it held put
 *  back: the new client inherits the erased person's lists, and those lists' coverage. */
const reviveKeepingLists: Ensure = (user, deps = {}) => ensureRegistrationContact(user, {
  ...deps,
  book: {
    ...bookOf(deps),
    revive: async (tombstone, row) => {
      const held = await db.contactListMember.listMemberships(tombstone.id);
      const revived = await REGISTRATION_BOOK.revive(tombstone, row);
      for (const m of held) await db.contactListMember.add(m);
      return revived;
    },
  },
});

/** 🔴 C8b · the revival that keeps the erased person's "Added" and provenance — the tombstone's createdAt and createdBy on
 *  the new client's row. */
const reviveKeepingAdded: Ensure = (user, deps = {}) => ensureRegistrationContact(user, {
  ...deps,
  book: {
    ...bookOf(deps),
    revive: async (tombstone, row) => REGISTRATION_BOOK.revive(tombstone, { ...row, createdAt: tombstone.createdAt, createdBy: tombstone.createdBy }),
  },
});

/** 🔴 C8b · the revival without its compare — whatever row the id names now is overwritten, another account's included. */
const reviveWithoutCompare: NonNullable<RegistrationContactDeps["book"]>["revive"] = async (tombstone, row) => {
  const now = await db.marketingContact.find(tombstone.id);
  if (now === null) return null;
  const written = await db.marketingContact.update(now.id, {
    userId: row.userId, displayName: row.displayName, email: row.email, source: row.source, sourceRef: row.sourceRef,
  }, row.updatedAt);
  return written === null ? null : { row: written, membershipsDeleted: 0 };
};

/** 🔴 C8b · the revival unaudited — the one SYSTEM row that says an erased number's row was given to a new client. */
const silentRevival: Ensure = (user, deps = {}) => ensureRegistrationContact(user, {
  ...deps,
  audit: (entry) => (entry.action === "contacts.contact.revived" ? undefined : (deps.audit ?? audit)(entry)),
});

/** 🔴 Another account's row re-pointed to this one — that person's row (and its name) handed to this account. */
const repointOthers: Ensure = async (user, deps = {}) => {
  const key = parseTzNumber(user.phoneE164).msisdn;
  const row = key ? await db.marketingContact.findByMsisdn(key) : null;
  if (row !== null && row.userId !== null && row.userId !== user.id && row.sourceRef !== ERASURE_EVIDENCE) {
    await db.marketingContact.update(row.id, { userId: user.id }, row.updatedAt);
    return { outcome: "linked", contactId: row.id, cache: "none" };
  }
  return ensureRegistrationContact(user, deps);
};

/** 🔴 The audit row carries the whole number and the email. */
const leakyAudit: Ensure = (user, deps = {}) => ensureRegistrationContact(user, {
  ...deps,
  audit: (entry) => audit({ ...entry, payload: { ...(entry.payload ?? {}), number: parseTzNumber(user.phoneE164).msisdn, email: user.email ?? null } }),
});

/** 🔴 The walk's cursor compared with >= : every page starts AT the last account of the page before. */
const inclusiveWalk = async (q: PlayerWalkQuery): Promise<PlayerWalk> => {
  const all = (await db.user.playerWalk({ ...q, afterId: null, limit: 100_000 })).rows;
  const from = q.afterId === null ? 0 : Math.max(0, all.findIndex((r) => r.id === q.afterId));
  const rows = all.slice(from, from + q.limit);
  const more = from + q.limit < all.length;
  return { rows, nextAfterId: more && rows.length > 0 ? rows[rows.length - 1].id : null };
};

/** 🔴 Every visit re-stamps the client's row — a second run is never a read. */
const restampingBackfill: Impl["backfill"] = (deps = {}) => backfillRegistrationContacts({
  ...deps,
  ensure: async (u, d) => {
    const r = await (deps.ensure ?? ensureRegistrationContact)(u, d);
    if (r.outcome === "already_linked") await db.marketingContact.update(r.contactId, { updatedBy: "backfill" }, new Date().toISOString());
    return r;
  },
});

/** 🔴 The backfill keeps a list of what it created — numbers and names — to print. */
const listingBackfill: Impl["backfill"] = async (deps = {}) => {
  const created: string[] = [];
  const counts = await backfillRegistrationContacts({
    ...deps,
    ensure: async (u, d) => {
      const r = await (deps.ensure ?? ensureRegistrationContact)(u, d);
      if (r.outcome === "created") created.push(`${u.phoneE164} ${u.displayName ?? ""}`);
      return r;
    },
  });
  return { ...counts, created } as RegistrationBackfillCounts;
};

/* ── C8b (B8) · the "Added" door's plants ── */

/** A door whose deps differ from the shipped ones in ONE member. */
const doorWith = (over: (d: AddedRedateDeps) => Partial<AddedRedateDeps>): Door => ({
  ...REAL_DOOR,
  deps: (records) => { const d = addedRedateDeps(records); return { ...d, ...over(d) }; },
});

/** 🔴 The rule ignores WHO wrote the row: a sign-up's own row re-dated as if the backfill had written it. */
const anyWriterDoor = doorWith(() => ({
  rule: (row, records, acct) => addedRedateVerdict(row, records.map((e) => ({ ...e, payload: { ...(e.payload ?? {}), via: "backfill" } })), acct),
}));

/** 🔴 An instant INVENTED for a row with no record of its write — the writer's first instant. */
const inventingDoor = doorWith(() => ({
  rule: (row, records, acct) => {
    const v = addedRedateVerdict(row, records, acct);
    return v.kind === "withoutRecord" ? { kind: "redate", fromMs: Date.parse(row.createdAt), toMs: Date.parse("2026-10-03T12:22:46.000Z") } : v;
  },
}));

/** 🔴 The account check dropped — every Added taken for its account's sign-up: C8b's clock rows moved by milliseconds,
 *  a row without its account re-dated. */
const accountBlindDoor = doorWith(() => ({
  rule: (row, records) => addedRedateVerdict(row, records, { id: row.userId ?? "", createdAt: row.createdAt }),
}));

/** 🔴 The records read without the writer's floor: a record older than the writer taken as when the row entered the book. */
const floorlessDoor: Door = { ...REAL_DOOR, deps: (records) => addedRedateDeps((q) => records({ ...q, sinceIso: "1970-01-01T00:00:00.000Z" })) };

/** 🔴 The records asked of another target type — every row "without a record", the backfill's rows never re-dated. */
const wrongTargetDoor: Door = { ...REAL_DOOR, deps: (records) => addedRedateDeps((q) => records({ ...q, targetType: "Contact" })) };

/** 🔴 A status that writes: it applies what it counts. */
const writingStatusDoor: Door = {
  ...REAL_DOOR,
  status: async (d) => {
    const r = await planAddedRedate(d);
    if (r.ok) await applyAddedRedate({ expect: String(r.plan.rows.length), by: "planted status", reason: "planted" }, d);
    return addedRedateStatus(d);
  },
};

/** 🔴 Apply without its expected count — the count read at apply time is taken for the one status printed. */
const unexpectingDoor: Door = {
  ...REAL_DOOR,
  apply: async (input, d) => {
    const r = await planAddedRedate(d);
    return applyAddedRedate({ ...input, expect: r.ok ? String(r.plan.rows.length) : input.expect }, d);
  },
};

/** 🔴 The operator's text screen bypassed — a run whose --by carries a phone number goes ahead. */
const unscreenedDoor: Door = { ...REAL_DOOR, apply: (input, d) => applyAddedRedate({ ...input, by: "screen bypassed", reason: "screen bypassed" }, d) };

/** 🔴 The write before the record — the rows re-dated before the COMPLIANCE applying record exists. */
const writeFirstDoor = doorWith((d) => ({
  audit: async (entry) => {
    if (entry.action === ADDED_REDATE_ACTIONS.applying) {
      const listed = (payloadOf(entry).rows ?? []) as Array<{ id: string; from: string; to: string }>;
      await Promise.resolve(db.marketingContact.redateAdded(listed.map((x) => ({ id: x.id, expectedCreatedAt: x.from, createdAt: x.to }))));
    }
    return d.audit(entry);
  },
}));

/** 🔴 The new Added stamped over an officer's later edit — updatedAt forced to the new Added on every row. */
const restampingDoor = doorWith((d) => ({
  write: async (rows) => {
    const res = await d.write(rows);
    for (const r of rows) await Promise.resolve(db.marketingContact.update(r.id, {}, r.createdAt));
    return res;
  },
}));

/** 🔴 Not all or nothing — each row written on its own, a changed row skipped and the rest written. */
const rowByRowDoor = doorWith(() => ({
  write: async (rows) => {
    let written = 0;
    for (const r of rows) {
      const one = await Promise.resolve(db.marketingContact.redateAdded([r]));
      if (one.ok) written += one.written;
    }
    return { ok: true as const, written };
  },
}));

/** 🔴 The ending never recorded — DONE said with no `_applied` row on the chain. */
const silentEndingDoor = doorWith((d) => ({
  audit: async (entry) => (entry.action === ADDED_REDATE_ACTIONS.applied ? { recorded: false } : d.audit(entry)),
}));

/** 🔴 A second apply that finds nothing to do still records an attempt. */
const recordingNothingDoor: Door = {
  ...REAL_DOOR,
  apply: async (input, d) => {
    const o = await applyAddedRedate(input, d);
    if (o.code === "nothing_to_do") {
      await d.audit({ category: "COMPLIANCE", actorId: null, ...ADDED_REDATE_TARGET, action: ADDED_REDATE_ACTIONS.applying, payload: { by: String(input.by), count: 0 } });
    }
    return o;
  },
};

/** 🔴 A record that did not land still writes. */
const unrecordedWriteDoor: Door = {
  ...REAL_DOOR,
  apply: async (input, d) => {
    const o = await applyAddedRedate(input, d);
    if (o.code === "record_failed") {
      const r = await planAddedRedate(d);
      if (r.ok) await d.write([...r.plan.rows]);
    }
    return o;
  },
};

/** 🔴 The read-back's verdict ignored — a write that changed nothing reported DONE. */
const blindReadBackDoor: Door = {
  ...REAL_DOOR,
  apply: async (input, d) => {
    const o = await applyAddedRedate(input, d);
    return o.code === "read_back_mismatch" ? { ...o, code: "done", exitCode: 0 } : o;
  },
};

/* ═══ RUN ════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  await runAssertions(REAL, "");
  console.log(`${LF}registration-contact: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  await runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped code is already red (${failed.join(" | ")})`);
  console.log(`${LF}§0 baseline: ${pass} passed, ${fail} failed${LF}`);

  const CASES: Array<{ name: string; expect: string; impl: Impl }> = [
    {
      name: "the door's book write goes nowhere — the rule hears created while the row never lands",
      expect: L.d1,
      impl: { ...REAL, password: (phone, email, staleTick) => withBookMember("create", (row: StoredMarketingContact) => row, () => passwordDoor(phone, email, staleTick)) },
    },
    {
      name: "the cache write is lost — a number the ledger holds as GIVEN is left reading UNKNOWN on its new row",
      expect: L.d2,
      impl: {
        ...REAL,
        password: (phone, email, staleTick) =>
          withBookMember("update", (id: string) => db.marketingContact.find(id), () => passwordDoor(phone, email, staleTick)),
      },
    },
    {
      name: "⛔ 2026-10-07 · the removed box revived — a sign-up whose page posts the old tick records a GIVEN row again",
      expect: L.d2,
      impl: {
        ...REAL,
        password: async (phone, email, staleTick) => {
          const run = await passwordDoor(phone, email, staleTick);
          if (staleTick) {
            await appendMarketingConsent({
              phoneE164: phone, locale: "EN", status: "GIVEN", source: "REGISTRATION", site: "PROFILE", evidence: "v1", recordedBy: null,
            });
          }
          return run;
        },
      },
    },
    {
      name: "the bootstrap list is not read at sign-up — the owner's number is created a PLAYER and lands in the book",
      expect: L.d3,
      impl: { ...REAL, bootstrapDoor: (phone, email) => passwordDoor(phone, email, false) },
    },
    {
      name: "the hook asks the book with nothing caught — a book that throws fails the sign-up",
      expect: L.d4,
      impl: { ...REAL, atSignup: uncaughtHook },
    },
    {
      name: "the failure log prints the error's message — and a database message prints the row, the number in it",
      expect: L.d5,
      impl: { ...REAL, ensure: leakyLogEnsure },
    },
    {
      name: "the cache mirror logs the error's message again (as it did before this unit) — the number a database message prints",
      expect: L.d5,
      impl: {
        ...REAL,
        mirror: async (identifier) => {
          try {
            await Promise.resolve(db.marketingContact.findByMsisdn(identifier));
            return "unchanged";
          } catch (err) {
            console.error("[contact-cache] mirror failed:", (err as Error)?.message ?? err);
            return "failed";
          }
        },
      },
    },
    {
      name: "the hook waits for the book however long it takes — no budget",
      expect: L.d6,
      impl: { ...REAL, atSignup: (user, deps = {}) => ensureRegistrationContact(user, deps) },
    },
    {
      name: "the row shaped by hand — the brand stored, the name uncleaned, the account's own createdAt as Added",
      expect: L.r1,
      impl: { ...REAL, ensure: handShapedRow },
    },
    {
      name: "⛔ C8b · B8 · the account's sign-up date as Added — a backfilled client's row says when they signed up, a player's tell to a masked officer",
      expect: L.r1,
      impl: { ...REAL, ensure: signupDatedRow },
    },
    {
      name: "the cache invented from the account's toggle — a switch never turned on recorded as a withdrawal",
      expect: L.r2,
      impl: { ...REAL, ensure: inventingMirror },
    },
    {
      name: "the link copies the account over the officer's contact — the typed name and email overwritten, the source rewritten",
      expect: L.r3,
      impl: { ...REAL, ensure: overwritingLink },
    },
    {
      name: "⛔ OD56 · the link stamped with the wall clock — the officer's open dialog goes stale, a masked viewer sees the row move",
      expect: L.r4,
      impl: { ...REAL, ensure: clockedLink },
    },
    {
      name: "the gate asks only the number — staff, an agent, a closed account and the bootstrap admin become contacts",
      expect: L.r5,
      impl: { ...REAL, ensure: anyAccount },
    },
    {
      name: "an already-linked client is linked again on every call — a write and a moved stamp each time",
      expect: L.r6,
      impl: { ...REAL, ensure: relinkEveryCall },
    },
    {
      name: "⛔ C8b · B1 not built — the erased tombstone kept: the recycled number's new client is never a contact",
      expect: L.t1,
      impl: { ...REAL, ensure: keepTombstones },
    },
    {
      name: "⛔ C8b · the revival keeps the tombstone's old lists — the new client inherits the erased person's lists and their coverage",
      expect: L.t1,
      impl: { ...REAL, ensure: reviveKeepingLists },
    },
    {
      name: "⛔ C8b · the revival keeps the erased person's Added and provenance on the new client's row",
      expect: L.t1,
      impl: { ...REAL, ensure: reviveKeepingAdded },
    },
    {
      name: "⛔ C8b · the revival without its compare — the first comer's row overwritten by the second sign-up",
      expect: L.t3,
      impl: { ...REAL, revive: reviveWithoutCompare },
    },
    {
      name: "⛔ C8b · the revival unaudited — an erased number's row handed to a new client with no SYSTEM row",
      expect: L.a1,
      impl: { ...REAL, ensure: silentRevival },
    },
    {
      name: "⛔ U18b · another account's row re-pointed to this account — that person's row handed to this one",
      expect: L.t2,
      impl: { ...REAL, ensure: repointOthers },
    },
    {
      name: "the audit row carries the whole number and the email",
      expect: L.a1,
      impl: { ...REAL, ensure: leakyAudit },
    },
    {
      name: "the dry run writes — the real book handed to it",
      expect: L.b0,
      impl: { ...REAL, dryRunDeps: () => ({}) },
    },
    {
      name: "the walk's cursor is inclusive — every page re-visits the last account of the page before",
      expect: L.b1,
      impl: { ...REAL, backfill: (deps = {}) => backfillRegistrationContacts({ ...deps, walk: inclusiveWalk }) },
    },
    {
      name: "every visit re-stamps the client's row — a second run is never a read",
      expect: L.b2,
      impl: { ...REAL, backfill: restampingBackfill },
    },
    {
      name: "the backfill keeps a list of what it created, numbers and names, to print",
      expect: L.b3,
      impl: { ...REAL, backfill: listingBackfill },
    },
    {
      name: "the sign-up door loses its call — a door that stopped calling the hook (E-240's shape)",
      expect: L.s1,
      impl: { ...REAL, sources: { ...REAL_SOURCES, auth: REAL_SOURCES.auth.replace("  await registrationContactAtSignup(user);", "") } },
    },
    {
      name: "a second account factory returns — another door that creates accounts beside the one sign-up",
      expect: L.s1,
      impl: { ...REAL, sources: { ...REAL_SOURCES, auth: `${REAL_SOURCES.auth}${LF}export async function planted() { await db.user.create({} as never); }${LF}` } },
    },
    {
      name: "⛔ 2026-10-07 · the removed box's ledger append returns to the sign-up door",
      expect: L.s1,
      impl: { ...REAL, sources: { ...REAL_SOURCES, auth: REAL_SOURCES.auth.replace("const testerPhones = new Set(", "await appendMarketingConsent({} as never);\n  const testerPhones = new Set(") } },
    },
    {
      name: "the old label back in the ONE table — the column says Sign-up again",
      expect: L.s2,
      impl: { ...REAL, label: "Sign-up", sources: { ...REAL_SOURCES, copy: REAL_SOURCES.copy.replace('REGISTRATION: "Signed up",', 'REGISTRATION: "Sign-up",') } },
    },
    {
      name: "the loopback refusal removed — the backfill would write whatever database it is pointed at",
      expect: L.s3,
      impl: { ...REAL, sources: { ...REAL_SOURCES, backfill: REAL_SOURCES.backfill.replace("if (!LOOPBACK.includes(host) && !PRODUCTION) {", "if (false) {") } },
    },
    {
      name: "the audit-key refusal removed — a laptop's production write run signs audit rows production can never verify",
      expect: L.s3,
      impl: { ...REAL, sources: { ...REAL_SOURCES, backfill: REAL_SOURCES.backfill.replace("if (REAL_DATABASE && !DRY_RUN) {", "if (false) {") } },
    },
    {
      name: "the suite drops out of predeploy — a gate outside the pipeline is not a gate",
      expect: L.s4,
      impl: { ...REAL, sources: { ...REAL_SOURCES, pkg: REAL_SOURCES.pkg.replace("npm run test:registration-contact && ", "") } },
    },
    {
      name: "⛔ C8b · B8 · the rule ignores who wrote the row — a sign-up's own row re-dated as if the backfill had written it",
      expect: L.k1,
      impl: { ...REAL, door: anyWriterDoor },
    },
    {
      name: "⛔ C8b · B8 · an instant invented for a row with no record of its write (the writer's first instant)",
      expect: L.k1,
      impl: { ...REAL, door: inventingDoor },
    },
    {
      name: "⛔ C8b · B8 · the account check dropped — C8b's clock rows moved by milliseconds, a row without its account re-dated",
      expect: L.k1,
      impl: { ...REAL, door: accountBlindDoor },
    },
    {
      name: "⛔ C8b · B8 · the records read without the writer's floor — a record older than the writer taken as the row's entry",
      expect: L.k1,
      impl: { ...REAL, door: floorlessDoor },
    },
    {
      name: "⛔ C8b · B8 · a status that writes — it applies what it counts",
      expect: L.k1,
      impl: { ...REAL, door: writingStatusDoor },
    },
    {
      name: "⛔ C8b · B8 · apply without its expected count — a book that moved since status is written anyway",
      expect: L.k2,
      impl: { ...REAL, door: unexpectingDoor },
    },
    {
      name: "⛔ C8b · B8 · the operator's text screen bypassed — a run whose --by carries a phone number goes ahead",
      expect: L.k2,
      impl: { ...REAL, door: unscreenedDoor },
    },
    {
      name: "⛔ C8b · B8 · the new Added stamped over an officer's later edit — updatedAt forced on every row",
      expect: L.k3,
      impl: { ...REAL, door: restampingDoor },
    },
    {
      name: "⛔ C8b · B8 · the write before the record — the rows re-dated before the COMPLIANCE applying record exists",
      expect: L.k4,
      impl: { ...REAL, door: writeFirstDoor },
    },
    {
      name: "⛔ C8b · B8 · the ending never recorded — DONE said with no applied row on the chain",
      expect: L.k4,
      impl: { ...REAL, door: silentEndingDoor },
    },
    {
      name: "⛔ C8b · B8 · a second apply that finds nothing to do still records an attempt",
      expect: L.k5,
      impl: { ...REAL, door: recordingNothingDoor },
    },
    {
      name: "⛔ C8b · B8 · not all or nothing — each row written on its own, a changed row skipped and the rest written",
      expect: L.k6,
      impl: { ...REAL, door: rowByRowDoor },
    },
    {
      name: "⛔ C8b · B8 · a COMPLIANCE record that did not land still writes",
      expect: L.k7,
      impl: { ...REAL, door: unrecordedWriteDoor },
    },
    {
      name: "⛔ C8b · B8 · the read-back's verdict ignored — a write that changed nothing reported DONE",
      expect: L.k7,
      impl: { ...REAL, door: blindReadBackDoor },
    },
    {
      name: "⛔ C8b · B8 · the records asked of another target type — the backfill's own rows never found, never re-dated",
      expect: L.k8,
      impl: { ...REAL, door: wrongTargetDoor },
    },
    {
      name: "⛔ C8b · B8 · the door loaded by a static import — the database client built on the private host before the rewrite",
      expect: L.k9,
      impl: {
        ...REAL,
        sources: {
          ...REAL_SOURCES,
          doorCli: `import * as DOOR_STATIC from "../../src/lib/server/contacts/added-redate.ts";${LF}${REAL_SOURCES.doorCli.replace('const DOOR = await import("../../src/lib/server/contacts/added-redate.ts");', "const DOOR = DOOR_STATIC;")}`,
        },
      },
    },
    {
      name: "⛔ C8b · B8 · the door reads the audit log itself — a new audit-row reader in src the console guard must classify",
      expect: L.k9,
      impl: { ...REAL, sources: { ...REAL_SOURCES, door: `${REAL_SOURCES.door}${LF}export const planted = () => getAuditForTargetsDurable;${LF}` } },
    },
    {
      name: "⛔ C8b · B8 · apply without production's own environment — its COMPLIANCE rows signed by a key production never verifies",
      expect: L.k9,
      impl: { ...REAL, sources: { ...REAL_SOURCES, doorCli: REAL_SOURCES.doorCli.replace('if (!viaRailway || auditKey.trim() === "" || auditKey === (process.env.SESSION_SECRET ?? "")) {', "if (false) {") } },
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    await runAssertions(c.impl, tag);
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(`${tag}${c.expect}`)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}${LF}`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`${LF}${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log(`${LF}PROBLEMS:`);
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
