"use server";

/**
 * /admin/affiliate — the Owner's Payable / Not payable ceremony and the ONE reward-settings Save.
 *
 * ⛔ THE GATES ARE IN THE ACTIONS' OWN PATH (ruling 523: a server action is a POST to whatever URL the
 * browser is on, so no layout or path rule can see it), and both decide on STORED rows:
 *   · `setInvitePayableAction` hands the session's user id to `switchInvitePayable`, whose FIRST check is
 *     the viewer's stored role (Owner only) — the desk switch's shape. It resolves the console's two-step
 *     status here, without redirecting, because the ceremony answers every refusal in words.
 *   · `saveAffiliateConfigAction` takes `softRequireStaff("growth")` OUTSIDE its try — one staff check and
 *     one two-step check, and a redirect it raises reaches the browser instead of a catch.
 *
 * ⛔ A REFUSAL IS NOT A REVALIDATION. Only a change that LANDED invalidates the two pages; a refused
 * ceremony must not wipe the reason the Owner has just typed. Each revalidation sits in its own try —
 * a throw there, after the act landed, must not report the opposite of the truth.
 */
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { checkAdminTotp, type AdminTotpStatus } from "@/lib/server/admin-guard";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { safeError } from "@/lib/server/safe-error";
import type { AffiliateConfig } from "@/lib/server/affiliate-config";
import {
  switchInvitePayable,
  saveInviteRewardSettings,
  type InvitePayableInput,
  type InvitePayableResult,
  type InviteRewardSettingsSave,
} from "@/lib/server/invite-rewards-ceremony";

/**
 * ⭐ MAKE INVITES PAYABLE, OR STOP PAYING — the Owner's ceremony (`invite-rewards-ceremony.ts`).
 * Never throws: every outcome is the `InvitePayableResult` union the dialog renders.
 */
export async function setInvitePayableAction(input: InvitePayableInput): Promise<InvitePayableResult> {
  let result: InvitePayableResult;
  try {
    const session = await currentSession();
    const totp: AdminTotpStatus = session ? await checkAdminTotp(session.userId, session.sessionId) : "unverified";
    result = await switchInvitePayable(session?.userId ?? null, input, { totp });
  } catch (err) {
    return { ok: false, error: safeError(err, "Nothing changed. Reload the page and try again.") };
  }
  if (result.ok && result.changed) {
    try { revalidatePath("/admin/affiliate"); } catch { /* the switch landed; a stale page is the smaller harm */ }
    try { revalidatePath("/profile/invite"); } catch { /* the switch landed; a stale page is the smaller harm */ }
  }
  return result;
}

/**
 * ⭐ THE ONE SAVE for the reward settings — locked while Not payable, `enabled` dropped from the post,
 * and a VERIFIED write (read back before "Saved" is said). See `saveInviteRewardSettings`.
 * ⛔ THE POST IS `{ baseFingerprint, changes }` (review P3, 2026-09-26): the fingerprint of the settings the
 * page loaded and ONLY the fields the officer changed. A post whose fingerprint no longer matches the row
 * is refused — an older tab cannot write its page-load values over a newer change. `warning` rides a
 * landed Save whose compliance record of raised terms could not be written.
 */
export async function saveAffiliateConfigAction(
  input: InviteRewardSettingsSave,
): Promise<{ ok: true; config: AffiliateConfig; warning?: string } | { ok: false; error: string }> {
  const staff = await softRequireStaff("growth", "affiliate.config.save", "You can't change the affiliate reward settings.");
  if (!staff.ok) return staff;
  let r: { ok: true; config: AffiliateConfig; warning?: string } | { ok: false; error: string };
  try {
    r = await saveInviteRewardSettings(input, staff.userId);
  } catch (err) {
    return { ok: false, error: safeError(err, "Nothing was saved. Reload the page and try again.") };
  }
  if (r.ok) {
    try { revalidatePath("/admin/affiliate"); } catch { /* saved; a stale page is the smaller harm */ }
    try { revalidatePath("/profile/invite"); } catch { /* saved; a stale page is the smaller harm */ }
  }
  return r;
}
