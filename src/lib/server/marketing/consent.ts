import { db } from "@/lib/server/store";
import type {
  BookStanding, MessagingKey, MessagingLocale, StoredKyc, StoredMessagingConsent, StoredSuppression, StoredUser,
  SuppressionReason,
} from "@/lib/server/store";
// U33a-G · the licence-outreach record this gate asks before any licence basis. ⛔ The TYPE and the reader come from the
// record's own module — the gate never restates what "open" means.
import { licenceOutreach, type LicenceOutreach } from "@/lib/server/marketing/outreach-record";
import { appendMarketingConsent } from "@/lib/server/marketing/consent-ledger";
import { mirrorContactCache } from "@/lib/server/marketing/contact-cache";
import { toMsisdn255 } from "@/lib/phone-normalize";
import { parseTzNumber } from "@/lib/tz-msisdn";
import { marketingRgStanding, MARKETING_RG_DEPS } from "@/lib/server/marketing/rg";
import type { MarketingRgStanding } from "@/lib/server/marketing/rg";
import { ageOnPlatformDate, MIN_AGE_YEARS } from "@/lib/id-documents";
import { isFinalRefusal } from "@/lib/kyc-refusal";
import { isSmsConsentWording } from "@/lib/marketing/consent-wording";
// U33w · an import attestation is recognised against the SAVED wording history (S14), never against today's code
// default — a row made under last month's words is still the attestation it was.
import { isImportAttestationSaved } from "@/lib/server/marketing/wordings";
// U33r · the agent-referee exclusion: the keyed read. ⛔ The gate never hashes a number or reads the table itself —
// `reads.refereeHeld` does, so the split can hand in a chunk's answers — and it never asks WHEN a referee was named: only
// a promised referee is ever keyed (the writer decides, `referee-exclusion.ts`), so a key held is the whole answer.
import { isPromisedReferee, isRefereeKeyable } from "@/lib/server/marketing/referee-exclusion";
import { withLock } from "@/lib/server/locks";

/**
 * U7 · THE ONE GATE. Nothing sends a marketing SMS without asking this first.
 *
 * ⭐ ITS ORDER IS THE LAW'S ORDER, NOT A CONVENIENCE (§5.6, OD11): suppression → consent →
 * self-exclusion → cooling-off → harm markers, then account status. Suppression is asked BEFORE
 * consent: somebody who said stop has said stop, and a stale consent row must never out-argue that
 * — which is exactly what happens if the two are swapped, because a withdrawn person usually still
 * has the consent row they gave you last year.
 * ⚠️ Corrected at U10 (2026-09-25): this docblock said "ordered exactly as §5.6" while the code
 * asked self-exclusion BEFORE consent. The outcome is a refusal either way; the difference is COST —
 * harm markers read up to 10,000 transactions, and asking them before consent would scan every
 * non-consenting player on the platform, which on day one is nearly everyone.
 *
 * ⛔ A CONTACT-BOOK ROW CAN NEVER OVERRIDE A PLAYER'S OWN "NO". When the number belongs to a
 * `User`, that user governs and the ledger is not consulted for permission. An imported spreadsheet
 * cannot re-permit somebody who turned the toggle off (OD10). (Since D3 the ledger is read for a
 * player too — but only as a SECOND condition the toggle must also meet, never as a grant.)
 *
 * Since S7 it also decides AGE (U11: under 18 or unknown refuses; a contact is `age_unknown` until U33
 * records an 18+ attestation) and the published under-25 promise (U12).
 * ⭐ AGE IS THE DATE OF BIRTH THE PLAYER GAVE AT SIGN-UP (with the 18+ attestation), CROSS-CHECKED
 * AGAINST THE IDENTITY CHECK WHEN ONE EXISTS (D5, 2026-09-26): a FINAL KYC refusal refuses (UNDERAGE →
 * `age_minor`; SANCTIONED / DUPLICATE_IDENTITY → `account_status`), and a document date of birth on the
 * KYC row makes the gate use the YOUNGER of the two ages. A re-opened case is marketable again.
 * ⚠️ WHAT THIS GATE DOES **NOT** YET DECIDE, so nobody reads a false completeness into it: the frequency
 * cap (U14), the send window (U13) and the officer authorisation (U41) are separate steps. (There is no
 * Gaming Board approval step: Ali ruled 2026-09-26 that marketing SMS is not part of its approval — OQ1.)
 * ⛔ AND IT IS ASKED BY THE LOOP, NOT BY A LIST: `dispatch.ts` (U9) asks it per recipient immediately
 * before the send, so somebody who opts out in minute two does not receive minute four's message.
 *
 * ⭐ THE OWNER'S FINAL RULE (2026-10-07, COMPLIANCE-DECISIONS § "2026-10-07 · Marketing SMS go to anyone with a phone —
 * consent is not a condition (the owner's FINAL rule), and his approvals given in the session"): anyone with a Tanzanian
 * mobile number may be sent offers under the licence while the licence-outreach record is open; consent is recorded when
 * given and decides nothing. Two things in this file follow from it:
 *   · Q9 IS REVERSED — a player whose offers were switched off after a consent with no withdrawal recorded (the two-year
 *     lapse, `retention.ts`) is reached under the licence like a player never asked (2a′); while the record is CLOSED they
 *     are refused exactly as before. A lapse is the platform clearing a flag, never the person's "no" — their own stop
 *     (a WITHDRAWN row, a stop link) is still a stop.
 *   · U33r (Q8) — a number given as an agent applicant's referee who was promised "we never contact you for marketing"
 *     (/legal/privacy §9 made it to every referee until version `REFEREE_PROMISE_REWORDED_IN`, and keeps it for every
 *     referee named before that version) is refused `agent_referee` right after the stop list (1b): before any basis is
 *     asked, consent and an open record included. ⚠️ Step 1b is one keyed read in EVERY state, so a closed record now costs that one read more than before,
 *     and a promised referee is refused `agent_referee` rather than `no_consent` while it is closed.
 *     ⛔ And what the rule does NOT change: the stop, self-exclusion, under-18s and RG standing still refuse.
 */

/** ⭐ Named, and each value is a `skipped` reason — never a failure (§5.6). A refusal is the
 *  system working. */
