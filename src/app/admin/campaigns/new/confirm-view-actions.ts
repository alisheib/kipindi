"use server";

/**
 * U40b · /admin/campaigns/new — THE CONFIRM CARD'S ONE READ, asked when the officer presses "Confirm audience…" (the U40b
 * review's MAJOR: the confirmation's view is counted ON DEMAND, never on a render of the composer). The work is
 * `readConfirmCardFor` (`confirm-doors.ts`).
 *
 * ⛔ THE GATE IS ITS FIRST STATEMENT (ruling 523) — the confirmation's own: a role that may not confirm has nothing to open,
 * and its refusal is audited like any other. The read posts what the composer's form shows (the campaign, its revision, the
 * audience's address keys) and is counted for the officer's STORED role; nothing is counted for a campaign past DRAFT, a
 * revision the form is not showing, or an audience it does not store.
 * ⛔ EXACTLY ONE ACTION LIVES HERE, and the Confirm card imports it (`test:campaign-gates` §UI 4b · `test:orphan-actions`).
 */
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { confirmReadRequestOf, readConfirmCardFor } from "./confirm-doors";
import type { ConfirmReadAnswer } from "./confirm-doors";
import { COMPOSE_CONFIRM_ROLE_REFUSAL } from "./composer-copy";

/** ⭐ Count the confirmation's view for this officer, now — what the dialog opens on. */
export async function campaignConfirmViewAction(request: unknown): Promise<ConfirmReadAnswer> {
  const g = await softRequireStaff("growth", "marketing.campaign.confirm", COMPOSE_CONFIRM_ROLE_REFUSAL);
  if (!g.ok) return { ok: false, reason: "role", error: g.error };
  return { ok: true, card: await readConfirmCardFor(g.userId, confirmReadRequestOf(request)) };
}
