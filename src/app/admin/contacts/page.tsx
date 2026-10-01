/**
 * /admin/contacts — the marketing address book (U17 doors, U20 the list).
 *
 * WHAT THIS PAGE IS TODAY, so nobody reads more into it: the book, server-paged, searchable by a WHOLE
 * number or by name, sortable by name, prefix and date — and nothing that changes it. There is no way to
 * add, import, tag, list or remove a contact yet (U22 the form, U23 bulk, U25–U28 import, U21 the filter
 * rail), and this page promises none of it.
 *
 * ⭐ SERVER-PAGED, because the book is built for 150,000 people (§3c): the store returns one page and the
 * count of the whole match, never the book. The KPI band is the WHOLE book (`summary()`), never the
 * filtered view — a search must not make "Consent given" look like it fell.
 * ⛔ Every number renders through `<Sensitive field="contactPhone">` (U19): GROWTH sees `+255••••01` and no
 * control; a role that may reveal gets the eye and Copy, each one a `pii.revealed` row.
 * ⭐ "Reachable" is the SEND GATE's own answer (`mayReceiveMarketingSms`), asked per visible row — not a
 * second definition. It names only the reasons an operator can act on; a responsible-gambling, age or
 * account refusal reads "Not reachable" and never says which (the gate's detail is not this role's to read).
 * 🔴 D19 · Reachable, Source and the Player chip render ONLY for a viewer who may read a number
 * (`viewerReads`, decided in `contacts-loader.ts`): each one, row by row, tells a masked role whether a
 * number belongs to a player.
 *
 * Growth domain (`roles.ts`), the same people who run affiliate, bonuses and invites.
 */
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { AdminPagination, PER_PAGE, buildBaseHref } from "@/components/admin/admin-pagination";
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
import { CONTACTS_EMPTY, CONTACTS_NO_MATCH, CONTACTS_SEARCH_PLACEHOLDER } from "./contacts-copy";
import { operatorBrand } from "./contacts-query";
import { loadContacts } from "./contacts-loader";
import type { ContactsParams, ContactsView } from "./contacts-loader";

type ContactsSP = ContactsParams;

/** W25 BELT 2 — this page's own gate, decided on the viewer's STORED row. The section layout is skipped
 *  by a flight request whose router state names it, so the gate the page cannot lose is the one it
 *  carries itself. ⛔ One `return`, one self-closing child: `admin-section-gate.test.mjs` §0b′ plants
 *  four inert spellings (a comment, a string, a ternary, a partial wrap) and every one must be refused. */
export default async function AdminContactsPage(props: { searchParams: Promise<ContactsSP> }) {
  return <AdminPageGate title="Contacts"><AdminContactsContent searchParams={props.searchParams} /></AdminPageGate>;
}

const CONSENT: Record<StoredMarketingContact["consentState"], { label: string; variant: "success" | "neutral" | "warning" }> = {
  GIVEN: { label: "Given", variant: "success" },
  UNKNOWN: { label: "Not recorded", variant: "neutral" },
  WITHDRAWN: { label: "Withdrawn", variant: "warning" },
};

