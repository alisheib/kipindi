/**
 * ONE WIDTH FOR THE TWO PERIOD FIELDS ON THE LIMITS PAGE — so "Pumzika" and "Jizuie" stand on one line (the visual pass,
 * round 4, helper R4-I, 2026-10-09; edges E21, tile 001).
 *
 * 🔴 WHAT TILE 001 SHOWED. Each form is a legend over a Select, then its button, in a wrapping row. The wrapper took the
 * width of whichever was wider — and that was the LEGEND: "UREFU WA MAPUMZIKO" is 133px and "KIPINDI CHA KUJIZUIA" 148px
 * (10px mono capitals tracked 0.14em: 7.4px a letter), so the break's field ran x41–173 and its button stood at x186,
 * the exclusion's ran x41–188 and its button at x201. Two forms of one page, 15px out of line.
 * ⭐ Both wrappers now take ONE width: the widest of the two legends and of every option either Select can show, in the
 * page's language — each measured in its own face, the legend at 10px mono + 1.4px tracking a glyph, the Select's label
 * at 16px mono (9.6px a glyph) plus the trigger's chrome (16px padding a side, the 12px gap, the 10px chevron, a 1px
 * border a side). An ideograph is a full em in either face. Both buttons then start at the same x in every language.
 * And the two BUTTONS are one width too — each reserves the other's label (`RgConfirmSubmit`'s `widthOf`) — so each
 * form is field + 12 + one button width, and the two wrap at the same screen width: a button never falls under its
 * field in one form while the other's stands beside it.
 * Pure, so `test:visual-pass-r4i` drives the very numbers the page uses.
 */

const IDEOGRAPH = /[⺀-鿿豈-﫿　-〿＀-￯]/;

/** A FieldLegend's width: `font-mono text-micro uppercase` with the eyebrow's 0.14em tracking. */
export function legendPx(text: string): number {
  return [...text.toUpperCase()].reduce((w, c) => w + (IDEOGRAPH.test(c) ? 10 : 6) + 1.4, 0);
}

/** The md Select trigger's chrome around its label: px-3 (16) × 2, gap-2 (12), the 10px chevron, 1px border × 2. */
export const SELECT_CHROME_PX = 16 * 2 + 12 + 10 + 2;

/** A md Select trigger's width for a label: 16px mono, 9.6px a glyph, an ideograph 16. */
export function selectPx(label: string): number {
  return [...label].reduce((w, c) => w + (IDEOGRAPH.test(c) ? 16 : 9.6), 0) + SELECT_CHROME_PX;
}

/** The one width both period fields take: every legend and every option of both forms, rounded up to a whole pixel. */
export function rgPeriodFieldPx(legends: readonly string[], options: readonly string[]): number {
  // The epsilon keeps a width that is whole in exact arithmetic (20 × 7.4 = 148) from rounding up on its float tail.
  return Math.ceil(Math.max(...legends.map(legendPx), ...options.map(selectPx)) - 1e-6);
}
