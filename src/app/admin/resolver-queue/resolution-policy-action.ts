"use server";

/**
 * The ONE server action behind the "Two-admin authorization" toggle (resolver-queue
 * header). Sets the single `requireTwoOfficer` flag (resolution-policy.ts). Gated to
 * ADMIN/COMPLIANCE + 2FA; the flag change is COMPLIANCE-audited inside
 * setRequireTwoOfficerResolution.
 *
 * ⛔ One control, one place: this flag is set ONLY here. Do not expose it elsewhere.
 */
import { revalidatePath } from "next/cache";
import { safeError } from "@/lib/server/safe-error";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { setRequireTwoOfficerResolution } from "@/lib/server/resolution-policy";

// E-18: one definition of the domain, shared with the page that renders the toggle.
const DOMAIN = CONTROL_DOMAIN.setTwoAdminAuth;

export async function setTwoAdminAuthAction(formData: FormData): Promise<
  { ok: true; enabled: boolean } | { ok: false; error: string }
> {
  // ⛔ ONE GATE, NOT A COPY (finding A2) — the DOMAIN stays local (E-18: this action is
  // `compliance` on a `trading` page); only the DECISION moved to `softRequireStaff`.
  const session = await softRequireStaff(DOMAIN, "setTwoAdminAuth", "Forbidden: compliance access is required.");
  if (!session.ok) return { ok: false, error: session.error };

  const enabled = String(formData.get("enabled") ?? "") === "true";
  try {
    await setRequireTwoOfficerResolution(enabled, session.userId);
    revalidatePath("/admin/resolver-queue");
    return { ok: true, enabled };
  } catch (err) {
    return { ok: false, error: safeError(err, "Could not change two-admin authorization") };
  }
}
