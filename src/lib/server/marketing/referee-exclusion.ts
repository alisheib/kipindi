import { db } from "@/lib/server/store";
import type { StoredAgentApplication, StoredAgentRefereeKey } from "@/lib/server/store";
import { pepperedLetters } from "@/lib/server/crypto";
import { parseTzNumber, readAsciiDigits } from "@/lib/tz-msisdn";
import type { RefereeKeyCounts } from "@/lib/marketing/outreach-open-checks";

/**
 * U33r · THE AGENT-REFEREE EXCLUSION — the promise /legal/privacy §9 made to every agent applicant's referee, "we never
 * contact you for marketing", kept by the send gate (Q8 of 2026-10-05; the owner's FINAL rule of 2026-10-07, COMPLIANCE-
 * DECISIONS § "2026-10-07 · Marketing SMS go to anyone with a phone — consent is not a condition (the owner's FINAL rule),
 * and his approvals given in the session": "HONOURED for every referee already given it (the exclusion is built), and
 * RE-WORDED from today, so referees recruited from now on can be reached"; § "2026-10-07 · Management's answers for the
 * first marketing campaign …", item 4).
 *
 * ⭐ WHAT IT IS. A referee's contact is FREE TEXT on `AgentApplication` (`refereeOneContact`, `refereeTwoContact`) — a phone
 * number or an e-mail, in whatever spelling the applicant typed. No gate can ask free text about a number, so every
 * Tanzanian mobile number a PROMISED referee's contact leads to is kept in `AgentRefereeKey` as a KEYED HASH
 * (`refereeKeyOf`), and the gate asks that table by key (`consent.ts`, step 1b, reason `agent_referee`) before any basis —
 * consent included — is asked. A key held is a refusal; nothing else is stored.
 * ⭐ "LEADS TO" (the U33r review's MINOR-1): the numbers written in the contact, AND — for an e-mail address in it — the
 * number of every account and every contact-book row holding that address (case-insensitive). A referee named only by
 * e-mail is still excluded wherever 50pick holds their number.
 *
 * ⛔ WHO IS EXCLUDED, AND WHO DECIDES (the U33r review's MAJOR-1): every referee named BEFORE the re-worded §9 went live.
 * That moment is ONE constant, `REFEREE_NEW_WORDS_LIVE_AT`, `null` until the public-texts unit ships the new words (en, sw
 * and zh) and sets it in the same commit — so today EVERY referee ever named is excluded. The WRITER asks it, when it
 * writes, and writes a key ONLY for a referee given the old promise: `setReferees` while no cutoff is set or before it;
 * the backfill and the applicant's erasure for an application named before it (`refereeNamedAtOf`). The table holds no
 * instant at all — an applicant's `refereeConsentAt` beside a key would link the referee back to them — so the gate asks
 * nothing about WHEN: a key held is a promised referee. ⛔ NEVER A REFEREE LET THROUGH ON A GUESS: an instant that cannot be
 * read, on either side, keeps the promise.
 * ⚠️ THE CUTOFF IS SET ONLY AFTER THE BACKFILL: a referee saved again after it re-stamps `refereeConsentAt` past it, and a
 * backfill run then would read that application as never promised. `test:privacy-notice` §4i refuses the constant while
 * the backfill is not recorded (`REFEREE_KEYS_ON_PRODUCTION`, the fifth licence-outreach check).
 *
 * ⛔ THE KEY HOLDS NO MORE THAN IT MUST — the referee is not our customer. Thirty-two letters a–p: HMAC-SHA256 of the number
 * under `OTP_PEPPER` (`pepperedLetters`, one letter per hex nibble), so no digit and no number is ever stored, and it cannot
 * be turned back into the number by anyone without the server's pepper, which never leaves the application. ⚠️ With the
 * pepper, every Tanzanian mobile number can be hashed and compared, so the pepper's secrecy IS the protection. ⚠️ THE
 * FAILURE MODE, WRITTEN DOWN (as `identityFingerprint`'s is): rotating `OTP_PEPPER` makes every stored key disagree with
 * every lookup — the exclusion would quietly stop excluding. The pepper already cannot rotate without repealing
 * one-document-one-account, so this adds no new constraint; but if it ever rotates, `npm run ops:marketing-referee-keys --
 * backfill` must be re-run at once (it re-keys every application that still holds its contacts — an erased applicant's
 * referees cannot be re-keyed, because their numbers are gone).
 *
 * ⭐ WHERE IT IS WRITTEN — every place a referee's number exists, before it can stop existing:
 *   · `setReferees` (agent-application-service.ts) — the moment referees are named, BEFORE the application is saved: the
 *     new referees (while the old promise is still the one shown) AND the referees being replaced (named under the old
 *     promise), so a write that fails saves nothing and leaves an extra exclusion at worst, never a saved or overwritten
 *     referee with no exclusion;
 *   · `pseudonymiseAgentApplications` (the applicant's erasure) — BEFORE the contacts are emptied, so an erasure can never
 *     erase the only copy of a promised referee's number before it was keyed;
 *   · `backfillRefereeKeys` — every existing application, through the ops door (the migration cannot: the pepper lives in
 *     the application, never in SQL). ⛔ It runs after the deploy that applies the migration and BEFORE licence outreach
 *     or the live-send switch opens (both refuse while its record is outstanding), before the cutoff is set, and again
 *     after any rollback to a build without U33r and the redeploy that follows.
 * ⛔ APPEND-ONLY: nothing here, or anywhere, removes a key — a referee named again, or replaced, keeps theirs. The
 * applicant's erasure keeps the keys too: they hold nothing of the applicant, and the promise was made to the referee. A
 * referee asking 50pick to destroy their information has everything else destroyed, but not this coded form of their
 * number — it is what keeps them out of marketing for as long as 50pick sends it (docs/DATA-RETENTION.md).
 * ⛔ NO NUMBER IN ANY AUDIT OR LOG: nothing here audits or logs, and every count this module answers is a count.
 *
 * Guards: `npm run test:marketing-consent` (the referee rows, the writer, the erasure, the backfill, the pepper and the ops
 * door, with their plants) · `npm run test:dal-parity` §28 (the two twins and the migration).
 */

