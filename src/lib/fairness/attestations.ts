/**
 * /fairness query contract — outcome lens · window · sort · search.
 *
 * 🔴 THE PAGE THAT EXISTS TO PROVE SETTLEMENTS COULD NOT SHOW A VOIDED ONE. `page.tsx` read
 * `listMarkets({ status: "RESOLVED" })` — an exact equality, not an `IN` — so every market that
 * settled by being voided, and every stake refunded with it, was absent from the public
 * attestation record. A regulator, a lab or a player checking "what happened to that market"
 * found nothing, on the one surface the platform publishes for exactly that question.
 *
 * ⛔ AND THE BOARD'S LENS SET WAS WRONG, FOR THE FOURTH TIME IN THIS CAMPAIGN. It said
 * `All · Resolved · Voided`. Two independent failures, both re-derived from code rather than
 * reasoned:
 *
 *  · **IT ENUMERATES WHERE A RESIDUAL BELONGS.** `Resolved` and `Voided` name two of the five
 *    values in `enum PredictionMarketStatus { DRAFT LIVE CLOSED RESOLVED VOIDED }`. A sixth
 *    terminal value lands in no arm — the exact hole `FOLLOW_LENSES` was rebuilt to close.
 *
 *  · **IT IS COARSER THAN THE COLUMN BESIDE IT.** `resolveMarket` writes
 *    `status = outcome === "VOID" ? "VOIDED" : "RESOLVED"`, so on this population status and
 *    outcome are in bijection and a `Resolved` pill is exactly `yes ∪ no`. It would fold the two
 *    verdicts into one control on a page that already prints them apart, one column to the right,
 *    through a three-armed chip. ⛔ A rail coarser than the column next to it is a control that
 *    cannot answer the question the page invites.
 *
 * ⚠️ AND `Resolved` IS A FALSE FRIEND HERE. `t.market.statusResolved` would sit directly above
 * `t.common.thResolved` — the header of the TIMESTAMP column — and in Swahili they are two
 * different words ("Imekamilika" against "Imetatuliwa"). One screen, one label, two meanings.
 *
 * ⭐ SO THE LENS IS THE CARD'S OWN CHIP LADDER, which is already three-armed with a residual:
 * `variant={outcome === "YES" ? "yes" : outcome === "NO" ? "no" : "neutral"}`. That gives
 * `?out=all · yes · no · void`, byte-identical in param name and ids to `/results` — the sibling
 * page over the SAME `RESOLVED ∪ VOIDED` population read through the SAME chip. Two vocabularies
 * for one set of rows is precisely the inconsistency this campaign exists to remove.
 *
 * ⛔ NO SERVER IMPORTS. The page reads the terminal markets and hands rows here.
 */
import { clampText, oneOf, oneParam, parseDir } from "@/lib/query/parse";
import { buildQueryHref, hasActiveFilters, sheetFilterCount } from "@/lib/query/href";
import { countFor, countsFor, filterRows, type Axes } from "@/lib/query/counts";
import { emptyKind, relaxations, type EmptyKind, type ExitCandidate, type Relaxation } from "@/lib/query/empty";
import { sortBy, type SortDir, type SortSpec } from "@/lib/query/sort";
import { PLAYER_PRESETS, inWindow, type PlayerPresetId } from "@/lib/query/windows";
import { MAX_QUERY_LEN } from "@/lib/search/query";

/* ─────────────────────────── the row this module reasons about ────────────────────────── */

export type AttestationRow = {
  id: string;
  category: string;
  /**
   * ⛔ THE STORED COLUMN, NEVER A DISPLAY TOKEN. `resolvedOutcome` is a raw `String?` on the
   * market (`// YES, NO, VOID`), carried through untouched. The ONE normalisation the page
   * applies is lifted verbatim from `results/page.tsx`: a `VOIDED` row whose outcome column was
   * never stamped still resolved one way, and that way is void. ⚠️ The lens never sees
   * `outcomeWord`'s output — filtering a translated word would make the rail mean different sets
   * in different languages.
   */
  outcome: string | null;
  /**
   * `Date.parse(resolutionStage2At)` — ⛔ THE CLOCK THE TABLE PRINTS, and not the one it used to
   * be ordered by. See `ATTESTATION_NATURAL_DIR`.
   */
  resolvedAtMs: number;
  /**
   * ⭐ A BOOLEAN, NOT TWO IDENTIFIERS — see the note on `twoOfficer` in the page. What the public
   * record must prove is that two DISTINCT officers signed, not who they were.
   */
  twoOfficer: boolean;
  titleEn: string;
  titleSw: string;
  titleZh: string;
  criterion: string;
  status: string;
  /** The public evidence link. Carried so the row renders without a second lookup. */
  sourceUrl: string;
};

/* ─────────────────────────────────── the URL contract ─────────────────────────────────── */

