import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Traffic" sw="Watembeleaji" />
      <SkBody>
        {/* Headline KPIs */}
        <SkKpiRow count={4} />
        {/* Visits per day + page views per day */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkCard lines={5} />
          <SkCard lines={5} />
        </div>
        {/* Top pages + sources */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkCard lines={6} />
          <SkTableCard cols={3} rows={5} minWidth={480} />
        </div>
        {/* What is counted */}
        <SkCard lines={2} />
      </SkBody>
    </>
  );
}
