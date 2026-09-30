/**
 * THE AGENCY'S MEASURES, FROM THE DAILY TOTALS — the §3.10 table (the Vodacom plan S3b, §0f). Pure: the insights panel
 * and the suites call it with rows the server read.
 *
 *   Home → sheet     sheet opens from the home page  ÷  home-page views
 *   Sheet → bet      bets placed from a sheet (old journey: the dial)  ÷  sheet opens
 *   Short → deposit  confirmed deposits started from a not-enough-money notice  ÷  such notices shown
 *   Deposit → bet    confirmed deposits followed by a bet within 30 minutes  ÷  confirmed deposits (from rows)
 *
 * ⭐ EACH IS A NESTED PAIR — the numerator is, by what it counts, a subset of the denominator — so no honest ratio
 * exceeds 100%. The two halves are counted by DIFFERENT counters (a page view, a beacon, a server step), so a lost count
 * on one side can push a ratio over; that is flagged (`overCounted`) and the percentage is held at 100, never printed
 * as a conversion above the whole (E-103's lesson on this same page).
 */
export type FunnelTotalRow = { step: string; origin: string; variant: string; utmCampaign: string; count: number };

export type FunnelTotals = {
  sheetOpens: number;
  sheetOpensFromHome: number;
  sheetBets: number;
  lowBalanceShown: number;
  depositsFromLowBalance: number;
};

/** The totals for one journey (and, optionally, one campaign) over the rows given. */
export function totalsFor(rows: readonly FunnelTotalRow[], variant: "old" | "new", campaign?: string | null): FunnelTotals {
  const t: FunnelTotals = { sheetOpens: 0, sheetOpensFromHome: 0, sheetBets: 0, lowBalanceShown: 0, depositsFromLowBalance: 0 };
  for (const r of rows) {
    if (r.variant !== variant || (campaign && r.utmCampaign !== campaign)) continue;
    if (r.step === "sheet_open") { t.sheetOpens += r.count; if (r.origin === "home") t.sheetOpensFromHome += r.count; }
    else if (r.step === "bet" && (r.origin === "sheet" || r.origin === "dial")) t.sheetBets += r.count;
    else if (r.step === "low_balance") t.lowBalanceShown += r.count;
    else if (r.step === "deposit_confirmed" && r.origin === "low_balance") t.depositsFromLowBalance += r.count;
  }
  return t;
}

export type MeasureKey = "homeToSheet" | "sheetToBet" | "shortToDeposit" | "depositToBet";
export type Measure = {
  key: MeasureKey;
  numerator: number;
  denominator: number;
  /** Whole-number percentage, held at 100; null when there is no denominator yet. */
  pct: number | null;
  /** The numerator exceeds a real denominator — the two counters disagree; the percentage is held at 100. */
  overCounted: boolean;
};

export function measure(key: MeasureKey, numerator: number, denominator: number): Measure {
  const n = Math.max(0, numerator), d = Math.max(0, denominator);
  // `overCounted` marks a percentage that was HELD at 100 — with no denominator there is no percentage to mark.
  return { key, numerator: n, denominator: d, pct: d > 0 ? Math.round((Math.min(n, d) / d) * 100) : null, overCounted: d > 0 && n > d };
}

/** The four measures for one journey. `homeViews` and the deposit pair are passed in (they come from other reads). */
export function funnelMeasures(t: FunnelTotals, homeViews: number, deposits: { confirmed: number; betWithin30: number }): Measure[] {
  return [
    measure("homeToSheet", t.sheetOpensFromHome, homeViews),
    measure("sheetToBet", t.sheetBets, t.sheetOpens),
    measure("shortToDeposit", t.depositsFromLowBalance, t.lowBalanceShown),
    measure("depositToBet", deposits.betWithin30, deposits.confirmed),
  ];
}

/** The median of a list of numbers, or null for an empty one. */
export function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
