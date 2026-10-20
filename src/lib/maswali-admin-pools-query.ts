import { applySort, type SortDir } from "@/components/admin/admin-sort";
import type { PoolsTrailRow, PoolsWeek } from "@/lib/server/maswali-console";

export type PoolsLine = "ALL" | "PUBLIC" | "DRIVE";
export type OpenState = "ALL" | "OPEN" | "CLOSED" | "RESOLVING";
export type OpenSort = "week" | "state" | "sales" | "coverage" | "topUp";
export type TrailSort = "week" | "settled" | "sales" | "winners" | "paid" | "carried";

export const poolsLine = (value?: string): PoolsLine =>
  value === "PUBLIC" || value === "DRIVE" ? value : "ALL";

export const openState = (value?: string): OpenState =>
  value === "OPEN" || value === "CLOSED" || value === "RESOLVING" ? value : "ALL";

/** Filter and sort the complete collection before the view selects any page. */
export function queryOpenWeeks(
  rows: PoolsWeek[],
  query: { line: PoolsLine; state: OpenState; sort: OpenSort; dir: SortDir },
): PoolsWeek[] {
  const filtered = rows.filter((w) =>
    (query.line === "ALL" || w.row.visibility === query.line) &&
    (query.state === "ALL" || w.row.state === query.state),
  );
  return applySort(filtered, query.sort, query.dir, {
    week: (w) => w.row.code,
    state: (w) => w.row.state,
    sales: (w) => w.sales,
    coverage: (w) => w.distinctCombos,
    topUp: (w) => w.worstTopUp,
  });
}

/** A code lookup and line filter apply to all settled weeks, not just the visible page. */
export function queryRolloverTrail(
  rows: PoolsTrailRow[],
  query: { code: string; line: PoolsLine; sort: TrailSort; dir: SortDir },
): PoolsTrailRow[] {
  const code = query.code.trim().toLocaleUpperCase("en");
  const filtered = rows.filter((w) =>
    (query.line === "ALL" || w.visibility === query.line) &&
    (!code || w.code.toLocaleUpperCase("en").includes(code)),
  );
  return applySort(filtered, query.sort, query.dir, {
    week: (w) => w.code,
    settled: (w) => w.settledAt,
    sales: (w) => w.sales,
    winners: (w) => w.winners,
    paid: (w) => w.paid,
    carried: (w) => w.carryOut,
  });
}
