import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkChip, SkCard, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Bonus wallet" sw="Pochi ya bonasi" period={false} actions={<SkChip />} />
      <SkBody>
        <SkKpiRow count={4} />
        {/* Grant a bonus */}
        <SkFormCard fields={3} titleW="w-44" />
        {/* Config editor */}
        <SkFormCard fields={4} titleW="w-52" />
        {/* How it works note */}
        <SkCard lines={2} titleW="w-56" />
        {/* Grant ledger */}
        <SkTableCard cols={7} rows={6} minWidth={760} headW="w-32" />
      </SkBody>
    </>
  );
}
