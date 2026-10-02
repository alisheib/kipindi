import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkBar, SkChip, SkTableCard } from "@/components/admin/admin-skeletons";

/**
 * The ghost for /admin/campaigns (U36).
 *
 * ⭐ THE CARD'S TOP EDGE IS EQUAL BY CONSTRUCTION. The real page renders the same head (same title, same gloss, no
 * action while `CAMPAIGN_SCREENS.compose` is off) and then ONE card as the first thing in the body — no KPI band —
 * and so does this: the same `AdminPageHead`, then `SkBody` (the page's own `AdminBody`) with the card first. Nothing
 * above the card's top edge can move when the page swaps in, and the U36 drive measures exactly that at 1280 and 360.
 * ⚠️ U37 gives the head its "New campaign" action: a 40px button inside a head that is taller than it, so the head's
 * height holds — and U37's drive re-measures it.
 * ⭐ THE RAIL'S GHOST opens the card, at the real strip's padding and the dense pill's 32px. Its height is NOT equal
 * by construction — the real pills carry counts and wrap by label width at 360 — so the drive RECORDS the difference
 * at both widths rather than claiming it away. Nothing above the card's top edge depends on it.
 * The table: seven columns, sortable headers, a page of rows; no pager ghost, because the real pager appears only
 * past twenty campaigns.
 * ⛔ `data-skeleton` stamps are the drive's handles — never match on class strings.
 * ⛔ Never interpolate a Tailwind height and never a numeric scale key here: this repo's spacing scale is overridden.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="SMS campaigns" sw="Kampeni" />
      <SkBody>
        <div data-skeleton="campaigns-card">
          <SkTableCard
            title={false}
            cols={7}
            rows={10}
            sortable
            minWidth={900}
            beforeBody={(
              <div data-skeleton="campaigns-rail" className="flex items-center gap-1 flex-wrap gap-y-1.5 border-b border-border-subtle p-3">
                <SkBar className="h-[12px] w-[48px]" />
                <SkChip className="h-[32px] w-[64px]" />
                <SkChip className="h-[32px] w-[80px]" />
                <SkChip className="h-[32px] w-[88px]" />
                <SkChip className="h-[32px] w-[80px]" />
                <SkChip className="h-[32px] w-[92px]" />
              </div>
            )}
          />
        </div>
      </SkBody>
    </>
  );
}
