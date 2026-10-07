/**
 * THE RECEIPTS CONTRACT — which money movements have a receipt, and how `/wallet/receipts` is queried.
 *
 * ⭐ WHY THIS EXISTS (owner ruling 2026-10-07). A deposit no longer asks for an email — not even "add one" — so a
 * deposit's emailed receipt may never reach anybody: the address can be missing or unconfirmed, and money mail now goes
 * to confirmed addresses only. Ali's answer, in the same message: *"to make sure users have all their receipts on
 * withdrawals or deposits, in the user profile we need a tab for internal receipts."* This file is the one definition
 * that page, the single receipt and the wallet's "View receipt" link all read.
 *
 * ⭐ WHAT HAS A RECEIPT: a DEPOSIT and a WITHDRAWAL — money that crossed the platform's edge, with a gateway reference
 * a bank or Selcom can look up. Nothing else. ⛔ A bonus credit, an adjustment or a house fee is NOT a deposit or a
 * withdrawal, and until 2026-10-07 the wallet offered "View receipt" on them (it keyed on the folded display token) and
 * the receipt page called them "Deposit" or "Withdrawal" by the sign of the amount — finding S10-02. Both now ask
 * `hasReceipt` of the STORED type, and the receipt page answers 404 for anything else.
 *
 * ⭐ THE QUERY LANGUAGE IS THE WALLET'S, NARROWED — not a second one. The lens is the wallet's own `in` / `out` partition
 * (`LENS_TYPES`), plus All; the state lens is the wallet's (`LEDGER_STATES`: in flight · completed · failed · reversed);
 * the window is the product-wide player presets. ⚠️ The lens WORDS differ on purpose: /wallet calls its lenses "Money
 * in" / "Money out" (a statement of everything that moved), while a receipt is a DEPOSIT or a WITHDRAWAL — the receipt's
 * own noun (`receipts.lensDeposits` / `lensWithdrawals`; Swahili "Amana" / "Utoaji", as on the receipt).
 * ⚠️ NO SORT and NO SEARCH: a list of receipts is chronological, like the ledger it is cut from (`wallet-bar.tsx` names
 * the reason), and every row opens a receipt that prints both references in full.
 *
 * ⛔ NO SERVER IMPORTS — the page reads the store and hands rows here.
 */
import { PLAYER_PRESETS, inWindow } from "@/lib/query/windows";
import { oneOf, oneParam } from "@/lib/query/parse";
import { buildQueryHref, hasActiveFilters, sheetFilterCount } from "@/lib/query/href";
import { countsFor, filterRows, type Axes } from "@/lib/query/counts";
import { emptyKind, relaxations, type EmptyKind, type ExitCandidate, type Relaxation } from "@/lib/query/empty";
import { paymentMethodName } from "@/lib/payment-providers";
import { LEDGER_STATES, LENS_TYPES, STATE_STATUSES, type LedgerState, type TxnStatusValue, type TxnTypeValue } from "./ledger";
import type { Dict } from "@/lib/i18n-dict";

/* ─────────────────────────────── what has a receipt ──────────────────────────────── */

export const RECEIPT_TYPES = ["DEPOSIT", "WITHDRAWAL"] as const satisfies readonly TxnTypeValue[];
export type ReceiptType = (typeof RECEIPT_TYPES)[number];

/** Does a row of this STORED type have a receipt? ⛔ Ask it of the stored type, never of a display token. */
export function hasReceipt(type: string | null | undefined): type is ReceiptType {
  return !!type && (RECEIPT_TYPES as readonly string[]).includes(type);
}

/** The mark a deposit held for RETURN carries in `amlReason` (`wallet-service.ts`, an excluded or resting account). */
export const RG_RETURN_MARK = "rg_refund_due_";

/**
 * THE STATUS A PLAYER IS SHOWN for their own transaction — the stored status, with ONE translation: a deposit held for
 * RETURN reads "Reversed". It landed while the account could not take money (a self-exclusion or a break), was never
 * credited, and carries `RG_RETURN_MARK` — and it is that deposit in BOTH of its stored lives:
 *   · `AML_REVIEW` while it waits for an officer (the only way a deposit reaches that status), and
 *   · `FAILED` once the officer has returned it (`refundAmlRejection` writes FAILED and, from 2026-10-07, keeps the mark
 *     in front of the officer's reason). Without this arm the money-and-compliance review found it turning from
 *     "Reversed" into "Failed", alert glyph and all, the moment the money actually went back — contradicting the
 *     "Deposit reversed" notice and email the player already had.
 * Its in-app notice and its email both say it was reversed, and "In review" would tell the player to wait for money that
 * will never be added (the wallet result reads it the same way, 2026-10-07). A WITHDRAWAL keeps its own word.
 * ⛔ Receipts' filters, counts and chips, the receipt page, the card-return page AND /wallet's rows and state lens all
 * read THIS, so no surface files a reversed deposit under "in flight" or "failed" while another calls it reversed.
 * Officer surfaces keep the stored word.
 */
