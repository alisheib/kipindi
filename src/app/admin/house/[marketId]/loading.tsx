import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

/** ⚠️ `SkChip` at 40px — the real action is a `btn-sm` back link, not a 26px chip. */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="One game" sw="Mchezo mmoja" actions={<SkChip className="h-[40px] w-40" />} />
      <SkBody>
        {/* The identity card */}
        <SkCard lines={1} titleW="w-64" />
        <SkKpiRow count={4} />
        {/* The arithmetic · the reconciliation · the rate provenance */}
        <SkTableCard cols={2} rows={6} minWidth={520} headW="w-36" />
        <SkTableCard cols={2} rows={3} minWidth={520} headW="w-48" />
        <SkCard lines={3} titleW="w-56" />
        {/* The ledger evidence, with its pager */}
        <SkTableCard cols={4} rows={8} minWidth={640} headW="w-44" pager />
      </SkBody>
    </>
  );
}
