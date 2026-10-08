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

/**
 * Every money figure a FINISHED sentence states — "TZS 1,015", "TZS\u00a05,000,000", "TZS 9.9M" — each in its own
 * `<span className="amount">`, the words around them untouched.
 *
 * ⭐ WHY A SECOND HELPER (2026-10-09, the visual pass's round 3, tiles 069 and 174). The deposit and withdraw limits
 * line is a dictionary sentence whose currency code is TYPED in it ("Kiwango cha chini TZS\u00a0{min} …"), and the
 * deposit one also states two thresholds as literal figures ("TZS\u00a01,000,000", "TZS\u00a05,000,000"). `fillNodes`
 * can only dress a placeholder, so it would set "1,015" in mono and leave "TZS" beside it in the body face — half a
 * figure. This reads the figure whole, code and digits, wherever the sentence put it, in all three languages (each
 * writes "TZS" + a space or a no-break space + the digits). §M4: a figure is mono and untracked in prose too; §T5: the
 * sentence keeps its voice.
 * ⛔ Text in, nodes out: it never formats a number, so what the sentence says is what is shown.
 */
// Thousands groups are read as groups, so a sentence's own comma after a figure ("…to TZS 5,000,000, needs…") stays
// in the sentence and never joins the figure.
const MONEY_RUN = /TZS[\u00a0 ]\d+(?:,\d{3})*(?:\.\d+)?[KMB]?/g;
export function moneyRuns(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(MONEY_RUN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    out.push(<span key={i++} className="amount">{m[0]}</span>);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
