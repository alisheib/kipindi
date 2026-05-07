/**
 * Demo Mode — dev-only sandbox.
 * Provides a one-click pre-funded session for product walkthroughs (manager review,
 * regulator demo, GLI test environment).
 *
 * NEVER ENABLED IN PRODUCTION:
 *  - Requires `DEMO_MODE_ENABLED=true` env var, OR `NODE_ENV !== "production"`
 *  - All demo activity is audited (SECURITY · "demo.entered")
 *  - Demo sessions carry `demoMode: true` flag — UI banner displayed always
 *  - Switching off demo mode for live launch is a one-line change in this file
 */
import { audit } from "./audit";
import { createSession } from "./session";
import { db } from "./store";
import { randomId } from "./crypto";

const DEMO_PHONE = "+255700000000";
// Bumped from TZS 100k to TZS 500k so the demo user has room for several
// 5–25k bets, a cash-out, AND a 50k+ confidence stake without running dry —
// makes the celebration / cash-out flows worth experiencing end-to-end.
const DEMO_BALANCE = 500_000; // TZS

export function isDemoModeAllowed(): boolean {
  if (process.env.DEMO_MODE_ENABLED === "true") return true;
  if (process.env.DEMO_MODE_ENABLED === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export async function enterDemoMode(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isDemoModeAllowed()) {
    return { ok: false, error: "Demo mode is disabled." };
  }

  // Find or create demo user — idempotent
  let user = db.user.findByPhone(DEMO_PHONE);
  if (!user) {
    user = db.user.create({
      id: `usr_demo_${randomId(8)}`,
      phoneE164: DEMO_PHONE,
      role: "PLAYER",
      status: "ACTIVE",
      locale: "EN",
      displayName: "Demo Manager",
      dob: "1985-06-15",
      region: "Dar es Salaam",
      acceptedTermsVersion: "2026-04-01",
      acceptedTermsAt: new Date().toISOString(),
      marketingOptIn: false,
      twoFactorEnabled: false,
      avatarDataUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      closedAt: null,
    });
  } else {
    db.user.update(user.id, { lastLoginAt: new Date().toISOString() });
  }

  // KYC pre-approved
  let kyc = db.kyc.findByUserId(user.id);
  if (!kyc || kyc.status !== "APPROVED") {
    kyc = db.kyc.upsert({
      id: kyc?.id ?? `kyc_demo_${randomId(8)}`,
      userId: user.id,
      status: "APPROVED",
      rejectReason: null,
      rejectNote: null,
      nidaNumber: "12345678901234567890",
      nidaVerifiedAt: new Date().toISOString(),
      fullName: "Demo Manager",
      dob: "1985-06-15",
      documents: [
        { docType: "NIDA_FRONT", storageKey: "demo/nida-front.jpg", uploadedAt: new Date().toISOString() },
        { docType: "NIDA_BACK",  storageKey: "demo/nida-back.jpg",  uploadedAt: new Date().toISOString() },
        { docType: "SELFIE",     storageKey: "demo/selfie.jpg",     uploadedAt: new Date().toISOString() },
      ],
      reviewerId: "system",
      reviewedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      createdAt: kyc?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Wallet — reset to known starting balance for clean walkthrough
  let wallet = db.wallet.findByUserId(user.id);
  if (!wallet) {
    wallet = db.wallet.create({
      id: `wlt_demo_${randomId(8)}`,
      userId: user.id,
      balance: DEMO_BALANCE,
      pending: 0,
      hold: 0,
      currency: "TZS",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    db.wallet.update(wallet.id, { balance: DEMO_BALANCE, pending: 0, hold: 0 });
  }

  audit({
    category: "SECURITY",
    action: "demo.entered",
    actorId: user.id,
    targetType: "User",
    targetId: user.id,
    payload: { startingBalance: DEMO_BALANCE },
  });

  await createSession({
    userId: user.id,
    phoneE164: user.phoneE164,
    role: user.role,
    kycStatus: "APPROVED",
    demoMode: true,
  });

  return { ok: true };
}

export async function resetDemoData(): Promise<void> {
  const user = db.user.findByPhone(DEMO_PHONE);
  if (!user) return;
  const wallet = db.wallet.findByUserId(user.id);
  if (wallet) db.wallet.update(wallet.id, { balance: DEMO_BALANCE, pending: 0, hold: 0 });
  audit({ category: "SECURITY", action: "demo.reset", actorId: user.id, targetType: "User", targetId: user.id });
}
