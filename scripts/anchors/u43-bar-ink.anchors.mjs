/** U43 neutral bar marker anchors; the harness mutates disposable copies. */
export const MUTATIONS = [
  { name: "gold marker", file: "src/app/globals.css", kind: "css", from: "--bar-needle:           var(--text);", to: "--bar-needle:           var(--gilt);", expected: "2.1" },
  { name: "gold glow", file: "src/app/globals.css", kind: "css", from: "--bar-needle-glow:      color-mix(in oklab, var(--text) 40%, transparent);", to: "--bar-needle-glow:      color-mix(in oklab, var(--gilt) 40%, transparent);", expected: "2.2" },
  { name: "gold settled shimmer", file: "src/app/globals.css", kind: "css", from: "--bar-shimmer:          linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--text) 32%, transparent) 50%, transparent 100%);", to: "--bar-shimmer:          linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--gilt) 32%, transparent) 50%, transparent 100%);", expected: "2.3" },
  { name: "gold hover sweep", file: "src/app/globals.css", kind: "css", from: "--bar-sweep:            linear-gradient(90deg, transparent 0%, transparent 20%, color-mix(in oklab, var(--text) 65%, transparent) 50%, transparent 80%, transparent 100%);", to: "--bar-sweep:            linear-gradient(90deg, transparent 0%, transparent 20%, color-mix(in oklab, var(--gilt) 65%, transparent) 50%, transparent 80%, transparent 100%);", expected: "2.4" },
  { name: "gold win-rate needle", file: "src/components/positions/pnl-summary-strip.tsx", kind: "position", from: 'stroke="var(--bar-needle)"', to: 'stroke="var(--gilt)"', expected: "1.5" },
  { name: "gold win-rate hub", file: "src/components/positions/pnl-summary-strip.tsx", kind: "position", from: 'fill="var(--bar-needle)"', to: 'fill="var(--gilt)"', expected: "1.5" },
];
