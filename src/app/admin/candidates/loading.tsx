import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Market candidates"
        sw="Mapendekezo ya soko \u00b7 AI-validated"
        period={false}
      />
      <SkBody>
        {/* KPI strip */}
        <SkKpiRow count={4} />
        {/* Pipeline info banner */}
        <SkCard lines={2} titleW="w-44" />
        {/* All candidates table */}
        <SkTableCard cols={7} rows={6} minWidth={760} />
      </SkBody>
    </>
  );
}