/**
 * ⭐ `all · yes · no · void`, AND `void` IS A NEGATION RATHER THAN A LIST — which is the whole
 * reason this set is covering. `yes ∪ no ∪ void = all` and the three are pairwise disjoint for ANY
 * value of `resolvedOutcome`: `"VOID"`, `null`, and a verdict token the product gains tomorrow all
 * land in `void` rather than in nothing. ⛔ Do not "simplify" it to `=== "VOID" || === null`; that
 * is the enumeration `/results` shipped, and it silently drops a value the day one is added.
 */
export const ATTESTATION_LENSES = ["all", "yes", "no", "void"] as const;
export type AttestationLens = (typeof ATTESTATION_LENSES)[number];

export const ATTESTATION_SORTS = ["recent", "market"] as const;
export type AttestationSortId = (typeof ATTESTATION_SORTS)[number];

export const ATTESTATION_WHEN_IDS = PLAYER_PRESETS;

/**
 * ⛔ `?out=` IS `/results`' PARAM NAME, DELIBERATELY. The two pages read the same terminal
 * population through the same chip; giving them different param names would mean a player who
 * learned one has not learned the other, and a link cannot be carried between them.
 */
export const ATTESTATION_DEFAULTS = {
  out: "all" as AttestationLens,
  when: "all" as PlayerPresetId,
  sort: "recent" as AttestationSortId,
  dir: null as SortDir | null,
  q: "" as string,
};

export type AttestationState = {
  out: AttestationLens;
  when: PlayerPresetId;
  sort: AttestationSortId;
  dir: SortDir | null;
  q: string;
};

export const ATTESTATION_DEFAULT_STATE: AttestationState = { ...ATTESTATION_DEFAULTS };

export const ATTESTATION_SHEET_AXES = ["when"] as const;
const ATTESTATION_VIEW_STATE_AXES = ["sort", "dir"] as const;

export function parseAttestationParams(
  sp: Record<string, string | string[] | undefined>,
): AttestationState {
  const one = (k: string) => oneParam(sp, k);
  return {
    out: oneOf(ATTESTATION_LENSES, one("out"), ATTESTATION_DEFAULTS.out),
    when: oneOf(ATTESTATION_WHEN_IDS, one("when"), ATTESTATION_DEFAULTS.when),
    sort: oneOf(ATTESTATION_SORTS, one("sort"), ATTESTATION_DEFAULTS.sort),
    dir: parseDir(one("dir")),
    q: clampText(one("q"), MAX_QUERY_LEN),
  };
}

export function buildAttestationHref(
  state: AttestationState,
  patch: Partial<AttestationState> = {},
  extra: { page?: number } = {},
): string {
  return buildQueryHref("/fairness", state, ATTESTATION_DEFAULT_STATE, patch, extra);
}

export function hasActiveAttestationFilters(state: AttestationState): boolean {
  return hasActiveFilters(state, ATTESTATION_DEFAULT_STATE, ATTESTATION_VIEW_STATE_AXES);
}

export function attestationSheetCount(state: AttestationState): number {
  return sheetFilterCount(state, ATTESTATION_DEFAULT_STATE, ATTESTATION_SHEET_AXES);
}

export function clearedAttestationState(state: AttestationState): AttestationState {
  return { ...ATTESTATION_DEFAULT_STATE, sort: state.sort, dir: state.dir };
}

/* ──────────────────────────────────── the predicates ──────────────────────────────────── */

export function matchesAttestationLens(row: AttestationRow, lens: AttestationLens): boolean {
  switch (lens) {
    case "all": return true;
    case "yes": return row.outcome === "YES";
    case "no": return row.outcome === "NO";
    // ⭐ THE RESIDUAL ARM, written as the chip's `"neutral"` case is written: everything that is
    //    not a decided side. Voided by ceremony, voided by the emergency kill switch, or a
    //    terminal row whose verdict column was never stamped.
    case "void": return row.outcome !== "YES" && row.outcome !== "NO";
  }
}

export function attestationAxes(
  nowMs: number,
  matchesText: (row: AttestationRow) => boolean,
): Axes<AttestationRow, AttestationState> {
  return {
    out: (r, s) => matchesAttestationLens(r, s.out),
    // ⚠️ The window is over WHEN IT WAS SETTLED — `resolutionStage2At`, the clock the table's own
    //    "Resolved" column prints. A window over the market's scheduled `resolutionAt` would put a
    //    row under a date the page does not show it having.
    when: (r, s) => inWindow(r.resolvedAtMs, s.when, nowMs),
    q: (r, s) => !s.q || matchesText(r),
  };
}

/* ─────────────────────────────────────── sorting ──────────────────────────────────────── */

/**
 * 🔴 `recent` IS DESCENDING, AND THAT IS A BUG FIX RATHER THAN A DEFAULT. The section is headed
 * *"Recently resolved"* and rendered OLDEST FIRST: `listBoard` sorts `orderBy: { resolutionAt:
 * "asc" }` and the page sliced without re-sorting — so the heading was false, and it was ordered
 * by the market's SCHEDULED clock rather than by the settlement timestamp its own column prints.
 *
 * ⭐ ITS SIBLING FEED HAD ALREADY FIXED EXACTLY THIS AND SAID WHY. `/api/fairness/recent`:
 * *"listMarkets() sorts ASC by resolutionAt — for the 'recent' feed we want NEWEST first … Sort
 * DESC by stage2At (the actual settlement timestamp) before slicing."* The page never did, so the
 * feed and the page disagreed about what "recent" meant on the same data.
 */
