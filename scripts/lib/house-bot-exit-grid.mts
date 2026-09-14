/**
 * The A14 exit-window grid, shared by the golden capture, `test:house-bot-seam` (the JS function and
 * `cashOutValue`) and the `lockedForHouse` SQL parity case (N1 §4.1). One list, so the SQL is checked on
 * exactly the rows the player path was pinned on.
 *
 * Axes (04 A14): free grace {0, 5} min × paid window {0, 2, 10} min × runway {below grace, exactly
 * grace, well above} × bonus {0, > 0} × the instant it is asked, from a clock one second behind the
 * placement to an hour after the window, × whether the market has a selection close or falls back to
 * `resolutionAt`. Plus a row with an empty `placedAt`, which `cashOutValue` reads as "now".
 */
export type ExitGridRow = {
  id: string;
  graceMin: number;
  paidMin: number;
  /** closesAt − placedAt, in ms. */
  runwayMs: number;
  bonus: number;
  /** now − placedAt, in ms. */
  sinceMs: number;
  selectionClose: boolean;
  emptyPlacedAt?: boolean;
};

const MIN = 60_000;
/** A fixed instant, so the grid never depends on when it runs. */
export const EXIT_GRID_PLACED_AT_MS = Date.UTC(2026, 8, 14, 9, 0, 0, 0);

function rows(): ExitGridRow[] {
  const out: ExitGridRow[] = [];
  for (const graceMin of [0, 5]) {
    for (const paidMin of [0, 2, 10]) {
      const graceMs = graceMin * MIN;
      const windowMs = graceMs + paidMin * MIN;
      const runways = graceMin === 0 ? [0, 60 * MIN] : [graceMs - 1, graceMs, graceMs + 60 * MIN];
      for (const runwayMs of runways) {
        for (const bonus of [0, 500]) {
          const sinces = [...new Set([-1000, 0, graceMs - 1, graceMs, windowMs - 1, windowMs, windowMs + 1, windowMs + 60 * MIN])];
          for (const sinceMs of sinces) {
            for (const selectionClose of [true, false]) {
              out.push({
                id: `g${graceMin}-p${paidMin}-r${runwayMs}-b${bonus}-s${sinceMs}-${selectionClose ? "sel" : "res"}`,
                graceMin, paidMin, runwayMs, bonus, sinceMs, selectionClose,
              });
            }
          }
        }
      }
    }
  }
  out.push({ id: "empty-placedAt", graceMin: 5, paidMin: 0, runwayMs: 60 * MIN, bonus: 0, sinceMs: 0, selectionClose: true, emptyPlacedAt: true });
  return out;
}

export const EXIT_WINDOW_GRID: readonly ExitGridRow[] = rows();

export function exitGridCase(c: ExitGridRow) {
  const placedAtMs = EXIT_GRID_PLACED_AT_MS;
  const closesAtIso = new Date(placedAtMs + c.runwayMs).toISOString();
  const feeSnapshot = {
    commissionRate: 0.13,
    feeCeilingRate: 0.5,
    cashOutFeeRate: 0.09,
    freeExitGraceMinutes: c.graceMin,
    paidExitWindowMinutes: c.paidMin,
    traTaxOnCommissionRate: 0,
    gbtLevyOnCommissionRate: 0,
  };
  const position = {
    side: "YES" as const,
    stake: 10_000,
    placedAt: c.emptyPlacedAt ? "" : new Date(placedAtMs).toISOString(),
    bonusStakeTzs: c.bonus,
  };
  const market = {
    id: "mkt_exit_grid",
    yesPool: 10_000,
    noPool: 5_000,
    // With no selection close the window closes at `resolutionAt`; with one, resolution is a day later.
    resolutionAt: c.selectionClose ? new Date(placedAtMs + c.runwayMs + 24 * 60 * MIN).toISOString() : closesAtIso,
    selectionClosedAt: c.selectionClose ? closesAtIso : null,
    feeSnapshot,
  };
  return { position, market, nowMs: placedAtMs + c.sinceMs };
}