/** ⛔ THE MOMENT THE RE-WORDED /legal/privacy §9 WENT LIVE — the words "50pick may send you offers by SMS." (management's
 *  answers of 2026-10-07, item 4), in en, sw and zh. ⭐ `null` TODAY, and that means EVERY referee is excluded: no new words
 *  are live, so every referee ever named was given the old promise. The public-texts unit sets it, in the commit that
 *  publishes the new words, to the instant they went live (an ISO instant) — and only once the backfill is recorded
 *  (`test:privacy-notice` §4i). ⚠️ An applicant may have shown a referee the OLD notice before that instant and named
 *  them after it — set it later than the deploy if that window matters; a later instant only keeps more referees
 *  excluded, never fewer. */
export const REFEREE_NEW_WORDS_LIVE_AT: string | null = null;

/** The instant an application whose referees carry no readable date was named at: the beginning of time, so it is always
 *  BEFORE the re-wording — a referee is never let through because a date could not be read. */
export const REFEREE_NAMED_UNKNOWN = "1970-01-01T00:00:00.000Z";

/**
 * ⭐ WAS THIS REFEREE GIVEN THE OLD PROMISE? Yes while no new words are live; yes when named BEFORE the new words went live;
 * and yes when either instant cannot be read (never on a guess). Pure — every WRITER and the suites ask this ONE rule; the
 * gate never does (a key held is the answer).
 */
export function refereePromiseHolds(namedAt: string, newWordsLiveAt: string | null = REFEREE_NEW_WORDS_LIVE_AT): boolean {
  if (newWordsLiveAt === null) return true;
  const cut = Date.parse(newWordsLiveAt);
  const named = Date.parse(namedAt);
  if (!Number.isFinite(cut) || !Number.isFinite(named)) return true;
  return named < cut;
}

/** A gate key: 255, then a mobile 6 or 7, then eight digits — the only numbers a key is ever made of. */
const MOBILE_KEY = /^255[67][0-9]{8}$/;
/** Nine national digits beginning 6 or 7. */
const MOBILE_NATIONAL = /^[67][0-9]{8}$/;

