import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBlock, SkBody, SkKpiRow, SkCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      {/* ⚠️ LITERAL, not `h-8` (48px on the overridden scale — tailwind.config.ts:200-215)
          against the 40px admin header-action standard. */}
      <AdminPageHead title="Up & Down" sw="Juu na Chini" actions={<SkChip className="h-[40px] w-[112px]" />} />
      <SkBody>
        <SkKpiRow count={4} />
        {/* "Up & Down economics · this game only" — a titled card holding a
            `DateTimeRangeFilter rank="dense"` (a 40px control rail) over a NESTED
            `<KpiGrid>` of four 110px tiles (page:322). It had no ghost at all, and the
            nested KPI band alone is 110px. */}
        <div className="glass-panel p-4">
          <SkBar className="h-[16px] w-56" />
          <SkBar className="h-[14px] w-[96px] mt-[2px]" />
          <SkBar className="h-[40px] w-full max-w-[420px] rounded-md mt-3 mb-3" />
          <SkKpiRow count={4} />
        </div>
        {/* Assets — a titled `p-0` card, SEVEN columns at `min-w-[820px]` (page:354-362).
            ⚠️ `rows` is the one guessed number here: the asset list is data. Three is the
            same estimate the rounds filter rail makes for its asset chips — correct both
            together against production. */}
        <SkTableCard cols={7} rows={3} minWidth={820} headW="w-[112px]" />
        {/* Chains — a titled `p-0` card, EIGHT columns at `min-w-[960px]` (page:527-534),
            and the page's LARGEST band: a 282-line editor whose per-row controls are not
            knowable to a loader. The old ghost said five columns at 620 and no editor. */}
        <SkTableCard cols={8} rows={4} minWidth={960} headW="w-[112px]" />
        {/* ⚠️ "Archived chains" (page:751) is CONDITIONAL on `archived.length > 0` —
            deliberately not ghosted. */}
        {/* Price reading method — titled. */}
        <SkCard lines={3} titleW="w-36" />
        {/* Price readings — a titled PADDED card holding a reading list. */}
        <SkCard lines={5} titleW="w-36" />
        {/* Thresholds — titled. */}
        <SkCard lines={2} titleW="w-[112px]" />
      </SkBody>
    </>
  );
}
