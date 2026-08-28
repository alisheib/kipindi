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
import { audit } from "@/lib/server/audit";
import { safeError } from "@/lib/server/safe-error";
import { softRequireStaff } from "@/lib/server/rbac-guard";
import { CONTROL_DOMAIN } from "@/lib/server/control-gates";

// E-18: the domain is NOT hard-coded here. This page is `trading` while this action
// is `compliance`, so the queue must be able to ask the very same question before it
// renders the button — one definition, in control-gates.ts.
const DOMAIN = CONTROL_DOMAIN.recheckMarketNow;

// ⛔ ONE GATE, NOT A COPY (finding A2). The DOMAIN stays local and still comes from
// `CONTROL_DOMAIN` — that is E-18's point and it is untouched: this action is `compliance`
// on a `trading` page. What moved out is the DECISION (grant lookup, SECURITY audit,
// step-up 2FA), which seven admin files had each written for themselves and two had
// written wrongly.
async function gate(action: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const g = await softRequireStaff(DOMAIN, action, "Forbidden: compliance access is required.");
  return g.ok ? { ok: true, userId: g.userId } : g;
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
    //
    // 🔴 `reassessClosed` — the fix for the reason this button did nothing on most of the
    // queue. Every CLOSED market (which is what the resolver queue mostly holds) used to
    // hit `resolveDueMarket`'s `not-live` guard AFTER the paid web search had already run,
    // so the answer was bought and thrown away and the toast said "Nothing to do". With
    // the flag, a CLOSED market's RECOMMENDATION is refreshed — status, outcome and the
    // settle timer are untouched, and it still cannot seal anything on its own. This is
    // the operator's legitimate route to a citation from the market's own approved source,
    // and without it the only way past the citation gate is an override.
    //
    // ⛔ THE FLAG IS PASSED HERE AND NOWHERE ELSE. The scheduler must never re-check a
    // CLOSED market in a loop against a metered AI budget.
    const assessment = await sentinelCheckOne(marketId);
    const r = await resolveDueMarket(marketId, { assessment, reassessClosed: true });
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
      : r.status === "reassessed" ? `Recommendation refreshed — the AI now says ${r.outcome} (${r.confidence}%). This market stays closed for the ceremony; nothing was sealed.`
      // ⛔ THIS IS NOT A SOFTER "refreshed". The fresh read produced no outcome, so the
      // PRIOR recommendation was cleared — the queue derives its verdict from those
      // columns, and telling an officer "refreshed" while leaving a retracted 97% on the
      // row is how a seal happens on a reading the model has withdrawn.
      : r.status === "reassess-cleared" ? "The AI could not determine an outcome this time, so the previous recommendation was CLEARED. This market stays closed for the ceremony, and the queue will now show it as having no AI reading."
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
