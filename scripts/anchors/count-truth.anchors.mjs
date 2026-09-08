/**
 * MUTATIONS for `npm run red:count-truth` — the RED proof of `qa:count-truth`.
 *
 * ⛔ EVERY ONE IS A DEFECT THIS PLATFORM HAS ALREADY SHIPPED OR NEARLY SHIPPED, not an invented
 * one. A red harness whose mutations are contrived proves the gate catches contrivances.
 *
 * ⚠️ THE MUTATIONS TARGET THE SHARED QUERY CORE, WHICH IS THE POINT. `counts.ts` folds the count
 * for every rail on the platform; `href.ts` builds the destination for every pill. So one
 * mutation there breaks six routes at once, and a driver that only checked the route it was
 * pointed at would still catch it — which is how we know the driver is measuring the CONTRACT
 * rather than one page's arithmetic.
 *
 * ⭐ `pages-overlap` IS THE ONE THAT EARNED THE DRIVER ITS PLACE. It restores, exactly, the
 * `/results` defect found on 2026-09-08: three high-volume markets promoted into a page-1
 * carousel but subtracted only from page 1's grid, so two of them rendered again on page 2.
 * Neither the result count nor any lens assertion could see it — the total was right and every
 * survivor belonged to its lens. Only the PARTITION across pages was broken.
 *
 * ⛔ `data-row-id` on `market-card.tsx` is deliberately NOT mutated away. Removing it makes every
 * count read zero and the driver goes red for the honest reason "delivered 0" — which proves the
 * instrument notices its own blindness, but says nothing about counts. `duplicate-row-id` is the
 * sharper twin: it keeps the rows countable and makes each one count TWICE, which is the failure
 * mode a careless wrapper actually produces (`/watchlist` nearly shipped exactly that).
 */
export const MUTATIONS = [
  {
    name: "count-ignores-other-axes",
    file: "src/lib/query/counts.ts",
    // The fold stops cross-filtering: every pill then promises what it would show if it were
    // the ONLY filter on the page. On a page with any second filter active, that over-promises.
    from: "  for (const v of values) out[v] = countFor(rows, state, axes, { [key]: v } as Partial<State>);",
    to: "  for (const v of values) out[v] = countFor(rows, {} as State, axes, { [key]: v } as Partial<State>);",
    expect: "promised",
  },
  {
    name: "count-off-by-one",
    file: "src/lib/query/counts.ts",
    // The classic: a count that is right about the shape and wrong about the number. No lens
    // assertion sees it, because membership is untouched.
    from: "  for (const v of values) out[v] = countFor(rows, state, axes, { [key]: v } as Partial<State>);",
    to: "  for (const v of values) out[v] = countFor(rows, state, axes, { [key]: v } as Partial<State>) + 1;",
    expect: "promised",
  },
  {
    name: "pages-overlap",
    file: "src/app/results/page.tsx",
    /**
     * 🔴 THE REAL DEFECT — the carousel drawing its cards from OUTSIDE the page it sits on, while
     * `notableIds` subtracts them only from page 1. Two of the three duplicated on 2026-09-08.
     *
     * ⚠️ NOT THE VERBATIM SHIPPED LINE, AND THE REASON IS A FINDING IN ITSELF. Restoring
     * `[...all].sort(byVolume).slice(0, 3)` exactly STAYED GREEN on the seeded fixture: with 20
     * settled rows over a 12-row page, all three of the archive's highest-volume markets happened
     * to land on page 1, so the mutated code and the correct code picked the same three. ⛔ A
     * mutation that only reproduces the defect on some data is a red proof that passes or fails
     * by luck — which is the vacuous-control shape this campaign keeps finding.
     *
     * ⭐ `all.slice(-3)` IS THE SAME DEFECT MADE DETERMINISTIC: the last three rows in page order
     * are on the LAST page whenever there is more than one, so they are always outside page 1 and
     * the overlap always occurs. The class under test — "notables chosen from a population wider
     * than the page that renders them" — is identical; only the luck is removed.
     */
    from: "    ? [...paged].sort((a, b) => (b.yesPool + b.noPool) - (a.yesPool + a.noPool)).slice(0, all.length >= 8 ? 3 : 1)",
    to: "    ? [...all].slice(-3).sort((a, b) => (b.yesPool + b.noPool) - (a.yesPool + a.noPool)).slice(0, all.length >= 8 ? 3 : 1)",
    expect: "DUPLICATE",
    /**
     * ⛔ THE FIXTURE PRECONDITION, AND IT IS NOT OPTIONAL BOOKKEEPING. This defect is about rows
     * crossing a PAGE BOUNDARY, so on an archive that fits in one page the mutated code and the
     * correct code are identical and the harness reported "stayed GREEN" — a false finding about
     * a gate that is fine, which is precisely the outcome `qa:player-filters` invented its third
     * result for. ⭐ Declared as a requirement the harness CHECKS, so the case reports 🔶 rather
     * than passing vacuously or failing wrongly.
     */
    // ⚠️ THE PROBE IS `?product=all`, NOT THE DEFAULT VIEW, and that is a measurement rather than
    // a convenience: the default is `product=MARKET` and the seeded archive holds ~12 long-form
    // settled markets — exactly one page — while `?product=all` adds the settled Up & Down rounds
    // and crosses the boundary. The mutation lives in code both views run, so proving it on the
    // view that can pose the question proves it for both.
    requires: { route: "/results?product=all", minPages: 2 },
  },
  {
    name: "duplicate-row-id",
    file: "src/app/watchlist/page.tsx",
    // A wrapper that re-emits the identity the card already carries. `/watchlist` nearly shipped
    // this: set arithmetic survives it, so `qa:player-filters` stays green, and every count
    // silently doubles.
    from: "          <section className=\"market-grid\">",
    to: "          <section className=\"market-grid\" data-row-id={paged[0]?.id}>",
    expect: "DUPLICATE",
  },
];