export function presentedStatus(row: { type: string; status: TxnStatusValue; amlReason?: string | null }): TxnStatusValue {
  if (row.type !== "DEPOSIT") return row.status;
  if (row.status === "AML_REVIEW") return "REVERSED";
  if (row.status === "FAILED" && (row.amlReason ?? "").startsWith(RG_RETURN_MARK)) return "REVERSED";
  return row.status;
}

/** One receipt as the list reasons about it. `amount` is the money that moved, unsigned — the receipt's own headline. */
export type ReceiptRowData = {
  id: string;
  type: ReceiptType;
  status: TxnStatusValue;
  amount: number;
  provider: string | null;
  createdAtMs: number;
};

/* ─────────────────────────────── the URL contract ──────────────────────────────── */

export const RECEIPTS_PATH = "/wallet/receipts";

export const RECEIPT_LENSES = ["all", "in", "out"] as const;
export type ReceiptLens = (typeof RECEIPT_LENSES)[number];
const RECEIPT_LENS_TYPES: Record<Exclude<ReceiptLens, "all">, readonly TxnTypeValue[]> = { in: LENS_TYPES.in, out: LENS_TYPES.out };

export const RECEIPT_STATES = LEDGER_STATES;
export const RECEIPT_WHEN_IDS = PLAYER_PRESETS;
export type ReceiptWhenId = (typeof RECEIPT_WHEN_IDS)[number];

export type ReceiptQueryState = { type: ReceiptLens; state: LedgerState; when: ReceiptWhenId };
export const RECEIPT_DEFAULT_STATE: ReceiptQueryState = { type: "all", state: "any", when: "all" };
/** The axes the phone sheet holds — and so the only ones its badge counts. The lens stays on the bar. */
export const RECEIPT_SHEET_AXES = ["state", "when"] as const;

export function parseReceiptParams(sp: Record<string, string | string[] | undefined>): ReceiptQueryState {
  const one = (k: string) => oneParam(sp, k);
  return {
    type: oneOf(RECEIPT_LENSES, one("type"), RECEIPT_DEFAULT_STATE.type),
    state: oneOf(RECEIPT_STATES, one("state"), RECEIPT_DEFAULT_STATE.state),
    when: oneOf(RECEIPT_WHEN_IDS, one("when"), RECEIPT_DEFAULT_STATE.when),
  };
}

export function buildReceiptsHref(state: ReceiptQueryState, patch: Partial<ReceiptQueryState> = {}, extra: { page?: number } = {}): string {
  return buildQueryHref(RECEIPTS_PATH, state, RECEIPT_DEFAULT_STATE, patch, extra);
}

export function hasActiveReceiptFilters(state: ReceiptQueryState): boolean {
  return hasActiveFilters(state, RECEIPT_DEFAULT_STATE);
}

export function receiptsSheetCount(state: ReceiptQueryState): number {
  return sheetFilterCount(state, RECEIPT_DEFAULT_STATE, RECEIPT_SHEET_AXES);
}

/* ─────────────────────────────── predicates, counts, empties ──────────────────────────────── */

export function receiptAxes(nowMs: number): Axes<ReceiptRowData, ReceiptQueryState> {
  return {
    type: (r, s) => s.type === "all" || RECEIPT_LENS_TYPES[s.type].includes(r.type),
    state: (r, s) => s.state === "any" || STATE_STATUSES[s.state].includes(r.status),
    // The product's one day boundary (EAT) — the same predicate the ledger and /positions use.
    when: (r, s) => inWindow(r.createdAtMs, s.when, nowMs),
  };
}

export function filterReceipts(rows: readonly ReceiptRowData[], state: ReceiptQueryState, nowMs: number): ReceiptRowData[] {
  return filterRows(rows, state, receiptAxes(nowMs));
}

/** Cross-filtered counts: each chip's number is what pressing it would show, given every OTHER axis. */
export function receiptCounts(rows: readonly ReceiptRowData[], state: ReceiptQueryState, nowMs: number) {
  const axes = receiptAxes(nowMs);
  return {
    type: countsFor(rows, state, axes, "type", RECEIPT_LENSES),
    state: countsFor(rows, state, axes, "state", RECEIPT_STATES),
    when: countsFor(rows, state, axes, "when", RECEIPT_WHEN_IDS),
  };
}

