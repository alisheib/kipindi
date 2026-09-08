/**
 * /wallet ledger contract — money type · state · window · search.
 *
 * ⭐ THE COMPLAINT THIS ANSWERS. All seven `TxnStatus` values are already labelled 1:1 on screen
 * and **not one of them is filterable**; a player looking for the withdrawal that failed last
 * Tuesday pages through everything they have ever done, twelve rows at a time, with no search.
 *
 * 🔴 **FILTER THE STORED `TxnType`, NEVER THE UI TOKEN.** `wallet/page.tsx`'s `adaptTxn` folds
 * eleven stored types into eight display tokens — deliberately, because that token drives the
 * credit/debit SIGN and the receipt link. It folds `BONUS_CREDIT` and `ADJUSTMENT_CREDIT` into
 * `deposit`, and `HOUSE_FEE` and `ADJUSTMENT_DEBIT` into `withdraw`. ⛔ **A "Deposits" filter
 * built on that token would tell a player their bonus was a deposit** — a false statement about
 * their own money, on the one surface that exists to be the truth about it. Re-derive the fold:
 *
 *     sed -n '/const typeMap/,/};/p' src/app/wallet/page.tsx
 *
 * ⭐ AND THE LENSES ARE A PARTITION OF THE STORED ENUM, NOT A SELECTION FROM IT. Every one of the
 * twelve `TxnType` values is reachable by exactly one lens, and every one of the seven
 * `TxnStatus` values by exactly one state. That is what `test:lifecycle-reach` asserts, and it is
 * why a new enum value fails a gate instead of quietly having no way in.
 *
 * ⛔ NO SERVER IMPORTS. The page reads the store and hands rows here as `LedgerRow`.
 */
import { PLAYER_PRESETS, inWindow } from "@/lib/query/windows";
import { clampText, oneOf, oneParam } from "@/lib/query/parse";
import { buildQueryHref, hasActiveFilters, sheetFilterCount } from "@/lib/query/href";
import { countFor, countsFor, filterRows, type Axes } from "@/lib/query/counts";
import { emptyKind, relaxations, type EmptyKind, type ExitCandidate, type Relaxation } from "@/lib/query/empty";
import { MAX_QUERY_LEN } from "@/lib/search/query";

/* ─────────────────────────── the row this module reasons about ────────────────────────── */

export type TxnTypeValue =
  | "DEPOSIT" | "WITHDRAWAL" | "BET_PLACED" | "BET_PAYOUT" | "BET_REFUND" | "BONUS_CREDIT"
  | "ADJUSTMENT_DEBIT" | "ADJUSTMENT_CREDIT" | "CASHOUT" | "HOUSE_FEE"
  | "AGENT_COMMISSION" | "AGENT_COMMISSION_REVERSAL";

export type TxnStatusValue =
  | "PENDING" | "PROCESSING" | "AML_REVIEW" | "CONFIRMED" | "FAILED" | "REVERSED" | "CANCELLED";

/**
 * ⚠️ `type` AND `status` ARE THE STORED ENUMS, not the display tokens — see the header. The row
 * also carries the display `token`, because the page still renders the sign and the receipt link
 * from it; the two travel together so a reader can see they are different things.
 */
export type LedgerRow = {
  id: string;
  type: TxnTypeValue;
  status: TxnStatusValue;
  /** The folded display token (`deposit` · `withdraw` · …). ⛔ Never filtered on. */
  token: string;
  amount: number;
  description: string;
  createdAtMs: number;
};

/* ─────────────────────────────────── the URL contract ─────────────────────────────────── */

/**
 * ⭐ THE MONEY LENSES — a PARTITION of all twelve stored types.
 *
 *   in         DEPOSIT                                          the player funded the wallet
 *   out        WITHDRAWAL                                       the player took money out
 *   bet        BET_PLACED
 *   payout     BET_PAYOUT · CASHOUT                             a position paid, either way
 *   refund     BET_REFUND
 *   bonus      BONUS_CREDIT
 *   adjust     ADJUSTMENT_CREDIT · ADJUSTMENT_DEBIT · HOUSE_FEE  the house moved it
 *   commission AGENT_COMMISSION · AGENT_COMMISSION_REVERSAL
 *
 * ⛔ THE LENSES DO NOT OVERLAP, AND THAT IS A DECISION. `lib/notification-filters.ts` records
 * what overlap costs: *"a player could not tell whether 12 meant twelve things or six things
 * counted twice."* An "in"/"out" pair defined by SIGN would have swallowed bets, payouts,
 * refunds and bonuses into two buckets and made every other count ambiguous.
 *
 * ⚠️ `commission` IS OFFERED ONLY TO AN ACCOUNT THAT HAS ANY — see `visibleLedgerLenses`. A rail
 * that offers a lens which can only ever be empty is a dead end, not a filter, and this one would
 * be permanently empty for every player who is not an agent.
 */
