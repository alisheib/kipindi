/**
 * U37b · THE OFFICER'S TEST SEND — one saved draft, rendered and sent to ONE number: the officer's own (the one-tap
 * default), or — U37c — a number the officer TYPES, with their 18+ confirmation (decisions X14 · M9 · M12 · S23–S25;
 * plan §9 U37b · U37c, spec `docs/marketing-specs/U33a-U37c-OD58.md` §3.7).
 *
 * ⛔ IT TAKES (campaignId, variant, recipient) AND NOTHING ELSE. No body: the text is the STORED draft's, rendered by THE
 * ONE renderer (`renderForRecipient`). The recipient is re-typed here whatever was posted (`testRecipientOf`): the
 * officer's own number is read from their ACCOUNT (never from the request, never from the session's photograph), and a
 * typed number from `recipient.number` ONLY — a `to`, a `msisdn` or a `body` posted beside it is never read. An absent
 * recipient is the officer's own number (an old page's two-argument post, deploy skew).
 *
 * ⛔ IT GOES THROUGH THE ONE GATE. `dispatchSlice` asks `mayReceiveMarketingSms` for the number immediately before the
 * send — no bypass (a bypass is D15's second, ungated send path). So an officer needs a recorded SMS consent and a date
 * of birth on their own account, exactly as any recipient does, and the screen names the remedy.
 *
 * ⭐ U37c · A TYPED NUMBER IS A CONTACT-BOOK RECIPIENT, AND THE CONFIRMATION IS NEVER A BYPASS. It renders as a book
 * recipient — the `{jina}` fallback, never the holder's own first name, and the campaign's stored source line — and the
 * gate decides it exactly as it decides a campaign's: a number an account holds is governed by THAT account (its consent
 * or the licence, its stop, its RG standing, its age, its status), and the officer's 18+ confirmation counts only for a
 * number no account holds, only for this one call (`TestAttestation`), only while licence outreach is open (Q11), and
 * never over a stop, a withdrawal or an erased record. Typed tests are refused UP FRONT — before anything that depends on
 * who holds the number — while licence outreach is closed, while `adult.test` is unsaved, or while the campaign has no
 * source line, so the answer is the same for a player's number and a stranger's. The officer's own number typed in
 * another spelling IS their own number: the own path, no confirmation.
 *
 * ⛔ D19 · S23 · S25 · A TEST IS NOT A MEMBERSHIP ORACLE. A viewer who may not read numbers gets ONE sentence for every
 * gate refusal of a typed number (`typed_refused`); a reader gets the reason, with the protected reasons collapsed
 * (`protected`). The result never carries a basis. Every typed outcome decided at the gate or after it returns no sooner
 * than `TYPED_TEST_MIN_MS` after the request began, so the player branch's longer reads (the identity check, the harm
 * scan) cannot time out as a player signal. The returned text of a typed test carries the measurement token: the stop
 * link made for that number is never shown to the officer.
 *
 * ⛔ S24 · TWO MORE BUDGETS FOR TYPED TESTS, spent only after the number-independent checks (so a closed record drains
 * neither): per officer (`marketing.testSendTyped`) and per recipient (`marketing.testSendTo`, keyed by a hash of the
 * gate's key — no digit of the number). Without the first, an officer could run a quiet campaign to strangers through
 * "tests", outside the confirmation and the frequency cap.
 *
 * ⛔ X14 · THE ONE LIVE SWITCH. With `marketing.sms.live` absent (CLOSED) a real carrier is refused `live_sends_closed`
 * BEFORE anything is minted, written or handed over: no opt-out token, no `SmsMessage` row, no transport call — for a
 * typed number too. Only the console stub (no handset, no money) passes while it is closed. Opening it is owner gate G1;
 * every test after that is a real SMS (G3), which is why the officer's budget is small (`marketing.testSend`: 3, then
 * one per 10 minutes).
 *
 * THE ORIGIN IS CHOSEN, NOT DEFAULTED (U37a, OD49): the officer's own number renders as an ACCOUNT recipient — their own
 * first name may print and no source line is added — and a typed number as a BOOK recipient, as above. A book origin on
 * the officer's own number would print a source sentence that is false for it.
 *
 * WHAT IS WRITTEN: one masked `marketing.campaign_test` audit row for every attempt that passes the budget (an attempt
 * the budget refuses writes none — a button held down must not fill an unprunable chain) — with the target, the basis
 * the gate gave, its ref for the kinds whose ids hold no digit run (never `ledger:<id>`, S7), and for a typed test the
 * confirmation's wording version and the attempt's ref. ⛔ U37c · OD61 · A TYPED TEST WRITES NO RG COMPLIANCE LINE — not
 * at its pre-check and not on dispatch's re-ask (`SliceDeps.rgAudit`, a no-op): a `marketing.suppressed.rg · User#…`
 * row that appears the moment one officer-typed number is refused tells anyone who can read the console's activity
 * feed that the number is a protected player (the adversarial review, 2026-10-05). The masked row above carries the
 * collapsed `protected` reason instead. And, when it reaches the wire, the ONE `SmsMessage` row
 * `sendBatch` writes — purpose MARKETING, target `SmsCampaignTest` / the campaign id, so a delivery receipt settles that
 * row and nothing else (the DLR route has no per-target arm for it).
 *
 * ⭐ U13 · M12 · THE TEST OBEYS THE SEND WINDOW. Outside the hours the owner saved (08:00–20:00 EAT unless changed) a test
 * is refused `held` with the window's own sentence (`testQuietHours`) at step 5b — a shop-wide fact, read like the rail and
 * the switch: before a token, a row or a transport call, and before anything about the number (a typed test's checks and
 * budgets included) — and the masked row records `held: quiet_hours`. The window travels into `dispatchSlice` as well
 * (`deps.window`), so one that closes between that check and the send still holds the test. ⛔ Hours that cannot be read
 * are a CLOSED window, said as such (`TEST_WINDOW_UNREADABLE`), never as quiet hours.
 *
 * OWED DOWNSTREAM: U15 allowlists this file on the one send path (M9); U14's frequency cap leaves `SmsCampaignTest` out
 * (M12); U50 registers the audit action.
 *
 * Guard: `npm run test:campaign-compose` §18 · `npm run test:campaign-models` §3.1 (the MARKETING writer pin).
 */
