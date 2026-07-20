import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Sources & categories"
        sw="Vyanzo na aina"
        period={false}
        actions={<SkChip className="h-8 w-28" />}
      />
      <SkBody>
        <SkKpiRow count={4} />
        {/* Categories · global toggle (chip row) */}
        <SkCard lines={2} titleW="w-48" />
        {/* Per-category source tables */}
        <SkTableCard cols={5} rows={3} minWidth={560} />
        <SkTableCard cols={5} rows={3} minWidth={560} />
        <SkTableCard cols={5} rows={3} minWidth={560} />
      </SkBody>
    </>
  );
}
