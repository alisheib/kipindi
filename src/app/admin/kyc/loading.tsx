import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkTableCard, SkCard, SkChip } from "@/components/admin/admin-skeletons";

/**
 * /admin/kyc skeleton (2026-09-13) — the page's own shape, in its own order: the ruling note, four
 * KPI tiles, then the three paged, sortable queues (with us · with the player · funded, nothing sent).
 * ⚠️ The header ghost is sized in pixel literals, not numeric keys: those keys read from the
 * OVERRIDDEN spacing scale (test:ui-consistency, numeric-size-utility), and this new file has no baseline.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="KYC queue"
        sw="Foleni ya uthibitisho"
        actions={<SkChip className="h-[40px] w-[160px]" />}
      />
      <SkBody>
        <SkCard title={false} lines={2} />
        <SkKpiRow count={4} />
        <SkTableCard cols={7} rows={4} minWidth={760} sortable pager />
        <SkTableCard cols={6} rows={4} minWidth={720} sortable pager />
        <SkTableCard cols={5} rows={4} minWidth={640} sortable pager />
      </SkBody>
    </>
  );
}
