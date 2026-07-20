import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkTableCard, SkCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Two-person approvals"
        sw="Idhini ya watu wawili"
        period={false}
        actions={<SkChip className="h-7 w-40" />}
      />
      <SkBody>
        <SkKpiRow count={4} />
        {/* KYC / AML / SOF review queues */}
        <SkTableCard cols={6} rows={4} minWidth={600} />
        <SkTableCard cols={6} rows={4} minWidth={600} />
        <SkTableCard cols={6} rows={4} minWidth={600} />
        {/* Recent approval activity */}
        <SkCard lines={4} />
      </SkBody>
    </>
  );
}
