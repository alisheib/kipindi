/**
 * ERASURE — the PII goes, the money stays, and the AML control survives.
 *
 *   npx tsx scripts/erasure.test.mts        (npm run test:erasure)
 *
 * ⛔ WHY THIS SUITE IS THE POINT OF THE FEATURE, NOT ITS PAPERWORK.
 *
 * `anonymizeClosedAccount` sits on top of a P0 AML control. Since the NIDA contract
 * migration the partial unique index over the identity document is the SOLE enforcement of
 * one-document-one-account, and an erasure routine written the obvious way — null the
 * number — silently repeals it. Ali's decision (COMPLIANCE-DECISIONS 2026-08-21 item 3)
 * closes that: the number is replaced by a KEYED HMAC of itself, never NULL, on the
 * reasoning that *"the same document still hashes to the same value, so the index still
 * rejects the second account."*
 *
 * 🔴 §7b MEASURES THAT SENTENCE AND IT IS NOT TRUE ON ITS OWN. A unique index compares
 * STORED STRINGS: after the release the row holds a hash, the next applicant writes the RAW
 * number, and nothing collides. `red:erasure` case 1 puts exactly that implementation back
 * — hash into `idNumber`, no fingerprint — and §7b reports a SECOND ACCOUNT on one national
 * ID. The fix is that the collision happens on `KycSubmission.idFingerprint`, a value BOTH
 * rows carry.
 *
 * ⭐ PART C (2026-10-11) SPLIT THE OLD §5 IN TWO, because the owner's ruling of 2026-10-10 —
 * "keep 7 years but no notice — we have our licence to do this, it's ok" — HOLDS the typed
 * identity (number, name, date of birth, on every submission and every prior identity) for
 * seven years from closure. §5 is now DURING THE HOLD: the identity kept exactly as it was,
 * the fingerprint written at once, the officers' free text redacted at once, the document
 * still refused on its raw number, a re-run a no-op. §7b is AFTER YEAR 7: the identity
 * pseudonymised by the one rule, the document still refused — on the fingerprint alone, which
 * is where cases 1 and 19 bite. §7c proves the release also empties the account's own KYC
 * folder in R2, and only that folder.
 *
 * ⛔ AND §5/§7b ARE DRIVEN THROUGH THE REAL SERVICE, NEVER THROUGH THE DAL. A test that
 * asserts "the fingerprints are equal" proves an HMAC is deterministic. The question is
 * whether a PERSON can open a second account, so they call `submitIdentityStep` — the same
 * function `/profile/kyc` calls — and read the refusal the player would get.
 *
 * ⭐ §8 IS A SWEEP, NOT A CHECKLIST. Every other section names the fields it expects to be
 * cleared, which is only ever as complete as the person who wrote the list. §8 walks the
 * WHOLE store looking for the erased phone number, name, email and national ID, and fails
 * on anything holding one that is not on a written allowlist with a statute beside it. It
 * found two surfaces the hand-written brief missed — the referrer's notification body and
 * `KycSubmission.extraRequests` — which is the entire argument for writing it that way.
 *
 * ⭐ §2b AND THE SIX HOUSE BUCKETS IN §8 ARE R6 (04 A5; C5-SPEC ruling 244). A holder's account can
 * BE a house bot, and then the holder's name is on the bot's label, its case-insensitive key, the
 * officer's note and reason, every reason on its events and presses, and in an officer's inbox — a
 * row erasure does not own. §2b proves the routine REFUSES while the bot is live (nothing erased,
 * one owner alert across two attempts) and §8 sweeps all six tables afterwards.
 *
 * ⛔ WHAT THIS SUITE DOES NOT PROVE, AND WHERE IT IS PROVEN INSTEAD — cited, never duplicated:
 *   · the request staying PENDING through the DSAR queue, the R6 refusal copy on the admin surface
 *     and the re-run reporting zero — `test:house-bot-designation` §8, on BOTH stores;
 *   · that a holder CLOSING their account removes the bot in the first place, with
 *     `HOUSE_BOT_ENGINE=false` — `test:house-bot-engine` 19.8b (ruling 245), on both stores. That is
 *     the path that makes §2b's refusal a backstop rather than the everyday case.
 *
 * Proved red by `npm run red:erasure`.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.OTP_PEPPER ??= "test-only-pepper";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";
import { db } from "../src/lib/server/store.ts";
import {
  anonymizeClosedAccount, erasedPhoneTombstone, isErasedPhone, identityHeldUntil, listHeldIdentities,
  ERASED_AUTHOR_NAME, ERASED_COMMENT_BODY, ERASED_REQUEST_DESCRIPTION, KYC_DOCUMENT_HOLD_YEARS,
} from "../src/lib/server/erasure.ts";
import { addComment, listComments } from "../src/lib/server/comments-store.ts";
// ⭐ Part C · §7c drives the REAL folder lister and delete against a fake S3 client.
import { __setKycS3ClientForTests, kycUserKeyPrefix, listKycDocumentKeys } from "../src/lib/server/storage.ts";
import { submitIdentityStep, startKyc } from "../src/lib/server/kyc-service.ts";
import { identityFingerprint } from "../src/lib/server/crypto.ts";
import { maskName } from "../src/lib/server/affiliate-service.ts";
import { verifyChain, getAuditPage } from "../src/lib/server/audit.ts";
import { computeTrialBalance } from "../src/lib/server/ledger.ts";
import { positionStore } from "../src/lib/server/market-dal.ts";
import { notifyReferralJoined } from "../src/lib/server/notification-service.ts";
import { ledgerStamp } from "../src/lib/server/marketing/ledger-stamp.ts";
import { ERASURE_EVIDENCE, ERASURE_LEDGER_WORDING, eraseMarketingFor, marketingKeyOf } from "../src/lib/server/marketing/erase.ts";
import { toMsisdn255 } from "../src/lib/phone-normalize.ts";
import { mayReceiveMarketingSms } from "../src/lib/server/marketing/consent.ts";
import { marketingDsarView } from "../src/lib/server/marketing/dsar.ts";
import { buildDsarBundle } from "../src/lib/server/privacy.ts";
import { exportUserData } from "../src/lib/server/user-service.ts";
import type { StoredContactImportRow, StoredMarketingContact } from "../src/lib/server/store.ts";
// 04 A5 / R6 (C5-SPEC ruling 244): the six house tables a holder's erasure has to reach or sweep.
import {
  houseBotStore, houseBotEventStore, houseBotIntentStore, pressStore, targetStore, newHouseId,
} from "../src/lib/server/house-bot-dal.ts";
// MASWALI-BUILD S6 · MB-67 · Millionea's record, which erasure must leave whole (the memory halves: no DATABASE_URL here).
import { noticeStore, questionStore, ticketStore, weekStore } from "../src/lib/server/maswali-dal.ts";

/** Captured before any section silences the service's console chatter. */
const LOG = console.log.bind(console);
let pass = 0;
const fails: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) pass++;
  else { fails.push(label); LOG(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
  return cond;
};
const section = (s: string) => LOG(`\n── ${s} ${"─".repeat(Math.max(0, 58 - s.length))}`);

const NOW = Date.parse("2026-08-21T09:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 24 * 60 * 60 * 1000;

// ═════════════════════════════════════════════════════════════════════════════
// FIXTURES — one account carrying every kind of thing erasure has to reach.
// ═════════════════════════════════════════════════════════════════════════════

const SUBJECT = "usr_erase_subject";
const PHONE = "+255712000417";
const NAME = "Asha Mwangi";
const EMAIL = "asha.mwangi@example.tz";
const NIDA = "19900101000000000417";
const CLOSED_AT = iso(NOW - 30 * DAY);

await db.user.create({
  id: SUBJECT, phoneE164: PHONE, email: EMAIL, emailVerifiedAt: iso(NOW - 200 * DAY),
  passwordHash: "scrypt-hash-here", passwordSalt: "salt-here",
  failedLoginCount: 2, lockedUntil: null, role: "PLAYER", status: "CLOSED", locale: "SW",
  displayName: NAME, dob: "1990-01-01", region: "Dar es Salaam",
  acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW - 200 * DAY),
  marketingOptIn: true, twoFactorEnabled: true,
  avatarDataUrl: "data:image/png;base64,iVBORw0KGgo=",
  createdAt: iso(NOW - 200 * DAY), updatedAt: iso(NOW - 30 * DAY),
  lastLoginAt: iso(NOW - 31 * DAY), closedAt: CLOSED_AT,
} as never);

// A REFERRER, whose notification froze the subject's mask at write time.
const REFERRER = "usr_erase_referrer";
await db.user.create({
  id: REFERRER, phoneE164: "+255712000900", email: null, emailVerifiedAt: null,
  passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: "Referrer", dob: null,
  region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW - 100 * DAY),
  marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  createdAt: iso(NOW - 100 * DAY), updatedAt: iso(NOW - 100 * DAY),
  lastLoginAt: null, closedAt: null,
} as never);

// TWO KYC submissions — a rejected first attempt and the approved one. The rejected row is
// the reason erasure reads `listByUser` and not `findByUserId`.
//
// ⭐ ONE ALL-INLINE, ONE MIXED WITH `r2:` KEYS, and that difference carries §7's hardest
// assertion. There is no R2 in a unit run, so `deleteKycDocument` genuinely FAILS on an
// `r2:` key — which is the real-world "the bucket is unreachable" branch, for free. The
// inline half proves destruction works; the r2 half proves a failed destruction does not
// take the pointer with it.
const INLINE_DOC = "data:image/jpeg;base64,AAAA";
// ⭐ PART C (2026-10-11) · THREE FACTS THE HOLD MUST TREAT APART, on the same two rows:
//   · the rejected row carries NO fingerprint (it predates the column) — erasure must write it AT ONCE, while the number
//     is raw, never at the release;
//   · the rejected row carries the officer's refusal NOTE naming the player — free text, redacted at once like the
//     request descriptions;
//   · the approved row carries a PRIOR identity (a correction replaced it) with its own raw number and the player's
//     name — HELD with the row, and erased by the row's own rule at the release.
const NIDA_PRIOR = "19900101000000000416";
const REJECT_NOTE = `Name on the ID does not match the account: ${NAME}`;
const PRIOR_IDENTITY = {
  idType: "NIDA", idNumber: NIDA_PRIOR, idExpiry: null, fullName: NAME, dob: "1990-01-01", idFingerprint: null,
  status: "APPROVED", approvedAt: iso(NOW - 185 * DAY), reviewerId: "usr_officer", cause: "correction",
  supersededAt: iso(NOW - 180 * DAY),
};
for (const [id, status, createdAt, docs, extraKey, fingerprint, rejectNote, priors] of [
  ["kyc_erase_old", "REJECTED", iso(NOW - 190 * DAY), [INLINE_DOC, INLINE_DOC], INLINE_DOC, null, REJECT_NOTE, []],
  ["kyc_erase_new", "APPROVED", iso(NOW - 180 * DAY), ["r2:kyc/front.jpg", INLINE_DOC], "r2:kyc/extra.jpg",
    identityFingerprint("NIDA", NIDA), null, [PRIOR_IDENTITY]],
] as const) {
  await db.kyc.upsert({
    id, userId: SUBJECT, status, rejectReason: null, rejectNote,
    idType: "NIDA", idNumber: NIDA, idExpiry: null, idVerifiedAt: createdAt,
    idFingerprint: fingerprint, priorIdentities: [...priors],
    fullName: NAME, dob: "1990-01-01",
    documents: [
      { docType: "NIDA_FRONT", storageKey: docs[0], uploadedAt: createdAt, mimeType: "image/jpeg", sizeBytes: 1000 },
      { docType: "SELFIE", storageKey: docs[1], uploadedAt: createdAt, mimeType: "image/jpeg", sizeBytes: 4 },
    ],
    extraRequests: [{ id: "xr1", description: `Proof of address for ${NAME}`, requestedAt: createdAt, storageKey: extraKey, uploadedAt: createdAt }],
    reviewerId: "usr_officer", reviewedAt: createdAt, submittedAt: createdAt,
    createdAt, updatedAt: createdAt,
  } as never);
}

// MONEY — the half that must be byte-identical afterwards.
await db.wallet.create({
  id: "wal_erase", userId: SUBJECT, balance: 125_000, pending: 0, hold: 0, bonusBalance: 0,
  currency: "TZS", status: "ACTIVE", createdAt: iso(NOW - 200 * DAY), updatedAt: iso(NOW - 40 * DAY),
} as never);
await db.txn.create({
  id: "txn_erase_dep", walletId: "wal_erase", userId: SUBJECT, type: "DEPOSIT",
  status: "CONFIRMED", amount: 125_000, fee: 0, currency: "TZS", positionId: null,
  msisdn: PHONE, createdAt: iso(NOW - 190 * DAY), updatedAt: iso(NOW - 190 * DAY),
} as never);
await positionStore.set({
  id: "pos_erase", userId: SUBJECT, marketId: "mkt_erase", side: "YES", stake: 5_000,
  potentialPayout: 9_000, status: "WIN", finalPayout: 9_000,
  placedAt: iso(NOW - 100 * DAY), settledAt: iso(NOW - 99 * DAY),
} as never);

/* ── MASWALI-BUILD S6 · MB-67 · A MILLIONEA HOLDER'S RECORD ─────────────────────────────────────────────────────────
 * A settled week, one of its questions, two of the subject's tickets (a settled win and a free cancel) and a hub notice
 * seen — written through the Millionea DAL, which both access doors and every reader use. The picks behind a bet are the
 * betting record (POCA Cap 423 §16, 7 years): erasure must leave the week, its question and the tickets byte for byte
 * (§4.3b, §9.6), and none of them may carry an identifier erasure removes (§8's sweep reads them). ⭐ S6 review R2-6 · the
 * seen mark is a display flag, not the betting record: erasure DELETES the subject's, and only the subject's (§4.3c). */
const MLN_WEEK = "mlw_erase_week";
await weekStore.create({
  id: MLN_WEEK, marketId: "mkt_erase_mln", code: "MLN-2026-W30", seq: 3030, visibility: "PUBLIC", state: "SETTLED",
  opensAt: iso(NOW - 60 * DAY), closesAt: iso(NOW - 56 * DAY), finalDeadlineAt: iso(NOW - 52 * DAY), closedAt: iso(NOW - 56 * DAY),
  rulesSnapshot: { v: 1 }, questionSetHash: "d".repeat(64), ticketMerkleRoot: "e".repeat(64), ticketCount: 1, salesAtClose: 1_000,
  gradedSetFinalAt: iso(NOW - 54 * DAY), objectionsCloseAt: iso(NOW - 53 * DAY), objectionRestarted: false,
  rolloverIn: 0, jackpot: 1_000_000, fee: 130_000, traLevy: 13_000, gbtLevy: 6_500, topUp: 999_000, winningTickets: 1,
  sharePerTicket: 870_000, paidTotal: 870_000, carryOut: 0, dustCarried: 0, settlementGroupId: `maswali_settle_${MLN_WEEK}`,
  settledAt: iso(NOW - 52 * DAY), releasedBy: "usr_accounting", isFinal: false, parityAttestedBy: "usr_reader",
  parityAttestedAt: iso(NOW - 61 * DAY), createdBy: "usr_drafter", createdAt: iso(NOW - 62 * DAY), updatedAt: iso(NOW - 52 * DAY),
});
await questionStore.createMany(MLN_WEEK, [{
  id: "mlq_erase_1", role: "MAIN", ordinal: 1, slot: 1, category: "sports",
  textEn: "Will the home side win?", textSw: "Je, timu ya nyumbani itashinda?", textZh: "主队会赢吗？",
  criterionEn: "YES if the home side wins in regulation time.", criterionSw: "NDIO ikiwa timu ya nyumbani itashinda.", criterionZh: "主队获胜则为是。",
  sourceUrl: "https://www.tff.or.tz/fixtures", sourceDomain: "tff.or.tz", fallbackSourceUrl: null, fallbackSourceDomain: null,
  readingTolerance: null, eventKind: "SPORT", eventStartsAt: iso(NOW - 55 * DAY), eventZone: "Africa/Dar_es_Salaam",
  voidDeadlineAt: iso(NOW - 53 * DAY), probabilityEstimate: 0.5, probabilitySource: "officer estimate", linkedMarketId: null,
}]);
for (const [id, serial, status, extra] of [
  ["mlt_erase_won", "MLN-2026-W30-000001", "SETTLED", { score: 10, won: true, payout: 870_000 }],
  ["mlt_erase_cancel", "MLN-2026-W30-000002", "CANCELLED", { cancelledAt: iso(NOW - 58 * DAY) }],
] as const) {
  await ticketStore.create({
    id, positionId: `pos_${id}`, cycleId: MLN_WEEK, userId: SUBJECT, serial, selections: Array.from({ length: 15 }, () => "YES"),
    salt: "f".repeat(32), selectionsHash: "a".repeat(64), picksKey: "b".repeat(64), status, cancelledAt: null,
    closeAtPurchase: iso(NOW - 56 * DAY), rulesVersion: "millionea-2026-10-17", score: null, won: null, payout: null,
    frozenReason: null, lastViewedAt: iso(NOW - 51 * DAY), createdAt: iso(NOW - 59 * DAY), ...extra,
  });
}
await noticeStore.markSeen(SUBJECT, MLN_WEEK, "RESULT", iso(NOW - 51 * DAY));
// R2-6 · another account's seen mark on the same week — erasure deletes the subject's marks, never anyone else's.
const MLN_OTHER = "usr_erase_mln_other";
await noticeStore.markSeen(MLN_OTHER, MLN_WEEK, "ROLLOVER", iso(NOW - 50 * DAY));
const millioneaRecord = async () => ({
  week: await weekStore.get(MLN_WEEK),
  questions: await questionStore.listForWeek(MLN_WEEK),
  tickets: await ticketStore.listForUser(SUBJECT),
});
const millioneaBefore = JSON.stringify(await millioneaRecord());
const seenOf = (userId: string) => noticeStore.seenFor(userId, [MLN_WEEK]);
const seenBefore = { subject: (await seenOf(SUBJECT)).length, other: JSON.stringify(await seenOf(MLN_OTHER)) };

