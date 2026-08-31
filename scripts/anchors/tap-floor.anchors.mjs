/**
 * RED anchors for `npm run red:tap-floor` — the control for `test:tap-target` §5 (DG-A-08).
 *
 * ⛔ EVERY CASE MUST MAKE THE GATE EXIT NON-ZERO AND FAIL THE NAMED CHECK, WITH THE POPULATION
 * HELD STEADY. A control that moves the denominator has changed the subject set rather than
 * planted a defect, and would "prove" the gate works while proving nothing — which is why §5.3
 * prints the population and the harness compares it before and after every mutation.
 *
 * ⭐ THE HARNESS IMPORTS THIS FILE. `red-anchors.test.mts` exists because a harness that hides
 * its anchors from the fleet auditor is a harness whose anchors rot in silence; declaring them
 * in a file the harness does NOT read would re-create that gap one level over. The `from`
 * strings are therefore live — reformat one of these call sites and this control says so.
 *
 * ⭐ THE FIRST TWO ARE THE REAL SHIPPED DEFECT, PUT BACK. They are not invented mutations: this
 * is byte-for-byte what `/admin/updown/proposals` carried until 2026-08-31 — a 22px bare-text
 * "Reject" and a 22px hand-rolled "View chain", in the same table cell as a 40px
 * `<Button size="sm">Review</Button>`. If §5.2 cannot fail on the exact code that motivated it,
 * it is decoration.
 */

export const MUTATIONS = [
  {
    name: "the 22px bare-text Reject lever comes back to the proposals row",
    file: "src/app/admin/updown/proposals/proposal-actions.tsx",
    expect: "5.2",
    /* +1: the mutation turns a kit <Button> (not a raw padded tag, so not in 5.2s population)
       back into a raw padded <button>. The denominator SHOULD grow by exactly one — that growth
       is the defect arriving, not the subject set changing under the gate. */
    paddedDelta: 1,
    from: `      <Button type="button" onClick={() => setRejectOpen(true)} variant="ghost" size="sm">Reject</Button>`,
    to: `      <button type="button" onClick={() => setRejectOpen(true)} className="font-mono text-micro uppercase tracking-[0.1em] text-text-subtle px-2 py-1">Reject</button>`,
  },
  {
    name: "the row's way out stops being .row-link and goes back to a hand-rolled 22px link",
    file: "src/app/admin/updown/proposals/page.tsx",
    expect: "5.2",
    /* +1 for the same reason: at HEAD this link declares NO padding (it is inline text on the
       .row-link recipe), so 5.2 does not look at it. The mutation gives it px-2 py-1 and it
       enters the population as a box. */
    paddedDelta: 1,
    from: `className="row-link font-mono text-micro text-text-subtle hover:text-text"`,
    to: `className="font-mono text-micro uppercase tracking-[0.1em] text-text-subtle hover:text-text px-2 py-1"`,
  },
  {
    name: "an admin search input hand-types the 32px rung's VALUE instead of naming it",
    file: "src/app/admin/markets/page.tsx",
    expect: "5.1",
    from: `className="h-[var(--h-control-xs)] w-full rounded-md border border-border bg-bg-overlay pl-9`,
    to: `className="h-[32px] w-full rounded-md border border-border bg-bg-overlay pl-9`,
  },
  {
    name: "an admin control declares a height nobody decided (30px), under the floor and off the rung",
    file: "src/components/admin/ai-toolkit.tsx",
    expect: "5.1",
    from: `className="min-h-[var(--tap-min)] mt-3 flex items-center justify-between`,
    to: `className="min-h-[30px] mt-3 flex items-center justify-between`,
  },
];

/**
 * ⭐ THE VACUITY CASE IS NOT A MUTATION OF A VALUE — it empties the SUBJECT SET, and it is the
 * one §5 most needs. Two checks that report "0 findings" are indistinguishable from two checks
 * that can see nothing, and this programme has shipped that vacuous pass more than once. With
 * the admin tree removed, §5.3 must fail LOUDLY rather than letting 5.1 and 5.2 print green
 * over a population of zero.
 * ⚠️ Kept out of MUTATIONS deliberately: the fleet auditor reads that array as value-mutations
 * with a findable `from`, and deleting a directory is a different shape.
 */
export const VACUITY_DIR = "src/app/admin";
