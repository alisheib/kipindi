import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkTableCard, SkCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Two-person approvals"
        sw="Idhini ya watu wawili"
        actions={<SkChip className="h-7 w-40" />}
      />
      <SkBody>
        <SkKpiRow count={4} />
        {/* KYC queue — sortable and paged; money-weighted by default for a money viewer (2026-09-13) */}
        <SkTableCard cols={7} rows={4} minWidth={720} sortable pager />
        {/* AML queue, then source-of-funds declarations with their Identity column (2026-09-13) */}
        <SkTableCard cols={5} rows={4} minWidth={640} sortable pager />
        <SkTableCard cols={7} rows={4} minWidth={680} sortable pager />
        {/* Recent approval activity */}
        <SkCard lines={4} />
      </SkBody>
    </>
  );
}
