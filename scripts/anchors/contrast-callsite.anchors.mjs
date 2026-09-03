/**
 * RED anchors for `npm run red:contrast-callsite` — the control for `test:contrast` §P-u2
 * (PV-10, 2026-09-03).
 *
 * ⭐ THE HARNESS IMPORTS THIS FILE, for the same reason every `*.anchors.mjs` beside it exists:
 * `red-anchors.test.mts` audits every declared anchor without running the harness that injects
 * it, and a harness that hides its anchors from that fleet auditor is one whose anchors rot in
 * silence.
 *
 * Every fixed PV-10 site, so a regression on ANY of the nine call sites is provable — not just
 * the one this file happens to pick. Values are exactly what shipped before the fix (the `git
 * diff` this commit reverts, one span at a time).
 */

export const MUTATIONS = [
  {
    name: "market-card.tsx — restore the YES @pct% suffix's opacity-85",
    file: "src/components/markets/market-card.tsx",
    from: `<span className="font-mono text-[11.5px]"> @ {yesPct}%</span>`,
    to: `<span className="font-mono text-[11.5px] opacity-85"> @ {yesPct}%</span>`,
  },
  {
    name: "side-picker.tsx — restore the YES @pct% suffix's opacity-85",
    file: "src/components/markets/side-picker.tsx",
    from: `<span className="font-mono text-[12.5px]">@ {yesPct}%</span>`,
    to: `<span className="font-mono text-[12.5px] opacity-85">@ {yesPct}%</span>`,
  },
  {
    name: "updown-card.tsx — restore the UP ×N suffix's opacity-85",
    file: "src/components/updown/updown-card.tsx",
    from: `{outMultUp != null && <span className="font-mono text-[12.5px]">× {formatMultiplier(outMultUp)}</span>}`,
    to: `{outMultUp != null && <span className="font-mono text-[12.5px] opacity-85">× {formatMultiplier(outMultUp)}</span>}`,
  },
  {
    name: "updown-stake-controls.tsx — restore the UP ×N suffix's opacity-85",
    file: "src/components/updown/updown-stake-controls.tsx",
    from: `{multUp != null && <span className="font-mono text-[12.5px]">× {formatMultiplier(multUp)}</span>}`,
    to: `{multUp != null && <span className="font-mono text-[12.5px] opacity-85">× {formatMultiplier(multUp)}</span>}`,
  },
  {
    name: "conviction-dial.tsx — restore the commit button's stake opacity-90 (the site §P-u2 itself found)",
    file: "src/components/markets/conviction-dial.tsx",
    from: `<span className="font-mono">TZS {formatNumber(stake)}</span>`,
    to: `<span className="font-mono opacity-90">TZS {formatNumber(stake)}</span>`,
  },
];
