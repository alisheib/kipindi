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
// ⭐ Round 5 (2026-10-09, review 3's doubt): a signed figure is read whole too, in the platform's two spellings —
// `formatTzs` / `formatTzsCompact` put the minus after the code ("TZS −4,200", "TZS −1.2M"), `formatTzsSigned` puts its
// sign before it ("−TZS 1,234", "+TZS 1,234"). The minus is U+2212, never a hyphen, so no hyphen of a sentence is taken.
const MONEY_RUN = /[+\u2212]?TZS[\u00a0 ]\u2212?\d+(?:,\d{3})*(?:\.\d+)?[KMB]?/g;
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

/**
 * A FINISHED SENTENCE WITH ITS FIGURES WHOLE (`moneyRuns`) AND ITS LAST TWO WORDS ON ONE LINE — for a column that can be
 * narrower than those two words (round 4 of the visual pass, 2026-10-09: /notifications at 1280, tile 194, ended a body
 * "…kwenye pochi" / "yako.").
 *
 * ⭐ AN INLINE BLOCK, NOT `keepLastWords`' nowrap span. A notice's body is a stored sentence that ends however its template
 * or its market ends it, in a column 100px wide at 320 (the row's ✓ and × take 90 of it); a nowrap pair wider than the
 * column would run out of it, under the ✓. An inline block moves to the next line whole when the pair fits on one, and
 * wraps inside itself when it does not, so it can never overflow. ⛔ An inline block takes no text decoration from its
 * parent, so this is for plain text (a body), never a link that underlines on hover.
 * ⭐ A figure is never cut: when the last two words would split a "TZS 4,200", the kept end starts at its "TZS".
 * Chinese, and a sentence of two words or fewer, take `moneyRuns` alone (`keepLastWords`' own two rules, keep-words.tsx).
 */
const IDEOGRAPH = /[㐀-䶿一-鿿豈-﫿]/;
const LAST_TWO = /\S+\s+\S+\s*$/;
export function moneySentence(text: string): ReactNode[] {
  let at = IDEOGRAPH.test(text) ? -1 : text.search(LAST_TWO);
  for (const m of text.matchAll(MONEY_RUN)) {
    const start = m.index ?? 0;
    if (start < at && at < start + m[0].length) at = start;
  }
  if (at <= 0) return moneyRuns(text);
  return [
    ...moneyRuns(text.slice(0, at)),
    <span key="end" className="inline-block max-w-full">{moneyRuns(text.slice(at))}</span>,
  ];
}
