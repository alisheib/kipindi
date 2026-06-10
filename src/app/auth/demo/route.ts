/**
 * /auth/demo — dev-only session bootstrap for E2E test scripts.
 *
 * Creates (or reuses) a fixed demo player, funds the wallet to a
 * predictable 100,000 TZS, issues a session cookie, then redirects to
 * "/". Lets the existing 22 stress / a11y / multi-viewport / smoke
 * scripts under scripts/* drive an authed flow without doing the full
 * register → KYC → deposit dance every time.
 *
 * Returns 404 in production — the route does not exist on a live
 * deployment. Per memory: an earlier "Enter demo" button on the
 * landing page was removed; this endpoint is restored ONLY for the
 * test harness, not as a user-visible feature.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet } from "@/lib/server/store";
import { createSession } from "@/lib/server/session";
import { randomId } from "@/lib/server/crypto";

const DEMO_PHONE = "+255700000000";
const DEMO_DISPLAY = "Demo Player";
const DEMO_STARTING_BALANCE = 100_000;

async function ensureDemoUser() {
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
  }
  return { userId: user.id, phoneE164: user.phoneE164 };
}

async function bootstrapDemo(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const { userId, phoneE164 } = await ensureDemoUser();
  await createSession({
    userId,
    phoneE164,
    role: "PLAYER",
    kycStatus: "APPROVED",
  });
  return NextResponse.redirect(new URL("/", req.url));
}

export async function GET(req: NextRequest) {
  return bootstrapDemo(req);
}
export async function POST(req: NextRequest) {
  return bootstrapDemo(req);
}
