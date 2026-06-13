/**
 * /api/dev-test/fresh-kyc-player — dev-only. Creates a BRAND-NEW player with a
 * fresh session cookie, at a chosen KYC state, so an E2E can drive the real
 * player-side KYC flow (document upload → submit → resubmit) end to end.
 *
 * Returns 404 in production — never reachable on a live deployment.
 *
 *   POST { state?: "nida_verified" | "none" } → { ok, userId, phone }
 *   - "nida_verified" (default): NIDA already verified, 0 documents → the
 *     browser can upload docs + submit (skips the segmented DOB widget).
 *   - "none": no KYC record yet (lands on the NIDA step).
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet, StoredKyc } from "@/lib/server/store";
import { createSession } from "@/lib/server/session";
import { randomId } from "@/lib/server/crypto";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as { state?: string } | null;
  const state = body?.state === "none" ? "none" : "nida_verified";

  const now = new Date().toISOString();
  const id = `usr_${randomId(12)}`;
  // Unique phone per call so each run is isolated.
  const phone = `+25573${String((parseInt(id.slice(-7), 36) % 9_000_000) + 1_000_000)}`;
  const u: StoredUser = {
    id, phoneE164: phone, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "PENDING_KYC", locale: "EN", displayName: null, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  };
  await db.user.create(u);
  const w: StoredWallet = {
    id: `wal_${randomId(12)}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  };
  await db.wallet.create(w);

  if (state === "nida_verified") {
    const kyc: StoredKyc = {
      id: `kyc_${randomId(10)}`, userId: id, status: "IN_PROGRESS", rejectReason: null, rejectNote: null,
      // Unique NIDA so the one-NIDA-per-account rule never collides across runs.
      nidaNumber: "1990010100000000" + String((parseInt(id.slice(-4), 36) % 9000) + 1000),
      nidaVerifiedAt: now, fullName: "Asha Mwamba Juma", dob: "1990-01-01",
      documents: [], extraRequests: [], reviewerId: null, reviewedAt: null, submittedAt: null, createdAt: now, updatedAt: now,
    };
    await db.kyc.upsert(kyc);
  }

  await createSession({ userId: id, phoneE164: phone, role: "PLAYER", kycStatus: "IN_PROGRESS" });
  return NextResponse.json({ ok: true, userId: id, phone });
}
