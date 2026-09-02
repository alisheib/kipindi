/**
 * RED anchors for `npm run red:unsaved-changes` — the control for DG-S-04's
 * `test:unsaved-changes` (§K rule 7d).
 *
 * ⛔ EVERY CASE MUST MAKE THE GATE EXIT NON-ZERO AND PRINT ITS OWN `FAIL` LINE. "Something went
 * red" is not a control: a defect caught for the wrong reason is reported as WRONG REASON.
 *
 * ⭐ THE FIRST TWO MATTER MOST, AND THEY ARE ABOUT THE PRIMITIVE, NOT THE CALL SITES. A gate
 * that only checked adoption would keep passing while the thing being adopted was emptied — the
 * vacuous shape this programme has paid for repeatedly. `gutted-unload` and `bubble-phase` both
 * leave every call site untouched and perfectly "adopted", and both destroy the guarantee.
 *
 * ⚠️ `bubble-phase` is the subtle one and it is the reason that check exists at all: flipping
 * the capture flag to `false` is a ONE-CHARACTER change that reads as a tidy-up, compiles, runs,
 * and silently stops guarding — `next/link` handles the click on bubble, so the router has
 * already been told to navigate before a bubble-phase listener ever sees the event.
 */
export const MUTATIONS = [
  {
    name: "⭐ THE PRIMITIVE IS GUTTED · nothing listens for the tab closing",
    file: "src/components/ui/unsaved-changes.tsx",
    expect: "1.2 exit ① · it installs a beforeunload listener",
    from: `    window.addEventListener("beforeunload", onBeforeUnload);`,
    to: `    void onBeforeUnload;`,
  },
  {
    name: "⭐ BUBBLE PHASE · one character, and the in-app guard stops guarding",
    file: "src/components/ui/unsaved-changes.tsx",
    expect: "1.4 exit ② · it intercepts clicks in the CAPTURE phase",
    from: `    document.addEventListener("click", onClick, true);`,
    to: `    document.addEventListener("click", onClick, false);`,
  },
  {
    name: "a money-adjacent admin form stops guarding its exits",
    file: "src/app/admin/updown/updown-controls.tsx",
    expect: "2.x app/admin/updown/updown-controls.tsx guards its exits",
    from: `      <UnsavedChangesGuard`,
    to: `      <NotTheGuard`,
  },
  /**
   * ⭐ THE CASE THE OLD GATE COULD NOT HAVE FAILED, and the reason §2 was rebuilt. Until
   * 2026-09-01 the population was "admin files that compute a `dirty`", so a NEW form that
   * simply never protected itself was invisible — it stayed out of the set precisely BECAUSE it
   * was unguarded, and the gate reported a serene pass. This plants exactly that: a typed
   * control on a file that has none, no dirty flag, no guard, nothing. The gate must demand one.
   */
  {
    name: "⭐ A BRAND-NEW UNGUARDED FORM · a typed control on a file that never had one",
    file: "src/app/admin/ai-polls/poll-filters.tsx",
    expect: "2.x app/admin/ai-polls/poll-filters.tsx guards its exits",
    from: `    <div className="space-y-3">`,
    to: `    <div className="space-y-3"><textarea defaultValue="" />`,
  },
  /**
   * ⛔ AND THE EXEMPTION LIST IS CHECKED IN BOTH DIRECTIONS. A named exemption is only honest
   * while it stays true, so these two prove the list cannot rot into a permission slip: one
   * makes an exempt file guarded (the entry must then be deleted), the other takes an exempt
   * file out of the population entirely (a stale path covering nothing).
   */
  {
    name: "an EXEMPT file gains a guard · the stale entry must be deleted",
    file: "src/app/admin/roles/read-tiers-matrix.tsx",
    expect: "2.x app/admin/roles/read-tiers-matrix.tsx — guarded, and not also claimed exempt",
    from: `<Select`,
    to: `<UnsavedChangesGuard dirty={false} /><Select`,
  },
  /**
   * ⚠️ THE ANCHOR IS THE FILE'S ONLY TYPED CONTROL, AND THAT IS NOT A DETAIL. The first draft
   * planted this on `config/fee-simulator.tsx`, which renders THREE `<Input>`s — and
   * `String.replace` swaps the first occurrence only, so the file kept two, stayed in the
   * population, and the gate correctly saw nothing wrong. The control reported that as the gate
   * being BLIND. ⭐ A mutation that does not actually create the defect proves nothing about the
   * gate; `kill-switch-toggle.tsx` has exactly one `<input>`, so removing it really does take
   * the file out of the population and leave the EXEMPT entry naming nothing.
   */
  {
    name: "an EXEMPT path stops naming a form · the list outlived its file",
    file: "src/app/admin/payments/kill-switch-toggle.tsx",
    expect: `2.e EXEMPT "app/admin/payments/kill-switch-toggle.tsx" still names a file in the population`,
    from: `<input`,
    to: `<NotAnInput`,
  },
];
