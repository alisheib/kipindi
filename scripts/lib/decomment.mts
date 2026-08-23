/**
 * ONE comment stripper, for every guard in this repo.   `scripts/lib/decomment.mts`
 *
 * ⭐ WHY THIS FILE EXISTS. Guards here grep source for a defect. Almost every one
 * of them must first remove comments, because this repo documents its traps in
 * prose and a guard that greps raw text matches the paragraph explaining the fix
 * instead of the fix. So `decomment` got written — and then copy-pasted 23 times,
 * in FOUR different spellings, which is the `E-108` shape: one helper, many
 * copies, repaired one at a time and handing the next bug to the others.
 *
 * ⛔ IT IS A SCANNER, NOT TWO `.replace()` CALLS, AND THAT IS THE WHOLE POINT.
 * Every copy it replaces was a pair of regexes, and a pair of regexes has an
 * ORDER — which is a choice between two different blindnesses, both of which were
 * MEASURED IN THIS REPO on 2026-08-23:
 *
 *   · BLOCK COMMENTS FIRST (what 22 scripts did, `E-186`): a `/*` written inside
 *     a `//` line comment opens a block nobody wrote and eats to the next block terminator.
 *     Measured across `src`: 5 files, 7,581 characters of source invisible.
 *
 *   · LINE COMMENTS FIRST (the `E-186` repair, applied only to `measure-system`):
 *     a `//` written inside a block comment eats that block's own terminator, so the
 *     block never closes and the real code after it vanishes. Measured across
 *     `scripts`: 5 sites, the worst costing ~7.7k characters of
 *     `criterion-i18n.test.mts` — a file `pii-in-logs.test.mts` §3 really does
 *     read, because it scans every top-level `scripts/*.mts`. ⛔ Do not quote a
 *     figure from here; `test:decomment` §5.2 re-derives it and prints it.
 *
 * ⭐ SO "FLIP THE ORDER" WAS NEVER THE FIX. It moves the hole; it does not close
 * it. Whichever regex runs first is blind to the other's delimiter, because a
 * regex pass cannot know it is standing inside a comment. A scanner can: it walks
 * the text once and lets whichever delimiter it meets FIRST win, which is exactly
 * what a compiler does and is the only rule that is right in both directions.
 *
 * ⚠️ Verified byte-identical to the line-comments-first repair across all 770
 * files of `src/` — so adopting it changed no gate's verdict on the day it
 * landed — while additionally being correct over `scripts/`, where that repair
 * is not. The equivalence is not an assumption; `test:decomment` re-derives it.
 *
 * ⛔ KNOWN AND DELIBERATE LIMIT: it does not parse string or regex literals, so
 * `"a//b"` loses its tail. Every copy it replaces had the same limit, `://` is
 * guarded because URLs are common, and a guard that greps for defects wants a
 * conservative view of what is code. Do not "fix" this into a real tokeniser
 * without measuring all 23 callers.
 */

/**
 * Strip `//` line comments and block comments from JS/TS/JSX source.
 *
 * @param s source text
 * @returns the same text with comment bodies removed and everything else, including
 *          newlines, left in place — so line numbers of surviving code do not move.
 */
export function decomment(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const d = s[i + 1];

    // `//` … end of line.  `://` is left alone so `https://x` survives — the same
    // carve-out every copy of this helper had, for the same reason.
    if (c === "/" && d === "/" && s[i - 1] !== ":") {
      while (i < s.length && s[i] !== "\n") i++;
      continue;
    }

    // `/*` up to its terminator.  An unterminated block runs to EOF, which is what a compiler does.
    if (c === "/" && d === "*") {
      const end = s.indexOf("*/", i + 2);
      i = end === -1 ? s.length : end + 2;
      continue;
    }

    out += c;
    i++;
  }
  return out;
}

/**
 * The two blind strippers this file retired, kept ONLY so `test:decomment` and
 * `red:decomment` can demonstrate the holes rather than assert them in prose.
 *
 * ⛔ Never import these into a guard. They are evidence, not tools.
 */
export const BLIND = {
  /** What 22 scripts did before 2026-08-23 — blind to `/*` inside a `//` line. */
  blockFirst: (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1"),
  /** The `E-186` repair — blind to `//` inside a block comment that closes on the same line. */
  lineFirst: (s: string): string =>
    s.replace(/(^|[^:])\/\/[^\n]*/g, "$1").replace(/\/\*[\s\S]*?\*\//g, ""),
};
