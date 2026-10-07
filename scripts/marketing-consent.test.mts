/**
 * test:marketing-consent — U7's gate, EXECUTED.
 *
 * ⭐ THE ACCEPT LINE IS THE DESIGN: four mutually exclusive states in ONE run (allowed ·
 * suppressed · no consent · RG), so neither an always-open gate nor an always-closed one can
 * pass. A suite that only ever asserts refusals is satisfied by `return false`.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants the pre-fix shapes IN MEMORY and requires
 * the MATCHING assertion to fire. This file makes no file-writing call of any kind, so it stays
 * outside `test:red-anchors` §4's undeclared count.
 *
 * ⚠️ THE MODEL IS PROVEN FAITHFUL BEFORE IT IS USED TO PLANT ANYTHING. `gateWithDefect({})` —
 * the variant with no defect set — is asserted to agree with the shipped gate on every fixture.
 * Without that, a red case going red would be evidence about the model, not about the gate.
 *
 * Run:  npm run test:marketing-consent
 * Red:  npm run red:marketing-consent
 */
import {
  mayReceiveMarketingSms, userPhoneKeyFor, marketingAge, MARKETING_YOUNG_ADULT_AGE,
  marketingToggleState, recordPlayerMarketingChoice, isPersonCreatedSuppression,
} from "../src/lib/server/marketing/consent.ts";
import type { MarketingGateVerdict, MarketingSkipReason, MarketingToggleState, PlayerMarketingChoice } from "../src/lib/server/marketing/consent.ts";
import { marketingRgStanding } from "../src/lib/server/marketing/rg.ts";
import { appendMarketingConsent, marketingConsentWording } from "../src/lib/server/marketing/consent-ledger.ts";
import { db } from "../src/lib/server/store.ts";
import type { StoredUser, StoredResponsibleGambling, StoredKyc, MessagingLocale, SuppressionReason, StoredSuppression } from "../src/lib/server/store.ts";
import { toMsisdn255 } from "../src/lib/phone-normalize.ts";
import { parseTzNumber } from "../src/lib/tz-msisdn.ts";
import { ageOn, MIN_AGE_YEARS } from "../src/lib/id-documents.ts";
import { isFinalRefusal } from "../src/lib/kyc-refusal.ts";
import { SMS_CONSENT_WORDINGS, isSmsConsentWording } from "../src/lib/marketing/consent-wording.ts";
import { dict } from "../src/lib/i18n-dict.ts";
import { selfExclusionStanding, selfExclusionStandingOf, selfExclude, coolOff } from "../src/lib/server/responsible-gambling.ts";
import { dispatchSlice, liveSendWindow, MARKETING_RG_SUPPRESSED_ACTION } from "../src/lib/server/marketing/dispatch.ts";
import { sendWindowUnreadable } from "../src/lib/marketing/window.ts";
import type { SendWindowState } from "../src/lib/marketing/window.ts";
// U13 · every slice this suite drives is handed a FIXED window (ENGINE-SPEC §5 rule 9) — green at any clock.
import { ALWAYS_OPEN, ALWAYS_CLOSED } from "./lib/send-window.mts";
import type { SliceRecipient, SliceOutcome, SliceDeps } from "../src/lib/server/marketing/dispatch.ts";
// U43b-1 · the hooks' own shapes — U9.15–U9.21 drive `prepare` and `beforeSend`.
import type { SliceMeta, SlicePrepared, SliceCleared, MarketingGateAllow } from "../src/lib/server/marketing/dispatch.ts";
import { mintOptOutToken, stopMarketing } from "../src/lib/server/marketing/optout-service.ts";
import * as optoutService from "../src/lib/server/marketing/optout-service.ts";
import { getAuditForTargetsDurable } from "../src/lib/server/audit.ts";
import type { SmsOutbound, SmsBatchOutcome } from "../src/lib/server/sms.ts";
import { formatHeldUntil } from "../src/app/profile/notifications/held-until.ts";
import { EAT_OFFSET_MS } from "../src/lib/eat-day.ts";
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";
import { REAL_BASIS, assertConsentBasis, basisModel, basisCases } from "./marketing-consent/consent-basis.mts";
// U33a-G · the licence decision table, run over one seeded world with the record closed and open.
import { REAL_LICENCE, assertLicenceBasis, licenceGateWithDefect, licenceCases } from "./marketing-consent/licence-basis.mts";

/* ⛔ FAILURE IS THE DEFAULT, SET BEFORE THE FIRST `await`. A suite whose verdict is written only
 * at the end scores GREEN when a promise never settles or the process exits early. */
process.exitCode = 1;

const PROVE_RED = process.argv.includes("--prove-red");

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  if (c) pass++; else { fail++; failed.push(l); }
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};

type Gate = (msisdn: string, now?: Date) => Promise<MarketingGateVerdict>;

/** ⭐ A sentence the gate COUNTS (OQ11) — the SW profile sentence, pinned. Fixture consents use it
 *  so "consented" means what the gate now requires. */
const PINNED_SW = SMS_CONSENT_WORDINGS.find((w) => w.site === "PROFILE" && w.locale === "SW")!.wording;
/** ⛔ The pre-2026-09-26 sign-up sentence — it never named SMS, so it no longer counts. */
const OLD_SIGNUP_SW = "Nipe matangazo (hiari).";

/* ══ FIXTURES ═══════════════════════════════════════════════════════════════════════════════
 * Every run takes its OWN block of numbers: the memory store is a process-global map, so a red
 * case reusing the green case's numbers would be asserting against rows the previous run left
 * behind — and a suite reading another run's state is not measuring what it names. */
let seq = 0;
const phoneFor = (run: number, idx: number): string => `07${String(10000000 + run * 100 + idx)}`;

function makeUser(id: string, phoneE164: string, over: Partial<StoredUser>): StoredUser {
  const now = new Date().toISOString();
  return {
    id, phoneE164,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null,
    dob: "1990-01-01", region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
    ...over,
  };
}

const rgRow = (userId: string, selfExclusionUntil: string | null, patch: Partial<StoredResponsibleGambling> = {}): StoredResponsibleGambling => ({
  userId,
  dailyDepositLimit: null, weeklyDepositLimit: null, monthlyDepositLimit: null,
  dailyLossLimit: null, sessionTimeLimitMin: null, realityCheckIntervalMin: 60,
  selfExclusionUntil, coolingOffUntil: null,
  selfExclusionStartedAt: selfExclusionUntil, coolingOffStartedAt: null,
  pendingIncreaseTo: null, pendingIncreaseEffectiveAt: null,
  pendingWeeklyIncreaseTo: null, pendingWeeklyIncreaseEffectiveAt: null,
  pendingMonthlyIncreaseTo: null, pendingMonthlyIncreaseEffectiveAt: null,
  ...patch,
} as StoredResponsibleGambling);
const DAY = 86400_000;
const daysFromNow = (d: number) => new Date(Date.now() + d * DAY).toISOString();
/** Two human acts never share a millisecond, but two in-memory writes can: the ledger orders by
 *  `createdAt`, then by a RANDOM id, so a stop and an ON stamped in one millisecond make "latest" a coin toss. */
const nextMillisecond = () => new Promise<void>((resolve) => setTimeout(resolve, 5));
/** A date of birth `n` whole years (and a fortnight) ago, as registration stores it: `YYYY-MM-DD`. */
const bornYearsAgo = (n: number): string => {
  const d = new Date(Date.now() - 14 * DAY);
  d.setUTCFullYear(d.getUTCFullYear() - n);
  return d.toISOString().slice(0, 10);
};

type Fixtures = Record<string, string>;

