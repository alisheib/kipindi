"use server";

import { safeError } from "@/lib/server/safe-error";
import { fieldError, type ActionFailure } from "@/lib/server/field-error";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { verifyChainFull } from "@/lib/server/audit";
import { audit } from "@/lib/server/audit";
import { revalidatePath } from "next/cache";
import { setSupportConfig, getSupportConfig, SUPPORT_CONFIG_KEY } from "@/lib/support-config";
// `PlatformConfig` is imported for the RETURN TYPES below only (DG-S-05 rule 4): naming the
// failure side `ActionFailure` means naming the success side too, and the success side of the
// two platform writers is whatever `setPlatformConfig` hands back — spelled out here rather
// than left to inference so the client can read `r.field` without an `in` guard.
import { setPlatformConfig, type PlatformConfig } from "@/lib/server/platform-config";
import { saveConfig } from "@/lib/server/config-store";
import { requireStaff } from "@/lib/server/rbac-guard";

// RBAC: authorization is data-driven — requireStaff checks this role's canAct for the
// domain (Owner/ADMIN bypasses), audits a blocked attempt, then enforces step-up 2FA.
async function requireAdmin() {
  return requireStaff("ops");
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

export async function updateSupportConfigAction(
  formData: FormData,
): Promise<{ ok: true } | ActionFailure> {
  const session = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const helpline = String(formData.get("helpline") ?? "").trim();
  /* ⭐ DG-S-05 — the refusal NAMES the control the operator has to fix. The sentence is
     untouched; the only new thing is the address. `"support-email"` is the `data-field` on the
     <Field> wrapper in `system-client.tsx`, and the two strings must match — a typo degrades to
     today's behaviour (a toast, no focus), never to a jump at the wrong box.
     ⚠️ ONLY this one of the three inputs is addressed: `phone` and `helpline` are optional here
     and have no refusal of their own, so there is nothing to point at for them. */
  if (!email) return fieldError("support-email", "Email is required.");
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

export async function updatePlatformTimezoneAction(
  formData: FormData,
): Promise<{ ok: true; config: PlatformConfig } | ActionFailure> {
  const s = await requireAdmin();
  const tz = String(formData.get("timezone") ?? "").trim();
  /* ⭐ DG-S-05 — same sentence, now with an address. `"timezone"` is the `data-field` on the
     wrapper around the <Select> in `system-client.tsx`; the Select's trigger is a
     `role="combobox"` <button>, which `focusFirstInvalid` reaches because it focuses ANY
     focusable control inside the wrapper, not just an <input>. */
  if (!tz) return fieldError("timezone", "Timezone is required.");
  try {
    /* ⚠️ THE OTHER TIMEZONE REFUSAL IS RELAYED, NOT ADDRESSED. `setPlatformConfig` answers an
       unparseable zone with `Invalid timezone: "…"`, which is field-shaped and would deserve
       `"timezone"` — but it is raised inside a SHARED writer (`platform-config.ts`) that other
       callers relay too, and re-wrapping it here would mean adding a branch to a money-adjacent
       config path for a case this form cannot reach: the <Select> only ever submits one of 22
       fixed IANA values. Left exactly as it returns; noted so it is a decision, not an
       oversight. */
    const r = await setPlatformConfig({ timezone: tz }, s.userId);
    revalidatePath("/admin/system");
    return r;
  } catch (err) {
    return { ok: false as const, error: safeError(err, "Timezone update failed") };
  }
}

/** §9.3 #5 — site-wide broadcast banner shown to every player. Audited. */
export async function setAnnouncementAction(
  formData: FormData,
): Promise<{ ok: true; config: PlatformConfig } | ActionFailure> {
  const s = await requireAdmin();
  const active = String(formData.get("active") ?? "") === "true";
  const message = String(formData.get("message") ?? "").trim().slice(0, 280);
  const toneRaw = String(formData.get("tone") ?? "info");
  const tone = (["info", "warning", "success"].includes(toneRaw) ? toneRaw : "info") as "info" | "warning" | "success";
  /* ⭐ DG-S-05 — the condition has TWO halves and only ONE of them is a place to send anyone.
     `active` is a TOGGLE the operator has just deliberately switched on; the missing item is the
     text. So the address is `"announcement-message"` — ⛔ never `"active"`, which would take the
     cursor to the switch and tell them the thing they meant is the thing that is wrong.
     (`tone` is never refused: an unrecognised value falls back to "info" above.) */
  if (active && !message) return fieldError("announcement-message", "Add a message before publishing the banner.");
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