export const LEDGER_LENSES = ["all", "in", "out", "bet", "payout", "refund", "bonus", "adjust", "commission"] as const;
export type LedgerLens = (typeof LEDGER_LENSES)[number];

export const LENS_TYPES: Record<Exclude<LedgerLens, "all">, readonly TxnTypeValue[]> = {
  in: ["DEPOSIT"],
  out: ["WITHDRAWAL"],
  bet: ["BET_PLACED"],
  payout: ["BET_PAYOUT", "CASHOUT"],
  refund: ["BET_REFUND"],
  bonus: ["BONUS_CREDIT"],
  adjust: ["ADJUSTMENT_CREDIT", "ADJUSTMENT_DEBIT", "HOUSE_FEE"],
  commission: ["AGENT_COMMISSION", "AGENT_COMMISSION_REVERSAL"],
};

/**
 * ⭐ THE STATE LENS — a PARTITION of all seven stored statuses.
 *
 *   flight     PENDING · PROCESSING · AML_REVIEW    we have it and it has not landed
 *   confirmed  CONFIRMED
 *   failed     FAILED · CANCELLED                   it did not happen; the money is not gone
 *   reversed   REVERSED                             it happened and was undone
 *
 * ⚠️ `PROCESSING` and `AML_REVIEW` join `PENDING` rather than getting their own pills because all
 * three answer one player question — *"is my money moving?"* — and the ROW still states which of
 * the three it is, 1:1, exactly as `adaptTxn` has always kept them apart. ⛔ The fold is in the
 * FILTER, never in the label; folding the label is the defect `adaptTxn`'s own comment records.
 */
export const LEDGER_STATES = ["any", "flight", "confirmed", "failed", "reversed"] as const;
export type LedgerState = (typeof LEDGER_STATES)[number];

export const STATE_STATUSES: Record<Exclude<LedgerState, "any">, readonly TxnStatusValue[]> = {
  flight: ["PENDING", "PROCESSING", "AML_REVIEW"],
  confirmed: ["CONFIRMED"],
  failed: ["FAILED", "CANCELLED"],
  reversed: ["REVERSED"],
};

/** ⛔ Derived from the shared preset list — "last 30 days" means one span across the product. */
export const LEDGER_WHEN_IDS = PLAYER_PRESETS;
export type LedgerWhenId = (typeof LEDGER_WHEN_IDS)[number];

/** The page's three SECTIONS. ⚠️ A section is not a filter — §K rule 7. */
export const WALLET_SECTIONS = ["activity", "methods", "limits"] as const;
export type WalletSection = (typeof WALLET_SECTIONS)[number];

/**
 * ⛔ `state`, NOT `status`, AND THE NAME IS LOAD-BEARING.
 *
 * `/wallet?status=…` is ALREADY taken: `wallet/deposit/actions.ts:145` and
 * `wallet/withdraw/actions.ts:117` both redirect a returning player to
 * `/wallet?deposited=<id>&amount=<n>&status=<TxnStatus>`. A filter reading `?status=` would be
 * silently applied to every player coming back from a deposit — narrowing their wallet to one
 * state they never chose, at the exact moment they are looking for the money they just sent.
 */
export const LEDGER_DEFAULTS = {
  tab: "activity" as WalletSection,
  type: "all" as LedgerLens,
  state: "any" as LedgerState,
  when: "all" as LedgerWhenId,
  q: "" as string,
};

export type LedgerQueryState = {
  tab: WalletSection;
  type: LedgerLens;
  state: LedgerState;
  when: LedgerWhenId;
  q: string;
};

export const LEDGER_DEFAULT_STATE: LedgerQueryState = { ...LEDGER_DEFAULTS };

/** The axes the phone sheet holds — and therefore the only axes its badge may count. */
export const LEDGER_SHEET_AXES = ["state", "when"] as const;