export type MarketingSkipReason =
  | "bad_msisdn"
  | "suppressed"
  | "no_consent"
  | "consent_withdrawn"
  | "rg_self_excluded"
  | "rg_cooling_off"
  | "rg_harm_marker"
  | "rg_under25_history"
  | "age_minor"
  | "age_unknown"
  | "account_status"
  /** U33a-G · the record is OPEN and still nothing reaches this number: no consent, and no list basis covers it. ⛔ Its
   *  own reason, never folded into `no_consent` — "nobody ever said yes" and "we looked for a licence basis and there
   *  is none" are different facts about the platform, and an officer reading the second as the first would go looking
   *  for a consent that was never the point. */
  | "no_basis"
  /** U33r · the number was given to 50pick as an agent applicant's referee, and that referee was promised "we never
   *  contact you for marketing" (/legal/privacy §9, Q8 — kept since v2026-10-07 for every referee named before that version).
   *  Refused like a stop — right after the stop list, before any basis,
   *  consent included. ⛔ Its own reason, never folded into a stop: no stop row exists and nobody can lift this one.
   *  ⛔ D19, AND THE U33r REVIEW'S MINOR-5 · NO VIEWER SEES IT APART: the split counts it in its ONE protected line
   *  (`audience-split.ts`), the contacts page says "Not reachable", a typed test says `protected` to a reader and
   *  `typed_refused` to a masked viewer — only a typed test's audit row records it precisely. It never starts `rg_`, so
   *  no RG line is ever written for it (`dispatch.ts` `auditRgRefusal`). */
  | "agent_referee";

/**
 * U33a-G · WHAT MADE THE SEND LAWFUL, carried out of the gate so the audit row can say it (OD57 · OD58).
 * ⛔ A basis is never a preference ranking: CONSENT is asked first and wins wherever it exists, and the three LICENCE_*
 * kinds are reachable only while the licence-outreach record is open.
 */
export type MarketingBasisKind = "CONSENT" | "LICENCE_PLAYER" | "LICENCE_LIST" | "LICENCE_TEST";

/** `userId` is set on every refusal the PLAYER branch makes, so the loop can write the RG audit line
 *  against the account (§5.14 — never against a phone number). */
export type MarketingGateVerdict =
  | { ok: true; basis: MarketingBasisKind; basisRef: string }
  | { ok: false; skipReason: MarketingSkipReason; detail: string; userId?: string };

const refuse = (skipReason: MarketingSkipReason, detail: string, userId?: string): MarketingGateVerdict =>
  (userId ? { ok: false, skipReason, detail, userId } : { ok: false, skipReason, detail });

/* The refusals the open record introduces, each written once so the gate and its suite cannot drift. ⭐ No lapse refusal
   among them since 2026-10-07: Q9 is reversed (the header), so a lapsed player is reached under the licence, never refused
   for the lapse. */
const ERASED_DETAIL =
  "this number's book record was erased — no licence basis reaches it; only a new consent does";
const NO_BASIS_DETAIL =
  "no consent, and no list recorded under the licence outreach basis covers this number";
const NO_ADULT_DETAIL =
  "no 18+ confirmation is on record for this number — no covering list basis, no import attestation, no test attestation";
/** U33r · the referee refusal's internal detail — ⛔ NO instant, no number, no hash (the U33r review's MAJOR-1): U43b will
 *  store a refusal's detail beside the recipient's number, and an instant there would date the referee's naming. */
const REFEREE_DETAIL =
  `given to 50pick as an agent applicant's referee, who was promised "we never contact you for marketing" — refused before any basis, consent included`;

/**
 * 🔴 THE TWO PHONE FORMATS THIS PLATFORM ACTUALLY HAS, AND WHY THIS FUNCTION EXISTS.
 *
 * `User.phoneE164` is written from `tzPhone` (`validators.ts:32-37`), which returns
 * **`+255XXXXXXXXX`** — with the plus. The marketing key, the SMS wire and `MessagingConsent.
 * identifier` all use `toMsisdn255`, which returns **`255XXXXXXXXX`** — without it. Measured
 * 2026-09-25: the two are unequal for EVERY input, including `+255712345678` itself.
 *
 * ⛔ So `db.user.findByPhone(identifier)` with the marketing key returns null for EVERY
 * PLAYER, and a gate written the obvious way would quietly treat the whole player base as
 * strangers — handing each of them to the ledger branch, which is precisely the branch that
 * must never govern a player. It would never throw and never log; it would simply answer the
 * wrong question, consistently, for everyone.
 *
 * `test:marketing-consent` pins this in both directions: the bridged form finds the player,
 * and the bare form is proven to find nothing.
 */
export function userPhoneKeyFor(identifier: string): string {
  return `+${identifier}`;
}

/** The account states that may be marketed to at all, before consent is even considered. */
const MARKETABLE_STATUS = new Set(["ACTIVE", "PENDING_KYC"]);

/**
 * U12 · THE PUBLISHED PROMISE. `/legal/responsible-gambling` §4 promises no marketing to "players under
 * 25 in vulnerability segments". Built S7 on Ali's delegation, and the segment is DEFINED, not
 * invented: a self-exclusion or a break ever on record (`rg.ts` → `rgHistory`). ⛔ It EXCLUDES and never
 * selects — Privacy §6 says "we do not profile you for marketing", and a behavioural field used to
 * choose who is messaged would make that false. Unlike U10's lifts, nothing lifts this one: a player
 * under 25 with that history is not marketed to until they turn 25.
 */
export const MARKETING_YOUNG_ADULT_AGE = 25;

/**
 * U11 · AGE (OD14, D11), on the platform's ONE age definition — `ageOnPlatformDate`, the EAT calendar
 * date, whole years — never a second copy of the arithmetic. ⛔ Three answers, not two: `isOfAge` folds
 * "unreadable" into "minor", and for marketing an unknown age must be its own refusal (`age_unknown`), so
 * the record says why. `User.dob` arrives as `1990-01-01` (memory) or `1990-01-01T00:00:00.000Z`
 * (Prisma); the helper reads both.
 */
export type MarketingAge = { band: "adult" | "minor" | "unknown"; years: number | null };
export function marketingAge(dob: string | null | undefined, now: Date = new Date()): MarketingAge {
  if (!dob) return { band: "unknown", years: null };
  const years = ageOnPlatformDate(dob, now);
  if (!Number.isFinite(years)) return { band: "unknown", years: null };
  return { band: years >= MIN_AGE_YEARS ? "adult" : "minor", years };
}

