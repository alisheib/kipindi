import { db } from "@/lib/server/store";
import type { StoredAgentApplication, StoredAgentRefereeKey } from "@/lib/server/store";
import { pepperedLetters } from "@/lib/server/crypto";
import { parseTzNumber, readAsciiDigits } from "@/lib/tz-msisdn";

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
 * Tanzanian mobile number a contact holds is kept in `AgentRefereeKey` as a KEYED HASH (`refereeKeyOf`), with the instant
 * the referee was named, and the gate asks that table by key (`consent.ts`, step 1b, reason `agent_referee`), before any
 * basis — consent included — is asked.
 *
 * ⛔ WHO IS EXCLUDED: every referee named BEFORE the re-worded §9 went live. That moment is ONE constant,
 * `REFEREE_NEW_WORDS_LIVE_AT`, and it is `null` until the public-texts unit ships the new words (en, sw and zh) and sets it
 * in the same commit — so today EVERY referee ever named is excluded, whenever named. ⛔ NEVER A REFEREE LET THROUGH ON A
 * GUESS: an instant that cannot be read, on either side, keeps the promise.
 *
 * ⛔ THE KEY HOLDS NO MORE THAN IT MUST — the referee is not our customer. Thirty-two letters a–p: HMAC-SHA256 of the number
 * under `OTP_PEPPER` (`pepperedLetters`, one letter per hex nibble), so no digit and no number is ever stored, and nothing
 * without the pepper maps a key back to a number. ⚠️ THE FAILURE MODE, WRITTEN DOWN (as `identityFingerprint`'s is): rotating
 * `OTP_PEPPER` makes every stored key disagree with every lookup — the exclusion would quietly stop excluding. The pepper
 * already cannot rotate without repealing one-document-one-account, so this adds no new constraint; but if it ever rotates,
 * `npm run ops:marketing-referee-keys -- backfill` must be re-run at once (it re-keys every application that still holds its
 * contacts — an erased applicant's referees cannot be re-keyed, because their numbers are gone).
 *
 * ⭐ WHERE IT IS WRITTEN — every place a referee's number exists, before it can stop existing:
 *   · `setReferees` (agent-application-service.ts) — the moment a referee is named, BEFORE the application is saved, so a
 *     write that fails leaves an extra exclusion (harmless) and never a saved referee with no exclusion;
 *   · `pseudonymiseAgentApplications` (the applicant's erasure) — BEFORE the contacts are emptied, so an erasure can never
 *     erase the only copy of a promised referee's number before it was keyed;
 *   · `backfillRefereeKeys` — every existing application, once, through the ops door (the migration cannot: the pepper
 *     lives in the application, never in SQL).
 * ⛔ APPEND-ONLY: nothing here, or anywhere, removes a key — a referee named again, or replaced, keeps the earlier row, and
 * the gate reads the EARLIEST naming. The applicant's erasure keeps the keys too: they hold nothing of the applicant, and
 * the promise was made to the referee (docs/DATA-RETENTION.md).
 * ⛔ NO NUMBER IN ANY AUDIT OR LOG: nothing here audits or logs, and every count this module answers is a count.
 *
 * Guards: `npm run test:marketing-consent` (the referee rows, the writer, the erasure and the backfill, with their plants) ·
 * `npm run test:dal-parity` §28 (the two twins and the migration).
 */

/** ⛔ THE MOMENT THE RE-WORDED /legal/privacy §9 WENT LIVE — the words "50pick may send you offers by SMS." (management's
 *  answers of 2026-10-07, item 4), in en, sw and zh. ⭐ `null` TODAY, and that means EVERY referee is excluded: no new words
 *  are live, so every referee ever named was given the old promise. The public-texts unit sets it, in the commit that
 *  publishes the new words, to the instant they went live (an ISO instant). ⚠️ An applicant may have shown a referee the
 *  OLD notice before that instant and named them after it — set it later than the deploy if that window matters; a later
 *  instant only keeps more referees excluded, never fewer. */
export const REFEREE_NEW_WORDS_LIVE_AT: string | null = null;

/** The instant an application whose referees carry no readable date was named at: the beginning of time, so it is always
 *  BEFORE the re-wording — a referee is never let through because a date could not be read. */
export const REFEREE_NAMED_UNKNOWN = "1970-01-01T00:00:00.000Z";

/**
 * ⭐ DOES THE OLD PROMISE STILL BIND THIS REFEREE? Yes while no new words are live; yes when they were named BEFORE the new
 * words went live; and yes when either instant cannot be read (never on a guess). Pure — the gate, the profile switch and
 * the suites ask this ONE rule.
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
 * nobody.
 */
export function refereeKeyOf(msisdn: string): string {
  if (typeof msisdn !== "string" || !MOBILE_KEY.test(msisdn)) {
    throw new Error("refereeKeyOf: a referee key is made only of a gate key (255, a mobile 6 or 7, eight digits) — refused");
  }
  return pepperedLetters("marketing-referee", msisdn, 32);
}

/** The most digit groups one number is read across ("+255 (0) 712 345 678" is five), and the most digits one may hold. */
const MAX_GROUPS = 8;
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

/**
 * ⭐ EVERY TANZANIAN MOBILE NUMBER A REFEREE CONTACT HOLDS, as gate keys, sorted — read GENEROUSLY, because a number missed
 * here is a promised referee messaged: the whole field as the gate's own parser reads it, then every window of consecutive
 * digit groups (so "0712 345 678", two numbers in one field, a number beside a word, or every keyboard's digits all count).
 * ⚠️ It may OVER-read — the national part of a foreign number written "+254 712 345 678" is read as Tanzania's 0712 345 678
 * — and that is the safe direction: one more number is never sent offers. An e-mail with no number in it gives nothing (an
 * e-mail cannot receive an SMS). A contact with a typo — ten digits after the zero — gives nothing: no number is this
 * referee's with any certainty, and the gate can only be asked about a real one.
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
  return [...found].sort();
}

/** An instant in `toISOString()`'s spelling, or the fallback when it cannot be read. */
function instantOr(value: string | null | undefined, fallback: string): string {
  const ms = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : fallback;
}

/** ⭐ WHEN AN APPLICATION'S REFEREES WERE NAMED: the applicant's attestation that each agreed and was shown the notice
 *  (`refereeConsentAt`), else the application's creation, else `REFEREE_NAMED_UNKNOWN` — always the EARLIER reading, so a
 *  missing date can only keep a referee excluded. */
export function refereeNamedAtOf(app: Pick<StoredAgentApplication, "refereeConsentAt" | "createdAt">): string {
  return instantOr(app.refereeConsentAt, instantOr(app.createdAt, REFEREE_NAMED_UNKNOWN));
}

/**
 * ⭐ THE ONE WRITER — every number in these contacts keyed, with the instant the referees were named, appended. Answers how
 * many rows were NEW (0 when every pair was already held, which is what makes every caller re-runnable). ⛔ It THROWS when
 * the table cannot be written: `setReferees` then saves nothing, so a referee is never on file without their exclusion.
 */
export async function recordRefereeKeys(
  input: { contacts: ReadonlyArray<string | null | undefined>; namedAt: string },
  at: string = new Date().toISOString(),
): Promise<number> {
  const keys = new Set<string>();
  for (const contact of input.contacts) for (const msisdn of refereeNumbersIn(contact)) keys.add(refereeKeyOf(msisdn));
  if (keys.size === 0) return 0;
  const namedAt = instantOr(input.namedAt, REFEREE_NAMED_UNKNOWN);
  const recordedAt = instantOr(at, new Date().toISOString());
  const rows = [...keys].sort().map((refereeKey): StoredAgentRefereeKey => ({ refereeKey, namedAt, recordedAt }));
  return Promise.resolve(db.agentRefereeKey.record(rows));
}

/** ⭐ THE GATE'S READ — the EARLIEST instant this number was named as a referee, or null. It takes the gate's key. */
export async function refereeNamedAtFor(msisdn: string): Promise<string | null> {
  return Promise.resolve(db.agentRefereeKey.earliestFor(refereeKeyOf(msisdn)));
}

/** One number's answer in a bulk read — the gate's key and its earliest naming, never the hash. */
export type RefereeNamedEntry = { msisdn: string; namedAt: string | null };

/** ⭐ THE SPLIT'S BULK READ — the same answer as `refereeNamedAtFor`, for a chunk's keys, from ONE keyed read (§25's
 *  bound). Answers ONLY for the keys the table answered: a key missing from the answer is left out, never read as "not a
 *  referee", so the caller falls back to the single read (`audience-split.ts`). */
export async function refereeNamedAtAmong(msisdns: readonly string[]): Promise<RefereeNamedEntry[]> {
  const unique = Array.from(new Set(msisdns)).sort();
  if (unique.length === 0) return [];
  const byKey = new Map(unique.map((msisdn) => [refereeKeyOf(msisdn), msisdn] as const));
  const out: RefereeNamedEntry[] = [];
  for (const e of await Promise.resolve(db.agentRefereeKey.earliestAmong([...byKey.keys()]))) {
    const msisdn = byKey.get(e.refereeKey);
    if (msisdn !== undefined) out.push({ msisdn, namedAt: e.namedAt });
  }
  return out;
}

/** What the backfill and the census count — counts only, never a number or a key. */
export type RefereeKeyCensus = {
  /** Every application read. */
  applications: number;
  /** Those holding at least one referee contact. */
  withContact: number;
  /** The distinct referee numbers those contacts hold. */
  numbers: number;
  /** How many of those numbers have no key in the table yet — 0 once the backfill has run. */
  missing: number;
};

/** Every referee number on every application, keyed — the shared walk of the census and the backfill. */
async function refereeNumbersOnFile(): Promise<{ applications: number; withContact: number; byApplication: Array<{ app: StoredAgentApplication; numbers: string[] }> }> {
  const apps = await Promise.resolve(db.agentApplication.list());
  const byApplication: Array<{ app: StoredAgentApplication; numbers: string[] }> = [];
  let withContact = 0;
  for (const app of apps) {
    if (!app.refereeOneContact && !app.refereeTwoContact) continue;
    withContact++;
    const numbers = [...new Set([...refereeNumbersIn(app.refereeOneContact), ...refereeNumbersIn(app.refereeTwoContact)])].sort();
    byApplication.push({ app, numbers });
  }
  return { applications: apps.length, withContact, byApplication };
}

/** ⭐ READ-ONLY: how many referee numbers on file are not yet keyed — the ops door's `status`, and its read-back. */
export async function refereeKeyCensus(): Promise<RefereeKeyCensus> {
  const onFile = await refereeNumbersOnFile();
  const numbers = [...new Set(onFile.byApplication.flatMap((x) => x.numbers))].sort();
  let missing = 0;
  for (let i = 0; i < numbers.length; i += 1000) {
    const chunk = numbers.slice(i, i + 1000);
    const answered = new Map((await refereeNamedAtAmong(chunk)).map((e) => [e.msisdn, e.namedAt] as const));
    for (const msisdn of chunk) if ((answered.get(msisdn) ?? null) === null) missing++;
  }
  return { applications: onFile.applications, withContact: onFile.withContact, numbers: numbers.length, missing };
}

/**
 * ⭐ THE BACKFILL — every existing application's referees keyed, each with its own naming instant. Idempotent: a re-run
 * writes nothing new. Answers the census taken AFTER the writes (so `missing` is 0 when it worked) and how many rows were
 * new. Run once through the ops door after the migration is applied, and again only if the pepper ever rotates.
 */
export async function backfillRefereeKeys(at: string = new Date().toISOString()): Promise<RefereeKeyCensus & { written: number }> {
  const onFile = await refereeNumbersOnFile();
  let written = 0;
  for (const { app } of onFile.byApplication) {
    written += await recordRefereeKeys({ contacts: [app.refereeOneContact, app.refereeTwoContact], namedAt: refereeNamedAtOf(app) }, at);
  }
  return { ...(await refereeKeyCensus()), written };
}
