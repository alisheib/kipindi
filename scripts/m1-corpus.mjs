/**
 * THE M1 CORPUS — ONE definition, imported by the gate AND by its RED harness.
 *
 * 🔴 WHY, AND IT IS THE SECOND TIME IN ONE SESSION. `test:m1-light` and
 * `m1-even-light-red.mjs` each carried their own file list. On 2026-08-07 the gate gained
 * the component files — because five, then seven, one-sided lamps were living in JSX inline
 * styles where a stylesheet-only ratchet had been printing *"THE M1 SWEEP IS COMPLETE"* — and
 * a harness still copying only stylesheets would have run every mutation against a corpus the
 * gate no longer reads. The identical break had just happened to `red:contrast`, which went
 * from **21/21 caught to 0/21** when the contrast gate gained its fourth sheet.
 *
 * ⚠️ AND THE FIRST DRAFT OF THIS COMMENT WOULD NOT PARSE, because it wrote that glob as a
 * pattern and the star-slash inside it CLOSED the block comment — the identical keystroke
 * that silently dropped a whole CSS rule earlier the same day (E-127). In JS it fails loudly
 * at parse time; in CSS it fails silently and the browser drops the rule. That asymmetry is
 * exactly why `test:reduce-motion` rule 0.1 gates the CSS case and nothing needs to gate this.
 *
 * ⭐ E-108 is the same shape one document over: a locator duplicated across two suites and a
 * harness, repaired three times, each repair applied to one copy and handing the next bug to
 * the others by copy-paste. `scripts/campaign-handoff.mjs` ended it there;
 * `scripts/contrast-corpus.mjs` ended it for contrast; this ends it for M1. **One definition,
 * imported.**
 *
 * ⛔ THE ORDER IS STYLESHEETS FIRST, and it is not cosmetic: the gate builds its `TOKEN_L`
 * map from the corpus so a `var()` inside a shadow can be resolved to a lightness, and the
 * tokens live in the stylesheets. A component file that referenced a token declared later in
 * the list would still resolve — the map is built in a separate pass — but reading the
 * corpus in cascade order keeps the file list meaning the same thing everywhere.
 */
import { globSync } from "node:fs";

/**
 * @param {string} root absolute path to the repo (or to a mutated COPY of it)
 * @returns {{ css: string[], tsx: string[], all: string[] }} repo-relative, POSIX separators
 */
export function m1Corpus(root) {
  const css = globSync("src/**/*.css", { cwd: root }).map((f) => f.replace(/\\/g, "/")).sort();
  const tsx = globSync("src/**/*.tsx", { cwd: root }).map((f) => f.replace(/\\/g, "/")).sort();
  return { css, tsx, all: [...css, ...tsx] };
}
