import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkChip, SkCard, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Self-exclusion roster"
        sw="Sajili ya kujizuia"
        actions={
          <>
            <SkChip className="h-6 w-[96px]" />
            <SkChip className="h-6 w-[96px]" />
          </>
        }
      />
      <SkBody>
        <SkKpiRow count={4} />
        <SkTableCard cols={6} rows={8} minWidth={640} />
        <SkCard lines={2} />
      </SkBody>
    </>
  );
}
