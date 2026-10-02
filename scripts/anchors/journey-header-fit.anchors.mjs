/**
 * THE ANCHORS `red:journey-header-fit` MUTATES — declared, as DATA, importable without running (the Vodacom plan S6,
 * `S6-PLAN.md` WP6b step 6, amendments A5 and A6).
 *
 * ⛔ A SIDECAR, for the reason every anchors file here gives: `test:red-anchors` must answer "does every anchor still
 * resolve, exactly once?" WITHOUT executing a harness that rewrites real source. One definition, imported by both.
 *
 * ⚠️ NO SIDE EFFECTS. Data only, repo-relative POSIX paths.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────────────────────────────────────────
 * Each puts ONE S4 fit rule of the journey header's stylesheet (VODACOM-PLAN §0g design call 10; from 640 the classic
 * bar's own steps) back to a value the S4 measurement refused, and names in `expect` the rule of the RULE probe
 * (`live/journey-header-fit.mjs`, RULES) that must break in at least one cell. Each is a single line.
 * ⭐ RULES, NOT CLIPPING (A5). The real balances leave slack — TZS 999,999 is the widest figure a wallet shows, and the
 * S4 measurement was made with TZS 10,000,000 — so a proof that waited for a control to clip would miss most of these.
 * A rule read as a computed value against its fixed token cannot.
 * ⭐ EVERY `to` CARRIES ITS WITNESS: a custom property naming the mutation, which no rule reads. The harness waits until
 * the page's own stylesheets hold that name before it measures anything, so a mutation the server never served reads
 * BROKEN, never MISSED — the distinction `red:header-fit` paid for twice. The property's name is spelled ONCE, here:
 * the harness hands it to the page probe, its refusal looks for it in the stylesheet before it writes anything, and
 * `test:journey-shell` §10 fails predeploy on one left behind.
 * ⚠️ The figure mutation is the capsule's rule (WP4), not the header family's: A5 puts the figure's 12 then 14px among
 * the header's fit rules, because the figure is what the 320 row was measured with.
 */

const CSS = "src/app/globals.css";
/** The witness property: one name for the mutations below, the red twin's page probe and its refusals, and §10. */
export const WITNESS_PROPERTY = "--kp-red-witness";
/** A mutation's witness — its own name under the property — written into its `to`. */
const witness = (name) => `${WITNESS_PROPERTY}: ${name};`;

/** @typedef {{ name: string, why: string, expect: string, file: string, suite: string, from: string, to: string }} RedMutation */

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "plus-shows-below-360",
    why: 'the "+" glyph comes back below 360, where the 320 row was measured without it',
    expect: "plus",
    file: CSS,
    suite: "journey-header-fit",
    from: ".kp-jhdr__plus { display: none; }",
    to: `.kp-jhdr__plus { display: inline-flex; ${witness("plus-shows-below-360")} }`,
  },
  {
    name: "gutter-16-below-360",
    why: "the row's gutter is 16px below 360 — 8px of the 320 row's room given to its edges",
    expect: "gutter",
    file: CSS,
    suite: "journey-header-fit",
    from: ".kp-jhdr__row { display: flex; align-items: center; gap: 6px; height: 100%; max-width: var(--w-board); margin-inline: auto; padding-inline: var(--sp-3); }",
    to: `.kp-jhdr__row { display: flex; align-items: center; gap: 6px; height: 100%; max-width: var(--w-board); margin-inline: auto; padding-inline: var(--sp-4); ${witness("gutter-16-below-360")} }`,
  },
  {
    name: "figure-14-below-360",
    why: "the capsule's figure is 14px below 360 — TZS 999,999 two characters wider on the narrowest phone",
    expect: "figure",
    file: CSS,
    suite: "journey-header-fit",
    from: ".kp-jbal__fig { display: inline-grid; justify-items: end; font-weight: 700; font-size: 12px;",
    to: `.kp-jbal__fig { display: inline-grid; justify-items: end; font-weight: 700; font-size: 14px; ${witness("figure-14-below-360")}`,
  },
  {
    name: "gap-6-becomes-8",
    why: "every gap of the phone row 2px wider than the row was measured with",
    expect: "row-gap",
    file: CSS,
    suite: "journey-header-fit",
    from: ".kp-jhdr__row { display: flex; align-items: center; gap: 6px;",
    to: `.kp-jhdr__row { display: flex; align-items: center; gap: 8px; ${witness("gap-6-becomes-8")}`,
  },
  {
    name: "cluster-gap-6-becomes-4",
    why: "the capsule, the pill and the guest pair closer together than the row was measured with",
    expect: "cluster-gap",
    file: CSS,
    suite: "journey-header-fit",
    from: ".kp-jhdr__cluster { display: flex; flex-shrink: 0; align-items: center; gap: 6px; }",
    to: `.kp-jhdr__cluster { display: flex; flex-shrink: 0; align-items: center; gap: 4px; ${witness("cluster-gap-6-becomes-4")} }`,
  },
  {
    name: "home-link-loses-negative-margin",
    why: "the 44px home link takes back the 18px of gutter it was lent",
    expect: "home-borrow",
    file: CSS,
    suite: "journey-header-fit",
    from: ".kp-jhdr__home { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; min-height: var(--h-control-md); margin-inline: -9px;",
    to: `.kp-jhdr__home { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; min-height: var(--h-control-md); margin-inline: 0; ${witness("home-link-loses-negative-margin")}`,
  },
  {
    name: "guest-pills-pad-20",
    why: "Ingia and Jisajili 12px wider together on a phone (E-276 measured them at the edge)",
    expect: "auth-pad",
    file: CSS,
    suite: "journey-header-fit",
    from: ".kp-jhdr__auth { flex-shrink: 0; padding-inline: 14px;",
    to: `.kp-jhdr__auth { flex-shrink: 0; padding-inline: 20px; ${witness("guest-pills-pad-20")}`,
  },
  {
    name: "pill-pads-16-below-360",
    why: "+ Weka pesa keeps the kit button's 16px padding below 360 — 8px wider on the narrowest phone",
    expect: "pill-left",
    file: CSS,
    suite: "journey-header-fit",
    from: ".kp-jhdr__pill { flex-shrink: 0; padding: 0 12px; }",
    to: `.kp-jhdr__pill { flex-shrink: 0; padding: 0 16px; ${witness("pill-pads-16-below-360")} }`,
  },
  {
    name: "steps-from-640-lost",
    why: "from 640 the row keeps the phone's 16px gutter instead of the classic bar's 24px (A5's as-built note)",
    expect: "gutter",
    file: CSS,
    suite: "journey-header-fit",
    from: "@media (min-width: 640px) { .kp-jhdr__row { gap: var(--sp-5); padding-inline: var(--sp-6); } }",
    to: `@media (min-width: 640px) { .kp-jhdr__row { gap: var(--sp-5); ${witness("steps-from-640-lost")} } }`,
  },
];
