/**
 * Email-address confirmation.
 *
 * Architecture — ONE WRITER, NAMED DOORS (route audit 2026-10-06, A1 / A3):
 *   · `setUserEmail()` is the only WRITER of `user.email`, so the "store it → clear the verified flag → send a
 *     confirmation link" sequence can never drift between callers.
 *   · `changeOwnEmail()` is the only PLAYER door — add, change and remove alike — and it asks for the current password
 *     first: a minute with an unlocked, signed-in phone was enough to plant an address, confirm it from that same
 *     session, run forgot-password and own the account.
 *   · `setPlayerEmailAction` (`setUserEmail(…, { byOfficer: true })`) is the officer door.
 *   · The KYC identity step no longer writes the address (it was a second, password-less player door).
 *   · `markEmailVerified()` is the only writer of a confirmation (`emailVerifiedAt`).
 *   ⛔ A third caller of `setUserEmail` fails `test:auth-email-integrity` F9.
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
 * set. Anything that changes an address therefore clears the flag and re-gates
 * depositing — that is intentional, and `setUserEmail` is the single writer that
 * guarantees it.
 *
 * 🔴 FROM 2026-09-13 THIS IS THE FRONT DOOR. From 2026-09-05 to 2026-09-13 an approved
 * identity was a second, independent requirement for depositing; that gate is DELETED
 * (identity is asked before WITHDRAWAL only — `kyc-gate.ts`, docs/COMPLIANCE-DECISIONS.md
 * 2026-09-13). A confirmed address is now the only thing between a stranger and a funded
 * account, and the only verified contact channel the platform holds. ⛔ Nothing may relax
 * the clear-on-change rule above.
 */