/** Seed one self-contained world and hand back the phone number for each case. */
async function seed(run: number): Promise<Fixtures> {
  const p = (i: number) => phoneFor(run, i);
  const consent = async (phone: string, status: "GIVEN" | "WITHDRAWN", when: string, wording = PINNED_SW) =>
    Promise.resolve(db.messagingConsent.create({
      id: `c${run}-${seq++}`, channel: "SMS", identifier: toMsisdn255(phone), category: "MARKETING",
      status, source: "IMPORT", wording, locale: "SW",
      evidence: "fixture", recordedBy: null, createdAt: when,
    }));
  /** ⭐ Since D3 a player's "yes" is the toggle AND an SMS-wording GIVEN row, so a player seeded with the
   *  toggle ON gets that row too — dated long before every break below, so a later row still decides.
   *  `noLedger` seeds the pre-U6 shape: the toggle alone. */
  const mk = async (phone: string, over: Partial<StoredUser>, seUntil?: string | null, rgPatch: Partial<StoredResponsibleGambling> = {}, opts: { noLedger?: boolean } = {}) => {
    const id = `u${run}-${seq++}`;
    // ⭐ Stored the way registration really stores it: `tzPhone` yields `+255…`, WITH the plus.
    await Promise.resolve(db.user.create(makeUser(id, `+${toMsisdn255(phone)}`, over)));
    if (seUntil !== undefined) await Promise.resolve(db.responsible.upsert(rgRow(id, seUntil, rgPatch)));
    if (over.marketingOptIn === true && !opts.noLedger) await consent(phone, "GIVEN", "2024-06-01T00:00:00.000Z");
    return id;
  };
  const kycRow = async (userId: string, patch: Partial<StoredKyc>) => Promise.resolve(db.kyc.upsert({
    id: `k${run}-${seq++}`, userId, status: "APPROVED", rejectReason: null, rejectNote: null,
    fullName: null, dob: null, documents: [], reviewerId: null, reviewedAt: null, submittedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", ...patch,
  } as StoredKyc));

  // A · a consenting player — ⭐ deliberately given NO ResponsibleGambling row
  const consentingId = await mk(p(1), { marketingOptIn: true });
  // B · a consenting player who is ALSO suppressed — the order case
  await mk(p(2), { marketingOptIn: true });
  await Promise.resolve(db.suppression.create({
    id: `s${run}-${seq++}`, channel: "SMS", identifier: toMsisdn255(p(2)), category: "MARKETING",
    reason: "WITHDRAWN", evidence: "fixture", recordedBy: null, createdAt: "2026-01-01T00:00:00.000Z",
    // U8 · a suppression that has NOT been lifted — the row is still refusing.
    liftedAt: null, liftedReason: null,
  }));
  // C · a stranger with no ledger row at all
  // D · a contact who consented
  await consent(p(4), "GIVEN", "2026-01-01T00:00:00.000Z");
  // E · a contact who consented and then withdrew
  await consent(p(5), "GIVEN", "2026-01-01T00:00:00.000Z");
  await consent(p(5), "WITHDRAWN", "2026-02-01T00:00:00.000Z");
  // F · a player currently serving a self-exclusion
  await mk(p(6), { marketingOptIn: true }, new Date(Date.now() + 30 * 86400_000).toISOString());
  // G · ⭐ a player whose 24-hour self-exclusion ELAPSED A YEAR AGO (D9)
  await mk(p(7), { marketingOptIn: true }, new Date(Date.now() - 365 * 86400_000).toISOString());
  // H · a player who turned the toggle off
  await mk(p(8), { marketingOptIn: false });
  // I · a closed account that still carries consent
  await mk(p(9), { marketingOptIn: true, status: "CLOSED" });
  // J · ⭐ a player who said no, with an imported GIVEN ledger row trying to speak over them
  await mk(p(10), { marketingOptIn: false });
  await consent(p(10), "GIVEN", "2026-03-01T00:00:00.000Z");

  // ── U10 · cooling-off and the §5.6 order ───────────────────────────────────────────────────
  // K · a player ON a break (the status `coolOff` really writes, and a timer still running)
  await mk(p(11), { marketingOptIn: true, status: "COOLED_OFF" }, null, { coolingOffUntil: daysFromNow(2) });
  // L · ⭐ a break that ended, then a consent given AFTER it — the lift must exist
  await mk(p(12), { marketingOptIn: true, status: "COOLED_OFF" }, null, { coolingOffUntil: daysFromNow(-10) });
  await consent(p(12), "GIVEN", daysFromNow(-5));
  // M · ⭐ a break that ended yesterday, and the only consent PREDATES it (D9's shape, for breaks)
  await mk(p(13), { marketingOptIn: true, status: "COOLED_OFF" }, null, { coolingOffUntil: daysFromNow(-1) });
  await consent(p(13), "GIVEN", daysFromNow(-30));
  // N · 🔴 a consenting player whose pending deposit-limit rise has COME DUE — the write U7's fix missed
  const maturedId = await mk(p(14), { marketingOptIn: true }, null,
    { dailyDepositLimit: 1_000, pendingIncreaseTo: 5_000, pendingIncreaseEffectiveAt: daysFromNow(-1) });
  // O · a player SERVING a self-exclusion whose toggle is OFF — §5.6 asks consent first
  await mk(p(15), { marketingOptIn: false, status: "SELF_EXCLUDED" }, daysFromNow(30));

  // ── U11 · age, and U12 · the under-25 promise ──────────────────────────────────────────────
  // P · a consenting player aged 16 — registration refuses this, so it is a typed-false date of birth
  await mk(p(16), { marketingOptIn: true, dob: bornYearsAgo(16) });
  // Q · a consenting player with NO date of birth (erasure nulls it; one dev seed writes null)
  await mk(p(17), { marketingOptIn: true, dob: null });
  // R · ⭐ aged 20, took a break, the break ended, consented again after it — U10 lifts, U12 must not
  await mk(p(18), { marketingOptIn: true, status: "COOLED_OFF", dob: bornYearsAgo(20) }, null, { coolingOffUntil: daysFromNow(-30) });
  await consent(p(18), "GIVEN", daysFromNow(-10));
  // S · the SAME history at 30 — the control that the rule is the AGE BAND, not the history
  await mk(p(19), { marketingOptIn: true, status: "COOLED_OFF", dob: bornYearsAgo(30) }, null, { coolingOffUntil: daysFromNow(-30) });
  await consent(p(19), "GIVEN", daysFromNow(-10));
  // T · aged 20 with NO history — the control that under 25 alone is not refused (the promise is
  //     "under 25 IN a vulnerability segment", not "under 25")
  await mk(p(20), { marketingOptIn: true, dob: bornYearsAgo(20) });

  // ── D3 / OQ11 · the consent must NAME SMS ───────────────────────────────────────────────────
  // U · ⭐ toggle ON, and the latest row is the OLD sign-up sentence ("Nipe matangazo") — never named SMS
  await mk(p(21), { marketingOptIn: true }, undefined, {}, { noLedger: true });
  await consent(p(21), "GIVEN", "2026-09-20T00:00:00.000Z", OLD_SIGNUP_SW);
  // V · toggle ON and NO ledger row at all — a pre-U6 opt-in
  await mk(p(22), { marketingOptIn: true }, undefined, {}, { noLedger: true });
  // W · toggle ON but the latest row is a WITHDRAWAL — the ledger's no is heard
  await mk(p(23), { marketingOptIn: true });
  await consent(p(23), "WITHDRAWN", "2026-02-01T00:00:00.000Z");

  // ── D5 · the identity check, cross-checked ─────────────────────────────────────────────────
  // X · ⭐ an ADULT account date of birth, but KYC refused the document as UNDERAGE (the wallet is frozen,
  //     User.status and User.dob are untouched — exactly what kyc-service writes)
  const kycUnderageId = await mk(p(24), { marketingOptIn: true, dob: "1990-01-01" });
  await kycRow(kycUnderageId, { status: "REJECTED", rejectReason: "UNDERAGE" });
  // Y · a final SANCTIONED refusal on an ACTIVE account
  const kycSanctionedId = await mk(p(25), { marketingOptIn: true });
  await kycRow(kycSanctionedId, { status: "REJECTED", rejectReason: "SANCTIONED" });
  // Z · a final DUPLICATE_IDENTITY refusal — possibly the second account of somebody excluded on the first
  const kycDuplicateId = await mk(p(26), { marketingOptIn: true });
  await kycRow(kycDuplicateId, { status: "REJECTED", rejectReason: "DUPLICATE_IDENTITY" });
  // AA · CONTROL — a RECOVERABLE refusal (an unreadable photo) is not a refusal of the person
  const kycBlurryId = await mk(p(27), { marketingOptIn: true });
  await kycRow(kycBlurryId, { status: "REJECTED", rejectReason: "BLURRY" });
  // AB · CONTROL — a final refusal an officer RE-OPENED (`restartedSubmission`: IN_PROGRESS, no reason, no dob)
  const kycReopenedId = await mk(p(28), { marketingOptIn: true });
  await kycRow(kycReopenedId, { status: "IN_PROGRESS", rejectReason: null, dob: null });
  // AC · the account says 36, the identity document says 17 — the YOUNGER governs
  const kycDocMinorId = await mk(p(29), { marketingOptIn: true, dob: "1990-01-01" });
  await kycRow(kycDocMinorId, { status: "APPROVED", dob: bornYearsAgo(17) });
  // AD · the account says 30, the document says 20, and a break is on record — the under-25 promise reads the document
  const kycDocYoungId = await mk(p(30), { marketingOptIn: true, status: "COOLED_OFF", dob: bornYearsAgo(30) }, null, { coolingOffUntil: daysFromNow(-30) });
  await consent(p(30), "GIVEN", daysFromNow(-10));
  await kycRow(kycDocYoungId, { status: "APPROVED", dob: bornYearsAgo(20) });
  // AE · CONTROL — the account says 17 and an OLDER document never rescues it
  const kycDocOlderId = await mk(p(31), { marketingOptIn: true, dob: bornYearsAgo(17) });
  await kycRow(kycDocOlderId, { status: "APPROVED", dob: "1980-01-01" });

  // ── EAT-midnight boundaries, driven through the gate with a fixed clock ─────────────────────
  // AF · turns 18 on 2026-03-15 — in Dar es Salaam that is 2026-03-14T21:00:00Z
  await mk(p(32), { marketingOptIn: true, dob: "2008-03-15" });
  // AG · turns 25 on 2026-03-15, with a break (ended 2025-01-01) and a consent after it — the under-25 line
  await mk(p(33), { marketingOptIn: true, dob: "2001-03-15" }, null, { coolingOffUntil: "2025-01-01T00:00:00.000Z" });
  await consent(p(33), "GIVEN", "2025-02-01T00:00:00.000Z");

  // ── the number itself (gate step 0, via the numbering plan) ─────────────────────────────────
  // AH · ⭐ a consenting PLAYER on NDC 064 — `tzPhone` accepts it, the length rule passed it, and a send
  //      to it is billed and never arrives (tz-msisdn.ts: not operational)
  const ndc64 = `064${String(1000000 + run * 100 + 1).padStart(7, "0")}`;
  await mk(ndc64, { marketingOptIn: true });

  return {
    consenting: p(1), suppressed: p(2), stranger: p(3), contactGiven: p(4), contactWithdrawn: p(5),
    serving: p(6), minimumServed: p(7), toggledOff: p(8), closed: p(9), overriddenPlayer: p(10),
    onBreak: p(11), breakOverReconsented: p(12), breakOverStale: p(13), matured: p(14), servingNoConsent: p(15),
    minor: p(16), noDob: p(17), youngWithHistory: p(18), olderWithHistory: p(19), youngNoHistory: p(20),
    oldWording: p(21), noLedger: p(22), ledgerWithdrawn: p(23),
    kycUnderage: p(24), kycSanctioned: p(25), kycDuplicate: p(26), kycBlurry: p(27), kycReopened: p(28),
    kycDocMinor: p(29), kycDocYoung: p(30), kycDocOlder: p(31),
    turns18: p(32), turns25: p(33), ndc64,
    consentingId, maturedId,
  };
}

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════ */
async function runAssertions(gate: Gate, f: Fixtures, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  const verdict = async (phone: string) => gate(phone);
  const reasonOf = (v: MarketingGateVerdict): string => (v.ok ? "ALLOWED" : v.skipReason);
  const expect = async (label: string, phone: string, want: "ALLOWED" | MarketingSkipReason) => {
    const v = await verdict(phone);
    ok(p(label), reasonOf(v) === want, `got ${reasonOf(v)}${v.ok ? "" : ` — ${v.detail}`}`);
    return v;
  };

  // ── the four mutually exclusive states the Accept line demands, in one run ───────────────
  await expect("1 · a consenting player is ALLOWED", f.consenting, "ALLOWED");
  await expect("2 · ⛔ a SUPPRESSED number is refused even though its consent is valid — suppression is asked FIRST (OD11)", f.suppressed, "suppressed");
  await expect("3 · a stranger with no ledger row is refused — silence is never permission (OD7)", f.stranger, "no_consent");
  await expect("4 · a player serving a self-exclusion is refused", f.serving, "rg_self_excluded");

  // ── the ledger branch ───────────────────────────────────────────────────────────────────
  await expect("5 · a contact who consented is refused ONLY on age — no 18+ attestation exists until U33 (OD14), and none is inferred", f.contactGiven, "age_unknown");
  await expect("6 · a contact who withdrew is refused, and the reason says so", f.contactWithdrawn, "consent_withdrawn");

  // ── the player branch ───────────────────────────────────────────────────────────────────
  await expect("7 · ⭐ a 24-hour self-exclusion that ELAPSED A YEAR AGO is still refused (D9 — the period ending is not the person asking)", f.minimumServed, "rg_self_excluded");
  await expect("8 · a player whose own toggle is off is refused", f.toggledOff, "no_consent");
  await expect("9 · a CLOSED account is refused on status even though its toggle is on", f.closed, "account_status");
  await expect("10 · ⛔ an imported GIVEN row can NEVER speak over a player's own no (OD10)", f.overriddenPlayer, "no_consent");

  await expect("11 · an unusable number is refused before it can become a billed send", "123", "bad_msisdn");

  // ── ⭐ THE FORMAT BRIDGE, PINNED IN BOTH DIRECTIONS ──────────────────────────────────────
  // `tzPhone` stores `+255…`; the marketing key is bare `255…`. A gate that looks a player up
  // with the marketing key finds NOBODY, treats the whole player base as strangers, and hands
  // every one of them to the ledger branch — silently, with no error anywhere.
  const bare = toMsisdn255(f.consenting);
  ok(p("12 · ⭐ the BARE marketing key finds no user — the trap is real, not hypothetical"),
    (await Promise.resolve(db.user.findByPhone(bare))) === null, `looked up ${bare}`);
  ok(p("12b · ⭐ …and the bridged key finds the player"),
    (await Promise.resolve(db.user.findByPhone(userPhoneKeyFor(bare)))) !== null, `looked up ${userPhoneKeyFor(bare)}`);

  // ── the Accept line, asserted as a property rather than hoped for ────────────────────────
  const seen = new Set<string>();
  for (const phone of [f.consenting, f.suppressed, f.stranger, f.serving]) seen.add(reasonOf(await verdict(phone)));
  ok(p("13 · ACCEPT · four MUTUALLY EXCLUSIVE outcomes in one run — neither an always-open nor an always-closed gate can pass this"),
    seen.size === 4, `saw ${[...seen].sort().join(", ")}`);

  // ── 🔴 ASKING THE QUESTION MUST NOT WRITE ────────────────────────────────────────────────
  // `selfExclusionStanding` → `getRgSettings` ends in `db.responsible.upsert(fresh)` for any user
  // with no row, so the obvious gate CREATES a ResponsibleGambling row per recipient. At §3c's
  // 150,000-recipient audience that is 150,000 rows written by a decision not to message anyone.
  // The consenting fixture is seeded with NO rg row, and the gate has already run on it above.
  ok(p("14 · 🔴 the gate created NO ResponsibleGambling row — deciding must not write (150k recipients = 150k rows)"),
    (await Promise.resolve(db.responsible.get(f.consentingId))) === null,
    "a row here means the gate writes once per recipient");

  // ── U10 · the RG STANDING, through the gate ─────────────────────────────────────────────
  await expect("15 · a player ON a break is refused with its own reason, not as `account_status`", f.onBreak, "rg_cooling_off");
  await expect("16 · ⭐ a break that ENDED does not reopen marketing by itself — the consent on file predates it (D9, breaks)", f.breakOverStale, "rg_cooling_off");
  await expect("17 · ⭐ a break that ended, then a consent AFTER it: ALLOWED — the COOLED_OFF status nothing ever clears is admitted only then", f.breakOverReconsented, "ALLOWED");
  const matured = await verdict(f.matured);
  const maturedRow = await Promise.resolve(db.responsible.get(f.maturedId));
  ok(p("18 · 🔴 a row whose pending limit rise has COME DUE is not rewritten by the gate — the write U7's fix missed"),
    maturedRow?.pendingIncreaseTo === 5_000 && maturedRow?.dailyDepositLimit === 1_000,
    `verdict ${reasonOf(matured)} · pending=${maturedRow?.pendingIncreaseTo} daily=${maturedRow?.dailyDepositLimit}`);
  await expect("19 · §5.6 ORDER — a self-excluded player whose toggle is off is refused on CONSENT, which is asked first (the costly RG step never runs)", f.servingNoConsent, "no_consent");

  // ── U11 · AGE — adult, minor, unknown: three fixtures, three outcomes (the Accept line) ─────
  await expect("20 · a consenting player aged 16 is refused as a minor", f.minor, "age_minor");
  await expect("21 · ⭐ a consenting player with NO date of birth is refused as age_unknown — never treated as adult", f.noDob, "age_unknown");
  const ages = new Set<string>();
  for (const phone of [f.consenting, f.minor, f.noDob]) ages.add(reasonOf(await verdict(phone)));
  ok(p("22 · ACCEPT (U11) · adult, minor and unknown give THREE different outcomes in one run"), ages.size === 3, `saw ${[...ages].sort().join(", ")}`);

  // ── U12 · the published promise: under 25 IN a vulnerability segment ───────────────────────
  await expect("23 · ⭐ aged 20 with a break on record is refused even after re-consenting — U10's lift does not reach the under-25 promise", f.youngWithHistory, "rg_under25_history");
  await expect("24 · ⚠️ CONTROL — the SAME history at 30 is allowed: the rule is the age band, not the history", f.olderWithHistory, "ALLOWED");
  await expect("25 · ⚠️ CONTROL — aged 20 with NO history is allowed: the promise is 'under 25 in a segment', not 'under 25'", f.youngNoHistory, "ALLOWED");

  // ── D3 / OQ11 · a player's "yes" must be one that NAMED SMS ─────────────────────────────────
  const old = await expect("26 · ⭐ OQ11 · toggle ON under the OLD wording ('Nipe matangazo') is refused as no_consent — it never named SMS", f.oldWording, "no_consent");
  ok(p("26b · …and the record says why, in the words D3 chose"), !old.ok && old.detail === "consent predates the SMS wording", old.ok ? "" : old.detail);
  await expect("27 · ⭐ OQ11 · toggle ON with NO ledger row (a pre-U6 opt-in) is refused — the toggle alone is no longer consent", f.noLedger, "no_consent");
  await expect("28 · toggle ON but the ledger's latest word is a WITHDRAWAL — refused as consent_withdrawn", f.ledgerWithdrawn, "consent_withdrawn");

  // ── D5 · the identity check, cross-checked ───────────────────────────────────────────────
  await expect("29 · 🔴 D5 · an adult account date of birth, but KYC refused the document as UNDERAGE — age_minor", f.kycUnderage, "age_minor");
  await expect("30 · D5 · a final SANCTIONED refusal refuses on account status, whatever User.status reads", f.kycSanctioned, "account_status");
  await expect("31 · D5 · a final DUPLICATE_IDENTITY refusal refuses on account status", f.kycDuplicate, "account_status");
  await expect("32 · ⚠️ CONTROL — a RECOVERABLE refusal (a blurry photo) is not a refusal of the person: ALLOWED", f.kycBlurry, "ALLOWED");
  await expect("33 · ⚠️ CONTROL — a final refusal an officer RE-OPENED is marketable again: ALLOWED", f.kycReopened, "ALLOWED");
  await expect("34 · ⭐ D5 · the account says 36, the identity document says 17 — the YOUNGER age governs: age_minor", f.kycDocMinor, "age_minor");
  await expect("35 · D5 · the under-25 promise reads the document too — account 30, document 20, a break on record", f.kycDocYoung, "rg_under25_history");
  await expect("36 · ⚠️ CONTROL — an OLDER document never rescues a minor account: age_minor", f.kycDocOlder, "age_minor");

  // ── the EAT-midnight boundaries, through the gate, with a fixed clock ──────────────────────
  const T2059 = new Date("2026-03-14T20:59:00.000Z"); // 23:59 in Dar es Salaam, the day BEFORE the birthday
  const T2100 = new Date("2026-03-14T21:00:00.000Z"); // 00:00 in Dar es Salaam, the birthday
  const at = async (label: string, phone: string, now: Date, want: "ALLOWED" | MarketingSkipReason) => {
    const v = await gate(phone, now);
    ok(p(label), reasonOf(v) === want, `got ${reasonOf(v)}${v.ok ? "" : ` — ${v.detail}`}`);
  };
  await at("37 · ⭐ 17 years 364 days (20:59Z, 23:59 EAT) is a minor", f.turns18, T2059, "age_minor");
  await at("37b · ⭐ …and one minute later it is the 18th birthday IN TANZANIA (21:00Z): ALLOWED", f.turns18, T2100, "ALLOWED");
  await at("38 · ⭐ 24 years 364 days with a break on record is still under 25 (20:59Z)", f.turns25, T2059, "rg_under25_history");
  await at("38b · ⭐ …and at 00:00 EAT on the 25th birthday the promise ends: ALLOWED", f.turns25, T2100, "ALLOWED");

  // ── gate step 0 · the number, judged by the numbering plan ─────────────────────────────────
  const nat = toMsisdn255(f.consenting).slice(3);
  for (const [label, form] of [
    ["39 · '+255 712 345 678' with spaces", `+255 ${nat.slice(0, 3)} ${nat.slice(3, 6)} ${nat.slice(6)}`],
    ["39b · '00255…' (the international prefix)", `00255${nat}`],
    ["39c · bare '255…'", `255${nat}`],
    ["39d · nine national digits", nat],
  ] as const) {
    await expect(`${label} reaches the SAME consenting player: ALLOWED`, form, "ALLOWED");
  }
  await expect("40 · ⛔ a Kenyan +254… is refused before it can be billed", "+254712345678", "bad_msisdn");
  await expect("40b · ⭐ vb3 · '+255 0712…' — the trunk zero written after the country code — reaches the SAME consenting player: ALLOWED, under the right 255… key", `+255 0${nat}`, "ALLOWED");
  await expect("40b2 · ⛔ vb3 · …and the same spelling of a SUPPRESSED number is refused as suppressed — its stop is read under the right key, never a wrong one", `+255 0${toMsisdn255(f.suppressed).slice(3)}`, "suppressed");
  await expect("40c · ⛔ a Dar es Salaam landline is refused — it cannot receive an SMS", "255221234567", "bad_msisdn");
  await expect("40d · ⭐ a CONSENTING PLAYER on NDC 064 is refused — tzPhone accepts it, but it has no live network (billed, never delivered)", f.ndc64, "bad_msisdn");
}

/* ══ THE MODEL USED FOR PLANTING ════════════════════════════════════════════════════════════
 * ⚠️ This is the gate's shape written out so ONE step at a time can be made wrong. It is not
 * imported by anything and never ships. With no flags set it is asserted to agree with the
 * shipped gate on every fixture, so a red case's failure is attributable to the flag. */
type Defect = {
  swapOrder?: boolean;              // consent asked before suppression (OD11 broken)
  noBridge?: boolean;               // the `+` never added — every player becomes a stranger
  lockoutSemantics?: boolean;       // RG read the way `isLockedOut` reads it: only a RUNNING period refuses (D9)
  writesRgRow?: boolean;            // U7's first shape: `selfExclusionStanding` asked unguarded, so asking WRITES
  readsThroughWriter?: boolean;     // U7's fix: guarded for a MISSING row, but an existing row still goes through the writer
  ledgerOverridesPlayer?: boolean;  // an imported row speaks over a player's own no (OD10)
  rgBeforeConsent?: boolean;        // U7's order — RG asked before consent (§5.6 reversed, and the harm scan runs on everybody)
  breakNeverAdmitted?: boolean;     // pre-U10: COOLED_OFF refused for ever as `account_status`, whatever the player later says
  nullDobIsAdult?: boolean;         // U11's RED: a missing date of birth treated as adult
  contactAgeAssumed?: boolean;      // pre-U11: a consenting contact marketed with no 18+ attestation
  under25Ignored?: boolean;         // pre-U12: the published under-25 promise has no code behind it
  // ── 2026-09-26 (D3, D5, the gate audit) ──
  toggleAloneConsents?: boolean;    // OD8's old premise: the boolean alone is the player's consent
  anyWordingCounts?: boolean;       // a GIVEN row counts whatever it says — "Nipe matangazo" qualifies (OQ11 undone)
  kycIgnored?: boolean;             // pre-D5: the identity check's final refusals are never read
  sanctionedPasses?: boolean;       // D5 half-done: UNDERAGE read, SANCTIONED / DUPLICATE_IDENTITY not
  kycDobIgnored?: boolean;          // D5 half-done: the document's date of birth never compared
  ageOffByOne?: boolean;            // `years + 1 >= 18` — a 17-year-old admitted
  utcAge?: boolean;                 // age on the UTC date, not Tanzania's — the birthday arrives 3 hours late
  under25OffByOne?: boolean;        // the under-25 line drawn at 24
  lengthOnlyMsisdn?: boolean;       // pre-audit step 0: "twelve digits or more" is a Tanzanian mobile
  // ── 2026-10-03 (vb3) ──
  trunkZeroRefused?: boolean;       // pre-vb3 step 0: "+255 0712…" read as a 13-digit typo — the same person refused as too_long
  moneyRailKey?: boolean;           // the key taken from toMsisdn255, the money rail vb3 left alone: "+255 0712…" read under 2550712…
};

