/**
 * U33r · THE AGENT-REFEREE EXCLUSION, WRITTEN — a section of `test:marketing-consent`, beside `licence-basis.mts` (which
 * holds the gate's step 1b row by row). This section holds the WRITERS to the promise /legal/privacy §9 made every agent
 * applicant's referee, "we never contact you for marketing" (Q8; the owner's FINAL rule of 2026-10-07): every place a
 * referee's number exists must key it before it can stop existing, the gate must then refuse it — and, since the U33r
 * review (2026-10-07), the table must hold the key and NOTHING else, and no door to a send may open before the backfill.
 *
 *   R1  the free-text reader: every spelling an applicant types is read as the gate's key, two numbers in one field are
 *       both read, a number typed a digit at a time is read, a digit too many is read the safe way (NIT), and an e-mail,
 *       a landline and a number with digits missing give nothing — and (the re-review's MINOR-3) digits are never joined
 *       across a comma or a word, the generous readings apply only when nothing reads strictly, and the reviewer's
 *       thirteen contacts each give exactly their pinned keys;
 *   R2  the key is the keyed hash — thirty-two letters a–p, one per number whatever its spelling, never a digit — and is
 *       refused for anything but a gate key;
 *   R3  `setReferees` (the REAL service) keys both referees BEFORE it saves: a key write that fails saves nothing, one that
 *       works makes the gate refuse both numbers, an e-mail with no number behind it keys nothing, and every stored row is
 *       exactly its key;
 *   R4  a referee REPLACED by a later save keeps their key — and a referee ON FILE before the exclusion existed is keyed by
 *       the save that replaces them, before their contact is overwritten;
 *   R5  the applicant's ERASURE keys referees never keyed BEFORE it empties the contacts — and (MAJOR-1) the table then holds
 *       those two keys and NOTHING else: no value equal to, or derived from, the naming, the creation or the erasure;
 *   R6  the BACKFILL keys every older application's referees: missing before, 0 after, the gate refuses them, a re-run
 *       writes nothing;
 *   R7  a referee in a real send slice is SKIPPED `agent_referee` before the wire, and no RG COMPLIANCE line is written;
 *   R8  (MAJOR-1) the WRITER decides who was promised: no cutoff — every naming; a cutoff — before it only; an instant that
 *       cannot be read, on either side, keeps the promise;
 *   R9  (MINOR-3) the key is KEYED: one number under two peppers is two keys, and the call is pinned;
 *   R10 (MINOR-4) the ops door's refusals — run as ONE pure rule, and pinned in the door's own order; its hand steps'
 *       arguments, the environment it says it ran in (the re-review's MINOR-1), and what a person types never echoed or
 *       printed (MINOR-4);
 *   R11 (MINOR-1) a referee named by E-MAIL is keyed under the number of every account and book row holding that address;
 *   R12 (MINOR-2) the census COUNTS what the reader could not read, apart from landlines and foreign numbers;
 *   R13 (MAJOR-2) the fifth licence-outreach check, its record and where it binds — and the live switch refuses to open on it;
 *       only a PRODUCTION record reconciles it, it binds on any database not on this machine (the re-review's MINOR-1), and
 *       today's pin follows the record (the re-review's NIT);
 *   R14 (the DATA-RETENTION NIT) a player whose OWN number is held is told so in the access export — a yes, never the key;
 *   R15 (the re-review's MINOR-4) a number keyed BY HAND — one number, a promised application, an audit row with no number;
 *   R16 (the re-review's MINOR-4; the third pass) a contact REVIEWED by hand — a fixed reason code, ONE contact, the census
 *       clears it, and a later naming makes it count again;
 *   R17 (the third pass's MINOR-2) a referee named only by E-MAIL — the address keyed, and refused at whatever number it
 *       later signs up with.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: every red case below plants ONE defect in the impl handed in (a swapped function, a source
 * text changed in memory, a store member stubbed and restored in `finally`) and requires the matching row to turn red.
 * Nothing here writes a file.
 * ⛔ Every number is this section's own (its own block), so a red run never reads a green run's rows, and every store
 * check is scoped to this run's keys.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { db } from "../../src/lib/server/store.ts";
import type { StoredAgentApplication, StoredMarketingContact, StoredUser } from "../../src/lib/server/store.ts";
import { toMsisdn255 } from "../../src/lib/phone-normalize.ts";
import { parseTzNumber, readAsciiDigits } from "../../src/lib/tz-msisdn.ts";
import { mayReceiveMarketingSms, marketingToggleState, DB_GATE_READS } from "../../src/lib/server/marketing/consent.ts";
import type { MarketingGateReads } from "../../src/lib/server/marketing/consent.ts";
import {
  refereeNumbersIn, refereeKeyOf, recordRefereeKeys, backfillRefereeKeys, refereeKeyCensus, refereePromiseHolds,
  readRefereeContact, isPromisedReferee, refereeKeysDoorVerdict, REFEREE_KEYS_DOOR_SENTENCE, REFEREE_NEW_WORDS_LIVE_AT,
  keyRefereeNumberByHand, recordRefereeContactReviewed, unreadableRefereeApplications, REFEREE_KEY_ADDED_ACTION,
  REFEREE_CONTACT_REVIEWED_ACTION, refereeEmailKeyOf, isPromisedRefereeEmail, REFEREE_REVIEW_REASONS,
} from "../../src/lib/server/marketing/referee-exclusion.ts";
import type { RefereeKeysDoorInput, RefereeSlot } from "../../src/lib/server/marketing/referee-exclusion.ts";
import { setReferees, pseudonymiseAgentApplications } from "../../src/lib/server/agent-application-service.ts";
import { dispatchSlice, MARKETING_RG_SUPPRESSED_ACTION } from "../../src/lib/server/marketing/dispatch.ts";
import type { SliceDeps, SliceRecipient, SliceOutcome } from "../../src/lib/server/marketing/dispatch.ts";
import { getAuditForTargetsDurable, audit } from "../../src/lib/server/audit.ts";
import { openMarketingLiveSwitch } from "../../src/lib/server/marketing/live-switch.ts";
import type { LiveSwitchWriteDeps } from "../../src/lib/server/marketing/live-switch.ts";
import { REFEREE_KEYS_ON_PRODUCTION, refereeKeysCheckBinds, refereeKeysNow } from "../../src/lib/server/marketing/outreach-record.ts";
import { refereeKeysState } from "../../src/lib/marketing/outreach-open-checks.ts";
import type { RefereeKeysRecord } from "../../src/lib/marketing/outreach-open-checks.ts";
import { marketingDsarView } from "../../src/lib/server/marketing/dsar.ts";
import { decomment } from "../lib/decomment.mts";
import { ALWAYS_OPEN } from "../lib/send-window.mts";

export type Ok = (label: string, cond: boolean, detail?: string) => void;

const readSource = (rel: string): string => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8").split(String.fromCharCode(13)).join("");

/** The pieces under test. The real ones by default; a red case hands in one that is wrong in one way. */
export type RefereeImpl = {
  readonly numbersIn: typeof refereeNumbersIn;
  readonly setReferees: typeof setReferees;
  readonly pseudonymise: typeof pseudonymiseAgentApplications;
  readonly backfill: typeof backfillRefereeKeys;
  readonly dispatch: (rows: SliceRecipient[], deps: SliceDeps) => Promise<SliceOutcome[]>;
  /** R8 · R11 — the ONE writer (a cutoff may be handed in). */
  readonly record: typeof recordRefereeKeys;
  /** R9 — the key. */
  readonly keyOf: typeof refereeKeyOf;
  /** R9 · R10 — the sources the pins read: the exclusion module and the ops door (and the door as written, comments and all). */
  readonly sources: { readonly exclusion: string; readonly door: string; readonly doorRaw: string };
  /** R10 — the door's rule. */
  readonly doorVerdict: typeof refereeKeysDoorVerdict;
  /** R12 — the census. */
  readonly census: typeof refereeKeyCensus;
  /** R13 — the live switch's opener. */
  readonly openSwitch: typeof openMarketingLiveSwitch;
  /** R14 — the marketing arm of both access exports. */
  readonly dsar: typeof marketingDsarView;
  /** R13 — the fifth check's ONE rule, and where it binds. */
  readonly keysState: typeof refereeKeysState;
  readonly binds: typeof refereeKeysCheckBinds;
  /** R15 · R16 — the two hand steps. */
  readonly keyByHand: typeof keyRefereeNumberByHand;
  readonly reviewByHand: typeof recordRefereeContactReviewed;
  /** R17 — the gate's reads (the account's e-mail asked of the keys). */
  readonly gateReads: MarketingGateReads;
};
export const REAL_REFEREE: RefereeImpl = {
  numbersIn: refereeNumbersIn,
  setReferees,
  pseudonymise: pseudonymiseAgentApplications,
  backfill: backfillRefereeKeys,
  dispatch: (rows, deps) => dispatchSlice(rows, deps),
  record: recordRefereeKeys,
  keyOf: refereeKeyOf,
  sources: {
    exclusion: decomment(readSource("src/lib/server/marketing/referee-exclusion.ts")),
    door: decomment(readSource("scripts/ops/marketing-referee-keys.mts")),
    doorRaw: readSource("scripts/ops/marketing-referee-keys.mts"),
  },
  doorVerdict: refereeKeysDoorVerdict,
  census: refereeKeyCensus,
  openSwitch: openMarketingLiveSwitch,
  dsar: marketingDsarView,
  keysState: refereeKeysState,
  binds: refereeKeysCheckBinds,
  keyByHand: keyRefereeNumberByHand,
  reviewByHand: recordRefereeContactReviewed,
  gateReads: DB_GATE_READS,
};

