import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      {/* ⚠️ LITERAL, not `h-8` (48px on the overridden scale — tailwind.config.ts:200-215)
          against the 40px admin header-action standard. */}
      <AdminPageHead title="Up & Down" sw="Juu na Chini" actions={<SkChip className="h-[40px] w-28" />} />
      <SkBody>
        <SkKpiRow count={4} />
        {/* Assets table */}
        <SkTableCard cols={6} rows={2} minWidth={640} />
        {/* Chains table */}
        <SkTableCard cols={5} rows={3} minWidth={620} />
        {/* Oracle health cards */}
        <SkCard lines={3} titleW="w-36" />
        {/* Thresholds form */}
        <SkCard lines={2} titleW="w-28" />
      </SkBody>
    </>
  );
}
