/**
 * /auth/demo — dev-only session bootstrap for E2E test scripts.
 *
 * Creates (or reuses) a fixed demo player, funds the wallet to a
 * predictable 100,000 TZS, issues a session cookie, then redirects to
 * "/". Lets the existing 22 stress / a11y / multi-viewport / smoke
 * scripts under scripts/* drive an authed flow without doing the full
 * register → deposit dance every time (identity is asked before withdrawal
 * only since 2026-09-13 — see `kycState` below — and a confirmed email too, since 2026-10-07).
 *
 * Returns 404 in production — the route does not exist on a live
 * deployment. Per memory: an earlier "Enter demo" button on the
 * landing page was removed; this endpoint is restored ONLY for the
 * test harness, not as a user-visible feature.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet, StoredTxn, StoredKyc } from "@/lib/server/store";
import { createSession } from "@/lib/server/session";
import { randomId, identityFingerprint } from "@/lib/server/crypto";
import { attachDocument, submitForReview, kycAttachRateKey } from "@/lib/server/kyc-service";
import { rateRefundAsync } from "@/lib/server/rate-limit";
import { KYC_MAKER_CHECKER_THRESHOLD } from "@/lib/server/kyc-risk";
import { addWalletFreeze, removeWalletFreeze } from "@/lib/server/wallet-freeze";
import { ID_DOC_SPECS, validateIdNumber, type IdDocType } from "@/lib/id-documents";
import { decideKyc } from "@/lib/kyc-auto-checks";

const DEMO_PHONE = "+255700000000";
const DEMO_DISPLAY = "Demo Player";
const DEMO_EMAIL = "demo.player@50pick.test";
const DEMO_STARTING_BALANCE = 100_000;
/**
 * The demo account's date of birth — written on every visit, like the balance and the email state (`ensureDemoUser`).
 * ⭐ Since 2026-10-10 the identity step takes the ACCOUNT's date (`User.dob`), so an officer's "Correct date of birth"
 * left behind by another drive would otherwise change what the next fixture is verified against.
 */
const DEMO_DOB = "1990-01-01";

/**
 * `emailState` decides which side of the WITHDRAWAL EMAIL STEP the demo session
 * lands on (since 2026-10-07 — it was the deposit's gate until the owner moved it),
 * so the harness can screenshot every state without hand-editing the DB:
 *   "verified" (default) — confirmed address → the withdraw form renders
 *   "unverified"         — address on file, not confirmed → the withdraw email card
 *   "none"               — no address at all → the card's "add an email" variant
 * The deposit form renders in all three: a deposit asks no email.
 * Reached as /auth/demo?email=unverified. Dev-only route (404 in production).
 */
type EmailState = "verified" | "unverified" | "none";

