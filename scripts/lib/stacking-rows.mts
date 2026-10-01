/**
 * THE Z-ORDER CONTRACT'S SHARED PARTS — the row shapes, the journey's rows, and the predicates every row is judged by.
 * `test:stacking` (`scripts/stacking-contract.test.mts`) owns the contract and runs it; this module holds what a second
 * reader needs, so that reader judges the same rows by the same rules rather than by a copy of them.
 *
 * ⭐ WHY A MODULE (the Vodacom plan S6, `S6-PLAN.md` amendment A13). The journey chrome adds rows to the contract — its
 * header on the bar's rung, its tab rail on the rail's, the language menu sealed inside the new header — and A13 asks
 * for each new row to be proved able to FAIL. `test:stacking` has no red twin, so `red:journey-shell` plants the
 * defects in memory and hands the planted source to these predicates. A test file cannot be imported without running
 * it (the contract ends in `process.exit`), so the rows and the predicates live here and both files import them.
 *
 * ⛔ NO SIDE EFFECTS AND NO FILE READS: data, and pure functions over text the caller has read and decommented.
 */

/** A surface at the root plane. `find` must capture the z as group 1 and carry an anchor unique to the surface. */
export type Surface = {
  id: string;
  file: string;
  /** Must capture the z as group 1, and must carry an anchor unique to this surface. */
  find: RegExp;
  z: number;
  note: string;
};

/** A surface sealed inside another surface's stacking context. */
export type Trapped = {
  id: string;
  file: string;
  find: RegExp;
  declared: number;
  /** The ancestor whose stacking context seals it — an id from the contract's root surfaces. */
  ancestor: string;
  /** The ancestor's file must render this child; this is the symbol it renders. */
  renderedAs: string;
  effective: number;
  note: string;
};

/** id-above, id-below, why it is deliberate rather than an accident. */
export type Law = [string, string, string];

/**
 * THE JOURNEY CHROME (S6 WP6a) — mounted by AppShell for a journey request only (WP6b), so each sits exactly where its
 * classic twin sits: the rail over the header, the Needle over both, the board's filter rail under the header.
 */
export const JOURNEY_SURFACES: readonly Surface[] = [
  { id: "journey-tabs",    file: "src/components/journey/journey-tabs.tsx",    find: /lg:hidden fixed inset-x-0 bottom-0 z-(\d+) kp-rail kp-rail--journey/, z: 40, note: "the journey's tab rail (SJ-16) — the classic rail's rung, for the classic rail's reasons" },
  { id: "journey-top-bar", file: "src/components/journey/journey-top-bar.tsx", find: /"sticky top-0 z-(\d+) app-topbar kp-jhdr"/,                   z: 30, note: "the journey header (SJ-15) — the classic header's rung" },
];

export const JOURNEY_TRAPPED: readonly Trapped[] = [
  {
    id: "journey-language-menu", file: "src/components/ui/language-menu.tsx",
    find: /absolute top-\[calc\(100%\+6px\)\] z-(\d+) min-w-\[196px\]/,
    declared: 30, ancestor: "journey-top-bar", renderedAs: "LanguageMenu", effective: 30,
    note: "the same menu, hung from the journey header from 1024 — sealed at that header's rung, as under the classic one",
  },
];

export const JOURNEY_LAWS: readonly Law[] = [
  ["needle", "journey-tabs",        "⭐ THE NEEDLE RULE, on the journey's rail: the object passes OVER it so it can never be trapped under it"],
  ["journey-tabs", "journey-top-bar", "the journey's rail sits over its header when both are on screen, as the classic pair do"],
  ["journey-top-bar", "discovery-bar", "the board's filter rail scrolls under the journey header, not over it"],
];

/**
 * §1 · How many times a row's locator matched in a decommented body, and the z it captured. ⛔ Anything but exactly one
 * match means the row no longer names one surface, and nothing judged from it can be trusted.
 */
export function soleZ(body: string, find: RegExp): { hits: number; z: number | null } {
  const hits = [...body.matchAll(new RegExp(find.source, find.flags.includes("g") ? find.flags : find.flags + "g"))];
  return { hits: hits.length, z: hits.length === 1 ? Number(hits[0][1]) : null };
}

/** §2 (a) · A child escapes its ancestor's stacking context only by portalling to the document body. */
export function portalsOut(body: string): boolean {
  return /createPortal\s*\(/.test(body);
}

/** §2 (b) · The ancestor's file really renders the child: the containment is real, in source. */
export function rendersSymbol(body: string, symbol: string): boolean {
  return new RegExp(`<${symbol}[\\s/>]`).test(body);
}

/**
 * §2 (c) · A declaration forms a stacking context only when it is positioned AND carries a z-index: `position: static`
 * with a z-index forms nothing, and a positioned element without one forms nothing either.
 */
export function formsStackingContext(declaration: string): boolean {
  return /\b(fixed|sticky|relative|absolute)\b/.test(declaration) && /z-(?:\[)?\d+/.test(declaration);
}