import { randomInt } from "node:crypto";
import { db } from "@/lib/server/store";
import { pepperedLetters } from "@/lib/server/crypto";
import type { StoredSmsCampaign, StoredUser } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import type { RateResult } from "@/lib/server/rate-limit";
import { sendBatch, smsProviderResolution, smsRailProblem } from "@/lib/server/sms";
import type { SmsBatchOutcome, SmsOutbound, SmsProviderResolution, SmsRailProblem } from "@/lib/server/sms";
import { dispatchSlice, liveSendWindow } from "@/lib/server/marketing/dispatch";
import type { SliceDeps } from "@/lib/server/marketing/dispatch";
import { sendWindowUnreadable } from "@/lib/marketing/window";
import type { SendWindowState } from "@/lib/marketing/window";
import { mayReceiveMarketingSms, DB_GATE_READS } from "@/lib/server/marketing/consent";
import type { MarketingGateReads, MarketingGateVerdict, MarketingSkipReason, TestAttestation } from "@/lib/server/marketing/consent";
import { currentWording } from "@/lib/server/marketing/wordings";
import type { WordingVersion } from "@/lib/marketing/marketing-wordings";
import { ensureOptOutToken } from "@/lib/server/marketing/optout-service";
import { readMarketingLiveSwitch, marketingLiveGate } from "@/lib/server/marketing/live-switch";
import type { MarketingLiveSwitch } from "@/lib/server/marketing/live-switch";
import { renderForRecipient, firstNameFor } from "@/lib/marketing/campaign-template";
import type { CampaignTemplate, CampaignVariant, RecipientOrigin } from "@/lib/marketing/campaign-template";
import { footerMeasurementToken } from "@/lib/marketing/footer";
import { parseTzNumber } from "@/lib/tz-msisdn";
import { maskPhone } from "@/lib/phone-normalize";

/** The target type every test `SmsMessage` row carries — U14's cap counts `SmsCampaignRecipient` rows only (M12). */
export const CAMPAIGN_TEST_TARGET_TYPE = "SmsCampaignTest";
export const CAMPAIGN_TEST_ACTION = "marketing.campaign_test";

/** U37c · S25 · every typed outcome decided at the gate or after it returns no sooner than this after the request began. */
export const TYPED_TEST_MIN_MS = 3000;
/** U37c · a typed number is at most this many characters as posted — the field's own cap. Longer is a malformed request. */
export const TYPED_NUMBER_MAX_CHARS = 40;

/** U37c · who the test goes to: the officer's own number, or a typed one with the officer's 18+ confirmation — and the
 *  VERSION of the `adult.test` words the officer read when they ticked (null when none was posted), so a confirmation is
 *  recorded against the words that were on the screen and never against a rewording they never saw. */
export type TestRecipient = { kind: "own" } | { kind: "typed"; number: string; adultAttested: boolean; attestedVersion: number | null };

/** ⛔ THE WHOLE INPUT — which saved campaign, which language, and who. No body. `recipient: null` is a recipient that was
 *  posted and not understood (`bad_recipient`); absent is the officer's own number. */
export type CampaignTestInput = { campaignId: string; variant: CampaignVariant; recipient?: TestRecipient | null };

/** U37c · what the action knows about the viewer that the request cannot tell it. */
export type CampaignTestOptions = {
  /** May this officer read a number (`identity.contact` = read)? A typed refusal is itemised only for a reader (D19, S23). */
  viewerReads: boolean;
};

/** Who the test ended up going to — a typed number that is the officer's own is `own`. */
export type CampaignTestTarget = "own" | "typed";

export type CampaignTestRefusalReason =
  | "rate_limited" | "not_found" | "not_draft" | "no_english_body" | "own_number_unusable" | "rail_dead"
  | "live_sends_closed" | "template_invalid" | "token_unavailable" | MarketingSkipReason | "held" | "failed"
  /* U37c · a typed test's own refusals */
  | "bad_recipient" | "bad_number" | "attestation_missing" | "typed_outreach_closed" | "typed_no_attestation_wording"
  | "typed_needs_source_line" | "typed_rate_limited" | "typed_refused" | "protected" | "attestation_stale";

