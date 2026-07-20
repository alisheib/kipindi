import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Insights" sw="Maarifa" period={false} />
      <SkBody>
        {/* Headline KPIs */}
        <SkKpiRow count={4} />
        {/* Acquisition funnel */}
        <SkCard lines={4} titleW="w-40" />
        {/* Cohort retention heatmap */}
        <SkTableCard cols={7} rows={5} minWidth={640} />
        {/* GGR by category + top markets */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SkCard lines={5} />
          <SkCard lines={5} />
        </div>
        {/* Footnote */}
        <SkCard lines={1} />
      </SkBody>
    </>
  );
}
