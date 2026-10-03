/**
 * test:registration-contact — EVERY CLIENT IS A CONTACT (the owner, 2026-10-03): every 50pick registrant is added to the
 * marketing contact book, and an idempotent backfill makes every existing client one (`registration-contact.ts`).
 *
 * ⭐ DRIVEN, NOT READ, wherever it can run in a script — over the MEMORY twin, in-process:
 *   §1 THE DOORS — the REAL `registerWithPassword` and `verifyOtpAndAuth`: each makes the new number a contact; the ticked
 *      box reads GIVEN and the unticked one UNKNOWN with no ledger row; the bootstrap admin is never one; a THROWING book
 *      and a SILENT book each leave the sign-up finishing (the account and its wallet created); the failure is logged
 *      with no number in it.
 *   §2 THE RULE — `ensureRegistrationContact` on seeded accounts: the row's shape, the cache from the ledger, an officer's
 *      contact LINKED (not duplicated, not overwritten, its stamp kept — OD56), clients only, already-linked a read.
 *   §3 U18b's RECYCLED-NUMBER RULES — an erased tombstone never revived; a row linked to another account never re-pointed.
 *   §4 THE AUDIT — the masked number, the account, field names; no whole number, name or email.
 *   §5 THE BACKFILL — the dry run writes nothing; every PLAYER on +255 visited once, in pages; counts exactly the world's;
 *      a second run changes nothing; no number or name in its counts or its report.
 * Then the SOURCE, for what only the source can show (§6): each door's one call and its place, the copy, the backfill
 * script's refusals, the wiring.
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
import type { MessagingKey, PlayerWalk, PlayerWalkQuery, StoredMarketingContact, StoredUser } from "../src/lib/server/store.ts";
import { audit, auditFlush, getAuditPage } from "../src/lib/server/audit.ts";
import { hashOtp } from "../src/lib/server/crypto.ts";
import { registerWithPassword, verifyOtpAndAuth } from "../src/lib/server/auth-service.ts";
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
  | "wallets" | "walletsByUser" | "otps";
const memory = (globalThis as unknown as { __50PICK_STORE?: Record<WorldKey, Map<string, unknown>> }).__50PICK_STORE;
if (!memory || (process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false")) {
  console.error("test:registration-contact runs on the MEMORY twin only — unset DATABASE_URL. Nothing was run.");
  process.exit(2);
}
const MEM = memory as Record<WorldKey, Map<string, unknown>>;
const WORLD: readonly WorldKey[] = ["users", "usersByPhone", "marketingContacts", "contactsByMsisdn", "messagingConsents", "suppressions", "wallets", "walletsByUser", "otps"];

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
const STATE: readonly WorldKey[] = ["users", "marketingContacts", "contactsByMsisdn", "messagingConsents", "suppressions"];
const snapshot = (): string => STATE.map((k) => `${k}=${JSON.stringify([...MEM[k].entries()])}`).join("|");

/** One member of the book's memory twin swapped for the length of `fn` — in memory, never on disk — and put back. */
async function withBookMember<T>(name: "create" | "update" | "findByMsisdn", planted: unknown, fn: () => Promise<T>): Promise<T> {
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

const REG_ACTIONS = new Set(["contacts.contact.registered", "contacts.contact.linked"]);
const registrationAudits = () => getAuditPage({ limit: 10_000, category: "SYSTEM" }).filter((e) => REG_ACTIONS.has(e.action));
const registrationAuditCount = (): number => registrationAudits().length;

const eqCounts = (a: Record<string, number>, b: Record<string, number>): boolean =>
  Object.keys(a).length === Object.keys(b).length && Object.keys(b).every((k) => a[k] === b[k]);
const leaksIn = (text: string, secrets: readonly string[]): string[] => secrets.filter((s) => s.length > 0 && text.includes(s));

/* ═══ THE DOORS — the real auth-service, as far as a script can drive it ═══════════════════════════ */

type DoorRun = { result: unknown; thrown: string };
const PASSWORD = "Str0ng!Passw0rd#2026";
/** A successful sign-up mints a session cookie, which needs a Next request scope — so its throw means "it got all the
 *  way" (the `marketing-consent-ledger` suite's reading), and the rows it wrote are read back. */
async function passwordDoor(phone: string, email: string, ticked: boolean): Promise<DoorRun> {
  try {
    const result = await registerWithPassword({
      phone, email, password: PASSWORD, passwordConfirm: PASSWORD, dob: "1990-01-01",
      acceptTerms: true, acceptAge: true, marketingOptIn: ticked, locale: "EN",
    });
    return { result, thrown: "" };
  } catch (err) {
    return { result: null, thrown: String((err as Error)?.message ?? err) };
  }
}

type PendingRegistrations = Map<string, { dob: string; marketingOptIn: boolean; locale?: "EN" | "SW" | "ZH" }>;
const OTP_CODE = "246810";
async function otpDoor(phone: string, ticked: boolean): Promise<DoorRun> {
  const pending = (globalThis as unknown as { __50PICK_PENDING_REG?: PendingRegistrations }).__50PICK_PENDING_REG;
  if (!pending) return { result: null, thrown: "auth-service's pending-registration map is not loaded" };
  // ⭐ What `requestRegisterOtp` stashes, and the code it would have texted — the verify door itself runs for real.
  pending.set(phone, { dob: "1990-01-01", marketingOptIn: ticked, locale: "EN" });
  const salt = `rcotp${RUN}${phone.slice(-5)}`;
  await db.otp.create({
    id: `otp_rc_${RUN}_${phone.slice(-5)}`, phoneE164: phone, email: null, hashedCode: await hashOtp(OTP_CODE, salt), salt,
    purpose: "register", attempts: 0, consumedAt: null,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(), createdAt: new Date().toISOString(),
  });
  try {
    const result = await verifyOtpAndAuth({ phone, code: OTP_CODE, purpose: "register" });
    return { result, thrown: "" };
  } catch (err) {
    return { result: null, thrown: String((err as Error)?.message ?? err) };
  }
}

/* ═══ THE IMPLEMENTATION UNDER TEST — swappable, so a red case can plant one piece ═════════════════ */

type Sources = { auth: string; copy: string; exportSrc: string; loader: string; backfill: string; probe: string; pkg: string };
const REAL_SOURCES: Sources = {
  auth: read("src/lib/server/auth-service.ts"),
  copy: read("src/app/admin/contacts/contacts-copy.ts"),
  exportSrc: read("src/lib/server/contacts/export.ts"),
  loader: read("src/app/admin/contacts/contacts-loader.ts"),
  backfill: read("scripts/live/backfill-registration-contacts.mts"),
  probe: read("scripts/live/registration-contact-pg-probe.mts"),
  pkg: rawRead("package.json"),
};

type Ensure = (user: RegistrationContactUser, deps?: RegistrationContactDeps) => Promise<RegistrationContactResult>;
type Impl = {
  password: (phone: string, email: string, ticked: boolean) => Promise<DoorRun>;
  otp: (phone: string, ticked: boolean) => Promise<DoorRun>;
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
};
const REAL: Impl = {
  password: passwordDoor,
  otp: otpDoor,
  bootstrapDoor: (phone, email) => withEnv("ADMIN_BOOTSTRAP_PHONES", phone, () => passwordDoor(phone, email, false)),
  ensure: ensureRegistrationContact,
  atSignup: registrationContactAtSignup,
  mirror: mirrorContactCache,
  backfill: backfillRegistrationContacts,
  dryRunDeps: registrationDryRunDeps,
  report: registrationBackfillReport,
  label: SOURCE_LABEL.REGISTRATION,
  sources: REAL_SOURCES,
};

/** A function's text: from `export async function <name>(` to the next top-level `export`. */
function fnBody(src: string, name: string): string {
  const at = src.indexOf(`export async function ${name}(`);
  if (at < 0) return "";
  const next = src.indexOf(`${LF}export `, at + 1);
  return src.slice(at, next < 0 ? src.length : next);
}
/** The index of the brace that closes the block opened at `open`, or -1. */
function blockEnd(s: string, open: number): number {
  if (open < 0) return -1;
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/* ═══ THE LABELS, ONCE — the assertions and the red cases both read them ════════════════════════════ */

const L = {
  d1: "1.1 · ⭐ BOTH DOORS make the new number a contact: the password sign-up and the OTP sign-up each leave exactly ONE book row for the account's number — source REGISTRATION, linked to the account, sourceRef the account id (EXECUTED through the real auth-service)",
  d2: "1.2 · ⭐ the cache is the ledger's: the ticked box's row reads GIVEN beside its GIVEN ledger row, the unticked box's row reads UNKNOWN and its number has NO ledger row — nothing invented (EXECUTED through the real password door)",
  d3: "1.3 · ⛔ the bootstrap admin is never a contact: a password sign-up on an ADMIN_BOOTSTRAP_PHONES number is created ADMIN and leaves the book without a row for it (EXECUTED)",
  d4: "1.4 · ⛔ A THROWING BOOK NEVER FAILS A SIGN-UP: with every book create throwing, both doors still create the account and its wallet (the only throw is the session cookie's, never the book's) and write no row — and the bounded wrapper answers failed, never rejecting",
  d5: "1.5 · ⛔ the failure is logged WITHOUT the number or the email: a book whose error message prints the whole row still yields one [registration-contact] line naming only the stage and the error's name and code — and the cache mirror every sign-up passes through logs its own failure the same way",
  d6: "1.6 · ⛔ A SILENT BOOK NEVER HOLDS A SIGN-UP: the wrapper gives up within its budget (timed_out) when the book never answers, and the real OTP door, its book read never answering, still finishes and creates the wallet",
  r1: "2.1 · the row's shape: the bare 255… key and its prefix from the ONE table, the account's number as rawInput, the account's name and email through the ONE field rule (cleaned; an over-long name and a malformed email DROPPED, never cut), no stored operator, no officer, no tags, notes or import, and the account's own createdAt",
  r2: "2.2 · ⭐ the cache comes from the LEDGER: an account whose ledger says GIVEN reads GIVEN, one whose last word is WITHDRAWN reads WITHDRAWN, one with no ledger row reads UNKNOWN — and the rule writes NO ledger row of its own",
  r3: "2.3 · ⭐ an OFFICER'S contact is LINKED, not duplicated: one row for the number, the same id, now linked to the account, source OPERATOR kept, every field the officer typed untouched (name, email, notes, tags, sourceRef, createdBy, createdAt), the consent mirrored",
  r4: "2.4 · ⛔ OD56 · a link is not an edit: the linked row's own updatedAt and updatedBy are written back — an officer's open dialog stays valid, a masked viewer sees nothing move",
  r5: "2.5 · ⛔ CLIENTS ONLY: GROWTH, ADMIN and AGENT accounts, a +254 number, a 064 number, a landline, a CLOSED account, an erased account and a bootstrap-admin number are each skipped with their own reason, and the book, the ledger and the audit are untouched",
  r6: "2.6 · already linked to this account is a READ: already_linked with the row's id, no write, no audit row, the store byte-identical",
  t1: "3.1 · ⛔ U18b · AN ERASED TOMBSTONE IS NEVER REVIVED: a client signing up on an erased number leaves the row exactly as erasure left it (unlinked, nameless, sourceRef erasure), creates no second row, and its answer carries no contact id",
  t2: "3.2 · ⛔ U18b · A ROW LINKED TO ANOTHER ACCOUNT IS NOT THIS PERSON'S: it keeps its link and every field, nothing is created, and the answer carries no contact id",
  a1: "4.1 · every write is audited like U22's: contacts.contact.registered and contacts.contact.linked with the MASKED number, the account, the field names and where it came from — and no whole number, name or email in any of this run's registration audit rows",
  b0: "5.0 · ⭐ the backfill's DRY RUN writes nothing (the store and the audit untouched) and predicts the real run's outcomes",
  b1: "5.1 · ⭐ THE BACKFILL walks every PLAYER account on a +255 number by id, in pages of two, each exactly ONCE, and its counts by outcome, skip reason and cache are exactly the world's — staff, an agent, an erased account and a foreign number never walked (the census counts them)",
  b2: "5.2 · ⭐ THE BACKFILL IS IDEMPOTENT: a second run creates and links nothing, repairs no cache, writes no audit row, and leaves the store byte-identical",
  b3: "5.3 · ⛔ the backfill holds no number and no name: its counts and every line of its report carry none of the world's numbers, names or emails",
  s1: "6.1 · ⭐ THE WIRING: each sign-up door calls registrationContactAtSignup(user) exactly ONCE — after its account row, after (and outside) its consent-ledger block, and after its wallet (the money first) — and auth-service never calls the unbounded ensureRegistrationContact",
  s2: '6.2 · the copy: SOURCE_LABEL.REGISTRATION reads "Signed up" in the ONE table the column, the rail, the edit dialog and the export read, and "Sign-up" is gone from it',
  s3: "6.3 · the backfill script refuses no DATABASE_URL, the memory twin, a non-loopback URL without --production, and a real-database write run without the app's own audit key — all BEFORE the store loads — runs the ONE walk and prints only the report's lines, naming no number, name or email; and its Postgres probe refuses any non-loopback URL before the store loads",
  s4: "6.4 · the suite is wired: test:registration-contact and red:registration-contact (--prove-red, in-process) exist, and predeploy runs the suite exactly once",
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
    const P = { pw: num(1), otp: num(2), unticked: num(3), boot: num(4), throwPw: num(5), throwOtp: num(6), silent: num(7) };
    const pwRun = await impl.password(P.pw, mail(1), true);
    const otpRun = await impl.otp(P.otp, true);
    const untickedRun = await impl.password(P.unticked, mail(3), false);

    await check(p(L.d1), async () => {
      const u1 = await addAccount(P.pw);
      const u2 = await addAccount(P.otp);
      const c1 = await db.marketingContact.findByMsisdn(keyOf(P.pw));
      const c2 = await db.marketingContact.findByMsisdn(keyOf(P.otp));
      const good = (u: StoredUser | null, c: StoredMarketingContact | null, phone: string) =>
        u !== null && c !== null && c.source === "REGISTRATION" && c.userId === u.id && c.sourceRef === u.id && c.msisdn === keyOf(phone) && rowsFor(phone) === 1;
      const say = (u: StoredUser | null, c: StoredMarketingContact | null, run: DoorRun) =>
        u === null ? `NO ACCOUNT (${JSON.stringify(run.result)} ${run.thrown.slice(0, 60)})` : c === null ? "account, NO ROW" : `${c.source}, linked ${c.userId === u.id}`;
      return [good(u1, c1, P.pw) && good(u2, c2, P.otp), `password: ${say(u1, c1, pwRun)} · otp: ${say(u2, c2, otpRun)}`];
    });
    await check(p(L.d2), async () => {
      await addAccount(P.unticked);
      const ticked = await db.marketingContact.findByMsisdn(keyOf(P.pw));
      const plain = await db.marketingContact.findByMsisdn(keyOf(P.unticked));
      const word = await db.messagingConsent.latestFor(mkey(P.pw));
      const plainRows = await db.messagingConsent.listFor(mkey(P.unticked));
      return [ticked?.consentState === "GIVEN" && word?.status === "GIVEN" && plain !== null && plain.consentState === "UNKNOWN" && plainRows.length === 0,
        `ticked ${ticked?.consentState ?? "no row"} (ledger ${word?.status ?? "none"}) · unticked ${plain?.consentState ?? `no row ${untickedRun.thrown.slice(0, 40)}`} (${plainRows.length} ledger row(s))`];
    });

    const bootRun = await impl.bootstrapDoor(P.boot, mail(4));
    await check(p(L.d3), async () => {
      const u = await addAccount(P.boot);
      const c = await db.marketingContact.findByMsisdn(keyOf(P.boot));
      return [u !== null && u.role === "ADMIN" && c === null && rowsFor(P.boot) === 0,
        `${u ? u.role : `no account ${bootRun.thrown.slice(0, 40)}`} · ${c ? "A BOOK ROW" : "no row"}`];
    });

    // ── a THROWING book: the store's create refuses for the length of both doors ──
    const refuse = (row: StoredMarketingContact) => { throw new Error(`planted by test:registration-contact: the book refused ${row.msisdn}`); };
    const thrown = await capturingErrors(() => withBookMember("create", refuse, async () => ({
      pw: await impl.password(P.throwPw, mail(5), true),
      otp: await impl.otp(P.throwOtp, true),
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
      const b = await finished(P.throwOtp, thrown.value.otp);
      const w = wrapper.ok ? wrapper.value : null;
      return [a && b && w !== null && w.outcome === "failed" && "stage" in w && w.stage === "create",
        `password finished ${a} · otp finished ${b} · wrapper ${wrapper.ok ? JSON.stringify(wrapper.value) : `REJECTED (${String((wrapper.error as Error)?.message ?? wrapper.error)})`}`];
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

    // ── a SILENT book: the wrapper with a book that never answers, then the real OTP door with a read that never answers ──
    const t0 = Date.now();
    const quiet = (await capturingErrors(() => within(impl.atSignup(account(`rc${RUN}_slow`, num(10)), {
      book: { ...REGISTRATION_BOOK, findByMsisdn: () => new Promise<StoredMarketingContact | null>(() => undefined) },
      budgetMs: 50,
    }), 2_000))).value;
    const wrapperMs = Date.now() - t0;
    const t1 = Date.now();
    const door = await capturingErrors(() => withBookMember("findByMsisdn", () => new Promise(() => undefined), () => within(impl.otp(P.silent, false), 8_000)));
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
    const rA1 = await impl.ensure(A1);
    const rA2 = await impl.ensure(A2);
    await check(p(L.r1), async () => {
      const row = await db.marketingContact.findByMsisdn(keyOf(A1.phoneE164));
      const row2 = await db.marketingContact.findByMsisdn(keyOf(A2.phoneE164));
      const q = parseTzNumber(A1.phoneE164);
      const shape = row !== null && row.msisdn === q.msisdn && row.msisdn.startsWith("255") && row.msisdn.length === 12 && row.ndc === q.ndc
        && row.operator === null && row.rawInput === A1.phoneE164 && row.displayName === "Asha Mwakalinga" && row.email === "asha.m@example.tz"
        && row.notes === null && row.tags.length === 0 && row.importId === null && row.createdBy === null && row.updatedBy === null
        && row.createdAt === "2026-09-20T08:00:00.000Z" && row.updatedAt === row.createdAt && row.source === "REGISTRATION"
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

    /* ── §3 · U18b's RECYCLED-NUMBER RULES ───────────────────────────────────────────────────────── */
    const T = account(`rc${RUN}_t`, num(41), { displayName: "New Holder", email: "new.holder@example.tz" });
    await db.user.create(T);
    runAccounts.add(T.id);
    const tomb = bookRow(`mc_rc_tomb_${RUN}`, num(41), {
      source: "IMPORT", sourceRef: ERASURE_EVIDENCE, rawInput: keyOf(num(41)), consentState: "WITHDRAWN", createdBy: null,
      createdAt: "2026-08-01T08:00:00.000Z", updatedAt: "2026-08-20T08:00:00.000Z", updatedBy: "usr_dpo",
    });
    await db.marketingContact.create(tomb);
    await ledger(T.phoneE164, "GIVEN", "2026-08-02T08:00:00.000Z");
    await ledger(T.phoneE164, "WITHDRAWN", "2026-08-20T08:00:00.000Z");
    const tombBefore = JSON.stringify(await db.marketingContact.find(tomb.id));
    const rT = await impl.ensure(T);
    await check(p(L.t1), async () => {
      const after = JSON.stringify(await db.marketingContact.find(tomb.id));
      return [rT.outcome === "kept_erased" && !("contactId" in rT) && !JSON.stringify(rT).includes(tomb.id) && after === tombBefore && rowsFor(T.phoneE164) === 1,
        `${JSON.stringify(rT)} · the tombstone ${after === tombBefore ? "untouched" : `CHANGED to ${after}`}`];
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

    /* ── §4 · THE AUDIT ──────────────────────────────────────────────────────────────────────────── */
    const SECRETS: string[] = [];
    for (let s = 1; s <= 43; s++) SECRETS.push(nationalOf(num(s)));
    SECRETS.push(nationalOf(num(35, "64")), nationalOf(num(36, "22")), nationalOf(foreign(34)));
    for (let s = 1; s <= 7; s++) SECRETS.push(mail(s));
    SECRETS.push("Asha", "Mwakalinga", "Account Name", "New Holder", "Previous holder", "asha.m@example.tz", "Asha.M@Example.TZ",
      "account@example.tz", "typed@example.tz", "new.holder@example.tz", "previous@example.tz", LEAK_MAIL);
    await auditFlush();
    await check(p(L.a1), () => {
      const entries = registrationAudits();
      const createdId = "contactId" in rA1 ? rA1.contactId : "";
      const reg = entries.find((e) => e.action === "contacts.contact.registered" && e.targetId === createdId);
      const lnk = entries.find((e) => e.action === "contacts.contact.linked" && e.targetId === X.id);
      const pr = (reg?.payload ?? {}) as Record<string, unknown>;
      const pl = (lnk?.payload ?? {}) as Record<string, unknown>;
      const mine = entries.filter((e) => runAccounts.has(String(((e.payload ?? {}) as Record<string, unknown>).account ?? "")));
      const dirty = leaksIn(JSON.stringify(mine), SECRETS);
      return [!!reg && reg.actorId === A1.id && reg.targetType === "MarketingContact" && pr.number === maskPhone(keyOf(A1.phoneE164)) && pr.account === A1.id
        && pr.via === "signup" && JSON.stringify(pr.fields) === JSON.stringify(["displayName", "email"])
        && !!lnk && lnk.actorId === D.id && pl.keptSource === "OPERATOR" && pl.number === maskPhone(keyOf(D.phoneE164)) && pl.account === D.id
        && mine.length >= 3 && dirty.length === 0,
        `registered ${JSON.stringify(reg?.payload ?? null)} · linked ${JSON.stringify(lnk?.payload ?? null)} · ${mine.length} row(s) · ${dirty.length ? `CARRY ${dirty.join(",")}` : "clean"}`];
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
      const OUTCOMES = { created: 2, linked: 1, already_linked: 1, kept_erased: 1, kept_other_account: 1, skipped: 4, failed: 0 };
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
        const once = visits.length === WALKED.length && [...visits].sort().join(",") === WALKED.join(",");
        return [first.accounts === 14 && first.walked === 10 && first.missing === 0 && eqCounts(first.outcomes, OUTCOMES) && eqCounts(first.skipped, SKIPS)
          && eqCounts(first.cache, { none: 0, unchanged: 5, updated: 1, failed: 0 }) && once
          && made[0]?.userId === W.w1.id && made[0]?.consentState === "GIVEN" && made[1]?.userId === W.w2.id && linked?.userId === W.w3.id,
          `accounts ${first.accounts} · walked ${first.walked} (${visits.length} visits) · ${JSON.stringify(first.outcomes)} · ${JSON.stringify(first.skipped)} · cache ${JSON.stringify(first.cache)}`];
      });

      // 5.2 · the second run
      await auditFlush();
      const before2 = snapshot();
      const audits2 = registrationAuditCount();
      const second = await impl.backfill({ chunk: 2, contact: { bootstrapPhones } });
      await auditFlush();
      await check(p(L.b2), () => [
        second.outcomes.created === 0 && second.outcomes.linked === 0 && second.outcomes.already_linked === 4 && second.outcomes.failed === 0
          && second.cache.updated === 0 && snapshot() === before2 && registrationAuditCount() === audits2,
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
    const doors = ["verifyOtpAndAuth", "registerWithPassword"].map((name) => {
      const body = fnBody(auth, name);
      const calls = body.split("registrationContactAtSignup(").length - 1;
      const iUser = body.indexOf("db.user.create(");
      const iIf = body.search(/if [(](?:reg|baseParse[.]data)[.]marketingOptIn === true[)] [{]/);
      const iLedger = body.indexOf("await appendMarketingConsent({");
      const iEnd = iIf < 0 ? -1 : blockEnd(body, body.indexOf("{", iIf));
      const iHook = body.indexOf("await registrationContactAtSignup(user);");
      const iWallet = body.indexOf("wallet.create(");
      const placed = calls === 1 && iUser >= 0 && iIf > iUser && iLedger > iIf && iEnd > iLedger && iWallet > iEnd && iHook > iWallet;
      return { name, placed, at: [iUser, iIf, iLedger, iEnd, iWallet, iHook].join("/"), calls };
    });
    const imported = auth.includes('import { registrationContactAtSignup } from "@/lib/server/marketing/registration-contact";');
    const unbounded = auth.includes("ensureRegistrationContact");
    return [doors.every((d) => d.placed) && imported && !unbounded,
      `${doors.map((d) => `${d.name} ${d.placed ? "placed" : "OFF"} (${d.calls} call(s) @${d.at})`).join(" · ")} · imported ${imported} · unbounded call ${unbounded}`];
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

/** 🔴 The row shaped by hand: the brand stored as text, the account's name as it came, the wall clock as "added". */
const handShapedRow: Ensure = (user, deps = {}) => {
  const book = bookOf(deps);
  return ensureRegistrationContact(user, {
    ...deps,
    book: {
      ...book,
      create: (row) => {
        const at = new Date().toISOString();
        return book.create({ ...row, operator: parseTzNumber(row.msisdn).operator?.brand ?? "Vodacom", displayName: user.displayName, createdAt: at, updatedAt: at });
      },
    },
  });
};

/** 🔴 The cache read from the account's own toggle when the ledger is silent — an unticked box recorded as a withdrawal. */
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

/** 🔴 The erased tombstone revived — linked to the new account and given its name and email: an erasure undone by a writer
 *  that is not erasure. */
const reviveTombstones: Ensure = async (user, deps = {}) => {
  const key = parseTzNumber(user.phoneE164).msisdn;
  const row = key ? await db.marketingContact.findByMsisdn(key) : null;
  if (row !== null && row.sourceRef === ERASURE_EVIDENCE) {
    await db.marketingContact.update(row.id, { userId: user.id, email: user.email ?? null, displayName: user.displayName, source: "REGISTRATION", sourceRef: user.id }, row.updatedAt);
    return { outcome: "linked", contactId: row.id, cache: "none" };
  }
  return ensureRegistrationContact(user, deps);
};

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
      name: "the OTP door's book write goes nowhere — the rule hears created while the row never lands",
      expect: L.d1,
      impl: { ...REAL, otp: (phone, ticked) => withBookMember("create", (row: StoredMarketingContact) => row, () => otpDoor(phone, ticked)) },
    },
    {
      name: "the cache write is lost — the ticked box's new row is left reading UNKNOWN",
      expect: L.d2,
      impl: {
        ...REAL,
        password: (phone, email, ticked) => (ticked
          ? withBookMember("update", (id: string) => db.marketingContact.find(id), () => passwordDoor(phone, email, ticked))
          : passwordDoor(phone, email, ticked)),
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
      name: "the row shaped by hand — the brand stored, the name uncleaned, the wall clock as createdAt",
      expect: L.r1,
      impl: { ...REAL, ensure: handShapedRow },
    },
    {
      name: "the cache invented from the account's toggle — an unticked box recorded as a withdrawal",
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
      name: "⛔ U18b · the erased tombstone revived — linked to the new account and given its name and email",
      expect: L.t1,
      impl: { ...REAL, ensure: reviveTombstones },
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
      name: "the OTP door loses its call — a door that stopped calling the hook (E-240's shape)",
      expect: L.s1,
      impl: { ...REAL, sources: { ...REAL_SOURCES, auth: REAL_SOURCES.auth.replace("    await registrationContactAtSignup(user);", "") } },
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
