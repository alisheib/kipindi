import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      {/* The head carries one 40px action (Draft a week), as the page does. */}
      <AdminPageHead title="Millionea" sw="Maswali Millionea · wiki" actions={<SkChip className="h-[40px] w-[132px]" />} />
      <SkBody>
        {/* The four standing tiles: rollout, licence, sales, guarantee. */}
        <SkKpiRow count={4} />
        {/* Alerts — a titled card; its rows are data, so three is an estimate. */}
        <SkCard lines={3} titleW="w-[96px]" />
        {/* The weeks — a titled flush card, seven columns at min-w-[860px]. */}
        <SkTableCard cols={7} rows={6} minWidth={860} headW="w-[112px]" />
      </SkBody>
    </>
  );
}
