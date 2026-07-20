import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkBar, SkKpiRow, SkChip, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Campaign" sw="Kampeni" period={false} actions={<SkChip />} />
      <SkBody>
        {/* Back link */}
        <SkBar className="h-3 w-28" />
        <SkKpiRow count={4} />
        {/* Manage */}
        <SkFormCard fields={3} titleW="w-24" />
        {/* Contacts */}
        <SkTableCard cols={5} rows={8} minWidth={560} />
      </SkBody>
    </>
  );
}
