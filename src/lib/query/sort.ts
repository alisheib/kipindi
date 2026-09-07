/**
 * Ordering a list — the comparator every player-facing list shares.
 *
 * ⭐ WHY THIS IS A MODULE. `lib/markets/discovery.ts` is the only list surface in the product
 * that orders rows correctly, and it took three separate repairs to get there: absent values
 * were coerced to `0` (which lands them last descending and FIRST the moment the player flips
 * direction), ties were left to `Array.prototype.sort`'s stability (so two equal rows ordered
 * by whatever the database happened to return, on a board that refreshes every 30s), and
 * "closing soonest" keyed on a deadline the card was not showing. Every other player list
 * hand-writes its own one-liner and has none of those three rules. Re-derive the population:
 *
 *     grep -rn "\.sort((" src/app --include=*.tsx | grep -v "/admin/"
 *
 * At the time of writing that returns seven, on `/leaderboard`, `/live`, `/markets`,
 * `/results` (×3) and `/updown/history` — ⛔ and not one of them declares a tie-break or a
 * rule for a row that has no value for the chosen key. `results/page.tsx:194-199` is the
 * clearest: it falls back `resolutionStage2At ?? updatedAt`, so a row missing the first sorts
 * against a DIFFERENT clock from its neighbours rather than being partitioned out.
 *
 * ⛔ EVERY RULE HERE IS LIFTED VERBATIM FROM `discovery.ts:389-471` AND NONE IS "IMPROVED".
 * The partition, the direction fork, the tie-break chain and the final `id` are the same four
 * lines they were there; only the row type and the key function became parameters. That is the
 * whole point — `/positions` must order the way `/markets` orders, and the way to guarantee
 * that is to run the same code, not to write it twice and compare.
 *
 * ⛔ NO SERVER IMPORTS, and no imports at all. Same rule as `discovery.ts`'s own header, for
 * the same reason (`CLAUDE.md`: a convenience re-export pulled `node:async_hooks` into a
 * browser chunk and broke the build). ⛔ And no barrel — import `@/lib/query/sort` directly.
 */

/**
 * A direction the player actually chose. ⚠️ Distinct from the tri-state `?dir=` in the URL,
 * where `null` means "this sort's natural direction" — see `parse.ts`'s `parseDir`.
 *
 * ⭐ ONE DEFINITION SITE. `type SortDir = "asc" | "desc"` is currently declared four times in
 * this repo (`discovery.ts`, `components/admin/admin-sort.tsx`, and inline in two admin
 * clients). `discovery.ts` re-exports THIS one; the three admin copies are out of scope for
 * this campaign (§11) and are named here so the next session knows they are copies, not peers.
 */
export type SortDir = "asc" | "desc";

/**
 * What a row is worth for the chosen sort.
 *
 * `null` is the load-bearing value: it means **this row has no value for this sort**, which is
 * not the same as zero and not the same as the empty string. It routes the row through the
 * partition in `compareBy`, which puts it last in BOTH directions.
 *
 * ⚠️ THE STRING ARM IS AN EXTENSION, AND IT IS NOT PART OF THE VERBATIM LIFT. `discovery.ts`
 * keys are all numeric because everything the board sorts by is a clock, a count or an amount.
 * `/positions` sorts by market TITLE (§1 task 2.4), which is a word, and a word is ordered by a
 * collator rather than by subtraction. The partition, the tie-break and the `id` final are
 * untouched by this; only the primary comparison forks. ⛔ Never return a number from one arm
 * of a key function and a string from another — the fork below decides per COMPARISON, so a
 * mixed key would order `"10"` against `9` by collation on one pair and by subtraction on the
 * next, which is not an ordering at all.
 */
export type SortKey = number | string | null;

/**
 * How one list orders itself: which sorts exist, which way each one naturally points, what
 * each row is worth, and how two equal rows are separated.
 *
 * `Row` is the shape the key and tie-break functions read. `Id` is the closed set of sort ids,
 * which is also what `oneOf` narrows `?sort=` against — so an unknown sort in a hand-edited URL
 * falls back rather than reaching this file at all.
 */
