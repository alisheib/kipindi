/**
 * U20 · WHAT /admin/contacts READS — one function, so the page and `test:contacts-page` run the SAME reads.
 * U24 · and it reads ONLY through the one audience resolver (`contactAudience`, `marketing/audience.ts`), so the
 * list's total is the count the export writes and the campaign confirms (`test:contacts-audience` §3).
 *
 * ⭐ THE KPIs ARE THE WHOLE BOOK (`contactAudience(WHOLE_BOOK).breakdown()`), never the filtered view — and they
 * stand in the refused state too.
 * 🔴 OD54 · A MASKED VIEWER'S SECOND FACT is the contacts ADDED IN THE LAST 7 DAYS — `contactAudience({ ...WHOLE_BOOK,
 * addedFrom })` counted through the same resolver, whole-book, at the load's ONE clock (`now`, read once: the address's
 * relative window resolves from it too). It is asked only for that viewer (a reader's band never shows it), and like
 * every KPI it stands in the refused state. The stop count it replaces is a reader's alone (`page.tsx`).
 * ⭐ PAGE 4 OF A 3-ROW RESULT IS PAGE 1, never "no matches": the resolver's `page()` clamps by the match count.
 * ⛔ AN UNREADABLE FILTER IS REFUSED, NEVER DROPPED (decision C2): `?op=NOKIA` is `{ kind: "refused" }` naming the
 * parameter, and the page shows no rows — a silently widened table is exactly what a bulk action or an export
 * would then act on.
 * 🔴 C8b (B3, Ali's ruling of 2026-10-09) · A MASKED VIEWER'S WHOLE-NUMBER SEARCH IS `{ kind: "presence" }`: whether the
 * book holds the number — a row, or a number the book blocks because its holder was erased (`bookHoldsNumber`, the Add
 * form's own answer) — and NO ROWS, whatever else the address holds (`number-search.ts`). Asked before any page is read,
 * so the row's name, lists, tags, "Added" and edit link never reach that viewer. A reader's whole-number search and
 * everyone's name search list rows as before.
 * ⭐ U21 · THE RAIL'S OPTIONS are read here too, in BOTH answers: every list, and the book's tags most-carried first
 * (`contactTagCounts`, the resolver's own tag reader — U24/M8). Like the KPIs they are WHOLE-BOOK facts, so a masked
 * viewer gets them as well: a count over the book is not a per-number answer (A1.1). The rail itself is built by the
 * page (`contacts-rail.ts`), which is also where a FAILED read still draws it, from the address alone.
 * ⛔ A read that fails THROWS to the caller, which renders `AdminLoadError` — never a zero, which on a
 * compliance surface reads as "this book is empty".
 * ⭐ U22 · AND THE ?edit=<contact id> DIALOG'S ONE READ (`loadContactEdit`), apart from the list's: a failed book read
 * must not hide the dialog, and a failed dialog read is its own "couldn't load" state — never "missing". An unknown
 * id and an ERASED row are both MISSING (A1.7, `findEditableContact`). 🔴 The view the dialog receives carries no
 * number and no email (each renders through `<Sensitive>` in the page), and the consent and the source ONLY for a
 * viewer who may read a number (A1.1 — until U33 a recorded consent can only be a player's).
 */
import { db } from "@/lib/server/store";
import { currentSession } from "@/lib/server/auth-service";
import { mayReveal } from "@/lib/server/rbac";
import type { ContactBookSummary, ContactPage, ContactTagCount, StoredContactList, StoredMarketingContact } from "@/lib/server/store";
import {
  contactAudience, contactTagCounts, describeAudience, narrowsBeyondSearch, parseContactAudienceParams, roleRefusal,
  WHOLE_BOOK,
} from "@/lib/server/marketing/audience";
import type { ContactAudienceFilter } from "@/lib/server/marketing/audience";
import { findEditableContact, CONTACT_MISSING } from "@/lib/server/contacts/contact-write";
import { bookHoldsNumber, wholeNumberOf } from "@/lib/server/contacts/number-search";
import { PER_PAGE } from "@/components/admin/admin-pagination";
import { parseSort } from "@/components/admin/admin-sort";
import { formatDate } from "@/lib/utils";
import { DAY_MS } from "@/lib/query/windows";
import { CONTACT_SORTS } from "./contacts-query";
import type { ContactSort } from "./contacts-query";
import { RAIL_TAG_READ } from "./contacts-rail";
import { CONSENT_LABEL, SOURCE_LABEL, CONTACTS_RECENT_DAYS } from "./contacts-copy";

/** Next's own shape: a repeated param arrives as an array. */
export type ContactsParams = Record<string, string | string[] | undefined>;

type ContactsBase = {
  /** The WHOLE book's counts, whatever the filter — and in the refused state too. */
  summary: ContactBookSummary;
  /** 🔴 OD54 · the WHOLE book's contacts added in the last `CONTACTS_RECENT_DAYS` days — the masked band's second fact,
   *  whatever the filter and in the refused state too. A number for a viewer who may not read a number; null for a
   *  reader, whose band does not show it (it is not asked). */
  addedRecently: number | null;
  sort: ContactSort;
  dir: "asc" | "desc";
  /** D19 · may this viewer see, row by row, what only a PLAYER can have (Reachable — which names a stop, OD54 — Source,
   *  the Player chip)? */
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
    })
  | (ContactsBase & {
      /** 🔴 C8b (B3) · a masked viewer's WHOLE-NUMBER search: one bit about the whole book, and no rows. */
      kind: "presence";
      /** The book holds the number — a row, or an erased holder's block — exactly as Add contact would say. */
      present: boolean;
    });

