import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkChip, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Audit log"
        sw="Kumbukumbu · append-only HMAC-chained"
        period={false}
        actions={<SkChip className="h-7 w-24" />}
      />
      <SkBody>
        <SkKpiRow count={3} cols="grid-cols-1 sm:grid-cols-3" />
        <div className="flex flex-wrap gap-1.5">
          <SkChip className="h-7 w-16" />
          <SkChip className="h-7 w-16" />
          <SkChip className="h-7 w-16" />
          <SkChip className="h-7 w-16" />
          <SkChip className="h-7 w-16" />
          <SkChip className="h-7 w-16" />
        </div>
        <SkTableCard cols={6} rows={12} />
      </SkBody>
    </>
  );
}
