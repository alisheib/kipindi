import { Fragment, type ReactNode } from "react";

/**
 * `fill()` for a sentence that carries a NODE.
 *
 * ⭐ WHY THIS EXISTS (type-scale §1/§2, 2026-09-07). A money figure inside prose — "Pay
 * {amount} to {name}" — used to be filled as a STRING, so the figure inherited the paragraph's
 * body face and tracking. §M4 says a figure is mono and tabular wherever it appears; §T5 says
 * the sentence keeps its voice. The only construction that satisfies both is the number in its
 * OWN element (`<span className="amount">`) inside the paragraph — which a string cannot do.
 *
 * Same placeholder grammar as `fill()` (`{key}`); an unknown key is left as typed, exactly as
 * `fill()` leaves it, so a dictionary typo shows on screen instead of vanishing.
 */
export function fillNodes(template: string, vars: Record<string, ReactNode>): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\{(\w+)\}/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) {
    if (m.index > last) out.push(template.slice(last, m.index));
    const k = m[1];
    out.push(Object.prototype.hasOwnProperty.call(vars, k) ? <Fragment key={i++}>{vars[k]}</Fragment> : m[0]);
    last = m.index + m[0].length;
  }
  if (last < template.length) out.push(template.slice(last));
  return out;
}
