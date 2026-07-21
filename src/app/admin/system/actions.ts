"use server";

import { safeError } from "@/lib/server/safe-error";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { verifyChainFull } from "@/lib/server/audit";
import { audit } from "@/lib/server/audit";
import { revalidatePath } from "next/cache";
import { setSupportConfig, getSupportConfig, SUPPORT_CONFIG_KEY } from "@/lib/support-config";
import { setPlatformConfig } from "@/lib/server/platform-config";
import { saveConfig } from "@/lib/server/config-store";
import { CONFIG_ROLES } from "@/lib/server/roles";
import { requireAdminTotp } from "@/lib/server/admin-guard";

const ADMIN_ROLES = CONFIG_ROLES; // role tier — see @/lib/server/roles

async function requireAdmin() {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  if (!(u && ADMIN_ROLES.has(u.role))) redirect("/auth/admin");
  await requireAdminTotp(session.userId, session.sessionId);
  return session;
}

export async function verifyChainAction() {
  const session = await requireAdmin();
  try {
    // DB-authoritative full walk (audit C6) — validates the entire persisted
    // chain, not just this instance's in-memory ring, so it stays correct when
    // the platform runs on more than one container.
    const result = await verifyChainFull();
    audit({
      category: "ADMIN",
      action: "audit.chain.verified",
      actorId: session.userId,
      targetType: null,
      targetId: null,
      payload: result.valid
        ? { valid: true, total: result.total }
        : { valid: false, firstBreakAt: result.firstBreakAt, index: result.index, total: result.total },
    });
    return result;
  } catch (err) {
    return { valid: false as const, firstBreakAt: null, index: -1, total: 0, error: safeError(err, "Verification failed") };
  }
}

export async function updateSupportConfigAction(formData: FormData) {
  const session = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const helpline = String(formData.get("helpline") ?? "").trim();
  if (!email) return { ok: false as const, error: "Email is required." };
  try {
    const phoneTel = phone.replace(/[\s\-()]/g, "");
    const helplineTel = helpline.replace(/[\s\-()]/g, "");
    const before = getSupportConfig();
    const next = setSupportConfig({ email, phone, phoneTel, helpline, helplineTel });
    // Persist durably (SystemConfig) so the change SURVIVES the next deploy —
    // previously it lived only in an in-memory global and silently reverted to
    // the built-in DEFAULTS on every Railway push, with no audit trail. Hydrated
    // back into the cache at boot (boot-checks.ts). Audited like every sibling
    // config change (timezone / announcement / maintenance).
    await saveConfig(SUPPORT_CONFIG_KEY, next);
    audit({
      category: "ADMIN",
      action: "config.support_updated",
      actorId: session.userId,
      targetType: "System",
      targetId: "support",
      payload: { before, after: next },
    });
    revalidatePath("/admin/system");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Config update failed") };
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
    return { ok: false as const, error: safeError(err, "Timezone update failed") };
  }
}

/** §9.3 #5 — site-wide broadcast banner shown to every player. Audited. */
export async function setAnnouncementAction(formData: FormData) {
  const s = await requireAdmin();
  const active = String(formData.get("active") ?? "") === "true";
  const message = String(formData.get("message") ?? "").trim().slice(0, 280);
  const toneRaw = String(formData.get("tone") ?? "info");
  const tone = (["info", "warning", "success"].includes(toneRaw) ? toneRaw : "info") as "info" | "warning" | "success";
  if (active && !message) return { ok: false as const, error: "Add a message before publishing the banner." };
  try {
    const announcement = active || message ? { active, message, tone } : null;
    const r = await setPlatformConfig({ announcement }, s.userId);
    revalidatePath("/admin/system");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Announcement update failed") };
  }
}

/** §9.3 #1 — global maintenance switch: pause NEW bets + deposits platform-wide
 *  (withdrawals + cash-outs stay open). Audited via setPlatformConfig. */
export async function setMaintenanceModeAction(formData: FormData) {
  const s = await requireAdmin();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const note = String(formData.get("note") ?? "").trim().slice(0, 280) || null;
  try {
    const r = await setPlatformConfig({ maintenanceMode: enabled, maintenanceNote: note }, s.userId);
    revalidatePath("/admin/system");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Maintenance update failed") };
  }
}
