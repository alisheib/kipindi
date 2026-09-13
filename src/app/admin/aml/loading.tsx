import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkTableCard, SkCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      {/* 2026-09-13: the page's h1 is "AML queue" (page.tsx, §L1 one name per destination); this skeleton still said the old name. */}
      <AdminPageHead title="AML queue" sw="Foleni ya AML" actions={<SkChip />} />
      <SkBody>
        {/* KPI band */}
        <SkKpiRow count={4} />
        {/* Review queue — flush p-0 card with no title row */}
        <SkTableCard cols={7} rows={6} minWidth={720} title={false} />
        {/* The dated no-hold notice (2026-09-13) */}
        <SkCard lines={2} />
        {/* Suspicious-bet detector — has its own header row */}
        <SkTableCard cols={6} rows={5} minWidth={640} />
      </SkBody>
    </>
  );
}
