/**
 * Writing the query string — one builder, so a param can never be dropped by a link that did
 * not know about it.
 *
 * ⭐ WHY THIS IS A MODULE. `discovery.ts:8-12` records what the alternative cost on ONE page:
 * `/markets` had **three** independent href builders plus a fourth inside `Pagination`, a new
 * param had to be threaded through every one of them or links silently lost it, and one of the
 * four once disagreed with the page it pointed at. This campaign adds a bar to fifteen more
 * routes. Re-derive what is already out there before adding a sixteenth spelling:
 *
 *     grep -rn "URLSearchParams" src/app src/components --include=*.tsx | grep -v "/admin/"
 *
 * ⛔ EVERY RULE HERE IS LIFTED VERBATIM FROM `buildDiscoveryHref` (`discovery.ts:216-233`).
 * Defaults omitted, `dir` written only when the player chose one, `page` only above 1. What
 * became a parameter is the pathname and the shape of the state; what did not change is a
 * single line of the rule.
 *
 * ⛔ NO IMPORTS. Same rule as `sort.ts` and `discovery.ts` — see their headers.
 */

/**
 * The reserved param name. It is not part of any page's state object, and that is deliberate:
 * paging is a position within a result, not a description of the result.
 *
 * ⚠️ Anything that changes WHICH rows are in the result invalidates the position, which is why
 * `buildQueryHref` drops it rather than leaving each call site to remember.
 */
export const PAGE_PARAM = "page";

/**
 * A page's query state: a flat record of closed-set strings, plus nullable ones for a tri-state
 * axis like `?dir=`. ⛔ Never a number and never a boolean — every value in it is something
 * `oneOf` narrowed out of an untrusted URL, and keeping the parsed form identical to the
 * written form is what makes the round-trip checkable.
 */
export type QueryState = Record<string, string | null>;

/**
 * THE href builder. Every link on a queried page goes through this one function.
 *
 * Defaults are OMITTED — a clean page has a clean URL (`/positions`, not
 * `/positions?tab=all&sort=recent&side=any&topic=all&when=any`). `discovery.ts:213-214` states
 * the same rule for the board it was lifted from.
 *
 * ⭐ THE PARAM ORDER IS THE `defaults` OBJECT'S KEY ORDER, not the patch's and not alphabetical.
 * That makes a given state produce a byte-identical URL every time, from every call site — so
 * two links to the same view are the same string, `replace` does not churn history, and a
 * probe that follows a pill's href and compares it to the page it lands on is comparing like
 * with like.
 *
 * ⛔ `page` IS DROPPED WHENEVER THE PATCH CHANGES ANYTHING — §3 rule 7, enforced HERE rather
 * than trusted at each call site. A player on page 4 of their positions who presses `Won` must
 * land on page 1 of the won ones; leaving that to the caller is how `SearchBox` and
 * `DateTimeRangeFilter` came to do it correctly while every pill on the same bar did not.
 * ⚠️ The test is whether the patch CHANGES a value, not whether a patch was passed: a pill
 * re-stating the state it is already in (`{tab: "all"}` on the All pill) is not a filter
 * change, and dropping the page there would make the currently-selected pill a "go to page 1"
 * button — a control that looks inert and is not.
 */
export function buildQueryHref<S extends QueryState>(
  pathname: string,
  state: S,
  defaults: S,
  patch: Partial<S> = {},
  extra: { page?: number } = {},
): string {
  const next = { ...state, ...patch } as S;

  // ⛔ Compared against `state`, never against `defaults`: the question is "did the player just
  //    change something", not "is anything non-default". A pager link on an already-filtered
  //    page carries no patch, changes nothing, and must keep its page.
  const changed = (Object.keys(patch) as (keyof S)[]).some((k) => patch[k] !== state[k]);
  const page = changed ? undefined : extra.page;

  const p = new URLSearchParams();
  for (const k of Object.keys(defaults)) {
    const v = next[k];
    // ⛔ `null` is never written. It is the tri-state absent value (`?dir=`), and `URLSearchParams`
    //    would serialise it as the four-letter string "null" — a value no `oneOf` allow-list
    //    contains, so it would round-trip back to the default and look like it worked.
    if (v == null || v === defaults[k]) continue;
    p.set(k, v);
  }
  if (page != null && page > 1) p.set(PAGE_PARAM, String(page));

  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Whether the player has narrowed anything — drives whether `Clear` is offered at all.
 *
 * ⛔ `except` IS NOT OPTIONAL POLISH. Lifted from `hasActiveFilters` (`discovery.ts:236-244`),
 * whose whole subtlety is which axes it does NOT count: sort is excluded because it narrows
 * nothing — every row is still on the page — which is also why the bar has always refused sort
 * the active treatment ("sort is view state"). A contract passes the axes that are view state
 * rather than filters, so there is one answer per page and it is written beside that page's
 * other rules instead of being re-decided at the call site.
 */
export function hasActiveFilters<S extends QueryState>(
  state: S,
  defaults: S,
  except: readonly (keyof S)[] = [],
): boolean {
  return (Object.keys(defaults) as (keyof S)[]).some(
    (k) => !except.includes(k) && state[k] !== defaults[k],
  );
}

/**
 * How many of the phone SHEET's own axes are narrowed — the number on the `Filters` button.
 *
 * ⭐ IT COUNTS WHAT THE SHEET CONTAINS, AND NOTHING ELSE — `discovery.ts:249-260` verbatim. A
 * badge is a promise about what is behind the button it sits on; counting an axis the sheet
 * does not hold sends a player in to look for a filter that is not there. The lens strip and
 * the search box keep their own visible controls OUTSIDE the sheet, so counting them would also
 * leave the badge reading `1` on a default page whose lens is not `all`.
 */
export function sheetFilterCount<S extends QueryState>(
  state: S,
  defaults: S,
  axes: readonly (keyof S)[],
): number {
  return axes.reduce((n, k) => n + (state[k] !== defaults[k] ? 1 : 0), 0);
}