const SOURCE: Record<StoredMarketingContact["source"], string> = {
  IMPORT: "Import",
  REGISTRATION: "Sign-up",
  OPERATOR: "Added by staff",
  AGENT: "Agent",
};

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
  const result = view?.result ?? null;
  const page = view?.page ?? 1;
  const sort = view?.sort ?? "added";
  const dir = view?.dir ?? "desc";
  const reads = view?.viewerReads ?? false;
  const cols = reads ? 8 : 6;

  const failed = summary === null || result === null;
  const emptyBook = !failed && summary!.total === 0;
  const rows = result?.rows ?? [];
  // ⛔ D19: the gate is not even asked for a viewer who may not see its answer.
  const reach = reads ? await Promise.all(rows.map(reachOf)) : [];
  const lists = await Promise.all(rows.map(async (c) => (await db.contactListMember.listMemberships(c.id)).length));
  const searching = Boolean(sp.q && sp.q.trim());
  const baseHref = buildBaseHref("/admin/contacts", { q: sp.q, sort: sp.sort, dir: sp.dir });
  const clearHref = buildBaseHref("/admin/contacts", { sort: sp.sort, dir: sp.dir });
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
          {!failed && !emptyBook && (
            <div className="border-b border-border-subtle p-3">
              <SearchBox mode="url" placeholder={CONTACTS_SEARCH_PLACEHOLDER} ariaLabel="Search contacts by name or full number" />
            </div>
          )}
          {!failed && <ScrollX label="Contacts" className="max-h-[calc(100vh-280px)] overflow-y-auto">
            <table className="admin-tbl">
              <thead className="sticky top-0 z-10">
                <tr>
                  <SortTh field="name" label="Name" current={sort} dir={dir} sp={sp} baseHref="/admin/contacts" />
                  <th className="text-left">Number</th>
                  {/* ⚠️ "by prefix": the column SORTS by the number's prefix (`ndc`), the one order a brand label
                      cannot give stably across pages (§9 U20). */}
                  <SortTh field="operator" label="Operator (by prefix)" current={sort} dir={dir} sp={sp} baseHref="/admin/contacts" />
                  <th className="text-left">Consent</th>
                  {reads && <th className="text-left">Reachable</th>}
                  <th className="text-left">Lists · Tags</th>
                  {reads && <th className="text-left">Source</th>}
                  <SortTh field="added" label="Added" current={sort} dir={dir} sp={sp} baseHref="/admin/contacts" />
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {emptyBook ? (
                  <AdminTableEmpty colSpan={cols} title={CONTACTS_EMPTY.title} body={CONTACTS_EMPTY.body} />
                ) : rows.length === 0 ? (
                  <AdminTableEmpty
                    colSpan={cols}
                    title={CONTACTS_NO_MATCH.title}
                    body={CONTACTS_NO_MATCH.body}
                    action={searching ? <a href={clearHref} className="btn btn-ghost btn-sm">Clear search</a> : undefined}
                  />
                ) : (
                  rows.map((c, i) => {
                    const consent = CONSENT[c.consentState];
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
                        <td className="whitespace-nowrap">{c.operator ?? operatorBrand(c.ndc) ?? "—"}</td>
                        {/* ⛔ ONE LINE: a two-word chip broke in two at 1280 ("AGE NOT / CONFIRMED", measured twice). The Chip
                            sets `white-space: normal` INLINE on purpose (long Swahili phrases elsewhere must wrap), so a
                            class on the chip or its cell cannot override it — the no-wrap span inside the label does. */}
                        <td><Chip size="sm" variant={consent.variant}><span className="whitespace-nowrap">{consent.label}</span></Chip></td>
                        {reads && <td><Chip size="sm" variant={r.ok ? "success" : "neutral"}><span className="whitespace-nowrap">{r.label}</span></Chip></td>}
                        <td className="whitespace-nowrap">
                          {lists[i] > 0 && <span className="mr-2 text-caption text-text-tertiary">{lists[i]} {lists[i] === 1 ? "list" : "lists"}</span>}
                          {shownTags.map((t) => <Chip key={t} size="sm" variant="neutral" className="mr-1">{t}</Chip>)}
                          {c.tags.length > shownTags.length && <span className="text-caption text-text-tertiary">+{c.tags.length - shownTags.length}</span>}
                          {lists[i] === 0 && c.tags.length === 0 && <span className="text-text-tertiary">—</span>}
                        </td>
                        {reads && <td className="whitespace-nowrap">{SOURCE[c.source]}</td>}
                        <td className="whitespace-nowrap">{formatDate(c.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </ScrollX>}
        </AdminCard></div>

        {!failed && result!.total > PER_PAGE && <AdminPagination total={result!.total} page={page} baseHref={baseHref} />}
      </AdminBody>
    </>
  );
}
