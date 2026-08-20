"use server";

import { redirect } from "next/navigation";
import { reasonKeyFor } from "@/lib/failure-banner";
import { currentSession } from "@/lib/server/auth-service";
import { closeAccount, exportUserData } from "@/lib/server/user-service";
import { audit } from "@/lib/server/audit";

export async function exportDataAction(): Promise<{ ok: true; payload: string; filename: string } | { ok: false; error: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const data = await exportUserData(session.userId);
  audit({
    category: "COMPLIANCE",
    action: "user.data.exported",
    actorId: session.userId,
    targetType: "User",
    targetId: session.userId,
  });
  return {
    ok: true,
    payload: JSON.stringify(data, null, 2),
    filename: `50pick-data-${session.userId}-${new Date().toISOString().slice(0, 10)}.json`,
  };
}

/**
 * 🔴 THE PLAYER'S OWN DOOR INTO THE DSAR REGISTER — E-33, closed 2026-08-21.
 *
 * ⛔ WHAT WAS BROKEN, AND IT WAS NOT THE FORM. Nothing on this platform could put a request
 * INTO the register: `fileDsarRequest` had exactly one caller, `fileDsarAction`, which was
 * itself a declared orphan with no UI. `/admin/privacy` therefore rendered *"No data-subject
 * access requests are on file"* permanently — not because nobody had asked, but because
 * asking was unrecordable. **The statutory clock runs from the ask**, so the half that was
 * missing is exactly the half a regulator asks about.
 *
 * ── WHY AN AUTHENTICATED SESSION IS SUFFICIENT EVIDENCE ──────────────────────
 * Ali's decision, 2026-08-21 (COMPLIANCE-DECISIONS item 2): it must be, because it is
 * ALREADY the standard this platform accepts for handing over the player's entire data
 * bundle through the "Export my data" button a few lines above. A higher bar for *asking*
 * than for *receiving* would be incoherent.
 *
 * ── ⭐ ONLY TWO OF THE FOUR RIGHTS ARE OFFERED HERE ──────────────────────────
 * ACCESS and PORTABILITY need no request at all: the export serves both, immediately and
 * without a queue. Offering them here would file a 30-day statutory obligation for something
 * the player already has in their Downloads folder — a queue full of work that is already
 * done, which is how a real request gets lost. The register exists for ERASURE and CORRECTION,
 * the two that need a human decision.
 */
export async function filePrivacyRequestAction(
  formData: FormData,
): Promise<{ ok: true; duplicate: boolean } | { ok: false; error: string; reason?: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const { fileDsarRequest, hasOpenRequest, asRequestableType } = await import("@/lib/server/privacy");
  // ⛔ AN ALLOWLIST, not a cast. `DsarType` also admits ACCESS and PORTABILITY, and a bare
  // `as DsarType` on form input would let a hand-posted body file one of those — creating the
  // 30-day obligation this function exists to avoid creating. One narrower, shared by both doors.
  const type = asRequestableType(formData.get("type"));
  if (!type) {
    return { ok: false, error: "Choose whether you are asking us to erase or to correct.", reason: "dsar_type" };
  }
  const detail = String(formData.get("detail") ?? "").trim().slice(0, 1000);

  // ⛔ ONE OPEN REQUEST PER KIND — see `hasOpenRequest`. Returning `duplicate` rather than an
  // error is deliberate: from the player's side "we already have your request" is a success,
  // not a rejection, and telling them it failed invites the retry the cap exists to stop.
  if (hasOpenRequest(session.userId, type)) return { ok: true, duplicate: true };

  fileDsarRequest({ userId: session.userId, type, reason: detail || undefined });
  return { ok: true, duplicate: false };
}

export async function changePasswordAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string; code?: string; reason?: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("new") ?? "");
  const { changePassword } = await import("@/lib/server/password-reset");
  // ⭐ THE SERVICE SAYS WHICH REFUSAL THIS IS. This action used to mint the code itself by
  // matching `changePassword`'s own English back out of the string it had just returned —
  // and `PW_WEAK` was the fallback arm, so any sentence the two patterns missed told the
  // player to choose a stronger password. `changePassword` now returns `code` and `reason`
  // at each of its three refusal sites; this action carries them, unread.
  return changePassword(session.userId, current, next);
}

export async function closeAccountAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "CLOSE MY ACCOUNT") {
    redirect(`/profile/account?reason=close_confirm_required`);
  }
  const reason = String(formData.get("reason") ?? "").slice(0, 500);
  const result = await closeAccount(session.userId, reason || undefined);
  if (!result.ok) redirect(`/profile/account?reason=${encodeURIComponent(reasonKeyFor(result))}`);
  redirect("/auth/login?closed=1");
}