import { z } from "zod";
import { runOutsideLock } from "./locks";
import { appUrl } from "@/lib/app-url";
import { db } from "./store";
import { audit } from "./audit";
import { signSession, verifySession } from "./crypto";
import { verifyCurrentPassword } from "./reauth";
import { sendEmail, sendEmailToUser, emailVerifyHtml, emailChangedHtml } from "./email";
import type { SendResult } from "./email";
import { notify } from "./notification-service";
import { displayLabel } from "@/lib/display-label";
import type { FailureReason } from "@/lib/failure-reasons";
import { OFFICER_EMAIL_WINDOW_DAYS } from "@/lib/house-bot/constants";

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// ⭐ THE BASE URL HAS ONE HOME: `appUrl()` (`src/lib/app-url.ts`).
// 🔴 This file carried a private `BASE_URL` defaulting to `kipindi-production.up.railway.app`
// until 2026-09-07 — a RETIRED host, and precisely the failure `app-url.ts` exists to prevent:
// its own header says the old default "meant any environment that forgot the env var would email
// people a railway.app link". Five files kept a copy of the bug beside the fix.

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
  return `${appUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
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
      // ⚠️ It does NOT stop a recipient-side scanner: `trackLinks: false` only stops
      // Postmark rewriting the link, and a corporate/Gmail scanner still fetches the
      // URL. What stops a fetch confirming an address no human opened is the proof
      // rule (`openEmailVerifyLink` / `confirmEmailWithProof`, route audit 2026-10-06,
      // A3): opening the link confirms only inside the account's own session, and
      // anywhere else it asks for the account's password.
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
  /**
   * `byOfficer` — support set this address (`setPlayerEmailAction`). Stamps `emailSetByOfficerAt` in the
   * same update as the address (04 A4): a reset link sent to an address support chose is not the holder's
   * own password change, and a house-bot consent check refuses one within 30 days of it. Never cleared —
   * the window is what expires it.
   *
   * `proof` — what the player proved at `changeOwnEmail` (route audit 2026-10-06, A1): `"password"`, or `"none"` for a
   * dormant password-less account (a recorded residual). Written to the audit row; nothing here re-checks it.
   */
  opts: { byOfficer?: boolean; proof?: "password" | "none" } = {},
): Promise<
  | { ok: true; changed: boolean; verificationSent: boolean; deliveryIssue?: SendResult["reason"] }
  | { ok: false; error: string; code: "NOT_FOUND" | "EMAIL_TAKEN"; reason: FailureReason }
> {
  // ⛔ THE CODE IS MINTED HERE, NOT IN THE ACTION. `profile/actions.ts` used to write
  // `code: /already linked/i.test(r.error) ? "EMAIL_TAKEN" : "NOT_FOUND"` — matching this
  // function's own English back out of the string it had just returned. Rewording the
  // duplicate-address sentence below would have silently turned a "that inbox is taken"
  // refusal into "we couldn't find that", on the surface that gates depositing.
  const next = email.trim().toLowerCase();
  const user = await db.user.findById(userId);
  if (!user) return { ok: false, error: "User not found.", code: "NOT_FOUND", reason: "not_found" };

  const current = (user.email ?? "").trim().toLowerCase();
  // WHO changed it and WHAT they proved, on both audit rows below (route audit 2026-10-06, A1).
  const by = opts.byOfficer ? "officer" : opts.proof ? "self" : "unspecified";
  const proof = opts.proof ?? null;

  // Clearing the address.
  if (next === "") {
    if (!current) return { ok: true, changed: false, verificationSent: false };
    await db.user.update(userId, { email: null, emailVerifiedAt: null });
    // A2 · the holder hook: a house bot on this account stops, or records the change (C4-SPEC ruling 127).
    runOutsideLock(() => {
      void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(userId, "EMAIL_CHANGED", { byOfficer: opts.byOfficer === true })).catch(() => {});
    });
    audit({ category: "COMPLIANCE", action: "user.email.cleared", actorId: userId, targetType: "User", targetId: userId, payload: { by, proof } });
    // 🔴 A1 (route audit 2026-10-06) · A REMOVAL WARNS THE ADDRESS IT REMOVED. It used to warn nobody, so
    // clear-then-add was a silent swap: the add that followed found no previous address to alert. Sent directly
    // to the old address and mirrored to the in-app inbox, best-effort, exactly like the change alert below.
    const when = new Date().toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam" });
    try {
      await sendEmail({
        to: current,
        subject: "Your 50pick email was removed · Usalama",
        html: emailChangedHtml({ newEmail: null, time: when }),
        tag: "email-changed",
        trackLinks: false,
      });
    } catch (err) {
      console.error("[email-change] removal alert to old address failed:", (err as Error)?.message);
    }
    await notify({
      userId,
      kind: "SECURITY",
      titleEn: "Email address removed",
      titleSw: "Barua pepe imeondolewa",
      titleZh: "邮箱地址已移除",
      bodyEn: "The email address on your account was removed. If this wasn't you, contact support immediately.",
      bodySw: "Barua pepe ya akaunti yako imeondolewa. Kama si wewe, wasiliana na usaidizi mara moja.",
      bodyZh: "您账户的邮箱地址已被移除。如果这不是您本人操作，请立即联系客服。",
      href: "/profile/account",
    });
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
    return { ok: false, error: "That email is already linked to another account.", code: "EMAIL_TAKEN", reason: "email_taken" };
  }

  // New / changed address: store it, reset verification, send a fresh link.
  // ⛔ A stamp that still counts is never overwritten (house-bots review LI-2): an officer email, a reset link, then
  // a second officer email would otherwise move the stamp past the reset and wave the support-chosen password through.
  // It "counts" while the last password came by reset link at or after it, within the 30-day window.
  const stampCounts = !!user.emailSetByOfficerAt && user.passwordSetVia === "RESET_LINK" && !!user.passwordSetAt
    && Date.parse(user.emailSetByOfficerAt) <= Date.parse(user.passwordSetAt)
    && Date.parse(user.passwordSetAt) - Date.parse(user.emailSetByOfficerAt) <= OFFICER_EMAIL_WINDOW_DAYS * 86_400_000;
  await db.user.update(userId, { email: next, emailVerifiedAt: null, ...(opts.byOfficer && !stampCounts ? { emailSetByOfficerAt: new Date().toISOString() } : {}) });
  // A2 · the holder hook: a house bot on this account stops, or records the change (C4-SPEC ruling 127).
  runOutsideLock(() => {
    void import("./house-bot/holder-hook").then((m) => m.onHolderAccountChanged(userId, "EMAIL_CHANGED", { byOfficer: opts.byOfficer === true })).catch(() => {});
  });
  audit({ category: "COMPLIANCE", action: "user.email.set", actorId: userId, targetType: "User", targetId: userId, payload: { verified: false, by, proof } });
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
      titleZh: "邮箱地址已更改",
      bodyEn: `Your account email was changed to ${next}. If this wasn't you, contact support immediately.`,
      bodySw: "Barua pepe ya akaunti yako imebadilishwa. Kama si wewe, wasiliana na usaidizi mara moja.",
      bodyZh: `您账户的邮箱已更改为 ${next}。如果这不是您本人操作，请立即联系客服。`,
      href: "/profile/account",
    });
  }
  return { ok: true, changed: true, verificationSent: send.ok, deliveryIssue: send.ok ? undefined : send.reason };
}