/**
 * ⭐ A SUPPRESSION THE PERSON THEMSELVES CREATED — a stop link, a STOP keyword, their own withdrawal.
 * Only these may be lifted by the person's own "yes" (the profile toggle, the resume button, D4/D6).
 * ⛔ COMPLAINT, OPERATOR and SELF_EXCLUSION are never lifted by a player's tap: the platform, not the
 * person, decided those. One definition, so the two lifting surfaces cannot disagree.
 */
export function isPersonCreatedSuppression(reason: SuppressionReason | string | null | undefined): boolean {
  return reason === "WITHDRAWN";
}

/**
 * U38a · THE GATE'S THREE SINGLE-KEY READS, NAMED — so a COUNT can hand it the same answers read in bulk.
 *
 * ⭐ ONE DECISION DEFINITION. The audience split (`audience-split.ts`) asks THIS gate about every number, with these
 * three reads answered from §25's bulk reads (`findActiveAmong`, `findByPhones`, `latestAmong`, a chunk at a time) —
 * never a second copy of the gate's logic run over pre-read rows. Each bulk read answers exactly what the single read
 * answers (`test:dal-parity` §25; the per-element proof is `test:campaign-audience` and the Postgres probe).
 * ⛔ THE SEND LOOP NEVER PASSES THEM: `dispatch.ts` calls the gate with ONE argument, so every send reads fresh,
 * immediately before the message leaves (§5.6). The RG standing and the identity check stay direct reads either way.
 * ⚠️ X24 WAS REVERSED ON PURPOSE (2026-10-02): U38a landed before U33a, so U33a re-threads this when the contact branch
 * reads the 18+ attestation.
 */
export type MarketingGateReads = {
  suppression: (key: MessagingKey) => Promise<StoredSuppression | null> | StoredSuppression | null;
  userByPhone: (phone: string) => Promise<StoredUser | null> | StoredUser | null;
  latestConsent: (key: MessagingKey) => Promise<StoredMessagingConsent | null> | StoredMessagingConsent | null;
  /** U33a-G · the licence-outreach record (this process's `defineConfig` cache — no query). ⛔ FAILS CLOSED, so a record
   *  that cannot be read sends nothing new. */
  outreach: () => Promise<LicenceOutreach> | LicenceOutreach;
  /** U33a-G · the number's standing in the book: none · live (with its covering list basis, if any) · erased. */
  bookStanding: (msisdn: string) => Promise<BookStanding> | BookStanding;
  /** U33r · is this number a PROMISED agent referee's — its keyed hash held in the table (`referee-exclusion.ts`), never
   *  the free text asked. ⛔ It takes the gate's key and answers a yes or a no: no number, no hash and no instant ever leaves
   *  it. Past the split's time budget it throws like the other database reads (`unchecked`). */
  refereeHeld: (msisdn: string) => Promise<boolean> | boolean;
};

/** The default — the store's own single-key reads, asked AT CALL TIME, so the twin `db` resolves to is the one read.
 *  ⛔ FROZEN: it is the SEND LOOP's default, so an in-process assignment to a member would change every send's read. */
export const DB_GATE_READS: Readonly<MarketingGateReads> = Object.freeze({
  suppression: (key: MessagingKey) => db.suppression.find(key),
  userByPhone: (phone: string) => db.user.findByPhone(phone),
  latestConsent: (key: MessagingKey) => db.messagingConsent.latestFor(key),
  outreach: () => licenceOutreach(),
  bookStanding: (msisdn: string) => db.contactListBasis.standingFor(msisdn),
  refereeHeld: (msisdn: string) => isPromisedReferee(msisdn),
});

/**
 * U37c · ONE TYPED TEST'S 18+ CONFIRMATION — the officer's own word, for THIS call only, never stored as consent.
 * ⛔ Only `campaign-test-send.ts` constructs one (a structural guard): no campaign send path may pass a context, so an
 * attestation can never widen a real campaign's audience by one number.
 */
export type TestAttestation = { officerId: string; at: string; attemptRef: string; wordingVersion: number };
export type MarketingGateContext = { readonly testAttestation?: TestAttestation };
const NO_CONTEXT: Readonly<MarketingGateContext> = Object.freeze({});

const ATTEMPT_REF = /^[A-Za-z0-9_-]{8,64}$/;
/** 120 seconds either way: an attestation is a person pressing a button now, not a token somebody kept. */
const ATTESTATION_WINDOW_MS = 120_000;

/**
 * ⭐ THE ATTESTATION, OR NOTHING — and "nothing" is never an error. A malformed, stale or future-dated attestation is
 * IGNORED, so the gate simply decides as though none were offered and the officer gets the ordinary refusal. ⛔ It is
 * never a reason of its own: treating a bad attestation as a failure would let a clock skew turn "no basis" into a
 * different sentence, and the officer would chase the wrong thing.
 */
export function usableTestAttestation(att: TestAttestation | undefined, now: Date): TestAttestation | null {
  if (!att || typeof att !== "object") return null;
  if (typeof att.officerId !== "string" || att.officerId.trim() === "") return null;
  if (typeof att.attemptRef !== "string" || !ATTEMPT_REF.test(att.attemptRef)) return null;
  if (!Number.isInteger(att.wordingVersion) || att.wordingVersion < 1) return null;
  if (typeof att.at !== "string") return null;
  const at = Date.parse(att.at);
  if (!Number.isFinite(at) || Math.abs(at - now.getTime()) > ATTESTATION_WINDOW_MS) return null;
  return att;
}

/**
 * 2a · A PLAYER'S CONSENT (OD8 as corrected by OQ11's built default, D3 2026-09-26). ⛔ The toggle
 * alone is no longer enough: until 2026-09-26 neither consent point named SMS ("product updates",
 * "Product news", "Nipe matangazo"), so OD8's premise that the screen said so was false. The player's
 * `marketingOptIn` must be on AND the LATEST ledger row must be GIVEN in one of the pinned SMS-naming
 * sentences (`consent-wording.ts`). ⛔ The ledger never GRANTS over a player's "no" (OD10) — it is an
 * extra condition, never an alternative. Shared by the gate and the profile toggle's read (D4).
 */
