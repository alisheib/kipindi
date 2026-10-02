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
 * draws the MASKED viewer's rail — Operator and a row of tags, the rail GROWTH sees (OD54 took its Suppressed axis,
 * a reader's now) — because a ghost cannot know the role or the data: a reader's rail adds Consent, Suppressed and
 * Source, and the List and Tag rows exist only when the book has lists or tags. So the rail's height is NOT equal by
 * construction, and the U20/U21 drive records the difference at both widths rather than claiming it away. Nothing
 * above the card's top edge depends on it.
 * ⭐ OD54 · THE KPI GHOST STAYS FOUR TILES. A masked viewer's band is two tiles in the `1-lg2` rung, which takes exactly
 * the four-tile band's rows at every width, so one ghost stands for both roles.
 * ⭐ U22 · THE HEAD RESERVES "ADD CONTACT". The real page puts a `size="sm"` button in `AdminPageHead`'s actions — the
 * kit's 40px rung (`--h-control-sm`) — so the ghost holds a box of that height and about that width, or the header
 * would grow (or wrap at 360) the moment the page swapped in. The drive measures the two boxes at both widths.
 * ⭐ U34a · AND "EXPORT CSV" BEFORE IT. On a book with matching rows the real head puts the export link — the same 40px
 * rung — before "Add contact", and at 360 the two no longer fit beside the title, so they wrap below it TOGETHER. The
 * ghost therefore holds a second box of that height and about the masked label's width (GROWTH's, the measured view), so
 * it wraps at 360 exactly as the real head does and the card's top edge does not move. ⚠️ NOT EQUAL IN EVERY STATE, said
 * rather than hidden: an empty book, a filter that matches nothing and a failed read render NO export control, so at 360
 * their head is one row shorter than this ghost. A ghost cannot know the book is empty; the populated book is the state
 * the drive measures at delta 0, and it RECORDS the empty book's difference.
 * ⭐ U23 · THE BULK BAR'S GHOST sits under the rail's, as the bar sits above the table: the count line, the six action
 * buttons on the kit's 40px rung, and the one-line consent note, at the real bar's padding. The table gains the select
 * column (nine ghost columns: the reader's eight and the box). Like the rail, the bar's height is NOT equal by
 * construction — its buttons wrap by label width, and the note wraps at 360 — so the drive RECORDS the difference at both
 * widths; nothing above the card's top edge depends on it.
 * ⛔ `data-skeleton` stamps are the drive's handles — never match on class strings.
 * ⛔ Never interpolate a Tailwind height and never a numeric `h-`/`w-` key here: this repo's spacing
 * scale is overridden (`w-16` is 96px, not 64).
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Contacts"
        sw="Anwani"
        actions={(
          <>
            <div data-skeleton="contacts-export"><SkChip className="h-[40px] w-[160px]" /></div>
            <div data-skeleton="contacts-add"><SkChip className="h-[40px] w-[124px]" /></div>
          </>
        )}
      />
      <SkBody>
        <div data-skeleton="contacts-kpis">
          <SkKpiRow count={4} />
        </div>
        <div data-skeleton="contacts-card">
          <SkTableCard
            title={false}
            cols={9}
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
                <div data-skeleton="contacts-bulk-bar" className="flex flex-col gap-2 border-b border-border-subtle p-3">
                  <SkBar className="h-[15px] w-[240px] max-w-full" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <SkChip className="h-[40px] w-[56px]" />
                    <SkChip className="h-[40px] w-[72px]" />
                    <SkChip className="h-[40px] w-[104px]" />
                    <SkChip className="h-[40px] w-[176px]" />
                    <SkChip className="h-[40px] w-[96px]" />
                    <SkChip className="h-[40px] w-[88px]" />
                  </div>
                  <SkBar className="h-[15px] w-full" />
                </div>
              </>
            )}
          />
        </div>
      </SkBody>
    </>
  );
}