/**
 * THE PLAYER'S ONE EMAIL DOOR (route audit 2026-10-06, A1) — add, change and remove alike.
 *
 * 🔴 The address is a recovery factor: it receives password-reset links, and confirming it opens depositing. With no
 * password asked, a minute with an unlocked, signed-in phone was enough to plant an address, confirm it from that same
 * session, run forgot-password and own the account. So every real change asks for the current password, through the one
 * re-auth check (`reauth.ts`) and its `auth.reauth` bucket, which `changePassword` shares. An unchanged address is a no-op
 * that asks nothing and spends nothing. A dormant password-less account (the code-sign-in era) has no password to ask:
 * it passes with proof "none", recorded on the audit row as a known residual.
 * ⛔ EMAIL_TAKEN is answered only AFTER the password (inside `setUserEmail`): a session holder without the password
 * cannot use this door to ask which addresses hold an account.
 */
export async function changeOwnEmail(userId: string, rawEmail: string, currentPassword: unknown): Promise<
  | { ok: true; changed: boolean; verificationSent: boolean; deliveryIssue?: SendResult["reason"] }
  | { ok: false; error: string; code: string; reason?: FailureReason; retryAfterSec?: number }
> {
  const parsed = z.string().trim().toLowerCase().email().max(254).or(z.literal("")).safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: "Enter a valid email.", code: "EMAIL_INVALID", reason: "email_invalid" };
  const next = parsed.data;
  const user = await db.user.findById(userId);
  if (!user) return { ok: false, error: "User not found.", code: "NOT_FOUND", reason: "not_found" };
  if (next === (user.email ?? "").trim().toLowerCase()) return { ok: true, changed: false, verificationSent: false }; // a no-op needs no password and spends nothing
  const re = await verifyCurrentPassword(userId, currentPassword, "email_change");
  let proof: "password" | "none";
  if (re.ok) proof = "password";
  else if (re.code === "PW_NOT_SET") proof = "none"; // dormant password-less accounts: a recorded residual
  else if (re.code === "RATE_LIMITED") return { ok: false, error: re.error, code: re.code, retryAfterSec: re.retryAfterSec };
  else return { ok: false, error: re.error, code: re.code, reason: re.reason };
  return setUserEmail(userId, next, { proof }); // add, change and clear alike; EMAIL_TAKEN is checked only after the password
}

/** What a confirmation token says about the account as it stands NOW. */
type EmailVerifyPeek =
  | { status: "pending"; userId: string; email: string }
  | { status: "already" | "mismatch"; userId: string }
  | { status: "invalid" };

/**
 * Read a confirmation token against the account. ⛔ WRITES NOTHING — it only answers which state the link is in, so the
 * page can decide whether it may confirm on open or must ask for proof first.
 */
export async function peekEmailVerifyToken(token: string | null | undefined): Promise<EmailVerifyPeek> {
  const payload = verifySession<VerifyTokenPayload>(token ?? undefined);
  if (!payload || payload.purpose !== "email-verify" || !payload.userId || !payload.email) {
    return { status: "invalid" }; // bad MAC, wrong purpose, missing fields, or expired (verifySession checks exp)
  }
  const user = await db.user.findById(payload.userId);
  if (!user) return { status: "invalid" };
  const email = payload.email.trim().toLowerCase();
  // The address changed since the link was issued → this link is stale.
  if ((user.email ?? "").trim().toLowerCase() !== email) return { status: "mismatch", userId: payload.userId };
  if (user.emailVerifiedAt) return { status: "already", userId: payload.userId };
  return { status: "pending", userId: payload.userId, email };
}

