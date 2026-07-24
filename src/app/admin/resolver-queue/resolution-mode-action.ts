"use server";

/**
 * Per-market re-check for the resolver queue.
 *
 * The GLOBAL resolution controls (auto-resolve mode + the AI pause) moved to the
 * admin top-bar "AI toolkit" dropdown (src/app/admin/_actions/ai-toolkit.ts) so no
 * AI switch lives in two places. What remains here is the ONE per-market action:
 *
 *  • recheckMarketNowAction — run the AI resolution check on ONE market right now
 *    (replaces the old global "run sentinel sweep" button). Before resolutionAt it
 *    only records the AI's read unless the outcome is genuinely locked, so it can
 *    never kill live betting on a market that has not actually settled. It passes the
 *    assessment into resolveDueMarket, so it works even when the automatic AI check
 *    is PAUSED — a deliberate, single, operator-chosen call.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import { safeError } from "@/lib/server/safe-error";
import { requireAdminTotp } from "@/lib/server/admin-guard";
import { COMPLIANCE_ROLES } from "@/lib/server/roles";

async function gate(action: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const session = await currentSession();
  if (!session) redirect("/auth/admin");
  const user = await db.user.findById(session.userId);
  if (!user || !COMPLIANCE_ROLES.has(user.role)) {
    audit({
      category: "SECURITY", action: "privilege_escalation_blocked",
      actorId: session.userId, targetType: "Action", targetId: action,
      payload: { role: user?.role ?? "unknown" },
    });
    return { ok: false, error: "Forbidden: ADMIN or COMPLIANCE role required." };
  }
  await requireAdminTotp(session.userId, session.sessionId);
  return { ok: true, userId: session.userId };
}

/**
 * Run the AI resolution check on ONE market NOW. Returns a short human-readable
 * outcome for the toast. Arms the market's timer afterwards so a market the check
 * just sealed gets its settle timer without waiting for the reconciler.
 */
export async function recheckMarketNowAction(formData: FormData): Promise<
  { ok: true; status: string; detail: string } | { ok: false; error: string }
> {
  const g = await gate("recheckMarketNow");
  if (!g.ok) return { ok: false, error: g.error };
  const marketId = String(formData.get("marketId") ?? "").trim();
  if (!marketId) return { ok: false, error: "marketId is required." };

  try {
    const { sentinelCheckOne } = await import("@/lib/server/market-sentinel");
    const { resolveDueMarket } = await import("@/lib/server/market-service");
    const { armMarket } = await import("@/lib/server/market-scheduler");

    // One paid AI call, passed into the trigger so it is not run twice.
    const assessment = await sentinelCheckOne(marketId);
    const r = await resolveDueMarket(marketId, { assessment });
    await armMarket(marketId).catch(() => {});

    audit({
      category: "ADMIN",
      action: "market.recheck_now",
      actorId: g.userId,
      targetType: "Market",
      targetId: marketId,
      payload: {
        status: r.status, outcome: r.outcome ?? null, confidence: r.confidence ?? null, mode: r.mode ?? null,
        aiDetermined: assessment?.determined ?? null, aiError: assessment?.error ?? null,
      },
    });

    const detail =
      r.status === "resolved-auto" ? `AI sealed ${r.outcome} (${r.confidence}% confidence) — settles after the objection window.`
      : r.status === "closed-human" ? `Closed for the ceremony.${r.outcome ? ` AI suggests ${r.outcome} (${r.confidence}%).` : " The AI could not determine an outcome."}`
      : r.status === "early-noop" ? "No locked outcome yet — market left open for betting; its recommendation was recorded."
      : r.status === "demo" ? "Demo market auto-resolved."
      : r.status === "claimed-elsewhere" ? "Another check is already running for this market."
      : "Nothing to do — this market is not awaiting a resolution trigger.";

    revalidatePath("/admin/resolver-queue");
    return { ok: true, status: r.status, detail };
  } catch (err) {
    return { ok: false, error: safeError(err, "Re-check failed") };
  }
}
