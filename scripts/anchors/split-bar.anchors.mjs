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
  {
    // 🔴 THE OTHER HALF OF PV-06, and `/live` proved they are different defects: this surface
    // used the kit primitive CORRECTLY and still fabricated, because the call passed no `empty`
    // prop — so the cold-start rail was unreachable there under any data. Removing the branch is
    // exactly how it shipped.
    // ⚠️ THE BRANCH IS DELETED, NOT DISABLED, and the first draft got that wrong. Rewriting the
    // test to `{false ? (` left the empty arm's TEXT in place, and the rule's sibling heuristic
    // (an `empty` bar within ~700 chars counts as the cold-start branch) happily accepted it —
    // the mutation passed. That is a real limit of a proximity heuristic, stated here rather
    // than hidden: it proves a branch EXISTS nearby, not that it is reachable. Deleting the arm
    // is how the defect actually shipped, and it is what this must catch.
    name: "the live wall renders the kit bar with no cold-start branch (PV-06, second pass)",
    file: "src/app/live/pulse-grid.tsx",
    expect: "tipping-bar-without-cold-start in src/app/live/pulse-grid.tsx",
    from: `        {yes === null ? (
          <TippingBar height={9} showLabels={false} recastOnHover={false}
            empty emptyLabel={t.market.noBetsYet} />
        ) : (
          <TippingBar yesPct={yes} height={9} showLabels={false} recastOnHover={false}
            probabilityLabel={t.market.probBarAria.replace("{side}", sideWord(t, "YES", isUpDown ? "UPDOWN" : "MARKET"))} />
        )}`,
    to: `        <TippingBar yesPct={yes} height={9} showLabels={false} recastOnHover={false}
          probabilityLabel={t.market.probBarAria.replace("{side}", sideWord(t, "YES", isUpDown ? "UPDOWN" : "MARKET"))} />`,
  },
];