// A MODERATOR, because `listComments` hides `deleted` rows from everyone else — and
// erasure soft-deletes. Reading the thread as a player would make §6 pass on an EMPTY
// list, which is the exact "green because the feature is absent" shape this repo keeps
// paying for. The mod view is also the honest one: the row must still be THERE.
const MOD = "usr_erase_mod";
await db.user.create({
  id: MOD, phoneE164: "+255712000111", email: null, emailVerifiedAt: null,
  passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "MODERATOR", status: "ACTIVE", locale: "EN", displayName: "Mod", dob: null,
  region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW),
  marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  createdAt: iso(NOW), updatedAt: iso(NOW), lastLoginAt: null, closedAt: null,
} as never);

// SOCIAL / OPERATIONAL surfaces.
//
// ⭐ TWO COMMENTS, WRITTEN EITHER SIDE OF THE PLAYER SETTING A DISPLAY NAME, because
// `maskName` freezes a DIFFERENT fragment in each case: the phone's last three digits when
// there is no name, a piece of the name when there is. A fixture with only one of them
// proves erasure handles only one of them.
await db.user.update(SUBJECT, { displayName: null });
await addComment(SUBJECT, "mkt_erase", "First post, before I set a name.", "YES");
await db.user.update(SUBJECT, { displayName: NAME });
await addComment(SUBJECT, "mkt_erase", "Asha here — I am backing YES on this one.", "YES");
await db.notification.create({
  id: "ntf_erase_own", userId: SUBJECT, kind: "WIN", titleEn: "You won", titleSw: "Umeshinda",
  bodyEn: `${NAME}, your bet paid 9,000 TZS.`, bodySw: `${NAME}, dau lako limelipa 9,000 TZS.`,
  href: "/positions", readAt: null, dismissedAt: null, createdAt: iso(NOW - 99 * DAY),
} as never);
notifyReferralJoined(REFERRER, { recruitMasked: maskName(NAME, PHONE) });
await db.otp.create({
  id: "otp_erase", phoneE164: PHONE, hashedCode: "h", salt: "s", purpose: "login",
  attempts: 0, consumedAt: null, expiresAt: iso(NOW), createdAt: iso(NOW - 1 * DAY),
} as never);
db.pushSub.upsert({ userId: SUBJECT, endpoint: "https://push.example/ep-asha", p256dh: "k", auth: "a" } as never);
db.watchlist.add("mkt_erase", SUBJECT);
await db.sourceOfFunds.upsert({
  userId: SUBJECT, declaredSource: "salary", declaredOccupation: "Nurse",
  declaredEmployer: "Muhimbili National Hospital", declaredAnnualIncomeBand: "12m-50m",
  declaredOther: null, reviewStatus: "APPROVED", reviewerId: "usr_officer",
  reviewedAt: iso(NOW - 150 * DAY), submittedAt: iso(NOW - 180 * DAY),
} as never);

/** Both frozen forms. `maskName(NAME, ...)` is a name fragment; `maskName(null, ...)` is
 *  the phone's last three digits — the one the brief calls out by name. */
const nameMask = maskName(NAME, PHONE);
const phoneMask = maskName(null, PHONE);

const walletBefore = JSON.stringify(await db.wallet.findByUserId(SUBJECT));
const txnBefore = JSON.stringify(await db.txn.findByUser(SUBJECT, 50));
const positionBefore = JSON.stringify(await positionStore.get("pos_erase"));

/* ── U18b · THE MARKETING STORES ─────────────────────────────────────────────────────────────
 * A consent the subject gave at sign-up, two contact-book rows LINKED to the account (today's number
 * and one the player had before), and one row for somebody else, which must come through untouched.
 * ⚠️ The marketing key is the BARE `255…` form; the account stores `+255…`. A sweep that searched only
 * the `+` form would walk straight past every marketing store — §8 searches both. */
const SUBJECT_KEY = "255712000417";
const SUBJECT_OLD = "255754000417";
const BYSTANDER = "255754000999";
const keyOf = (identifier: string) => ({ channel: "SMS" as const, identifier, category: "MARKETING" as const });
await db.messagingConsent.create({
  ...ledgerStamp(), ...keyOf(SUBJECT_KEY), status: "GIVEN", source: "REGISTRATION",
  wording: "Nitumie ofa na habari za 50pick kwa SMS (hiari).", locale: "SW", evidence: "register", recordedBy: null,
});
const contactRow = (id: string, msisdn: string, userId: string | null, displayName: string): StoredMarketingContact => ({
  id, msisdn, rawInput: `0${msisdn.slice(3, 6)} ${msisdn.slice(6, 9)} ${msisdn.slice(9)}`, displayName,
  email: userId ? EMAIL : null, ndc: msisdn.slice(3, 6), operator: null, source: "IMPORT", sourceRef: "imp_erase_1",
  userId, consentState: "GIVEN", suppressedAt: null, tags: ["vip", displayName.toLowerCase()],
  notes: `Met ${displayName} at the stadium`, importId: "imp_erase_1",
  createdAt: iso(NOW - 50 * DAY), createdBy: "usr_officer", updatedAt: iso(NOW - 50 * DAY), updatedBy: "usr_officer",
});
await db.marketingContact.create(contactRow("mc_erase_now", SUBJECT_KEY, SUBJECT, NAME));
await db.marketingContact.create(contactRow("mc_erase_old", SUBJECT_OLD, SUBJECT, NAME));
await db.marketingContact.create(contactRow("mc_erase_bystander", BYSTANDER, null, "Juma Bystander"));
/* ⭐ C8b (B1) · THE LISTS — today's number on two lists, the earlier one on one, the bystander on the first. Erasure must take
 * the subject's rows off every list (a tombstone stays on none, so a revived row can inherit none) and keep the bystander
 * and the lists themselves. */
const ERASE_LISTS = ["cl_erase_stadium", "cl_erase_vip"];
for (const id of ERASE_LISTS) {
  await db.contactList.create({ id, name: `Erasure fixture ${id}`, description: null, createdAt: iso(NOW - 40 * DAY), createdBy: "usr_officer", updatedAt: iso(NOW - 40 * DAY), updatedBy: "usr_officer" });
  await db.contactListMember.add({ listId: id, contactId: "mc_erase_now", addedAt: iso(NOW - 40 * DAY), addedBy: "usr_officer" });
}
await db.contactListMember.add({ listId: ERASE_LISTS[0], contactId: "mc_erase_old", addedAt: iso(NOW - 40 * DAY), addedBy: "usr_officer" });
await db.contactListMember.add({ listId: ERASE_LISTS[0], contactId: "mc_erase_bystander", addedAt: iso(NOW - 40 * DAY), addedBy: "usr_officer" });

/* ── U29b · AN IMPORT MID-STAGING ─────────────────────────────────────────────────────────────────────────────
 * An officer's unfinished import holds the subject's NAME on two rows — today's number and the earlier one — beside two
 * strangers' rows. Erasure must delete the subject's two (by every number the person is known by) and keep the
 * strangers': §8 sweeps the run's rows (`contactImportRows`, in MUST_HAVE_CONTENT because the strangers' rows must
 * remain) and §12 counts them. Written through the DAL alone, independent of the staging service under test elsewhere. */
const STAGED_RUN = "ci_erasurefixturerunaaa";
const STAGED_AT = iso(NOW - 2 * DAY);
const stagedRow = (ordinal: number, line: number, msisdn: string, displayName: string, email: string | null): StoredContactImportRow => ({
  importId: STAGED_RUN, ordinal, line, rawPhone: `0${msisdn.slice(3, 6)} ${msisdn.slice(6, 9)} ${msisdn.slice(9)}`, msisdn,
  displayName, email, tags: [displayName.toLowerCase()], notes: `Met ${displayName} at the stadium`, problems: [],
  readError: null, outcome: null, outcomeReason: null, stagedAt: STAGED_AT,
});
await db.contactImport.create({
  id: STAGED_RUN, status: "STAGING", format: "csv", fileName: "stadium-list.csv", fileDigest: "e".repeat(64),
  mapping: { phone: 0, name: 1, email: 2, tags: 3, notes: 4 }, totalRows: 6, unreadable: 0, stagedThrough: 0,
  committedThrough: 0, decisionChoice: null, decisionOverrides: {}, decisionConfirmedAt: null, decisionConfirmedBy: null,
  consentBasis: null, consentWording: null, consentProofNote: null, adultAttestedAt: null, consentBasisSetBy: null,
  consentBasisSetAt: null, pausedAt: null, pausedBy: null, finishedAt: null, createdAt: STAGED_AT, createdBy: "usr_officer",
  updatedAt: STAGED_AT,
});
await db.contactImport.stageRows({
  importId: STAGED_RUN, from: 1, completes: false, at: STAGED_AT,
  rows: [
    stagedRow(1, 2, SUBJECT_KEY, NAME, EMAIL),
    stagedRow(2, 3, "255754000998", "Rehema Stranger", null),
    stagedRow(3, 4, SUBJECT_OLD, NAME, null),
    stagedRow(4, 5, "255754000997", "Musa Stranger", null),
  ],
});

// ═════════════════════════════════════════════════════════════════════════════
section("1 · CONTROL — the fixtures are really there before anything is measured");
// ═════════════════════════════════════════════════════════════════════════════
{
  const u = await db.user.findById(SUBJECT);
  ok("1.1 the subject exists and carries every PII column this suite claims to erase",
    !!u && u.phoneE164 === PHONE && u.email === EMAIL && u.displayName === NAME
      && !!u.passwordHash && !!u.avatarDataUrl && !!u.dob && !!u.region,
    "Without this, every 'it is gone' below passes on a fixture that never had it.");
  const subs = await db.kyc.listByUser(SUBJECT);
  ok("1.2 ⛔ TWO submissions exist — the rejected one is why erasure cannot read the newest",
    subs.length === 2 && subs.every((k) => k.idNumber === NIDA), `${subs.length} submissions`);
  // ⚠️ `listComments` RETURNS AN ENVELOPE, NOT AN ARRAY, since PLAYER QUERY task 4.12 (`ef8b7566`)
  // gave the thread a sort and a read bound: `{ comments, total, capped }`. This suite kept calling
  // `.some()` on the envelope and died with "thread0.some is not a function" — a TypeError, so it
  // was not a soft miss but a suite that could not run at all, and it sat red on main because
  // `test:all` was never re-run after that stage. Unwrapped here rather than papered over.
  const thread0 = (await listComments("mkt_erase", MOD)).comments;
  ok("1.3 ⭐ the thread carries BOTH frozen mask forms — the phone-tail one AND the name one",
    thread0.some((c) => c.authorName === phoneMask) && thread0.some((c) => c.authorName === nameMask),
    `masks present: ${thread0.map((c) => c.authorName).join(" | ")} (want ${phoneMask} and ${nameMask})`);
  ok("1.4 ⭐ the REFERRER's notification froze the subject's mask in ITS body — the surface " +
     "the hand-written brief missed",
    (await db.notification.findByUser(REFERRER, 10)).some((n) => n.bodyEn.includes(nameMask)),
    "notifyReferralJoined writes maskName(displayName, phone) into somebody else's row.");
  ok("1.5 the money fixture is on the books", walletBefore.includes("125000") && txnBefore.includes("txn_erase_dep"));
  ok("1.6 the phone-form mask really does carry the number's last three digits — the " +
     "fragment this whole item exists for",
    phoneMask.endsWith(PHONE.slice(-3)) && phoneMask !== nameMask, `${phoneMask} / ${nameMask}`);
  const oldRow = subs.find((k) => k.id === "kyc_erase_old");
  const newRow = subs.find((k) => k.id === "kyc_erase_new");
  ok("1.7 CONTROL · Part C's three facts are on the fixture before anything runs: the rejected row has NO fingerprint and " +
     "an officer's note naming the player; the approved row has a prior identity with its own raw number and the name",
    !!oldRow && !oldRow.idFingerprint && oldRow.rejectNote === REJECT_NOTE && REJECT_NOTE.includes(NAME)
      && !!newRow && (newRow.priorIdentities ?? []).length === 1 && newRow.priorIdentities?.[0]?.idNumber === NIDA_PRIOR
      && newRow.priorIdentities?.[0]?.fullName === NAME,
    JSON.stringify({ oldFp: oldRow?.idFingerprint ?? null, note: oldRow?.rejectNote, priors: newRow?.priorIdentities }));
}

{
  // U18b · the marketing fixtures, read BEFORE the erasure, so §12's "emptied" is a change and not a default.
  const latest = await db.messagingConsent.latestFor(keyOf(SUBJECT_KEY));
  const now = await db.marketingContact.find("mc_erase_now");
  ok("1.m1 CONTROL · the subject's consent reads GIVEN before erasure", latest?.status === "GIVEN", String(latest?.status));
  ok("1.m2 CONTROL · both of the subject's book rows are linked and carry the name, before erasure",
    (await db.marketingContact.listByUserId(SUBJECT)).length === 2 && now?.displayName === NAME && now?.email === EMAIL);
  ok("1.m3 CONTROL · no stop list row exists for the subject's numbers yet",
    !(await db.suppression.find(keyOf(SUBJECT_KEY))) && !(await db.suppression.find(keyOf(SUBJECT_OLD))));
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · it REFUSES an account that is not closed");
// ═════════════════════════════════════════════════════════════════════════════
{
  const live = await anonymizeClosedAccount(REFERRER, { now: NOW });
  ok("2.1 🔴 an ACTIVE account is refused", !live.ok && live.reason === "not_closed",
    "A routine that will erase a live account is one mis-typed id from destroying a\n" +
    "       paying player's sign-in.");
  const stillThere = await db.user.findById(REFERRER);
  ok("2.2 …and the refusal wrote NOTHING", stillThere?.phoneE164 === "+255712000900" && stillThere?.displayName === "Referrer");
  const missing = await anonymizeClosedAccount("usr_does_not_exist", { now: NOW });
  ok("2.3 an unknown id is refused as not_found, not as a silent success",
    !missing.ok && missing.reason === "not_found");
}

// ═════════════════════════════════════════════════════════════════════════════
// HOUSE-BOT FIXTURE — the account is (or was) a house bot, and every table that
// carries the holder's NAME because of it (04 A5, R6; C5-SPEC ruling 244).
// ═════════════════════════════════════════════════════════════════════════════
//
// ⛔ EVERY WRITE GOES THROUGH `db` AND THE DAL, NEVER THE SERVICE LAYER. `designateHouseBot`,
// `selfExclude` and `fileDsarRequest` all fire the in-app holder hook asynchronously (C4-SPEC
// ruling 127), and that hook REMOVES the bot on a CLOSED account — it would race §2b and remove
// the very bot whose refusal §2b exists to measure, so the backstop would never run and the
// section would pass on an empty fact. Ruling 156's suspension is therefore not needed here:
// nothing below calls a writer that fires it.
//
// ⚠️ THE ADMIN NOTIFICATION IS SCOPED, and the scope is the fixture's own trap. `erasure.ts`
// redacts HOUSE_BOT rows whose href names THIS bot or that were written inside its designation
// window (review LI-9: an unscoped rewrite would rename another holder's live bot in every
// officer's inbox). A fixture row outside that scope leaves 8.b red for a fixture reason and
// sends the next reader hunting a defect that is not there.
const ADMIN = "usr_erase_admin";
await db.user.create({
  id: ADMIN, phoneE164: "+255712000222", email: "ops@example.tz", emailVerifiedAt: iso(NOW - 300 * DAY),
  passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
  role: "ADMIN", status: "ACTIVE", locale: "EN", displayName: "Owner", dob: null,
  region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW - 300 * DAY),
  marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
  createdAt: iso(NOW - 300 * DAY), updatedAt: iso(NOW - 300 * DAY), lastLoginAt: null, closedAt: null,
} as never);

const DESIGNATED_AT = iso(NOW - 60 * DAY);
const BOT_ID = newHouseId("bot");
await houseBotStore.designate({
  bot: {
    id: BOT_ID, userId: SUBJECT, label: NAME, labelKey: NAME.toLowerCase(),
    // The officer's own note — free text, and the place a holder's name most often ends up.
    note: `${NAME} agreed to this over the phone`,
    passwordFingerprint: "fp_erase_case",
    verifiedAt: DESIGNATED_AT, verifiedById: ADMIN, designatedAt: DESIGNATED_AT, designatedById: ADMIN,
    rules: { schemaVersion: 1 },
    stakeMinTzs: null, stakeMaxTzs: null, capPerMarketTzs: null, capDailyStakeTzs: null,
    capDailyLossTzs: null, capOpenExposureTzs: null, balanceFloorTzs: null, freqMinGapSec: null,
    freqMaxPerHour: null, freqMaxPerDay: null, freqMaxPerMarket: null, capStaffChosenPerDay: null,
    capStaffChosenDailyTzs: null, targetsMaxActive: null,
  },
  event: { actorId: ADMIN, reason: null, payload: null },
} as never);
await houseBotStore.setVerified(BOT_ID, { fingerprint: "fp_erase_case", verifiedById: ADMIN, verifiedAt: DESIGNATED_AT });

// An event and a press whose officer REASONS name the holder.
await houseBotEventStore.append({
  houseBotId: BOT_ID, userId: SUBJECT, marketId: null, kind: "PAUSED",
  fromStatus: "PAUSED", toStatus: "PAUSED", reason: `${NAME} asked us to stop for a week`,
  actorId: ADMIN, payload: null,
} as never);
const PRESS_ID = newHouseId("press");
await pressStore.insertChecking({
  id: PRESS_ID, actorId: ADMIN, submitId: "11111111-2222-4333-8444-555555555555",
  purpose: "ENTER_NOW", houseBotId: BOT_ID, marketId: "mkt_erase", targetId: null, intentId: null,
  reason: `${NAME} said the poll was mispriced`,
} as never);

