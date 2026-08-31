/**
 * ONE comment stripper, for every guard in this repo.   `scripts/lib/decomment.mts`
 *
 * ⭐ WHY THIS FILE EXISTS. Guards here grep source for a defect. Almost every one
 * must first remove comments, because this repo documents its traps in prose and a
 * guard that greps raw text matches the paragraph explaining the fix instead of the
 * fix. So `decomment` got written — and then copy-pasted into 40 files, in four
 * spellings, which is the `E-108` shape: one helper, many copies, repaired one at a
 * time and handing the next bug to the others.
 *
 * ⛔ IT IS A SCANNER, NOT A PAIR OF REGEXES, AND IT TRACKS STRING LITERALS.
 * Both of those are load-bearing, and each was learned by shipping the bug:
 *
 *   ① ORDER. Every copy this replaces was two `.replace()` calls, and a pair of
 *      regexes has an ORDER — which is a choice between two blindnesses, both
 *      MEASURED here on 2026-08-23:
 *        · block comments first (what 22 scripts did, `E-186`): a `/*` inside a
 *          `//` line opens a block nobody wrote. 5 files, 7,581 characters of
 *          `src` invisible.
 *        · line comments first (the `E-186` repair): a `//` inside a block comment
 *          eats that block's terminator, the opener runs to the next one, and the
 *          code between vanishes. 5 sites in `scripts`, worst ~7.7k characters.
 *      A regex pass cannot know it is standing inside a comment. A scanner can.
 *
 *   ② LITERALS. 🔴 The first scanner shipped without them and that was a REGRESSION,
 *      caught by adversarial review the same day (`E-189`). A `/*` inside a STRING or
 *      TEMPLATE literal — `expected redirect to /auth/*, landed on ${url}` — opened a
 *      block comment that ran to the next terminator or to EOF. It flipped a real
 *      verdict: `pii-in-logs.test.mts` §3 scans every top-level script through this
 *      helper, and the same planted violation was FOUND at line 425 and INVISIBLE at
 *      line 374 of the same file. Worse, it was blind where the regexes were not:
 *      `/\/\*[\s\S]*?\*\//g` is non-greedy and needs a closing terminator, so with
 *      none it simply does not match and the code survives — 22 files and 45,006
 *      characters that the copies could read and the first scanner could not.
 *      ⛔ So the scanner copies string and template literals through VERBATIM and
 *      never looks for comment delimiters inside one.
 *
 * ⛔ AN UNTERMINATED BLOCK COMMENT IS KEPT, NOT SWALLOWED. A compiler would error;
 * this is not a compiler. For a guard's stripper the asymmetry is what matters: text
 * wrongly KEPT can only cause a false positive, which is loud and gets fixed, while
 * text wrongly REMOVED causes a false negative, which is silent and is the entire
 * failure mode this file exists to prevent. Err toward keeping.
 *
 * ⭐ NEWLINES SURVIVE, including those inside block comments, so the line numbers of
 * surviving code do not move and a guard may report them.
 *
 * ⚠️ REMAINING LIMIT, deliberate and narrow: regex literals are not tracked, so a
 * regex containing a BARE comment delimiter could still mislead it. Every escaped
 * form is safe, which is how they are written here. `test:decomment` §6 pins the
 * whole contract against an independently written reference tokeniser, so if this
 * limit ever starts to bite, that check is what will say so.
 */

/** Index of the closing quote of a '…' or "…" literal opened at `i`, or -1.
 *  A raw newline ends the search: JS forbids one inside these, so an unmatched
 *  quote is prose (an apostrophe in JSX text), not a literal. */
function endOfQuoted(s: string, i: number, quote: string): number {
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === "\\") { j++; continue; }
    if (c === "\n") return -1;
    if (c === quote) return j;
  }
  return -1;
}

/**
 * Index of the closing backtick of a template opened at `i`, or -1.
 *
 * ⛔ IT COUNTS `${` … `}` DEPTH AND NOTHING ELSE — deliberately. The first version
 * walked into each interpolation trying to skip nested strings, and a quote inside
 * a REGEX literal fooled it: `` `"${safe.replace(/"/g, '""')}"` `` in
 * `admin/transactions/export/route.ts` made it lose the end of the template and
 * keep the next line comment as code. Brace depth needs no knowledge of regex
 * literals, so it cannot be fooled by one. A nested template inside `${…}` is
 * skipped for free, because its backticks sit at depth > 0.
 */
function endOfTemplate(s: string, i: number): number {
  let depth = 0;
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === "\\") { j++; continue; }
    if (c === "$" && s[j + 1] === "{") { depth++; j++; continue; }
    if (c === "}" && depth > 0) { depth--; continue; }
    if (c === "`" && depth === 0) return j;
  }
  return -1;
}

