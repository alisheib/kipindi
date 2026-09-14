/**
 * /auth/demo — dev-only session bootstrap for E2E test scripts.
 *
 * Creates (or reuses) a fixed demo player, funds the wallet to a
 * predictable 100,000 TZS, issues a session cookie, then redirects to
 * "/". Lets the existing 22 stress / a11y / multi-viewport / smoke
 * scripts under scripts/* drive an authed flow without doing the full
 * register → confirm email → deposit dance every time (identity is asked
 * before withdrawal only since 2026-09-13 — see `kycState` below).
 *
 * Returns 404 in production — the route does not exist on a live
 * deployment. Per memory: an earlier "Enter demo" button on the
 * landing page was removed; this endpoint is restored ONLY for the
 * test harness, not as a user-visible feature.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet, StoredTxn } from "@/lib/server/store";
import { createSession } from "@/lib/server/session";
import { randomId } from "@/lib/server/crypto";
import { attachDocument } from "@/lib/server/kyc-service";
import { addWalletFreeze, removeWalletFreeze } from "@/lib/server/wallet-freeze";

const DEMO_PHONE = "+255700000000";
const DEMO_DISPLAY = "Demo Player";
const DEMO_EMAIL = "demo.player@50pick.test";
const DEMO_STARTING_BALANCE = 100_000;

/**
 * `emailState` decides which side of the DEPOSIT EMAIL GATE the demo session
 * lands on, so the harness can screenshot BOTH without hand-editing the DB:
 *   "verified" (default) — confirmed address → the real deposit form renders
 *   "unverified"         — address on file, not confirmed → the gate renders
 *   "none"               — no address at all → the gate's "add an email" variant
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
 * ⭐ AND IT TAKES THE OTHER SIX STATES, exactly as `?email=` already does, so the harness
 * can drive every gate panel without hand-editing the database:
 *   /auth/demo?kyc=none | uploaded | pending | more_info | rejected | refused_final | approved (default)
 * ⭐ 2026-09-13 — `uploaded` (a document attached through the real writer, never sent) and
 * `refused_final` (UNDERAGE, wallet frozen `IDENTITY_REFUSED`, exactly as a final refusal leaves it)
 * complete the six states of the withdraw panel. `&deposit=1` adds ONE confirmed deposit row and
 * `&deposit=0` leaves exactly ONE FAILED attempt (created or flipped) AND empties the wallet (TZS 0, since 2026-09-14) — that row is what the first-deposit
 * identity notice on /wallet asks about.
 * ⛔ `none` writes NO ROW, because that is what a real new account looks like; a row that
 * merely SAYS NOT_STARTED would exercise a state the product never produces at sign-up.
 */
type KycState = "approved" | "none" | "uploaded" | "pending" | "more_info" | "rejected" | "refused_final";
const KYC_STATES: readonly KycState[] = ["approved", "none", "uploaded", "pending", "more_info", "rejected", "refused_final"];

const KYC_STATUS: Record<Exclude<KycState, "none">, "APPROVED" | "IN_PROGRESS" | "PENDING_REVIEW" | "ADDITIONAL_INFO_REQUIRED" | "REJECTED"> = {
  approved: "APPROVED",
  uploaded: "IN_PROGRESS",
  pending: "PENDING_REVIEW",
  more_info: "ADDITIONAL_INFO_REQUIRED",
  rejected: "REJECTED",
  refused_final: "REJECTED",
};

/** A 1×1 PNG that passes `validateDocImage` — the fixture `seed-kyc-stages-local.mts` attaches too. */
const DEMO_DOC_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function ensureDemoKyc(userId: string, kycState: KycState) {
  const existing = await db.kyc.findByUserId(userId);
  if (kycState === "none") {
    // Re-applied on every visit like the wallet balance, so a single demo account can be
    // flipped between gate states across successive harness runs.
    if (existing) await db.kyc.upsert({ ...existing, status: "NOT_STARTED", approvedAt: null, updatedAt: new Date().toISOString() });
    return;
  }
  const now = new Date().toISOString();
  const status = KYC_STATUS[kycState];
  await db.kyc.upsert({
    id: existing?.id ?? `kyc_${randomId(10)}`,
    userId,
    status,
    // ⭐ A FINAL code for `refused_final`, a recoverable one for `rejected` — `kycGateState` tells the
    // two apart by exactly this field, so a fixture without it cannot show the final-refusal panel.
    rejectReason: kycState === "refused_final" ? "UNDERAGE" : kycState === "rejected" ? "BLURRY_DOC" : null,
    // ⭐ 2026-09-14 · `more_info` carries the officer's note, as a real REQUEST_INFO decision always does
    // (`kyc-service.ts` refuses one without a note), so /profile/kyc shows the note instead of its generic line.
    rejectNote: kycState === "rejected" ? "Demo fixture — document illegible."
      : kycState === "more_info" ? "The back of your ID is blurry — please re-upload a clearer photo."
      : null,
    idType: "NIDA",
    idNumber: "19900101700000000000",
    idExpiry: null,
    idVerifiedAt: now,
    fullName: DEMO_DISPLAY,
    dob: "1990-01-01",
    // A real ADDITIONAL_INFO_REQUIRED row was SUBMITTED first, and submit refuses while any slot is empty,
    // so the `more_info` fixture keeps all three documents on file (the shape `dev-test/seed-kyc` writes).
    documents: kycState === "more_info"
      ? [
          { docType: "NIDA_FRONT", storageKey: DEMO_DOC_PNG, uploadedAt: now },
          { docType: "NIDA_BACK", storageKey: DEMO_DOC_PNG, uploadedAt: now },
          { docType: "SELFIE", storageKey: DEMO_DOC_PNG, uploadedAt: now },
        ]
      : [],
    reviewerId: null,
    reviewedAt: kycState === "uploaded" || kycState === "pending" ? null : now,
    // An `uploaded` file was never sent: a null `submittedAt` is what makes it "uploaded", not "with us".
    submittedAt: kycState === "uploaded" ? null : now,
    // ⛔ ONLY the approved fixture carries the first-approval stamp. The withdraw gate asks
    // THIS, not `status`, so a `pending`/`rejected` fixture that carried it would silently
    // let the payout form render and the harness would prove the wrong thing.
    approvedAt: status === "APPROVED" ? (existing?.approvedAt ?? now) : null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  if (kycState === "uploaded") {
    // Through the REAL writer, so the row carries a document exactly as a player's upload leaves it.
    const r = await attachDocument(userId, "NIDA_FRONT", DEMO_DOC_PNG);
    if (!r.ok) throw new Error(`demo fixture: attachDocument failed — ${r.error}`);
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
      dob: "1990-01-01",
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
    // between gate/no-gate across successive harness runs.
    await db.user.update(user.id, emailFields);
  }
  return { userId: user.id, phoneE164: user.phoneE164 };
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
