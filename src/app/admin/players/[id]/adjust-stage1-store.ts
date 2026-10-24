/**
 * THE MAKER-CHECKER STAGE-1 STORE FOR LARGE BALANCE ADJUSTMENTS (B-4), and the step it decides.
 *
 * Same durable config-store pattern as the AML two-person queue (`admin/aml/stage1-store.ts`) — survives restarts, keyed
 * by player. One pending large adjustment per player; the second, DIFFERENT officer must submit the IDENTICAL
 * direction+amount to countersign, else the pending record is replaced with their proposal.
 *
 * Lives in its own module (not the "use server" actions file, which may export only actions) so the step can be driven
 * without a session — `test:second-officer-switch` drives it in both positions of the Owner's setting.
 *
 * ⭐ FEE-TAX R1 · THE TWO-PERSON RULE IS THE OWNER'S "SECOND-OFFICER CHECKS" SETTING (ruling 6 of 2026-10-24,
 * `second-officer-policy.ts`). While it is ON — a stored ON, or a read that fails; nothing stored is the Owner's OFF — an
 * adjustment at or above
 * TWO_PERSON_THRESHOLD_TZS runs exactly as before R1. While it is OFF one officer's submission applies it, as one below the
 * threshold always has: the typed CREDIT/DEBIT word, the reason, the single-adjustment cap and every audit row stay.
 */
import { loadConfig, saveConfig } from "@/lib/server/config-store";
import { secondOfficerChecksOn } from "@/lib/server/second-officer-policy";
import { TWO_PERSON_THRESHOLD_TZS } from "../../aml/constants";

/** A pending large adjustment: who proposed it, when, the signed amount and the reason. */
export type AdjustStage1 = { actorId: string; at: string; signed: number; reason: string };

const ADJUST_STAGE1_KEY = (userId: string) => `balance-adjust.stage1:${userId}`;
const adjustStage1Mem = new Map<string, AdjustStage1>();

export async function getAdjustStage1(userId: string): Promise<AdjustStage1 | null> {
  const mem = adjustStage1Mem.get(userId);
  if (mem) return mem;
  const persisted = await loadConfig<AdjustStage1>(ADJUST_STAGE1_KEY(userId));
  if (persisted) adjustStage1Mem.set(userId, persisted);
  return persisted;
}

export async function setAdjustStage1(userId: string, sig: AdjustStage1 | null): Promise<void> {
  if (sig) adjustStage1Mem.set(userId, sig); else adjustStage1Mem.delete(userId);
  await saveConfig(ADJUST_STAGE1_KEY(userId), sig);
}

/** What `adjustBalanceAction` does with one submission. */
export type AdjustStep =
  /** Apply it now. `countersigns`: the pending proposal this act completes (cleared after the money moved), or null.
   *  `large`: at or above the two-person line — so an apply with no proposal behind it is one officer's act on a large
   *  sum, which only the Owner's setting OFF allows (the action records it as such). */
  | { kind: "apply"; countersigns: AdjustStage1 | null; large: boolean }
  /** Recorded as the first approval; nothing moved. */
  | { kind: "first" }
  /** A different amount from the pending proposal: recorded as a NEW first approval in its place; nothing moved. */
  | { kind: "replaced"; previous: AdjustStage1 }
  /** The officer who proposed it submitted it again: refused, nothing changed. */
  | { kind: "same" };

/**
 * ⭐ THE TWO-PERSON STEP FOR ONE MANUAL ADJUSTMENT. Below TWO_PERSON_THRESHOLD_TZS: apply, as always. At or above it:
 *   · ON  — no pending proposal: record this one (`first`); the SAME officer again: refused (`same`); a different officer
 *           with another amount: replace the proposal (`replaced`); a different officer with the identical amount: apply,
 *           completing the proposal (`apply`, `countersigns`);
 *   · OFF — apply. A pending proposal of the identical amount is completed by it (whoever proposed it, this officer
 *           included), so it can never be countersigned a second time later; one of another amount is left as it was.
 */
export async function largeAdjustmentStep(userId: string, officerId: string, signed: number, reason: string): Promise<AdjustStep> {
  if (Math.abs(signed) < TWO_PERSON_THRESHOLD_TZS) return { kind: "apply", countersigns: null, large: false };
  const first = await getAdjustStage1(userId);
  if (!(await secondOfficerChecksOn())) {
    return { kind: "apply", countersigns: first && first.signed === signed ? first : null, large: true };
  }
  if (!first) {
    await setAdjustStage1(userId, { actorId: officerId, at: new Date().toISOString(), signed, reason });
    return { kind: "first" };
  }
  if (first.actorId === officerId) return { kind: "same" };
  if (first.signed !== signed) {
    // A different figure is a NEW proposal, not a countersign — replace stage-1.
    await setAdjustStage1(userId, { actorId: officerId, at: new Date().toISOString(), signed, reason });
    return { kind: "replaced", previous: first };
  }
  return { kind: "apply", countersigns: first, large: true };
}