export type ReceiptExitId = "state" | "when" | "type";
const RECEIPT_EXITS: readonly ExitCandidate<ReceiptQueryState, ReceiptExitId>[] = [
  { id: "state", patch: { state: "any" } },
  { id: "when", patch: { when: "all" } },
  { id: "type", patch: { type: "all" } },
];

/**
 * The empty state's cause and its exits, from the whole book. ⭐ `in` and `out` are HEALTHY empties — "you have not
 * withdrawn anything yet" is a fact about the player, not a failure of the page, and on a money surface the difference
 * matters: "no results" over Withdrawals would invite a player to wonder whether a withdrawal went missing.
 * ⚠️ `rows` IS the whole book here: the store read is not windowed (every axis is applied over it), so the
 * population the cause and the exits are counted against is complete by construction — the trap `ledgerEmptyView`
 * documents cannot arise.
 */
export function receiptEmptyView(
  rows: readonly ReceiptRowData[],
  shown: number,
  state: ReceiptQueryState,
  nowMs: number,
): { cause: EmptyKind | null; exits: Relaxation<ReceiptQueryState, ReceiptExitId>[] } {
  const axes = receiptAxes(nowMs);
  const cause = emptyKind({
    state, defaults: RECEIPT_DEFAULT_STATE, axes, shown, total: rows.length,
    lensKey: "type", healthyEmpty: ["in", "out"], windowKey: "when",
  });
  const exits = cause && cause !== "no-rows" ? relaxations(rows, state, axes, RECEIPT_EXITS) : [];
  return { cause, exits };
}

/* ─────────────────────────────── the row cap ──────────────────────────────── */

/**
 * How many receipts one read returns. The type filter is in the STORE, so this counts deposits and withdrawals only —
 * years of an ordinary player's money. ⛔ Read `CAP + 1`: if that row came back, the cap bit, and the page SAYS so
 * (the ledger's rule — a cap a player cannot see is a page lying about how much of their history it shows).
 */
export const RECEIPT_ROW_CAP = 5_000;
export function receiptsWereCapped(rowsRead: number): boolean {
  return rowsRead > RECEIPT_ROW_CAP;
}

/* ─────────────────────────────── the words (§L3: no stored enum reaches a sentence) ──────────────────────────── */

export function receiptTypeWord(t: Dict, type: ReceiptType): string {
  return type === "DEPOSIT" ? t.wallet.receiptTypeDeposit : t.wallet.receiptTypeWithdrawal;
}

/** The shared wallet lexicon, 1:1 with the stored status — the list row, the receipt page and /wallet say one word. */
export function receiptStatusWord(t: Dict, status: TxnStatusValue): string {
  switch (status) {
    case "PENDING": return t.wallet.txnStatusPending;
    case "PROCESSING": return t.wallet.txnStatusProcessing;
    case "AML_REVIEW": return t.wallet.txnStatusReview;
    case "CONFIRMED": return t.wallet.txnStatusConfirmed;
    case "FAILED": return t.wallet.txnStatusFailed;
    case "REVERSED": return t.wallet.txnStatusReversed;
    case "CANCELLED": return t.wallet.txnStatusCancelled;
  }
}

/**
 * The payment method a player reads. ⭐ Brand names are never translated (`paymentMethodName`), but "Card" and "Bank
 * transfer" are WORDS, so they come from the dictionary — the receipt page already said "Kadi" / "银行卡" for a card, and
 * a bare `paymentMethodName` would have put English back on every Swahili and Chinese card receipt (§L4).
 */
export function methodLabel(t: Dict, provider: string | null | undefined): string {
  if (provider === "CARD") return t.wallet.methodCard;
  if (provider === "BANK_TRANSFER") return t.wallet.bankTransfer;
  return paymentMethodName(provider) ?? "—";
}

export function receiptLensLabel(t: Dict, lens: ReceiptLens): string {
  return lens === "in" ? t.receipts.lensDeposits : lens === "out" ? t.receipts.lensWithdrawals : t.common.all;
}

/** Is any listed receipt still moving? Then the page re-reads itself — and only then (§F5: silent otherwise). */
export function anyInFlight(rows: readonly ReceiptRowData[]): boolean {
  return rows.some((r) => STATE_STATUSES.flight.includes(r.status));
}