/** ⛔ The SECTION is not a filter, so `Clear` must never offer to reset it. */
const LEDGER_VIEW_STATE_AXES = ["tab"] as const;

export function parseLedgerParams(sp: Record<string, string | string[] | undefined>): LedgerQueryState {
  const one = (k: string) => oneParam(sp, k);
  return {
    tab: oneOf(WALLET_SECTIONS, one("tab"), LEDGER_DEFAULTS.tab),
    type: oneOf(LEDGER_LENSES, one("type"), LEDGER_DEFAULTS.type),
    state: oneOf(LEDGER_STATES, one("state"), LEDGER_DEFAULTS.state),
    when: oneOf(LEDGER_WHEN_IDS, one("when"), LEDGER_DEFAULTS.when),
    q: clampText(one("q"), MAX_QUERY_LEN),
  };
}

export function buildLedgerHref(
  state: LedgerQueryState,
  patch: Partial<LedgerQueryState> = {},
  extra: { page?: number } = {},
): string {
  return buildQueryHref("/wallet", state, LEDGER_DEFAULT_STATE, patch, extra);
}

export function hasActiveLedgerFilters(state: LedgerQueryState): boolean {
  return hasActiveFilters(state, LEDGER_DEFAULT_STATE, LEDGER_VIEW_STATE_AXES);
}

export function ledgerSheetCount(state: LedgerQueryState): number {
  return sheetFilterCount(state, LEDGER_DEFAULT_STATE, LEDGER_SHEET_AXES);
}

export function clearedLedgerState(state: LedgerQueryState): LedgerQueryState {
  // ⚠️ The SECTION survives a Clear: a player clearing filters on Activity has not asked to be
  //    moved to a different part of the page.
  return { ...LEDGER_DEFAULT_STATE, tab: state.tab };
}

/**
 * The lenses this account should actually be offered.
 *
 * ⛔ A RAIL THAT OFFERS A LENS WHICH CAN ONLY EVER BE EMPTY IS A DEAD END, NOT A FILTER. The same
 * rule `/markets` applies to `Watching` for a signed-out visitor. `commission` is meaningless for
 * every player who is not an agent, so it appears only once the account has such a row — and it
 * is decided from the ROWS, never from a role, so a former agent keeps the way into their own
 * history.
 */
export function visibleLedgerLenses(rows: readonly LedgerRow[]): readonly LedgerLens[] {
  const hasCommission = rows.some((r) => LENS_TYPES.commission.includes(r.type));
  return hasCommission ? LEDGER_LENSES : LEDGER_LENSES.filter((l) => l !== "commission");
}

/* ──────────────────────────────────── the predicates ──────────────────────────────────── */

export function matchesLedgerLens(row: LedgerRow, lens: LedgerLens): boolean {
  return lens === "all" || LENS_TYPES[lens].includes(row.type);
}

export function matchesLedgerState(row: LedgerRow, state: LedgerState): boolean {
  return state === "any" || STATE_STATUSES[state].includes(row.status);
}

/**
 * Same vocabulary, same spans, as `/positions` — and now literally the same code, which is what
 * that sentence used to only promise. ⚠️ `createdAtMs` is when the transaction was STAMPED.
 *
 * ⛔ `app/wallet/page.tsx`'s `windowBounds` is the RANGE twin of this predicate and is deliberately
 * left where it is: it produces `{fromMs, toMs}` for a windowed SQL read rather than a yes/no over
 * a row, and its `toMs` is generously `now + 1 day` to absorb clock skew between the app and the
 * database. Its note already records that the two must agree; they now agree by sharing this
 * file's day boundary rather than by two copies of the same four lines.
 */
export function matchesLedgerWindow(row: LedgerRow, when: LedgerWhenId, nowMs: number): boolean {
  return inWindow(row.createdAtMs, when, nowMs);
}

export function ledgerAxes(
  nowMs: number,
  matchesText: (row: LedgerRow) => boolean,
): Axes<LedgerRow, LedgerQueryState> {
  return {
    type: (r, s) => matchesLedgerLens(r, s.type),
    state: (r, s) => matchesLedgerState(r, s.state),
    when: (r, s) => matchesLedgerWindow(r, s.when, nowMs),
    q: (r, s) => !s.q || matchesText(r),
  };
}

/* ──────────────────────────────── filtering + counting ────────────────────────────────── */

