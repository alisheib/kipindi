"use server";

import { safeError } from "@/lib/server/safe-error";
import { fieldError, type ActionFailure } from "@/lib/server/field-error";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { verifyChainFull } from "@/lib/server/audit";
import { audit } from "@/lib/server/audit";
import { revalidatePath } from "next/cache";
import { setSupportConfig } from "@/lib/server/support-config";
// ⭐ The dial-target derivation lives beside the defaults, in the client-safe half, so the admin
// FORM can preview exactly what this action will store rather than the operator finding out from
// a dead tel: link on the public site.
import { toDialTarget } from "@/lib/support-config";
// `PlatformConfig` is imported for the RETURN TYPES below only (DG-S-05 rule 4): naming the
// failure side `ActionFailure` means naming the success side too, and the success side of the
// two platform writers is whatever `setPlatformConfig` hands back — spelled out here rather
// than left to inference so the client can read `r.field` without an `in` guard.
import { setPlatformConfig, type PlatformConfig } from "@/lib/server/platform-config";
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
  /* ⭐ DG-S-05 — the refusal NAMES the control the operator has to fix. The sentence is
     untouched; the only new thing is the address. `"support-email"` is the `data-field` on the
     <Field> wrapper in `system-client.tsx`, and the two strings must match — a typo degrades to
     today's behaviour (a toast, no focus), never to a jump at the wrong box.
     ⚠️ ~~ONLY this one of the two inputs is addressed: `phone` is optional here and has no
     refusal of its own, so there is nothing to point at for it.~~ **No longer true as of
     2026-09-10** — `phone` now has two refusals of its own (blank, and undialable), both
     addressed to `"support-phone"`. This note is corrected rather than deleted because it is
     the concession that pointed at the defect in the first place. */
  if (!email) return fieldError("support-email", "Email is required.");
  /* 🔴 `phone` NOW HAS A REFUSAL OF ITS OWN, AND THE COMMENT BELOW USED TO CONCEDE IT DID NOT.
     Before 2026-09-10 this action validated the email and nothing else: clearing the phone saved
     `""`, so `/help` rendered an empty <p> inside a live `<a href="tel:">`, and the refusal a
     permanently self-excluded player receives read "Support: " with nothing after it. Free text
     produced dial targets like `tel:+255222115811ext204`. ⭐ `toDialTarget` decides dialability —
     the same function the form previews — so the console cannot save a number it could not call. */
  if (!phone) return fieldError("support-phone", "Phone is required — it is published on /help and in the self-exclusion refusal.");
  const phoneTel = toDialTarget(phone);
  if (!phoneTel) {
    /* ⚠️ THE EXAMPLES ARE SPECIMENS, NOT THE REAL DESK NUMBER. Naming the live number here would
       plant a fourth copy of a value that has exactly one home, and it would go stale the day the
       owner changes it — `test:support-contact` §8 caught this line doing precisely that. */
    return fieldError("support-phone", `"${phone}" is not a dialable number. Use the local form 0712 345 678, or the international form +255 712 345 678.`);
  }
  /* 🔴 `helpline` IS NO LONGER READ FROM THIS FORM, AND THAT IS THE FIX, NOT AN OMISSION
     (E-328). The row this action saved on 2026-08-19 and again on 2026-09-08 carried
     `helpline: "+255769777877"` — 50pick's own desk — because the field existed and somebody
     filled it in. It did no harm only for as long as NOTHING READ THE ROW AT ALL (E-226); the
     moment a reader existed it would have published the operator's number under "Tanzania
     Helpline" on `/legal/responsible-gambling`. The national problem-gambling line is now a
     pinned constant in `@/lib/support-config` with no setter and no persisted field, so there
     is no longer any input through which it could be moved. */
  try {
    /* Persistence AND the ADMIN audit row are the factory's now — `defineConfig` merges,
       validates, caches, saves and audits in one place, and REFUSES to write from a process
       that never hydrated rather than overwriting the operator's row with code defaults. */
    const res = setSupportConfig({ email, phone, phoneTel }, session.userId);
    if (!res.ok) return { ok: false as const, error: res.error };
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