/**
 * 🔴 `kycState` — AND THE DEFAULT IS THE BUG FIX.
 *
 * Until 2026-09-05 this route minted a session stamped `kycStatus: "APPROVED"` and created
 * NO `KycSubmission` row at all. Nothing read the cookie for authorization, so the lie was
 * invisible. The moment identity became a money gate — reading the DATABASE, correctly —
 * the demo player resolved to NOT_STARTED and was refused every deposit and every bet.
 *
 * ⛔ THAT WOULD HAVE BROKEN `qa:live` SECTION [F] — the authed sweep over /positions,
 * /wallet, /profile/invite and THE BET-DIAL CONTRACT ON /markets — which sits at the end
 * of the `predeploy` chain. So the fixture writes a real APPROVED row, and the session
 * stamp is no longer the only thing claiming approval.
 *
 * ⚠️ 2026-09-13 · THE DEFAULT STAYS `approved`, FOR A DIFFERENT REASON. Depositing and betting ask no
 * identity question any more (`kyc-gate.ts` — identity is required before withdrawal only), so a
 * `none` demo player could deposit and stake. What still reads the row: the WITHDRAWAL gate
 * (`/wallet/withdraw` renders `KycGatePanel` instead of the form for an account never approved), the
 * one small first-deposit notice on /wallet (with `&deposit=1` — the app-wide identity bar that used
 * to be named here was DELETED later on 2026-09-13, by the owner's quiet rule), and the officer
 * surfaces that show a player's identity standing. So `approved` is still the state that shows the
 * ordinary signed-in product; the other states exist to drive those surfaces on purpose.
 *
 * ⭐ AND IT TAKES THE OTHER STATES, exactly as `?email=` already does, so the harness can drive
 * every gate panel — and every officer screen — without hand-editing the database:
 *   /auth/demo?kyc=none | auto | auto_expired | uploaded | photo_pending | pending | more_info | rejected | refused_final | approved (default)
 * `&deposit=1` adds ONE confirmed deposit row and
 * `&deposit=0` leaves exactly ONE FAILED attempt (created or flipped) AND empties the wallet (TZS 0, since 2026-09-14) — that row is what the first-deposit
 * identity notice on /wallet asks about.
 *
 * ⭐ 2026-10-10 · TYPED-ONLY KYC (owner ruling, Ali — docs/COMPLIANCE-DECISIONS.md, "Players verify identity with typed
 * details"). A player now types their document's details and is approved AT ONCE when the automatic checks pass;
 * officers act afterwards. An AGENT applicant still verifies with the document's photos and a selfie, reviewed by an
 * officer. So every state is the shape `kyc-service.ts` writes for it, and `demoKycRow` names EVERY column — the
 * DAL writes an omitted field as null, and a fixture that half-describes a row exercises a row nobody produces:
 *   · approved      — an OFFICER's approval: `reviewerId` "system", `photoVerifiedAt` = `approvedAt`. That is what the
 *                     2026-10-10 backfill gives every approval made before that day, and what the agent programme's
 *                     identity gate asks (`photoIdentityVerified`) — so the agent drives that sign in here still pass it.
 *   · auto          — an AUTOMATIC approval from typed details that no officer has checked yet (the post-check list):
 *                     `reviewerId` null, `autoApprovedAt` set, `postCheckedAt` null, and the flags the REAL checks raise
 *                     for the document (`decideKyc` — see `demoAutoIdentity`). Withdrawals open; the agent gate does not.
 *   · uploaded      — the AGENT photo track: the document's photos and the selfie attached through the real
 *                     `attachDocument`, never sent. (It attached ONE photo until 2026-10-10.)
 *   · photo_pending — the same photo case SENT through the real `submitForReview`: PENDING_REVIEW with the full photo
 *                     set, so the officer's workstation opens it in photo mode. ⚠️ Every visit SENDS it for real — the
 *                     player's notice, every officer's bell and the admin email go out as an agent's send makes them.
 *   · pending       — TYPED details with an officer: routed because an officer has already ruled on this identity
 *                     (`reviewerId` on the row — the provenance route), so the workstation's live checks say why it waits.
 *   · more_info     — an officer asked the player to CORRECT their typed details: a note, no extra documents.
 *   · rejected      — an officer's RECOVERABLE refusal (DETAILS_MISMATCH) with the officer on the row, so "Try again"
 *                     goes back to an officer — never straight to an automatic approval.
 *   · refused_final — UNDERAGE, the wallet frozen `IDENTITY_REFUSED` exactly as a final refusal leaves it.
 * ⛔ `none` writes NO ROW, because that is what a real new account looks like; a row that
 * merely SAYS NOT_STARTED would exercise a state the product never produces at sign-up.
 */
type KycState = "approved" | "none" | "auto" | "auto_expired" | "uploaded" | "photo_pending" | "pending" | "more_info" | "rejected" | "refused_final";
const KYC_STATES: readonly KycState[] = ["approved", "none", "auto", "auto_expired", "uploaded", "photo_pending", "pending", "more_info", "rejected", "refused_final"];

