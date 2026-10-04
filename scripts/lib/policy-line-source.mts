/**
 * THE LEGAL PAGES' EDITABLE LINES, READ AS TODAY'S TEXT — `scripts/lib/policy-line-source.mts` (marketing U33p).
 *
 * ⭐ WHY THIS EXISTS. /legal/responsible-gambling and /legal/privacy wrap their admin-editable bullets in a `PolicyLine`
 * element (`src/lib/server/legal/policy-lines.ts`), with the page's literal bullet as its children. The wrapper prints the
 * SAVED line once an admin saves one, and its children — the text the page printed before U33p, byte for byte — until
 * then. The guards that read those pages as SOURCE (`test:rg-policy`, `test:privacy-notice`, `test:policy-lines`) read
 * them with the wrapper's tags removed, so every check, every plant and both English hash pins read exactly the text the
 * page prints while nothing is saved — and the pins hold untouched. ⭐ ONE stripper, so the three can never disagree about
 * what "today's text" is (the `decomment.mts` lesson: one helper, never forty copies).
 *
 * ⛔ ONLY THE TAGS GO. Their attributes carry no words, and the children stay where they were, byte for byte. The licence
 * bullet has no default, so its wrapper is a self-closing tag on a line of its own: stripping it leaves an empty line, which
 * every reader collapses as whitespace (the hashes collapse every run of whitespace to one space).
 * ⛔ No backslash in this file: an editing tool decodes typed escapes (repo memory, 2026-10-02).
 */

/** An opening, closing or self-closing `PolicyLine` tag — never a longer name that starts with it. */
const POLICY_LINE_TAG = new RegExp("</?PolicyLine(?: [^>]*)?>", "g");

/** ⭐ The page source with every `PolicyLine` tag removed — the text the page prints while no line is saved. */
export function stripPolicyLineTags(src: string): string {
  return src.replace(POLICY_LINE_TAG, "");
}

/** How many `PolicyLine` tags a source holds — a caller's control, so a stripper that matches nothing cannot pass. */
export function policyLineTagCount(src: string): number {
  return (src.match(POLICY_LINE_TAG) ?? []).length;
}
