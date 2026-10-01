/**
 * U20 · the contacts page's pure helpers — its sort vocabulary, the operator label, and (U24) its ONE href builder.
 *
 * ⭐ WHAT THE SEARCH BOX MEANS no longer lives here: U24 moved `contactsSearch` into the one audience resolver
 * (`src/lib/server/marketing/audience.ts`), the one place a typed query becomes a where — so the list, the export
 * and the campaign read the box the same way. `test:contacts-audience` 1.5 holds that no other file defines it.
 *
 * ⛔ THIS MODULE IMPORTS NOTHING FROM THE SERVER GRAPH, on purpose: a client filter rail (U21) may build its links
 * with `contactsHref`, and a server import reached from a `"use client"` file takes Prisma into the browser chunk.
 */
import { ndcRow, TZ_OPERATORS } from "@/lib/tz-msisdn";

/** The sortable columns, as `?sort=` accepts them. ⚠️ "operator" sorts by the PREFIX (`ndc`) — a brand
 *  label cannot survive paging in a stable order, and the column header says so. */
export const CONTACT_SORTS = ["added", "name", "operator"] as const;
export type ContactSort = (typeof CONTACT_SORTS)[number];

/** The operator's BRAND for a stored prefix, from the ONE numbering table (U2, `ndcRow` — decision C10) — never a
 *  hand-typed list. Null for a prefix the table does not hold (it cannot be a sendable number anyway). */
export function operatorBrand(ndc: string): string | null {
  const row = ndcRow(ndc);
  return row ? TZ_OPERATORS[row.operator].brand : null;
}

/* ═══ U24 · THE ONE HREF BUILDER (decision C9) ═══════════════════════════════════════════════ */

/**
 * The filter keys the page's links carry — the audience vocabulary `parseContactAudienceParams` reads, minus `q`
 * (the search box's own key, cleared by "Clear search", never by "Clear filters").
 * ⚠️ A COPY of `CONTACT_AUDIENCE_URL_KEYS` (audience.ts), kept here so this module stays out of the server graph;
 * `test:contacts-audience` 1.7 fails the moment the two disagree.
 */
export const CONTACTS_FILTER_KEYS = ["consent", "suppressed", "op", "list", "tag", "source", "player", "import", "range", "from", "to"] as const;
/** Every key a link carries: the search, the filters and the sort. ⛔ NEVER `page` (a link lands on page 1 unless
 *  it says otherwise) and NEVER `edit` (U22's dialog must not ride along into a sort, a pager or a pill). */
export const CONTACTS_LINK_KEYS = ["q", ...CONTACTS_FILTER_KEYS, "sort", "dir"] as const;
export type ContactsLinkKey = (typeof CONTACTS_LINK_KEYS)[number];

/**
 * The page's params as ONE value per key — what `SortTh` takes (it copies every key but sort/dir/page).
 * ⭐ A repeated multi-value key (`?op=A&op=B`) is written `op=A,B` — the parser reads both as one union; a
 * single-value key keeps its own first token. `q` is the one free-text key: it keeps its FIRST value whole and
 * is never comma-joined (a comma inside a name search is part of the name).
 */
export function contactsLinkSp(sp: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of CONTACTS_LINK_KEYS) {
    const raw = sp[k];
    const vals = (raw === undefined ? [] : Array.isArray(raw) ? raw : [raw]).filter((v) => typeof v === "string" && v.trim() !== "");
    if (vals.length === 0) continue;
    out[k] = k === "q" ? vals[0] : vals.join(",");
  }
  return out;
}

/**
 * ⭐ THE ONE HREF BUILDER for /admin/contacts. Pagination (as the pager's base), Clear search, Clear filters, every
 * pill (U21) and U22's dialog open/close go through it. It carries every link key from `sp`, then applies `patch`:
 * a string sets a key, null removes it. ⛔ `page` only when patched; ⛔ `edit` never.
 */
export function contactsHref(
  sp: Record<string, string | string[] | undefined>,
  patch: Partial<Record<ContactsLinkKey | "page" | "edit", string | null>> = {},
): string {
  const params = new URLSearchParams();
  const flat = contactsLinkSp(sp);
  for (const k of CONTACTS_LINK_KEYS) {
    const v = Object.prototype.hasOwnProperty.call(patch, k) ? patch[k] : flat[k];
    if (typeof v === "string" && v !== "") params.set(k, v);
  }
  if (typeof patch.page === "string" && patch.page !== "") params.set("page", patch.page);
  // ⭐ C9/M12 · U22's dialog opens and closes through THIS builder: `edit` is set ONLY by an explicit patch, never
  // carried over from the current address, so a sort, a pager or a Clear link can never reopen a dialog.
  if (typeof patch.edit === "string" && patch.edit !== "") params.set("edit", patch.edit);
  const qs = params.toString();
  return qs ? `/admin/contacts?${qs}` : "/admin/contacts";
}

/** Clear filters: every filter key removed — the search and the sort stay. */
export function contactsClearFiltersHref(sp: Record<string, string | string[] | undefined>): string {
  const patch: Partial<Record<ContactsLinkKey, null>> = {};
  for (const k of CONTACTS_FILTER_KEYS) patch[k] = null;
  return contactsHref(sp, patch);
}