/** True for a gate key — the only spelling a referee key can be made of, so for anything else no referee row can exist
 *  and asking is pointless (the profile switch reads an account's number through `toMsisdn255`, which is this spelling for
 *  every Tanzanian mobile account). */
export function isRefereeKeyable(msisdn: string): boolean {
  return typeof msisdn === "string" && MOBILE_KEY.test(msisdn);
}

/**
 * ⭐ THE KEYED HASH OF ONE NUMBER — thirty-two letters a–p, domain-separated from every other use of the pepper. ⛔ It takes
 * the GATE'S key (`parseTzNumber(...).msisdn`, `255…`) and nothing else: a key built from another spelling would never
 * match the gate's lookup, so any other input is a programming error and THROWS rather than hashing to a key that excludes
 * nobody. ⛔ The pepper is read at every call (`pepperedLetters`), never cached — `test:marketing-consent` R9 hashes one
 * number under two peppers and requires two keys.
 */
export function refereeKeyOf(msisdn: string): string {
  if (typeof msisdn !== "string" || !MOBILE_KEY.test(msisdn)) {
    throw new Error("refereeKeyOf: a referee key is made only of a gate key (255, a mobile 6 or 7, eight digits) — refused");
  }
  return pepperedLetters("marketing-referee", msisdn, 32);
}

/** The most digit groups one number is read across ("0 7 1 2 3 4 5 6 7 8", a digit at a time, is ten), and the most
 *  digits one may hold. */
const MAX_GROUPS = 15;
const MAX_DIGITS = 15;
const DIGIT_RUN = /[0-9]+/g;
const LEADING_ZEROS = /^0+/;

/** The gate's key for a run of digits written the ways people write a Tanzanian mobile number — `+255 712…`, `00255…`,
 *  `0712…`, `712…`, `+255 (0) 712…` — following `parseTzNumber`'s own reading of the country code and the trunk zero, or
 *  null when it is not nine national digits beginning 6 or 7. ⭐ ANY 6 or 7: a prefix the numbering plan does not send to
 *  today is keyed too, so a range that opens later is already excluded. */
function mobileKeyOfDigits(run: string): string | null {
  let digits = run;
  if (digits.startsWith("00")) digits = digits.slice(2);
  let national: string;
  if (digits.startsWith("255") && digits.length > 9) {
    national = digits.slice(3);
    if (national.startsWith("0") && national.length <= 10) national = national.slice(1);
  } else if (digits.startsWith("0")) {
    national = digits.replace(LEADING_ZEROS, "");
  } else {
    national = digits;
  }
  const key = `255${national}`;
  return MOBILE_KEY.test(key) ? key : null;
}

/** ⭐ THE GENEROUS READINGS of ONE unbroken run of ten to fifteen digits — a number with a digit too many, or behind a
 *  prefix we do not know: its LAST nine digits, and the nine after its country code or trunk zero. A wrong guess only
 *  keeps one more number out of marketing; a missed one is a promised referee messaged. */
function lenientKeysOfRun(run: string): string[] {
  if (run.length < 10 || run.length > MAX_DIGITS) return [];
  const keys = new Set<string>();
  const add = (national: string): void => {
    if (MOBILE_NATIONAL.test(national)) keys.add(`255${national}`);
  };
  add(run.slice(-9));
  let rest = run.startsWith("00") ? run.slice(2) : run;
  if (rest.startsWith("255")) {
    rest = rest.slice(3);
    if (rest.startsWith("0")) rest = rest.slice(1);
  } else {
    rest = rest.replace(LEADING_ZEROS, "");
  }
  add(rest.slice(0, 9));
  return [...keys];
}

