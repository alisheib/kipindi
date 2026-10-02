/**
 * /admin/contacts — the marketing address book (U17 doors, U20 the list, U21 the filter rail, U22 the form, U23 bulk).
 *
 * WHAT THIS PAGE IS TODAY, so nobody reads more into it: the book, server-paged, searchable by a WHOLE
 * number or by name, sortable by name, prefix and date, filterable from one rail — ONE contact at a time
 * added or edited by hand (U22: "Add contact" in the page head, `?edit=<contact id>` for the dialog over the
 * list, opened from each row's "edit" link) — and a selection acted on in bulk (U23: the select column and the bar —
 * tag, untag, add to a list, record a withdrawal, suppress, remove). There is no way to import a file yet (U25–U32),
 * to record a consent (U33) or to export (U34), and this page promises none of it.
 * ⭐ U23 · THE SELECTION HOLDS SERVER-PROJECTED ROWS (`contactSelectionRow`: id, name, the number MASKED for every role),
 * never a stored row, so no raw number reaches the browser through it; "select all N matching" holds the FILTER (its
 * canonical key). Every count the bar confirms is the server's (`contact-bulk.ts`), recounted at the run.
 * ⭐ U22 · THE FORM RECORDS NO CONSENT (`contact-form.tsx`): nothing lawful can be chosen until U33, so a new
 * contact's consent is the ledger's, MIRRORED — and shown to a reader only (A1.1). The dialog's number and email
 * render through `<Sensitive>` here, server-side; the dialog itself never holds either. `edit` is set only by an
 * explicit patch to the ONE href builder, so no sort header, pager, pill or search box carries it.
 *
 * ⭐ SERVER-PAGED, because the book is built for 150,000 people (§3c): the store returns one page and the
 * count of the whole match, never the book. The KPI band is the WHOLE book (`contactAudience(WHOLE_BOOK).breakdown()`), never the
 * filtered view — a search must not make "Consent given" look like it fell.
 * ⛔ Every number renders through `<Sensitive field="contactPhone">` (U19): GROWTH sees `+255••••01` and no
 * control; a role that may reveal gets the eye and Copy, each one a `pii.revealed` row.
 * ⭐ "Reachable" is the SEND GATE's own answer (`mayReceiveMarketingSms`), asked per visible row — not a
 * second definition. It names only the reasons an operator can act on; a responsible-gambling, age or
 * account refusal reads "Not reachable" and never says which (the gate's detail is not this role's to read).
 * 🔴 D19 · Reachable, Source and the Player chip render ONLY for a viewer who may read a number
 * (`viewerReads`, decided in `contacts-loader.ts`): each one, row by row, tells a masked role whether a
 * number belongs to a player. 🔴 OD54 · and so does a STOP: until the importer goes live it is a player's own
 * opt-out or an officer's, so the one place a row says "Suppressed" — the Reachable cell, the gate's own answer — is a
 * reader's, this page reads no `suppressedAt` cache for any row, and a masked viewer's KPI band carries no stop count.
 * ⭐ U24 · every read goes through the ONE audience resolver (`contacts-loader.ts` → `contactAudience`). A filter
 * in force is said in words above the table ("Showing contacts: …"), and every link is built by ONE href builder
 * (`contactsHref`) that carries them. ⛔ A filter that cannot be read is REFUSED — no rows, the parameter named, a
 * Clear action — never silently dropped into a wider list.
 * ⭐ U21 · THE RAIL (`contact-filters.tsx`, built by `contacts-rail.ts`) draws what the address applies and writes
 * every pill through that builder. It is gated on `!emptyBook` ALONE — a whole-book fact, never the match count —
 * so a filter that matches nothing, a refused filter and a failed read all keep it on screen (§5.15). It is
 * role-shaped (A1.1, OD54): a masked viewer gets no Consent, Source or Suppressed axis. ⛔ The Operator COLUMN reads
 * the one numbering table (`operatorBrand(c.ndc)`) and never the stored `operator` string, which could say "Tigo"
 * under the Yas pill.
 *
 * Growth domain (`roles.ts`), the same people who run affiliate, bonuses and invites.
 */
