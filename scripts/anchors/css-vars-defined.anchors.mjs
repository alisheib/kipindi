/**
 * THE ANCHORS `red:css-vars-defined` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` §3 audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source, and §4 ratchets the number of
 * harnesses that have not been converted to this shape. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────
 * `test:css-vars-defined` resolves every `var()` in `src/` against every definition. It exists
 * because an unresolved `var()` is invalid at COMPUTED-VALUE time rather than at parse time:
 * the declaration reaches the browser intact and is then discarded, so the property silently
 * becomes `unset`. No compiler, no build and no text-matching gate can see it.
 *
 * ⭐ `gutter-restored` IS THE POSITIVE CONTROL AND IT IS THE REAL DEFECT. It puts back the exact
 * declaration that shipped on 2026-08-15 and was live for 21 days — `padding: 10px var(--gutter)
 * …` — which rendered the phone filter sheet with ZERO padding on all four sides, the close ✕
 * overflowing a 390px viewport, and the primary button under the iPhone home indicator. If that
 * case ever stops going red, this gate has stopped being about anything.
 *
 * ⭐ `fallback-is-exempt` IS THE CONTROL IN THE OTHER DIRECTION and matters just as much: it
 * proves the exemption for `var(--x, fallback)` is a DECISION, not blindness. A gate that
 * reddens on everything is as useless as one that reddens on nothing, and the quickest way to
 * "fix" this suite would be to widen it until no optional hook can be written.
 *
 * ⭐ `undefined-inside-a-comment` is the third: this repo documents its traps in prose, and the
 * gate's FIRST run reported `--royal-N` and `--x` out of the paragraphs explaining them — one
 * of them the paragraph describing the `--gutter` bug itself. A gate that reports prose teaches
 * people to delete their own documentation.
 *
 * ⚠️ `outcome` says which way each case must go. Only a `"red"` case carries an `expect`, and
 * the harness matches it as `FAIL <expect>` — never a section number, so a defect caught for
 * the wrong reason cannot print a pass.
 * ⚠️ Anchors are resolved through `red-anchor.mjs`, which normalises line endings.
 * ⛔ No replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, outcome: "red"|"green", expect?: string }} RedMutation */

const CSS = "src/app/globals.css";

/** The one declaration the sheet's padding is written on. */
const PAD = "  padding: var(--sp-3) var(--sp-5) calc(env(safe-area-inset-bottom, 0px) + var(--sp-4));";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    // ⭐ THE POSITIVE CONTROL — the defect exactly as it shipped.
    name: "gutter-restored",
    why: "⭐ POSITIVE CONTROL · the real defect, put back verbatim: the sheet's padding references `--gutter`, which is defined nowhere, so the whole shorthand is invalid at computed-value time and every side computes to 0 — taking the top rung and the bottom safe-area inset with it",
    file: CSS,
    suite: "css-vars-defined",
    outcome: "red",
    expect: "--gutter is referenced but never defined",
    from: PAD,
    to: "  padding: 10px var(--gutter) calc(env(safe-area-inset-bottom, 0px) + 14px);",
  },
  {
    name: "typo-in-a-real-token",
    why: "the commonest live shape of this bug: a token that EXISTS is referenced with one character wrong. `--sp-5` is defined; `--sp5` is not, and the declaration silently evaporates with nothing anywhere reporting it",
    file: CSS,
    suite: "css-vars-defined",
    outcome: "red",
    expect: "--sp5 is referenced but never defined",
    from: PAD,
    to: "  padding: var(--sp-3) var(--sp5) calc(env(safe-area-inset-bottom, 0px) + var(--sp-4));",
  },
  {
    /* ⭐ THE E-286 POSITIVE CONTROL — the hole the first version of this gate had.
       It counted any `--name` inside ANY string literal in a .ts/.tsx as a DEFINITION, so a
       READ certified its own token: `getPropertyValue("--gilt")` made `--gilt` "defined".
       Deleting the real declaration therefore left the gate green while all 32 `var(--gilt)`
       declarations became invalid at computed-value time. */
    name: "a-read-must-not-certify-its-own-token",
    why: "🔴 POSITIVE CONTROL · the real declaration of `--gilt` is deleted. Sixteen tokens used to self-certify because a quoted name in a component counted as a definition regardless of whether it was a write or a read — so the gate stayed GREEN over a stylesheet in which every `var(--gilt)` had just become invalid at computed-value time. A definition must be matched by its SHAPE (a declaration, an object key, `setProperty`, a font `variable`), never by the name appearing somewhere",
    file: CSS,
    suite: "css-vars-defined",
    outcome: "red",
    expect: "--gilt is referenced but never defined",
    from: "  --gilt:          var(--gold-300);",
    to: "  /* declaration deleted by red:css-vars-defined */",
  },
  {
    /* ⭐ THE E-287 POSITIVE CONTROL — the use scanner used to split on newlines, so a wrapped
       reference was neither judged NOR counted. Invisible, not reported: the same silence the
       gate exists to end, and it restores E-270 in full. */
    name: "a-wrapped-var-is-still-measured",
    why: "🔴 POSITIVE CONTROL · the sheet's padding references an undefined token across a LINE BREAK. The first version scanned line by line, so `var(` and its name had to sit on one line — a reformatted reference simply vanished from the gate while the declaration was still invalid at computed-value time and the sheet lost all four sides of its padding exactly as in E-270",
    file: CSS,
    suite: "css-vars-defined",
    outcome: "red",
    expect: "--kp-red-probe-wrapped is referenced but never defined",
    from: PAD,
    to: "  padding: var(--sp-3) var(\n    --kp-red-probe-wrapped\n  ) calc(env(safe-area-inset-bottom, 0px) + var(--sp-4));",
  },
  {
    name: "fallback-is-exempt",
    why: "⭐ CONTROL, THE OTHER WAY · `var(--x, fallback)` cannot compute to nothing, so an undefined name WITH a fallback must stay green. A gate that reddened here would forbid every optional hook and would be switched off within a week",
    file: CSS,
    suite: "css-vars-defined",
    outcome: "green",
    from: PAD,
    to: "  padding: var(--sp-3) var(--kp-red-probe-absent, 20px) calc(env(safe-area-inset-bottom, 0px) + var(--sp-4));",
  },
  {
    /* ⚠️ `.kp-fsheet-grab {` and NOT `.kp-fsheet-panel {`: the latter occurs twice — once as the
       rule and once inside the paragraph documenting the `--gutter` defect, which is the very
       hazard this case is about. `test:red-anchors` §3 would refuse the ambiguous one. */
    name: "undefined-inside-a-comment",
    why: "⛔ CONTROL · this repo documents its traps in prose, and the gate's FIRST run reported `--royal-N` and `--x` from paragraphs explaining them. A reference that exists only inside a comment must NOT be reported, or the gate teaches people to delete their own documentation",
    file: CSS,
    suite: "css-vars-defined",
    outcome: "green",
    from: ".kp-fsheet-grab {",
    to: "/* a note mentioning var(--kp-red-probe-in-prose) which is not real code */\n.kp-fsheet-grab {",
  },
];
