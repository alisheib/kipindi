import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkKpiRow, SkCard, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="System" sw="Mfumo" period={false} />
      <SkBody>
        {/* Health KPIs */}
        <SkKpiRow count={4} />

        {/* Maintenance mode */}
        <SkFormCard fields={2} titleW="w-36" />

        {/* Bet queue — card with an inner KPI band (SkCard takes no children,
            so the equivalent card is composed by hand). */}
        <div className="rounded-lg glass-panel p-4 space-y-3">
          <SkBar className="h-3.5 w-28" />
          <SkKpiRow count={4} />
          <SkBar className="h-3 w-full" />
          <SkBar className="h-3 w-2/3" />
        </div>

        {/* Settlement — card with an inner KPI band */}
        <div className="rounded-lg glass-panel p-4 space-y-3">
          <SkBar className="h-3.5 w-28" />
          <SkKpiRow count={4} />
          <SkBar className="h-3 w-full" />
          <SkBar className="h-3 w-2/3" />
        </div>

        {/* Broadcast banner */}
        <SkFormCard fields={1} />

        {/* Platform timezone */}
        <SkFormCard fields={1} />

        {/* Audit chain integrity row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SkCard lines={3} />
          <SkCard lines={3} />
        </div>

        {/* Persistence + bootstrap admins row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SkCard lines={3} />
          <SkCard lines={3} />
        </div>

        {/* Rate limiter · live buckets */}
        <SkTableCard cols={4} rows={5} minWidth={480} />
      </SkBody>
    </>
  );
}