export const REFEREE_LABELS = {
  r1: "R1 · U33r · the free-text reader reads every spelling an applicant types as the gate's key — '0712 345 678', '+255 712 345 678', '+255 (0) 712-345-678', '00255712345678', '712345678', Arabic-Indic digits and a number typed a digit at a time — reads BOTH numbers of a field holding two, reads a digit too many the safe way ('0712 345 678 9', '07123456789' key 0712 345 678), and reads nothing from an e-mail, a landline or a number with digits missing — and (the re-review's MINOR-3) never joins digits across a comma or a word and reads generously ONLY when nothing reads strictly: the reviewer's thirteen contacts each give exactly their pinned keys ('Box 7, 12345678' none, 'P.O. Box 70123 Arusha 0754123456' only 0754 123 456)",
  r2: "R2 · U33r · the key is the keyed hash — thirty-two letters a–p, the SAME for every spelling of one number, different for another number, never a digit — and anything but a gate key (a '+255…' or a '0712…' spelling) is refused, never hashed",
  r3: "R3 · ⛔ U33r · setReferees KEYS BOTH REFEREES BEFORE IT SAVES — a key write that fails saves nothing; one that works makes the gate refuse both numbers agent_referee; an e-mail with no number behind it keys its ADDRESS and nothing else (the third pass's MINOR-2); and every stored row is exactly its key",
  r4: "R4 · ⛔ U33r · a referee REPLACED by a later save keeps their key — and a referee ON FILE from before the exclusion existed is keyed by the save that replaces them, BEFORE their only contact is overwritten",
  r5: "R5 · ⛔ U33r · MAJOR-1 · the applicant's ERASURE keys referees never keyed before BEFORE it empties the contacts — the contacts end empty, both numbers are refused agent_referee, and the table holds exactly those two keys and NOTHING else: no field beside the key, no digit, no value equal to or derived from refereeConsentAt, createdAt or the erasure moment",
  r6: "R6 · ⭐ U33r · the BACKFILL keys every older application's referees — the census counts them missing before and 0 after (its counts carry the reviewed contacts apart), the gate refuses each, and a re-run writes nothing",
  r7: "R7 · ⛔ U33r · a referee in a real send slice is SKIPPED agent_referee before the wire (the wire never called), and no RG COMPLIANCE line is written for it — the reason never starts rg_",
  r8: "R8 · ⛔ U33r · MAJOR-1 · THE WRITER DECIDES WHO WAS PROMISED — with no new words live (REFEREE_NEW_WORDS_LIVE_AT null) a referee named at ANY instant, even years from now, is keyed; with a cutoff, one named before it is keyed and one named at or after it is NOT; an instant that cannot be read, on either side, keeps the promise",
  r9: `R9 · ⛔ U33r · MINOR-3 · THE KEY IS KEYED — one number hashed under two OTP_PEPPER values gives two different keys (and the same pepper twice the same key), and referee-exclusion.ts makes it with pepperedLetters("marketing-referee", msisdn, 32)`,
  r10: "R10 · ⛔ U33r · MINOR-4 · THE OPS DOOR'S REFUSALS — run as the ONE pure rule: an unknown command, no database and no OTP_PEPPER refuse every command; a write (backfill, key, reviewed) refuses outside production's own environment unless --scratch names a loopback database; key and reviewed name ONE application, ONE referee place and who (--by, screened), reviewed ONE reason from the fixed list (never free text), and key runs ONLY on a real console (the third pass); the verdict says where the door ran — and the door asks that rule BEFORE any census, read or write, exits 2 on it, rewrites the private host first, imports only referee-exclusion.ts, prints no number, reads the number TWICE without echo from a console and never prints either, says in its header how key must be run, and writes where it ran into its STATUS and its RECORD",
  r11: "R11 · ⛔ U33r · MINOR-1 · a referee named only by E-MAIL is keyed under the number of every account and every book row holding that address, case-insensitive — the gate refuses both numbers — and an e-mail that leads nowhere is counted, not keyed",
  r12: "R12 · ⛔ U33r · MINOR-2 · THE CENSUS COUNTS WHAT THE READER COULD NOT READ — a contact of nine or more digits that gave no number is `unreadable` (an e-mail beside it changes nothing), and so is a number found with a digit run LEFT OVER beside it ('0754 123 456 / 0712 345 67' — the third pass's NIT), a landline and a foreign number are `notMobile`, each counted once, never listed, and none counted reviewed until a person handles it",
  r14: "R14 · ⛔ U33r · a player whose OWN number is a promised referee's is TOLD SO in both access doors' marketing section (agentRefereeExclusion: true) — a yes, never the coded form, never who named the number or when — and a player whose number is not held reads false",
  r17: "R17 · ⛔ U33r · the third pass's MINOR-2 · A REFEREE NAMED ONLY BY E-MAIL IS KEPT OUT AT WHATEVER NUMBER THAT ADDRESS TURNS UP ON LATER — the writer keys the address itself (its own keyed hash and nothing else); an account that signs up afterwards with it, in any case, is refused agent_referee at the gate and its switch reads off for good, while an account with another address is not; and the census counts every address and its missing key until the backfill keys it",
  r13: "R13 · ⛔ U33r · MAJOR-2 · THE FIFTH CHECK — only a well-formed PRODUCTION record with nothing missing and nothing unreadable reconciles it (a scratch run's record never does — the re-review's MINOR-1); it binds on NODE_ENV or RAILWAY_ENVIRONMENT_NAME production AND on any DATABASE_URL that is not a loopback host, an unreadable one included (MINOR-1); today's state is exactly what the ONE rule says of the record (null: OUTSTANDING where it binds — the re-review's NIT); and the LIVE SWITCH refuses to open on it (referee_keys) before anything is read, recorded or written",
  r15: "R15 · ⛔ U33r · the third pass's MAJOR · A NUMBER KEYED BY HAND — read STRICTLY (a digit too many, other text or two numbers are refused, never keyed as a stranger's), typed TWICE (a swapped pair of digits in either is a mismatch, nothing keyed), for a promised application's contact in the place named; then the gate refuses it, ONE COMPLIANCE audit row names the application, the place and who — no digit, no key — and THAT contact alone is handled: the other referee on the same application stays unreadable",
  r16: "R16 · ⛔ U33r · the third pass · A CONTACT REVIEWED BY HAND — free text, a name or a numeral as the reason is refused (ONE of the fixed codes only), as is a missing --by, and nothing is written; a listed reason writes ONE COMPLIANCE audit row naming the application, the place, the code and who; the census then counts THAT contact reviewed (the other stays unreadable) — and a LATER naming makes it count unreadable again",
} as const;

/* ══ THE WORLD — this section's own numbers, one block per run ═════════════════════════════════════════════════════ */

let seq = 0;
/** NDC 74 (Vodacom), a block per run, a slot per number: 0 7 4 then seven digits. */
const phoneOf = (run: number, i: number): string => `074${String(1000000 + run * 1000 + i).slice(-7)}`;
const keyOf = (run: number, i: number): string => toMsisdn255(phoneOf(run, i));

