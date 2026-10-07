import { db } from "@/lib/server/store";
import type { StoredAgentApplication, StoredAgentRefereeKey } from "@/lib/server/store";
import { pepperedLetters } from "@/lib/server/crypto";
import { audit, getAuditForTargetsDurable } from "@/lib/server/audit";
import { parseTzNumber, readAsciiDigits } from "@/lib/tz-msisdn";
import type { RefereeKeyCounts } from "@/lib/marketing/outreach-open-checks";
import { REFEREE_KEY_RECORD_MAX } from "@/lib/server/marketing/referee-key-model";
import { screenOpsText } from "@/lib/server/marketing/live-switch";

/**
 * U33r · THE AGENT-REFEREE EXCLUSION — the promise /legal/privacy §9 made to EVERY agent applicant's referee until version
 * `REFEREE_PROMISE_REWORDED_IN` (Privacy v2026-10-07, `src/lib/legal/privacy-referees.ts`), "we never contact you for
 * marketing" — which §9 KEEPS, from that version on, for every referee named before it (and §5 says why a coded form of
 * each such number is kept), while a referee named after it is told "50pick may send you offers by SMS." — kept by the
 * send gate (Q8 of 2026-10-05; the owner's FINAL rule of 2026-10-07, COMPLIANCE-
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
 * number of every account and every contact-book row holding that address (case-insensitive), AS THEY ARE WHEN A WRITER
 * RUNS — AND THE ADDRESS ITSELF (the third pass's MINOR-2): its own keyed hash (`refereeEmailKeyOf`, the pepper's
 * "marketing-referee-email" domain) in the same table, so an account that signs up LATER with that address, at any
 * number, is refused at the gate (`consent.ts`, step 2's first question — one keyed read more, for an account that has an
 * address). ⚠️ RESIDUAL, STILL OPEN: a contact-book row IMPORTED later with that address, at a number no account holds, is
 * not refused — the gate would need one more read per send (the book row by its number) and the split a new bulk read
 * per chunk to see a book row's address; that cost is stated in the spec and waits on the lead.
 *
 * ⛔ WHO IS EXCLUDED, AND WHO DECIDES (the U33r review's MAJOR-1): every referee named BEFORE the re-worded §9 went live —
 * the instant version `REFEREE_PROMISE_REWORDED_IN` first went live, so the keys are exactly the "coded form of the phone
 * number of each agent referee named before version {V}" §5 states. That moment is ONE constant, `REFEREE_NEW_WORDS_LIVE_AT`,
 * `null` until production's backfill is recorded and then set, in the commit that records it, to that instant — so today
 * EVERY referee ever named is excluded. ⚠️ THE WINDOW, WRITTEN DOWN: a referee named after the new words go live but before
 * that commit is deployed is keyed too (the code cannot know the go-live instant before it happens), and the table is
 * append-only, so they stay excluded — never sent offers, their coded form kept like a promised referee's. Keep the window
 * short: record the backfill and set the cutoff in one commit, at once. The WRITER asks it, when it
 * writes, and writes a key ONLY for a referee given the old promise: `setReferees` while no cutoff is set or before it;
 * the backfill and the applicant's erasure for an application named before it (`refereeNamedAtOf`). No column holds an
 * instant — an applicant's `refereeConsentAt` beside a key would link the referee back to them — so the gate asks nothing
 * about WHEN: a key held is a promised referee. ⛔ NEVER A REFEREE LET THROUGH ON A GUESS: an instant that cannot be read,
 * on either side, keeps the promise.
 * ⚠️ THE CUTOFF IS SET ONLY AFTER THE BACKFILL: a referee saved again after it re-stamps `refereeConsentAt` past it, and a
 * backfill run then would read that application as never promised. `test:privacy-notice` §4i refuses the constant while
 * the backfill is not recorded (`REFEREE_KEYS_ON_PRODUCTION`, the fifth licence-outreach check).
 *
 * ⛔ THE KEY HOLDS NO MORE THAN IT MUST — the referee is not our customer. Thirty-two letters a–p: HMAC-SHA256 of the number
 * under `OTP_PEPPER` (`pepperedLetters`, one letter per hex nibble), so no digit and no number is ever stored, and it cannot
 * be turned back into the number by anyone without the server's pepper, which never leaves the application. ⚠️ With the
 * pepper, every Tanzanian mobile number can be hashed and compared, so the pepper's secrecy IS the protection. ⚠️ No COLUMN
 * links a key to an application or an applicant — but a key written by `setReferees` lands moments before that save's own
 * `agent.application.referees_set` audit row, and one written by an applicant's erasure beside that erasure's own rows, so
 * they sit near each other in the database's own write order; that is why every writer writes its keys in ONE pass sorted
 * by key (the backfill ALL of them at once), never application by application. ⚠️ THE FAILURE MODE,
 * WRITTEN DOWN (as `identityFingerprint`'s is): rotating `OTP_PEPPER` makes every stored key disagree with every lookup —
 * the exclusion would quietly stop excluding. The pepper already cannot rotate without repealing one-document-one-account,
 * so this adds no new constraint; but if it ever rotates, `npm run ops:marketing-referee-keys -- backfill` must be re-run
 * at once (it re-keys every application that still holds its contacts — an erased applicant's referees cannot be
 * re-keyed, because their numbers are gone).
 *
 * ⭐ WHERE IT IS WRITTEN — every place a referee's number exists, before it can stop existing:
 *   · `setReferees` (agent-application-service.ts) — the moment referees are named, BEFORE the application is saved: the
 *     new referees (while the old promise is still the one shown) AND the referees being replaced (named under the old
 *     promise), in ONE write, so a write that fails saves nothing and leaves an extra exclusion at worst, never a saved or
 *     overwritten referee with no exclusion;
 *   · `pseudonymiseAgentApplications` (the applicant's erasure) — BEFORE the contacts are emptied, so an erasure can never
 *     erase the only copy of a promised referee's number before it was keyed;
 *   · `backfillRefereeKeys` — every existing application, through the ops door (the migration cannot: the pepper lives in
 *     the application, never in SQL). ⛔ It runs after the deploy that applies the migration and BEFORE licence outreach
 *     or the live-send switch opens (both refuse while its record is outstanding), before the cutoff is set, and again
 *     after any rollback to a build without U33r and the redeploy that follows;
 *   · BY HAND, through the same ops door (the re-review's MINOR-4; the third pass): a contact the reader cannot read — or
 *     one with a digit run left over beside the number found — is the census's `unreadable`, and it holds both doors shut
 *     until a person looks at THAT contact (`--referee one|two`) — `key` keys the ONE number they type TWICE on a real
 *     console (read without echo, never printed, read STRICTLY: the whole text one number, no generous guess, and the two
 *     the same number), and `reviewed` records, with ONE code from a fixed list, that it holds no mobile number. Each
 *     needs a screened `--by` and writes ONE COMPLIANCE audit row naming the application, the place and who, never a
 *     number, and handles that contact alone.
 * ⛔ APPEND-ONLY: nothing here, or anywhere, removes a key — a referee named again, or replaced, keeps theirs. The
 * applicant's erasure keeps the keys too: they hold nothing of the applicant, and the promise was made to the referee. A
 * referee asking 50pick to destroy their information has everything else destroyed, but not this coded form of their
 * number — it is what keeps them out of marketing for as long as 50pick sends it (docs/DATA-RETENTION.md).
 * ⚠️ RESIDUALS, WRITTEN DOWN (the re-review's MINOR-5): a referee replaced, or an applicant erased, before U33r's deploy
 * left no number in the live database, so nothing can key them — it may still sit in the backups (kept 90 days), which
 * nothing reads to key it. And when a contact gives no number the strict way, its generous readings may key a number
 * nobody wrote (a digit too many, digits behind a prefix we do not know): that number is then excluded for good — but the
 * contact also counts `unreadable` until a person handles it (the third pass), so nobody is left unlooked-at.
 * ⛔ NO NUMBER IN ANY AUDIT OR LOG: the hand steps' audit rows name the application and the step, and every count this
 * module answers is a count.
 *
 * Guards: `npm run test:marketing-consent` (the referee rows, the writer, the erasure, the backfill, the pepper, the ops
 * door and its hand steps, with their plants) · `npm run test:dal-parity` §28 (the two twins and the migration).
 */

