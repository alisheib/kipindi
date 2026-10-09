import { FilterGroupKey } from "@/components/ui/filter-pill";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_WRAP_CLASS, QUERY_BAR_ROW2_CLASS, QUERY_GROUP_CLASS, QueryGroupDivider } from "@/components/ui/query-bar";
import { PillGhost } from "@/components/ui/query-bar-ghost";
import type { Dict } from "@/lib/i18n-dict";

/**
 * THE MONEY BOOKS' BAR WHILE IT LOADS — /wallet's and /wallet/receipts' (round 5's follow-up, R5-H · G-2b). The two bars
 * are one arrangement (`wallet-bar.tsx`, `receipts-bar.tsx`: the lens strip with its count, on a line of its own below
 * `lg`; then one Filters button on a phone, the state and window groups along the bar from `lg`), so their ghosts are
 * one drawing, in the bar's own classes (imported, never retyped); the lenses and the count's noun are each page's.
 * ⭐ EVERY PILL IS AS WIDE AS THE PAGE'S, IN EVERY LANGUAGE: the kit pill's box (`filter-pill.tsx`: 44px with a 1px
 * border, `px-3`, its 13px semibold label, `gap-1.5`, the 11px mono bold count) with the words set and not shown — the
 * home ghost's way (R4-J) — so a row wraps where the page's does. Measured from the repo's fonts (S/r5h/measure-bars.cts):
 * at 1024 and 1280 the page's state and window groups are two lines in Swahili and English (1269 and 1173px in 960 and
 * 1016), and /wallet's eight lenses two lines in Swahili; the receipts ghost drew twelve fixed boxes in ONE line (790px),
 * so its list landed 56px lower than it promised on a desktop, and /wallet's ghost drew no bar at all — the bar, 141px
 * on a phone, appeared from nothing over the list (R5-B named it). The counts hold two digits' room (the page prints the
 * real numbers); the result count is the phrase's own width, in `QueryResultCount`'s type, so its line is 17.25px.
 * ⛔ No `data-result-count`, no link and no live region: a ghost promises a shape, never a number or a control.
 * ⛔ Drawn for an account that has rows — the page withholds the bar for one that has none.
 */
export function MoneyBarGhost({ t, lenses, count }: { t: Dict; lenses: readonly string[]; count: string }) {
  // The two axes the money books share, in the bars' order, with the bars' words (`stateLabel`, `whenLabel`).
  const groups: ReadonlyArray<readonly [string, readonly string[]]> = [
    [t.wallet.stateKey, [t.market.oddsAny, t.wallet.stateFlight, t.wallet.txnStatusConfirmed, t.wallet.txnStatusFailed, t.wallet.txnStatusReversed]],
    [t.common.when, [t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll]],
  ];
  return (
    <div className={QUERY_BAR_CLASS} aria-hidden>
      {/* Row 1 — the lenses (scrolling below lg, wrapping from it, as `QUERY_STRIP_CLASS` does), then the result count:
          the bar's own wrapped row (`QUERY_BAR_ROW1_WRAP_CLASS`, R5-B 2026-10-09). */}
      <div className={QUERY_BAR_ROW1_WRAP_CLASS}>
        <div className="flex min-w-0 flex-1 basis-full items-center gap-1 overflow-hidden lg:flex-wrap lg:overflow-visible">
          {lenses.map((label, i) => <PillGhost key={i} label={label} />)}
        </div>
        <p className="shrink-0 font-mono text-[11.5px] tabular-nums text-transparent"><span className="rounded bg-bg-overlay">{count}</span></p>
      </div>
      {/* Row 2 — one Filters button on a phone; from lg the two groups, each in the page's own wrapper with its divider
          (`QueryGroupDivider`: the row's 29px column gap is keyed on it) and its key, so the row wraps as the page's. */}
      <div className={QUERY_BAR_ROW2_CLASS}>
        <div className="h-[44px] w-[104px] rounded-pill bg-bg-overlay kp-shimmer-track lg:hidden" />
        {groups.map(([key, chips]) => (
          <div key={key} className="hidden min-w-0 items-center gap-2 lg:flex">
            <QueryGroupDivider />
            <div className={QUERY_GROUP_CLASS}>
              <FilterGroupKey className="text-transparent">{key}</FilterGroupKey>
              {chips.map((label, i) => <PillGhost key={i} label={label} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* The pill — `filterPillClass`'s box with the label set and not shown — is `query-bar-ghost.tsx`'s `PillGhost` since round
   5's follow-up (R5-L): /results', /markets' and /leaderboard's ghosts draw the same pill, so it lives once, beside the
   other parts every bar ghost draws. */