// An intent and a target: erasure KEEPS them (ids, markers, amounts are the money record), so
// they carry no name — and §8 sweeps them anyway, because the day one does is the day it matters.
const INTENT_ID = newHouseId("intent");
await houseBotIntentStore.insert({
  id: INTENT_ID, houseBotId: BOT_ID, botUserId: SUBJECT, kind: "FILL", anchorKey: "mkt_erase",
  marketId: "mkt_erase", productLine: "MARKET", triggerPositionId: null, triggerUserId: null,
  targetId: null, requestedById: null, entryCondition: null, side: "YES", stakeTzs: 1000,
  dueAt: iso(NOW + 3_600_000), deadlineAt: iso(NOW + 7_200_000), staleAt: iso(NOW + 7_200_000),
  status: "PENDING", reasonCode: null, why: null, decision: {}, attempts: 0, transientAttempts: 0,
  nextAttemptAt: null, claimedBy: null, claimedUntil: null, positionId: null, finishedAt: null, alertedAt: null,
} as never);
const TARGET_ID = newHouseId("target");
await targetStore.insert({
  id: TARGET_ID, houseBotId: BOT_ID, marketId: "mkt_erase_target", delayMinSec: 30, delayMaxSec: 90,
  timingFrom: "STAKE", reactTo: "FIRST", createdById: ADMIN,
  snapshot: { titleEn: "Will the shilling hold?", category: "macro", cutoff: iso(NOW + 5 * DAY), rawYes: 10, rawNo: 12 },
} as never);

// The officer's inbox: a HOUSE_BOT row quoting the label, inside the designation window, with the
// bot id in its href — the shape `notifyAdminsHouseBot*` really writes.
await db.notification.create({
  id: "ntf_erase_admin_house", userId: ADMIN, kind: "HOUSE_BOT",
  titleEn: `House bot "${NAME}" paused`, titleSw: `Boti "${NAME}" imesimamishwa`, titleZh: `机器人 "${NAME}" 已暂停`,
  bodyEn: `House bot "${NAME}" stopped on its holder's request.`,
  bodySw: `Boti "${NAME}" imesimama kwa ombi la mmiliki.`,
  bodyZh: `机器人 "${NAME}" 已按持有人请求停止。`,
  href: `/admin/desk/${BOT_ID}`, readAt: null, dismissedAt: null, createdAt: iso(NOW - 50 * DAY),
} as never);

