"use server";

import { revalidatePath } from "next/cache";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { settleMarket } from "@/lib/server/market-service";
import { formatTzs } from "@/lib/utils";

/**
 * Paying a market is a MONEY act, so it sits at the same tier as an emergency
 * void or an objection remedy: ADMIN / COMPLIANCE only. Never MODERATOR.
 *
 * ⛔ THIS USED TO REFUSE BY REDIRECTING TO `/auth/admin`, AND IT WROTE NO AUDIT ROW
 * (finding A2). Two problems in one line. A signed-in officer whose role lacks
 * `accounting` was bounced to the sign-in page — which reads as an expired session, not
 * as a refusal, so the officer retries the login that was never the problem. And the
 * attempt to move money by hand left **no trace at all**, while every other admin gate in
 * this codebase records `privilege_escalation_blocked` at SECURITY severity.
 * `softRequireStaff` fixes both: the officer is told why, in the action's own
 * `{ ok: false, error }` shape, and the attempt is on the record.
 */
async function requireMoneyOfficer() {
  return softRequireStaff("accounting", "settleMarket",
    "Forbidden: paying a market is a money act — accounting access is required.");
}

/**
 * MANUAL SETTLEMENT — an officer pays out one market, by hand.
 *
 * ⚠️ This comment used to say "Automatic payout is paused until the payment
 * aggregator is integrated, so this action is currently the ONLY thing that moves a
 * resolved market's money." That is NO LONGER TRUE and was stale enough to mislead:
 * `market-scheduler.ts` arms a per-market `settle` deadline at `objectionsClosedAt`
 * and calls `settleMarket(id, { actorId: "system" })` when it fires, backing off and
 * retrying on TOO_EARLY / OBJECTION_OPEN, with `reconcileMarketSchedules()` healing
 * any lost timer every ~5 minutes. Verified on production 2026-08-01: a resolved QA
 * market paid its winner with `actorId: "system"` and no officer involved.
 *
 * So this button is the MANUAL PATH ALONGSIDE the automatic one — the human standing
 * in when an operator does not want to wait for the timer — not the only way money
 * moves. Believing otherwise would lead an operator to think payouts stall without
 * them, and an engineer to think the scheduler is dead code.
 *
 * It deliberately calls settleMarket WITHOUT `force`: every guard
 * still applies and is re-checked under the market lock, so an officer cannot
 * - pay a market whose objection window is still open,
 * - pay a market with an objection standing against it, or
 * - pay a market twice.
 *
 * Pressing this button is not a bypass. It is the human standing in for the timer.
 */
export async function settleMarketAction(formData: FormData): Promise<{ ok: true; detail: string } | { ok: false; error: string }> {
  const session = await requireMoneyOfficer();
  if (!session.ok) return { ok: false, error: session.error };

  const marketId = String(formData.get("marketId") ?? "");
  if (!marketId) return { ok: false, error: "Missing market id." };

  const r = await settleMarket(marketId, { actorId: session.userId });
  if (!r.ok) {
    // TOO_EARLY / OBJECTION_OPEN / already settled — say which, don't just fail.
    return { ok: false, error: r.error };
  }

  revalidatePath("/admin/settlement");
  revalidatePath("/admin/system");
  revalidatePath("/admin/objections");
  return {
    ok: true,
    detail: `${r.data!.positionsSettled} position${r.data!.positionsSettled === 1 ? "" : "s"} settled · ${formatTzs(r.data!.winnersPaid)} paid to winners`,
  };
}
