"use server";

import { safeError } from "@/lib/server/safe-error";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { provisionTotp, verifyTotp, removeTotp, hasTotp } from "@/lib/server/totp";
import { isStaffRole } from "@/lib/server/roles";

// RBAC: any staff role may open the console + enrol 2FA (see isStaffRole).

async function requireAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  if (!(u && isStaffRole(u.role))) redirect("/auth/admin");
  return { session, user: u };
}

export async function provisionTotpAction(formData?: FormData) {
  const { session, user } = await requireAdmin();
  try {
    // Step-up: ROTATING an existing secret must prove possession of the current
    // authenticator — otherwise a hijacked session cookie can silently replace
    // the officer's 2FA with its own (B-3). First-time enrolment stays open.
    if (await hasTotp(session.userId)) {
      const code = String(formData?.get("code") ?? "").trim();
      if (!/^\d{6}$/.test(code) || !(await verifyTotp(session.userId, code))) {
        return { ok: false as const, error: "Enter a valid current 6-digit code to re-provision 2FA." };
      }
    }
    const label = user?.displayName ?? user?.phoneE164 ?? session.userId.slice(0, 12);
    const result = await provisionTotp(session.userId, label);
    return { ok: true as const, ...result };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Provisioning failed") };
  }
}

export async function verifyTotpAction(formData: FormData) {
  const { session } = await requireAdmin();
  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false as const, error: "Enter the 6-digit code from your authenticator app." };
  }
  try {
    const ok = await verifyTotp(session.userId, code);
    if (!ok) return { ok: false as const, error: "Code didn't match. Try again — codes refresh every 30 seconds." };
    revalidatePath("/admin/2fa/setup");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Verification failed") };
  }
}

export async function removeTotpAction(formData?: FormData) {
  const { session } = await requireAdmin();
  try {
    // Step-up: removing an EXISTING secret requires a valid current code (B-3).
    // A stolen staff session must not be able to strip the officer's 2FA and
    // then sail through requireAdminTotp on every money action.
    if (await hasTotp(session.userId)) {
      const code = String(formData?.get("code") ?? "").trim();
      if (!/^\d{6}$/.test(code) || !(await verifyTotp(session.userId, code))) {
        return { ok: false as const, error: "Enter a valid current 6-digit code to remove 2FA." };
      }
    }
    await removeTotp(session.userId);
    revalidatePath("/admin/2fa/setup");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Removal failed") };
  }
}

export async function checkTotpAction(): Promise<{ enabled: boolean }> {
  const { session } = await requireAdmin();
  try {
    return { enabled: await hasTotp(session.userId) };
  } catch {
    return { enabled: false };
  }
}