async function playerConsentRefusal(
  user: Pick<StoredUser, "id" | "marketingOptIn">,
  key: MessagingKey,
  reads: MarketingGateReads = DB_GATE_READS,
  /** U33a-G · an OUT-parameter, filled only on the path that actually reads the ledger. ⛔ It must stay that way: the
   *  toggle-off check comes FIRST and returns without a read (8.18a's regex pins that order), so `seen.latest` being
   *  `undefined` means "not read", which is different from "read and found nothing". The licence path below reads it
   *  itself in that case, and a CONSENTING player costs no second read. */
  seen?: { latest?: StoredMessagingConsent | null },
): Promise<MarketingGateVerdict | null> {
  if (user.marketingOptIn !== true) {
    return refuse("no_consent", "the player's own marketing toggle is off", user.id);
  }
  const latest = await Promise.resolve(reads.latestConsent(key));
  if (seen) seen.latest = latest;
  if (!latest) return refuse("no_consent", "no consent row in the ledger — the consent predates the SMS wording", user.id);
  if (latest.status !== "GIVEN") return refuse("consent_withdrawn", `consent withdrawn on ${latest.createdAt}`, user.id);
  if (!isSmsConsentWording(latest.wording)) return refuse("no_consent", "consent predates the SMS wording", user.id);
  return null;
}

/** The identity check, READ ONLY. ⛔ A read that fails refuses — a gate that cannot see a final
 *  UNDERAGE refusal must not assume there is none. */
type KycRead = { ok: true; kyc: StoredKyc | null } | { ok: false };
async function readKyc(userId: string): Promise<KycRead> {
  try {
    return { ok: true, kyc: (await Promise.resolve(db.kyc.findByUserId(userId))) ?? null };
  } catch {
    return { ok: false };
  }
}

/**
 * @param now — injectable so the EAT-midnight age boundaries and the RG clock can be driven by a
 *   suite; production callers omit it.
 * @param reads — U38a: the three single-key reads (`MarketingGateReads`). DEFAULTED to the store's own, so every
 *   existing caller — the send loop above all — is unchanged and reads fresh; only the audience split passes the
 *   chunk's bulk answers, and the decision below is the same code either way.
 */