/**
 * Strip `//` line comments and block comments from JS/TS/JSX source.
 *
 * @param s source text
 * @returns the same text with comment bodies removed and everything else — string
 *          and template literals included — left in place. Every newline survives,
 *          so the line numbers of surviving code do not move.
 */
export function decomment(s: string): string {
  let out = "";
  let i = 0;
  const n = s.length;

  while (i < n) {
    const c = s[i];
    const d = s[i + 1];

    // `//` … end of line. `://` is left alone so an unquoted `https://x` survives.
    if (c === "/" && d === "/" && s[i - 1] !== ":") {
      while (i < n && s[i] !== "\n") i++;
      continue;
    }

    // `/*` … its terminator. Unterminated: keep the rest verbatim (see the header).
    if (c === "/" && d === "*") {
      const end = s.indexOf("*/", i + 2);
      if (end === -1) { out += s.slice(i); break; }
      for (let k = i; k < end + 2; k++) if (s[k] === "\n") out += "\n";
      i = end + 2;
      continue;
    }

    // A string or template literal is copied through verbatim — E-189.
    //
    // ⛔ AN UNMATCHED `"` OR `'` CONSUMES THE REST OF ITS LINE, it does not fall
    // through as an ordinary character. A regex class like `["'`]production["'`]`
    // (dev-route-guard.test.mts:57) leaves a quote without a partner; falling
    // through then met the LONE BACKTICK later on that line and opened a template
    // that ran for hundreds of lines, keeping every comment inside it as code.
    // Stopping at the newline cannot do that: `"` and `'` cannot span lines in JS.
    // The cost is that a trailing comment after an unmatched apostrophe survives —
    // a loud false positive, which is the direction this file errs in on purpose.
    if (c === '"' || c === "'") {
      const j = endOfQuoted(s, i, c);
      if (j !== -1) { out += s.slice(i, j + 1); i = j + 1; continue; }
      const nl = s.indexOf("\n", i);
      const stop = nl === -1 ? n : nl;
      out += s.slice(i, stop); i = stop; continue;
    }
    if (c === "`") {
      const j = endOfTemplate(s, i);
      if (j !== -1) { out += s.slice(i, j + 1); i = j + 1; continue; }
    }

    out += c;
    i++;
  }
  return out;
}

/**
 * Strip comments from a STYLESHEET.                              (added 2026-08-31, DG-A-12)
 *
 * ⭐ WHY IT LIVES HERE RATHER THAN AT THE ONE CALL SITE. `type-scale.test.mts` §7 parsed RAW
 * `globals.css` and so read the prose at `globals.css:4016` — *"⛔ WHY NOT `--type-table:
 * 12.5px`, which is the option the register offered Ali"* — as a REAL rung, printing 13
 * `--type-*` vars where the stylesheet defines 12. Writing the one-line fix at the call site
 * would have made that file the 56th PRIVATE stripper, which is precisely the E-108 shape this
 * module exists to end — and `test:decomment` §2.1 said so, out loud, the moment it was tried.
 *
 * ⛔ IT IS NOT `decomment()`. That one also removes `//` to end-of-line; a stylesheet has no
 * line comments, but it does have `url(https://…)`, and eating the rest of that line would
 * silently delete real declarations. CSS has block comments only, so this does block comments
 * only.
 *
 * ⭐ NEWLINES SURVIVE, for the same reason as above: a guard must still be able to report the
 * line number of surviving code. Unterminated comments are KEPT, erring toward a loud false
 * positive rather than a silent false negative.
 */
/*  ⛔ WRITTEN DELIBERATELY UNLIKE `decomment`'s block branch, and that is not style.
    The first version copied those three lines verbatim, and `red:decomment` declares two of
    them as ANCHORS (`unterminated-block-swallows-to-EOF-again`, `block-comment-newlines-are-
    destroyed`). A duplicate made each anchor match TWICE, so `test:red-anchors` refused to
    inject and failed — correctly: an anchor that resolves to two places can plant its defect
    in the wrong one. Same behaviour, different text, anchors unique again. */
export function decommentCss(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; ) {
    if (s[i] === "/" && s[i + 1] === "*") {
      const close = s.indexOf("*/", i + 2);
      if (close === -1) { out += s.slice(i); break; }      // unterminated: keep it, err loud
      out += s.slice(i, close + 2).replace(/[^\n]/g, "");  // blank the body, keep line numbers
      i = close + 2;
      continue;
    }
    out += s[i++];
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
