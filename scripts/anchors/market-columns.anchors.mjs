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
  // ── 2026-10-09, the visual pass's round 3 (tiles 161, 162, 199): §5–§7's defects, each as it shipped ──
  {
    name: "bet-column-back-on-space-y",
    why: "the bet column spaces its cards with `space-y-3` again, which counts the out-of-flow D40 heading as a sibling: the first card a player sees starts 16px below the probability bar beside it (y370 against y354 at 1280)",
    file: PAGE,
    suite: "market-columns",
    from: `        <aside className="flex flex-col gap-3 lg:sticky lg:top-[72px] lg:z-10" aria-labelledby={BET_PANEL_HEADING}>`,
    to: `        <aside className="space-y-3 lg:sticky lg:top-[72px] lg:z-10" aria-labelledby={BET_PANEL_HEADING}>`,
    expect: "5: ⭐ the bet column spaces its cards with a flex gap, which an out-of-flow heading cannot take a rung of",
  },
  {
    name: "watermark-hangs-from-the-header-again",
    why: "the category watermark hangs from the bottom of its box instead of centring on the question, so a glyph twice the question's height climbs over the gilt hairline and under SHARE — the collision the tiles measured",
    file: PAGE,
    suite: "market-columns",
    from: `              <span aria-hidden className="pointer-events-none absolute right-1 top-1/2 -z-10 flex -translate-y-1/2 text-text opacity-[0.07] text-title-lg md:text-display-3">`,
    to: `              <span aria-hidden className="pointer-events-none absolute right-1 bottom-0 -z-10 flex text-text opacity-[0.07] text-title-lg md:text-display-3">`,
    expect: "5: the category watermark is drawn on the question's own box — centred on it, two of its ems, behind it",
  },
  {
    name: "actions-wrap-one-by-one",
    why: "the source link, the star and SHARE stop being one group, so a phone's row breaks between them and the star's bare glyph opens line 2 at the left edge (x29–42 against the chips at 16)",
    file: PAGE,
    suite: "market-columns",
    from: `          <div className="ml-auto flex items-center gap-2">`,
    to: `          <div className="contents">`,
    expect: "5: the source link, the star and SHARE are ONE right-aligned group, so they wrap together",
  },
  {
    name: "pool-figure-in-the-display-face",
    why: "§M4: the pool figure \"TZS 5K\" goes back to the display face beside a mono close time — money that does not look like money",
    file: PAGE,
    suite: "market-columns",
    from: `label={t.market.volume} font={freshMarket ? undefined : "mono"} value=`,
    to: `label={t.market.volume} value=`,
    expect: "6: ⭐ the pool figure is an .amount on the mono face (words only when there is no pool yet)",
  },
  {
    name: "close-time-off-the-plain-rung",
    why: "the close time leaves the `sm-plain` rung, so its figures no longer stand on the line the strip's 18px figures stand on",
    file: PAGE,
    suite: "market-columns",
    from: `<Stat size="sm-plain" labelStyle="widest" boxed="card" label={t.market.resolves}`,
    to: `<Stat size="xs" labelStyle="widest" boxed="card" label={t.market.resolves}`,
    expect: "6: …and the close time is a kit Stat on the sm-plain rung, with its glyph",
  },
  {
    name: "ticket-glyph-inline-again",
    why: "the ticket glyph goes back inline with a 2px margin, its ink 2px from \"pos_…\" while the clock's stands 5px from its words on the same row",
    file: PAGE,
    suite: "market-columns",
    from: `                        <I.ticket s={10} className="shrink-0 opacity-60" />`,
    to: `                        <I.ticket s={10} className="inline -mt-px mr-0.5 opacity-60" />`,
    expect: "7: the question page's ticket line is the clock line's flex shape (4px)",
  },
];
