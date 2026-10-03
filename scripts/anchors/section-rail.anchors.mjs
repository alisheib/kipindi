/**
 * RED anchors for `npm run red:section-rail` — the control for §K rule 7g's `test:section-rail`.
 *
 * ⛔ EVERY CASE MUST MAKE THE GATE EXIT NON-ZERO *AND* MOVE THE FINDING COUNT, with the
 * POPULATION HELD STEADY. A control that moves the denominator has changed the subject set
 * rather than planted a defect, and would "prove" the gate works while proving nothing.
 *
 * ⭐ THE HARNESS IMPORTS THIS FILE — it is not a second description of the same mutations.
 * `red-anchors.test.mts` exists because a harness that hides its anchors from the fleet
 * auditor is a harness whose anchors rot in silence; declaring them in a file the harness does
 * NOT read would re-create exactly that gap one level over. `from` strings are therefore live:
 * if a rail is reformatted, `red:section-rail` fails to find its anchor and says so, and the
 * auditor flags the same string on its own sweep.
 *
 * 7g names these three rails as the control. Each is a rail of destinations that correctly
 * announces the one in force; removing that announcement must be visible to the gate.
 */

export const MUTATIONS = [
  {
    name: "the player's bottom nav stops saying which tab is current",
    file: "src/components/layout/bottom-nav.tsx",
    expect: "every rail of destinations names the one in force",
    /* ⚠️ RE-INDENTED 2026-09-28, not re-aimed: the line is unchanged, but the slot markup moved
       into a `RailDest` component so the centre Deposit coin could take the middle track
       (UPDATE-2026-09-28 §2). Anchors match literal text, so an indentation change is a MISS —
       the same silent-stop this sidecar exists to prevent.
       🔴 2026-10-03 — THIS CONTROL HAD BEEN BLIND SINCE THE COIN LANDED. The coin keeps its own
       `aria-current` (on `coinOn`), and the gate reads a nav block as a whole: with the tabs' marker
       gone and the coin's still there, the block still "announced", so red:section-rail printed
       "the gate did NOT notice" on every run. The defect this control plants is the whole rail
       going silent, so it now strips BOTH markers — the tabs' (`from`) and the coin's (`also`). */
    from: `        aria-current={on ? "page" : undefined}`,
    to: `        data-was-current={on ? "page" : undefined}`,
    also: [[`            aria-current={coinOn ? "page" : undefined}`, `            data-was-current={coinOn ? "page" : undefined}`]],
  },
  {
    name: "the legal sidebar stops saying which document is open",
    file: "src/app/legal/legal-nav.tsx",
    expect: "every rail of destinations names the one in force",
    from: `            aria-current={active ? "page" : undefined}`,
    to: `            data-was-current={active ? "page" : undefined}`,
  },
  {
    name: "the admin mobile drawer stops saying which console page is open",
    file: "src/components/admin/admin-mobile-nav.tsx",
    expect: "every rail of destinations names the one in force",
    from: `                        aria-current={active ? "page" : undefined}`,
    to: `                        data-was-current={active ? "page" : undefined}`,
  },
  {
    name: "the journey tab rail stops saying which tab is current",
    file: "src/components/journey/journey-tabs.tsx",
    expect: "every rail of destinations names the one in force",
    /* S6 WP6a — the journey's rail (SJ-16) takes aria-current from `tabAriaCurrent` (A12): "page" on a tab's own page,
       "true" on the rest of its section. AppShell mounts it for a journey request (WP6b); the gate reads source, so the
       control held from the commit that added it, before the mount. */
    from: `                    aria-current={tabAriaCurrent(pathname, d.key)}`,
    to: `                    data-was-current={tabAriaCurrent(pathname, d.key)}`,
  },
];

/**
 * ⭐ THE FOURTH CASE IS NOT A MUTATION OF A VALUE — it empties the SUBJECT SET, and it is the
 * one this gate most needs. A coverage gate that reports "0 findings" over a population of 0
 * is indistinguishable from a clean run, and that is the vacuous pass this programme has paid
 * for repeatedly. Turning the rails' `<nav>` into `<div>` must drop the population below the
 * floor and exit non-zero, LOUDLY, rather than pass with nothing to look at.
 * ⚠️ Kept out of `MUTATIONS` deliberately: the fleet auditor reads that array as
 * value-mutations with a findable `from`, and a whole-tag rewrite is a different shape.
 */
export const VACUITY_TARGETS = MUTATIONS.map((m) => m.file);
