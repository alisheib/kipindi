import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkChip, SkCard, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Data retention schedule"
        sw="Ratiba ya kuhifadhi data"
        period={false}
        actions={<SkChip className="h-7 w-28" />}
      />
      <SkBody>
        <SkKpiRow count={4} />
        <SkTableCard cols={5} rows={10} minWidth={720} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SkCard lines={3} />
          <SkCard lines={3} />
        </div>
      </SkBody>
    </>
  );
}
