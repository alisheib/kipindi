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
import { rateCheck } from "@/lib/server/rate-limit";

const MAX_AVATAR_BYTES = 96 * 1024; // 96 KB after client-side resize

const BasicsSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  locale: z.enum(["EN", "SW"]).optional(),
  // Optional contact email — once on file, the player receives transactional
  // receipts (deposit/withdraw/win/KYC/etc.). Empty string clears it. Validated
  // and normalized (trim + lowercase) so what we email is always well-formed.
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(254).or(z.literal("")).optional(),
});

export async function updateProfileBasicsAction(formData: FormData): Promise<{ ok: true; emailVerificationSent?: boolean } | { ok: false; error: string }> {
  const session = await currentSession();
  if (!session) return { ok: false, error: "Sign in required." };

  const rawEmail = formData.get("email");
  const parsed = BasicsSchema.safeParse({
    displayName: formData.get("displayName"),
    locale: formData.get("locale") || undefined,
    email: rawEmail === null ? undefined : rawEmail,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const next = await db.user.update(session.userId, {
    displayName: parsed.data.displayName,
    ...(parsed.data.locale ? { locale: parsed.data.locale } : {}),
  });
  if (!next) return { ok: false, error: "User not found." };

  // Email goes through the single setUserEmail() writer so a new/changed
  // address resets verification and triggers a confirmation link — the same
  // path the KYC step uses. Only touch it when the field was actually submitted.
  let emailVerificationSent = false;
  if (parsed.data.email !== undefined) {
    const r = await setUserEmail(session.userId, parsed.data.email);
    if (!r.ok) return { ok: false, error: r.error };
    emailVerificationSent = r.verificationSent;
  }

  audit({
    category: "COMPLIANCE",
    action: "user.profile.basics_updated",
    actorId: session.userId,
    targetType: "User",
    targetId: session.userId,
    payload: { displayName: parsed.data.displayName, locale: parsed.data.locale ?? null, emailSet: parsed.data.email ? true : parsed.data.email === "" ? false : undefined },
  });
  revalidatePath("/profile");
  return { ok: true, emailVerificationSent };
}

/** Re-send the email confirmation link for the player's current address.
 *  No-op (still ok) if there's no email or it's already confirmed. */
export async function resendEmailVerificationAction(): Promise<{ ok: true; sent: boolean } | { ok: false; error: string }> {
  const session = await currentSession();
  if (!session) return { ok: false, error: "Sign in required." };
  const user = await db.user.findById(session.userId);
  if (!user) return { ok: false, error: "User not found." };
  if (!user.email) return { ok: false, error: "Add an email first." };
  if (user.emailVerifiedAt) return { ok: true, sent: false }; // already confirmed
  // Rate-limited: this is now reachable from the deposit gate, where a player who
  // is stuck will tap it repeatedly — and an attacker could otherwise use a
  // signed-in account to flood a third party's inbox with our mail (and burn our
  // sending reputation). Checked AFTER the already-confirmed no-op so a harmless
  // repeat tap on a verified account never eats budget.
  const rl = rateCheck(session.userId, "email.verify.resend");
  if (!rl.allowed) {
    return { ok: false, error: `Please wait ${Math.max(1, Math.ceil(rl.retryAfterSec ?? 60))}s before requesting another link.` };
  }
  const name = user.displayName?.trim().split(/\s+/)[0] || undefined;
  await sendEmailVerification(session.userId, user.email, name);
  audit({ category: "COMPLIANCE", action: "user.email.verification_resent", actorId: session.userId, targetType: "User", targetId: session.userId });
  return { ok: true, sent: true };
}

export async function updateAvatarAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await currentSession();
  if (!session) return { ok: false, error: "Sign in required." };

  const raw = formData.get("dataUrl");
  if (typeof raw !== "string") return { ok: false, error: "No image received." };

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
    return { ok: false, error: "Only JPEG / PNG / WebP images are accepted." };
  }
  if (raw.length > MAX_AVATAR_BYTES * 1.4) {
    return { ok: false, error: "Image is too large after compression. Try a smaller picture." };
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