export async function mayReceiveMarketingSms(
  msisdn: string,
  now: Date = new Date(),
  reads: MarketingGateReads = DB_GATE_READS,
  /** U37c · a typed test's own 18+ confirmation. ⛔ DEFAULTED TO EMPTY and never passed by a campaign: `dispatchSlice`
   *  calls the gate with the recipient's number alone, so nothing a campaign sends can be widened by an attestation. */
  context: MarketingGateContext = NO_CONTEXT,
): Promise<MarketingGateVerdict> {
  // ⛔ An unusable number is refused here rather than at the wire, so it never becomes a
  // billed send attempt (D2, U1). ⭐ Judged by the numbering plan (`tz-msisdn.ts`), not by length:
  // a Kenyan +254…, a landline and a dead NDC 064 are all twelve-plus digits and all undeliverable.
  // ⭐ vb3 (2026-10-03): "+255 0712…" — the trunk zero written after the country code — is NOT among them. It is
  // the same person's number, and the parser keys it 255712… like every other spelling (marketing-consent 40b).
  // The key is always the parser's own `255…` form, never a rail's rewrite of the raw text: `toMsisdn255` keeps
  // that zero, by design.
  const parsed = parseTzNumber(msisdn);
  if (parsed.verdict !== "ok" || !parsed.msisdn) {
    return refuse("bad_msisdn", `not a sendable Tanzanian mobile number (${parsed.verdict}): ${parsed.reason}`);
  }
  const identifier = parsed.msisdn;
  const key: MessagingKey = { channel: "SMS", identifier, category: "MARKETING" };

  // ── 1 · SUPPRESSION, FIRST, ALWAYS (OD11) ───────────────────────────────────────────────
  // ⛔ Before consent, not after. A suppressed number usually still carries the consent row it
  // gave before it withdrew, so asking consent first lets that stale row win.
  // ⭐ `find` ANSWERS "IS THIS NUMBER BEING REFUSED RIGHT NOW" — it returns only rows whose
  // `liftedAt` is null (U8). The row is never deleted, so a person who opted out in 2026 and
  // asked to be resubscribed in 2027 is marketable again WITHOUT the evidence of the original
  // refusal being destroyed. ⛔ Nothing here filters the lift a second time: a gate that
  // re-implemented the DAL's question would be a second definition of "suppressed", and the
  // two only have to disagree once. (U38a: a split hands in `findActiveAmong`'s answer — the same
  // question asked of a set, `test:dal-parity` §25.)
  const suppressed = await Promise.resolve(reads.suppression(key));
  if (suppressed) {
    return refuse("suppressed", `suppressed ${suppressed.reason.toLowerCase()} on ${suppressed.createdAt}`);
  }

  // ── 1b · U33r · AN AGENT APPLICANT'S REFEREE — PROMISED "we never contact you for marketing" (Q8) ────────────────
  // ⛔ BEFORE ANY BASIS, LIKE A STOP: the promise was 50pick's own, made in writing to a person who is not our customer,
  // so neither a consent given later at this number nor an open licence-outreach record outranks it. Asked after the
  // stop list, so a stopped number keeps saying "suppressed". Every referee named before the re-worded §9 went live is
  // excluded — today, with no new words live, every referee. ⛔ The gate never asks WHEN: the writer keys only a referee
  // given the old promise (`refereePromiseHolds`, asked as it writes), so a key held is the whole answer. No `userId`: the
  // refusal is about the number's promise, never an account's standing.
  if (await Promise.resolve(reads.refereeHeld(identifier))) {
    return refuse("agent_referee", REFEREE_DETAIL);
  }

  // ── 2 · IF THE NUMBER BELONGS TO A PLAYER, THE PLAYER GOVERNS ───────────────────────────
  const user = await Promise.resolve(reads.userByPhone(userPhoneKeyFor(identifier)));
  if (user) {
    // ── 2a · CONSENT — the toggle AND an SMS-naming GIVEN row as the latest ledger entry (D3, see
    // `playerConsentRefusal`). Asked before RG because it is two cheap reads, and the RG step below
    // is the costly one.
    /* ⭐ `seen` is filled ONLY when the ledger was actually read (the toggle was on). While the record is CLOSED the
       reads below never run, so a closed record costs exactly today's reads and answers exactly today's answers (S5) —
       ⚠️ bar U33r's ONE keyed referee read at step 1b, asked in both states before a player is known (a referee is
       refused `agent_referee` there, whatever the record says). */
    const seen: { latest?: StoredMessagingConsent | null } = {};
    const noConsent = await playerConsentRefusal(user, key, reads, seen);
    let basis: MarketingBasisKind = "CONSENT";
    let basisRef = seen.latest ? `ledger:${seen.latest.id}` : "ledger:none";
    if (noConsent) {
      // ── 2a′ · U33a-G · THE LICENCE BASIS FOR A PLAYER, and ONLY after consent has already refused.
      const outreach = await Promise.resolve(reads.outreach());
      if (outreach.state !== "open") return noConsent;
      // ⛔ A STOP IS A STOP. The licence basis never overrides a withdrawal — it is the one thing on this path that is
      // the person's own decision about us, and OD58 widened who may be reached, not whose "no" counts.
      const latest = seen.latest !== undefined ? seen.latest : await Promise.resolve(reads.latestConsent(key));
      if (latest?.status === "WITHDRAWN") {
        return refuse("consent_withdrawn", `consent withdrawn on ${latest.createdAt} — the licence basis never overrides a stop`, user.id);
      }
      // ⭐ Q9 REVERSED (the owner's FINAL rule, 2026-10-07): A LAPSE IS REACHED. The switch is off after a consent that was
      // never withdrawn — the two-year lapse (`retention.ts` clears the flag and writes no row): the platform clearing a
      // flag, never the person's "no". Consent decides nothing under the final rule, so this player is reached on the
      // licence like a player never asked — and RG, age, under-25 and status below run exactly as they do for them.
      // ⛔ Their own stop still refuses: a WITHDRAWN row above, a stop link at step 1. ⚠️ U16b owes the lapse a ledger row
      // (`RETENTION_LAPSE`): it must not be read as a stop here, or Q9 comes back by the back door.
      basis = "LICENCE_PLAYER";
      basisRef = `outreach:${outreach.recordedAt}`;
    }
    // ── 2b · RG STANDING — self-exclusion → cooling-off → harm markers (U10, `rg.ts`).
    // ⛔ NEVER `isLockedOut` (OD12, D9): it LIFTS ITSELF when the chosen period elapses, so a 24-hour
    // self-exclusion would be marketable 25 hours later. The period ending is not the person asking.
    // 🔴 AND NEVER A PREDICATE THAT WRITES. U7 first asked `selfExclusionStanding`, which goes
    // through `getRgSettings`: that CREATES a row for a user with none (fixed at U7 by reading the
    // row first) and REWRITES a row whose pending limit change has come due (`effectivize`) — which
    // the U7 fix did not cover. `rg.ts` reads the raw row and computes from it; nothing it calls writes.
    const rg = await marketingRgStanding(user, identifier, now.getTime());
    if (!rg.ok) return refuse(rg.skipReason, rg.detail, user.id);
    // ── 2c · AGE (U11) — §5.6 puts it straight after harm markers. Unknown is `skipped`, never sent.
    // ⭐ D5: the identity check is asked too. `kyc-service` refuses an UNDERAGE document by freezing
    // the wallet and writing KycSubmission REJECTED/UNDERAGE — it changes neither `User.status` nor
    // `User.dob`, so a gate reading only the account would clear a minor the platform itself found.
    const kycRead = await readKyc(user.id);
    if (!kycRead.ok) return refuse("age_unknown", "the identity record could not be read, so the age cannot be confirmed", user.id);
    const kyc = kycRead.kyc;
    const finalRefusal = kyc?.status === "REJECTED" && isFinalRefusal(kyc.rejectReason) ? kyc.rejectReason : null;
    if (finalRefusal === "UNDERAGE") return refuse("age_minor", "the identity check refused the account as under 18 (UNDERAGE)", user.id);
    const age = marketingAge(user.dob, now);
    if (age.band === "unknown") return refuse("age_unknown", "the account has no readable date of birth", user.id);
    // The document's date of birth, when the identity step recorded one: the YOUNGER age governs.
    const docAge = marketingAge(kyc?.dob ?? null, now);
    const years = docAge.band === "unknown" ? (age.years as number) : Math.min(age.years as number, docAge.years as number);
    if (age.band === "minor") return refuse("age_minor", "the account holder is under 18", user.id);
    if (years < MIN_AGE_YEARS) return refuse("age_minor", "the identity document's date of birth is under 18", user.id);
    // ── 2d · UNDER 25 WITH AN RG HISTORY (U12) — the promise /legal/responsible-gambling §4 publishes.
    if (years < MARKETING_YOUNG_ADULT_AGE && rg.rgHistory) {
      return refuse("rg_under25_history", "under 25 with a self-exclusion or a break on record", user.id);
    }
    // ── 2e · ACCOUNT STATUS. COOLED_OFF is never cleared by anything, so it is admitted ONLY when
    // the RG step has proven the break is over AND the player consented again after it.
    // SELF_EXCLUDED never reaches here — the RG step refuses it. ⭐ A FINAL identity refusal
    // (SANCTIONED, DUPLICATE_IDENTITY — the second account of somebody who may be self-excluded on the
    // first, GN 478T reg 49(3)) is standing too, whatever `User.status` reads (D5).
    if (finalRefusal) return refuse("account_status", `identity refused (${finalRefusal})`, user.id);
    const statusOk = MARKETABLE_STATUS.has(user.status) || (user.status === "COOLED_OFF" && rg.coolingOffEnded);
    if (!statusOk) {
      return refuse("account_status", `account is ${user.status}`, user.id);
    }
    // ⭐ RG, age, under-25 and status ran EXACTLY as they do for a consent, whatever the basis. A licence basis widens
    // who may be asked; it never lowers the bar a player is protected by (S11).
    return { ok: true, basis, basisRef };
  }

  // ── 3 · THE CONTACT BRANCH — no account holds this number ────────────────────────────────
  // ⛔ A stop first, always: a WITHDRAWN row refuses whatever the record says, and a list basis never overrides it.
  const latest = await Promise.resolve(reads.latestConsent(key));
  if (latest?.status === "WITHDRAWN") {
    return refuse("consent_withdrawn", `consent withdrawn on ${latest.createdAt}`);
  }
  const attestation = usableTestAttestation(context.testAttestation, now);
  /* 3b · CONSENT FIRST, and it is the row SAYING SO: a GIVEN that is either an import attestation or one of the pinned
     SMS-naming sentences. Anything else — an /s/ resume, a pre-U6 tick — is not a consent to SMS marketing. */
  const consented = latest?.status === "GIVEN" && (isImportAttestationSaved(latest) || isSmsConsentWording(latest.wording));
  if (!consented) {
    const outreach = await Promise.resolve(reads.outreach());
    if (outreach.state !== "open") {
      // ⛔ CLOSED: refused BEFORE the book is read, so a closed record costs exactly today's reads (S5) and says
      // exactly today's sentence (bar U33r's one referee read at step 1b, asked in both states). OD7's "there is no
      // lawful basis but consent" is retired as a universal, but it is still the whole truth while the record is closed.
      return refuse("no_consent", latest
        ? "the latest consent row does not name SMS marketing"
        : "no consent has ever been recorded for this number");
    }
  }
  const standing = await Promise.resolve(reads.bookStanding(identifier));
  let basis: MarketingBasisKind;
  let basisRef: string;
  if (consented) {
    basis = "CONSENT";
    basisRef = `ledger:${(latest as StoredMessagingConsent).id}`;
  } else {
    // ⛔ AN ERASED RECORD IS NOT A BLANK ONE. The person asked to be forgotten; a licence basis must not quietly bring
    // them back, and a test attestation does not override it either. Only a NEW consent reaches this number again.
    if (standing.row === "erased") return refuse("no_basis", ERASED_DETAIL);
    if (standing.cover) { basis = "LICENCE_LIST"; basisRef = `list-basis:${standing.cover.basisId}`; }
    else if (attestation) { basis = "LICENCE_TEST"; basisRef = `test:${attestation.attemptRef}`; }
    else return refuse("no_basis", NO_BASIS_DETAIL);
  }
  /* ── 3c · THE 18+ EVIDENCE (U11, OD14). ⛔ It is EVIDENCE, never an inference: a covering list basis (whose recording
     carried the 18+ wording), an import attestation on the row itself, or this one typed test's attestation. A consented
     contact with none of the three is still refused — consent to be messaged is not a statement of age. */
  const adult = isImportAttestationSaved(latest) || standing.cover !== null || attestation !== null;
  if (!adult) return refuse("age_unknown", NO_ADULT_DETAIL);
  return { ok: true, basis, basisRef };
}

