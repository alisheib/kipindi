"use server";

import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { verifyChain } from "@/lib/server/audit";
import { audit } from "@/lib/server/audit";
import { revalidatePath } from "next/cache";
import { setSupportConfig } from "@/lib/support-config";
import { setPlatformConfig } from "@/lib/server/platform-config";
import { CONFIG_ROLES } from "@/lib/server/roles";

const ADMIN_ROLES = CONFIG_ROLES; // role tier — see @/lib/server/roles

async function requireAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  if (!(u && ADMIN_ROLES.has(u.role))) redirect("/auth/admin");
  return session;
}

export async function verifyChainAction() {
  const session = await requireAdmin();
  try {
    const result = verifyChain();
    audit({
      category: "ADMIN",
      action: "audit.chain.verified",
      actorId: session.userId,
      targetType: null,
      targetId: null,
      payload: result.valid ? { valid: true } : { valid: false, firstBreakAt: result.firstBreakAt, index: result.index },
    });
    return result;
  } catch (err) {
    return { valid: false as const, firstBreakAt: null, index: -1, error: (err as Error)?.message ?? "Verification failed" };
  }
}

export async function updateSupportConfigAction(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const helpline = String(formData.get("helpline") ?? "").trim();
  if (!email) return { ok: false as const, error: "Email is required." };
  try {
    const phoneTel = phone.replace(/[\s\-()]/g, "");
    const helplineTel = helpline.replace(/[\s\-()]/g, "");
    setSupportConfig({ email, phone, phoneTel, helpline, helplineTel });
    revalidatePath("/admin/system");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: (err as Error)?.message ?? "Config update failed" };
  }
}

export async function updatePlatformTimezoneAction(formData: FormData) {
  const s = await requireAdmin();
  const tz = String(formData.get("timezone") ?? "").trim();
  if (!tz) return { ok: false as const, error: "Timezone is required." };
  try {
    const r = await setPlatformConfig({ timezone: tz }, s.userId);
    revalidatePath("/admin/system");
    return r;
  } catch (err) {
    return { ok: false as const, error: (err as Error)?.message ?? "Timezone update failed" };
  }
}
