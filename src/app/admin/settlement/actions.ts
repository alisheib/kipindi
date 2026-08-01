"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { canAct } from "@/lib/server/rbac";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { settleMarket } from "@/lib/server/market-service";
import { formatTzs } from "@/lib/utils";

/**
 * Paying a market is a MONEY act, so it sits at the same tier as an emergency
 * void or an objection remedy: ADMIN / COMPLIANCE only. Never MODERATOR.
 */
async function requireMoneyOfficer() {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const u = await db.user.findById(session.userId);
  if (!(u && (u.role === "ADMIN" || (await canAct(u.role, "accounting"))))) redirect("/auth/admin");
  return session;
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
  await requireAdminTotp(session.userId, session.sessionId);

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
