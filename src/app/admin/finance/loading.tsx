import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkBlock, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      {/* period defaults to true → the real PeriodPicker renders, matching the page. */}
      <AdminPageHead title="Finance" sw="Fedha" actions={<SkChip />} />
      <SkBody>
        {/* KPI 8-up (two rows of four) */}
        <SkKpiRow count={4} />
        <SkKpiRow count={4} />
        {/* House accounts */}
        <SkCard lines={3} titleW="w-40" />
        {/* Ledger trial balance */}
        <SkCard lines={4} titleW="w-44" />
        {/* Charts (two 2-up rows collapse into this 4-item grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkBlock key={i} height={200} />
          ))}
        </div>
        {/* Provider summary */}
        <SkTableCard cols={6} rows={6} minWidth={640} />
      </SkBody>
    </>
  );
}
