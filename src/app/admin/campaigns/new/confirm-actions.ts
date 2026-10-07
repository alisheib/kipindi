"use server";

/**
 * U40b · /admin/campaigns/new — THE CONFIRMATION'S ONE ACTION (ENGINE-SPEC §4.6; the work is U40a's `confirmCampaign`,
 * reached through `runConfirmFor` in `confirm-doors.ts`).
 *
 * ⛔ THE GATE IS ITS FIRST STATEMENT (ruling 523: a server action is a POST to whatever URL the browser is on, so no layout
 * or path rule can see it). `softRequireStaff("growth", "marketing.campaign.confirm", …)` decides on the viewer's STORED
 * role, audits a refusal as `privilege_escalation_blocked`, takes step-up 2FA, and answers in words — before anything else
 * is touched. "growth" is `domainForPath("/admin/campaigns")`, the composer's own domain, so no control-domain entry is owed.
 * ⛔ THREE FIELDS ARE READ (`confirmRequestOf`): the campaign, the word the dialog armed on, and the signed claim it was
 * opened on. Never a count — the server counts (OD27). The viewer is the stored role's (`confirmViewerFor`), so a viewer who
 * may not read a number is held to the typed tier here too (OD67), and a refusal names money only to a money reader.
 * ⭐ IT SAYS WHAT HAPPENED (`runConfirmFor`): confirmed, with whether its record landed (ruling 543); refused, in the
 * service's one sentence; or failed — "nothing was confirmed" only when the row reads back as still a draft.
 * ⛔ CONFIRMED SENDS NOTHING. ⛔ EXACTLY ONE ACTION LIVES HERE, and the Confirm card imports it (`test:campaign-gates` §UI 4 ·
 * `test:orphan-actions`); the trigger's read is the one action of `confirm-view-actions.ts`.
 */
import { revalidatePath } from "next/cache";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { confirmRequestOf, runConfirmFor } from "./confirm-doors";
import type { ConfirmActionResult } from "./confirm-doors";
import { COMPOSE_CONFIRM_ROLE_REFUSAL } from "./composer-copy";

/** ⭐ Confirm one draft — the text the dialog armed on, against the server's own count, on the claim it was opened on. */
export async function confirmCampaignAction(formData: FormData): Promise<ConfirmActionResult> {
  const g = await softRequireStaff("growth", "marketing.campaign.confirm", COMPOSE_CONFIRM_ROLE_REFUSAL);
  if (!g.ok) return { ok: false, reason: "role", error: g.error, freshCount: null };
  const result = await runConfirmFor(g.userId, confirmRequestOf(formData));
  if (result.ok) {
    try { revalidatePath("/admin/campaigns"); } catch { /* confirmed; a stale list is the smaller harm */ }
  }
  return result;
}
