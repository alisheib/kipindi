import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkBlock, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Finance" sw="Fedha" actions={<SkChip />} />
      <SkBody>
        {/* KPI 9-up since 2026-09-13 — THREE rows of three, on the page's own `cols="3"`
            ladder: money moving · what we earned · what we owe. The ninth tile, "Held for
            unverified", sits beside "Wallet liability" in the third row. */}
        <SkKpiRow count={3} cols="grid-cols-2 lg:grid-cols-3" />
        <SkKpiRow count={3} cols="grid-cols-2 lg:grid-cols-3" />
        <SkKpiRow count={3} cols="grid-cols-2 lg:grid-cols-3" />
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
