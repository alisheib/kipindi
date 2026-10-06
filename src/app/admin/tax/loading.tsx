import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

/**
 * The tax report's first paint, in the page's own order (DG-P-04: a ghost that is the wrong shape
 * moves the page twice): the three dense export buttons, the period-and-product card, the status
 * line, the six-tile KPI band on the page's `lg3-xl6` ladder, then Report 1 and Report 2 side by
 * side. ⚠️ `SkChip` takes the 32px the real dense controls render — never its 26px default.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Tax report"
        sw="Kodi za kisheria"
        actions={
          <div className="flex items-center gap-1.5" aria-hidden>
            <SkChip className="h-[32px] w-[56px]" />
            <SkChip className="h-[32px] w-[64px]" />
            <SkChip className="h-[32px] w-[56px]" />
          </div>
        }
      />
      <SkBody>
        {/* The ghosts take the heights the real cards were MEASURED at (2026-10-03 drive): the period-and-product
            card is 263px on a 360 phone (its rails wrap) and 152px on a desktop; the status line 104 / 70. */}
        <SkCard lines={3} title={false} className="min-h-[263px] sm:min-h-[200px] lg:min-h-[152px]" />
        <SkCard lines={1} title={false} className="min-h-[104px] lg:min-h-[70px]" />
        <SkKpiRow count={6} cols="grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkTableCard cols={2} rows={8} minWidth={280} />
          {/* Report 2: the plan's five lines and Finance's two filing lines (2026-10-06), one rate period. */}
          <SkTableCard cols={2} rows={7} minWidth={280} />
        </div>
      </SkBody>
    </>
  );
}
