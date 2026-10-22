/** Restored gilt bar marker anchors; the harness mutates disposable copies. */
export const MUTATIONS = [
  { name: "plain marker", file: "src/app/globals.css", kind: "css", from: "--bar-needle:           var(--gilt);", to: "--bar-needle:           var(--text);", expected: "2.1" },
  { name: "plain glow", file: "src/app/globals.css", kind: "css", from: "--bar-needle-glow:      color-mix(in oklab, var(--gilt) 55%, transparent);", to: "--bar-needle-glow:      color-mix(in oklab, var(--text) 55%, transparent);", expected: "2.2" },
  { name: "plain settled shimmer", file: "src/app/globals.css", kind: "css", from: "--bar-shimmer:          linear-gradient(90deg, transparent 0%, oklch(75% 0.110 84 / 0.5) 50%, transparent 100%);", to: "--bar-shimmer:          linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--text) 32%, transparent) 50%, transparent 100%);", expected: "2.3" },
  { name: "plain hover sweep", file: "src/app/globals.css", kind: "css", from: "--bar-sweep:            linear-gradient(90deg, transparent 0%, oklch(78% 0.115 84 / 0) 20%, oklch(78% 0.115 84 / 0.90) 50%, oklch(78% 0.115 84 / 0) 80%, transparent 100%);", to: "--bar-sweep:            linear-gradient(90deg, transparent 0%, transparent 20%, color-mix(in oklab, var(--text) 65%, transparent) 50%, transparent 80%, transparent 100%);", expected: "2.4" },
  { name: "literal win-rate needle", file: "src/components/positions/pnl-summary-strip.tsx", kind: "position", from: 'stroke="var(--bar-needle)"', to: 'stroke="var(--gilt)"', expected: "1.5" },
  { name: "literal win-rate hub", file: "src/components/positions/pnl-summary-strip.tsx", kind: "position", from: 'fill="var(--bar-needle)"', to: 'fill="var(--gilt)"', expected: "1.5" },
];