export function filterLedger(
  rows: readonly LedgerRow[],
  state: LedgerQueryState,
  nowMs: number,
  matchesText: (row: LedgerRow) => boolean,
): LedgerRow[] {
  return filterRows(rows, state, ledgerAxes(nowMs, matchesText));
}

export function ledgerCounts(
  rows: readonly LedgerRow[],
  state: LedgerQueryState,
  nowMs: number,
  matchesText: (row: LedgerRow) => boolean,
) {
  const axes = ledgerAxes(nowMs, matchesText);
  return {
    type: countsFor(rows, state, axes, "type", LEDGER_LENSES),
    state: countsFor(rows, state, axes, "state", LEDGER_STATES),
    when: countsFor(rows, state, axes, "when", LEDGER_WHEN_IDS),
  };
}

export function ledgerCountFor(
  rows: readonly LedgerRow[],
  state: LedgerQueryState,
  nowMs: number,
  matchesText: (row: LedgerRow) => boolean,
  patch: Partial<LedgerQueryState>,
): number {
  return countFor(rows, state, ledgerAxes(nowMs, matchesText), patch);
}

/* ─────────────────────────────── empty causes + exits ─────────────────────────────────── */

export type LedgerExitId = "state" | "when" | "q" | "type";

const LEDGER_EXITS: readonly ExitCandidate<LedgerQueryState, LedgerExitId>[] = [
  { id: "state", patch: { state: "any" } },
  { id: "when", patch: { when: "all" } },
  { id: "q", patch: { q: "" } },
  { id: "type", patch: { type: "all" } },
];

export function ledgerExits(
  rows: readonly LedgerRow[],
  state: LedgerQueryState,
  nowMs: number,
  matchesText: (row: LedgerRow) => boolean,
): Relaxation<LedgerQueryState, LedgerExitId>[] {
  return relaxations(rows, state, ledgerAxes(nowMs, matchesText), LEDGER_EXITS);
}

/**
 * ⭐ EVERY LENS BUT `all` IS A HEALTHY EMPTY. "You have not withdrawn anything" is a fact about
 * the player, not a failure of the page — and on a money surface the difference matters more than
 * anywhere else: *"no results"* over an empty Withdrawals lens invites a player to wonder whether
 * a withdrawal they made has gone missing.
 */
const LEDGER_HEALTHY_EMPTY: readonly string[] = LEDGER_LENSES.filter((l) => l !== "all");

export function ledgerEmptyCause(
  state: LedgerQueryState,
  nowMs: number,
  matchesText: (row: LedgerRow) => boolean,
  shown: number,
  total: number,
): EmptyKind | null {
  return emptyKind({
    state,
    defaults: LEDGER_DEFAULT_STATE,
    axes: ledgerAxes(nowMs, matchesText),
    shown,
    total,
    lensKey: "type",
    healthyEmpty: LEDGER_HEALTHY_EMPTY,
    searchKey: "q",
    windowKey: "when",
  });
}

/* ────────────────────────────────── the row cap ───────────────────────────────────────── */

/**
 * How many transactions one read may return.
 *
 * 🔴 THE CAP WAS SILENT, AND `Pagination` MADE IT WORSE. `wallet/page.tsx` read
 * `findByUser(userId, 1000)` and nothing anywhere said so — while the pager printed
 * *"1–12 of 1000"*, which reads as *"you have exactly 1000 transactions"* to the one player for
 * whom it is false. ⛔ A cap a player cannot see is a page quietly lying about how much of their
 * own money history it is showing them.
 *
 * ⭐ `/updown/history` is the honest precedent and this copies it: state the cap when it BITES,
 * and give the player a control that actually reaches past it — the date window, which is applied
 * in the DATABASE (`findByUserWindow`), not over an already-truncated page.
 */
export const LEDGER_ROW_CAP = 1000;

/**
 * Whether the cap bit — asked by reading ONE row more than the cap.
 *
 * ⛔ `rows.length === CAP` is NOT the question, and getting this wrong is how a cap notice becomes
 * a lie in the other direction: a player with exactly 1,000 transactions would be told their
 * history was truncated when it was complete. The read asks for `CAP + 1`; if that row came back,
 * there is more.
 */
export function ledgerWasCapped(rowsRead: number): boolean {
  return rowsRead > LEDGER_ROW_CAP;
}
