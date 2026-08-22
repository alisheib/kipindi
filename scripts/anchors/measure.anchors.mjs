/**
 * THE ANCHORS `red:measure` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR, not an inline array. `test:red-anchors` audits every declared anchor WITHOUT
 * executing a harness that rewrites real source, and it holds an undeclared-harness ceiling
 * that may only shrink. Declaring here is what keeps that ceiling at 67 instead of raising it
 * to 68 — and, more to the point, an inline anchor is one nobody can audit: three in
 * `updown-push-red.mjs` had silently rotted against rewritten code on 2026-08-22, and this
 * harness's own subjects (`positions/page.tsx`, `results/page.tsx`, `wallet/loading.tsx`) are
 * exactly the files the B7 migration is still moving.
 *
 * ⚠️ NO SIDE EFFECTS. Imported by a suite inside `test:all` — data only, repo-relative POSIX
 * paths, nothing that touches the filesystem to describe it.
 *
 * ── WHY THESE ARE THE MUTATIONS ──────────────────────────────────────────────
 * Each reintroduces a defect measured on production 2026-08-22, or a blindness found in the
 * gate itself while fixing it:
 *  · `page-renders-its-own-main` is THE defect — 17 of 17 sampled player routes rendered two
 *    `<main>` elements, one nested in the other, so the skip-link resolved to the outer one.
 *  · `shell-main-demoted` is its opposite, and the reason the gate asserts the shell's own
 *    landmark still exists: a sweep that deleted every `<main>` would otherwise pass.
 *  · `width-hand-typed-again` proves the ratchet fails on an ADDITION rather than merely
 *    holding a list.
 *  · `loading-tier-drifts` is B7 rule 3 — the 152px jump on every load that nothing could see.
 *    ⭐ This mutation MISSED on its first run, which is how the parity check was found to be
 *    comparing 29 of 80 pairs and skipping 51 in silence.
 *  · `stripper-order-restored` + `allowlist-entry-deleted` are ONE mutation, applied together
 *    and INVERTED: they must make the gate WRONGLY pass. See the pairing note below.
 *
 * ⛔ THE PAIRED, INVERTED MUTATION. `stripper-order-restored` alone proves nothing — a blind
 * gate still prints ALL PASS, which is indistinguishable from a healthy one. So it is applied
 * together with `allowlist-entry-deleted`, which removes `proposals/page.tsx` from the ratchet
 * list. Under the CURRENT stripper that is an instant FAIL; under the old block-comments-first
 * order the gate cannot see the file's `max-w-[1080px]` at all and passes. Expecting a PASS is
 * what makes the blindness visible, and it is the only entry in this fleet that inverts.
 */

/**
 * @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string,
 *             check?: string, combineInto?: string, expectPass?: boolean }} RedMutation
 */

const POSITIONS = "src/app/positions/page.tsx";
const RESULTS = "src/app/results/page.tsx";
const WALLET_LOADING = "src/app/wallet/loading.tsx";
const SHELL = "src/components/layout/app-shell.tsx";
const GATE = "scripts/measure-system.test.mts";

/** The two orderings of the comment stripper, spelled out once. */
export const NEW_STRIPPER =
  '  s.replace(/(^|[^:])\\/\\/[^\\n]*/g, "$1").replace(/\\/\\*[\\s\\S]*?\\*\\//g, "");';
export const OLD_STRIPPER =
  '  s.replace(/\\/\\*[\\s\\S]*?\\*\\//g, "").replace(/(^|[^:])\\/\\/[^\\n]*/g, "$1");';

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "page-renders-its-own-main",
    why: "a page renders its own <main> inside the shell's — invalid HTML, two landmarks, and the skip-link resolves to the outer one",
    file: POSITIONS,
    suite: "measure",
    check: "no page renders its own <main>",
    from: '<PageContainer tier="reading" className="space-y-6">',
    to: '<main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">',
  },
  {
    name: "shell-main-demoted",
    why: "the shell's own <main id=main-content> becomes a div, so every route loses its landmark and the skip-link dangles",
    file: SHELL,
    suite: "measure",
    check: "the shell still renders the skip-link target",
    from: '<main id="main-content"',
    to: '<div id="main-content"',
  },
  {
    name: "width-hand-typed-again",
    why: "a migrated page hand-types a page width again; the ratchet must fail on an addition, not just hold a list",
    file: RESULTS,
    suite: "measure",
    check: "no NEW hand-typed page width",
    from: '<PageContainer tier="board">',
    to: '<PageContainer tier="board"><div className="max-w-[1280px]">',
  },
  {
    name: "loading-tier-drifts",
    why: "a page and its loading.tsx state different tiers — the 152px jump on every load that no test could see (B7 rule 3)",
    file: WALLET_LOADING,
    suite: "measure",
    check: "every page and its loading.tsx state the same tier",
    from: '<PageContainer tier="reading" className="space-y-6">',
    to: '<PageContainer tier="form" className="space-y-6">',
  },
  {
    name: "stripper-order-restored",
    why: "decomment strips block comments FIRST again, so a /* inside a // comment swallows 7,581 characters across five files and the gate goes blind",
    file: GATE,
    suite: "measure",
    check: "no NEW hand-typed page width",
    from: NEW_STRIPPER,
    to: OLD_STRIPPER,
    expectPass: true,
  },
  {
    name: "allowlist-entry-deleted",
    why: "removes proposals/page.tsx from the ratchet — visible instantly to a healthy gate, invisible to a blind one; applied WITH stripper-order-restored",
    file: GATE,
    suite: "measure",
    combineInto: "stripper-order-restored",
    from: '  "src/app/proposals/page.tsx",           // py-12, on the DISABLED state only —',
    to: "  // DELETED BY THE RED HARNESS — a blind gate cannot notice this is missing:",
  },
];