/**
 * ⭐ EVERY TANZANIAN MOBILE NUMBER WRITTEN IN A REFEREE CONTACT, as gate keys, sorted — read GENEROUSLY, because a number
 * missed here is a promised referee messaged: the whole field as the gate's own parser reads it; every window of up to
 * fifteen consecutive digit groups (so "0712 345 678", two numbers in one field, a number beside a word, a number typed a
 * digit at a time, and every keyboard's digits all count); and each unbroken run of ten to fifteen digits — and the
 * field's digits taken together — by its generous readings (`lenientKeysOfRun`).
 * ⚠️ It OVER-reads, on purpose and in the safe direction — one more number is never sent offers: the national part of a
 * foreign number ("+254 712 345 678" reads as 0712 345 678); a number with a digit too many ("0712 345 678 9" — the window
 * "0712 345 678" is a whole number — and "07123456789", whose nine after the zero are read); the last nine digits of a
 * long run. ⛔ What it CANNOT read gives nothing: a number with digits MISSING ("0712 345 67") is nobody's number with any
 * certainty, a landline or a foreign number with no mobile in it cannot receive an SMS, and an e-mail is not a number —
 * `readRefereeContact` follows an e-mail, and the census counts every contact that led nowhere (`unreadable`).
 */
export function refereeNumbersIn(contact: string | null | undefined): string[] {
  const text = readAsciiDigits(typeof contact === "string" ? contact : "");
  const found = new Set<string>();
  const whole = parseTzNumber(text);
  if (whole.verdict === "ok" && whole.msisdn) found.add(whole.msisdn);
  const groups = text.match(DIGIT_RUN) ?? [];
  for (let i = 0; i < groups.length; i++) {
    let run = "";
    for (let j = i; j < groups.length && j < i + MAX_GROUPS; j++) {
      run += groups[j];
      if (run.length > MAX_DIGITS + 2) break;
      const key = mobileKeyOfDigits(run);
      if (key !== null) found.add(key);
    }
  }
  for (const run of groups) for (const key of lenientKeysOfRun(run)) found.add(key);
  for (const key of lenientKeysOfRun(groups.join(""))) found.add(key);
  return [...found].sort();
}

/** The characters an e-mail address cannot hold here: a space (every whitespace is made one first), the list separators
 *  people type between addresses, and the brackets and quotes around them. */
const EMAIL = /[^ @,;<>()"']+@[^ @,;<>()"']+[.][^ @,;<>()"']{2,}/g;
const TRAILING_DOTS = /[.]+$/;

/** ⭐ EVERY E-MAIL ADDRESS IN A REFEREE CONTACT, lower-cased, deduplicated, sorted — the addresses `readRefereeContact`
 *  follows to an account or a book row. */
export function refereeEmailsIn(contact: string | null | undefined): string[] {
  const text = [...(typeof contact === "string" ? contact : "")].map((c) => (c.trim() === "" ? " " : c)).join("");
  const found = new Set<string>();
  for (const m of text.match(EMAIL) ?? []) {
    const email = m.replace(TRAILING_DOTS, "").toLowerCase();
    if (email.includes("@")) found.add(email);
  }
  return [...found].sort();
}

/** How many accounts one e-mail is followed to — `findAllByEmail`'s cap, generous: one address is one person nearly always. */
const REFEREE_EMAIL_ACCOUNTS_MAX = 20;

/** What one referee contact led to: its numbers, and which kind of contact it was — for the census's counts only. */
export type RefereeContactReading = {
  /** Gate keys, sorted: written in the contact, or held by an account or a book row under an e-mail written in it. */
  readonly numbers: readonly string[];
  /** `number` — a number was written in it · `email_matched` / `email_unmatched` — no number written, an e-mail that did /
   *  did not lead to one · `not_mobile` — nine or more digits reading as a landline or a foreign number · `unreadable` —
   *  nine or more digits that gave no number and are neither · `none` — empty, or too few digits to be a number. */
  readonly kind: "number" | "email_matched" | "email_unmatched" | "not_mobile" | "unreadable" | "none";
};

/**
 * ⭐ ONE REFEREE CONTACT, FOLLOWED — the numbers written in it (`refereeNumbersIn`), and for every e-mail address in it the
 * number of every account (`user.findAllByEmail`) and every book row (`marketingContact.msisdnsByEmail`) holding that
 * address, case-insensitive (the U33r review's MINOR-1). Reads only; writes and logs nothing.
 */
