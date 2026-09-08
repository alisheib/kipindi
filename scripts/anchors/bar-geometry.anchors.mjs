/**
 * MUTATIONS for `npm run red:bar-geometry` — the RED proof of `qa:bar-geometry`.
 *
 * 🔴 WHY THIS FILE EXISTS: THE GATE WAS COUNTED TOWARD STAGE 6 WITHOUT ONE. `docs/PLAYER-QUERY-
 * CAMPAIGN.md` §0 recorded the debt in writing — *"`qa:bar-geometry` is counted toward Stage 6 but
 * has no RED control, which Stage 6's own exit condition requires ('each new guard's RED control
 * has been seen to fail'). The three geometry defects it found were fixed on the strength of an
 * unreproducible hand mutation. Build its control before crediting it."*
 *
 * ⛔ EVERY MUTATION BELOW RESTORES A DEFECT THIS PLATFORM ACTUALLY SHIPPED, with the measurement
 * that found it. A red harness whose mutations are invented proves the gate catches inventions.
 *
 * ⚠️ AND EVERY ONE OF THEM WAS INVISIBLE TO EVERY OTHER GATE. That is the whole argument for this
 * driver: the DOCUMENT does not overflow in any of these cases, so `test:responsive` is green; the
 * pill radius and the 44px floor are untouched in three of the four, so `qa:filter-scan` is green.
 * Nothing else on the platform asks whether two controls occupy the same pixels, whether a control
 * has fallen off the right edge, or whether the bar is still stuck to the top after a scroll.
 */
/**
 * ⛔ THE REMOVED CASE, KEPT AS A RECORD OUTSIDE THE ARRAY so it cannot be revived by deleting a
 * marker, and so nobody re-derives it from scratch.
 *
 *   name   sort-summary-unbound
 *   file   src/components/ui/query-bar.tsx
 *   from   className="w-full min-w-0 rounded-l-pill rounded-r-none border-r-0"
 *   to     the same string with `w-full` dropped
 *   expect OVERLAP   ·   route /markets   ·   360 / sw
 *
 * Measured on the live board at 360 before the original fix existed:
 *
 *     /markets sw  summary 16→255 · direction button 154→198  → 44px OVERLAP
 *     /markets en  summary 16→218 · direction button 166→210  → 44px OVERLAP
 *     /markets zh  summary 16→162 · direction button 162→206  → 0  (short labels escape)
 *
 * The 44×44 direction button was drawn ON TOP of the sort label — "Za hivi karibuni" with an arrow
 * through it — in two of three languages, on the platform's reference bar.
 *
 * ⛔ AND `w-full` WAS THE FIX, NOT `shrink`: the summary is not a flex item (its parent
 * `<details>` is a plain block), so `flex-shrink` had no one to negotiate with.
 *
 * 🔴 IT NO LONGER REPRODUCES — measured 2026-09-08, not reasoned. Mutation applied, dev server
 * recompiled, `--only=/markets --widths=360 --locales=sw` measured 7 boxes and reported NO
 * overlap. `QuerySort` now passes `labelClassName="hidden lg:inline"`, so below `lg` the quiet
 * "Sort" key is not rendered at all and the value has the whole control to live in. The overlap
 * needed the key AND the value AND the button competing for one line.
 *
 * ⚠️ SO ASSERTION 1 (NO OVERLAP) HAS NO RED PROOF. It is not unguarded — it runs on every measured
 * box, on every surface × width × locale — but nothing has been SEEN TO FAIL on it. ⛔ A mutation
 * that reproduces an overlap on the CURRENT markup is OWED. See the campaign board's Stage 6 row.
 */
