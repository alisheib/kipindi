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
 * 🔴 §5 MEASURES THAT SENTENCE AND IT IS NOT TRUE ON ITS OWN. A unique index compares
 * STORED STRINGS: after erasure the row holds a hash, the next applicant writes the RAW
 * number, and nothing collides. `red:erasure` case 1 puts exactly that implementation back
 * — hash into `idNumber`, no fingerprint — and §5 reports a SECOND ACCOUNT on one national
 * ID. The fix is that the collision happens on `KycSubmission.idFingerprint`, a value BOTH
 * rows carry.
 *
 * ⛔ AND §5 IS DRIVEN THROUGH THE REAL SERVICE, NEVER THROUGH THE DAL. A test that asserts
 * "the fingerprints are equal" proves an HMAC is deterministic. The question is whether a
 * PERSON can open a second account, so §5 calls `submitIdentityStep` — the same function
 * `/profile/kyc` calls — and reads the refusal the player would get.
 *
 * ⭐ §8 IS A SWEEP, NOT A CHECKLIST. Every other section names the fields it expects to be
 * cleared, which is only ever as complete as the person who wrote the list. §8 walks the
 * WHOLE store looking for the erased phone number, name, email and national ID, and fails
 * on anything holding one that is not on a written allowlist with a statute beside it. It
 * found two surfaces the hand-written brief missed — the referrer's notification body and
 * `KycSubmission.extraRequests` — which is the entire argument for writing it that way.
 *
 * Proved red by `npm run red:erasure`.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.OTP_PEPPER ??= "test-only-pepper";

