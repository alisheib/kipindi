/**
 * C8b (B5) · A LIST'S FIGURES FOR ONE VIEWER — the ONE rule the Lists card (`lists-loader.ts`), the importer's list picker
 * and its result (`import-commit.ts`) ask, over the DAL's split (`contactListBasis.coverageSplit`).
 *
 * 🔴 WHY (the C8b survey's surface 5, docs/CONTACTS-SCREEN-PLAN.md §4.7). Every viewer used to read `coveredCount`'s pair,
 * which leaves out the members linked to a 50pick account: a masked officer who put ONE number on a list read 1 for a
 * stranger's number and 0 for a player's, and the campaign composer's count for the same list (linked rows included) minus
 * the card's was the exact number of player members (D19).
 * ⭐ THE RULE:
 *   · a READER (`identity.contact` cell `read`) is shown today's exact figures — the live members linked to no account, the
 *     ones a list basis can reach, and those its newest recording covers — and BESIDE them how many members have an account
 *     (`withAccount`), whom the player branch governs;
 *   · ANYONE ELSE is shown the SUM of the two sides — every live member, linked or not, which EQUALS the composer's count
 *     for that list (`campaignAudienceCount` walks the book's live rows, linked included), and the coverage counted over
 *     the same set — and `withAccount` is null: absent, not hidden. No figure of theirs separates players from strangers.
 * ⛔ What a viewer is SHOWN, never a second "who is covered": the send gate and the list-basis audit row keep reading
 * `coveredCount`, and a list basis never reaches an account's number whatever this says.
 *
 * Guard: `test:contacts-lists` (B12 — the card), `test:contacts-import` (the picker and the result).
 */
import type { ListBasisCoverageSplit } from "@/lib/server/store";

/** One list's figures as one viewer may see them. */
export type ListFigures = { live: number; covered: number; withAccount: number | null };

export function listFiguresFor(split: ListBasisCoverageSplit, viewerReads: boolean): ListFigures {
  if (viewerReads) return { live: split.unlinked.live, covered: split.unlinked.covered, withAccount: split.linked.live };
  return { live: split.unlinked.live + split.linked.live, covered: split.unlinked.covered + split.linked.covered, withAccount: null };
}
