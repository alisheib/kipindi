"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { MONEY_ROLES } from "@/lib/server/roles";
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
  if (!(u && MONEY_ROLES.has(u.role))) redirect("/auth/admin");
  return session;
}

/**
 * MANUAL SETTLEMENT — an officer pays out one market, by hand.
 *
 * Automatic payout is paused until the payment aggregator is integrated (see
 * lifecycle.ts), so this action is currently the ONLY thing that moves a resolved
 * market's money. It deliberately calls settleMarket WITHOUT `force`: every guard
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
