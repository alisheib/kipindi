import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkFormCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Market config"
        sw="Mipangilio ya soko"
        period={false}
        actions={<SkChip className="h-7 w-44" />}
      />
      <SkBody>
        {/* Snapshot KPIs */}
        <SkKpiRow count={6} cols="grid-cols-2 lg:grid-cols-3" />
        {/* The model, stated correctly */}
        <SkCard lines={3} titleW="w-40" />
        {/* Fee simulator */}
        <SkFormCard fields={2} titleW="w-32" />
        {/* Global rates */}
        <SkFormCard fields={4} titleW="w-40" />
        {/* Per-market overrides */}
        <SkTableCard cols={5} rows={4} />
        {/* Recent config changes */}
        <SkTableCard cols={4} rows={6} />
        {/* Live-polls warning */}
        <SkCard lines={2} />
      </SkBody>
    </>
  );
}
