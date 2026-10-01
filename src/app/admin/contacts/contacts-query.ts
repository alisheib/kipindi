/**
 * U20 · WHAT THE CONTACTS SEARCH BOX MEANS — one pure function, so the page, the suite and (later)
 * the export and the campaign audience read a typed query the same way.
 *
 * ⭐ A WHOLE NUMBER IS FOUND BY ITS KEY. `0712 345 678`, `712345678`, `+255712345678` and the bare
 * `255712345678` are one person; `parseTzNumber` (U2) turns every spelling into the one bare key the
 * book stores, and the store matches it EXACTLY.
 *
 * ⛔ A PART OF A NUMBER NEVER SEARCHES THE NUMBER COLUMN. GROWTH sees every number masked
 * (`+255••••01`, U19). A substring search on `msisdn` would let that role rebuild a number digit by
 * digit — "does 07123 match? 071234?" — which is exactly the harvest the mask exists to prevent.
 * Anything that is not a whole sendable number is a NAME search, through the shared grammar
 * (`CONTACT_SEARCH`, `src/lib/search`), which reaches `displayName` alone.
 */
import { parseQuery, fieldNames, CONTACT_SEARCH } from "@/lib/search";
import type { ParsedQuery } from "@/lib/search";
import { parseTzNumber, TZ_MOBILE_NDCS, TZ_OPERATORS } from "@/lib/tz-msisdn";

export type ContactsSearch = {
  /** The bare `255…` key of a WHOLE number, or null. */
  msisdn: string | null;
  /** A name query, or null when the box is empty or holds a whole number. */
  name: ParsedQuery | null;
};

export function contactsSearch(raw: string | null | undefined): ContactsSearch {
  const text = (raw ?? "").trim();
  if (text === "") return { msisdn: null, name: null };
  const parsed = parseTzNumber(text);
  if (parsed.verdict === "ok" && parsed.msisdn) return { msisdn: parsed.msisdn, name: null };
  return { msisdn: null, name: parseQuery(text, { fields: fieldNames(CONTACT_SEARCH) }) };
}

/** The sortable columns, as `?sort=` accepts them. ⚠️ "operator" sorts by the PREFIX (`ndc`) — a brand
 *  label cannot survive paging in a stable order, and the column header says so. */
export const CONTACT_SORTS = ["added", "name", "operator"] as const;
export type ContactSort = (typeof CONTACT_SORTS)[number];

/** The operator's BRAND for a stored prefix, from the ONE numbering table (U2) — never a hand-typed list.
 *  Null for a prefix the table does not hold (it cannot be a sendable number anyway). */
export function operatorBrand(ndc: string): string | null {
  const row = TZ_MOBILE_NDCS.find((r) => r.ndc === ndc);
  return row ? TZ_OPERATORS[row.operator].brand : null;
}
