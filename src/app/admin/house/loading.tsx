import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

/**
 * ⚠️ MIRRORS THE PAGE, WHICH IS TABBED, AND THE PRECEDENT IT CITED HAS MOVED ON (2026-09-25).
 * This used to say "there is no `SkTabs`, and no shipped loader draws a rail ghost —
 * `/admin/finance`'s loader draws the union of its tabs' cards instead". Both halves are now
 * false: `SkTabs` exists in `admin-skeletons.tsx`, and finance's loader was rewritten to ghost
 * its DEFAULT tab plus a rail, because the union matched no tab it could resolve into and the
 * missing rail dropped the page 44px on arrival (DG-P-04).
 * ⚠️ This loader still draws the union and still has no rail ghost. That is now a KNOWN GAP
 * rather than the house style — it is left for the session that owns `/admin/house`, which can
 * measure it there. The two KPI bands and the caption sit above the rail on every tab, so they
 * remain the one part that is never wrong.
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
        {/* ⚠️ MIRROR THE PAGE, NOT AN EARLIER DRAFT OF IT. The derivation table carries no
            min-width any more (a two-column table fits a 318px card by definition), so a 520px
            ghost would draw a scrolling card and then jump when the real one landed. */}
        <SkTableCard cols={2} rows={7} minWidth={280} headW="w-48" />
      </SkBody>
    </>
  );
}
