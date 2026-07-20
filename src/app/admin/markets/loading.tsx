import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkFormCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Markets · curation queue"
        sw="Soko · foleni ya uongozaji"
        period={false}
        actions={<SkChip className="h-8 w-28" />}
      />
      <SkBody>
        <SkKpiRow count={4} />
        <SkFormCard fields={3} titleW="w-20" />
        <SkTableCard cols={9} rows={12} minWidth={900} headW="w-28" />
      </SkBody>
    </>
  );
}
