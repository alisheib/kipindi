import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="AI poll generation"
        sw="Uzalishaji wa kura · Claude AI"
        period={false}
      />
      <SkBody>
        {/* KPI strip */}
        <SkKpiRow count={4} />
        {/* Info banner + generate form */}
        <SkFormCard fields={3} titleW="w-40" />
        {/* Generation settings */}
        <SkFormCard fields={3} titleW="w-32" />
        {/* All generations table */}
        <SkTableCard cols={6} rows={6} minWidth={760} />
      </SkBody>
    </>
  );
}
