/**
 * 🔴 THE PANEL AN OFFICER GETS WHEN THE ADDRESS NAMES AN ACCOUNT THE DESK DOES NOT HAVE — and until
 * 2026-09-21 there was none at all.
 *
 * MEASURED ON A SERVED BUILD, signed in as an owner: `/admin/desk/<an id that does not exist>` rendered the
 * whole admin shell — the nav, the breadcrumbs reading "Admin / Desk / Account", the footer — with a
 * COMPLETELY EMPTY main. No heading, no sentence, no way back. The page does call `notFound()`; what was
 * missing was a boundary near enough to catch it.
 *
 * ⛔ WHY THE ROOT `not-found.tsx` COULD NOT DO IT. This route is `force-dynamic` and has its own
 * `loading.tsx`, so it STREAMS: by the time the record is read the shell has already been flushed, and Next
 * renders the not-found boundary INTO the stream rather than replacing the document. With no boundary under
 * this segment there was nothing to render into it — so the admin shell stayed and its contents never came.
 * ⚠️ AND THE STATUS STAYS 200 FOR THE SAME REASON, which cannot be fixed from here: the response was
 * committed before the record was read. Written down rather than implied. What an officer reads is the
 * panel, not the address bar, and the panel is now honest.
 *
 * ⛔ IT CREATES NO ORACLE, checked against the page's own law rather than assumed (rulings 259, 300, 380,
 * 399). A viewer outside the audience NEVER reaches `notFound()`: the gated reader answers `null` for them
 * whether or not the record exists, and the page returns before the record check. Only an ADMIN sees this.
 *
 * ⛔ IT OWNS NO SENTENCE (388/453). Every word arrives from `CONSOLE_ACCOUNT_MISSING` in the gate module,
 * where every other sentence this section can paint is scanned for neutrality.
 */
import { AdminBody } from "@/components/admin/admin-body";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { Callout } from "@/components/ui/callout";
import { FormColumn } from "@/components/ui/form-column";
import { CONSOLE_ACCOUNT_MISSING } from "@/lib/server/house-console-read";
import { CONSOLE_ROUTE } from "@/lib/house-bot/console-routes";
import { WayOutLink } from "../way-out-link";

/** ⛔ A static neutral title (ruling 402) — there is no record here, so there is nothing else it could say. */
export const metadata = { title: "Admin · Desk" };

export default function DeskAccountNotFound() {
  return (
    <AdminBody>
      <AdminPageHead title={CONSOLE_ACCOUNT_MISSING.title} />
      <AdminCard>
        <FormColumn measure="form">
          {/* ⛔ `warning`, never `danger`: nothing failed and nothing is at risk — an address simply names
              something that is not there, and spending the danger treatment on it is how the danger
              treatment stops meaning anything on the screens that carry real money. */}
          <Callout tone="warning" size="md" surface="panel" role="status">
            {CONSOLE_ACCOUNT_MISSING.body}
          </Callout>
          {/* ⭐ THE WAY BACK IS THE SECTION'S OWN CONTROL, not a hand-rolled link: one look for one control
              across the wizard, the account page and this one. A dead end with no way out is the defect this
              file exists to close, so the link is the point of it, not a decoration. */}
          <div className="mt-4">
            <WayOutLink href={CONSOLE_ROUTE}>{CONSOLE_ACCOUNT_MISSING.wayOut}</WayOutLink>
          </div>
        </FormColumn>
      </AdminCard>
    </AdminBody>
  );
}
