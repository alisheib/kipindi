import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkBar, SkKpiRow, SkChip, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Reports"
        sw="Ripoti"
        period={false}
        actions={
          <div className="flex items-center gap-2">
            <SkChip className="h-8 w-40" />
            <SkChip className="h-8 w-16" />
            <SkChip className="h-8 w-24" />
          </div>
        }
      />
      <SkBody>
        {/* Freshness stamp + normative money definitions */}
        <div className="flex flex-wrap items-center justify-between gap-2 -mt-1">
          <SkBar className="h-2.5 w-40" />
          <SkBar className="h-2.5 w-64" />
        </div>
        {/* KPI strip — 6 tiles */}
        <SkKpiRow count={6} cols="grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" />
        {/* Daily P&L */}
        <SkTableCard cols={8} rows={6} minWidth={680} />
        {/* Report library templates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SkCard lines={3} />
          <SkCard lines={3} />
          <SkCard lines={3} />
          <SkCard lines={3} />
        </div>
        {/* Generation log */}
        <SkTableCard cols={3} rows={6} />
        {/* Generation pipeline note */}
        <SkCard lines={2} />
      </SkBody>
    </>
  );
}
