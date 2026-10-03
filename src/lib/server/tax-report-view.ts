/**
 * GOVERNMENT TAX REPORT — what a surface SHOWS for a period: the locked snapshot when the period
 * is locked, the live figures otherwise — and, when locked, every line where the live books have
 * since moved (`docs/TAX-REPORT.md` §6). The page and the export route both call this, so a locked
 * period downloads exactly what the page shows: the figures as filed.
 *
 * ⛔ A LOCKED PERIOD NEVER PRINTS LIVE FIGURES UNDER A "LOCKED" BADGE, AND NEVER HIDES THAT THE
 * LIVE BOOKS MOVED. `drift` names each line that changed, with both figures, so a late correction
 * is visible to the officer who filed the period rather than discovered by the regulator.
 */
import { buildTaxReportData, type TaxReportData } from "./tax-report-data";
import { locksForPeriod, type TaxLock } from "./tax-locks";
import type { ProductFilter, TaxPeriod } from "@/lib/tax-report";

export type DriftLine = { line: string; locked: number; live: number; unit: "cents" | "tzs" };

export type TaxReportView = {
  /** What every surface prints — the locked snapshot, or the live figures. */
  data: TaxReportData;
  /** The live recompute, always. */
  live: TaxReportData;
  /** The live lock on this period and product, if any. */
  lock: TaxLock | null;
  /** Every lock ever taken on this period and product, newest first. */
  history: TaxLock[];
  /** Lines where the live books differ from the locked snapshot — empty when unlocked or unchanged. */
  drift: DriftLine[];
};

export function driftBetween(locked: TaxReportData, live: TaxReportData): DriftLine[] {
  const a = locked.main, b = live.main;
  const lines: DriftLine[] = [
    { line: "Sales", locked: a.report1.salesCents, live: b.report1.salesCents, unit: "cents" },
    { line: "Payout", locked: a.report1.payoutCents, live: b.report1.payoutCents, unit: "cents" },
    { line: "On hold", locked: a.report1.onHoldCents, live: b.report1.onHoldCents, unit: "cents" },
    { line: "Refunds", locked: a.report1.refundsCents, live: b.report1.refundsCents, unit: "cents" },
    { line: "Platform fee kept", locked: a.report1.feeKeptCents, live: b.report1.feeKeptCents, unit: "cents" },
    { line: "On hold brought forward", locked: a.report1.broughtForwardCents, live: b.report1.broughtForwardCents, unit: "cents" },
    { line: "Commission", locked: a.tax.commission, live: b.tax.commission, unit: "tzs" },
    { line: "TRA tax", locked: a.tax.tra, live: b.tax.tra, unit: "tzs" },
    { line: "GBT tax", locked: a.tax.gbt, live: b.tax.gbt, unit: "tzs" },
    { line: "Total Tax payable", locked: a.tax.total, live: b.tax.total, unit: "tzs" },
  ];
  return lines.filter((l) => l.locked !== l.live);
}

export async function loadTaxReportView(opts: { period: TaxPeriod; product: ProductFilter; nowMs: number }): Promise<
  { ok: true; view: TaxReportView } | { ok: false; error: string }
> {
  const live = await buildTaxReportData(opts);
  if (!live.ok) return live;
  if (opts.period.kind === "custom") {
    return { ok: true, view: { data: live.data, live: live.data, lock: null, history: [], drift: [] } };
  }
  const history = await locksForPeriod(opts.period.kind, opts.period.key, opts.product);
  const lock = history.find((l) => l.unlockedAtMs === null) ?? null;
  return {
    ok: true,
    view: {
      data: lock ? lock.snapshot : live.data,
      live: live.data,
      lock,
      history,
      drift: lock ? driftBetween(lock.snapshot, live.data) : [],
    },
  };
}
