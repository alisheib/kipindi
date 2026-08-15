"use server";

/**
 * Profile self-service actions.
 *
 *   • updateProfileBasicsAction — display name + locale.
 *   • updateAvatarAction — accepts a small base64 data URL (capped at 96 KB
 *     after client-side resize) and stores it on the user record.
 *
 * Both actions audit under USER.profile.* so the trail survives in the
 * compliance ring even when the field itself rotates.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/server/store";
import { currentSession } from "@/lib/server/auth-service";
import { audit } from "@/lib/server/audit";
import { setUserEmail, sendEmailVerification } from "@/lib/server/email-verification";
import { rateCheckAsync } from "@/lib/server/rate-limit";

const MAX_AVATAR_BYTES = 96 * 1024; // 96 KB after client-side resize

const BasicsSchema = z.object({
  // OPTIONAL. The email editor only wants to change an address, and when it was
  // required that component had to invent a value — it sent the literal English
  // string "Player", which then got PERSISTED as the display name of anyone who
  // had not set one. An omitted field now means "leave the name alone".
  displayName: z.string().trim().min(1).max(40).optional(),
  locale: z.enum(["EN", "SW"]).optional(),
  // Optional contact email — once on file, the player receives transactional
  // receipts (deposit/withdraw/win/KYC/etc.). Empty string clears it. Validated
  // and normalized (trim + lowercase) so what we email is always well-formed.
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(254).or(z.literal("")).optional(),
});

export async function updateProfileBasicsAction(formData: FormData): Promise<{ ok: true; emailVerificationSent?: boolean } | { ok: false; error: string; code?: string; reason?: string }> {
  // B-7 — failures carry a `code` so the trilingual editors can render their own
  // localized line (src/lib/error-copy.ts); `error` stays the audit/API truth.
  const session = await currentSession();
  if (!session) return { ok: false, error: "Sign in required.", code: "AUTH" };

  const rawEmail = formData.get("email");
  const parsed = BasicsSchema.safeParse({
    displayName: formData.get("displayName") ?? undefined,
    locale: formData.get("locale") || undefined,
    email: rawEmail === null ? undefined : rawEmail,
  });
  if (!parsed.success) {
    const issuePath = String(parsed.error.issues[0]?.path?.[0] ?? "");
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      code: issuePath === "email" ? "EMAIL_INVALID" : issuePath === "displayName" ? "NAME_INVALID" : "INVALID",
    };
  }
  const next = await db.user.update(session.userId, {
    ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
    ...(parsed.data.locale ? { locale: parsed.data.locale } : {}),
  });
  if (!next) return { ok: false, error: "User not found.", code: "NOT_FOUND" };

  // Email goes through the single setUserEmail() writer so a new/changed
  // address resets verification and triggers a confirmation link — the same
  // path the KYC step uses. Only touch it when the field was actually submitted.
  let emailVerificationSent = false;
  if (parsed.data.email !== undefined) {
    const r = await setUserEmail(session.userId, parsed.data.email);
    // ⭐ `setUserEmail` says which refusal this is; this line used to phrase-match its English.
    if (!r.ok) return { ok: false, error: r.error, code: r.code, reason: r.reason };
    emailVerificationSent = r.verificationSent;
  }

  audit({
    category: "COMPLIANCE",
    action: "user.profile.basics_updated",
    actorId: session.userId,
    targetType: "User",
    targetId: session.userId,
    payload: { displayName: parsed.data.displayName ?? null, locale: parsed.data.locale ?? null, emailSet: parsed.data.email ? true : parsed.data.email === "" ? false : undefined },
  });
  revalidatePath("/profile");
  return { ok: true, emailVerificationSent };
}

/** Re-send the email confirmation link for the player's current address.
 *  No-op (still ok) if there's no email or it's already confirmed. */
export async function resendEmailVerificationAction(): Promise<{ ok: true; sent: boolean } | { ok: false; error: string; retryAfterSec?: number }> {
  // ⚠️ `error` is a CODE, not prose. This action is rendered on player surfaces
  // in EN/SW/ZH, and it used to return English sentences that were printed
  // verbatim — the one untranslated corner of an otherwise trilingual flow.
  // The caller maps these through the dictionary.
  const session = await currentSession();
  if (!session) return { ok: false, error: "NOT_SIGNED_IN" };
  const user = await db.user.findById(session.userId);
  if (!user) return { ok: false, error: "USER_NOT_FOUND" };
  if (!user.email) return { ok: false, error: "NO_EMAIL" };
  if (user.emailVerifiedAt) return { ok: true, sent: false }; // already confirmed
  // Rate-limited: this is now reachable from the deposit gate, where a player who
  // is stuck will tap it repeatedly — and an attacker could otherwise use a
  // signed-in account to flood a third party's inbox with our mail (and burn our
  // sending reputation). Checked AFTER the already-confirmed no-op so a harmless
  // repeat tap on a verified account never eats budget.
  const rl = await rateCheckAsync(session.userId, "email.verify.resend");
  if (!rl.allowed) {
    return { ok: false, error: "RATE_LIMITED", retryAfterSec: Math.max(1, Math.ceil(rl.retryAfterSec ?? 60)) };
  }
  const name = user.displayName?.trim().split(/\s+/)[0] || undefined;
  const send = await sendEmailVerification(session.userId, user.email, name);
  audit({ category: "COMPLIANCE", action: "user.email.verification_resent", actorId: session.userId, targetType: "User", targetId: session.userId, payload: { delivered: send.ok, reason: send.reason } });
  if (!send.ok) {
    // Do NOT claim a send that did not happen. `suppressed` is the one that
    // matters: the address hard-bounced or filed a spam complaint, so we refuse
    // to mail it and no amount of tapping Resend will ever work. Without this
    // branch the player is told "Sent — check your inbox" forever, cannot
    // deposit, and has no way out. Tell them the truth and name the way out
    // (change the address), and leave an audit trail an operator can find.
    audit({
      category: "COMPLIANCE",
      action: "user.email.verification_undeliverable",
      actorId: session.userId, targetType: "User", targetId: session.userId,
      payload: { reason: send.reason },
    });
    return { ok: false, error: send.reason === "suppressed" ? "EMAIL_SUPPRESSED" : "EMAIL_SEND_FAILED" };
  }
  return { ok: true, sent: true };
}

export async function updateAvatarAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  const session = await currentSession();
  if (!session) return { ok: false, error: "Sign in required.", code: "AUTH" };

  const raw = formData.get("dataUrl");
  if (typeof raw !== "string") return { ok: false, error: "No image received.", code: "INVALID" };

  // Empty string → clear avatar.
  if (raw === "") {
    await db.user.update(session.userId, { avatarDataUrl: null });
    audit({
      category: "COMPLIANCE",
      action: "user.avatar.cleared",
      actorId: session.userId,
      targetType: "User",
      targetId: session.userId,
      payload: {},
    });
    revalidatePath("/profile");
    return { ok: true };
  }

  // Validate shape + size budget.
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(raw)) {
    return { ok: false, error: "Only JPEG / PNG / WebP images are accepted.", code: "AVATAR_TYPE" };
  }
  if (raw.length > MAX_AVATAR_BYTES * 1.4) {
    return { ok: false, error: "Image is too large after compression. Try a smaller picture.", code: "AVATAR_SIZE" };
  }

  await db.user.update(session.userId, { avatarDataUrl: raw });
  audit({
    category: "COMPLIANCE",
    action: "user.avatar.updated",
    actorId: session.userId,
    targetType: "User",
    targetId: session.userId,
    payload: { bytes: raw.length },
  });
  revalidatePath("/profile");
  return { ok: true };
}
