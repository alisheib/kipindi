/**
 * Mutations for red:chart-one-home — each restores one shape of the defect class the
 * gate exists for, on a COPY of the tree, and names the check that must catch it.
 * ⚠️ Anchors are `includes()` substrings WITHOUT line endings on purpose: this tree
 * checks out CRLF and a `\n` in an anchor is a stale-harness report waiting to happen.
 */
export const MUTATIONS = [
  {
    name: "plant a private sparkline in the wallet (the pre-sprint state of this exact file)",
    file: "src/app/wallet/wallet-client.tsx",
    from: "function BalanceSpark({ series, label }: { series: number[]; label: string }) {",
    to: "function StraySpark({ line }: { line: string }) { return <svg><path d={line} /></svg>; }\n" +
        "function BalanceSpark({ series, label }: { series: number[]; label: string }) {",
    expect: "3.1 zero chart-shaped files outside the system",
  },
  {
    name: "plant a hand-rolled dash ring on /results (the pre-sprint OutcomeDonut)",
    file: "src/app/results/page.tsx",
    from: "function OutcomeDonut({ yes, no, voided, size = 38 }",
    to: "function StrayRing({ dash }: { dash: string }) { return <circle strokeDasharray={dash} />; }\n" +
        "function OutcomeDonut({ yes, no, voided, size = 38 }",
    expect: "3.1 zero chart-shaped files outside the system",
  },
  {
    name: "an exemption whose site vanished must be pruned, not left as a hole",
    file: "src/components/updown/round-stake-panel.tsx",
    from: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={arrow} /></svg>',
    to: "",
    expect: "3.2 every exemption still matches a detector",
  },
  {
    name: "a charting library arriving in package.json is a reversed ruling",
    file: "package.json",
    from: '"dependencies": {',
    to: '"dependencies": {\n    "uplot": "^1.6.31",',
    expect: "5.1 package.json carries no charting dependency",
  },
  {
    name: "a member losing its last import site is the Sparkline defect reborn",
    file: "src/app/updown/page.tsx",
    from: 'import { OutcomeCubes } from "@/components/charts/outcome-cubes";',
    to: "",
    expect: "4.x components/charts/outcome-cubes.tsx has an import site",
  },
];
