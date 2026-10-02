/**
 * U20 · WHAT /admin/contacts READS — one function, so the page and `test:contacts-page` run the SAME reads.
 * U24 · and it reads ONLY through the one audience resolver (`contactAudience`, `marketing/audience.ts`), so the
 * list's total is the count the export writes and the campaign confirms (`test:contacts-audience` §3).
 *
 * ⭐ THE KPIs ARE THE WHOLE BOOK (`contactAudience(WHOLE_BOOK).breakdown()`), never the filtered view — and they
 * stand in the refused state too.
 * ⭐ PAGE 4 OF A 3-ROW RESULT IS PAGE 1, never "no matches": the resolver's `page()` clamps by the match count.
 * ⛔ AN UNREADABLE FILTER IS REFUSED, NEVER DROPPED (decision C2): `?op=NOKIA` is `{ kind: "refused" }` naming the
 * parameter, and the page shows no rows — a silently widened table is exactly what a bulk action or an export
 * would then act on.
 * ⭐ U21 · THE RAIL'S OPTIONS are read here too, in BOTH answers: every list, and the book's tags most-carried first
 * (`contactTagCounts`, the resolver's own tag reader — U24/M8). Like the KPIs they are WHOLE-BOOK facts, so a masked
 * viewer gets them as well: a count over the book is not a per-number answer (A1.1). The rail itself is built by the
 * page (`contacts-rail.ts`), which is also where a FAILED read still draws it, from the address alone.
 * ⛔ A read that fails THROWS to the caller, which renders `AdminLoadError` — never a zero, which on a
 * compliance surface reads as "this book is empty".
 */
import { db } from "@/lib/server/store";
import { currentSession } from "@/lib/server/auth-service";
import { mayReveal } from "@/lib/server/rbac";
import type { ContactBookSummary, ContactPage, ContactTagCount, StoredContactList } from "@/lib/server/store";
import {
  contactAudience, contactTagCounts, describeAudience, narrowsBeyondSearch, parseContactAudienceParams, roleRefusal,
  WHOLE_BOOK,
} from "@/lib/server/marketing/audience";
import type { ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { PER_PAGE } from "@/components/admin/admin-pagination";
import { parseSort } from "@/components/admin/admin-sort";
import { CONTACT_SORTS } from "./contacts-query";
import type { ContactSort } from "./contacts-query";
import { RAIL_TAG_READ } from "./contacts-rail";

/** Next's own shape: a repeated param arrives as an array. */
export type ContactsParams = Record<string, string | string[] | undefined>;

type ContactsBase = {
  /** The WHOLE book's counts, whatever the filter — and in the refused state too. */
  summary: ContactBookSummary;
  sort: ContactSort;
  dir: "asc" | "desc";
  /** D19 · may this viewer see, row by row, what only a PLAYER can have (Reachable, Source, the Player chip)? */
  viewerReads: boolean;
  /** U21 · every list, for the rail's List axis — whole-book, in the refused state too. */
  lists: StoredContactList[];
  /** U21 · the book's tags with how many contacts carry each, most-carried first (the erased tombstone left out). */
  tags: ContactTagCount[];
};
export type ContactsView =
  | (ContactsBase & {
      kind: "ok";
      result: ContactPage;
      page: number;
      filter: ContactAudienceFilter;
      /** `describeAudience(filter)` — the words the page shows above the table. */
      described: string[];
      /** Does anything but the search box narrow the list? (The "Showing contacts: …" line shows only then.) */
      narrowed: boolean;
    })
  | (ContactsBase & {
      kind: "refused";
      /** "unreadable": a value the parser does not know. "role": D19 — the filter is not this viewer's to ask. */
      refusal: "unreadable" | "role";
      param: string;
      reason: string;
    });

export type ContactsDeps = {
  /** D19's read cell — injected by a script, which has no session. The page gets the real one. */
  reads?: () => Promise<boolean>;
};

/**
 * 🔴 D19 · A MEMBERSHIP ORACLE, ROW BY ROW. Some of the gate's answers can only come from its PLAYER branch
 * (a protected standing, and — until U33 — "Reachable" itself), a stranger's number reads "No consent", the
 * Source "Sign-up" means the number came with an account, and the Player chip says so outright. For a role
 * that may not read a number at all, any of them answers "is this person a player?" for a number they typed.
 * ⛔ So they render only for a viewer whose `identity.contact` cell is `read` — the same cell that may reveal
 * the number. Decided HERE, in a .ts: `test:read-tiers` 4.4 lets no .tsx but `sensitive.tsx` ask the matrix.
 * Fails closed: no session, no role, no read.
 * ⭐ U21 · the page also asks it on its own when the book's read FAILED, because the filter rail is role-shaped in
 * the error state too (the loader threw, so its answer never arrived).
 */
export async function viewerReadsContacts(): Promise<boolean> {
  const session = await currentSession();
  if (!session) return false;
  const role = (await db.user.findById(session.userId))?.role;
  return role ? mayReveal(role, "identity.contact") : false;
}

const firstParam = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

export async function loadContacts(sp: ContactsParams, deps: ContactsDeps = {}): Promise<ContactsView> {
  const reads = deps.reads ?? viewerReadsContacts;
  const { sort, dir } = parseSort({ sort: firstParam(sp.sort), dir: firstParam(sp.dir) }, CONTACT_SORTS, "added", "desc");
  const summary = await contactAudience(WHOLE_BOOK).breakdown();
  const viewerReads = await reads();
  // ⭐ U21 · the rail's options — whole-book facts, read before the filter is even parsed, so a refused page still
  // draws its whole rail. More tags than the rail draws, so it knows when there are more and an applied tag past the
  // drawn ones still finds its count.
  const [lists, tags] = await Promise.all([db.contactList.listAll(), contactTagCounts(RAIL_TAG_READ)]);
  const base = { summary, sort, dir, viewerReads, lists, tags };

  const parsed = parseContactAudienceParams(sp);
  if (!parsed.ok) return { ...base, kind: "refused", refusal: "unreadable", param: parsed.param, reason: parsed.reason };
  // 🔴 D19 · the ONE role rule every door asks (`roleRefusal`, audience.ts): player, source and consent.
  const role = roleRefusal(parsed.filter, viewerReads);
  if (role !== null) return { ...base, kind: "refused", refusal: "role", param: role.param, reason: role.reason };

  const result = await contactAudience(parsed.filter).page({ sort, dir, page: firstParam(sp.page), perPage: PER_PAGE });
  return {
    ...base,
    kind: "ok",
    result: { rows: result.rows, total: result.total },
    page: result.page,
    filter: parsed.filter,
    described: describeAudience(parsed.filter),
    narrowed: narrowsBeyondSearch(parsed.filter),
  };
}
