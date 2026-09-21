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
 * Does a regex literal open at `i` (where `s[i]` is a `/`)? Decided by the previous significant
 * character, which is how every JS tokeniser does it: after a value, `/` is division; after an
 * operator, a comma, an opening bracket or nothing, it can only be a regex. A wrong YES costs a
 * verbatim copy — loud; a wrong NO is how a quote inside a character class mispairs — silent.
 */
function regexStartsHere(s: string, i: number): boolean {
  if (s[i + 1] === "/" || s[i + 1] === "*") return false;   // a comment, handled above
  let k = i - 1;
  while (k >= 0 && (s[k] === " " || s[k] === "\t" || s[k] === "\n" || s[k] === "\r")) k--;
  if (k < 0) return true;
  const p = s[k];
  if ("(,=:[!&|?{};+-*%~^<>".includes(p)) return true;
  // `return /…/`, `typeof /…/`, `case /…/` — a word that is a keyword, never an identifier or `)`.
  let w = k;
  while (w >= 0 && /[A-Za-z]/.test(s[w])) w--;
  return /^(return|typeof|case|in|of|do|else|yield|await|delete|void|instanceof)$/.test(s.slice(w + 1, k + 1));
}

/** Index of the closing `/` of a regex literal opened at `i`, or -1. A newline ends the search. */
function endOfRegex(s: string, i: number): number {
  let inClass = false;
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === "\\") { j++; continue; }
    if (c === "\n") return -1;
    if (c === "[") inClass = true;
    else if (c === "]") inClass = false;
    else if (c === "/" && !inClass) return j;
  }
  return -1;
}

/** Every non-newline character of `t`, replaced by a space: line numbers and byte offsets survive. */
const blankRun = (t: string): string => t.replace(/[^\r\n]/g, " ");

/**
 * Blank the BODY of every string and template literal, leaving the delimiters — and every other
 * character, which is CODE — exactly where they were.        (added 2026-09-20, C7 step 7 review)
 *
 * WHY IT LIVES HERE AND NOT AT ITS CALL SITE. `test:house-bot-console` 1.371 is the standing scan for
 * seven names owner ruling D20 struck from the tree, and it must look for them as CODE: the same names
 * survive as DATA inside the guard's own closed list, so a raw scan would report the guard that keeps
 * them out. It did that with three ordered `.replace()` passes, and that was the `E-189` shape one
 * function up. MEASURED on 2026-09-20 over its own 119-file population: the passes deleted 71% of
 * `house-bot-console-cases.mts`, 81% of `house-bot-dal.ts`, and more than 40% of 25 files — and a
 * planted struck name was INVISIBLE at 50%, 70% and 90% of the guard's own file while being found in
 * the small file its control planted into. A pair of regexes cannot know it is standing inside a
 * literal. A scanner can, and this module already is one.
 *
 * IT ERRS TOWARD KEEPING, exactly as `decomment` does and for the same reason: text wrongly KEPT is a
 * false positive, which is loud and gets fixed; text wrongly REMOVED is a false negative, which is
 * silent and is the whole failure this function exists to prevent. So an unmatched `"` or `'` keeps
 * the rest of its line verbatim, an unterminated template keeps the rest of the file, and a comment is
 * copied through untouched — which also means a quote inside a comment can never open a literal here.
 *
 * AN INTERPOLATION IS CODE AND IS KEPT. A struck name called inside one is a call, not a sentence, and
 * a call is the one thing this scan exists to find. The interpolation's extent is found by brace
 * depth, the same instrument `endOfTemplate` uses and for the same reason — depth cannot be fooled by
 * a regex literal — so a brace inside a string inside an interpolation can make it keep too much. Too
 * much is the loud direction.
 *
 * EVERY NEWLINE SURVIVES, including those inside a blanked multi-line template, so the line numbers of
 * surviving code do not move and a guard may report them.
 *
 * A REGEX LITERAL IS KEPT VERBATIM BY DEFAULT, because a wrongly-detected one would then be deleted
 * silently, and that is the direction this function refuses. `{ regex: true }` blanks its body too,
 * for the one caller that needs it: a guard scanning for a name it must not find has its OWN detector
 * spelling that name, and a detector is data about the name, not a use of it — the same reason string
 * literals are blanked at all.
 *
 * @param s source text — pass `decomment(s)` when comments must go too
 * @param opts `regex: true` also blanks regex-literal bodies (see above)
 * @returns the same text, every literal body replaced by spaces, the same length to the character
 */