/** `handed_over` is the gateway TAKING it — never "delivered" (OD41); only a receipt is delivery. ⛔ No result carries a
 *  basis (S7, A32): what made a typed number reachable is never told to the screen. */
export type CampaignTestResult =
  | { ok: true; outcome: "handed_over"; via: "stub" | "open"; text: string; maskedTo: string; at: string; reference: string; target: CampaignTestTarget }
  | { ok: false; outcome: "refused"; reason: CampaignTestRefusalReason; error: string; retryAfterSec?: number; rail?: SmsRailProblem; target: CampaignTestTarget }
  | { ok: false; outcome: "unconfirmed"; error: string; text: string; maskedTo: string; at: string; target: CampaignTestTarget };

/* ══ THE SENTENCES — each one the officer can act on ════════════════════════════════════════════════════════════════ */

export const TEST_LIVE_SENDS_CLOSED = "Marketing SMS are not switched on yet. The owner switches them on before the first send.";
export const TEST_NOT_FOUND = "This campaign was not found — save it first, then test it.";
export const TEST_NOT_DRAFT = "This campaign is no longer a draft, so it can't be tested.";
export const TEST_NO_ENGLISH = "This campaign has no saved English message — test the Swahili one.";
/** ⭐ With who can help, and where (validation audit, 2026-10-03). An account's number cannot be changed anywhere on the
 *  platform — it is the sign-in identity — and staff access is the owner's, in Staff & roles. ⛔ It names no step the owner
 *  might not take: Staff & roles promotes only an account that already exists, and whether an officer may hold a second
 *  one is the owner's call, not this sentence's. */
export const TEST_OWN_NUMBER_UNUSABLE =
  "Your account's phone number is not a Tanzanian mobile number an SMS can reach, so no test can be sent. " +
  "An account's number can't be changed — ask the owner, who manages staff access in Staff & roles (/admin/staff).";
export const TEST_RAIL_DEAD = "No SMS can leave this server right now — the sender line above says why.";
export const TEST_TOKEN_UNAVAILABLE = "Your stop link couldn't be made, so nothing was sent — try again.";
/** U37c · the same, for a typed number — the link is that person's, never "yours". */
export const TEST_TYPED_TOKEN_UNAVAILABLE = "The stop link for this number couldn't be made, so nothing was sent — try again.";
export const TEST_TEMPLATE_INVALID = "The saved message no longer passes its own check — correct it and save again.";
export const TEST_UNCONFIRMED = "No answer from the network — don't resend straight away; check your phone first.";
export const TEST_GATE_UNANSWERED = "The consent check couldn't answer, so nothing was sent — try again shortly.";
export const TEST_CREDIT_FLOOR = "SMS credit is below its floor, so marketing messages are held — top it up, then test again.";
/** U13 · M12 · a test outside the send window — in the hours the window was read with, and when it opens again: "It's
 *  outside the send window (08:00–20:00 EAT), so no test can be sent now — try again at 08:00." */
export function testQuietHours(w: Pick<SendWindowState, "label" | "opensAtTime">): string {
  return `It's outside the send window (${w.label}), so no test can be sent now — try again at ${w.opensAtTime}.`;
}
/** U13 · the send window's hours could not be read: a CLOSED window (fail closed), said as such — never as quiet hours. */
export const TEST_WINDOW_UNREADABLE =
  "The Marketing SMS settings couldn't be read, so the send window is treated as closed and no test can be sent — reload the page and try again.";

/* ── U37c · a typed test's sentences (spec §7.1–§7.3) ── */
/** §7.1 · ⛔ D19 — the ONE sentence a viewer who may not read numbers gets for EVERY gate refusal of a typed number. */
export const TEST_TYPED_REFUSED =
  "No test was sent: this number can't receive this campaign's messages. Choose another number, or test on your own.";
export const TEST_BAD_RECIPIENT = "That test request wasn't understood — reload the page and try again.";
export const TEST_ATTESTATION_MISSING = "Tick the box to confirm the person who uses this number is 18 or older.";
/** ⛔ The tick was given for words the owner has since changed — the confirmation is not recorded against new words. */
export const TEST_ATTESTATION_STALE =
  "The 18+ confirmation was reworded while this page was open — read the new words and tick the box again.";
export const TEST_TYPED_OUTREACH_CLOSED =
  "Tests to another number open once licence outreach is switched on (Admin → System → Licence outreach). Send yourself a test for now.";
export const TEST_TYPED_NO_ATTESTATION_WORDING =
  "Tests to another number need the 18+ confirmation wording saved first (Admin → System → Marketing wordings).";
/** ⭐ U37s · the line is stamped when a draft is SAVED, so a draft saved before the owner set it carries none: the sentence
 *  names both halves of the remedy rather than "isn't set yet", which is false once the owner has set it. */
export const TEST_TYPED_NEEDS_SOURCE_LINE =
  "A test to another number needs the campaign's source line, and this draft has none — it is added when the draft is saved after the owner sets it (gate G5). Send yourself a test for now.";
export const TEST_TYPED_UNCONFIRMED =
  "No answer from the network — don't resend straight away; ask the person to check their phone first.";