/** ⛔ THE MOMENT THE RE-WORDED /legal/privacy §9 WENT LIVE — the instant version `REFEREE_PROMISE_REWORDED_IN` (Privacy
 *  v2026-10-07: the old promise kept for every referee named before it, "50pick may send you offers by SMS." told to those
 *  named after it — management's answers of 2026-10-07, item 4) was first served, in en, sw and zh. ⭐ `null` TODAY, and
 *  that means EVERY referee is excluded. ⛔ It is set ONLY AFTER production's backfill is recorded
 *  (`REFEREE_KEYS_ON_PRODUCTION`, `outreach-record.ts`) — `test:privacy-notice` §4i refuses it before then, and refuses it
 *  for good while any locale's §9 still makes the promise to EVERY referee (the old, unconditional words) — and then, in
 *  the commit that records the backfill, to that go-live instant (an ISO instant). ⚠️ An applicant may have shown a
 *  referee the OLD notice before that instant and named them after it — set it later than the deploy if that window
 *  matters; a later instant only keeps more referees excluded, never fewer. */
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

/** An e-mail address as it is keyed: trimmed and lower-cased — null when it is not one. */
export function normalRefereeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase();
  if (t.length < 3 || t.length > 254 || !t.includes("@") || t.split("").some((c) => c.trim() === "")) return null;
  return t;
}

/**
 * ⭐ THE KEYED HASH OF ONE E-MAIL ADDRESS (the third pass's MINOR-2) — thirty-two letters a–p, under its OWN domain of the
 * pepper ("marketing-referee-email"), so an address's key can never equal a number's. A promised referee named by e-mail
 * is kept OUT of marketing at whatever number that address later turns up on: the gate refuses an account whose e-mail's
 * key is held (consent.ts, step 2's first question). ⛔ It takes an address and nothing else, and THROWS otherwise.
 */
export function refereeEmailKeyOf(email: string): string {
  const norm = normalRefereeEmail(email);
  if (norm === null) throw new Error("refereeEmailKeyOf: an e-mail key is made only of an e-mail address — refused");
  return pepperedLetters("marketing-referee-email", norm, 32);
}

/** The most digit groups one number is read across ("0 7 1 2 3 4 5 6 7 8", a digit at a time, is ten), and the most
 *  digits one may hold. */
const MAX_GROUPS = 15;
const MAX_DIGITS = 15;
const DIGIT_RUN = /[0-9]+/g;
const LEADING_ZEROS = /^0+/;
/** The characters two digit groups of ONE number are written apart by: a space, a dash, a dot, and the brackets around a
 *  trunk zero ("+255 (0) 712-345-678"). A comma, a slash, a letter — anything else — between two groups means two things,
 *  and they are never joined into a number nobody wrote ("Box 7, 12345678" is not 0712 345 678; the re-review's MINOR-3). */
