import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkTableCard, SkCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="AML · EDD queue" sw="Foleni ya AML" period={false} actions={<SkChip />} />
      <SkBody>
        {/* KPI band */}
        <SkKpiRow count={4} />
        {/* Review queue — flush p-0 card with no title row */}
        <SkTableCard cols={7} rows={6} minWidth={720} title={false} />
        {/* Two-person-approval warning */}
        <SkCard lines={2} />
        {/* Suspicious-bet detector — has its own header row */}
        <SkTableCard cols={6} rows={5} minWidth={640} />
      </SkBody>
    </>
  );
}