export function testRateLimited(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `That is the test limit for now — try again in ${minutes} min.`;
}
/** §7.3 · the recipient's budget (`marketing.testSendTo`) — said the same whoever holds the number. */
export function typedRateLimitedTo(retryAfterSec: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60));
  return `That number has had as many tests as it may for now — choose another, or try again in ${minutes} min.`;
}
/** §7.3 · the officer's typed budget (`marketing.testSendTyped`). */
export function typedRateLimitedOfficer(retryAfterSec: number): string {
  const hours = Math.max(1, Math.ceil(retryAfterSec / 3600));
  return `That is your limit of tests to other numbers for now — send yourself a test, or try again in ${hours} h.`;
}
function failedSentence(code: string, target: CampaignTestTarget): string {
  return target === "typed"
    ? `The network refused the message (${code}) — nothing reached the phone.`
    : `The network refused the message (${code}) — nothing reached your phone.`;
}

/** The gate's refusal of the officer's OWN number, with the remedy. ⛔ One sentence for every responsible-gambling reason. */
const GATE_SENTENCE: Readonly<Record<MarketingSkipReason, string>> = {
  bad_msisdn: TEST_OWN_NUMBER_UNUSABLE,
  suppressed: "Your number is on the stop list, so no marketing SMS can reach it — start them again from your own SMS link or your profile first.",
  no_consent: "Your number has no SMS offers consent on record — turn on SMS offers on your own profile, then test again.",
  /* U33a-G · forced by the compiler and UNREACHABLE for the officer's own number, which always belongs to an account —
     so it takes the player branch, which never answers `no_basis`. Written plainly anyway rather than left to a cast:
     an unreachable branch that someone later makes reachable must not be the one with no sentence. */
  no_basis: "Nothing on record authorises a marketing SMS to your number — turn on SMS offers on your own profile, then test again.",
  consent_withdrawn: "You withdrew SMS offers consent for your number — turn it back on from your own profile, then test again.",
  rg_self_excluded: "Your own account's responsible-gambling standing stops marketing SMS to your number, so no test can be sent to it.",
  rg_cooling_off: "Your own account's responsible-gambling standing stops marketing SMS to your number, so no test can be sent to it.",
  rg_harm_marker: "Your own account's responsible-gambling standing stops marketing SMS to your number, so no test can be sent to it.",
  rg_under25_history: "Your own account's responsible-gambling standing stops marketing SMS to your number, so no test can be sent to it.",
  age_minor: "Your account's date of birth is under 18, so no marketing SMS can reach your number.",
  age_unknown: "Your account has no readable date of birth, so the consent check can't clear your number — add it to your own account, then test again.",
  account_status: "Your account's status stops marketing SMS to your number, so no test can be sent to it.",
};
export function testGateSentence(reason: MarketingSkipReason): string {
  return GATE_SENTENCE[reason] ?? GATE_SENTENCE.no_consent;
}

/** §7.2 · the reasons a READER is told about a typed number, the protected ones collapsed into one (U38a's rule). */
export type TypedReaderReason = "suppressed" | "consent_withdrawn" | "no_consent" | "no_basis" | "age_unknown" | "protected";
const TYPED_READER_SENTENCE: Readonly<Record<TypedReaderReason, string>> = {
  suppressed: "No test was sent: this number is on the stop list, and a stop is kept for good.",
  consent_withdrawn: "No test was sent: the person at this number stopped 50pick offers.",
  no_consent: "No test was sent: the account at this number has its offers switched off.",
  no_basis: "No test was sent: no recorded basis reaches this number — an erased record is never reached by licence outreach.",
  age_unknown: "No test was sent: the account at this number has no readable date of birth.",
  protected: "No test was sent: the account at this number is protected by its responsible-gambling standing, its age or its status.",
};
/** ⛔ The responsible-gambling reasons, the age and the account status are ONE reason to every viewer: `protected`. */
export function typedReaderReason(reason: MarketingSkipReason): TypedReaderReason {
  return reason === "suppressed" || reason === "consent_withdrawn" || reason === "no_consent" || reason === "no_basis" || reason === "age_unknown"
    ? reason
    : "protected";
}
export function typedReaderSentence(reason: TypedReaderReason): string {
  return TYPED_READER_SENTENCE[reason];
}

/** A send the slice HELD — nothing was attempted, for a reason that is not about this person. U13 · quiet hours are said in
 *  the hours `sendWindow` was read with; a closed window with no readable hours is said as unreadable. */
function heldSentence(reason: string, sendWindow: SendWindowState | null = null): string {
  if (reason === "BALANCE_FLOOR") return TEST_CREDIT_FLOOR;
  if (reason === "gate_unanswered") return TEST_GATE_UNANSWERED;
  if (reason === "quiet_hours") return sendWindow !== null && sendWindow.label !== "" ? testQuietHours(sendWindow) : TEST_WINDOW_UNREADABLE;
  if (reason === "window_unreadable") return TEST_WINDOW_UNREADABLE;
  return TEST_RAIL_DEAD;
}