function makeUser(id: string, phoneE164: string): StoredUser {
  const now = new Date().toISOString();
  return {
    id, phoneE164,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null,
    dob: "1990-01-01", region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as StoredUser;
}

/** An application in the shape the service writes — DRAFT unless told otherwise, referees as given. */
function application(id: string, userId: string, over: Partial<StoredAgentApplication> = {}): StoredAgentApplication {
  const now = new Date().toISOString();
  return {
    id, userId, status: "DRAFT", source: "SELF_SERVICE",
    refereeOneName: null, refereeOneContact: null, refereeTwoName: null, refereeTwoContact: null, refereeConsentAt: null,
    feeAmountTzs: null, feeAttestedTzs: null, feeFundingSource: null, feeReference: null, feeStatementRef: null,
    feeReconciledAt: null, feeReconciledById: null, feeSourceAccount: null,
    feeWaivedAt: null, feeWaivedById: null, feeWaiverReason: null,
    feeDisposition: "NONE", feeRefundDueAt: null, feeRefundedAt: null, feeRefundedById: null, feeRefundReference: null, feeRefundAmountTzs: null,
    reviewerId: null, reviewedAt: null, rejectReason: null, rejectNote: null, infoRequestNote: null, infoRequestedAt: null,
    approvedRatePct: null, agentCode: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    submittedAt: null, expiresAt: null, createdAt: now, updatedAt: now,
    ...over,
  } as StoredAgentApplication;
}

/** An applicant (an account of their own, outside the referee numbers) with one application. */
async function applicant(run: number, slot: number, over: Partial<StoredAgentApplication> = {}): Promise<{ userId: string; appId: string }> {
  const userId = `rfu${run}-${seq++}`;
  const appId = `rfa${run}-${seq++}`;
  await Promise.resolve(db.user.create(makeUser(userId, `+${keyOf(run, 900 + slot)}`)));
  await Promise.resolve(db.agentApplication.create(application(appId, userId, over)));
  return { userId, appId };
}

/** A contact-book row holding a number and an e-mail — the shape the importer writes. */
function bookRow(id: string, msisdn: string, email: string): StoredMarketingContact {
  const now = new Date().toISOString();
  return {
    id, msisdn, rawInput: `+${msisdn}`, displayName: "Neema", email, ndc: msisdn.slice(3, 5), operator: null,
    source: "OPERATOR", sourceRef: null, userId: null, consentState: "UNKNOWN", suppressedAt: null, tags: [], notes: null,
    importId: null, createdAt: now, createdBy: null, updatedAt: now, updatedBy: null,
  };
}

const said = async (msisdn: string): Promise<string> => {
  const v = await mayReceiveMarketingSms(msisdn);
  return v.ok ? "ALLOWED" : v.skipReason;
};
type GlobalStore = { __50PICK_STORE?: { agentRefereeKeys?: Map<string, unknown> } };
const keyMap = (): Map<string, unknown> | undefined => (globalThis as unknown as GlobalStore).__50PICK_STORE?.agentRefereeKeys;
const storeRows = (): Array<[string, unknown]> => [...(keyMap()?.entries() ?? [])];
/** This run's rows only — a red case never fails another case's row. */
const rowsFor = (keys: readonly string[]): Array<[string, unknown]> => storeRows().filter(([pk]) => keys.includes(pk));
/** A stored row is EXACTLY its key: one field, `refereeKey`, equal to the map's key, thirty-two letters a–p. */
const isBareKeyRow = ([pk, row]: [string, unknown]): boolean =>
  row !== null && typeof row === "object" && JSON.stringify(Object.keys(row as object)) === JSON.stringify(["refereeKey"])
    && (row as { refereeKey?: unknown }).refereeKey === pk && LETTERS_KEY.test(pk);
const DIGIT = /[0-9]/;
/** A contact with a digit missing — nine digits that are no number the reader can key (`unreadable`). */
const digitsMissing = (run: number, i: number): string => { const nat = keyOf(run, i).slice(3); return `0${nat.slice(0, 4)} ${nat.slice(4, 8)}`; };
const NL = String.fromCharCode(10);
const LETTERS_KEY = /^[a-p]{32}$/;
/** Arabic-Indic digits for an ASCII run — what a phone set to Arabic types. */
const arabicIndic = (ascii: string): string => [...ascii].map((c) => (c >= "0" && c <= "9" ? String.fromCharCode(0x0660 + Number(c)) : c)).join("");
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════════════════════════ */

export async function assertRefereeExclusion(impl: RefereeImpl, run: number, tag: string, ok: Ok): Promise<void> {
  const p = (label: string) => `${tag}${label}`;
  const L = REFEREE_LABELS;

  // ── R1 · the reader ──
  {
    const k = keyOf(run, 1);
    const nat = k.slice(3);
    const one = [
      `0${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)}`,
      `+255 ${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)}`,
      `+255 (0) ${nat.slice(0, 3)}-${nat.slice(3, 6)}-${nat.slice(6)}`,
      `00255${nat}`,
      nat,
      arabicIndic(`0${nat}`),
      ["0", ...nat].join(" "),
    ].map((c) => impl.numbersIn(c));
    const k2 = keyOf(run, 2);
    const two = impl.numbersIn(`0${nat} / +${k2}`);
    const tooMany = [impl.numbersIn(`0${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)} 9`), impl.numbersIn(`0${nat}9`)];
    const none = [
      impl.numbersIn("referee@example.com"),
      impl.numbersIn("022 211 2345"),
      impl.numbersIn(`0${nat.slice(0, 7)}`),
      impl.numbersIn(`0${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6, 8)}`),
      impl.numbersIn(""),
      impl.numbersIn(null),
    ];
    // ⛔ The re-review's MINOR-3 · the reviewer's thirteen contacts, each read exactly as pinned: digits are never joined
    // across a comma or a word, and the generous readings apply only when nothing in the contact reads strictly.
    // ⚠️ "+254 712 345 678" keys 0712 345 678 — a residual, stated in the module: the national part of a foreign number
    // written with spaces reads as ours (the safe direction).
    const REVIEWER: Array<[string, string[]]> = [
      ["07123456789", ["255712345678"]],
      ["0712 345 678 9", ["255712345678"]],
      ["Box 7, 12345678", []],
      ["A/C 0123456789012", []],
      ["NIDA 19850101123450000123", []],
      ["TIN 123-456-789", []],
      ["0754 123 456 / 0712 345 67", ["255754123456"]],
      ["+254 712 345 678", ["255712345678"]],
      ["+1 202 555 0143", []],
      ["amina.r@example.com", []],
      ["07123456780754123456", []],
      ["Juma 0712 345 678 born 1985", ["255712345678"]],
      ["P.O. Box 70123 Arusha 0754123456", ["255754123456"]],
    ];
    const reviewerWrong = REVIEWER.filter(([c, want]) => JSON.stringify(impl.numbersIn(c)) !== JSON.stringify(want))
      .map(([c]) => `${c} → ${JSON.stringify(impl.numbersIn(c))}`);
    ok(p(L.r1),
      one.every((x) => x.length === 1 && x[0] === k) && two.length === 2 && two.includes(k) && two.includes(k2)
        && tooMany.every((x) => x.length === 1 && x[0] === k) && none.every((x) => x.length === 0) && reviewerWrong.length === 0,
      `one ${JSON.stringify(one)} · two ${JSON.stringify(two)} · a digit too many ${JSON.stringify(tooMany)} · none ${JSON.stringify(none)} · the reviewer's contacts wrong [${reviewerWrong.join(" | ")}]`);
  }

  // ── R2 · the key ──
  {
    const k = keyOf(run, 3);
    const a = refereeKeyOf(k);
    const b = refereeKeyOf(keyOf(run, 4));
    const spellings = impl.numbersIn(`+255 ${k.slice(3)}`).concat(impl.numbersIn(`0${k.slice(3)}`)).map(refereeKeyOf);
    const refused = [`+${k}`, `0${k.slice(3)}`, "255221234567", ""].map((x) => {
      try { refereeKeyOf(x); return false; } catch { return true; }
    });
    ok(p(L.r2),
      LETTERS_KEY.test(a) && LETTERS_KEY.test(b) && a !== b && !DIGIT.test(a) && spellings.length === 2 && spellings.every((x) => x === a)
        && refused.every(Boolean),
      `key ${a.slice(0, 6)}… · differs ${a !== b} · spellings ${spellings.length} · refused ${refused.join(",")}`);
  }

  // ── R3 · setReferees keys first ──
  {
    const { userId, appId } = await applicant(run, 1);
    const k1 = keyOf(run, 10);
    const k2 = keyOf(run, 11);
    const input = { oneName: "Amina Referee", oneContact: `0${k1.slice(3)}`, twoName: "Baraka Referee", twoContact: `+${k2}`, consent: true };
    // 1 · the key write FAILS: nothing may be saved.
    const keys = db.agentRefereeKey as unknown as { record: (...a: unknown[]) => unknown };
    const realRecord = keys.record;
    keys.record = () => { throw new Error("fixture: the referee keys could not be written"); };
    let failed: unknown;
    try { failed = await safe(() => impl.setReferees(userId, input)); } finally { keys.record = realRecord; }
    const afterFail = await Promise.resolve(db.agentApplication.findById(appId));
    const savedNothing = afterFail !== null && afterFail.refereeOneContact === null && afterFail.refereeTwoContact === null;
    // 2 · the key write works: both numbers refused, and an e-mail referee nobody holds a number for keys nothing.
    const done = await impl.setReferees(userId, input);
    const gate = [await said(k1), await said(k2)];
    const mail = await applicant(run, 2);
    const before = storeRows().length;
    await impl.setReferees(mail.userId, { oneName: "Chausiku Referee", oneContact: `chausiku.r3.${run}@example.com`, twoName: "Daudi Referee", twoContact: `daudi.r3.${run}@example.com`, consent: true });
    const mailKeyed = storeRows().length - before;
    const mailRows = rowsFor([refereeEmailKeyOf(`chausiku.r3.${run}@example.com`), refereeEmailKeyOf(`daudi.r3.${run}@example.com`)]);
    const mine = rowsFor([refereeKeyOf(k1), refereeKeyOf(k2)]);
    const clean = mine.length === 2 && mine.every(isBareKeyRow) && mailRows.length === 2 && mailRows.every(isBareKeyRow);
    ok(p(L.r3),
      (failed === null || (failed as { ok?: boolean }).ok !== true) && savedNothing && done.ok && gate.every((g) => g === "agent_referee") && mailKeyed === 2 && clean,
      `failed write saved nothing ${savedNothing} · then ${JSON.stringify(done)} · gate ${gate.join("/")} · e-mail keyed ${mailKeyed} · rows exactly their key ${clean}`);
  }

  // ── R4 · a replaced referee keeps their key; a referee on file is keyed before it is overwritten ──
  {
    const { userId } = await applicant(run, 3);
    const first = keyOf(run, 20);
    const second = keyOf(run, 21);
    const other = keyOf(run, 22);
    await impl.setReferees(userId, { oneName: "Eliya Referee", oneContact: `+${first}`, twoName: "Faraja Referee", twoContact: `+${other}`, consent: true });
    await impl.setReferees(userId, { oneName: "Gift Referee", oneContact: `+${second}`, twoName: "Faraja Referee", twoContact: `+${other}`, consent: true });
    const gate = [await said(first), await said(second), await said(other)];
    // A referee written straight to the row (an application older than the exclusion, the backfill not yet run): the save
    // that REPLACES them is the last moment their number exists — it must key them before it overwrites the contact.
    const onFile = keyOf(run, 23);
    const kept = keyOf(run, 24);
    const fresh = keyOf(run, 25);
    const older = await applicant(run, 8, {
      refereeOneName: "Hadija Referee", refereeOneContact: `+255 ${onFile.slice(3)}`, refereeTwoName: "Imani Referee",
      refereeTwoContact: `+${kept}`, refereeConsentAt: "2026-09-01T08:00:00.000Z",
    });
    const beforeOnFile = await said(onFile);
    await impl.setReferees(older.userId, { oneName: "Juma Referee", oneContact: `+${fresh}`, twoName: "Imani Referee", twoContact: `+${kept}`, consent: true });
    const afterOnFile = [await said(onFile), await said(fresh), await said(kept)];
    ok(p(L.r4), gate.every((g) => g === "agent_referee") && beforeOnFile !== "agent_referee" && afterOnFile.every((g) => g === "agent_referee"),
      `first ${gate[0]} · second ${gate[1]} · kept ${gate[2]} · on file ${beforeOnFile} → ${afterOnFile.join("/")}`);
  }

  // ── R5 · the erasure keys before it empties — and the table holds the keys and NOTHING else ──
  {
    const r1 = keyOf(run, 30);
    const r2 = keyOf(run, 31);
    const consentAt = "2026-09-08T10:00:00.000Z";
    // An application older than the exclusion: its referees were written straight to the row, never keyed.
    const { userId, appId } = await applicant(run, 4, {
      status: "REJECTED", refereeOneName: "Halima Referee", refereeOneContact: `0${r1.slice(3)}`, refereeTwoName: "Idrisa Referee",
      refereeTwoContact: `+255 ${r2.slice(3)}`, refereeConsentAt: consentAt,
    });
    const createdAt = (await Promise.resolve(db.agentApplication.findById(appId)))?.createdAt ?? "";
    const before = [await said(r1), await said(r2)];
    const erasingFrom = Date.now();
    await impl.pseudonymise(userId);
    const erasingTo = Date.now();
    const row = await Promise.resolve(db.agentApplication.findById(appId));
    const emptied = row !== null && row.refereeOneContact === null && row.refereeTwoContact === null && row.refereeOneName === "Erased";
    const after = [await said(r1), await said(r2)];
    // ⛔ MAJOR-1 · exactly the two keys, each EXACTLY the keyed hash of its number (so derived from the number alone), and
    // nothing in either row equal to — or holding the digits of — the naming, the creation or any instant of the erasure.
    const keys = [refereeKeyOf(r1), refereeKeyOf(r2)];
    const mine = rowsFor(keys);
    const instants: string[] = [consentAt, createdAt];
    for (let ms = erasingFrom; ms <= erasingTo && instants.length < 5_000; ms++) instants.push(new Date(ms).toISOString());
    const marks = instants.flatMap((x) => [x, String(Date.parse(x))]).filter((x) => x !== "" && x !== "NaN");
    const nothingElse = mine.length === 2 && mine.every(isBareKeyRow)
      && mine.every(([pk, v]) => { const s = pk + JSON.stringify(v); return !DIGIT.test(s) && !marks.some((m) => s.includes(m)); })
      && !mine.some(([pk, v]) => JSON.stringify(v).includes(appId) || pk.includes(userId));
    ok(p(L.r5),
      before.every((g) => g !== "agent_referee") && emptied && after.every((g) => g === "agent_referee") && nothingElse,
      `before ${before.join("/")} · emptied ${emptied} · after ${after.join("/")} · rows ${mine.length}, the key and nothing else ${nothingElse} (${marks.length} instants checked)`);
  }

  // ── R6 · the backfill ──
  {
    const r1 = keyOf(run, 40);
    const r2 = keyOf(run, 41);
    const r3 = keyOf(run, 42);
    await applicant(run, 5, { refereeOneName: "Jabari Referee", refereeOneContact: `+${r1}`, refereeTwoName: "Kesi Referee", refereeTwoContact: `0${r2.slice(3)}`, refereeConsentAt: "2026-09-09T08:00:00.000Z" });
    // ⭐ No consent stamp at all — the oldest shape: it is keyed too, named at the application's creation.
    await applicant(run, 6, { status: "EXPIRED", refereeOneName: "Lulu Referee", refereeOneContact: `+255 ${r3.slice(3)}` });
    const census = await refereeKeyCensus();
    const before = [await said(r1), await said(r2), await said(r3)];
    const filled = await impl.backfill();
    const after = [await said(r1), await said(r2), await said(r3)];
    const again = await impl.backfill();
    ok(p(L.r6),
      census.missing >= 3 && before.every((g) => g !== "agent_referee") && filled.missing === 0 && filled.written >= 3
        && after.every((g) => g === "agent_referee") && again.written === 0 && again.missing === 0
        && [census, filled, again].every((c) => Number.isSafeInteger(c.reviewed) && c.reviewed >= 0),
      `missing before ${census.missing} · gate before ${before.join("/")} · written ${filled.written}, missing after ${filled.missing} · gate after ${after.join("/")} · re-run wrote ${again.written}`);
  }

  // ── R7 · the send loop skips a referee, and writes no RG line for it ──
  {
    const ref = keyOf(run, 50);
    const holder = `rfp${run}-${seq++}`;
    await Promise.resolve(db.user.create({ ...makeUser(holder, `+${ref}`), marketingOptIn: true }));
    await recordRefereeKeys({ contacts: [`+${ref}`], namedAt: "2026-09-08T10:00:00.000Z" });
    let wireCalls = 0;
    const out = await impl.dispatch([{ ref: `rf7-${run}`, msisdn: ref, body: "50pick: tangazo." }], {
      send: async () => { wireCalls++; return { results: [], balanceTzs: null }; },
      window: ALWAYS_OPEN,
    });
    const rgRows = (await getAuditForTargetsDurable({
      targetType: "User", targetIds: [holder], actions: [MARKETING_RG_SUPPRESSED_ACTION], sinceIso: "1970-01-01T00:00:00.000Z",
    })).entries;
    const skipped = out[0]?.outcome === "skipped" && (out[0] as { skipReason?: string }).skipReason === "agent_referee";
    ok(p(L.r7), skipped && wireCalls === 0 && rgRows.length === 0,
      `${JSON.stringify(out[0] ?? null)} · wire calls ${wireCalls} · RG lines ${rgRows.length}`);
  }

  // ── R8 · the writer decides who was promised ──
  {
    const CUT = "2026-10-20T00:00:00.000Z";
    const n = (i: number) => keyOf(run, 80 + i);
    const written = [
      await impl.record({ contacts: [`+${n(0)}`], namedAt: "2030-01-01T00:00:00.000Z" }),
      await impl.record({ contacts: [`+${n(1)}`], namedAt: "2026-10-19T23:59:59.999Z" }, CUT),
      await impl.record({ contacts: [`+${n(2)}`], namedAt: CUT }, CUT),
      await impl.record({ contacts: [`+${n(3)}`], namedAt: "2026-11-01T00:00:00.000Z" }, CUT),
      await impl.record({ contacts: [`+${n(4)}`], namedAt: "not an instant" }, CUT),
      await impl.record({ contacts: [`+${n(5)}`], namedAt: "2026-11-01T00:00:00.000Z" }, "not an instant"),
    ];
    const held: boolean[] = [];
    for (let i = 0; i <= 5; i++) held.push(await isPromisedReferee(n(i)));
    const WANT = [true, true, false, false, true, true];
    const rule = [
      refereePromiseHolds("2030-01-01T00:00:00.000Z", null) === true,
      refereePromiseHolds("2026-09-08T10:00:00.000Z", CUT) === true,
      refereePromiseHolds(CUT, CUT) === false,
      refereePromiseHolds("not an instant", CUT) === true,
      refereePromiseHolds("2026-11-01T00:00:00.000Z", "not an instant") === true,
    ];
    ok(p(L.r8), REFEREE_NEW_WORDS_LIVE_AT === null && held.every((h, i) => h === WANT[i]) && rule.every(Boolean),
      `constant ${String(REFEREE_NEW_WORDS_LIVE_AT)} · written ${written.join(",")} · held ${held.join(",")} · rule ${rule.join(",")}`);
  }

  // ── R9 · the key is keyed — two peppers, two keys — and the call is pinned ──
  {
    const k = keyOf(run, 90);
    const saved = process.env.OTP_PEPPER;
    let one = "", oneAgain = "", two = "";
    try {
      process.env.OTP_PEPPER = "frgate-r9-pepper-one-0123456789abcdef";
      one = impl.keyOf(k);
      oneAgain = impl.keyOf(k);
      process.env.OTP_PEPPER = "frgate-r9-pepper-two-0123456789abcdef";
      two = impl.keyOf(k);
    } finally {
      if (saved === undefined) delete process.env.OTP_PEPPER;
      else process.env.OTP_PEPPER = saved;
    }
    const src = impl.sources.exclusion;
    const pinned = src.includes('return pepperedLetters("marketing-referee", msisdn, 32);')
      && src.includes('import { pepperedLetters } from "@/lib/server/crypto";') && !/createHash|createHmac/.test(src);
    ok(p(L.r9), LETTERS_KEY.test(one) && LETTERS_KEY.test(two) && one === oneAgain && one !== two && pinned,
      `one ${one.slice(0, 6)}… · again ${one === oneAgain} · two ${two.slice(0, 6)}… · differ ${one !== two} · pinned ${pinned}`);
  }

  // ── R10 · the ops door's refusals: the ONE rule, run — and the door's own order ──
  {
    const base: RefereeKeysDoorInput = {
      argv: ["backfill"], databaseUrl: "postgresql://u:p@db.example.net:5432/k", pepperSet: true,
      railwayEnvironment: undefined, railwayService: undefined, stdinIsTerminal: true,
    };
    const v = (over: Partial<RefereeKeysDoorInput>) => impl.doorVerdict({ ...base, ...over });
    // ⭐ The verdict's answer, and WHERE it says the door ran (the re-review's MINOR-1).
    const why = (over: Partial<RefereeKeysDoorInput>): string => { const r = v(over); return r.ok ? `ok:${r.command}@${r.environment}` : r.why; };
    const PROD = { railwayEnvironment: "production", railwayService: "50pick" } as const;
    const LOOP = "postgresql://u:p@127.0.0.1:5461/k";
    const APP = `app_r10-${run}`;
    const BY = ["--by", "Claude for Ali"];
    const K1 = ["key", "--application", APP, "--referee", "one", ...BY];
    const RV = (reason: string) => ["reviewed", "--application", APP, "--referee", "two", "--reason", reason, ...BY];
    const cases: Array<[string, Partial<RefereeKeysDoorInput>, string]> = [
      ["no command", { argv: [] }, "usage"],
      ["an unknown command", { argv: ["erase"] }, "usage"],
      ["status with no database", { argv: ["status"], databaseUrl: undefined }, "no_database"],
      ["backfill with a blank database", { databaseUrl: "" }, "no_database"],
      ["status with no pepper", { argv: ["status"], pepperSet: false }, "no_pepper"],
      ["backfill with no pepper, even in production", { pepperSet: false, ...PROD }, "no_pepper"],
      ["status, database and pepper — a scratch run", { argv: ["status"] }, "ok:status@scratch"],
      ["status in production's environment", { argv: ["status"], ...PROD }, "ok:status@production"],
      ["status on a pipe — it reads no number", { argv: ["status"], stdinIsTerminal: false }, "ok:status@scratch"],
      ["backfill outside production", {}, "not_production"],
      ["backfill in production's environment", { ...PROD }, "ok:backfill@production"],
      ["backfill in production, another service", { railwayEnvironment: "production", railwayService: "worker" }, "not_production"],
      ["backfill in another environment", { railwayEnvironment: "staging", railwayService: "50pick" }, "not_production"],
      ["--scratch on 127.0.0.1 — a scratch run", { argv: ["backfill", "--scratch"], databaseUrl: LOOP }, "ok:backfill@scratch"],
      ["--scratch on localhost — a scratch run", { argv: ["backfill", "--scratch"], databaseUrl: "postgresql://u:p@localhost:5461/k" }, "ok:backfill@scratch"],
      ["--scratch on a remote host", { argv: ["backfill", "--scratch"], databaseUrl: "postgresql://u:p@db.example.net:5432/k" }, "not_production"],
      ["a loopback database WITHOUT --scratch", { databaseUrl: LOOP }, "not_production"],
      ["key in production, on a console", { argv: K1, ...PROD }, "ok:key@production"],
      ["key --scratch on a loopback database", { argv: [...K1, "--scratch"], databaseUrl: LOOP }, "ok:key@scratch"],
      ["key outside production", { argv: K1 }, "not_production"],
      ["key with no application", { argv: ["key", "--referee", "one", ...BY], ...PROD }, "no_application"],
      ["key with a flag where the id goes", { argv: ["key", "--application", "--scratch", "--referee", "one", ...BY], databaseUrl: LOOP }, "no_application"],
      ["key with an id that is not one", { argv: ["key", "--application", "app r10;1", "--referee", "one", ...BY], ...PROD }, "no_application"],
      ["key with no referee place", { argv: ["key", "--application", APP, ...BY], ...PROD }, "no_referee"],
      ["key with a place that is not one or two", { argv: ["key", "--application", APP, "--referee", "three", ...BY], ...PROD }, "no_referee"],
      ["key with no --by", { argv: ["key", "--application", APP, "--referee", "one"], ...PROD }, "bad_by"],
      ["⛔ key on a PIPE — a number piped in sits in a history, a transcript or a file", { argv: K1, ...PROD, stdinIsTerminal: false }, "not_a_terminal"],
      ["reviewed with a listed reason", { argv: RV("landline"), ...PROD }, "ok:reviewed@production"],
      ["reviewed on a pipe — it reads no number", { argv: RV("postal_address"), ...PROD, stdinIsTerminal: false }, "ok:reviewed@production"],
      ["⛔ reviewed with FREE TEXT as the reason", { argv: RV("a landline written twice"), ...PROD }, "bad_reason"],
      ["reviewed with a name as the reason", { argv: RV("Juma"), ...PROD }, "bad_reason"],
      ["reviewed with no reason", { argv: ["reviewed", "--application", APP, "--referee", "two", ...BY], ...PROD }, "bad_reason"],
      ["reviewed with no application", { argv: ["reviewed", "--referee", "two", "--reason", "landline", ...BY], ...PROD }, "no_application"],
      ["reviewed with no --by", { argv: ["reviewed", "--application", APP, "--referee", "two", "--reason", "landline"], ...PROD }, "bad_by"],
      ["reviewed outside production", { argv: RV("landline") }, "not_production"],
    ];
    const wrong = cases.filter(([, over, want]) => why(over) !== want).map(([name, over]) => `${name} → ${why(over)}`);
    // The hand steps carry exactly the id, the place, the listed reason and the screened `by` — nothing else.
    const carried = v({ argv: ["reviewed", "--application", APP, "--referee", "two", "--reason", "landline", "--by", "  Claude for Ali  "], ...PROD });
    const carriedRight = carried.ok && carried.applicationId === APP && carried.referee === "two" && carried.reason === "landline" && carried.by === "Claude for Ali";
    const sentences = (["usage", "no_database", "no_pepper", "not_production", "no_application", "no_referee", "bad_reason", "bad_by", "not_a_terminal"] as const)
      .every((w) => (REFEREE_KEYS_DOOR_SENTENCE[w] ?? "").length > 20)
      && REFEREE_KEYS_DOOR_SENTENCE.not_a_terminal.includes("run it in PowerShell or Windows Terminal")
      && REFEREE_KEYS_DOOR_SENTENCE.not_a_terminal.includes("the number must be typed, never piped");
    const door = impl.sources.door;
    const imports = Array.from(door.matchAll(/^import [^;]*from "([^"]+)";/gm)).map((m) => m[1]);
    const onlyExclusion = imports.length === 2 && imports.every((x) => x === "../../src/lib/server/marketing/referee-exclusion.ts");
    const noWriter = !/db[.]|prisma|agentRefereeKey|PrismaClient|createHmac|pepperedLetters/.test(door);
    const verdictAt = door.indexOf("const verdict = refereeKeysDoorVerdict({");
    const refusal = door.indexOf("if (!verdict.ok) {");
    const exit2 = refusal >= 0 && door.slice(refusal, refusal + 160).includes("return 2;");
    const mainAt0 = door.indexOf("async function main(");
    // Every read, write and prompt main makes — the first must come after the refusal.
    const firstRead = Math.min(...["await refereeKeyCensus(", "await backfillRefereeKeys(", "await readQuietly(", "await keyRefereeNumberByHand(", "await recordRefereeContactReviewed("]
      .map((x) => { const i = mainAt0 < 0 ? -1 : door.indexOf(x, mainAt0); return i < 0 ? Infinity : i; }));
    const envRead = door.includes("databaseUrl: process.env.DATABASE_URL,")
      && door.includes('pepperSet: typeof process.env.OTP_PEPPER === "string" && process.env.OTP_PEPPER !== "",')
      && door.includes("railwayEnvironment: process.env.RAILWAY_ENVIRONMENT_NAME,") && door.includes("railwayService: process.env.RAILWAY_SERVICE_NAME,")
      && door.includes("argv: process.argv.slice(2),") && door.includes("stdinIsTerminal: process.stdin.isTTY === true,");
    const proxyAt = door.indexOf('.replace(/@postgres[.]railway[.]internal(:[0-9]+)?/, "@turntable.proxy.rlwy.net:40357")');
    const mainAt = door.indexOf("async function main(");
    const quiet = !/console[.]log[(][^;]*(msisdn|refereeKey|email|userId|[.]id[^a-z])/.test(door);
    const ordered = verdictAt > 0 && refusal > verdictAt && exit2 && firstRead > refusal && firstRead < Infinity && proxyAt > 0 && proxyAt < mainAt;
    // ⛔ MINOR-4 · the third pass · what a person types — TWICE — is read without echo from a real console, and reaches the
    // writer alone: main names each once more (handed to keyRefereeNumberByHand), the door writes nothing to a stream but
    // the prompt and a line end, no console call ever names them, and the reader refuses anything but a console.
    const mainBody = mainAt < 0 ? "" : door.slice(mainAt);
    const typedOnlyToWriter = mainBody.includes("const typed = await readQuietly(") && mainBody.includes("const again = await readQuietly(")
      && mainBody.includes("typed, again, by: verdict.by")
      && (mainBody.match(/[^A-Za-z]typed[^A-Za-z]/g) ?? []).length === 2;
    const streamWrites = Array.from(door.matchAll(/[.]write[(]([^)]*)[)]/g)).map((m) => m[1]);
    const noEcho = door.includes("stdin.setRawMode(true);") && streamWrites.length > 0 && streamWrites.every((w) => w === "prompt" || w === "NL");
    const neverLogged = !/console[.][a-z]+[(][^;]*([$][{]|[(,] *)(typed|again|chunk|ch)[^A-Za-z]/.test(door);
    const pipeRefused = door.includes("if (stdin.isTTY !== true) throw new Error(");
    const headerSays = impl.sources.doorRaw.includes("⛔ `key`: run it in PowerShell or Windows Terminal — the number must be typed, never piped.");
    // ⛔ MINOR-1 · the STATUS line and the RECORD say where the door ran.
    const saysWhere = door.includes("STATUS (${verdict.environment})") && door.includes("JSON.stringify({ environment: verdict.environment, ranAt,");
    ok(p(L.r10), wrong.length === 0 && carriedRight && sentences && onlyExclusion && noWriter && envRead && ordered && quiet
      && typedOnlyToWriter && noEcho && neverLogged && pipeRefused && headerSays && saysWhere,
      `rule wrong [${wrong.join(" · ")}] · carried ${carriedRight} · sentences ${sentences} · imports [${imports.join(", ")}] · no writer ${noWriter} · env read ${envRead} · verdict@${verdictAt} refusal@${refusal} exit2 ${exit2} first read@${firstRead} · proxy@${proxyAt} main@${mainAt} · quiet ${quiet} · typed only to the writer ${typedOnlyToWriter} · no echo ${noEcho} (${streamWrites.join(",")}) · never logged ${neverLogged} · a pipe refused ${pipeRefused} · header ${headerSays} · says where ${saysWhere}`);
  }

  // ── R11 · a referee named by e-mail ──
  {
    const viaAccount = keyOf(run, 60);
    const viaBook = keyOf(run, 61);
    const address = `neema.r11.${run}@example.com`;
    await Promise.resolve(db.user.create({ ...makeUser(`rfe${run}-${seq++}`, `+${viaAccount}`), email: address } as StoredUser));
    await Promise.resolve(db.marketingContact.create(bookRow(`rfc${run}-${seq++}`, viaBook, address.toUpperCase())));
    const before = [await said(viaAccount), await said(viaBook)];
    const wrote = await impl.record({ contacts: [`Neema R11 <Neema.R11.${run}@Example.com>`], namedAt: "2026-09-08T10:00:00.000Z" });
    const after = [await said(viaAccount), await said(viaBook)];
    const nowhere = await readRefereeContact(`nobody.r11.${run}@example.com`);
    const followed = await readRefereeContact(address);
    ok(p(L.r11),
      before.every((g) => g !== "agent_referee") && wrote === 3 && after.every((g) => g === "agent_referee")
        && nowhere.kind === "email_unmatched" && nowhere.numbers.length === 0
        && followed.kind === "email_matched" && followed.numbers.length === 2,
      `before ${before.join("/")} · written ${wrote} · after ${after.join("/")} · nowhere ${nowhere.kind}/${nowhere.numbers.length} · followed ${followed.kind}/${followed.numbers.length}`);
  }

  // ── R12 · the census counts what the reader could not read ──
  {
    const c0 = await impl.census();
    const nat = keyOf(run, 70).slice(3);
    const missingDigit = `0${nat.slice(0, 4)} ${nat.slice(4, 8)}`;
    await applicant(run, 9, { refereeOneName: "Kassim Referee", refereeOneContact: missingDigit, refereeTwoName: "Latifa Referee", refereeTwoContact: "022 211 5811", refereeConsentAt: "2026-09-08T10:00:00.000Z" });
    await applicant(run, 10, { refereeOneName: "Mosi Referee", refereeOneContact: "+1 202 555 0143", refereeConsentAt: "2026-09-08T10:00:00.000Z" });
    const c1 = await impl.census();
    const kinds = [
      (await readRefereeContact(missingDigit)).kind, (await readRefereeContact("022 211 5811")).kind, (await readRefereeContact("+1 202 555 0143")).kind,
      // The re-review's NIT · classified by its DIGITS first: an e-mail beside a broken number is still a broken number.
      (await readRefereeContact(`amina.r12.${run}@example.com ${missingDigit}`)).kind,
      // The third pass's NIT · a number found with a broken one beside it: keyed, and still unreadable for a person.
      (await readRefereeContact("0754 123 456 / 0712 345 67")).kind,
      (await readRefereeContact("0754 123 456")).kind,
    ];
    const leftoverKeyed = JSON.stringify((await readRefereeContact("0754 123 456 / 0712 345 67")).numbers) === JSON.stringify(["255754123456"]);
    ok(p(L.r12),
      c1.unreadable - c0.unreadable === 1 && c1.notMobile - c0.notMobile === 2 && c1.applications - c0.applications === 2
        && Number.isSafeInteger(c1.reviewed) && c1.reviewed - c0.reviewed === 0
        && JSON.stringify(kinds) === JSON.stringify(["unreadable", "not_mobile", "not_mobile", "unreadable", "unreadable", "number"]) && leftoverKeyed,
      `unreadable ${c0.unreadable} → ${c1.unreadable} · landline or foreign ${c0.notMobile} → ${c1.notMobile} · reviewed ${c0.reviewed} → ${c1.reviewed} · kinds ${kinds.join(",")}`);
  }

  // ── R13 · the fifth check, and the live switch refusing on it ──
  {
    const good: RefereeKeysRecord = {
      environment: "production",
      ranAt: "2026-10-08T09:00:00.000Z",
      status: { applications: 12, promised: 12, withContact: 11, numbers: 20, emails: 2, missing: 22, unreadable: 0, reviewed: 1, notMobile: 1, emailOnlyUnmatched: 0 },
      backfill: { applications: 12, promised: 12, withContact: 11, numbers: 20, emails: 2, missing: 0, unreadable: 0, reviewed: 1, notMobile: 1, emailOnlyUnmatched: 0, written: 22 },
    };
    const S = impl.keysState;
    const states = [
      S(null) === "outstanding",
      S(good) === "reconciled",
      // ⛔ MINOR-1 · a scratch rehearsal's RECORD, pasted in, never reconciles production — nor one that says nowhere.
      S({ ...good, environment: "scratch" }) === "outstanding",
      S({ ...good, environment: undefined } as unknown as RefereeKeysRecord) === "outstanding",
      S({ ...good, backfill: { ...good.backfill, missing: 1 } }) === "outstanding",
      S({ ...good, backfill: { ...good.backfill, unreadable: 1 } }) === "outstanding",
      S({ ...good, backfill: { ...good.backfill, numbers: -1 } }) === "outstanding",
      S({ ...good, backfill: { ...good.backfill, reviewed: -1 } }) === "outstanding",
      S({ ...good, ranAt: "yesterday" }) === "outstanding",
    ];
    // ⛔ MINOR-1 · it binds on production's markers AND on any database that is not on this machine — never on a guess.
    const bindsCases: Array<[Readonly<Record<string, string | undefined>>, boolean]> = [
      [{ NODE_ENV: "production" }, true],
      [{ RAILWAY_ENVIRONMENT_NAME: "production" }, true],
      [{ NODE_ENV: "development" }, false],
      [{}, false],
      [{ NODE_ENV: "development", DATABASE_URL: "postgresql://u:p@db.example.net:5432/k" }, true],
      [{ DATABASE_URL: "postgresql://u:p@turntable.proxy.rlwy.net:40357/railway" }, true],
      [{ NODE_ENV: "development", DATABASE_URL: "postgresql://u:p@127.0.0.1:5461/k" }, false],
      [{ DATABASE_URL: "postgresql://u:p@localhost:5461/k" }, false],
      [{ DATABASE_URL: "postgresql://u:p@[::1]:5461/k" }, false],
      [{ DATABASE_URL: "not a url" }, true],
      [{ DATABASE_URL: "   " }, false],
    ];
    const bindsWrong = bindsCases.filter(([env, want]) => impl.binds(env) !== want).map(([env, want]) => `${JSON.stringify(env)} want ${want}`);
    const binds = bindsWrong.length === 0;
    // ⛔ The re-review's NIT · CONDITIONAL ON THE RECORD: today null, so OUTSTANDING where it binds; once production's RECORD
    // is copied in, exactly what the ONE rule says of it — recording it never loosens this row.
    const rec = REFEREE_KEYS_ON_PRODUCTION;
    const recNow = refereeKeysState(rec);
    const today = (rec === null ? recNow === "outstanding" : rec.environment === "production")
      && refereeKeysNow({ NODE_ENV: "production" }) === recNow && refereeKeysNow({ RAILWAY_ENVIRONMENT_NAME: "production" }) === recNow
      && refereeKeysNow({ DATABASE_URL: "postgresql://u:p@db.example.net:5432/k" }) === recNow && refereeKeysNow({}) === "reconciled";
    // The live switch, driven with stand-ins that count every touch.
    const calls = { load: 0, write: 0, audit: 0 };
    const stub = (hasDb: boolean, keys?: "reconciled" | "outstanding"): LiveSwitchWriteDeps => ({
      load: async () => { calls.load++; return { ok: true as const, value: null }; },
      create: async () => { calls.write++; return "created" as const; },
      replace: async () => { calls.write++; return true; },
      take: async () => ({ ok: true as const, deleted: null }),
      takeBack: async () => true,
      audit: async () => { calls.audit++; return { recorded: true }; },
      now: () => Date.parse("2026-10-08T09:00:00.000Z"),
      hasDatabase: () => hasDb,
      sleep: async () => undefined,
      ...(keys === undefined ? {} : { refereeKeys: () => keys }),
    });
    const input = { actorId: `usr_r13_${run}`, via: "card" as const, forMs: 2 * 3_600_000 };
    const refusedOn = await impl.openSwitch(input, stub(true, "outstanding"));
    const untouched = calls.load === 0 && calls.write === 0 && calls.audit === 0;
    const passedOn = await impl.openSwitch(input, stub(false, "reconciled"));
    // ⛔ A stand-in with NO referee member asks the real check: where it binds, today, that is outstanding — never a pass.
    const savedEnv = process.env.RAILWAY_ENVIRONMENT_NAME;
    let unnamed: Awaited<ReturnType<typeof openMarketingLiveSwitch>> | null = null;
    try {
      process.env.RAILWAY_ENVIRONMENT_NAME = "production";
      unnamed = await impl.openSwitch(input, stub(false));
    } finally {
      if (savedEnv === undefined) delete process.env.RAILWAY_ENVIRONMENT_NAME;
      else process.env.RAILWAY_ENVIRONMENT_NAME = savedEnv;
    }
    const switchRight = !refusedOn.ok && refusedOn.reason === "referee_keys" && untouched
      && !passedOn.ok && passedOn.reason === "no_database"
      && unnamed !== null && !unnamed.ok && unnamed.reason === (recNow === "outstanding" ? "referee_keys" : "no_database");
    ok(p(L.r13), states.every(Boolean) && binds && today && switchRight,
      `states ${states.join(",")} · binds ${binds} [${bindsWrong.join(" | ")}] · record ${rec === null ? "null" : "set"} → ${recNow} · today ${today} · switch ${refusedOn.ok ? "OPEN" : refusedOn.reason} (touched ${JSON.stringify(calls)}) · reconciled ${passedOn.ok ? "OPEN" : passedOn.reason} · no member ${unnamed === null ? "?" : unnamed.ok ? "OPEN" : unnamed.reason}`);
  }

  // ── R14 · the access export tells a player their own number is held — a yes, never the key ──
  {
    const own = keyOf(run, 95);
    const plain = keyOf(run, 96);
    const holder = makeUser(`rfd${run}-${seq++}`, `+${own}`);
    const other = makeUser(`rfd${run}-${seq++}`, `+${plain}`);
    await Promise.resolve(db.user.create(holder));
    await Promise.resolve(db.user.create(other));
    await recordRefereeKeys({ contacts: [`+${own}`], namedAt: "2026-09-08T10:00:00.000Z" });
    const told = await impl.dsar(holder);
    const notHeld = await impl.dsar(other);
    const file = JSON.stringify(told);
    const noKey = !file.includes(refereeKeyOf(own)) && !/[a-p]{32}/.test(file);
    ok(p(L.r14), told.agentRefereeExclusion === true && notHeld.agentRefereeExclusion === false && noKey,
      `held ${String(told.agentRefereeExclusion)} · not held ${String(notHeld.agentRefereeExclusion)} · no coded form in the file ${noKey}`);
  }

  // ── R15 · a number keyed BY HAND — strict, typed twice, ONE contact, an audit row with no number ──
  {
    const target = keyOf(run, 100);
    const nat = target.slice(3);
    const BY = "Claude for Ali";
    // An application with BOTH contacts unreadable: a step on referee one must leave referee two exactly as it was.
    const { appId } = await applicant(run, 11, {
      status: "REJECTED", refereeOneName: "Nuru Referee", refereeOneContact: digitsMissing(run, 101),
      refereeTwoName: "Rehema Referee", refereeTwoContact: digitsMissing(run, 104), refereeConsentAt: "2026-09-08T10:00:00.000Z",
    });
    const solo = await applicant(run, 13, {
      status: "REJECTED", refereeOneName: "Pendo Referee", refereeOneContact: digitsMissing(run, 105), refereeConsentAt: "2026-09-08T10:00:00.000Z",
    });
    const c0 = await impl.census();
    const listed = async (): Promise<string> =>
      (await unreadableRefereeApplications()).filter((x) => x.applicationId === appId).map((x) => x.referee).join(",");
    const listedBefore = await listed();
    const gateBefore = await said(target);
    const spaced = `0${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)}`;
    // ⛔ The reviewer's cases (the third pass's MAJOR (a)): a digit too many, and a pair of digits swapped.
    const extraDigit = `0${nat}${nat.slice(-1)}`;
    // Two neighbouring digits swapped (the third and fourth: "1" and the run's own block digit, always different) — a
    // valid number, and never another fixture's (every fixture reads 074 1…).
    const swapped = `0${nat.slice(0, 2)}${nat[3]}${nat[2]}${nat.slice(4)}`;
    const swappedKey = `255${swapped.slice(1)}`;
    const lastNine = `255${extraDigit.slice(-9)}`;
    const strangers = [swappedKey, lastNine].filter((k) => k !== target && /^255[67][0-9]{8}$/.test(k));
    type KeyInput = { applicationId: string; referee: RefereeSlot; typed: string; again: string; by: string };
    const ask = (over: Partial<KeyInput>, cut?: string) =>
      impl.keyByHand({ applicationId: appId, referee: "one", typed: spaced, again: spaced, by: BY, ...over }, undefined, cut);
    const refusals = [
      await ask({ applicationId: `rfa-none-${run}` }),
      await ask({ applicationId: solo.appId, referee: "two" }),
      await ask({ typed: extraDigit, again: extraDigit }),
      await ask({ typed: `${spaced} x`, again: `${spaced} x` }),
      await ask({ typed: `+${target} / 0${keyOf(run, 102).slice(3)}`, again: `+${target} / 0${keyOf(run, 102).slice(3)}` }),
      await ask({ typed: spaced, again: swapped }),
      await ask({ typed: swapped, again: spaced }),
      await ask({ by: "" }),
      // Named after a cutoff: never promised, so nothing is keyed by hand either.
      await ask({}, "2026-09-01T00:00:00.000Z"),
    ].map((r) => (r.ok ? "ok" : r.why));
    const gateAfterRefusals = await said(target);
    // The same number twice, in two spellings: keyed.
    const keyed = await ask({ typed: `+255 ${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)}`, again: spaced });
    const gateAfter = await said(target);
    const strangerGates = [];
    for (const k of strangers) strangerGates.push(await said(k));
    const strangersClear = strangers.length >= 1 && strangerGates.every((g) => g !== "agent_referee");
    const rows = (await getAuditForTargetsDurable({
      targetType: "AgentApplication", targetIds: [appId], actions: [REFEREE_KEY_ADDED_ACTION, REFEREE_CONTACT_REVIEWED_ACTION],
      sinceIso: "1970-01-01T00:00:00.000Z",
    })).entries;
    const payloads = rows.map((r) => JSON.stringify(r.payload ?? null));
    const clean = rows.length === 1 && rows[0].action === REFEREE_KEY_ADDED_ACTION && rows[0].category === "COMPLIANCE" && rows[0].targetId === appId
      && JSON.stringify(rows[0].payload) === JSON.stringify({ via: "ops", referee: "one", by: BY })
      && payloads.every((s) => !DIGIT.test(s) && !/[a-p]{32}/.test(s)) && !DIGIT.test(JSON.stringify(keyed).replace(/"written":[0-9]+/, ""));
    const c1 = await impl.census();
    const listedAfter = await listed();
    const WANT = ["no_application", "no_contact", "not_a_number", "not_a_number", "not_a_number", "mismatch", "mismatch", "bad_by", "not_promised"];
    ok(p(L.r15),
      gateBefore !== "agent_referee" && JSON.stringify(refusals) === JSON.stringify(WANT) && gateAfterRefusals !== "agent_referee"
        && keyed.ok && keyed.written === 1 && gateAfter === "agent_referee" && strangersClear && clean
        && listedBefore === "one,two" && listedAfter === "two" && c1.unreadable - c0.unreadable === -1 && c1.reviewed - c0.reviewed === 1,
      `gate ${gateBefore} → ${gateAfterRefusals} → ${gateAfter} · refusals ${refusals.join(",")} · keyed ${JSON.stringify(keyed)} · strangers ${strangerGates.join("/")} · audit ${rows.length} row(s) ${payloads.join(" ")} · listed ${listedBefore} → ${listedAfter} · unreadable ${c0.unreadable} → ${c1.unreadable} · reviewed ${c0.reviewed} → ${c1.reviewed}`);
  }

  // ── R16 · a contact REVIEWED by hand — a listed reason, ONE contact; the census clears it; a later naming re-opens it ──
  {
    const BY = "Claude for Ali";
    const { appId } = await applicant(run, 12, {
      status: "REJECTED", refereeOneName: "Omari Referee", refereeOneContact: digitsMissing(run, 110),
      refereeTwoName: "Sabra Referee", refereeTwoContact: digitsMissing(run, 111), refereeConsentAt: "2026-09-08T10:00:00.000Z",
    });
    const c0 = await impl.census();
    const listed = async (): Promise<string> =>
      (await unreadableRefereeApplications()).filter((x) => x.applicationId === appId).map((x) => x.referee).join(",");
    const auditRows = async () => (await getAuditForTargetsDurable({
      targetType: "AgentApplication", targetIds: [appId], actions: [REFEREE_CONTACT_REVIEWED_ACTION, REFEREE_KEY_ADDED_ACTION],
      sinceIso: "1970-01-01T00:00:00.000Z",
    })).entries;
    const refusals = [
      await impl.reviewByHand({ applicationId: appId, referee: "one", reason: "a postal address, no phone", by: BY }),
      await impl.reviewByHand({ applicationId: appId, referee: "one", reason: "Juma", by: BY }),
      await impl.reviewByHand({ applicationId: appId, referee: "one", reason: "the box 7", by: BY }),
      await impl.reviewByHand({ applicationId: `rfa-none-${run}`, referee: "one", reason: "postal_address", by: BY }),
      await impl.reviewByHand({ applicationId: appId, referee: "one", reason: "postal_address", by: "" }),
    ].map((r) => (r.ok ? "ok" : r.why));
    const rowsAfterRefusals = (await auditRows()).length;
    const done = await impl.reviewByHand({ applicationId: appId, referee: "one", reason: "postal_address", by: BY });
    const rows = await auditRows();
    const recorded = rows.length === 1 && rows[0].action === REFEREE_CONTACT_REVIEWED_ACTION && rows[0].category === "COMPLIANCE"
      && rows[0].targetId === appId && JSON.stringify(rows[0].payload) === JSON.stringify({ via: "ops", referee: "one", reason: "postal_address", by: BY });
    const c1 = await impl.census();
    const listed1 = await listed();
    // A LATER naming is a new contact: the review no longer covers it.
    await Promise.resolve(db.agentApplication.update(appId, { refereeConsentAt: new Date(Date.now() + 60_000).toISOString() }));
    const c2 = await impl.census();
    const listed2 = await listed();
    const WANT = ["bad_reason", "bad_reason", "bad_reason", "no_application", "bad_by"];
    ok(p(L.r16),
      JSON.stringify(refusals) === JSON.stringify(WANT) && rowsAfterRefusals === 0 && done.ok && done.written === 0 && recorded
        && c1.unreadable - c0.unreadable === -1 && c1.reviewed - c0.reviewed === 1 && listed1 === "two"
        && c2.unreadable - c0.unreadable === 0 && c2.reviewed - c0.reviewed === 0 && listed2 === "one,two",
      `refusals ${refusals.join(",")} · rows after them ${rowsAfterRefusals} · done ${JSON.stringify(done)} · recorded ${recorded} · unreadable ${c0.unreadable} → ${c1.unreadable} → ${c2.unreadable} · reviewed ${c0.reviewed} → ${c1.reviewed} → ${c2.reviewed} · listed ${listed1} → ${listed2}`);
  }

  // ── R17 · a referee named only by E-MAIL is kept out at whatever number that address turns up on LATER ──
  {
    const address = `zawadi.r17.${run}@example.com`;
    const later = keyOf(run, 120);
    const stranger = keyOf(run, 121);
    // Named by e-mail, while no account and no book row holds the address: only the address can be keyed.
    const wrote = await impl.record({ contacts: [`Zawadi <${address}>`], namedAt: "2026-09-08T10:00:00.000Z" });
    const emailKey = refereeEmailKeyOf(address);
    const mine = rowsFor([emailKey]);
    const keyOnly = mine.length === 1 && mine.every(isBareKeyRow) && !JSON.stringify(mine).includes("@") && !JSON.stringify(mine).includes("zawadi")
      && emailKey !== refereeKeyOf(later);
    // The referee signs up LATER, with that address spelled another way; a stranger signs up with another address.
    const holder = { ...makeUser(`rfz${run}-${seq++}`, `+${later}`), email: `  ${address.toUpperCase()}  `, marketingOptIn: true } as StoredUser;
    const other = { ...makeUser(`rfz${run}-${seq++}`, `+${stranger}`), email: `someone.else.r17.${run}@example.com`, marketingOptIn: true } as StoredUser;
    await Promise.resolve(db.user.create(holder));
    await Promise.resolve(db.user.create(other));
    const gateOf = async (m: string): Promise<string> => { const g = await mayReceiveMarketingSms(m, new Date(), impl.gateReads); return g.ok ? "ALLOWED" : g.skipReason; };
    const heldGate = await gateOf(later);
    const otherGate = await gateOf(stranger);
    const sw = await marketingToggleState(holder);
    // ⭐ The census counts addresses and their missing keys; the backfill keys an older application's address.
    const olderAddress = `baraka.r17.${run}@example.com`;
    await applicant(run, 14, { refereeOneName: "Baraka Referee", refereeOneContact: olderAddress, refereeConsentAt: "2026-09-08T10:00:00.000Z" });
    const cA = await impl.census();
    await impl.backfill();
    const cB = await impl.census();
    const counted = cA.emails >= 2 && cA.missing >= 1 && cB.missing === 0 && cB.emails === cA.emails && (await isPromisedRefereeEmail(olderAddress));
    ok(p(L.r17),
      wrote === 1 && keyOnly && heldGate === "agent_referee" && otherGate !== "agent_referee" && sw.referee === true && sw.on === false && counted,
      `written ${wrote} · the key and nothing else ${keyOnly} · the referee's later account ${heldGate} · a stranger ${otherGate} · switch ${JSON.stringify({ on: sw.on, referee: sw.referee })} · addresses ${cA.emails}, missing ${cA.missing} → ${cB.missing}`);
  }
}

/* ══ THE RED CASES ══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** The key a defect plants without the pepper — an UNKEYED hash, as letters a–p. */
const unkeyedLetters = (msisdn: string): string =>
  [...createHash("sha256").update(`marketing-referee:v1:${msisdn}`, "utf8").digest("hex").slice(0, 32)].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join("");

/** Each case: a pieces set wrong in ONE way, and the row it must turn red. */
export function refereeCases(): { name: string; impl: RefereeImpl; expect: string }[] {
  const REAL = REAL_REFEREE;
  return [
    {
      name: "the reader takes the WHOLE field only, as the gate's parser does — a contact holding two numbers keys neither",
      impl: {
        ...REAL,
        numbersIn: (c) => {
          const whole = parseTzNumber(readAsciiDigits(typeof c === "string" ? c : ""));
          return whole.verdict === "ok" && whole.msisdn ? [whole.msisdn] : [];
        },
      },
      expect: REFEREE_LABELS.r1,
    },
    {
      name: "⛔ MINOR-3 · the reader joins digits across a comma or a word — 'Box 7, 12345678' keys 0712 345 678, a number nobody wrote",
      impl: { ...REAL, numbersIn: (c) => refereeNumbersIn(readAsciiDigits(typeof c === "string" ? c : "").replace(/[^0-9+]+/g, " ")) },
      expect: REFEREE_LABELS.r1,
    },
    {
      name: "⛔ MINOR-3 · the generous readings asked even when a strict reading found the number — 'P.O. Box 70123 Arusha 0754123456' keys 0701 230 754 too",
      impl: {
        ...REAL,
        numbersIn: (c) => {
          const strict = refereeNumbersIn(c);
          const joined = (readAsciiDigits(typeof c === "string" ? c : "").match(/[0-9]+/g) ?? []).join("");
          const rest = joined.replace(/^0+/, "");
          const extra = joined.length >= 10 && joined.length <= 15 ? [joined.slice(-9), rest.slice(0, 9)] : [];
          return [...new Set([...strict, ...extra.filter((n) => /^[67][0-9]{8}$/.test(n)).map((n) => `255${n}`)])].sort();
        },
      },
      expect: REFEREE_LABELS.r1,
    },
    {
      name: "⛔ a key write that fails is SWALLOWED — the referees saved with no exclusion",
      impl: {
        ...REAL,
        setReferees: async (userId, input) => {
          const keys = db.agentRefereeKey as unknown as { record: (...a: unknown[]) => unknown };
          const real = keys.record;
          keys.record = () => 0;
          try { return await setReferees(userId, input); } finally { keys.record = real; }
        },
      },
      expect: REFEREE_LABELS.r3,
    },
    {
      name: "⛔ the save does not key the referees ON FILE — a referee named before the exclusion is overwritten unkeyed",
      impl: {
        ...REAL,
        setReferees: async (userId, input) => {
          for (const a of await Promise.resolve(db.agentApplication.listByUser(userId))) {
            await Promise.resolve(db.agentApplication.update(a.id, { refereeOneContact: null, refereeTwoContact: null }));
          }
          return setReferees(userId, input);
        },
      },
      expect: REFEREE_LABELS.r4,
    },
    {
      name: "⛔ the erasure EMPTIES the contacts first — the only copy of a never-keyed referee's number is gone before it is keyed",
      impl: {
        ...REAL,
        pseudonymise: async (userId) => {
          for (const a of await Promise.resolve(db.agentApplication.listByUser(userId))) {
            await Promise.resolve(db.agentApplication.update(a.id, { refereeOneContact: null, refereeTwoContact: null }));
          }
          return pseudonymiseAgentApplications(userId);
        },
      },
      expect: REFEREE_LABELS.r5,
    },
    {
      name: "⛔ MAJOR-1 · the naming instant KEPT beside the key — an applicant's refereeConsentAt joins the referee back to them",
      impl: {
        ...REAL,
        pseudonymise: async (userId) => {
          const map = keyMap();
          for (const a of await Promise.resolve(db.agentApplication.listByUser(userId))) {
            for (const n of [...refereeNumbersIn(a.refereeOneContact), ...refereeNumbersIn(a.refereeTwoContact)]) {
              const refereeKey = refereeKeyOf(n);
              map?.set(refereeKey, { refereeKey, namedAt: a.refereeConsentAt ?? a.createdAt });
            }
          }
          return pseudonymiseAgentApplications(userId);
        },
      },
      expect: REFEREE_LABELS.r5,
    },
    {
      name: "the backfill keys only the FIRST referee of each application",
      impl: {
        ...REAL,
        backfill: async () => {
          let written = 0;
          for (const a of await Promise.resolve(db.agentApplication.list())) {
            written += await recordRefereeKeys({ contacts: [a.refereeOneContact], namedAt: a.refereeConsentAt ?? a.createdAt });
          }
          return { ...(await refereeKeyCensus()), written };
        },
      },
      expect: REFEREE_LABELS.r6,
    },
    {
      name: "⛔ an RG line written for a referee — the COMPLIANCE feed would name the account a protected player",
      impl: {
        ...REAL,
        dispatch: (rows, deps) => dispatchSlice(rows, {
          ...deps,
          rgAudit: async (v) => {
            if (!v.ok && v.userId === undefined) {
              const holder = await Promise.resolve(db.user.findByPhone(`+${rows[0]?.msisdn ?? ""}`));
              if (holder) await audit({ category: "COMPLIANCE", action: MARKETING_RG_SUPPRESSED_ACTION, actorId: null, targetType: "User", targetId: holder.id, payload: { reason: v.skipReason } });
            }
          },
        }),
      },
      expect: REFEREE_LABELS.r7,
    },
    {
      name: "⛔ MAJOR-1 · the writer GUESSES a cutoff — the final rule's day — so a referee named after it is never keyed though no new words are live",
      impl: { ...REAL, record: (input, cut = null) => recordRefereeKeys(input, cut ?? "2026-10-07T00:00:00.000Z") },
      expect: REFEREE_LABELS.r8,
    },
    {
      name: "⛔ MINOR-3 · the key made WITHOUT the pepper — an unkeyed hash every number can be looked up in",
      impl: { ...REAL, keyOf: unkeyedLetters },
      expect: REFEREE_LABELS.r9,
    },
    {
      name: "⛔ MINOR-3 · the source's keyed call swapped for an unkeyed hash",
      impl: {
        ...REAL,
        sources: {
          ...REAL.sources,
          exclusion: REAL.sources.exclusion.split('return pepperedLetters("marketing-referee", msisdn, 32);').join('return createHash("sha256").update(msisdn).digest("hex");'),
        },
      },
      expect: REFEREE_LABELS.r9,
    },
    {
      name: "⛔ MINOR-4 · the door's rule lets a backfill through outside production",
      impl: {
        ...REAL,
        doorVerdict: (i) => {
          const v = refereeKeysDoorVerdict(i);
          return !v.ok && v.why === "not_production" ? { ok: true, command: "backfill" } : v;
        },
      },
      expect: REFEREE_LABELS.r10,
    },
    {
      name: "⛔ MINOR-4 · the door's rule no longer asks for OTP_PEPPER itself",
      impl: { ...REAL, doorVerdict: (i) => refereeKeysDoorVerdict({ ...i, pepperSet: true }) },
      expect: REFEREE_LABELS.r10,
    },
    {
      name: "⛔ MINOR-4 · the door no longer stops on a refusal — the census runs before the rule is heeded",
      impl: { ...REAL, sources: { ...REAL.sources, door: REAL.sources.door.split("if (!verdict.ok) {").join("if (false) {") } },
      expect: REFEREE_LABELS.r10,
    },
    {
      name: "⛔ the re-review's MINOR-1 · the door's rule calls every run production — a --scratch rehearsal's RECORD would reconcile production",
      impl: { ...REAL, doorVerdict: (i) => { const v = refereeKeysDoorVerdict(i); return v.ok ? { ...v, environment: "production" } : v; } },
      expect: REFEREE_LABELS.r10,
    },
    {
      name: "⛔ the re-review's MINOR-1 · the RECORD line leaves out where the door ran",
      impl: { ...REAL, sources: { ...REAL.sources, door: REAL.sources.door.split("JSON.stringify({ environment: verdict.environment, ranAt,").join("JSON.stringify({ ranAt,") } },
      expect: REFEREE_LABELS.r10,
    },
    {
      name: "⛔ the re-review's MINOR-4 · the door prints what the person typed",
      impl: {
        ...REAL,
        sources: {
          ...REAL.sources,
          door: REAL.sources.door.split("    return sayHand(await keyRefereeNumberByHand(").join("    console.log(typed);" + NL + "    return sayHand(await keyRefereeNumberByHand("),
        },
      },
      expect: REFEREE_LABELS.r10,
    },
    {
      name: "⛔ the re-review's MINOR-4 · the door echoes each key as it is typed",
      impl: { ...REAL, sources: { ...REAL.sources, door: REAL.sources.door.split("typed += ch;").join("typed += ch; process.stderr.write(ch);") } },
      expect: REFEREE_LABELS.r10,
    },
    {
      name: "⛔ the third pass · the door's rule takes free text as the reason (whatever is typed is read as a listed code)",
      impl: {
        ...REAL,
        doorVerdict: (i) => {
          const at = i.argv.indexOf("--reason");
          return refereeKeysDoorVerdict({ ...i, argv: at < 0 ? i.argv : i.argv.map((a, k) => (k === at + 1 ? REFEREE_REVIEW_REASONS[0] : a)) });
        },
      },
      expect: REFEREE_LABELS.r10,
    },
    {
      name: "⛔ the third pass's MINOR-1 · the door's rule lets key run on a pipe — the number comes from a history or a file",
      impl: { ...REAL, doorVerdict: (i) => refereeKeysDoorVerdict({ ...i, stdinIsTerminal: true }) },
      expect: REFEREE_LABELS.r10,
    },
    {
      name: "⛔ the third pass's MINOR-1 · the door's reader reads a pipe instead of refusing it",
      impl: { ...REAL, sources: { ...REAL.sources, door: REAL.sources.door.split("if (stdin.isTTY !== true) throw new Error(").join("if (false) throw new Error(") } },
      expect: REFEREE_LABELS.r10,
    },
    {
      name: "⛔ the third pass's MAJOR · the door asks for the number once — nothing to catch a swapped digit",
      impl: { ...REAL, sources: { ...REAL.sources, door: REAL.sources.door.split("const again = await readQuietly(").join("const again = typed; void (") } },
      expect: REFEREE_LABELS.r10,
    },
    {
      name: "⛔ MINOR-1 · the writer does not follow an e-mail — a referee named by e-mail is keyed under nothing",
      impl: {
        ...REAL,
        record: async (input, cut = REFEREE_NEW_WORDS_LIVE_AT) => {
          if (!refereePromiseHolds(input.namedAt, cut)) return 0;
          const keys = [...new Set(input.contacts.flatMap((c) => refereeNumbersIn(c)))].map(refereeKeyOf);
          return keys.length === 0 ? 0 : Promise.resolve(db.agentRefereeKey.record(keys.map((refereeKey) => ({ refereeKey }))));
        },
      },
      expect: REFEREE_LABELS.r11,
    },
    {
      name: "⛔ MINOR-2 · the census never counts what the reader could not read — '0 not yet keyed' while a referee is unreadable",
      impl: { ...REAL, census: async (cut) => ({ ...(await refereeKeyCensus(cut)), unreadable: 0 }) },
      expect: REFEREE_LABELS.r12,
    },
    {
      name: "⛔ the access export says nothing of a player's own number being held — the person whose number it is is never told",
      impl: { ...REAL, dsar: async (u) => ({ ...(await marketingDsarView(u)), agentRefereeExclusion: false }) },
      expect: REFEREE_LABELS.r14,
    },
    {
      name: "⛔ the re-review's MINOR-1 · the fifth check takes ANY well-formed record — a scratch rehearsal's RECORD, pasted in, reconciles production",
      impl: { ...REAL, keysState: (r) => refereeKeysState(r === null ? r : { ...r, environment: "production" }) },
      expect: REFEREE_LABELS.r13,
    },
    {
      name: "⛔ the re-review's MINOR-1 · the check binds only on production's markers — a dev process on production's database reads it done",
      impl: { ...REAL, binds: (env = process.env) => env.NODE_ENV === "production" || env.RAILWAY_ENVIRONMENT_NAME === "production" },
      expect: REFEREE_LABELS.r13,
    },
    {
      name: "⛔ the re-review's MINOR-4 · the hand step writes what was typed into its audit row — the number lands in the audit log",
      impl: {
        ...REAL,
        keyByHand: (i, _deps, cut) => keyRefereeNumberByHand(i, { audit: (e) => audit({ ...e, payload: { ...(e.payload ?? {}), typed: i.typed } }) }, cut),
      },
      expect: REFEREE_LABELS.r15,
    },
    {
      name: "⛔ the third pass · the review takes FREE TEXT as the reason — a name or a number in words lands in a seven-year row",
      impl: {
        ...REAL,
        reviewByHand: async (i, deps = { audit }) => {
          const app = await Promise.resolve(db.agentApplication.findById(i.applicationId));
          if (!app) return { ok: false, why: "no_application" };
          const reason = typeof i.reason === "string" ? i.reason.trim() : "";
          if (reason.length < 3) return { ok: false, why: "bad_reason" };
          if (typeof i.by !== "string" || i.by.trim() === "") return { ok: false, why: "bad_by" };
          const r = await deps.audit({
            category: "COMPLIANCE", action: REFEREE_CONTACT_REVIEWED_ACTION, actorId: null, targetType: "AgentApplication", targetId: app.id,
            payload: { via: "ops", referee: i.referee, reason, by: i.by.trim() },
          });
          return r.recorded ? { ok: true, written: 0 } : { ok: false, why: "not_recorded" };
        },
      },
      expect: REFEREE_LABELS.r16,
    },
    {
      name: "⛔ the third pass's MAJOR (a) · key reads GENEROUSLY — a digit too many is keyed as a stranger's number",
      impl: {
        ...REAL,
        keyByHand: (i, deps, cut) => {
          const loose = (s: string): string => { const n = refereeNumbersIn(s); return n.length === 1 ? `+${n[0]}` : s; };
          return keyRefereeNumberByHand({ ...i, typed: loose(i.typed), again: loose(i.again) }, deps, cut);
        },
      },
      expect: REFEREE_LABELS.r15,
    },
    {
      name: "⛔ the third pass's MAJOR (a) · key never compares the second typing — a swapped pair of digits is keyed",
      impl: { ...REAL, keyByHand: (i, deps, cut) => keyRefereeNumberByHand({ ...i, again: i.typed }, deps, cut) },
      expect: REFEREE_LABELS.r15,
    },
    {
      name: "⛔ the third pass's MAJOR (b) · one step handles EVERY contact on the application — the other referee is cleared unread",
      impl: {
        ...REAL,
        keyByHand: async (i, deps, cut) => {
          const r = await keyRefereeNumberByHand(i, deps, cut);
          if (r.ok) {
            await audit({
              category: "COMPLIANCE", action: REFEREE_KEY_ADDED_ACTION, actorId: null, targetType: "AgentApplication", targetId: i.applicationId,
              payload: { via: "ops", referee: i.referee === "one" ? "two" : "one", by: i.by },
            });
          }
          return r;
        },
      },
      expect: REFEREE_LABELS.r15,
    },
    {
      name: "⛔ the third pass's MINOR-2 · the writer does not key an e-mail address — a referee who signs up with it later is reached",
      impl: {
        ...REAL,
        record: (input, cut) => recordRefereeKeys({ ...input, contacts: input.contacts.map((c) => (typeof c === "string" ? c.replace(/[^ <>]+@[^ <>]+/g, " ") : c)) }, cut),
      },
      expect: REFEREE_LABELS.r17,
    },
    {
      name: "⛔ the third pass's MINOR-2 · the gate never asks the account's e-mail — the referee's later account is reached",
      impl: { ...REAL, gateReads: { ...DB_GATE_READS, refereeEmailHeld: () => false } },
      expect: REFEREE_LABELS.r17,
    },
    {
      name: "⛔ the re-review's MINOR-4 · the census never counts a review — a contact a person handled still holds both doors shut",
      impl: { ...REAL, census: async (cut) => { const c = await refereeKeyCensus(cut); return { ...c, unreadable: c.unreadable + c.reviewed, reviewed: 0 }; } },
      expect: REFEREE_LABELS.r16,
    },
    {
      name: "⛔ the re-review's MINOR-4 · a review outlives a later naming — referees named after a person looked are never looked at",
      impl: {
        ...REAL,
        census: async (cut) => {
          // Every application read as named at the epoch — so any hand step, however old, reads as after its naming.
          const apps = db.agentApplication as unknown as { list: (...a: unknown[]) => unknown };
          const real = apps.list;
          const epoch = (xs: StoredAgentApplication[]) => xs.map((x) => ({ ...x, refereeConsentAt: null, createdAt: "1970-01-01T00:00:00.000Z" }));
          apps.list = (...a: unknown[]) => {
            const rows = real.apply(db.agentApplication, a) as StoredAgentApplication[] | Promise<StoredAgentApplication[]>;
            return Array.isArray(rows) ? epoch(rows) : rows.then(epoch);
          };
          try { return await refereeKeyCensus(cut); } finally { apps.list = real; }
        },
      },
      expect: REFEREE_LABELS.r16,
    },
    {
      name: "⛔ MAJOR-2 · the live switch opens without asking the referee check",
      // ⛔ Through the REAL impl's reference, never a call of the writer by name: this module is a suite's, and the
      // writer's callers are pinned by test:marketing-settings S7.
      impl: { ...REAL, openSwitch: (i, deps) => REAL.openSwitch(i, deps === undefined ? deps : { ...deps, refereeKeys: () => "reconciled" }) },
      expect: REFEREE_LABELS.r13,
    },
  ];
}