/*  ⛔ WRITTEN DELIBERATELY UNLIKE `decomment`'s OWN BRANCHES, AND THAT IS NOT STYLE — it is the same rule
    `decommentCss` carries three functions down. `red:decomment` declares four of `decomment`'s lines as ANCHORS
    (`stripper-loses-string-literal-awareness`, `…-template-…`, `unterminated-block-swallows-to-EOF-again`,
    `stripper-loses-the-url-carve-out`). The first draft of this function copied them verbatim, every one of those
    anchors then matched TWICE, and `test:red-anchors` refused to inject — correctly: an anchor resolving to two
    places can plant its defect in the wrong one. Same behaviour, different text, anchors unique again. */
export function blankLiterals(s: string, opts: { regex?: boolean } = {}): string {
  let out = "";
  let i = 0;
  const n = s.length;
  /** The rest of the line from `at`, and where it ends — a comment or an unmatched quote is kept verbatim. */
  const restOfLine = (at: number): [string, number] => {
    const nl = s.indexOf("\n", at);
    const upTo = nl === -1 ? n : nl;
    return [s.slice(at, upTo), upTo];
  };

  while (i < n) {
    const c = s[i];
    const after = s[i + 1];

    if (c === "/" && after === "/" && s[i - 1] !== ":") {
      const [text, upTo] = restOfLine(i);
      out += text; i = upTo; continue;
    }
    if (c === "/" && after === "*") {
      const shut = s.indexOf("*/", i + 2);
      if (shut === -1) { out += s.slice(i); break; }
      out += s.slice(i, shut + 2); i = shut + 2; continue;
    }

    if (c === "'" || c === '"') {
      const close = endOfQuoted(s, i, c);
      if (close !== -1) { out += c + blankRun(s.slice(i + 1, close)) + c; i = close + 1; continue; }
      const [text, upTo] = restOfLine(i);
      out += text; i = upTo; continue;
    }

    // A REGEX LITERAL IS COPIED THROUGH AND NEVER LOOKED INSIDE, and this is the branch `decomment`
    // does not have. MEASURED on the guard this function was written for: its own retired stripper,
    // `code.replace(/`(?:\\[\s\S]|[^`\\])*`/g, …)`, holds THREE backticks in a character class, and
    // without this branch the third opened a template that ran 18 lines to the next backtick — so
    // the assertion's own label was blanked and the seven struck names inside it read as CODE. A
    // literal wrongly taken for a regex is kept verbatim, which is the loud direction; one missed is
    // how quotes and backticks mispair, which is the silent one.
    if (c === "/" && regexStartsHere(s, i)) {
      const close = endOfRegex(s, i);
      if (close !== -1) { out += opts.regex ? "/" + blankRun(s.slice(i + 1, close)) + "/" : s.slice(i, close + 1); i = close + 1; continue; }
    }

    if (c === "`") {
      const shut = endOfTemplate(s, i);
      if (shut !== -1) { out += "`" + blankTemplateBody(s, i + 1, shut) + "`"; i = shut + 1; continue; }
      // A LONE BACKTICK IS AN ORDINARY CHARACTER, and this line is the whole of the lesson.
      // Taking the rest of the FILE instead — the first version did — met the unpaired backtick in a
      // regex class like `["'`]` and then copied 1,600 later lines through unblanked, so every literal
      // after it read as code: MEASURED, seven false hits in the one guard this function was written
      // for. Falling through matches `decomment`'s own backtick branch, and costs at most one
      // character of over-keeping.
    }

    out += c;
    i++;
  }
  return out;
}

/** One template's body: literal runs blanked, every `${…}` span kept verbatim because it is CODE. */
function blankTemplateBody(s: string, from: number, to: number): string {
  let out = "";
  let lit = from;
  let j = from;
  while (j < to) {
    const c = s[j];
    if (c === "\\") { j += 2; continue; }
    if (c === "$" && s[j + 1] === "{") {
      out += blankRun(s.slice(lit, j));
      let depth = 1;
      let k = j + 2;
      while (k < to && depth > 0) {
        const e = s[k];
        if (e === "\\") { k += 2; continue; }
        if (e === "{") depth++;
        else if (e === "}") depth--;
        else if (e === "`") { const t = endOfTemplate(s, k); if (t !== -1 && t < to) k = t; }
        k++;
      }
      out += s.slice(j, k);
      j = k; lit = k; continue;
    }
    j++;
  }
  return out + blankRun(s.slice(lit, to));
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