export type SortSpec<Row extends { id: string }, Id extends string> = {
  /** The closed set, in the order the bar renders them. */
  readonly ids: readonly Id[];
  /**
   * Which way each sort points when the player has not said. ⛔ Required for every id, not
   * optional with a default: "most recent" and "closing soonest" point opposite ways, and a
   * shared default would silently be wrong for one of them. `discovery.ts:389-396` is the same
   * exhaustive record for the same reason.
   */
  readonly natural: Readonly<Record<Id, SortDir>>;
  /** The primary key. ⛔ `null`, never `0` and never `""`, when the row has no value. */
  readonly key: (row: Row, sort: Id) => SortKey;
  /**
   * The secondary key, per sort.
   *
   * ⛔ REQUIRED FOR EVERY ID, and this is `discovery.ts:432-445`'s ruling verbatim: without one,
   * the order of two equal rows is whatever order they arrived in. A list that re-reads on
   * navigation then reshuffles under the reader for no reason they can see.
   * ⚠️ A tie-break is NOT direction-aware — it runs after the direction fork and always points
   * the same way, so "same stake, newest first" stays newest-first in both directions. That is
   * deliberate: the tie-break is a stability rule, not a second sort the player asked for.
   */
  readonly tieBreak: Readonly<Record<Id, (a: Row, b: Row) => number>>;
  /**
   * How two string keys are ordered. Supplied by contracts that sort by a word, because
   * collation is a fact about the PLAYER'S LOCALE and this module has no way to know it.
   *
   * ⚠️ Build the collator ONCE, outside the comparator — `new Intl.Collator(locale).compare`
   * is expensive and a sort calls this O(n log n) times. `sortBy` does not construct one for
   * you, so a contract that sorts by a word passes its own.
   * ⛔ THE DEFAULT IS NOT `localeCompare`. Absent a collator this falls back to a plain
   * code-point compare — the same rule `byId` uses — which is deterministic and locale-free.
   * A silent `localeCompare()` with no locale argument would order by the SERVER's locale,
   * which is one answer for every player and the wrong one for most of them.
   */
  readonly collate?: (a: string, b: string) => number;
};

/**
 * The direction actually in force: what the player chose, or the sort's natural direction.
 *
 * Verbatim from `discovery.ts:398-400`. ⭐ Why it cannot collapse to a boolean: choosing a new
 * sort resets `dir` to `null` so the new sort arrives pointing the way it should
 * (`discovery-bar.tsx:311` passes `dir: null` with every sort option), and this decides. A
 * two-state direction would make "closing soonest" open on the rows closing LAST.
 */
export function effectiveDir<Id extends string>(
  spec: { readonly natural: Readonly<Record<Id, SortDir>> },
  state: { sort: Id; dir: SortDir | null },
): SortDir {
  return state.dir ?? spec.natural[state.sort];
}

/**
 * Final tie-break so the order is TOTAL and stable across renders. Verbatim from
 * `discovery.ts:448`.
 *
 * ⚠️ Deliberately a code-point compare and not a collation: this is not a word the player
 * reads, it is an identifier, and its only job is to be the same answer every time.
 *
 * ⭐ EXPORTED because `discovery.ts` still applies it in its own `compareRows` — see
 * `comparePrimary` below for why that function keeps its last line. Exported rather than copied
 * so there is one `byId` in the product, not two that agree today.
 */
