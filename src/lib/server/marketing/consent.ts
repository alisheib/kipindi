import { db } from "@/lib/server/store";
import type { MessagingKey, MessagingLocale, StoredKyc, StoredUser, SuppressionReason } from "@/lib/server/store";
import { appendMarketingConsent } from "@/lib/server/marketing/consent-ledger";
import { toMsisdn255 } from "@/lib/phone-normalize";
import { parseTzNumber } from "@/lib/tz-msisdn";
import { marketingRgStanding, MARKETING_RG_DEPS } from "@/lib/server/marketing/rg";
import type { MarketingRgStanding } from "@/lib/server/marketing/rg";
import { ageOnPlatformDate, MIN_AGE_YEARS } from "@/lib/id-documents";
import { isFinalRefusal } from "@/lib/kyc-refusal";
import { isSmsConsentWording } from "@/lib/marketing/consent-wording";

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
  | "account_status";

/** `userId` is set on every refusal the PLAYER branch makes, so the loop can write the RG audit line
 *  against the account (§5.14 — never against a phone number). */
export type MarketingGateVerdict =
  | { ok: true }
  | { ok: false; skipReason: MarketingSkipReason; detail: string; userId?: string };

const refuse = (skipReason: MarketingSkipReason, detail: string, userId?: string): MarketingGateVerdict =>
  (userId ? { ok: false, skipReason, detail, userId } : { ok: false, skipReason, detail });

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
 * 2a · A PLAYER'S CONSENT (OD8 as corrected by OQ11's built default, D3 2026-09-26). ⛔ The toggle
 * alone is no longer enough: until 2026-09-26 neither consent point named SMS ("product updates",
 * "Product news", "Nipe matangazo"), so OD8's premise that the screen said so was false. The player's
 * `marketingOptIn` must be on AND the LATEST ledger row must be GIVEN in one of the pinned SMS-naming
 * sentences (`consent-wording.ts`). ⛔ The ledger never GRANTS over a player's "no" (OD10) — it is an
 * extra condition, never an alternative. Shared by the gate and the profile toggle's read (D4).
 */
