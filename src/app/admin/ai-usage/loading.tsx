import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="AI usage & credits" sw="Matumizi ya AI na salio" />
      <SkBody>
        {/* Health banner */}
        <SkCard lines={1} titleW="w-56" />
        {/* Spend KPIs */}
        <SkKpiRow count={4} />
        {/* Spend cycles — KPIs, meter, reconciliation */}
        <SkKpiRow count={4} />
        <SkCard lines={4} titleW="w-36" />
        {/* Cost per resolution */}
        <SkTableCard cols={8} rows={3} minWidth={860} />
        {/* Cycles by year */}
        <SkTableCard cols={5} rows={3} minWidth={640} />
        {/* Every cycle */}
        <SkTableCard cols={9} rows={6} minWidth={860} />
        {/* Cycle settings */}
        <SkCard lines={4} titleW="w-40" />
        {/* Credit budget + meter */}
        <SkCard lines={4} titleW="w-40" />
        {/* AI operations */}
        <SkCard lines={3} titleW="w-36" />
        {/* By feature */}
        <SkTableCard cols={4} rows={4} minWidth={860} />
        {/* Per-call ledger */}
        <SkTableCard cols={6} rows={6} minWidth={860} />
      </SkBody>
    </>
  );
}
