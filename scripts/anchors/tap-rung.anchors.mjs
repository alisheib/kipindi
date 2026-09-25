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
    /* ⚠️ RE-PINNED 2026-09-25, AND IT HAD BEEN DEAD. The `from:` still described the pre-D78
       markup — `w-[32px] shrink-0 sm:w-[36px]` — but the width was fixed and the call site now
       reads `w-[var(--tap-min)] shrink-0`. So the injection could not land and this control had
       been proving NOTHING about the height rung for as long as that was true, while the suite
       it guards reported green. §0 trap 2 exactly: reformat a pinned call site and the RED
       control becomes a silent no-op.
       ⭐ The harness SAID SO — "⛔ ANCHOR NOT FOUND — the harness is stale, not the gate" — and
       scored 1/2 rather than counting it caught. That sentence is the only reason this was
       findable, and it is why a plant must always prove it LANDED.
       ⛔ The `to:` restores BOTH shipped defects, PV-13a's `h-[42px]` and D78's `w-[32px]`, so
       §6.2 fails naming a hand-typed pixel value in whichever axis its alternation reaches. */
    name: "wallet-balance-pill.tsx — revert CashEye to the shipped h-[42px] w-[32px] (BOTH axes: PV-13a's height, D78's width)",
    file: "src/components/layout/wallet-balance-pill.tsx",
    from: `className="inline-flex h-full w-[var(--tap-min)] shrink-0 items-center justify-center rounded-r-pill text-[var(--gold-300)] transition-colors hover:bg-[color-mix(in_oklab,var(--gold-300)_10%,transparent)] hover:text-gold-200"`,
    to: `className="inline-flex h-[42px] w-[32px] shrink-0 sm:w-[36px] items-center justify-center rounded-r-pill text-[var(--gold-300)] transition-colors hover:bg-[color-mix(in_oklab,var(--gold-300)_10%,transparent)] hover:text-gold-200"`,
  },
  {
    name: "globals.css — revert .mcardp-info to the shipped content-box 28px/8px pad (46px total)",
    file: "src/app/globals.css",
    from: `box-sizing: border-box; width: var(--h-control-md); height: var(--h-control-md); padding: 8px;`,
    to: `box-sizing: content-box; width: 28px; height: 28px; padding: 8px;`,
  },
];
