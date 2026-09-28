/**
 * /admin/contacts — the marketing address book (U17: the route exists and is reachable; D17).
 *
 * WHAT THIS PAGE IS TODAY, so nobody reads more into it: the five doors and an honest empty state.
 * There is no `MarketingContact` store until U18, so nothing can be listed, searched, filtered or
 * added here yet, and this page deliberately promises none of it. U20 brings the server-paged list
 * (nine columns, `SortTh`, `Pagination`, whole-book `AdminKpi` counts), U21 the filter rail, U22 the
 * add/edit modal, U25–U28 import. ⛔ Each of those replaces this body; when the list lands, the
 * `loading.tsx` ghost beside it must be re-measured against the new block, not inherited.
 *
 * Growth domain (`roles.ts`), the same people who run affiliate, bonuses and invites.
 */
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTACTS_EMPTY } from "./contacts-copy";

/** W25 BELT 2 — this page's own gate, decided on the viewer's STORED row. The section layout is skipped
 *  by a flight request whose router state names it, so the gate the page cannot lose is the one it
 *  carries itself. ⛔ One `return`, one self-closing child: `admin-section-gate.test.mjs` §0b′ plants
 *  four inert spellings (a comment, a string, a ternary, a partial wrap) and every one must be refused. */
export default async function AdminContactsPage() {
  return <AdminPageGate title="Contacts"><AdminContactsContent /></AdminPageGate>;
}

function AdminContactsContent() {
  return (
    <>
      {/* The gloss is COPIED, never invented (§5.13): "Anwani" is the shipped Swahili beside the exact
          English word "Contacts" — `src/app/admin/invites/[id]/page.tsx:88`. */}
      <AdminPageHead title="Contacts" sw="Anwani" />

      <AdminBody>
        {/* `fill` because this box sits under a FULL-WIDTH page head; the 360px centred default is for
            narrow columns and would float 300px+ away from the heading that names it (PV-03). */}
        <EmptyState
          kind="admin"
          fill
          title={CONTACTS_EMPTY.title}
          body={CONTACTS_EMPTY.body}
        />
      </AdminBody>
    </>
  );
}
