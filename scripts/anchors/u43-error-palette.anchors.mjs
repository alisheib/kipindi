/** Mutations of each U43 error-surface palette contract. */
export const MUTATIONS = [
  { name: "neutral RouteError medallion goes red", file: "src/components/ui/route-error.tsx", from: 'tone === "neutral" ? "border-border-strong bg-bg-overlay text-text-subtle"', to: 'tone === "neutral" ? "border-danger-border bg-danger-500/10 text-danger-fg"', expected: "1.1" },
  { name: "board error route loses neutral tone", file: "src/app/updown/error.tsx", from: 'tone="neutral"', to: 'tone="danger"', expected: "1.2" },
  { name: "round error route loses neutral tone", file: "src/app/updown/[roundId]/error.tsx", from: 'tone="neutral"', to: 'tone="danger"', expected: "1.2" },
  { name: "market error route loses neutral tone", file: "src/app/markets/error.tsx", from: 'tone="neutral"', to: 'tone="danger"', expected: "1.2" },
  { name: "board stake paints kit error red", file: "src/components/updown/updown-stake-controls.tsx", from: 'attention={customInvalid}', to: 'error={customInvalid}', expected: "2.1" },
  { name: "board stake range text goes red", file: "src/components/updown/updown-stake-controls.tsx", from: 'customInvalid ? "text-text" : "text-text-subtle"', to: 'customInvalid ? "text-danger-fg" : "text-text-subtle"', expected: "2.1" },
  { name: "round stake paints kit error red", file: "src/components/updown/round-stake-panel.tsx", from: 'attention={customInvalid}', to: 'error={customInvalid}', expected: "2.2" },
  { name: "round stake range text goes red", file: "src/components/updown/round-stake-panel.tsx", from: 'customInvalid ? "text-text" : "text-text-subtle"', to: 'customInvalid ? "text-danger-fg" : "text-text-subtle"', expected: "2.2" },
  { name: "stale chart receipt goes red", file: "src/components/charts/terminal-chart.tsx", from: 'guardedFeed.liveStale ? "var(--text-subtle)" : "var(--text-faint)"', to: 'guardedFeed.liveStale ? "var(--danger-fg)" : "var(--text-faint)"', expected: "3.1" },
  { name: "error-palette owner law erased", file: "docs/DESIGN_AUTHORITY.md", from: "The chart's delayed-source receipt is neutral", to: "The chart's delayed-source receipt is red", expected: "4.1" },
];
