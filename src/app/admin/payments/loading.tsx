import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard, SkChip, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Payments operations"
        sw="Operesheni za malipo"
        period={false}
        actions={<SkChip className="h-7 w-44" />}
      />
      <SkBody>
        {/* Operations control-plane */}
        <SkCard lines={2} titleW="w-48" />
        {/* Reconciliation strip */}
        <SkCard lines={2} titleW="w-52" />
        {/* Per-MNO health cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkCard key={i} lines={3} />
          ))}
        </div>
        {/* Retry queue */}
        <SkTableCard cols={7} rows={5} minWidth={640} headW="w-40" />
        {/* Live-telemetry info */}
        <SkCard lines={2} />
      </SkBody>
    </>
  );
}
