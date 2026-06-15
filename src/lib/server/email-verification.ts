/**
 * Email-address confirmation.
 *
 * Architecture: a single `setUserEmail()` is the ONLY place an email is written
 * to a user. Both the profile form and the KYC step call it, so the
 * "store it → clear the verified flag → send a confirmation link" sequence can
 * never drift between call sites.
 *
 * The confirmation link carries a stateless HMAC-signed token (no DB row): the
 * token embeds the userId + the exact address + an expiry, so changing the
 * email silently invalidates any older link, and a tampered token fails the MAC
 * check. We persist only the *result* (`user.emailVerifiedAt`), not the token.
 *
 * Transactional mail (receipts, KYC notices) still sends to an unverified
 * address — verification is an ownership signal we surface and can later gate
 * on, not a hard switch that would silently drop a player's receipts.
 */
import { db } from "./store";
import { audit } from "./audit";
import { signSession, verifySession } from "./crypto";
import { sendEmailToUser, emailVerifyHtml } from "./email";
import { displayLabel } from "@/lib/display-label";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const BASE_URL = () => process.env.NEXT_PUBLIC_APP_URL || "https://kipindi-production.up.railway.app";

type VerifyTokenPayload = {
  purpose: "email-verify";
  userId: string;
  /** The exact address this token confirms — changing email invalidates it. */
  email: string;
  exp: number;
};

/** Build the absolute confirmation URL for an email address. */
export function buildEmailVerifyUrl(userId: string, email: string): string {
  const token = signSession({
    purpose: "email-verify",
    userId,
    email,
    exp: Date.now() + VERIFY_TTL_MS,
  } satisfies VerifyTokenPayload);
  return `${BASE_URL()}/auth/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Fire (best-effort) the confirmation email for `email`. Never throws — a
 * failed send must not break the profile/KYC save that triggered it.
 */
export async function sendEmailVerification(userId: string, email: string, name?: string): Promise<void> {
  try {
    const verifyUrl = buildEmailVerifyUrl(userId, email);
    // Send to the just-set address explicitly (not the resolved fallback): the
    // whole point is to confirm THIS address.
    await sendEmailToUser(userId, () => ({
      to: email,
      subject: "Confirm your email · 50pick",
      html: emailVerifyHtml({ name, verifyUrl }),
      tag: "email-verify",
    }));
  } catch (err) {
    console.error("[email-verify] send failed:", (err as Error)?.message);
  }
}

/**
 * The single writer for `user.email`. Normalizes, no-ops when unchanged,
 * clears the verified flag when the address changes, and fires a confirmation
 * link for any newly-set address. Returns what happened so callers can phrase
 * their UI ("we sent a confirmation link").
 *
 * `email === ""` clears the address (and its verified flag).
 */
export async function setUserEmail(
  userId: string,
  email: string,
): Promise<{ ok: true; changed: boolean; verificationSent: boolean } | { ok: false; error: string }> {
  const next = email.trim().toLowerCase();
  const user = await db.user.findById(userId);
  if (!user) return { ok: false, error: "User not found." };

  const current = (user.email ?? "").trim().toLowerCase();

  // Clearing the address.
  if (next === "") {
    if (!current) return { ok: true, changed: false, verificationSent: false };
    await db.user.update(userId, { email: null, emailVerifiedAt: null });
    audit({ category: "COMPLIANCE", action: "user.email.cleared", actorId: userId, targetType: "User", targetId: userId });
    return { ok: true, changed: true, verificationSent: false };
  }

  // Unchanged — leave verified state alone, don't re-send.
  if (next === current) return { ok: true, changed: false, verificationSent: false };

  // Email uniqueness DISABLED for testing (Ali, 2026-06-14). Multiple testers
  // share the same email. RE-ENABLE before real-money launch by uncommenting the
  // block below AND restoring the @unique on User.email in schema.prisma.
  // const holder = await db.user.findByEmail(next);
  // if (holder && holder.id !== userId) {
  //   audit({ category: "SECURITY", action: "user.email.duplicate_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { conflictUserId: holder.id } });
  //   return { ok: false, error: "That email is already linked to another account." };
  // }

  // New / changed address: store it, reset verification, send a fresh link.
  await db.user.update(userId, { email: next, emailVerifiedAt: null });
  audit({ category: "COMPLIANCE", action: "user.email.set", actorId: userId, targetType: "User", targetId: userId, payload: { verified: false } });
  const name = (user.displayName?.trim().split(/\s+/)[0]) || displayLabel({ id: userId, displayName: user.displayName ?? null });
  await sendEmailVerification(userId, next, name);
  return { ok: true, changed: true, verificationSent: true };
}

/**
 * Consume a confirmation token (clicked from the email). Idempotent: a second
 * click on an already-verified address still reports success. Returns a
 * discriminated result the verify page renders.
 */
export async function verifyEmailToken(
  token: string | undefined,
): Promise<{ status: "verified" | "already" | "invalid" | "mismatch" }> {
  const payload = verifySession<VerifyTokenPayload>(token);
  if (!payload || payload.purpose !== "email-verify" || !payload.userId || !payload.email) {
    return { status: "invalid" }; // bad MAC, wrong purpose, or expired (verifySession checks exp)
  }
  const user = await db.user.findById(payload.userId);
  if (!user) return { status: "invalid" };

  const current = (user.email ?? "").trim().toLowerCase();
  // The address changed since the link was issued → this link is stale.
  if (current !== payload.email.trim().toLowerCase()) return { status: "mismatch" };

  if (user.emailVerifiedAt) return { status: "already" };

  await db.user.update(payload.userId, { emailVerifiedAt: new Date().toISOString() });
  audit({ category: "COMPLIANCE", action: "user.email.verified", actorId: payload.userId, targetType: "User", targetId: payload.userId });
  return { status: "verified" };
}
