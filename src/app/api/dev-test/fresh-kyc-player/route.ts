/**
 * /api/dev-test/fresh-kyc-player — dev-only. Creates a BRAND-NEW player with a
 * fresh session cookie, at a chosen KYC state, so an E2E can drive the real
 * player-side KYC flow end to end.
 *
 * Returns 404 in production — never reachable on a live deployment.
 *
 *   POST { state?: "nida_verified" | "none" } → { ok, userId, phone }
 *   - "nida_verified" (default): NIDA details saved (IN_PROGRESS), 0 documents.
 *     ⭐ Since 2026-10-10 (typed-only KYC) that row is two real states at once: the LEGACY mid-flow row —
 *     production held four on the day, details saved before the change and photos never added — on which
 *     /profile/kyc shows the typed form prefilled and ONE press verifies; and an agent applicant's photo track
 *     after its first step (`/profile/kyc?for=agent`: the document's photos and a selfie come next).
 *   - "none": no KYC record yet (lands on the typed details form).
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet, StoredKyc } from "@/lib/server/store";
import { createSession } from "@/lib/server/session";
import { randomId, identityFingerprint } from "@/lib/server/crypto";

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
  // ⭐ ACTIVE, MATCHING REGISTRATION (2026-09-13). New accounts were created `PENDING_KYC` until then —
  // a status that gated nothing — and are created ACTIVE now (`auth-service.ts`), with the release
  // migration normalising the old rows. A fixture that still minted `PENDING_KYC` would drive an
  // account the product no longer produces, and paint every E2E player "pending" on the roster.
  const u: StoredUser = {
    id, phoneE164: phone, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: null, emailVerifiedAt: null, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  };
  await db.user.create(u);
  const w: StoredWallet = {
    id: `wal_${randomId(12)}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  };
  await db.wallet.create(w);

  if (state === "nida_verified") {
    // ⛔ A NIDA UNIQUE TO THIS PLAYER, from the phone's last eleven digits ("5573" + its seven — unique per call, as the
    // phone itself must be). It was "1990010100000000" + four digits from 9,000 values until 2026-10-10: over a long dev
    // session two players shared one, and the second one's press met "already linked to another account" — and a
    // value ending `9999` met the dev NIDA mock's MISMATCH hook. Digits 1-8 are the account's date of birth; it ends
    // in `7`, never `0000` (the mock's SANCTIONED hook) or `9999`.
    const idNumber = `19900101${phone.slice(-11)}7`;
    const kyc: StoredKyc = {
      id: `kyc_${randomId(10)}`, userId: id, status: "IN_PROGRESS", rejectReason: null, rejectNote: null,
      // ⚠️ The deprecated `nida*` mirror was written here until 2026-08-20. This fixture must match exactly what the
      // identity step writes for a NIDA (`submitIdentityStep`): the tuple, its keyed fingerprint, the name and the
      // date — and nothing else.
      idType: "NIDA",
      idNumber,
      idExpiry: null,
      idVerifiedAt: now,
      idFingerprint: identityFingerprint("NIDA", idNumber),
      // ⛔ ONE NAME PER PLAYER (2026-10-10). The automatic checks now look for the same person — the same name and date
      // of birth — on other accounts, so a name every fixture shared made each new player a "possible same person" of
      // all the earlier ones: flagged, or routed to an officer once any one of them had been refused or frozen.
      fullName: `Asha Mwamba Juma ${phone.slice(-7)}`, dob: "1990-01-01",
      documents: [], extraRequests: [], reviewerId: null, reviewedAt: null, submittedAt: null,
      // ⭐ Every column named: nothing approved, nothing checked, no earlier identity (a row this fixture BUILDS is
      // written whole — the DAL writes an omitted field as null).
      approvedAt: null, photoVerifiedAt: null, autoApprovedAt: null, autoFlags: [], postCheckedAt: null, postCheckedById: null,
      priorIdentities: [],
      createdAt: now, updatedAt: now,
    };
    await db.kyc.upsert(kyc);
  }

  // The cookie stamp mirrors the row, as `/auth/demo`'s does: no row is NOT_STARTED. Nothing gates on it.
  await createSession({ userId: id, phoneE164: phone, role: "PLAYER", kycStatus: state === "none" ? "NOT_STARTED" : "IN_PROGRESS" });
  return NextResponse.json({ ok: true, userId: id, phone });
}