/**
 * D4 · WHAT THE PROFILE TOGGLE SHOWS — the player's EFFECTIVE consent, never the bare boolean.
 *
 * 🔴 The switch rendered `User.marketingOptIn`. So after an SMS-link stop, turned back ON, it read ON
 * while the suppression refused every message; after a break ended it read ON while the gate refused
 * (RG §4: "until they opt in again after it ends"); and a "yes" under the old non-SMS wording read ON
 * while OQ11 no longer counts it. Each is a switch lying about a consent.
 * ⭐ ON only when the CONSENT part of the gate would pass: 2a above (toggle + SMS-wording GIVEN row), no
 * suppression the person created, and a consent that post-dates any ended break or officer restore
 * (`rg.ts` `consentLapsed`). A COMPLAINT / OPERATOR / SELF_EXCLUSION suppression is the platform's
 * decision, not the player's consent, so it does not turn the switch off — and a tap cannot lift it.
 *
 * ⭐ D4b (2026-09-27) · A BREAK OR SELF-EXCLUSION STILL IN FORCE reads OFF and HELD. 🔴 Only a LAPSED refusal
 * read OFF, so a break still running fell through to ON: the switch showed a consent the gate refuses now and
 * will never honour (a "yes" counts only if given AFTER the break ends, `rg.ts`), then flipped itself OFF when
 * the break ended. Asked FIRST and for every player, consenting or not, because an ON tapped mid-break is void
 * whoever taps it — the switch is locked for the duration and the screen says why.
 *
 * ⛔ U33r (2026-10-07, the U33r review) · A PROMISED AGENT REFEREE reads OFF and LOCKED, FOR GOOD — asked FIRST and for
 * every player, consenting or not, exactly as D4b asks a break: the gate refuses the number `agent_referee` before any
 * basis (step 1b), so ON here would be the D4 lie, and an ON tapped is void whoever taps it. The screen says why
 * (`referee`), in its own words, with no date — the promise has none.
 *
 * ⛔ READ ONLY. Harm markers are not consent (and cost up to 10,000 rows), so they are not asked here.
 */
export type MarketingToggleState = {
  on: boolean;
  /** OFF only because consent lapsed when a break or a self-exclusion ended — the screen says so. */
  paused: boolean;
  /** OFF because a break or a self-exclusion is IN FORCE now (D4b): no "yes" can count until it ends. */
  held: boolean;
  /** When the hold ends, if a real future date is on record — null for a permanent or diverged one. */
  heldUntil: string | null;
  /** ⭐ U33a-P · ON, but on the LICENCE basis rather than a consent: the person never said yes, and offers reach them
   *  because licence outreach is open. The screen says so in its own line, because a switch that reads ON identically
   *  in both cases would be telling a person they agreed to something they never agreed to. */
  outreach: boolean;
  /** ⛔ U33r · OFF for good: the number is a promised agent referee's (its key is held, `referee-exclusion.ts`), and the
   *  gate refuses it before any basis — no "yes" can ever count. */
  referee: boolean;
};

const TOGGLE_OFF: MarketingToggleState = { on: false, paused: false, held: false, heldUntil: null, outreach: false, referee: false };
/** U33r · a promised referee's switch: OFF and locked, with no date. */
const TOGGLE_REFEREE: MarketingToggleState = { ...TOGGLE_OFF, referee: true };
/** `selfExclusionStandingOf` stores "permanent" as now + 100 years and reads anything past ten as permanent. */
const PERMANENT_AFTER_MS = 10 * 365 * 86400_000;

/** A break or self-exclusion in force — any RG refusal the player's own "yes" cannot lift (`consentLapsed`
 *  is the one it can). Harm markers never reach here: the toggle's read stubs them out. */
function holdOf(rg: MarketingRgStanding, now: Date): MarketingToggleState | null {
  if (rg.ok || rg.consentLapsed || rg.skipReason === "rg_harm_marker") return null;
  const ms = rg.until ? Date.parse(rg.until) : NaN;
  const dated = Number.isFinite(ms) && ms > now.getTime() && ms - now.getTime() < PERMANENT_AFTER_MS;
  return { ...TOGGLE_OFF, held: true, heldUntil: dated ? new Date(ms).toISOString() : null };
}

