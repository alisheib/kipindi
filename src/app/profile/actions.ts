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

const MAX_AVATAR_BYTES = 96 * 1024; // 96 KB after client-side resize

const BasicsSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  locale: z.enum(["EN", "SW"]).optional(),
  // Optional contact email — once on file, the player receives transactional
  // receipts (deposit/withdraw/win/KYC/etc.). Empty string clears it. Validated
  // and normalized (trim + lowercase) so what we email is always well-formed.
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(254).or(z.literal("")).optional(),
});

export async function updateProfileBasicsAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
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
    // Only touch email when the field was submitted; "" clears it, a value sets it.
    ...(parsed.data.email !== undefined ? { email: parsed.data.email === "" ? null : parsed.data.email } : {}),
  });
  if (!next) return { ok: false, error: "User not found." };

  audit({
    category: "COMPLIANCE",
    action: "user.profile.basics_updated",
    actorId: session.userId,
    targetType: "User",
    targetId: session.userId,
    payload: { displayName: parsed.data.displayName, locale: parsed.data.locale ?? null, emailSet: parsed.data.email ? true : parsed.data.email === "" ? false : undefined },
  });
  revalidatePath("/profile");
  return { ok: true };
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
