/**
 * POPUP-FIT'S REVIEW RECORD, AS A RULE — what is a popup, which popups the record leaves unreviewed, and which names
 * on it no longer render one. `test:popup-fit` §1.1 is the record's gate and asks this module; `red:journey-shell`
 * asks it too (the Vodacom plan S6, `S6-PLAN.md` amendment A13), handing it the record with a journey popup planted
 * out, so the new rows are proved able to fail without a harness that edits the gate's file.
 *
 * ⭐ WHY A MODULE. `test:popup-fit` ends in `process.exit`, so it cannot be imported for its rule; the detector and the
 * comparison live here, and the RECORD stays in the gate, where every review note sits beside the name it reviews.
 * A second reader takes the record out of the gate's own source (`reviewedIn`), never out of a copy.
 * ⛔ NO SIDE EFFECTS AND NO FILE READS: pure functions over text the caller has read and decommented.
 */

/** A popup or warning: it renders a dialog role, or one of the kit's popup primitives. Judged on decommented source. */
export const IS_POPUP = /role="(dialog|alertdialog)"|<Modal\b|<ConfirmDialog\b|<OperationResultModal\b/;

/** The popups the record does not name, and the names on the record that render no popup any more. */
export function reviewGaps(popups: readonly string[], reviewed: readonly string[]): { unreviewed: string[]; vanished: string[] } {
  return {
    unreviewed: popups.filter((f) => !reviewed.includes(f)),
    vanished: reviewed.filter((f) => !popups.includes(f)),
  };
}

/** The names on the record, read out of `scripts/popup-fit.test.mts` as written there (pass it decommented). */
export function reviewedIn(source: string): string[] {
  const open = "const REVIEWED: readonly string[] = [";
  const at = source.indexOf(open);
  if (at < 0) return [];
  const body = source.slice(at + open.length, source.indexOf("];", at));
  return [...body.matchAll(/"(src[/][^"]+)"/g)].map((m) => m[1]);
}