export async function readRefereeContact(contact: string | null | undefined): Promise<RefereeContactReading> {
  const text = typeof contact === "string" ? contact : "";
  const written = refereeNumbersIn(text);
  const emails = refereeEmailsIn(text);
  const numbers = new Set<string>(written);
  for (const email of emails) {
    for (const u of await Promise.resolve(db.user.findAllByEmail(email, REFEREE_EMAIL_ACCOUNTS_MAX))) {
      const parsed = parseTzNumber(typeof u.phoneE164 === "string" ? u.phoneE164 : "");
      if (parsed.verdict === "ok" && parsed.msisdn && isRefereeKeyable(parsed.msisdn)) numbers.add(parsed.msisdn);
    }
    for (const msisdn of await Promise.resolve(db.marketingContact.msisdnsByEmail(email))) {
      if (isRefereeKeyable(msisdn)) numbers.add(msisdn);
    }
  }
  const sorted = [...numbers].sort();
  if (written.length > 0) return { numbers: sorted, kind: "number" };
  if (emails.length > 0) return { numbers: sorted, kind: sorted.length > 0 ? "email_matched" : "email_unmatched" };
  const ascii = readAsciiDigits(text);
  if ((ascii.match(DIGIT_RUN) ?? []).join("").length < 9) return { numbers: sorted, kind: "none" };
  const verdict = parseTzNumber(ascii).verdict;
  return { numbers: sorted, kind: verdict === "landline" || verdict === "foreign" ? "not_mobile" : "unreadable" };
}

/** An instant in `toISOString()`'s spelling, or the fallback when it cannot be read. */
function instantOr(value: string | null | undefined, fallback: string): string {
  const ms = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : fallback;
}

/** ⭐ WHEN AN APPLICATION'S REFEREES WERE NAMED: the applicant's attestation that each agreed and was shown the notice
 *  (`refereeConsentAt`), else the application's creation, else `REFEREE_NAMED_UNKNOWN` — always the EARLIER reading, so a
 *  missing date can only keep a referee excluded. ⛔ Asked by the WRITERS only, and never stored. */
export function refereeNamedAtOf(app: Pick<StoredAgentApplication, "refereeConsentAt" | "createdAt">): string {
  return instantOr(app.refereeConsentAt, instantOr(app.createdAt, REFEREE_NAMED_UNKNOWN));
}

/**
 * ⭐ THE ONE WRITER — for referees named at `namedAt`: if they were given the old promise (`refereePromiseHolds`), every
 * number their contacts lead to is keyed and appended; if not, NOTHING is written. Answers how many rows were NEW (0 when
 * every key was already held — what makes every caller re-runnable). ⛔ The instant decides and is then forgotten: no row
 * holds it. ⛔ It THROWS when the table cannot be written: `setReferees` then saves nothing, so a referee is never on file
 * without their exclusion. `newWordsLiveAt` is the constant — a parameter only so the suites can drive a set cutoff.
 */
export async function recordRefereeKeys(
  input: { contacts: ReadonlyArray<string | null | undefined>; namedAt: string },
  newWordsLiveAt: string | null = REFEREE_NEW_WORDS_LIVE_AT,
): Promise<number> {
  if (!refereePromiseHolds(input.namedAt, newWordsLiveAt)) return 0;
  const keys = new Set<string>();
  for (const contact of input.contacts) {
    for (const msisdn of (await readRefereeContact(contact)).numbers) keys.add(refereeKeyOf(msisdn));
  }
  if (keys.size === 0) return 0;
  const rows = [...keys].sort().map((refereeKey): StoredAgentRefereeKey => ({ refereeKey }));
  return Promise.resolve(db.agentRefereeKey.record(rows));
}

/** ⭐ THE GATE'S READ — is this number a promised referee's? It takes the gate's key; a key held is the whole answer. */
export async function isPromisedReferee(msisdn: string): Promise<boolean> {
  return Promise.resolve(db.agentRefereeKey.holds(refereeKeyOf(msisdn)));
}

/** One number's answer in a bulk read — the gate's key and whether it is held, never the hash. */
export type RefereeHeldEntry = { msisdn: string; held: boolean };