const NUMBER_PUNCTUATION = /^[ .()-]+$/;
/** A field that IS a phone number and nothing else — the CSV export's leading quote, a plus, digits and that punctuation —
 *  the only field the gate's own parser is asked about whole. */
const PURE_NUMBER = /^['"]?[+]?[0-9 .()-]+$/;

/** The text a contact's numbers are read from: every keyboard's digits made ASCII, every whitespace one space, and every
 *  e-mail address taken out — an address's digits belong to the address, which is followed (`readRefereeContact`), never
 *  read as a number. */
function numberTextOf(contact: string | null | undefined): string {
  const ascii = readAsciiDigits(typeof contact === "string" ? contact : "");
  const spaced = [...ascii].map((c) => (c.trim() === "" ? " " : c)).join("");
  return spaced.replace(EMAIL, " ");
}

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
 *  prefix we do not know: its LAST nine digits, and the nine after its country code or trunk zero. ⛔ Asked ONLY when the
 *  strict readings found nothing in the contact (`refereeNumbersIn`). */
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
 * ⭐ EVERY TANZANIAN MOBILE NUMBER WRITTEN IN A REFEREE CONTACT, as gate keys, sorted — read STRICTLY first, then, only when
 * that finds nothing, GENEROUSLY:
 *   · STRICT — a field that is a phone number and nothing else, as the gate's own parser reads it; and every window of up
 *     to fifteen consecutive digit groups written apart only by number punctuation (a space, a dash, a dot, brackets), so
 *     "0712 345 678", "+255 (0) 712-345-678", two numbers in one field, a number beside a word, a number typed a digit at a
 *     time, and every keyboard's digits all count;
 *   · GENEROUS — ONLY when the strict readings found NOTHING in the contact (the re-review's MINOR-3): each unbroken run of
 *     ten to fifteen digits, and the field's digits taken together, by `lenientKeysOfRun` — a number with a digit too
 *     many ("07123456789" keys 0712 345 678), digits behind a prefix we do not know.
 * ⚠️ It still OVER-reads, in the safe direction: the national part of a foreign number written with spaces ("+254 712 345
 * 678" reads as 0712 345 678), and a generous reading of a contact that held no number the strict way — such a key is a
 * number nobody may have written, excluded for good (the module's residuals). ⛔ What it CANNOT read gives nothing: a number
 * with digits MISSING ("0712 345 67") is nobody's number with any certainty, a landline or a foreign number cannot receive
 * an SMS, digits across a comma or a word are not one number, and an e-mail's digits are the address's —
 * `readRefereeContact` follows the e-mail, and the census counts every contact that led nowhere (`unreadable`).
 */
export function refereeNumbersIn(contact: string | null | undefined): string[] {
  return readNumbers(contact).keys;
}

/** One contact's numbers, and how they were read: `strict` — by the strict readings; `leftover` — a digit run that no
 *  strict reading took as part of a number found (or the number came only from the generous readings). Either way the
 *  numbers are keyed; a leftover makes the contact `unreadable` until a person handles it (the third pass's NIT). */
type NumberReading = { keys: string[]; strict: boolean; leftover: boolean };

function readNumbers(contact: string | null | undefined): NumberReading {
  const text = numberTextOf(contact);
  const found = new Set<string>();
  const runs = [...text.matchAll(DIGIT_RUN)];
  const used = new Set<number>();
  const trimmed = text.trim();
  if (trimmed !== "" && PURE_NUMBER.test(trimmed)) {
    const whole = parseTzNumber(trimmed);
    if (whole.verdict === "ok" && whole.msisdn) {
      found.add(whole.msisdn);
      runs.forEach((_, i) => used.add(i));
    }
  }
  for (let i = 0; i < runs.length; i++) {
    let digits = "";
    for (let j = i; j < runs.length && j < i + MAX_GROUPS; j++) {
      if (j > i) {
        const prev = runs[j - 1];
        const between = text.slice((prev.index ?? 0) + prev[0].length, runs[j].index ?? 0);
        if (!NUMBER_PUNCTUATION.test(between)) break;
      }
      digits += runs[j][0];
      if (digits.length > MAX_DIGITS + 2) break;
      const key = mobileKeyOfDigits(digits);
      if (key !== null) {
        found.add(key);
        for (let u = i; u <= j; u++) used.add(u);
      }
    }
  }
  if (found.size > 0) return { keys: [...found].sort(), strict: true, leftover: runs.some((_, i) => !used.has(i)) };
  for (const run of runs) for (const key of lenientKeysOfRun(run[0])) found.add(key);
  for (const key of lenientKeysOfRun(runs.map((r) => r[0]).join(""))) found.add(key);
  return { keys: [...found].sort(), strict: false, leftover: found.size > 0 };
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
  /** `number` — a number was written in it, and EVERY digit run in it was read strictly as part of a number found ·
   *  `not_mobile` — nine or more digits (outside any e-mail) reading as a landline or a foreign number · `unreadable` —
   *  nine or more digits that gave no number and are neither, WHATEVER else the contact holds (an e-mail beside a broken
   *  number is still a broken number — the re-review's NIT); OR a number found with a digit run LEFT OVER beside it ("0754
   *  123 456 / 0712 345 67": the second number is broken), or a number only the generous readings found — those numbers
   *  are keyed, and a person must still look (the third pass's NIT) · `email_matched` / `email_unmatched` — no digits to
   *  speak of, an e-mail that did / did not lead to a number · `none` — empty, or too few digits to be a number. */
  readonly kind: "number" | "email_matched" | "email_unmatched" | "not_mobile" | "unreadable" | "none";
};

/**
 * ⭐ ONE REFEREE CONTACT, FOLLOWED — the numbers written in it (`refereeNumbersIn`), and for every e-mail address in it the
 * number of every account (`user.findAllByEmail`) and every book row (`marketingContact.msisdnsByEmail`) holding that
 * address, case-insensitive (the U33r review's MINOR-1). Classified by its DIGITS first. Reads only; writes and logs nothing.
 */
export async function readRefereeContact(contact: string | null | undefined): Promise<RefereeContactReading> {
  const text = typeof contact === "string" ? contact : "";
  const reading = readNumbers(text);
  const written = reading.keys;
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
  if (written.length > 0) return { numbers: sorted, kind: reading.strict && !reading.leftover ? "number" : "unreadable" };
  const digitsText = numberTextOf(text);
  if ((digitsText.match(DIGIT_RUN) ?? []).join("").length >= 9) {
    const verdict = parseTzNumber(digitsText).verdict;
    return { numbers: sorted, kind: verdict === "landline" || verdict === "foreign" ? "not_mobile" : "unreadable" };
  }
  if (emails.length > 0) return { numbers: sorted, kind: sorted.length > 0 ? "email_matched" : "email_unmatched" };
  return { numbers: sorted, kind: "none" };
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

/** One set of referees, and when they were named — what the writers hand in. */
export type RefereeNaming = { contacts: ReadonlyArray<string | null | undefined>; namedAt: string };

/**
 * ⭐ THE ONE WRITER — for every naming handed in whose referees were given the old promise (`refereePromiseHolds`), every
 * number their contacts lead to is keyed; namings that were not promised add NOTHING. All the keys go in ONE pass, sorted
 * by key (in calls of at most `REFEREE_KEY_RECORD_MAX`), so the keys of one application never sit together. Answers how
 * many rows were NEW (0 when every key was already held — what makes every caller re-runnable). ⛔ The instants decide and
 * are then forgotten: no row holds one. ⛔ It THROWS when the table cannot be written: `setReferees` then saves nothing, so
 * a referee is never on file without their exclusion. `newWordsLiveAt` is the constant — a parameter only so the suites
 * can drive a set cutoff.
 */
export async function recordRefereeKeysFor(
  namings: ReadonlyArray<RefereeNaming>,
  newWordsLiveAt: string | null = REFEREE_NEW_WORDS_LIVE_AT,
): Promise<number> {
  const keys = new Set<string>();
  for (const naming of namings) {
    if (!refereePromiseHolds(naming.namedAt, newWordsLiveAt)) continue;
    for (const contact of naming.contacts) {
      for (const msisdn of (await readRefereeContact(contact)).numbers) keys.add(refereeKeyOf(msisdn));
      // ⭐ The third pass's MINOR-2 · the address itself, so a referee who signs up with it LATER is still refused.
      for (const email of refereeEmailsIn(contact)) keys.add(refereeEmailKeyOf(email));
    }
  }
  const sorted = [...keys].sort();
  let written = 0;
  for (let i = 0; i < sorted.length; i += REFEREE_KEY_RECORD_MAX) {
    const rows = sorted.slice(i, i + REFEREE_KEY_RECORD_MAX).map((refereeKey): StoredAgentRefereeKey => ({ refereeKey }));
    written += await Promise.resolve(db.agentRefereeKey.record(rows));
  }
  return written;
}

/** ⭐ ONE NAMING — `recordRefereeKeysFor` of a single set of referees. */
export async function recordRefereeKeys(
  input: RefereeNaming,
  newWordsLiveAt: string | null = REFEREE_NEW_WORDS_LIVE_AT,
): Promise<number> {
  return recordRefereeKeysFor([input], newWordsLiveAt);
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

/** ⭐ THE GATE'S E-MAIL READ — is this address a promised referee's? A blank or malformed address answers no, with no read. */
export async function isPromisedRefereeEmail(email: string | null | undefined): Promise<boolean> {
  const norm = normalRefereeEmail(email);
  if (norm === null) return false;
  return Promise.resolve(db.agentRefereeKey.holds(refereeEmailKeyOf(norm)));
}

/** One address's answer in a bulk read — the normalised address and whether its key is held, never the hash. */
export type RefereeEmailHeldEntry = { email: string; held: boolean };

/** ⭐ THE SPLIT'S BULK E-MAIL READ — `isPromisedRefereeEmail` for a chunk's account addresses, ONE keyed read. Answers ONLY
 *  for the addresses the table answered: one missing from the answer falls back to the single read. */
export async function promisedRefereeEmailsAmong(emails: readonly (string | null | undefined)[]): Promise<RefereeEmailHeldEntry[]> {
  const unique = Array.from(new Set(emails.map(normalRefereeEmail).filter((e): e is string => e !== null))).sort();
  if (unique.length === 0) return [];
  const byKey = new Map(unique.map((email) => [refereeEmailKeyOf(email), email] as const));
  const out: RefereeEmailHeldEntry[] = [];
  for (const e of await Promise.resolve(db.agentRefereeKey.heldAmong([...byKey.keys()]))) {
    const email = byKey.get(e.refereeKey);
    if (email !== undefined) out.push({ email, held: e.held });
  }
  return out;
}

/* ══ THE HAND STEPS — a contact the reader cannot read, looked at by a person (the re-review's MINOR-4; the third pass) ══ */

/** A referee's place on the application: `refereeOneContact` or `refereeTwoContact`. A hand step names ONE, and handles
 *  that contact alone (the third pass's MAJOR (b)). */
export type RefereeSlot = "one" | "two";
export const REFEREE_SLOTS: readonly RefereeSlot[] = Object.freeze(["one", "two"]);
const contactOf = (app: Pick<StoredAgentApplication, "refereeOneContact" | "refereeTwoContact">, slot: RefereeSlot): string | null => {
  const c = slot === "one" ? app.refereeOneContact : app.refereeTwoContact;
  return typeof c === "string" && c.trim() !== "" ? c : null;
};
const isSlot = (v: unknown): v is RefereeSlot => v === "one" || v === "two";

/** ⛔ WHY A PERSON FOUND NO MOBILE NUMBER — a FIXED LIST, never free text (the third pass's NIT): a COMPLIANCE row is kept
 *  seven years, and free text is where a name or a number written in words would land. */
export const REFEREE_REVIEW_REASONS = Object.freeze([
  "landline", "foreign_number", "postal_address", "id_number", "date", "incomplete_number", "no_phone",
] as const);
export type RefereeReviewReason = (typeof REFEREE_REVIEW_REASONS)[number];
const isReviewReason = (v: unknown): v is RefereeReviewReason =>
  typeof v === "string" && (REFEREE_REVIEW_REASONS as readonly string[]).includes(v);

/** The two COMPLIANCE audit actions the hand steps write — each names the APPLICATION, the referee's place, the step and
 *  who did it, never a number. */
export const REFEREE_KEY_ADDED_ACTION = "marketing.referee_key_added";
export const REFEREE_CONTACT_REVIEWED_ACTION = "marketing.referee_contact_reviewed";
const HAND_ACTIONS: readonly string[] = [REFEREE_KEY_ADDED_ACTION, REFEREE_CONTACT_REVIEWED_ACTION];
const handledKey = (applicationId: string, slot: RefereeSlot): string => `${applicationId}:${slot}`;

/**
 * ⭐ WHICH CONTACTS A PERSON HAS HANDLED: a hand step's audit row naming the application AND that contact's place
 * (`payload.referee`), written AT OR AFTER the application's referees were last named — a later naming is a new contact,
 * and must be looked at again. ⛔ A step handles the contact it names and NO OTHER (the third pass's MAJOR (b)): one
 * `key` on referee one leaves referee two exactly as it was. ⛔ A read that could not answer in full (more rows than one
 * read takes) handles NOTHING: never a referee let through on a guess.
 */
async function handledContacts(apps: readonly StoredAgentApplication[]): Promise<Set<string>> {
  const handled = new Set<string>();
  if (apps.length === 0) return handled;
  const read = await getAuditForTargetsDurable({
    targetType: "AgentApplication", targetIds: apps.map((a) => a.id), actions: HAND_ACTIONS, sinceIso: REFEREE_NAMED_UNKNOWN, limit: 5000,
  });
  if (read.truncated) return handled;
  const namedAt = new Map(apps.map((a) => [a.id, Date.parse(refereeNamedAtOf(a))] as const));
  for (const e of read.entries) {
    const slot = e.payload?.referee;
    const at = Date.parse(e.createdAt);
    const named = e.targetId === null ? undefined : namedAt.get(e.targetId);
    if (e.targetId !== null && isSlot(slot) && named !== undefined && Number.isFinite(at) && at >= named) handled.add(handledKey(e.targetId, slot));
  }
  return handled;
}

/** A number typed by hand, read STRICTLY: the whole text is a phone number and nothing else, and the gate's own parser
 *  reads it as one Tanzanian mobile number — never the generous readings, never a number found inside other text (the
 *  third pass's MAJOR (a): "07419905511" is refused, not keyed as a stranger's 0741 990 551). */
export function strictTypedNumber(typed: unknown): string | null {
  if (typeof typed !== "string") return null;
  const t = readAsciiDigits(typed).trim();
  if (t === "" || !PURE_NUMBER.test(t)) return null;
  const p = parseTzNumber(t);
  return p.verdict === "ok" && p.msisdn && isRefereeKeyable(p.msisdn) ? p.msisdn : null;
}

export type RefereeHandRefusal =
  | "no_application" | "no_contact" | "not_promised" | "not_a_number" | "mismatch" | "bad_reason" | "bad_by" | "not_recorded";
export type RefereeHandResult = { ok: true; written: number } | { ok: false; why: RefereeHandRefusal };
/** The hand steps' one dependency a suite plants — the audit writer — so a plant can try to put a number in a payload. */
export type RefereeHandDeps = { readonly audit: typeof audit };
const HAND_DEPS: RefereeHandDeps = Object.freeze({ audit });
const refuseHand = (why: RefereeHandRefusal): RefereeHandResult => ({ ok: false, why });

/**
 * ⭐ KEY ONE NUMBER BY HAND — a person read the contact in referee place `referee` and found the referee's mobile number.
 * They type it TWICE (the door reads both without echo and prints neither); each is read STRICTLY (`strictTypedNumber`)
 * and the two must be the SAME number, or nothing is keyed (`mismatch` — a digit swapped in one of them). The application
 * must exist, hold a contact in that place, and be a PROMISED one; `by` is screened as the live-switch door screens it.
 * Then the key is written and ONE audit row names the application, the place and who — ⛔ never the number: not the
 * answer, not the payload, not a log.
 */
export async function keyRefereeNumberByHand(
  i: { applicationId: string; referee: RefereeSlot; typed: string; again: string; by: string },
  deps: RefereeHandDeps = HAND_DEPS,
  newWordsLiveAt: string | null = REFEREE_NEW_WORDS_LIVE_AT,
): Promise<RefereeHandResult> {
  const app = await Promise.resolve(db.agentApplication.findById(i.applicationId));
  if (!app) return refuseHand("no_application");
  if (!isSlot(i.referee) || contactOf(app, i.referee) === null) return refuseHand("no_contact");
  if (!refereePromiseHolds(refereeNamedAtOf(app), newWordsLiveAt)) return refuseHand("not_promised");
  const by = screenOpsText(i.by);
  if (by === null) return refuseHand("bad_by");
  const first = strictTypedNumber(i.typed);
  if (first === null) return refuseHand("not_a_number");
  if (strictTypedNumber(i.again) !== first) return refuseHand("mismatch");
  const written = await Promise.resolve(db.agentRefereeKey.record([{ refereeKey: refereeKeyOf(first) }]));
  const r = await deps.audit({
    category: "COMPLIANCE", action: REFEREE_KEY_ADDED_ACTION, actorId: null, targetType: "AgentApplication", targetId: app.id,
    payload: { via: "ops", referee: i.referee, by },
  });
  return r.recorded ? { ok: true, written } : refuseHand("not_recorded");
}

/** ⭐ RECORD THAT A PERSON LOOKED — the contact in referee place `referee` holds NO mobile number, for one of the fixed
 *  reasons (`REFEREE_REVIEW_REASONS`); `by` screened as the live-switch door screens it. ONE audit row names the
 *  application, the place, the reason code and who. Nothing is keyed. */
export async function recordRefereeContactReviewed(
  i: { applicationId: string; referee: RefereeSlot; reason: string; by: string },
  deps: RefereeHandDeps = HAND_DEPS,
): Promise<RefereeHandResult> {
  const app = await Promise.resolve(db.agentApplication.findById(i.applicationId));
  if (!app) return refuseHand("no_application");
  if (!isSlot(i.referee) || contactOf(app, i.referee) === null) return refuseHand("no_contact");
  if (!isReviewReason(i.reason)) return refuseHand("bad_reason");
  const by = screenOpsText(i.by);
  if (by === null) return refuseHand("bad_by");
  const r = await deps.audit({
    category: "COMPLIANCE", action: REFEREE_CONTACT_REVIEWED_ACTION, actorId: null, targetType: "AgentApplication", targetId: app.id,
    payload: { via: "ops", referee: i.referee, reason: i.reason, by },
  });
  return r.recorded ? { ok: true, written: 0 } : refuseHand("not_recorded");
}

/* ══ THE CENSUS AND THE BACKFILL ═════════════════════════════════════════════════════════════════════════════════════ */

/** What the backfill and the census count — counts only, never a number, a key or an application id. The SAME shape the
 *  code records production's run in (`RefereeKeysRecord`, the fifth licence-outreach check). */
export type RefereeKeyCensus = RefereeKeyCounts;

/** One contact the reader could not read that no person has handled — its application and its place. */
export type UnreadableRefereeContact = { applicationId: string; referee: RefereeSlot };

type OnFile = {
  counts: Omit<RefereeKeyCounts, "numbers" | "emails" | "missing">;
  byApplication: Array<{ app: StoredAgentApplication; numbers: string[]; emails: string[] }>;
  /** Promised applications' contacts the reader could not read that no person has handled yet. */
  unreadable: UnreadableRefereeContact[];
};

/** Every PROMISED application's referee contacts, followed — the shared walk of the census and the backfill. */
async function refereesOnFile(newWordsLiveAt: string | null): Promise<OnFile> {
  const apps = await Promise.resolve(db.agentApplication.list());
  let promised = 0;
  let withContact = 0;
  let notMobile = 0;
  let emailOnlyUnmatched = 0;
  const unreadableAt: Array<{ app: StoredAgentApplication; slot: RefereeSlot }> = [];
  const byApplication: OnFile["byApplication"] = [];
  for (const app of apps) {
    if (!refereePromiseHolds(refereeNamedAtOf(app), newWordsLiveAt)) continue;
    promised++;
    const slots = REFEREE_SLOTS.filter((s) => contactOf(app, s) !== null);
    if (slots.length === 0) continue;
    withContact++;
    const numbers = new Set<string>();
    const emails = new Set<string>();
    for (const slot of slots) {
      const contact = contactOf(app, slot) as string;
      const read = await readRefereeContact(contact);
      for (const n of read.numbers) numbers.add(n);
      for (const e of refereeEmailsIn(contact)) emails.add(e);
      if (read.kind === "unreadable") unreadableAt.push({ app, slot });
      else if (read.kind === "not_mobile") notMobile++;
      else if (read.kind === "email_unmatched") emailOnlyUnmatched++;
    }
    byApplication.push({ app, numbers: [...numbers].sort(), emails: [...emails].sort() });
  }
  // ⭐ MINOR-4 · a person's hand step clears the ONE contact it names — counted as reviewed, never unreadable.
  const handled = await handledContacts([...new Map(unreadableAt.map((x) => [x.app.id, x.app] as const)).values()]);
  let reviewed = 0;
  const unreadable: UnreadableRefereeContact[] = [];
  for (const { app, slot } of unreadableAt) {
    if (handled.has(handledKey(app.id, slot))) reviewed++;
    else unreadable.push({ applicationId: app.id, referee: slot });
  }
  unreadable.sort((a, b) => (a.applicationId < b.applicationId ? -1 : a.applicationId > b.applicationId ? 1 : a.referee < b.referee ? -1 : 1));
  return {
    counts: { applications: apps.length, promised, withContact, unreadable: unreadable.length, reviewed, notMobile, emailOnlyUnmatched },
    byApplication,
    unreadable,
  };
}

/** ⭐ READ-ONLY: how many promised referees' numbers AND e-mail addresses are not yet keyed (`missing` counts both), and
 *  how many contacts led nowhere — the ops door's `status`, and its read-back. */
export async function refereeKeyCensus(newWordsLiveAt: string | null = REFEREE_NEW_WORDS_LIVE_AT): Promise<RefereeKeyCensus> {
  const onFile = await refereesOnFile(newWordsLiveAt);
  const numbers = [...new Set(onFile.byApplication.flatMap((x) => x.numbers))].sort();
  const emails = [...new Set(onFile.byApplication.flatMap((x) => x.emails))].sort();
  let missing = 0;
  for (let i = 0; i < numbers.length; i += 1000) {
    const chunk = numbers.slice(i, i + 1000);
    const answered = new Map((await promisedRefereesAmong(chunk)).map((e) => [e.msisdn, e.held] as const));
    for (const msisdn of chunk) if (answered.get(msisdn) !== true) missing++;
  }
  for (let i = 0; i < emails.length; i += 1000) {
    const chunk = emails.slice(i, i + 1000);
    const answered = new Map((await promisedRefereeEmailsAmong(chunk)).map((e) => [e.email, e.held] as const));
    for (const email of chunk) if (answered.get(normalRefereeEmail(email) ?? email) !== true) missing++;
  }
  return { ...onFile.counts, numbers: numbers.length, emails: emails.length, missing };
}

/** ⭐ READ-ONLY: the CONTACTS the reader could not read that no person has handled — each its application id and its place
 *  — what the ops door's `status` lists, so a person knows where to look. Never a number, a name or a contact. */
export async function unreadableRefereeApplications(newWordsLiveAt: string | null = REFEREE_NEW_WORDS_LIVE_AT): Promise<UnreadableRefereeContact[]> {
  return (await refereesOnFile(newWordsLiveAt)).unreadable;
}

/**
 * ⭐ THE BACKFILL — every promised application's referees keyed (their numbers and their e-mail addresses), in ONE pass
 * sorted by key (`recordRefereeKeysFor`), so no application's keys sit together. Idempotent: a re-run writes nothing new.
 * Answers the census taken AFTER the writes (so `missing` is 0 when it worked) and how many rows were new. Run through the
 * ops door after the migration is applied, before licence outreach or the live switch opens and before the cutoff is set;
 * again after any rollback to a build without U33r and the redeploy that follows, and if the pepper ever rotates.
 */
export async function backfillRefereeKeys(newWordsLiveAt: string | null = REFEREE_NEW_WORDS_LIVE_AT): Promise<RefereeKeyCensus & { written: number }> {
  const onFile = await refereesOnFile(newWordsLiveAt);
  const written = await recordRefereeKeysFor(
    onFile.byApplication.map(({ app }) => ({ contacts: [app.refereeOneContact, app.refereeTwoContact], namedAt: refereeNamedAtOf(app) })),
    newWordsLiveAt,
  );
  return { ...(await refereeKeyCensus(newWordsLiveAt)), written };
}

/* ══ THE OPS DOOR'S REFUSALS — the one rule `scripts/ops/marketing-referee-keys.mts` asks before anything runs ══════ */

/** What the door is run with — its arguments, and the things in its environment it judges. */
export type RefereeKeysDoorInput = {
  /** `process.argv.slice(2)` — the command, then its flags. */
  readonly argv: readonly string[];
  readonly databaseUrl: string | undefined;
  /** Whether `OTP_PEPPER` itself is set — never its value. */
  readonly pepperSet: boolean;
  readonly railwayEnvironment: string | undefined;
  readonly railwayService: string | undefined;
  /** Whether the door's input is a real console (`process.stdin.isTTY === true`) — `key` reads a number from it. */
  readonly stdinIsTerminal: boolean;
};
export type RefereeKeysDoorCommand = "status" | "backfill" | "key" | "reviewed";
export type RefereeKeysDoorRefusal =
  | "usage" | "no_database" | "no_pepper" | "not_production" | "no_application" | "no_referee" | "bad_reason" | "bad_by" | "not_a_terminal";
/** `environment` is where the run happened — "production" ONLY under Railway's production markers, "scratch" for every
 *  other run — and the backfill's RECORD carries it: only a production record can reconcile the fifth check. */
export type RefereeKeysDoorVerdict =
  | {
    readonly ok: true;
    readonly command: RefereeKeysDoorCommand;
    readonly environment: "production" | "scratch";
    readonly applicationId: string | null;
    readonly referee: RefereeSlot | null;
    readonly reason: RefereeReviewReason | null;
    readonly by: string | null;
  }
  | { readonly ok: false; readonly why: RefereeKeysDoorRefusal };

/** The door's words for each refusal — exit 2, nothing read or written. */
export const REFEREE_KEYS_DOOR_SENTENCE: Readonly<Record<RefereeKeysDoorRefusal, string>> = Object.freeze({
  usage: `usage: npm run ops:marketing-referee-keys -- status | backfill [--scratch] | key --application <id> --referee one|two --by "<who>" [--scratch] | reviewed --application <id> --referee one|two --reason ${REFEREE_REVIEW_REASONS.join("|")} --by "<who>" [--scratch]`,
  no_database: "REFUSING: no DATABASE_URL — the keys live in the database. Run it through the runner (see the header).",
  no_pepper: "REFUSING: OTP_PEPPER is not set — keys made under the dev fallback would never match production's. Run it through the runner.",
  not_production:
    "REFUSING: this is not production's own environment (run it through `railway run --service 50pick`), and no --scratch against a loopback database was asked for — keys made under another pepper would protect nobody.",
  no_application: "REFUSING: name the application with --application <id> (an id from `status`, nothing else).",
  no_referee: "REFUSING: name the referee's place with --referee one or --referee two (as `status` lists it) — a step handles that contact alone.",
  bad_reason: `REFUSING: say why with --reason, ONE of: ${REFEREE_REVIEW_REASONS.join(", ")} — never free text.`,
  bad_by: 'REFUSING: say who you are with --by "<who>" — plain words on one line, as the live-switch door takes it.',
  not_a_terminal:
    "REFUSING: `key` reads the number from a console — run it in PowerShell or Windows Terminal: the number must be typed, never piped.",
});

const LOOPBACK_HOSTS: readonly string[] = ["127.0.0.1", "localhost", "::1", "[::1]"];
const APPLICATION_ID = /^[A-Za-z0-9_-]{1,80}$/;

/** The database host, for the loopback check only — never printed. */
function databaseHostOf(url: string | undefined): string {
  try {
    return new URL(url ?? "").hostname;
  } catch {
    return "";
  }
}

/** A flag's value: the word after it, when there is one and it is not another flag. */
function flagValue(argv: readonly string[], flag: string): string | null {
  const at = argv.indexOf(flag);
  const v = at < 0 ? undefined : argv[at + 1];
  return typeof v === "string" && !v.startsWith("--") ? v : null;
}

/**
 * ⛔ THE DOOR'S RULE, PURE (the U33r review's MINOR-4 — pinned by `test:marketing-consent` R10 with its plants):
 *   · a command it knows, or nothing runs;
 *   · a database — a no-database process would key the in-memory store and report success;
 *   · `OTP_PEPPER` itself — outside production `requireSecret` falls back to a dev pepper, and keys made under it would
 *     never match the ones production computes, while the read-back, under the same wrong pepper, said "0 missing";
 *   · a WRITE (`backfill`, `key`, `reviewed`) only in production's own environment as `railway run` injects it, or with
 *     `--scratch` against a LOOPBACK database (the integrator's scratch Postgres). `status` reads only;
 *   · `key` and `reviewed` name ONE application by its id, ONE referee place (`--referee one|two`) and who (`--by`, screened
 *     as the live-switch door screens it); `reviewed` gives ONE reason from the fixed list (the third pass);
 *   · ⛔ `key` runs ONLY on a real console: it reads a number, and a number piped in is a number in a shell history, a
 *     transcript or a file (the third pass's MINOR-1);
 *   · ⛔ `environment` is "production" ONLY under Railway's production markers — a scratch run's RECORD says "scratch",
 *     and the fifth check never takes it (the re-review's MINOR-1).
 */
export function refereeKeysDoorVerdict(i: RefereeKeysDoorInput): RefereeKeysDoorVerdict {
  const command = i.argv[0];
  if (command !== "status" && command !== "backfill" && command !== "key" && command !== "reviewed") return { ok: false, why: "usage" };
  if (typeof i.databaseUrl !== "string" || i.databaseUrl === "") return { ok: false, why: "no_database" };
  if (i.pepperSet !== true) return { ok: false, why: "no_pepper" };
  const viaRailway = i.railwayEnvironment === "production" && i.railwayService === "50pick";
  const environment = viaRailway ? "production" as const : "scratch" as const;
  const none = { applicationId: null, referee: null, reason: null, by: null } as const;
  if (command === "status") return { ok: true, command, environment, ...none };
  const scratch = i.argv.includes("--scratch") && LOOPBACK_HOSTS.includes(databaseHostOf(i.databaseUrl));
  if (!viaRailway && !scratch) return { ok: false, why: "not_production" };
  if (command === "backfill") return { ok: true, command, environment, ...none };
  const applicationId = flagValue(i.argv, "--application");
  if (applicationId === null || !APPLICATION_ID.test(applicationId)) return { ok: false, why: "no_application" };
  const referee = flagValue(i.argv, "--referee");
  if (!isSlot(referee)) return { ok: false, why: "no_referee" };
  const by = screenOpsText(flagValue(i.argv, "--by"));
  if (by === null) return { ok: false, why: "bad_by" };
  if (command === "key") {
    if (i.stdinIsTerminal !== true) return { ok: false, why: "not_a_terminal" };
    return { ok: true, command, environment, applicationId, referee, reason: null, by };
  }
  const reason = flagValue(i.argv, "--reason");
  if (!isReviewReason(reason)) return { ok: false, why: "bad_reason" };
  return { ok: true, command, environment, applicationId, referee, reason, by };
}
