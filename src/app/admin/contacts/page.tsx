/**
 * /admin/contacts — the marketing address book (U17 doors, U20 the list, U21 the filter rail).
 *
 * WHAT THIS PAGE IS TODAY, so nobody reads more into it: the book, server-paged, searchable by a WHOLE
 * number or by name, sortable by name, prefix and date, filterable from one rail — and nothing that changes
 * it. There is no way to add, import, tag, list or remove a contact yet (U22 the form, U23 bulk, U25–U28
 * import), and this page promises none of it.
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
 * number belongs to a player.
 * ⭐ U24 · every read goes through the ONE audience resolver (`contacts-loader.ts` → `contactAudience`). A filter
 * in force is said in words above the table ("Showing contacts: …"), and every link is built by ONE href builder
 * (`contactsHref`) that carries them. ⛔ A filter that cannot be read is REFUSED — no rows, the parameter named, a
 * Clear action — never silently dropped into a wider list.
 * ⭐ U21 · THE RAIL (`contact-filters.tsx`, built by `contacts-rail.ts`) draws what the address applies and writes
 * every pill through that builder. It is gated on `!emptyBook` ALONE — a whole-book fact, never the match count —
 * so a filter that matches nothing, a refused filter and a failed read all keep it on screen (§5.15). It is
 * role-shaped (A1.1): a masked viewer gets no Consent or Source axis. ⛔ The Operator COLUMN reads the one numbering
 * table (`operatorBrand(c.ndc)`) and never the stored `operator` string, which could say "Tigo" under the Yas pill.
 *
 * Growth domain (`roles.ts`), the same people who run affiliate, bonuses and invites.
 */
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
import { formatDate } from "@/lib/utils";
import {
  CONTACTS_EMPTY, CONTACTS_NO_MATCH, CONTACTS_NO_MATCH_FILTERED, CONTACTS_SEARCH_PLACEHOLDER, CONTACTS_FILTERED_LEAD,
  CONTACTS_FILTER_UNREADABLE, CONTACTS_FILTER_NOT_FOR_ROLE, CONSENT_LABEL, SOURCE_LABEL,
} from "./contacts-copy";
import { operatorBrand, contactsHref, contactsClearFiltersHref, contactsLinkSp } from "./contacts-query";
import { loadContacts, viewerReadsContacts } from "./contacts-loader";
import type { ContactsParams, ContactsView } from "./contacts-loader";
import { contactRail } from "./contacts-rail";
import { ContactFilters } from "./contact-filters";

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
 *  standing, and this column is read by GROWTH. Typed as a full Record so a new gate reason is a
 *  compile error here, not a silent blank. */
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
  // source or player signal.
  const cols = reads ? 8 : 5;

  const failed = view === null;
  const emptyBook = !failed && summary!.total === 0;
  const rows = result?.rows ?? [];
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
          English word "Contacts" — `src/app/admin/invites/[id]/page.tsx:88`. */}
      <AdminPageHead title="Contacts" sw="Anwani" />

      <AdminBody>
        {/* ⭐ THE WHOLE BOOK, never the filtered view. */}
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

        <div data-block="contacts-card"><AdminCard padding="p-0">
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
          {!failed && <ScrollX label="Contacts" className="max-h-[calc(100vh-280px)] overflow-y-auto">
            <table className="admin-tbl">
              <thead className="sticky top-0 z-10">
                <tr>
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
        </AdminCard></div>

        {result !== null && result.total > PER_PAGE && <AdminPagination total={result.total} page={page} baseHref={baseHref} />}
      </AdminBody>
    </>
  );
}