import Link from "next/link";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { AdminPagination, PER_PAGE } from "@/components/admin/admin-pagination";
import { SortTh } from "@/components/admin/admin-sort";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { Chip } from "@/components/ui/chip";
import { Sensitive } from "@/components/ui/sensitive";
import { ScrollX } from "@/components/ui/scroll-x";
import { SearchBox } from "@/components/ui/search-box";
import { db } from "@/lib/server/store";
import type { StoredMarketingContact } from "@/lib/server/store";
import { mayReceiveMarketingSms } from "@/lib/server/marketing/consent";
import type { MarketingSkipReason } from "@/lib/server/marketing/consent";
import { MAX_AUDIENCE_IDS } from "@/lib/server/marketing/audience";
import { contactFilterAudienceKey, contactFilterIdentity, contactSelectionRow } from "@/lib/server/marketing/contact-bulk";
import { formatDate } from "@/lib/utils";
import {
  CONTACTS_EMPTY, CONTACTS_NO_MATCH, CONTACTS_NO_MATCH_FILTERED, CONTACTS_SEARCH_PLACEHOLDER, CONTACTS_FILTERED_LEAD,
  CONTACTS_FILTER_UNREADABLE, CONTACTS_FILTER_NOT_FOR_ROLE, CONSENT_LABEL, SOURCE_LABEL, CONTACTS_BULK, CONTACTS_KPI_RECENT,
} from "./contacts-copy";
import { operatorBrand, contactsHref, contactsClearFiltersHref, contactsLinkSp } from "./contacts-query";
import { loadContacts, loadContactEdit, viewerReadsContacts } from "./contacts-loader";
import type { ContactsParams, ContactsView } from "./contacts-loader";
import { contactRail } from "./contacts-rail";
import { ContactFilters } from "./contact-filters";
import { AddContactButton, ContactEditDialog } from "./contact-form";
import { ContactsSelectionProvider } from "./contacts-selection-provider";
import { ContactRowSelect, ContactPageSelect } from "./contact-row-select";
import { ContactsBulkBar } from "./contacts-bulk-bar";

type ContactsSP = ContactsParams;

/** W25 BELT 2 — this page's own gate, decided on the viewer's STORED row. The section layout is skipped
 *  by a flight request whose router state names it, so the gate the page cannot lose is the one it
 *  carries itself. ⛔ One `return`, one self-closing child: `admin-section-gate.test.mjs` §0b′ plants
 *  four inert spellings (a comment, a string, a ternary, a partial wrap) and every one must be refused. */
export default async function AdminContactsPage(props: { searchParams: Promise<ContactsSP> }) {
  return <AdminPageGate title="Contacts"><AdminContactsContent searchParams={props.searchParams} /></AdminPageGate>;
}

/** ⛔ Only the reasons an operator can act on are named; everything else is "Not reachable". A
 *  self-exclusion, a break, a harm marker, an age or an account status is the player's protected
 *  standing, and it is not named even to the reader this column renders for (D19: GROWTH, a masked
 *  role, gets no Reachable column at all). 🔴 OD54 · its "Suppressed" is the ONE place a row says it is
 *  under a stop, which is why the column stays a reader's. Typed as a full Record so a new gate reason
 *  is a compile error here, not a silent blank. */
const REACH: Record<MarketingSkipReason, string> = {
  suppressed: "Suppressed",
  no_consent: "No consent",
  consent_withdrawn: "Withdrawn",
  age_unknown: "Age not confirmed",
  bad_msisdn: "Not a sendable number",
  rg_self_excluded: "Not reachable",
  rg_cooling_off: "Not reachable",
  rg_harm_marker: "Not reachable",
  rg_under25_history: "Not reachable",
  age_minor: "Not reachable",
  account_status: "Not reachable",
};

async function reachOf(c: StoredMarketingContact): Promise<{ ok: boolean; label: string }> {
  try {
    // Concatenated, not a template: `{…msisdn}` in braces is the shape read-tiers §7 reads as a raw render.
    const v = await mayReceiveMarketingSms("+" + c.msisdn);
    return v.ok ? { ok: true, label: "Reachable" } : { ok: false, label: REACH[v.skipReason] };
  } catch {
    // ⛔ A gate that could not answer is not a yes.
    return { ok: false, label: "Not reachable" };
  }
}