export const MUTATIONS = [
  {
    /**
     * 🔴 THE 162px CLIP. Measured by this driver on its first full run:
     *
     *     /proposals sw 1280 — CLIPPED "Mchanganyiko / Zote" 1239→1442 vs viewport 1280
     *
     * ⚠️ NOT A `/proposals` BUG — a LATENT one everywhere. Every bar hand-wrote its desktop group
     * as `shrink-0` with no wrap; only that route had EIGHT categories AND the platform's longest
     * pill label, so only it was unlucky enough to prove it. `QUERY_GROUP_CLASS` owns the wrapper
     * now and all fifteen sites take it, so this single mutation reproduces the defect on every
     * bar at once — which is why the route below is the one that fails FIRST and hardest.
     *
     * ⛔ `min-w-0` GOES WITH `flex-wrap`, and dropping only one of them would be a weaker
     * mutation: without `min-w-0` a group's min-content width is its widest pill, so a flex parent
     * lets it exceed the line rather than break. The mutation restores the exact shipped string.
     */
    name: "desktop-group-does-not-wrap",
    file: "src/components/ui/query-bar.tsx",
    from: 'export const QUERY_GROUP_CLASS = "hidden min-w-0 flex-wrap items-center gap-1 lg:flex";',
    to: 'export const QUERY_GROUP_CLASS = "hidden shrink-0 items-center gap-1 lg:flex";',
    expect: "CLIPPED",
    route: "/proposals",
  },
  {
    /**
     * 🔴 THE BAR THAT STOPPED STICKING. `/updown/history` reported `bar@-252` while every other
     * surface reported `bar@56`: its bar sat inside a 247px wrapper, and a sticky element only
     * sticks within its PARENT's box — so it unpinned after a quarter of a screen, on the one
     * route that can render four hundred rows.
     *
     * ⚠️ NOT VISIBLE AT SCROLL 0, which is where every screenshot in this campaign was taken until
     * this assertion existed. That is what makes it worth a mutation rather than an eye.
     *
     * ⛔ The mutation removes the stick from the SHARED class rather than re-creating the short
     * wrapper on one route, because the shared class is where the property now lives — and a
     * mutation that reproduced the old wrapper would be testing a page that no longer exists.
     */
    name: "bar-is-not-sticky",
    file: "src/components/ui/query-bar.tsx",
    from: '  "kp-discovery-bar sticky top-[56px] z-20 -mx-3 bg-bg-base px-3 lg:-mx-6 lg:px-6";',
    to: '  "kp-discovery-bar relative z-20 -mx-3 bg-bg-base px-3 lg:-mx-6 lg:px-6";',
    expect: "stick",
    route: "/markets",
  },
  {
    /**
     * 🔴 THE TAP FLOOR. Every control in a bar must reach 44px — the platform's own floor, and the
     * one `qa:filter-scan` already polices on PILLS. ⚠️ It does not police the sort menu's rows or
     * the Clear control, which are not pills, so this driver is the only thing standing under them.
     *
     * ⛔ 43, NOT 20. A mutation to something obviously tiny would also be caught by an eye and by
     * three other gates; one pixel under the floor is the failure that ships, and it is the one a
     * measurement has to catch because nothing else can.
     */
    name: "control-below-the-tap-floor",
    file: "src/components/ui/query-bar.tsx",
    /**
     * ⚠️ IT MUTATES THE DIRECTION BUTTON, AND THE FIRST DRAFT MUTATED `QueryOption` AND STAYED
     * GREEN — the gate was right, not blind. `QueryOption` renders the sort MENU's rows, which
     * live inside a CLOSED `<details>`, and this driver deliberately exempts that subtree: Chrome
     * lays a closed `<details>` out and neither paints nor hit-tests it, so measuring it reported
     * eighteen false defects on the reference bar in the driver's own first draft.
     *
     * ⭐ SO AN UNMEASURED CONTROL IS AN UNPROVABLE MUTATION. The direction button is always
     * visible in the bar at every width, which is what makes it the right subject — and the
     * lesson generalises: a red mutation has to land somewhere the instrument can SEE.
     */
    from: '        className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-r-pill border border-border-control bg-bg-inset text-text-muted hover:text-text"',
    to: '        className="inline-flex h-[43px] w-[44px] shrink-0 items-center justify-center rounded-r-pill border border-border-control bg-bg-inset text-text-muted hover:text-text"',
    expect: "SHORT",
    route: "/markets",
  },
];