export async function marketingToggleState(
  user: Pick<StoredUser, "id" | "status" | "phoneE164" | "marketingOptIn">,
  now: Date = new Date(),
): Promise<MarketingToggleState> {
  // The ledger's own key (`consent-ledger.ts` writes by `toMsisdn255`), so the read finds its rows.
  const identifier = toMsisdn255(user.phoneE164);
  const key: MessagingKey = { channel: "SMS", identifier, category: "MARKETING" };
  // ⛔ U33r · A PROMISED REFEREE FIRST — the gate's own read (step 1b), for every player: refused whatever the basis, so
  // the switch is OFF and locked whatever the ledger says. A number that is not a gate key cannot be a referee's.
  if (isRefereeKeyable(identifier) && (await Promise.resolve(DB_GATE_READS.refereeHeld(identifier)))) return TOGGLE_REFEREE;
  const rg = await marketingRgStanding(user, identifier, now.getTime(), { ...MARKETING_RG_DEPS, harmFlags: async () => [] });
  const held = holdOf(rg, now);
  if (held) return held;
  /* ⭐ U33a-P · `seen` so the licence path below costs no second ledger read for a consenting player (§3.6). */
  const seen: { latest?: StoredMessagingConsent | null } = {};
  const noConsent = await playerConsentRefusal(user, key, DB_GATE_READS, seen);
  const suppressed = await Promise.resolve(db.suppression.find(key));
  if (noConsent) {
    /* ── NOT CONSENTED · ON here would mean "offers reach you" on the LICENCE basis, so every check is strict ──
       ⛔ STRICTER THAN THE CONSENT PATH BELOW, deliberately. A consenting person's own ON is their decision and only
       a stop THEY made turns it off; here nobody ever said yes, so ANY active stop counts — an OPERATOR stop that a
       consenting player's switch rightly ignores turns this one OFF. The switch must never read ON while the gate
       would refuse: that is the D4 defect in a new place. */
    if (suppressed) return TOGGLE_OFF;
    const latest = seen.latest !== undefined ? seen.latest : await Promise.resolve(db.messagingConsent.latestFor(key));
    if (latest?.status === "WITHDRAWN") return TOGGLE_OFF;
    // ⭐ Q9 REVERSED (2026-10-07): a switch turned off by the two-year LAPSE — the flag cleared with the latest row still
    // GIVEN — reads ON here once the record is open, because the gate now reaches it on the licence. Reading OFF would be
    // the D4 lie in reverse: offers arriving under a switch that says they will not. An OFF tapped now records their stop.
    const record = await Promise.resolve(licenceOutreach());
    if (record.state !== "open") return TOGGLE_OFF;
    // A break that ENDED with no yes since is the one refusal the person's own tap can lift — it reads PAUSED, as
    // it does on the consent path. Any other RG refusal is not theirs to lift, so it is a plain OFF.
    if (!rg.ok) return rg.consentLapsed ? { ...TOGGLE_OFF, paused: true } : TOGGLE_OFF;
    return { ...TOGGLE_OFF, on: true, outreach: true };
  }
  // ── CONSENTED · today's logic, unchanged ──
  if (suppressed && isPersonCreatedSuppression(suppressed.reason)) return TOGGLE_OFF;
  if (!rg.ok && rg.consentLapsed) return { ...TOGGLE_OFF, paused: true };
  return { ...TOGGLE_OFF, on: true };
}

/** `ok` — the switch now shows what was asked. `changed` — a consent record was written (the action
 *  audits it), which can be true even when `ok` is false: a write that landed is never hidden.
 *  `on` — the state READ after the act; null only when even a fresh read failed (never a guess).
 *  `held` — refused because a break or self-exclusion is in force; nothing was written.
 *  `referee` — U33r · refused because the number is a promised agent referee's; nothing was written. */
export type PlayerMarketingChoice = { ok: boolean; on: boolean | null; changed: boolean; liftedStop: boolean; held?: boolean; referee?: boolean };

/** A fresh read of the switch for the catch below — null when that read fails too. */
async function rereadToggle(userId: string): Promise<boolean | null> {
  try {
    const user = await Promise.resolve(db.user.findById(userId));
    return user ? (await marketingToggleState(user)).on : null;
  } catch {
    return null;
  }
}

/**
 * D4 · THE PLAYER'S OWN SWITCH, WRITTEN — the one writer `/profile/notifications` calls. The action
 * owns the session and the audit line; this owns the records, so a suite can drive it without a request.
 *
 * Compared against the EFFECTIVE state (`marketingToggleState`), never the bare boolean, so an ON tap
 * after a lapse or under the old wording is a new consent even though `marketingOptIn` already reads
 * true — the only way RG §4's "opt in again after it ends" can actually be done.
 *   · ON  → lift a suppression the PERSON created (their stop link — ⛔ never COMPLAINT, OPERATOR or
 *           SELF_EXCLUSION), `marketingOptIn = true`, and a GIVEN row in the sentence shown.
 *   · OFF → ⛔ a WITHDRAWN row in the sentence shown FIRST, and `marketingOptIn = false` only once it has landed.
 * ⭐ It answers with the state AFTER the writes: a GIVEN that failed leaves the switch OFF and the caller told so,
 * never a success the gate would contradict.
 * ⛔ THE U33r REVIEW'S MAJOR-3 (2026-10-07) · AN OFF WHOSE WITHDRAWN ROW DID NOT LAND CHANGES NOTHING, AND SAYS SO
 * (`ok: false`, the switch left exactly as it was). The flag used to be cleared first and the row appended after, with
 * the answer read off the cleared flag — so a row that failed left a player told "turned off", with a switch reading OFF
 * and no record of their "no". Since Q9 was reversed, a cleared switch over a latest GIVEN is the two-year LAPSE, which
 * the open licence record REACHES: their stop would have been silently turned into licence outreach. Told it failed, the
 * player tries again; their consent stands meanwhile, and the switch says so.
 * ⛔ D4b · an ON while a break or self-exclusion is in force writes NOTHING (`held`): the gate would count
 * only a consent given after it ends, so a GIVEN row now records a consent that can never act. An OFF is
 * still written — a "no" is never refused.
 * ⛔ U33r · and an ON from a promised agent referee's number writes NOTHING (`referee`), for the same reason and for good.
 * ⭐ AND IT NEVER GUESSES (2026-09-27). The catch answered `on: !want` even when the writes had landed and
 * only the final read threw — so a recorded OFF snapped back to ON. It now reads the state again, and says
 * "unknown" (null) when it cannot.
 * ⛔ ONE DECISION AT A TIME, PER ACCOUNT (the U33r re-review's MINOR-2, 2026-10-07) · `withLock("marketing-choice:<user>")`,
 * as `setReferees` serialises an application. Each call reads the switch, then writes against what it read; two taps in
 * flight together (two tabs, a double tap) each read the SAME before, and their writes interleaved: from a switch reading
 * OFF over a "yes" in the old wording, an OFF and an ON together left the flag cleared over a latest GIVEN — the two-year
 * LAPSE, which the open licence record REACHES, so the player who tapped OFF was reached on the licence. Serialised, the
 * second call reads what the first wrote: the LAST decision wins, and the ledger agrees with the flag.
 * The lock only orders the calls; each write still lands on its own, so the rules above hold inside it unchanged.
 */
