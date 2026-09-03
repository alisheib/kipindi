/**
 * RED anchors for `npm run red:tap-rung` — the control for `test:tap-target` §6
 * (PV-13a/PV-13b, 2026-09-03).
 *
 * ⭐ THE HARNESS IMPORTS THIS FILE. `red-anchors.test.mts` audits every declared anchor without
 * running the harness that injects it — declaring these here, rather than only inline in
 * `red-tap-rung.mjs`, is what lets it. Same law as `tap-floor.anchors.mjs` beside this file.
 *
 * Each mutation reverts one of PV-13's two fixes to the EXACT literal it shipped with in
 * production, so a regression on either is provable by name (§6.2), not by coincidence.
 */

export const MUTATIONS = [
  {
    name: "wallet-balance-pill.tsx — revert CashEye's h-full to the shipped h-[42px]",
    file: "src/components/layout/wallet-balance-pill.tsx",
    from: `className="inline-flex h-full w-[32px] shrink-0 sm:w-[36px] items-center justify-center rounded-r-pill text-[var(--gold-300)] transition-colors hover:bg-[color-mix(in_oklab,var(--gold-300)_10%,transparent)] hover:text-gold-200"`,
    to: `className="inline-flex h-[42px] w-[32px] shrink-0 sm:w-[36px] items-center justify-center rounded-r-pill text-[var(--gold-300)] transition-colors hover:bg-[color-mix(in_oklab,var(--gold-300)_10%,transparent)] hover:text-gold-200"`,
  },
  {
    name: "globals.css — revert .mcardp-info to the shipped content-box 28px/8px pad (46px total)",
    file: "src/app/globals.css",
    from: `box-sizing: border-box; width: var(--h-control-md); height: var(--h-control-md); padding: 8px;`,
    to: `box-sizing: content-box; width: 28px; height: 28px; padding: 8px;`,
  },
];
