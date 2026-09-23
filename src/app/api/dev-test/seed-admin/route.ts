/**
 * /api/dev-test/seed-admin — dev-only. Creates a fully-provisioned admin
 * user in one call: registered, ADMIN role, ACTIVE status, KYC approved,
 * wallet funded, session cookie set. Ready to use /admin/* immediately.
 *
 * Returns 404 in production — never reachable on a live deployment.
 *
 *   POST { phone?: string, name?: string, balance?: number }
 *   Defaults: +255700000001, "Ali Admin", TZS 1,000,000
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet, StoredKyc } from "@/lib/server/store";
import { createSession } from "@/lib/server/session";
import { randomId } from "@/lib/server/crypto";
import { hashPassword } from "@/lib/server/crypto";
import { audit } from "@/lib/server/audit";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    phone?: string;
    name?: string;
    balance?: number;
    password?: string;
    /** Dev only (E-381 §6 item 10 drive): seed a NON-owner staff account. Defaults to ADMIN, as before. */
    role?: "ADMIN" | "COMPLIANCE" | "MODERATOR" | "FINANCE" | "GROWTH" | "AUDITOR" | "SUPPORT" | "PLAYER";
  } | null;

  const phone = body?.phone || "+255700000001";
  const name = body?.name || "Ali Admin";
  const balance = Math.min(body?.balance ?? 1_000_000, 100_000_000);
  const password = body?.password || "Admin2026!";
  const STAFF = ["ADMIN", "COMPLIANCE", "MODERATOR", "FINANCE", "GROWTH", "AUDITOR", "SUPPORT", "PLAYER"] as const;
  const role = STAFF.find((r) => r === body?.role) ?? "ADMIN";

  // If user already exists, just promote + fund + set session
  const existing = await db.user.findByPhone(phone);
  if (existing) {
    await db.user.update(existing.id, { role, status: "ACTIVE", displayName: name });
    const w = await db.wallet.findByUserId(existing.id);
    if (w) await db.wallet.update(w.id, { balance });
    await createSession({ userId: existing.id, phoneE164: phone, role, kycStatus: "APPROVED" });
    return NextResponse.json({ ok: true, userId: existing.id, phone, name, balance, note: "existing user promoted" });
  }

  // Create fresh admin
  const now = new Date().toISOString();
  const id = `usr_${randomId(12)}`;
  const salt = randomId(16);
  const hash = await hashPassword(password, salt);

  const u: StoredUser = {
    id,
    phoneE164: phone,
    email: null,
    passwordHash: hash,
    passwordSalt: salt,
    failedLoginCount: 0,
    lockedUntil: null,
    role,
    status: "ACTIVE",
    locale: "EN",
    displayName: name,
    dob: "1990-01-01",
    region: "TZ",
    acceptedTermsVersion: "v1",
    acceptedTermsAt: now,
    marketingOptIn: false,
    twoFactorEnabled: false,
    avatarDataUrl: null,
    emailVerifiedAt: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    closedAt: null,
  };
  await db.user.create(u);

  const w: StoredWallet = {
    id: `wal_${randomId(12)}`,
    userId: id,
    balance,
    pending: 0,
    hold: 0,
    currency: "TZS",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  await db.wallet.create(w);

  const kyc: StoredKyc = {
    id: `kyc_${randomId(10)}`,
    userId: id,
    status: "APPROVED",
    rejectReason: null,
    rejectNote: null,
    /* ⚠️ UNIQUE PER PHONE, NOT A CONSTANT (2026-09-22). `KycSubmission` carries a unique index on
       (`idType`, `idNumber`), and every user this route seeded got the SAME number — which the memory store never
       noticed and Postgres refuses on the second user: the `qa:desk-rules-flow` recipe on a migrated scratch
       database died at its first holder with P2002. The phone's digits are the one thing already unique per
       seeded user, so the number is derived from them, twenty digits like `fresh-kyc-player`'s. */
    idType: "NIDA", idNumber: `1990${phone.replace(/\D/g, "").padStart(16, "0").slice(-16)}`, idExpiry: null, idVerifiedAt: now,
    fullName: name,
    dob: "1990-01-01",
    documents: [],
    extraRequests: [],
    reviewerId: "system",
    reviewedAt: now,
    submittedAt: now,
    // The column the WITHDRAW gate reads (2026-09-05). An APPROVED fixture without it is a
    // player who can bet and cannot be paid — a state the product never produces.
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await db.kyc.upsert(kyc);

  await createSession({ userId: id, phoneE164: phone, role, kycStatus: "APPROVED" });

  audit({
    category: "SECURITY",
    action: "dev_test.admin_seeded",
    actorId: null,
    targetType: "User",
    targetId: id,
    payload: { phone, name, balance, by: "seed-admin-endpoint" },
  });

  return NextResponse.json({ ok: true, userId: id, phone, name, balance, password });
}
