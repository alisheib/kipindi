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
       which is the failure mode this repo pays for most often. */
    name: "⛔ THE SCANNER GOES BLIND · no anchored link is found at all",
    file: "src/lib/server/ai-usage.ts",
    expect: "at least 2 anchored link(s)",
    from: '"/admin/ai-usage#ai-cycle-gate"',
    to: '"/admin/ai-usage_NOPE"',
  },
];
