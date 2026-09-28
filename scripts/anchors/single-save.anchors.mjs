/**
 * RED anchors for `npm run red:single-save` — the control for `test:single-save` (ONE SAVE ON SCREEN,
 * owner 2026-09-22 and 2026-09-26).
 *
 * ⛔ EVERY CASE MUST MAKE THE GATE EXIT NON-ZERO AND PRINT A `FAIL` LINE FOR EACH STRING IN `expect` —
 * and no FAIL on any other check. A defect caught for the wrong reason, or caught alongside collateral
 * reds, is reported as such: a control that accepts any red stops controlling the day the gate starts
 * failing for something else.
 *
 * ⭐ THE KIT CASES MATTER MOST. A gate that only checked adoption would keep passing while the thing
 * adopted was emptied: every `THE KIT` case leaves each call site perfectly wired and destroys the
 * guarantee — "any pixel" and "BEHIND the bar" are the two defects this gate was written for (a Save
 * one pixel on screen counted as in reach; a Save behind the bar counted as visible).
 * ⚠️ Four of them keep the words the check looks for and break the meaning — a second Save beside
 * the guarded one, `||` beside the ratio, the first record, a 0px band. A check that read only the
 * shape stayed green on each (review, 2026-09-26).
 *
 * `offersDelta` declares how a case moves §2's population of bars that offer a Save; any other move
 * is refused by the harness (a control that shrinks the denominator changed the subject).
 */
