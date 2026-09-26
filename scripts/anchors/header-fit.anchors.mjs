/**
 * THE ANCHORS `red:header-fit` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, for the reason every anchors file here gives: `test:red-anchors` must answer
 * *"does every anchor still resolve, exactly once?"* WITHOUT executing a harness that rewrites
 * real source. One definition, imported by both.
 *
 * ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * Each one puts back exactly one half of the E-190 repair, and each half ON ITS OWN was enough
 * to sever a control — measured, not assumed, at 1024px signed in:
 *
 *   with both yields          EN over 0px · SW over 0px      → nothing clipped
 *   without the label yield   EN over 31px · SW over 65px    → EN loses the account menu,
 *                                                              SW loses the bell AND the menu
 *   without the gap yield     EN over  0px · SW over  9px    → SW still loses the account menu
 *
 * ⚠️ RETIRED 2026-09-14 (session 96, register E-407): `bar-gap-stops-yielding`. Re-measured at 1024px, signed in, with
 * the bar's gap widened from 12px to 20px (the mutation's exact effect, `gap-4` on this project's scale): the SW account
 * menu's right edge moves 1000 → 1016px of 1024 and the bar's scrollWidth stays 1024; EN does not move. The header has
 * gained slack since this table was written (the bar's phone padding px-3 → px-2 on 2026-09-11, ee3cc696, among other
 * changes), so the gap yield is no longer load-bearing and the product SURVIVES the mutation — `red:header-fit`
 * correctly reported it "broken: the witness never moved". A case the product survives proves nothing, so it is
 * removed rather than re-aimed at a defect that no longer exists. The `lg:gap-2` yield stays in the bar as slack.
 *
 * ⭐ THE SECOND ONE IS THE INTERESTING MUTATION. It is GREEN in English and RED in Swahili
 * only — so a harness that ran one locale would report it MISSED and quietly certify a repair
 * that was 9px short for the language most of this platform's players read. A red fleet is only
 * as wide as the population it mutates against.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string }} RedMutation */

const BAR = "src/components/layout/top-app-bar.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "deposit-label-stops-yielding",
    why: "the Deposit label renders at the lg–xl band again — 108px in EN, 103px in SW — and pushes the account menu off the right edge on every page",
    file: BAR,
    suite: "header-fit",
    from: `<span className={funded ? "hidden sm:inline lg:hidden xl:inline" : "inline"}>`,
    to: `<span className={funded ? "hidden sm:inline" : "inline"}>`,
  },
];
