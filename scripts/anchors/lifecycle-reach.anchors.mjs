/**
 * MUTATIONS for `npm run red:lifecycle-reach` — the RED proof of `test:lifecycle-reach`.
 *
 * ⛔ EVERY ONE RESTORES A DEFECT THE CAMPAIGN ACTUALLY REASONED ITS WAY INTO AND THEN CAUGHT BY
 * READING. These are not invented failures: each is the shape a lens set takes when it is written
 * from a plan instead of from the schema.
 */
export const MUTATIONS = [
  {
    /**
     * 🔴 THE RESIDUAL COLLAPSED INTO A LIST — the exact thing `following.ts` warns against in
     * writing: *"Do not 'simplify' a residual arm into a status list."*
     *
     * `progress` is defined as *not open and not settled*, so every value of
     * `PredictionMarketStatus` lands in exactly one arm INCLUDING `DRAFT`, which `createMarket`
     * never writes but `@default(DRAFT)` keeps alive. Enumerating it as `CLOSED` looks identical
     * on every fixture the platform can produce today — and orphans `DRAFT` the moment one exists.
     *
     * ⭐ THIS IS THE MUTATION THAT JUSTIFIES THE WHOLE GATE. No count is wrong, no pill overlaps,
     * every survivor belongs to its lens, and `qa:count-truth`, `qa:player-filters` and
     * `qa:bar-geometry` all stay green: the row is simply selectable by nothing.
     */
    name: "residual-collapsed-to-a-list",
    file: "src/lib/watchlist/following.ts",
    from: '    case "progress": return !isFollowOpen(row) && !isFollowSettled(row);',
    to: '    case "progress": return row.status === "CLOSED";',
    expect: "PredictionMarketStatus.DRAFT",
  },
  {
    /**
     * 🔴 AN ARM DELETED FROM THE MIDDLE OF A LADDER. `/positions`' `cashed` pill is the only
     * control that selects a cashed-out position; without it the row is visible under `all` and
     * under `settled` and reachable by nothing that names it.
     *
     * ⚠️ IT IS DELIBERATELY NOT A DELETION OF THE PILL — the lens set keeps its id, and only the
     * PREDICATE stops matching. That is the sharper failure: the control is still on screen, still
     * carries a count of 0, and looks like a healthy empty rather than a broken filter.
     */
    name: "lens-stops-matching-its-own-value",
    file: "src/lib/positions/portfolio.ts",
    from: '    case "cashed": return row.status === "CASHED_OUT";',
    to: '    case "cashed": return false;',
    expect: "PositionStatus.CASHED_OUT",
  },
  {
    /**
     * 🔴 TWO PILLS CLAIMING ONE ROW — the §2 arm. `/proposals`' `resolved` widened to swallow
     * `DECLINED` as well, so a declined proposal appears under two lenses and a proposer is told
     * two different things about the same submission.
     *
     * ⛔ It must be caught by DISJOINT and not by REACHABLE: the value is still reachable (twice
     * over), so a gate that only asked "can it be selected" would report this as healthy. That is
     * why §1 and §2 are separate assertions rather than one.
     */
    name: "two-lenses-claim-one-value",
    file: "src/lib/proposals/board.ts",
    /**
     * ⚠️ THE MUTATION HAD TO CHANGE SHAPE, AND THE REASON IS WORTH KEEPING. The first draft
     * widened a `case "resolved":` arm — but `/proposals` has no such arm: it is
     * `LENS_OF[row.status] === lens`, a `Record<ProposalStatus, BoardLens>`, so it is covering AND
     * disjoint BY THE TYPE SYSTEM and a per-status case does not exist to widen.
     *
     * ⭐ THAT IS THE STRONGER DESIGN and the mutation has to work harder because of it: the only
     * way to make two lenses claim one row here is to add a second clause OUTSIDE the map. Which
     * is exactly the shape a careless "just also show declined under resolved" change takes.
     */
    from: "  return lens === \"all\" || LENS_OF[row.status] === lens;",
    to: "  return lens === \"all\" || LENS_OF[row.status] === lens || (lens === \"resolved\" && row.status === \"DECLINED\");",
    expect: "claimed by exactly one lens",
  },
];