/** The status each state ENDS in — what the session cookie mirrors. (`photo_pending` is written IN_PROGRESS and sent.) */
const KYC_STATUS: Record<Exclude<KycState, "none">, StoredKyc["status"]> = {
  approved: "APPROVED",
  auto: "APPROVED",
  auto_expired: "APPROVED",
  uploaded: "IN_PROGRESS",
  photo_pending: "PENDING_REVIEW",
  pending: "PENDING_REVIEW",
  more_info: "ADDITIONAL_INFO_REQUIRED",
  rejected: "REJECTED",
  refused_final: "REJECTED",
};

/** A 1×1 PNG that passes `validateDocImage` — the fixture `seed-kyc-stages-local.mts` attaches too. */
const DEMO_DOC_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * The demo player's National ID. Digits 1-8 are `DEMO_DOB`, so the automatic checks raise no NIDA_DOB_MISMATCH flag.
 * 🔴 IT ENDS IN NEITHER `0000` NOR `9999`. The dev NIDA mock (`nida.ts`) answers SANCTIONED — a FINAL refusal, the
 * wallet frozen — for a number ending `0000`, and MISMATCH for one ending `9999`. This number ended `…0000` until
 * 2026-10-10: harmless while the route only WROTE it, a fabricated sanctions refusal the first time the typed track
 * re-posted it (a corrected name on `more_info`, the same details again after `rejected`).
 */
const DEMO_NIDA = "19900101700000000017";

/**
 * The `auto` state's document: a VOTER'S CARD, because a typed approval of one carries a real flag (no published number
 * format). The `DEMO` prefix makes it unmistakable on any screenshot, and never a number a tester would type.
 */
const DEMO_VOTER_CARD = "DEMO-VOTER-0001";
/** `auto_expired`'s passport — the usual Tanzanian shape (two letters, seven digits), so it raises no shape flag. */
const DEMO_PASSPORT = "TZ1234567";

/**
 * The officer an officer-decided state names: "system", the stand-in `dev-test/seed-admin` has always written.
 * ⛔ NOT A USER ROW — minting one would put a COMPLIANCE account into every officer bell and email list a harness reads.
 * What it carries is OFFICER PROVENANCE: any reviewer on the row sends this identity's next typed send to an officer
 * (`hasOfficerProvenance` in `kyc-service.ts`), exactly as a real officer's ruling does.
 */
const DEMO_OFFICER = "system";

/**
 * The `auto` state's identity, with its flags ASKED OF THE REAL CHECKS (`decideKyc`), never written by hand — so the
 * fixture cannot carry a flag the checks would not raise for these details. The account-side facts (risk, holds, source
 * of funds, AML, same person) are neutral here: they belong to the account, and a drive sets them there.
 * ⛔ THROWS when the checks no longer approve this document with a flag. A fixture fails loudly; it never quietly draws an
 * automatic approval the product would have routed or refused.
 */
function demoAutoIdentity(now: string): { idType: IdDocType; idNumber: string; flags: string[] } {
  const verdict = validateIdNumber("VOTER_CARD", DEMO_VOTER_CARD);
  if (!verdict.ok) throw new Error(`demo fixture: the voter's card number is refused (${verdict.refusal})`);
  const decision = decideKyc({
    idType: "VOTER_CARD",
    idNumber: verdict.value,
    idExpiry: null,
    accountDob: DEMO_DOB,
    now: new Date(now),
    formatFlags: verdict.flags,
    riskScore: 0,
    riskThreshold: KYC_MAKER_CHECKER_THRESHOLD,
    holds: [],
    sofStatus: null,
    amlEscalationOpen: false,
    underageAttempt: false,
    samePerson: [],
    officerProvenance: false,
    track: "typed",
  });
  if (decision.outcome !== "approve" || decision.flags.length === 0) {
    throw new Error(`demo fixture: the automatic checks no longer approve a voter's card with a flag (${decision.outcome}; flags: ${decision.flags.join(", ") || "none"})`);
  }
  return { idType: "VOTER_CARD", idNumber: verdict.value, flags: [...decision.flags] };
}

