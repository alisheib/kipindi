import { AdminPageHead } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { SkCard, SkChip, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

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
 * ⛔ EVERY GHOST STATES THE PAGE'S REAL FACTS: the head's own action row, one strip line with no title and no gloss,
 * four tiles on the page's own ladder, the rail at 44px (a missing rail ghost is a 64px jump on the swap), and the
 * roster table at SIX columns with the page's own 16px cell padding (`p-3` on every cell, which is 16px on this
 * repo's overridden spacing scale — see the call site below, where that number is stated once and measured by
 * `test:house-bot-console` 1.417).
 * ⛔ NO PAGER GHOST: the roster is bounded by the configured maximum (1–20), so it renders none.
 */
export default function AdminDeskLoading() {
  return (
    <>
      {/* ⛔ THE HEAD'S ACTION ROW IS GHOSTED AT THE CONTROL'S OWN HEIGHT, AND THE FIRST VERSION HAD NO `actions` AT
          ALL. The page's head ALWAYS renders a 44px disabled primary and its reason (432(a), 432(j)), and
          `AdminPageHead` is `flex items-end justify-between gap-4 flex-wrap`: at 360 the real actions wrap onto their
          own row, so the real head is about 105px taller than a head-only ghost and the whole page drops on the swap
          (read off desk-default-360.json — the button alone is t=239 h=44, ending at y=283). `/admin/house`'s loader
          states the rule in its own words and obeys it: "a ghost the wrong height is a layout jump". Ruling 417's own
          read was taken at 1280, where the title block is taller than the action row and hides it entirely. */}
      <AdminPageHead title="Desk" sw="Dawati" actions={<SkChip className="h-[44px] w-48" />} />
      <AdminBody>
        <SkCard lines={1} title={false} sw={false} />
        <SkKpiRow count={4} />
        <div className="h-[44px] w-40 rounded-md bg-bg-overlay kp-shimmer-track" aria-hidden />
        {/* ⛔ `cellPy={16}`, NOT the default 12, and it was MEASURED not guessed: the page overrides every cell to
            `p-3`, which is 16px on this repo's own spacing scale, so a 12px ghost is 8px short on EVERY row — the
            kit's own note names eight admin pages that pay for exactly this. First reading of the swap at 1280: the
            ghost card was 279px against the page's 361px; with 16 and the row count matching the fixture it closes to
            within a few px, and the residual is the account cell's second line, which no ghost can know about. */}
        <SkTableCard cols={6} rows={5} minWidth={280} title={false} sw={false} cellPy={16} />
      </AdminBody>
    </>
  );
}
