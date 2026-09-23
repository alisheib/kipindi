/**
 * IS THE FILE'S FIRST STATEMENT THE QUOTED DIRECTIVE? — one home, because the regex it replaces cost this
 * programme two separate stalls in two separate suites.
 *
 * 🔴 WHAT THIS REPLACES, AND WHY IT IS A LINEAR SCAN AND NOT A CLEVERER REGEX (2026-09-22 and 2026-09-23).
 * Both `house-bot-disclosure.test.mts` and `house-bot-surfaces.test.mts` carried their own copy of:
 *
 *     new RegExp(`^\\s*(?:\\/\\/[^\\n]*\\n|\\/\\*[\\s\\S]*?\\*\\/\\s*)*["']${d}["']`).test(code)
 *
 * — a `(…)*` group whose alternatives each end in `\s*`, behind a leading `^\s*`. The whitespace between two
 * comment blocks can be split among the repetitions in exponentially many ways, and on a file that does NOT
 * carry the directive the engine tries every one of them before answering false.
 * · **2026-09-22:** the disclosure suite sat on §1 for FOURTEEN MINUTES on three checkouts and was killed each
 *   time. `house-console-read.ts` opens with a long run of block comments, and the day its header crossed the
 *   threshold that suite stopped finishing. Its copy was fixed; the other one was not.
 * · **2026-09-23:** the surfaces suite hung at exactly the same point, for exactly the same reason, the moment
 *   the rules editor added its own comment headers to the console files. The fix had been written down once and
 *   applied once, which is the whole argument for this file existing.
 *
 * ⛔ A GUARD THAT CANNOT FINISH REPORTS NOTHING — and worse, it reports nothing while an operator waits, so the
 * day's "green" quietly rests on whatever else happened to run. The scan below is O(n) by construction: each
 * character is visited once, and the two comment forms are found with `indexOf`, which cannot backtrack.
 * ⚠️ IT IS DELIBERATELY IGNORANT OF STRINGS AND TEMPLATE LITERALS. A `/*` inside a string before the first
 * statement cannot occur in a file whose first statement is a directive, and treating it as a comment would
 * only ever make this answer `false` — the safe direction for every caller.
 */
export function isDirective(code: string, d: "use client" | "use server"): boolean {
  let i = 0;
  const n = code.length;
  for (;;) {
    while (i < n && (code[i] === " " || code[i] === "\t" || code[i] === "\r" || code[i] === "\n")) i++;
    if (code.startsWith("//", i)) { const e = code.indexOf("\n", i); if (e < 0) return false; i = e + 1; continue; }
    if (code.startsWith("/*", i)) { const e = code.indexOf("*/", i + 2); if (e < 0) return false; i = e + 2; continue; }
    break;
  }
  return code.startsWith(`"${d}"`, i) || code.startsWith(`'${d}'`, i);
}
