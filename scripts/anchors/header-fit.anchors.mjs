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
    from: `<span className="hidden sm:inline lg:hidden xl:inline">`,
    to: `<span className="hidden sm:inline">`,
  },
  {
    name: "bar-gap-stops-yielding",
    why: "the bar keeps sm:gap-4 through the lg–xl band, charging 20px three times; English survives it and SWAHILI DOES NOT — 9px, and the account menu goes",
    file: BAR,
    suite: "header-fit",
    from: `className="mx-auto max-w-board flex items-center h-full gap-2 px-3 sm:gap-4 sm:px-5 lg:gap-2 xl:gap-4"`,
    to: `className="mx-auto max-w-board flex items-center h-full gap-2 px-3 sm:gap-4 sm:px-5"`,
  },
];