/* ══ THE RECIPIENT, RE-TYPED ═════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ U37c · THE POSTED RECIPIENT, RE-TYPED — never trusted to be the shape the form meant to send. Absent (or null) is the
 * officer's own number; `{ kind: "own" }` is too; `{ kind: "typed", number, adultAttested, attestedVersion }` is a typed
 * number, the number a string of at most `TYPED_NUMBER_MAX_CHARS`, the confirmation the BOOLEAN `true` and nothing else
 * ("true", 1 or an absent field confirm nothing, §18.18), and the version a positive whole number or null (anything else
 * is null — refused `attestation_stale` at step 6, §18.32). Any other shape is `null` — `bad_recipient`.
 */
export function testRecipientOf(raw: unknown): TestRecipient | null {
  if (raw === undefined || raw === null) return { kind: "own" };
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.kind === "own") return { kind: "own" };
  if (r.kind !== "typed" || typeof r.number !== "string" || r.number.length > TYPED_NUMBER_MAX_CHARS) return null;
  const v = r.attestedVersion;
  const attestedVersion = typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? v : null;
  return { kind: "typed", number: r.number, adultAttested: r.adultAttested === true, attestedVersion };
}

/** ⛔ S24 · the recipient's budget key: `testTo:` and sixteen LETTERS of a keyed hash of the gate's key (`pepperedLetters`,
 *  HMAC under the platform pepper) — the rate store holds neither the number nor any digit run of it, and nobody without
 *  the pepper can enumerate numbers back to a bucket (the adversarial review, 2026-10-05). */
export function testToBucket(key: string): string {
  return `testTo:${pepperedLetters("marketing-test-to", key)}`;
}

/** ⛔ U37c · OD61 · the RG line a typed test hands dispatch's re-ask: none (see the header). */
const NO_RG_LINE = async (): Promise<void> => {};

const LETTERS = "abcdefghijklmnopqrstuvwxyz";
/** `ta_` and sixteen lower-case letters — an attempt's ref holds no digit run a log or a scrubber could read as a number. */
export function mintTestAttemptRef(): string {
  let out = "ta_";
  for (let i = 0; i < 16; i++) out += LETTERS[randomInt(LETTERS.length)];
  return out;
}

/* ══ THE DEPENDENCIES — swappable for in-process red plants, never in production ══════════════════════════════════ */

export type CampaignTestDeps = {
  campaigns: { find: (id: string) => Promise<StoredSmsCampaign | null> };
  users: { findById: (id: string) => Promise<StoredUser | null> };
  /** The officer's budget — `marketing.testSend`, keyed on the officer. */
  rate: (officerId: string) => Promise<RateResult>;
  /** U37c · S24 · the officer's TYPED budget — `marketing.testSendTyped`, keyed on the officer. */
  rateTyped: (officerId: string) => Promise<RateResult>;
  /** U37c · S24 · the recipient's budget — `marketing.testSendTo`, keyed by `testToBucket(key)`. */
  rateTo: (key: string) => Promise<RateResult>;
  provider: () => SmsProviderResolution;
  rail: () => SmsRailProblem | null;
  liveSwitch: () => Promise<MarketingLiveSwitch>;
  /** U37c · the reads a TYPED number's gate is asked with — the ONE gate's own (`DB_GATE_READS`), so the up-front check
   *  "is licence outreach open" (Q11) and the gate read ONE record. Swapped only by a suite. */
  gateReads: MarketingGateReads;
  /** U37c · the SAVED `adult.test` wording — the officer's 18+ confirmation — or null while unsaved (W1). */
  adultTestWording: () => WordingVersion | null;
  ensureToken: (raw: string) => Promise<string | null>;
  /** THE ONE renderer (`renderForRecipient`) — swapped only by a red plant. */
  render: typeof renderForRecipient;
  dispatch: typeof dispatchSlice;
  /** Undefined = the ONE gate, `mayReceiveMarketingSms` (`dispatchSlice`'s own default) — for a typed number, the ONE gate
   *  asked with this test's attestation as its context. */
  gate: SliceDeps["gate"];
  send: SliceDeps["send"];
  /** U13 · M12 · THE SEND WINDOW this test obeys — `liveSendWindow`, the send path's own: read at step 5b, before a token is
   *  minted, and handed to `dispatchSlice`. A suite passes a FIXED window (ENGINE-SPEC §5 rule 9). */
  window: NonNullable<SliceDeps["window"]>;
  audit: (entry: Parameters<typeof audit>[0]) => unknown;
  now: () => Date;
  /** U37c · S25 · the floor's wait. */
  sleep: (ms: number) => Promise<void>;
  /** U37c · `ta_` and sixteen letters. */
  attemptRef: () => string;
};

/**
 * ⭐ THE TEST'S ONE SEND: `sendBatch`, the platform's one send path, with the test's purpose and target stamped on — so
 * its row is MARKETING-purpose (declared in `test:campaign-models` §3.1) and outside the frequency cap (M12).
 */
export function campaignTestSend(messages: SmsOutbound[]): Promise<SmsBatchOutcome> {
  return sendBatch(messages.map((m): SmsOutbound => ({ ...m, purpose: "MARKETING", targetType: CAMPAIGN_TEST_TARGET_TYPE })));
}