async function playerConsentRefusal(user: Pick<StoredUser, "id" | "marketingOptIn">, key: MessagingKey): Promise<MarketingGateVerdict | null> {
  if (user.marketingOptIn !== true) {
    return refuse("no_consent", "the player's own marketing toggle is off", user.id);
  }
  const latest = await Promise.resolve(db.messagingConsent.latestFor(key));
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
 */
export async function mayReceiveMarketingSms(msisdn: string, now: Date = new Date()): Promise<MarketingGateVerdict> {
  // ⛔ An unusable number is refused here rather than at the wire, so it never becomes a
  // billed send attempt (D2, U1). ⭐ Judged by the numbering plan (`tz-msisdn.ts`), not by length:
  // a Kenyan +254…, a landline, the 13-digit "+255 0712…" typo and a dead NDC 064 are all twelve-plus
  // digits and all undeliverable. The key is the parser's own `255…` form.
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
  // two only have to disagree once.
  const suppressed = await Promise.resolve(db.suppression.find(key));
  if (suppressed) {
    return refuse("suppressed", `suppressed ${suppressed.reason.toLowerCase()} on ${suppressed.createdAt}`);
  }

  // ── 2 · IF THE NUMBER BELONGS TO A PLAYER, THE PLAYER GOVERNS ───────────────────────────
  const user = await Promise.resolve(db.user.findByPhone(userPhoneKeyFor(identifier)));
  if (user) {
    // ── 2a · CONSENT — the toggle AND an SMS-naming GIVEN row as the latest ledger entry (D3, see
    // `playerConsentRefusal`). Asked before RG because it is two cheap reads, and the RG step below
    // is the costly one.
    const noConsent = await playerConsentRefusal(user, key);
    if (noConsent) return noConsent;
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
    return { ok: true };
  }

  // ── 3 · OTHERWISE THE LEDGER GOVERNS ────────────────────────────────────────────────────
  // ⛔ No row is not "not yet decided" — it is NO. There is no lawful basis but consent in
  // Tanzania (OD7), so silence can never be treated as permission.
  const latest = await Promise.resolve(db.messagingConsent.latestFor(key));
  if (!latest) {
    return refuse("no_consent", "no consent has ever been recorded for this number");
  }
  if (latest.status === "WITHDRAWN") {
    return refuse("consent_withdrawn", `consent withdrawn on ${latest.createdAt}`);
  }
  // ── 3b · AGE, FOR A CONTACT (U11, OD14): marketable only when the import recorded an explicit 18+
  // attestation with the consent. That attestation is U33's to record and NO field carries it yet, so
  // today every contact-only number is `age_unknown`. ⛔ Not inferred from `source`, `evidence` or
  // anything else on the row: reading an 18+ out of a free-text field would be inventing the
  // attestation. The contact path therefore stays shut until U33 builds the thing it waits on.
  return refuse("age_unknown", "no 18+ attestation is on record for this contact (U33 records one at import)");
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
};

const TOGGLE_OFF: MarketingToggleState = { on: false, paused: false, held: false, heldUntil: null };
/** `selfExclusionStandingOf` stores "permanent" as now + 100 years and reads anything past ten as permanent. */
const PERMANENT_AFTER_MS = 10 * 365 * 86400_000;

/** A break or self-exclusion in force — any RG refusal the player's own "yes" cannot lift (`consentLapsed`
 *  is the one it can). Harm markers never reach here: the toggle's read stubs them out. */
function holdOf(rg: MarketingRgStanding, now: Date): MarketingToggleState | null {
  if (rg.ok || rg.consentLapsed || rg.skipReason === "rg_harm_marker") return null;
  const ms = rg.until ? Date.parse(rg.until) : NaN;
  const dated = Number.isFinite(ms) && ms > now.getTime() && ms - now.getTime() < PERMANENT_AFTER_MS;
  return { on: false, paused: false, held: true, heldUntil: dated ? new Date(ms).toISOString() : null };
}

export async function marketingToggleState(
  user: Pick<StoredUser, "id" | "status" | "phoneE164" | "marketingOptIn">,
  now: Date = new Date(),
): Promise<MarketingToggleState> {
  // The ledger's own key (`consent-ledger.ts` writes by `toMsisdn255`), so the read finds its rows.
  const identifier = toMsisdn255(user.phoneE164);
  const key: MessagingKey = { channel: "SMS", identifier, category: "MARKETING" };
  const rg = await marketingRgStanding(user, identifier, now.getTime(), { ...MARKETING_RG_DEPS, harmFlags: async () => [] });
  const held = holdOf(rg, now);
  if (held) return held;
  if (await playerConsentRefusal(user, key)) return TOGGLE_OFF;
  const suppressed = await Promise.resolve(db.suppression.find(key));
  if (suppressed && isPersonCreatedSuppression(suppressed.reason)) return TOGGLE_OFF;
  if (!rg.ok && rg.consentLapsed) return { ...TOGGLE_OFF, paused: true };
  return { ...TOGGLE_OFF, on: true };
}

/** `ok` — the switch now shows what was asked. `changed` — a consent record was written (the action
 *  audits it), which can be true even when `ok` is false: a write that landed is never hidden.
 *  `on` — the state READ after the act; null only when even a fresh read failed (never a guess).
 *  `held` — refused because a break or self-exclusion is in force; nothing was written. */
export type PlayerMarketingChoice = { ok: boolean; on: boolean | null; changed: boolean; liftedStop: boolean; held?: boolean };

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
 *   · OFF → `marketingOptIn = false` and a WITHDRAWN row in the sentence shown.
 * ⭐ It answers with the state AFTER the writes: a ledger append that failed leaves the switch OFF and
 * the caller told so, never a success the gate would contradict.
 * ⛔ D4b · an ON while a break or self-exclusion is in force writes NOTHING (`held`): the gate would count
 * only a consent given after it ends, so a GIVEN row now records a consent that can never act. An OFF is
 * still written — a "no" is never refused.
 * ⭐ AND IT NEVER GUESSES (2026-09-27). The catch answered `on: !want` even when the writes had landed and
 * only the final read threw — so a recorded OFF snapped back to ON. It now reads the state again, and says
 * "unknown" (null) when it cannot.
 */
export async function recordPlayerMarketingChoice(input: {
  userId: string;
  marketingOptIn: boolean;
  /** The language the page was shown in — the ledger's evidence (D2). */
  locale: MessagingLocale;
}): Promise<PlayerMarketingChoice> {
  const want = input.marketingOptIn === true;
  let changed = false;
  let liftedStop = false;
  try {
    const user = await Promise.resolve(db.user.findById(input.userId));
    if (!user) return { ok: false, on: null, changed, liftedStop };
    const before = await marketingToggleState(user);
    if (want && before.held) return { ok: false, on: false, changed, liftedStop, held: true };
    // An OFF is still written when the switch already shows OFF but the boolean reads true (a lapse,
    // or the old wording): the player said no, and the record should say so.
    const nothingToDo = want ? before.on : (!before.on && user.marketingOptIn !== true);
    if (nothingToDo) return { ok: true, on: want, changed, liftedStop };
    const key: MessagingKey = { channel: "SMS", identifier: toMsisdn255(user.phoneE164), category: "MARKETING" };
    if (want) {
      const stop = await Promise.resolve(db.suppression.find(key));
      if (stop && isPersonCreatedSuppression(stop.reason)) {
        liftedStop = (await Promise.resolve(db.suppression.lift(key, "profile", new Date().toISOString()))) !== null;
        changed = changed || liftedStop;
      }
    }
    if (user.marketingOptIn !== want) {
      await Promise.resolve(db.user.update(user.id, { marketingOptIn: want }));
      changed = true;
    }
    // ⛔ Append-only: a withdrawal is a NEW row, never an edit of the row that granted consent.
    const appended = await appendMarketingConsent({
      phoneE164: user.phoneE164,
      locale: input.locale,
      status: want ? "GIVEN" : "WITHDRAWN",
      source: "PROFILE",
      site: "PROFILE",
      evidence: "/profile/notifications",
      recordedBy: null,
    });
    changed = changed || appended;
    const after = await marketingToggleState({ ...user, marketingOptIn: want });
    return { ok: after.on === want, on: after.on, changed, liftedStop };
  } catch (err) {
    console.error("[marketing-consent] profile choice failed:", (err as Error)?.message ?? err);
    // The writes above may have landed before the throw: what the switch shows is READ, not assumed.
    const on = await rereadToggle(input.userId);
    return { ok: on === want, on, changed, liftedStop };
  }
}
