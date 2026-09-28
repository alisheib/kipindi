/**
 * THE ANCHORS `red:landing-contract` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array (the `board-discovery.anchors.mjs` convention): `test:red-anchors`
 * §3 audits that every anchor below still resolves EXACTLY ONCE against real source, without executing
 * a harness that rewrites that source. An inline anchor is one nobody can audit — this harness's own
 * two lens cases had rotted against `hero.ts` for three days before landing v3 WP6 found them.
 * ⚠️ NO SIDE EFFECTS: data only, repo-relative POSIX paths. `expect` names the assertion that must break.
 * Moved out of `scripts/landing-contract-red.mjs` on 2026-09-27 (landing v3 WP6).
 */

export const MUTATIONS = [
  {
    // ⚠️ REPLACED 2026-09-28 (WP9). This case planted "the grid does not exclude the hero's ids" — the
    // exact batch-2 repetition — against `landingGrid`, which is deleted with the landing grid. The
    // rule survives as the board excluding the featured card by id, and its red control lives beside
    // the code: `scripts/anchors/hero-contract.anchors.mjs`, "the board starts at the featured market
    // again". ⛔ Not duplicated here: two harnesses planting one rule is how one of them rots.
    // ⭐ WHAT THIS SLOT PLANTS NOW is the rule WP9 introduced and nothing else guarded — the board's
    // lens arrives off a URL and must be narrowed against what the book can honestly offer.
    name: "WP9 · the requested lens is trusted straight off the URL (a money lens on a cold book)",
    file: "src/lib/markets/hero.ts",
    from: `  const lens: BoardLens = boardLenses(sumYes + sumNo).includes(requested) ? requested : "closing";`,
    to: `  const lens: BoardLens = requested;`,
    expect: "2.2",
  },
  {
    name: "the cold-book lens picks the money lens on an empty book (states a number nobody produced)",
    // ⚠️ MOVED WITH THE FUNCTION (WP9): `gridLensFor` in `landing.ts` became `boardMoneyLens` in
    // `hero.ts`, because the surface it decides for is the board's toggle. Same line, new address.
    file: "src/lib/markets/hero.ts",
    from: `  return openPoolTzs > 0 ? "pool" : "new";`,
    to: `  return "pool";`,
    expect: "1.1",
  },
  {
    name: "a topic's lean is a mean of per-row percentages instead of the summed-pool ratio",
    file: "src/lib/markets/landing.ts",
    from: `        leanYesPct: pricedYesPct(a.yes, a.no),`,
    to: `        leanYesPct: 50,`,
    expect: "3.3",
  },
  {
    name: "a CLOSED market is not excluded from the topic fold",
    file: "src/lib/markets/landing.ts",
    from: `    if (!matchesStatus(r, "open", nowMs)) continue;`,
    to: `    // disabled`,
    expect: "3.1",
  },
  {
    name: "the reconciliation check always reports ok (a vacuous assertion)",
    file: "src/lib/markets/landing.ts",
    from: `  return { ok: countDelta === 0 && poolDelta === 0, countDelta, poolDelta };`,
    to: `  return { ok: true, countDelta, poolDelta };`,
    expect: "3.8-control",
  },
  {
    name: "the board stops filtering by status (a RESOLVED market is offered live YES/NO buttons)",
    // ⚠️ RE-POINTED 2026-09-28 (WP9). The status filter was `landingGrid`'s own; it is now the one
    // `heroFigures` already applied before it orders anything, so the plant moves to that line and the
    // assertion it must break moves with it (§2.5 became §4.6, "a RESOLVED row never reaches the board
    // or the card").
    file: "src/lib/markets/hero.ts",
    from: `  const open = rows.filter((r) => matchesStatus(r, "open", nowMs));`,
    to: `  const open = rows.slice();`,
    expect: "4.6",
  },
  {
    name: "WP6 · the board orders by the lens alone (a one-sided TZS 90,000 market takes a priced market's place)",
    // ⚠️ MOVED WITH THE RULE (WP9): the tier partition is `boardOrdering`'s now.
    file: "src/lib/markets/hero.ts",
    from: `  return [0, 1, 2].flatMap((tier) => order(open.filter((r) => priceTier(r) === tier)));`,
    to: `  return order(open);`,
    expect: "4.1",
  },
  {
    // ⚠️ REPLACED 2026-09-28 (WP9 · R16), AND THE REASON IS A RULING RATHER THAN A MOVE. This case
    // planted "the seated cards are shown in TIER order, so the heading's 'Biggest pools first' is
    // false" — because `landingGrid` deliberately displayed its three seats in pure lens order. The
    // merged board displays in TIER order on purpose (R16 strikes R15's "displays by lens" clause: on
    // a seven-row list that is the page's only market list, lens-across-tiers hands position 1 back to
    // the one-sided row the floor exists to demote). So the defect that case guarded against is now
    // the shipped behaviour, and planting it would convict the product.
    // ⭐ WHAT IS WORTH GUARDING IS THE OTHER HALF: within a tier, the lens must still be the lens.
    // Plant it away and the priced rows come back in input order instead of pool order.
    name: "WP9 · the lens is ignored WITHIN a tier (the rows come back in input order)",
    file: "src/lib/markets/hero.ts",
    from: `    if (lens !== "closing") return sortRows(rows, { sort: lens, dir: null });`,
    to: `    if (lens !== "closing") return rows.slice();`,
    expect: "4.4",
  },
];
