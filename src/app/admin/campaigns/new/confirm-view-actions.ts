"use server";

/**
 * U40b · /admin/campaigns/new — THE CONFIRM CARD'S ONE READ, asked when the officer presses "Confirm audience…" (the U40b
 * review's MAJOR: the confirmation's view is counted ON DEMAND, never on a render of the composer). The work is
 * `readConfirmCardFor` (`confirm-doors.ts`).
 *
 * ⛔ THE GATE IS ITS FIRST STATEMENT (ruling 523) — the confirmation's role rule, under the READ's own action
 * (`marketing.campaign.confirm_view`), so an audited refusal says which of the card's two acts was refused: a role that may
 * not confirm has nothing to open. The read posts what the composer's form shows (the campaign, its revision, the
 * audience's address keys) and is counted for the officer's STORED role; nothing is counted for a campaign past DRAFT, a
 * revision the form is not showing, or an audience it does not store.
 * ⛔ THE OFFICER'S READ BUDGET, right after the gate and before anything is read (`marketing.campaignConfirmRead`, the U40b
 * re-review): every read walks the audience in one of the split door's two slots, so a script — or a held-down key — may
 * not spend them for everyone. A spent budget says so, in words, with nothing counted.
 * ⛔ EXACTLY ONE ACTION LIVES HERE, and the Confirm card imports it (`test:campaign-gates` §UI 4b · `test:orphan-actions`).
 */
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { rateCheckAsync } from "@/lib/server/rate-limit";
import { confirmReadRequestOf, readConfirmCardFor } from "./confirm-doors";
import type { ConfirmReadAnswer } from "./confirm-doors";
import { COMPOSE_CONFIRM_ROLE_REFUSAL, composeConfirmReadRateLimited } from "./composer-copy";

/** ⭐ Count the confirmation's view for this officer, now — what the dialog opens on. */
export async function campaignConfirmViewAction(request: unknown): Promise<ConfirmReadAnswer> {
  const g = await softRequireStaff("growth", "marketing.campaign.confirm_view", COMPOSE_CONFIRM_ROLE_REFUSAL);
  if (!g.ok) return { ok: false, reason: "role", error: g.error };
  const rate = await rateCheckAsync(g.userId, "marketing.campaignConfirmRead");
  if (!rate.allowed) return { ok: false, reason: "rate_limited", error: composeConfirmReadRateLimited(rate.retryAfterSec) };
  return { ok: true, card: await readConfirmCardFor(g.userId, confirmReadRequestOf(request)) };
}
