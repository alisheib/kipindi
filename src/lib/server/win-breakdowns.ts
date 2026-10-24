/**
 * ⭐ A STAKE-SHARE PAYOUT ROW'S PARTS, FOR THE WALLET (programme FEE-TAX-2026-10, release R3 lane b).
 *
 * A `BET_PAYOUT` row records the NET credited (`amount`) and the winnings tax withheld (`taxWithheld`); its position records
 * the stake and its own fee (`Position.feeTzs`). The wallet's activity row shows how the payout adds up —
 * stake − our fee + winnings − winnings tax = paid (`stakeShareWinReceipt`) — so it needs the position's two figures beside
 * the row's. This reads them for ONE page of rows (never the ledger cap), in ONE batched read (`positionStore.getMany`).
 *
 * ⛔ A position is used only if it is this player's own, and only if it carries its fee. A failed read, or a position without
 * its fee, gives that row NO breakdown — never one re-derived from a rate ("show nothing rather than guess", AGENTS.md §6).
 * Every row of every older model withholds no tax and is never read, so the wallet reads exactly as before for them.
 */
import { positionStore } from "./market-dal";
import type { StoredTxn } from "./store";

/** What a payout row carries for its breakdown: its position's stake and own fee, and the row's tax withheld. */
export type WinBreakdown = { stake: number; fee: number; tax: number };

/** Each stake-share payout row's parts, keyed by transaction id. Never throws. */
export async function winBreakdownsFor(
  rows: ReadonlyArray<Pick<StoredTxn, "id" | "type" | "taxWithheld" | "positionId">>,
  userId: string,
): Promise<Map<string, WinBreakdown>> {
  const out = new Map<string, WinBreakdown>();
  const payouts = rows.filter((x) => x.type === "BET_PAYOUT" && (x.taxWithheld ?? 0) > 0 && !!x.positionId);
  if (payouts.length === 0) return out;
  try {
    const positions = await positionStore.getMany(payouts.map((x) => x.positionId as string));
    const mine = new Map(positions.filter((p) => p.userId === userId).map((p) => [p.id, p] as const));
    for (const x of payouts) {
      const p = mine.get(x.positionId as string);
      if (p && p.feeTzs != null) out.set(x.id, { stake: p.stake, fee: p.feeTzs, tax: x.taxWithheld });
    }
  } catch { /* the rows render without a breakdown — never a guessed one */ }
  return out;
}
