/**
 * RED anchors for `npm run test:ui-consistency`'s `hand-rolled-split-bar` rule (PV-06).
 *
 * ⛔ "THE SUITE WENT RED" IS NOT A RED PROOF HERE, and that is why this rule needed its own
 * harness rather than leaning on the suite's exit code. `test:ui-consistency` carries ~75
 * baselined (rule,file) pairs, so ANY unrelated drift turns it red. Each mutation below is
 * therefore checked against the rule's own output line — the value, not the symptom.
 *
 * ⭐ THE SECOND MUTATION IS THE ONE WORTH HAVING, and it is not about the bar at all. It aims
 * the defect at a DIFFERENT `page.tsx` than the one `SPLIT_BAR_ALLOW` exempts. Every other
 * allow-list in `ui-consistency.test.mts` keys on `basename(f)`; copying that idiom for a file
 * called `page.tsx` would have exempted **every page in the App Router** — an allow-list that
 * silently stops policing the thing it names, which is the exact failure this repo keeps paying
 * for. The mutation is what proves the exemption is path-precise instead of basename-wide.
 */

/** The hand-rolled shape, as it actually stood on production before PV-06. */
const HAND_ROLLED =
  '<span style={{ width: `${upPct}%`, background: "var(--yes-500)" }} />\n' +
  '          <span style={{ width: `${downPct}%`, background: "var(--no-500)" }} />\n';

export const MUTATIONS = [
  {
    name: "the Up & Down card draws its own two-span bar again (PV-06, live 2026-09-03)",
    file: "src/components/updown/updown-card.tsx",
    expect: "hand-rolled-split-bar in src/components/updown/updown-card.tsx",
    from: `        {upPct === null ? (`,
    to: `        {${HAND_ROLLED}        {upPct === null ? (`,
  },
  {
    name: "⭐ a DIFFERENT page.tsx is not covered by the /positions exemption",
    file: "src/app/updown/[roundId]/page.tsx",
    expect: "hand-rolled-split-bar in src/app/updown/[roundId]/page.tsx",
    from: `                {upPct === null ? (`,
    to: `                {${HAND_ROLLED}                {upPct === null ? (`,
  },
];