/**
 * ⭐ THE ONLY WRITER OF A CONFIRMATION: nothing else in `src/` sets a non-null `emailVerifiedAt` (the dev-only
 * /auth/demo route aside). Vodacom S9 section 3.6: the link and the 6-digit code both call this; the code passes via
 * "code", proof "session". It re-reads the account, so a confirmation lands only on the address on file NOW: a missing
 * account is invalid, a different address (or none at all) is a mismatch, a confirmed one is already done.
 */
export async function markEmailVerified(
  userId: string,
  email: string,
  via: "link" | "code",
  proof: "session" | "password",
): Promise<"verified" | "already" | "mismatch" | "invalid"> {
  const user = await db.user.findById(userId);
  if (!user) return "invalid";
  const current = (user.email ?? "").trim().toLowerCase();
  // ⛔ An account with no address has nothing to confirm: a confirmation is never stamped onto an empty one.
  if (!current || current !== email.trim().toLowerCase()) return "mismatch";
  if (user.emailVerifiedAt) return "already";
  await db.user.update(userId, { emailVerifiedAt: new Date().toISOString() });
  audit({ category: "COMPLIANCE", action: "user.email.verified", actorId: userId, targetType: "User", targetId: userId, payload: { via, proof } });
  return "verified";
}

/**
 * 🔴 A3 (route audit 2026-10-06) · OPENING THE LINK CONFIRMS ONLY FOR THE ACCOUNT HOLDER. The page used to confirm during
 * the GET for anyone holding the link — a mail scanner pre-fetching it, or the stranger who owns a mistyped address — and
 * that address then became the deposit door and the recovery inbox of a soon-funded account. A pending link now confirms
 * on open only inside the account's OWN session; anywhere else the answer is `needs_password` and the page asks for the
 * account's password (`confirmEmailWithProof`). The states that need no proof (invalid, mismatch, already) answer as before.
 */
export async function openEmailVerifyLink(
  token: string | null | undefined,
  sessionUserId: string | null,
): Promise<{ status: "verified" | "already" | "mismatch" | "invalid" | "needs_password"; tokenUserId?: string }> {
  const p = await peekEmailVerifyToken(token);
  if (p.status === "invalid") return { status: "invalid" };
  if (p.status !== "pending") return { status: p.status, tokenUserId: p.userId };
  if (sessionUserId !== null && sessionUserId === p.userId) {
    return { status: await markEmailVerified(p.userId, p.email, "link", "session"), tokenUserId: p.userId };
  }
  return { status: "needs_password", tokenUserId: p.userId };
}

/**
 * The confirmation page's form (A3): confirm a pending link with PROOF that the account holder is the one confirming —
 * the account's own session, or the account's password. The password goes through the one re-auth check (`reauth.ts`,
 * purpose "email_confirm"): rate-limited on the account's own bucket, never logged, never returned.
 * ⛔ NEVER CREATES A SESSION. A password typed here proves who confirmed the address; it signs nobody in.
 */
export async function confirmEmailWithProof(
  token: string | null | undefined,
  proof: { sessionUserId: string | null; password: string | null },
): Promise<
  | { status: "verified" | "already" | "mismatch" | "invalid" | "proof_required" | "password_wrong" | "password_not_set" }
  | { status: "rate_limited"; retryAfterSec: number }
> {
  const p = await peekEmailVerifyToken(token);
  if (p.status !== "pending") return { status: p.status };
  if (proof.sessionUserId !== null && proof.sessionUserId === p.userId) {
    return { status: await markEmailVerified(p.userId, p.email, "link", "session") };
  }
  if (!proof.password) return { status: "proof_required" };
  const re = await verifyCurrentPassword(p.userId, proof.password, "email_confirm");
  if (!re.ok) {
    if (re.code === "RATE_LIMITED") return { status: "rate_limited", retryAfterSec: re.retryAfterSec };
    if (re.code === "PW_CURRENT_WRONG") return { status: "password_wrong" };
    if (re.code === "PW_NOT_SET") return { status: "password_not_set" };
    return { status: "invalid" }; // NOT_FOUND: the account went away between the peek and the check
  }
  return { status: await markEmailVerified(p.userId, p.email, "link", "password") };
}