// ═════════════════════════════════════════════════════════════════════════════
section("2b · it REFUSES a live house bot — before any destructive write");
// ═════════════════════════════════════════════════════════════════════════════
{
  /**
   * ⛔ THE REFUSAL IS ONLY REACHABLE ON A CLOSED ACCOUNT (`erasure.ts:185-193` refuses anything
   * else first), so this runs against the SUBJECT — already CLOSED — with its bot still live. An
   * erased account could no longer be verified, paused for a cause or recognised by its owner
   * while stakes kept landing in its name; the owner removes the bot, and the officer re-runs.
   *
   * ⭐ TWO CALLS, ONE ALERT. `erasure-blocked:<botId>` is claimed once per bot, so a second
   * attempt must not fill an owner's inbox — and a send that reached nobody gives the claim back,
   * which is why the ADMIN above exists at all.
   */
  const blocked = (n: { kind: string; titleEn: string }) => n.kind === "HOUSE_BOT" && n.titleEn.startsWith("Erasure blocked");
  const before = (await db.notification.findByUser(ADMIN, 100)).filter(blocked).length;
  /**
   * ⛔ A THROW IS A REFUSAL NOBODY CAN READ — RECORDED AS A FAILED ASSERTION, NEVER AS A CRASHED
   * SUITE (the shape `test:house-bot-designation` §8 already uses). Without the guard above, the
   * routine runs on and the DAL refuses again under its row locks (`erasure.ts:432` throws) — which
   * exits the process before a single assertion has fired. A harness cannot tell that from a gate
   * falling over, so the mutation that removes the guard would prove NOTHING instead of proving this.
   */
  const tryErase = () => anonymizeClosedAccount(SUBJECT, { now: NOW })
    .catch((e: unknown) => ({ ok: false as const, reason: "threw" as const, error: `THREW: ${(e as Error)?.message ?? e}` }));
  const first = await tryErase();
  const second = await tryErase();
  const alerts = (await db.notification.findByUser(ADMIN, 100)).filter(blocked).length - before;
  /* ⛔ THE REASON CODE NAMES IT; THE SENTENCE DOES NOT (⛔ D19; C7 step 7 review d19-hunt-01). This string is handed
     to `/admin/privacy` and painted by `dsar-controls.tsx`, which is a COMPLIANCE-domain route — so until 2026-09-20
     a COMPLIANCE officer running a lawful erasure was shown the feature's name, the bounded id and the owner-only
     console path in one sentence, from a control they are entitled to use and a section they are forbidden to open.
     The identifying facts live on the ADMIN-only alert instead (2b.4/2b.5 below measure that it still carries them).
     ⛔ The `reason` is unchanged, because every caller that BRANCHES branches on the code, never on the words. */
  const firstError = (first as { error: string }).error;
  ok("2b.1 🔴 a CLOSED account that is still a live house bot is refused, and the officer's SENTENCE names neither the feature, nor the id, nor the owner-only route — only the reason code does",
    !first.ok && first.reason === "house_bot_live"
      && firstError === "This account is still in use by an owner-managed account and cannot be erased yet. An owner has been told; the request stays open and can be run again once it is released."
      && !firstError.includes(BOT_ID) && !firstError.includes("/admin/") && !/house|bot\b|liquidity/i.test(firstError),
    JSON.stringify(first));
  ok("2b.1b CONTROL · the three absences above are real checks — the sentence this replaced fails every one of them",
    (() => {
      const old = `This account is still house bot ${BOT_ID}. The owner must remove it at /admin/desk/${BOT_ID} before it can be erased.`;
      return old.includes(BOT_ID) && old.includes("/admin/") && /house|bot\b/i.test(old) && old !== firstError;
    })(), "");
  const u = await db.user.findById(SUBJECT);
  const bot = await houseBotStore.get(BOT_ID);
  ok("2b.2 🔴 …and NOTHING was erased: the phone and the display name are untouched, and so is the bot's label",
    u?.phoneE164 === PHONE && u?.displayName === NAME && bot?.label === NAME,
    `phone=${u?.phoneE164} name=${u?.displayName} label=${bot?.label}`);
  ok("2b.3 the second attempt is refused the same way", !second.ok && second.reason === "house_bot_live");
  ok("2b.4 ⭐ exactly ONE 'Erasure blocked' row in the owner's inbox ACROSS TWO CALLS — AlertOnce is per bot, not per attempt",
    alerts === 1, `${alerts} alerts`);
  ok("2b.5 CONTROL · the alert really is the house-bot one, and it names the bot rather than the holder",
    (await db.notification.findByUser(ADMIN, 100)).some((n) => blocked(n) && n.titleEn.includes(BOT_ID) && !n.bodyEn.includes(NAME)),
    "a notification row outlives the holder's erasure — it may never carry their name");

  // The owner removes it, which is what the refusal told them to do. §3 then runs for real.
  await houseBotStore.setStatus(BOT_ID, {
    from: ["ACTIVE", "PAUSED", "AUTO_PAUSED"], to: "REMOVED", pauseReason: null, pausedFromStatus: null,
    removal: { byId: ADMIN, reason: `${NAME} closed the account`, cause: "MANUAL" },
  });
  ok("2b.6 the owner's Remove lands, so §3 measures the erasure and not the refusal",
    (await houseBotStore.get(BOT_ID))?.status === "REMOVED");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the erasure itself — every PII column null or tombstoned");
// ═════════════════════════════════════════════════════════════════════════════
const result = await anonymizeClosedAccount(SUBJECT, { now: NOW });
{
  ok("3.0 it ran", result.ok === true, result.ok ? "" : (result as { error: string }).error);
  const u = await db.user.findById(SUBJECT);
  ok("3.1 phoneE164 is TOMBSTONED, not nulled — the column is NOT NULL and UNIQUE",
    u?.phoneE164 === erasedPhoneTombstone(SUBJECT), u?.phoneE164);
  for (const f of ["email", "emailVerifiedAt", "passwordHash", "passwordSalt", "displayName",
    "dob", "region", "avatarDataUrl", "lastLoginAt"] as const) {
    ok(`3.2 ${f} is null`, (u as Record<string, unknown> | null)?.[f] == null,
      String((u as Record<string, unknown> | null)?.[f]));
  }
  ok("3.3 ⭐ marketingOptIn is FALSE — an erased account cannot still read as consenting",
    u?.marketingOptIn === false);
  ok("3.4 the row SURVIVES — Comment.user is a required relation with no onDelete", !!u);
  ok("3.5 …and the load-bearing terms evidence is untouched",
    u?.acceptedTermsVersion === "v3" && !!u?.acceptedTermsAt,
    "Nullable, but it is the evidence the player accepted terms at a version.");
  ok("3.6 status, role, locale and closedAt are kept (NOT NULL / the statutory clock)",
    u?.status === "CLOSED" && u?.role === "PLAYER" && u?.locale === "SW" && u?.closedAt === CLOSED_AT);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · money, positions and the audit chain are untouched");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok("4.1 🔴 the wallet is BYTE-IDENTICAL",
    JSON.stringify(await db.wallet.findByUserId(SUBJECT)) === walletBefore,
    "Erasure that can reach a wallet is erasure that can lose money.");
  ok("4.2 🔴 every transaction is BYTE-IDENTICAL — 7 years, POCA Cap 423 §16",
    JSON.stringify(await db.txn.findByUser(SUBJECT, 50)) === txnBefore);
  ok("4.3 🔴 the settled position is BYTE-IDENTICAL",
    JSON.stringify(await positionStore.get("pos_erase")) === positionBefore);
  ok("4.3a CONTROL · the Millionea fixture really is there — the week, its question, both tickets, the subject's seen mark and another account's",
    (() => { const r = JSON.parse(millioneaBefore); return !!r.week && r.questions.length === 1 && r.tickets.length === 2 && seenBefore.subject === 1 && seenBefore.other.length > 2; })(),
    millioneaBefore.slice(0, 160));
  ok("4.3b 🔴 MASWALI-BUILD S6 · MB-67 · the Millionea record — the week, its question, both tickets with their fifteen answers and salt — is BYTE-IDENTICAL after erasure",
    JSON.stringify(await millioneaRecord()) === millioneaBefore,
    "The answers behind a bet are the betting record (POCA Cap 423 §16, 7 years); erasure names no week, question or ticket store.");
  const seenAfter = await seenOf(SUBJECT);
  ok("4.3c ⭐ S6 review R2-6 · MB-67 · the subject's seen mark — a display flag, not the betting record — is DELETED and counted, and another account's mark on the same week is untouched",
    seenAfter.length === 0 && result.ok === true && result.counts.millioneaSeenMarks === 1 && JSON.stringify(await seenOf(MLN_OTHER)) === seenBefore.other,
    JSON.stringify({ left: seenAfter.length, counted: result.ok ? result.counts.millioneaSeenMarks : null }));
  // ⚠️ `trialBalance()` gathers from Postgres and cannot run here. Its PURE CORE can, and
  // it is the half erasure could break: the wallet↔ledger reconciliation over the balance
  // this routine had the opportunity to touch.
  const w = await db.wallet.findByUserId(SUBJECT);
  const tb = computeTrialBalance({
    wallets: [{ userId: SUBJECT, balance: w?.balance ?? -1, hold: w?.hold ?? 0, bonusBalance: 0 }],
    ledgerRealByUser: new Map([[SUBJECT, 125_000]]),
    ledgerBonusByUser: new Map(), activeGrantsByUser: new Map(),
    globalSum: 0, imbalancedGroups: [],
  });
  ok("4.4 🔴 the trial balance still reconciles against the pre-erasure ledger figure",
    tb.ok && tb.driftingWallets === 0, JSON.stringify({ ok: tb.ok, drift: tb.driftingWallets }));
  ok("4.5 🔴 the audit chain still verifies end to end", verifyChain().valid,
    "The chain has no FK to User precisely so erasure can never break it.");
  const entries = getAuditPage({ limit: 10_000 });
  const erasureRow = entries.find((e) => e.action === "privacy.erasure.completed");
  ok("4.6 the erasure is recorded in the chain", !!erasureRow);
  ok("4.7 ⛔ …and its payload carries NO erased value — the chain is the one table that " +
     "cannot be pruned",
    !!erasureRow && !JSON.stringify(erasureRow.payload ?? {}).includes(PHONE)
      && !JSON.stringify(erasureRow.payload ?? {}).includes(NAME)
      && !JSON.stringify(erasureRow.payload ?? {}).includes(NIDA),
    JSON.stringify(erasureRow?.payload ?? {}));
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · 🔴 DURING THE HOLD — the typed identity is KEPT, and the document still collides");
// ═════════════════════════════════════════════════════════════════════════════
{
  /**
   * ⭐ PART C (2026-10-11) · THE OWNER'S RULING, MEASURED. Ali, 2026-10-10: "keep 7 years but no notice — we have our
   * licence to do this, it's ok". From the first run until the release, the typed identity — number, full name, date of
   * birth, on every submission and every prior identity — is HELD exactly as it was. What goes at once is everything
   * around it: the officers' free text, and (a write, not an erasure) the fingerprint a row lacked. §7b measures the
   * release, and the assertion this whole item exists for, where only the fingerprint can answer.
   */
  const fp = identityFingerprint("NIDA", NIDA);
  const subs = await db.kyc.listByUser(SUBJECT);
  const oldSub = subs.find((k) => k.id === "kyc_erase_old");
  const newSub = subs.find((k) => k.id === "kyc_erase_new");
  ok("5.1 EVERY submission was reached, not just the newest — the rejected row's fingerprint and note were written too",
    result.ok && result.counts.kycSubmissions === 2 && subs.length === 2
      && oldSub?.idFingerprint === fp && oldSub?.rejectNote === ERASED_REQUEST_DESCRIPTION,
    JSON.stringify({ n: result.ok ? result.counts.kycSubmissions : "-", oldFp: oldSub?.idFingerprint ?? null, note: oldSub?.rejectNote }));
  ok("5.2 ⛔ the national ID is HELD, raw, on every submission — the owner's 7-year hold — and is NOT null",
    subs.length === 2 && subs.every((k) => k.idNumber === NIDA),
    subs.map((k) => `${k.id}:${String(k.idNumber).slice(0, 8)}`).join(" "));
  ok("5.3 …and so are the full name and the date of birth",
    subs.length === 2 && subs.every((k) => k.fullName === NAME && k.dob === "1990-01-01"),
    subs.map((k) => `${k.fullName}/${k.dob}`).join(" "));
  ok("5.4 ⭐ the fingerprint is written AT ONCE on the row that had none — the uniqueness control may not wait seven years",
    subs.length === 2 && subs.every((k) => k.idFingerprint === fp),
    subs.map((k) => `${k.id}:${String(k.idFingerprint).slice(0, 8)}`).join(" "));
  ok("5.5 ⭐ the officer's refusal NOTE is redacted at once — it named the player, and no statute keeps the sentence",
    oldSub?.rejectNote === ERASED_REQUEST_DESCRIPTION && !JSON.stringify(subs.map((k) => k.rejectNote)).includes("Asha"),
    JSON.stringify(subs.map((k) => k.rejectNote)));
  ok("5.6 …and so is every request description, on every row, while the documents they asked for are held",
    subs.every((k) => (k.extraRequests ?? []).length === 1
      && (k.extraRequests ?? []).every((e) => e.description === ERASED_REQUEST_DESCRIPTION)),
    JSON.stringify(subs.map((k) => (k.extraRequests ?? []).map((e) => e.description))));
  const heldPriors = newSub?.priorIdentities ?? [];
  ok("5.7 ⛔ the PRIOR identity is held too — its own raw number, the name and the date of birth, exactly as they were",
    heldPriors.length === 1 && heldPriors[0].idNumber === NIDA_PRIOR && heldPriors[0].fullName === NAME
      && heldPriors[0].dob === "1990-01-01" && !heldPriors[0].idFingerprint,
    JSON.stringify(heldPriors));
  ok("5.8 ⭐ the run SAYS what it held back — three identities (two rows, one prior) — and hashed nothing",
    result.ok && result.counts.identitiesHeld === 3 && result.counts.idNumbersHashed === 0,
    result.ok ? JSON.stringify({ held: result.counts.identitiesHeld, hashed: result.counts.idNumbersHashed }) : "-");

  // 🔴 THE SAME QUESTION A PERSON ASKS, DURING THE HOLD. The row still holds the raw number, so the TUPLE index and its
  // fast path answer; §7b asks it again after the release, when only the fingerprint can.
  const HELD_IMPOSTOR = "usr_erase_second_account_held";
  await db.user.create({
    id: HELD_IMPOSTOR, phoneE164: "+255712000886", email: null, emailVerifiedAt: null,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "PENDING_KYC", locale: "EN", displayName: null, dob: null,
    region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: iso(NOW), updatedAt: iso(NOW), lastLoginAt: null, closedAt: null,
  } as never);
  await startKyc(HELD_IMPOSTOR);
  const quietHeld = console.log; console.log = () => {};
  const heldRetry = await submitIdentityStep(HELD_IMPOSTOR, {
    idType: "NIDA", idNumber: NIDA, fullName: "Someone Else", dob: "1990-01-01",
  } as never);
  console.log = quietHeld;
  ok("5.9 🔴 the same national ID is REFUSED DURING THE HOLD too — the held row keeps the document spent",
    heldRetry.ok === false && (heldRetry as { reason?: string }).reason === "id_taken", `got: ${JSON.stringify(heldRetry)}`);
  ok("5.10 …and no identity was written for that second account",
    !(await db.kyc.findByUserId(HELD_IMPOSTOR))?.idNumber);

  // ⭐ IDEMPOTENT DURING THE HOLD — a second run writes nothing to the identity record, reports zeroes for the work it
  // already did, and holds the same three identities back.
  const beforeAgain = JSON.stringify(await db.kyc.listByUser(SUBJECT));
  const again = await anonymizeClosedAccount(SUBJECT, { now: NOW + DAY });
  ok("5.11 IDEMPOTENT DURING THE HOLD · a second run changes nothing and says so — no number hashed, no document destroyed, the same three held",
    again.ok && again.alreadyErased === true && again.documentsReleased === false && again.documentsHeldUntil === "2033-07-22"
      && again.counts.idNumbersHashed === 0 && again.counts.documentsDeleted === 0 && again.counts.identitiesHeld === 3
      && JSON.stringify(await db.kyc.listByUser(SUBJECT)) === beforeAgain,
    again.ok ? JSON.stringify(again.counts) : JSON.stringify(again));

  // ⭐ THE HELD LIST (2026-10-11, review PC-3 F3) — `/admin/privacy`'s reminder, read from the accounts. The erased
  // account is on it with the routine's own release date; a CLOSED account nobody erased is not (nothing is held for an
  // erasure that never ran, and its row would offer the on-behalf door for no reason).
  const UNERASED = "usr_erase_unerased";
  await db.user.create({
    id: UNERASED, phoneE164: "+255712000805", email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "CLOSED", locale: "EN", displayName: null,
    dob: "1991-02-02", region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW - 90 * DAY),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, createdAt: iso(NOW - 90 * DAY),
    updatedAt: iso(NOW - 20 * DAY), lastLoginAt: null, closedAt: iso(NOW - 20 * DAY),
  } as never);
  await db.kyc.upsert({
    id: "kyc_erase_unerased", userId: UNERASED, status: "APPROVED", rejectReason: null, rejectNote: null,
    idType: "VOTER_CARD", idNumber: "QAERASE0805", idExpiry: null, idVerifiedAt: iso(NOW - 60 * DAY), idFingerprint: null,
    fullName: "Unerased Player", dob: "1991-02-02", documents: [], extraRequests: [], priorIdentities: [],
    reviewerId: null, reviewedAt: iso(NOW - 60 * DAY), submittedAt: iso(NOW - 60 * DAY), approvedAt: iso(NOW - 60 * DAY),
    createdAt: iso(NOW - 60 * DAY), updatedAt: iso(NOW - 60 * DAY),
  } as never);
  const heldList = await listHeldIdentities(await db.user.list());
  const mine = heldList.find((h) => h.userId === SUBJECT);
  ok("5.12 the held list names the erased account, with the routine's own release date, its closure and the three identities it keeps",
    !!mine && mine.heldUntil === "2033-07-22" && mine.closedAt === CLOSED_AT && mine.identities === 3,
    JSON.stringify(mine));
  ok("5.13 ⛔ …and NOT a closed account that was never erased — nothing is held for an erasure nobody ran",
    !heldList.some((h) => h.userId === UNERASED), JSON.stringify(heldList.map((h) => h.userId)));
  ok("5.14 the release date is the routine's — seven years from closure — and there is none without a readable closure date",
    identityHeldUntil(CLOSED_AT) === "2033-07-22" && identityHeldUntil(null) === null && identityHeldUntil("not a date") === null,
    String(identityHeldUntil(CLOSED_AT)));
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the frozen fragments — comments, and somebody else's notification");
// ═════════════════════════════════════════════════════════════════════════════
{
  // ⛔ READ AS A MODERATOR. Erasure soft-deletes the comment, and `listComments` filters
  // `deleted` rows out for every other viewer — so a player-eye read returns an empty list
  // and every "no fragment survives" assertion below would pass on nothing at all.
  const thread = (await listComments("mkt_erase", MOD)).comments;
  ok("6.1 the comment ROWS SURVIVE — the moderation trail and every audit id naming them " +
     "still resolve",
    thread.length === 2, `${thread.length} rows (expected 2)`);
  const raw = JSON.stringify(thread);
  ok("6.2 🔴 no comment carries the phone-form mask any more",
    !raw.includes(phoneMask), `still present: ${phoneMask}`);
  ok("6.3 🔴 no comment carries the name-form mask, or the name itself",
    !raw.includes(nameMask) && !raw.includes("Asha"), raw.slice(0, 400));
  ok("6.4 every author reads as the tombstone, and every body is redacted",
    thread.every((c) => c.authorName === ERASED_AUTHOR_NAME && c.body === ERASED_COMMENT_BODY),
    thread.map((c) => `${c.authorName}: ${c.body}`).join(" | "));
  ok("6.5 …and the routine reported BOTH comments rather than the newest one",
    result.ok && result.counts.comments === 2,
    result.ok ? String(result.counts.comments) : "-");
  const refNotes = await db.notification.findByUser(REFERRER, 20);
  ok("6.6 🔴 the REFERRER's notification no longer carries the mask",
    !JSON.stringify(refNotes).includes(nameMask) && !JSON.stringify(refNotes).includes(phoneMask),
    JSON.stringify(refNotes).slice(0, 400));
  ok("6.7 ⭐ CONTROL — that notification is still THERE, so 6.6 is a redaction and not a " +
     "row that quietly vanished",
    refNotes.length === 1 && refNotes[0].bodyEn.includes(ERASED_AUTHOR_NAME),
    JSON.stringify(refNotes).slice(0, 300));
  ok("6.8 …and it was reported as redacted rather than silently missed",
    result.ok && result.counts.notificationsRedacted >= 1,
    result.ok ? String(result.counts.notificationsRedacted) : "-");
  /**
   * 🔴 READ THROUGH A DOOR THAT CAN SEE A DISMISSED ROW, OR THIS ASSERTION IS A LIE.
   *
   * ⚠️ Written first as `findByUser(...).length === 0 && counts.notificationsDeleted >= 1`,
   * and `red:erasure` reported the `dismissAll` mutation as MISSED. `findByUser` filters
   * `dismissedAt`, and `dismissAll` also returns a non-zero count — so a routine that merely
   * HID every row satisfied both halves. The suite was green over a body still saying what
   * the player bet and won. Caught by the harness, not by reading the code.
   *
   * `existsWithHref` is the only reader that ignores `dismissedAt` (it is the Up & Down
   * digest's idempotency key and must not become false because a player tidied their bell),
   * which makes it the one door that can tell deleted from hidden.
   */
  ok("6.9 🔴 the subject's OWN notifications are DELETED, not merely dismissed",
    !(await db.notification.existsWithHref(SUBJECT, "/positions"))
      && result.ok && result.counts.notificationsDeleted >= 1,
    "A `dismissedAt` hides a row whose bodyEn still names the player and their payout.");
  ok("6.9b ⭐ CONTROL — `existsWithHref` DOES still find a row that exists, so 6.9 is a " +
     "deletion and not a reader that always answers false",
    await db.notification.existsWithHref(REFERRER, "/profile/invite"));
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · credentials, devices, and the 7-year hold on the images");
// ═════════════════════════════════════════════════════════════════════════════
{
  ok("7.1 the OTP rows for that number are gone",
    !(await db.otp.findActive(PHONE, "login")) && result.ok && result.counts.otps === 1);
  ok("7.2 push subscriptions are gone", (await db.pushSub.countForUser(SUBJECT)) === 0);
  ok("7.3 the watchlist is cleared", (await db.watchlist.listMarketIdsForUser(SUBJECT)).length === 0);

  // ── THE HOLD ──────────────────────────────────────────────────────────────
  ok("7.4 🔴 the identity IMAGES are HELD, not destroyed — 7 years from closure, POCA Cap " +
     "423 §16 / FATF R.11",
    result.ok && result.documentsReleased === false && result.counts.documentsDeleted === 0,
    "⛔ This departs from the letter of the 2026-08-21 decision ('deleted outright') and\n" +
    "       is flagged for Ali in COMPLIANCE-DECISIONS. Destroying a CDD document in year 1\n" +
    "       is irreversible; holding it is one constant.");
  ok("7.5 …and the routine SAYS when they are released, rather than reporting success",
    result.ok && result.documentsHeldUntil === "2033-07-22",
    result.ok ? String(result.documentsHeldUntil) : "-");
  const held = await db.kyc.listByUser(SUBJECT);
  ok("7.5b ⭐ the officer's free-text request description is redacted IMMEDIATELY — §8's " +
     "sweep found the player's name inside it, and no hand-written list had",
    held.every((k) => (k.extraRequests ?? []).every((e) => !e.description.includes("Asha"))),
    JSON.stringify(held.map((k) => (k.extraRequests ?? []).map((e) => e.description))));
  ok("7.6 the document rows are still there while held",
    held.every((k) => (k.documents ?? []).length === 2));
  ok("7.7 …and so are the officer-requested extras",
    held.every((k) => (k.extraRequests ?? []).length === 1));
  const sofHeld = await db.sourceOfFunds.get(SUBJECT);
  ok("7.7b 🔴 …and the source-of-funds declaration is HELD with them — a CDD record on the same clock, emptied only at the release (7.11)",
    !!sofHeld?.declaredOccupation && !!sofHeld?.declaredEmployer, JSON.stringify(sofHeld));
}

// Now move past the hold and finish the job — the SAME function, run again. ⭐ At the top level since Part C
// (2026-10-11): §7b reads the identity this run released, and §7c's release runs on the same day.
const RELEASE = Date.parse("2033-08-01T00:00:00.000Z");
const late = await anonymizeClosedAccount(SUBJECT, { now: RELEASE });
{
  ok("7.8 🔴 past the hold, every document whose BYTES were destroyed loses its row too",
    late.ok && late.documentsReleased === true && late.counts.documentsDeleted === 4,
    late.ok ? JSON.stringify(late.counts) : "-");
  // 🔴 THE FAILURE MODE storage.ts EXISTS TO PREVENT, in its own words: "the record says
  // erased, the data is not". There is no R2 in a unit run, so the two `r2:` keys genuinely
  // could not be destroyed — and their rows MUST still be there, or the only pointer to a
  // live national-ID scan has been thrown away and nothing can ever retry.
  ok("7.9 🔴 …and a document whose object could NOT be destroyed KEEPS its row, so a re-run " +
     "can finish it",
    late.ok && late.counts.documentObjectsFailed === 2,
    late.ok ? `failed=${late.counts.documentObjectsFailed} (expected the 2 r2: keys)` : "-");
  const after = await db.kyc.listByUser(SUBJECT);
  const oldSub = after.find((k) => k.id === "kyc_erase_old");
  const newSub = after.find((k) => k.id === "kyc_erase_new");
  ok("7.10 the all-inline submission is EMPTY — bytes and rows both gone",
    (oldSub?.documents ?? []).length === 0 && (oldSub?.extraRequests ?? []).length === 0,
    JSON.stringify({ docs: oldSub?.documents, extras: oldSub?.extraRequests }));
  ok("7.10b ⛔ …and the mixed one kept EXACTLY the r2 rows it could not destroy, having " +
     "dropped the inline one it could",
    (newSub?.documents ?? []).length === 1
      && (newSub?.documents ?? [])[0]?.storageKey === "r2:kyc/front.jpg"
      && (newSub?.extraRequests ?? []).length === 1,
    JSON.stringify({ docs: newSub?.documents, extras: newSub?.extraRequests }));
  ok("7.10c ⭐ …and `extraRequests` was reached at all — the SECOND document store the R2 " +
     "migration's acceptance query never looked at (audit F-02 scope note)",
    late.ok && late.counts.extraRequestsCleared === 1,
    late.ok ? String(late.counts.extraRequestsCleared) : "-");
  const sof = await db.sourceOfFunds.get(SUBJECT);
  ok("7.11 the source-of-funds declaration moves on the same CDD clock",
    !sof?.declaredEmployer && !sof?.declaredOccupation,
    JSON.stringify(sof));
  ok("7.12 ⛔ …and the money STILL did not move on the second pass",
    JSON.stringify(await db.wallet.findByUserId(SUBJECT)) === walletBefore);
}

// ═════════════════════════════════════════════════════════════════════════════
section("7b · 🔴 AFTER YEAR 7 — the identity is pseudonymised, and the document STILL collides");
// ═════════════════════════════════════════════════════════════════════════════
{
  /**
   * 🔴 THE ASSERTION THE WHOLE ITEM EXISTS FOR, asked where it can bite (Part C moved it here from §5). Only after the
   * release does the row hold its number's keyed HMAC instead of the number, and only then is the trap in erasure.ts's
   * header live: the erased row's hash never meets the next applicant's raw number, so the refusal must come from the
   * fingerprint. `red:erasure` case 1 (the decision as written: no fingerprint read) and case 19 (the in-memory
   * fingerprint read gutted) each turn 7b.5 red; case 3 (the number nulled) turns 7b.2 red.
   */
  const fp = identityFingerprint("NIDA", NIDA);
  const subs = await db.kyc.listByUser(SUBJECT);
  ok("7b.1 EVERY submission was pseudonymised at the release, not just the newest",
    late.ok && late.documentsReleased === true && late.documentsHeldUntil === null
      && subs.length === 2 && subs.every((k) => k.idNumber !== NIDA),
    subs.map((k) => `${k.id}:${String(k.idNumber).slice(0, 8)}`).join(" "));
  ok("7b.2 🔴 the national ID is unreadable and is NOT null — its keyed HMAC, equal to the fingerprint (owner decision, item 3)",
    subs.length === 2 && subs.every((k) => !!k.idNumber && k.idNumber === fp && k.idFingerprint === fp),
    subs.map((k) => String(k.idNumber)).join(" "));
  ok("7b.3 the full name is the fingerprint's tag, Erased and its first 12, and the date of birth is gone",
    subs.length === 2 && subs.every((k) => k.fullName === `Erased ${fp.slice(0, 12)}` && k.dob === null),
    subs.map((k) => `${k.fullName}/${k.dob}`).join(" "));
  const fpPrior = identityFingerprint("NIDA", NIDA_PRIOR);
  const priors = subs.find((k) => k.id === "kyc_erase_new")?.priorIdentities ?? [];
  ok("7b.4 ⛔ the PRIOR identity, by the SAME rule — its own number's HMAC, its own Erased tag, no date of birth — and the rest of the entry kept",
    priors.length === 1 && priors[0].idNumber === fpPrior && priors[0].idFingerprint === fpPrior
      && priors[0].fullName === `Erased ${fpPrior.slice(0, 12)}` && priors[0].dob === null
      && priors[0].status === "APPROVED" && priors[0].cause === "correction" && priors[0].reviewerId === "usr_officer",
    JSON.stringify(priors));
  ok("7b.4b the release counted it: three numbers hashed (two rows, one prior), nothing held back any more",
    late.ok && late.counts.idNumbersHashed === 3 && late.counts.identitiesHeld === 0,
    late.ok ? JSON.stringify({ hashed: late.counts.idNumbersHashed, held: late.counts.identitiesHeld }) : "-");
  ok("7b.4c ⛔ the fingerprint survived the release intact — the value the next applicant's row collides with",
    subs.every((k) => k.idFingerprint === fp));
  // ⭐ Moved here from §5 by Part C (2026-10-11), word for word: until the release the row keeps the raw number
  // and §5's own refusal answers on it; from here on, only the fingerprint can.
  // 🔴 THE REAL QUESTION, ASKED THE WAY A PERSON ASKS IT. Not "are the hashes equal" —
  // whether somebody can walk up with the same national ID and get a second account.
  // Driven through the same service `/profile/kyc` calls.
  const IMPOSTOR = "usr_erase_second_account";
  await db.user.create({
    id: IMPOSTOR, phoneE164: "+255712000888", email: null, emailVerifiedAt: null,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "PENDING_KYC", locale: "EN", displayName: null, dob: null,
    region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: iso(NOW), updatedAt: iso(NOW), lastLoginAt: null, closedAt: null,
  } as never);
  await startKyc(IMPOSTOR);
  const quiet = console.log; console.log = () => {};
  const retry = await submitIdentityStep(IMPOSTOR, {
    idType: "NIDA", idNumber: NIDA, fullName: "Someone Else", dob: "1990-01-01",
  } as never);
  console.log = quiet;
  ok("7b.5 🔴🔴 THE SAME NATIONAL ID IS STILL REFUSED AFTER ERASURE — one document, one account",
    retry.ok === false && (retry as { reason?: string }).reason === "id_taken",
    "⛔ If this is green-through, erasure has repealed a P0 AML control. Hashing the\n" +
    "       number IN PLACE is not enough: the index compares stored strings, so the\n" +
    "       erased row's hash never meets this applicant's raw number. The collision has\n" +
    "       to live on `idFingerprint`, which BOTH rows carry.\n" +
    `       got: ${JSON.stringify(retry)}`);
  const impostorKyc = await db.kyc.findByUserId(IMPOSTOR);
  ok("7b.6 …and no identity was written for the second account",
    !impostorKyc?.idNumber, String(impostorKyc?.idNumber));

  // ⭐ THE POSITIVE CONTROL. A refusal is also what a service that refuses EVERYTHING
  // gives you, and 7b.5 cannot tell the two apart on its own.
  const HONEST = "usr_erase_unrelated";
  await db.user.create({
    id: HONEST, phoneE164: "+255712000777", email: null, emailVerifiedAt: null,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "PENDING_KYC", locale: "EN", displayName: null, dob: null,
    region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: iso(NOW), updatedAt: iso(NOW), lastLoginAt: null, closedAt: null,
  } as never);
  await startKyc(HONEST);
  const quiet2 = console.log; console.log = () => {};
  const fresh = await submitIdentityStep(HONEST, {
    idType: "NIDA", idNumber: "19900101000000000999", fullName: "Unrelated Person", dob: "1990-01-01",
  } as never);
  console.log = quiet2;
  ok("7b.7 ⭐ CONTROL — a DIFFERENT national ID is still ACCEPTED, so 7b.5 is a real refusal " +
     "and not a service that refuses everything",
    fresh.ok === true, JSON.stringify(fresh));
  ok("7b.8 the held list lets the account go at the release — the same predicate the release applies (review PC-3 F3)",
    !(await listHeldIdentities(await db.user.list())).some((h) => h.userId === SUBJECT));
}

// ═════════════════════════════════════════════════════════════════════════════
section("7c · ⭐ THE ACCOUNT'S OWN KYC FOLDER — at the release, what no row names goes too, and nothing else does");
// ═════════════════════════════════════════════════════════════════════════════
{
  /**
   * ⭐ PART C (2026-10-11). A restart used to drop a photo from its row without destroying the object, so the folder
   * `kyc/<userId>/` can hold objects no row names, which the loop over the rows can never reach. The release lists the
   * folder and destroys them too. Driven through the REAL `listKycDocumentKeys` and `deleteKycDocument` against a fake S3
   * client (`__setKycS3ClientForTests`): the commands, the paging and the folder they name are the product's own.
   * ⛔ THE CONTROLS ARE THE POINT: an account whose id begins with the same letters, and the agent programme's folder,
   * sit in the same bucket and must come through untouched; a listing that fails must count as a failure.
   */
  const R2U = "usr_erase_r2";
  const FOLDER = "kyc/usr_erase_r2/";
  const ROW_KEY = `${FOLDER}NIDA_FRONT/rowdoc.jpg`;
  const ORPHANS = [`${FOLDER}NIDA_FRONT/restart1.jpg`, `${FOLDER}SELFIE/restart2.jpg`];
  const STUCK = `${FOLDER}NIDA_BACK/stuck.jpg`;
  const NEIGHBOUR = "kyc/usr_erase_r2x/NIDA_FRONT/neighbour.jpg";
  const AGENT_APP = "kyc/agentapp/app_erase_r2/CV/cv.jpg";
  const bucket = new Set<string>([ROW_KEY, ...ORPHANS, STUCK, NEIGHBOUR, AGENT_APP]);
  const refuse = new Set<string>([STUCK]);
  let listFails = false;
  const calls: Array<{ op: "list" | "delete"; arg: string }> = [];
  /** A fake R2: lists by prefix, TWO keys a page (so the paging is driven), and refuses the objects in `refuse`. */
  const fakeR2 = {
    send: async (cmd: { input?: Record<string, unknown> }) => {
      const input = cmd?.input ?? {};
      if ("Prefix" in input) {
        const prefix = String(input.Prefix ?? "");
        calls.push({ op: "list", arg: prefix });
        if (listFails) throw new Error("fixture: the bucket is unreachable");
        const all = [...bucket].filter((k) => k.startsWith(prefix)).sort();
        const from = Number(input.ContinuationToken ?? 0);
        const next = from + 2 < all.length ? String(from + 2) : undefined;
        return { Contents: all.slice(from, from + 2).map((Key) => ({ Key })), IsTruncated: next !== undefined, NextContinuationToken: next };
      }
      if ("Key" in input) {
        const key = String(input.Key ?? "");
        calls.push({ op: "delete", arg: key });
        if (refuse.has(key)) throw new Error("fixture: R2 refused this object");
        bucket.delete(key);
        return {};
      }
      throw new Error("fixture: an S3 command this suite does not expect");
    },
  };
  const R2_NIDA = "19910101000000000431";
  await db.user.create({
    id: R2U, phoneE164: "+255712000431", email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "CLOSED", locale: "EN", displayName: "Folder Fixture",
    dob: "1991-01-01", region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW - 90 * DAY),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: iso(NOW - 90 * DAY), updatedAt: iso(NOW - 30 * DAY), lastLoginAt: null, closedAt: CLOSED_AT,
  } as never);
  await db.kyc.upsert({
    id: "kyc_erase_r2", userId: R2U, status: "APPROVED", rejectReason: null, rejectNote: null,
    idType: "NIDA", idNumber: R2_NIDA, idExpiry: null, idVerifiedAt: iso(NOW - 80 * DAY),
    idFingerprint: identityFingerprint("NIDA", R2_NIDA), fullName: "Folder Fixture", dob: "1991-01-01",
    documents: [{ docType: "NIDA_FRONT", storageKey: `r2:${ROW_KEY}`, uploadedAt: iso(NOW - 80 * DAY), mimeType: "image/jpeg", sizeBytes: 1000 }],
    extraRequests: [], priorIdentities: [], reviewerId: "usr_officer", reviewedAt: iso(NOW - 80 * DAY),
    submittedAt: iso(NOW - 80 * DAY), approvedAt: iso(NOW - 80 * DAY),
    createdAt: iso(NOW - 80 * DAY), updatedAt: iso(NOW - 80 * DAY),
  } as never);

  const savedEnv = { KYC_STORAGE: process.env.KYC_STORAGE, R2_BUCKET: process.env.R2_BUCKET };
  process.env.KYC_STORAGE = "r2";
  process.env.R2_BUCKET = "erasure-fixture-bucket";
  __setKycS3ClientForTests(fakeR2);
  try {
    ok("7c.0 CONTROL · the folder is the account's own, and an id that could name another folder gets none",
      kycUserKeyPrefix(R2U) === FOLDER && kycUserKeyPrefix("agentapp") === null && kycUserKeyPrefix("usr/x") === null
        && kycUserKeyPrefix("usr.x") === null && kycUserKeyPrefix("") === null && bucket.size === 6,
      `${kycUserKeyPrefix(R2U)} · ${bucket.size} objects`);
    let refusedTree = false;
    try { await listKycDocumentKeys("kyc/"); } catch { refusedTree = true; }
    let refusedAgents = false;
    try { await listKycDocumentKeys("kyc/agentapp/"); } catch { refusedAgents = true; }
    ok("7c.0b ⛔ the lister refuses anything but one account's folder — the whole KYC tree and the agent programme's folder are never even read",
      refusedTree && refusedAgents && calls.length === 0, JSON.stringify(calls));

    const heldRun = await anonymizeClosedAccount(R2U, { now: NOW });
    ok("7c.1 ⛔ DURING THE HOLD nothing in the folder is listed or destroyed — the photos are CDD records for seven years",
      heldRun.ok && heldRun.documentsReleased === false && calls.length === 0 && bucket.size === 6
        && heldRun.counts.orphanObjectsDeleted === 0 && heldRun.counts.identitiesHeld === 1,
      JSON.stringify({ calls, size: bucket.size, counts: heldRun.ok ? heldRun.counts : heldRun }));

    const releaseRun = await anonymizeClosedAccount(R2U, { now: RELEASE });
    const row = (await db.kyc.listByUser(R2U))[0];
    ok("7c.2 the row's own object goes with its row — the loop's rule, unchanged",
      releaseRun.ok && releaseRun.counts.documentsDeleted === 1 && !bucket.has(ROW_KEY) && (row?.documents ?? []).length === 0,
      releaseRun.ok ? JSON.stringify(releaseRun.counts) : JSON.stringify(releaseRun));
    ok("7c.3 ⭐ the two objects no row named are destroyed too; the one R2 refused is COUNTED and stays for the re-run",
      releaseRun.ok && releaseRun.counts.orphanObjectsDeleted === 2 && releaseRun.counts.documentObjectsFailed === 1
        && ORPHANS.every((k) => !bucket.has(k)) && bucket.has(STUCK),
      releaseRun.ok ? JSON.stringify({ orphans: releaseRun.counts.orphanObjectsDeleted, failed: releaseRun.counts.documentObjectsFailed, left: [...bucket] }) : "-");
    ok("7c.4 ⛔ CONTROL · the other account's object and the agent programme's are untouched — the folder, never the bucket",
      bucket.has(NEIGHBOUR) && bucket.has(AGENT_APP)
        && !calls.some((c) => c.op === "delete" && (c.arg === NEIGHBOUR || c.arg === AGENT_APP)),
      JSON.stringify([...bucket]));
    const lists = calls.filter((c) => c.op === "list");
    ok("7c.5 ⛔ every listing named exactly the account's own folder, trailing slash and all — and the paging was followed",
      lists.length >= 2 && lists.every((c) => c.arg === FOLDER), JSON.stringify(lists));
    ok("7c.6 …and every delete named a key inside that folder",
      calls.some((c) => c.op === "delete") && calls.filter((c) => c.op === "delete").every((c) => c.arg.startsWith(FOLDER)),
      JSON.stringify(calls.filter((c) => c.op === "delete")));

    refuse.delete(STUCK);
    const rerun = await anonymizeClosedAccount(R2U, { now: RELEASE + DAY });
    ok("7c.7 a re-run once R2 takes it finishes the job — the refused object goes, and nothing else is counted",
      rerun.ok && rerun.counts.orphanObjectsDeleted === 1 && rerun.counts.documentObjectsFailed === 0
        && rerun.counts.documentsDeleted === 0 && !bucket.has(STUCK),
      rerun.ok ? JSON.stringify(rerun.counts) : "-");
    const third = await anonymizeClosedAccount(R2U, { now: RELEASE + 2 * DAY });
    ok("7c.8 IDEMPOTENT · a third run finds nothing — every counter zero, the two controls still there",
      third.ok && third.counts.orphanObjectsDeleted === 0 && third.counts.documentObjectsFailed === 0
        && third.counts.documentsDeleted === 0 && third.counts.idNumbersHashed === 0
        && bucket.size === 2 && bucket.has(NEIGHBOUR) && bucket.has(AGENT_APP),
      third.ok ? JSON.stringify(third.counts) : "-");

    // ⛔ A LISTING THAT FAILS IS A FAILURE, NEVER AN EMPTY FOLDER.
    const LATE_ORPHAN = `${FOLDER}SELFIE/late.jpg`;
    bucket.add(LATE_ORPHAN);
    listFails = true;
    const blind = await anonymizeClosedAccount(R2U, { now: RELEASE + 3 * DAY });
    listFails = false;
    ok("7c.9 ⛔ a listing that FAILS is counted as a failure owed a re-run — never read as an empty folder",
      blind.ok && blind.counts.documentObjectsFailed === 1 && blind.counts.orphanObjectsDeleted === 0 && bucket.has(LATE_ORPHAN),
      blind.ok ? JSON.stringify(blind.counts) : "-");
  } finally {
    __setKycS3ClientForTests(null);
    if (savedEnv.KYC_STORAGE === undefined) delete process.env.KYC_STORAGE; else process.env.KYC_STORAGE = savedEnv.KYC_STORAGE;
    if (savedEnv.R2_BUCKET === undefined) delete process.env.R2_BUCKET; else process.env.R2_BUCKET = savedEnv.R2_BUCKET;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7d · ⭐ WHAT THE HOLD HOLDS — agent files, nothing at all, no closure date, the exact instant");
// ═════════════════════════════════════════════════════════════════════════════
{
  /**
   * ⭐ 2026-10-11 · the Part C reviews (PC-1 MAJOR-2, PC-3 F1/F3/F4/F9). Four accounts the main subject cannot stand for:
   * an agent applicant whose only held thing is the programme's files; a player who never verified (the most common
   * erasure — the hold holds NOTHING, so no release date may be reported); a CLOSED account with no closure date (the
   * clock is counted from the first run and WRITTEN, never treated as long closed); and the release instant itself.
   */
  const mkClosed = async (id: string, phone: string, closedAt: string | null) => db.user.create({
    id, phoneE164: phone, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "CLOSED", locale: "EN", displayName: null,
    dob: "1990-01-01", region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW - 400 * DAY),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, createdAt: iso(NOW - 400 * DAY),
    updatedAt: iso(NOW - 30 * DAY), lastLoginAt: null, closedAt,
  } as never);
  const typed = (uid: string, number: string, at: string) => ({
    id: `kyc_${uid}`, userId: uid, status: "APPROVED", rejectReason: null, rejectNote: null,
    idType: "VOTER_CARD", idNumber: number, idExpiry: null, idVerifiedAt: at, idFingerprint: null,
    fullName: `Qa ${uid.slice(-6)}`, dob: "1990-01-01", documents: [], extraRequests: [], priorIdentities: [],
    reviewerId: null, reviewedAt: at, submittedAt: at, approvedAt: at, createdAt: at, updatedAt: at,
  });

  // ① AN AGENT APPLICANT'S FILES — on the identity's clock: held in year one, destroyed at the release (PC-3 F1).
  const AGENT = "usr_erase_agent", APP = "aga_erase_agent";
  await mkClosed(AGENT, "+255712000801", iso(NOW - 30 * DAY));
  await db.agentApplication.create({
    id: APP, userId: AGENT, status: "REJECTED", source: "SELF_SERVICE",
    refereeOneName: null, refereeOneContact: null, refereeTwoName: null, refereeTwoContact: null, refereeConsentAt: null,
    feeAmountTzs: null, feeAttestedTzs: null, feeFundingSource: null, feeReference: null, feeStatementRef: null,
    feeReconciledAt: null, feeReconciledById: null, feeSourceAccount: null, feeWaivedAt: null, feeWaivedById: null,
    feeWaiverReason: null, feeDisposition: "NONE", feeRefundDueAt: null, feeRefundedAt: null, feeRefundedById: null,
    feeRefundReference: null, feeRefundAmountTzs: null, reviewerId: null, reviewedAt: iso(NOW - 60 * DAY), rejectReason: null,
    rejectNote: null, infoRequestNote: null, infoRequestedAt: null, approvedRatePct: null, agentCode: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, submittedAt: iso(NOW - 70 * DAY), expiresAt: null,
    createdAt: iso(NOW - 70 * DAY), updatedAt: iso(NOW - 60 * DAY),
  } as never);
  for (const [id, key] of [["agd_erase_inline", INLINE_DOC], ["agd_erase_r2", `r2:kyc/agentapp/${APP}/REFEREE_ONE_ID`]] as const) {
    await db.agentApplicationDoc.create({
      id, applicationId: APP, docType: "REFEREE_ONE_ID", storageKey: key, mimeType: "image/jpeg", sizeBytes: 4,
      suppliedById: AGENT, uploadedAt: iso(NOW - 70 * DAY), rejected: false, rejectReason: null, thirdParty: true, purgedAt: null,
    } as never);
  }
  const agentHeld = await anonymizeClosedAccount(AGENT, { now: NOW });
  const docsHeld = await db.agentApplicationDoc.listByApplication(APP);
  ok("7d.1 🔴 an agent applicant's files are HELD during the hold — not one purged in year one",
    agentHeld.ok && agentHeld.documentsReleased === false && docsHeld.length === 2 && docsHeld.every((d) => d.purgedAt === null),
    JSON.stringify(docsHeld.map((d) => d.purgedAt)));
  ok("7d.2 …and they are what the hold holds: no typed identity on the account, yet the release date is reported",
    agentHeld.ok && agentHeld.counts.identitiesHeld === 0 && agentHeld.documentsHeldUntil === "2033-07-22",
    agentHeld.ok ? String(agentHeld.documentsHeldUntil) : JSON.stringify(agentHeld));
  const agentLate = await anonymizeClosedAccount(AGENT, { now: RELEASE });
  const docsLate = await db.agentApplicationDoc.listByApplication(APP);
  ok("7d.3 at the release the file whose bytes went is purged, and the one the storage refused is COUNTED and kept for the re-run",
    agentLate.ok && agentLate.counts.agentDocumentsDeleted === 1 && agentLate.counts.agentDocumentObjectsFailed === 1
      && !!docsLate.find((d) => d.id === "agd_erase_inline")?.purgedAt && docsLate.find((d) => d.id === "agd_erase_r2")?.purgedAt === null,
    agentLate.ok ? JSON.stringify(agentLate.counts) : JSON.stringify(agentLate));

  // ② NOTHING HELD (PC-1 MAJOR-2) — a player who never verified: no identity, no file, no declaration.
  const NEVER = "usr_erase_never";
  await mkClosed(NEVER, "+255712000802", iso(NOW - 30 * DAY));
  const never = await anonymizeClosedAccount(NEVER, { now: NOW });
  ok("7d.4 🔴 an account the hold holds NOTHING for reports no release date — a 2033 date there would be a false \"identity held\"",
    never.ok && never.documentsReleased === false && never.documentsHeldUntil === null && never.counts.identitiesHeld === 0,
    JSON.stringify(never));

  // ③ NO CLOSURE DATE (PC-1/PC-3 F4) — counted from the first run, and WRITTEN, so the clock never restarts.
  const NOCLOSE = "usr_erase_noclose";
  await mkClosed(NOCLOSE, "+255712000803", null);
  await db.kyc.upsert(typed(NOCLOSE, "QAERASE0803", iso(NOW - 60 * DAY)) as never);
  const ncDate = (() => { const d = new Date(NOW); d.setUTCFullYear(d.getUTCFullYear() + KYC_DOCUMENT_HOLD_YEARS); return d.toISOString().slice(0, 10); })();
  const nc1 = await anonymizeClosedAccount(NOCLOSE, { now: NOW });
  ok("7d.5 🔴 a CLOSED account with no closure date is HELD, counted from the first run — never read as long closed",
    nc1.ok && nc1.documentsReleased === false && nc1.documentsHeldUntil === ncDate,
    JSON.stringify(nc1.ok ? { held: nc1.documentsHeldUntil, released: nc1.documentsReleased } : nc1));
  const nc2 = await anonymizeClosedAccount(NOCLOSE, { now: NOW + 90 * DAY });
  const ncUser = await db.user.findById(NOCLOSE);
  ok("7d.6 …and the first run's instant is WRITTEN as its closure, so a later run reports the SAME date — the clock never restarts",
    ncUser?.closedAt === iso(NOW) && nc2.ok && nc2.documentsHeldUntil === ncDate,
    JSON.stringify({ closedAt: ncUser?.closedAt, again: nc2.ok ? nc2.documentsHeldUntil : nc2 }));

  // ④ THE INSTANT (PC-3 F9) — seven years to the millisecond: one before, held; at it, released.
  const EDGE = "usr_erase_edge";
  const EDGE_RELEASE = Date.parse("2033-03-15T10:20:30.000Z");
  await mkClosed(EDGE, "+255712000804", "2026-03-15T10:20:30.000Z");
  await db.kyc.upsert(typed(EDGE, "QAERASE0804", "2025-12-01T00:00:00.000Z") as never);
  const before = await anonymizeClosedAccount(EDGE, { now: EDGE_RELEASE - 1 });
  ok("7d.7 🔴 one millisecond before seven years the identity is still HELD",
    before.ok && before.documentsReleased === false && before.documentsHeldUntil === "2033-03-15"
      && (await db.kyc.findByUserId(EDGE))?.idNumber === "QAERASE0804",
    JSON.stringify(before.ok ? { released: before.documentsReleased, held: before.documentsHeldUntil } : before));
  // The held list, read while both are held: the soonest release first (PC-3 F3).
  const order = (await listHeldIdentities(await db.user.list())).map((h) => h.userId).filter((u) => u === EDGE || u === NOCLOSE);
  ok("7d.8 the held list puts the soonest release first", JSON.stringify(order) === JSON.stringify([EDGE, NOCLOSE]), JSON.stringify(order));
  const at = await anonymizeClosedAccount(EDGE, { now: EDGE_RELEASE });
  ok("7d.9 🔴 …and AT seven years exactly it is released — never a millisecond shorter than the law, nor longer",
    at.ok && at.documentsReleased === true && (await db.kyc.findByUserId(EDGE))?.idNumber !== "QAERASE0804",
    JSON.stringify(at.ok ? { released: at.documentsReleased, counts: at.counts.idNumbersHashed } : at));
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · ⭐ THE SWEEP — nothing anywhere still holds an erased identifier");
// ═════════════════════════════════════════════════════════════════════════════
{
  /**
   * ⛔ A CHECKLIST IS ONLY AS COMPLETE AS ITS AUTHOR. Sections 3–7 name the fields they
   * expect to be cleared; this walks the WHOLE store and asks the opposite question —
   * does ANYTHING still hold one of these values? Two surfaces were found this way that
   * no hand-written list had: the referrer's notification body and `extraRequests`.
   *
   * ⭐ The allowlist below is the answer to "what do we keep, and on whose authority" —
   * it is the same table as `docs/DATA-RETENTION.md` §1, expressed as an assertion.
   */
  const NEEDLES: Array<[string, string]> = [
    ["the phone number", PHONE],
    ["the display name", NAME],
    ["the email address", EMAIL],
    ["the national ID", NIDA],
    ["the name-form mask", nameMask],
    ["the phone-form mask", phoneMask],
    // ⭐ LOWERCASED, because `HouseBot.labelKey` is the case-insensitive live-uniqueness key and a
    // name-shaped label survives there in lower case after the label itself has been rewritten.
    ["the display name, lowercased", NAME.toLowerCase()],
    // ⭐ U18b · THE MARKETING KEY. Every marketing store holds the number BARE (`255…`), the account `+255…`;
    // the `+` needle alone never matched a single marketing row, so the sweep could not have seen them.
    ["the phone number as the marketing key (bare 255…)", SUBJECT_KEY],
    ["the player's earlier number (a linked contact-book row)", SUBJECT_OLD],
    // ⭐ Part C · the national ID a correction replaced, held in `priorIdentities` until the release — gone after it.
    ["the national ID the player held before (a prior identity)", NIDA_PRIOR],
  ];
  // Statutory holders, each with the reason it may keep the value.
  const ALLOWED: Record<string, string> = {
    // Transaction.msisdn is the payment instrument on a confirmed deposit — POCA Cap 423
    // §16 requires the transaction record for 7 years and the counterparty is part of it.
    "txns": "Transaction.msisdn — the payment instrument on a money record (POCA Cap 423 §16, 7y)",
    // ── U18b · the NUMBER is what a stop list stops; nothing else of the person is kept with it ──
    "marketingLedgerKeys": "MessagingConsent.identifier — the append-only consent record (GN 478T reg 51(1)), whose last row is the WITHDRAWN this erasure wrote; the ROWS themselves are swept strictly in consentLedger",
    "marketingContactKeys": "MarketingContact.msisdn — the emptied book row is kept, marked sourceRef 'erasure', so a re-import of the number collapses to KEEP (U31) instead of writing the person's name back",
  };
  // ⛔ The OTHER columns are swept STRICTLY (the S10 review: allowlisting a whole bucket exempts it from
  // every needle, so a name written into a ledger row's evidence would have passed). Each marketing store's
  // KEY column is masked in its strict bucket and allowlisted in a keys-only bucket of its own, so a name,
  // e-mail, note, tag or mask left anywhere else in the row still fails 8.b.
  const book = await db.marketingContact.listAll();
  const ledgerRows = [...await db.messagingConsent.listFor(keyOf(SUBJECT_KEY)), ...await db.messagingConsent.listFor(keyOf(SUBJECT_OLD))];
  const buckets: Record<string, unknown> = {
    users: await db.user.list(),
    kyc: await db.kyc.listByUser(SUBJECT),
    txns: await db.txn.listAll(),
    wallets: await db.wallet.listAll(),
    notificationsSubject: await db.notification.findByUser(SUBJECT, 100),
    notificationsReferrer: await db.notification.findByUser(REFERRER, 100),
    comments: (await listComments("mkt_erase", MOD)).comments,
    sourceOfFunds: await db.sourceOfFunds.get(SUBJECT),
    positions: await positionStore.values(),
    pushSubs: await db.pushSub.listForUser(SUBJECT),
    audit: getAuditPage({ limit: 10_000 }),
    // ── the six house tables (04 A5, R6; C5-SPEC ruling 244) ──────────────────────────────
    // ⛔ THE OFFICER'S INBOX IS A BUCKET OF ITS OWN. It is the one surface erasure does not own:
    // the row belongs to an ADMIN, and `deleteAllForUser(SUBJECT)` cannot reach it. It is the
    // house-bot twin of the referrer's notification this sweep found on the first pass.
    notificationsAdmin: await db.notification.findByUser(ADMIN, 100),
    houseBots: await houseBotStore.listByUserId(SUBJECT),
    houseBotEvents: await houseBotEventStore.listByBot(BOT_ID, { limit: 100 }),
    // ⭐ INTENTS AND TARGETS ARE KEPT BY DESIGN — ids, markers, stakes and times are the money
    // record. They are swept anyway: the day an officer's sentence lands in one is the day this
    // matters, and a table nobody walks is a table nobody can clear.
    houseBotIntents: { one: await houseBotIntentStore.get(INTENT_ID), feed: await houseBotIntentStore.listFeed({ houseBotId: BOT_ID, limit: 50 }) },
    // ⚠️ THE WINDOW IS THE WALL CLOCK, NOT `NOW`. The DAL stamps a press with the real time, while
    // this suite's fixtures sit at the frozen `NOW` — a window built from `NOW` alone ends BEFORE the
    // press was written and the bucket comes back empty, which 8.0e below is what catches.
    houseBotPresses: await pressStore.listRegister({ fromIso: iso(NOW - 365 * DAY), toIso: iso(Date.now() + DAY), houseBotId: BOT_ID, limit: 100 }),
    houseBotTargets: await targetStore.listForBot(BOT_ID, "all", null),
    // ── U18b · the marketing stores ──────────────────────────────────────────────────────────
    marketingContacts: book.map((c) => ({ ...c, msisdn: "[key]", rawInput: c.rawInput === c.msisdn ? "[key]" : c.rawInput })),
    marketingContactKeys: book.map((c) => ({ msisdn: c.msisdn, rawInput: c.rawInput })),
    suppressions: [...await db.suppression.listFor(SUBJECT_KEY), ...await db.suppression.listFor(SUBJECT_OLD)]
      .map((r) => ({ ...r, identifier: "[key]" })),
    consentLedger: ledgerRows.map((r) => ({ ...r, identifier: "[key]" })),
    marketingLedgerKeys: ledgerRows.map((r) => r.identifier),
    // ── U29b · an import mid-staging: the subject's two rows must be gone, the strangers' two must remain ─────────────
    contactImportRows: await db.contactImportRow.after({ importId: STAGED_RUN, afterOrdinal: 0, limit: 100 }),
    // ── MASWALI-BUILD S6 · MB-67 · the Millionea record: KEPT whole (7 years), and holding no identifier erasure removes ──
    millionea: await millioneaRecord(),
  };
  ok("8.0 CONTROL · the sweep really read something", Object.keys(buckets).length >= 20,
    `${Object.keys(buckets).length} buckets`);
  // ⛔ "0 rows returned" and "the query is broken" look identical, so the buckets that must
  // still HAVE content are named and required to. The two that erasure empties by design
  // are excluded here and asserted empty in §6.9 / §7.2 instead — excluding them silently
  // is how a sweep comes to pass over an unread store.
  //
  // ⛔ THE SIX HOUSE BUCKETS GO IN HERE IN THE SAME EDIT AS THE BUCKETS THEMSELVES. A bucket that
  // is always empty passes every 8.b below for the wrong reason — "no trace of the name" and "no
  // rows at all" are the same JSON, and the second one proves nothing.
  const MUST_HAVE_CONTENT = ["users", "kyc", "txns", "wallets", "notificationsReferrer",
    "comments", "sourceOfFunds", "positions", "audit",
    "notificationsAdmin", "houseBots", "houseBotEvents", "houseBotIntents", "houseBotPresses",
    "houseBotTargets", "marketingContacts", "marketingContactKeys", "consentLedger", "marketingLedgerKeys",
    "contactImportRows", "millionea"] as const;
  /**
   * ⛔ AND A PAGE-SHAPED BUCKET NEEDS ITS OWN COUNT. `{"rows":[],"nextCursor":null}` is 30
   * characters, so the length test above passes an EMPTY keyset page — which is exactly the
   * "always empty, so always clean" failure the six house buckets were added to avoid. Counted
   * here, by name, with the number printed.
   */
  const houseCounts = {
    notificationsAdmin: (buckets.notificationsAdmin as unknown[]).length,
    houseBots: (buckets.houseBots as unknown[]).length,
    houseBotEvents: (buckets.houseBotEvents as { rows: unknown[] }).rows.length,
    houseBotIntentOne: (buckets.houseBotIntents as { one: unknown }).one == null ? 0 : 1,
    houseBotIntentFeed: (buckets.houseBotIntents as { feed: { rows: unknown[] } }).feed.rows.length,
    houseBotPresses: (buckets.houseBotPresses as { rows: unknown[] }).rows.length,
    houseBotTargets: (buckets.houseBotTargets as { rows: unknown[] }).rows.length,
  };
  ok("8.0e CONTROL · every one of the six house buckets really holds rows — an empty keyset page is 30 " +
     "characters of JSON and would sail through 8.0b while proving nothing",
    Object.values(houseCounts).every((n) => n >= 1), JSON.stringify(houseCounts));
  ok("8.0b CONTROL · every bucket that should still hold rows does — a clean result is a " +
     "clean bucket, not an unread one",
    MUST_HAVE_CONTENT.every((k) => JSON.stringify(buckets[k] ?? null).length > 20),
    MUST_HAVE_CONTENT.map((k) => `${k}:${JSON.stringify(buckets[k] ?? null).length}`).join(" "));
  // ⭐ AND THE SWEEP MUST BE ABLE TO GO RED. Run the same predicate over a bucket built to
  // hold a needle: if this passes as "clean", every 8.b below is decoration.
  {
    const poisoned = { users: [{ id: "x", phoneE164: PHONE }] };
    ok("8.0c CONTROL · the sweep's own predicate FINDS a planted needle",
      JSON.stringify(poisoned).includes(PHONE));
    // ⭐ AND THE LOWERCASED ONE, over a bucket shaped like the house roster: a `labelKey` still
    // carrying the holder's name would be found, so 8.b over `houseBots` is not decoration.
    const poisonedKey = { houseBots: [{ id: BOT_ID, label: "Erased ABC123", labelKey: NAME.toLowerCase() }] };
    ok("8.0d CONTROL · the sweep FINDS a name-shaped labelKey a rewritten label would have hidden",
      JSON.stringify(poisonedKey).includes(NAME.toLowerCase())
        && !JSON.stringify(poisonedKey).includes(NAME));
  }

  for (const [label, needle] of NEEDLES) {
    for (const [bucket, value] of Object.entries(buckets)) {
      const hit = JSON.stringify(value ?? null).includes(needle);
      if (hit && ALLOWED[bucket]) {
        ok(`8.a ${bucket} keeps ${label} — ${ALLOWED[bucket]}`, true);
        continue;
      }
      ok(`8.b 🔴 ${bucket} holds NO trace of ${label}`, !hit,
        hit ? `Found "${needle}" in ${bucket}. Either erase it or add it to ALLOWED with the\n` +
              "       statute that requires it — silence is not an answer here." : "");
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · idempotent — running it again changes nothing");
// ═════════════════════════════════════════════════════════════════════════════
{
  const snapshot = JSON.stringify(await db.user.findById(SUBJECT));
  const second = await anonymizeClosedAccount(SUBJECT, { now: Date.parse("2033-08-02T00:00:00.000Z") });
  ok("9.1 a second pass succeeds and says so", second.ok === true);
  ok("9.2 …and reports the account as already erased", second.ok && second.alreadyErased === true);
  ok("9.3 …and every counter that would mean new work is zero",
    second.ok && second.counts.idNumbersHashed === 0 && second.counts.documentsDeleted === 0
      && second.counts.notificationsDeleted === 0 && second.counts.otps === 0
      && second.counts.marketingConsentWithdrawn === 0 && second.counts.marketingContactsEmptied === 0
      && second.counts.identitiesHeld === 0 && second.counts.orphanObjectsDeleted === 0,
    second.ok ? JSON.stringify(second.counts) : "-");
  const kycSnapshot = JSON.stringify((await db.kyc.listByUser(SUBJECT)).map((k) => [k.idNumber, k.fullName, k.dob, k.priorIdentities]));
  const third = await anonymizeClosedAccount(SUBJECT, { now: Date.parse("2033-08-03T00:00:00.000Z") });
  ok("9.3b ⭐ Part C · after the release the identity record no longer moves: a further run rewrites no number, name, date of birth or prior identity",
    third.ok && third.counts.idNumbersHashed === 0
      && JSON.stringify((await db.kyc.listByUser(SUBJECT)).map((k) => [k.idNumber, k.fullName, k.dob, k.priorIdentities])) === kycSnapshot,
    third.ok ? JSON.stringify(third.counts) : "-");
  ok("9.4 the user row is unchanged by the re-run",
    JSON.stringify(await db.user.findById(SUBJECT)) === snapshot);
  ok("9.5 the tombstone is recognised as one", isErasedPhone(erasedPhoneTombstone(SUBJECT))
    && !isErasedPhone(PHONE));
  ok("9.6 🔴 MASWALI-BUILD S6 · MB-67 · after the 7-year release and two re-runs the Millionea record is STILL byte-identical — the release ends the identity hold, never the betting record",
    JSON.stringify(await millioneaRecord()) === millioneaBefore);
  ok("9.6b R2-6 · the re-runs find no seen mark left to delete (they count 0), and another account's mark is still its own",
    (await seenOf(SUBJECT)).length === 0 && second.ok === true && second.counts.millioneaSeenMarks === 0 && JSON.stringify(await seenOf(MLN_OTHER)) === seenBefore.other,
    second.ok ? String(second.counts.millioneaSeenMarks) : "-");
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · the periods agree with the published schedule");
// ═════════════════════════════════════════════════════════════════════════════
{
  const schedule = readFileSync("docs/DATA-RETENTION.md", "utf8");
  ok("10.1 CONTROL · the schedule was read", schedule.includes("Identity documents + KYC decisions"));
  ok("10.2 🔴 the hold matches the period published to the Gaming Board",
    KYC_DOCUMENT_HOLD_YEARS === 7 && /Identity documents \+ KYC decisions \| \*\*7 years\*\*/.test(schedule),
    `constant ${KYC_DOCUMENT_HOLD_YEARS}y — a routine that destroys a document earlier than\n` +
    "       the schedule says makes the schedule false.");
  ok("10.3 the tombstone and redaction strings carry no identifier of their own",
    [ERASED_AUTHOR_NAME, ERASED_COMMENT_BODY, ERASED_REQUEST_DESCRIPTION].every((v) => !/\d/.test(v)));
}

// ═════════════════════════════════════════════════════════════════════════════
section("11 · the DATABASE half — what a unit run cannot execute, it can still read");
// ═════════════════════════════════════════════════════════════════════════════
{
  /**
   * ⛔ §5 AND §7b PROVE THE SEQUENTIAL REFUSAL AND CANNOT PROVE THE RACE. There is no Postgres
   * here, so the partial unique index does not exist and the in-memory store enforces
   * nothing — 5.9 and 7b.5 are carried entirely by the service's fast-path reads. That read is the
   * right thing to have (a player gets `id_taken` instead of a 500) but it is NOT the
   * control: two applicants in the same instant both clear it, which
   * `scripts/load/s14-kyc-nida-race.mts` demonstrates for the tuple index.
   *
   * So the DB half is asserted the only way a unit run honestly can — by reading the
   * migration and the write site, exactly as `test:cert-d1` §3 does for the tuple index.
   *
   * ⚠️ STRIP THE COMMENTS FIRST. Both files explain themselves at length and their prose
   * QUOTES the SQL and the field names being asserted — cert-d1 records a case where a
   * file-wide regex matched an explanatory comment and stayed green over a TOTAL index.
   */
  const stripSql = (sql: string) => sql.replace(/--.*$/gm, "");
  const stripTs = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const MIG = "prisma/migrations/20260821140000_kyc_identity_fingerprint/migration.sql";
  let migRaw = "";
  try { migRaw = readFileSync(MIG, "utf8"); } catch { /* reported below */ }
  ok("11.0 🔴 the fingerprint migration exists", migRaw.length > 0, `missing ${MIG}`);
  const mig = stripSql(migRaw);
  ok("11.0b CONTROL · stripping the comments left the statements behind",
    /ALTER TABLE/.test(mig) && !/THE PART THAT DOES NOT FOLLOW/.test(mig),
    "If this fires the stripper ate the SQL and every assertion below is vacuous.");

  const uniqueStmt = (() => {
    const i = mig.search(/CREATE\s+UNIQUE\s+INDEX/i);
    if (i < 0) return "";
    const end = mig.indexOf(";", i);
    return end < 0 ? mig.slice(i) : mig.slice(i, end + 1);
  })();
  ok("11.1 a CREATE UNIQUE INDEX statement exists outside the comments", uniqueStmt.length > 0,
    "Everything below reads this statement; without it they all pass vacuously.");
  ok("11.2 🔴 it is on `idFingerprint`, on KycSubmission",
    /ON\s+"KycSubmission"\s*\(\s*"idFingerprint"\s*\)/.test(uniqueStmt), uniqueStmt.slice(0, 200));
  ok("11.3 🔴 it is PARTIAL with the SAME predicate as the tuple index — a REJECTED " +
     "submission must still free the document",
    /WHERE[\s\S]*"idFingerprint" IS NOT NULL[\s\S]*status\s*<>\s*'REJECTED'/.test(uniqueStmt),
    "A total index burns the document on any rejection AND makes the two enforcement\n" +
    "       paths disagree about what a duplicate is.");
  ok("11.4 it is idempotent (production may pre-create it CONCURRENTLY by hand)",
    /IF NOT EXISTS/.test(uniqueStmt));
  ok("11.5 ⛔ EXPAND ONLY — it drops nothing, so it is safe in ONE release",
    !/DROP\s+(COLUMN|INDEX|TABLE)/i.test(mig),
    "A drop needs two releases: the previous container's generated client still names\n" +
    "       every scalar column, and KYC is read on all three login paths.");
  ok("11.6 ⛔ no CONCURRENTLY — migrate deploy wraps the file in a transaction (25001)",
    !/CONCURRENTLY/i.test(mig));
  // ⚠️ Scoped to the ADD COLUMN statement, not the file. The unique index's own predicate
  // reads `WHERE "idFingerprint" IS NOT NULL`, so a file-wide `!/NOT NULL/` test fails on a
  // correct migration — which is how this assertion first went red.
  const addColumn = /ALTER TABLE[^;]*;/.exec(mig)?.[0] ?? "";
  ok("11.7 the column is added nullable, and with IF NOT EXISTS so a hand-applied " +
     "pre-create is a no-op",
    /ADD COLUMN IF NOT EXISTS "idFingerprint" TEXT/.test(addColumn) && !/NOT NULL/.test(addColumn),
    addColumn);

  const svc = stripTs(readFileSync("src/lib/server/kyc-service.ts", "utf8"));
  ok("11.8 CONTROL · the service was read", svc.includes("submitIdentityStep"));
  // ⭐ 2026-10-10 · TWO identity writers now — the typed one-press `verifyIdentity` and the agent track's
  // `submitIdentityStep` — and EACH must write the fingerprint (a file-wide match passed with one of them dropped).
  const svcBody = (name: string): string => {
    const at = svc.indexOf(`export async function ${name}(`);
    if (at < 0) return "";
    const end = svc.indexOf("\nexport ", at + 1);
    return svc.slice(at, end < 0 ? undefined : end);
  };
  const FP_WRITE = /idFingerprint:\s*avail\.fingerprint/;
  ok("11.9 🔴 the identity step WRITES a fingerprint on every submission",
    FP_WRITE.test(svcBody("verifyIdentity")) && FP_WRITE.test(svcBody("submitIdentityStep")),
    "The index only collides if BOTH rows carry one. Write it only at erasure and the\n" +
    "       second account sails through with a NULL fingerprint and nothing to collide with.");
  ok("11.10 …and the index name is pinned in code so a 23505 reads as `id_taken`, not a 500",
    /ID_FINGERPRINT_UNIQUE_INDEX\s*=\s*"KycSubmission_idFingerprint_active_key"/.test(svc)
      && svc.includes("msg.includes(ID_FINGERPRINT_UNIQUE_INDEX)"));
  ok("11.11 …and the migration and the code agree on that name",
    mig.includes("KycSubmission_idFingerprint_active_key"));

  /**
   * 🔴 THE ONE PLACE ERASURE CAN NEVER REACH: A KEY NAME (audit F-11b).
   *
   * `SystemConfig.key` is a PRIMARY KEY. Everything this session built works on rows and
   * columns — the retention pass prunes rows, `anonymizeClosedAccount` rewrites columns, the
   * DSAR export projects fields — and not one of them can rename a key. So a phone number
   * inside a key is personal data with no erasure path at all, and §8's sweep cannot see it
   * either (it walks the store, and `SystemConfig` is not on it).
   *
   * Measured on production 2026-08-21: **2** such rows, `bootstrap.login_promoted:+255…`.
   * (A third grep hit was a FALSE POSITIVE of my own — `chat.daily.usr_f5edd2a2255997a262…`
   * contains "255" inside a cuid, not a country code. Worth recording: the naive pattern for
   * this defect over-reports.)
   *
   * ⛔ The assertion is on the WRITE SITE, not on the data, because the data is what the write
   * site produces and only one of the two can be checked without a database.
   */
  /**
   * ⚠️ THE FIRST VERSION OF THIS CHECK FORBADE THE FIX. It asserted that no `*Config` call
   * anywhere near a `phoneE164` — and went red on the migration itself, which MUST name the
   * phone-derived key in order to read it and delete it. Forbidding the only path that removes
   * the PII is not a stricter guard, it is a wrong one.
   *
   * The property that matters is narrower and is about direction: a phone-derived key may be
   * READ and DELETED; it may never be WRITTEN again.
   */
  const auth = readFileSync("src/lib/server/auth-service.ts", "utf8");
  const authCode = stripTs(auth);
  ok("11.11b ⛔ nothing WRITES a phone-derived config key any more",
    !/saveConfig\(\s*legacyKey/.test(authCode)
      && !/saveConfig\(\s*`[^`]*phoneE164/.test(authCode),
    "A phone number in `SystemConfig.key` is PII with no erasure path — the value can be\n" +
    "       rewritten, the key cannot, and §8's sweep cannot even see it.");
  ok("11.11c …the one-shot promotion record is keyed on the USER ID",
    /bootstrap\.login_promoted:\$\{user\.id\}/.test(auth));
  ok("11.11d ⛔ …while STILL reading the legacy key, or the next login of a demoted admin " +
     "whose phone is still in ADMIN_BOOTSTRAP_PHONES re-promotes them",
    /legacyKey/.test(authCode) && /loadConfig<boolean>\(legacyKey\)/.test(authCode),
    "That record's whole purpose is that a leaked or mis-set env var cannot re-promote a\n" +
    "       demoted admin. A new key with no fallback makes the old record invisible and\n" +
    "       reopens exactly the hole it closes.");
  ok("11.11e …and DELETES it once carried over, so the phone number actually leaves",
    /deleteConfig\(legacyKey\)/.test(authCode),
    "Reading the legacy key without removing it migrates the lookup and leaves the PII.");
  ok("11.11f ⛔ …in that ORDER — save the new key BEFORE deleting the old one",
    authCode.indexOf("saveConfig(key, carried)") < authCode.indexOf("deleteConfig(legacyKey)"),
    "The other order can lose the record between the two calls and re-promote on next login.");
  ok("11.11g ⭐ CONTROL — `deleteConfig` exists at all; without it the third step is impossible",
    /export async function deleteConfig/.test(readFileSync("src/lib/server/config-store.ts", "utf8")));

  /**
   * 🔴 F-11c — `db.user.list()` no longer carries the avatars, and a row read that way reports
   * `avatarDataUrl: null`. That value is INDISTINGUISHABLE from "this player has no avatar", so
   * the moment any list caller renders it, one player's picture disappears and nothing fails.
   *
   * ⛔ This is the assertion that turns that into a build failure. It enumerates every reader of
   * the field in `src/` and requires the set to stay exactly the three that use `findById` or
   * write. Adding a fourth is fine — adding a fourth on a LIST path is the bug.
   */
  {
    const AVATAR_READERS_ALLOWED = [
      "src/app/profile/page.tsx",              // findById — the player's own profile
      "src/components/layout/app-shell.tsx",   // findById — the shell renders it
      "src/app/profile/actions.ts",            // the write path
      "src/lib/server/auth-service.ts",        // sets null on create
      "src/lib/server/store.ts",               // the type + in-memory store
      "src/lib/server/prisma-dal.ts",          // the mapper and this omit
      "src/lib/server/privacy.ts",             // deliberately NOT in the DSAR projection
      "src/lib/server/erasure.ts",             // nulls it
    ];
    const srcFiles: string[] = [];
    (function walk(d: string) {
      for (const e of readdirSync(d)) {
        const full = `${d}/${e}`;
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(e)) srcFiles.push(full);
      }
    })("src");
    // ⚠️ DECOMMENTED — the scan must read CODE, not prose. Until 2026-09-06 this matched the bare
    // token anywhere in the file, so a comment merely NAMING the field made its file an offender:
    // `sensitive.tsx` was flagged for a note explaining that `findById` returns the avatar and
    // `user.list()` omits it — a sentence that exists BECAUSE of this rule. A guard that a
    // correct explanation can fail teaches the next author to stop explaining.
    const hits = srcFiles.filter((f) => /\bavatarDataUrl\b/.test(decomment(readFileSync(f, "utf8"))));
    const offenders: string[] = [];
    for (const f of hits) {
      const rel = f.replace(/\\/g, "/");
      if (rel.includes("/dev-test/") || rel.includes("/auth/demo/")) continue; // seed fixtures
      if (AVATAR_READERS_ALLOWED.some((a) => rel.endsWith(a))) continue;
      offenders.push(rel);
    }
    ok("11.14 🔴 no NEW reader of `avatarDataUrl` — `db.user.list()` omits it and reports null",
      offenders.length === 0,
      `${offenders.slice(0, 4).join(", ")}\n` +
      "       ⛔ If one of these reads a user from `db.user.list()`, it will render 'no avatar'\n" +
      "       for a player who has one, and nothing will fail. Read through `findById`, or\n" +
      "       serve the image from a cacheable route.");
    ok("11.15 ⭐ CONTROL — the scan can see the field at all, so 11.14's empty result means " +
       "'no offenders' and not 'nothing was read'",
      srcFiles.length > 300 && hits.length >= 3, `${srcFiles.length} files, ${hits.length} hits`);
    ok("11.16 …and the DAL omits it rather than selecting around it",
      /omit:\s*\{\s*avatarDataUrl:\s*true\s*\}/.test(readFileSync("src/lib/server/prisma-dal.ts", "utf8")),
      "A `select` allowlist would silently drop the NEXT column somebody adds to User.");
  }

  const era = stripTs(readFileSync("src/lib/server/erasure.ts", "utf8"));
  ok("11.12 ⛔ erasure names no money table — it cannot reach one",
    !/db\.(txn|wallet)\.|positionStore|postLedgerEntries|LedgerEntry/.test(era),
    "Money is kept 7 years (POCA Cap 423 §16). The guarantee is structural, not a promise.");
  ok("11.13 CONTROL · …and the file really is the erasure module", era.includes("anonymizeClosedAccount"));

  /* ⭐ MASWALI-BUILD S6 · MB-67 · …AND NO MILLIONEA RECORD EITHER. The answers behind a bet are the betting record, kept 7
     years like the bet. S6 review R2-6 · erasure names exactly ONE Millionea member — the seen marks' eraser, a display flag
     — through exactly one import, and no week, question or ticket store, table or other Millionea module. Account closure
     legitimately reads the `MILLIONEA_SHARE` hold (a share under review blocks closure), so it is held to the stores and
     tables themselves. Each pattern is shown FINDING its target where it lives, so a silence is a measurement. */
  const MILLIONEA_WORD = /maswali|millionea/i;
  const MILLIONEA_STORES = /\b(ticketStore|weekStore|questionStore|noticeStore)\b|maswali-dal|\bmaswali(Ticket|Cycle|Question|NoticeSeen)\b/i;
  const RECORD_STORES = /\b(ticketStore|weekStore|questionStore)\b|\bmaswali(Ticket|Cycle|Question)\b/i;
  const millioneaImports = [...era.matchAll(/from\s+"([^"]*(?:maswali|millionea)[^"]*)"/gi)].map((m) => m[1]);
  ok("11.12b ⛔ erasure names ONE Millionea member — the seen marks' eraser, once, through one import of the DAL — and no week, question or ticket store, table or other Millionea module",
    (era.match(/\bnoticeStore\.eraseForUser\(userId\)/g) ?? []).length === 1 && (era.match(/\bnoticeStore\.\w+/g) ?? []).length === 1
      && JSON.stringify(millioneaImports) === JSON.stringify(["./maswali-dal"]) && /import \{ noticeStore \} from "\.\/maswali-dal"/.test(era) && !RECORD_STORES.test(era),
    JSON.stringify({ imports: millioneaImports, record: (era.match(RECORD_STORES) ?? [""])[0] }));
  const dalCode = stripTs(readFileSync("src/lib/server/maswali-dal.ts", "utf8"));
  ok("11.12c CONTROL · …and the patterns FIND them where they live, so 11.12b and 11.12d are measurements",
    MILLIONEA_WORD.test(dalCode) && MILLIONEA_STORES.test(dalCode) && RECORD_STORES.test(dalCode));
  const users = stripTs(readFileSync("src/lib/server/user-service.ts", "utf8"));
  const closeAt = users.indexOf("export async function closeAccount");
  const closure = closeAt < 0 ? "" : users.slice(closeAt, users.indexOf("\nexport ", closeAt + 10) < 0 ? undefined : users.indexOf("\nexport ", closeAt + 10));
  ok("11.12d ⛔ account closure names no Millionea store or table — a closed account's tickets stay to settle, as every bet does",
    closure.length > 400 && /MILLIONEA_SHARE/.test(closure) && !MILLIONEA_STORES.test(closure),
    `${closure.length} chars of closeAccount read`);

  /* ⭐ NO CASCADE CAN REACH THE BETTING RECORD — read from the SQL, the database's own law (MB-67: "cascade deletes could
     destroy the 7-year betting record"). Every foreign key a Millionea table declares is ON DELETE RESTRICT, none is ever
     dropped, and none anywhere points INTO a Millionea table with CASCADE, SET NULL or SET DEFAULT. So the market's own
     cascade to its positions — the 2026-08-28 teardown's shape — cannot start for a week's market, which its week holds by
     RESTRICT, and a ticket holds its position the same way. */
  const sqlAll = readdirSync("prisma/migrations")
    .filter((d) => statSync(`prisma/migrations/${d}`).isDirectory())
    .map((d) => { try { return stripSql(readFileSync(`prisma/migrations/${d}/migration.sql`, "utf8")); } catch { return ""; } })
    .join("\n");
  const fks = [...sqlAll.matchAll(/CONSTRAINT\s+"([^"]+)"\s+FOREIGN KEY\s*\([^)]*\)\s*REFERENCES\s+"([^"]+)"\s*\([^)]*\)(?:\s+ON DELETE\s+(RESTRICT|CASCADE|SET NULL|SET DEFAULT|NO ACTION))?/gi)]
    .map((m) => ({ name: m[1], target: m[2], onDelete: (m[3] ?? "NO ACTION").toUpperCase() }));
  /* ⭐ S6 review R2-14c · THE RELATIONS ARE READ FROM THE SCHEMA, MODEL BY MODEL — never picked out by a constraint's NAME,
     which a rename would move out from under a name filter while the cascade stayed. Every relation field a model owns
     (`@relation(fields: …)`), with its declared `onDelete`; Prisma's own default for a field with none is not RESTRICT for
     an optional relation, so a Millionea relation must say RESTRICT itself. The model's comments go through the one shared
     helper (`decomment`, which keeps every line where it was), never a private stripper (`test:decomment` 2.1). */
  const schemaRels = [...readFileSync("prisma/schema.prisma", "utf8").matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].flatMap((m) =>
    decomment(m[2]).split(/\r?\n/).map((line) => line.trim()).filter((l) => /@relation\(/.test(l) && /\bfields:\s*\[/.test(l)).map((l) => {
      const [field, type] = l.split(/\s+/);
      return { model: m[1], field, type: (type ?? "").replace(/[?[\]]/g, ""), onDelete: (l.match(/\bonDelete:\s*(\w+)/) ?? [])[1] ?? null };
    }));
  const ownRels = schemaRels.filter((r) => r.model.startsWith("Maswali"));
  const EXPECTED_RELS = ["MaswaliCycle.market", "MaswaliNoticeSeen.cycle", "MaswaliQuestion.cycle", "MaswaliTicket.cycle", "MaswaliTicket.position"];
  ok("11.20 ⛔ every relation a Millionea model owns says onDelete: Restrict, read from the schema model by model — the five that hold the record together are all there",
    EXPECTED_RELS.every((n) => ownRels.some((r) => `${r.model}.${r.field}` === n)) && ownRels.length >= EXPECTED_RELS.length && ownRels.every((r) => r.onDelete === "Restrict"),
    JSON.stringify(ownRels));
  const intoRels = schemaRels.filter((r) => r.type.startsWith("Maswali") && r.onDelete !== "Restrict");
  const into = fks.filter((f) => f.target.startsWith("Maswali") && ["CASCADE", "SET NULL", "SET DEFAULT"].includes(f.onDelete));
  ok("11.21 ⛔ …and no relation anywhere points INTO a Millionea model without onDelete: Restrict — in the schema — and no foreign key in the SQL with CASCADE, SET NULL or SET DEFAULT",
    intoRels.length === 0 && into.length === 0, JSON.stringify({ schema: intoRels, sql: into }));
  ok("11.22 ⛔ …and no migration DROPS one of them",
    !/DROP\s+CONSTRAINT\s+(IF\s+EXISTS\s+)?"Maswali[A-Za-z]*_[A-Za-z]+_fkey"/i.test(sqlAll));
  ok("11.23 CONTROL · the same readings FIND the cascade they guard against — a position still goes with its market, in the SQL and in the schema — so 11.20 and 11.21 read the real law",
    fks.some((f) => f.name === "Position_marketId_fkey" && f.onDelete === "CASCADE") && fks.length > 40
      && schemaRels.some((r) => r.model === "Position" && r.field === "market" && r.onDelete === "Cascade") && schemaRels.length > 40,
    `${fks.length} foreign keys and ${schemaRels.length} schema relations read`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("12 · ⭐ MARKETING — the consent withdrawn, the book emptied (U18b)");
// ═════════════════════════════════════════════════════════════════════════════
{
  /**
   * 🔴 THE DEFECT, FOUND AT S6 (§9 U16): erasure touched no marketing store. On Postgres the tombstoned
   * phone hid the player from the gate, which then read the LEDGER and found their sign-up GIVEN; and the
   * contact book (U18) is the first store with people who have no account — a row left with the erased
   * person's name and link is D16 itself. ⭐ Asserted as what the GATE answers, not only as rows — on a
   * memory store that now re-keys a changed number the way Postgres does (`store.ts` user.update).
   */
  ok("12.1 the first pass withdrew the one consent the subject had given — today's number had a GIVEN, the earlier one none",
    result.ok && result.counts.marketingConsentWithdrawn === 1, result.ok ? JSON.stringify(result.counts) : "-");
  ok("12.1b …and emptied both linked book rows",
    result.ok && result.counts.marketingContactsEmptied === 2);
  const stagedLeft = await db.contactImportRow.after({ importId: STAGED_RUN, afterOrdinal: 0, limit: 100 });
  ok("12.1c ⭐ U29b · the first pass DELETED the subject's two staged import rows — today's number and the earlier one — and kept the two strangers' rows in the same run",
    result.ok && result.counts.marketingStagedRowsDeleted === 2 && stagedLeft.map((r) => r.ordinal).join(",") === "2,4"
      && !stagedLeft.some((r) => r.msisdn === SUBJECT_KEY || r.msisdn === SUBJECT_OLD || r.displayName === NAME),
    result.ok ? `${result.counts.marketingStagedRowsDeleted} deleted · left ${stagedLeft.map((r) => r.ordinal).join(",")}` : "-");

  ok("12.2 CONTROL · the erased number no longer finds the account — the gate takes the LEDGER branch, as on Postgres",
    (await db.user.findByPhone(PHONE)) === null);
  const verdict = await mayReceiveMarketingSms(PHONE);
  ok("12.3 ⭐ THE GATE refuses the erased number as consent_withdrawn — before U18b the ledger's sign-up GIVEN answered",
    !verdict.ok && verdict.skipReason === "consent_withdrawn", JSON.stringify(verdict));
  ok("12.4 ⛔ NO stop-list row is written — an unliftable stop would refuse the number's NEXT owner for ever",
    !(await db.suppression.find(keyOf(SUBJECT_KEY))) && !(await db.suppression.find(keyOf(SUBJECT_OLD))));

  const rows = await db.messagingConsent.listFor(keyOf(SUBJECT_KEY));
  ok("12.5 the ledger's LAST word is the erasure: WITHDRAWN, source OPERATOR, the erasure's own wording",
    rows[0]?.status === "WITHDRAWN" && rows[0]?.source === "OPERATOR" && rows[0]?.wording === ERASURE_LEDGER_WORDING
      && rows[0]?.evidence === ERASURE_EVIDENCE, JSON.stringify(rows[0]));
  ok("12.5b APPEND-ONLY · the sign-up GIVEN is still there beneath it — history is added to, never edited",
    rows.length === 2 && rows[1]?.status === "GIVEN");
  ok("12.5c nothing is written for the earlier number, which never consented — there was nothing to withdraw",
    (await db.messagingConsent.listFor(keyOf(SUBJECT_OLD))).length === 0);

  for (const id of ["mc_erase_now", "mc_erase_old"]) {
    const c = await db.marketingContact.find(id);
    ok(`12.6 ${id} is EMPTIED, not deleted: link broken, name / e-mail / notes / tags / import reference cleared, marked 'erasure' for the importer`,
      !!c && c.userId === null && c.displayName === null && c.email === null && c.notes === null
        && c.tags.length === 0 && c.sourceRef === ERASURE_EVIDENCE && c.importId === null && c.rawInput === c.msisdn, JSON.stringify(c));
  }
  const now = await db.marketingContact.find("mc_erase_now");
  const old = await db.marketingContact.find("mc_erase_old");
  ok("12.6b the consent cache mirrors the LEDGER — WITHDRAWN where a consent was withdrawn, UNKNOWN where none was ever given — and no stop is invented",
    now?.consentState === "WITHDRAWN" && old?.consentState === "UNKNOWN" && now?.suppressedAt === null && old?.suppressedAt === null,
    `${now?.consentState} / ${old?.consentState}`);
  const by = await db.marketingContact.find("mc_erase_bystander");
  ok("12.7 CONTROL · somebody else's book row is untouched — the rule is 'this person', not 'the book'",
    by?.displayName === "Juma Bystander" && by?.consentState === "GIVEN" && by?.importId === "imp_erase_1");
  const onLists = {
    now: (await db.contactListMember.listMemberships("mc_erase_now")).length,
    old: (await db.contactListMember.listMemberships("mc_erase_old")).length,
    bystander: (await db.contactListMember.listMemberships("mc_erase_bystander")).length,
    lists: (await Promise.all(ERASE_LISTS.map((id) => db.contactList.find(id)))).filter((l) => l !== null).length,
  };
  ok("12.7b ⭐ C8b (B1) · every emptied row is taken OFF EVERY LIST — today's number off its two, the earlier one off its one (3 memberships counted) — while the bystander keeps its membership and both lists stand: a tombstone stays on no list, so a new client the number is revived for inherits none",
    result.ok && result.counts.marketingListMembershipsDeleted === 3 && onLists.now === 0 && onLists.old === 0
      && onLists.bystander === 1 && onLists.lists === 2,
    `${result.ok ? result.counts.marketingListMembershipsDeleted : "-"} deleted · ${JSON.stringify(onLists)}`);
  ok("12.8 ⛔ nothing written names the account",
    !JSON.stringify([...rows, ...await db.messagingConsent.listFor(keyOf(SUBJECT_OLD))]).includes(SUBJECT));

  const after = await marketingDsarView({ id: SUBJECT, phoneE164: erasedPhoneTombstone(SUBJECT), createdAt: iso(NOW - 200 * DAY) });
  ok("12.9 after erasure the export's marketing section is EMPTY — nothing reachable from the account any more",
    after.contacts.length === 0 && after.consent.length === 0 && after.suppression.length === 0, JSON.stringify(after));
  ok("12.9e ⛔ U29b · …and no staged import row reaches the export either",
    after.staged.length === 0, JSON.stringify(after.staged));

  // ⛔ A TOMBSTONE IS NEVER A KEY. `erased:usr_712345678bcd` keeps its digits through a naive normaliser,
  // and those digits make a valid-shaped Tanzanian number. A stranger lives at it here.
  const tomb = "erased:usr_712345678bcd";
  const naive = toMsisdn255(tomb);
  const planted = await db.marketingContact.create(contactRow("mc_erase_stranger", naive, null, "Stranger Mtu"));
  const strangerView = await marketingDsarView({ id: "usr_712345678bcd", phoneE164: tomb, createdAt: iso(NOW - 900 * DAY) });
  ok("12.9b ⛔ an erased account's tombstone is never read as a number — a stranger's row at the digits it carries stays out of the file",
    planted !== null && /^255[67]/.test(naive) && naive.length === 12 && strangerView.contacts.length === 0 && marketingKeyOf(tomb) === null,
    `naive=${naive} contacts=${strangerView.contacts.length}`);

  // ⭐ THE RECYCLED NUMBER. The operator hands the erased subject's number to somebody new, who signs up
  // and says yes. Their yes must count, and their own file must not carry the last holder's history.
  const NEXT = "usr_erase_next_owner";
  const nextCreated = new Date(Date.now() + 5).toISOString();
  await db.user.create({
    id: NEXT, phoneE164: PHONE, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null,
    dob: "1992-03-03", region: null, acceptedTermsVersion: "v3", acceptedTermsAt: nextCreated,
    marketingOptIn: true, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nextCreated, updatedAt: nextCreated, lastLoginAt: null, closedAt: null,
  } as never);
  await new Promise((r) => setTimeout(r, 10));
  await db.messagingConsent.create({
    ...ledgerStamp(), ...keyOf(SUBJECT_KEY), status: "GIVEN", source: "REGISTRATION",
    wording: "Nitumie ofa na habari za 50pick kwa SMS (hiari).", locale: "SW", evidence: "register", recordedBy: null,
  });
  const nextVerdict = await mayReceiveMarketingSms(PHONE);
  ok("12.9c ⭐ the number's NEXT owner can consent: their yes is not refused as withdrawn or suppressed",
    nextVerdict.ok || (nextVerdict.skipReason !== "consent_withdrawn" && nextVerdict.skipReason !== "suppressed"),
    JSON.stringify(nextVerdict));
  const nextView = await marketingDsarView({ id: NEXT, phoneE164: PHONE, createdAt: nextCreated });
  ok("12.9d ⛔ …and their own file carries only their OWN consent — not the last holder's sign-up, nor the erasure row",
    nextView.consent.length === 1 && nextView.consent[0].status === "GIVEN" && nextView.contacts.length === 0
      && !JSON.stringify(nextView).includes("Erasure"), JSON.stringify(nextView.consent));

  // ── a second person: found by NUMBER only, a lifted stop of their own, and a named officer ──────
  const M2 = "usr_erase_m2", M2_PHONE = "+255712000418", M2_KEY = "255712000418", DPO = "usr_dpo_officer";
  await db.user.create({
    id: M2, phoneE164: M2_PHONE, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "CLOSED", locale: "SW", displayName: "Neema",
    dob: "1991-02-02", region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW - 90 * DAY),
    marketingOptIn: true, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: iso(NOW - 90 * DAY), updatedAt: iso(NOW - 10 * DAY), lastLoginAt: null, closedAt: iso(NOW - 10 * DAY),
  } as never);
  // A PREVIOUS holder's consent, written before Neema's account existed — never hers to receive.
  await db.messagingConsent.create({
    id: "mc_prev_holder", ...keyOf(M2_KEY), status: "GIVEN", source: "REGISTRATION",
    wording: "previous holder", locale: "SW", evidence: "prev", recordedBy: null, createdAt: iso(NOW - 400 * DAY),
  });
  await db.messagingConsent.create({
    ...ledgerStamp(), ...keyOf(M2_KEY), status: "GIVEN", source: "OPT_OUT_PAGE",
    wording: "resume", locale: "SW", evidence: "optout:ref", recordedBy: null,
  });
  await db.suppression.create({
    id: "sup_m2", ...keyOf(M2_KEY), reason: "WITHDRAWN", evidence: "optout:ref", recordedBy: null,
    createdAt: iso(NOW - 40 * DAY), liftedAt: null, liftedReason: null,
  });
  await db.suppression.lift(keyOf(M2_KEY), "optout:ref", iso(NOW - 30 * DAY));
  // Unlinked: the row carries only her number (created after her account, so it is hers to receive).
  await db.marketingContact.create(contactRow("mc_erase_m2", M2_KEY, null, "Neema"));

  // U29b · Neema's number is on a staged import row too, with a staff note: the export carries the row, never the note.
  await db.contactImport.stageRows({
    importId: STAGED_RUN, from: 5, completes: false, at: iso(NOW - 1 * DAY), rows: [stagedRow(5, 6, M2_KEY, "Neema", null)],
  });
  type MarketingSection = Awaited<ReturnType<typeof marketingDsarView>>;
  const bundle = await buildDsarBundle(M2) as { marketing: MarketingSection } | null;
  const own = await exportUserData(M2) as { marketing: unknown };
  const bundleJson = JSON.stringify(bundle?.marketing ?? null);
  ok("12.10 ⭐ BEFORE erasure, the officer's bundle carries her marketing: the unlinked book row (found by number), her ledger, her lifted stop",
    bundle?.marketing.contacts.length === 1 && bundle.marketing.contacts[0].displayName === "Neema"
      && bundle.marketing.consent.length === 1 && bundle.marketing.suppression.length === 1
      && bundle.marketing.suppression[0].liftedAt !== null, bundleJson);
  ok("12.10b …and the player's own download carries the SAME section — one allowlist, both doors",
    JSON.stringify(own.marketing) === bundleJson);
  ok("12.10c ⛔ the export is an allowlist: no staff id, no internal evidence, no row id, no staff notes",
    !bundleJson.includes('"recordedBy"') && !bundleJson.includes('"evidence"') && !bundleJson.includes('"id"')
      && !bundleJson.includes('"notes"') && !bundleJson.includes("optout:ref") && !bundleJson.includes("at the stadium"), bundleJson);
  ok("12.10d ⛔ a ledger row OLDER than her account — a previous holder's — is not in her file",
    !bundleJson.includes("previous holder"), bundleJson);
  ok("12.10g ⭐ U29b · …and her staged import row is in the file — her name, never the staff note (12.10c holds the note out of the whole section)",
    bundle?.marketing.staged.length === 1 && bundle.marketing.staged[0].displayName === "Neema" && bundle.marketing.staged[0].msisdn === M2_KEY
      && !("notes" in bundle.marketing.staged[0]), JSON.stringify(bundle?.marketing.staged));

  // ⭐ A STOP OLDER THAN THE ACCOUNT: hidden while lifted (a previous holder's), SHOWN once it refuses this
  // person — a re-armed suppression keeps its first createdAt, so the date is withheld ("before this account").
  const M4 = "usr_erase_m4", M4_KEY = "255712000420", M4_CREATED = iso(NOW - 30 * DAY);
  await db.suppression.create({
    id: "sup_m4_prev", ...keyOf(M4_KEY), reason: "WITHDRAWN", evidence: "optout:prev", recordedBy: null,
    createdAt: iso(NOW - 400 * DAY), liftedAt: null, liftedReason: null,
  });
  await db.suppression.lift(keyOf(M4_KEY), "optout:prev", iso(NOW - 390 * DAY));
  const m4User = { id: M4, phoneE164: "+255712000420", createdAt: M4_CREATED };
  const liftedView = await marketingDsarView(m4User);
  // The new holder stops by their own link: the SAME row is re-armed, its createdAt untouched.
  await db.suppression.create({
    id: "sup_m4_new", ...keyOf(M4_KEY), reason: "WITHDRAWN", evidence: "optout:new", recordedBy: null,
    createdAt: iso(NOW - 1 * DAY), liftedAt: null, liftedReason: null,
  });
  const armedView = await marketingDsarView(m4User);
  ok("12.10e ⛔ a previous holder's LIFTED stop, older than the account, is not in the file",
    liftedView.suppression.length === 0, JSON.stringify(liftedView.suppression));
  ok("12.10f ⭐ …but once it refuses THIS person it is listed — undated, so the previous holder's date stays private",
    armedView.suppression.length === 1 && armedView.suppression[0].createdAt === null && armedView.suppression[0].liftedAt === null,
    JSON.stringify(armedView.suppression));

  const r2 = await anonymizeClosedAccount(M2, { now: NOW, officerId: DPO });
  const stops = await db.suppression.listFor(M2_KEY);
  ok("12.11 her own LIFTED stop is left exactly as it was — erasure neither writes nor re-arms a stop",
    r2.ok && stops.length === 1 && stops[0].reason === "WITHDRAWN" && stops[0].liftedAt !== null, JSON.stringify(stops));
  const last2 = await db.messagingConsent.latestFor(keyOf(M2_KEY));
  ok("12.12 her ledger's last word is the erasure, recorded by the DPO",
    r2.ok && r2.counts.marketingConsentWithdrawn === 1 && last2?.status === "WITHDRAWN" && last2?.recordedBy === DPO);
  const m2c = await db.marketingContact.find("mc_erase_m2");
  ok("12.13 ⭐ the book row with NO link is reached through the number and emptied, by the DPO",
    r2.ok && r2.counts.marketingContactsEmptied === 1 && m2c?.displayName === null && m2c?.notes === null
      && m2c?.tags.length === 0 && m2c?.updatedBy === DPO, JSON.stringify(m2c));
  ok("12.13b ⭐ U29b · …and her staged import row is DELETED by her number, the strangers' rows still standing",
    r2.ok && r2.counts.marketingStagedRowsDeleted === 1
      && (await db.contactImportRow.after({ importId: STAGED_RUN, afterOrdinal: 0, limit: 100 })).map((r) => r.ordinal).join(",") === "2,4");
  ok("12.14 the DSAR door hands the officer to the routine — privacy.ts passes the fulfilling officer",
    readFileSync("src/lib/server/privacy.ts", "utf8").includes("anonymizeClosedAccount(r.userId, { officerId: opts.officerId })"));

  // ── IDEMPOTENT, EXECUTED — and another live account's number is not withdrawn ──────────────────
  // ⚠️ 9.3's marketing zeros pass by construction (a re-run never reaches this step: the phone is already a
  // tombstone), so the property is proven HERE, by calling the step twice on a live, unerased account.
  const M3 = "usr_erase_m3", M3_PHONE = "+255712000419", M3_KEY = "255712000419", OWNER2 = "usr_erase_owner2";
  const M3_OLD = "255754000419";
  await db.user.create({
    id: M3, phoneE164: M3_PHONE, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "CLOSED", locale: "SW", displayName: "Baraka",
    dob: "1990-04-04", region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW - 80 * DAY),
    marketingOptIn: true, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: iso(NOW - 80 * DAY), updatedAt: iso(NOW - 5 * DAY), lastLoginAt: null, closedAt: iso(NOW - 5 * DAY),
  } as never);
  // The number Baraka used to have now belongs to a LIVE player, who has said yes.
  await db.user.create({
    id: OWNER2, phoneE164: `+${M3_OLD}`, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: "Owner Two",
    dob: "1993-05-05", region: null, acceptedTermsVersion: "v3", acceptedTermsAt: iso(NOW - 20 * DAY),
    marketingOptIn: true, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: iso(NOW - 20 * DAY), updatedAt: iso(NOW - 20 * DAY), lastLoginAt: null, closedAt: null,
  } as never);
  for (const id of [M3_KEY, M3_OLD]) {
    await db.messagingConsent.create({
      ...ledgerStamp(), ...keyOf(id), status: "GIVEN", source: "REGISTRATION",
      wording: "Nitumie ofa na habari za 50pick kwa SMS (hiari).", locale: "SW", evidence: "register", recordedBy: null,
    });
  }
  await db.marketingContact.create(contactRow("mc_erase_m3", M3_KEY, M3, "Baraka"));
  await db.marketingContact.create(contactRow("mc_erase_m3_old", M3_OLD, M3, "Baraka"));
  await db.contactListMember.add({ listId: ERASE_LISTS[1], contactId: "mc_erase_m3", addedAt: iso(NOW - 30 * DAY), addedBy: "usr_officer" });
  const m3View = await marketingDsarView({ id: M3, phoneE164: M3_PHONE, createdAt: iso(NOW - 80 * DAY) });
  ok("12.16b ⛔ the export does not hand Baraka the consent record of the LIVE account that now holds his old number",
    m3View.consent.length === 1 && m3View.contacts.length === 2, JSON.stringify(m3View.consent));
  const first = await eraseMarketingFor({ userId: M3, phoneE164: M3_PHONE, officerId: DPO });
  const again = await eraseMarketingFor({ userId: M3, phoneE164: M3_PHONE, officerId: DPO });
  ok("12.15 ⭐ IDEMPOTENT, EXECUTED · the step called a second time on the same account does nothing and says so — (C8b) its one list membership deleted once, then none",
    first.marketingConsentWithdrawn === 1 && first.marketingContactsEmptied === 2 && first.marketingListMembershipsDeleted === 1
      && again.marketingConsentWithdrawn === 0 && again.marketingContactsEmptied === 0 && again.marketingListMembershipsDeleted === 0
      && (await db.contactListMember.listMemberships("mc_erase_m3")).length === 0,
    `${JSON.stringify(first)} then ${JSON.stringify(again)}`);
  ok("12.16 ⛔ a number another LIVE account now holds keeps that account's consent — only the erased person's row about it is emptied",
    (await db.messagingConsent.latestFor(keyOf(M3_OLD)))?.status === "GIVEN"
      && (await db.marketingContact.find("mc_erase_m3_old"))?.displayName === null);
}

LOG("");
LOG("─".repeat(64));
LOG(`  Erasure destroys what no statute protects, and nothing else.`);
LOG(`  §7b is the one that matters: a document that was erased is still spent.`);
LOG("─".repeat(64));
console.log(`\n${fails.length === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fails.length} failed`);
for (const f of fails) LOG(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
