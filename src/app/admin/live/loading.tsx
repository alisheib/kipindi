import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkBlock, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Live ops"
        sw="Operesheni za moja kwa moja"
        period={false}
        actions={<SkChip className="h-7 w-24" />}
      />
      <SkBody>
        <SkKpiRow count={3} />
        {/* Money-flow chart + live bet feed */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
          <SkBlock height={240} />
          <SkCard lines={6} />
        </div>
        {/* Wallet activity */}
        <SkCard lines={5} />
      </SkBody>
    </>
  );
}
