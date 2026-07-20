import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkKpiRow, SkChip, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Transactions"
        sw="Miamala"
        period={false}
        actions={<SkChip className="h-[38px] w-28" />}
      />
      {/* This page has NO px body wrapper of its own — it returns top-level
          fragments spaced by mt-* margins. Mirror that exactly; the single
          pulse lives on a layout-neutral wrapper so nothing shifts on swap. */}
      <div className="animate-pulse">
        {/* Compliance totals */}
        <SkKpiRow count={4} />
        {/* Attention chips row */}
        <div className="mt-3 flex flex-wrap gap-2">
          <SkChip />
          <SkChip />
          <SkChip />
        </div>
        {/* Filter card */}
        <SkFormCard fields={4} className="mt-4" />
        {/* Movements table */}
        <div className="mt-4">
          <SkTableCard cols={10} rows={12} minWidth={1100} headW="w-40" />
        </div>
      </div>
    </>
  );
}
