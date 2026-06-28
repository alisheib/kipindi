"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { provisionTotp, verifyTotp, removeTotp, hasTotp } from "@/lib/server/totp";
import { ADMIN_CONSOLE_ROLES } from "@/lib/server/roles";

const ADMIN_ROLES = ADMIN_CONSOLE_ROLES; // role tier — see @/lib/server/roles

async function requireAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  if (!(u && ADMIN_ROLES.has(u.role))) redirect("/auth/admin");
  return { session, user: u };
}

export async function provisionTotpAction() {
  const { session, user } = await requireAdmin();
  const label = user?.displayName ?? user?.phoneE164 ?? session.userId.slice(0, 12);
  const result = await provisionTotp(session.userId, label);
  return { ok: true as const, ...result };
}

export async function verifyTotpAction(formData: FormData) {
  const { session } = await requireAdmin();
  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false as const, error: "Enter the 6-digit code from your authenticator app." };
  }
  const ok = await verifyTotp(session.userId, code);
  if (!ok) return { ok: false as const, error: "Code didn't match. Try again — codes refresh every 30 seconds." };
  revalidatePath("/admin/2fa/setup");
  return { ok: true as const };
}

export async function removeTotpAction() {
  const { session } = await requireAdmin();
  await removeTotp(session.userId);
  revalidatePath("/admin/2fa/setup");
  return { ok: true as const };
}

export async function checkTotpAction(): Promise<{ enabled: boolean }> {
  const { session } = await requireAdmin();
  return { enabled: await hasTotp(session.userId) };
}