export const ATTESTATION_NATURAL_DIR: Record<AttestationSortId, SortDir> = {
  recent: "desc",
  market: "asc",
};

function attestationKey(row: AttestationRow, sort: AttestationSortId, title: (r: AttestationRow) => string) {
  switch (sort) {
    // ⛔ `|| null`, NEVER `?? 0`. A terminal row with no stage-2 stamp has no settlement clock;
    //    `0` would land it last descending and FIRST the moment the reader flipped the arrow, so
    //    the page would open on the rows it can say least about — on an attestation record.
    case "recent": return row.resolvedAtMs || null;
    case "market": return title(row);
  }
}

const ATTESTATION_TIE_BREAK: Record<AttestationSortId, (a: AttestationRow, b: AttestationRow) => number> = {
  recent: (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  // Two markets with the same title are separated by the clock, newest first.
  market: (a, b) => b.resolvedAtMs - a.resolvedAtMs,
};

/**
 * ⚠️ THE TITLE IS A FUNCTION OF THE VIEWER'S LOCALE, so the spec is built per request rather than
 * being a module constant. Sorting "by market" must order by the words on THIS reader's screen —
 * a spec pinned to `titleEn` would sort a Swahili page by invisible English.
 */
export function attestationSortSpec(
  title: (r: AttestationRow) => string,
  collate?: (a: string, b: string) => number,
): SortSpec<AttestationRow, AttestationSortId> {
  return {
    ids: ATTESTATION_SORTS,
    natural: ATTESTATION_NATURAL_DIR,
    key: (row, sort) => attestationKey(row, sort, title),
    tieBreak: ATTESTATION_TIE_BREAK,
    collate,
  };
}

export function sortAttestations(
  rows: readonly AttestationRow[],
  state: Pick<AttestationState, "sort" | "dir">,
  title: (r: AttestationRow) => string,
  collate?: (a: string, b: string) => number,
): AttestationRow[] {
  return sortBy(attestationSortSpec(title, collate), rows, state);
}

/* ──────────────────────────────── filtering + counting ────────────────────────────────── */

export function filterAttestations(
  rows: readonly AttestationRow[],
  state: AttestationState,
  nowMs: number,
  matchesText: (row: AttestationRow) => boolean,
): AttestationRow[] {
  return filterRows(rows, state, attestationAxes(nowMs, matchesText));
}

export function attestationCounts(
  rows: readonly AttestationRow[],
  state: AttestationState,
  nowMs: number,
  matchesText: (row: AttestationRow) => boolean,
) {
  const axes = attestationAxes(nowMs, matchesText);
  return {
    out: countsFor(rows, state, axes, "out", ATTESTATION_LENSES),
    when: countsFor(rows, state, axes, "when", ATTESTATION_WHEN_IDS),
  };
}

export function attestationCountFor(
  rows: readonly AttestationRow[],
  state: AttestationState,
  nowMs: number,
  matchesText: (row: AttestationRow) => boolean,
  patch: Partial<AttestationState>,
): number {
  return countFor(rows, state, attestationAxes(nowMs, matchesText), patch);
}

/* ─────────────────────────────── empty causes + exits ─────────────────────────────────── */

export type AttestationExitId = "when" | "q" | "out";

const ATTESTATION_EXITS: readonly ExitCandidate<AttestationState, AttestationExitId>[] = [
  { id: "when", patch: { when: "all" } },
  { id: "q", patch: { q: "" } },
  { id: "out", patch: { out: "all" } },
];

export function attestationExits(
  rows: readonly AttestationRow[],
  state: AttestationState,
  nowMs: number,
  matchesText: (row: AttestationRow) => boolean,
): Relaxation<AttestationState, AttestationExitId>[] {
  return relaxations(rows, state, attestationAxes(nowMs, matchesText), ATTESTATION_EXITS);
}

/**
 * ⭐ `void` IS A HEALTHY EMPTY AND `yes`/`no` ARE NOT. "No settlement has been voided" is a fact a
 * regulator is pleased to read — it is the platform working. An empty `yes` on a book that has
 * settled markets is not a healthy fact about the platform, it is a fact about this filter, and
 * saying otherwise would put a reassuring sentence over an unexplained gap in a public record.
 */
const ATTESTATION_HEALTHY_EMPTY: readonly string[] = ["void"];

export function attestationEmptyCause(
  state: AttestationState,
  nowMs: number,
  matchesText: (row: AttestationRow) => boolean,
  shown: number,
  total: number,
): EmptyKind | null {
  return emptyKind({
    state,
    defaults: ATTESTATION_DEFAULT_STATE,
    axes: attestationAxes(nowMs, matchesText),
    shown,
    total,
    lensKey: "out",
    healthyEmpty: ATTESTATION_HEALTHY_EMPTY,
    searchKey: "q",
    windowKey: "when",
  });
}