import { readFileSync } from "node:fs";
import { db } from "../src/lib/server/store.ts";
import {
  anonymizeClosedAccount, erasedPhoneTombstone, isErasedPhone,
  ERASED_AUTHOR_NAME, ERASED_COMMENT_BODY, ERASED_REQUEST_DESCRIPTION, KYC_DOCUMENT_HOLD_YEARS,
} from "../src/lib/server/erasure.ts";
import { addComment, listComments } from "../src/lib/server/comments-store.ts";
import { submitIdentityStep, startKyc } from "../src/lib/server/kyc-service.ts";
import { identityFingerprint } from "../src/lib/server/crypto.ts";
import { maskName } from "../src/lib/server/affiliate-service.ts";
import { verifyChain, getAuditPage } from "../src/lib/server/audit.ts";
import { computeTrialBalance } from "../src/lib/server/ledger.ts";
import { positionStore } from "../src/lib/server/market-dal.ts";
import { notifyReferralJoined } from "../src/lib/server/notification-service.ts";

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
for (const [id, status, createdAt, docs, extraKey] of [
  ["kyc_erase_old", "REJECTED", iso(NOW - 190 * DAY), [INLINE_DOC, INLINE_DOC], INLINE_DOC],
  ["kyc_erase_new", "APPROVED", iso(NOW - 180 * DAY), ["r2:kyc/front.jpg", INLINE_DOC], "r2:kyc/extra.jpg"],
] as const) {
  await db.kyc.upsert({
    id, userId: SUBJECT, status, rejectReason: null, rejectNote: null,
    idType: "NIDA", idNumber: NIDA, idExpiry: null, idVerifiedAt: createdAt,
    idFingerprint: identityFingerprint("NIDA", NIDA),
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
  const thread0 = await listComments("mkt_erase", MOD);
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
section("5 · 🔴 THE ASSERTION THE WHOLE ITEM EXISTS FOR — the document still collides");
// ═════════════════════════════════════════════════════════════════════════════
{
  const subs = await db.kyc.listByUser(SUBJECT);
  ok("5.1 EVERY submission was reached, not just the newest",
    subs.length === 2 && subs.every((k) => k.idNumber !== NIDA),
    subs.map((k) => `${k.id}:${String(k.idNumber).slice(0, 8)}`).join(" "));
  ok("5.2 the national ID is unreadable and is NOT null (owner decision, item 3)",
    subs.every((k) => !!k.idNumber && k.idNumber === identityFingerprint("NIDA", NIDA)),
    subs.map((k) => String(k.idNumber)).join(" "));
  ok("5.3 the full name is pseudonymised, and the date of birth is gone",
    subs.every((k) => !!k.fullName && !k.fullName.includes("Asha") && k.dob === null),
    subs.map((k) => `${k.fullName}/${k.dob}`).join(" "));
  ok("5.4 the fingerprint survived the erasure intact",
    subs.every((k) => k.idFingerprint === identityFingerprint("NIDA", NIDA)));

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
  ok("5.5 🔴🔴 THE SAME NATIONAL ID IS STILL REFUSED AFTER ERASURE — one document, one account",
    retry.ok === false && (retry as { reason?: string }).reason === "id_taken",
    "⛔ If this is green-through, erasure has repealed a P0 AML control. Hashing the\n" +
    "       number IN PLACE is not enough: the index compares stored strings, so the\n" +
    "       erased row's hash never meets this applicant's raw number. The collision has\n" +
    "       to live on `idFingerprint`, which BOTH rows carry.\n" +
    `       got: ${JSON.stringify(retry)}`);
  const impostorKyc = await db.kyc.findByUserId(IMPOSTOR);
  ok("5.6 …and no identity was written for the second account",
    !impostorKyc?.idNumber, String(impostorKyc?.idNumber));

  // ⭐ THE POSITIVE CONTROL. A refusal is also what a service that refuses EVERYTHING
  // gives you, and §5.5 cannot tell the two apart on its own.
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
  ok("5.7 ⭐ CONTROL — a DIFFERENT national ID is still ACCEPTED, so 5.5 is a real refusal " +
     "and not a service that refuses everything",
    fresh.ok === true, JSON.stringify(fresh));
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the frozen fragments — comments, and somebody else's notification");
// ═════════════════════════════════════════════════════════════════════════════
{
  // ⛔ READ AS A MODERATOR. Erasure soft-deletes the comment, and `listComments` filters
  // `deleted` rows out for every other viewer — so a player-eye read returns an empty list
  // and every "no fragment survives" assertion below would pass on nothing at all.
  const thread = await listComments("mkt_erase", MOD);
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

  // Now move past the hold and finish the job — the SAME function, run again.
  const late = await anonymizeClosedAccount(SUBJECT, { now: Date.parse("2033-08-01T00:00:00.000Z") });
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
  ];
  // Statutory holders, each with the reason it may keep the value.
  const ALLOWED: Record<string, string> = {
    // Transaction.msisdn is the payment instrument on a confirmed deposit — POCA Cap 423
    // §16 requires the transaction record for 7 years and the counterparty is part of it.
    "txns": "Transaction.msisdn — the payment instrument on a money record (POCA Cap 423 §16, 7y)",
  };
  const buckets: Record<string, unknown> = {
    users: await db.user.list(),
    kyc: await db.kyc.listByUser(SUBJECT),
    txns: await db.txn.listAll(),
    wallets: await db.wallet.listAll(),
    notificationsSubject: await db.notification.findByUser(SUBJECT, 100),
    notificationsReferrer: await db.notification.findByUser(REFERRER, 100),
    comments: await listComments("mkt_erase", MOD),
    sourceOfFunds: await db.sourceOfFunds.get(SUBJECT),
    positions: await positionStore.values(),
    pushSubs: await db.pushSub.listForUser(SUBJECT),
    audit: getAuditPage({ limit: 10_000 }),
  };
  ok("8.0 CONTROL · the sweep really read something", Object.keys(buckets).length >= 10);
  // ⛔ "0 rows returned" and "the query is broken" look identical, so the buckets that must
  // still HAVE content are named and required to. The two that erasure empties by design
  // are excluded here and asserted empty in §6.9 / §7.2 instead — excluding them silently
  // is how a sweep comes to pass over an unread store.
  const MUST_HAVE_CONTENT = ["users", "kyc", "txns", "wallets", "notificationsReferrer",
    "comments", "sourceOfFunds", "positions", "audit"] as const;
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
      && second.counts.notificationsDeleted === 0 && second.counts.otps === 0,
    second.ok ? JSON.stringify(second.counts) : "-");
  ok("9.4 the user row is unchanged by the re-run",
    JSON.stringify(await db.user.findById(SUBJECT)) === snapshot);
  ok("9.5 the tombstone is recognised as one", isErasedPhone(erasedPhoneTombstone(SUBJECT))
    && !isErasedPhone(PHONE));
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
   * ⛔ §5 PROVES THE SEQUENTIAL REFUSAL AND CANNOT PROVE THE RACE. There is no Postgres
   * here, so the partial unique index does not exist and the in-memory store enforces
   * nothing — §5.5 is carried entirely by the service's fast-path read. That read is the
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
  ok("11.9 🔴 the identity step WRITES a fingerprint on every submission",
    /idFingerprint:\s*fingerprint/.test(svc),
    "The index only collides if BOTH rows carry one. Write it only at erasure and the\n" +
    "       second account sails through with a NULL fingerprint and nothing to collide with.");
  ok("11.10 …and the index name is pinned in code so a 23505 reads as `id_taken`, not a 500",
    /ID_FINGERPRINT_UNIQUE_INDEX\s*=\s*"KycSubmission_idFingerprint_active_key"/.test(svc)
      && svc.includes("msg.includes(ID_FINGERPRINT_UNIQUE_INDEX)"));
  ok("11.11 …and the migration and the code agree on that name",
    mig.includes("KycSubmission_idFingerprint_active_key"));

  const era = stripTs(readFileSync("src/lib/server/erasure.ts", "utf8"));
  ok("11.12 ⛔ erasure names no money table — it cannot reach one",
    !/db\.(txn|wallet)\.|positionStore|postLedgerEntries|LedgerEntry/.test(era),
    "Money is kept 7 years (POCA Cap 423 §16). The guarantee is structural, not a promise.");
  ok("11.13 CONTROL · …and the file really is the erasure module", era.includes("anonymizeClosedAccount"));
}

LOG("");
LOG("─".repeat(64));
LOG(`  Erasure destroys what no statute protects, and nothing else.`);
LOG(`  §5 is the one that matters: a document that was erased is still spent.`);
LOG("─".repeat(64));
console.log(`\n${fails.length === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fails.length} failed`);
for (const f of fails) LOG(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
