import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Settlement" sw="Malipo" period={false} />
      <SkBody>
        {/* Auto-settle banner */}
        <SkCard lines={1} titleW="w-64" />
        {/* KPI band */}
        <SkKpiRow count={4} />
        {/* ControlledElsewhere strip */}
        <SkCard lines={1} />
        {/* Payout queue */}
        <SkTableCard cols={7} rows={6} minWidth={720} headW="w-36" />
      </SkBody>
    </>
  );
}
