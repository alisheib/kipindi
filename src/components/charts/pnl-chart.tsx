/**
 * PnlChart — cumulative realised P&L over settled markets.
 * Server-safe pure SVG (no client JS). Follows the kit PriceChart idiom
 * (kit-specimens/microstructure.jsx) re-tokenised for the royal canvas:
 *  - gridlines = --border hairlines
 *  - the gilt dashed reference line is the BREAK-EVEN line (the "tipping"
 *    line of the pchart pattern, mapped to zero P&L — on-motif)
 *  - line stroke = --brand-300 (NOT yes/no green/red: P&L is not a betting
 *    action surface; gold stays reserved for earned-money values)
 *  - live end-dot = aqua finishing pass (.pchart-dot-halo already ships a
 *    reduced-motion branch in globals.css)
 * Raw TZS values in, no normalisation lies: the axis labels are the real
 * max / 0 / min of the series.
 */

import { formatCompactNumber } from "@/lib/utils";
import { linePath } from "./chart-core";

type Point = { label: string; value: number }; // cumulative TZS P&L, chronological

/**
 * The axis labels, in the platform's one compaction grammar (S-14, scan #1, 2026-08-28).
 *
 * \u26d4 THIS WAS A PRIVATE FIFTH SPELLING and it disagreed with the grammar in four ways, not
 * one. Lowercase "k" was only the visible half:
 *   \u00b7 NO B band at all \u2014 1.2e9 printed "1200.0M"
 *   \u00b7 NO 0-dp step at 10M \u2014 "12.3M" where every other surface says "12M"
 *   \u00b7 NO 1,000 floor, so EVERY sub-1000 value collapsed to "0k". A \u00b1400 TZS axis labelled
 *     both of its ends "+0k" and "\u22120k" \u2014 two different numbers, printed identically, on a
 *     chart whose header comment promises "no normalisation lies: the axis labels are the
 *     real max / 0 / min of the series".
 *   \u00b7 and it shared S-01's branch-before-round, so 999,600 printed "1000k".
 * The leading "+" is the one genuine difference this surface needs \u2014 it labels both ends of a
 * signed range \u2014 so it is a parameter of the shared formatter rather than a reason to keep a
 * local copy. No "TZS " prefix: the card's own heading carries the unit.
 */
const short = (n: number) => formatCompactNumber(n, { explicitPlus: true });

export function PnlChart({ data, ariaLabel }: { data: Point[]; ariaLabel: string }) {
  // Prepend the zero start so the walk always begins at break-even.
  const pts = [{ label: "start", value: 0 }, ...data];
  const minV = Math.min(0, ...pts.map((p) => p.value));
  const maxV = Math.max(0, ...pts.map((p) => p.value));
  const pad = (maxV - minV) * 0.08 || 1;
  const lo = minV - pad, hi = maxV + pad;
  const X0 = 8, X1 = 656, Y0 = 14, Y1 = 214;
  const xAt = (i: number) => X0 + (i / Math.max(1, pts.length - 1)) * (X1 - X0);
  const yAt = (v: number) => Y0 + ((hi - v) / (hi - lo)) * (Y1 - Y0);

  // Straight segments on purpose — each vertex IS a settlement; smoothing
  // would draw P&L values that never existed (chart-core's linePath doctrine).
  const line = linePath(pts.map((p, i) => [xAt(i), yAt(p.value)] as const));
  const zeroY = yAt(0), topY = yAt(maxV), botY = yAt(minV);
  const li = pts.length - 1, mi = Math.floor(li / 2);
  const lastX = xAt(li), lastY = yAt(pts[li].value);

  return (
    <svg viewBox="0 0 720 240" width="100%" style={{ display: "block", fontFamily: "var(--font-mono)" }} role="img" aria-label={ariaLabel}>
      <line x1={X0} y1={topY} x2={X1} y2={topY} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 3" opacity="0.45" />
      <line x1={X0} y1={botY} x2={X1} y2={botY} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 3" opacity="0.45" />
      <line x1={X0} y1={zeroY} x2={X1} y2={zeroY} stroke="var(--gilt)" strokeWidth="1" strokeDasharray="2 5" opacity="0.55" />
      <text x={X0} y={zeroY - 5} fill="var(--gilt)" fontSize="9" letterSpacing="0.14em" opacity="0.7">BREAK-EVEN</text>
      <text x={X1 + 6} y={topY + 3} fill="var(--text-subtle)" fontSize="9">{short(maxV)}</text>
      <text x={X1 + 6} y={zeroY + 3} fill="var(--gilt)" fontSize="9" opacity="0.8">0</text>
      <text x={X1 + 6} y={botY + 3} fill="var(--text-subtle)" fontSize="9">{short(minV)}</text>
      <path
        d={line} fill="none" stroke="var(--brand-300)" strokeWidth="2.25"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 5px color-mix(in oklab, var(--brand-400) 35%, transparent))" }}
      />
      <circle cx={lastX} cy={lastY} r="3.5" fill="var(--aqua-300)" />
      <circle className="pchart-dot-halo" cx={lastX} cy={lastY} r="8" fill="none" stroke="var(--aqua-300)" strokeWidth="1" />
      {[0, mi, li].map((i) => (
        <text key={i} x={xAt(i).toFixed(0)} y="234" fill="var(--text-subtle)" fontSize="9" textAnchor="middle">{pts[i].label}</text>
      ))}
    </svg>
  );
}