/** ⭐ THE SPLIT'S BULK READ — the same answer as `isPromisedReferee`, for a chunk's keys, from ONE keyed read (§25's
 *  bound). Answers ONLY for the keys the table answered: a key missing from the answer is left out, never read as "not a
 *  referee", so the caller falls back to the single read (`audience-split.ts`). */
export async function promisedRefereesAmong(msisdns: readonly string[]): Promise<RefereeHeldEntry[]> {
  const unique = Array.from(new Set(msisdns)).sort();
  if (unique.length === 0) return [];
  const byKey = new Map(unique.map((msisdn) => [refereeKeyOf(msisdn), msisdn] as const));
  const out: RefereeHeldEntry[] = [];
  for (const e of await Promise.resolve(db.agentRefereeKey.heldAmong([...byKey.keys()]))) {
    const msisdn = byKey.get(e.refereeKey);
    if (msisdn !== undefined) out.push({ msisdn, held: e.held });
  }
  return out;
}

/** What the backfill and the census count — counts only, never a number, a key or an application id. The SAME shape the
 *  code records production's run in (`RefereeKeysRecord`, the fifth licence-outreach check). */
export type RefereeKeyCensus = RefereeKeyCounts;

type OnFile = {
  counts: Omit<RefereeKeyCounts, "numbers" | "missing">;
  byApplication: Array<{ app: StoredAgentApplication; numbers: string[] }>;
};

/** Every PROMISED application's referee contacts, followed — the shared walk of the census and the backfill. */
async function refereesOnFile(newWordsLiveAt: string | null): Promise<OnFile> {
  const apps = await Promise.resolve(db.agentApplication.list());
  let promised = 0;
  let withContact = 0;
  let unreadable = 0;
  let notMobile = 0;
  let emailOnlyUnmatched = 0;
  const byApplication: OnFile["byApplication"] = [];
  for (const app of apps) {
    if (!refereePromiseHolds(refereeNamedAtOf(app), newWordsLiveAt)) continue;
    promised++;
    const contacts = [app.refereeOneContact, app.refereeTwoContact].filter((c): c is string => typeof c === "string" && c.trim() !== "");
    if (contacts.length === 0) continue;
    withContact++;
    const numbers = new Set<string>();
    for (const contact of contacts) {
      const read = await readRefereeContact(contact);
      for (const n of read.numbers) numbers.add(n);
      if (read.kind === "unreadable") unreadable++;
      else if (read.kind === "not_mobile") notMobile++;
      else if (read.kind === "email_unmatched") emailOnlyUnmatched++;
    }
    byApplication.push({ app, numbers: [...numbers].sort() });
  }
  return { counts: { applications: apps.length, promised, withContact, unreadable, notMobile, emailOnlyUnmatched }, byApplication };
}

/** ⭐ READ-ONLY: how many promised referees' numbers are not yet keyed, and how many contacts led nowhere — the ops door's
 *  `status`, and its read-back. */
export async function refereeKeyCensus(newWordsLiveAt: string | null = REFEREE_NEW_WORDS_LIVE_AT): Promise<RefereeKeyCensus> {
  const onFile = await refereesOnFile(newWordsLiveAt);
  const numbers = [...new Set(onFile.byApplication.flatMap((x) => x.numbers))].sort();
  let missing = 0;
  for (let i = 0; i < numbers.length; i += 1000) {
    const chunk = numbers.slice(i, i + 1000);
    const answered = new Map((await promisedRefereesAmong(chunk)).map((e) => [e.msisdn, e.held] as const));
    for (const msisdn of chunk) if (answered.get(msisdn) !== true) missing++;
  }
  return { ...onFile.counts, numbers: numbers.length, missing };
}

/**
 * ⭐ THE BACKFILL — every promised application's referees keyed. Idempotent: a re-run writes nothing new. Answers the
 * census taken AFTER the writes (so `missing` is 0 when it worked) and how many rows were new. Run through the ops door
 * after the migration is applied, before licence outreach or the live switch opens and before the cutoff is set; again
 * after any rollback to a build without U33r and the redeploy that follows, and if the pepper ever rotates.
 */
