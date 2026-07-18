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
 * address — we never silently drop a player's receipts.
 *
 * ⚠️ As of the 2026-07-18 real-money launch, `emailVerifiedAt` IS a hard gate on
 * the money-in path: `wallet-service.deposit()` refuses a deposit until it is
 * set (browse free → verify email to deposit → KYC to withdraw). Anything that
 * changes an address therefore clears the flag and re-gates depositing — that is
 * intentional, and `setUserEmail` is the single writer that guarantees it.
 */
import { db } from "./store";
import { audit } from "./audit";
import { signSession, verifySession } from "./crypto";
import { sendEmail, sendEmailToUser, emailVerifyHtml, emailChangedHtml } from "./email";
import type { SendResult } from "./email";
import { notify } from "./notification-service";
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
/**
 * Returns the DELIVERY OUTCOME, not void.
 *
 * It used to swallow everything, so `setUserEmail` and the resend action both
 * reported `sent: true` unconditionally and the UI said "Sent. Check your inbox"
 * even when the address was on the hard-bounce suppression list and nothing had
 * been sent at all. On the flow that unlocks depositing, that left a player
 * tapping Resend until the rate limit stopped them, with no way forward.
 */
export async function sendEmailVerification(userId: string, email: string, name?: string): Promise<SendResult> {
  try {
    const verifyUrl = buildEmailVerifyUrl(userId, email);
    // Send to the just-set address explicitly (not the resolved fallback): the
    // whole point is to confirm THIS address.
    const result = await sendEmailToUser(userId, () => ({
      to: email,
      subject: "Confirm your email · 50pick",
      html: emailVerifyHtml({ name, verifyUrl }),
      tag: "email-verify",
      // ⛔ NEVER track this link. It is the single link that unlocks depositing,
      // and Postmark's click-tracking rewrites it through a redirect domain — a
      // mis-set tracking domain would send every confirmation click nowhere and
      // silently close the money-in path. (The email-changed alert already
      // passes this; the link that actually matters had been missed.)
      // It also stops corporate/Gmail link scanners pre-fetching the URL and
      // auto-confirming an address no human ever opened.
      trackLinks: false,
    }));
    return result;
  } catch (err) {
    console.error("[email-verify] send failed:", (err as Error)?.message);
    return { ok: false, reason: "failed" };
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
): Promise<{ ok: true; changed: boolean; verificationSent: boolean; deliveryIssue?: SendResult["reason"] } | { ok: false; error: string }> {
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

  // ONE ACCOUNT PER EMAIL — RE-ENABLED at real-money launch (2026-07-18).
  //
  // It was disabled 2026-06-14 so several testers could share one inbox. That is
  // no longer survivable: a verified email now UNLOCKS DEPOSITING, so a shared
  // address would let one inbox open unlimited depositing accounts, and per-account
  // controls (deposit caps, self-exclusion) are only as strong as the one-person-
  // one-account assumption underneath them.
  //
  // Enforced in application code, not by a DB @unique: adding a unique index to the
  // live money DB risks failing `prisma migrate deploy` — which would take
  // production down — if any duplicate is already present. The index is a follow-up
  // once prod is confirmed duplicate-free. Mirrors the identical check in
  // auth-service.registerWithPassword.
  const holder = await db.user.findByEmail(next);
  if (holder && holder.id !== userId) {
    audit({ category: "SECURITY", action: "user.email.duplicate_blocked", actorId: userId, targetType: "User", targetId: userId, payload: { conflictUserId: holder.id } });
    return { ok: false, error: "That email is already linked to another account." };
  }

  // New / changed address: store it, reset verification, send a fresh link.
  await db.user.update(userId, { email: next, emailVerifiedAt: null });
  audit({ category: "COMPLIANCE", action: "user.email.set", actorId: userId, targetType: "User", targetId: userId, payload: { verified: false } });
  const name = (user.displayName?.trim().split(/\s+/)[0]) || displayLabel({ id: userId, displayName: user.displayName ?? null });
  // Report what ACTUALLY happened. A suppressed (previously hard-bounced) address
  // silently swallowed the link and we still told the player to check their inbox.
  const send = await sendEmailVerification(userId, next, name);

  // Security alert to the PREVIOUS address (if any): an account-takeover that
  // swaps the email must still reach the real owner on the address they control.
  // Sent directly (not sendEmailToUser, which now resolves the NEW address) and
  // mirrored to the in-app inbox. Best-effort — never blocks the change.
  if (current) {
    const when = new Date().toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam" });
    try {
      await sendEmail({
        to: current,
        subject: "Your 50pick email was changed · Usalama",
        html: emailChangedHtml({ newEmail: next, time: when }),
        tag: "email-changed",
        trackLinks: false,
      });
    } catch (err) {
      console.error("[email-change] alert to old address failed:", (err as Error)?.message);
    }
    await notify({
      userId,
      kind: "SECURITY",
      titleEn: "Email address changed",
      titleSw: "Barua pepe imebadilishwa",
      bodyEn: `Your account email was changed to ${next}. If this wasn't you, contact support immediately.`,
      bodySw: "Barua pepe ya akaunti yako imebadilishwa. Kama si wewe, wasiliana na usaidizi mara moja.",
      href: "/profile/account",
    });
  }
  return { ok: true, changed: true, verificationSent: send.ok, deliveryIssue: send.ok ? undefined : send.reason };
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
