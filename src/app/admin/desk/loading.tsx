import { AdminPageHead } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { SkCard, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

/**
 * What is coming, card for card and in the page's own order (C7-SPEC rulings 313, 417): the head, the master-switch
 * strip, the four-tile band, the section rail, then the roster table.
 *
 * ⛔ IT CARRIES THE PAGE'S REAL TITLE, AND THAT IS ONLY SAFE BECAUSE THE TITLE IS NEUTRAL (rulings 313, 453). A
 * `loading.tsx` is a Suspense fallback: it has no session and no viewer, so it cannot repeat the page's audience
 * check, and whatever it renders is rendered for whoever asked. The console's own convention is that a loader carries
 * its real title (measured 2026-09-18: 52 admin loaders, 51 render `AdminPageHead`, `totp-verify` the one exception),
 * and after the rename that title names nothing. ⛔ The detail route's loader is the exception — its real title is a
 * gated value — and it carries no title string at all.
 *
 * ⛔ EVERY GHOST STATES THE PAGE'S REAL FACTS: one strip line with no title and no gloss, four tiles on the page's own
 * ladder, the rail at 44px (a missing rail ghost is a 64px jump on the swap), and the roster table at seven columns
 * with `.admin-tbl`'s own 12px cell padding — this page overrides no cell padding, so 12 is the honest figure.
 * ⛔ NO PAGER GHOST: the roster is bounded by the configured maximum (1–20), so it renders none.
 */
export default function AdminDeskLoading() {
  return (
    <>
      <AdminPageHead title="Desk" sw="Dawati" />
      <AdminBody>
        <SkCard lines={1} title={false} sw={false} />
        <SkKpiRow count={4} />
        <div className="h-[44px] w-40 rounded-md bg-bg-overlay kp-shimmer-track" aria-hidden />
        <SkTableCard cols={7} rows={5} minWidth={280} title={false} sw={false} cellPy={12} />
      </AdminBody>
    </>
  );
}