export async function backfillRefereeKeys(newWordsLiveAt: string | null = REFEREE_NEW_WORDS_LIVE_AT): Promise<RefereeKeyCensus & { written: number }> {
  const onFile = await refereesOnFile(newWordsLiveAt);
  let written = 0;
  for (const { app } of onFile.byApplication) {
    written += await recordRefereeKeys(
      { contacts: [app.refereeOneContact, app.refereeTwoContact], namedAt: refereeNamedAtOf(app) },
      newWordsLiveAt,
    );
  }
  return { ...(await refereeKeyCensus(newWordsLiveAt)), written };
}

/* ══ THE OPS DOOR'S REFUSALS — the one rule `scripts/ops/marketing-referee-keys.mts` asks before anything runs ══════ */

/** What the door is run with — its arguments, and the four things in its environment it judges. */
export type RefereeKeysDoorInput = {
  /** `process.argv.slice(2)` — the command, then its flags. */
  readonly argv: readonly string[];
  readonly databaseUrl: string | undefined;
  /** Whether `OTP_PEPPER` itself is set — never its value. */
  readonly pepperSet: boolean;
  readonly railwayEnvironment: string | undefined;
  readonly railwayService: string | undefined;
};
export type RefereeKeysDoorRefusal = "usage" | "no_database" | "no_pepper" | "not_production";
export type RefereeKeysDoorVerdict =
  | { readonly ok: true; readonly command: "status" | "backfill" }
  | { readonly ok: false; readonly why: RefereeKeysDoorRefusal };

/** The door's words for each refusal — exit 2, nothing read or written. */
export const REFEREE_KEYS_DOOR_SENTENCE: Readonly<Record<RefereeKeysDoorRefusal, string>> = Object.freeze({
  usage: "usage: npm run ops:marketing-referee-keys -- status | backfill [--scratch]",
  no_database: "REFUSING: no DATABASE_URL — the keys live in the database. Run it through the runner (see the header).",
  no_pepper: "REFUSING: OTP_PEPPER is not set — keys made under the dev fallback would never match production's. Run it through the runner.",
  not_production:
    "REFUSING: this is not production's own environment (run it through `railway run --service 50pick`), and no --scratch against a loopback database was asked for — keys made under another pepper would protect nobody.",
});

const LOOPBACK_HOSTS: readonly string[] = ["127.0.0.1", "localhost", "::1", "[::1]"];

/** The database host, for the loopback check only — never printed. */
function databaseHostOf(url: string | undefined): string {
  try {
    return new URL(url ?? "").hostname;
  } catch {
    return "";
  }
}

/**
 * ⛔ THE DOOR'S RULE, PURE (the U33r review's MINOR-4 — pinned by `test:marketing-consent` R10 with its plants):
 *   · a command it knows, or nothing runs;
 *   · a database — a no-database process would key the in-memory store and report success;
 *   · `OTP_PEPPER` itself — outside production `requireSecret` falls back to a dev pepper, and keys made under it would
 *     never match the ones production computes, while the read-back, under the same wrong pepper, said "0 missing";
 *   · a WRITE (`backfill`) only in production's own environment as `railway run` injects it, or with `--scratch` against a
 *     LOOPBACK database (the integrator's scratch Postgres). `status` reads only.
 */
export function refereeKeysDoorVerdict(i: RefereeKeysDoorInput): RefereeKeysDoorVerdict {
  const command = i.argv[0];
  if (command !== "status" && command !== "backfill") return { ok: false, why: "usage" };
  if (typeof i.databaseUrl !== "string" || i.databaseUrl === "") return { ok: false, why: "no_database" };
  if (i.pepperSet !== true) return { ok: false, why: "no_pepper" };
  if (command === "status") return { ok: true, command };
  const viaRailway = i.railwayEnvironment === "production" && i.railwayService === "50pick";
  const scratch = i.argv.includes("--scratch") && LOOPBACK_HOSTS.includes(databaseHostOf(i.databaseUrl));
  if (!viaRailway && !scratch) return { ok: false, why: "not_production" };
  return { ok: true, command };
}
