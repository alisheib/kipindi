import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkBar, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Objections" sw="Pingamizi" period={false} />
      <SkBody>
        {/* Explainer */}
        <SkBar className="h-3 w-3/4" />
        <SkKpiRow count={3} cols="grid-cols-2 lg:grid-cols-3" />
        {/* Queue */}
        <SkTableCard cols={8} rows={6} minWidth={720} />
      </SkBody>
    </>
  );
}
