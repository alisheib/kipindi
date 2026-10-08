/**
 * RED anchors for `npm run red:tab-anchors` — the control for `test:tab-anchors` (§K rule 7d ③).
 *
 * ⛔ EVERY CASE MUST MAKE THE GATE EXIT NON-ZERO AND PRINT ITS OWN `FAIL` LINE. "Something went
 * red" is not a control: a defect caught for the wrong reason is reported as WRONG REASON.
 *
 * ⭐ THE FIRST CASE IS THE REAL DEFECT, REPLAYED VERBATIM. Stripping `?tab=settings` off the
 * Credit-budget remedy is exactly what the codebase looked like the moment `/admin/ai-usage`
 * took a section rail: a link that resolves, returns 200, and lands an officer on a section with
 * no such control anywhere on it. If this case does not go red, the gate is decoration.
 */
export const MUTATIONS = [
  {
    name: "⭐ THE REAL DEFECT REPLAYED · the remedy link loses its tab",
    file: "src/lib/server/ai-usage.ts",
    expect: 'lives on "settings", href selects "cycles"',
    from: '"/admin/ai-usage?tab=settings#ai-credit-budget"',
    to: '"/admin/ai-usage#ai-credit-budget"',
  },
  {
    name: "the anchor itself is renamed · the button scrolls nowhere",
    file: "src/app/admin/ai-usage/page.tsx",
    expect: "#ai-credit-budget is rendered",
    from: 'id="ai-credit-budget"',
    to: 'id="ai-credit-budget-renamed"',
  },
  {
    /* ⛔ THE VACUITY CASE. A scanner that finds nothing reports a serene pass over an empty set,
       which is the failure mode this repo pays for most often.
       ⚠️ RE-DERIVED 2026-10-08, AND THIS CASE HAD BEEN A SILENT NO-OP SINCE 3b17b03e (2026-09-18). The plant lands
       (one link stops matching) but it only proves the floor while the floor EQUALS the population: a third link
       arrived with C7 step 3 and the floor stayed at 2, so losing one link left two, cleared the floor, and the
       gate exited 0 — this control correctly reported it blind. `FLOOR` in `tab-anchors.test.mts` is 3 again
       (the population), and `expect` names the assertion WITHOUT its number so that re-deriving the floor next
       time cannot strand this case a second time. */
    name: "⛔ THE SCANNER GOES BLIND · no anchored link is found at all",
    file: "src/lib/server/ai-usage.ts",
    expect: "anchored link(s) — the scanner still finds them",
    from: '"/admin/ai-usage#ai-cycle-gate"',
    to: '"/admin/ai-usage_NOPE"',
  },
];
