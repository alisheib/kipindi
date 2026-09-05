import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

/**
 * ⚠️ MIRRORS THE PAGE, WHICH IS TABBED. There is no `SkTabs`, and no shipped loader draws a
 * rail ghost — `/admin/finance`'s loader draws the union of its tabs' cards instead, which is
 * the precedent followed here. The two KPI bands and the caption sit above the rail on every
 * tab, so they are the one part that is never wrong.
 *
 * ⚠️ `SkChip` takes the height the real action renders: `DateTimeRangeFilter` at `rank="dense"`
 * is 32px (`--h-control-xs`), not the 26px default — a ghost the wrong height is a layout jump.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="House" sw="Nyumba" actions={<SkChip className="h-[32px] w-56" />} />
      <SkBody>
        {/* What is ours · Can we pay — both bands, above the rail on every tab */}
        <SkKpiRow count={4} />
        <SkKpiRow count={4} />
        {/* The caption that scopes the window */}
        <SkCard lines={1} title={false} sw={false} />
        {/* POSITION: float · house accounts · custodial cash · derivation · books */}
        <SkCard lines={2} titleW="w-44" />
        <SkTableCard cols={3} rows={5} minWidth={560} headW="w-36" />
        <SkTableCard cols={2} rows={7} minWidth={520} headW="w-48" />
      </SkBody>
    </>
  );
}