async function AdminContactsContent({ searchParams }: { searchParams: Promise<ContactsSP> }) {
  const sp = await searchParams;
  let view: ContactsView | null = null;
  try {
    view = await loadContacts(sp);
  } catch (err) {
    // ⛔ A failed read is AdminLoadError below, never a zero (`contacts-loader.ts`).
    console.error("[admin/contacts] read failed:", (err as Error)?.message ?? err);
  }
  const summary = view?.summary ?? null;
  // 🔴 OD54 · the masked band's second fact (the loader asks it for that viewer alone; null for a reader).
  const recent = view?.addedRecently ?? null;
  // ⭐ U24 · the loader's two answers: the list ("ok"), or a filter it would not read ("refused").
  const listed = view?.kind === "ok" ? view : null;
  const refused = view?.kind === "refused" ? view : null;
  const result = listed?.result ?? null;
  const page = listed?.page ?? 1;
  const sort = view?.sort ?? "added";
  const dir = view?.dir ?? "desc";
  // 🔴 D19 · the read cell, from the loader — and when the read FAILED, asked on its own and failing closed: the
  // rail is role-shaped in the error state too, so a masked viewer's rail never grows a Consent axis on an error.
  const reads = view !== null ? view.viewerReads : await viewerReadsContacts().catch(() => false);
  // D19 + A1.1: a masked viewer sees Name, Number, Operator, Lists · Tags and Added — no per-row consent, reach,
  // source or player signal. U23 · plus the select column, first, for every viewer (ticking is a read affordance).
  const cols = reads ? 9 : 6;
  // ⭐ U22 · THE ?edit=<contact id> DIALOG — its own read, so a failed book read does not hide it, nor it the list.
  // 🔴 An unknown id and an ERASED row are both MISSING (A1.7); the view carries the consent only for a reader (A1.1).
  const editLoad = await loadContactEdit(sp, reads);
  const editing = editLoad?.kind === "ready" ? editLoad.row : null;

  const failed = view === null;
  const emptyBook = !failed && summary!.total === 0;
  const rows = result?.rows ?? [];
  // ⭐ U23 · the rows as the selection holds them: projected HERE, on the server — id, name, the number masked for every
  // role (`contactSelectionRow`) — so the client never receives a stored row.
  const pageRows = rows.map(contactSelectionRow);
  // ⭐ U23 · "select all N matching" stores the FILTER — its canonical key — and only when the list read arrived.
  // ⚠️ `identity` is the filter AS THE ADDRESS WROTE IT (a preset's name, never the instants it resolves to — those move
  // every minute), and decides "the filter changed"; `key` is what a run posts (review F6).
  const matching = listed !== null
    ? { key: contactFilterAudienceKey(listed.filter), identity: contactFilterIdentity(listed.filter, sp), total: listed.result.total }
    : null;
  const selectable = !failed && !emptyBook;
  // ⛔ D19: the gate is not even asked for a viewer who may not see its answer.
  const reach = reads ? await Promise.all(rows.map(reachOf)) : [];
  const lists = await Promise.all(rows.map(async (c) => (await db.contactListMember.listMemberships(c.id)).length));
  const searching = listed !== null && listed.filter.q !== null;
  const narrowed = listed !== null && listed.narrowed;
  // ⭐ ONE href builder (decision C9): it carries every filter, never `page` unless asked, never `edit`.
  const linkSp = contactsLinkSp(sp);
  const baseHref = contactsHref(sp);
  const clearSearchHref = contactsHref(sp, { q: null });
  const clearFiltersHref = contactsClearFiltersHref(sp);
  const refusedCopy = refused?.refusal === "role" ? CONTACTS_FILTER_NOT_FOR_ROLE : CONTACTS_FILTER_UNREADABLE;
  // ⭐ U21 · built for EVERY state (a refused filter, a failed read), from the address — the options only when the
  // read arrived. Drawn below on `!emptyBook` alone.
  const rail = contactRail({
    sp,
    reads,
    lists: view?.lists ?? null,
    tags: view?.tags ?? null,
    counted: listed !== null ? { match: listed.result.total, book: listed.summary.total } : null,
    // A failed read draws no "Showing contacts:" line and no table — so no Clear filters; the rail draws the one.
    clearable: failed,
  });
  const s = summary;

  return (
    <>
      {/* The gloss is COPIED, never invented (§5.13): "Anwani" is the shipped Swahili beside the exact
          English word "Contacts" — `src/app/admin/invites/[id]/page.tsx:88`.
          ⭐ U22 · "Add contact" lives in the head, DISABLED with its reason for a role that cannot act — never hidden
          (`useActDisabledReason`). It carries the page's link params, so its duplicate link keeps the filters. */}
      <AdminPageHead title="Contacts" sw="Anwani" actions={<AddContactButton hrefParams={linkSp} editOpen={editLoad !== null} />} />

      <AdminBody>
        {/* ⭐ THE WHOLE BOOK, never the filtered view.
            🔴 D19 / A1.1 — THE CONSENT SPLIT IS A READER'S (U23 review F1, 2026-10-02). A1.1 kept whole-book counts for
            every role ("a count over the book is not a per-number answer"), and U22's add and U23's one-row writes broke
            that premise: tick ONE row, record a withdrawal, and whether "Consent given" fell, "No consent" rose or nothing
            moved says what that row was — and until U33 only a player writes GIVEN. A viewer who may not read a number
            gets two whole-book facts, in two tiles that hold the four-tile band's rows (`1-lg2`), so the route's one
            skeleton still holds.
            🔴 OD54 · AND THE STOP COUNT IS A READER'S TOO. Until the importer goes live a stop is a player's own opt-out or
            an officer's: tick ONE row, suppress it, and whether "Suppressed" rose says whether it was already stopped. So
            the masked band's second fact is the contacts ADDED IN THE LAST 7 DAYS — counted by the loader through the ONE
            resolver, over the whole book, at its one clock — which moves the same for any number an officer adds. */}
        {reads ? (
          <div data-block="contacts-kpis"><KpiGrid>
            <AdminKpi label="In the book" value={failed ? "" : s!.total.toLocaleString()} unavailable={failed} />
            <AdminKpi label="Consent given" value={failed ? "" : s!.given.toLocaleString()} unavailable={failed} tone={!failed && s!.given > 0 ? "success" : undefined} />
            <AdminKpi
              label="No consent"
              value={failed ? "" : (s!.unknown + s!.withdrawn).toLocaleString()}
              unavailable={failed}
              delta={failed || s!.withdrawn === 0 ? undefined : `${s!.withdrawn.toLocaleString()} withdrawn`}
            />
            <AdminKpi label="Suppressed" value={failed ? "" : s!.suppressed.toLocaleString()} unavailable={failed} />
          </KpiGrid></div>
        ) : (
          <div data-block="contacts-kpis" data-kpis-masked><KpiGrid cols="1-lg2">
            <AdminKpi label="In the book" value={failed ? "" : s!.total.toLocaleString()} unavailable={failed} />
            <AdminKpi label={CONTACTS_KPI_RECENT} value={failed ? "" : recent!.toLocaleString()} unavailable={failed} />
          </KpiGrid></div>
        )}

        <div data-block="contacts-card"><AdminCard padding="p-0">
          {/* ⭐ U23 · THE SELECTION wraps the bar and the table, so the row boxes and the bar read one state — and it keeps its
              place in the tree across the page's own soft navigations, so ticks survive paging. */}
          <ContactsSelectionProvider pageRows={pageRows} matching={matching} maxTicks={MAX_AUDIENCE_IDS}>
          {/* ⛔ THE ERROR STANDS OUTSIDE THE TABLE. Inside it, the box scrolled with an 8-column table and its
              sentence was cut off at 360 (measured 2026-10-01): a failure nobody can read is not a stated failure. */}
          {failed && <div className="p-4"><AdminLoadError what="the contact book" /></div>}
          {/* ⭐ U21 · the search strip and the rail are gated on `!emptyBook` ALONE — a whole-book fact. A failed read is
              not an empty book, so the box keeps the officer's query and the rail keeps the filter (§5.15). */}
          {!emptyBook && (
            <div className="border-b border-border-subtle p-3">
              <SearchBox mode="url" placeholder={CONTACTS_SEARCH_PLACEHOLDER} ariaLabel="Search contacts by name or full number" />
            </div>
          )}
          {/* ⛔ NEVER the match count: a filter that matches nothing must still show the filter, or the one control that
              could undo it is gone with the rows (`test:contacts-page` 14). */}
          {!emptyBook && <ContactFilters rail={rail} />}
          {/* ⭐ U24 · WHAT THE LIST IS NARROWED TO, IN WORDS (`describeAudience` — the one describer U38 reuses). Shown
              only when something besides the search box narrows it; the box already shows its own text. The pieces
              are spaced by the flex gap, never by a JSX space a compiler may drop. */}
          {narrowed && listed && (
            <div data-block="contacts-filtered" className="flex flex-wrap items-center gap-x-2 border-b border-border-subtle px-3 py-1 text-body-sm text-text-secondary">
              <span className="text-text-tertiary">{CONTACTS_FILTERED_LEAD}</span>
              <span className="min-w-0 break-words text-text-primary">{listed.described.join(" · ")}</span>
              <a href={clearFiltersHref} className="inline-flex items-center min-h-[var(--tap-min)] text-royal-300 hover:underline">Clear filters</a>
            </div>
          )}
          {/* ⭐ U23 · THE BAR — on any read book, the refused state included (ticked rows outlive a refused filter). Its six
              actions are disabled WITH the act gate's reason for a role that cannot act, never hidden. */}
          {selectable && <ContactsBulkBar lists={(view?.lists ?? []).map((l) => ({ id: l.id, name: l.name }))} />}
          {!failed && <ScrollX label="Contacts" className="max-h-[calc(100vh-280px)] overflow-y-auto">
            <table className="admin-tbl">
              <thead className="sticky top-0 z-10">
                <tr>
                  {/* U23 · the select column: the page's tri-state box, and in each row the row's box and its "edit" link. */}
                  <th className="text-left">{pageRows.length > 0 && <ContactPageSelect />}</th>
                  <SortTh field="name" label="Name" current={sort} dir={dir} sp={linkSp} baseHref="/admin/contacts" />
                  <th className="text-left">Number</th>
                  {/* ⚠️ "by prefix": the column SORTS by the number's prefix (`ndc`), the one order a brand label
                      cannot give stably across pages (§9 U20). */}
                  <SortTh field="operator" label="Operator (by prefix)" current={sort} dir={dir} sp={linkSp} baseHref="/admin/contacts" />
                  {reads && <th className="text-left">Consent</th>}
                  {reads && <th className="text-left">Reachable</th>}
                  <th className="text-left">Lists · Tags</th>
                  {reads && <th className="text-left">Source</th>}
                  <SortTh field="added" label="Added" current={sort} dir={dir} sp={linkSp} baseHref="/admin/contacts" />
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {refused ? (
                  // ⛔ U24 · A FILTER THAT CANNOT BE READ SHOWS NO ROWS — never the whole book under a filter nobody got.
                  <AdminTableEmpty
                    colSpan={cols}
                    title={refusedCopy.title}
                    body={refusedCopy.body(refused.param, refused.reason)}
                    action={<a href={clearFiltersHref} className="btn btn-ghost btn-sm">Clear filters</a>}
                  />
                ) : emptyBook ? (
                  <AdminTableEmpty colSpan={cols} title={CONTACTS_EMPTY.title} body={CONTACTS_EMPTY.body} />
                ) : rows.length === 0 ? (
                  <AdminTableEmpty
                    colSpan={cols}
                    title={searching ? CONTACTS_NO_MATCH.title : CONTACTS_NO_MATCH_FILTERED.title}
                    body={searching ? CONTACTS_NO_MATCH.body : CONTACTS_NO_MATCH_FILTERED.body}
                    action={narrowed || searching ? (
                      <span className="flex flex-wrap justify-center gap-2">
                        {narrowed && <a href={clearFiltersHref} className="btn btn-ghost btn-sm">Clear filters</a>}
                        {searching && <a href={clearSearchHref} className="btn btn-ghost btn-sm">Clear search</a>}
                      </span>
                    ) : undefined}
                  />
                ) : (
                  rows.map((c, i) => {
                    const consent = CONSENT_LABEL[c.consentState];
                    const r = reach[i];
                    const shownTags = c.tags.slice(0, 2);
                    return (
                      <tr key={c.id} data-contact-row>
                        {/* ⭐ U23 · the row's controls: its box (the server's masked projection, never the row) and the way
                            into its dialog that U22 owed (§9): `?edit=<contact id>` through the ONE href builder, the
                            filters and the sort carried, `page` dropped. ⛔ The id travels, never the number (D19, §5.14).
                            Not act-gated: a view-only officer may open the dialog, whose Save is gated (U22). */}
                        <td>
                          <div className="flex items-center gap-1">
                            <ContactRowSelect row={pageRows[i]} />
                            <Link
                              href={contactsHref(sp, { edit: c.id })}
                              replace
                              scroll={false}
                              className="row-link whitespace-nowrap font-mono text-micro text-royal-300 hover:underline"
                              aria-label={CONTACTS_BULK.editRow(pageRows[i].name ?? pageRows[i].masked)}
                              data-edit-contact={c.id}
                            >
                              {CONTACTS_BULK.editLink}
                            </Link>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">
                          {c.displayName
                            ? <span className="text-text-primary">{c.displayName}</span>
                            : <span className="text-text-tertiary">No name</span>}
                          {reads && c.userId && <Chip size="sm" variant="info" className="ml-2">Player</Chip>}
                        </td>
                        <td className="font-mono whitespace-nowrap"><Sensitive field="contactPhone" subjectId={c.id} value={c.msisdn} copyable /></td>
                        {/* ⛔ U21 · THE ONE TABLE, NEVER THE STORED STRING: the rail filters on the prefix (`ndc`), so the
                            column must name the prefix's holder too — a stored "Tigo" under the Yas pill is two answers. */}
                        <td className="whitespace-nowrap">{operatorBrand(c.ndc) ?? "—"}</td>
                        {/* ⛔ ONE LINE: a two-word chip broke in two at 1280 ("AGE NOT / CONFIRMED", measured twice). The Chip
                            sets `white-space: normal` INLINE on purpose (long Swahili phrases elsewhere must wrap), so a
                            class on the chip or its cell cannot override it — the no-wrap span inside the label does. */}
                        {/* 🔴 A1.1 · until U33 a Given/Withdrawn consent can only be a player's (or an erasure's), so the
                            per-row chip is a membership oracle for a masked viewer — shown only to a reader. */}
                        {reads && <td><Chip size="sm" variant={consent.variant}><span className="whitespace-nowrap">{consent.label}</span></Chip></td>}
                        {/* 🔴 OD54 · the Reachable chip can say "Suppressed" — a stop, which until the importer goes live is a
                            player's own opt-out or an officer's — so it is a reader's too, and no other cell names a stop. */}
                        {reads && <td><Chip size="sm" variant={r.ok ? "success" : "neutral"}><span className="whitespace-nowrap">{r.label}</span></Chip></td>}
                        <td className="whitespace-nowrap">
                          {lists[i] > 0 && <span className="mr-2 text-body-sm text-text-tertiary">{lists[i]} {lists[i] === 1 ? "list" : "lists"}</span>}
                          {shownTags.map((t) => <Chip key={t} size="sm" variant="neutral" className="mr-1">{t}</Chip>)}
                          {c.tags.length > shownTags.length && <span className="text-body-sm text-text-tertiary">+{c.tags.length - shownTags.length}</span>}
                          {lists[i] === 0 && c.tags.length === 0 && <span className="text-text-tertiary">—</span>}
                        </td>
                        {reads && <td className="whitespace-nowrap">{SOURCE_LABEL[c.source]}</td>}
                        <td className="whitespace-nowrap">{formatDate(c.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </ScrollX>}
          </ContactsSelectionProvider>
        </AdminCard></div>

        {result !== null && result.total > PER_PAGE && <AdminPagination total={result.total} page={page} baseHref={baseHref} />}
      </AdminBody>

      {/* ⭐ U22 · THE DIALOG OVER THE LIST. Keyed by the row and its stamp, so the reload after a refused (stale) save
          remounts it with the latest values. ⛔ The number and the email render HERE, through <Sensitive> — the dialog
          is handed slots, never the values — and its close link is the ONE href builder without `edit`. */}
      {editLoad !== null && (
        <ContactEditDialog
          key={editLoad.kind === "ready" ? `${editLoad.view.id}:${editLoad.view.updatedAt}` : `edit-${editLoad.kind}`}
          state={editLoad.kind === "ready"
            ? { kind: "ready", contact: editLoad.view }
            : editLoad.kind === "missing" ? { kind: "missing", sentence: editLoad.sentence } : { kind: "failed" }}
          numberSlot={editing ? <Sensitive field="contactPhone" subjectId={editing.id} value={editing.msisdn} copyable /> : null}
          emailSlot={editing ? <Sensitive field="contactEmail" subjectId={editing.id} value={editing.email} /> : null}
          closeHref={contactsHref(sp)}
        />
      )}
    </>
  );
}
