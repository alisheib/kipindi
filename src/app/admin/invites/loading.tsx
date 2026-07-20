import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Invite campaigns" sw="Kampeni za mialiko" period={false} />
      <SkBody>
        <SkKpiRow count={4} />
        {/* New campaign */}
        <SkFormCard fields={3} titleW="w-32" />
        {/* Campaigns table */}
        <SkTableCard cols={7} rows={8} minWidth={720} />
      </SkBody>
    </>
  );
}