/**
 * The `auto_expired` state's identity: a passport the REAL checks approved automatically 400 days ago, when it still had a
 * year to run, and whose expiry passed yesterday. ⛔ THROWS when the checks would not have approved it then — the fixture
 * draws only a history the product could have written.
 */
function demoExpiredPassportIdentity(now: string): { idType: IdDocType; idNumber: string; flags: string[]; idExpiry: string; approvedAt: string } {
  const DAY = 86_400_000;
  const at = new Date(Date.parse(now) - 400 * DAY);
  const idExpiry = new Date(Date.parse(now) - DAY).toISOString().slice(0, 10);
  const verdict = validateIdNumber("PASSPORT", DEMO_PASSPORT);
  if (!verdict.ok) throw new Error(`demo fixture: the passport number is refused (${verdict.refusal})`);
  const decision = decideKyc({
    idType: "PASSPORT", idNumber: verdict.value, idExpiry, accountDob: DEMO_DOB, now: at, formatFlags: verdict.flags,
    riskScore: 0, riskThreshold: KYC_MAKER_CHECKER_THRESHOLD, holds: [], sofStatus: null, amlEscalationOpen: false,
    underageAttempt: false, samePerson: [], officerProvenance: false, track: "typed",
  });
  if (decision.outcome !== "approve") throw new Error(`demo fixture: the checks would not have approved this passport then (${decision.outcome})`);
  return { idType: "PASSPORT", idNumber: verdict.value, flags: [...decision.flags], idExpiry, approvedAt: at.toISOString() };
}

/**
 * One state's row, EVERY column named (the state list above says what each one is). ⭐ A FINAL code for
 * `refused_final`, a recoverable one for `rejected` — `kycGateState` tells the two apart by exactly that field, so a
 * fixture without it cannot show the final-refusal panel.
 */
