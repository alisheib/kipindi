/**
 * chart-core — the geometry every user-level chart shares. Pure functions,
 * imports NOTHING (the `dial-stake.ts` shape: a 1,700-line client component
 * cannot be imported by a suite, but this can — and is).
 *
 * ⭐ THIS DIRECTORY IS THE CHART SYSTEM'S ONE HOME (CHART-SPRINT 2026-09-04).
 * Every user-level chart is either a component in `src/components/charts/` or a
 * NAMED member at a pinned address (see `scripts/chart-one-home.test.mts` — the
 * guard states each exemption's reason). Before this sprint there were four
 * private copies of the Catmull-Rom smoother and six chart implementations in
 * six homes; a seventh copy is now a guard failure, not a precedent.
 *
 * ⛔ Charts READ; they never compute money. Nothing in this directory may
 * import a service that can write.
 */

/** An [x, y] pair in the caller's viewBox units. */
export type XY = readonly [number, number];

/**
 * Catmull-Rom → cubic-bezier smoothing. Low tension so the curve reads as
 * data, not decoration — 0.16 is the tension the signature ProbabilityChart
 * chose and documented; every smoothed chart now shares it.
 */
export function smoothPath(pts: ReadonlyArray<XY>, tension = 0.16): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}` : "";
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) * tension, c1y = p1[1] + (p2[1] - p0[1]) * tension;
    const c2x = p2[0] - (p3[0] - p1[0]) * tension, c2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

/** Straight M/L polyline — for series whose few points ARE the statement
 *  (confirmed oracle reads, per-settlement P&L walks). Smoothing a 5-point
 *  money series would draw values that were never observed. */
export function linePath(pts: ReadonlyArray<XY>): string {
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
}

/** Close a line path into an area against a horizontal base edge. */
export function closeArea(line: string, xEnd: number, xStart: number, yBase: number): string {
  return `${line} L ${xEnd.toFixed(2)} ${yBase.toFixed(2)} L ${xStart.toFixed(2)} ${yBase.toFixed(2)} Z`;
}

/**
 * Map a series onto a plot box: evenly-spaced x, min→max normalised y.
 * `span` floors at 1 — the floor both private sparks already carried — so a
 * flat or near-flat series renders as a flat line instead of dividing by ~0
 * and amplifying noise into full-height swings (or NaN → an invisible chart).
 */
export function seriesToXY(
  data: ReadonlyArray<number>,
  box: { x0: number; x1: number; y0: number; y1: number },
): XY[] {
  const n = data.length;
  if (n === 0) return [];
  const min = Math.min(...data), max = Math.max(...data);
  const span = Math.max(1, max - min);
  return data.map((v, i) => [
    n === 1 ? (box.x0 + box.x1) / 2 : box.x0 + (i / (n - 1)) * (box.x1 - box.x0),
    box.y1 - ((v - min) / span) * (box.y1 - box.y0),
  ] as const);
}