function gateWithDefect(d: Defect): Gate {
  return async (msisdn, now = new Date()) => {
    let identifier: string;
    if (d.lengthOnlyMsisdn) {
      identifier = toMsisdn255(msisdn);
      if (!identifier || identifier.length < 12) return { ok: false, skipReason: "bad_msisdn", detail: "unusable" };
    } else {
      const parsed = parseTzNumber(msisdn);
      if (parsed.verdict !== "ok" || !parsed.msisdn) return { ok: false, skipReason: "bad_msisdn", detail: parsed.verdict };
      // vb3's two plants: the pre-vb3 refusal of the trunk-zero spelling, and a key rewritten by the money rail.
      if (d.trunkZeroRefused && /^(?:00)?2550\d{9}$/.test(msisdn.replace(/\D/g, ""))) return { ok: false, skipReason: "bad_msisdn", detail: "too_long" };
      identifier = d.moneyRailKey ? toMsisdn255(msisdn) : parsed.msisdn;
    }
    const key = { channel: "SMS" as const, identifier, category: "MARKETING" as const };

    const askSuppression = async (): Promise<MarketingGateVerdict | null> => {
      const s = await Promise.resolve(db.suppression.find(key));
      return s ? { ok: false, skipReason: "suppressed", detail: "suppressed" } : null;
    };
    // The RG step, or one of the three shapes this platform has shipped or nearly shipped instead of it.
    type RgAnswer = { refusal: MarketingGateVerdict | null; coolingOffEnded: boolean; rgHistory: boolean };
    const askRg = async (user: StoredUser): Promise<RgAnswer> => {
      if (d.writesRgRow || d.readsThroughWriter) {
        const hasRow = (await Promise.resolve(db.responsible.get(user.id))) !== null;
        const rg = (d.writesRgRow || hasRow) ? await selfExclusionStanding(user.id) : ({ state: "none" } as const);
        if (rg.state === "serving" || rg.state === "minimum_served") return { refusal: { ok: false, skipReason: "rg_self_excluded", detail: rg.state }, coolingOffEnded: false, rgHistory: true };
      }
      if (d.lockoutSemantics) {
        const row = await Promise.resolve(db.responsible.get(user.id));
        if (selfExclusionStandingOf(row?.selfExclusionUntil ?? null, now.getTime()).state === "serving") return { refusal: { ok: false, skipReason: "rg_self_excluded", detail: "serving" }, coolingOffEnded: false, rgHistory: true };
        const co = row?.coolingOffUntil ? Date.parse(row.coolingOffUntil) : NaN;
        if (co > now.getTime()) return { refusal: { ok: false, skipReason: "rg_cooling_off", detail: "on a break" }, coolingOffEnded: false, rgHistory: true };
        return { refusal: null, coolingOffEnded: !Number.isNaN(co), rgHistory: Boolean(row?.selfExclusionUntil || row?.coolingOffUntil) };
      }
      const rg = await marketingRgStanding(user, identifier, now.getTime());
      if (!rg.ok) return { refusal: { ok: false, skipReason: rg.skipReason, detail: rg.detail }, coolingOffEnded: false, rgHistory: true };
      return { refusal: null, coolingOffEnded: rg.coolingOffEnded, rgHistory: rg.rgHistory };
    };
    /** The age arithmetic, each defect plantable on its own. */
    const ageOf = (dob: string | null | undefined) => {
      if (!d.utcAge) return marketingAge(dob, now);
      if (!dob) return { band: "unknown" as const, years: null };
      const years = ageOn(String(dob).slice(0, 10), new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`));
      return Number.isFinite(years) ? { band: years >= MIN_AGE_YEARS ? "adult" as const : "minor" as const, years } : { band: "unknown" as const, years: null };
    };
    const askConsent = async (): Promise<MarketingGateVerdict | null> => {
      const user = await Promise.resolve(db.user.findByPhone(d.noBridge ? identifier : `+${identifier}`));
      if (user) {
        const consentRefusal = async (): Promise<MarketingGateVerdict | null> => {
          const l = await Promise.resolve(db.messagingConsent.latestFor(key));
          if (user.marketingOptIn !== true) {
            if (!d.ledgerOverridesPlayer) return { ok: false, skipReason: "no_consent", detail: "toggle off" };
            return l?.status === "GIVEN" ? null : { ok: false, skipReason: "no_consent", detail: "toggle off" };
          }
          if (d.toggleAloneConsents) return null;
          if (!l) return { ok: false, skipReason: "no_consent", detail: "no row" };
          if (l.status !== "GIVEN") return { ok: false, skipReason: "consent_withdrawn", detail: "withdrawn" };
          if (!d.anyWordingCounts && !isSmsConsentWording(l.wording)) return { ok: false, skipReason: "no_consent", detail: "consent predates the SMS wording" };
          return null;
        };
        let rg: RgAnswer;
        if (d.rgBeforeConsent) {
          rg = await askRg(user);
          if (rg.refusal) return rg.refusal;
          const c = await consentRefusal();
          if (c) return c;
        } else {
          const c = await consentRefusal();
          if (c) return c;
          rg = await askRg(user);
          if (rg.refusal) return rg.refusal;
        }
        // Identity, age, then the under-25 promise — the shipped gate's 2c/2d/2e, each plantable on its own.
        const kyc = d.kycIgnored ? null : await Promise.resolve(db.kyc.findByUserId(user.id));
        const finalRefusal = kyc?.status === "REJECTED" && isFinalRefusal(kyc.rejectReason) ? kyc.rejectReason : null;
        if (finalRefusal === "UNDERAGE") return { ok: false, skipReason: "age_minor", detail: "UNDERAGE" };
        const age = d.nullDobIsAdult && !user.dob ? { band: "adult" as const, years: 30 } : ageOf(user.dob);
        if (age.band === "unknown") return { ok: false, skipReason: "age_unknown", detail: "no dob" };
        const doc = d.kycDobIgnored ? { band: "unknown" as const, years: null } : ageOf(kyc?.dob ?? null);
        const years = doc.band === "unknown" ? (age.years as number) : Math.min(age.years as number, doc.years as number);
        const minor = d.ageOffByOne ? years + 1 < MIN_AGE_YEARS : years < MIN_AGE_YEARS;
        if (minor) return { ok: false, skipReason: "age_minor", detail: "minor" };
        const line = d.under25OffByOne ? MARKETING_YOUNG_ADULT_AGE - 1 : MARKETING_YOUNG_ADULT_AGE;
        if (!d.under25Ignored && years < line && rg.rgHistory) {
          return { ok: false, skipReason: "rg_under25_history", detail: "under 25 with history" };
        }
        if (finalRefusal && !d.sanctionedPasses) return { ok: false, skipReason: "account_status", detail: finalRefusal };
        const statusOk = ["ACTIVE", "PENDING_KYC"].includes(user.status)
          || (user.status === "COOLED_OFF" && rg.coolingOffEnded && !d.breakNeverAdmitted);
        if (!statusOk) return { ok: false, skipReason: "account_status", detail: user.status };
        return { ok: true };
      }
      const latest = await Promise.resolve(db.messagingConsent.latestFor(key));
      if (!latest) return { ok: false, skipReason: "no_consent", detail: "no row" };
      if (latest.status === "WITHDRAWN") return { ok: false, skipReason: "consent_withdrawn", detail: "withdrawn" };
      if (d.contactAgeAssumed) return { ok: true };
      return { ok: false, skipReason: "age_unknown", detail: "no attestation" };
    };

    if (d.swapOrder) {
      const c = await askConsent();
      // ⛔ THE PRE-FIX SHAPE: consent decides first, and only a refusal ever reaches suppression.
      // A withdrawn person still holding last year's consent row therefore sends.
      if (c && c.ok) return c;
      const s = await askSuppression();
      return s ?? (c as MarketingGateVerdict);
    }
    const s = await askSuppression();
    if (s) return s;
    return (await askConsent()) as MarketingGateVerdict;
  };
}

/* ══ U9 · THE LOOP CONTRACT ═════════════════════════════════════════════════════════════════
 * ⭐ WHAT A SEND LOOP MUST DO, asserted on a real two-slice drive. Between slice one and slice two three
 * people change their minds through the REAL acts — an opt-out through U8's `stopMarketing`, a
 * `selfExclude`, a `coolOff` — and none of them may reach the wire in slice two.
 * ⚠️ There is no production loop yet (U43). This contract is written so U43's engine plugs in as another
 * DRIVER and must pass the same assertions; today the driver is `dispatchSlice` called once per slice.
 * The fake wire returns its results in REVERSED order, so a loop that settles by position cannot pass.
 * ⭐ vb3 · one row is WRITTEN '+255 0712…': the wire must be given the gate's own key for it (U9.13), never the row's
 * spelling.
 * ⭐ U13 · every slice here is handed a FIXED window (`scripts/lib/send-window.mts`), so the contract is green at any clock
 * (ENGINE-SPEC §5 rule 9) — and U9.14 is the window's own clause: outside it the slice is held whole, no gate asked.
 * ⭐ U43b-1 · THE ENGINE'S HOOKS (ENGINE-SPEC §4.13 Decision 1 · E1 · E2 · E3), `runHookContract`: U9.15 runs this whole
 * contract again with every row PREPARED (a `prepare` instead of a body, and a `beforeSend` that keeps every row — the
 * engine's shape) and asserts nobody the gate refused was ever prepared; U9.16–U9.21 then drive each hook on the world the
 * contract left behind (X stopped, Y self-excluded, Z on a break). U9.1–U9.13 are untouched: they are what U43b-2's engine
 * must pass as the second driver (§T). */
type Driver = (slices: SliceRecipient[][], between: () => Promise<void>, deps: SliceDeps) => Promise<SliceOutcome[]>;
type Dispatch = (rows: SliceRecipient[], deps: SliceDeps) => Promise<SliceOutcome[]>;

/** The loop U43 will be: slice by slice, the dispatch step asked at the moment of sending. */
const loopOver = (dispatch: Dispatch): Driver => async (slices, between, deps) => {
  const out: SliceOutcome[] = [];
  for (const [i, slice] of slices.entries()) {
    if (i > 0) await between();
    out.push(...await dispatch(slice, deps));
  }
  return out;
};

/** U43b-1 · a fixed `meta` per row, so a carried one can be told from a lost or a mixed-up one. */
const hookMeta = (ref: string): SliceMeta => ({ locale: "SW", segments: 1, bodyLen: 9 + ref.length, token: `tok${ref}`, origin: "account", name: "account" });

/** U43b-1 · the loop with every row PREPARED — a prepare instead of its body, as the engine's slice will hand them — and a
 *  beforeSend that keeps every cleared row. Each prepare makes the row's own text, so every U9 assertion reads the same, and
 *  records the key it was asked under: U9.15 holds that list against the people the gate refused. */
const preparedLoop = (dispatch: Dispatch, asked: string[]): Driver => async (slices, between, deps) =>
  loopOver(dispatch)(
    slices.map((slice) => slice.map((r): SliceRecipient => {
      const text = "body" in r ? r.body : "";
      return {
        ref: r.ref,
        msisdn: r.msisdn,
        prepare: async (key) => {
          asked.push(key);
          return { ok: true, body: text, meta: hookMeta(r.ref) };
        },
      };
    })),
    between,
    { ...deps, beforeSend: async (cleared) => ({ proceed: true, keep: cleared.map((c) => c.ref) }) },
  );

type Wire = { sent: SmsOutbound[]; calls: number; send: SliceDeps["send"] };
function fakeWire(failMsisdn: Set<string>, refused?: SmsBatchOutcome["refused"]): Wire {
  const w: Wire = { sent: [], calls: 0, send: async () => ({ results: [], balanceTzs: null }) };
  w.send = async (messages) => {
    w.calls++;
    if (refused) return { results: [], balanceTzs: null, refused };
    w.sent.push(...messages);
    const results = messages.map((m) => failMsisdn.has(m.to)
      ? { reference: `ref_${m.targetId}`, to: m.to, ok: false, code: "BAD_MSISDN" as const, error: "refused at the wire", targetType: m.targetType, targetId: m.targetId }
      : { reference: `ref_${m.targetId}`, to: m.to, ok: true, targetType: m.targetType, targetId: m.targetId });
    return { results: results.reverse(), balanceTzs: 100 };
  };
  return w;
}

async function seedLoop(run: number) {
  const p = (i: number) => phoneFor(run, i);
  const mkp = async (i: number) => {
    const id = `loop${run}-${i}`;
    await Promise.resolve(db.user.create(makeUser(id, `+${toMsisdn255(p(i))}`, { marketingOptIn: true })));
    // D3 · the toggle AND an SMS-wording GIVEN row — what a consenting player now is.
    await Promise.resolve(db.messagingConsent.create({
      id: `lc${run}-${i}`, channel: "SMS", identifier: toMsisdn255(p(i)), category: "MARKETING",
      status: "GIVEN", source: "PROFILE", wording: PINNED_SW, locale: "SW", evidence: "fixture", recordedBy: null,
      createdAt: "2024-06-01T00:00:00.000Z",
    }));
    await Promise.resolve(db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never));
    return { id, msisdn: toMsisdn255(p(i)) };
  };
  const A = await mkp(1), B = await mkp(2), X = await mkp(3), Y = await mkp(4), Z = await mkp(5), F = await mkp(6), G = await mkp(7);
  // vb3 · H consents like A; its row is WRITTEN with the trunk zero after +255 (U9.13).
  const H = await mkp(8);
  const token = await mintOptOutToken(X.msisdn);
  return { A, B, X, Y, Z, F, G, H, token };
}

type LoopWorld = Awaited<ReturnType<typeof seedLoop>>;

/** The contract, on its own world — which it hands back, so U43b-1's hook clauses can carry on in it. */
async function runLoopContract(driver: Driver, run: number, tag: string): Promise<LoopWorld> {
  const p = (n: string) => `${tag}${n}`;
  const w = await seedLoop(run);
  const row = (who: { msisdn: string }, ref: string): SliceRecipient => ({ ref, msisdn: who.msisdn, body: "50pick: tangazo." });
  // vb3 · H's row is written "+255 0712…" — the gate keys it 255712…, and the wire must be given exactly that (U9.13).
  const trunkRow: SliceRecipient = { ref: "rH", msisdn: `+255 0${w.H.msisdn.slice(3)}`, body: "50pick: tangazo." };
  const slices = [[row(w.A, "rA"), trunkRow], [row(w.X, "rX"), row(w.Y, "rY"), row(w.Z, "rZ"), row(w.B, "rB"), row(w.F, "rF")]];
  const wire = fakeWire(new Set([w.F.msisdn]));
  const between = async () => {
    // Three people change their minds while the campaign is between slices — each through the real act.
    if (w.token) await stopMarketing(w.token, "SW");
    await selfExclude(w.Y.id, "24h");
    await coolOff(w.Z.id, "1h");
  };
  const outcomes = await driver(slices, between, { send: wire.send, window: ALWAYS_OPEN });
  const of = (ref: string) => outcomes.find((o) => o.ref === ref);
  const onWire = (msisdn: string) => wire.sent.some((m) => m.to === msisdn);
  const show = (ref: string) => JSON.stringify(of(ref) ?? null);

  ok(p("U9.0 · ⚠️ CONTROL — the opt-out token was minted, so the opt-out between slices is real"), w.token !== null);
  ok(p("U9.1 · ⭐ a number that OPTED OUT between slice one and slice two never reaches the wire — skipped as suppressed"),
    !onWire(w.X.msisdn) && of("rX")?.outcome === "skipped" && (of("rX") as { skipReason?: string }).skipReason === "suppressed", show("rX"));
  ok(p("U9.2 · a player who SELF-EXCLUDED between slices never reaches the wire — skipped rg_self_excluded"),
    !onWire(w.Y.msisdn) && (of("rY") as { skipReason?: string }).skipReason === "rg_self_excluded", show("rY"));
  const rgRows = (await getAuditForTargetsDurable({ targetType: "User", targetIds: [w.Y.id], actions: [MARKETING_RG_SUPPRESSED_ACTION], sinceIso: "1970-01-01T00:00:00.000Z" })).entries;
  ok(p("U9.2b · …and the RG refusal left ONE COMPLIANCE audit line against the ACCOUNT, with no phone number in it (§5.14)"),
    rgRows.length === 1 && !JSON.stringify(rgRows[0]?.payload ?? {}).includes(w.Y.msisdn.slice(3)),
    `${rgRows.length} row(s) ${JSON.stringify(rgRows[0]?.payload ?? null)}`);
  ok(p("U9.3 · a player who took a BREAK between slices never reaches the wire — skipped rg_cooling_off"),
    !onWire(w.Z.msisdn) && (of("rZ") as { skipReason?: string }).skipReason === "rg_cooling_off", show("rZ"));
  ok(p("U9.4 · ⚠️ CONTROL — the loop DOES send: slice one's and slice two's eligible players were handed over (an always-closed gate fails here)"),
    of("rA")?.outcome === "handed_over" && of("rB")?.outcome === "handed_over", `${show("rA")} ${show("rB")}`);
  const refusals = outcomes.filter((o) => ["rX", "rY", "rZ"].includes(o.ref));
  ok(p("U9.5 · ⛔ every refusal is `skipped`, never `failed` — the only failure is the one the WIRE refused"),
    refusals.every((o) => o.outcome === "skipped") && outcomes.filter((o) => o.outcome === "failed").map((o) => o.ref).join() === "rF",
    outcomes.map((o) => `${o.ref}:${o.outcome}`).join(" "));
  ok(p("U9.6 · ⛔ settled by KEY, never by position — with the wire answering in reverse, each row got its OWN reference"),
    (of("rB") as { reference?: string }).reference === "ref_rB" && (of("rA") as { reference?: string }).reference === "ref_rA", `${show("rA")} ${show("rB")}`);
  ok(p("U9.7 · a message the wire refused is `failed` with the wire's code — not skipped, not handed over"),
    of("rF")?.outcome === "failed" && (of("rF") as { code?: string }).code === "BAD_MSISDN", show("rF"));
  ok(p("U9.8 · ONE send per slice — two slices, two calls to the wire"), wire.calls === 2, `${wire.calls} call(s)`);
  const onWireAsH = wire.sent.filter((m) => m.targetId === "rH").map((m) => m.to);
  ok(p("U9.13 · ⭐ vb3 · a consenting player whose row is written '+255 0712…' is handed over under the GATE'S key — the wire is given 255712…, never the row's own spelling (sendBatch would rewrite that to 2550712… and refuse it BAD_MSISDN)"),
    of("rH")?.outcome === "handed_over" && onWireAsH.length === 1 && onWireAsH[0] === w.H.msisdn,
    `${show("rH")} · on the wire as [${onWireAsH.join(", ")}]`);

  // ── the three ways a slice ends without a verdict about the PERSON ────────────────────────
  const G = row(w.G, "rG");
  const shut = fakeWire(new Set(), "BALANCE_FLOOR");
  const [held] = await driver([[G]], async () => {}, { send: shut.send, window: ALWAYS_OPEN });
  ok(p("U9.9 · a SHOP-WIDE refusal (balance floor) holds the row — not failed, not skipped: nothing about this person was decided"),
    held?.outcome === "held" && (held as { reason?: string }).reason === "BALANCE_FLOOR", JSON.stringify(held ?? null));
  const blind = fakeWire(new Set());
  const [unanswered] = await driver([[G]], async () => {}, { send: blind.send, gate: async () => { throw new Error("db down"); }, window: ALWAYS_OPEN });
  ok(p("U9.10 · ⛔ a gate that cannot ANSWER holds the row and sends NOTHING — never a send on an unanswered question"),
    unanswered?.outcome === "held" && blind.sent.length === 0, `${JSON.stringify(unanswered ?? null)} · sent ${blind.sent.length}`);
  const [lost] = await driver([[G]], async () => {}, { send: async () => { throw new Error("socket hang up"); }, window: ALWAYS_OPEN });
  ok(p("U9.11 · a send that THROWS leaves the row `unconfirmed` — the gateway may have taken it, so it is never retried by itself (OD23)"),
    lost?.outcome === "unconfirmed", JSON.stringify(lost ?? null));

  // ── U13 · the send window: outside it the slice is held WHOLE, before any gate is asked (E2c · E9) ──────────────
  let asked = 0;
  let reads = 0;
  const counting: SliceDeps["gate"] = async (m) => { asked++; return mayReceiveMarketingSms(m); };
  const night = fakeWire(new Set());
  const quiet = await driver([[row(w.A, "qA"), row(w.B, "qB"), G]], async () => {}, {
    send: night.send, gate: counting, window: () => { reads++; return ALWAYS_CLOSED(); },
  });
  ok(p(U9_14),
    quiet.length === 3 && quiet.every((o) => o.outcome === "held" && (o as { reason?: string }).reason === "quiet_hours")
      && asked === 0 && night.calls === 0 && reads === 1,
    `${quiet.map((o) => `${o.ref}:${o.outcome}:${(o as { reason?: string }).reason ?? "-"}`).join(" ")} · gate asked ${asked} · wire calls ${night.calls} · window read ${reads}`);
  return w;
}

/** U13 · the contract's closed-window clause — named once, so its red case expects exactly what the run says. */
const U9_14 = "U9.14 · ⭐ U13 · OUTSIDE THE SEND WINDOW the slice is held WHOLE — every row held quiet_hours, the gate asked ZERO times, the wire never called, the window read ONCE";

/** U43b-1 · the hook clauses — named once, so each red case expects exactly what the run says. */
const U9_15 = "U9.15 · ⭐ E1 · with every row PREPARED (the engine's shape) the same contract holds, and NOBODY the gate refused was ever prepared — the opt-out, the self-exclusion and the break between the slices got no prepare (so no token is minted for them), and the row written '+255 0712…' was prepared under the gate's key";
const U9_16 = "U9.16 · ⭐ E1 · prepare runs only for a number the gate has just CLEARED — after that row's gate, under the gate's key, with the gate's yes and its basis; the prepared text is what the wire is given; and every outcome after the clear carries the prepare's meta and the gate's basis (a refused row carries neither)";
const U9_17 = "U9.17 · a prepare that REFUSES holds its row 'prepare:<reason>' with its detail, and one that THROWS holds it 'prepare:unanswered' — each with the gate's basis, neither on the wire — while the rest of the slice is still sent, in its one call";
const U9_18 = "U9.18 · ⭐ beforeSend is asked ONCE, after every gate and prepare and before the wire, with exactly the CLEARED rows under the gate's keys and the text that would go — and its VETO holds every cleared row with its reason and the gate's basis, and nothing reaches the wire (a campaign paused while it was gating sends nothing)";
const U9_19 = "U9.19 · ⛔ E6 · beforeSend keeping SOME rows sends only those — every other cleared row held claim_lost, never on the wire (a ref it names outside the slice changes nothing); keeping NONE (a stalled claimant whose claims were all reaped) makes ZERO wire calls; one that THROWS holds every cleared row before_send_unanswered, the wire untouched";
const U9_20 = "U9.20 · ⭐ E3 · a result the wire marks TRANSPORT (the reply lost — the gateway may hold the message and bill for it) is 'unconfirmed' with that result's reference and code, never 'failed' (which invites a retry, a second charge), and carries the meta and the basis; a refusal the wire names (REJECTED) is still 'failed' with its code";
const U9_21 = "U9.21 · a row with NEITHER a body nor a prepare, or with BOTH, is refused as a programming error before any gate is asked or anything is sent (with both, which text went would be an accident) — while a well-formed row is dispatched";

/**
 * U43b-1 · THE HOOKS (ENGINE-SPEC §4.13 Decision 1). U9.15 runs the whole contract again with every row prepared; U9.16–
 * U9.21 then drive each hook on the world that contract left: A, B and H still consenting, X stopped, Y self-excluded.
 */
async function runHookContract(dispatch: Dispatch, run: number, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  type Row = Record<string, unknown> | undefined;
  const find = (os: SliceOutcome[], ref: string): Row => os.find((o) => o.ref === ref) as Row;
  const show = (os: SliceOutcome[]) => os.map((o) => `${o.ref}:${o.outcome}:${String((o as { reason?: string }).reason ?? "-")}`).join(" ");
  const sameMeta = (o: Row, ref: string) => JSON.stringify(o?.meta) === JSON.stringify(hookMeta(ref));

  // ── U9.15 · the contract again, every row prepared ────────────────────────────────────────────────────────────────
  const asked: string[] = [];
  const w = await runLoopContract(preparedLoop(dispatch, asked), run, `${tag}prepared:`);
  const consenting = [w.A, w.B, w.F, w.G, w.H].map((x) => x.msisdn);
  const refused = [w.X, w.Y, w.Z].map((x) => x.msisdn);
  const named = (k: string) => (Object.entries(w).find(([, v]) => (v as { msisdn?: string } | null)?.msisdn === k)?.[0] ?? "?");
  ok(p(U9_15),
    asked.length > 0 && asked.every((k) => consenting.includes(k)) && !asked.some((k) => refused.includes(k)) && asked.includes(w.H.msisdn),
    `prepared for [${asked.map(named).join(", ")}]`);

  /** A prepare that records whom it was asked about, and how, and makes `50pick: <ref>.` with `hookMeta(ref)`. */
  const order: string[] = [];
  const preps: Array<{ ref: string; key: string; ok: boolean; basis: string }> = [];
  const prep = (ref: string) => async (key: string, verdict: MarketingGateAllow): Promise<SlicePrepared> => {
    order.push(`prepare:${ref}`);
    preps.push({ ref, key, ok: verdict.ok === true, basis: verdict.basis });
    return { ok: true, body: `50pick: ${ref}.`, meta: hookMeta(ref) };
  };
  /** The ONE gate, recording which row it was asked about. */
  const recording = (rows: SliceRecipient[], log: string[]): NonNullable<SliceDeps["gate"]> => {
    const refOf = new Map(rows.map((r) => [r.msisdn, r.ref]));
    return async (m) => { log.push(`gate:${refOf.get(m) ?? "?"}`); return mayReceiveMarketingSms(m); };
  };

  // ── U9.16 · prepare: after the gate, under its key, with its verdict; its text on the wire; meta and basis carried ──
  const rows16: SliceRecipient[] = [
    { ref: "hA", msisdn: w.A.msisdn, prepare: prep("hA") },
    { ref: "hX", msisdn: w.X.msisdn, prepare: prep("hX") },
    { ref: "hY", msisdn: w.Y.msisdn, prepare: prep("hY") },
    { ref: "hH", msisdn: `+255 0${w.H.msisdn.slice(3)}`, prepare: prep("hH") },
  ];
  const wire16 = fakeWire(new Set());
  const o16 = await dispatch(rows16, { send: wire16.send, gate: recording(rows16, order), window: ALWAYS_OPEN });
  const afterItsGate = (ref: string) => order.indexOf(`gate:${ref}`) >= 0 && order.indexOf(`gate:${ref}`) < order.indexOf(`prepare:${ref}`);
  const sent16 = (ref: string) => wire16.sent.find((m) => m.targetId === ref);
  const carries = (o: Row, ref: string) => sameMeta(o, ref) && o?.basis === "CONSENT" && String(o?.basisRef ?? "").startsWith("ledger:");
  ok(p(U9_16),
    preps.map((x) => x.ref).join() === "hA,hH" && afterItsGate("hA") && afterItsGate("hH")
      && preps.every((x) => x.ok && x.basis === "CONSENT") && preps[0]?.key === w.A.msisdn && preps[1]?.key === w.H.msisdn
      && wire16.calls === 1 && wire16.sent.length === 2
      && sent16("hA")?.to === w.A.msisdn && sent16("hA")?.body === "50pick: hA." && sent16("hH")?.to === w.H.msisdn && sent16("hH")?.body === "50pick: hH."
      && find(o16, "hA")?.outcome === "handed_over" && carries(find(o16, "hA"), "hA") && find(o16, "hH")?.outcome === "handed_over" && carries(find(o16, "hH"), "hH")
      && find(o16, "hX")?.outcome === "skipped" && find(o16, "hX")?.skipReason === "suppressed" && find(o16, "hX")?.meta === undefined && find(o16, "hX")?.basis === undefined
      && find(o16, "hY")?.outcome === "skipped" && find(o16, "hY")?.skipReason === "rg_self_excluded",
    `prepared [${preps.map((x) => `${x.ref}@${named(x.key)}`).join(", ")}] · order ${order.join(" ")} · ${show(o16)}`);

  // ── U9.17 · a prepare that refuses, or throws, holds THAT row and no other ────────────────────────────────────────
  const wire17 = fakeWire(new Set());
  let o17: SliceOutcome[] = [];
  let threw17 = "";
  try {
    o17 = await dispatch([
      { ref: "pA", msisdn: w.A.msisdn, prepare: async () => ({ ok: false, reason: "token_unavailable", detail: "no stop link could be made" }) },
      { ref: "pB", msisdn: w.B.msisdn, prepare: async () => { throw new Error("db down"); } },
      { ref: "pH", msisdn: w.H.msisdn, prepare: prep("pH") },
    ], { send: wire17.send, window: ALWAYS_OPEN });
  } catch (e) {
    threw17 = String((e as Error)?.message ?? e);
  }
  ok(p(U9_17),
    threw17 === "" && find(o17, "pA")?.outcome === "held" && find(o17, "pA")?.reason === "prepare:token_unavailable"
      && find(o17, "pA")?.detail === "no stop link could be made" && find(o17, "pA")?.basis === "CONSENT"
      && find(o17, "pB")?.outcome === "held" && find(o17, "pB")?.reason === "prepare:unanswered" && find(o17, "pB")?.basis === "CONSENT"
      && find(o17, "pH")?.outcome === "handed_over" && wire17.calls === 1 && wire17.sent.length === 1 && wire17.sent[0]?.targetId === "pH",
    threw17 !== "" ? `the slice threw: ${threw17}` : `${show(o17)} · wire ${wire17.calls} call(s) [${wire17.sent.map((m) => m.targetId).join(", ")}]`);

  // ── U9.18 · beforeSend: once, after every gate and prepare, before the wire — a veto sends nothing ───────────────────
  const order18: string[] = [];
  const handed18: SliceCleared[][] = [];
  const rows18: SliceRecipient[] = [
    { ref: "vA", msisdn: w.A.msisdn, prepare: async () => { order18.push("prepare:vA"); return { ok: true, body: "50pick: vA.", meta: hookMeta("vA") }; } },
    { ref: "vX", msisdn: w.X.msisdn, prepare: async () => { order18.push("prepare:vX"); return { ok: true, body: "50pick: vX.", meta: hookMeta("vX") }; } },
    { ref: "vB", msisdn: w.B.msisdn, body: "50pick: vB." },
  ];
  const wire18 = fakeWire(new Set());
  const o18 = await dispatch(rows18, {
    send: wire18.send, gate: recording(rows18, order18), window: ALWAYS_OPEN,
    beforeSend: async (cleared) => { order18.push("beforeSend"); handed18.push([...cleared]); return { proceed: false, reason: "not_running" }; },
  });
  const handed = handed18[0] ?? [];
  const handedRow = (ref: string) => handed.find((c) => c.ref === ref);
  ok(p(U9_18),
    handed18.length === 1 && order18.filter((x) => x === "beforeSend").length === 1 && order18[order18.length - 1] === "beforeSend"
      && ["gate:vA", "gate:vX", "gate:vB"].every((x) => order18.includes(x)) && order18.indexOf("gate:vA") < order18.indexOf("prepare:vA")
      && !order18.includes("prepare:vX") && handed.map((c) => c.ref).join() === "vA,vB" && handedRow("vA")?.msisdn === w.A.msisdn && handedRow("vA")?.body === "50pick: vA."
      && sameMeta(handedRow("vA") as Row, "vA") && handedRow("vB")?.body === "50pick: vB." && handed.every((c) => c.basis === "CONSENT")
      && find(o18, "vA")?.outcome === "held" && find(o18, "vA")?.reason === "not_running" && sameMeta(find(o18, "vA"), "vA")
      && find(o18, "vB")?.outcome === "held" && find(o18, "vB")?.reason === "not_running" && find(o18, "vB")?.basis === "CONSENT"
      && find(o18, "vX")?.outcome === "skipped" && wire18.calls === 0,
    `order ${order18.join(" ")} · handed [${handed.map((c) => c.ref).join(", ")}] · ${show(o18)} · wire ${wire18.calls} call(s)`);

  // ── U9.19 · beforeSend keeping some, keeping none, throwing ───────────────────────────────────────────────────────────
  const three = (s: string): SliceRecipient[] => [
    { ref: `${s}A`, msisdn: w.A.msisdn, body: "50pick: tangazo." },
    { ref: `${s}B`, msisdn: w.B.msisdn, prepare: prep(`${s}B`) },
    { ref: `${s}H`, msisdn: w.H.msisdn, body: "50pick: tangazo." },
  ];
  const someWire = fakeWire(new Set());
  const some = await dispatch(three("k"), { send: someWire.send, window: ALWAYS_OPEN, beforeSend: async () => ({ proceed: true, keep: ["kA", "zz_not_in_this_slice"] }) });
  const noneWire = fakeWire(new Set());
  const none = await dispatch(three("n"), { send: noneWire.send, window: ALWAYS_OPEN, beforeSend: async () => ({ proceed: true, keep: [] }) });
  const thrownWire = fakeWire(new Set());
  const thrown = await dispatch(three("t"), { send: thrownWire.send, window: ALWAYS_OPEN, beforeSend: async () => { throw new Error("db down"); } });
  const allHeld = (os: SliceOutcome[], reason: string) => os.length === 3
    && os.every((o) => o.outcome === "held" && (o as { reason?: string }).reason === reason && (o as { basis?: string }).basis === "CONSENT");
  ok(p(U9_19),
    find(some, "kA")?.outcome === "handed_over" && find(some, "kB")?.outcome === "held" && find(some, "kB")?.reason === "claim_lost"
      && sameMeta(find(some, "kB"), "kB") && find(some, "kH")?.outcome === "held" && find(some, "kH")?.reason === "claim_lost"
      && someWire.calls === 1 && someWire.sent.map((m) => m.targetId).join() === "kA"
      && allHeld(none, "claim_lost") && noneWire.calls === 0 && allHeld(thrown, "before_send_unanswered") && thrownWire.calls === 0,
    `some: ${show(some)}, wire [${someWire.sent.map((m) => m.targetId).join(", ")}] · none: ${show(none)}, wire ${noneWire.calls} · threw: ${show(thrown)}, wire ${thrownWire.calls}`);

  // ── U9.20 · E3 · TRANSPORT is unconfirmed, with its reference; a named refusal is still failed ─────────────────────────
  const lossy: SliceDeps["send"] = async (messages) => ({
    results: messages.map((m) => (m.targetId === "eA"
      ? { reference: "sms_lost_eA", to: m.to, ok: false, code: "TRANSPORT" as const, error: "transport failure", targetType: m.targetType, targetId: m.targetId }
      : { reference: "sms_refused_eB", to: m.to, ok: false, code: "REJECTED" as const, error: "Rejected", targetType: m.targetType, targetId: m.targetId })),
    balanceTzs: null,
  });
  const o20 = await dispatch([{ ref: "eA", msisdn: w.A.msisdn, prepare: prep("eA") }, { ref: "eB", msisdn: w.B.msisdn, body: "50pick: tangazo." }],
    { send: lossy, window: ALWAYS_OPEN });
  ok(p(U9_20),
    find(o20, "eA")?.outcome === "unconfirmed" && find(o20, "eA")?.reference === "sms_lost_eA" && find(o20, "eA")?.code === "TRANSPORT"
      && sameMeta(find(o20, "eA"), "eA") && find(o20, "eA")?.basis === "CONSENT"
      && find(o20, "eB")?.outcome === "failed" && find(o20, "eB")?.code === "REJECTED" && find(o20, "eB")?.basis === "CONSENT",
    JSON.stringify(o20.map((o) => ({ ref: o.ref, outcome: o.outcome, code: (o as { code?: string }).code ?? null, reference: (o as { reference?: string }).reference ?? null }))));

  // ── U9.21 · a row carries a body OR a prepare — exactly one ───────────────────────────────────────────────────────────
  let asked21 = 0;
  const wire21 = fakeWire(new Set());
  const refuses = async (rows: unknown[]): Promise<boolean> => {
    try {
      await dispatch(rows as SliceRecipient[], { send: wire21.send, window: ALWAYS_OPEN, gate: async (m) => { asked21++; return mayReceiveMarketingSms(m); } });
      return false;
    } catch {
      return true;
    }
  };
  const neither = await refuses([{ ref: "sN", msisdn: w.A.msisdn }]);
  const both = await refuses([{ ref: "sB", msisdn: w.A.msisdn, body: "50pick: tangazo.", prepare: prep("sB") }]);
  const wellFormed = !(await refuses([{ ref: "sF", msisdn: w.A.msisdn, body: "50pick: tangazo." }]));
  ok(p(U9_21),
    neither && both && wellFormed && asked21 === 1 && wire21.calls === 1,
    `neither refused ${neither} · both refused ${both} · a well-formed row dispatched ${wellFormed} · gate asked ${asked21} · wire ${wire21.calls} call(s)`);
}

/** The dispatch step written out so one step at a time can be made wrong. Never ships; with no flag set it
 *  is asserted to agree with `dispatchSlice` on the whole contract — and, U43b-1, on the hooks — before any plant is trusted. */
type LoopDefect = {
  hoisted?: boolean; settleByIndex?: boolean; skipAsFailed?: boolean; gateErrorSends?: boolean; noRgAudit?: boolean; rawOnWire?: boolean; windowAfterGate?: boolean;
  /* U43b-1 · the hooks, each made wrong on its own */
  noShapeCheck?: boolean; prepareBeforeGate?: boolean; prepareRowKey?: boolean; prepareThrowEscapes?: boolean; noCarry?: boolean;
  noBeforeSend?: boolean; keepIgnored?: boolean; transportAsFailed?: boolean;
};
function dispatchModel(d: LoopDefect): Dispatch {
  return async (rows, deps) => {
    // U43b-1 · a body or a prepare, exactly one — or (planted) whatever arrives is dispatched.
    if (!d.noShapeCheck && rows.some((r) => ("body" in r) === ("prepare" in r))) throw new Error("model: a row carries a body or a prepare — exactly one");
    /** U13 · the send window as dispatchSlice reads it — once, failing closed — FIRST, or (planted) after every gate. */
    const windowHold = async (): Promise<SliceOutcome[] | null> => {
      let win: SendWindowState | undefined;
      try { win = await (deps.window ?? liveSendWindow)(); } catch { win = sendWindowUnreadable(); }
      if (win?.open === true) return null;
      const reason = win?.reason === "quiet_hours" ? "quiet_hours" : "window_unreadable";
      return rows.map((r): SliceOutcome => ({ ref: r.ref, outcome: "held", reason }));
    };
    if (!d.windowAfterGate) {
      const first = await windowHold();
      if (first !== null) return first;
    }
    const ask = deps.gate ?? mayReceiveMarketingSms;
    const out = new Map<string, SliceOutcome>();
    /** A cleared row: the key (or, planted, the row's spelling), the text that goes, and what its outcome carries. */
    type Cleared = { ref: string; msisdn: string; body: string; carried: Record<string, unknown> };
    const cleared: Cleared[] = [];
    const prepareOf = async (r: SliceRecipient, key: string, v: MarketingGateVerdict): Promise<SlicePrepared | null> => {
      if (!("prepare" in r)) return null;
      try { return await r.prepare(key, v as MarketingGateAllow); } catch (e) { if (d.prepareThrowEscapes) throw e; return null; }
    };
    // U43b-1 · R-S7 · planted: every row prepared BEFORE its gate is asked — a refused person is prepared (and minted) anyway.
    const early = new Map<string, SlicePrepared | null>();
    if (d.prepareBeforeGate) {
      for (const r of rows) early.set(r.ref, await prepareOf(r, parseTzNumber(r.msisdn).msisdn ?? r.msisdn, { ok: true, basis: "CONSENT", basisRef: "ledger:early" }));
    }
    for (const r of rows) {
      let v: MarketingGateVerdict;
      try { v = await ask(r.msisdn); } catch {
        if (d.gateErrorSends) { cleared.push({ ref: r.ref, msisdn: r.msisdn, body: "body" in r ? r.body : "", carried: {} }); continue; }
        out.set(r.ref, { ref: r.ref, outcome: "held", reason: "gate_unanswered" }); continue;
      }
      if (!v.ok) {
        out.set(r.ref, d.skipAsFailed
          ? { ref: r.ref, outcome: "failed", code: v.skipReason, error: v.detail }
          : { ref: r.ref, outcome: "skipped", skipReason: v.skipReason, detail: v.detail });
        if (!d.noRgAudit && v.skipReason.startsWith("rg_") && v.userId) {
          const { audit } = await import("../src/lib/server/audit.ts");
          await audit({ category: "COMPLIANCE", action: MARKETING_RG_SUPPRESSED_ACTION, actorId: null, targetType: "User", targetId: v.userId, payload: { reason: v.skipReason, detail: v.detail } });
        }
        continue;
      }
      // vb3 · the gate's key on the wire, as dispatchSlice puts it — or, planted, the row's own spelling as it did before.
      const key = parseTzNumber(r.msisdn).msisdn;
      if (key === null) { out.set(r.ref, { ref: r.ref, outcome: "skipped", skipReason: "bad_msisdn", detail: "no sendable key" }); continue; }
      const carried: Record<string, unknown> = d.noCarry ? {} : { basis: v.basis, basisRef: v.basisRef };
      const msisdn = d.rawOnWire ? r.msisdn : key;
      if (!("prepare" in r)) { cleared.push({ ref: r.ref, msisdn, body: r.body, carried }); continue; }
      // U43b-1 · E1 · prepared only now, under the gate's key — or (planted) under the row's own spelling, or long before.
      const made = d.prepareBeforeGate ? (early.get(r.ref) ?? null) : await prepareOf(r, d.prepareRowKey ? r.msisdn : key, v);
      if (made?.ok !== true) {
        out.set(r.ref, (made?.ok === false
          ? { ref: r.ref, outcome: "held", reason: `prepare:${made.reason}`, detail: made.detail, ...carried }
          : { ref: r.ref, outcome: "held", reason: "prepare:unanswered", ...carried }) as SliceOutcome);
        continue;
      }
      cleared.push({ ref: r.ref, msisdn, body: made.body, carried: d.noCarry ? {} : { ...carried, meta: made.meta } });
    }
    if (d.windowAfterGate) {
      const late = await windowHold();
      if (late !== null) return late;
    }
    // U43b-1 · E2b · beforeSend, once, before the wire: a veto or a throw holds every cleared row; a row it does not keep is
    // held claim_lost — or (planted) it is never asked, or its keep is ignored.
    let sending = cleared;
    if (cleared.length && deps.beforeSend && !d.noBeforeSend) {
      let veto: string | null = null;
      let keep = new Set<string>();
      try {
        const said = await deps.beforeSend(cleared.map((c) => ({ ref: c.ref, msisdn: c.msisdn, body: c.body, ...c.carried }) as SliceCleared));
        if (said.proceed) keep = new Set(d.keepIgnored ? cleared.map((c) => c.ref) : said.keep);
        else veto = said.reason || "before_send_unanswered";
      } catch { veto = "before_send_unanswered"; }
      sending = cleared.filter((c) => veto === null && keep.has(c.ref));
      for (const c of cleared) if (!sending.includes(c)) out.set(c.ref, { ref: c.ref, outcome: "held", reason: veto ?? "claim_lost", ...c.carried } as SliceOutcome);
    }
    if (sending.length) {
      let b: SmsBatchOutcome | null = null;
      try { b = await deps.send(sending.map((c) => ({ to: c.msisdn, body: c.body, targetType: "SmsCampaignRecipient", targetId: c.ref }))); } catch { b = null; }
      const put = (c: Cleared, o: Record<string, unknown>) => out.set(c.ref, { ref: c.ref, ...o, ...c.carried } as SliceOutcome);
      if (b === null) for (const c of sending) put(c, { outcome: "unconfirmed" });
      else if (b.refused) for (const c of sending) put(c, { outcome: "held", reason: b.refused });
      else for (const [i, c] of sending.entries()) {
        const res = d.settleByIndex ? b.results[i] : b.results.find((x) => x.targetId === c.ref);
        if (!res) put(c, { outcome: "unconfirmed" });
        else if (res.ok) put(c, { outcome: "handed_over", reference: res.reference });
        // U43b-1 · E3 · a lost reply is unconfirmed, its reference kept — or (planted, R-S2) settled as a refusal.
        else if (res.code === "TRANSPORT" && !d.transportAsFailed) put(c, { outcome: "unconfirmed", reference: res.reference, code: res.code });
        else put(c, { outcome: "failed", code: res.code ?? "UNKNOWN", error: res.error ?? null });
      }
    }
    return rows.map((r) => out.get(r.ref) as SliceOutcome);
  };
}

/** ⛔ THE DEFECT U9 EXISTS FOR: the gate asked ONCE, when the list is built, and the slices sent on that. */
const hoistedDriver = (dispatch: Dispatch): Driver => async (slices, between, deps) => {
  const ask = deps.gate ?? mayReceiveMarketingSms;
  const approved: SliceRecipient[][] = [];
  for (const slice of slices) {
    const keep: SliceRecipient[] = [];
    for (const r of slice) { const v = await ask(r.msisdn).catch(() => null); if (v?.ok) keep.push(r); }
    approved.push(keep);
  }
  const out: SliceOutcome[] = [];
  for (const [i, slice] of approved.entries()) {
    if (i > 0) await between();
    out.push(...await dispatch(slice, { ...deps, gate: async () => ({ ok: true }) }));
  }
  return out;
};

/** Structural: the shipped step asks the gate INSIDE the per-row loop and BEFORE the one send, and the
 *  send has no default — nothing in production can reach the wire through it until U35/U43. */
function assertDispatchShape(tag: string): void {
  const src = decomment(readFileSync(new URL("../src/lib/server/marketing/dispatch.ts", import.meta.url), "utf8"));
  const iLoop = src.indexOf("for (const row of rows)");
  const iAsk = src.indexOf("await ask(row.msisdn)");
  const iSend = src.indexOf("deps.send(");
  ok(`${tag}U9.12 · ⚠️ CONTROL — dispatch.ts was found and its three landmarks located`, src.length > 1_000 && iLoop > 0 && iAsk > 0 && iSend > 0, `loop@${iLoop} ask@${iAsk} send@${iSend}`);
  ok(`${tag}U9.12a · ⭐ the gate is asked INSIDE the per-recipient loop and BEFORE the send — the order §5.6 requires`, iLoop < iAsk && iAsk < iSend);
  ok(`${tag}U9.12b · ⛔ \`send\` has no default and \`sendBatch\` is not imported — no production path to the wire until U35 gives it a purpose`,
    !/\bsendBatch\b/.test(src) && !/deps\.send\s*\?\?/.test(src));
}

/* ══ D4 · THE PROFILE SWITCH — it shows, and writes, the EFFECTIVE consent ══════════════════════════
 * 🔴 The switch rendered the bare boolean and wrote only when the boolean changed. So: after an SMS-link
 * stop it could be turned back ON and never take effect (the suppression refused for ever); after a break
 * it read ON while the gate refused, and the only way to "opt in again" (RG §4) was an unexplained OFF
 * then ON; and a "yes" under the old non-SMS wording read ON while OQ11 no longer counts it. Each case is
 * driven through `recordPlayerMarketingChoice` (what the action calls) and judged by the GATE. */
type ToggleImpl = {
  choose: (input: { userId: string; marketingOptIn: boolean; locale: MessagingLocale }) => Promise<PlayerMarketingChoice>;
  state: (user: StoredUser) => Promise<MarketingToggleState>;
};
const REAL_TOGGLE: ToggleImpl = { choose: recordPlayerMarketingChoice, state: (u) => marketingToggleState(u) };

/**
 * A read that fails AFTER the writes landed: armed by the ledger append (the last write), the next
 * `throws` reads of the RG row throw — the first read `marketingToggleState` makes. In memory, restored in
 * `finally`, the way `test:marketing-optout` wraps `create`.
 */
async function afterWritesThrow<T>(throws: number, act: () => Promise<T>): Promise<{ result: T; thrown: number }> {
  const store = db as unknown as {
    messagingConsent: { create: (...a: unknown[]) => unknown };
    responsible: { get: (...a: unknown[]) => unknown };
  };
  const realCreate = store.messagingConsent.create;
  const realGet = store.responsible.get;
  let armed = false, left = throws, thrown = 0;
  store.messagingConsent.create = (...a: unknown[]) => { const r = realCreate.apply(store.messagingConsent, a); armed = true; return r; };
  store.responsible.get = (...a: unknown[]) => {
    if (armed && left > 0) { left--; thrown++; throw new Error("fixture: a read failed after the writes landed"); }
    return realGet.apply(store.responsible, a);
  };
  try {
    const result = await act();
    return { result, thrown };
  } finally {
    store.messagingConsent.create = realCreate;
    store.responsible.get = realGet;
  }
}

async function runToggleAssertions(impl: ToggleImpl, run: number, tag: string): Promise<void> {
  const p = (n: string) => `${tag}${n}`;
  const mkp = async (i: number, over: Partial<StoredUser> = {}, rg?: Partial<StoredResponsibleGambling>, wording = PINNED_SW) => {
    const id = `tg${run}-${i}`;
    const msisdn = toMsisdn255(phoneFor(run, i));
    await Promise.resolve(db.user.create(makeUser(id, `+${msisdn}`, { marketingOptIn: true, ...over })));
    await Promise.resolve(db.messagingConsent.create({
      id: `tgc${run}-${i}`, channel: "SMS", identifier: msisdn, category: "MARKETING", status: "GIVEN", source: "REGISTRATION",
      wording, locale: "SW", evidence: "fixture", recordedBy: null, createdAt: "2024-06-01T00:00:00.000Z",
    }));
    if (rg) await Promise.resolve(db.responsible.upsert(rgRow(id, null, rg)));
    return { id, msisdn, key: { channel: "SMS" as const, identifier: msisdn, category: "MARKETING" as const } };
  };
  const user = async (id: string) => (await Promise.resolve(db.user.findById(id))) as StoredUser;
  const gateSays = async (msisdn: string) => { const v = await mayReceiveMarketingSms(msisdn); return v.ok ? "ALLOWED" : v.skipReason; };

  // ── T1 · stopped by an SMS link, then the player's OWN signed-in ON ─────────────────────────
  const a = await mkp(1);
  const token = await mintOptOutToken(a.msisdn);
  if (token) await stopMarketing(token, "SW");
  await nextMillisecond();
  ok(p("T1 · ⚠️ CONTROL — after an SMS-link stop the gate refuses on the suppression"), (await gateSays(a.msisdn)) === "suppressed", await gateSays(a.msisdn));
  ok(p("T1b · …and the switch shows OFF"), !(await impl.state(await user(a.id))).on);
  const r1 = await impl.choose({ userId: a.id, marketingOptIn: true, locale: "EN" });
  ok(p("T1c · ⭐ D4 · the player's own ON lifts the stop THEY made — the gate ALLOWS, not 'suppressed' for ever"),
    (await gateSays(a.msisdn)) === "ALLOWED" && r1.ok && r1.liftedStop, `${await gateSays(a.msisdn)} · ${JSON.stringify(r1)}`);
  const row1 = await Promise.resolve(db.messagingConsent.latestFor(a.key));
  ok(p("T1d · ⭐ D2 · …recorded as a PROFILE GIVEN row in the language SHOWN (EN), in the toggle's own sentence"),
    row1?.status === "GIVEN" && row1.source === "PROFILE" && row1.locale === "EN" && row1.wording === marketingConsentWording("PROFILE", "EN"),
    JSON.stringify({ status: row1?.status, source: row1?.source, locale: row1?.locale, wording: row1?.wording?.slice(0, 30) }));
  const sup1 = (await Promise.resolve(db.suppression.listFor(a.msisdn)))[0];
  ok(p("T1e · ⛔ the stop was LIFTED, never deleted — the row and its date survive, lifted by 'profile'"),
    !!sup1 && !!sup1.liftedAt && sup1.liftedReason === "profile", JSON.stringify(sup1 ?? null));
  ok(p("T1f · …and the switch reads ON"), (await impl.state(await user(a.id))).on);

  // ── T2 · a suppression the PLATFORM made is not the player's to lift ───────────────────────
  const b = await mkp(2);
  await Promise.resolve(db.suppression.create({
    id: `tgs${run}-2`, channel: "SMS", identifier: b.msisdn, category: "MARKETING", reason: "OPERATOR",
    evidence: "fixture", recordedBy: "officer", createdAt: "2026-01-01T00:00:00.000Z", liftedAt: null, liftedReason: null,
  }));
  ok(p("T2 · an OPERATOR suppression does not turn the switch off — it is not the player's consent"), (await impl.state(await user(b.id))).on);
  await impl.choose({ userId: b.id, marketingOptIn: false, locale: "SW" });
  await nextMillisecond();
  await impl.choose({ userId: b.id, marketingOptIn: true, locale: "SW" });
  const sup2 = await Promise.resolve(db.suppression.find(b.key));
  ok(p("T2b · ⛔ …and the player's OFF→ON never lifts it — still refused on the suppression, the OPERATOR row still refusing"),
    (await gateSays(b.msisdn)) === "suppressed" && sup2?.reason === "OPERATOR", `${await gateSays(b.msisdn)} · ${JSON.stringify(sup2 ?? null)}`);
  // The second layer, asked directly: the store refuses too, whoever calls it (toggle case 2 plants across both).
  const storeLift = await Promise.resolve(db.suppression.lift(b.key, "profile", new Date().toISOString()));
  ok(p("T2c · ⚠️ CONTROL — the STORE refuses as well: `suppression.lift` on the OPERATOR row lifts nothing, and it still refuses"),
    storeLift === null && (await Promise.resolve(db.suppression.find(b.key)))?.reason === "OPERATOR", JSON.stringify(storeLift ?? null));

  // ── T3 · a break that ENDED — the consent on file predates it ──────────────────────────────
  const c = await mkp(3, { status: "COOLED_OFF" }, { coolingOffUntil: daysFromNow(-1) });
  ok(p("T3 · ⚠️ CONTROL — the break ended yesterday and the consent predates it: the gate refuses"), (await gateSays(c.msisdn)) === "rg_cooling_off", await gateSays(c.msisdn));
  const s3 = await impl.state(await user(c.id));
  ok(p("T3b · ⭐ D4 · …and the switch shows OFF, marked paused — not the ON the boolean still reads"), !s3.on && s3.paused, JSON.stringify(s3));
  await impl.choose({ userId: c.id, marketingOptIn: true, locale: "ZH" });
  ok(p("T3c · ⭐ ONE tap ON is the 'opt in again after it ends' RG §4 promises — the gate ALLOWS"), (await gateSays(c.msisdn)) === "ALLOWED", await gateSays(c.msisdn));
  const s3b = await impl.state(await user(c.id));
  ok(p("T3d · …and the switch reads ON, no longer paused"), s3b.on && !s3b.paused, JSON.stringify(s3b));

  // ── T4 · a "yes" under the OLD wording (OQ11) ──────────────────────────────────────────────
  const d = await mkp(4, {}, undefined, OLD_SIGNUP_SW);
  const s4 = await impl.state(await user(d.id));
  ok(p("T4 · a 'yes' under the old non-SMS wording shows OFF (OQ11), and is not marked paused"), !s4.on && !s4.paused, JSON.stringify(s4));
  await impl.choose({ userId: d.id, marketingOptIn: true, locale: "SW" });
  ok(p("T4b · one ON records the SMS sentence, and the gate ALLOWS"), (await gateSays(d.msisdn)) === "ALLOWED", await gateSays(d.msisdn));

  // ── T5 · OFF ───────────────────────────────────────────────────────────────────────────────
  const e = await mkp(5);
  ok(p("T5 · ⚠️ CONTROL — a consenting player's switch reads ON, and the gate ALLOWS"),
    (await impl.state(await user(e.id))).on && (await gateSays(e.msisdn)) === "ALLOWED", await gateSays(e.msisdn));
  await impl.choose({ userId: e.id, marketingOptIn: false, locale: "SW" });
  const row5 = await Promise.resolve(db.messagingConsent.latestFor(e.key));
  ok(p("T5b · OFF writes marketingOptIn=false AND a WITHDRAWN row, and the gate refuses"),
    (await user(e.id)).marketingOptIn === false && row5?.status === "WITHDRAWN" && (await gateSays(e.msisdn)) === "no_consent",
    `${(await user(e.id)).marketingOptIn} · ${row5?.status} · ${await gateSays(e.msisdn)}`);

  // ── T6 · an explicit OFF on a switch already showing OFF, whose boolean still reads true ───
  const g = await mkp(6, {}, undefined, OLD_SIGNUP_SW);
  await impl.choose({ userId: g.id, marketingOptIn: false, locale: "SW" });
  const row6 = await Promise.resolve(db.messagingConsent.latestFor(g.key));
  ok(p("T6 · an explicit OFF is still recorded when the boolean reads true under the old wording — a 'no' is never dropped"),
    (await user(g.id)).marketingOptIn === false && row6?.status === "WITHDRAWN", `${(await user(g.id)).marketingOptIn} · ${row6?.status}`);

  // ── T7 · ONE definition of "a stop the person made" across the two lifting surfaces ────────
  const other = (optoutService as Record<string, unknown>).personMayLift as ((r: SuppressionReason) => boolean) | undefined;
  const reasons: SuppressionReason[] = ["WITHDRAWN", "COMPLAINT", "OPERATOR", "SELF_EXCLUSION"];
  ok(p("T7 · the profile switch and the /s/ resume agree on which stops a person may lift (only WITHDRAWN)"),
    typeof other === "function" && reasons.every((r) => isPersonCreatedSuppression(r) === other(r)) && reasons.filter((r) => isPersonCreatedSuppression(r)).join() === "WITHDRAWN",
    typeof other === "function" ? reasons.map((r) => `${r}:${isPersonCreatedSuppression(r)}/${other(r)}`).join(" ") : "optout-service exports no personMayLift");

  // ── T8 · D4b · a break IN FORCE — the switch is OFF, locked, and says until when ──────────────
  // 🔴 Only a LAPSED refusal read OFF, so a running break fell through to ON: a consent the gate refuses now
  // and will never honour (a yes counts only if given AFTER the break ends), and an ON tapped mid-break was
  // written as a GIVEN row certain to lapse — then the switch flipped itself OFF when the break ended.
  const breakEnds = daysFromNow(2);
  const h = await mkp(8, { status: "COOLED_OFF" }, { coolingOffUntil: breakEnds });
  ok(p("T8 · ⚠️ CONTROL — on a break with a consent on file, the gate refuses rg_cooling_off"), (await gateSays(h.msisdn)) === "rg_cooling_off", await gateSays(h.msisdn));
  const s8 = await impl.state(await user(h.id));
  ok(p("T8a · ⭐ D4b · during the break the switch reads OFF and HELD, with the break's end date — never ON"),
    !s8.on && s8.held && !s8.paused && s8.heldUntil === new Date(breakEnds).toISOString(), JSON.stringify(s8));
  const rows8 = async () => (await Promise.resolve(db.messagingConsent.listFor(h.key))).length;
  const before8 = await rows8();
  const r8 = await impl.choose({ userId: h.id, marketingOptIn: true, locale: "SW" });
  const after8 = await rows8();
  ok(p("T8b · ⛔ D4b · an ON tapped during the break writes NOTHING and answers held — no GIVEN row certain to lapse"),
    !r8.ok && r8.held === true && r8.on === false && !r8.changed && after8 === before8, `${JSON.stringify(r8)} · rows ${before8} → ${after8}`);
  const s8end = await marketingToggleState(await user(h.id), new Date(Date.parse(breakEnds) + DAY));
  ok(p("T8c · …and on a clock after the break ends the SAME record reads paused (lapsed), no longer held"),
    !s8end.on && s8end.paused && !s8end.held, JSON.stringify(s8end));
  await impl.choose({ userId: h.id, marketingOptIn: false, locale: "SW" });
  const row8 = await Promise.resolve(db.messagingConsent.latestFor(h.key));
  ok(p("T8d · an OFF during the break is still recorded — a no is never refused"),
    (await user(h.id)).marketingOptIn === false && row8?.status === "WITHDRAWN", `${(await user(h.id)).marketingOptIn} · ${row8?.status}`);
  const nc = await mkp(9, { status: "COOLED_OFF", marketingOptIn: false }, { coolingOffUntil: daysFromNow(2) });
  const s9 = await impl.state(await user(nc.id));
  const r9 = await impl.choose({ userId: nc.id, marketingOptIn: true, locale: "SW" });
  ok(p("T8e · a player with NO consent on a break is held too — the ON is void whoever taps it, and nothing is written"),
    !s9.on && s9.held && !r9.ok && r9.held === true && (await user(nc.id)).marketingOptIn === false, `${JSON.stringify(s9)} · ${JSON.stringify(r9)}`);
  const seUntil = daysFromNow(30);
  const se = await mkp(10, { status: "SELF_EXCLUDED" }, { selfExclusionUntil: seUntil });
  const s10 = await impl.state(await user(se.id));
  ok(p("T8f · a self-exclusion in force reads held, until its end date"),
    !s10.on && s10.held && s10.heldUntil === new Date(seUntil).toISOString(), JSON.stringify(s10));
  const perm = await mkp(11, { status: "SELF_EXCLUDED" }, { selfExclusionUntil: daysFromNow(36_500) });
  const s11 = await impl.state(await user(perm.id));
  ok(p("T8g · a PERMANENT self-exclusion is held with NO date — never a date a century away"),
    !s11.on && s11.held && s11.heldUntil === null, JSON.stringify(s11));

  // ── T9 · a read that throws AFTER the writes landed — the answer is READ, never guessed ─────────
  // 🔴 The catch answered `on: !want`, so an OFF whose records had landed showed the switch ON again.
  const g9 = await mkp(12);
  const f1 = await afterWritesThrow(1, () => impl.choose({ userId: g9.id, marketingOptIn: false, locale: "SW" }));
  const row9 = await Promise.resolve(db.messagingConsent.latestFor(g9.key));
  ok(p("T9 · ⚠️ CONTROL — the fault fired once, after the OFF's writes had landed (marketingOptIn=false, a WITHDRAWN row)"),
    f1.thrown === 1 && (await user(g9.id)).marketingOptIn === false && row9?.status === "WITHDRAWN", `thrown ${f1.thrown} · ${row9?.status}`);
  ok(p("T9a · ⭐ …and the answer is the RE-READ state, OFF as stored — not the guess !want (ON) that snapped the switch back"),
    f1.result.on === false && f1.result.ok === true && f1.result.changed === true, JSON.stringify(f1.result));
  const g10 = await mkp(13);
  const f2 = await afterWritesThrow(2, () => impl.choose({ userId: g10.id, marketingOptIn: false, locale: "SW" }));
  ok(p("T9b · when the fresh read fails too the answer is UNKNOWN (null) — still never a guess"),
    f2.thrown === 2 && f2.result.on === null && f2.result.ok === false, `thrown ${f2.thrown} · ${JSON.stringify(f2.result)}`);

  /* ══ U33a-P · THE SWITCH UNDER OD58 — ON can now mean "offers reach you on the LICENCE basis" ══════════════
     ⛔ The record is flipped through the config factory's OWN registry (`__50PICK_CONFIGS`, a declared global), not
     through a second reader: `marketingToggleState` asks the live `licenceOutreach()`, so a test that stubbed its own
     record would be proving something about the stub. Hydration is marked so the factory does not re-read over it. */
  const OUTREACH_KEY = "marketing.outreach.licence";
  const RECORDED_AT = "2026-10-05T09:00:00.000Z";
  const setRecord = (open: boolean): void => {
    const g = globalThis as unknown as { __50PICK_CONFIGS?: Map<string, unknown>; __50PICK_CONFIGS_HYDRATED?: Set<string> };
    g.__50PICK_CONFIGS?.set(OUTREACH_KEY, open ? { state: "open", recordedBy: "usr_officer_p", recordedAt: RECORDED_AT } : { state: "closed" });
    g.__50PICK_CONFIGS_HYDRATED?.add(OUTREACH_KEY);
  };
  /** A player who was never asked: the toggle off, and no ledger row at all. */
  const mkNever = async (i: number, over: Partial<StoredUser> = {}, rg?: Partial<StoredResponsibleGambling>) => {
    const id = `tgo${run}-${i}`;
    const msisdn = toMsisdn255(phoneFor(run, 40 + i));
    await Promise.resolve(db.user.create(makeUser(id, `+${msisdn}`, { marketingOptIn: false, ...over })));
    if (rg) await Promise.resolve(db.responsible.upsert(rgRow(id, null, rg)));
    return { id, msisdn, key: { channel: "SMS" as const, identifier: msisdn, category: "MARKETING" as const } };
  };

  setRecord(false);
  const o1 = await mkNever(1);
  const o1closed = await impl.state(await user(o1.id));
  setRecord(true);
  const o1open = await impl.state(await user(o1.id));
  ok(p("T-O1 · ⭐ U33a-P · a never-asked player reads OFF while the record is CLOSED, and ON with outreach:true once it is OPEN — the switch follows the basis that actually reaches them"),
    o1closed.on === false && o1closed.outreach === false && o1open.on === true && o1open.outreach === true,
    `closed ${JSON.stringify(o1closed)} · open ${JSON.stringify(o1open)}`);

  const o2 = await mkNever(2);
  await Promise.resolve(db.suppression.create({
    id: `tgos${run}-2`, channel: "SMS", identifier: o2.msisdn, category: "MARKETING",
    reason: "OPERATOR", evidence: "fixture", recordedBy: null, createdAt: "2026-01-01T00:00:00.000Z",
    liftedAt: null, liftedReason: null,
  }));
  const o2state = await impl.state(await user(o2.id));
  ok(p("T-O2 · ⛔ ANY active stop reads OFF here, an OPERATOR stop included — stricter than the consent path on purpose: nobody said yes, so the switch must never read ON while the gate refuses"),
    o2state.on === false && o2state.outreach === false, JSON.stringify(o2state));

  const o3 = await mkNever(3);
  const o3before = await impl.state(await user(o3.id));
  const r3 = await impl.choose({ userId: o3.id, marketingOptIn: false, locale: "SW" });
  const o3row = await Promise.resolve(db.messagingConsent.latestFor(o3.key));
  const o3after = await impl.state(await user(o3.id));
  ok(p("T-O3 · ⭐ an OFF tapped from an outreach ON records the person's stop — a WITHDRAWN PROFILE row in the sentence shown — and the switch reads OFF after"),
    o3before.on === true && r3.ok && o3row?.status === "WITHDRAWN" && o3row.source === "PROFILE" && o3after.on === false,
    `before ${o3before.on} · row ${o3row?.status}/${o3row?.source} · after ${o3after.on}`);

  const o4 = await mkNever(4);
  const o4before = await impl.state(await user(o4.id));
  const r4 = await impl.choose({ userId: o4.id, marketingOptIn: true, locale: "SW" });
  const o4row = await Promise.resolve(db.messagingConsent.latestFor(o4.key));
  ok(p("T-O4 · ⛔ an ON tapped while the switch ALREADY reads ON (outreach) writes NOTHING — a consent is never invented out of a tap that changed nothing"),
    o4before.on === true && o4row === null && r4.changed === false,
    `before ${o4before.on} · row ${JSON.stringify(o4row)} · changed ${r4.changed}`);

  const o5 = await mkNever(5, {}, { coolingOffUntil: new Date(Date.now() - 86400_000).toISOString() });
  const o5state = await impl.state(await user(o5.id));
  ok(p("T-O5 · a never-asked player whose break ENDED with no yes since reads PAUSED, not ON — the one refusal their own tap can lift, said in the same word as on the consent path"),
    o5state.on === false && o5state.paused === true, JSON.stringify(o5state));

  const o6 = await mkp(46);
  await Promise.resolve(db.suppression.create({
    id: `tgos${run}-6`, channel: "SMS", identifier: o6.msisdn, category: "MARKETING",
    reason: "OPERATOR", evidence: "fixture", recordedBy: null, createdAt: "2026-01-01T00:00:00.000Z",
    liftedAt: null, liftedReason: null,
  }));
  const o6state = await impl.state(await user(o6.id));
  ok(p("T-O6 · ⚠️ CONTROL — the CONSENT path is unchanged: an OPERATOR stop leaves a consenting player's switch ON, exactly as before U33a-P (the platform's decision is not the player's consent)"),
    o6state.on === true && o6state.outreach === false, JSON.stringify(o6state));
  setRecord(false);
}

/* ══ THE CONSENT CARD — what the player SEES when a save fails, a read fails, or a break is running ══════
 * Source-level (a client component needs a browser), each rule read where it lives, each with a red plant
 * below that puts the pre-2026-09-27 text back. The copy rule reads the dictionary itself. */
type CardSources = { card: string; action: string; page: string; lines: string[]; zhKeep: string[] };
const readSrc = (rel: string) => decomment(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8")).replace(/\r\n/g, "\n");
const REAL_CARD: CardSources = {
  card: readSrc("src/app/profile/notifications/marketing-consent.tsx"),
  action: readSrc("src/app/profile/notifications/actions.ts"),
  page: readSrc("src/app/profile/notifications/page.tsx"),
  lines: [dict.en, dict.sw, dict.zh].flatMap((d) => [d.push.marketingPaused, d.push.marketingHeld, d.push.marketingHeldNoDate]),
  // consent-02 · the zh lines this page renders `break-keep` — each must carry its own phrase breaks.
  zhKeep: [dict.zh.push.marketingPaused, dict.zh.push.marketingHeld, dict.zh.push.marketingHeldNoDate, dict.zh.push.marketingUnavailable, dict.zh.watchlist.alertsHint],
};
/** A call to switch gambling offers back on, or a word saying the setting will resume by itself. */
const NUDGE = /Switch it on to|opt in again|Paused|Iwashe|ukubali tena|Imesitishwa|开启即表示|已暂停/i;

/** consent-02 · under `break-keep` a zh line can break only at a U+200B hint, a space or CJK punctuation. A run
 *  longer than the ~13 glyphs the 360 column holds is then broken by `overflow-wrap:anywhere` — mid-word again —
 *  so the longest run is held well under it. */
const ZWSP = String.fromCharCode(0x200b);
const KEEP_MAX = 7;
const hanCount = (x: string) => x.match(/\p{Script=Han}/gu)?.length ?? 0;
const longestKeepRun = (line: string): string =>
  line.split(ZWSP).flatMap((x) => x.split(/[\s，。、；：！？（）—]+|\{\w+\}/u))
    .reduce((a, b) => (hanCount(b) > hanCount(a) ? b : a), "");

function assertConsentCard(s: CardSources, tag: string): void {
  const p = (n: string) => `${tag}${n}`;
  ok(p("C0 · ⚠️ CONTROL — the card, its action and its page were read, and the nine RG lines exist"),
    s.card.length > 1_000 && s.action.length > 500 && s.page.length > 1_000 && s.lines.length === 9 && s.lines.every((l) => l.length > 20),
    `${s.card.length}/${s.action.length}/${s.page.length} chars · ${s.lines.length} lines`);
  ok(p("C1 · ⭐ the consent sentence is ALWAYS on screen — a failure never replaces it (the retry is tapped beside the sentence the ledger records as shown)"),
    /<p className="[^"]*">\{t\.push\.marketingBody\}<\/p>/.test(s.card) && !/t\.error\.somethingDidntWork/.test(s.card));
  ok(p("C2 · a failure answers on the push switch's channel — a factual toast with its next step (§F2, §F4)"),
    /toast\(\{ title, description, variant: "factual" \}\)/.test(s.card));
  ok(p("C3 · ⭐ a lapsed session is `signed_out` before anything is written — the card says sign in again and links to it"),
    /if \(!session\) return \{ ok: false, reason: "signed_out", on: null \};/.test(s.action)
      && s.action.indexOf('reason: "signed_out"') < s.action.indexOf("recordPlayerMarketingChoice(")
      && /t\.push\.marketingErrSignedOut/.test(s.card) && /href="\/auth\/login\?next=\/profile\/notifications"/.test(s.card));
  ok(p("C4 · D4b · the switch is locked while a break or self-exclusion is in force, and the card says until when"),
    /disabled=\{pending \|\| held\}/.test(s.card) && /<HeldLine template=\{t\.push\.marketingHeld\} date=\{heldUntil\} \/>/.test(s.card));
  ok(p("C5 · ⭐ after a failure the switch shows what the server READ — the pre-tap guess only when nothing was read, and then the page is re-read"),
    /setOn\(typeof r\.on === "boolean" \? r\.on : !want\)/.test(s.card) && /router\.refresh\(\)/.test(s.card));
  ok(p("C6 · ⭐ a failed read renders the card WITHOUT a switch and with our desk — never nothing"),
    /<MarketingConsentUnavailable t=\{t\} \/>/.test(s.page) && !/\{marketing && <MarketingConsent/.test(s.page)
      && /SUPPORT_PHONE_TEL\(\)/.test(s.page) && /t\.push\.marketingUnavailable/.test(s.page));
  ok(p("C7 · the title keeps its last two words together ('by SMS', 'kwa SMS') — no lone channel word at 360"),
    /<MarketingTitle text=\{t\.push\.marketingTitle\} \/>/.test(s.card) && /whitespace-nowrap">\{text\.slice\(cut \+ 1\)\}/.test(s.card));
  const nudging = s.lines.filter((l) => NUDGE.test(l));
  ok(p("C8 · ⛔ the lapse and hold lines STATE the mechanism in all three languages — no call to switch gambling offers back on, no 'paused'"),
    nudging.length === 0, nudging.join(" | "));
  ok(p("C9 · ⭐ consent-01 · the end date is written in the PAGE'S language (formatHeldUntil), never formatDate's en-GB, and kept on one line"),
    /formatHeldUntil\(marketing\.heldUntil, locale, t\.common\.monthsShort\)/.test(s.page) && !/\bformatDate\b/.test(s.page)
      && /<span className="whitespace-nowrap">\{date\}<\/span>/.test(s.card));
  ok(p("C10 · consent-02 · the held and paused notes, the unreadable line and the watchlist hint are break-keep — and the PINNED consent sentence is not (it cannot carry break hints)"),
    /const NOTE = "[^"]*\bbreak-keep \[overflow-wrap:anywhere\][^"]*";/.test(s.card)
      && /<p className=\{NOTE\} data-testid="marketing-consent-held">/.test(s.card)
      && /<p className=\{NOTE\} data-testid="marketing-consent-paused">/.test(s.card)
      && /<p className="(?![^"]*break-keep)[^"]*">\{t\.push\.marketingBody\}<\/p>/.test(s.card)
      && /<p className="[^"]*\bbreak-keep \[overflow-wrap:anywhere\][^"]*">\{t\.push\.marketingUnavailable\}<\/p>/.test(s.page)
      && /<p className="[^"]*\bbreak-keep \[overflow-wrap:anywhere\][^"]*">\{t\.watchlist\.alertsHint\}<\/p>/.test(s.page));
  const runs = s.zhKeep.map(longestKeepRun);
  ok(p(`C11 · consent-02 · every zh line rendered break-keep carries its phrase breaks — no unbreakable run over ${KEEP_MAX} glyphs (the 360 column holds ~13)`),
    s.zhKeep.length === 5 && s.zhKeep.every((l) => l.includes(ZWSP)) && runs.every((r) => hanCount(r) <= KEEP_MAX),
    runs.map((r) => `${hanCount(r)}:${r}`).join(" · "));
}

/* ══ consent-01 · THE HELD DATE, EXECUTED — the formatter the page calls, on a fixed clock ══════════════════ */
type HeldFmt = (iso: string, locale: "en" | "sw" | "zh", nowMs: number) => string | null;
const REAL_HELD: HeldFmt = (iso, l, nowMs) => formatHeldUntil(iso, l, dict[l].common.monthsShort, nowMs);
const HELD_NOW = Date.parse("2026-09-27T09:00:00.000Z"); // 12:00 in Dar es Salaam
const ENGLISH_MONTH = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\b/;

function assertHeldDate(fmt: HeldFmt, tag: string): void {
  const p = (n: string) => `${tag}${n}`;
  const all = (iso: string) => ({ en: fmt(iso, "en", HELD_NOW), sw: fmt(iso, "sw", HELD_NOW), zh: fmt(iso, "zh", HELD_NOW) });
  const dec = all("2026-12-02T09:00:00.000Z");
  ok(p("H1 · ⭐ each language writes its OWN month — '2 Dec' · '2 Des' · '2026年12月2日', never an English month inside sw or zh"),
    dec.en === "2 Dec" && dec.sw === "2 Des" && dec.zh === "2026年12月2日" && !ENGLISH_MONTH.test(`${dec.sw} ${dec.zh}`),
    JSON.stringify(dec));
  const nextYear = all("2027-03-10T09:00:00.000Z");
  ok(p("H2 · a self-exclusion that ends NEXT year says so — '10 Mar 2027' · '10 Mac 2027' · '2027年3月10日'"),
    nextYear.en === "10 Mar 2027" && nextYear.sw === "10 Mac 2027" && nextYear.zh === "2027年3月10日", JSON.stringify(nextYear));
  const midnight = fmt("2026-09-30T21:30:00.000Z", "en", HELD_NOW);
  ok(p("H3 · the day is TANZANIA'S — 21:30Z on 30 Sep is 00:30 on 1 Oct in Dar es Salaam"), midnight === "1 Oct", String(midnight));
  const hour = all("2026-09-27T10:00:30.000Z");
  ok(p("H4 · an end less than a day away says the EAT clock, 24-hour, rounded UP — a one-hour break never reads 'until <today>'"),
    hour.en === "27 Sep, 13:01" && hour.sw === "27 Sep, 13:01" && hour.zh === "2026年9月27日 13:01", JSON.stringify(hour));
  ok(p("H5 · an unreadable date gives null, so the card shows the line without a date"), fmt("not a date", "sw", HELD_NOW) === null);
}

/** The switch written out so one step at a time can be made wrong. With no flag set it is asserted to
 *  agree with the shipped writer on every T-case before any plant is trusted. */
type ToggleDefect = {
  noLift?: boolean; liftsAnyReason?: boolean; booleanState?: boolean; booleanOnlyWrite?: boolean;
  // ── 2026-09-27 ──
  heldReadsOn?: boolean;    // pre-D4b: a break still running falls through to ON (only a LAPSED refusal read OFF)
  heldWrites?: boolean;     // pre-D4b: an ON mid-break is written as a GIVEN row certain to lapse
  guessOnThrow?: boolean;   // the old catch: `on: !want` whatever the writes did
  // ── U33a-P (2026-10-05) ──
  outreachOverStop?: boolean;   // an outreach ON survives an active OPERATOR stop (the switch lies about the gate)
  outreachWhileClosed?: boolean; // outreach ON although the licence record is closed
  outreachWritesGiven?: boolean; // "nothing to do" writes a GIVEN anyway — a consent invented from a tap
};
/**
 * ⛔ `liftsAnyReason` IS PLANTED ACROSS BOTH LAYERS (2026-09-27). The store's own `suppression.lift` now refuses
 * a row that is not WITHDRAWN (defence in depth — `test:dal-parity` 17.liftreason, and T2c above), so a model
 * that dropped only the SERVICE's check still lifted nothing, and toggle case 2 stayed GREEN: it could no longer
 * show that T2b fails when the defect is real. This is the store's `lift` with its reason filter gone too — the
 * active row `find` returned (the memory twin hands back the stored row itself) superseded as the pre-fix
 * store did, once, never deleted. Planting code only; the defect-free model calls the real `lift`.
 */
function liftIgnoringReason(row: StoredSuppression, reason: string): boolean {
  if (row.liftedAt) return false;
  row.liftedAt = new Date().toISOString();
  row.liftedReason = reason;
  return true;
}
function toggleModel(d: ToggleDefect): ToggleImpl {
  const state = async (u: StoredUser): Promise<MarketingToggleState> => {
    if (d.booleanState) return { on: u.marketingOptIn === true, paused: false, held: false, heldUntil: null, outreach: false };
    const s = await marketingToggleState(u);
    /* U33a-P plants. ⛔ Both act only on a NON-consenting player (the licence path), so the consent path's own
       assertions stay green and each plant turns red the line that names it. */
    if ((d.outreachWhileClosed || d.outreachOverStop) && u.marketingOptIn !== true && !s.on && !s.held) {
      const key = { channel: "SMS" as const, identifier: toMsisdn255(u.phoneE164), category: "MARKETING" as const };
      const stop = await Promise.resolve(db.suppression.find(key));
      if (d.outreachOverStop ? stop !== null : stop === null) {
        return { on: true, paused: false, held: false, heldUntil: null, outreach: true };
      }
    }
    return d.heldReadsOn && s.held ? { on: u.marketingOptIn === true, paused: false, held: false, heldUntil: null, outreach: false } : s;
  };
  const choose: ToggleImpl["choose"] = async ({ userId, marketingOptIn, locale }) => {
    const want = marketingOptIn === true;
    let liftedStop = false;
    let changed = false;
    try {
      const u = (await Promise.resolve(db.user.findById(userId))) as StoredUser;
      const before = await state(u);
      if (want && before.held && !d.heldWrites) return { ok: false, on: false, changed, liftedStop, held: true };
      const nothing = d.booleanOnlyWrite ? u.marketingOptIn === want : (want ? before.on : (!before.on && u.marketingOptIn !== true));
      if (nothing && !(d.outreachWritesGiven && want)) return { ok: true, on: want, changed, liftedStop };
      const key = { channel: "SMS" as const, identifier: toMsisdn255(u.phoneE164), category: "MARKETING" as const };
      if (want && !d.noLift) {
        const stop = await Promise.resolve(db.suppression.find(key));
        if (stop && (d.liftsAnyReason || isPersonCreatedSuppression(stop.reason))) {
          liftedStop = d.liftsAnyReason
            ? liftIgnoringReason(stop, "profile")
            : (await Promise.resolve(db.suppression.lift(key, "profile", new Date().toISOString()))) !== null;
        }
      }
      if (u.marketingOptIn !== want) await Promise.resolve(db.user.update(u.id, { marketingOptIn: want }));
      changed = true;
      await appendMarketingConsent({ phoneE164: u.phoneE164, locale, status: want ? "GIVEN" : "WITHDRAWN", source: "PROFILE", site: "PROFILE", evidence: "/profile/notifications", recordedBy: null });
      const after = await state({ ...u, marketingOptIn: want });
      return { ok: after.on === want, on: after.on, changed, liftedStop };
    } catch {
      if (d.guessOnThrow) return { ok: false, on: !want, changed, liftedStop };
      let on: boolean | null = null;
      try {
        const u2 = await Promise.resolve(db.user.findById(userId));
        on = u2 ? (await state(u2 as StoredUser)).on : null;
      } catch { on = null; }
      return { ok: on === want, on, changed, liftedStop };
    }
  };
  return { choose, state };
}

/* ══ RUN ════════════════════════════════════════════════════════════════════════════════════ */
if (!PROVE_RED) {
  const f = await seed(0);
  await runAssertions(mayReceiveMarketingSms, f, "");
  console.log("\n── U9 · the loop contract (dispatchSlice, two slices, three minds changed between them)\n");
  await runLoopContract(loopOver(dispatchSlice), 300, "");
  assertDispatchShape("");
  console.log("\n── U9 · U43b-1 · the hooks (the contract again with every row prepared, then prepare, beforeSend and TRANSPORT)\n");
  await runHookContract(dispatchSlice, 310, "");
  console.log("\n── D4 · the profile switch (recordPlayerMarketingChoice, judged by the gate)\n");
  await runToggleAssertions(REAL_TOGGLE, 500, "");
  console.log("\n── the consent card (what a failed save, a failed read and a running break look like)\n");
  assertConsentCard(REAL_CARD, "");
  console.log("\n── consent-01 · the held date, in the page's language (formatHeldUntil, fixed clock)\n");
  assertHeldDate(REAL_HELD, "");
  console.log("\n── U33a · the consent-basis catalogue (pure; its wordings are suggestions, and no basis writer records one an admin never saved)\n");
  assertConsentBasis(REAL_BASIS, "", ok);
  console.log("\n── U33a-G · the licence decision table (§3.2), executed with the record CLOSED and OPEN\n");
  await assertLicenceBasis(REAL_LICENCE, "", ok);
  console.log(`\nmarketing-consent: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];

  // §0 — the shipped gate passes first, or "every proof held" means nothing.
  const f0 = await seed(90);
  await runAssertions(mayReceiveMarketingSms, f0, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped gate is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline · shipped gate: ${pass} passed, ${fail} failed\n`);

  // §0b — the MODEL is faithful, so a flag is the only thing a red case can be blamed on.
  pass = 0; fail = 0; failed.length = 0;
  const fm = await seed(91);
  await runAssertions(gateWithDefect({}), fm, "model:");
  if (fail !== 0) problems.push(`MODEL: the defect-free model disagrees with the shipped gate (${failed.join(" | ")})`);
  console.log(`\n§0b model · no defect set: ${pass} passed, ${fail} failed\n`);

  const CASES: Array<{ name: string; defect: Defect; expect: string }> = [
    {
      name: "consent is asked BEFORE suppression (OD11 reversed) — last year's consent row out-argues \"stop\"",
      defect: { swapOrder: true },
      expect: "2 · ⛔ a SUPPRESSED number is refused even though its consent is valid — suppression is asked FIRST (OD11)",
    },
    {
      name: "the `+` bridge is dropped — every player is looked up with the marketing key and found to be a stranger",
      defect: { noBridge: true },
      expect: "1 · a consenting player is ALLOWED",
    },
    {
      name: "RG read the way isLockedOut reads it — only a RUNNING period refuses (D9 — the lift, reintroduced)",
      defect: { lockoutSemantics: true },
      expect: "7 · ⭐ a 24-hour self-exclusion that ELAPSED A YEAR AGO is still refused (D9 — the period ending is not the person asking)",
    },
    {
      name: "the RG predicate is asked unguarded, so ASKING WRITES a row per recipient (150k rows per campaign)",
      defect: { writesRgRow: true },
      expect: "14 · 🔴 the gate created NO ResponsibleGambling row — deciding must not write (150k recipients = 150k rows)",
    },
    {
      name: "an imported ledger row speaks over a player's own no (OD10 broken)",
      defect: { ledgerOverridesPlayer: true },
      expect: "10 · ⛔ an imported GIVEN row can NEVER speak over a player's own no (OD10)",
    },
    {
      name: "U7's own fix — a MISSING row is guarded, but an EXISTING row still goes through the writer (`effectivize`)",
      defect: { readsThroughWriter: true },
      expect: "18 · 🔴 a row whose pending limit rise has COME DUE is not rewritten by the gate — the write U7's fix missed",
    },
    {
      name: "U7's order — RG asked BEFORE consent (§5.6 reversed; the 10,000-row harm scan runs on every non-consenting player)",
      defect: { rgBeforeConsent: true },
      expect: "19 · §5.6 ORDER — a self-excluded player whose toggle is off is refused on CONSENT, which is asked first (the costly RG step never runs)",
    },
    {
      name: "pre-U10 — COOLED_OFF refused for ever as `account_status`, so a player who asks again after a break is never heard",
      defect: { breakNeverAdmitted: true },
      expect: "17 · ⭐ a break that ended, then a consent AFTER it: ALLOWED — the COOLED_OFF status nothing ever clears is admitted only then",
    },
    {
      name: "U11's RED — a missing date of birth is treated as ADULT",
      defect: { nullDobIsAdult: true },
      expect: "21 · ⭐ a consenting player with NO date of birth is refused as age_unknown — never treated as adult",
    },
    {
      name: "pre-U11 — a consenting contact is marketed with no 18+ attestation on record",
      defect: { contactAgeAssumed: true },
      expect: "5 · a contact who consented is refused ONLY on age — no 18+ attestation exists until U33 (OD14), and none is inferred",
    },
    {
      name: "pre-U12 — the published under-25 promise has no code behind it",
      defect: { under25Ignored: true },
      expect: "23 · ⭐ aged 20 with a break on record is refused even after re-consenting — U10's lift does not reach the under-25 promise",
    },
    // ── 2026-09-26 · D3, D5 and the gate audit ──
    {
      name: "🔴 OD8's old premise — the toggle alone is the player's consent, with no SMS-naming row behind it",
      defect: { toggleAloneConsents: true },
      expect: "27 · ⭐ OQ11 · toggle ON with NO ledger row (a pre-U6 opt-in) is refused — the toggle alone is no longer consent",
    },
    {
      name: "🔴 OQ11 undone — any GIVEN row counts, so 'Nipe matangazo (hiari).' qualifies again",
      defect: { anyWordingCounts: true },
      expect: "26 · ⭐ OQ11 · toggle ON under the OLD wording ('Nipe matangazo') is refused as no_consent — it never named SMS",
    },
    {
      name: "🔴 pre-D5 — the identity check is never read, so a KYC-established minor is marketed",
      defect: { kycIgnored: true },
      expect: "29 · 🔴 D5 · an adult account date of birth, but KYC refused the document as UNDERAGE — age_minor",
    },
    {
      name: "D5 half-done — UNDERAGE read, but a SANCTIONED refusal passes",
      defect: { sanctionedPasses: true },
      expect: "30 · D5 · a final SANCTIONED refusal refuses on account status, whatever User.status reads",
    },
    {
      name: "D5 half-done — the document's date of birth is never compared",
      defect: { kycDobIgnored: true },
      expect: "34 · ⭐ D5 · the account says 36, the identity document says 17 — the YOUNGER age governs: age_minor",
    },
    {
      name: "the 18 line off by one — `years + 1 >= 18` admits a 17-year-old",
      defect: { ageOffByOne: true },
      expect: "37 · ⭐ 17 years 364 days (20:59Z, 23:59 EAT) is a minor",
    },
    {
      name: "age on the UTC date — the 18th birthday arrives three hours late in Dar es Salaam",
      defect: { utcAge: true },
      expect: "37b · ⭐ …and one minute later it is the 18th birthday IN TANZANIA (21:00Z): ALLOWED",
    },
    {
      name: "the under-25 line drawn at 24",
      defect: { under25OffByOne: true },
      expect: "38 · ⭐ 24 years 364 days with a break on record is still under 25 (20:59Z)",
    },
    {
      name: "🔴 step 0 by LENGTH only — a consenting player on the dead NDC 064 is marketed (billed, never delivered)",
      defect: { lengthOnlyMsisdn: true },
      expect: "40d · ⭐ a CONSENTING PLAYER on NDC 064 is refused — tzPhone accepts it, but it has no live network (billed, never delivered)",
    },
    // ── 2026-10-03 · vb3 ──
    {
      name: "🔴 pre-vb3 step 0 — '+255 0712…' read as a 13-digit typo, so a consenting player who wrote the zero they dial at home is refused bad_msisdn",
      defect: { trunkZeroRefused: true },
      expect: "40b · ⭐ vb3 · '+255 0712…' — the trunk zero written after the country code — reaches the SAME consenting player: ALLOWED, under the right 255… key",
    },
    {
      name: "⛔ the key taken from the money rail (toMsisdn255 keeps the trunk zero) — '+255 0712…' read under 2550712…, where no stop and no consent is filed",
      defect: { moneyRailKey: true },
      expect: "40b2 · ⛔ vb3 · …and the same spelling of a SUPPRESSED number is refused as suppressed — its stop is read under the right key, never a wrong one",
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    const fx = await seed(i + 1);
    await runAssertions(gateWithDefect(c.defect), fx, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }

  // ── U9 · the loop contract: the shipped step green, the model faithful, then one plant at a time ──
  pass = 0; fail = 0; failed.length = 0;
  await runLoopContract(loopOver(dispatchSlice), 390, "loopbase:");
  assertDispatchShape("loopbase:");
  if (fail !== 0) problems.push(`LOOP BASELINE: the shipped dispatch step is already red (${failed.join(" | ")})`);
  console.log(`\n§0 loop baseline · dispatchSlice: ${pass} passed, ${fail} failed`);
  pass = 0; fail = 0; failed.length = 0;
  await runLoopContract(loopOver(dispatchModel({})), 391, "loopmodel:");
  if (fail !== 0) problems.push(`LOOP MODEL: the defect-free model disagrees with dispatchSlice (${failed.join(" | ")})`);
  console.log(`§0b loop model · no defect set: ${pass} passed, ${fail} failed\n`);

  const LOOP_CASES: Array<{ name: string; driver: Driver; expect: string }> = [
    {
      name: "⭐ the gate HOISTED to list-build time — asked once when the list is made, then the slices sent on that answer",
      driver: hoistedDriver(dispatchModel({})),
      expect: "U9.1 · ⭐ a number that OPTED OUT between slice one and slice two never reaches the wire — skipped as suppressed",
    },
    {
      name: "results settled by POSITION rather than by key",
      driver: loopOver(dispatchModel({ settleByIndex: true })),
      expect: "U9.6 · ⛔ settled by KEY, never by position — with the wire answering in reverse, each row got its OWN reference",
    },
    {
      name: "a gate refusal recorded as a FAILURE",
      driver: loopOver(dispatchModel({ skipAsFailed: true })),
      expect: "U9.5 · ⛔ every refusal is `skipped`, never `failed` — the only failure is the one the WIRE refused",
    },
    {
      name: "a gate that cannot answer is treated as a yes",
      driver: loopOver(dispatchModel({ gateErrorSends: true })),
      expect: "U9.10 · ⛔ a gate that cannot ANSWER holds the row and sends NOTHING — never a send on an unanswered question",
    },
    {
      name: "an RG refusal acted on with no audit line",
      driver: loopOver(dispatchModel({ noRgAudit: true })),
      expect: "U9.2b · …and the RG refusal left ONE COMPLIANCE audit line against the ACCOUNT, with no phone number in it (§5.14)",
    },
    {
      name: "🔴 pre-vb3 dispatch — the row's own spelling put on the wire: '+255 0712…' handed to sendBatch, whose toMsisdn255 keeps the zero, so a consenting player the gate cleared is refused BAD_MSISDN",
      driver: loopOver(dispatchModel({ rawOnWire: true })),
      expect: "U9.13 · ⭐ vb3 · a consenting player whose row is written '+255 0712…' is handed over under the GATE'S key — the wire is given 255712…, never the row's own spelling (sendBatch would rewrite that to 2550712… and refuse it BAD_MSISDN)",
    },
    {
      name: "U13 · the send window asked AFTER the gate — every recipient's gate asked, then the slice held for the window",
      driver: loopOver(dispatchModel({ windowAfterGate: true })),
      expect: U9_14,
    },
  ];
  for (const [i, c] of LOOP_CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `loopred${i + 1}:`;
    console.log(`── loop case ${i + 1}: ${c.name}`);
    await runLoopContract(c.driver, 400 + i, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`loop case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`loop case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }

  // ── U9 · U43b-1 · the hooks: the shipped step green, the model faithful, then one plant at a time ──
  pass = 0; fail = 0; failed.length = 0;
  await runHookContract(dispatchSlice, 392, "hookbase:");
  if (fail !== 0) problems.push(`HOOK BASELINE: the shipped dispatch step fails its hook clauses (${failed.join(" | ")})`);
  console.log(`\n§0 hook baseline · dispatchSlice: ${pass} passed, ${fail} failed`);
  pass = 0; fail = 0; failed.length = 0;
  await runHookContract(dispatchModel({}), 393, "hookmodel:");
  if (fail !== 0) problems.push(`HOOK MODEL: the defect-free model disagrees with dispatchSlice on the hooks (${failed.join(" | ")})`);
  console.log(`§0b hook model · no defect set: ${pass} passed, ${fail} failed\n`);

  const HOOK_CASES: Array<{ name: string; defect: LoopDefect; expect: string }> = [
    {
      name: "U43b-1 · R-S7 · every row prepared BEFORE its gate — the token minted for a person the gate then refuses (E1 undone)",
      defect: { prepareBeforeGate: true },
      expect: U9_16,
    },
    {
      name: "U43b-1 · vb3 for the link — the prepare handed the row's own spelling, not the gate's key ('+255 0712…' minted and rendered under a number nobody holds)",
      defect: { prepareRowKey: true },
      expect: U9_16,
    },
    {
      name: "U43b-1 · the prepare's meta and the gate's basis dropped from the outcomes — the settle would write a token, a language and a size it was never told",
      defect: { noCarry: true },
      expect: U9_16,
    },
    {
      name: "U43b-1 · a prepare that throws takes the whole slice down — every other person in it unsent, and their claims stranded",
      defect: { prepareThrowEscapes: true },
      expect: U9_17,
    },
    {
      name: "U43b-1 · R-S9 · beforeSend never asked — a campaign paused (or stopped) while it was gating still sends",
      defect: { noBeforeSend: true },
      expect: U9_18,
    },
    {
      name: "U43b-1 · R-R2 · beforeSend's keep ignored — a stalled claimant whose claims were reaped sends them anyway (E6's double send)",
      defect: { keepIgnored: true },
      expect: U9_19,
    },
    {
      name: "U43b-1 · R-S2 · a TRANSPORT result settled as 'failed' — the lost reply invites a retry, a second SMS at a second charge (F1)",
      defect: { transportAsFailed: true },
      expect: U9_20,
    },
    {
      name: "U43b-1 · a row with both a body and a prepare (or neither) dispatched anyway — which text went is an accident of the code's order",
      defect: { noShapeCheck: true },
      expect: U9_21,
    },
  ];
  for (const [i, c] of HOOK_CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `hookred${i + 1}:`;
    console.log(`── hook case ${i + 1}: ${c.name}`);
    await runHookContract(dispatchModel(c.defect), 420 + i, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`hook case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`hook case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }

  // ── D4 · the profile switch: the shipped writer green, the model faithful, then one plant at a time ──
  pass = 0; fail = 0; failed.length = 0;
  await runToggleAssertions(REAL_TOGGLE, 590, "togglebase:");
  if (fail !== 0) problems.push(`TOGGLE BASELINE: the shipped writer is already red (${failed.join(" | ")})`);
  console.log(`\n§0 toggle baseline · recordPlayerMarketingChoice: ${pass} passed, ${fail} failed`);
  pass = 0; fail = 0; failed.length = 0;
  await runToggleAssertions(toggleModel({}), 591, "togglemodel:");
  if (fail !== 0) problems.push(`TOGGLE MODEL: the defect-free model disagrees with the shipped writer (${failed.join(" | ")})`);
  console.log(`§0b toggle model · no defect set: ${pass} passed, ${fail} failed\n`);

  const TOGGLE_CASES: Array<{ name: string; defect: ToggleDefect; expect: string }> = [
    {
      name: "U33a-P · an outreach ON survives an active OPERATOR stop",
      defect: { outreachOverStop: true },
      expect: "T-O2 · ⛔ ANY active stop reads OFF here, an OPERATOR stop included — stricter than the consent path on purpose: nobody said yes, so the switch must never read ON while the gate refuses",
    },
    {
      name: "U33a-P · outreach ON while the licence record is CLOSED",
      defect: { outreachWhileClosed: true },
      expect: "T-O1 · ⭐ U33a-P · a never-asked player reads OFF while the record is CLOSED, and ON with outreach:true once it is OPEN — the switch follows the basis that actually reaches them",
    },
    {
      name: "U33a-P · \"nothing to do\" writes a GIVEN anyway — a consent invented from a tap",
      defect: { outreachWritesGiven: true },
      expect: "T-O4 · ⛔ an ON tapped while the switch ALREADY reads ON (outreach) writes NOTHING — a consent is never invented out of a tap that changed nothing",
    },
    {
      name: "🔴 the pre-D4 switch — ON never lifts the player's own stop, so it reads ON and is refused for ever",
      defect: { noLift: true },
      expect: "T1c · ⭐ D4 · the player's own ON lifts the stop THEY made — the gate ALLOWS, not 'suppressed' for ever",
    },
    {
      name: "⛔ the player's tap lifts ANY suppression — an officer's, a complaint's, a self-exclusion's",
      defect: { liftsAnyReason: true },
      expect: "T2b · ⛔ …and the player's OFF→ON never lifts it — still refused on the suppression, the OPERATOR row still refusing",
    },
    {
      name: "🔴 the switch shows the bare boolean — ON after a break the gate refuses",
      defect: { booleanState: true },
      expect: "T3b · ⭐ D4 · …and the switch shows OFF, marked paused — not the ON the boolean still reads",
    },
    {
      name: "🔴 a consent is written only when the boolean CHANGES — after a break there is no way to opt in again",
      defect: { booleanOnlyWrite: true },
      expect: "T3c · ⭐ ONE tap ON is the 'opt in again after it ends' RG §4 promises — the gate ALLOWS",
    },
    {
      name: "🔴 pre-D4b — a break still running falls through to ON, a consent the gate will never act on",
      defect: { heldReadsOn: true },
      expect: "T8a · ⭐ D4b · during the break the switch reads OFF and HELD, with the break's end date — never ON",
    },
    {
      name: "🔴 pre-D4b — an ON tapped mid-break is written as a GIVEN row certain to lapse",
      defect: { heldWrites: true },
      expect: "T8b · ⛔ D4b · an ON tapped during the break writes NOTHING and answers held — no GIVEN row certain to lapse",
    },
    {
      name: "🔴 the old catch — a throw after the writes landed answers the guess !want, so a recorded OFF shows ON",
      defect: { guessOnThrow: true },
      expect: "T9a · ⭐ …and the answer is the RE-READ state, OFF as stored — not the guess !want (ON) that snapped the switch back",
    },
  ];
  for (const [i, c] of TOGGLE_CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `togglered${i + 1}:`;
    console.log(`── toggle case ${i + 1}: ${c.name}`);
    await runToggleAssertions(toggleModel(c.defect), 600 + i, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`toggle case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`toggle case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }

  // ── the consent card: the shipped sources green first, then one pre-fix text at a time ──
  pass = 0; fail = 0; failed.length = 0;
  assertConsentCard(REAL_CARD, "cardbase:");
  if (fail !== 0) problems.push(`CARD BASELINE: the shipped card is already red (${failed.join(" | ")})`);
  console.log(`\n§0 card baseline · marketing-consent.tsx / actions.ts / page.tsx: ${pass} passed, ${fail} failed\n`);
  const plant = (field: "card" | "action" | "page", from: string, to: string): CardSources => {
    const src = REAL_CARD[field];
    // ⛔ A plant that matches nothing proves nothing — it must hit the shipped text exactly once.
    if (src.split(from).length !== 2) problems.push(`card plant "${from.slice(0, 50)}" does not match ${field} exactly once`);
    const planted: CardSources = { ...REAL_CARD };
    planted[field] = src.replace(from, to);
    return planted;
  };
  const CARD_CASES: Array<{ name: string; src: CardSources; expect: string }> = [
    {
      name: "🔴 the pre-fix failure SWAPS the consent sentence for 'Something didn't work. Try again.'",
      src: plant("card", ">{t.push.marketingBody}</p>", ">{failed ? t.error.somethingDidntWork : t.push.marketingBody}</p>"),
      expect: "C1 · ⭐ the consent sentence is ALWAYS on screen — a failure never replaces it (the retry is tapped beside the sentence the ledger records as shown)",
    },
    {
      name: "🔴 a lapsed session answers a bare { ok: false } — the card can only say 'try again', which never succeeds",
      src: plant("action", 'if (!session) return { ok: false, reason: "signed_out", on: null };', "if (!session) return { ok: false, on: null };"),
      expect: "C3 · ⭐ a lapsed session is `signed_out` before anything is written — the card says sign in again and links to it",
    },
    {
      name: "🔴 pre-D4b — the switch stays tappable during a break",
      src: plant("card", "disabled={pending || held}", "disabled={pending}"),
      expect: "C4 · D4b · the switch is locked while a break or self-exclusion is in force, and the card says until when",
    },
    {
      name: "🔴 a failure snaps the switch to the guess !want whatever the server read",
      src: plant("card", 'setOn(typeof r.on === "boolean" ? r.on : !want);', "setOn(!want);"),
      expect: "C5 · ⭐ after a failure the switch shows what the server READ — the pre-tap guess only when nothing was read, and then the page is re-read",
    },
    {
      name: "🔴 a failed read leaves the card OFF the page — /s and Privacy §3 send people to a control that is not there",
      src: plant("page", "<MarketingConsentUnavailable t={t} />", "null"),
      expect: "C6 · ⭐ a failed read renders the card WITHOUT a switch and with our desk — never nothing",
    },
    {
      name: "🔴 the title wraps word by word again — 'SMS' alone on line two at 360",
      src: plant("card", "<MarketingTitle text={t.push.marketingTitle} />", '<p className="font-display">{t.push.marketingTitle}</p>'),
      expect: "C7 · the title keeps its last two words together ('by SMS', 'kwa SMS') — no lone channel word at 360",
    },
    {
      name: "🔴 the pre-fix lapse line — 'Paused … Switch it on to opt in again.' (a nudge back to gambling offers)",
      src: { ...REAL_CARD, lines: [...REAL_CARD.lines.slice(1), "Paused when your break or self-exclusion ended. Switch it on to opt in again."] },
      expect: "C8 · ⛔ the lapse and hold lines STATE the mechanism in all three languages — no call to switch gambling offers back on, no 'paused'",
    },
    {
      name: "🔴 consent-01 · the pre-fix page — formatDate's en-GB 'Sept' inside the Swahili and Chinese sentences",
      src: plant("page", "formatHeldUntil(marketing.heldUntil, locale, t.common.monthsShort)", "formatDate(marketing.heldUntil)"),
      expect: "C9 · ⭐ consent-01 · the end date is written in the PAGE'S language (formatHeldUntil), never formatDate's en-GB, and kept on one line",
    },
    {
      name: "🔴 consent-02 · the notes lose break-keep — zh splits 结|束 and 除|非 at 360 again",
      src: plant("card", " break-keep [overflow-wrap:anywhere]\";", "\";"),
      expect: "C10 · consent-02 · the held and paused notes, the unreadable line and the watchlist hint are break-keep — and the PINNED consent sentence is not (it cannot carry break hints)",
    },
    {
      name: "🔴 consent-02 · a zh line without its phrase breaks — keep-all cannot break it, so overflow-wrap splits it mid-word",
      src: { ...REAL_CARD, zhKeep: [...REAL_CARD.zhKeep.slice(1), REAL_CARD.zhKeep[0].split(ZWSP).join("")] },
      expect: `C11 · consent-02 · every zh line rendered break-keep carries its phrase breaks — no unbreakable run over ${KEEP_MAX} glyphs (the 360 column holds ~13)`,
    },
  ];
  for (const [i, c] of CARD_CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `cardred${i + 1}:`;
    console.log(`── card case ${i + 1}: ${c.name}`);
    assertConsentCard(c.src, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`card case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`card case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }

  // ── consent-01 · the held date: the shipped formatter green first, then one wrong formatter at a time ──
  pass = 0; fail = 0; failed.length = 0;
  assertHeldDate(REAL_HELD, "heldbase:");
  if (fail !== 0) problems.push(`HELD BASELINE: the shipped formatter is already red (${failed.join(" | ")})`);
  console.log(`\n§0 held baseline · formatHeldUntil: ${pass} passed, ${fail} failed\n`);
  const HELD_CASES: Array<{ name: string; fmt: HeldFmt; expect: string }> = [
    {
      name: "🔴 the pre-fix formatter — `formatDate`, en-GB whatever the page ('28 Sept 2026' in every language)",
      fmt: (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Dar_es_Salaam" }),
      expect: "H1 · ⭐ each language writes its OWN month — '2 Dec' · '2 Des' · '2026年12月2日', never an English month inside sw or zh",
    },
    {
      name: "the year dropped — a self-exclusion ending next year reads as this year",
      fmt: (iso, l, now) => { const s = REAL_HELD(iso, l, now); return s && l !== "zh" ? s.replace(/ \d{4}$/, "") : s; },
      expect: "H2 · a self-exclusion that ends NEXT year says so — '10 Mar 2027' · '10 Mac 2027' · '2027年3月10日'",
    },
    {
      name: "the UTC day and clock, not Tanzania's — three hours behind the break it describes",
      fmt: (iso, l, now) => { const ms = Date.parse(iso); return Number.isFinite(ms) ? REAL_HELD(new Date(ms - EAT_OFFSET_MS).toISOString(), l, now - EAT_OFFSET_MS) : null; },
      expect: "H3 · the day is TANZANIA'S — 21:30Z on 30 Sep is 00:30 on 1 Oct in Dar es Salaam",
    },
    {
      name: "no clock — a one-hour break reads 'until <today>'",
      fmt: (iso, l, now) => REAL_HELD(iso, l, now)?.replace(/,? \d{2}:\d{2}$/, "") ?? null,
      expect: "H4 · an end less than a day away says the EAT clock, 24-hour, rounded UP — a one-hour break never reads 'until <today>'",
    },
  ];
  for (const [i, c] of HELD_CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `heldred${i + 1}:`;
    console.log(`── held case ${i + 1}: ${c.name}`);
    assertHeldDate(c.fmt, tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`held case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`held case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }

  // ── U33a · the consent-basis catalogue: the shipped catalogue green, the model faithful, then one plant at a time ──
  pass = 0; fail = 0; failed.length = 0;
  assertConsentBasis(REAL_BASIS, "basisbase:", ok);
  if (fail !== 0) problems.push(`BASIS BASELINE: the shipped catalogue is already red (${failed.join(" | ")})`);
  console.log(`\n§0 basis baseline · consent-basis.ts: ${pass} passed, ${fail} failed`);
  pass = 0; fail = 0; failed.length = 0;
  assertConsentBasis(basisModel({}), "basismodel:", ok);
  if (fail !== 0) problems.push(`BASIS MODEL: the defect-free model disagrees with the shipped catalogue (${failed.join(" | ")})`);
  console.log(`§0b basis model · no defect set: ${pass} passed, ${fail} failed\n`);
  const BASIS_CASES = basisCases(problems);
  for (const [i, c] of BASIS_CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `basisred${i + 1}:`;
    console.log(`── basis case ${i + 1}: ${c.name}`);
    assertConsentBasis(c.impl, tag, ok);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`basis case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`basis case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }

  // ── U33a-G · the licence table: the shipped gate green, then one wrongly-answering gate at a time ──
  pass = 0; fail = 0; failed.length = 0;
  await assertLicenceBasis(REAL_LICENCE, "licbase:", ok);
  if (fail !== 0) problems.push(`LICENCE BASELINE: the shipped gate is already red (${failed.join(" | ")})`);
  console.log(`\n§0 licence baseline · the shipped gate: ${pass} passed, ${fail} failed\n`);
  const LICENCE_CASES = licenceCases();
  for (const [i, c] of LICENCE_CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `licred${i + 1}:`;
    console.log(`── licence case ${i + 1}: ${c.name}`);
    await assertLicenceBasis(licenceGateWithDefect(c.defect), tag, ok);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`licence case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`licence case ${i + 1} (${c.name}): red, but not on its own row — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect.slice(0, 70)}…
`);
  }

  const caughtGate = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  const caughtLoop = LOOP_CASES.length - problems.filter((x) => x.startsWith("loop case")).length;
  const caughtHook = HOOK_CASES.length - problems.filter((x) => x.startsWith("hook case")).length;
  const caughtToggle = TOGGLE_CASES.length - problems.filter((x) => x.startsWith("toggle case")).length;
  const caughtCard = CARD_CASES.length - problems.filter((x) => x.startsWith("card case")).length;
  const caughtHeld = HELD_CASES.length - problems.filter((x) => x.startsWith("held case")).length;
  const caughtBasis = BASIS_CASES.length - problems.filter((x) => x.startsWith("basis case")).length;
  const caught = caughtGate + caughtLoop + caughtHook + caughtToggle + caughtCard + caughtHeld + caughtBasis;
  console.log(`\ngate ${caughtGate}/${CASES.length} · loop ${caughtLoop}/${LOOP_CASES.length} · hook ${caughtHook}/${HOOK_CASES.length} · toggle ${caughtToggle}/${TOGGLE_CASES.length} · card ${caughtCard}/${CARD_CASES.length} · held ${caughtHeld}/${HELD_CASES.length} · basis ${caughtBasis}/${BASIS_CASES.length}`);
  console.log(`${caught}/${CASES.length + LOOP_CASES.length + HOOK_CASES.length + TOGGLE_CASES.length + CARD_CASES.length + HELD_CASES.length + BASIS_CASES.length} caught`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
