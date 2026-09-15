/**
 * THE INFORMATION BLACKOUT — may staff choose this market right now? (04 N1 §3, INT-01, INT-09)
 *
 * A poll can stay LIVE while staff already know something players do not: an operator's AI result
 * check stamps its verdict on a LIVE market, a resolve claim is in flight, or the market was closed on a
 * result and then reopened (which wipes the stamps). A stake chosen by staff on such a market could be
 * chosen with that knowledge, so Enter now and targeted reactions are refused on it.
 *
 * ⛔ ITS ONLY OUTPUT IS `{ blocked: boolean }`. This module reads Sentinel and resolution fields, which
 * the engine may never read (PLAN I2); it is exempt from the info-edge walker BY NAME on the condition
 * that nothing it reads can travel further than that one boolean — never into a side, an amount, a time,
 * a `why` or a `decision`. `decide.ts` receives the boolean as an argument and never imports this file.
 *
 * ⭐ WHY THE IN-LOCK READ IS EXACT. The stamps and the seam's H3 both hold `market:<id>`. The only window
 * with no marker is an operator re-check's AI call, and during that call no verdict exists anywhere.
 */
import { RESOLVE_CLAIM_TTL_MS } from "../bulk-resolve-eligibility";
import { houseSeamStore, type HouseTx, type HouseBlackoutRow } from "../house-bot-dal";

export type InfoBlackout = { blocked: boolean };

/**
 * `countResolveClaim` (default true) — whether a young resolve claim blocks. The planner's `endTargets` passes false:
 * a claim alone never ENDS a target, because fire and H3 still refuse while it is young (N2 §4 step 9.5). The output
 * stays exactly `{blocked}`.
 */
export type BlackoutOptions = { countResolveClaim?: boolean };

/** Pure: the rule on a row, at an instant. Exported for the seam suite's truth table. */
export function blackoutFromRow(row: HouseBlackoutRow | null, nowMs: number, opts: BlackoutOptions = {}): InfoBlackout {
  if (!row || row.status !== "LIVE") return { blocked: false };
  const stamped = row.sentinelOutcome != null || row.sentinelConfidence != null || row.sentinelDetermined != null
    || row.sentinelClosedAt != null || row.resolvedOutcome != null || row.resolutionStage1By != null;
  const freshClaim = opts.countResolveClaim !== false
    && row.resolveClaimedAt != null && nowMs - Date.parse(row.resolveClaimedAt) < RESOLVE_CLAIM_TTL_MS;
  return { blocked: stamped || freshClaim || row.reopenedAt != null };
}

export async function infoBlackout(marketId: string, opts: { tx?: HouseTx } & BlackoutOptions = {}): Promise<InfoBlackout> {
  return blackoutFromRow(await houseSeamStore.blackoutRow(marketId, opts.tx), Date.now(), { countResolveClaim: opts.countResolveClaim });
}
