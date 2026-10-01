/**
 * U20 · WHAT /admin/contacts READS — one function, so the page and `test:contacts-page` run the SAME reads.
 *
 * ⭐ THE KPIs ARE THE WHOLE BOOK (`summary()`), never the filtered view.
 * ⭐ PAGE 4 OF A 3-ROW RESULT IS PAGE 1, never "no matches": the requested page is clamped by the MATCH count
 * the store returns, and the page is read again when the clamp moved it.
 * ⛔ A read that fails THROWS to the caller, which renders `AdminLoadError` — never a zero, which on a
 * compliance surface reads as "this book is empty".
 */
import { db } from "@/lib/server/store";
import { currentSession } from "@/lib/server/auth-service";
import { mayReveal } from "@/lib/server/rbac";
import type { ContactBookSummary, ContactPage } from "@/lib/server/store";
import { parsePage, PER_PAGE } from "@/components/admin/admin-pagination";
import { parseSort } from "@/components/admin/admin-sort";
import { contactsSearch, CONTACT_SORTS } from "./contacts-query";
import type { ContactSort } from "./contacts-query";

export type ContactsParams = { q?: string; sort?: string; dir?: string; page?: string };
export type ContactsView = {
  summary: ContactBookSummary;
  result: ContactPage;
  page: number;
  sort: ContactSort;
  dir: "asc" | "desc";
  /** D19 · may this viewer see, row by row, what only a PLAYER can have (Reachable, Source, the Player chip)? */
  viewerReads: boolean;
};

/**
 * 🔴 D19 · A MEMBERSHIP ORACLE, ROW BY ROW. Some of the gate's answers can only come from its PLAYER branch
 * (a protected standing, and — until U33 — "Reachable" itself), a stranger's number reads "No consent", the
 * Source "Sign-up" means the number came with an account, and the Player chip says so outright. For a role
 * that may not read a number at all, any of them answers "is this person a player?" for a number they typed.
 * ⛔ So they render only for a viewer whose `identity.contact` cell is `read` — the same cell that may reveal
 * the number. Decided HERE, in a .ts: `test:read-tiers` 4.4 lets no .tsx but `sensitive.tsx` ask the matrix.
 * Fails closed: no session, no role, no read.
 */
export async function viewerReadsContacts(): Promise<boolean> {
  const session = await currentSession();
  if (!session) return false;
  const role = (await db.user.findById(session.userId))?.role;
  return role ? mayReveal(role, "identity.contact") : false;
}

export async function loadContacts(sp: ContactsParams, search = contactsSearch, reads = viewerReadsContacts): Promise<ContactsView> {
  const query = search(sp.q);
  const { sort, dir } = parseSort(sp, CONTACT_SORTS, "added", "desc");
  const summary = await db.marketingContact.summary();
  const requested = parsePage(sp.page, Number.MAX_SAFE_INTEGER);
  const read = (page: number) => db.marketingContact.page({ ...query, sort, dir, offset: (page - 1) * PER_PAGE, limit: PER_PAGE });
  let result = await read(requested);
  const page = parsePage(sp.page, result.total);
  if (page !== requested) result = await read(page);
  return { summary, result, page, sort, dir, viewerReads: await reads() };
}
