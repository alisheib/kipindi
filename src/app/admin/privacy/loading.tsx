import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkChip, SkCard, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Privacy · DSAR queue"
        sw="Faragha · Maombi ya data"
        period={false}
        actions={<SkChip className="h-7 w-36" />}
      />
      <SkBody>
        <SkKpiRow count={4} />
        <SkTableCard cols={6} rows={6} minWidth={720} />
        <SkTableCard cols={5} rows={6} minWidth={640} />
        <SkCard lines={2} />
      </SkBody>
    </>
  );
}