export const CAMPAIGN_TEST_DEPS: CampaignTestDeps = {
  campaigns: { find: (id) => db.smsCampaign.find(id) },
  users: { findById: (id) => db.user.findById(id) },
  rate: (officerId) => rateCheckAsync(officerId, "marketing.testSend"),
  rateTyped: (officerId) => rateCheckAsync(officerId, "marketing.testSendTyped"),
  rateTo: (key) => rateCheckAsync(testToBucket(key), "marketing.testSendTo"),
  provider: () => smsProviderResolution(),
  rail: () => smsRailProblem(),
  liveSwitch: () => readMarketingLiveSwitch(),
  gateReads: DB_GATE_READS,
  adultTestWording: () => currentWording("adult.test"),
  ensureToken: (raw) => ensureOptOutToken(raw),
  render: renderForRecipient,
  dispatch: dispatchSlice,
  gate: undefined,
  send: campaignTestSend,
  window: liveSendWindow,
  audit,
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  attemptRef: mintTestAttemptRef,
};

/** U13 · the window a test obeys, read through its deps. ⛔ A read that throws, or answers anything but a window, is a
 *  CLOSED window — never an open one. */
async function windowOf(deps: CampaignTestDeps): Promise<SendWindowState> {
  try {
    const w = await deps.window();
    return w !== null && typeof w === "object" ? w : sendWindowUnreadable();
  } catch {
    return sendWindowUnreadable();
  }
}

/* ══ THE TEST ════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** A campaign id as the store mints them — anything else is not looked up. ⛔ The audit row names only a campaign that
 *  was FOUND (U37b review m2): an all-digit "id" is a whole phone number, and a refused lookup must not carry it into the
 *  chain that is never pruned. */
