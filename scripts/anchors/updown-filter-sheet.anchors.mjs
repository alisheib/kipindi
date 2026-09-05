/**
 * THE ANCHORS `red:updown-filter-sheet` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once WITHOUT
 * executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * UD-13b — the Up & Down board's asset and duration chips collapse behind the kit's existing
 * `FilterSheet` below the `sm` band. Measured first: at 360 the two rails wrap to four rows,
 * 196px, and the first game card sits at top 652 of a 900px viewport.
 *
 * ⭐ `trigger-says-filters` IS THE POSITIVE CONTROL AND IT IS THE WHOLE POINT OF THE SUITE.
 * It collapses the filters *perfectly* — one tidy button, 196px of chips gone, the board four
 * rows higher — and the trigger reads "Filters" instead of "Bitcoin · 3 min". Every
 * space-saving claim anyone would make about this unit still holds, and the player has lost
 * the answer to *"what am I looking at?"*. If §2 ever stops catching that, this unit's guard
 * is measuring furniture instead of meaning.
 *
 * ⭐ `split-at-lg` is the other one worth reading: it widens the disclosure to `lg`, which
 * looks like more of a good thing and removes working controls from tablets, where the rails
 * measured a single clean 44px row. **The defect had a band; the fix has to have the same one.**
 *
 * ⚠️ Anchors are resolved through `red-anchor.mjs`, which normalises line endings.
 * ⛔ No replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const TABS = "src/components/updown/updown-board-tabs.tsx";
const PAGE = "src/app/updown/page.tsx";
const CSS = "src/app/globals.css";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    // ⭐ THE POSITIVE CONTROL.
    name: "trigger-says-filters",
    why: "⭐ POSITIVE CONTROL · the filters collapse PERFECTLY and the trigger stops naming the selection — it reads 'Filters' instead of 'Bitcoin · 3 min'. Every space-saving claim about this unit still holds, and the player loses the answer to \"what am I looking at?\". A collapsed filter that does not say what is selected is worse than the four rows of chips it replaced",
    file: TABS,
    suite: "updown-filter-sheet",
    from: "          value={`${activeAssetText} · ${activeDurText}`}",
    to: "          value={sheetTitle}",
    expect: "2: ⭐ the trigger label is composed from the active ASSET and the active DURATION",
  },
  {
    name: "duration-dropped-from-trigger",
    why: "half the answer: the trigger names the ASSET and forgets the DURATION, so a player on `Bitcoin` cannot tell a 3-minute board from a 60-minute one — and the two play completely differently",
    file: TABS,
    suite: "updown-filter-sheet",
    from: "          value={`${activeAssetText} · ${activeDurText}`}",
    to: "          value={`${activeAssetText}`}",
    expect: "2: ⭐ the trigger label is composed from the active ASSET and the active DURATION",
  },
  {
    // ⭐ THE UD-13d POSITIVE CONTROL — the defect exactly as it shipped.
    name: "optimism-outlives-the-transition",
    why: "🔴 the optimistic on-state stops being scoped to `isPending`, so `pendingHref` — which nothing clears — wins for the rest of the page's life. Tapping an ASSET goes to `?asset=ETH`, which equals no duration href, so every duration chip reads OFF permanently: the board is filtered to the 5-minute round while its own control says no duration is chosen. MEASURED on production: the same URL reached by tap said `Ethereum · Duration` and by direct load said `Ethereum · 5 min`",
    file: TABS,
    suite: "updown-filter-sheet",
    from: "  const pending = isPending && pendingHref != null ? new URLSearchParams(pendingHref.split(\"?\")[1] ?? \"\") : null;",
    to: "  const pending = pendingHref != null ? new URLSearchParams(pendingHref.split(\"?\")[1] ?? \"\") : null;",
    expect: "9: 🔴 the optimistic on-state is scoped to `isPending`, so it cannot outlive the navigation",
  },
  {
    name: "duration-falls-to-none-while-pending",
    why: "the other half: a pending href with no `d` stops falling through to the REAL active duration and reports NONE selected instead. This is the visible symptom — the rail empties on every asset tap — while the asset half still looks perfect",
    file: TABS,
    suite: "updown-filter-sheet",
    from: '    pending != null && pending.has("d") ? Number(pending.get("d")) === t.d : t.d === activeDuration;',
    to: '    pending != null ? Number(pending.get("d")) === t.d : t.d === activeDuration;',
    expect: "9: ⛔ …and a pending href with no `d` falls through to the real active duration",
  },
  {
    name: "sheet-vanishes-instead-of-leaving",
    why: "🔴 UD-13e restored: the exit animation is dropped, so the sheet rises over 340ms and then disappears in a single frame when `display: none` lands. Nothing is red, every geometry assertion still passes, and the one dialog a phone player uses most is the only surface in the product that does not leave",
    file: CSS,
    suite: "updown-filter-sheet",
    from: `.kp-fsheet[data-closing] > .kp-fsheet-panel {
  animation: m-leave-out var(--t-quick) var(--m-leave) both;
}`,
    to: `.kp-fsheet[data-closing] > .kp-fsheet-panel {
  opacity: 1;
}`,
    expect: "10: CONTROL: all four animation names were located — a reader that finds nothing passes everything",
  },
  {
    // ⭐ THE E-284 POSITIVE CONTROL — the repair that was the same shape as the defect.
    name: "exit-reuses-the-entrance-name",
    why: "🔴 the exit is written as the ENTRANCE PLAYED BACKWARDS (`m-sheet-rise … reverse`). `animation-name` is then unchanged from `.m-sheet-in`, and CSS only creates or cancels an animation when the NAME changes — so `reverse` re-times a FINISHED animation instead of restarting it. Measured on production: the panel jumped 407px in one frame with `m-sheet-rise@340/finished`, and the 140ms hold became dead time with a transparent full-viewport scrim eating the next tap. The rule reads perfectly and does nothing",
    file: CSS,
    suite: "updown-filter-sheet",
    from: `  animation: m-leave-out var(--t-quick) var(--m-leave) both;`,
    to: `  animation: m-sheet-rise var(--t-quick) var(--m-leave) reverse both;`,
    expect: "10: 🔴 the panel's EXIT keyframe NAME differs from its ENTRANCE's — or the animation never restarts",
  },
  {
    name: "exit-beat-hardcoded",
    why: "⛔ the exit beat becomes a literal instead of the shared `exitBeatMs`, which is where the THREE reduced-motion gates are decided. A hard-coded hold delays the dismissal for someone who asked for no motion — worse than having no exit at all — and it silently stops tracking `--t-quick` if that rung is ever retuned",
    file: "src/components/markets/filter-sheet.tsx",
    suite: "updown-filter-sheet",
    from: `    const ms = exitBeatMs("--t-quick");`,
    to: `    const ms = 140;`,
    expect: "10: ⛔ the exit beat comes from the shared `exitBeatMs`, not a literal",
  },
  {
    name: "filter-becomes-a-navigation",
    why: "🔴 the filter goes back to `router.push` with default scrolling. MEASURED on production: a player reading the board at `scrollY 400` is thrown to 0 by one tap, and two taps add two history entries so Back walks filter states instead of leaving the board. `/markets` has bound `replace scroll={false}` as an invariant since the discovery bar shipped — the rule existed and this board did not follow it",
    file: TABS,
    suite: "updown-filter-sheet",
    from: "    startTransition(() => router.replace(hrefTarget, { scroll: false }));",
    to: "    startTransition(() => router.push(hrefTarget));",
    expect: "11: 🔴 the transition REPLACES rather than pushes, and does not scroll",
  },
  {
    name: "split-at-lg",
    why: "⭐ the disclosure widens from `sm` to `lg`, which reads like more of a good thing. It removes working controls from tablets, where BOTH rails measured a single clean 44px row — the defect had a band and the fix has to have the same one",
    file: TABS,
    suite: "updown-filter-sheet",
    from: '      <div className="mt-4 sm:hidden">',
    to: '      <div className="mt-4 lg:hidden">',
    expect: "1: …inside a wrapper that hides it from `sm` up",
  },
  {
    name: "chips-deleted-not-disclosed",
    why: "⛔ the asset rail is hidden at EVERY width instead of below `sm`, so the chips are not disclosed progressively — they are gone. The sheet still exists and every 'is there a sheet' assertion stays green, but desktop has silently lost its filter rail",
    file: TABS,
    suite: "updown-filter-sheet",
    from: '      <nav aria-label={assetsLabel} data-filter-rail className="mt-4 hidden flex-wrap gap-2 sm:flex">',
    to: '      <nav aria-label={assetsLabel} data-filter-rail className="mt-4 hidden flex-wrap gap-2">',
    expect: "1: the asset rail still exists and is shown from `sm` up",
  },
  {
    name: "second-drawer",
    why: "⛔ NOTHING OUTSIDE THE KIT, in the form it actually arrives in: a local component that looks and behaves like the sheet. It would photograph identically and would drift from `FilterSheet`'s focus trap, scroll lock and focus-return contract the first time either changed",
    file: TABS,
    suite: "updown-filter-sheet",
    from: "export type BoardTab = { key: string; href: string; label: string };",
    to: "export type BoardTab = { key: string; href: string; label: string };\nfunction BoardFilterDrawer() { return null; }",
    expect: "4: ⛔ no locally-declared sheet/drawer component",
  },
  {
    name: "aria-loses-the-selection",
    why: "the visible label still names both axes and the ACCESSIBLE name goes generic, so the regression is invisible in a screenshot and lands only on the players who cannot see the screenshot",
    file: TABS,
    suite: "updown-filter-sheet",
    from: '          ariaLabel={sheetAria.replace("{asset}", activeAssetText).replace("{duration}", activeDurText)}',
    to: "          ariaLabel={sheetTitle}",
    expect: "2: the accessible name interpolates both axes too",
  },
  {
    name: "sheet-back-under-the-nav",
    why: "\u2b50 THE LATENT DEFECT THIS UNIT EXPOSED, restored: the sheet stops lifting itself and goes back to relying on `.kp-discovery-bar` — which the Up & Down board is not inside. It then opens at `z-index: 2` beneath a `z-40` bottom nav, VISIBLE and correctly laid out and correctly translated, with its dismiss button unpressable. \u26d4 Byte-identical geometry to the working surface, so only `elementFromPoint` can tell them apart",
    file: CSS,
    suite: "updown-filter-sheet",
    from: `.kp-fsheet[open] { position: relative; z-index: 100; }`,
    to: `.kp-fsheet[open] { position: relative; }`,
    expect: "6: \u{1F534} the sheet lifts ITSELF, so any host inherits the fix",
  },
  {
    name: "bar-lift-deleted",
    why: "the other half: the discovery-bar lift is removed on the theory that the sheet now lifts itself. It does not help there \u2014 `.kp-discovery-bar` is a `z-20` STACKING CONTEXT, so a sheet inside it cannot escape by raising its own z-index; the BAR has to rise. Deleting this re-breaks /markets while /updown stays perfect",
    file: CSS,
    suite: "updown-filter-sheet",
    from: `.kp-discovery-bar:has(.kp-fsheet[open]),`,
    to: `.kp-discovery-bar:has(.kp-fsheet-never-matches[open]),`,
    expect: "6: \u26a0\uFE0F \u2026and the discovery-bar lift is still there, because it solves the other half",
  },
  {
    name: "copy-not-from-the-dictionary",
    why: "the sheet's title is hardcoded English at the call site, so a Swahili or Chinese player opens a drawer headed in a language they did not choose. ⚠️ `test:i18n` counts KEYS and stays green — the key still exists, it is simply no longer used",
    file: PAGE,
    suite: "updown-filter-sheet",
    from: "        sheetTitle={t.market.udFilterTitle}",
    to: '        sheetTitle={"Filter the board"}',
    expect: "5: the page passes the sheet's copy from the dictionary",
  },
];