export type ContactsDeps = {
  /** D19's read cell — injected by a script, which has no session. The page gets the real one. */
  reads?: () => Promise<boolean>;
  /** The load's ONE clock (epoch ms) — injected by a script so its seven days are a fixed window. The page gets the real one. */
  now?: () => number;
  /** C8b (B3) · whether the book holds a number (`bookHoldsNumber`) — swapped by a script's red plants only. */
  presence?: (msisdn: string) => Promise<boolean>;
};

/**
 * 🔴 D19 · A MEMBERSHIP ORACLE, ROW BY ROW. Some of the gate's answers can only come from its PLAYER branch
 * (a protected standing, and — until U33 — "Reachable" itself), a stranger's number reads "No consent", the
 * Source "Signed up" means the number came with an account, and the Player chip says so outright. For a role
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
  // ⭐ OD54 · the load's ONE clock, read once: the masked band's seven days and the address's relative window both
  // resolve from it, so they can never straddle a minute between them.
  const now = deps.now ? deps.now() : Date.now();
  const { sort, dir } = parseSort({ sort: firstParam(sp.sort), dir: firstParam(sp.dir) }, CONTACT_SORTS, "added", "desc");
  const summary = await contactAudience(WHOLE_BOOK).breakdown();
  const viewerReads = await reads();
  // 🔴 OD54 · a masked viewer's second fact — the book's contacts added in the last 7 days, through the ONE resolver
  // (whole book, the erased tombstone left out as from every reader) — asked only for the viewer whose band shows it.
  const addedRecently = viewerReads
    ? null
    : await contactAudience({ ...WHOLE_BOOK, addedFrom: new Date(now - CONTACTS_RECENT_DAYS * DAY_MS).toISOString() }).count();
  // ⭐ U21 · the rail's options — whole-book facts, read before the filter is even parsed, so a refused page still
  // draws its whole rail. More tags than the rail draws, so it knows when there are more and an applied tag past the
  // drawn ones still finds its count.
  const [lists, tags] = await Promise.all([db.contactList.listAll(), contactTagCounts(RAIL_TAG_READ)]);
  const base = { summary, addedRecently, sort, dir, viewerReads, lists, tags };

  const parsed = parseContactAudienceParams(sp, now);
  if (!parsed.ok) return { ...base, kind: "refused", refusal: "unreadable", param: parsed.param, reason: parsed.reason };
  // 🔴 D19 · the ONE role rule every door asks (`roleRefusal`, audience.ts): player, source, consent — and, since OD54,
  // suppressed.
  const role = roleRefusal(parsed.filter, viewerReads);
  if (role !== null) return { ...base, kind: "refused", refusal: "role", param: role.param, reason: role.reason };
  // 🔴 C8b (B3) · a masked viewer's whole-number search answers whether the book holds the number — before, and instead
  // of, any page of rows.
  const number = viewerReads ? null : wholeNumberOf(parsed.filter);
  if (number !== null) return { ...base, kind: "presence", present: await (deps.presence ?? bookHoldsNumber)(number) };

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

/* ═══ U22 · THE ?edit=<contact id> DIALOG ═══════════════════════════════════════════════════════════════ */

/** What the edit dialog is handed. ⛔ No number and no email: the page renders each through `<Sensitive>`. */
export type ContactEditView = {
  id: string;
  displayName: string | null;
  notes: string | null;
  tags: string[];
  /** The prefix — the operator chip reads the ONE table from it, as the list's Operator column does. */
  ndc: string;
  /** Whether a stored address exists — the dialog offers to keep, replace or remove it without ever holding it. */
  hasEmail: boolean;
  addedLabel: string;
  /** The compare in compare-and-set. */
  updatedAt: string;
  /** 🔴 A1.1 · the mirrored consent and the source, for a viewer who may read a number — null for anyone else. */
  reader: { consentLabel: string; consentVariant: "success" | "neutral" | "warning"; sourceLabel: string } | null;
};

export type ContactEditLoad =
  | { kind: "ready"; row: StoredMarketingContact; view: ContactEditView }
  | { kind: "missing"; sentence: string }
  | { kind: "failed" };

/** The dialog's view of one row. ⛔ For a masked viewer `reader` is null — not a hidden value, an absent one. */
export function contactEditView(row: StoredMarketingContact, reads: boolean): ContactEditView {
  const consent = CONSENT_LABEL[row.consentState];
  return {
    id: row.id,
    displayName: row.displayName,
    notes: row.notes,
    tags: [...row.tags],
    ndc: row.ndc,
    hasEmail: row.email !== null && row.email !== "",
    addedLabel: formatDate(row.createdAt),
    updatedAt: row.updatedAt,
    reader: reads ? { consentLabel: consent.label, consentVariant: consent.variant, sourceLabel: SOURCE_LABEL[row.source] } : null,
  };
}

/**
 * The `?edit=` read: null when the address asks for no dialog; `missing` for an id that is not a contact, not in the
 * book, or ERASED (A1.7 — `findEditableContact`, the question `editContact` asks too); `failed` when the read itself
 * failed, so the dialog says it could not load rather than that the contact is gone.
 * ⛔ `edit` never travels further than this: `contactsHref` never carries it (decision C9), so no sort header, pager,
 * pill or search box can reopen the dialog.
 */
export async function loadContactEdit(sp: ContactsParams, reads: boolean): Promise<ContactEditLoad | null> {
  const id = (firstParam(sp.edit) ?? "").trim();
  if (id === "") return null;
  try {
    const row = await findEditableContact(id);
    if (row === null) return { kind: "missing", sentence: CONTACT_MISSING };
    return { kind: "ready", row, view: contactEditView(row, reads) };
  } catch (err) {
    console.error("[admin/contacts] contact read failed:", (err as Error)?.message ?? err);
    return { kind: "failed" };
  }
}
