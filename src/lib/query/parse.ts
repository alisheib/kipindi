/**
 * Reading an untrusted query string — the four moves every list surface makes.
 *
 * ⭐ WHY THIS IS A MODULE AND NOT FOUR ONE-LINERS AT EACH CALL SITE. Before it,
 * `oneOf` existed privately inside `lib/markets/discovery.ts:168`, `parseFilter` and
 * `parseSort` were hand-written twice in `lib/notification-filters.ts:48-64`,
 * `parseSort` again in `components/admin/admin-sort.tsx:22`, and `/positions`,
 * `/proposals`, `/results` and `/updown/history` each narrowed their own param with a
 * bespoke ternary. Six spellings of one rule, and they did not agree: `/updown/history`
 * validated `?day=` for the CHIP but filtered on the RAW value, so `?day=lol` matched no
 * round, hid every card, and rendered no control to clear it — a dead end reached by one
 * typo.
 *
 * ⛔ THE RULE, AND IT IS THE WHOLE POINT: an unknown value FALLS BACK, it never throws and
 * it is never passed through. A hand-edited link, a stale bookmark or a crawler must render
 * a page, never a 500 and never a filter nobody chose. `discovery.ts:186-188` states the
 * same thing in its own words and this module is where that promise now lives.
 */

/**
 * Next's `searchParams` hands back `string | string[] | undefined` — a repeated param
 * (`?tab=a&tab=b`) arrives as an array. Every reader in the product wants the first one.
 *
 * ⚠️ Taking `[0]` rather than the last is deliberate and matches the shipped behaviour of
 * `discovery.ts:193-196`. Either choice is defensible; two choices in one product is not.
 */
export function oneParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Narrow a raw value against a CLOSED set. Anything else becomes the fallback.
 *
 * This is what makes a URL-driven filter injection-safe by construction: the value that
 * reaches a Prisma `where` or a comparator can only ever have come from the allow-list,
 * never from the request. `lib/search/fields.ts:4-9` makes the same argument about column
 * names and points at this pattern by name.
 */
export function oneOf<T extends string>(allowed: readonly T[], raw: unknown, fallback: T): T {
  return typeof raw === "string" && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : fallback;
}

/**
 * The sort direction, TRI-STATE on purpose: `null` means "the sort's own natural
 * direction", which is not the same as either `asc` or `desc`.
 *
 * ⭐ Why it cannot collapse to a boolean or default to `desc`: choosing a new sort resets
 * direction to `null` so the new sort arrives pointing the way it should
 * (`discovery-bar.tsx:311` passes `dir: null` with every sort option), and
 * `SORT_NATURAL_DIR` then decides. A two-state direction would make "closing soonest"
 * open on the markets closing LAST.
 */
export function parseDir(raw: unknown): "asc" | "desc" | null {
  return raw === "asc" ? "asc" : raw === "desc" ? "desc" : null;
}

/**
 * A free-text query, trimmed and clamped.
 *
 * ⛔ The caller passes the cap; this function does not own a number. The one cap in the
 * product is `MAX_QUERY_LEN` in `lib/search/query.ts`, and `discovery.ts:171-182` records
 * what happened when a second file declared its own: the board's parser and the search box
 * that writes the URL would clamp to different lengths the moment either was retuned, and
 * the player's query would be silently truncated by whichever was smaller.
 */
export function clampText(raw: unknown, max: number): string {
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}