export const byId = (a: { id: string }, b: { id: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** The code-point fallback when a contract sorts by a word and supplies no collator. */
const codePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Order two rows. The whole rule, in one place.
 *
 * ⛔ ROWS WITH NO VALUE FOR THIS SORT GO LAST, IN BOTH DIRECTIONS — `discovery.ts:453` verbatim,
 * and the single most important line in this file. The failure it prevents is written out at
 * `discovery.ts:421-425`: coercing an absent value to `0` lands those rows last in the natural
 * direction and **first** the moment the player flips it, so the list appears to be sorted by
 * "rows we know nothing about" and the player is given no way to tell that is what happened.
 * On `/positions` the absent value is the RETURN of a bet that has not settled — so the coerced
 * version would answer "which of my bets did best?" with a page of undecided ones.
 */
export function compareBy<Row extends { id: string }, Id extends string>(
  spec: SortSpec<Row, Id>,
  a: Row,
  b: Row,
  sort: Id,
  dir: SortDir,
): number {
  return comparePrimary(spec, a, b, sort, dir) || spec.tieBreak[sort](a, b) || byId(a, b);
}

/**
 * The PRIMARY comparison alone — the partition and the direction fork, without the tie-break.
 * `0` means "these two are equal on this sort, ask the tie-break".
 *
 * ⭐ WHY THIS SEAM EXISTS, AND IT IS NOT A CONVENIENCE. `red:discovery-contract`'s
 * `ties-left-to-sort-stability` mutation is anchored on the LAST LINE of `discovery.ts`'s
 * `compareRows` — `return TIE_BREAK[sort](a, b) || byId(a, b);` immediately followed by the
 * closing brace — and `scripts/anchors/discovery-contract.anchors.mjs` requires every anchor to
 * resolve **exactly once** against real source (`test:red-anchors` §3 audits it). A refactor that
 * collapsed `compareRows` into a one-line call to `compareBy` would delete that line, disarm a
 * proof of a defect this product actually shipped, and turn `test:red-anchors` red.
 * ⛔ The campaign's own rule is that the gate is not what bends: §8 — *"if one needs an edit to
 * pass, the refactor is wrong, not the gate."* So the seam is cut where the proof already is.
 * `discovery.ts` keeps that one line and imports `byId` from here, so nothing is duplicated: the
 * partition, the direction fork and the identifier fallback each still have exactly one home.
 */
export function comparePrimary<Row extends { id: string }, Id extends string>(
  spec: SortSpec<Row, Id>,
  a: Row,
  b: Row,
  sort: Id,
  dir: SortDir,
): number {
  const ka = spec.key(a, sort);
  const kb = spec.key(b, sort);
  // Rows with no value for this sort go LAST, in both directions.
  // ⚠️ Both-null returns 0 — "equal here, ask the tie-break" — which is what makes this
  //    composable with a caller that applies its own tie-break after it.
  if (ka == null && kb == null) return 0;
  if (ka == null) return 1;
  if (kb == null) return -1;
  return typeof ka === "string" || typeof kb === "string"
    ? // Both arms of the fork are written out rather than negating one, so the direction rule
      // reads identically to the numeric case below it and cannot drift from it.
      ((c) => (dir === "asc" ? c(String(ka), String(kb)) : c(String(kb), String(ka))))(
        spec.collate ?? codePoint,
      )
    : dir === "asc"
      ? ka - kb
      : kb - ka;
}

/**
 * Order a list. Returns a NEW array — `discovery.ts:468-471` verbatim, including the copy.
 *
 * ⭐ Generic in the row type so a caller carrying MORE than the spec's row keeps its own fields
 * through the sort. `discovery.ts:462-467` records what the alternative cost: a
 * `DiscoveryRow[]` return would have forced the landing hero to cast — or, worse, to write a
 * second sort implementation, which is how the hero and the board would start disagreeing about
 * what "closing soonest" means.
 *
 * ⛔ `[...rows]` IS NOT A TIDINESS. `Array.prototype.sort` mutates in place, and these arrays
 * are read again — for the counts beside the pills, for the empty-state's exits, and for the
 * pager's total. Sorting one of them in place would reorder the list a count was computed over.
 */
export function sortBy<Base extends { id: string }, Id extends string, Row extends Base>(
  spec: SortSpec<Base, Id>,
  rows: readonly Row[],
  state: { sort: Id; dir: SortDir | null },
): Row[] {
  const dir = effectiveDir(spec, state);
  return [...rows].sort((a, b) => compareBy(spec, a, b, state.sort, dir));
}
