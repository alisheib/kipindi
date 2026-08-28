/**
 * THE ANCHORS `red:money-format` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * S-01 (scan #1, 2026-08-28): `formatTzsCompact` chose its magnitude band against the RAW
 * value and rounded inside the branch, so every boundary had a ~500-wide window where the
 * mantissa rounded up out of its own band — 999,500 printed "TZS 1000K" on the landing hero.
 *
 * ⭐ 1–3 ARE THE THREE SEAMS, and each is mutated by moving its PROMOTION POINT back to the
 * band edge — which is precisely what the old code did implicitly. Three, not one, because the
 * scan found two and the third (the 1-dp → 0-dp step at 10M) was found only by driving the
 * function: 9,999,999 printed "TZS 10.0M" while 10,000,000 printed "TZS 10M".
 *
 * ⭐ 4 IS THE ONE MOST WORTH HAVING. It restores the ORIGINAL FALSE WIDTH CONTRACT —
 * "TZS 999.9M", a string this function cannot emit in any version. That fiction is what
 * globals.css sized the landing hero's type ladder against, and because `.kp-proof__num`
 * forbids `white-space: nowrap`, a figure wider than the assumed maximum does not clip, it
 * WRAPS the money figure onto two lines. A doc that lies about a width is a layout defect with
 * a delay fuse, and no assertion about the function's OUTPUT can see it.
 *
 * ⭐ 6 GUARDS A PROMOTION. The `step` branch came out of admin-charts with the function; it is
 * what stops five distinct gridlines being labelled `0, 0, 1, 1, 1` (finding A4). A move that
 * silently drops it would leave every money assertion green.
 *
 * ⚠️ SINGLE-LINE ANCHORS (CRLF tree); no replacement CONTAINS its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const UTILS = "src/lib/utils.ts";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "the-K-to-M-seam-branches-before-rounding",
    why: "⭐ THE DEFECT AS IT SHIPPED. Promotion moves back to the band edge, so 999,500 stays in the K band and its own rounding prints a mantissa of 1000: \"TZS 1000K\", a grammar this platform does not have, on the landing hero's sum of open pools — the one figure we show a stranger to earn their trust",
    file: UTILS,
    suite: "money-format",
    from: `const PROMOTE_TO_M = 999_500;`,
    to: `const PROMOTE_TO_M = 1_000_000;`,
    expect: `formatTzsCompact(999,500) === "TZS 1.0M"`,
  },
  {
    name: "the-M-to-B-seam-branches-before-rounding",
    why: "The same defect one band up: 999,500,000 prints \"TZS 1000M\". Asserted separately because a fix applied to one seam and not the other is the likeliest partial repair, and it would leave /admin/finance's larger totals wrong while the hero looked fixed",
    file: UTILS,
    suite: "money-format",
    from: `const PROMOTE_TO_B = 999_500_000;`,
    to: `const PROMOTE_TO_B = 1_000_000_000;`,
    expect: `formatTzsCompact(999,500,000) === "TZS 1.0B"`,
  },
  {
    name: "the-10M-decimal-step-branches-before-rounding",
    why: "⭐ THE SEAM THE SCAN DID NOT FIND. `toFixed(abs >= 10M ? 0 : 1)` also asked the RAW value, so 9,999,999 printed \"TZS 10.0M\" while 10,000,000 printed \"TZS 10M\" — the same quantity, two spellings, one shilling apart. Only driving the function at the boundary surfaces it",
    file: UTILS,
    suite: "money-format",
    from: `const M_DROPS_DECIMAL = 9_950_000;`,
    to: `const M_DROPS_DECIMAL = 10_000_000;`,
    expect: `formatTzsCompact(9,999,999) === "TZS 10M"`,
  },
  {
    name: "the-width-contract-lies-again",
    why: "⭐ RESTORES THE ORIGINAL FICTION. \"TZS 999.9M\" is unemittable in every version of this function — a \".9\" mantissa in the M band exists only below 10M — yet globals.css sized the landing hero's type ladder against it, and `.kp-proof__num` forbids `white-space: nowrap`, so an over-wide figure WRAPS the money onto two lines rather than clipping. No assertion about the function's output can see a doc that lies about its width",
    file: UTILS,
    suite: "money-format",
    from: ` *      widest positive — "TZS 999.9B"    10 characters`,
    to: ` *      widest positive — "TZS 999.9M"    10 characters`,
    expect: `3: ⭐ the doc's positive exemplar`,
  },
  {
    name: "the-sibling-emits-an-ascii-hyphen",
    why: "The unit-free sibling loses U+2212 for a hyphen. This was a REAL divergence in the code it replaced: admin-charts' private `compact()` divided the signed value, so the sign fell out of the arithmetic as ASCII while every other figure on the same console used the true minus. Two glyphs for one meaning, on one screen",
    file: UTILS,
    suite: "money-format",
    from: `  const sign = value < 0 ? "−" : opts.explicitPlus && value > 0 ? "+" : "";`,
    to: `  const sign = value < 0 ? "-" : opts.explicitPlus && value > 0 ? "+" : "";`,
    expect: `4: negatives carry U+2212, not an ASCII hyphen`,
  },
  {
    name: "the-promoted-step-branch-is-dropped",
    why: "⭐ GUARDS THE PROMOTION ITSELF. `step` came out of admin-charts with the function body and is what stops five distinct gridlines being labelled `0, 0, 1, 1, 1` on a 0..1 axis (finding A4) — a reader takes a value off the axis that the chart does not mean. Every money assertion stays green if it is dropped, so the move has to be asserted as a move",
    file: UTILS,
    suite: "money-format",
    from: `    const decimals = opts.step >= 0.1 ? 1 : opts.step >= 0.01 ? 2 : 3;`,
    to: `    const decimals = 0;`,
    expect: `4: sub-1 ticks keep enough decimals`,
  },
];
