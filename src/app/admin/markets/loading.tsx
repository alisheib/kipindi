import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkFormCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Markets · curation queue"
        sw="Soko · foleni ya uongozaji"
        /* ⚠️ LITERAL, not `h-8` — spacing is overridden (tailwind.config.ts:200-215) so `h-8`
           drew 48px for a `btn-sm` header action that is 40px (--h-control-sm). */
        actions={<SkChip className="h-[40px] w-28" />}
      />
      <SkBody>
        <SkKpiRow count={4} />
        <SkFormCard fields={3} titleW="w-20" />
        <SkTableCard cols={9} rows={12} minWidth={900} headW="w-28" />
      </SkBody>
    </>
  );
}