export async function recordPlayerMarketingChoice(input: {
  userId: string;
  marketingOptIn: boolean;
  /** The language the page was shown in — the ledger's evidence (D2). */
  locale: MessagingLocale;
}): Promise<PlayerMarketingChoice> {
  const want = input.marketingOptIn === true;
  // What the writes did, kept OUTSIDE the lock: an answer given after the lock itself failed still tells the truth.
  const trail: ChoiceTrail = { changed: false, liftedStop: false };
  try {
    return await withLock(`marketing-choice:${input.userId}`, () => choosePlayerMarketing(input, want, trail));
  } catch (err) {
    // The decision answers its own failures inside the lock; only the lock itself (a pool or transaction failure) lands here.
    return answerAfterThrow(err, input.userId, want, trail);
  }
}

/** What a choice has written so far — read by the answer whichever way the call ends. */
type ChoiceTrail = { changed: boolean; liftedStop: boolean };

/** The answer after a throw: the writes may have landed first, so what the switch shows is READ, never assumed. */
async function answerAfterThrow(err: unknown, userId: string, want: boolean, trail: ChoiceTrail): Promise<PlayerMarketingChoice> {
  console.error("[marketing-consent] profile choice failed:", (err as Error)?.message ?? err);
  const on = await rereadToggle(userId);
  return { ok: on === want, on, changed: trail.changed, liftedStop: trail.liftedStop };
}

/** The decision itself, run under the account's lock by `recordPlayerMarketingChoice` (see its docblock). */
async function choosePlayerMarketing(
  input: { userId: string; locale: MessagingLocale },
  want: boolean,
  trail: ChoiceTrail,
): Promise<PlayerMarketingChoice> {
  try {
    const user = await Promise.resolve(db.user.findById(input.userId));
    if (!user) return { ok: false, on: null, changed: trail.changed, liftedStop: trail.liftedStop };
    const before = await marketingToggleState(user);
    if (want && before.held) return { ok: false, on: false, changed: trail.changed, liftedStop: trail.liftedStop, held: true };
    // ⛔ U33r · as D4b, for good: the gate refuses a promised referee's number before any basis, so a GIVEN row would
    // record a consent that can never act — and the switch would read ON over a refusal (the U33r review).
    if (want && before.referee) return { ok: false, on: false, changed: trail.changed, liftedStop: trail.liftedStop, referee: true };
    // An OFF is still written when the switch already shows OFF but the boolean reads true (a lapse,
    // or the old wording): the player said no, and the record should say so.
    const nothingToDo = want ? before.on : (!before.on && user.marketingOptIn !== true);
    if (nothingToDo) return { ok: true, on: want, changed: trail.changed, liftedStop: trail.liftedStop };
    const key: MessagingKey = { channel: "SMS", identifier: toMsisdn255(user.phoneE164), category: "MARKETING" };
    if (!want) {
      // ⛔ MAJOR-3 · THE "NO" IS RECORDED FIRST, and the switch cleared only once it has landed (see the docblock).
      // ⛔ Append-only: a withdrawal is a NEW row, never an edit of the row that granted consent.
      const withdrawn = await appendMarketingConsent({
        phoneE164: user.phoneE164,
        locale: input.locale,
        status: "WITHDRAWN",
        source: "PROFILE",
        site: "PROFILE",
        evidence: "/profile/notifications",
        recordedBy: null,
      });
      if (!withdrawn) {
        // Nothing was written, so the switch is exactly where it was — READ, and said, never assumed OFF.
        const unchanged = await marketingToggleState(user);
        return { ok: false, on: unchanged.on, changed: trail.changed, liftedStop: trail.liftedStop };
      }
      trail.changed = true;
      if (user.marketingOptIn !== false) await Promise.resolve(db.user.update(user.id, { marketingOptIn: false }));
      const afterOff = await marketingToggleState({ ...user, marketingOptIn: false });
      return { ok: afterOff.on === false, on: afterOff.on, changed: trail.changed, liftedStop: trail.liftedStop };
    }
    const stop = await Promise.resolve(db.suppression.find(key));
    if (stop && isPersonCreatedSuppression(stop.reason)) {
      trail.liftedStop = (await Promise.resolve(db.suppression.lift(key, "profile", new Date().toISOString()))) !== null;
      trail.changed = trail.changed || trail.liftedStop;
      // U24 commit 2 · the book row stops reading "suppressed" NOW — a lift whose ledger append below then
      // fails still leaves the cache true (the append mirrors again when it lands).
      await mirrorContactCache(key.identifier);
    }
    if (user.marketingOptIn !== want) {
      await Promise.resolve(db.user.update(user.id, { marketingOptIn: want }));
      trail.changed = true;
    }
    const appended = await appendMarketingConsent({
      phoneE164: user.phoneE164,
      locale: input.locale,
      status: "GIVEN",
      source: "PROFILE",
      site: "PROFILE",
      evidence: "/profile/notifications",
      recordedBy: null,
    });
    trail.changed = trail.changed || appended;
    const after = await marketingToggleState({ ...user, marketingOptIn: want });
    return { ok: after.on === want, on: after.on, changed: trail.changed, liftedStop: trail.liftedStop };
  } catch (err) {
    // The writes above may have landed before the throw: what the switch shows is READ, not assumed (inside the lock,
    // so the answer is the state THIS call left).
    return answerAfterThrow(err, input.userId, want, trail);
  }
}
