/**
 * ⭐ MASWALI-BUILD S6 · WHAT A SETTLED WEEK'S RECORD MUST HOLD — one rule for every reader of a week's settlement
 * columns.
 *
 * A settlement stamps its week's columns in the same transaction as its ledger group (`maswali-settlement.ts`): a
 * no-winner week stamps 0 for its fee, levies, top-up and paid and its whole sales as carried, and only its jackpot stays
 * null. Its readers: the Government Tax Report, `report-money`'s jackpot model, the per-poll fee view, and the console's
 * rollover trail (`maswali-console.ts`).
 * ⛔ So a null where a settled week must hold a figure is a FAULT in the record, never a zero: a reader that printed 0
 * would file a fee, a carry or a top-up that never was. Every reader names the gap instead.
 * ⭐ EACH READER ASKS ONLY FOR WHAT IT READS (round 5): a null in a column a reader never reads is no fault of that
 * reader's figures — the tax report prices its levies from the fee, so a week whose booked levies are null still files.
 */
import type { StoredWeek } from "./maswali-dal";

/** A settled week's settlement columns a reader can ask for. `jackpot` is asked only of a week that paid. */
export type SettlementField =
  | "settledAt" | "winningTickets" | "salesAtClose" | "rolloverIn" | "fee" | "traLevy" | "gbtLevy" | "topUp" | "paidTotal"
  | "carryOut" | "jackpot";

/** Of the columns this reader reads, the ones a SETTLED week's record lacks, in the reader's order — empty when whole. */
export function settledWeekGaps(w: StoredWeek, fields: readonly SettlementField[]): SettlementField[] {
  return fields.filter((f) => {
    if (f === "jackpot" && !((w.winningTickets ?? 0) > 0)) return false;
    const v: unknown = w[f];
    return v === null || v === undefined;
  });
}

/**
 * The words each column is said in — never its name (the console is English). ONE table, for every place a gap is
 * printed: the Pools trail, the finance window's note, the monthly pack's refusal, the reports console and the tax
 * report's exception. ⭐ Round 6 · in the Pools trail's own header words ("Settled", "Winners", "Carry in", "Carried
 * on"), so a gap named beside the trail reads as the column it sits under.
 */
export const SETTLEMENT_FIELD_WORDS: Readonly<Record<SettlementField, string>> = Object.freeze({
  settledAt: "time settled",
  winningTickets: "count of winners",
  salesAtClose: "sales at close",
  rolloverIn: "carry in",
  fee: "fee",
  traLevy: "TRA levy",
  gbtLevy: "GBT levy",
  topUp: "top-up",
  paidTotal: "total paid",
  carryOut: "amount carried on",
  jackpot: "jackpot",
});

/** "its fee", "its fee and its TRA levy", "its fee, its TRA levy and its GBT levy" — what a record lacks, in words. */
export function lacksText(fields: readonly SettlementField[]): string {
  const words = fields.map((f) => `its ${SETTLEMENT_FIELD_WORDS[f]}`);
  return words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
