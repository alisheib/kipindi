import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkChip, SkCard, SkKpiRow, SkTableCard, SkTableRows } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Privacy · DSAR queue"
        sw="Faragha · Maombi ya data"
        /* ⛔ NOT 40px. The action is `<Chip size="md" variant={warning|neutral}>` and
           NEITHER variant is in chip.tsx's `isStatus` set, so it takes
           `sizeStyles.md.base` — height 21. The `h-7` ghost drew 40. */
        actions={<SkChip className="h-[21px] w-36" />}
      />
      <SkBody>
        {/* ⛔ FIVE tiles, not four — privacy/page.tsx's `<KpiGrid>` holds Pending, Docs
            held, Fulfilled, Access and Erasure. On the default `4` ladder that is two tile
            rows at ≥1024 against the ghost's one, and three at 2-up against two: 126px
            (a 110px tile + the band's 16px `gap-3`) at every width. */}
        <SkKpiRow count={5} />
        {/* Open requests — a titled `p-0` card; six columns, four of them `SortTh`
            (44px cells), and every cell `p-3` (52.5px rows, not 44.5). */}
        <SkTableCard cols={6} rows={6} minWidth={720} sortable cellPy={16} />
        {/* On-behalf export — a titled PADDED card that opens with a caption paragraph
            and then holds a `min-w-[640px]` table whose cells are `py-2 pr-3` (12px),
            i.e. the `.admin-tbl` default rhythm. Eight recent users (`.slice(0, 8)`). */}
        <div className="glass-panel p-4">
          <SkBar className="h-[16px] w-64" />
          <SkBar className="h-[14px] w-[96px] mt-[2px]" />
          <SkBar className="h-3 w-full mt-3" />
          <SkBar className="h-3 w-2/3 mt-2" />
          <SkTableRows cols={5} rows={8} minWidth={640} className="mt-3" />
        </div>
        {/* Retention info — UNTITLED. */}
        <SkCard lines={2} title={false} />
      </SkBody>
    </>
  );
}
