import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="AI usage & credits" sw="Matumizi ya AI na salio" period={false} />
      <SkBody>
        {/* Health banner */}
        <SkCard lines={1} titleW="w-56" />
        {/* Spend KPIs */}
        <SkKpiRow count={4} />
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
