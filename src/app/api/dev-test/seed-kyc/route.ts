/**
 * /api/dev-test/seed-kyc — dev-only endpoint that creates a player with a KYC
 * submission in a chosen state, so E2E scripts can drive the officer review UI
 * (approve / request-info / reject) without running the full upload flow.
 *
 * Returns 404 in production — never reachable on a live deployment.
 *
 *   POST { status?: "PENDING_REVIEW" | "ADDITIONAL_INFO_REQUIRED" }
 *     → { ok, userId, phone, kycId }
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredKyc } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { audit } from "@/lib/server/audit";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status === "ADDITIONAL_INFO_REQUIRED" ? "ADDITIONAL_INFO_REQUIRED" : "PENDING_REVIEW";

  const now = new Date().toISOString();
  const id = `usr_${randomId(12)}`;
  const phone = `+25571${String(Math.floor(parseInt(id.slice(-7), 36) % 9_000_000) + 1_000_000)}`;
  const u: StoredUser = {
    id, phoneE164: phone, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "PENDING_KYC", locale: "EN", displayName: null, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  };
  await db.user.create(u);
  const kyc: StoredKyc = {
    id: `kyc_${randomId(10)}`, userId: id, status, rejectReason: null,
    rejectNote: status === "ADDITIONAL_INFO_REQUIRED" ? "The back of your ID is blurry — please re-upload a clearer photo." : null,
    nidaNumber: "19900101456712345678", nidaVerifiedAt: now, fullName: "Asha Mwamba Juma", dob: "1990-01-01",
    documents: [
      { docType: "NIDA_FRONT", storageKey: "data:image/jpeg;base64,/9j/seed", uploadedAt: now },
      { docType: "NIDA_BACK", storageKey: "data:image/jpeg;base64,/9j/seed", uploadedAt: now },
      { docType: "SELFIE", storageKey: "data:image/jpeg;base64,/9j/seed", uploadedAt: now },
    ],
    reviewerId: null, reviewedAt: null, submittedAt: now, createdAt: now, updatedAt: now,
  };
  await db.kyc.upsert(kyc);
  audit({ category: "SECURITY", action: "dev_test.kyc_seeded", actorId: null, targetType: "Kyc", targetId: kyc.id, payload: { status, by: "dev-test-endpoint" } });
  return NextResponse.json({ ok: true, userId: id, phone, kycId: kyc.id });
}
