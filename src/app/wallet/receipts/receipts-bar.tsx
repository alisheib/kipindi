/**
 * THE `/wallet/receipts` QUERY BAR — Deposits / Withdrawals, the state sheet, the window (2026-10-07).
 *
 * ⭐ THE WALLET'S BAR, NARROWED — the same kit, the same arrangement, the same words for the same axes. A SERVER
 * component: every control is a `<Link replace scroll={false}>`, and the counts beside them are computed on the server
 * against the very rows the list under it shows, so a count can never disagree with the list.
 *
 * ⛔ THIS FILE IS THE `/wallet/receipts` SURFACE FOR `test:filter-language` — it carries `data-filter-rail` and renders
 * `<FilterPill>`; declared in the places §6 of `docs/PLAYER-QUERY-CAMPAIGN.md` names.
 *
 * ⚠️ NO SORT AND NO SEARCH, ON PURPOSE. A list of receipts is chronological — "newest first" is what a statement IS
 * (`wallet-bar.tsx` states the ledger's reason) — and each row opens a receipt that prints both references in full.
 */
import { FilterPill, FilterGroupKey } from "@/components/ui/filter-pill";
import { FilterSheet, FilterSheetGroup } from "@/components/markets/filter-sheet";
import {
  QUERY_BAR_CLASS,
  QUERY_BAR_ROW1_CLASS,
  QUERY_BAR_ROW2_CLASS,
  QUERY_GROUP_CLASS,
  QueryClear,
  QueryGroupDivider,
  QueryResultCount,
  QueryStrip,
} from "@/components/ui/query-bar";
import type { Dict } from "@/lib/i18n-dict";
import { cn } from "@/lib/utils";
import type { LedgerState } from "@/lib/wallet/ledger";
import {
  RECEIPT_DEFAULT_STATE,
  RECEIPT_LENSES,
  RECEIPT_STATES,
  RECEIPT_WHEN_IDS,
  buildReceiptsHref,
  hasActiveReceiptFilters,
  receiptLensLabel,
  receiptsSheetCount,
  type ReceiptQueryState,
  type ReceiptWhenId,
} from "@/lib/wallet/receipts";

export type ReceiptCounts = {
  type: Record<string, number>;
  state: Record<string, number>;
  when: Record<string, number>;
};

/** The wallet's own state words — the fold is in the filter, the row keeps its 1:1 word. */
function stateLabel(t: Dict, s: LedgerState): string {
  switch (s) {
    case "any": return t.market.oddsAny;
    case "flight": return t.wallet.stateFlight;
    case "confirmed": return t.wallet.txnStatusConfirmed;
    case "failed": return t.wallet.txnStatusFailed;
    case "reversed": return t.wallet.txnStatusReversed;
  }
}

function whenLabel(t: Dict, w: ReceiptWhenId): string {
  switch (w) {
    case "today": return t.common.rangeToday;
    case "yesterday": return t.common.rangeYesterday;
    case "7d": return t.common.range7d;
    case "30d": return t.common.range30d;
    case "all": return t.common.rangeAll;
  }
}

export function ReceiptsBar({
  state,
  counts,
  resultCount,
  t,
}: {
  state: ReceiptQueryState;
  counts: ReceiptCounts;
  /** The SAME variable the pager reads. */
  resultCount: number;
  t: Dict;
}) {
  const href = (patch: Partial<ReceiptQueryState>) => buildReceiptsHref(state, patch);
  const sheetCount = receiptsSheetCount(state);
  const resultPhrase = resultCount === 1 ? t.receipts.oneResult : t.receipts.nResults.replace("{n}", String(resultCount));

  const clear = (
    <QueryClear href={hasActiveReceiptFilters(state) ? buildReceiptsHref(RECEIPT_DEFAULT_STATE) : null} label={t.common.clearAll} />
  );

  const Chip = (p: { href: string; label: string; count?: number; on: boolean; testId: string }) => (
    <FilterPill {...p} semantics="toggle" replace scroll={false} />
  );

  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      {/* The wallet bar's own arrangement: below lg the count takes its own line under the strip, so a clipped pill
          never sits against it; from lg up the row is one line. */}
      <div className={cn(QUERY_BAR_ROW1_CLASS, "flex-wrap justify-end gap-y-1 lg:flex-nowrap")}>
        <QueryStrip ariaLabel={t.receipts.filterAria} className="basis-full lg:flex-1">
          {RECEIPT_LENSES.map((l) => (
            <Chip key={l} href={href({ type: l })} label={receiptLensLabel(t, l)} count={counts.type[l]}
              on={state.type === l} testId={`type:${l}`} />
          ))}
        </QueryStrip>
        <QueryResultCount count={resultCount} phrase={resultPhrase} />
      </div>

      <div className={QUERY_BAR_ROW2_CLASS}>
        {/* PHONE — state and window behind one button. */}
        <FilterSheet
          label={t.market.filtersOpen}
          title={t.receipts.filtersTitle}
          ariaLabel={sheetCount > 0 ? t.market.filtersAriaN.replace("{n}", String(sheetCount)) : t.market.filtersOpen}
          closeLabel={t.market.filtersClose}
          applyLabel={t.market.filtersApply.replace("{n}", resultPhrase)}
          count={sheetCount}
          footer={clear}
        >
          <FilterSheetGroup label={t.wallet.stateKey}>
            {RECEIPT_STATES.map((s) => (
              <Chip key={s} href={href({ state: s })} label={stateLabel(t, s)} count={counts.state[s]}
                on={state.state === s} testId={`state:${s}`} />
            ))}
          </FilterSheetGroup>
          <FilterSheetGroup label={t.common.when}>
            {RECEIPT_WHEN_IDS.map((w) => (
              <Chip key={w} href={href({ when: w })} label={whenLabel(t, w)} count={counts.when[w]}
                on={state.when === w} testId={`when:${w}`} />
            ))}
          </FilterSheetGroup>
        </FilterSheet>

        {/* DESKTOP — the same two axes along the bar; each divider wraps WITH its group. */}
        <div className="hidden min-w-0 items-center gap-2 lg:flex">
          <QueryGroupDivider />
          <nav aria-label={t.wallet.stateKey} className={QUERY_GROUP_CLASS}>
            <FilterGroupKey>{t.wallet.stateKey}</FilterGroupKey>
            {RECEIPT_STATES.map((s) => (
              <Chip key={s} href={href({ state: s })} label={stateLabel(t, s)} count={counts.state[s]}
                on={state.state === s} testId={`state:${s}`} />
            ))}
          </nav>
        </div>

        <div className="hidden min-w-0 items-center gap-2 lg:flex">
          <QueryGroupDivider />
          <nav aria-label={t.common.when} className={QUERY_GROUP_CLASS}>
            <FilterGroupKey>{t.common.when}</FilterGroupKey>
            {RECEIPT_WHEN_IDS.map((w) => (
              <Chip key={w} href={href({ when: w })} label={whenLabel(t, w)} count={counts.when[w]}
                on={state.when === w} testId={`when:${w}`} />
            ))}
          </nav>
        </div>

        <span className="hidden lg:contents">{clear}</span>
      </div>
    </div>
  );
}
