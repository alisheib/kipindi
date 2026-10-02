import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkBar, SkChip, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

/**
 * The ghost for /admin/contacts (U20 — rebuilt for the list; U17's ghost stood in for the empty state).
 *
 * ⭐ THE TOP OF THE PAGE IS EQUAL BY CONSTRUCTION, the rows are not, and that is the honest split. The
 * KPI band is `SkKpiRow` at the console's default ladder — the same grid and the same 110px tile floor
 * `KpiGrid`/`AdminKpi` render (the measured reasoning lives in `admin-skeletons.tsx`). The card opens with
 * the search strip at the real strip's padding and the search field's height. Below that, a page of rows
 * has as many lines as the book has contacts, which no ghost can know; what must not move when the real
 * page swaps in is everything ABOVE the first row — and the U20 drive measures exactly that (the KPI
 * band's box and the card's top edge, at 1280 and 360).
 * ⭐ U21 · THE RAIL'S GHOST sits under the search strip, at the real strip's padding and the dense pill's 32px. It
 * draws the MASKED viewer's rail — Suppressed, Operator and a row of tags, the rail GROWTH sees — because a ghost
 * cannot know the role or the data: a reader's rail adds Consent and Source, and the List and Tag rows exist only
 * when the book has lists or tags. So the rail's height is NOT equal by construction, and the U20/U21 drive records
 * the difference at both widths rather than claiming it away. Nothing above the card's top edge depends on it.
 * ⛔ `data-skeleton` stamps are the drive's handles — never match on class strings.
 * ⛔ Never interpolate a Tailwind height and never a numeric `h-`/`w-` key here: this repo's spacing
 * scale is overridden (`w-16` is 96px, not 64).
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="Contacts" sw="Anwani" />
      <SkBody>
        <div data-skeleton="contacts-kpis">
          <SkKpiRow count={4} />
        </div>
        <div data-skeleton="contacts-card">
          <SkTableCard
            title={false}
            cols={8}
            rows={10}
            sortable
            minWidth={980}
            bodyMaxH="max-h-[calc(100vh-280px)]"
            beforeBody={(
              <>
                <div className="border-b border-border-subtle p-3">
                  <SkBar className="h-[40px] w-full rounded-lg" />
                </div>
                <div data-skeleton="contacts-rail" className="flex flex-col gap-2 border-b border-border-subtle p-3">
                  <div className="flex items-center gap-1 flex-wrap gap-y-1.5">
                    <SkBar className="h-[12px] w-[72px]" />
                    <SkChip className="h-[32px] w-[44px]" />
                    <SkChip className="h-[32px] w-[88px]" />
                    <SkChip className="h-[32px] w-[112px]" />
                  </div>
                  <div className="flex items-center gap-1 flex-wrap gap-y-1.5">
                    <SkBar className="h-[12px] w-[64px]" />
                    <SkChip className="h-[32px] w-[44px]" />
                    <SkChip className="h-[32px] w-[56px]" />
                    <SkChip className="h-[32px] w-[64px]" />
                    <SkChip className="h-[32px] w-[48px]" />
                    <SkChip className="h-[32px] w-[72px]" />
                    <SkChip className="h-[32px] w-[40px]" />
                  </div>
                  <div className="flex items-center gap-1 flex-wrap gap-y-1.5">
                    <SkBar className="h-[12px] w-[32px]" />
                    <SkChip className="h-[32px] w-[44px]" />
                    <SkChip className="h-[32px] w-[56px]" />
                    <SkChip className="h-[32px] w-[56px]" />
                    <SkChip className="h-[32px] w-[80px]" />
                  </div>
                  <SkBar className="h-[15px] w-[96px]" />
                </div>
              </>
            )}
          />
        </div>
      </SkBody>
    </>
  );
}