export const MUTATIONS = [
  {
    name: "⭐ config form loses its saveAnchor · the bar paints a second Save beside the form's own",
    file: "src/app/admin/config/config-form.tsx",
    expect: ["2.a src/app/admin/config/config-form.tsx#1"],
    from: `saveAnchor={saveRef}`,
    to: ``,
  },
  {
    name: "bonus settings lose their saveAnchor · the twin of the affiliate console",
    file: "src/app/admin/bonuses/bonus-admin-client.tsx",
    expect: ["2.a src/app/admin/bonuses/bonus-admin-client.tsx#1"],
    from: `saveAnchor={saveRef}`,
    to: ``,
  },
  {
    name: "⭐ THE KIT · the bar's Save no longer waits for the form's to leave the screen",
    file: "src/components/ui/unsaved-changes.tsx",
    expect: ["1.2 the bar's Save renders only when"],
    from: `{shownSave && !anchorOnScreen && (`,
    to: `{shownSave && (`,
  },
  {
    name: "THE KIT · a second, unguarded Save beside the guarded one",
    file: "src/components/ui/unsaved-changes.tsx",
    expect: ["1.2 the bar's Save renders only when"],
    from: `{shownSave && !anchorOnScreen && (`,
    to: `<Button type="button" size="sm" onClick={() => shownSave()}>Save</Button>
                {shownSave && !anchorOnScreen && (`,
  },
  {
    name: "⭐ THE KIT · any pixel of the form's Save counts as in reach again (DEFECT 1)",
    file: "src/components/ui/unsaved-changes.tsx",
    expect: ["1.3 the on-screen test requires"],
    from: `setAnchorOnScreen(!!r && r.isIntersecting && r.intersectionRatio >= 0.75);`,
    to: `setAnchorOnScreen(!!r && r.isIntersecting);`,
  },
  {
    name: "THE KIT · the ratio is still written, but `||` lets one pixel through",
    file: "src/components/ui/unsaved-changes.tsx",
    expect: ["1.3 the on-screen test requires"],
    from: `r.isIntersecting && r.intersectionRatio >= 0.75`,
    to: `(r.isIntersecting || r.intersectionRatio >= 0.75)`,
  },
  {
    name: "THE KIT · the test reads the FIRST record of the batch, not the latest",
    file: "src/components/ui/unsaved-changes.tsx",
    expect: ["1.3 the on-screen test requires"],
    from: `records[records.length - 1]`,
    to: `records[0]`,
  },
  {
    name: "THE KIT · it watches this instance's anchor instead of the painted entry's",
    file: "src/components/ui/unsaved-changes.tsx",
    expect: ["1.4 it observes the PAINTED entry's saveAnchor"],
    from: `const shownAnchorEl = top?.props.current.saveAnchor?.current ?? null;`,
    to: `const shownAnchorEl = props.saveAnchor?.current ?? null;`,
  },
  {
    name: "⭐ THE KIT · a Save BEHIND the bar counts as on screen again (DEFECT 2)",
    file: "src/components/ui/unsaved-changes.tsx",
    expect: ["1.5 it excludes the bar's own band"],
    from: "{ threshold: 0.75, rootMargin: `0px 0px -${reservePx}px 0px` }",
    to: `{ threshold: 0.75 }`,
  },
  {
    name: "THE KIT · the rootMargin keeps its shape but the band it cuts is 0px",
    file: "src/components/ui/unsaved-changes.tsx",
    expect: ["1.5 it excludes the bar's own band"],
    from: `setReservePx(h);`,
    to: `setReservePx(0);`,
  },
  {
    name: "the ref is never attached · saveAnchor points at a button that is not mounted",
    file: "src/app/admin/config/config-form.tsx",
    expect: ["2.r src/app/admin/config/config-form.tsx#1"],
    from: `<Button ref={saveRef}`,
    to: `<Button`,
  },
  /**
   * ⭐ WHY 2.r IS SCOPED TO THE BAR'S COMPONENT, NOT ITS FILE. `staff-forms.tsx` holds two forms that
   * both name their ref `saveRef`; with the Add form's ref gone, a per-file match would still find the
   * role form's button and pass.
   */
  {
    name: "⭐ ANOTHER FORM'S BUTTON VOUCHES FOR THIS BAR · two components, one ref name",
    file: "src/app/admin/staff/staff-forms.tsx",
    expect: ["2.r src/app/admin/staff/staff-forms.tsx#2"],
    from: `<Button ref={saveRef} type="submit"`,
    to: `<Button type="submit"`,
  },
  {
    name: "⭐ A NEW SAVE ON A BAR THAT HAD NONE · no anchor, no saving",
    file: "src/app/admin/players/[id]/set-email-form.tsx",
    expect: [
      "2.a src/app/admin/players/[id]/set-email-form.tsx#1",
      "2.b src/app/admin/players/[id]/set-email-form.tsx#1",
    ],
    offersDelta: 1,
    from: `label="Email not set"`,
    to: `label="Email not set"
        onSave={() => setEmail(email)}`,
  },
  {
    name: "a spread on the bar · what it passes can no longer be read",
    file: "src/app/admin/sources/source-controls.tsx",
    expect: ["2.s src/app/admin/sources/source-controls.tsx#1"],
    from: `detail="A source that is not added cannot be cited by any market."`,
    to: `{...{ detail: "A source that is not added cannot be cited by any market." }}`,
  },
  {
    name: "a bar with no Save keeps a Save label · half-wired decision bar",
    file: "src/app/admin/players/[id]/set-email-form.tsx",
    expect: ["2.d src/app/admin/players/[id]/set-email-form.tsx#1"],
    from: `label="Email not set"`,
    to: `label="Email not set"
        saveLabel="Set email"`,
  },
  {
    name: "the bar is imported under another name · invisible to every tag rule",
    file: "src/app/admin/players/[id]/set-email-form.tsx",
    expect: ["2.i PendingChangesBar is never imported"],
    from: `import { UnsavedChangesGuard, PendingChangesBar } from "@/components/ui/unsaved-changes";`,
    to: `import { UnsavedChangesGuard, PendingChangesBar, PendingChangesBar as SaveBar } from "@/components/ui/unsaved-changes";`,
  },
  {
    name: "the bar's Save and the form's Save say different words",
    file: "src/app/admin/config/config-form.tsx",
    expect: ["4.1 src/app/admin/config/config-form.tsx#1"],
    from: `saveLabel="Save · Hifadhi"`,
    to: `saveLabel="Save changes"`,
  },
  /**
   * ⛔ VACUITY — the whole admin console is deleted from the copy. Every per-bar rule then reports over
   * nothing and would print green; the coverage floors (2.0 bars, 4.2 label pairs) must be what fails.
   * A PATH case, so `test:red-anchors` §3 audits that the directory is really there to delete.
   */
  {
    name: "VACUITY · the admin console is gone; 0 findings must NOT read as a pass",
    kind: "path",
    path: "src/app/admin",
    presence: "present",
    expect: ["2.0 CONTROL", "4.2 CONTROL"],
  },
];