function demoKycRow(userId: string, kycState: Exclude<KycState, "none">, existing: StoredKyc | null, now: string): StoredKyc {
  // `auto_expired` (2026-10-10): an automatic approval on a PASSPORT made while it was valid, whose expiry has passed
  // since — the agent upgrade's "document expired" card (`/profile/kyc?for=agent`). Its approval is dated before the expiry.
  const expired = kycState === "auto_expired" ? demoExpiredPassportIdentity(now) : null;
  const identity = kycState === "auto" ? demoAutoIdentity(now) : expired ?? { idType: "NIDA" as IdDocType, idNumber: DEMO_NIDA, flags: [] as string[] };
  const decidedAt = expired ? expired.approvedAt : now;
  // The photo track starts IN_PROGRESS with no images: `attachDocument` refuses a case that was already sent, so
  // `photo_pending` is written as `uploaded` is, and then SENT by the real writer (`ensureDemoKyc`).
  const photoTrack = kycState === "uploaded" || kycState === "photo_pending";
  // ⛔ ONLY AN APPROVED STATE carries the first-approval stamp. The withdraw gate asks THIS, not `status`, so a
  // `pending`/`rejected` fixture that carried it would silently let the payout form render and the harness would prove
  // the wrong thing. `auto` is a FIRST approval, made now; `approved` keeps an earlier visit's date.
  const approvedAt = kycState === "approved" ? (existing?.approvedAt ?? now) : kycState === "auto" ? now : expired ? expired.approvedAt : null;
  return {
    id: existing?.id ?? `kyc_${randomId(10)}`,
    userId,
    status: photoTrack ? "IN_PROGRESS" : KYC_STATUS[kycState],
    rejectReason: kycState === "refused_final" ? "UNDERAGE" : kycState === "rejected" ? "DETAILS_MISMATCH" : null,
    // ⭐ `more_info` carries the officer's note, as `askForCorrections` always does (it refuses one without a note), so
    // /profile/kyc shows the note instead of its generic line — and the note is about the TYPED details: since
    // 2026-10-10 an officer may ask a player to correct them, never to send another document.
    rejectNote: kycState === "rejected" ? "Demo fixture — the name typed does not match the document."
      : kycState === "more_info" ? "Please check the spelling of your full name — it must match your ID exactly."
      : null,
    idType: identity.idType,
    idNumber: identity.idNumber,
    idExpiry: expired ? expired.idExpiry : null,
    idVerifiedAt: decidedAt,
    // Written for every identity that reaches the step, as the service writes it (the erasure-proof twin of the tuple).
    idFingerprint: identityFingerprint(identity.idType, identity.idNumber),
    fullName: DEMO_DISPLAY,
    dob: DEMO_DOB,
    // ⛔ No images on a TYPED state — a player no longer uploads (2026-10-10). The photo track attaches its own below.
    // ⭐ `approved` is an officer's approval ON PHOTOS, like every approval before 2026-10-10, so it carries the NIDA
    // photo set its stamp stands on — the agent gates and the service ask stamp AND photo set (`photoIdentityVerified`,
    // `photoStampStands`); a stamp with no photos behind it is the dead-end shape, never a fixture. ⛔ Each photo is
    // uploaded AT the stamp's instant, never after it: since review R5.2 a stamp counts only over photos uploaded no
    // later than it (`photoSetStampedBy`), as an officer's approval of real photos always is.
    documents: kycState === "approved"
      ? (["NIDA_FRONT", "NIDA_BACK", "SELFIE"] as const).map((docType) => ({
          docType, storageKey: DEMO_DOC_PNG, uploadedAt: approvedAt ?? now, mimeType: "image/png",
          sizeBytes: Buffer.from(DEMO_DOC_PNG.slice(DEMO_DOC_PNG.indexOf(",") + 1), "base64").length,
        }))
      : [],
    // ⛔ No officer request for a document on any state: since 2026-10-10 an officer has no such decision.
    extraRequests: [],
    reviewerId: kycState === "approved" || kycState === "pending" || kycState === "more_info" || kycState === "rejected" ? DEMO_OFFICER : null,
    reviewedAt: photoTrack ? null : decidedAt,
    // An `uploaded` case was never sent: a null `submittedAt` is what makes it "uploaded", not "with us" (`photo_pending`
    // gets its own from `submitForReview`). ⭐ An automatic approval has none either — the instant path sends nothing.
    submittedAt: photoTrack || kycState === "auto" || expired ? null : now,
    approvedAt,
    // The agent gate's stamp, as the 2026-10-10 backfill gave every row APPROVED when it ran (once, at the release; never
    // re-run) — over the photo set above.
    photoVerifiedAt: kycState === "approved" ? approvedAt : null,
    autoApprovedAt: kycState === "auto" ? now : expired ? expired.approvedAt : null,
    autoFlags: identity.flags,
    postCheckedAt: null,
    postCheckedById: null,
    // ⛔ No history: each state is one fixture, not the account's past — ONE STATE PER URL, WHATEVER RAN BEFORE.
    priorIdentities: [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

async function ensureDemoKyc(userId: string, kycState: KycState) {
  const existing = await db.kyc.findByUserId(userId);
  const now = new Date().toISOString();
  if (kycState === "none") {
    // Re-applied on every visit like the wallet balance, so a single demo account can be
    // flipped between gate states across successive harness runs.
    // ⭐ BLANKED, NOT RE-LABELLED (2026-10-10). This wrote `{ ...existing, status: "NOT_STARTED" }`, which kept the
    // identity (prefilled into the typed form, and still holding the number), the photos (which put /profile/kyc on
    // the agent photo track) and every approval stamp. The store has no delete; a blank row is the nearest to no row.
    if (existing) {
      await db.kyc.upsert({
        id: existing.id, userId, status: "NOT_STARTED", rejectReason: null, rejectNote: null,
        idType: null, idNumber: null, idExpiry: null, idVerifiedAt: null, idFingerprint: null, fullName: null, dob: null,
        documents: [], extraRequests: [], reviewerId: null, reviewedAt: null, submittedAt: null, approvedAt: null,
        photoVerifiedAt: null, autoApprovedAt: null, autoFlags: [], postCheckedAt: null, postCheckedById: null, priorIdentities: [],
        createdAt: existing.createdAt, updatedAt: now,
      });
    }
    return;
  }
  await db.kyc.upsert(demoKycRow(userId, kycState, existing, now));
  if (kycState === "uploaded" || kycState === "photo_pending") {
    // Through the REAL writer, so the row carries the photos exactly as an agent's upload leaves them — and the slots are
    // the document's own (`requiredSlots`, the selfie included), never a hand-written list.
    for (const slot of ID_DOC_SPECS.NIDA.requiredSlots) {
      const r = await attachDocument(userId, slot, DEMO_DOC_PNG);
      if (!r.ok) throw new Error(`demo fixture: attachDocument ${slot} failed — ${r.error}`);
      // ⭐ The token handed back (2026-10-10): attaching is rate-limited per account (its own rule, `kyc.attach`, since
      // review R5.5), and a harness that revisits this state (every locale × width) would otherwise exhaust the ONE demo
      // account's bucket. The fixture spends nothing.
      await rateRefundAsync(kycAttachRateKey(userId), "kyc.attach");
    }
  }
  if (kycState === "photo_pending") {
    // …and SENT through the real writer, which refuses a case missing a slot — so this state can never draw a photo case
    // the agent track could not have sent.
    const r = await submitForReview(userId);
    if (!r.ok) throw new Error(`demo fixture: submitForReview failed — ${r.error}`);
  }
}

/**
 * ⭐ THE WALLET AS EACH STATE LEAVES IT (2026-09-13). A final refusal freezes the wallet
 * (`kyc-service.freezeForFinalRefusal`), so `refused_final` holds `IDENTITY_REFUSED` through the real
 * helper and every other state lifts THAT hold again — never another reason. `deposit` adds or fails
 * ONE confirmed deposit row (null leaves it as it is): the first-deposit identity notice reads it. A `false`
 * also empties the balance, so a failed deposit is never shown over money it did not bring in.
 */
async function ensureDemoWallet(userId: string, kycState: KycState, deposit: boolean | null, officerHold = false) {
  const meta = { actorId: null, note: "demo fixture" };
  if (kycState === "refused_final") await addWalletFreeze(userId, "IDENTITY_REFUSED", meta);
  else await removeWalletFreeze(userId, "IDENTITY_REFUSED", meta);
  // `&hold=officer` (audit session 95, 2026-09-14): an officer's own freeze, through the real helper, so the withdraw
  // screen's frozen panel can be driven for an account approved once. Lifted again on every visit without it.
  if (officerHold) await addWalletFreeze(userId, "OFFICER", meta);
  else await removeWalletFreeze(userId, "OFFICER", meta);
  if (deposit === null) return;
  const w = await db.wallet.findByUserId(userId);
  if (!w) return;
  // ⭐ 2026-09-14 · `deposit=0` HOLDS NO DEPOSITED MONEY. `ensureDemoUser` resets the balance to 100,000 on every
  // visit, so this fixture used to show TZS 100,000 over its one FAILED deposit row — a balance the ledger cannot
  // explain. A failed attempt credits nothing, so the wallet is emptied here. The one caller in `scripts/` that
  // passes 0 (`kyc-gate-drive.mjs` §2) asks only that the balance renders and the notice is absent; `deposit=1`
  // and an omitted `deposit` keep the 100,000 every other harness relies on.
  if (deposit === false && w.balance !== 0) await db.wallet.update(w.id, { balance: 0 });
  const id = "txn_demo_first_deposit";
  const now = new Date().toISOString();
  const existing = await db.txn.findById(id);
  // ⭐ E-400 ⑧ (2026-09-14) · ONE STATE PER URL, WHATEVER RAN BEFORE. `deposit=0` used to write no row on a fresh store but
  // turn an earlier `deposit=1` row FAILED, so the same URL showed two different histories (the store has no txn delete).
  // It now always ends with exactly one FAILED attempt: created if absent, flipped if present.
  if (!existing) {
    await db.txn.create({
      id, walletId: w.id, userId, type: "DEPOSIT", status: deposit ? "CONFIRMED" : "FAILED",
      amount: DEMO_STARTING_BALANCE, fee: 0, taxWithheld: 0, balanceAfter: deposit ? DEMO_STARTING_BALANCE : 0, currency: "TZS",
      provider: "MPESA", providerRef: "demo_first_deposit", msisdn: null, description: "Demo fixture deposit",
      positionId: null, amlReason: null, createdAt: now, updatedAt: now, completedAt: deposit ? now : null,
    } as StoredTxn);
  } else {
    await db.txn.update(id, { status: deposit ? "CONFIRMED" : "FAILED", updatedAt: now });
  }
}

async function ensureDemoUser(emailState: EmailState) {
  const emailFields = {
    email: emailState === "none" ? null : DEMO_EMAIL,
    emailVerifiedAt: emailState === "verified" ? new Date().toISOString() : null,
  };
  let user = await db.user.findByPhone(DEMO_PHONE);
  if (!user) {
    const now = new Date().toISOString();
    const u: StoredUser = {
      id: `usr_${randomId(12)}`,
      phoneE164: DEMO_PHONE,
      passwordHash: null,
      passwordSalt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      role: "PLAYER",
      status: "ACTIVE",
      locale: "EN",
      displayName: DEMO_DISPLAY,
      dob: DEMO_DOB,
      region: "TZ",
      acceptedTermsVersion: "v1",
      acceptedTermsAt: now,
      marketingOptIn: false,
      twoFactorEnabled: false,
      avatarDataUrl: null,
      ...emailFields,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      closedAt: null,
    };
    await db.user.create(u);
    const w: StoredWallet = {
      id: `wal_${randomId(12)}`,
      userId: u.id,
      balance: DEMO_STARTING_BALANCE,
      pending: 0,
      hold: 0,
      currency: "TZS",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    await db.wallet.create(w);
    user = u;
  } else {
    // Reset the wallet to the canonical starting balance on each visit
    // so test runs are deterministic. Real player flows never hit this
    // route — it's 404 in production.
    const w = await db.wallet.findByUserId(user.id);
    if (w && w.balance !== DEMO_STARTING_BALANCE) {
      await db.wallet.update(w.id, { balance: DEMO_STARTING_BALANCE });
    }
    // Re-apply the requested email state so a single demo user can be flipped
    // between gate/no-gate across successive harness runs — and the date of birth, which the identity step reads.
    await db.user.update(user.id, { ...emailFields, dob: DEMO_DOB });
  }
  return { userId: user.id, phoneE164: user.phoneE164 };
}

/**
 * ⭐ `&receipts=1` (2026-10-07) — a book of receipts for the Receipts page drives: fifteen rows, so the list has a page 2,
 * spread over 40 days so every window has rows, and every one of the seven payment statuses shown.
 * ⛔ THROUGH THE REAL DOORS: deposits and withdrawals are made by `deposit()` and `withdraw()` (the mock rail settles
 * them CONFIRMED), so this route adds no money-row writer and no wallet writer of its own (the `.txn.create` census in
 * `test:house-bot-reports` and `test:wallet-status-writers` stay as they are). The other statuses — and the dates — are
 * then set on those rows with the store's existing `txn.update`; balances are not touched by that, and the next visit's
 * `ensureDemoWallet` resets the balance anyway. Idempotent: an account that already holds fifteen receipts is left alone.
 * Needs the demo defaults (identity approved, email confirmed) for the withdrawals to pass their gates.
 */
async function ensureDemoReceipts(userId: string, phoneE164: string) {
  const have = await db.txn.findByUserTypes(userId, ["DEPOSIT", "WITHDRAWAL"], 50);
  if (have.length >= 15) return;
  const { deposit: doDeposit, withdraw: doWithdraw } = await import("@/lib/server/wallet-service");
  const msisdn = phoneE164.replace(/^\+255/, "");
  const DAY = 86_400_000;
  // [type, provider, amount, status to show, age in days]
  const BOOK: Array<["DEPOSIT" | "WITHDRAWAL", "MPESA" | "AIRTEL_MONEY" | "HALO_PESA" | "MIXX", number, StoredTxn["status"], number]> = [
    ["DEPOSIT", "MPESA", 25_000, "CONFIRMED", 0.05], ["WITHDRAWAL", "MPESA", 12_000, "PROCESSING", 0.1],
    ["DEPOSIT", "AIRTEL_MONEY", 5_000, "PENDING", 0.2], ["DEPOSIT", "HALO_PESA", 1_000, "FAILED", 1.2],
    ["WITHDRAWAL", "MPESA", 8_500, "CONFIRMED", 1.4], ["DEPOSIT", "MIXX", 50_000, "REVERSED", 2.5],
    ["DEPOSIT", "MPESA", 3_000, "AML_REVIEW", 3.5], ["WITHDRAWAL", "MPESA", 2_000, "CANCELLED", 4.5],
    ["DEPOSIT", "MPESA", 10_000, "PROCESSING", 6], ["WITHDRAWAL", "MPESA", 20_000, "AML_REVIEW", 8],
    ["DEPOSIT", "AIRTEL_MONEY", 7_500, "CONFIRMED", 12], ["WITHDRAWAL", "MPESA", 4_000, "FAILED", 20],
    ["DEPOSIT", "MPESA", 100_000, "CONFIRMED", 25], ["DEPOSIT", "MPESA", 1_500, "CANCELLED", 33],
    ["WITHDRAWAL", "MPESA", 30_000, "CONFIRMED", 40],
  ];
  const now = Date.now();
  for (const [type, provider, amount, status, age] of BOOK.slice(have.length)) {
    const r = type === "DEPOSIT"
      ? await doDeposit(userId, { provider, amount, msisdn })
      : await doWithdraw(userId, { provider, amount, msisdn });
    const txnId = r.ok ? r.data?.txnId : undefined;
    if (!txnId) continue;
    const at = new Date(now - age * DAY).toISOString();
    await db.txn.update(txnId, { status, createdAt: at, updatedAt: at, completedAt: status === "CONFIRMED" ? at : null });
  }
}

async function bootstrapDemo(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const raw = req.nextUrl.searchParams.get("email");
  const emailState: EmailState = raw === "unverified" || raw === "none" ? raw : "verified";
  const rawKyc = req.nextUrl.searchParams.get("kyc");
  const kycState: KycState = (KYC_STATES as readonly string[]).includes(rawKyc ?? "") ? (rawKyc as KycState) : "approved";
  const rawDeposit = req.nextUrl.searchParams.get("deposit");
  const deposit = rawDeposit === "1" ? true : rawDeposit === "0" ? false : null;
  const { userId, phoneE164 } = await ensureDemoUser(emailState);
  await ensureDemoKyc(userId, kycState);
  await ensureDemoWallet(userId, kycState, deposit, req.nextUrl.searchParams.get("hold") === "officer");
  if (req.nextUrl.searchParams.get("receipts") === "1") await ensureDemoReceipts(userId, phoneE164);
  await createSession({
    userId,
    phoneE164,
    role: "PLAYER",
    // ⚠️ The cookie stamp MIRRORS the row now instead of contradicting it. Nothing gates on
    // this value — the withdrawal gate, the only identity question on a money path since
    // 2026-09-13, re-reads the database (`kyc-gate.ts`) — but a fixture
    // whose cookie says APPROVED over a REJECTED row is a trap for whoever debugs the next
    // failure, and it is what made the pre-2026-09-05 lie invisible.
    kycStatus: kycState === "none" ? "NOT_STARTED" : KYC_STATUS[kycState],
  });
  return NextResponse.redirect(new URL("/", req.url));
}

export async function GET(req: NextRequest) {
  return bootstrapDemo(req);
}
export async function POST(req: NextRequest) {
  return bootstrapDemo(req);
}
