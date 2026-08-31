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
];
