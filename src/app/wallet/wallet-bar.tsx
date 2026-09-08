/**
 * THE `/wallet` QUERY BAR — the money lenses, the state sheet, the window.
 *
 * ⛔ IT IS A SERVER COMPONENT INSIDE A CLIENT PAGE, AND THAT IS THE WHOLE ARRANGEMENT. Every
 * control is a `<Link replace scroll={false}>`, so the counts are computed on the server against
 * the SAME read the list below uses and a count can never disagree with the rows it sits above.
 * `wallet-client.tsx` stays a client component for the row disclosures and the deposit forms; the
 * bar is passed INTO it as a rendered node.
 *
 * ⛔ THIS FILE IS THE `/wallet` SURFACE FOR `test:filter-language` — it carries `data-filter-rail`
 * and renders `<FilterPill>`, which §0.5/§3.1/§3.2 require of a declared surface. Declared in the
 * four places §6 of `docs/PLAYER-QUERY-CAMPAIGN.md` names.
 *
 * ⚠️ THERE IS NO SORT, AND THAT IS A DECISION RATHER THAN AN OMISSION. A ledger is chronological:
 * "newest first" is not one of several defensible orders, it is what a statement IS, and a
 * control offering to re-order a player's money history by amount would invite the reading that
 * two rows next to each other happened next to each other. Every other query surface in this
 * campaign gets a sort; this one is named here as the exception so nobody adds it by symmetry.
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
import {
  LEDGER_STATES,
  LEDGER_WHEN_IDS,
  buildLedgerHref,
  clearedLedgerState,
  hasActiveLedgerFilters,
  ledgerSheetCount,
  type LedgerLens,
  type LedgerQueryState,
  type LedgerState,
  type LedgerWhenId,
} from "@/lib/wallet/ledger";

export type LedgerCounts = {
  type: Record<string, number>;
  state: Record<string, number>;
  when: Record<string, number>;
};

/** ⛔ Every word from the dictionary — §L3, no stored enum ever reaches a sentence. */
export function lensLabel(t: Dict, lens: LedgerLens): string {
  switch (lens) {
    case "all": return t.common.all;
    case "in": return t.wallet.typeIn;
    case "out": return t.wallet.typeOut;
    case "bet": return t.wallet.typeBet;
    case "payout": return t.wallet.typePayout;
    case "refund": return t.wallet.typeRefund;
    case "bonus": return t.wallet.typeBonus;
    case "adjust": return t.wallet.typeAdjust;
    case "commission": return t.wallet.typeCommission;
  }
}

function stateLabel(t: Dict, s: LedgerState): string {
  switch (s) {
    case "any": return t.market.oddsAny;
    // ⚠️ The three in-flight statuses share ONE pill but keep their own words on the row — the
    //    fold is in the filter, never in the label.
    case "flight": return t.wallet.stateFlight;
    case "confirmed": return t.wallet.txnStatusConfirmed;
    case "failed": return t.wallet.txnStatusFailed;
    case "reversed": return t.wallet.txnStatusReversed;
  }
}

function whenLabel(t: Dict, w: LedgerWhenId): string {
  switch (w) {
    case "today": return t.common.rangeToday;
    case "yesterday": return t.common.rangeYesterday;
    case "7d": return t.common.range7d;
    case "30d": return t.common.range30d;
    case "all": return t.common.rangeAll;
  }
}

export function WalletBar({
  state,
  lenses,
  counts,
  resultCount,
  t,
}: {
  state: LedgerQueryState;
  /** ⛔ From `visibleLedgerLenses` — `commission` only for an account that has any. */
  lenses: readonly LedgerLens[];
  counts: LedgerCounts;
  /** The SAME variable the pager reads. */
  resultCount: number;
  t: Dict;
}) {
  const href = (patch: Partial<LedgerQueryState>) => buildLedgerHref(state, patch);
  const sheetCount = ledgerSheetCount(state);
  const resultPhrase =
    resultCount === 1 ? t.wallet.oneResult : t.wallet.nResults.replace("{n}", String(resultCount));

  const clear = (
    <QueryClear
      href={hasActiveLedgerFilters(state) ? buildLedgerHref(clearedLedgerState(state)) : null}
      label={t.common.clearAll}
    />
  );

  const Chip = (p: { href: string; label: string; count?: number; on: boolean; testId: string }) => (
    <FilterPill {...p} semantics="toggle" replace scroll={false} />
  );

  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      <div className={QUERY_BAR_ROW1_CLASS}>
        <QueryStrip ariaLabel={t.wallet.filterAria}>
          {lenses.map((l) => (
            <Chip
              key={l}
              href={href({ type: l })}
              label={lensLabel(t, l)}
              count={counts.type[l]}
              on={state.type === l}
              testId={`type:${l}`}
            />
          ))}
        </QueryStrip>
        <QueryResultCount count={resultCount} phrase={resultPhrase} />
      </div>

      <div className={QUERY_BAR_ROW2_CLASS}>
        {/* PHONE — state and window behind one button. */}
        <FilterSheet
          label={t.market.filtersOpen}
          title={t.wallet.filtersTitle}
          ariaLabel={sheetCount > 0 ? t.market.filtersAriaN.replace("{n}", String(sheetCount)) : t.market.filtersOpen}
          closeLabel={t.market.filtersClose}
          applyLabel={t.market.filtersApply.replace("{n}", resultPhrase)}
          count={sheetCount}
          footer={clear}
        >
          <FilterSheetGroup label={t.wallet.stateKey}>
            {LEDGER_STATES.map((s) => (
              <Chip key={s} href={href({ state: s })} label={stateLabel(t, s)} count={counts.state[s]}
                on={state.state === s} testId={`state:${s}`} />
            ))}
          </FilterSheetGroup>
          <FilterSheetGroup label={t.common.when}>
            {LEDGER_WHEN_IDS.map((w) => (
              <Chip key={w} href={href({ when: w })} label={whenLabel(t, w)} count={counts.when[w]}
                on={state.when === w} testId={`when:${w}`} />
            ))}
          </FilterSheetGroup>
        </FilterSheet>

        {/* DESKTOP — the same two axes along the bar. */}
        <QueryGroupDivider />
        <nav aria-label={t.wallet.stateKey} className={QUERY_GROUP_CLASS}>
          <FilterGroupKey>{t.wallet.stateKey}</FilterGroupKey>
          {LEDGER_STATES.map((s) => (
            <Chip key={s} href={href({ state: s })} label={stateLabel(t, s)} count={counts.state[s]}
              on={state.state === s} testId={`state:${s}`} />
          ))}
        </nav>

        <QueryGroupDivider />
        <nav aria-label={t.common.when} className={QUERY_GROUP_CLASS}>
          <FilterGroupKey>{t.common.when}</FilterGroupKey>
          {LEDGER_WHEN_IDS.map((w) => (
            <Chip key={w} href={href({ when: w })} label={whenLabel(t, w)} count={counts.when[w]}
              on={state.when === w} testId={`when:${w}`} />
          ))}
        </nav>

        <span className="hidden lg:contents">{clear}</span>
      </div>
    </div>
  );
}
