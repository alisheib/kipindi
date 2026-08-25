/**
 * THE ANCHORS `red:chat-focus-ring` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────────────
 * The chat composer is a SHELL that paints the focus ring while the field inside it paints
 * nothing. It had been painting three brand rings since 2026-06-05 (E-219). Every case here
 * is a way the fix silently stops working, and the two worth reading are:
 *
 * ⭐ `same-specificity-tidy` — the fix rewritten as `textarea:focus` INSIDE chat-styles.css.
 *   It looks cleaner, it is what a tidy-minded editor would write, and it is exactly the
 *   defect: this file is `@import`ed at globals.css:15, so an equal-specificity rule lands
 *   ABOVE globals and loses the tie on source order. A guard that only checked "a rule
 *   zeroes box-shadow" would pass this and the double ring would come straight back.
 *
 * ⭐ `outline-none-instead` — the neutraliser written as `outline: none`, which removes the
 *   ring perfectly in normal rendering and deletes it entirely in Windows high-contrast.
 *   That is E-129's defect being reintroduced by the fix for a different one.
 *
 * ⭐ AND THE LAST IS THE POSITIVE CONTROL: the SHELL stops painting. Every "the field draws
 *   nothing" assertion then passes HARDER, over a composer with no focus indicator at all.
 *
 * ⚠️ SINGLE-LINE ANCHORS where possible (CRLF tree); no replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const CHAT = "src/styles/chat/chat-styles.css";
const CSS = "src/app/globals.css";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "neutraliser-deleted",
    why: "the fix is simply removed — the field takes its own --brand-500 halo back and the composer paints two rings again, which is the state Ali photographed",
    file: CHAT,
    suite: "chat-focus-ring",
    from: `.cm-composer textarea:focus,\n.cm-composer textarea:focus-visible {\n  box-shadow: none;\n  outline-color: transparent;\n}`,
    to: `.cm-composer textarea::selection { color: inherit; }`,
    expect: "3: a rule neutralises the field's own ring in the FOCUS state",
  },
  {
    name: "same-specificity-tidy",
    why: "⭐ THE ONE THAT LOOKS LIKE AN IMPROVEMENT. Scoped to `textarea` alone the rule is (0,1,1) — a TIE with globals' `textarea:focus`, broken by source order, and this file is @imported ABOVE globals. The declaration is present, correct and inert",
    file: CHAT,
    suite: "chat-focus-ring",
    from: `.cm-composer textarea:focus,\n.cm-composer textarea:focus-visible {`,
    to: `textarea:focus,\ntextarea:focus-visible {`,
    expect: "3: ⭐ every branch is scoped to BOTH .cm-composer and textarea",
  },
  {
    name: "focus-visible-branch-dropped",
    why: "only `:focus` is neutralised. The 3px halo goes, but `textarea:focus-visible { outline-color: var(--brand-500) }` still lands a SOLID 2px brand outline on the field — one ring removed of the two the field was drawing",
    file: CHAT,
    suite: "chat-focus-ring",
    from: `.cm-composer textarea:focus,\n.cm-composer textarea:focus-visible {`,
    to: `.cm-composer textarea:focus {`,
    expect: "3: …and it covers :focus-visible too, which is where the SOLID outline arrives",
  },
  {
    name: "outline-none-instead",
    why: "⭐ the neutraliser written the obvious way. Normal rendering is IDENTICAL and the pixel counter would report one ring — but forced-colors strips box-shadow and keeps outline, so in Windows high-contrast the field now has no ring to substitute on. E-129's defect, reintroduced by the fix for E-219",
    file: CHAT,
    suite: "chat-focus-ring",
    from: `  box-shadow: none;\n  outline-color: transparent;\n}\n.cm-composer textarea::placeholder`,
    to: `  box-shadow: none;\n  outline: none;\n}\n.cm-composer textarea::placeholder`,
    expect: "3: ⛔ …by making the outline TRANSPARENT, never `none` (E-129 forced-colors)",
  },
  {
    name: "box-shadow-left-standing",
    why: "the outline is neutralised and the HALO is not — the wider and more visible of the field's two rings survives, which is the band Ali's screenshot shows most clearly",
    file: CHAT,
    suite: "chat-focus-ring",
    from: `  box-shadow: none;\n  outline-color: transparent;\n}\n.cm-composer textarea::placeholder`,
    to: `  outline-color: transparent;\n}\n.cm-composer textarea::placeholder`,
    expect: "3: …it zeroes the field's box-shadow",
  },
  {
    name: "kit-precedent-deleted",
    why: "the kit's `.input-group .input:focus { box-shadow: none }` is removed — the reference implementation of this whole pattern, and the thing `qa:chat-focus-ring` uses as its instrument control. Delete it and the next shell gets written without the second half, exactly as the chat was",
    file: CSS,
    suite: "chat-focus-ring",
    from: `.input-group .input:focus { box-shadow: none; }`,
    to: `.input-group .input:focus { color: inherit; }`,
    expect: "4: the kit's own reference implementation still exists (.input-group .input:focus)",
  },
  {
    name: "globals-halo-removed",
    why: "the site-wide `textarea:focus` halo is deleted. The chat looks right for the wrong reason and the neutraliser is now guarding nothing — a suite that stayed green here would be pinning a rule whose purpose had evaporated",
    file: CSS,
    suite: "chat-focus-ring",
    from: `textarea:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: var(--brand-500); box-shadow: 0 0 0 3px oklch(63% 0.18 262 / 0.25); }`,
    to: `textarea:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: var(--brand-500); }`,
    expect: "1: globals still gives a bare textarea its own focus halo (the thing being neutralised)",
  },
  {
    name: "control-shell-stops-painting",
    why: "⭐ THE POSITIVE CONTROL. The SHELL's halo is removed, so the composer has no focus indicator at all — and every assertion about the field drawing nothing passes HARDER than before. A suite without §2 would report this perfect",
    file: CHAT,
    suite: "chat-focus-ring",
    from: `  box-shadow: inset 0 2px 4px oklch(6% 0.08 268 / 0.4), 0 0 0 3px oklch(63% 0.18 262 / 0.25);`,
    to: `  box-shadow: inset 0 2px 4px oklch(6% 0.08 268 / 0.4);`,
    expect: "2: …plus the 3px brand halo",
  },
];
