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
 * ✅ THE DEBT BELOW IS PAID — `sort-summary-unbound` IS BACK IN THE ARRAY, UNCHANGED. It was never
 * a bad mutation; it was a good mutation pointed at a driver that could not see its subject. The
 * record below is kept exactly as it was written, INCLUDING its wrong conclusion, because the
 * wrong conclusion is the lesson: it is what a measurement looks like when the instrument is the
 * thing that is broken. ⛔ Do not delete it and do not "correct" it in place — the correction is
 * the header above, which is dated after it.
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
 * ⚠️ SO ASSERTION 1 (NO OVERLAP) HAD NO RED PROOF. It was not unguarded — it runs on every measured
 * box, on every surface × width × locale — but nothing had been SEEN TO FAIL on it.
 *
 * ⭐ PAID 2026-09-09 — AND THE MUTATION WAS NEVER THE PROBLEM. THE INSTRUMENT WAS BLIND.
 *
 * 🔴 `qa:bar-geometry` EXEMPTED THE SORT SUMMARY FROM EVERY MEASUREMENT IT TAKES. Its EXEMPTION 1
 * walks up from an element looking for a shut `<details>`, and the walk began at
 * `e.parentElement` — but **a `<summary>`'s parent IS the `<details>` it opens**, so every summary
 * on every bar (the sort control and the `Filters` trigger both) was classified as "inside a
 * closed disclosure" and dropped before any assertion ran. The line of code directly above it had
 * always claimed the opposite — *"Its own `<summary>` is not inside it"* — so the intent was
 * written down and never implemented.
 *
 * ⛔ THE CONSEQUENCE IS THE WORST SHAPE A GUARD CAN TAKE: assertion 1 (NO OVERLAP) was
 * structurally incapable of failing on the one control whose 44px collision with the direction
 * button is the reason this entire driver was built. **A guard that exempts what it polices.**
 *
 * ⚠️ AND IT PRODUCED A FALSE RETRACTION. The 2026-09-08 note below concluded the defect "no longer
 * reproduces" because the mutated run "measured 7 boxes and reported NO overlap" — and it was
 * measured, not reasoned, which is normally the strongest evidence there is. It was still wrong:
 * the summary was one of the boxes the driver refused to measure, so the count of 7 was itself the
 * symptom. The theory built on it — that `labelClassName="hidden lg:inline"` had removed a third
 * competing element and dissolved the defect — was plausible, self-consistent, and false.
 *
 * Re-measured at 360/sw on the repaired driver, with `w-full` dropped and NOTHING else changed:
 *
 *     clean      summary 16→154 · direction button 154→198   → abut exactly, 0 overlap
 *     mutated    summary 16→206 · direction button 154→198   → 44px OVERLAP, as first reported
 *
 * ⭐ THE GENERAL LESSON, worth more than this one case: **when a red mutation stops reproducing,
 * suspect the instrument before you retire the case.** A measurement taken through a blind
 * instrument is not weaker evidence than a guess — it is stronger-looking evidence for a wrong
 * conclusion, and it comes with a number attached. The question that settles it is the one this
 * platform keeps having to relearn: *what would this check do if the defect were present?* Here,
 * nothing — and the box count was saying so out loud.
 *
 * ⚠️ ONE ARM IS STILL UNPROVEN, AND IT IS NAMED HERE RATHER THAN LEFT TO BE REDISCOVERED:
 * assertion 4's SECOND arm — "ANOTHER STICKY SURFACE IS DRAWN THROUGH THE BAR" — has no mutation.
 * That is the arm that caught the 91px search-band collision on three routes, and it is a
 * different code path from the "did not stick" arm that `bar-is-not-sticky` proves. The mutation
 * it wants is a search band made `sticky top-[56px]` again on `/proposals`, `/watchlist` or
 * `/results`, each of which carries a comment saying exactly why it is not sticky. ⛔ It is NOT
 * covered by the case below: assertion 1 compares controls INSIDE `[data-filter-rail]`, and the
 * search band is a sibling of the bar, so the two assertions cannot stand in for each other.
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
  {
    /**
     * 🔴 THE 44px OVERLAP — the defect this whole driver was built after, and the last of its
     * assertions to get a control. Measured on the live board at 360 before the repair existed:
     *
     *     /markets sw  summary 16→255 · direction button 154→198  → 44px OVERLAP
     *     /markets en  summary 16→218 · direction button 166→210  → 44px OVERLAP
     *     /markets zh  summary 16→162 · direction button 162→206  → 0  (short labels escape)
     *
     * The 44×44 direction button was drawn ON TOP of the sort label — "Za hivi karibuni" with an
     * arrow through it — in two of three languages, on the platform's reference bar. ⛔ And every
     * other gate was green: the DOCUMENT does not overflow, so `test:responsive` passed; the
     * radius and the tap floor were untouched, so `qa:filter-scan` passed.
     *
     * ⛔ AND IT IS THE ORIGINAL ONE-LINE MUTATION, UNCHANGED. It never needed rewriting — see the
     * header: it was retired on a measurement taken through a blind instrument. Re-measured on the
     * repaired driver, with `w-full` dropped and nothing else touched:
     *
     *     summary 16→206 · direction button 154→198  → 44px OVERLAP
     *
     * ⚠️ SWAHILI AT 360, CHOSEN NOT DEFAULTED. Swahili runs 35–40% longer than English and Chinese
     * escapes the defect entirely on label length alone; a proof run at `zh` would report NOT
     * CAUGHT and the harness would look like the defect. `SHAPE` in `red-bar-geometry.mjs` pins it.
     */
    name: "sort-summary-unbound",
    file: "src/components/ui/query-bar.tsx",
    from: '        className="w-full min-w-0 rounded-l-pill rounded-r-none border-r-0"',
    to: '        className="min-w-0 rounded-l-pill rounded-r-none border-r-0"',
    expect: "OVERLAP",
    route: "/markets",
  },
];
