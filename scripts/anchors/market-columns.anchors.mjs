/**
 * THE ANCHORS `red:market-columns` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` must answer *"does every anchor still resolve, exactly
 * once?"* WITHOUT executing a harness that rewrites real source. One definition, imported
 * by both. ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * Related markets moved out of the 360px right rail and back to full width below both
 * columns on 2026-08-25, because the premise that put them there — *"the left column runs on
 * for another 1,500px"* — was measured false on 8 of 8 live markets.
 *
 * ⭐ THE FIRST IS THE REGRESSION ITSELF. ⭐ THE THIRD IS THE POSITIVE CONTROL: it removes the
 * related-markets section entirely, so every placement rule passes VACUOUSLY over a page
 * with nothing to place — the shape a guard cannot see unless it asserts its own premise.
 *
 * ⚠️ SINGLE-LINE ANCHORS (CRLF tree), and no replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const PAGE = "src/app/markets/[id]/page.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "back-into-the-rail",
    why: "⭐ THE REGRESSION, VERBATIM: related markets return to the right column under the sticky bet widget. Measured on production, that rail is 1,127px against a left column of 842–989px, so the void does not go away — it moves into the PRIMARY reading column, where 8 of 8 markets left 371–518px of nothing",
    file: PAGE,
    suite: "market-columns",
    from: `            className="order-3 lg:col-span-2 lg:row-start-2 min-w-0"`,
    to: `            className="order-3 lg:col-start-2 lg:row-start-2 min-w-0"`,
    expect: "2: ⭐ related markets span BOTH columns",
  },
  {
    name: "left-column-spans-both-rows-again",
    why: "the left column reclaims `lg:row-span-2`, so a full-width row 2 has nowhere to go and the grid silently overlaps it with the content column — a layout failure with no error and no visible cause",
    file: PAGE,
    suite: "market-columns",
    from: `        <section className="order-2 lg:order-1 lg:col-start-1 lg:row-start-1 min-w-0 space-y-5">`,
    to: `        <section className="order-2 lg:order-1 lg:col-start-1 lg:row-start-1 lg:row-span-2 min-w-0 space-y-5">`,
    expect: "2: ⛔ the left column no longer spans both rows",
  },
  {
    name: "control-no-related-section",
    why: "⭐ POSITIVE CONTROL — the section's landmark is renamed, so there is no related-markets block for any placement rule to inspect. Every §2/§3/§4 assertion then passes over nothing, and only §1's premise check stands between that and a green report on a page whose layout was never examined",
    file: PAGE,
    suite: "market-columns",
    from: `            aria-labelledby="similar-markets-heading"`,
    to: `            aria-labelledby="similar-markets-heading-renamed"`,
    expect: "1: the page still renders a related-markets section",
  },
  {
    name: "cards-forced-single-column",
    why: "the card grid is pinned back to one column, which was only ever right inside a 360px rail. Full width it renders one card per row across a 1480px board and truncates every title mid-word — the layout looks deliberate and reads as broken",
    file: PAGE,
    suite: "market-columns",
    from: `            <div className="market-grid">`,
    to: `            <div className="market-grid lg:!grid-cols-1">`,
    expect: "3: ⛔ …with no forced single column left over from the rail",
  },
];