const CAMPAIGN_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The stored row as the renderer reads it (U35's nullable columns as blank text). */
function templateOf(c: StoredSmsCampaign): CampaignTemplate {
  return {
    bodySw: c.bodySw ?? "",
    bodyEn: c.bodyEn ?? "",
    nameFallbackSw: c.nameFallbackSw ?? "",
    nameFallbackEn: c.nameFallbackEn ?? "",
    sourcePhrase: c.sourcePhrase ?? "",
  };
}

export async function sendCampaignTest(
  input: CampaignTestInput,
  officerId: string,
  deps: CampaignTestDeps = CAMPAIGN_TEST_DEPS,
  options: CampaignTestOptions = { viewerReads: false },
): Promise<CampaignTestResult> {
  const startedAt = deps.now().getTime();
  // ⛔ THESE THREE KEYS ONLY. A `to`, a `msisdn`, a `body` posted beside them is never read.
  const rawId = typeof input?.campaignId === "string" ? input.campaignId.trim() : "";
  const campaignId = CAMPAIGN_ID.test(rawId) ? rawId : "";
  const variant: CampaignVariant = input?.variant === "EN" ? "EN" : "SW";
  const recipient = input?.recipient === null ? null : testRecipientOf(input?.recipient);
  // A recipient that was posted and not understood was meant for another number: it is reported as a typed attempt.
  let target: CampaignTestTarget = recipient === null || recipient.kind === "typed" ? "typed" : "own";
  const viewerReads = options?.viewerReads === true;
  let maskedTo: string | null = null;
  /** The id of the campaign the store FOUND — the only id an audit row may name. */
  let foundId: string | null = null;
  /** U37c · what a typed test adds to its audit row: the confirmation's version, the attempt, the basis the gate gave. */
  const trail: Record<string, unknown> = {};
  /** ⛔ S25 · set once a typed test reaches its pre-check: from then on every outcome waits for the floor. */
  let floored = false;

  /** One masked row per attempt. ⛔ No number but the masked one, no message text, no token. */
  const record = async (outcome: "handed_over" | "refused" | "unconfirmed", reason: string | null, extra: Record<string, string> = {}) => {
    await deps.audit({
      category: "ADMIN",
      action: CAMPAIGN_TEST_ACTION,
      actorId: officerId,
      targetType: "SmsCampaign",
      targetId: foundId,
      payload: { variant, outcome, reason, ...(maskedTo !== null ? { to: maskedTo } : {}), target, ...trail, ...extra },
    });
  };
  /** ⛔ S25 · a typed outcome decided at the gate or after it returns no sooner than `TYPED_TEST_MIN_MS` after the start. */
  const floor = async () => {
    if (!floored) return;
    const left = TYPED_TEST_MIN_MS - (deps.now().getTime() - startedAt);
    if (left > 0) await deps.sleep(left);
  };
  const refuse = async (
    reason: CampaignTestRefusalReason,
    error: string,
    extra: { retryAfterSec?: number; rail?: SmsRailProblem } = {},
    /** What the audit row records, when it differs from what the screen is told (a masked viewer's typed refusal). */
    audited: string = reason,
  ): Promise<CampaignTestResult> => {
    await floor();
    await record("refused", audited);
    return { ok: false, outcome: "refused", reason, error, target, ...extra };
  };
  /** ⛔ D19 · S23 · a gate refusal of a TYPED number: one sentence for a masked viewer, the reason (protected collapsed)
   *  for a reader — and the audit row the collapsed reason either way, never the precise RG one (that is the COMPLIANCE
   *  line's, against the account). */
  const typedRefusal = (skip: MarketingSkipReason) => {
    const said = typedReaderReason(skip);
    return viewerReads ? refuse(said, typedReaderSentence(said)) : refuse("typed_refused", TEST_TYPED_REFUSED, {}, said);
  };

  // ── 1 · the officer's budget, before anything else is read. ⛔ A refused attempt writes no row (see the header). ──
  const budget = await deps.rate(officerId);
  if (!budget.allowed) {
    return { ok: false, outcome: "refused", reason: "rate_limited", error: testRateLimited(budget.retryAfterSec), retryAfterSec: budget.retryAfterSec, target };
  }

  // ── 2 · the SAVED campaign, still a draft — its text is what will be sent ──
  const campaign = campaignId === "" ? null : await deps.campaigns.find(campaignId);
  if (campaign === null) return refuse("not_found", TEST_NOT_FOUND);
  foundId = campaign.id;
  if (campaign.status !== "DRAFT") return refuse("not_draft", TEST_NOT_DRAFT);
  const template = templateOf(campaign);
  if (variant === "EN" && template.bodyEn.trim() === "") return refuse("no_english_body", TEST_NO_ENGLISH);

  // ── 3 · ⛔ THE RECIPIENT — the officer's own account's number, or the typed one, judged by the numbering plan ──
  if (recipient === null) return refuse("bad_recipient", TEST_BAD_RECIPIENT);
  const officer = await deps.users.findById(officerId);
  const ownParsed = officer === null ? null : parseTzNumber(officer.phoneE164);
  const ownKey = ownParsed !== null && ownParsed.verdict === "ok" && ownParsed.msisdn ? ownParsed.msisdn : null;
  let key: string;
  if (recipient.kind === "typed") {
    const typed = parseTzNumber(recipient.number);
    if (typed.verdict !== "ok" || !typed.msisdn) return refuse("bad_number", typed.reason);
    key = typed.msisdn;
    // ⭐ §18.24 · the officer's own number in another spelling IS their own: the own path, no confirmation asked.
    if (key === ownKey) target = "own";
    // ⛔ §18.18 · no confirmation, no test — before the rail, the gate or a token is touched.
    else if (!recipient.adultAttested) return refuse("attestation_missing", TEST_ATTESTATION_MISSING);
  } else {
    if (officer === null || ownKey === null) return refuse("own_number_unusable", TEST_OWN_NUMBER_UNUSABLE);
    key = ownKey;
  }
  const to = maskPhone(key);
  maskedTo = to;

  // ── 4 · a rail that can send at all — before a token is minted for nothing ──
  const rail = deps.rail();
  if (rail !== null) return refuse("rail_dead", TEST_RAIL_DEAD, { rail });

  // ── 5 · ⛔ X14 · THE ONE LIVE SWITCH — before a token, a row or a transport call; a typed test included ──
  const live = marketingLiveGate(deps.provider(), await deps.liveSwitch());
  if (!live.ok) return refuse("live_sends_closed", TEST_LIVE_SENDS_CLOSED);

  // ── 5b · U13 · M12 · THE SEND WINDOW — a shop-wide fact, read like the rail and the switch: before a token, a row or a
  //    transport call, and before anything about the number (a typed test's checks and budgets included). ⛔ Hours that
  //    cannot be read are a CLOSED window; the masked row records which one held it (`held`). ──
  const sendWindow = await windowOf(deps);
  if (sendWindow.open !== true) {
    const why = sendWindow.reason === "quiet_hours" ? "quiet_hours" : "window_unreadable";
    trail.held = why;
    return refuse("held", heldSentence(why, sendWindow));
  }

  // ── 6 · U37c · a TYPED test's four checks that do not depend on who holds the number — the same answer for a player's
  //    number and a stranger's, before any read about the number (§18.25) ──
  let adultWording: WordingVersion | null = null;
  if (target === "typed") {
    // ⛔ Q11 · the record the gate itself reads — fails closed: a record that cannot be read is a closed one.
    const outreach = await Promise.resolve(deps.gateReads.outreach()).catch(() => null);
    if (outreach === null || outreach.state !== "open") return refuse("typed_outreach_closed", TEST_TYPED_OUTREACH_CLOSED);
    adultWording = deps.adultTestWording();
    if (adultWording === null) return refuse("typed_no_attestation_wording", TEST_TYPED_NO_ATTESTATION_WORDING);
    if (template.sourcePhrase.trim() === "") return refuse("typed_needs_source_line", TEST_TYPED_NEEDS_SOURCE_LINE);
    // ⛔ §18.32 · the tick counts only for the words it was given for — the same answer for any number, before any read
    // about it (§18.25). A rewording since the page opened, or no version posted at all, is asked again.
    if (recipient.kind !== "typed" || recipient.attestedVersion !== adultWording.v) {
      return refuse("attestation_stale", TEST_ATTESTATION_STALE);
    }
  }

  // ── 7 · the stored template's own verdict (one campaign, one verdict, OD48) — before any budget or token is spent ──
  const origin: RecipientOrigin = target === "typed" ? "book" : "account";
  // ⛔ A typed number is a book recipient: the `{jina}` fallback, never the holder's own first name (a recycled number
  // would print a previous holder's), and never the officer's.
  const name = target === "typed" ? null : firstNameFor({ userDisplayName: officer?.displayName ?? null });
  const dry = deps.render(template, { variant, name, token: footerMeasurementToken(), origin });
  if (!dry.ok) return refuse("template_invalid", dry.problems[0] ?? TEST_TEMPLATE_INVALID);

  // ── 8 · U37c · S24 · the TWO typed budgets, spent only now — no number-independent refusal drains them ──
  if (target === "typed") {
    const mine = await deps.rateTyped(officerId);
    if (!mine.allowed) return refuse("typed_rate_limited", typedRateLimitedOfficer(mine.retryAfterSec), { retryAfterSec: mine.retryAfterSec });
    const theirs = await deps.rateTo(key);
    if (!theirs.allowed) return refuse("typed_rate_limited", typedRateLimitedTo(theirs.retryAfterSec), { retryAfterSec: theirs.retryAfterSec });
  }

  // ── 9 · U37c · a TYPED test's PRE-CHECK: the ONE gate, asked with this attempt's 18+ confirmation as its context ──
  let gate = deps.gate;
  if (target === "typed") {
    floored = true;
    const attemptRef = deps.attemptRef();
    const version = (adultWording as WordingVersion).v;
    const testAttestation: TestAttestation = { officerId, at: deps.now().toISOString(), attemptRef, wordingVersion: version };
    trail.attestation = { key: "adult.test", version };
    trail.attemptRef = attemptRef;
    const typedGate = deps.gate ?? ((m: string) => mayReceiveMarketingSms(m, deps.now(), deps.gateReads, { testAttestation }));
    gate = typedGate;
    let verdict: MarketingGateVerdict;
    try {
      verdict = await typedGate(key);
    } catch {
      return refuse("held", heldSentence("gate_unanswered"));
    }
    // ⛔ OD61 · no RG COMPLIANCE line for a typed number (see the header) — the masked row says `protected`.
    if (!verdict.ok) return typedRefusal(verdict.skipReason);
    trail.basis = verdict.basis;
    // ⛔ S7 · the ref only for the kinds whose ids hold no digit run — never `ledger:<id>`.
    if (verdict.basis !== "CONSENT") trail.basisRef = verdict.basisRef;
  }

  try {
    // ── 10 · the number's opt-out token: reused, else minted — one per number, for ever ──
    const token = await deps.ensureToken(key);
    if (token === null) return refuse("token_unavailable", target === "typed" ? TEST_TYPED_TOKEN_UNAVAILABLE : TEST_TOKEN_UNAVAILABLE);
    const message = deps.render(template, { variant, name, token, origin });
    if (!message.ok) return refuse("template_invalid", message.problems[0] ?? TEST_TEMPLATE_INVALID);

    // ── 11 · THE ONE GATE AGAIN, then THE ONE SEND — `dispatchSlice` asks it for this number immediately before it ──
    // ⛔ OD61 · a typed number's re-ask writes no RG line either.
    const outcomes = await deps.dispatch(
      [{ ref: campaign.id, msisdn: key, body: message.text }],
      { send: deps.send, gate, window: deps.window, ...(target === "typed" ? { rgAudit: NO_RG_LINE } : {}) },
    );
    const out = outcomes[0];
    const at = deps.now().toISOString();
    // ⛔ A typed test shows the officer the measurement token — the stop link made for that number is never shown.
    const shown = target === "typed" ? dry.text : message.text;
    if (out?.outcome === "handed_over") {
      await floor();
      await record("handed_over", null, { via: live.via, reference: out.reference });
      return { ok: true, outcome: "handed_over", via: live.via, text: shown, maskedTo: to, at, reference: out.reference, target };
    }
    if (out?.outcome === "skipped") {
      return target === "typed" ? typedRefusal(out.skipReason) : refuse(out.skipReason, testGateSentence(out.skipReason));
    }
    if (out?.outcome === "held") {
      // U13 · a window that closed between step 5b and the send held it — the masked row records which, as at step 5b.
      if (out.reason === "quiet_hours" || out.reason === "window_unreadable") trail.held = out.reason;
      return refuse("held", heldSentence(out.reason, sendWindow));
    }
    // ⛔ A transport that lost its reply may still have sent it: unconfirmed, never retried, never "handed over" (OD23).
    // U43b-1 · E3 · dispatch now says so itself (a TRANSPORT result arrives `unconfirmed`, its code kept); this mapping stays
    // as defence in depth, and the masked row still records TRANSPORT for a lost reply and no_answer for no result at all.
    if (out?.outcome === "failed" && out.code !== "TRANSPORT") return refuse("failed", failedSentence(out.code, target));
    await floor();
    await record("unconfirmed", out?.outcome === "failed" || out?.outcome === "unconfirmed" ? (out.code ?? "no_answer") : "no_answer");
    return { ok: false, outcome: "unconfirmed", error: target === "typed" ? TEST_TYPED_UNCONFIRMED : TEST_UNCONFIRMED, text: shown, maskedTo: to, at, target };
  } catch (err) {
    // ⛔ S25 · BY CONSTRUCTION: a typed outcome decided at the gate or after it — a throw included — waits for the floor
    // (a no-op on the own path, and on a typed path whose floor has already been waited).
    await floor();
    throw err;
  }
}
